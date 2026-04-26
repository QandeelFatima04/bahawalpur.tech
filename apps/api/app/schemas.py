from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_serializer


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["student", "company", "admin"]
    company_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class ProjectIn(BaseModel):
    title: str
    technologies: list[str] = Field(default_factory=list)
    description: str | None = None


class ProfileUpsertRequest(BaseModel):
    university: str | None = None
    degree: str | None = None
    graduation_year: int | None = None
    experience_years: float = 0
    summary: str | None = None
    current_location: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    leetcode_url: str | None = None
    hackerrank_url: str | None = None
    portfolio_url: str | None = None
    skills: list[str] = Field(default_factory=list)
    projects: list[ProjectIn] = Field(default_factory=list)


class ProfileResponse(BaseModel):
    id: int
    university: str | None
    degree: str | None
    graduation_year: int | None
    experience_years: float
    visibility_flag: bool
    summary: str | None
    current_location: str | None
    linkedin_url: str | None
    github_url: str | None
    leetcode_url: str | None
    hackerrank_url: str | None
    portfolio_url: str | None
    skills: list[str]
    projects: list[ProjectIn]


class VisibilityRequest(BaseModel):
    visibility_flag: bool


class AsyncJobResponse(BaseModel):
    id: int
    status: Literal["pending", "processing", "completed", "failed"]
    started_at: datetime | None
    completed_at: datetime | None
    error: str | None


class JobCreateRequest(BaseModel):
    title: str
    required_skills: list[str]
    experience_level: str
    education_requirement: str
    location: str
    description: str
    apply_threshold: float = Field(default=60.0, ge=0, le=100)
    hiring_limit: int | None = Field(default=None, ge=1, le=10000)
    extra: dict | None = None


class JobUpdateRequest(BaseModel):
    title: str | None = None
    required_skills: list[str] | None = None
    experience_level: str | None = None
    education_requirement: str | None = None
    location: str | None = None
    description: str | None = None
    apply_threshold: float | None = Field(default=None, ge=0, le=100)
    is_active: bool | None = None
    status: Literal["active", "paused", "inactive"] | None = None
    hiring_limit: int | None = Field(default=None, ge=0, le=10000)
    extra: dict | None = None


class JobResponse(BaseModel):
    id: int
    company_id: int
    title: str
    required_skills: list[str]
    experience_level: str
    education_requirement: str
    location: str
    description: str
    apply_threshold: float
    is_active: bool
    status: Literal["active", "paused", "inactive"]
    hiring_limit: int | None
    hires_count: int
    applicant_count: int = 0
    extra: dict | None = None


class JobDraftRequest(BaseModel):
    role_name: str = Field(min_length=2, max_length=100)
    seniority_hint: Literal["entry", "junior", "mid", "senior", "lead"] | None = None


class JobDraftResponse(BaseModel):
    """AI-generated draft. Frontend pre-fills the create-job form with these fields; the user
    edits and submits via POST /companies/jobs as usual. `used_fallback` lets the UI surface a
    softer message when the LLM was unavailable."""
    title: str
    job_summary: str
    key_responsibilities: list[str]
    required_skills: list[str]
    preferred_skills: list[str]
    experience_level: str
    required_experience_years: float
    education_requirement: str
    employment_type: str
    work_mode: str
    salary_range: str | None = None
    location: str | None = None
    benefits: list[str]
    career_growth_path: str
    department: str
    seniority_level: str
    interview_process: list[str]
    tags: list[str]
    used_fallback: bool = False


class StudentJobRow(BaseModel):
    id: int
    company_id: int
    company_name: str
    title: str
    required_skills: list[str]
    missing_skills: list[str]
    experience_level: str
    education_requirement: str
    location: str
    description: str
    apply_threshold: float
    total_score: float
    skill_score: float
    project_score: float
    education_score: float
    experience_score: float
    already_applied: bool


class CandidateMatchResponse(BaseModel):
    candidate_id: int
    skill_score: float
    project_score: float
    education_score: float
    experience_score: float
    total_score: float
    explanation: str


class ApplicantRow(BaseModel):
    application_id: int
    candidate_id: int
    university: str | None
    degree: str | None
    graduation_year: int | None
    experience_years: float
    skills: list[str]
    linkedin_url: str | None
    github_url: str | None
    leetcode_url: str | None
    hackerrank_url: str | None
    status: Literal["applied", "withdrawn"]
    match_score_at_apply: float
    current_total_score: float
    applied_at: datetime


class ApplicationCreate(BaseModel):
    job_id: int


class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    job_title: str
    company_name: str
    status: Literal["applied", "withdrawn"]
    match_score_at_apply: float
    created_at: datetime


class ShortlistRequest(BaseModel):
    candidate_id: int
    job_id: int
    status: Literal["shortlisted", "rejected"]


class ContactRequest(BaseModel):
    candidate_id: int
    job_id: int
    message: str


class CompanyDecisionRequest(BaseModel):
    decision: Literal["approve", "reject"]


class CompanyMeResponse(BaseModel):
    id: int
    name: str
    status: Literal["pending", "approved", "rejected"]
    is_disabled: bool
    email: str


class CareerReportResponse(BaseModel):
    professional_summary: str
    suggested_paths: list[str]
    skill_gaps: list[str]
    resume_suggestions: list[str]


class InterviewCreate(BaseModel):
    candidate_id: int
    job_id: int
    interview_date: datetime


class InterviewResponse(BaseModel):
    id: int
    candidate_id: int
    company_id: int
    company_name: str
    job_id: int
    job_title: str
    interview_date: datetime
    status: Literal["pending", "accepted", "rejected", "completed", "cancelled"]
    hire_status: Literal["yes", "no"] | None
    meeting_link: str | None = None
    created_at: datetime

    @field_serializer("interview_date")
    def _ser_interview_date(self, v: datetime) -> str:
        # The DB stores naive UTC datetimes. Serialize with an explicit Z so the
        # browser's `new Date(...)` treats it as UTC and renders in local time.
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat().replace("+00:00", "Z")


class HireDecision(BaseModel):
    hired: bool


class InterviewUpdate(BaseModel):
    status: Literal["cancelled"] | None = None
    interview_date: datetime | None = None


class AdminStudentRow(BaseModel):
    id: int
    user_id: int
    email: str
    university: str | None
    degree: str | None
    graduation_year: int | None
    experience_years: float
    visibility_flag: bool
    is_disabled: bool


class AdminCompanyRow(BaseModel):
    id: int
    user_id: int
    email: str
    name: str
    status: Literal["pending", "approved", "rejected"]
    is_disabled: bool


class AdminJobRow(BaseModel):
    id: int
    company_id: int
    company_name: str
    title: str
    location: str
    apply_threshold: float
    is_active: bool
    status: Literal["active", "paused", "inactive"]
    applicant_count: int


class AdminStudentUpdate(BaseModel):
    is_disabled: bool | None = None
    visibility_flag: bool | None = None
    university: str | None = None
    degree: str | None = None
    graduation_year: int | None = None
    experience_years: float | None = None


class AdminCompanyUpdate(BaseModel):
    is_disabled: bool | None = None
    name: str | None = None
    status: Literal["pending", "approved", "rejected"] | None = None


class AdminJobUpdate(BaseModel):
    is_active: bool | None = None
    status: Literal["active", "paused", "inactive"] | None = None
    title: str | None = None
    location: str | None = None
    apply_threshold: float | None = Field(default=None, ge=0, le=100)


class AnalyticsResponse(BaseModel):
    students_total: int
    companies_verified: int
    jobs_active: int
    interviews_active: int
    pending_companies: int
    matches_total: int
