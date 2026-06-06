"""Turnstile verification is a no-op when unconfigured, and enforced when a secret is set."""
from fastapi.testclient import TestClient

from app.main import app
from app.services import turnstile
from tests.helpers import unique_email


def test_no_secret_skips_verification():
    # Default test config has no turnstile_secret_key, so login without a token still
    # reaches the credential check (401 for an unknown user, not a 403 captcha error).
    client = TestClient(app)
    res = client.post("/auth/login", json={"email": unique_email("nobody"), "password": "x"})
    assert res.status_code == 401


def test_missing_token_rejected_when_secret_set(monkeypatch):
    # With a secret configured, a request carrying no token is rejected before any
    # credential logic runs — proving the gate is wired in.
    monkeypatch.setattr(turnstile.settings, "turnstile_secret_key", "test-secret")
    client = TestClient(app)
    res = client.post("/auth/login", json={"email": unique_email("nobody"), "password": "x"})
    assert res.status_code == 403
    assert res.json()["detail"] == "captcha_required"
