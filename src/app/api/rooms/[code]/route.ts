import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, teams } from "@/db/schema";
import {
  getRoomState,
  notifyRoomUpdated,
  sanitizeRules,
} from "@/lib/auction-engine";
import { formatLakhs, type LastAuctionEvent } from "@/types/auction";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const token =
      req.headers.get("x-participant-token") ||
      new URL(req.url).searchParams.get("token");

    const state = await getRoomState(code, token);
    if (!state) {
      return NextResponse.json(
        { error: `Room "${code.toUpperCase()}" was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(state);
  } catch (err) {
    console.error("GET /api/rooms/[code] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch auction room state." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const normalizedCode = code.toUpperCase();
    const body = await req.json();
    const participantToken =
      req.headers.get("x-participant-token") || String(body.participantToken || "");

    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.code, normalizedCode));

    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    if (room.hostToken !== participantToken) {
      return NextResponse.json(
        { error: "Only the room commissioner (host) can modify custom rules." },
        { status: 403 }
      );
    }

    const updatedRules = sanitizeRules(body.rules || {}, room.rules);
    const updatedName = body.name ? String(body.name).trim().slice(0, 80) : room.name;

    const purseDelta = updatedRules.purseLakhs - room.rules.purseLakhs;
    const rtmDelta = updatedRules.rtmCardsPerTeam - room.rules.rtmCardsPerTeam;

    await db.transaction(async (tx) => {
      if (purseDelta !== 0 || rtmDelta !== 0) {
        const roomTeams = await tx
          .select()
          .from(teams)
          .where(eq(teams.roomId, room.id));

        for (const t of roomTeams) {
          await tx
            .update(teams)
            .set({
              purseRemainingLakhs: Math.max(0, t.purseRemainingLakhs + purseDelta),
              rtmCardsRemaining: Math.max(0, t.rtmCardsRemaining + rtmDelta),
            })
            .where(eq(teams.id, t.id));
        }
      }

      const event: LastAuctionEvent = {
        id: `rules-${Date.now()}`,
        type: "rule_updated",
        message: `Rules updated: Purse ${formatLakhs(
          updatedRules.purseLakhs
        )} • Squad ${updatedRules.minSquadSize}–${updatedRules.maxSquadSize} • Max ${
          updatedRules.maxOverseas
        } Overseas`,
        timestamp: new Date().toISOString(),
      };

      await tx
        .update(rooms)
        .set({
          name: updatedName,
          rules: updatedRules,
          lastEvent: event,
          version: sql`${rooms.version} + 1`,
        })
        .where(eq(rooms.id, room.id));
    });

    notifyRoomUpdated(normalizedCode);
    const freshState = await getRoomState(normalizedCode, participantToken);
    return NextResponse.json(freshState);
  } catch (err) {
    console.error("PATCH /api/rooms/[code] error:", err);
    return NextResponse.json(
      { error: "Failed to update auction rules." },
      { status: 500 }
    );
  }
}
