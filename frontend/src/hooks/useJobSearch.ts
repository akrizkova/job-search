import { useState, useCallback, useRef } from "react";
import type { SearchRequest, SearchResponse } from "../types";

export function useJobSearch() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accumulatedJobs = useRef<SearchResponse | null>(null);

  const search = useCallback(async (req: SearchRequest, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!resp.ok) throw new Error(`Search failed: ${resp.statusText}`);
      const data: SearchResponse = await resp.json();

      if (append && accumulatedJobs.current) {
        const merged: SearchResponse = {
          ...data,
          jobs: [...accumulatedJobs.current.jobs, ...data.jobs],
          total: accumulatedJobs.current.total + data.total,
          sources_searched: [
            ...new Set([
              ...accumulatedJobs.current.sources_searched,
              ...data.sources_searched,
            ]),
          ],
          errors: [...accumulatedJobs.current.errors, ...data.errors],
        };
        accumulatedJobs.current = merged;
        setResults(merged);
      } else {
        accumulatedJobs.current = data;
        setResults(data);
      }
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
        const params = companyUrls
          .map((u) => `company_urls=${encodeURIComponent(u)}`)
          .join("&");
        const resp = await fetch(`/api/search/companies?${params}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!resp.ok) throw new Error(`Search failed: ${resp.statusText}`);
        const data: SearchResponse = await resp.json();
        setResults((prev) => {
          if (!prev) return data;
          const merged = {
            ...data,
            jobs: [...prev.jobs, ...data.jobs],
            total: prev.total + data.total,
            sources_searched: [...new Set([...prev.sources_searched, ...data.sources_searched])],
            errors: [...prev.errors, ...data.errors],
          };
          accumulatedJobs.current = merged;
          return merged;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResults(null);
    setError(null);
    accumulatedJobs.current = null;
  }, []);

  return { results, loading, error, search, searchCompanySites, reset };
}
