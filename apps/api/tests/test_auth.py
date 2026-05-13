from fastapi.testclient import TestClient

from app.main import app
from tests.helpers import auth, register, set_student_disabled, unique_email


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
    assert r1.status_code == 201
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


def test_disabled_student_cannot_login():
    """Admin disable -> login is blocked at the auth layer with a stable detail code."""
    client = TestClient(app)
    email, _ = register(client, "student")

    set_student_disabled(email, True)

    res = client.post("/auth/login", json={"email": email, "password": "Password123!"})
    assert res.status_code == 403, res.text
    assert res.json()["detail"] == "account_disabled"


def test_disabled_student_token_rejected_on_protected_routes():
    """A live session must stop working as soon as the admin flips the disabled flag."""
    client = TestClient(app)
    email, token = register(client, "student")

    # Token works before disable
    assert client.get("/students/me/profile", headers=auth(token)).status_code == 200

    set_student_disabled(email, True)

    # The same access token must now be rejected
    res = client.get("/students/me/profile", headers=auth(token))
    assert res.status_code == 403
    assert res.json()["detail"] == "account_disabled"


def test_reenabled_student_can_login_again():
    """Disable -> re-enable should fully restore login."""
    client = TestClient(app)
    email, _ = register(client, "student")

    set_student_disabled(email, True)
    res = client.post("/auth/login", json={"email": email, "password": "Password123!"})
    assert res.status_code == 403

    set_student_disabled(email, False)
    res = client.post("/auth/login", json={"email": email, "password": "Password123!"})
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_disabled_student_refresh_rejected():
    """The refresh path is the other doorway — close it too."""
    client = TestClient(app)
    email, _ = register(client, "student")

    login = client.post("/auth/login", json={"email": email, "password": "Password123!"})
    refresh_token = login.json()["refresh_token"]

    set_student_disabled(email, True)

    res = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 403
    assert res.json()["detail"] == "account_disabled"
