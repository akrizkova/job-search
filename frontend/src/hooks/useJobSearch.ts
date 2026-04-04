import { useState, useCallback } from "react";
import type { SearchRequest, SearchResponse } from "../types";

export function useJobSearch() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (req: SearchRequest) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!resp.ok) {
        throw new Error(`Search failed: ${resp.statusText}`);
      }
      const data: SearchResponse = await resp.json();
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCompanySites = useCallback(
    async (req: SearchRequest, companyUrls: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(
          `/api/search/companies?${companyUrls.map((u) => `company_urls=${encodeURIComponent(u)}`).join("&")}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
          }
        );
        if (!resp.ok) throw new Error(`Search failed: ${resp.statusText}`);
        const data: SearchResponse = await resp.json();
        setResults((prev) =>
          prev
            ? { ...data, jobs: [...prev.jobs, ...data.jobs], total: prev.total + data.total }
            : data
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { results, loading, error, search, searchCompanySites };
}
