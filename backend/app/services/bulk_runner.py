import time
import json
import requests
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Job, APICall, JobStatus
from app.config import settings
from app.services.zetheta_client import build_payload


class JobRunner:
    """Singleton manager for running bulk jobs in background threads."""

    _instance = None
    _lock = threading.Lock()
    _executors: Dict[str, ThreadPoolExecutor] = {}
    _stop_events: Dict[str, threading.Event] = {}

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def start_job(self, job_id: str, submissions: list, target_url: str):
        """Start a bulk job in background."""
        if job_id in self._executors:
            return False

        stop_event = threading.Event()
        self._stop_events[job_id] = stop_event
        executor = ThreadPoolExecutor(max_workers=settings.MAX_CONCURRENT_CALLS)
        self._executors[job_id] = executor

        future = executor.submit(self._run_loop, job_id, submissions, target_url, stop_event)
        future.add_done_callback(lambda f: self._cleanup(job_id))
        return True

    def stop_job(self, job_id: str):
        """Signal a job to stop."""
        if job_id in self._stop_events:
            self._stop_events[job_id].set()
            return True
        return False

    def _cleanup(self, job_id: str):
        """Remove executor after job completes."""
        self._executors.pop(job_id, None)
        self._stop_events.pop(job_id, None)

    def _run_loop(self, job_id: str, submissions: list, target_url: str, stop_event: threading.Event):
        """Main loop: process each submission through the target API."""
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if not job:
                return

            job.status = JobStatus.RUNNING
            job.started_at = datetime.utcnow()
            # Only set total_candidates on fresh runs, not retries
            if job.total_candidates == 0:
                job.total_candidates = len(submissions)
            db.commit()

            for idx, submission in enumerate(submissions):
                if stop_event.is_set():
                    job.status = JobStatus.STOPPED
                    db.commit()
                    return

                self._process_one(db, job, submission, target_url)
                time.sleep(settings.CALL_DELAY_SECONDS)

            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            db.commit()

        except Exception as e:
            if job:
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                db.commit()
        finally:
            db.close()

    def _process_one(self, db: Session, job: Job, submission: dict, target_url: str):
        """Process a single candidate submission."""
        user_id = str(submission.get("user_id", "unknown"))
        name = submission.get("name") or submission.get("full_name") or "Unknown"
        email = submission.get("email") or ""

        # Find or create APICall record
        call = db.query(APICall).filter(
            APICall.job_id == job.id,
            APICall.candidate_id == user_id,
        ).first()

        if not call:
            call = APICall(
                job_id=job.id,
                candidate_id=user_id,
                candidate_name=name,
                candidate_email=email,
                request_payload=build_payload(submission),
            )
            db.add(call)
            db.commit()
            db.refresh(call)

        payload = call.request_payload or build_payload(submission)
        success = False
        status_code = None
        response_body = None
        response_text = None
        error_msg = None

        for attempt in range(settings.MAX_RETRIES):
            try:
                resp = requests.post(
                    target_url,
                    json=payload,
                    timeout=job.timeout_seconds or settings.CALL_TIMEOUT_SECONDS,
                )
                status_code = resp.status_code

                if resp.status_code == 200:
                    try:
                        response_body = resp.json()
                    except Exception:
                        response_text = resp.text
                    success = True
                    break
                else:
                    response_text = resp.text[:2000]
                    if attempt < settings.MAX_RETRIES - 1:
                        time.sleep(2 ** attempt)

            except requests.exceptions.Timeout:
                error_msg = "Request timeout"
                if attempt < settings.MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)
            except Exception as e:
                error_msg = str(e)
                if attempt < settings.MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)

        call.status_code = status_code
        call.is_success = success
        call.response_body = response_body
        call.response_text = response_text
        call.error_message = error_msg
        call.attempt_count = attempt + 1
        call.completed_at = datetime.utcnow()

        job.processed += 1
        if success:
            job.succeeded += 1
        else:
            job.failed += 1

        db.commit()

    def get_progress(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get current progress for a job."""
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if not job:
                return None
            total = max(job.total_candidates, 1)
            return {
                "job_id": job.id,
                "status": job.status,
                "total": job.total_candidates,
                "processed": job.processed,
                "succeeded": job.succeeded,
                "failed": job.failed,
                "percent": round((job.processed / total) * 100, 1),
            }
        finally:
            db.close()


runner = JobRunner()
