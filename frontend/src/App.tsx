import { useState } from "react";
import { SearchBar } from "./components/SearchBar";
import { JobCard } from "./components/JobCard";
import { CompanySearch } from "./components/CompanySearch";
import { useJobSearch } from "./hooks/useJobSearch";
import type { WorkType, SearchRequest } from "./types";
import { Briefcase, AlertCircle, ChevronDown, Layers } from "lucide-react";

export default function App() {
  const { results, loading, error, search, searchCompanySites } = useJobSearch();
  const [lastReq, setLastReq] = useState<SearchRequest | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [showCompanySearch, setShowCompanySearch] = useState(false);

  const handleSearch = (query: string, location: string, workType: WorkType) => {
    const req: SearchRequest = {
      query,
      location: location || undefined,
      work_type: workType,
      page: 1,
      results_per_page: 20,
    };
    setLastReq(req);
    search(req);
  };

  const handleLoadMore = () => {
    if (!lastReq || !results) return;
    const next = { ...lastReq, page: lastReq.page + 1 };
    setLastReq(next);
    search(next);
  };

  const handleCompanySearch = (urls: string[]) => {
    if (!lastReq) return;
    searchCompanySites(lastReq, urls);
  };

  const hasMore = results ? results.jobs.length < results.total : false;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-1.5 bg-indigo-600 rounded-lg">
            <Briefcase size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight">JobFind</span>
          <span className="text-xs text-gray-500 border border-gray-800 rounded-full px-2 py-0.5 ml-1">
            Aggregator
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        {!results && !loading && (
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-indigo-400 to-purple-400
              bg-clip-text text-transparent">
              Find jobs everywhere
            </h1>
            <p className="text-gray-400 text-lg">
              Searches LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, RemoteOK and more — simultaneously.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="mb-8">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-800 rounded-xl
            text-red-400 text-sm mb-6">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <>
            {/* Stats bar */}
            <div className="flex items-center justify-between mb-4 text-sm">
              <span className="text-gray-400">
                <span className="font-semibold text-white">{results.total}</span> jobs found
                {lastReq?.query && (
                  <> for <span className="text-indigo-400">"{results.query}"</span></>
                )}
              </span>
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition"
              >
                <Layers size={13} />
                {results.sources_searched.length} sources
                <ChevronDown
                  size={13}
                  className={`transition-transform ${showSources ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* Sources detail */}
            {showSources && (
              <div className="mb-4 p-3 bg-gray-900 border border-gray-800 rounded-xl text-xs">
                <div className="flex flex-wrap gap-2">
                  {results.sources_searched.map((s) => (
                    <span key={s} className="px-2 py-1 bg-gray-800 rounded-full text-gray-400">
                      {s}
                    </span>
                  ))}
                </div>
                {results.errors.length > 0 && (
                  <div className="mt-2 text-amber-500">
                    {results.errors.map((e) => (
                      <div key={e}>{e}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Company site search */}
            <div className="mb-6">
              <button
                onClick={() => setShowCompanySearch(!showCompanySearch)}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1.5"
              >
                + Search specific company websites
              </button>
              {showCompanySearch && (
                <div className="mt-3">
                  <CompanySearch onSearch={handleCompanySearch} loading={loading} />
                </div>
              )}
            </div>

            {/* Job list */}
            {results.jobs.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                No jobs found. Try a different query or remove filters.
              </div>
            ) : (
              <div className="space-y-3">
                {results.jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {/* Load more */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700
                    rounded-xl text-sm font-medium disabled:opacity-50 transition"
                >
                  {loading ? "Loading..." : `Load more (${results.total - results.jobs.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
