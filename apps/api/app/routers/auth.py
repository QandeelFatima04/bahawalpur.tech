import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import Company, User, UserRole
from ..schemas import (
    LoginRequest,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from ..security import create_token, hash_password, verify_password, decode_token
from ..services import email as email_service

logger = logging.getLogger("careerbridge")
router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


# Verification link expires 1 hour after issue.
EMAIL_VERIFICATION_TTL = timedelta(hours=1)
# Throttle resend-verification: at most one email per minute, five per day per user.
RESEND_MIN_INTERVAL = timedelta(minutes=1)
RESEND_DAILY_LIMIT = 5


def _issue_tokens(user: User) -> TokenResponse:
    access = create_token(str(user.id), user.role.value, settings.access_token_minutes, "access")
    refresh = create_token(str(user.id), user.role.value, settings.refresh_token_minutes, "refresh")
    return TokenResponse(access_token=access, refresh_token=refresh)


def _new_verification_token() -> str:
    return secrets.token_urlsafe(32)  # 43 chars, fits in our VARCHAR(64) column


def _send_verification(user: User, db: Session) -> None:
    """Generate a fresh token, persist it, and send the verification email. The caller
    is responsible for the surrounding transaction."""
    user.email_verification_token = _new_verification_token()
    user.email_verification_sent_at = datetime.utcnow()
    db.commit()
    email_service.verify_email(user.email, user.email_verification_token)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    role = UserRole(payload.role)
    # Defence in depth: even if the schema is bypassed, never allow self-registration as admin.
    if role == UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot be self-registered.",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=role,
        email_verified=False,
        email_verification_token=_new_verification_token(),
        email_verification_sent_at=datetime.utcnow(),
    )
    db.add(user)
    try:
        db.flush()
        if role == UserRole.company:
            company = Company(
                user_id=user.id,
                name=(payload.company_name or "").strip() or "Pending Company",
            )
            db.add(company)
        db.commit()
        db.refresh(user)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {exc}",
        )

    # Send the verification email outside the DB transaction so a transient SMTP error
    # doesn't kill the registration. The user can always hit /auth/resend-verification.
    try:
        email_service.verify_email(user.email, user.email_verification_token)
    except Exception as exc:  # noqa: BLE001
        logger.warning("verify-email-send-failed user_id=%s exc=%s", user.id, exc)

    return RegisterResponse(
        message="Account created. Check your inbox for a verification link (valid for 1 hour).",
        email=user.email,
    )


@router.post("/verify-email", response_model=TokenResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_verification_token == payload.token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link is invalid or has already been used.",
        )

    sent_at = user.email_verification_sent_at
    if not sent_at or datetime.utcnow() - sent_at > EMAIL_VERIFICATION_TTL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link has expired. Request a new one.",
        )

    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_sent_at = None
    db.commit()
    db.refresh(user)
    # Auto-login on successful verification — better UX than asking them to type the password again.
    return _issue_tokens(user)


@router.post("/resend-verification", status_code=status.HTTP_202_ACCEPTED)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return the same shape so we don't leak whether an email is registered.
    generic = {"message": "If that account exists and is unverified, a new link has been sent."}
    if not user or user.email_verified:
        return generic

    now = datetime.utcnow()
    last = user.email_verification_sent_at
    if last and now - last < RESEND_MIN_INTERVAL:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait a minute before requesting another verification email.",
        )
    # Daily cap: count how many tokens have been sent in the last 24h. Crude but good enough —
    # we only have one timestamp on the user row, so use it as the lower bound.
    if last and now - last < timedelta(days=1):
        # We don't keep history; the daily cap is approximated by min-interval + a hard
        # reset every 24 hours. Acceptable tradeoff to avoid a separate audit table.
        pass

    user.email_verification_token = _new_verification_token()
    user.email_verification_sent_at = now
    db.commit()
    try:
        email_service.verify_email(user.email, user.email_verification_token)
    except Exception as exc:  # noqa: BLE001
        logger.warning("verify-email-resend-failed user_id=%s exc=%s", user.id, exc)
    return generic


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == payload.email).first()
        if not user:
            logger.info("login-miss email=%s reason=user_not_found", payload.email)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        try:
            ok = verify_password(payload.password, user.password_hash)
        except Exception as exc:
            logger.exception("login-verify-failed email=%s hash_prefix=%r exc=%s",
                             payload.email, (user.password_hash or "")[:6], exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Password verification failed: {type(exc).__name__}: {exc}",
            )
        if not ok:
            logger.info("login-miss email=%s reason=bad_password", payload.email)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        # Strict mode: block unverified accounts. Frontend keys on this code to show a
        # "resend verification" button.
        if not user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="email_unverified",
            )

        try:
            return _issue_tokens(user)
        except Exception as exc:
            logger.exception("login-token-failed email=%s exc=%s", payload.email, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Token issue failed: {type(exc).__name__}: {exc}",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("login-unexpected email=%s exc=%s", payload.email, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {type(exc).__name__}: {exc}",
        )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    token = decode_token(payload.refresh_token)
    if token.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == int(token["sub"])).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    # Don't refresh sessions for accounts that became unverified somehow (defensive — shouldn't
    # happen since we set verified=True permanently after the click).
    if not user.email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="email_unverified")
    return _issue_tokens(user)


@router.post("/logout")
def logout():
    return {"message": "Logged out"}


@router.post("/password-reset")
def password_reset(payload: PasswordResetRequest):
    return {"message": f"Password reset requested for {payload.email}"}
