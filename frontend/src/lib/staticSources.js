const md5short = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
};
// ── Greenhouse ───────────────────────────────────────────────────────────────
const GREENHOUSE_IDS = [
    "airbnb", "stripe", "coinbase", "figma", "notion", "linear", "vercel", "supabase",
    "discord", "reddit", "dropbox", "hubspot", "datadog", "mongodb", "elastic",
    "confluent", "snowflake", "databricks", "anthropic", "scale-ai", "openai",
    "cloudflare", "netlify", "sentry", "posthog", "airtable", "webflow", "loom",
    "deliveroo", "ocado", "darktrace", "graphcore", "tractable", "tessian", "jagex",
    "king", "asos", "trustpilot", "spotify", "kry", "supercell", "helsing", "onfido",
    "farfetch", "thought-machine", "clearscore",
];
async function searchGreenhouse(req) {
    const q = req.query.toLowerCase();
    const jobs = [];
    await Promise.allSettled(GREENHOUSE_IDS.map(async (id) => {
        const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`);
        if (!r.ok)
            return;
        const data = await r.json();
        for (const item of data.jobs ?? []) {
            const title = item.title ?? "";
            if (!title.toLowerCase().includes(q))
                continue;
            const loc = item.offices?.[0]?.name ?? item.location?.name ?? "";
            const wtype = /remote/i.test(loc)
                ? "remote"
                : /hybrid/i.test(loc)
                    ? "hybrid"
                    : "onsite";
            if (req.work_type !== "any" && wtype !== req.work_type)
                continue;
            if (req.location && !loc.toLowerCase().includes(req.location.toLowerCase()) && wtype !== "remote")
                continue;
            jobs.push({
                id: `gh_${md5short(item.absolute_url ?? id + title)}`,
                title,
                company: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                location: loc || "See posting",
                work_type: wtype,
                url: item.absolute_url ?? "",
                source: "Greenhouse",
                posted_at: item.updated_at ?? "",
                tags: (item.departments ?? []).map((d) => d.name),
                salary: undefined,
            });
        }
    }));
    return jobs;
}
// ── Lever ────────────────────────────────────────────────────────────────────
const LEVER_IDS = [
    "netflix", "lyft", "instacart", "plaid", "brex", "rippling", "gusto", "lattice",
    "carta", "deel", "mercury", "ramp", "anduril", "flexport", "faire", "attentive",
    "klaviyo", "amplitude", "mixpanel", "lacework", "wiz", "snyk", "coda", "retool",
    "glean", "moveworks", "writer", "adept", "perplexity", "deepl", "sky", "guardian",
    "clearscore", "behavox", "improbable", "faculty", "unmind", "cleo", "nested",
    "memrise", "onfido", "farfetch", "gorillas", "voi", "unity", "rovio",
];
async function searchLever(req) {
    const q = req.query.toLowerCase();
    const jobs = [];
    await Promise.allSettled(LEVER_IDS.map(async (id) => {
        const r = await fetch(`https://api.lever.co/v0/postings/${id}?mode=json`);
        if (!r.ok)
            return;
        const data = await r.json();
        if (!Array.isArray(data))
            return;
        for (const item of data) {
            const title = item.text ?? "";
            if (!title.toLowerCase().includes(q))
                continue;
            const cats = item.categories ?? {};
            const loc = cats.location ?? "";
            const combined = `${title} ${loc}`.toLowerCase();
            const wtype = /remote/.test(combined)
                ? "remote"
                : /hybrid/.test(combined)
                    ? "hybrid"
                    : "onsite";
            if (req.work_type !== "any" && wtype !== req.work_type)
                continue;
            if (req.location && !loc.toLowerCase().includes(req.location.toLowerCase()) && wtype !== "remote")
                continue;
            jobs.push({
                id: `lv_${md5short(item.hostedUrl ?? id + title)}`,
                title,
                company: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                location: loc || "See posting",
                work_type: wtype,
                url: item.hostedUrl ?? "",
                source: "Lever",
                posted_at: String(item.createdAt ?? ""),
                tags: cats.team ? [cats.team] : [],
                salary: undefined,
            });
        }
    }));
    return jobs;
}
// ── Ashby ────────────────────────────────────────────────────────────────────
const ASHBY_IDS = [
    "monzo", "starlingbank", "wise", "checkout", "gocardless", "oaknorth", "zopa",
    "fundingcircle", "truelayer", "form3", "multiverse", "cleo", "unmind", "nested",
    "klarna", "n26", "pleo", "spendesk", "qonto", "payfit", "mistral", "elevenlabs",
    "wayve", "synthesia", "polyai", "poolside", "personio", "factorial", "typeform",
    "miro", "pitch", "aiven", "contentful", "wolt", "bolt", "alan", "doctolib",
    "linear", "notion", "vercel", "supabase", "neon", "clerk", "resend", "posthog",
    "lago", "dub", "raycast", "arc", "codeium", "anysphere", "retool", "glean",
    "perplexity", "runwayml", "cohere", "together", "modal", "ramp", "mercury",
    "brex", "rippling", "lattice", "deel", "remote", "oysterhr", "loom", "pave",
];
async function searchAshby(req) {
    const q = req.query.toLowerCase();
    const jobs = [];
    await Promise.allSettled(ASHBY_IDS.map(async (id) => {
        const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${id}?includeCompensation=true`);
        if (!r.ok)
            return;
        const data = await r.json();
        for (const item of data.jobPostings ?? []) {
            const title = item.title ?? "";
            if (!title.toLowerCase().includes(q) && !JSON.stringify(item).toLowerCase().includes(q))
                continue;
            const isRemote = item.isRemote ?? false;
            const loc = item.locationName ?? item.location ?? "";
            const wtype = isRemote ? "remote" : /hybrid/i.test(loc) ? "hybrid" : "onsite";
            if (req.work_type !== "any" && wtype !== req.work_type)
                continue;
            if (req.location && !loc.toLowerCase().includes(req.location.toLowerCase()) && !isRemote)
                continue;
            const comp = item.compensation ?? {};
            let salary = "";
            if (comp.minValue && comp.maxValue) {
                salary = `${comp.currency ?? ""}${Number(comp.minValue).toLocaleString()}–${Number(comp.maxValue).toLocaleString()}`;
            }
            const url = item.applyUrl ?? item.jobUrl ?? `https://jobs.ashbyhq.com/${id}/${item.id ?? ""}`;
            jobs.push({
                id: `ab_${md5short(url)}`,
                title,
                company: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                location: loc || (isRemote ? "Remote" : "See posting"),
                work_type: wtype,
                url,
                source: "Ashby",
                salary,
                tags: [item.departmentName, item.teamName].filter(Boolean),
            });
        }
    }));
    return jobs;
}
// ── Remotive ─────────────────────────────────────────────────────────────────
async function searchRemotive(req) {
    if (req.work_type === "onsite")
        return [];
    const r = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(req.query)}&limit=20`);
    if (!r.ok)
        return [];
    const data = await r.json();
    return (data.jobs ?? []).map((item) => ({
        id: `rm_${md5short(String(item.url ?? item.id ?? Math.random()))}`,
        title: String(item.title ?? ""),
        company: String(item.company_name ?? ""),
        location: String(item.candidate_required_location ?? "Remote"),
        work_type: "remote",
        url: String(item.url ?? ""),
        source: "Remotive",
        posted_at: String(item.publication_date ?? ""),
        salary: String(item.salary ?? ""),
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 5) : [],
    }));
}
// ── Aggregated static search ─────────────────────────────────────────────────
export async function staticSearch(req) {
    const settled = await Promise.allSettled([
        searchGreenhouse(req).then((j) => ({ name: "Greenhouse", jobs: j })),
        searchLever(req).then((j) => ({ name: "Lever", jobs: j })),
        searchAshby(req).then((j) => ({ name: "Ashby", jobs: j })),
        searchRemotive(req).then((j) => ({ name: "Remotive", jobs: j })),
    ]);
    const jobs = [];
    const sources_searched = [];
    const errors = [];
    for (const r of settled) {
        if (r.status === "fulfilled") {
            sources_searched.push(r.value.name);
            jobs.push(...r.value.jobs);
        }
        else {
            errors.push(String(r.reason));
        }
    }
    // Deduplicate
    const seen = new Set();
    const unique = jobs.filter((j) => {
        const k = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
        if (seen.has(k))
            return false;
        seen.add(k);
        return true;
    });
    return { jobs: unique, sources_searched, errors };
}
