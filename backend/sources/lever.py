"""Lever ATS — free public job board API for companies using Lever.
No API key needed.
"""
import hashlib
import httpx
from typing import Optional
from .base import BaseJobSource
from ..models import Job, WorkType

# Well-known companies using Lever (add more as needed)
LEVER_COMPANIES = [
    "netflix", "twitter", "lyft", "instacart", "robinhood",
    "plaid", "brex", "rippling", "gusto", "lattice",
    "carta", "deel", "remote", "mercury", "ramp",
    "anduril", "scale", "nuro", "waymo", "cruise",
    "flexport", "faire", "attentive", "klaviyo", "sendbird",
    "amplitude", "mixpanel", "heap", "fullstory", "statsig",
    "lacework", "wiz", "snyk", "semgrep", "chainguard",
    "coda", "retool", "glean", "moveworks", "writer",
    "perplexity", "adept", "inflection", "character",
]


class LeverSource(BaseJobSource):
    name = "Lever"
    BASE_URL = "https://api.lever.co/v0/postings/{company}"

    def __init__(self, companies: Optional[list[str]] = None):
        self.companies = companies or LEVER_COMPANIES

    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        work_type: WorkType = WorkType.any,
        page: int = 1,
    ) -> list[Job]:
        query_lower = query.lower()
        jobs = []

        async with httpx.AsyncClient(timeout=20) as client:
            for company in self.companies:
                try:
                    params: dict = {"mode": "json"}
                    if location:
                        params["location"] = location
                    resp = await client.get(
                        self.BASE_URL.format(company=company),
                        params=params,
                    )
                    if resp.status_code != 200:
                        continue
                    data = resp.json()
                except Exception:
                    continue

                if not isinstance(data, list):
                    continue

                for item in data:
                    title = item.get("text", "")
                    if query_lower not in title.lower():
                        continue

                    categories = item.get("categories", {})
                    loc = categories.get("location", "")
                    commitment = categories.get("commitment", "")
                    team = categories.get("team", "")

                    combined = f"{title} {loc} {commitment}".lower()
                    if "remote" in combined:
                        wtype = "remote"
                    elif "hybrid" in combined:
                        wtype = "hybrid"
                    else:
                        wtype = "onsite"

                    if work_type != WorkType.any and wtype != work_type.value:
                        continue
                    if location and location.lower() not in loc.lower() and "remote" not in loc.lower():
                        continue

                    job_id = hashlib.md5(item.get("hostedUrl", "").encode()).hexdigest()[:12]
                    jobs.append(
                        Job(
                            id=f"lever_{job_id}",
                            title=title,
                            company=company.replace("-", " ").title(),
                            location=loc or "Unknown",
                            work_type=wtype,
                            description=item.get("description", "")[:500],
                            url=item.get("hostedUrl", ""),
                            source=f"{self.name} ({company})",
                            posted_at=str(item.get("createdAt", "")),
                            tags=[team] if team else [],
                        )
                    )

        return jobs
