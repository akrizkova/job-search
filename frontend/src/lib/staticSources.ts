/**
 * Static/browser-side job sources — called directly from the React app
 * when running on GitHub Pages (no backend available).
 *
 * APIs with CORS support for public browser requests:
 *   Greenhouse, Lever, Ashby, Remotive, RemoteOK, Arbeitnow, JustJoin.it
 */
import type { Job, SearchRequest } from "../types";

const md5short = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
};

/**
 * AND-word matching: every word in the query must appear somewhere
 * in the combined fields. Much more permissive than exact substring match.
 * "python developer" matches "Senior Developer (Python/Go)" ✓
 */
function matchesQuery(query: string, ...fields: string[]): boolean {
  const combined = fields.join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => combined.includes(word));
}

// ── Region filtering ──────────────────────────────────────────────────────────

const EU_KEYWORDS = [
  // EU member states
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech",
  "denmark", "estonia", "finland", "france", "germany", "greece",
  "hungary", "ireland", "italy", "latvia", "lithuania", "luxembourg",
  "malta", "netherlands", "poland", "portugal", "romania", "slovakia",
  "slovenia", "spain", "sweden",
  // EEA / closely associated
  "norway", "iceland", "switzerland",
  // Major EU/EEA cities
  "amsterdam", "rotterdam", "eindhoven", "utrecht", "antwerp", "ghent",
  "berlin", "munich", "hamburg", "frankfurt", "cologne", "düsseldorf",
  "stuttgart", "paris", "lyon", "marseille", "toulouse", "bordeaux",
  "madrid", "barcelona", "seville", "valencia", "bilbao",
  "rome", "milan", "turin", "naples", "florence",
  "vienna", "graz", "linz",
  "warsaw", "krakow", "wroclaw", "poznan", "gdansk", "lodz",
  "prague", "brno", "budapest",
  "lisbon", "porto",
  "stockholm", "gothenburg", "malmo",
  "helsinki", "tampere",
  "oslo", "bergen",
  "copenhagen", "aarhus",
  "dublin", "cork",
  "brussels", "liege",
  "zurich", "geneva", "basel",
  "bucharest", "cluj",
  "sofia", "zagreb", "ljubljana", "bratislava", "tallinn", "riga", "vilnius",
  "athens", "thessaloniki",
  // Generic terms
  "europe", "european", "emea", "eu",
];

const UK_KEYWORDS = [
  "united kingdom", " uk", "england", "scotland", "wales", "northern ireland",
  "great britain", "britain",
  // Cities
  "london", "manchester", "birmingham", "leeds", "glasgow", "edinburgh",
  "liverpool", "bristol", "sheffield", "cambridge", "oxford", "brighton",
  "cardiff", "newcastle", "nottingham", "reading", "guildford", "bath",
  "coventry", "belfast", "leicester", "southampton", "portsmouth",
  "bournemouth", "exeter", "york", "hull", "stoke", "derby", "plymouth",
];

/**
 * Returns true if a job passes the region filter.
 * - global: everything passes
 * - remote jobs: always pass (can be done from any region)
 * - eu: location must match an EU/EEA country or city
 * - uk: location must match a UK city or country name
 * - unknown location ("See posting"): included (can't filter what we don't know)
 */
function passesRegionFilter(loc: string, wtype: string, region: string): boolean {
  if (region === "global") return true;
  if (wtype === "remote") return true; // remote jobs are region-agnostic
  if (!loc || loc === "See posting") return true; // unknown — give benefit of doubt
  const l = loc.toLowerCase();
  if (region === "eu") return EU_KEYWORDS.some((k) => l.includes(k));
  if (region === "uk") return UK_KEYWORDS.some((k) => l.includes(k));
  return true;
}

