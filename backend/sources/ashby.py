"""Ashby ATS — popular with Series A–C startups.
Public REST API, no key needed.
API: https://api.ashbyhq.com/posting-api/job-board/{company}
"""
import hashlib
import httpx
from typing import Optional
from .base import BaseJobSource
from ..models import Job, WorkType

# Well-known companies on Ashby — UK, EU, and global remote-friendly
ASHBY_COMPANIES = [
    # ── UK Fintech / Tech ────────────────────────────────────────────────────
    ("Monzo", "monzo"),
    ("Starling Bank", "starlingbank"),
    ("Wise", "wise"),
    ("Checkout.com", "checkout"),
    ("GoCardless", "gocardless"),
    ("OakNorth", "oaknorth"),
    ("Zopa", "zopa"),
    ("Funding Circle", "fundingcircle"),
    ("TrueLayer", "truelayer"),
    ("Form3", "form3"),
    ("Multiverse", "multiverse"),
    ("Onfido", "onfido"),
    ("Cleo", "cleo"),
    ("Bought By Many", "boughtbymany"),
    ("Unmind", "unmind"),
    ("Nested", "nested"),
    # ── EU Fintech / Tech ────────────────────────────────────────────────────
    ("Klarna", "klarna"),
    ("N26", "n26"),
    ("Paysend", "paysend"),
    ("Vivid Money", "vivid"),
    ("Moss", "getmoss"),
    ("Pleo", "pleo"),
    ("Spendesk", "spendesk"),
    ("Qonto", "qonto"),
    ("Pennylane", "pennylane"),
    ("Silvr", "silvr"),
    ("Alan (health)", "alan"),
    ("Doctolib", "doctolib"),
    ("Alma", "getalma"),
    ("Swile", "swile"),
    ("Payfit", "payfit"),
    ("Luko", "luko"),
    # ── EU AI / Deep Tech ────────────────────────────────────────────────────
    ("Mistral AI", "mistral"),
    ("ElevenLabs", "elevenlabs"),
    ("Poolside", "poolside"),
    ("Wayve", "wayve"),
    ("Cervest", "cervest"),
    ("Coreweave", "coreweave"),
    ("Synthesia", "synthesia"),
    ("Stability AI", "stabilityai"),
    ("PolyAI", "polyai"),
    ("Contextual AI", "contextualai"),
    # ── EU SaaS / Developer Tools ────────────────────────────────────────────
    ("Personio", "personio"),
    ("Factorial", "factorial"),
    ("Pimcore", "pimcore"),
    ("Storyblok", "storyblok"),
    ("Contentful", "contentful"),
    ("Pitch", "pitch"),
    ("Miro", "miro"),
    ("Typeform", "typeform"),
    ("Appcues", "appcues"),
    ("GetResponse", "getresponse"),
    ("Usercentrics", "usercentrics"),
    ("Aiven", "aiven"),
    ("Wolt", "wolt"),
    ("Bolt (rideshare)", "bolt"),
    ("Taxfix", "taxfix"),
    # ── Global remote-friendly (commonly hire in EU/UK) ───────────────────────
    ("Linear", "linear"),
    ("Notion", "notion"),
    ("Vercel", "vercel"),
    ("Supabase", "supabase"),
    ("Neon", "neon"),
    ("Turso", "turso"),
    ("Clerk", "clerk"),
    ("Resend", "resend"),
    ("Posthog", "posthog"),
    ("Lago", "lago"),
    ("Dub", "dub"),
    ("Raycast", "raycast"),
    ("Arc", "arc"),
    ("Codeium", "codeium"),
    ("Cursor", "anysphere"),
    ("Retool", "retool"),
    ("Glean", "glean"),
    ("Perplexity AI", "perplexity"),
    ("Runway", "runwayml"),
    ("Cohere", "cohere"),
    ("Together AI", "together"),
    ("Modal", "modal"),
    ("Ramp", "ramp"),
    ("Mercury", "mercury"),
    ("Brex", "brex"),
    ("Rippling", "rippling"),
    ("Lattice", "lattice"),
    ("Deel", "deel"),
    ("Remote", "remote"),
    ("Oyster HR", "oysterhr"),
    ("Loom", "loom"),
    ("Descript", "descript"),
    ("Pave", "pave"),
]


class AshbySource(BaseJobSource):
    name = "Ashby"
    BASE_URL = "https://api.ashbyhq.com/posting-api/job-board/{company}"

    def __init__(self, companies: Optional[list[tuple]] = None):
        self.companies = companies or ASHBY_COMPANIES

    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        work_type: WorkType = WorkType.any,
        page: int = 1,
    ) -> list[Job]:
        query_lower = query.lower()
        jobs: list[Job] = []

        async with httpx.AsyncClient(timeout=15) as client:
            for display_name, company_id in self.companies:
                try:
                    page_jobs = await self._fetch_company(
                        client, display_name, company_id, query_lower, location, work_type
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
        resp = await client.get(
            self.BASE_URL.format(company=company_id),
            params={"includeCompensation": "true"},
        )
        if resp.status_code != 200:
            return []

        data = resp.json()
        jobs = []

        for item in data.get("jobPostings", []):
            title = item.get("title", "")
            if query not in title.lower() and query not in item.get("departmentName", "").lower():
                # Also check team name
                if query not in str(item).lower():
                    continue

            is_remote = item.get("isRemote", False)
            loc = item.get("locationName") or item.get("location") or ""
            if isinstance(loc, dict):
                loc = loc.get("locationName", "")

            if is_remote:
                wtype = "remote"
            elif "hybrid" in loc.lower():
                wtype = "hybrid"
            else:
                wtype = "onsite"

            if work_type == WorkType.remote and not is_remote:
                continue
            if work_type == WorkType.onsite and is_remote:
                continue
            if location and location.lower() not in loc.lower() and not is_remote:
                continue

            apply_url = item.get("applyUrl") or item.get("jobUrl") or ""
            if not apply_url:
                apply_url = f"https://jobs.ashbyhq.com/{company_id}/{item.get('id', '')}"

            # Compensation
            salary = ""
            comp = item.get("compensation", {})
            if comp:
                min_c = comp.get("minValue")
                max_c = comp.get("maxValue")
                currency = comp.get("currency", "GBP")
                period = comp.get("interval", "year")
                if min_c and max_c:
                    salary = f"{currency} {min_c:,.0f}–{max_c:,.0f}/{period}"
                elif min_c:
                    salary = f"{currency} {min_c:,.0f}+/{period}"

            jid = hashlib.md5(apply_url.encode()).hexdigest()[:12]
            jobs.append(
                Job(
                    id=f"ashby_{jid}",
                    title=title,
                    company=display_name,
                    location=loc or ("Remote" if is_remote else "See posting"),
                    work_type=wtype,
                    url=apply_url,
                    source=f"Ashby ({display_name})",
                    salary=salary,
                    tags=[item.get("departmentName", ""), item.get("teamName", "")],
                )
            )

        return jobs
