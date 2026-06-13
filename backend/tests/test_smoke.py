"""Hermetic API smoke tests — no external network required.

Covers the auth flow, a couple of static discovery endpoints, auth enforcement,
and the chat-with-PDF upload→ask round-trip (the LLM falls back gracefully when
no key is configured, so this stays offline-safe).
"""
import io
import uuid


def _pdf_bytes() -> bytes:
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(72, 720, "Smoke Test Paper on Federated Learning")
    c.drawString(72, 700, "Abstract: This paper studies federated averaging convergence.")
    c.showPage()
    c.save()
    return buf.getvalue()


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_trending_is_nonempty(client):
    r = client.get("/api/discover/trending")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list) and len(body) > 0


def test_languages(client):
    r = client.get("/api/discover/languages")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_auth_flow(client):
    email = f"ci_{uuid.uuid4().hex[:10]}@example.com"
    reg = client.post(
        "/api/auth/register",
        json={"email": email, "password": "pw_test_1234", "name": "CI Bot"},
    )
    assert reg.status_code == 200, reg.text
    token = reg.json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email

    login = client.post(
        "/api/auth/login", json={"email": email, "password": "pw_test_1234"}
    )
    assert login.status_code == 200
    assert login.json().get("access_token")


def test_protected_route_requires_auth(client):
    r = client.get("/api/dashboard/items")
    assert r.status_code == 401


def test_pdf_upload_and_chat(client):
    up = client.post(
        "/api/pdf/upload",
        files={"file": ("smoke.pdf", _pdf_bytes(), "application/pdf")},
    )
    assert up.status_code == 200, up.text
    data = up.json()
    assert data["extractable"] is True
    assert data["pages"] >= 1

    chat = client.post(
        "/api/pdf/chat",
        json={"doc_id": data["doc_id"], "question": "What does the paper study?"},
    )
    assert chat.status_code == 200
    assert "sources" in chat.json()


def test_pdf_chat_unknown_doc_returns_404(client):
    r = client.post(
        "/api/pdf/chat", json={"doc_id": "does-not-exist", "question": "hi"}
    )
    assert r.status_code == 404


def test_forgot_password_always_ok(client):
    # Responds the same whether or not the email exists (no account enumeration).
    r = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_digest_requires_cron_token(client):
    r = client.post("/api/monitoring/digest")
    assert r.status_code == 403
