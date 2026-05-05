"""Internal endpoints invoked by the host's cron / scheduler. Auth is a single shared
secret in the X-Cron-Secret header. Never expose these to the public internet without
the secret check; the nginx vhost can additionally restrict by source IP if desired.
"""
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..services.reminders import send_due_reminders

logger = logging.getLogger("careerbridge.internal")
router = APIRouter(prefix="/internal", tags=["internal"])
settings = get_settings()


def _require_secret(x_cron_secret: str | None = Header(default=None)):
    expected = settings.internal_cron_secret
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="INTERNAL_CRON_SECRET not configured on the server",
        )
    if not x_cron_secret or x_cron_secret != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="bad secret")


@router.post("/run-reminders", dependencies=[Depends(_require_secret)])
def run_reminders(db: Session = Depends(get_db)):
    summary = send_due_reminders(db)
    return summary