// ── Greenhouse ───────────────────────────────────────────────────────────────
const GREENHOUSE_IDS = [
  // US Tech
  "airbnb", "stripe", "coinbase", "figma", "notion", "linear", "vercel",
  "supabase", "planetscale", "neon", "clerk", "resend", "discord", "twitch",
  "reddit", "dropbox", "box", "hubspot", "datadog", "hashicorp", "mongodb",
  "elastic", "confluent", "snowflake", "databricks", "dbt-labs", "airbyte",
  "fivetran", "netlify", "render", "railway", "cloudflare", "github",
  "gitlab", "jetbrains", "sentry", "posthog", "loom", "miro", "airtable",
  "webflow", "framer", "weights-and-biases", "scale-ai",
  // AI
  "anthropic", "openai", "cohere", "together", "modal", "mistral",
  "huggingface",
  // UK/EU Tech
  "deliveroo", "darktrace", "graphcore", "tractable", "tessian", "jagex",
  "king", "asos", "trustpilot", "spotify", "kry", "supercell", "helsing",
  "onfido", "farfetch", "thought-machine", "clearscore",
  // Media / Content
  "automattic", "doist", "buffer", "hotjar", "toptal",
  // Gaming
  "riotgames", "unity",
  // Data / Infra
  "grafana", "temporal",
];

async function searchGreenhouse(req: SearchRequest): Promise<Job[]> {
  const region = req.region ?? "global";
  const jobs: Job[] = [];
  await Promise.allSettled(
    GREENHOUSE_IDS.map(async (id) => {
      const r = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`
      );
      if (!r.ok) return;
      const data = await r.json();
      for (const item of data.jobs ?? []) {
        const title: string = item.title ?? "";
        // Strip leading numeric dept IDs e.g. "1135 Accelerate" → "Accelerate"
        const depts: string = (item.departments ?? [])
          .map((d: { name: string }) => d.name.replace(/^\d+\s+/, ""))
          .join(" ");
        const desc: string = (item.content ?? "").slice(0, 400);
        if (!matchesQuery(req.query, title, depts, desc)) continue;

        const loc: string =
          item.offices?.[0]?.name ?? item.location?.name ?? "";
        const wtype = /remote/i.test(loc)
          ? "remote"
          : /hybrid/i.test(loc)
          ? "hybrid"
          : "onsite";
        if (req.work_type !== "any" && wtype !== req.work_type) continue;
        if (
          req.location &&
          !loc.toLowerCase().includes(req.location.toLowerCase()) &&
          wtype !== "remote"
        )
          continue;
        if (!passesRegionFilter(loc, wtype, region)) continue;

        jobs.push({
          id: `gh_${md5short(item.absolute_url ?? id + title)}`,
          title,
          company: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          location: loc || "See posting",
          work_type: wtype,
          url: item.absolute_url ?? "",
          source: "Greenhouse",
          posted_at: item.updated_at ?? "",
          // Strip numeric IDs from displayed tags too
          tags: (item.departments ?? []).map((d: { name: string }) =>
            d.name.replace(/^\d+\s+/, "")
          ),
        });
      }
    })
  );
  return jobs;
}

// ── Lever ────────────────────────────────────────────────────────────────────
const LEVER_IDS = [
  // US Tech
  "netflix", "lyft", "instacart", "plaid", "brex", "rippling", "gusto",
  "lattice", "carta", "deel", "mercury", "ramp", "anduril", "flexport",
  "faire", "attentive", "klaviyo", "amplitude", "mixpanel", "lacework",
  "wiz", "snyk", "coda", "retool", "glean", "moveworks", "writer",
  "perplexity", "adept", "sendbird", "heap", "fullstory", "statsig",
  "semgrep", "chainguard", "inflection", "character",
  // UK/EU
  "sky", "guardian", "behavox", "improbable", "faculty", "unmind", "cleo",
  "nested", "memrise", "onfido", "farfetch", "gorillas", "voi", "rovio",
  "deepl", "aircall",
  // Remote-first
  "remote", "doist", "buffer", "hotjar", "automattic", "canonical",
  // Gaming
  "riotgames", "unity",
];

async function searchLever(req: SearchRequest): Promise<Job[]> {
  const region = req.region ?? "global";
  const jobs: Job[] = [];
  await Promise.allSettled(
    LEVER_IDS.map(async (id) => {
      const r = await fetch(`https://api.lever.co/v0/postings/${id}?mode=json`);
      if (!r.ok) return;
      const data = await r.json();
      if (!Array.isArray(data)) return;
      for (const item of data) {
        const title: string = item.text ?? "";
        const cats = item.categories ?? {};
        const team: string = cats.team ?? "";
        const commitment: string = cats.commitment ?? "";
        const loc: string = cats.location ?? "";
        const desc: string = (item.description ?? "").slice(0, 400);
        if (!matchesQuery(req.query, title, team, commitment, desc)) continue;

        const combined = `${title} ${loc} ${commitment}`.toLowerCase();
        const wtype = /remote/.test(combined)
          ? "remote"
          : /hybrid/.test(combined)
          ? "hybrid"
          : "onsite";
        if (req.work_type !== "any" && wtype !== req.work_type) continue;
        if (
          req.location &&
          !loc.toLowerCase().includes(req.location.toLowerCase()) &&
          wtype !== "remote"
        )
          continue;
        if (!passesRegionFilter(loc, wtype, region)) continue;

        jobs.push({
          id: `lv_${md5short(item.hostedUrl ?? id + title)}`,
          title,
          company: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          location: loc || "See posting",
          work_type: wtype,
          url: item.hostedUrl ?? "",
          source: "Lever",
          posted_at: String(item.createdAt ?? ""),
          tags: team ? [team] : [],
        });
      }
    })
  );
  return jobs;
}

