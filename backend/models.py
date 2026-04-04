from pydantic import BaseModel
from typing import Optional
from enum import Enum


class WorkType(str, Enum):
    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"
    any = "any"


class SearchRequest(BaseModel):
    query: str
    location: Optional[str] = None
    work_type: WorkType = WorkType.any
    page: int = 1
    results_per_page: int = 20


class Job(BaseModel):
    id: str
    title: str
    company: str
    location: str
    work_type: Optional[str] = None
    description: Optional[str] = None
    url: str
    source: str
    posted_at: Optional[str] = None
    salary: Optional[str] = None
    tags: list[str] = []


class SearchResponse(BaseModel):
    jobs: list[Job]
    total: int
    page: int
    query: str
    sources_searched: list[str]
    errors: list[str] = []
