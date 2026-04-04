import { ExternalLink, MapPin, Building2, Clock, DollarSign, Users, ShieldCheck } from "lucide-react";
import type { Job } from "../types";

const WORK_TYPE_STYLES: Record<string, string> = {
  remote: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
  hybrid: "bg-sky-900/50 text-sky-400 border-sky-800",
  onsite: "bg-orange-900/50 text-orange-400 border-orange-800",
};

function formatDate(raw?: string): string {
  if (!raw) return "";
  try {
    const d = new Date(Number(raw) > 1e10 ? Number(raw) : raw);
    if (isNaN(d.getTime())) return "";
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function ApplicantBadge({ count, label }: { count?: number; label?: string }) {
  if (!label && count == null) return null;
  const displayLabel = label || `${count!.toLocaleString()} applicants`;
  const isEarly = label?.toLowerCase().includes("early");
  const n = count ?? (isEarly ? 0 : 999);

  let style: string;
  if (isEarly || n < 25) {
    style = "bg-emerald-900/60 text-emerald-300 border-emerald-700";
  } else if (n < 100) {
    style = "bg-yellow-900/60 text-yellow-300 border-yellow-700";
  } else {
    style = "bg-red-900/60 text-red-400 border-red-800";
  }

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${style}`}>
      <Users size={11} />
      {displayLabel}
    </span>
  );
}

function VisaBadge({ isSponsor, city }: { isSponsor?: boolean; city?: string }) {
  if (isSponsor !== true) return null;
  return (
    <span
      title={city ? `Registered Skilled Worker sponsor — ${city}` : "Registered UK Skilled Worker visa sponsor"}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium
        bg-blue-900/60 text-blue-300 border-blue-700 cursor-help"
    >
      <ShieldCheck size={11} />
      UK Visa Sponsor
    </span>
  );
}

export function JobCard({ job, showVisaBadge = false }: { job: Job; showVisaBadge?: boolean }) {
  const workTypeStyle = job.work_type ? WORK_TYPE_STYLES[job.work_type] ?? "" : "";
  const postedAt = formatDate(job.posted_at);

  return (
    <article className="group bg-gray-900 border border-gray-800 rounded-xl p-5
      hover:border-indigo-600/40 hover:bg-gray-800/40 transition-all duration-150">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Title + badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white hover:text-indigo-400 transition group-hover:text-indigo-400
                leading-snug"
            >
              {job.title}
            </a>
            {showVisaBadge && (
              <VisaBadge isSponsor={job.uk_visa_sponsor} city={job.uk_sponsor_city} />
            )}
            <ApplicantBadge count={job.applicant_count} label={job.applicant_count_label} />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400 mb-2">
            <span className="flex items-center gap-1 font-medium text-gray-300">
              <Building2 size={13} />
              {job.company}
            </span>
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {job.location}
              </span>
            )}
            {job.salary && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <DollarSign size={13} />
                {job.salary}
              </span>
            )}
          </div>

          {job.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{job.description}</p>
          )}

          {/* Footer row */}
          <div className="flex flex-wrap items-center gap-2">
            {job.work_type && (
              <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${workTypeStyle}`}>
                {job.work_type}
              </span>
            )}
            {job.tags.filter(Boolean).slice(0, 3).map((tag) => (
              <span key={tag}
                className="px-2 py-0.5 rounded-full text-xs bg-gray-800 border border-gray-700/50 text-gray-400">
                {tag}
              </span>
            ))}
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-600">
              <span>{job.source}</span>
              {postedAt && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {postedAt}
                </span>
              )}
            </div>
          </div>
        </div>

        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-indigo-400
            hover:bg-indigo-500/10 transition mt-0.5"
          aria-label="Open job posting"
        >
          <ExternalLink size={16} />
        </a>
      </div>
    </article>
  );
}
