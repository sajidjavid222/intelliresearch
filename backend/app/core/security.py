"""Password hashing and JWT helpers.

Uses the `bcrypt` library directly (not passlib) to avoid passlib's broken
version probing against bcrypt >= 5.0. bcrypt has a hard 72-byte input limit,
so we truncate before hashing/verifying.
"""
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"


def _to_bytes(password: str) -> bytes:
    # bcrypt rejects inputs longer than 72 bytes; truncate consistently.
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_to_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bytes(plain), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def create_reset_token(user_id: str, pw_fingerprint: str) -> str:
    """Short-lived password-reset token. The fingerprint (a slice of the current
    password hash) binds the token to the current password, so it becomes invalid
    once the password changes — i.e. effectively single-use."""
    expire = datetime.utcnow() + timedelta(hours=1)
    payload = {"sub": user_id, "type": "reset", "fp": pw_fingerprint, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_reset_token(token: str) -> Optional[tuple[str, str]]:
    """Return (user_id, fingerprint) for a valid reset token, else None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "reset":
            return None
        return payload.get("sub"), payload.get("fp", "")
    except JWTError:
        return None
