from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import CandidateProfile, Company, User, UserRole
from .security import decode_token

bearer = HTTPBearer(auto_error=True)


def is_account_disabled(user: User, db: Session) -> bool:
    """True when the admin has flipped is_disabled on this user's profile or company row.

    Admins are never disable-able (no profile row carries the flag). Students with no
    profile row yet are treated as enabled — they haven't done anything to be disabled for.
    """
    role = user.role.value if hasattr(user.role, "value") else user.role
    if role == UserRole.student.value:
        profile = (
            db.query(CandidateProfile)
            .filter(CandidateProfile.user_id == user.id)
            .first()
        )
        return bool(profile and profile.is_disabled)
    if role == UserRole.company.value:
        company = db.query(Company).filter(Company.user_id == user.id).first()
        return bool(company and company.is_disabled)
    return False


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(creds.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if is_account_disabled(user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="account_disabled")
    return user


def require_role(*roles: UserRole):
    allowed = tuple(r.value if hasattr(r, "value") else r for r in roles)

    def role_dependency(user: User = Depends(get_current_user)) -> User:
        user_role = user.role.value if hasattr(user.role, "value") else user.role
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires role {'/'.join(allowed)} but you are signed in as {user_role}.",
            )
        return user

    return role_dependency