// ── Ashby ────────────────────────────────────────────────────────────────────
const ASHBY_IDS = [
  // UK Fintech/Tech
  "monzo", "starlingbank", "wise", "checkout", "gocardless", "oaknorth",
  "zopa", "fundingcircle", "truelayer", "form3", "multiverse", "cleo",
  "unmind", "nested", "onfido",
  // EU Fintech
  "klarna", "n26", "pleo", "spendesk", "qonto", "payfit", "getmoss",
  "traderepublic",
  // EU AI / Deep Tech
  "mistral", "elevenlabs", "wayve", "synthesia", "polyai", "poolside",
  "stabilityai",
  // EU SaaS
  "personio", "factorial", "typeform", "miro", "pitch", "aiven",
  "contentful", "wolt", "bolt", "alan", "doctolib",
  // Global remote-friendly
  "linear", "notion", "vercel", "supabase", "neon", "clerk", "resend",
  "posthog", "lago", "dub", "raycast", "arc", "codeium", "anysphere",
  "retool", "glean", "perplexity", "runwayml", "cohere", "together",
  "modal", "ramp", "mercury", "brex", "rippling", "lattice", "deel",
  "remote", "oysterhr", "loom", "pave", "descript",
  // Extras
  "grafana", "aircall",
];

async function searchAshby(req: SearchRequest): Promise<Job[]> {
  const region = req.region ?? "global";
  const jobs: Job[] = [];
  await Promise.allSettled(
    ASHBY_IDS.map(async (id) => {
      const r = await fetch(
        `https://api.ashbyhq.com/posting-api/job-board/${id}?includeCompensation=true`
      );
      if (!r.ok) return;
      const data = await r.json();
      for (const item of data.jobPostings ?? []) {
        const title: string = item.title ?? "";
        const dept: string = item.departmentName ?? "";
        const team: string = item.teamName ?? "";
        const desc: string = (item.descriptionPlain ?? "").slice(0, 400);
        if (!matchesQuery(req.query, title, dept, team, desc)) continue;

        const isRemote: boolean = item.isRemote ?? false;
        const loc: string = item.locationName ?? item.location ?? "";
        const wtype = isRemote
          ? "remote"
          : /hybrid/i.test(loc)
          ? "hybrid"
          : "onsite";
        if (req.work_type !== "any" && wtype !== req.work_type) continue;
        if (req.location && !loc.toLowerCase().includes(req.location.toLowerCase()) && !isRemote)
          continue;
        if (!passesRegionFilter(loc, wtype, region)) continue;

        const comp = item.compensation ?? {};
        let salary = "";
        if (comp.minValue && comp.maxValue) {
          salary = `${comp.currency ?? ""}${Number(comp.minValue).toLocaleString()}–${Number(comp.maxValue).toLocaleString()}`;
        }
        const url =
          item.applyUrl ??
          item.jobUrl ??
          `https://jobs.ashbyhq.com/${id}/${item.id ?? ""}`;
        jobs.push({
          id: `ab_${md5short(url)}`,
          title,
          company: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          location: loc || (isRemote ? "Remote" : "See posting"),
          work_type: wtype,
          url,
          source: "Ashby",
          salary,
          tags: [dept, team].filter(Boolean),
        });
      }
    })
  );
  return jobs;
}

