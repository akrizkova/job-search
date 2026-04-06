"""Greenhouse ATS — free public job board API for companies using Greenhouse.
No API key needed. Supports thousands of companies.
Find a company's board token at: https://boards.greenhouse.io/{company}
"""
import hashlib
import httpx
from typing import Optional
from .base import BaseJobSource
from ..models import Job, WorkType

# Well-known companies using Greenhouse (add more as needed)
GREENHOUSE_COMPANIES = [
    # US Tech / Infra
    "airbnb", "stripe", "coinbase", "figma", "notion", "linear",
    "vercel", "supabase", "planetscale", "neon", "clerk", "resend",
    "discord", "twitch", "reddit", "dropbox", "box", "hubspot",
    "datadog", "hashicorp", "mongodb", "elastic", "confluent",
    "snowflake", "databricks", "dbt-labs", "airbyte", "fivetran",
    "netlify", "render", "railway", "fly", "cloudflare",
    "github", "gitlab", "jetbrains", "sentry", "posthog",
    "loom", "miro", "airtable", "webflow", "framer",
    "grafana", "temporal", "buf", "turso", "novu",
    # AI / ML
    "anthropic", "scale-ai", "weights-and-biases", "huggingface",
    "openai", "cohere", "together", "modal", "mistral",
    "coreweave", "runwayml",
    # UK / EU Tech
    "deliveroo", "darktrace", "graphcore", "tractable", "tessian",
    "jagex", "king", "asos", "trustpilot", "spotify", "kry",
    "supercell", "helsing", "onfido", "farfetch", "thought-machine",
    "clearscore",
    # Remote-first / Creator economy
    "automattic", "doist", "buffer", "hotjar", "toptal",
    # Gaming
    "riotgames",
]


class GreenhouseSource(BaseJobSource):
    name = "Greenhouse"
    BASE_URL = "https://boards-api.greenhouse.io/v1/boards/{company}/jobs"

    def __init__(self, companies: Optional[list[str]] = None):
        self.companies = companies or GREENHOUSE_COMPANIES

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
                    resp = await client.get(
                        self.BASE_URL.format(company=company),
                        params={"content": "true"},
                    )
                    if resp.status_code != 200:
                        continue
                    data = resp.json()
                except Exception:
                    continue

                query_words = query_lower.split()
                for item in data.get("jobs", []):
                    title = item.get("title", "")
                    depts = " ".join(d.get("name", "") for d in item.get("departments", []))
                    desc = item.get("content", "")[:400]
                    searchable = f"{title} {depts} {desc}".lower()
                    if not all(w in searchable for w in query_words):
                        continue

                    loc_name = ""
                    for loc in item.get("offices", []):
                        loc_name = loc.get("name", "")
                        break
                    if not loc_name:
                        loc_name = item.get("location", {}).get("name", "")

                    # Work type detection from location/title
                    combined = f"{title} {loc_name}".lower()
                    if "remote" in combined:
                        wtype = "remote"
                    elif "hybrid" in combined:
                        wtype = "hybrid"
                    else:
                        wtype = "onsite"

                    if work_type != WorkType.any and wtype != work_type.value:
                        if not (work_type == WorkType.remote and "remote" in loc_name.lower()):
                            continue

                    if location and location.lower() not in loc_name.lower() and "remote" not in loc_name.lower():
                        continue

                    job_id = hashlib.md5(str(item.get("absolute_url", "")).encode()).hexdigest()[:12]
                    jobs.append(
                        Job(
                            id=f"greenhouse_{job_id}",
                            title=title,
                            company=company.replace("-", " ").title(),
                            location=loc_name or "Unknown",
                            work_type=wtype,
                            description=item.get("content", "")[:500],
                            url=item.get("absolute_url", ""),
                            source=f"{self.name} ({company})",
                            posted_at=item.get("updated_at", ""),
                            tags=[d.get("name", "") for d in item.get("departments", [])],
                        )
                    )

        return jobs
