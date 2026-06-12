"""Chat-with-PDF: upload a PDF (text extracted server-side) and ask grounded,
page-cited questions about it."""
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.agents import pdf_chat

router = APIRouter(prefix="/pdf", tags=["pdf"])

MAX_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    name = (file.filename or "").lower()
    if not name.endswith(".pdf") and file.content_type != "application/pdf":
        raise HTTPException(415, "Please upload a PDF file.")
    data = await file.read()
    if not data:
        raise HTTPException(400, "The uploaded file was empty.")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "PDF is too large (max 20 MB).")
    try:
        return pdf_chat.store_document(file.filename or "document.pdf", data)
    except Exception as exc:  # malformed / encrypted PDF
        raise HTTPException(422, f"Could not read this PDF: {exc}")


class PdfChatRequest(BaseModel):
    doc_id: str
    question: str


@router.post("/chat")
async def chat(body: PdfChatRequest):
    question = (body.question or "").strip()
    if not question:
        raise HTTPException(422, "Please enter a question.")
    out = await pdf_chat.chat(body.doc_id, question)
    if out.get("error") == "not_found":
        raise HTTPException(
            404, "Document not found — it may have expired. Please re-upload the PDF."
        )
    return out