// ── Remotive ─────────────────────────────────────────────────────────────────
async function searchRemotive(req: SearchRequest): Promise<Job[]> {
  if (req.work_type === "onsite") return [];
  const r = await fetch(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(req.query)}&limit=100`
  );
  if (!r.ok) return [];
  const data = await r.json();
  // Remotive jobs are always remote — they pass region filter automatically
  return (data.jobs ?? []).map((item: Record<string, unknown>) => ({
    id: `rm_${md5short(String(item.url ?? item.id ?? Math.random()))}`,
    title: String(item.title ?? ""),
    company: String(item.company_name ?? ""),
    location: String(item.candidate_required_location ?? "Remote"),
    work_type: "remote" as const,
    url: String(item.url ?? ""),
    source: "Remotive",
    posted_at: String(item.publication_date ?? ""),
    salary: String(item.salary ?? ""),
    tags: Array.isArray(item.tags) ? (item.tags as string[]).slice(0, 5) : [],
  }));
}

// ── RemoteOK ─────────────────────────────────────────────────────────────────
async function searchRemoteOK(req: SearchRequest): Promise<Job[]> {
  if (req.work_type === "onsite") return [];
  try {
    const r = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": "JobSearchApp/1.0" },
    });
    if (!r.ok) return [];
    const data = await r.json();
    const jobs: Job[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object" || !("id" in item)) continue;
      const title = String(item.position ?? "");
      const company = String(item.company ?? "");
      const tags: string[] = Array.isArray(item.tags) ? item.tags.map(String) : [];
      const desc = String(item.description ?? "").slice(0, 300);
      if (!matchesQuery(req.query, title, company, tags.join(" "), desc)) continue;
      const jobId = String(item.id ?? "");
      // RemoteOK jobs are always remote — they pass region filter automatically
      jobs.push({
        id: `rok_${md5short(jobId || title + company)}`,
        title,
        company,
        location: String(item.location ?? "Remote"),
        work_type: "remote",
        url: String(item.url ?? `https://remoteok.com/remote-jobs/${jobId}`),
        source: "RemoteOK",
        posted_at: String(item.date ?? ""),
        tags: tags.slice(0, 8),
        salary: String(item.salary ?? ""),
      });
      if (jobs.length >= 300) break; // cap after matching, not before
    }
    return jobs;
  } catch {
    return [];
  }
}

// ── Arbeitnow ────────────────────────────────────────────────────────────────
async function searchArbeitnow(req: SearchRequest): Promise<Job[]> {
  const region = req.region ?? "global";
  const pages = [1, 2, 3];
  const settled = await Promise.allSettled(
    pages.map((p) =>
      fetch(`https://arbeitnow.com/api/job-board-api?page=${p}`).then((r) =>
        r.ok ? r.json() : { data: [] }
      )
    )
  );
  const jobs: Job[] = [];
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value.data ?? []) {
      const title: string = item.title ?? "";
      const company: string = item.company_name ?? "";
      const tags: string[] = Array.isArray(item.tags) ? item.tags.map(String) : [];
      const desc: string = String(item.description ?? "").slice(0, 400);
      if (!matchesQuery(req.query, title, tags.join(" "), desc)) continue;

      const isRemote: boolean = item.remote === true;
      const loc: string = item.location ?? "";
      const wtype = isRemote ? "remote" : /hybrid/i.test(loc) ? "hybrid" : "onsite";
      if (req.work_type !== "any" && wtype !== req.work_type) continue;
      if (req.location && !loc.toLowerCase().includes(req.location.toLowerCase()) && !isRemote)
        continue;
      if (!passesRegionFilter(loc, wtype, region)) continue;

      const url: string = item.url ?? "";
      jobs.push({
        id: `an_${md5short(url || title + company)}`,
        title,
        company,
        location: loc || (isRemote ? "Remote" : "See posting"),
        work_type: wtype,
        url,
        source: "Arbeitnow",
        posted_at: String(item.created_at ?? ""),
        tags: tags.slice(0, 8),
      });
    }
  }
  return jobs;
}

