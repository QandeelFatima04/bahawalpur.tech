from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import InterviewRequest
from tests.helpers import approve_all_companies, auth, register


def _bootstrap_application(client, threshold=0.0):
    _, company_token = register(client, "company")
    approve_all_companies()
    _, student_token = register(client, "student")

    job_res = client.post(
        "/companies/jobs",
        json={
            "title": "Eng", "required_skills": ["Python"],
            "experience_level": "entry", "education_requirement": "BSCS",
            "location": "Remote", "description": "x",
            "apply_threshold": threshold,
        },
        headers=auth(company_token),
    )
    job_id = job_res.json()["id"]

    client.put(
        "/students/me/profile",
        json={
            "university": "IUB", "degree": "BSCS", "graduation_year": 2024,
            "experience_years": 1.0, "summary": "x",
            "skills": ["Python"], "projects": [],
        },
        headers=auth(student_token),
    )
    client.patch("/students/me/visibility", json={"visibility_flag": True}, headers=auth(student_token))
    apply_res = client.post("/students/me/applications", json={"job_id": job_id}, headers=auth(student_token))
    assert apply_res.status_code == 200

    # Pull candidate_id from the student's profile
    profile = client.get("/students/me/profile", headers=auth(student_token)).json()
    return company_token, student_token, job_id, profile["id"]


def _make_interview(client, company_token, candidate_id, job_id, days_out=2) -> int:
    future = (datetime.utcnow() + timedelta(days=days_out)).isoformat()
    res = client.post(
        "/companies/interviews",
        json={"candidate_id": candidate_id, "job_id": job_id, "interview_date": future},
        headers=auth(company_token),
    )
    assert res.status_code == 200, res.text
    return res.json()["id"]


def test_pending_to_accepted_flow():
    client = TestClient(app)
    company_token, student_token, job_id, candidate_id = _bootstrap_application(client)
    interview_id = _make_interview(client, company_token, candidate_id, job_id)

    # Student sees the interview
    rows = client.get("/students/me/interviews", headers=auth(student_token)).json()
    assert any(r["id"] == interview_id and r["status"] == "pending" for r in rows)

    # Student accepts
    res = client.post(f"/students/me/interviews/{interview_id}/accept", headers=auth(student_token))
    assert res.status_code == 200
    assert res.json()["status"] == "accepted"

    # Cannot accept twice
    res = client.post(f"/students/me/interviews/{interview_id}/accept", headers=auth(student_token))
    assert res.status_code == 409


def test_pending_to_rejected():
    client = TestClient(app)
    company_token, student_token, job_id, candidate_id = _bootstrap_application(client)
    interview_id = _make_interview(client, company_token, candidate_id, job_id)

    res = client.post(f"/students/me/interviews/{interview_id}/reject", headers=auth(student_token))
    assert res.status_code == 200
    assert res.json()["status"] == "rejected"


def test_hire_blocked_before_interview_date():
    client = TestClient(app)
    company_token, student_token, job_id, candidate_id = _bootstrap_application(client)
    interview_id = _make_interview(client, company_token, candidate_id, job_id, days_out=5)

    # Accept it so the "only accepted interviews can be hired" guard passes
    client.post(f"/students/me/interviews/{interview_id}/accept", headers=auth(student_token))

    res = client.post(
        f"/companies/interviews/{interview_id}/hire",
        json={"hired": True},
        headers=auth(company_token),
    )
    # Interview is in the future -> 400
    assert res.status_code == 400


def test_hire_yes_on_interview_date():
    client = TestClient(app)
    company_token, student_token, job_id, candidate_id = _bootstrap_application(client)
    interview_id = _make_interview(client, company_token, candidate_id, job_id, days_out=5)
    client.post(f"/students/me/interviews/{interview_id}/accept", headers=auth(student_token))

    # Back-date the interview so the hire decision is allowed (simulating the day-of)
    db = SessionLocal()
    try:
        interview = db.query(InterviewRequest).filter(InterviewRequest.id == interview_id).first()
        interview.interview_date = datetime.utcnow() - timedelta(hours=1)
        db.commit()
    finally:
        db.close()

    res = client.post(
        f"/companies/interviews/{interview_id}/hire",
        json={"hired": True},
        headers=auth(company_token),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "completed"
    assert body["hire_status"] == "yes"


def test_hire_blocked_when_interview_not_accepted():
    client = TestClient(app)
    company_token, student_token, job_id, candidate_id = _bootstrap_application(client)
    interview_id = _make_interview(client, company_token, candidate_id, job_id, days_out=1)

    # Back-date but do NOT accept the interview
    db = SessionLocal()
    try:
        interview = db.query(InterviewRequest).filter(InterviewRequest.id == interview_id).first()
        interview.interview_date = datetime.utcnow() - timedelta(hours=1)
        db.commit()
    finally:
        db.close()

    res = client.post(
        f"/companies/interviews/{interview_id}/hire",
        json={"hired": True},
        headers=auth(company_token),
    )
    assert res.status_code == 409
