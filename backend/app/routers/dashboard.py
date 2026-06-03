from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Job, APICall
from app.schemas import DashboardStats, DashboardChart, ChartPoint

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    total_jobs = db.query(Job).count()
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_jobs_today = db.query(Job).filter(Job.created_at >= today_start).count()

    total_candidates = db.query(func.sum(Job.total_candidates)).scalar() or 0
    total_succeeded = db.query(func.sum(Job.succeeded)).scalar() or 0
    total_failed = db.query(func.sum(Job.failed)).scalar() or 0
    total_processed = total_succeeded + total_failed
    success_rate = round((total_succeeded / total_processed) * 100, 1) if total_processed > 0 else 0.0

    running_jobs = db.query(Job).filter(Job.status == "running").count()

    return DashboardStats(
        total_jobs=total_jobs,
        total_jobs_today=total_jobs_today,
        total_candidates=total_candidates,
        total_succeeded=total_succeeded,
        total_failed=total_failed,
        success_rate=success_rate,
        running_jobs=running_jobs,
    )


@router.get("/chart", response_model=DashboardChart)
def get_chart(days: int = 7, db: Session = Depends(get_db)):
    end = datetime.utcnow().date()
    start = end - timedelta(days=days - 1)

    data = []
    for i in range(days):
        day = start + timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day + timedelta(days=1), datetime.min.time())

        calls = db.query(APICall).filter(
            APICall.created_at >= day_start,
            APICall.created_at < day_end,
        ).all()

        success = sum(1 for c in calls if c.is_success)
        failed = sum(1 for c in calls if not c.is_success)
        data.append(ChartPoint(
            date=day.strftime("%Y-%m-%d"),
            success=success,
            failed=failed,
            total=len(calls),
        ))

    return DashboardChart(data=data)
