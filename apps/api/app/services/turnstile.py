"""Cloudflare Turnstile server-side verification.

A single helper, `verify_turnstile`, called at the top of every captcha-protected
handler. When no secret key is configured (local dev / pytest) it is a no-op, so the
existing test suite and local development keep working without solving a challenge.
"""
import logging

import httpx
from fastapi import HTTPException, status

from ..config import get_settings

logger = logging.getLogger("careerbridge")
settings = get_settings()

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile(token: str | None) -> None:
    """Raise 403 if the Turnstile token is missing or fails Cloudflare's check.

    No-op when ``turnstile_secret_key`` is unset (dev/tests). Handlers are sync
    ``def`` so the sync ``httpx.post`` here runs inside FastAPI's threadpool.
    """
    if not settings.turnstile_secret_key:
        return
    if not token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="captcha_required"
        )
    try:
        result = httpx.post(
            VERIFY_URL,
            data={"secret": settings.turnstile_secret_key, "response": token},
            timeout=10,
        ).json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("turnstile-verify-error exc=%s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="captcha_unavailable"
        )
    if not result.get("success"):
        logger.info("turnstile-verify-failed codes=%s", result.get("error-codes"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="captcha_failed"
        )
