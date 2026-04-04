"""Workday ATS — used by most large enterprises (HSBC, Barclays, NHS, etc.).
Public JSON API, no key needed. Each company has a subdomain + board name.
"""
import hashlib
import httpx
from typing import Optional
from .base import BaseJobSource
from ..models import Job, WorkType

# (name, subdomain, board_id, wd_version)
# Find a company's board at: https://{subdomain}.wd{N}.myworkdayjobs.com/{board}
WORKDAY_COMPANIES: list[tuple[str, str, str, int]] = [
    # UK Finance
    ("HSBC", "hsbc", "external", 3),
    ("Barclays", "barclays", "Barclays", 3),
    ("Lloyds Banking Group", "lloyds", "Lloyds_Careers", 3),
    ("NatWest Group", "natwestgroup", "Careers", 3),
    ("Standard Chartered", "standardchartered", "global-careers", 3),
    ("Santander UK", "santander", "SantanderCareers", 3),
    ("Legal & General", "legalandgeneral", "External", 3),
    ("Aviva", "aviva", "External", 3),
    ("Prudential", "prudential", "External", 3),
    ("AstraZeneca", "astrazeneca", "Careers", 3),
    ("GSK", "gsk", "External", 3),
    ("Rolls-Royce", "rollsroyce", "External", 3),
    ("BAE Systems", "baesystems", "External", 3),
    ("Unilever", "unilever", "External", 3),
    ("BP", "bp", "External", 3),
    ("Shell", "shell", "Shell_External", 3),
    ("Tesco", "tesco", "External", 3),
    ("Marks and Spencer", "marksandspencer", "External", 3),
    ("Vodafone", "vodafone", "External", 3),
    ("BT Group", "bt", "External", 3),
    # UK Tech
    ("Sage Group", "sage", "External", 3),
    ("Aveva", "aveva", "External", 3),
    ("Kainos", "kainos", "kainos-jobs", 3),
    ("Experian", "experian", "External", 3),
    ("Capita", "capita", "External", 3),
    ("Serco", "serco", "External", 3),
    # Global Tech with large UK presence
    ("Amazon", "amazon", "external-career-site", 3),
    ("Salesforce", "salesforce", "External", 3),
    ("Oracle", "oracle", "jobsearch", 3),
    ("IBM", "ibm", "External", 3),
    ("Accenture", "accenture", "AccentureCareers", 3),
    ("Deloitte", "deloitte", "Deloitte-Careers", 3),
    ("KPMG UK", "kpmg", "KPMGUK", 3),
    ("PwC UK", "pwc", "Global_Campus_Career", 3),
    ("EY", "ey", "EY-External", 3),
    ("Capgemini", "capgemini", "External", 3),
    ("CGI", "cgi", "External", 3),
    ("Fujitsu UK", "fujitsu", "External", 3),
    ("Wipro", "wipro", "External", 3),
    ("Infosys", "infosys", "Careers", 3),
    ("TCS", "tcs", "CareerOpportunities", 3),
]


class WorkdaySource(BaseJobSource):
    name = "Workday"

    def __init__(self, companies: Optional[list[tuple]] = None):
        self.companies = companies or WORKDAY_COMPANIES

    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        work_type: WorkType = WorkType.any,
        page: int = 1,
    ) -> list[Job]:
        jobs: list[Job] = []
        offset = (page - 1) * 20

        async with httpx.AsyncClient(
            timeout=20,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
        ) as client:
            for name, subdomain, board, wdN in self.companies:
                try:
                    page_jobs = await self._fetch_company(
                        client, name, subdomain, board, wdN, query, location, work_type, offset
                    )
                    jobs.extend(page_jobs)
                except Exception:
                    continue

        return jobs

    async def _fetch_company(
        self,
        client: httpx.AsyncClient,
        company_name: str,
        subdomain: str,
        board: str,
        wdN: int,
        query: str,
        location: Optional[str],
        work_type: WorkType,
        offset: int,
    ) -> list[Job]:
        url = (
            f"https://{subdomain}.wd{wdN}.myworkdayjobs.com"
            f"/wday/cxs/{subdomain}/{board}/jobs"
        )
        body: dict = {
            "limit": 20,
            "offset": offset,
            "searchText": query,
        }
        if location:
            body["locations"] = [{"type": "JobLocations", "searchValue": location}]

        resp = await client.post(url, json=body)
        if resp.status_code != 200:
            return []

        data = resp.json()
        jobs = []
        base_url = f"https://{subdomain}.wd{wdN}.myworkdayjobs.com/{board}"

        for item in data.get("jobPostings", []):
            title = item.get("title", "")
            loc = item.get("locationsText", "")
            external_path = item.get("externalPath", "")
            job_url = f"{base_url}{external_path}" if external_path else base_url

            combined = f"{title} {loc}".lower()
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

            job_id = hashlib.md5(job_url.encode()).hexdigest()[:12]
            jobs.append(
                Job(
                    id=f"workday_{job_id}",
                    title=title,
                    company=company_name,
                    location=loc or "See posting",
                    work_type=wtype,
                    url=job_url,
                    source=f"Workday ({company_name})",
                    posted_at=item.get("postedOn", ""),
                )
            )

        return jobs
