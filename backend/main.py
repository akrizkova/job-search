import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .models import SearchRequest, SearchResponse, Job, WorkType
from .enrich import enrich_jobs, enrich_visa_sponsors
from .visa_sponsors import ensure_loaded as load_sponsors, sponsor_count
from .sources import (
    RemotiveSource,
    RemoteOKSource,
    AdzunaSource,
    JSearchSource,
    GreenhouseSource,
    LeverSource,
    CareerPageScraper,
    WorkdaySource,
    SmartRecruitersSource,
    AshbySource,
)

STATIC_DIR = Path(__file__).parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load the UK visa sponsor register in the background on startup
    asyncio.create_task(load_sponsors())
    yield


app = FastAPI(title="Job Search Aggregator", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_sources(company_urls: list[str] = None):
    sources = []

    # Always-on free sources (job boards)
    sources.append(RemotiveSource())
    sources.append(RemoteOKSource())

    # Always-on ATS sources (direct company career pages)
    sources.append(GreenhouseSource())
    sources.append(LeverSource())
    sources.append(WorkdaySource())
    sources.append(SmartRecruitersSource())
    sources.append(AshbySource())

    # Optional: Adzuna (requires free API key — developer.adzuna.com)
    adzuna_id = os.getenv("ADZUNA_APP_ID")
    adzuna_key = os.getenv("ADZUNA_APP_KEY")
    if adzuna_id and adzuna_key:
        sources.append(AdzunaSource(adzuna_id, adzuna_key))

    # Optional: JSearch via RapidAPI (aggregates LinkedIn/Indeed/Glassdoor)
    jsearch_key = os.getenv("JSEARCH_API_KEY")
    if jsearch_key:
        sources.append(JSearchSource(jsearch_key))

    # Optional: custom company URLs submitted by the user
    if company_urls:
        sources.append(CareerPageScraper(company_urls))

    return sources


def deduplicate(jobs: list[Job]) -> list[Job]:
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

    # Work type filter
    if request.work_type != WorkType.any:
        all_jobs = [
            j for j in all_jobs
            if j.work_type == request.work_type.value
        ]

    all_jobs = deduplicate(all_jobs)

    # Enrich: applicant counts (best-effort HTTP)
    try:
        all_jobs = await enrich_jobs(all_jobs)
    except Exception:
        pass

    # Enrich: UK visa sponsor status (in-memory, fast)
    all_jobs = enrich_visa_sponsors(all_jobs)

    # Filter by applicant count
    if request.max_applicants is not None:
        all_jobs = [
            j for j in all_jobs
            if j.applicant_count is None or j.applicant_count <= request.max_applicants
        ]

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

    jobs = enrich_visa_sponsors(jobs)

    return SearchResponse(
        jobs=jobs,
        total=len(jobs),
        page=1,
        query=request.query,
        sources_searched=["Company Websites"],
        errors=errors,
    )


@app.get("/api/companies")
async def lookup_companies(q: str = "", region: str = ""):
    """Look up companies from the curated directory by name/sector."""
    from .sources.company_directory import COMPANY_DIRECTORY
    results = []
    q_lower = q.lower()
    for entry in COMPANY_DIRECTORY:
        if q_lower and q_lower not in entry.name.lower() and q_lower not in entry.sector.lower():
            continue
        if region and entry.country not in (region, "global"):
            continue
        results.append({
            "name": entry.name,
            "career_url": entry.career_url,
            "ats": entry.ats,
            "country": entry.country,
            "sector": entry.sector,
        })
    return {"companies": results[:50]}


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "visa_sponsors_loaded": sponsor_count() > 0,
        "visa_sponsor_count": sponsor_count(),
    }


@app.get("/api/sources")
async def list_sources():
    sources = build_sources()
    return {
        "active": [s.name for s in sources],
        "visa_sponsors_loaded": sponsor_count() > 0,
    }


# ── Serve the React SPA (must come LAST so API routes take priority) ──────────
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str = ""):
        # Let /api/* fall through to 404 rather than serving the SPA
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        return FileResponse(str(STATIC_DIR / "index.html"))
