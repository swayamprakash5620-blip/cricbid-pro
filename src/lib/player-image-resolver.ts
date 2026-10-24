import { db } from "@/db";
import { playerImages } from "@/db/schema";
import { inArray } from "drizzle-orm";

export interface ResolvedPlayerImage {
  thumbUrl: string | null;
  largeUrl: string | null;
  pageUrl: string | null;
  /** true when the lookup could not be completed (e.g. rate limited) — client may retry later */
  retry?: boolean;
}

export interface PlayerRef {
  slug: string;
  name: string;
}

const USER_AGENT =
  "CricbidPro/1.0 (https://github.com/cricbid-pro; cricket auction app player photos) node-fetch";
const RETRY_MISSING_AFTER_MS = 1000 * 60 * 60 * 24 * 7;
const PLAYERS_PER_REQUEST = 25; // 2 candidate titles each → 50 titles (API max)
const MIN_GAP_MS = 400;

/** Manual Wikipedia title overrides for ambiguous names. */
const TITLE_OVERRIDES: Record<string, string> = {
  "ali-khan": "Ali Khan (cricketer, born 1990)",
  "mohammad-haris": "Mohammad Haris (cricketer)",
  "usman-khan": "Usman Khan (cricketer, born 1995)",
  "aaron-jones": "Aaron Jones (cricketer)",
  "akash-singh": "Akash Singh (cricketer, born 2002)",
  "prince-yadav": "Prince Yadav (cricketer)",
  "mark-wood": "Mark Wood (cricketer)",
  "tom-curran": "Tom Curran (cricketer)",
  "chris-jordan": "Chris Jordan (cricketer)",
  "luke-wood": "Luke Wood (cricketer)",
  "sam-curran": "Sam Curran",
};

type GlobalImgState = {
  queue: Promise<unknown>;
  lastCall: number;
  blockedUntil: number;
};
const g = globalThis as typeof globalThis & { __cricbidImg?: GlobalImgState };
const state: GlobalImgState = g.__cricbidImg ?? { queue: Promise.resolve(), lastCall: 0, blockedUntil: 0 };
g.__cricbidImg = state;

class RateLimitedError extends Error {}

/** Serialize all Wikipedia calls and keep a polite gap between them. */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = state.queue.then(async () => {
    const wait = Math.max(0, state.lastCall + MIN_GAP_MS - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } finally {
      state.lastCall = Date.now();
    }
  });
  state.queue = run.catch(() => undefined);
  return run;
}

interface WikiQueryResponse {
  query?: {
    normalized?: Array<{ from: string; to: string }>;
    redirects?: Array<{ from: string; to: string }>;
    pages?: Record<
      string,
      {
        title: string;
        missing?: string;
        description?: string;
        pageprops?: { disambiguation?: string };
        thumbnail?: { source: string; width: number; height: number };
        fullurl?: string;
      }
    >;
  };
}

async function queryTitles(titles: string[]) {
  if (Date.now() < state.blockedUntil) throw new RateLimitedError("cooldown");
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "1",
    redirects: "1",
    prop: "pageimages|description|pageprops|info",
    inprop: "url",
    ppprop: "disambiguation",
    piprop: "thumbnail",
    pithumbsize: "600",
    pilicense: "any",
    titles: titles.join("|"),
  });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (res.status === 429 || res.status >= 500) {
    state.blockedUntil = Date.now() + 60_000;
    throw new RateLimitedError(`HTTP ${res.status}`);
  }
  if (!res.ok) throw new RateLimitedError(`HTTP ${res.status}`);
  const json = (await res.json()) as WikiQueryResponse;
  const resolveTitle = (t: string) => {
    let cur = t;
    for (const n of json.query?.normalized ?? []) if (n.from === cur) cur = n.to;
    for (const r of json.query?.redirects ?? []) if (r.from === cur) cur = r.to;
    return cur;
  };
  const byTitle = new Map<string, NonNullable<NonNullable<WikiQueryResponse["query"]>["pages"]>[string]>();
  for (const page of Object.values(json.query?.pages ?? {})) byTitle.set(page.title, page);
  return { resolveTitle, byTitle };
}

async function lookupBatch(refs: PlayerRef[]): Promise<Map<string, ResolvedPlayerImage>> {
  const candidates = new Map<string, string[]>();
  const allTitles = new Set<string>();
  for (const r of refs) {
    const list = [TITLE_OVERRIDES[r.slug], `${r.name} (cricketer)`, r.name].filter(
      (x): x is string => Boolean(x)
    );
    candidates.set(r.slug, list);
    list.forEach((t) => allTitles.add(t));
  }

  const { resolveTitle, byTitle } = await enqueue(() => queryTitles(Array.from(allTitles)));

  const out = new Map<string, ResolvedPlayerImage>();
  for (const r of refs) {
    let result: ResolvedPlayerImage = { thumbUrl: null, largeUrl: null, pageUrl: null };
    for (const t of candidates.get(r.slug) ?? []) {
      const page = byTitle.get(resolveTitle(t));
      if (!page || page.missing !== undefined || page.pageprops?.disambiguation !== undefined) continue;
      if (!(page.description ?? "").toLowerCase().includes("cricket")) continue;
      if (!page.thumbnail?.source) {
        // Correct cricketer page but no photo — stop searching other candidates
        result = { thumbUrl: null, largeUrl: null, pageUrl: page.fullurl ?? null };
        break;
      }
      // Wikimedia only serves standard thumbnail buckets (250 / 330 / 500 / 960px)
      const src = page.thumbnail.source;
      result = {
        thumbUrl: src.replace(/\/\d+px-/, "/250px-"),
        largeUrl: src.replace(/\/\d+px-/, "/500px-"),
        pageUrl: page.fullurl ?? null,
      };
      break;
    }
    out.set(r.slug, result);
  }
  return out;
}


