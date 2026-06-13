"""Transactional email via Resend (HTTP API — no SDK needed).

Entirely optional: every function is a safe no-op until RESEND_API_KEY and
EMAIL_FROM are configured, so the app runs identically without email.
"""
from __future__ import annotations

import logging

import httpx

from app.core.config import settings

log = logging.getLogger("uvicorn.error")

_TIMEOUT = httpx.Timeout(20.0, connect=10.0)


def email_enabled() -> bool:
    return bool(settings.RESEND_API_KEY and settings.EMAIL_FROM)


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send one HTML email. Returns True on success, False otherwise."""
    if not email_enabled():
        return False
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "html": html},
            )
        if r.status_code >= 400:
            log.warning("Email send failed (%s): %s", r.status_code, r.text[:200])
            return False
        return True
    except Exception as exc:  # network / unexpected
        log.warning("Email send error: %s", exc)
        return False


def render_email(
    heading: str,
    intro: str,
    cta_text: str | None = None,
    cta_url: str | None = None,
    body_html: str = "",
) -> str:
    """Wrap content in a simple, email-client-safe HTML layout."""
    button = ""
    if cta_text and cta_url:
        button = (
            f'<a href="{cta_url}" style="display:inline-block;margin-top:8px;'
            f"background:#13b886;color:#ffffff;text-decoration:none;font-weight:bold;"
            f'padding:12px 22px;border-radius:10px;">{cta_text}</a>'
        )
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f8f7;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:28px 18px;">
    <div style="font-size:20px;font-weight:bold;color:#0a4e3c;">IntelliResearch</div>
    <div style="background:#ffffff;border-radius:14px;padding:26px;margin-top:14px;border:1px solid #eceff0;">
      <h1 style="font-size:20px;margin:0 0 10px;color:#0e1817;">{heading}</h1>
      <p style="color:#4e5b59;line-height:1.6;margin:0 0 14px;">{intro}</p>
      {button}
      {body_html}
    </div>
    <p style="color:#82908f;font-size:12px;margin-top:16px;text-align:center;">
      You're receiving this because you have an IntelliResearch account.
    </p>
  </div>
</body></html>"""
