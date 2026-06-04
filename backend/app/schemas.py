from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel


# ---------- Candidate Schemas ----------
class CandidateBase(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    course: Optional[str] = None
    college: Optional[str] = None
    submission_type: str


class CandidateResponse(CandidateBase):
    last_seen_at: datetime

    class Config:
        from_attributes = True


# ---------- APICall Schemas ----------
class APICallBase(BaseModel):
    candidate_id: str
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    status_code: Optional[int] = None
    is_success: bool = False
    error_message: Optional[str] = None
    attempt_count: int = 1


class APICallCreate(APICallBase):
    job_id: str
    request_payload: Optional[dict] = None


class APICallResponse(APICallBase):
    id: str
    job_id: str
    response_body: Optional[Any] = None
    response_text: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class APICallListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[APICallResponse]


# ---------- Job Schemas ----------
class JobBase(BaseModel):
    name: str
    type: str
    filter_mode: str = "all"
    filter_value: Optional[str] = None
    timeout_seconds: int = 90


class JobCreate(JobBase):
    pass


class JobResponse(JobBase):
    id: str
    source_url: str
    target_url: str
    status: str
    total_candidates: int
    processed: int
    succeeded: int
    failed: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    timeout_seconds: int = 90

    class Config:
        from_attributes = True


class JobProgress(BaseModel):
    job_id: str
    status: str
    total: int
    processed: int
    succeeded: int
    failed: int
    percent: float


class JobDetailResponse(JobResponse):
    calls: List[APICallResponse] = []


# ---------- Dashboard Schemas ----------
class DashboardStats(BaseModel):
    total_jobs: int
    total_jobs_today: int
    total_candidates: int
    total_succeeded: int
    total_failed: int
    success_rate: float
    running_jobs: int


class ChartPoint(BaseModel):
    date: str
    success: int
    failed: int
    total: int


class DashboardChart(BaseModel):
    data: List[ChartPoint]
