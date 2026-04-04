import { useState, FormEvent } from "react";
import { Search, MapPin, Briefcase, Globe, ChevronDown, Users } from "lucide-react";
import type { WorkType } from "../types";

interface Props {
  onSearch: (query: string, location: string, workType: WorkType, maxApplicants: number | undefined) => void;
  loading: boolean;
}

const WORK_TYPE_OPTIONS: { value: WorkType; label: string }[] = [
  { value: "any", label: "Any work type" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const APPLICANT_OPTIONS = [
  { value: "", label: "Any # applicants" },
  { value: "10", label: "Under 10" },
  { value: "25", label: "Under 25" },
  { value: "50", label: "Under 50" },
  { value: "100", label: "Under 100" },
  { value: "200", label: "Under 200" },
];

export function SearchBar({ onSearch, loading }: Props) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState<WorkType>("any");
  const [maxApplicants, setMaxApplicants] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(
        query.trim(),
        location.trim(),
        workType,
        maxApplicants ? parseInt(maxApplicants, 10) : undefined
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {/* Job title — full width on first row */}
        <div className="relative flex-1 min-w-0 sm:min-w-56">
          <Briefcase
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Job title, skill, or company..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
            className="w-full pl-9 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm
              placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
              focus:ring-indigo-500 transition"
          />
        </div>

        {/* Location */}
        <div className="relative w-full sm:w-44">
          <MapPin
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm
              placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
              focus:ring-indigo-500 transition"
          />
        </div>

        {/* Work type */}
        <div className="relative w-full sm:w-40">
          <Globe
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <select
            value={workType}
            onChange={(e) => setWorkType(e.target.value as WorkType)}
            className="w-full pl-9 pr-8 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm
              text-gray-100 appearance-none focus:outline-none focus:border-indigo-500
              focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
          >
            {WORK_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>

        {/* Max applicants */}
        <div className="relative w-full sm:w-40">
          <Users
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <select
            value={maxApplicants}
            onChange={(e) => setMaxApplicants(e.target.value)}
            className="w-full pl-9 pr-8 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm
              text-gray-100 appearance-none focus:outline-none focus:border-indigo-500
              focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
          >
            {APPLICANT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600
            hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
            rounded-xl text-sm font-medium transition whitespace-nowrap"
        >
          {loading ? (
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {loading ? "Searching..." : "Search Jobs"}
        </button>
      </div>

      {maxApplicants && (
        <p className="mt-2 text-xs text-amber-500/80 pl-1">
          Applicant filter applies to LinkedIn/Indeed listings only — other sources don't expose this data.
        </p>
      )}
    </form>
  );
}
