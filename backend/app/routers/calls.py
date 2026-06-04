from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import APICall
from app.schemas import APICallResponse, APICallListResponse
from app.services.bulk_runner import runner

router = APIRouter(prefix="/calls", tags=["calls"])


@router.get("", response_model=APICallListResponse)
def list_calls(
    job_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None, pattern="^(success|failed)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(APICall)
    if job_id:
        query = query.filter(APICall.job_id == job_id)
    if status == "success":
        query = query.filter(APICall.is_success == True)
    elif status == "failed":
        query = query.filter(APICall.is_success == False)

    total = query.count()
    items = query.order_by(APICall.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return APICallListResponse(total=total, page=page, limit=limit, items=items)


@router.get("/{call_id}", response_model=APICallResponse)
def get_call(call_id: str, db: Session = Depends(get_db)):
    call = db.query(APICall).filter(APICall.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.post("/{call_id}/retry", response_model=APICallResponse)
def retry_call(call_id: str, db: Session = Depends(get_db)):
    call = db.query(APICall).filter(APICall.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    import requests
    from app.config import settings
    from datetime import datetime

    payload = call.request_payload or {"user_id": call.candidate_id}
    success = False
    status_code = None
    response_body = None
    response_text = None
    error_msg = None

    for attempt in range(settings.MAX_RETRIES):
        try:
            resp = requests.post(
                call.job.target_url,
                json=payload,
                timeout=call.job.timeout_seconds or settings.CALL_TIMEOUT_SECONDS,
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
                    import time
                    time.sleep(2 ** attempt)
        except Exception as e:
            error_msg = str(e)
            if attempt < settings.MAX_RETRIES - 1:
                import time
                time.sleep(2 ** attempt)

    call.status_code = status_code
    call.is_success = success
    call.response_body = response_body
    call.response_text = response_text
    call.error_message = error_msg
    call.attempt_count += 1
    call.completed_at = datetime.utcnow()

    if success:
        call.job.succeeded += 1
        if call.job.failed > 0:
            call.job.failed -= 1
    else:
        # keep failed count same
        pass

    db.commit()
    db.refresh(call)
    return call
