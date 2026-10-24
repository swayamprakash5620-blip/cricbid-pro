import { db } from "@/db";
import { playerPhotoFiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolvePlayerImage } from "@/lib/player-image-resolver";

const USER_AGENT = "CricbidPro/1.0 (cricket auction app; player photo cache; contact: admin@cricbid.app)";
const MAX_BYTES = 4 * 1024 * 1024;
const MIN_GAP_MS = 350;

type StoreState = {
  queue: Promise<unknown>;
  lastCall: number;
  inflight: Map<string, Promise<PhotoFile | null>>;
  /** slugs confirmed to have no photo (short-lived negative cache) */
  missingUntil: Map<string, number>;
  /** slugs already confirmed present (avoid DB checks when warming) */
  present: Set<string>;
};
const g = globalThis as typeof globalThis & { __cricbidPhotoStore?: StoreState };
const state: StoreState =
  g.__cricbidPhotoStore ??
  { queue: Promise.resolve(), lastCall: 0, inflight: new Map(), missingUntil: new Map(), present: new Set() };
g.__cricbidPhotoStore = state;

export interface PhotoFile {
  contentType: string;
  data: Buffer;
  updatedAt: Date;
}

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

async function download(url: string): Promise<{ contentType: string; data: Buffer } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await enqueue(() =>
      fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "image/avif,image/webp,image/jpeg,image/png,image/*" },
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      })
    ).catch(() => null);
    if (!res) continue;
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!contentType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) return null;
    return { contentType, data: buf };
  }
  return null;
}

export async function getStoredPhoto(slug: string): Promise<PhotoFile | null> {
  const [row] = await db
    .select({
      contentType: playerPhotoFiles.contentType,
      data: playerPhotoFiles.data,
      updatedAt: playerPhotoFiles.updatedAt,
    })
    .from(playerPhotoFiles)
    .where(eq(playerPhotoFiles.slug, slug));
  return row ?? null;
}

export async function storePhotoFromUrl(slug: string, url: string): Promise<PhotoFile | null> {
  const file = await download(url);
  if (!file) return null;
  const now = new Date();
  await db
    .insert(playerPhotoFiles)
    .values({ slug, sourceUrl: url, contentType: file.contentType, data: file.data, bytes: file.data.length, updatedAt: now })
    .onConflictDoUpdate({
      target: playerPhotoFiles.slug,
      set: { sourceUrl: url, contentType: file.contentType, data: file.data, bytes: file.data.length, updatedAt: now },
    });
  state.present.add(slug);
  state.missingUntil.delete(slug);
  return { ...file, updatedAt: now };
}

export async function deleteStoredPhoto(slug: string) {
  await db.delete(playerPhotoFiles).where(eq(playerPhotoFiles.slug, slug));
  state.present.delete(slug);
  state.missingUntil.delete(slug);
}

/** Returns the locally stored photo, downloading it once from the resolved source if needed. */
export async function ensurePlayerPhoto(slug: string, name: string): Promise<PhotoFile | null> {
  const key = slug.toLowerCase();
  const stored = await getStoredPhoto(key);
  if (stored) {
    state.present.add(key);
    return stored;
  }
  if ((state.missingUntil.get(key) ?? 0) > Date.now()) return null;
  const existing = state.inflight.get(key);
  if (existing) return existing;

  const job = (async () => {
    const resolved = await resolvePlayerImage(key, name);
    const url = resolved.largeUrl || resolved.thumbUrl;
    if (!url) {
      state.missingUntil.set(key, Date.now() + (resolved.retry ? 60_000 : 30 * 60_000));
      return null;
    }
    const file = await storePhotoFromUrl(key, url);
    if (!file) state.missingUntil.set(key, Date.now() + 5 * 60_000);
    return file;
  })().finally(() => state.inflight.delete(key));

  state.inflight.set(key, job);
  return job;
}

/** Fire-and-forget: make sure upcoming players' photos are cached before they come on the block. */
export function warmPlayerPhotos(players: Array<{ slug: string; name: string }>) {
  for (const p of players) {
    const key = p.slug.toLowerCase();
    if (key.startsWith("custom-") || state.present.has(key) || state.inflight.has(key)) continue;
    if ((state.missingUntil.get(key) ?? 0) > Date.now()) continue;
    void ensurePlayerPhoto(key, p.name).catch(() => null);
  }
}
