from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Job, APICall, JobStatus
from app.schemas import JobCreate, JobResponse, JobDetailResponse, JobProgress
from app.services.zetheta_client import fetch_submissions, filter_submissions
from app.services.bulk_runner import runner

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=List[JobResponse])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(Job).order_by(Job.created_at.desc()).all()


@router.post("", response_model=JobResponse)
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    source_url = (
        "https://www.zetheta.com/wp-json/v1/submissions"
        if payload.type == "tech"
        else "https://www.zetheta.com/wp-json/v1/submissions/?type=nontech"
    )
    target_url = (
        "http://13.127.165.204:8000/api/zetheta/analyze"
        if payload.type == "tech"
        else "http://13.127.165.204:8000/api/v2/zetheta/analyze/document"
    )

    job = Job(
        name=payload.name,
        type=payload.type,
        filter_mode=payload.filter_mode,
        filter_value=payload.filter_value,
        source_url=source_url,
        target_url=target_url,
        status=JobStatus.PENDING,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/start", response_model=JobResponse)
def start_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status == JobStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Job already running")

    try:
        submissions = fetch_submissions(job.type)
        filtered = filter_submissions(submissions, job.filter_mode, job.filter_value or "")
    except Exception as e:
        job.status = JobStatus.FAILED
        job.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=502, detail=str(e))

    job.total_candidates = len(filtered)
    db.commit()

    if not filtered:
        job.status = JobStatus.COMPLETED
        job.completed_at = __import__('datetime').datetime.utcnow()
        db.commit()
        return job

    started = runner.start_job(job.id, filtered, job.target_url)
    if not started:
        raise HTTPException(status_code=400, detail="Job already has an active runner")

    return job


@router.post("/{job_id}/stop", response_model=JobResponse)
def stop_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    runner.stop_job(job_id)
    job.status = JobStatus.STOPPED
    db.commit()
    return job


@router.post("/{job_id}/retry-failed", response_model=JobResponse)
def retry_failed(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    failed_calls = db.query(APICall).filter(
        APICall.job_id == job_id,
        APICall.is_success == False,
    ).all()

    if not failed_calls:
        raise HTTPException(status_code=400, detail="No failed calls to retry")

    submissions = []
    for call in failed_calls:
        sub = call.request_payload or {"user_id": call.candidate_id}
        submissions.append(sub)
        # Reset call state
        call.is_success = False
        call.status_code = None
        call.response_body = None
        call.response_text = None
        call.error_message = None
        call.completed_at = None

    job.status = JobStatus.RUNNING
    job.processed -= len(failed_calls)
    job.failed -= len(failed_calls)
    db.commit()

    runner.start_job(job.id, submissions, job.target_url)
    return job


@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    runner.stop_job(job_id)
    db.delete(job)
    db.commit()
    return {"detail": "Job deleted"}


@router.get("/{job_id}/progress", response_model=JobProgress)
def get_progress(job_id: str):
    progress = runner.get_progress(job_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Job not found or not running")
    return JobProgress(**progress)
