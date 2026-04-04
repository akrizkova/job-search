"""Generic company career page scraper.
Supports user-provided company URLs and auto-detects ATS platforms.
"""
import hashlib
import re
import httpx
from typing import Optional
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from .base import BaseJobSource
from ..models import Job, WorkType

# Common career page path patterns to try
CAREER_PATHS = [
    "/careers", "/jobs", "/careers/jobs", "/about/careers",
    "/company/careers", "/work-with-us", "/join-us", "/join",
    "/opportunities", "/open-positions",
]

# ATS platform detection — maps domain patterns to structured parsers
ATS_PATTERNS = {
    "greenhouse.io": "greenhouse",
    "lever.co": "lever",
    "workday.com": "workday",
    "smartrecruiters.com": "smartrecruiters",
    "icims.com": "icims",
    "bamboohr.com": "bamboo",
    "jobvite.com": "jobvite",
    "ashbyhq.com": "ashby",
}


class CareerPageScraper(BaseJobSource):
    name = "Company Website"

    def __init__(self, company_urls: Optional[list[str]] = None):
        self.company_urls = company_urls or []

    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        work_type: WorkType = WorkType.any,
        page: int = 1,
    ) -> list[Job]:
        if not self.company_urls:
            return []

        query_lower = query.lower()
        jobs = []

        async with httpx.AsyncClient(
            timeout=20,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; JobSearchBot/1.0)"},
        ) as client:
            for url in self.company_urls:
                try:
                    page_jobs = await self._scrape_company(client, url, query_lower)
                    jobs.extend(page_jobs)
                except Exception as e:
                    pass  # Skip failed sites silently

        return jobs

    async def _scrape_company(
        self, client: httpx.AsyncClient, base_url: str, query: str
    ) -> list[Job]:
        # Check if it's an ATS URL first
        for ats_domain, ats_type in ATS_PATTERNS.items():
            if ats_domain in base_url:
                return await self._parse_known_ats(client, base_url, query, ats_type)

        # Try to find career page
        career_url = await self._find_career_page(client, base_url)
        if not career_url:
            return []

        resp = await client.get(career_url)
        if resp.status_code != 200:
            return []

        return self._parse_generic_career_page(resp.text, career_url, query)

    async def _find_career_page(
        self, client: httpx.AsyncClient, base_url: str
    ) -> Optional[str]:
        # First try common paths
        for path in CAREER_PATHS:
            url = urljoin(base_url, path)
            try:
                resp = await client.head(url)
                if resp.status_code == 200:
                    return url
            except Exception:
                continue

        # Try scraping homepage for career links
        try:
            resp = await client.get(base_url)
            soup = BeautifulSoup(resp.text, "html.parser")
            for link in soup.find_all("a", href=True):
                href = link["href"].lower()
                text = link.get_text().lower()
                if any(kw in href or kw in text for kw in ["career", "job", "work with", "join us"]):
                    full = urljoin(base_url, link["href"])
                    if urlparse(full).netloc == urlparse(base_url).netloc:
                        return full
        except Exception:
            pass

        return None

    def _parse_generic_career_page(
        self, html: str, page_url: str, query: str
    ) -> list[Job]:
        soup = BeautifulSoup(html, "html.parser")
        jobs = []
        company = urlparse(page_url).netloc.replace("www.", "").split(".")[0].title()

        # Look for job listing elements (common patterns)
        job_elements = (
            soup.select("li[class*='job']")
            or soup.select("div[class*='job']")
            or soup.select("article[class*='job']")
            or soup.select("div[class*='position']")
            or soup.select("div[class*='opening']")
            or soup.select("tr[class*='job']")
        )

        for el in job_elements:
            text = el.get_text(" ", strip=True)
            title_el = el.find(["h1", "h2", "h3", "h4", "a"])
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if query not in title.lower() and query not in text.lower():
                continue

            link = el.find("a", href=True)
            job_url = urljoin(page_url, link["href"]) if link else page_url
            job_id = hashlib.md5(job_url.encode()).hexdigest()[:12]

            loc_match = re.search(
                r"(remote|hybrid|on.?site|[A-Z][a-z]+,?\s+[A-Z]{2})", text
            )
            location = loc_match.group(0) if loc_match else "See posting"

            jobs.append(
                Job(
                    id=f"scraper_{job_id}",
                    title=title,
                    company=company,
                    location=location,
                    work_type=self._normalize_work_type(location),
                    url=job_url,
                    source=f"Career Page ({company})",
                )
            )

        return jobs

    async def _parse_known_ats(
        self,
        client: httpx.AsyncClient,
        url: str,
        query: str,
        ats_type: str,
    ) -> list[Job]:
        """Handle known ATS platforms with their specific HTML structures."""
        resp = await client.get(url)
        if resp.status_code != 200:
            return []

        # For Ashby
        if ats_type == "ashby":
            return self._parse_ashby(resp.text, url, query)

        return self._parse_generic_career_page(resp.text, url, query)

    def _parse_ashby(self, html: str, page_url: str, query: str) -> list[Job]:
        soup = BeautifulSoup(html, "html.parser")
        company = urlparse(page_url).netloc.replace("jobs.ashbyhq.com/", "").strip("/").title()
        jobs = []

        for item in soup.select("a[href*='/']"):
            title = item.get_text(strip=True)
            if query not in title.lower():
                continue
            href = item.get("href", "")
            job_url = urljoin("https://jobs.ashbyhq.com", href)
            job_id = hashlib.md5(job_url.encode()).hexdigest()[:12]
            jobs.append(
                Job(
                    id=f"ashby_{job_id}",
                    title=title,
                    company=company,
                    location="See posting",
                    url=job_url,
                    source=f"Ashby ({company})",
                )
            )

        return jobs
