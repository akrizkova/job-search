import { useState } from "react";
import { SearchBar } from "./components/SearchBar";
import { JobCard } from "./components/JobCard";
import { CompanySearch } from "./components/CompanySearch";
import { useJobSearch } from "./hooks/useJobSearch";
import type { WorkType, Region, SearchRequest } from "./types";
import {
  Briefcase, AlertCircle, ChevronDown, Layers, Building2,
  ShieldCheck, Globe, TrendingUp, X,
} from "lucide-react";

// ── Stat pill ────────────────────────────────────────────────────────────────
function Stat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-xl border
      ${accent ? "bg-indigo-900/20 border-indigo-800" : "bg-gray-900 border-gray-800"}`}>
      <span className={`text-xl font-bold ${accent ? "text-indigo-300" : "text-white"}`}>{value}</span>
      <span className="text-xs text-gray-500 mt-0.5">{label}</span>
    </div>
  );
}

// ── Source badge strip ────────────────────────────────────────────────────────
function SourceStrip({
  sources, errors, onClose,
}: { sources: string[]; errors: string[]; onClose: () => void }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 font-medium">Sources searched</span>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition">
          <X size={13} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <span key={s} className="px-2 py-0.5 bg-gray-800 rounded-full text-gray-400 border border-gray-700/50">
            {s}
          </span>
        ))}
      </div>
      {errors.length > 0 && (
        <div className="mt-2 text-amber-600/80">
          {errors.slice(0, 3).map((e) => <div key={e}>{e}</div>)}
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ query }: { query: string }) {
  return (
    <div className="text-center py-16">
      <Briefcase size={40} className="mx-auto text-gray-700 mb-4" />
      <p className="text-gray-400 font-medium">No jobs found for "{query}"</p>
      <p className="text-gray-600 text-sm mt-1">
        Try different keywords, remove filters, or search specific company sites below.
      </p>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <div className="text-center mb-12 pt-6">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-900/30 border
        border-indigo-800/50 rounded-full text-xs text-indigo-400 mb-6">
        <TrendingUp size={12} />
        Searches 10+ sources simultaneously
      </div>
      <h1 className="text-5xl font-extrabold mb-4 leading-tight">
        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400
          bg-clip-text text-transparent">
          Find every job.
        </span>
        <br />
        <span className="text-white">Not just the popular ones.</span>
      </h1>
      <p className="text-gray-400 text-lg max-w-xl mx-auto">
        Searches LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, Ashby,
        SmartRecruiters and more — plus individual company career pages.
      </p>

      <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm text-gray-500">
        {[
          { icon: <Globe size={14} />, text: "Job boards + ATS platforms" },
          { icon: <Building2 size={14} />, text: "Direct company websites" },
          { icon: <ShieldCheck size={14} />, text: "UK visa sponsor check" },
        ].map(({ icon, text }) => (
          <span key={text} className="flex items-center gap-1.5">
            {icon} {text}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const { results, loading, error, search, searchCompanySites, reset } = useJobSearch();
  const [lastReq, setLastReq] = useState<SearchRequest | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [showCompanySearch, setShowCompanySearch] = useState(false);
  const [region, setRegion] = useState<Region>("global");
  const [visaFilter, setVisaFilter] = useState(false);

  const showVisaBadges = region === "uk";

  const handleSearch = (
    query: string,
    location: string,
    workType: WorkType,
    maxApplicants: number | undefined,
    newRegion: Region
  ) => {
    setRegion(newRegion);
    setVisaFilter(false);
    const req: SearchRequest = {
      query,
      location: location || undefined,
      work_type: workType,
      page: 1,
      results_per_page: 20,
      max_applicants: maxApplicants,
      region: newRegion,
    };
    setLastReq(req);
    search(req);
  };

  const handleLoadMore = () => {
    if (!lastReq || !results) return;
    const next = { ...lastReq, page: lastReq.page + 1 };
    setLastReq(next);
    search(next, true);
  };

  const handleCompanySearch = (urls: string[]) => {
    if (!lastReq) return;
    searchCompanySites(lastReq, urls);
  };

  const visibleJobs = visaFilter
    ? (results?.jobs ?? []).filter((j) => j.uk_visa_sponsor === true)
    : (results?.jobs ?? []);

  const sponsorCount = (results?.jobs ?? []).filter((j) => j.uk_visa_sponsor === true).length;
  const hasMore = results ? results.jobs.length < results.total : false;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={reset}
            className="flex items-center gap-2.5 hover:opacity-80 transition"
          >
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <Briefcase size={16} />
            </div>
            <span className="font-bold text-base tracking-tight">JobFind</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="hidden sm:block">10+ sources · live results</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 pb-16">
        {/* Hero — only on landing */}
        {!results && !loading && <Hero />}

        {/* Search form */}
        <div className={`${results || loading ? "py-6 border-b border-gray-800/50 mb-6" : ""}`}>
          <SearchBar
            onSearch={handleSearch}
            loading={loading}
            initialRegion={region}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-800/50
            rounded-xl text-red-400 text-sm mb-6">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {results && (
          <>
            {/* Stats bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3 flex-wrap">
                <Stat label="total" value={results.total} accent />
                {showVisaBadges && sponsorCount > 0 && (
                  <Stat label="visa sponsors" value={sponsorCount} />
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* UK visa sponsor filter (only in UK mode) */}
                {showVisaBadges && sponsorCount > 0 && (
                  <button
                    onClick={() => setVisaFilter(!visaFilter)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border
                      font-medium transition
                      ${visaFilter
                        ? "bg-blue-900/40 border-blue-600 text-blue-300"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}
                  >
                    <ShieldCheck size={12} />
                    Visa sponsors only
                  </button>
                )}

                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs
                    bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-500 transition"
                >
                  <Layers size={12} />
                  {results.sources_searched.length} sources
                  <ChevronDown size={12} className={`transition-transform ${showSources ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {/* Sources panel */}
            {showSources && (
              <div className="mb-5">
                <SourceStrip
                  sources={results.sources_searched}
                  errors={results.errors}
                  onClose={() => setShowSources(false)}
                />
              </div>
            )}

            {/* UK visa info banner */}
            {showVisaBadges && (
              <div className="flex items-start gap-3 p-3.5 bg-blue-950/30 border border-blue-800/40
                rounded-xl text-xs text-blue-300/80 mb-5">
                <ShieldCheck size={14} className="shrink-0 mt-0.5 text-blue-400" />
                <span>
                  <strong className="text-blue-300">UK Visa Sponsor</strong> badges are sourced from
                  the official GOV.UK Register of Licensed Sponsors (Skilled Worker route, updated daily).
                  A badge means the company is registered — confirm with the employer before applying.
                </span>
              </div>
            )}

            {/* Job list */}
            {visibleJobs.length === 0
              ? <EmptyState query={results.query} />
              : (
                <div className="space-y-2.5">
                  {visibleJobs.map((job) => (
                    <JobCard key={job.id} job={job} showVisaBadge={showVisaBadges} />
                  ))}
                </div>
              )
            }

            {/* Load more */}
            {hasMore && !visaFilter && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700
                    rounded-xl text-sm font-medium disabled:opacity-50 transition"
                >
                  {loading
                    ? "Loading…"
                    : `Load more (${results.total - results.jobs.length} remaining)`
                  }
                </button>
              </div>
            )}

            {/* Company search — always available after first search */}
            <div className="mt-8">
              <button
                onClick={() => setShowCompanySearch(!showCompanySearch)}
                className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300
                  transition mb-3"
              >
                <Building2 size={14} />
                {showCompanySearch ? "Hide" : "Add"} specific company websites
                <ChevronDown size={13} className={`transition-transform ${showCompanySearch ? "rotate-180" : ""}`} />
              </button>
              {showCompanySearch && (
                <CompanySearch onSearch={handleCompanySearch} loading={loading} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
