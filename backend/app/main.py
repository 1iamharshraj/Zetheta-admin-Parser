from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.config import settings
from app.routers import jobs, calls, dashboard, candidates

# Create tables
Base.metadata.create_all(bind=engine)

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
