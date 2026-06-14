"""Chat-with-PDF: extract a PDF's text, chunk it, and answer questions
grounded in the document with page-cited sources.

Retrieval is the same lightweight lexical scorer used for paper RAG, but over
page-aware text chunks. Documents live in a small in-memory LRU store (the
extracted text only — the PDF bytes stay in the browser), which is plenty for
the "upload → ask a few questions" flow and needs zero infra.
"""
from __future__ import annotations

import io
import re
import uuid
from collections import Counter, OrderedDict

from app.services.llm import get_llm

_WORD = re.compile(r"[a-z0-9]+")

MAX_DOCS = 30          # LRU cap across all users (extracted text only)
MAX_PAGES = 120        # bound extraction time/memory
CHUNK_CHARS = 1100
CHUNK_OVERLAP = 150

# doc_id -> {title, filename, pages, chunks, references, word_count}
_DOCS: "OrderedDict[str, dict]" = OrderedDict()


def _tokens(text: str) -> list[str]:
    return _WORD.findall((text or "").lower())


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def extract_pages(data: bytes) -> list[str]:
    """Per-page plain text. Pages that fail to extract become empty strings."""
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    pages: list[str] = []
    for page in reader.pages[:MAX_PAGES]:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    return pages


def _chunk_pages(pages: list[str]) -> list[dict]:
    chunks: list[dict] = []
    for pidx, raw in enumerate(pages, 1):
        text = re.sub(r"[ \t]+", " ", raw).strip()
        if not text:
            continue
        start = 0
        while start < len(text):
            chunks.append({"page": pidx, "text": text[start : start + CHUNK_CHARS]})
            start += CHUNK_CHARS - CHUNK_OVERLAP
    return chunks


def _guess_title(pages: list[str]) -> str:
    if not pages:
        return "Untitled document"
    for line in pages[0].splitlines():
        s = line.strip()
        # Skip arXiv stamps / page furniture; take the first substantial line.
        if len(s) > 8 and not s.lower().startswith(("arxiv", "doi", "http")):
            return s[:200]
    return "Untitled document"


def _extract_references(pages: list[str]) -> list[str]:
    """Best-effort: grab the bibliography section and split it into entries."""
    full = "\n".join(pages)
    tail = ""
    headings = list(re.finditer(r"(?im)^\s*(references|bibliography)\s*$", full))
    if headings:
        tail = full[headings[-1].end() :]
    else:
        idx = full.lower().rfind("\nreferences")
        if idx != -1:
            tail = full[idx + len("\nreferences") :]
    tail = tail.strip()
    if not tail:
        return []
    # Prefer splitting on numbered markers ([1] or "1."); else fall back to lines.
    entries = re.split(r"\n(?=\[\d+\]|\d+\.\s)", tail)
    if len(entries) < 3:
        entries = tail.splitlines()
    cleaned = [_norm(e) for e in entries]
    cleaned = [e for e in cleaned if len(e) > 30]
    return cleaned[:60]


def store_document(filename: str, data: bytes) -> dict:
    pages = extract_pages(data)
    chunks = _chunk_pages(pages)
    doc_id = str(uuid.uuid4())
    _DOCS[doc_id] = {
        "title": _guess_title(pages),
        "filename": filename,
        "pages": len(pages),
        "chunks": chunks,
        "references": _extract_references(pages),
        "word_count": sum(len(_tokens(p)) for p in pages),
    }
    _DOCS.move_to_end(doc_id)
    while len(_DOCS) > MAX_DOCS:
        _DOCS.popitem(last=False)

    preview = next((_norm(p)[:600] for p in pages if p.strip()), "")
    doc = _DOCS[doc_id]
    return {
        "doc_id": doc_id,
        "title": doc["title"],
        "filename": filename,
        "pages": doc["pages"],
        "word_count": doc["word_count"],
        "references": doc["references"],
        "preview": preview,
        "extractable": bool(chunks),
    }


def _score(qterms: Counter, text: str) -> float:
    toks = _tokens(text)
    if not toks:
        return 0.0
    tf = Counter(toks)
    overlap = sum(tf[t] for t in qterms)
    return overlap / (len(toks) ** 0.5)


