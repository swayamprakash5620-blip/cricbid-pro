import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { roomPlayers, rooms, teams } from "@/db/schema";
import { ensurePlayersSeeded } from "@/db/seed-players";
import {
  buildRoomPoolForFormat,
  generateRoomCode,
  sanitizeRules,
} from "@/lib/auction-engine";
import {
  FRANCHISE_PRESETS,
  RULE_PRESETS,
  type CricketFormat,
} from "@/types/auction";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensurePlayersSeeded();
    const recentRooms = await db
      .select()
      .from(rooms)
      .orderBy(desc(rooms.createdAt))
      .limit(12);

    const enriched = await Promise.all(
      recentRooms.map(async (r) => {
        const roomTeams = await db
          .select({
            id: teams.id,
            name: teams.name,
            shortCode: teams.shortCode,
            color: teams.color,
            isBot: teams.isBot,
          })
          .from(teams)
          .where(eq(teams.roomId, r.id));

        return {
          id: r.id,
          code: r.code,
          name: r.name,
          hostName: r.hostName,
          format: r.format,
          status: r.status,
          rules: r.rules,
          teamCount: roomTeams.length,
          teams: roomTeams,
          createdAt: r.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ rooms: enriched });
  } catch (err) {
    console.error("GET /api/rooms error:", err);
    return NextResponse.json({ error: "Failed to load rooms." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePlayersSeeded();
    const body = await req.json();

    const roomName = String(body.name || "IPL 2026 Mega Auction").trim().slice(0, 80);
    const hostName = String(body.hostName || "Commissioner").trim().slice(0, 40);
    const hostToken = String(body.hostToken || "").trim();

    if (!hostToken) {
      return NextResponse.json(
        { error: "Missing host session token." },
        { status: 400 }
      );
    }

    const rawFormat = String(body.format || "IPL").toUpperCase();
    const format: CricketFormat = ["ALL", "IPL", "T20I", "ODI", "TEST"].includes(rawFormat)
      ? (rawFormat as CricketFormat)
      : "IPL";

    const defaultRules = RULE_PRESETS.ipl_mega.rules;
    const rules = sanitizeRules(body.rules || {}, defaultRules);

    // Generate unique shareable room code
    let code = generateRoomCode(format);
    for (let attempt = 0; attempt < 8; attempt++) {
      const existing = await db
        .select({ id: rooms.id })
        .from(rooms)
        .where(eq(rooms.code, code));
      if (existing.length === 0) break;
      code = generateRoomCode(format);
    }

    const pool = await buildRoomPoolForFormat(format);

    const createdRoom = await db.transaction(async (tx) => {
      const [room] = await tx
        .insert(rooms)
        .values({
          code,
          name: roomName,
          hostName,
          hostToken,
          format,
          status: "waiting",
          rules,
          version: 1,
        })
        .returning();

      if (pool.length > 0) {
        await tx.insert(roomPlayers).values(
          pool.map((item, idx) => ({
            roomId: room.id,
            playerId: item.id > 0 ? item.id : null,
            customPlayerSnapshot: item.snapshot,
            orderIndex: idx + 1,
            status: "pending" as const,
          }))
        );
      }

      const usedShortCodes = new Set<string>();

      // Optionally create the host's own franchise right away
      if (body.createHostTeam !== false) {
        const teamName = String(body.teamName || FRANCHISE_PRESETS[0].name).trim();
        const teamShortCode = String(body.teamShortCode || FRANCHISE_PRESETS[0].shortCode)
          .trim()
          .toUpperCase()
          .slice(0, 5);
        const teamColor = String(body.teamColor || FRANCHISE_PRESETS[0].color);

        usedShortCodes.add(teamShortCode);

        await tx.insert(teams).values({
          roomId: room.id,
          name: teamName,
          shortCode: teamShortCode,
          ownerName: hostName,
          ownerToken: hostToken,
          color: teamColor,
          purseRemainingLakhs: rules.purseLakhs,
          rtmCardsRemaining: rules.rtmCardsPerTeam,
          isBot: false,
        });
      }

      // Optionally populate AI Bot franchises if requested
      const botCount = Math.max(
        0,
        Math.min(
          rules.maxTeams - usedShortCodes.size,
          Math.round(Number(body.initialBotCount || 0))
        )
      );

      if (botCount > 0) {
        const availablePresets = FRANCHISE_PRESETS.filter(
          (p) => !usedShortCodes.has(p.shortCode)
        );
        for (let i = 0; i < botCount && i < availablePresets.length; i++) {
          const preset = availablePresets[i];
          usedShortCodes.add(preset.shortCode);
          await tx.insert(teams).values({
            roomId: room.id,
            name: preset.name,
            shortCode: preset.shortCode,
            ownerName: `AI Director (${preset.shortCode})`,
            ownerToken: `bot-${room.id}-${preset.shortCode}`,
            color: preset.color,
            purseRemainingLakhs: rules.purseLakhs,
            rtmCardsRemaining: rules.rtmCardsPerTeam,
            isBot: true,
          });
        }
      }

      return room;
    });

    return NextResponse.json(
      {
        code: createdRoom.code,
        roomId: createdRoom.id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/rooms error:", err);
    return NextResponse.json(
      { error: "Failed to create auction room." },
      { status: 500 }
    );
  }
}
