import { useState, FormEvent } from "react";
import {
  Search, MapPin, Briefcase, Globe, ChevronDown, Users, SlidersHorizontal, X,
} from "lucide-react";
import type { WorkType, Region } from "../types";

interface Props {
  onSearch: (
    query: string,
    location: string,
    workType: WorkType,
    maxApplicants: number | undefined,
    region: Region
  ) => void;
  loading: boolean;
  initialRegion?: Region;
}

const WORK_TYPE_OPTIONS: { value: WorkType; label: string }[] = [
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

const REGION_OPTIONS: { value: Region; label: string; flag: string }[] = [
  { value: "uk", label: "United Kingdom", flag: "🇬🇧" },
  { value: "eu", label: "European Union", flag: "🇪🇺" },
  { value: "global", label: "Global", flag: "🌍" },
];

export function SearchBar({ onSearch, loading, initialRegion = "global" }: Props) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState<WorkType>("any");
  const [maxApplicants, setMaxApplicants] = useState("");
  const [region, setRegion] = useState<Region>(initialRegion);
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(
        query.trim(),
        location.trim(),
        workType,
        maxApplicants ? parseInt(maxApplicants, 10) : undefined,
        region
      );
    }
  };

  const activeFilterCount = [
    workType !== "any",
    !!maxApplicants,
    !!location,
  ].filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* Region selector */}
      <div className="flex gap-2 mb-3">
        {REGION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRegion(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              border transition-all
              ${region === opt.value
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
          >
            <span>{opt.flag}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Main search row */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Briefcase
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Job title, skill, or keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
            className="w-full pl-9 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm
              placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
              focus:ring-indigo-500 transition"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`relative flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm
            border transition
            ${showFilters
              ? "bg-indigo-900/40 border-indigo-600 text-indigo-300"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full
              text-white text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold
            transition whitespace-nowrap"
        >
          {loading ? (
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="mt-3 p-4 bg-gray-900 border border-gray-800 rounded-xl grid grid-cols-1
          sm:grid-cols-3 gap-3">
          {/* Location */}
          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Location</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="City or country…"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm
                  placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition"
              />
              {location && (
                <button type="button" onClick={() => setLocation("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Work type */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Work type</label>
            <div className="relative">
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value as WorkType)}
                className="w-full pl-8 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm
                  text-gray-200 appearance-none focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                {WORK_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Max applicants */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">
              Max applicants
              <span className="ml-1 text-gray-600 font-normal">(LinkedIn/Indeed only)</span>
            </label>
            <div className="relative">
              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <select
                value={maxApplicants}
                onChange={(e) => setMaxApplicants(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm
                  text-gray-200 appearance-none focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                {APPLICANT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
