import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { ensurePlayersSeeded } from "@/db/seed-players";
import { desc } from "drizzle-orm";
import type {
  CricketFormat,
  PlayerRole,
  PlayerSetCategory,
} from "@/types/auction";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensurePlayersSeeded();

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "ALL").toUpperCase() as CricketFormat;
    const role = searchParams.get("role") || "ALL";
    const country = searchParams.get("country") || "ALL";
    const setCategory = searchParams.get("set") || "ALL";
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const allRows = await db
      .select()
      .from(players)
      .orderBy(desc(players.rating), desc(players.basePriceLakhs));

    const countries = Array.from(new Set(allRows.map((p) => p.country))).sort();

    const formatCounts = {
      ALL: allRows.length,
      IPL: allRows.filter((p) => p.formats.includes("IPL")).length,
      T20I: allRows.filter((p) => p.formats.includes("T20I")).length,
      ODI: allRows.filter((p) => p.formats.includes("ODI")).length,
      TEST: allRows.filter((p) => p.formats.includes("TEST")).length,
    };

    const filtered = allRows.filter((p) => {
      if (format !== "ALL" && !p.formats.includes(format)) return false;
      if (role !== "ALL" && p.role !== role) return false;
      if (country !== "ALL" && p.country.toLowerCase() !== country.toLowerCase()) return false;
      if (setCategory !== "ALL" && p.setCategory !== setCategory) return false;
      if (q) {
        const hay = `${p.name} ${p.country} ${p.role} ${p.franchiseTag} ${p.battingStyle} ${p.bowlingStyle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return NextResponse.json({
      players: filtered,
      countries,
      formatCounts,
    });
  } catch (err) {
    console.error("GET /api/players error:", err);
    return NextResponse.json(
      { error: "Failed to load cricket player database." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePlayersSeeded();
    const body = await req.json();

    const name = String(body.name || "").trim();
    const country = String(body.country || "India").trim();
    const role = (body.role || "Batsman") as PlayerRole;
    const setCategory = (body.setCategory || "Batsmen") as PlayerSetCategory;
    const basePriceLakhs = Math.max(20, Math.min(500, Number(body.basePriceLakhs || 50)));
    const rating = Math.max(60, Math.min(99, Number(body.rating || 82)));
    const isCapped = body.isCapped !== undefined ? Boolean(body.isCapped) : true;
    const isMarquee = Boolean(body.isMarquee);
    const battingStyle = String(body.battingStyle || "Right-hand bat").trim();
    const bowlingStyle = String(body.bowlingStyle || "Right-arm medium").trim();
    const franchiseTag = String(body.franchiseTag || "CUSTOM").trim().toUpperCase().slice(0, 6);

    const rawFormats: string[] = Array.isArray(body.formats)
      ? body.formats
      : ["IPL", "T20I", "ODI"];
    const validFormats = rawFormats.filter((f): f is Exclude<CricketFormat, "ALL"> =>
      ["IPL", "T20I", "ODI", "TEST"].includes(f)
    );
    const formats: Exclude<CricketFormat, "ALL">[] =
      validFormats.length > 0 ? validFormats : ["IPL", "T20I"];

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Player name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const slug = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-4)}`;

    const matches = Number(body.matches || 25);
    const runs = Number(body.runs || 650);
    const strikeRate = Number(body.strikeRate || 142.5);
    const wickets = Number(body.wickets || 12);
    const economy = Number(body.economy || 7.9);
    const average = Number(body.average || 32.5);

    const statLine = {
      matches,
      runs,
      average,
      strikeRate,
      wickets,
      economy,
      best: role === "Bowler" ? "4/22" : "88*",
    };

    const stats = {
      ...(formats.includes("IPL") ? { ipl: statLine } : {}),
      ...(formats.includes("T20I") ? { t20i: statLine } : {}),
      ...(formats.includes("ODI") ? { odi: statLine } : {}),
      ...(formats.includes("TEST") ? { test: statLine } : {}),
    };

    const [inserted] = await db
      .insert(players)
      .values({
        slug,
        name,
        country,
        isOverseasDefault: country.toLowerCase() !== "india",
        role,
        battingStyle,
        bowlingStyle,
        setCategory: isMarquee ? "Marquee" : !isCapped ? "Uncapped" : setCategory,
        isCapped,
        isMarquee,
        basePriceLakhs,
        franchiseTag,
        formats,
        stats,
        rating,
      })
      .returning();

    return NextResponse.json({ player: inserted }, { status: 201 });
  } catch (err) {
    console.error("POST /api/players error:", err);
    return NextResponse.json(
      { error: "Failed to create custom player." },
      { status: 500 }
    );
  }
}
