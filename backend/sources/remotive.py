"""Remotive.com — free API, no key needed, remote jobs only."""
import hashlib
import httpx
from typing import Optional
from .base import BaseJobSource
from ..models import Job, WorkType


class RemotiveSource(BaseJobSource):
    name = "Remotive"
    BASE_URL = "https://remotive.com/api/remote-jobs"

    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        work_type: WorkType = WorkType.any,
        page: int = 1,
    ) -> list[Job]:
        if work_type == WorkType.onsite:
            return []

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                self.BASE_URL,
                params={"search": query, "limit": 20},
            )
            resp.raise_for_status()
            data = resp.json()

        jobs = []
        for item in data.get("jobs", []):
            job_id = hashlib.md5(item["url"].encode()).hexdigest()[:12]
            jobs.append(
                Job(
                    id=f"remotive_{job_id}",
                    title=item.get("title", ""),
                    company=item.get("company_name", ""),
                    location=item.get("candidate_required_location") or "Remote",
                    work_type="remote",
                    description=item.get("description", "")[:500],
                    url=item.get("url", ""),
                    source=self.name,
                    posted_at=item.get("publication_date", ""),
                    salary=item.get("salary", ""),
                    tags=item.get("tags", []),
                )
            )
        return jobs