def _retrieve(question: str, chunks: list[dict], k: int = 6) -> list[dict]:
    qterms = Counter(t for t in _tokens(question) if len(t) > 2)
    if not qterms:
        return chunks[:k]
    ranked = sorted(chunks, key=lambda c: _score(qterms, c["text"]), reverse=True)
    return [c for c in ranked if _score(qterms, c["text"]) > 0][:k] or chunks[:k]


async def chat(doc_id: str, question: str) -> dict:
    """Answer `question` grounded in the stored document, with page citations."""
    doc = _DOCS.get(doc_id)
    if not doc:
        return {"error": "not_found"}
    _DOCS.move_to_end(doc_id)  # keep recently-used docs warm

    chunks = doc["chunks"]
    if not chunks:
        return {
            "answer": (
                "I couldn't extract any text from this PDF — it may be a scanned "
                "document (images only). Try a text-based PDF."
            ),
            "sources": [],
        }

    top = _retrieve(question, chunks, k=6)
    sources = [
        {"n": i, "page": c["page"], "snippet": _norm(c["text"])[:240]}
        for i, c in enumerate(top, 1)
    ]

    llm = get_llm()
    if not llm.available:
        bullets = "\n".join(f"• [{s['n']}] (p.{s['page']}) {s['snippet']}…" for s in sources)
        return {
            "answer": "LLM not configured — here are the most relevant passages:\n\n" + bullets,
            "sources": sources,
        }

    context = "\n\n".join(
        f"[{i}] (page {c['page']}) {_norm(c['text'])[:900]}" for i, c in enumerate(top, 1)
    )
    system = (
        "You are a precise research assistant answering questions about ONE document. "
        "Use ONLY the provided excerpts. Cite claims inline with [n] matching the "
        "excerpts (each maps to a page number). If the excerpts don't answer the "
        "question, say so plainly. Be concise and specific."
    )
    prompt = (
        f'Question: {question}\n\nExcerpts from "{doc["title"]}":\n{context}\n\n'
        "Answer with inline [n] citations."
    )
    answer = await llm.complete(prompt, system, max_tokens=900)
    return {"answer": answer, "sources": sources}


async def chat_multi(doc_ids: list[str], question: str) -> dict:
    """Answer `question` grounded across SEVERAL documents at once. Sources name
    both the document and the page."""
    pool: list[dict] = []
    for did in doc_ids:
        doc = _DOCS.get(did)
        if not doc:
            continue
        _DOCS.move_to_end(did)
        for c in doc["chunks"]:
            pool.append({
                "page": c["page"], "text": c["text"],
                "doc_id": did, "doc_title": doc["title"],
            })
    if not pool:
        return {"error": "not_found"}

    top = _retrieve(question, pool, k=7)
    sources = [
        {
            "n": i, "page": c["page"], "snippet": _norm(c["text"])[:240],
            "doc_id": c["doc_id"], "doc_title": c["doc_title"],
        }
        for i, c in enumerate(top, 1)
    ]

    llm = get_llm()
    if not llm.available:
        bullets = "\n".join(
            f"• [{s['n']}] {s['doc_title']} (p.{s['page']}) {s['snippet']}…" for s in sources
        )
        return {
            "answer": "LLM not configured — most relevant passages:\n\n" + bullets,
            "sources": sources,
        }

    context = "\n\n".join(
        f"[{i}] ({c['doc_title']}, page {c['page']}) {_norm(c['text'])[:850]}"
        for i, c in enumerate(top, 1)
    )
    system = (
        "You are a precise research assistant answering a question across MULTIPLE "
        "documents. Use ONLY the provided excerpts. Cite claims inline with [n] (each "
        "maps to a document + page). Where documents agree or differ, say so. Be concise."
    )
    prompt = (
        f"Question: {question}\n\nExcerpts:\n{context}\n\nAnswer with inline [n] citations."
    )
    answer = await llm.complete(prompt, system, max_tokens=1000)
    return {"answer": answer, "sources": sources}
