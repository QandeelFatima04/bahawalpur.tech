from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import Company, User, UserRole
from ..schemas import LoginRequest, PasswordResetRequest, RefreshRequest, RegisterRequest, TokenResponse
from ..security import create_token, hash_password, verify_password, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _issue_tokens(user: User) -> TokenResponse:
    access = create_token(str(user.id), user.role.value, settings.access_token_minutes, "access")
    refresh = create_token(str(user.id), user.role.value, settings.refresh_token_minutes, "refresh")
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    role = UserRole(payload.role)
    user = User(email=payload.email, password_hash=hash_password(payload.password), role=role)
    db.add(user)
    try:
        db.flush()  # get user.id so we can FK it without committing
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
    return _issue_tokens(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    token = decode_token(payload.refresh_token)
    if token.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == int(token["sub"])).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return _issue_tokens(user)


@router.post("/logout")
def logout():
    return {"message": "Logged out"}


@router.post("/password-reset")
def password_reset(payload: PasswordResetRequest):
    return {"message": f"Password reset requested for {payload.email}"}
