import asyncio
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import SearchRequest, SearchResponse, Job, WorkType
from .sources import (
    RemotiveSource,
    RemoteOKSource,
    AdzunaSource,
    JSearchSource,
    GreenhouseSource,
    LeverSource,
    CareerPageScraper,
)

app = FastAPI(title="Job Search Aggregator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build sources list from environment config
def build_sources(company_urls: list[str] = None):
    sources = []

    # Always-on free sources
    sources.append(RemotiveSource())
    sources.append(RemoteOKSource())
    sources.append(GreenhouseSource())
    sources.append(LeverSource())

    # Optional: Adzuna (requires free API key)
    adzuna_id = os.getenv("ADZUNA_APP_ID")
    adzuna_key = os.getenv("ADZUNA_APP_KEY")
    if adzuna_id and adzuna_key:
        sources.append(AdzunaSource(adzuna_id, adzuna_key))

    # Optional: JSearch via RapidAPI (aggregates LinkedIn/Indeed/Glassdoor)
    jsearch_key = os.getenv("JSEARCH_API_KEY")
    if jsearch_key:
        sources.append(JSearchSource(jsearch_key))

    # Optional: custom company URLs
    if company_urls:
        sources.append(CareerPageScraper(company_urls))

    return sources


def deduplicate(jobs: list[Job]) -> list[Job]:
    """Remove duplicates by normalizing title+company combinations."""
    seen: set[str] = set()
    unique = []
    for job in jobs:
        key = f"{job.title.lower().strip()}|{job.company.lower().strip()}"
        if key not in seen:
            seen.add(key)
            unique.append(job)
    return unique


@app.post("/api/search", response_model=SearchResponse)
async def search_jobs(request: SearchRequest):
    sources = build_sources()
    sources_searched = []
    errors = []
    all_jobs: list[Job] = []

    async def fetch_source(source):
        try:
            jobs = await source.search(
                query=request.query,
                location=request.location,
                work_type=request.work_type,
                page=request.page,
            )
            return source.name, jobs, None
        except Exception as e:
            return source.name, [], str(e)

    results = await asyncio.gather(*[fetch_source(s) for s in sources])

    for name, jobs, error in results:
        sources_searched.append(name)
        if error:
            errors.append(f"{name}: {error}")
        else:
            all_jobs.extend(jobs)

    # Apply work type filter post-fetch (for sources that don't support it natively)
    if request.work_type != WorkType.any:
        all_jobs = [
            j for j in all_jobs
            if j.work_type == request.work_type.value
            or (request.work_type == WorkType.remote and j.work_type == "remote")
        ]

    all_jobs = deduplicate(all_jobs)

    # Paginate
    start = (request.page - 1) * request.results_per_page
    end = start + request.results_per_page
    page_jobs = all_jobs[start:end]

    return SearchResponse(
        jobs=page_jobs,
        total=len(all_jobs),
        page=request.page,
        query=request.query,
        sources_searched=sources_searched,
        errors=errors,
    )


@app.post("/api/search/companies", response_model=SearchResponse)
async def search_company_sites(request: SearchRequest, company_urls: list[str] = None):
    """Search specific company career pages by URL."""
    if not company_urls:
        raise HTTPException(status_code=400, detail="No company URLs provided")

    scraper = CareerPageScraper(company_urls)
    errors = []
    try:
        jobs = await scraper.search(
            query=request.query,
            location=request.location,
            work_type=request.work_type,
        )
    except Exception as e:
        errors.append(str(e))
        jobs = []

    return SearchResponse(
        jobs=jobs,
        total=len(jobs),
        page=1,
        query=request.query,
        sources_searched=["Company Websites"],
        errors=errors,
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/sources")
async def list_sources():
    sources = build_sources()
    configured = []
    available = []
    for s in sources:
        if isinstance(s, (AdzunaSource, JSearchSource)):
            configured.append(s.name)
        else:
            available.append(s.name)
    return {
        "active": [s.name for s in sources],
        "configured_paid": configured,
        "always_free": available,
    }
