"""Auth routes: email/password register & login, plus Google Sign-In."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.connectors.http import get_json
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_reset_token,
    decode_reset_token,
    hash_password,
    verify_password,
)
from app.db.database import get_db
from app.db.models import User
from app.schemas import Token, UserCreate, UserLogin, UserOut
from app.services.email import email_enabled, render_email, send_email

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleToken(BaseModel):
    credential: str  # the JWT ID token from Google Identity Services


@router.post("/register", response_model=Token)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = (
        await db.execute(select(User).where(User.email == body.email))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
    user = User(
        email=body.email, name=body.name, hashed_password=hash_password(body.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return Token(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    user = (
        await db.execute(select(User).where(User.email == body.email))
    ).scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(
        body.password, user.hashed_password
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return Token(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_profile(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    editable = (
        "name", "research_interests", "affiliation", "role", "institution",
        "department", "country", "bio", "orcid", "google_scholar", "website",
        "github",
    )
    for field in editable:
        if field in body:
            setattr(user, field, str(body[field])[:2000])
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/me")
async def delete_account(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete the account and ALL associated data (GDPR erasure).

    Rows are removed children-first so foreign keys are satisfied on Postgres.
    """
    from sqlalchemy import delete as sql_delete

    from app.db.models import (
        Alert,
        Collection,
        ReadingHistory,
        SavedItem,
        SavedSearch,
        Subscription,
    )

    uid = user.id
    for model in (SavedItem, SavedSearch, Subscription, Alert, Collection, ReadingHistory):
        await db.execute(sql_delete(model).where(model.user_id == uid))
    await db.execute(sql_delete(User).where(User.id == uid))
    await db.commit()
    return {"ok": True}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=6)


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Email a password-reset link. Always responds the same way so the endpoint
    can't be used to discover which emails have accounts."""
    user = (
        await db.execute(select(User).where(User.email == body.email.lower()))
    ).scalar_one_or_none()
    if user and email_enabled():
        token = create_reset_token(user.id, (user.hashed_password or "")[:12])
        link = f"{settings.FRONTEND_ORIGIN}/reset-password?token={token}"
        await send_email(
            user.email,
            "Reset your IntelliResearch password",
            render_email(
                heading="Reset your password",
                intro=(
                    "We received a request to reset your password. This link expires in "
                    "one hour. If you didn't request it, you can safely ignore this email."
                ),
                cta_text="Reset password",
                cta_url=link,
            ),
        )
    return {"ok": True}


@router.post("/reset-password", response_model=Token)
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    decoded = decode_reset_token(body.token)
    if not decoded:
        raise HTTPException(400, "This reset link is invalid or has expired.")
    user_id, fingerprint = decoded
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    # Fingerprint mismatch => the password already changed (token already used).
    if not user or (user.hashed_password or "")[:12] != fingerprint:
        raise HTTPException(400, "This reset link is invalid or has already been used.")
    user.hashed_password = hash_password(body.password)
    await db.commit()
    await db.refresh(user)
    return Token(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/google/config")
async def google_config():
    """Expose whether Google Sign-In is configured (frontend reads this)."""
    return {
        "enabled": bool(settings.GOOGLE_CLIENT_ID),
        "client_id": settings.GOOGLE_CLIENT_ID,
    }


@router.post("/google", response_model=Token)
async def google_login(body: GoogleToken, db: AsyncSession = Depends(get_db)):
    """Verify a Google ID token and sign the user in (creating them if new).

    The frontend obtains `credential` from Google Identity Services and posts it
    here. We verify it via Google's tokeninfo endpoint, checking the audience
    matches our client ID.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Google Sign-In is not configured on the server.",
        )

    info = await get_json(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": body.credential},
    )
    if not info or "email" not in info:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google token")

    # Verify the token was issued for THIS app and the email is verified.
    if info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token audience mismatch")
    if info.get("email_verified") not in (True, "true"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google email not verified")

    email = info["email"].lower()
    google_id = info.get("sub")
    name = info.get("name") or email.split("@")[0]

    user = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()
    if user is None:
        # First Google sign-in for this email — create an account.
        user = User(email=email, name=name, google_id=google_id)
        db.add(user)
    elif not user.google_id:
        # Link Google to an existing email/password account.
        user.google_id = google_id
        if not user.name:
            user.name = name
    await db.commit()
    await db.refresh(user)

    return Token(
        access_token=create_access_token(user.id), user=UserOut.model_validate(user)
    )
