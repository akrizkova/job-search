"""Adzuna — free API key available at developer.adzuna.com."""
import hashlib
import httpx
from typing import Optional
from .base import BaseJobSource
from ..models import Job, WorkType

# Country code map for Adzuna endpoints
COUNTRY_MAP = {
    "us": "us", "uk": "gb", "gb": "gb", "au": "au",
    "ca": "ca", "de": "de", "fr": "fr", "in": "in",
    "nl": "nl", "sg": "sg", "nz": "nz", "za": "za",
}


class AdzunaSource(BaseJobSource):
    name = "Adzuna"

    def __init__(self, app_id: str, app_key: str, country: str = "us"):
        self.app_id = app_id
        self.app_key = app_key
        self.country = COUNTRY_MAP.get(country.lower(), "us")

    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        work_type: WorkType = WorkType.any,
        page: int = 1,
    ) -> list[Job]:
        params: dict = {
            "app_id": self.app_id,
            "app_key": self.app_key,
            "results_per_page": 20,
            "what": query,
            "content-type": "application/json",
        }
        if location:
            params["where"] = location
        if work_type == WorkType.remote:
            params["what"] = f"{query} remote"

        url = f"https://api.adzuna.com/v1/api/jobs/{self.country}/search/{page}"

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        jobs = []
        for item in data.get("results", []):
            job_id = hashlib.md5(item.get("redirect_url", "").encode()).hexdigest()[:12]
            contract = item.get("contract_type", "")
            loc = item.get("location", {}).get("display_name", location or "")
            salary_min = item.get("salary_min")
            salary_max = item.get("salary_max")
            salary = ""
            if salary_min and salary_max:
                salary = f"${salary_min:,.0f} – ${salary_max:,.0f}"
            elif salary_min:
                salary = f"${salary_min:,.0f}+"

            jobs.append(
                Job(
                    id=f"adzuna_{job_id}",
                    title=item.get("title", ""),
                    company=item.get("company", {}).get("display_name", ""),
                    location=loc,
                    work_type=self._normalize_work_type(contract),
                    description=item.get("description", "")[:500],
                    url=item.get("redirect_url", ""),
                    source=self.name,
                    posted_at=item.get("created", ""),
                    salary=salary,
                    tags=[c.get("label", "") for c in item.get("category", {}).get("label", [])
                          if isinstance(c, dict)] if isinstance(item.get("category"), dict) else [],
                )
            )
        return jobs
