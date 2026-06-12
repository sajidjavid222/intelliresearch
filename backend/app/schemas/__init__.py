"""Pydantic schemas shared across the API and agents."""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Domain result objects (agent outputs) ----------
class Paper(BaseModel):
    title: str
    authors: list[str] = []
    venue: Optional[str] = None
    year: Optional[int] = None
    citation_count: Optional[int] = None
    doi: Optional[str] = None
    abstract: Optional[str] = None
    url: Optional[str] = None
    pdf_url: Optional[str] = None
    source: str = ""
    publisher: Optional[str] = None  # e.g. IEEE, Nature, Springer, ACM
    relevance_score: float = 0.0
    is_seminal: bool = False
    fields_of_study: list[str] = []


class Dataset(BaseModel):
    name: str
    description: Optional[str] = None
    num_samples: Optional[str] = None
    modalities: list[str] = []
    license: Optional[str] = None
    download_url: Optional[str] = None
    url: Optional[str] = None
    source: str = ""
    tasks: list[str] = []
    downloads: Optional[int] = None


class Grant(BaseModel):
    title: str
    agency: str = ""
    eligibility: Optional[str] = None
    amount: Optional[str] = None
    deadline: Optional[str] = None
    url: Optional[str] = None
    match_score: float = 0.0
    source: str = ""


class Conference(BaseModel):
    name: str
    acronym: Optional[str] = None
    submission_deadline: Optional[str] = None
    notification_date: Optional[str] = None
    rank: Optional[str] = None
    acceptance_rate: Optional[str] = None
    location: Optional[str] = None
    url: Optional[str] = None
    source: str = ""


class Repository(BaseModel):
    name: str
    full_name: Optional[str] = None
    description: Optional[str] = None
    url: str
    stars: Optional[int] = None
    framework: Optional[str] = None
    language: Optional[str] = None
    reproducibility_score: float = 0.0
    source: str = ""


class Patent(BaseModel):
    title: str
    patent_number: Optional[str] = None
    inventors: list[str] = []
    assignee: Optional[str] = None
    year: Optional[int] = None
    abstract: Optional[str] = None
    url: Optional[str] = None
    source: str = ""


class Collaborator(BaseModel):
    name: str
    affiliation: Optional[str] = None
    h_index: Optional[int] = None
    paper_count: Optional[int] = None
    citation_count: Optional[int] = None
    interests: list[str] = []
    url: Optional[str] = None
    match_score: float = 0.0


# ---------- Search / orchestration ----------
class SearchRequest(BaseModel):
    query: str
    agents: Optional[list[str]] = None  # None => orchestrator auto-selects
    limit: int = 15


class ChatRequest(BaseModel):
    question: str
    topic: str = ""  # the search topic these papers came from
    papers: Optional[list["Paper"]] = None  # client may pass the result set


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict[str, Any]] = []


class LiteratureReview(BaseModel):
    summary: str
    methodologies: list[str] = []
    research_gaps: list[str] = []
    strengths: list[str] = []
    weaknesses: list[str] = []
    future_directions: list[str] = []
    comparison_table: list[dict[str, Any]] = []


class ResearchGapResult(BaseModel):
    opportunities: list[dict[str, Any]] = []
    thesis_topics: list[str] = []


class Proposal(BaseModel):
    title: str
    problem_statement: str
    objectives: list[str]
    methodology: str
    expected_outcomes: str
    budget: list[dict[str, Any]] = []


class SearchResponse(BaseModel):
    query: str
    intent: dict[str, Any] = {}
    agents_run: list[str] = []
    papers: list[Paper] = []
    datasets: list[Dataset] = []
    grants: list[Grant] = []
    conferences: list[Conference] = []
    repositories: list[Repository] = []
    patents: list[Patent] = []
    collaborators: list[Collaborator] = []
    literature_review: Optional[LiteratureReview] = None
    research_gaps: Optional[ResearchGapResult] = None
    elapsed_ms: int = 0


# ---------- Users / auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    name: str = ""
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    research_interests: str = ""
    affiliation: str = ""
    role: str = ""
    institution: str = ""
    department: str = ""
    country: str = ""
    bio: str = ""
    orcid: str = ""
    google_scholar: str = ""
    website: str = ""
    github: str = ""

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Dashboard CRUD ----------
class SaveItemRequest(BaseModel):
    item_type: str
    title: str
    payload: dict[str, Any] = {}
    collection_id: Optional[str] = None


class CollectionRequest(BaseModel):
    name: str
    description: str = ""
    color: str = "brand"


class MoveItemRequest(BaseModel):
    collection_id: Optional[str] = None  # None => remove from any collection


class SubscriptionRequest(BaseModel):
    topic: str
    watch_papers: bool = True
    watch_grants: bool = True
    watch_datasets: bool = True
    watch_cfps: bool = True


class AlertOut(BaseModel):
    id: str
    kind: str
    title: str
    message: str
    payload: dict[str, Any]
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True
