import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


class JobType(str, enum.Enum):
    TECH = "tech"
    NONTECH = "nontech"


class FilterMode(str, enum.Enum):
    ALL = "all"
    USER_ID = "user_id"
    ROLE = "role"
    COURSE = "course"
    COLLEGE = "college"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    filter_mode = Column(String, default=FilterMode.ALL)
    filter_value = Column(String, nullable=True)
    source_url = Column(String, nullable=False)
    target_url = Column(String, nullable=False)
    status = Column(String, default=JobStatus.PENDING)
    total_candidates = Column(Integer, default=0)
    processed = Column(Integer, default=0)
    succeeded = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    calls = relationship("APICall", back_populates="job", cascade="all, delete-orphan")


class APICall(Base):
    __tablename__ = "api_calls"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(String, nullable=False)
    candidate_name = Column(String, nullable=True)
    candidate_email = Column(String, nullable=True)
    status_code = Column(Integer, nullable=True)
    is_success = Column(Boolean, default=False)
    request_payload = Column(JSON, nullable=True)
    response_body = Column(JSON, nullable=True)
    response_text = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    attempt_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    job = relationship("Job", back_populates="calls")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    role = Column(String, nullable=True)
    course = Column(String, nullable=True)
    college = Column(String, nullable=True)
    submission_type = Column(String, nullable=False)
    raw_data = Column(JSON, nullable=True)
    last_seen_at = Column(DateTime, default=datetime.utcnow)
