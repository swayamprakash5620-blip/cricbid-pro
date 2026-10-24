import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, teams } from "@/db/schema";
import { getRoomState, notifyRoomUpdated } from "@/lib/auction-engine";
import { FRANCHISE_PRESETS } from "@/types/auction";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const normalizedCode = code.toUpperCase();
    const body = await req.json();

    const participantToken =
      req.headers.get("x-participant-token") || String(body.participantToken || "").trim();

    if (!participantToken) {
      return NextResponse.json(
        { error: "Participant session token is required." },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [room] = await tx
        .select()
        .from(rooms)
        .where(eq(rooms.code, normalizedCode))
        .for("update");

      if (!room) {
        return { status: 404, error: "Auction room not found." };
      }

      const existingTeams = await tx
        .select()
        .from(teams)
        .where(eq(teams.roomId, room.id));

      // Handle removing an AI Bot team (Host only)
      if (body.removeTeamId) {
        if (room.hostToken !== participantToken) {
          return { status: 403, error: "Only the host can remove teams." };
        }
        const target = existingTeams.find((t) => t.id === Number(body.removeTeamId));
        if (!target) {
          return { status: 404, error: "Team not found." };
        }
        if (room.currentBidTeamId === target.id) {
          return {
            status: 400,
            error: "Cannot remove a team currently holding the highest bid.",
          };
        }
        await tx
          .delete(teams)
          .where(and(eq(teams.id, target.id), eq(teams.roomId, room.id)));

        await tx
          .update(rooms)
          .set({ version: sql`${rooms.version} + 1` })
          .where(eq(rooms.id, room.id));

        return { status: 200 };
      }

      // Handle adding an AI Bot Franchise (Host only)
      if (body.addBot) {
        if (room.hostToken !== participantToken) {
          return { status: 403, error: "Only the host can add AI bot franchises." };
        }
        if (existingTeams.length >= room.rules.maxTeams) {
          return {
            status: 400,
            error: `Room has reached its max limit of ${room.rules.maxTeams} franchises.`,
          };
        }

        const usedCodes = new Set(existingTeams.map((t) => t.shortCode.toUpperCase()));
        const preset =
          FRANCHISE_PRESETS.find((p) => !usedCodes.has(p.shortCode)) || {
            name: `Bot XI ${existingTeams.length + 1}`,
            shortCode: `B${existingTeams.length + 1}`,
            color: "#10B981",
          };

        await tx.insert(teams).values({
          roomId: room.id,
          name: preset.name,
          shortCode: preset.shortCode,
          ownerName: `AI Director (${preset.shortCode})`,
          ownerToken: `bot-${room.id}-${Date.now()}`,
          color: preset.color,
          purseRemainingLakhs: room.rules.purseLakhs,
          rtmCardsRemaining: room.rules.rtmCardsPerTeam,
          isBot: true,
        });

        await tx
          .update(rooms)
          .set({ version: sql`${rooms.version} + 1` })
          .where(eq(rooms.id, room.id));

        return { status: 201 };
      }

      // Check if user already owns a team in this room
      const alreadyOwned = existingTeams.find(
        (t) => !t.isBot && t.ownerToken === participantToken
      );
      if (alreadyOwned) {
        return { status: 200, teamId: alreadyOwned.id };
      }

      if (room.status === "completed") {
        return {
          status: 400,
          error: "This auction has already concluded. You can view as Spectator.",
        };
      }

      if (existingTeams.length >= room.rules.maxTeams) {
        return {
          status: 400,
          error: `All ${room.rules.maxTeams} franchise slots are filled. You can still watch live as Spectator!`,
        };
      }

      const name = String(body.name || "").trim().slice(0, 50);
      const shortCode = String(body.shortCode || "")
        .trim()
        .toUpperCase()
        .slice(0, 5);
      const ownerName = String(body.ownerName || "Franchise Owner").trim().slice(0, 40);
      const color = String(body.color || "#F59E0B").trim();

      if (!name || !shortCode) {
        return {
          status: 400,
          error: "Please enter both a Franchise Name and Short Code.",
        };
      }

      const duplicate = existingTeams.some(
        (t) =>
          t.name.toLowerCase() === name.toLowerCase() ||
          t.shortCode.toUpperCase() === shortCode
      );
      if (duplicate) {
        return {
          status: 400,
          error: `A franchise with name "${name}" or code "${shortCode}" has already been claimed in this room.`,
        };
      }

      const [created] = await tx
        .insert(teams)
        .values({
          roomId: room.id,
          name,
          shortCode,
          ownerName,
          ownerToken: participantToken,
          color,
          purseRemainingLakhs: room.rules.purseLakhs,
          rtmCardsRemaining: room.rules.rtmCardsPerTeam,
          isBot: false,
        })
        .returning();

      await tx
        .update(rooms)
        .set({ version: sql`${rooms.version} + 1` })
        .where(eq(rooms.id, room.id));

      return { status: 201, teamId: created.id };
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    notifyRoomUpdated(normalizedCode);
    const state = await getRoomState(normalizedCode, participantToken);
    return NextResponse.json(state, { status: result.status });
  } catch (err) {
    console.error("POST /api/rooms/[code]/join error:", err);
    return NextResponse.json(
      { error: "Failed to join auction room." },
      { status: 500 }
    );
  }
}
