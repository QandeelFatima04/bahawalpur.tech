from fastapi.testclient import TestClient

from app.main import app
from tests.helpers import auth, register, unique_email


def test_register_login_flow():
    client = TestClient(app)
    email, token = register(client, "student")
    assert token

    res = client.post("/auth/login", json={"email": email, "password": "Password123!"})
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]

    # Wrong password fails
    res = client.post("/auth/login", json={"email": email, "password": "wrong-password"})
    assert res.status_code == 401


def test_duplicate_registration_is_rejected():
    client = TestClient(app)
    email = unique_email("dup")
    r1 = client.post("/auth/register", json={"email": email, "password": "Password123!", "role": "student"})
    assert r1.status_code == 200
    r2 = client.post("/auth/register", json={"email": email, "password": "Password123!", "role": "student"})
    assert r2.status_code == 409


def test_role_based_guards():
    client = TestClient(app)
    _, student_token = register(client, "student")
    # Student cannot call admin endpoints
    res = client.get("/admin/analytics", headers=auth(student_token))
    assert res.status_code == 403

    # Student cannot call company endpoints
    res = client.get("/companies/jobs", headers=auth(student_token))
    assert res.status_code == 403


def test_admin_can_access_admin_endpoints():
    client = TestClient(app)
    _, admin_token = register(client, "admin")
    res = client.get("/admin/analytics", headers=auth(admin_token))
    assert res.status_code == 200
    body = res.json()
    assert "students_total" in body and "jobs_active" in body
