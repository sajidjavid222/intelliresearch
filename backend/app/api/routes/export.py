"""Export routes: BibTeX, proposal DOCX/PDF/Markdown, and a monitoring trigger."""
from fastapi import APIRouter, Query, Response
from fastapi.responses import PlainTextResponse

from app.agents import analysis, discovery
from app.schemas import Paper, Proposal
from app.services import export as export_svc

router = APIRouter(prefix="/export", tags=["export"])


@router.post("/bibtex", response_class=PlainTextResponse)
async def export_bibtex(papers: list[Paper]):
    return export_svc.papers_to_bibtex(papers)


@router.get("/bibtex", response_class=PlainTextResponse)
async def export_bibtex_by_query(q: str, limit: int = 20):
    papers = await discovery.paper_discovery_agent(q, limit)
    return export_svc.papers_to_bibtex(papers)


@router.post("/ris", response_class=PlainTextResponse)
async def export_ris(papers: list[Paper]):
    """RIS — import into Zotero, Mendeley, EndNote, RefWorks."""
    return export_svc.papers_to_ris(papers)


@router.get("/ris")
async def export_ris_by_query(q: str, limit: int = 20):
    papers = await discovery.paper_discovery_agent(q, limit)
    return Response(
        content=export_svc.papers_to_ris(papers),
        media_type="application/x-research-info-systems",
        headers={"Content-Disposition": f'attachment; filename="{q[:40]}.ris"'},
    )


@router.get("/proposal")
async def export_proposal(
    topic: str = Query(...), fmt: str = Query("md", pattern="^(md|docx|pdf)$")
):
    papers = await discovery.paper_discovery_agent(topic, 8)
    proposal = await analysis.proposal_agent(topic, papers)

    if fmt == "md":
        return PlainTextResponse(export_svc.proposal_to_markdown(proposal))

    if fmt == "docx":
        data = export_svc.proposal_to_docx(proposal)
        if data:
            return Response(
                content=data,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": "attachment; filename=proposal.docx"},
            )
    if fmt == "pdf":
        data = export_svc.proposal_to_pdf(proposal)
        if data:
            return Response(
                content=data,
                media_type="application/pdf",
                headers={"Content-Disposition": "attachment; filename=proposal.pdf"},
            )
    # Fallback to markdown if optional libs are missing.
    return PlainTextResponse(export_svc.proposal_to_markdown(proposal))
