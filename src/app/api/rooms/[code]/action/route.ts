import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { roomPlayers, rooms, teams } from "@/db/schema";
import {
  buildRoomPoolForFormat,
  getRoomState,
  notifyRoomUpdated,
} from "@/lib/auction-engine";
import { ensurePlayersSeeded } from "@/db/seed-players";
import {
  computeTeamSquadSummary,
  formatLakhs,
  isPlayerOverseasForRoom,
  type CricketFormat,
  type LastAuctionEvent,
  type PlayerRole,
  type PlayerSetCategory,
  type PlayerSnapshot,
  type RoomPlayerDTO,
} from "@/types/auction";
import { and, asc, desc, eq, sql } from "drizzle-orm";

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
    const action = String(body.action || "");

    const txResult = await db.transaction(async (tx) => {
      const [room] = await tx
        .select()
        .from(rooms)
        .where(eq(rooms.code, normalizedCode))
        .for("update");

      if (!room) {
        return { status: 404, error: "Auction room not found." };
      }

      const isHost = Boolean(participantToken && room.hostToken === participantToken);

      // RTM can be exercised by any franchise owner (or host on behalf of a team)
      if (action === "use_rtm") {
        if (room.currentRoomPlayerId !== null) {
          return {
            status: 400,
            error: "RTM can only be exercised right after a player is hammered SOLD before the next lot begins.",
          };
        }

        const roomTeams = await tx
          .select()
          .from(teams)
          .where(eq(teams.roomId, room.id));

        const rtmTeam = body.teamId
          ? roomTeams.find((t) => t.id === Number(body.teamId))
          : roomTeams.find((t) => !t.isBot && t.ownerToken === participantToken);

        if (!rtmTeam) {
          return { status: 403, error: "Franchise not found for RTM." };
        }
        if (rtmTeam.ownerToken !== participantToken && !isHost) {
          return { status: 403, error: "Not authorized to use this franchise's RTM card." };
        }
        if (rtmTeam.rtmCardsRemaining <= 0) {
          return { status: 400, error: "No RTM cards remaining for your franchise." };
        }

        // Find most recently sold player in this room
        const soldRows = await tx
          .select()
          .from(roomPlayers)
          .where(and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.status, "sold")))
          .orderBy(desc(roomPlayers.updatedAt))
          .limit(1);

        const lastSoldRp = soldRows[0];
        if (!lastSoldRp || !lastSoldRp.soldPriceLakhs || !lastSoldRp.soldToTeamId) {
          return { status: 400, error: "No recently sold player eligible for RTM." };
        }
        if (lastSoldRp.soldViaRtm) {
          return { status: 400, error: "RTM has already been exercised on this player." };
        }
        if (lastSoldRp.soldToTeamId === rtmTeam.id) {
          return { status: 400, error: "Your franchise already bought this player!" };
        }

        const allRpRows = await tx
          .select()
          .from(roomPlayers)
          .where(eq(roomPlayers.roomId, room.id));
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

        const summary = computeTeamSquadSummary(rtmTeam, allRpDtos, room.rules);
        const snap = lastSoldRp.customPlayerSnapshot;

        if (summary.totalPlayers >= room.rules.maxSquadSize) {
          return { status: 400, error: "Cannot use RTM: Max squad size reached." };
        }
        if (
          isPlayerOverseasForRoom(snap, room.rules) &&
          summary.overseasCount >= room.rules.maxOverseas
        ) {
          return { status: 400, error: "Cannot use RTM: Overseas player limit reached." };
        }
        if (lastSoldRp.soldPriceLakhs > rtmTeam.purseRemainingLakhs) {
          return { status: 400, error: "Cannot use RTM: Insufficient purse to match sold price." };
        }

        const prevTeam = roomTeams.find((t) => t.id === lastSoldRp.soldToTeamId);
        if (prevTeam) {
          await tx
            .update(teams)
            .set({
              purseRemainingLakhs: prevTeam.purseRemainingLakhs + lastSoldRp.soldPriceLakhs,
            })
            .where(eq(teams.id, prevTeam.id));
        }

        await tx
          .update(teams)
          .set({
            purseRemainingLakhs: rtmTeam.purseRemainingLakhs - lastSoldRp.soldPriceLakhs,
            rtmCardsRemaining: rtmTeam.rtmCardsRemaining - 1,
          })
          .where(eq(teams.id, rtmTeam.id));

        await tx
          .update(roomPlayers)
          .set({
            soldToTeamId: rtmTeam.id,
            soldViaRtm: true,
            updatedAt: new Date(),
          })
          .where(eq(roomPlayers.id, lastSoldRp.id));

        const rtmEvent: LastAuctionEvent = {
          id: `rtm-${Date.now()}`,
          type: "rtm",
          message: `RTM CARD PLAYED! ${rtmTeam.name} matches ${formatLakhs(
            lastSoldRp.soldPriceLakhs
          )} to sign ${snap.name}!`,
          teamName: rtmTeam.name,
          teamShortCode: rtmTeam.shortCode,
          teamColor: rtmTeam.color,
          playerName: snap.name,
          playerRole: snap.role,
          amountLakhs: lastSoldRp.soldPriceLakhs,
          timestamp: new Date().toISOString(),
        };

        await tx
          .update(rooms)
          .set({
            lastEvent: rtmEvent,
            version: sql`${rooms.version} + 1`,
          })
          .where(eq(rooms.id, room.id));

        return { status: 200 };
      }

      // All remaining actions require Host authorization
      if (!isHost) {
        return {
          status: 403,
          error: "Only the room commissioner (host) can control the auction gavel.",
        };
      }

      if (action === "start_or_next") {
        const roomTeams = await tx
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.roomId, room.id));

        if (roomTeams.length < 2) {
          return {
            status: 400,
            error:
              "At least 2 franchises must join the room before starting the auction (share your room link or add an AI Bot franchise!).",
          };
        }

        // Lots can never be closed manually — they close automatically when the clock hits 0
        if (room.currentRoomPlayerId) {
          return {
            status: 400,
            error:
              "A player is still on the block. The lot closes automatically (SOLD / UNSOLD) when the bid clock reaches 0.",
          };
        }

        let nextRp: typeof roomPlayers.$inferSelect | undefined;
        if (body.roomPlayerId) {
          const [nominated] = await tx
            .select()
            .from(roomPlayers)
            .where(
              and(
                eq(roomPlayers.id, Number(body.roomPlayerId)),
                eq(roomPlayers.roomId, room.id)
              )
            );
          if (nominated && (nominated.status === "pending" || nominated.status === "unsold")) {
            nextRp = nominated;
          }
        }

        if (!nextRp) {
          const pendingList = await tx
            .select()
            .from(roomPlayers)
            .where(
              and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.status, "pending"))
            )
            .orderBy(asc(roomPlayers.orderIndex), asc(roomPlayers.id))
            .limit(1);
          nextRp = pendingList[0];
        }

        if (!nextRp) {
          await tx
            .update(rooms)
            .set({
              status: "completed",
              currentRoomPlayerId: null,
              currentBidLakhs: null,
              currentBidTeamId: null,
              timerEndsAt: null,
              pausedRemainingMs: null,
              version: sql`${rooms.version} + 1`,
            })
            .where(eq(rooms.id, room.id));

          return { status: 200 };
        }

        await tx
          .update(roomPlayers)
          .set({
            status: "on_block",
            soldToTeamId: null,
            soldPriceLakhs: null,
            updatedAt: new Date(),
          })
          .where(eq(roomPlayers.id, nextRp.id));

        const timerEndsAt = new Date(
          Date.now() + (room.rules.bidTimerSeconds || 20) * 1000
        );
        const snap = nextRp.customPlayerSnapshot;

        const lotEvent: LastAuctionEvent = {
          id: `lot-${nextRp.id}-${Date.now()}`,
          type: "lot_started",
          message: `NOW ON THE BLOCK: ${snap.name} (${snap.country} • ${
            snap.role
          }) — Base Price ${formatLakhs(snap.basePriceLakhs)}`,
          playerName: snap.name,
          playerRole: snap.role,
          amountLakhs: snap.basePriceLakhs,
          timestamp: new Date().toISOString(),
        };

        await tx
          .update(rooms)
          .set({
            status: "live",
            currentRoomPlayerId: nextRp.id,
            currentBidLakhs: null,
            currentBidTeamId: null,
            timerEndsAt,
            pausedRemainingMs: null,
            lastEvent: lotEvent,
            version: sql`${rooms.version} + 1`,
          })
          .where(eq(rooms.id, room.id));

        return { status: 200 };
      }

      if (action === "hammer") {
        return {
          status: 400,
          error: "Manual hammer is disabled — players are SOLD automatically when the timer ends.",
        };
      }

      if (action === "pause") {
        if (room.status !== "live") {
          return { status: 400, error: "Auction is not currently live." };
        }
        const remainingMs = room.timerEndsAt
          ? Math.max(4000, new Date(room.timerEndsAt).getTime() - Date.now())
          : (room.rules.bidTimerSeconds || 20) * 1000;

        const pauseEvent: LastAuctionEvent = {
          id: `pause-${Date.now()}`,
          type: "paused",
          message: "Auction paused by Commissioner.",
          timestamp: new Date().toISOString(),
        };

        await tx
          .update(rooms)
          .set({
            status: "paused",
            timerEndsAt: null,
            pausedRemainingMs: remainingMs,
            lastEvent: pauseEvent,
            version: sql`${rooms.version} + 1`,
          })
          .where(eq(rooms.id, room.id));

        return { status: 200 };
      }

      if (action === "resume") {
        if (room.status !== "paused") {
          return { status: 400, error: "Auction is not paused." };
        }
        const resumeMs = Math.max(
          5000,
          room.pausedRemainingMs || (room.rules.bidTimerSeconds || 20) * 1000
        );
        const timerEndsAt = room.currentRoomPlayerId
          ? new Date(Date.now() + resumeMs)
          : null;

        const resumeEvent: LastAuctionEvent = {
          id: `resume-${Date.now()}`,
          type: "resumed",
          message: "Auction resumed! Bidding paddles are active.",
          timestamp: new Date().toISOString(),
        };

        await tx
          .update(rooms)
          .set({
            status: "live",
            timerEndsAt,
            pausedRemainingMs: null,
            lastEvent: resumeEvent,
            version: sql`${rooms.version} + 1`,
          })
          .where(eq(rooms.id, room.id));

        return { status: 200 };
      }

      if (action === "sync_pool") {
        await ensurePlayersSeeded();
        const pool = await buildRoomPoolForFormat(room.format);
        const existing = await tx
          .select({
            playerId: roomPlayers.playerId,
            orderIndex: roomPlayers.orderIndex,
          })
          .from(roomPlayers)
          .where(eq(roomPlayers.roomId, room.id));
        const existingIds = new Set(
          existing.map((e) => e.playerId).filter((x): x is number => x !== null)
        );
        let maxOrder = existing.reduce((m, e) => Math.max(m, e.orderIndex), 0);
        const toAdd = pool.filter((item) => item.id > 0 && !existingIds.has(item.id));

        if (toAdd.length === 0) {
          return { status: 400, error: "Room pool is already up to date with the latest players." };
        }

        await tx.insert(roomPlayers).values(
          toAdd.map((item) => ({
            roomId: room.id,
            playerId: item.id,
            customPlayerSnapshot: item.snapshot,
            orderIndex: ++maxOrder,
            status: "pending" as const,
          }))
        );

        await tx
          .update(rooms)
          .set({
            status: room.status === "completed" ? "live" : room.status,
            lastEvent: {
              id: `sync-${Date.now()}`,
              type: "rule_updated",
              message: `${toAdd.length} new current players were added to this room's auction pool!`,
              timestamp: new Date().toISOString(),
            },
            version: sql`${rooms.version} + 1`,
          })
          .where(eq(rooms.id, room.id));

        return { status: 200 };
      }

      if (action === "requeue_unsold") {
        const unsoldList = await tx
          .select({ id: roomPlayers.id })
          .from(roomPlayers)
          .where(and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.status, "unsold")));

        if (unsoldList.length === 0) {
          return { status: 400, error: "There are no UNSOLD players to bring back." };
        }

        await tx
          .update(roomPlayers)
          .set({ status: "pending", updatedAt: new Date() })
          .where(and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.status, "unsold")));

        await tx
          .update(rooms)
          .set({
            status: room.status === "completed" ? "live" : room.status,
            lastEvent: {
              id: `acc-${Date.now()}`,
              type: "rule_updated",
              message: `ACCELERATED AUCTION: ${unsoldList.length} Unsold players re-entered the pool!`,
              timestamp: new Date().toISOString(),
            },
            version: sql`${rooms.version} + 1`,
          })
          .where(eq(rooms.id, room.id));

        return { status: 200 };
      }

      if (action === "add_custom_player") {
        const name = String(body.name || "").trim();
        if (!name) {
          return { status: 400, error: "Custom player name is required." };
        }
        const country = String(body.country || "India").trim();
        const role = (body.role || "All-Rounder") as PlayerRole;
        const basePriceLakhs = Math.max(20, Math.min(500, Number(body.basePriceLakhs || 50)));
        const isMarquee = Boolean(body.isMarquee);
        const isCapped = body.isCapped !== undefined ? Boolean(body.isCapped) : true;
        const setCategory: PlayerSetCategory = isMarquee
          ? "Marquee"
          : !isCapped
          ? "Uncapped"
          : role === "Wicketkeeper"
          ? "Wicketkeepers"
          : role === "All-Rounder"
          ? "All-Rounders"
          : role === "Bowler"
          ? "Fast Bowlers"
          : "Batsmen";

        const formats: Exclude<CricketFormat, "ALL">[] =
          room.format === "ALL" ? ["IPL", "T20I", "ODI", "TEST"] : [room.format];

        const customSnap: PlayerSnapshot = {
          slug: `custom-${Date.now()}`,
          name,
          country,
          isOverseasDefault: country.toLowerCase() !== "india",
          role,
          battingStyle: String(body.battingStyle || "Right-hand bat"),
          bowlingStyle: String(body.bowlingStyle || "Right-arm medium"),
          setCategory,
          isCapped,
          isMarquee,
          basePriceLakhs,
          franchiseTag: "CUSTOM",
          formats,
          rating: Math.max(70, Math.min(99, Number(body.rating || 85))),
          imageUrl: /^https?:\/\/\S+$/i.test(String(body.imageUrl || "").trim())
            ? String(body.imageUrl).trim()
            : null,
          stats: {
            ipl: {
              matches: Number(body.matches || 20),
              runs: Number(body.runs || 520),
              average: 34.6,
              strikeRate: Number(body.strikeRate || 148.5),
              wickets: Number(body.wickets || 14),
              economy: 7.8,
              best: role === "Bowler" ? "4/19" : "84*",
            },
          },
        };

        await tx.insert(roomPlayers).values({
          roomId: room.id,
          playerId: null,
          customPlayerSnapshot: customSnap,
          orderIndex: 0, // Put at front of pending queue!
          status: "pending",
        });

        await tx
          .update(rooms)
          .set({
            lastEvent: {
              id: `custom-${Date.now()}`,
              type: "rule_updated",
              message: `Custom player "${name}" (${country} • ${formatLakhs(
                basePriceLakhs
              )}) added to the front of the queue!`,
              timestamp: new Date().toISOString(),
            },
            version: sql`${rooms.version} + 1`,
          })
          .where(eq(rooms.id, room.id));

        return { status: 201 };
      }

      return { status: 400, error: `Unknown action "${action}".` };
    });

    if ("error" in txResult && txResult.error) {
      return NextResponse.json(
        { error: txResult.error },
        { status: txResult.status }
      );
    }

    notifyRoomUpdated(normalizedCode);
    const state = await getRoomState(normalizedCode, participantToken);
    return NextResponse.json(state, { status: txResult.status });
  } catch (err) {
    console.error("POST /api/rooms/[code]/action error:", err);
    return NextResponse.json(
      { error: "Failed to execute auctioneer action." },
      { status: 500 }
    );
  }
}
