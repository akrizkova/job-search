import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { SearchBar } from "./components/SearchBar";
import { JobCard } from "./components/JobCard";
import { CompanySearch } from "./components/CompanySearch";
import { useJobSearch } from "./hooks/useJobSearch";
import { Briefcase, AlertCircle, ChevronDown, Layers, Building2, ShieldCheck, Globe, TrendingUp, X, } from "lucide-react";
// ── Stat pill ────────────────────────────────────────────────────────────────
function Stat({ label, value, accent = false }) {
    return (_jsxs("div", { className: `flex flex-col items-center px-4 py-2 rounded-xl border
      ${accent ? "bg-indigo-900/20 border-indigo-800" : "bg-gray-900 border-gray-800"}`, children: [_jsx("span", { className: `text-xl font-bold ${accent ? "text-indigo-300" : "text-white"}`, children: value }), _jsx("span", { className: "text-xs text-gray-500 mt-0.5", children: label })] }));
}
// ── Source badge strip ────────────────────────────────────────────────────────
function SourceStrip({ sources, errors, onClose, }) {
    return (_jsxs("div", { className: "bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-gray-400 font-medium", children: "Sources searched" }), _jsx("button", { onClick: onClose, className: "text-gray-600 hover:text-gray-400 transition", children: _jsx(X, { size: 13 }) })] }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: sources.map((s) => (_jsx("span", { className: "px-2 py-0.5 bg-gray-800 rounded-full text-gray-400 border border-gray-700/50", children: s }, s))) }), errors.length > 0 && (_jsx("div", { className: "mt-2 text-amber-600/80", children: errors.slice(0, 3).map((e) => _jsx("div", { children: e }, e)) }))] }));
}
// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ query }) {
    return (_jsxs("div", { className: "text-center py-16", children: [_jsx(Briefcase, { size: 40, className: "mx-auto text-gray-700 mb-4" }), _jsxs("p", { className: "text-gray-400 font-medium", children: ["No jobs found for \"", query, "\""] }), _jsx("p", { className: "text-gray-600 text-sm mt-1", children: "Try different keywords, remove filters, or search specific company sites below." })] }));
}
// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
    return (_jsxs("div", { className: "text-center mb-12 pt-6", children: [_jsxs("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-900/30 border\n        border-indigo-800/50 rounded-full text-xs text-indigo-400 mb-6", children: [_jsx(TrendingUp, { size: 12 }), "Searches 10+ sources simultaneously"] }), _jsxs("h1", { className: "text-5xl font-extrabold mb-4 leading-tight", children: [_jsx("span", { className: "bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400\n          bg-clip-text text-transparent", children: "Find every job." }), _jsx("br", {}), _jsx("span", { className: "text-white", children: "Not just the popular ones." })] }), _jsx("p", { className: "text-gray-400 text-lg max-w-xl mx-auto", children: "Searches LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, Ashby, SmartRecruiters and more \u2014 plus individual company career pages." }), _jsx("div", { className: "flex flex-wrap justify-center gap-4 mt-8 text-sm text-gray-500", children: [
                    { icon: _jsx(Globe, { size: 14 }), text: "Job boards + ATS platforms" },
                    { icon: _jsx(Building2, { size: 14 }), text: "Direct company websites" },
                    { icon: _jsx(ShieldCheck, { size: 14 }), text: "UK visa sponsor check" },
                ].map(({ icon, text }) => (_jsxs("span", { className: "flex items-center gap-1.5", children: [icon, " ", text] }, text))) })] }));
}
// ── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
    const { results, loading, error, search, searchCompanySites, reset } = useJobSearch();
    const [lastReq, setLastReq] = useState(null);
    const [showSources, setShowSources] = useState(false);
    const [showCompanySearch, setShowCompanySearch] = useState(false);
    const [region, setRegion] = useState("global");
    const [visaFilter, setVisaFilter] = useState(false);
    const showVisaBadges = region === "uk";
    const handleSearch = (query, location, workType, maxApplicants, newRegion) => {
        setRegion(newRegion);
        setVisaFilter(false);
        const req = {
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
        if (!lastReq || !results)
            return;
        const next = { ...lastReq, page: lastReq.page + 1 };
        setLastReq(next);
        search(next, true);
    };
    const handleCompanySearch = (urls) => {
        if (!lastReq)
            return;
        searchCompanySites(lastReq, urls);
    };
    const visibleJobs = visaFilter
        ? (results?.jobs ?? []).filter((j) => j.uk_visa_sponsor === true)
        : (results?.jobs ?? []);
    const sponsorCount = (results?.jobs ?? []).filter((j) => j.uk_visa_sponsor === true).length;
    const hasMore = results ? results.jobs.length < results.total : false;
    return (_jsxs("div", { className: "min-h-screen bg-gray-950 text-gray-100", children: [_jsx("nav", { className: "sticky top-0 z-20 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60", children: _jsxs("div", { className: "max-w-5xl mx-auto px-4 h-14 flex items-center justify-between", children: [_jsxs("button", { onClick: reset, className: "flex items-center gap-2.5 hover:opacity-80 transition", children: [_jsx("div", { className: "p-1.5 bg-indigo-600 rounded-lg", children: _jsx(Briefcase, { size: 16 }) }), _jsx("span", { className: "font-bold text-base tracking-tight", children: "JobFind" })] }), _jsx("div", { className: "flex items-center gap-2 text-xs text-gray-500", children: _jsx("span", { className: "hidden sm:block", children: "10+ sources \u00B7 live results" }) })] }) }), _jsxs("main", { className: "max-w-5xl mx-auto px-4 pb-16", children: [!results && !loading && _jsx(Hero, {}), _jsx("div", { className: `${results || loading ? "py-6 border-b border-gray-800/50 mb-6" : ""}`, children: _jsx(SearchBar, { onSearch: handleSearch, loading: loading, initialRegion: region }) }), error && (_jsxs("div", { className: "flex items-center gap-2 p-4 bg-red-900/20 border border-red-800/50\n            rounded-xl text-red-400 text-sm mb-6", children: [_jsx(AlertCircle, { size: 16 }), error] })), results && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-5", children: [_jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [_jsx(Stat, { label: "total", value: results.total, accent: true }), showVisaBadges && sponsorCount > 0 && (_jsx(Stat, { label: "visa sponsors", value: sponsorCount }))] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [showVisaBadges && sponsorCount > 0 && (_jsxs("button", { onClick: () => setVisaFilter(!visaFilter), className: `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border
                      font-medium transition
                      ${visaFilter
                                                    ? "bg-blue-900/40 border-blue-600 text-blue-300"
                                                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`, children: [_jsx(ShieldCheck, { size: 12 }), "Visa sponsors only"] })), _jsxs("button", { onClick: () => setShowSources(!showSources), className: "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs\n                    bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-500 transition", children: [_jsx(Layers, { size: 12 }), results.sources_searched.length, " sources", _jsx(ChevronDown, { size: 12, className: `transition-transform ${showSources ? "rotate-180" : ""}` })] })] })] }), showSources && (_jsx("div", { className: "mb-5", children: _jsx(SourceStrip, { sources: results.sources_searched, errors: results.errors, onClose: () => setShowSources(false) }) })), showVisaBadges && (_jsxs("div", { className: "flex items-start gap-3 p-3.5 bg-blue-950/30 border border-blue-800/40\n                rounded-xl text-xs text-blue-300/80 mb-5", children: [_jsx(ShieldCheck, { size: 14, className: "shrink-0 mt-0.5 text-blue-400" }), _jsxs("span", { children: [_jsx("strong", { className: "text-blue-300", children: "UK Visa Sponsor" }), " badges are sourced from the official GOV.UK Register of Licensed Sponsors (Skilled Worker route, updated daily). A badge means the company is registered \u2014 confirm with the employer before applying."] })] })), visibleJobs.length === 0
                                ? _jsx(EmptyState, { query: results.query })
                                : (_jsx("div", { className: "space-y-2.5", children: visibleJobs.map((job) => (_jsx(JobCard, { job: job, showVisaBadge: showVisaBadges }, job.id))) })), hasMore && !visaFilter && (_jsx("div", { className: "mt-6 text-center", children: _jsx("button", { onClick: handleLoadMore, disabled: loading, className: "px-6 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700\n                    rounded-xl text-sm font-medium disabled:opacity-50 transition", children: loading
                                        ? "Loading…"
                                        : `Load more (${results.total - results.jobs.length} remaining)` }) })), _jsxs("div", { className: "mt-8", children: [_jsxs("button", { onClick: () => setShowCompanySearch(!showCompanySearch), className: "flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300\n                  transition mb-3", children: [_jsx(Building2, { size: 14 }), showCompanySearch ? "Hide" : "Add", " specific company websites", _jsx(ChevronDown, { size: 13, className: `transition-transform ${showCompanySearch ? "rotate-180" : ""}` })] }), showCompanySearch && (_jsx(CompanySearch, { onSearch: handleCompanySearch, loading: loading }))] })] }))] })] }));
}
