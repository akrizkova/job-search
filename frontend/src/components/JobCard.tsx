import { ExternalLink, MapPin, Building2, Clock, DollarSign } from "lucide-react";
import type { Job } from "../types";

const WORK_TYPE_STYLES: Record<string, string> = {
  remote: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
  hybrid: "bg-blue-900/50 text-blue-400 border-blue-800",
  onsite: "bg-orange-900/50 text-orange-400 border-orange-800",
};

function formatDate(raw?: string): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function JobCard({ job }: { job: Job }) {
  const workTypeStyle = job.work_type ? WORK_TYPE_STYLES[job.work_type] ?? "" : "";
  const postedAt = formatDate(job.posted_at);

  return (
    <article className="group bg-gray-900 border border-gray-800 rounded-xl p-5
      hover:border-indigo-600/50 hover:bg-gray-800/50 transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white hover:text-indigo-400 transition line-clamp-2
              group-hover:text-indigo-400"
          >
            {job.title}
          </a>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
            <span className="flex items-center gap-1">
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
              <span className="flex items-center gap-1 text-emerald-400">
                <DollarSign size={13} />
                {job.salary}
              </span>
            )}
          </div>

          {job.description && (
            <p className="mt-2 text-sm text-gray-500 line-clamp-2">{job.description}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {job.work_type && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs border font-medium ${workTypeStyle}`}
              >
                {job.work_type}
              </span>
            )}
            {job.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs bg-gray-800 border border-gray-700 text-gray-400"
              >
                {tag}
              </span>
            ))}
            <span className="ml-auto text-xs text-gray-600">{job.source}</span>
            {postedAt && (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <Clock size={11} />
                {postedAt}
              </span>
            )}
          </div>
        </div>

        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-indigo-400
            hover:bg-indigo-500/10 transition"
          aria-label="Open job posting"
        >
          <ExternalLink size={16} />
        </a>
      </div>
    </article>
  );
}
