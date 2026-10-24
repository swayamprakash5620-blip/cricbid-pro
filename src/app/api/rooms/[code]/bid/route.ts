import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bids, roomPlayers, rooms, teams } from "@/db/schema";
import { getRoomState, notifyRoomUpdated } from "@/lib/auction-engine";
import {
  computeNextValidBidLakhs,
  formatLakhs,
  validateTeamBidEligibility,
  type LastAuctionEvent,
  type RoomPlayerDTO,
} from "@/types/auction";
import { eq, sql } from "drizzle-orm";

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
        { error: "Participant token required to bid." },
        { status: 401 }
      );
    }

    const requestedTeamId = body.teamId ? Number(body.teamId) : null;
    const requestedAmountLakhs = body.amountLakhs ? Math.round(Number(body.amountLakhs)) : null;

    const txResult = await db.transaction(async (tx) => {
      const [room] = await tx
        .select()
        .from(rooms)
        .where(eq(rooms.code, normalizedCode))
        .for("update");

      if (!room) {
        return { status: 404, error: "Auction room not found." };
      }

      if (room.status !== "live" || !room.currentRoomPlayerId) {
        return {
          status: 400,
          error:
            room.status === "paused"
              ? "Auction is currently PAUSED by the commissioner."
              : "No player is currently active on the auction block.",
        };
      }

      const roomTeams = await tx
        .select()
        .from(teams)
        .where(eq(teams.roomId, room.id));

      const isHost = room.hostToken === participantToken;
      let biddingTeam = requestedTeamId
        ? roomTeams.find((t) => t.id === requestedTeamId)
        : roomTeams.find((t) => !t.isBot && t.ownerToken === participantToken);

      if (!biddingTeam) {
        return {
          status: 403,
          error: "Join the room with a franchise first before raising the bid paddle.",
        };
      }

      if (biddingTeam.ownerToken !== participantToken && !isHost) {
        return {
          status: 403,
          error: "You can only place bids for your own franchise.",
        };
      }

      const allRpRows = await tx
        .select()
        .from(roomPlayers)
        .where(eq(roomPlayers.roomId, room.id));

      const activeRp = allRpRows.find((r) => r.id === room.currentRoomPlayerId);
      if (!activeRp || activeRp.status !== "on_block") {
        return {
          status: 400,
          error: "Current player lot has already closed.",
        };
      }

      const player = activeRp.customPlayerSnapshot;
      const minNextLakhs = computeNextValidBidLakhs(
        player.basePriceLakhs,
        room.currentBidLakhs,
        room.currentBidTeamId,
        room.rules
      );

      const proposedBidLakhs =
        requestedAmountLakhs !== null ? requestedAmountLakhs : minNextLakhs;

      const allRpDtos: RoomPlayerDTO[] = allRpRows.map((rp) => ({
        id: rp.id,
        roomId: rp.roomId,
        playerId: rp.playerId,
        player: rp.customPlayerSnapshot,
        orderIndex: rp.orderIndex,
        status: rp.status,
        soldToTeamId: rp.soldToTeamId,
        soldPriceLakhs: rp.soldPriceLakhs,
        soldViaRtm: rp.soldViaRtm,
      }));

      const eligibility = validateTeamBidEligibility({
        team: biddingTeam,
        player,
        proposedBidLakhs,
        currentBidLakhs: room.currentBidLakhs,
        currentBidTeamId: room.currentBidTeamId,
        allRoomPlayers: allRpDtos,
        rules: room.rules,
      });

      if (!eligibility.ok) {
        return { status: 400, error: eligibility.reason };
      }

      const isJumpBid = proposedBidLakhs > minNextLakhs;

      await tx.insert(bids).values({
        roomId: room.id,
        roomPlayerId: activeRp.id,
        teamId: biddingTeam.id,
        amountLakhs: proposedBidLakhs,
        isJumpBid,
      });

      const timerEndsAt = new Date(
        Date.now() + (room.rules.bidTimerSeconds || 20) * 1000
      );

      const event: LastAuctionEvent = {
        id: `bid-${Date.now()}-${biddingTeam.id}`,
        type: "bid",
        message: `${biddingTeam.name} (${biddingTeam.shortCode}) ${
          isJumpBid ? "JUMP BID" : "bid"
        } ${formatLakhs(proposedBidLakhs)} for ${player.name}`,
        teamName: biddingTeam.name,
        teamShortCode: biddingTeam.shortCode,
        teamColor: biddingTeam.color,
        playerName: player.name,
        playerRole: player.role,
        amountLakhs: proposedBidLakhs,
        timestamp: new Date().toISOString(),
      };

      await tx
        .update(rooms)
        .set({
          currentBidLakhs: proposedBidLakhs,
          currentBidTeamId: biddingTeam.id,
          timerEndsAt,
          pausedRemainingMs: null,
          lastEvent: event,
          version: sql`${rooms.version} + 1`,
        })
        .where(eq(rooms.id, room.id));

      return { status: 200 };
    });

    if ("error" in txResult && txResult.error) {
      return NextResponse.json(
        { error: txResult.error },
        { status: txResult.status }
      );
    }

    notifyRoomUpdated(normalizedCode);
    const freshState = await getRoomState(normalizedCode, participantToken);
    return NextResponse.json(freshState);
  } catch (err) {
    console.error("POST /api/rooms/[code]/bid error:", err);
    return NextResponse.json(
      { error: "Failed to process bid." },
      { status: 500 }
    );
  }
}