const BAD_FILE_WORDS = /(signature|logo|map|wedding|flag|crest|badge|kit|stadium|ground|team|squad|&| and |\bvs\b|cartoon|poster)/i;

/** Strict Wikimedia Commons fallback: file title must contain the player's full name. */
async function commonsSearch(name: string): Promise<ResolvedPlayerImage | null> {
  if (Date.now() < state.blockedUntil) throw new RateLimitedError("cooldown");
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "8",
    gsrsearch: `filetype:bitmap intitle:"${name}"`,
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "600",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (res.status === 429 || res.status >= 500) {
    state.blockedUntil = Date.now() + 60_000;
    throw new RateLimitedError(`HTTP ${res.status}`);
  }
  if (!res.ok) return null;
  const json = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          index: number;
          title: string;
          imageinfo?: Array<{ thumburl?: string; url: string; mime: string; descriptionurl?: string }>;
        }
      >;
    };
  };
  const tokens = name.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  const pages = Object.values(json.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  for (const p of pages) {
    const title = p.title.replace(/^File:/, "");
    const lower = title.toLowerCase();
    if (!tokens.every((t) => lower.includes(t))) continue;
    if (BAD_FILE_WORDS.test(title)) continue;
    const info = p.imageinfo?.[0];
    if (!info || !/image\/(jpeg|png|webp)/.test(info.mime)) continue;
    const src = info.thumburl || info.url;
    return {
      thumbUrl: src.replace(/\/\d+px-/, "/250px-"),
      largeUrl: src.replace(/\/\d+px-/, "/500px-"),
      pageUrl: info.descriptionurl ?? null,
    };
  }
  return null;
}

const inflight = new Map<string, Promise<ResolvedPlayerImage>>();

export async function resolvePlayerImages(refs: PlayerRef[]): Promise<Record<string, ResolvedPlayerImage>> {
  const clean = Array.from(
    new Map(
      refs
        .filter((r) => r.slug && r.name && !r.slug.startsWith("custom-"))
        .map((r) => [r.slug.toLowerCase(), { slug: r.slug.toLowerCase(), name: r.name }])
    ).values()
  );
  const result: Record<string, ResolvedPlayerImage> = {};
  if (clean.length === 0) return result;

  const cachedRows = await db
    .select()
    .from(playerImages)
    .where(inArray(playerImages.slug, clean.map((r) => r.slug)));
  const cached = new Map(cachedRows.map((r) => [r.slug, r]));

  const toFetch: PlayerRef[] = [];
  for (const r of clean) {
    const row = cached.get(r.slug);
    const stale =
      row && !row.thumbUrl && Date.now() - new Date(row.checkedAt).getTime() > RETRY_MISSING_AFTER_MS;
    if (row && !stale) {
      result[r.slug] = { thumbUrl: row.thumbUrl, largeUrl: row.largeUrl, pageUrl: row.pageUrl };
    } else if (inflight.has(r.slug)) {
      result[r.slug] = await inflight.get(r.slug)!;
    } else {
      toFetch.push(r);
    }
  }

  for (let i = 0; i < toFetch.length; i += PLAYERS_PER_REQUEST) {
    const chunk = toFetch.slice(i, i + PLAYERS_PER_REQUEST);
    const job = lookupBatch(chunk);
    chunk.forEach((r) =>
      inflight.set(
        r.slug,
        job.then((m) => m.get(r.slug)!).catch(() => ({ thumbUrl: null, largeUrl: null, pageUrl: null, retry: true }))
      )
    );
    try {
      const found = await job;
      for (const r of chunk) {
        let v = found.get(r.slug)!;
        // Cricketer page exists but has no lead image → try a strict Commons file search
        if (!v.thumbUrl && v.pageUrl) {
          const fb = await enqueue(() => commonsSearch(r.name)).catch(() => null);
          if (fb) v = { ...fb, pageUrl: v.pageUrl };
        }
        result[r.slug] = v;
        await db
          .insert(playerImages)
          .values({ slug: r.slug, name: r.name, ...v, checkedAt: new Date() })
          .onConflictDoUpdate({ target: playerImages.slug, set: { name: r.name, ...v, checkedAt: new Date() } });
      }
    } catch {
      // Rate limited / network error → do NOT cache; ask client to retry later
      for (const r of chunk) result[r.slug] = { thumbUrl: null, largeUrl: null, pageUrl: null, retry: true };
    } finally {
      chunk.forEach((r) => inflight.delete(r.slug));
    }
  }

  return result;
}

export async function resolvePlayerImage(slug: string, name: string): Promise<ResolvedPlayerImage> {
  const map = await resolvePlayerImages([{ slug, name }]);
  return map[slug.toLowerCase()] ?? { thumbUrl: null, largeUrl: null, pageUrl: null };
}


/** Manually set (or clear) a player's photo URL — used for players without a free photo. */
export async function setPlayerImageOverride(slug: string, name: string, url: string | null) {
  const key = slug.toLowerCase();
  const v = { thumbUrl: url, largeUrl: url, pageUrl: null as string | null };
  await db
    .insert(playerImages)
    .values({ slug: key, name, ...v, checkedAt: new Date("2999-01-01") })
    .onConflictDoUpdate({ target: playerImages.slug, set: { name, ...v, checkedAt: new Date("2999-01-01") } });
  return v;
}
