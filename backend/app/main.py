from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.config import settings
from app.routers import jobs, calls, dashboard, candidates
from app.models import Job

# Create tables
Base.metadata.create_all(bind=engine)

# Reset any stale "running" jobs from previous server crashes
try:
    db = SessionLocal()
    stale_jobs = db.query(Job).filter(Job.status == "running").all()
    for job in stale_jobs:
        job.status = "stopped"
    if stale_jobs:
        db.commit()
except Exception:
    pass
finally:
    db.close()

app = FastAPI(
    title="Zetheta Admin",
    description="Bulk report generator admin panel for Zetheta",
    version="1.0.0",
)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(jobs.router, prefix=settings.API_PREFIX)
app.include_router(calls.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(candidates.router, prefix=settings.API_PREFIX)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/settings")
def get_settings():
    """Return currently configured source and target URLs."""
    return {
        "source_url_tech": settings.SOURCE_URL_TECH,
        "source_url_nontech": settings.SOURCE_URL_NONTECH,
        "target_url_tech": settings.TARGET_URL_TECH,
        "target_url_nontech": settings.TARGET_URL_NONTECH,
        "max_concurrent_calls": settings.MAX_CONCURRENT_CALLS,
        "call_delay_seconds": settings.CALL_DELAY_SECONDS,
        "call_timeout_seconds": settings.CALL_TIMEOUT_SECONDS,
        "max_retries": settings.MAX_RETRIES,
    }
