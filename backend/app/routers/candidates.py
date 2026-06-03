from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Candidate
from app.schemas import CandidateResponse
from app.services.zetheta_client import fetch_submissions

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("", response_model=List[CandidateResponse])
def list_candidates(
    submission_type: Optional[str] = Query(None, pattern="^(tech|nontech)$"),
    role: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    college: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Candidate)
    if submission_type:
        query = query.filter(Candidate.submission_type == submission_type)
    if role:
        query = query.filter(Candidate.role.ilike(f"%{role}%"))
    if course:
        query = query.filter(Candidate.course.ilike(f"%{course}%"))
    if college:
        query = query.filter(Candidate.college.ilike(f"%{college}%"))
    if search:
        query = query.filter(
            (Candidate.name.ilike(f"%{search}%")) |
            (Candidate.email.ilike(f"%{search}%")) |
            (Candidate.id.ilike(f"%{search}%"))
        )
    return query.order_by(Candidate.last_seen_at.desc()).all()


@router.post("/sync")
def sync_candidates(submission_type: str = Query(..., pattern="^(tech|nontech)$"), db: Session = Depends(get_db)):
    """Fetch latest submissions from Zetheta and sync to local DB."""
    try:
        submissions = fetch_submissions(submission_type)
    except Exception as e:
        return {"detail": f"Failed to fetch: {e}"}

    count = 0
    for sub in submissions:
        user_id = str(sub.get("user_id", ""))
        if not user_id:
            continue

        cand = db.query(Candidate).filter(
            Candidate.id == user_id,
            Candidate.submission_type == submission_type,
        ).first()

        if not cand:
            cand = Candidate(id=user_id, submission_type=submission_type)
            db.add(cand)
            count += 1

        cand.name = sub.get("name") or sub.get("full_name")
        cand.email = sub.get("email")
        cand.role = sub.get("role") or sub.get("role_name")
        cand.course = sub.get("course")
        cand.college = sub.get("college")
        cand.raw_data = sub
        cand.last_seen_at = __import__('datetime').datetime.utcnow()

    db.commit()
    return {"synced": count, "total_fetched": len(submissions)}
