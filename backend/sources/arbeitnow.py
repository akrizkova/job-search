"""Arbeitnow — free public job board API, no key needed, CORS-friendly.
API: https://arbeitnow.com/api/job-board-api?page=N
Returns ~100 jobs/page across tech/remote roles globally.
No server-side search — filter client-side with AND-word matching.
"""
import asyncio
import hashlib
import httpx
from typing import Optional
from .base import BaseJobSource
from ..models import Job, WorkType


class ArbeitnowSource(BaseJobSource):
    name = "Arbeitnow"
    BASE_URL = "https://arbeitnow.com/api/job-board-api"
    PAGES = 5  # ~500 raw candidates before filtering

    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        work_type: WorkType = WorkType.any,
        page: int = 1,
    ) -> list[Job]:
        query_words = query.lower().split()

        async with httpx.AsyncClient(timeout=20) as client:
            responses = await asyncio.gather(
                *[
                    client.get(self.BASE_URL, params={"page": p})
                    for p in range(1, self.PAGES + 1)
                ],
                return_exceptions=True,
            )

        jobs: list[Job] = []
        for resp in responses:
            if isinstance(resp, Exception):
                continue
            if resp.status_code != 200:
                continue
            try:
                data = resp.json()
            except Exception:
                continue

            for item in data.get("data", []):
                title = item.get("title", "")
                company = item.get("company_name", "")
                tags = item.get("tags") or []
                if isinstance(tags, list):
                    tags = [str(t) for t in tags]
                desc = item.get("description", "")[:400]

                searchable = f"{title} {' '.join(tags)} {desc}".lower()
                if not all(w in searchable for w in query_words):
                    continue

                is_remote = item.get("remote", False)
                loc = item.get("location", "")

                if is_remote:
                    wtype = "remote"
                elif "hybrid" in loc.lower():
                    wtype = "hybrid"
                else:
                    wtype = "onsite"

                if work_type != WorkType.any and wtype != work_type.value:
                    continue
                if location and location.lower() not in loc.lower() and not is_remote:
                    continue

                url = item.get("url", "")
                job_id = hashlib.md5(
                    (url or title + company).encode()
                ).hexdigest()[:12]

                jobs.append(
                    Job(
                        id=f"arbeitnow_{job_id}",
                        title=title,
                        company=company,
                        location=loc or ("Remote" if is_remote else "See posting"),
                        work_type=wtype,
                        description=desc,
                        url=url,
                        source=self.name,
                        posted_at=item.get("created_at", ""),
                        tags=tags[:10],
                    )
                )

        return jobs
