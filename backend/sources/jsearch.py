"""JSearch via RapidAPI — aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter.
Get a free API key at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
"""
import hashlib
import httpx
from typing import Optional
from .base import BaseJobSource
from ..models import Job, WorkType
from ..enrich import label_from_jsearch

WORK_TYPE_MAP = {
    WorkType.remote: "TELECOMMUTE",
    WorkType.onsite: "ONSITE",
    WorkType.hybrid: "HYBRID",
}


class JSearchSource(BaseJobSource):
    name = "JSearch"
    BASE_URL = "https://jsearch.p.rapidapi.com/search"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        work_type: WorkType = WorkType.any,
        page: int = 1,
    ) -> list[Job]:
        search_query = query
        if location:
            search_query = f"{query} in {location}"

        params: dict = {
            "query": search_query,
            "page": str(page),
            "num_pages": "1",
        }
        if work_type != WorkType.any and work_type in WORK_TYPE_MAP:
            params["remote_jobs_only"] = "true" if work_type == WorkType.remote else "false"

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                self.BASE_URL,
                params=params,
                headers={
                    "X-RapidAPI-Key": self.api_key,
                    "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        jobs = []
        for item in data.get("data", []):
            job_id = hashlib.md5(item.get("job_apply_link", item.get("job_id", "")).encode()).hexdigest()[:12]
            salary = ""
            if item.get("job_min_salary") and item.get("job_max_salary"):
                period = item.get("job_salary_period", "year")
                salary = f"${item['job_min_salary']:,.0f} – ${item['job_max_salary']:,.0f}/{period}"

            apply_count, apply_label = label_from_jsearch(item)
            jobs.append(
                Job(
                    id=f"jsearch_{job_id}",
                    title=item.get("job_title", ""),
                    company=item.get("employer_name", ""),
                    location=f"{item.get('job_city', '')}, {item.get('job_state', '')}".strip(", "),
                    work_type=self._normalize_work_type(
                        "remote" if item.get("job_is_remote") else item.get("job_employment_type", "")
                    ),
                    description=item.get("job_description", "")[:500],
                    url=item.get("job_apply_link") or item.get("job_google_link", ""),
                    source=f"{self.name} ({item.get('job_publisher', 'LinkedIn/Indeed')})",
                    posted_at=item.get("job_posted_at_datetime_utc", ""),
                    salary=salary,
                    tags=item.get("job_required_skills") or [],
                    applicant_count=apply_count,
                    applicant_count_label=apply_label,
                    applicant_count_source="JSearch" if apply_count is not None else None,
                )
            )
        return jobs
