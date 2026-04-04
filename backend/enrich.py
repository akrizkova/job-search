"""
Applicant count enrichment.

Tries to extract "X applicants" data from job URLs.
- LinkedIn public pages: embeds count in HTML/JSON-LD (works without auth on some listings)
- Indeed pages: embeds count in page metadata
- JSearch API response: may include apply_count in extended data

All fetches are best-effort — failures are silently ignored and the job is
kept without a count rather than dropped.
"""
import asyncio
import re
from typing import Optional
import httpx
from bs4 import BeautifulSoup

from .models import Job

# How long to wait for a single page fetch during enrichment
ENRICH_TIMEOUT = 8

# LinkedIn: patterns found in public HTML
_LI_PATTERNS = [
    # "Over 200 applicants"  /  "Be an early applicant"  /  "25 applicants"
    re.compile(r"(over\s+)?(\d[\d,]*)\s+applicants?", re.I),
    re.compile(r"be\s+an?\s+early\s+applicant", re.I),
    # JSON-LD: "totalJobOpenings" is not applicants, but "hiringOrganization" sometimes has it
    # More reliably: data-job-id pages embed applicantCount in __NEXT_DATA__
    re.compile(r'"applicantCount"\s*:\s*(\d+)', re.I),
    re.compile(r'"applyCount"\s*:\s*(\d+)', re.I),
    re.compile(r'"totalApplicantCount"\s*:\s*(\d+)', re.I),
]

_INDEED_PATTERNS = [
    re.compile(r"(\d[\d,]*)\s+(?:people\s+)?(?:clicked\s+apply|applied)", re.I),
    re.compile(r'"applyCount"\s*:\s*(\d+)', re.I),
    re.compile(r'"numApplicants"\s*:\s*(\d+)', re.I),
]


def _parse_int(s: str) -> int:
    return int(s.replace(",", "").strip())


def _extract_linkedin_count(html: str) -> tuple[Optional[int], Optional[str]]:
    """Returns (count, label) from LinkedIn HTML. count=None if only a label."""
    # Try JSON embedded data first (most reliable)
    for pattern in [
        re.compile(r'"applicantCount"\s*:\s*(\d+)'),
        re.compile(r'"applyCount"\s*:\s*(\d+)'),
        re.compile(r'"totalApplicantCount"\s*:\s*(\d+)'),
    ]:
        m = pattern.search(html)
        if m:
            count = _parse_int(m.group(1))
            return count, f"{count:,} applicants"

    # Try visible text
    m = re.search(r"(over\s+)?(\d[\d,]*)\s+applicants?", html, re.I)
    if m:
        count = _parse_int(m.group(2))
        label = f"Over {count:,} applicants" if m.group(1) else f"{count:,} applicants"
        return count, label

    m = re.search(r"be\s+an?\s+early\s+applicant", html, re.I)
    if m:
        # "early applicant" typically means < 25
        return None, "Be an early applicant"

    return None, None


def _extract_indeed_count(html: str) -> tuple[Optional[int], Optional[str]]:
    for pattern in _INDEED_PATTERNS:
        m = pattern.search(html)
        if m:
            count = _parse_int(m.group(1))
            return count, f"{count:,} applicants"
    return None, None


async def _fetch_page(client: httpx.AsyncClient, url: str) -> Optional[str]:
    try:
        resp = await client.get(url, timeout=ENRICH_TIMEOUT)
        if resp.status_code == 200:
            return resp.text
    except Exception:
        pass
    return None


async def enrich_job(client: httpx.AsyncClient, job: Job) -> Job:
    """Fetch applicant count for a single job. Returns job (possibly mutated)."""
    url = job.url
    if not url:
        return job

    html = None
    source_label = None

    if "linkedin.com" in url:
        # LinkedIn public job pages: works for some listings without auth.
        # They redirect logged-out users to a simplified view that still has count.
        html = await _fetch_page(client, url)
        if html:
            count, label = _extract_linkedin_count(html)
            job.applicant_count = count
            job.applicant_count_label = label
            job.applicant_count_source = "LinkedIn"

    elif "indeed.com" in url:
        html = await _fetch_page(client, url)
        if html:
            count, label = _extract_indeed_count(html)
            job.applicant_count = count
            job.applicant_count_label = label
            job.applicant_count_source = "Indeed"

    return job


async def enrich_jobs(jobs: list[Job], concurrency: int = 5) -> list[Job]:
    """
    Enrich jobs with applicant counts concurrently.
    Only fetches for sources where count data is potentially available.
    """
    enrichable = [
        j for j in jobs
        if j.url and ("linkedin.com" in j.url or "indeed.com" in j.url)
    ]
    if not enrichable:
        return jobs

    sem = asyncio.Semaphore(concurrency)

    async def bounded_enrich(client: httpx.AsyncClient, job: Job) -> Job:
        async with sem:
            return await enrich_job(client, job)

    async with httpx.AsyncClient(
        follow_redirects=True,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        },
        timeout=ENRICH_TIMEOUT,
    ) as client:
        await asyncio.gather(*[bounded_enrich(client, j) for j in enrichable])

    return jobs


def label_from_jsearch(item: dict) -> tuple[Optional[int], Optional[str]]:
    """
    JSearch API items sometimes include apply_count or similar fields.
    Call this during parsing — no extra HTTP needed.
    """
    count = (
        item.get("apply_count")
        or item.get("applyCount")
        or item.get("job_apply_count")
    )
    if count is not None:
        try:
            c = int(count)
            return c, f"{c:,} applicants"
        except (ValueError, TypeError):
            pass
    return None, None
