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
    max_applicants: Optional[int] = None  # e.g. 100 — exclude listings with more applicants


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
    applicant_count: Optional[int] = None        # exact number when available
    applicant_count_label: Optional[str] = None  # e.g. "Over 200 applicants", "Be an early applicant"
    applicant_count_source: Optional[str] = None # where the count came from
    uk_visa_sponsor: Optional[bool] = None       # True = confirmed Skilled Worker sponsor
    uk_sponsor_city: Optional[str] = None        # city from the register (helps confirm UK office)


class SearchResponse(BaseModel):
    jobs: list[Job]
    total: int
    page: int
    query: str
    sources_searched: list[str]
    errors: list[str] = []
