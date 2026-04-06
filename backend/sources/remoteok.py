"""RemoteOK — free public API, no key needed, remote jobs only."""
import hashlib
import httpx
from typing import Optional
from .base import BaseJobSource
from ..models import Job, WorkType


class RemoteOKSource(BaseJobSource):
    name = "RemoteOK"
    BASE_URL = "https://remoteok.com/api"

    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        work_type: WorkType = WorkType.any,
        page: int = 1,
    ) -> list[Job]:
        if work_type == WorkType.onsite:
            return []

        # RemoteOK returns all jobs; we filter client-side by query
        async with httpx.AsyncClient(
            timeout=20,
            headers={"User-Agent": "JobSearchApp/1.0"},
        ) as client:
            resp = await client.get(self.BASE_URL)
            resp.raise_for_status()
            data = resp.json()

        query_words = query.lower().split()
        jobs = []
        for item in data:
            if not isinstance(item, dict) or "id" not in item:
                continue
            title = item.get("position", "")
            company = item.get("company", "")
            tags = item.get("tags") or []
            if isinstance(tags, list):
                tags = [str(t) for t in tags]
            desc = item.get("description", "")[:300]

            searchable = f"{title} {company} {' '.join(tags)} {desc}".lower()
            if not all(w in searchable for w in query_words):
                continue

            job_id = str(item.get("id", ""))
            jobs.append(
                Job(
                    id=f"remoteok_{job_id}",
                    title=title,
                    company=company,
                    location=item.get("location") or "Remote",
                    work_type="remote",
                    description=desc,
                    url=item.get("url", f"https://remoteok.com/remote-jobs/{job_id}"),
                    source=self.name,
                    posted_at=item.get("date", ""),
                    salary=item.get("salary", ""),
                    tags=tags[:10],
                )
            )
            if len(jobs) >= 300:  # cap after matching, not before
                break

        return jobs
