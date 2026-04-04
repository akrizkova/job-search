"""
UK Tier 2 / Skilled Worker visa sponsor checker.

Downloads the official GOV.UK register of licensed sponsors and caches it
in memory. Refreshes once per day.

Register source:
  https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers

The Excel file contains:
  - Organisation Name
  - Town/City
  - County
  - Type & Rating  (e.g. "A-Rated", "B-Rated")
  - Route          (e.g. "Skilled Worker", "Intra-company Transfer", ...)

We keep only "Skilled Worker" route entries (post-Brexit Tier 2 equivalent).
"""
import asyncio
import logging
import re
import time
from difflib import SequenceMatcher
from io import BytesIO
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Cache state
# ------------------------------------------------------------------
_sponsors: set[str] = set()          # normalised names
_sponsor_details: dict[str, dict] = {}  # normalised_name → {name, city, county, rating}
_last_fetched: float = 0.0
_fetch_lock = asyncio.Lock()
CACHE_TTL = 86400  # 24 hours

# ------------------------------------------------------------------
# GOV.UK API — finds the current download URL for the register
# ------------------------------------------------------------------
GOVUK_API = (
    "https://www.gov.uk/api/content"
    "/government/publications/register-of-licensed-sponsors-workers"
)

# Fallback direct pattern (updated quarterly by UKVI)
FALLBACK_URLS = [
    "https://assets.publishing.service.gov.uk/media/"
    "67e3d1e8feeff0ad6f3bb4f3/2025-04-04_-_Worker_and_Temporary_Worker.xlsx",
    # Older entry in case the above has rotated:
    "https://assets.publishing.service.gov.uk/media/"
    "67c87c22b1de7a677a9cd79d/2025-03-07_-_Worker_and_Temporary_Worker.xlsx",
]


def _normalize(name: str) -> str:
    """Lowercase, strip legal suffixes and punctuation for fuzzy matching."""
    name = name.lower()
    for suffix in [
        " limited", " ltd", " llp", " plc", " llc", " inc", " corp",
        " corporation", " group", " holdings", " uk", " gb",
        " (uk)", " (gb)", " technologies", " technology",
        " solutions", " services", " international", " global",
        " & co", " and co",
    ]:
        name = name.replace(suffix, "")
    name = re.sub(r"[^\w\s]", " ", name)
    return " ".join(name.split())


async def _discover_download_url(client: httpx.AsyncClient) -> Optional[str]:
    """Try the GOV.UK content API to find the current register download URL."""
    try:
        resp = await client.get(GOVUK_API, timeout=10)
        if resp.status_code != 200:
            return None
        data = resp.json()
        attachments = (
            data.get("details", {}).get("attachments", [])
            or data.get("details", {}).get("documents", [])
        )
        for att in attachments:
            url = att.get("url", "") or att.get("attachment_url", "")
            if url and ("worker" in url.lower() or "sponsor" in url.lower()):
                if url.endswith((".xlsx", ".csv", ".ods")):
                    return url
    except Exception as e:
        logger.debug("GOV.UK API failed: %s", e)
    return None


async def _download_and_parse(client: httpx.AsyncClient, url: str) -> Optional[dict]:
    """Download the Excel and return {normalised_name: details_dict}."""
    try:
        resp = await client.get(url, timeout=60, follow_redirects=True)
        if resp.status_code != 200:
            return None
        content = resp.content
    except Exception as e:
        logger.debug("Download failed (%s): %s", url, e)
        return None

    try:
        import openpyxl  # type: ignore
        wb = openpyxl.load_workbook(BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        rows = iter(ws.rows)
        headers = [str(c.value).strip().lower() if c.value else "" for c in next(rows)]

        # Identify column indices (they can shift between releases)
        def col(keyword: str) -> int:
            for i, h in enumerate(headers):
                if keyword in h:
                    return i
            return -1

        i_name   = col("organisation")
        i_city   = col("town")
        i_county = col("county")
        i_rating = col("type")
        i_route  = col("route")
        if i_name < 0 or i_route < 0:
            return None

        result: dict[str, dict] = {}
        for row in ws.rows:
            vals = [str(c.value).strip() if c.value is not None else "" for c in row]
            if len(vals) <= max(i_name, i_route):
                continue
            route = vals[i_route] if i_route >= 0 else ""
            # Keep Skilled Worker route only (= post-Brexit Tier 2)
            if "skilled worker" not in route.lower():
                continue
            raw_name = vals[i_name]
            if not raw_name or raw_name.lower() in ("organisation name", "none"):
                continue
            norm = _normalize(raw_name)
            result[norm] = {
                "name": raw_name,
                "city": vals[i_city] if i_city >= 0 else "",
                "county": vals[i_county] if i_county >= 0 else "",
                "rating": vals[i_rating] if i_rating >= 0 else "",
                "route": route,
            }
        wb.close()
        return result
    except Exception as e:
        logger.debug("Excel parse failed: %s", e)
        return None


async def _refresh() -> None:
    global _sponsors, _sponsor_details, _last_fetched

    async with httpx.AsyncClient(
        headers={"User-Agent": "JobSearchApp/1.0 (visa-sponsor-check)"},
        timeout=15,
    ) as client:
        # 1. Try to find latest URL via GOV.UK API
        url = await _discover_download_url(client)

        # 2. Try each URL (discovered + fallbacks)
        for candidate in ([url] if url else []) + FALLBACK_URLS:
            if not candidate:
                continue
            data = await _download_and_parse(client, candidate)
            if data:
                _sponsors = set(data.keys())
                _sponsor_details = data
                _last_fetched = time.time()
                logger.info("Loaded %d UK Skilled Worker sponsors", len(_sponsors))
                return

    logger.warning("Could not load UK visa sponsor register — feature disabled")


async def ensure_loaded() -> None:
    """Load or refresh the register if stale. Safe to call from any request."""
    if time.time() - _last_fetched < CACHE_TTL and _sponsors:
        return
    async with _fetch_lock:
        # Double-check after acquiring lock
        if time.time() - _last_fetched < CACHE_TTL and _sponsors:
            return
        await _refresh()


def is_sponsor(company_name: str) -> tuple[bool, Optional[dict]]:
    """
    Check whether company_name appears in the Skilled Worker sponsor register.

    Returns (is_sponsor, details_or_None).
    If the register is not loaded yet, returns (False, None).
    """
    if not _sponsors:
        return False, None

    norm = _normalize(company_name)
    if not norm:
        return False, None

    # 1. Exact normalised match
    if norm in _sponsor_details:
        return True, _sponsor_details[norm]

    # 2. Substring: job company name contained in a sponsor name, or vice-versa
    for sponsor_norm, details in _sponsor_details.items():
        if norm in sponsor_norm or sponsor_norm in norm:
            return True, details

    # 3. Fuzzy match (threshold 0.88 to avoid false positives)
    best_score = 0.0
    best_details = None
    for sponsor_norm, details in _sponsor_details.items():
        score = SequenceMatcher(None, norm, sponsor_norm).ratio()
        if score > best_score:
            best_score = score
            best_details = details
    if best_score >= 0.88:
        return True, best_details

    return False, None


def sponsor_count() -> int:
    return len(_sponsors)
