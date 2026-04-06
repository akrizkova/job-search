import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Search, MapPin, Briefcase, Globe, ChevronDown, Users, SlidersHorizontal, X, } from "lucide-react";
const WORK_TYPE_OPTIONS = [
    { value: "any", label: "Any type" },
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
    { value: "onsite", label: "On-site" },
];
const APPLICANT_OPTIONS = [
    { value: "", label: "Any applicants" },
    { value: "10", label: "< 10 applicants" },
    { value: "25", label: "< 25 applicants" },
    { value: "50", label: "< 50 applicants" },
    { value: "100", label: "< 100 applicants" },
    { value: "200", label: "< 200 applicants" },
];
const REGION_OPTIONS = [
    { value: "uk", label: "United Kingdom", flag: "🇬🇧" },
    { value: "eu", label: "European Union", flag: "🇪🇺" },
    { value: "global", label: "Global", flag: "🌍" },
];
export function SearchBar({ onSearch, loading, initialRegion = "global" }) {
    const [query, setQuery] = useState("");
    const [location, setLocation] = useState("");
    const [workType, setWorkType] = useState("any");
    const [maxApplicants, setMaxApplicants] = useState("");
    const [region, setRegion] = useState(initialRegion);
    const [showFilters, setShowFilters] = useState(false);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim(), location.trim(), workType, maxApplicants ? parseInt(maxApplicants, 10) : undefined, region);
        }
    };
    const activeFilterCount = [
        workType !== "any",
        !!maxApplicants,
        !!location,
    ].filter(Boolean).length;
    return (_jsxs("form", { onSubmit: handleSubmit, className: "w-full", children: [_jsx("div", { className: "flex gap-2 mb-3", children: REGION_OPTIONS.map((opt) => (_jsxs("button", { type: "button", onClick: () => setRegion(opt.value), className: `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              border transition-all
              ${region === opt.value
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`, children: [_jsx("span", { children: opt.flag }), opt.label] }, opt.value))) }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("div", { className: "relative flex-1 min-w-0", children: [_jsx(Briefcase, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" }), _jsx("input", { type: "text", placeholder: "Job title, skill, or keywords...", value: query, onChange: (e) => setQuery(e.target.value), required: true, className: "w-full pl-9 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm\n              placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1\n              focus:ring-indigo-500 transition" })] }), _jsxs("button", { type: "button", onClick: () => setShowFilters(!showFilters), className: `relative flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm
            border transition
            ${showFilters
                            ? "bg-indigo-900/40 border-indigo-600 text-indigo-300"
                            : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`, children: [_jsx(SlidersHorizontal, { size: 15 }), "Filters", activeFilterCount > 0 && (_jsx("span", { className: "absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full\n              text-white text-[10px] flex items-center justify-center font-bold", children: activeFilterCount }))] }), _jsxs("button", { type: "submit", disabled: loading || !query.trim(), className: "flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500\n            disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold\n            transition whitespace-nowrap", children: [loading ? (_jsx("span", { className: "h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" })) : (_jsx(Search, { size: 16 })), loading ? "Searching…" : "Search"] })] }), showFilters && (_jsxs("div", { className: "mt-3 p-4 bg-gray-900 border border-gray-800 rounded-xl grid grid-cols-1\n          sm:grid-cols-3 gap-3", children: [_jsxs("div", { className: "relative", children: [_jsx("label", { className: "block text-xs text-gray-500 mb-1.5 font-medium", children: "Location" }), _jsxs("div", { className: "relative", children: [_jsx(MapPin, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" }), _jsx("input", { type: "text", placeholder: "City or country\u2026", value: location, onChange: (e) => setLocation(e.target.value), className: "w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm\n                  placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition" }), location && (_jsx("button", { type: "button", onClick: () => setLocation(""), className: "absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white", children: _jsx(X, { size: 13 }) }))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-500 mb-1.5 font-medium", children: "Work type" }), _jsxs("div", { className: "relative", children: [_jsx(Globe, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" }), _jsx("select", { value: workType, onChange: (e) => setWorkType(e.target.value), className: "w-full pl-8 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm\n                  text-gray-200 appearance-none focus:outline-none focus:border-indigo-500 transition cursor-pointer", children: WORK_TYPE_OPTIONS.map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value))) }), _jsx(ChevronDown, { size: 13, className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs text-gray-500 mb-1.5 font-medium", children: ["Max applicants", _jsx("span", { className: "ml-1 text-gray-600 font-normal", children: "(LinkedIn/Indeed only)" })] }), _jsxs("div", { className: "relative", children: [_jsx(Users, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" }), _jsx("select", { value: maxApplicants, onChange: (e) => setMaxApplicants(e.target.value), className: "w-full pl-8 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm\n                  text-gray-200 appearance-none focus:outline-none focus:border-indigo-500 transition cursor-pointer", children: APPLICANT_OPTIONS.map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value))) }), _jsx(ChevronDown, { size: 13, className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" })] })] })] }))] }));
}
