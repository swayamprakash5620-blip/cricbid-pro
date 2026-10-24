import { NextRequest, NextResponse } from "next/server";
import {
  resolvePlayerImage,
  resolvePlayerImages,
  setPlayerImageOverride,
  type PlayerRef,
} from "@/lib/player-image-resolver";
import { deleteStoredPhoto, ensurePlayerPhoto, storePhotoFromUrl } from "@/lib/player-photo-store";

export const dynamic = "force-dynamic";

const EMPTY = { thumbUrl: null, largeUrl: null, pageUrl: null };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").trim();
  const name = (searchParams.get("name") || "").trim();
  if (!slug || !name || slug.startsWith("custom-")) return NextResponse.json(EMPTY);
  try {
    return NextResponse.json(await resolvePlayerImage(slug, name));
  } catch (err) {
    console.error("GET /api/player-image error:", err);
    return NextResponse.json({ ...EMPTY, retry: true });
  }
}

/** Batch lookup: body { players: [{ slug, name }] } → { images: { [slug]: {...} } } */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { players?: PlayerRef[] };
    const list = Array.isArray(body.players) ? body.players.slice(0, 120) : [];
    const images = await resolvePlayerImages(
      list.map((p) => ({ slug: String(p.slug || ""), name: String(p.name || "") }))
    );
    return NextResponse.json({ images });
  } catch (err) {
    console.error("POST /api/player-image error:", err);
    return NextResponse.json({ images: {} });
  }
}

/** Manual photo override: body { slug, name, url } (url empty → reset to automatic photo) */
export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as { slug?: string; name?: string; url?: string };
    const slug = String(body.slug || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const url = String(body.url || "").trim();
    if (!slug || !name) return NextResponse.json({ error: "slug and name are required" }, { status: 400 });

    if (url) {
      if (!/^https?:\/\/\S+$/i.test(url)) {
        return NextResponse.json({ error: "Photo URL must start with http:// or https://" }, { status: 400 });
      }
      const file = await storePhotoFromUrl(slug, url);
      if (!file) {
        return NextResponse.json(
          { error: "Could not download an image from that URL. Use a direct link to a .jpg / .png / .webp file." },
          { status: 400 }
        );
      }
      await setPlayerImageOverride(slug, name, url);
      return NextResponse.json({ ok: true, hasPhoto: true, version: file.updatedAt.getTime() });
    }

    // Reset → forget override + cached bytes, then re-resolve automatically
    const { db } = await import("@/db");
    const { playerImages } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(playerImages).where(eq(playerImages.slug, slug));
    await deleteStoredPhoto(slug);
    const file = await ensurePlayerPhoto(slug, name);
    return NextResponse.json({ ok: true, hasPhoto: Boolean(file), version: Date.now() });
  } catch (err) {
    console.error("PUT /api/player-image error:", err);
    return NextResponse.json({ error: "Failed to save photo" }, { status: 500 });
  }
}
