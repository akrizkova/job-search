import { useState, useCallback, useRef } from "react";
import { staticSearch } from "../lib/staticSources";
// When VITE_API_URL is empty (GitHub Pages), use browser-direct API calls.
// When running locally with the backend, use /api/search.
const API_BASE = import.meta.env.VITE_API_URL ?? "";
const IS_STATIC = !API_BASE && !window.location.hostname.includes("localhost");
export function useJobSearch() {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const accumulatedJobs = useRef(null);
    const search = useCallback(async (req, append = false) => {
        setLoading(true);
        setError(null);
        try {
            let data;
            if (IS_STATIC) {
                // GitHub Pages / no backend — call APIs directly from the browser
                const result = await staticSearch(req);
                data = {
                    jobs: result.jobs,
                    total: result.jobs.length,
                    page: 1,
                    query: req.query,
                    sources_searched: result.sources_searched,
                    errors: result.errors,
                };
            }
            else {
                const resp = await fetch(`${API_BASE}/api/search`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(req),
                });
                if (!resp.ok)
                    throw new Error(`Search failed: ${resp.statusText}`);
                data = await resp.json();
            }
            if (append && accumulatedJobs.current) {
                const merged = {
                    ...data,
                    jobs: [...accumulatedJobs.current.jobs, ...data.jobs],
                    total: accumulatedJobs.current.total + data.jobs.length,
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
            }
            else {
                accumulatedJobs.current = data;
                setResults(data);
            }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error");
        }
        finally {
            setLoading(false);
        }
    }, []);
    const searchCompanySites = useCallback(async (req, companyUrls) => {
        if (IS_STATIC)
            return; // not available in static mode
        setLoading(true);
        setError(null);
        try {
            const params = companyUrls
                .map((u) => `company_urls=${encodeURIComponent(u)}`)
                .join("&");
            const resp = await fetch(`${API_BASE}/api/search/companies?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req),
            });
            if (!resp.ok)
                throw new Error(`Search failed: ${resp.statusText}`);
            const data = await resp.json();
            setResults((prev) => {
                if (!prev)
                    return data;
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
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error");
        }
        finally {
            setLoading(false);
        }
    }, []);
    const reset = useCallback(() => {
        setResults(null);
        setError(null);
        accumulatedJobs.current = null;
    }, []);
    return { results, loading, error, search, searchCompanySites, reset };
}
