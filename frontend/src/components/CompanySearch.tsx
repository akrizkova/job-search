import { useState, FormEvent } from "react";
import { Plus, X, Building2, Search } from "lucide-react";

interface Props {
  onSearch: (urls: string[]) => void;
  loading: boolean;
}

export function CompanySearch({ onSearch, loading }: Props) {
  const [urls, setUrls] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const addUrl = () => {
    const trimmed = input.trim();
    if (!trimmed || urls.includes(trimmed)) return;
    try {
      new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      setUrls((prev) => [...prev, trimmed.startsWith("http") ? trimmed : `https://${trimmed}`]);
      setInput("");
    } catch {
      // invalid URL, ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addUrl();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (urls.length > 0) onSearch(urls);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4">
        <Building2 size={15} />
        Search Specific Company Sites
      </h3>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="https://company.com or company.com/careers"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm
            placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition"
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={!input.trim()}
          className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg
            disabled:opacity-50 transition"
        >
          <Plus size={16} />
        </button>
      </div>

      {urls.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {urls.map((url) => (
              <span
                key={url}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-900/30 border
                  border-indigo-800/50 rounded-full text-xs text-indigo-300"
              >
                {url.replace(/^https?:\/\//, "")}
                <button
                  type="button"
                  onClick={() => setUrls((prev) => prev.filter((u) => u !== url))}
                  className="hover:text-white transition"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500
              disabled:opacity-50 rounded-lg text-sm font-medium transition"
          >
            {loading ? (
              <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Search {urls.length} site{urls.length !== 1 ? "s" : ""}
          </button>
        </>
      )}
    </div>
  );
}
