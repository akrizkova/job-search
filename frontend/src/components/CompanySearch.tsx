import { useState, FormEvent } from "react";
import { Plus, X, Building2, Search, ExternalLink } from "lucide-react";

interface Props {
  onSearch: (urls: string[]) => void;
  loading: boolean;
}

// Popular companies by ATS — user can add with one click
const QUICK_ADD: { name: string; url: string; category: string }[] = [
  // UK Fintech
  { name: "Monzo", url: "https://monzo.com/careers", category: "UK Fintech" },
  { name: "Revolut", url: "https://www.revolut.com/careers", category: "UK Fintech" },
  { name: "Wise", url: "https://wise.com/gb/careers", category: "UK Fintech" },
  { name: "Starling", url: "https://www.starlingbank.com/careers", category: "UK Fintech" },
  { name: "GoCardless", url: "https://gocardless.com/about/careers", category: "UK Fintech" },
  // UK Tech
  { name: "Deliveroo", url: "https://careers.deliveroo.co.uk", category: "UK Tech" },
  { name: "Ocado Tech", url: "https://careers.ocado.com", category: "UK Tech" },
  { name: "Darktrace", url: "https://darktrace.com/careers", category: "UK Tech" },
  // EU Tech
  { name: "Mistral", url: "https://mistral.ai/careers", category: "EU Tech" },
  { name: "ElevenLabs", url: "https://elevenlabs.io/careers", category: "EU Tech" },
  { name: "Personio", url: "https://www.personio.com/about-personio/careers", category: "EU Tech" },
  { name: "N26", url: "https://n26.com/en-eu/careers", category: "EU Fintech" },
  { name: "Klarna", url: "https://www.klarna.com/careers", category: "EU Fintech" },
  { name: "Zalando", url: "https://jobs.zalando.com", category: "EU Tech" },
  // Global
  { name: "Vercel", url: "https://vercel.com/careers", category: "Global" },
  { name: "Notion", url: "https://www.notion.so/careers", category: "Global" },
  { name: "Linear", url: "https://linear.app/careers", category: "Global" },
];

const CATEGORIES = [...new Set(QUICK_ADD.map((c) => c.category))];

export function CompanySearch({ onSearch, loading }: Props) {
  const [urls, setUrls] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const addUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const full = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    try {
      new URL(full);
      if (!urls.includes(full)) setUrls((prev) => [...prev, full]);
      setInput("");
    } catch {}
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) addUrl(input);
    else if (urls.length > 0) onSearch(urls);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4">
        <Building2 size={15} className="text-indigo-400" />
        Search specific company career pages
        <span className="text-xs text-gray-500 font-normal ml-1">
          — for companies not on job boards
        </span>
      </h3>

      {/* Quick-add chips */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`px-2.5 py-1 rounded-full text-xs border transition
              ${!activeCategory
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-2.5 py-1 rounded-full text-xs border transition
                ${activeCategory === cat
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_ADD
            .filter((c) => !activeCategory || c.category === activeCategory)
            .map((c) => {
              const added = urls.includes(c.url);
              return (
                <button
                  key={c.url}
                  type="button"
                  onClick={() => added
                    ? setUrls((prev) => prev.filter((u) => u !== c.url))
                    : addUrl(c.url)
                  }
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition
                    ${added
                      ? "bg-indigo-900/50 border-indigo-600 text-indigo-300"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"}`}
                >
                  {added ? <X size={10} /> : <Plus size={10} />}
                  {c.name}
                </button>
              );
            })}
        </div>
      </div>

      {/* Manual URL entry */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <ExternalLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Or paste any career page URL…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(input); }}}
            className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm
              placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <button
          type="button"
          onClick={() => addUrl(input)}
          disabled={!input.trim()}
          className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg
            disabled:opacity-40 transition"
        >
          <Plus size={16} />
        </button>
      </form>

      {/* Selected URLs */}
      {urls.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {urls.map((url) => (
              <span key={url}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-900/30
                  border border-indigo-800/50 rounded-full text-xs text-indigo-300">
                {url.replace(/^https?:\/\//, "").replace(/\/careers\/?$/, "").replace(/\/jobs\/?$/, "")}
                <button
                  type="button"
                  onClick={() => setUrls((prev) => prev.filter((u) => u !== url))}
                  className="hover:text-white transition"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onSearch(urls)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500
              disabled:opacity-50 rounded-lg text-sm font-medium transition"
          >
            {loading
              ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Search size={14} />
            }
            Search {urls.length} site{urls.length !== 1 ? "s" : ""}
          </button>
        </>
      )}
    </div>
  );
}
