"""SmartRecruiters ATS — public REST API, no key needed.
Used by: Lidl, Bosch, Ikea, McDonald's UK, LinkedIn, Twitter/X, and many others.
"""
import hashlib
import httpx
from typing import Optional
from .base import BaseJobSource
from ..models import Job, WorkType

# (display_name, smartrecruiters_company_id)
SMARTRECRUITERS_COMPANIES = [
    ("Lidl UK", "LidlGB"),
    ("IKEA", "IKEA"),
    ("Bosch", "BoschGroup"),
    ("McDonald's UK", "McDonaldsUK"),
    ("Vodafone", "Vodafone"),
    ("Adidas", "adidas"),
    ("Zalando", "Zalando"),
    ("HelloFresh", "HelloFreshGroup"),
    ("N26", "N26"),
    ("Trade Republic", "TradeRepublic"),
    ("Contentful", "Contentful"),
    ("Personio", "Personio"),
    ("Babbel", "Babbel"),
    ("About You", "AboutYouGmbH"),
    ("Raisin", "Raisin"),
    ("SumUp", "SumUp"),
    ("GoCardless", "GoCardless"),
    ("Thought Machine", "ThoughtMachine"),
    ("WorldFirst", "WorldFirst"),
    ("Moonpig", "Moonpig"),
    ("Bumble", "Bumble"),
    ("Phoebe Media", "Phoebe"),
    ("Treatwell", "Treatwell"),
    ("Secret Escapes", "SecretEscapes"),
    ("Skyscanner", "Skyscanner"),
]


class SmartRecruitersSource(BaseJobSource):
    name = "SmartRecruiters"
    BASE_URL = "https://api.smartrecruiters.com/v1/companies/{company}/postings"

    def __init__(self, companies: Optional[list[tuple]] = None):
        self.companies = companies or SMARTRECRUITERS_COMPANIES

    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        work_type: WorkType = WorkType.any,
        page: int = 1,
    ) -> list[Job]:
        jobs: list[Job] = []

        async with httpx.AsyncClient(timeout=15) as client:
            for display_name, company_id in self.companies:
                try:
                    page_jobs = await self._fetch_company(
                        client, display_name, company_id, query, location, work_type
                    )
                    jobs.extend(page_jobs)
                except Exception:
                    continue

        return jobs

    async def _fetch_company(
        self,
        client: httpx.AsyncClient,
        display_name: str,
        company_id: str,
        query: str,
        location: Optional[str],
        work_type: WorkType,
    ) -> list[Job]:
        params: dict = {
            "status": "PUBLISHED",
            "keyword": query,
            "limit": 20,
        }
        if location:
            params["city"] = location

        resp = await client.get(
            self.BASE_URL.format(company=company_id),
            params=params,
        )
        if resp.status_code != 200:
            return []

        data = resp.json()
        jobs = []

        for item in data.get("content", []):
            title = item.get("name", "")
            loc_data = item.get("location", {})
            city = loc_data.get("city", "")
            country = loc_data.get("country", "")
            loc = ", ".join(filter(None, [city, country]))
            remote = loc_data.get("remote", False)

            if remote:
                wtype = "remote"
            else:
                wtype = "onsite"

            if work_type == WorkType.remote and wtype != "remote":
                continue

            job_id = item.get("id") or item.get("ref", "")
            apply_url = f"https://jobs.smartrecruiters.com/{company_id}/{job_id}"

            jid = hashlib.md5(apply_url.encode()).hexdigest()[:12]
            jobs.append(
                Job(
                    id=f"sr_{jid}",
                    title=title,
                    company=display_name,
                    location=loc or ("Remote" if remote else "See posting"),
                    work_type=wtype,
                    url=apply_url,
                    source=f"SmartRecruiters ({display_name})",
                    tags=[
                        item.get("department", {}).get("label", ""),
                        item.get("typeOfEmployment", {}).get("label", ""),
                    ],
                )
            )

        return jobs
