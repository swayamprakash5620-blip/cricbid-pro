import { NextRequest } from "next/server";
import { ensurePlayerPhoto } from "@/lib/player-photo-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const name = new URL(req.url).searchParams.get("name") || slug.replace(/-/g, " ");

  if (!slug || slug.startsWith("custom-")) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const file = await ensurePlayerPhoto(slug, name);
    if (!file) {
      return new Response("No photo", { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
    }
    return new Response(new Uint8Array(file.data), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.data.length),
        // URL carries a ?v= version, so it is safe to cache aggressively
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
        "Last-Modified": file.updatedAt.toUTCString(),
      },
    });
  } catch (err) {
    console.error("GET /api/player-photo error:", err);
    return new Response("Error", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