// ── JustJoin.it ──────────────────────────────────────────────────────────────
// Free, CORS-enabled, 5000–8000 EU/Polish tech jobs, no key needed
async function searchJustJoin(req: SearchRequest): Promise<Job[]> {
  if (req.work_type === "onsite" && req.location === "") return [];
  const region = req.region ?? "global";
  try {
    const r = await fetch("https://justjoin.it/api/offers");
    if (!r.ok) return [];
    const data: unknown[] = await r.json();
    const jobs: Job[] = [];
    for (const raw of data) {
      const item = raw as Record<string, unknown>;
      const title: string = String(item.title ?? "");
      const company: string = String(item.company_name ?? "");
      const city: string = String(item.city ?? "");
      const skills: string[] = Array.isArray(item.skills)
        ? (item.skills as Record<string, string>[]).map((s) => s.name ?? "")
        : [];
      const category: string = String(item.marker_icon ?? "");
      if (!matchesQuery(req.query, title, company, skills.join(" "), category)) continue;

      // Fix: use marker_icon === "remote" for actual remote work,
      // not remote_interview (which is just interview mode)
      const isRemote: boolean = item.marker_icon === "remote" || /remote/i.test(city);
      const wtype = isRemote ? "remote" : "onsite";
      if (req.work_type === "remote" && !isRemote) continue;
      if (req.location && !city.toLowerCase().includes(req.location.toLowerCase()) && !isRemote)
        continue;
      if (!passesRegionFilter(city || "Poland", wtype, region)) continue;

      const slug: string = String(item.id ?? (title + company));

      // Fix: salary is nested in employment_types[0].salary, not top-level
      const empTypes = Array.isArray(item.employment_types)
        ? (item.employment_types as Record<string, unknown>[])
        : [];
      const salaryInfo = (empTypes[0]?.salary ?? null) as Record<string, unknown> | null;
      const salaryFrom = (salaryInfo?.from as number | null) ?? null;
      const salaryTo = (salaryInfo?.to as number | null) ?? null;
      const currency: string = String(salaryInfo?.currency ?? "PLN");
      const salary =
        salaryFrom && salaryTo
          ? `${currency} ${salaryFrom.toLocaleString()}–${salaryTo.toLocaleString()}`
          : "";

      jobs.push({
        id: `jj_${md5short(slug)}`,
        title,
        company,
        location: city || "Poland",
        work_type: wtype,
        url: `https://justjoin.it/offers/${slug}`,
        source: "JustJoin.it",
        salary,
        tags: skills.slice(0, 6),
      });
      if (jobs.length >= 400) break;
    }
    return jobs;
  } catch {
    return [];
  }
}

// ── Aggregated static search ─────────────────────────────────────────────────
export async function staticSearch(req: SearchRequest): Promise<{
  jobs: Job[];
  sources_searched: string[];
  errors: string[];
}> {
  const settled = await Promise.allSettled([
    searchGreenhouse(req).then((j) => ({ name: "Greenhouse", jobs: j })),
    searchLever(req).then((j) => ({ name: "Lever", jobs: j })),
    searchAshby(req).then((j) => ({ name: "Ashby", jobs: j })),
    searchRemotive(req).then((j) => ({ name: "Remotive", jobs: j })),
    searchRemoteOK(req).then((j) => ({ name: "RemoteOK", jobs: j })),
    searchArbeitnow(req).then((j) => ({ name: "Arbeitnow", jobs: j })),
    searchJustJoin(req).then((j) => ({ name: "JustJoin.it", jobs: j })),
  ]);

  const jobs: Job[] = [];
  const sources_searched: string[] = [];
  const errors: string[] = [];

  for (const r of settled) {
    if (r.status === "fulfilled") {
      sources_searched.push(r.value.name);
      jobs.push(...r.value.jobs);
    } else {
      errors.push(String(r.reason));
    }
  }

  // Safety-net region filter — catches anything the per-source filters missed
  const region = req.region ?? "global";
  const regionFiltered = region === "global"
    ? jobs
    : jobs.filter((j) => passesRegionFilter(j.location, j.work_type ?? "onsite", region));

  // Deduplicate by title + company + location (not just title+company,
  // so the same role in different cities is kept as separate listings)
  const seen = new Set<string>();
  const unique = regionFiltered.filter((j) => {
    const k = `${j.title.toLowerCase()}|${j.company.toLowerCase()}|${(j.location ?? "").toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return { jobs: unique, sources_searched, errors };
}
