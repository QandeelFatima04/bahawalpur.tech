from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from .database import Base


class UserRole(str, enum.Enum):
    student = "student"
    company = "company"
    admin = "admin"


class CompanyStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class JobStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class JobLifecycleStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    inactive = "inactive"


class ApplicationStatus(str, enum.Enum):
    applied = "applied"
    withdrawn = "withdrawn"


class InterviewStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    completed = "completed"
    cancelled = "cancelled"


class HireStatus(str, enum.Enum):
    yes = "yes"
    no = "no"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    candidate_profile = relationship("CandidateProfile", uselist=False, back_populates="user")
    company = relationship("Company", uselist=False, back_populates="user")


class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[CompanyStatus] = mapped_column(Enum(CompanyStatus), default=CompanyStatus.pending, index=True)
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="company")
    jobs = relationship("Job", back_populates="company")


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    university: Mapped[str | None] = mapped_column(String(255), nullable=True)
    degree: Mapped[str | None] = mapped_column(String(255), nullable=True)
    graduation_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    experience_years: Mapped[float] = mapped_column(Float, default=0)
    visibility_flag: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    leetcode_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    hackerrank_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    portfolio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="candidate_profile")
    skills = relationship("CandidateSkill", back_populates="profile", cascade="all, delete-orphan")
    projects = relationship("CandidateProject", back_populates="profile", cascade="all, delete-orphan")


class CandidateSkill(Base):
    __tablename__ = "candidate_skills"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id"), index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)

    profile = relationship("CandidateProfile", back_populates="skills")


class CandidateProject(Base):
    __tablename__ = "candidate_projects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    technologies: Mapped[list] = mapped_column(JSON, default=list)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    profile = relationship("CandidateProfile", back_populates="projects")


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    experience_level: Mapped[str] = mapped_column(String(120))
    education_requirement: Mapped[str] = mapped_column(String(255))
    location: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    apply_threshold: Mapped[float] = mapped_column(Float, default=60.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    lifecycle_status: Mapped[JobLifecycleStatus] = mapped_column(
        Enum(JobLifecycleStatus),
        default=JobLifecycleStatus.active,
        index=True,
    )
    hiring_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Bag of optional fields the AI generator (or user) can fill in:
    # job_summary, key_responsibilities, preferred_skills, employment_type,
    # work_mode, salary_range, benefits, career_growth_path, department,
    # seniority_level, interview_process, tags. JSON keeps the schema flexible
    # while still being queryable on PostgreSQL via JSONB operators.
    extra: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="jobs")
    skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")


class JobSkill(Base):
    __tablename__ = "job_skills"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)

    job = relationship("Job", back_populates="skills")


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (UniqueConstraint("candidate_id", "job_id", name="uq_candidate_job"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    skill_score: Mapped[float] = mapped_column(Float, default=0)
    project_score: Mapped[float] = mapped_column(Float, default=0)
    education_score: Mapped[float] = mapped_column(Float, default=0)
    experience_score: Mapped[float] = mapped_column(Float, default=0)
    total_score: Mapped[float] = mapped_column(Float, default=0, index=True)
    explanation: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ShortlistStatus(str, enum.Enum):
    shortlisted = "shortlisted"
    rejected = "rejected"


class Shortlist(Base):
    __tablename__ = "shortlists"
    __table_args__ = (UniqueConstraint("company_id", "candidate_id", "job_id", name="uq_shortlist"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    status: Mapped[ShortlistStatus] = mapped_column(Enum(ShortlistStatus), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("candidate_id", "job_id", name="uq_application"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus), default=ApplicationStatus.applied, index=True
    )
    match_score_at_apply: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InterviewRequest(Base):
    __tablename__ = "interview_requests"
    __table_args__ = (UniqueConstraint("company_id", "candidate_id", "job_id", name="uq_interview"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    status: Mapped[InterviewStatus] = mapped_column(
        Enum(InterviewStatus), default=InterviewStatus.pending, index=True
    )
    interview_date: Mapped[datetime] = mapped_column(DateTime)
    hire_status: Mapped[HireStatus | None] = mapped_column(Enum(HireStatus), nullable=True)
    meeting_link: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ResumeFile(Base):
    __tablename__ = "resume_files"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id"), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(120))
    s3_key: Mapped[str] = mapped_column(String(512), unique=True)
    size_bytes: Mapped[int] = mapped_column(Integer)
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.pending, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CareerReport(Base):
    __tablename__ = "career_reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id"), index=True, unique=True)
    professional_summary: Mapped[str] = mapped_column(Text)
    suggested_paths: Mapped[list] = mapped_column(JSON, default=list)
    skill_gaps: Mapped[list] = mapped_column(JSON, default=list)
    resume_suggestions: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(255), index=True)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class AiGenerationLog(Base):
    """One row per AI job-description draft. Used for per-company rate limiting
    and cost/audit visibility — never exposed to other companies."""
    __tablename__ = "ai_generation_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    role_name: Mapped[str] = mapped_column(String(120))
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    used_fallback: Mapped[bool] = mapped_column(Boolean, default=False)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
