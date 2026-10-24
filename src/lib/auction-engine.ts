import { EventEmitter } from "events";
import { warmPlayerPhotos } from "@/lib/player-photo-store";
import { db } from "@/db";
import { bids, players, roomPlayers, rooms, teams } from "@/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  AUTO_NEXT_LOT_DELAY_MS,
  computeNextValidBidLakhs,
  computeTeamSquadSummary,
  formatLakhs,
  validateTeamBidEligibility,
  type AuctionRules,
  type BidDTO,
  type CricketFormat,
  type LastAuctionEvent,
  type PlayerSetCategory,
  type PlayerSnapshot,
  type RoomPlayerDTO,
  type RoomStateDTO,
  type TeamDTO,
} from "@/types/auction";

const globalForEvents = globalThis as typeof globalThis & {
  __cricbidRoomEmitter?: EventEmitter;
};

export const roomEmitter: EventEmitter =
  globalForEvents.__cricbidRoomEmitter ??
  (() => {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(500);
    return emitter;
  })();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.__cricbidRoomEmitter = roomEmitter;
}

export function notifyRoomUpdated(roomCode: string) {
  roomEmitter.emit(`room:${roomCode.toUpperCase()}`);
}

const SET_ORDER: Record<PlayerSetCategory, number> = {
  Marquee: 1,
  Batsmen: 2,
  "All-Rounders": 3,
  Wicketkeepers: 4,
  "Fast Bowlers": 5,
  Spinners: 6,
  Uncapped: 7,
};

export function generateRoomCode(format: CricketFormat): string {
  const prefix = format === "ALL" ? "CRIC" : format.toUpperCase();
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${digits}`;
}

export function sortPlayersIntoSets(pool: PlayerSnapshot[]): PlayerSnapshot[] {
  const withJitter = pool.map((p) => ({
    player: p,
    setRank: SET_ORDER[p.setCategory] ?? 9,
    jitter: Math.random(),
  }));

  withJitter.sort((a, b) => {
    if (a.setRank !== b.setRank) return a.setRank - b.setRank;
    return a.jitter - b.jitter;
  });

  return withJitter.map((x) => x.player);
}

/**
 * Checks whether an active lot timer has expired (if autoHammerOnTimer is enabled)
 * or whether an AI Bot team wants to place a competitive bid.
 */
export async function tickRoomAutomation(roomCode: string): Promise<void> {
  const normalizedCode = roomCode.toUpperCase();

  let didMutate = false;

  await db.transaction(async (tx) => {
    const roomRows = await tx
      .select()
      .from(rooms)
      .where(eq(rooms.code, normalizedCode))
      .for("update");

    const room = roomRows[0];
    if (!room || room.status !== "live") {
      return;
    }

    // 0. Between lots: automatically bring the next player on the block after a short break
    if (!room.currentRoomPlayerId) {
      const lastTs = room.lastEvent?.timestamp
        ? new Date(room.lastEvent.timestamp).getTime()
        : 0;
      if (Date.now() - lastTs >= AUTO_NEXT_LOT_DELAY_MS) {
        await startNextLotInTx(tx, room);
        didMutate = true;
      }
      return;
    }

    const now = Date.now();
    const endsAtMs = room.timerEndsAt ? new Date(room.timerEndsAt).getTime() : null;

    // 1. Clock hit zero → lot closes automatically (SOLD to highest bidder, or UNSOLD)
    if (endsAtMs !== null && now >= endsAtMs) {
      await resolveCurrentLotInTx(tx, room);
      didMutate = true;
      return;
    }

    // 2. Check if any AI Bot team should place a competitive bid
    const roomTeams = await tx
      .select()
      .from(teams)
      .where(eq(teams.roomId, room.id));

    const botTeams = roomTeams.filter((t) => t.isBot);
    if (botTeams.length === 0 || endsAtMs === null) {
      return;
    }

    const remainingMs = endsAtMs - now;
    const totalTimerMs = (room.rules.bidTimerSeconds || 20) * 1000;
    const elapsedSinceLastActionMs = totalTimerMs - remainingMs;

    // Wait at least 2.2 seconds after lot start / previous bid so human players see realistic pacing
    if (elapsedSinceLastActionMs < 2200 || remainingMs < 1200) {
      return;
    }

    const [activeRp] = await tx
      .select()
      .from(roomPlayers)
      .where(eq(roomPlayers.id, room.currentRoomPlayerId));

    if (!activeRp || activeRp.status !== "on_block") {
      return;
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

    const player = activeRp.customPlayerSnapshot;
    const nextBidLakhs = computeNextValidBidLakhs(
      player.basePriceLakhs,
      room.currentBidLakhs,
      room.currentBidTeamId,
      room.rules
    );

    // Compute fair valuation ceiling for AI bots based on player rating & purse scale
    const purseScale = (room.rules.purseLakhs || 12000) / 12000;
    const ratingAbove80 = Math.max(0, (player.rating || 82) - 80);
    // e.g. rating 98 -> ~1850 Lakhs (18.5 Cr); rating 90 -> ~800 Lakhs (8 Cr); rating 83 -> ~180 Lakhs
    const baseValuation =
      player.basePriceLakhs + Math.round(Math.pow(ratingAbove80, 1.85) * 9.5 * purseScale);

    // Filter eligible bots
    const candidates = botTeams.filter((bot) => {
      if (bot.id === room.currentBidTeamId) return false;
      const check = validateTeamBidEligibility({
        team: bot,
        player,
        proposedBidLakhs: nextBidLakhs,
        currentBidLakhs: room.currentBidLakhs,
        currentBidTeamId: room.currentBidTeamId,
        allRoomPlayers: allRpDtos,
        rules: room.rules,
      });
      if (!check.ok) return false;

      const summary = computeTeamSquadSummary(bot, allRpDtos, room.rules);
      // Role need bonus
      let roleMultiplier = 1.0;
      if (player.role === "Wicketkeeper" && summary.wicketkeepersCount === 0) {
        roleMultiplier = 1.25;
      } else if (player.role === "All-Rounder" && summary.allRoundersCount < 2) {
        roleMultiplier = 1.15;
      } else if (player.role === "Bowler" && summary.bowlersCount < 3) {
        roleMultiplier = 1.15;
      }

      // Deterministic pseudo-variance per bot + lot so bots have distinct appetites
      const appetiteHash = ((bot.id * 31 + activeRp.id * 17) % 45) / 100 + 0.8; // 0.80 to 1.24
      const botMaxWilling = Math.min(
        Math.round(baseValuation * roleMultiplier * appetiteHash),
        Math.round(bot.purseRemainingLakhs * 0.38) // Never blow >38% of remaining purse on 1 player unless huge squad already
      );

      return nextBidLakhs <= Math.max(player.basePriceLakhs, botMaxWilling);
    });

    if (candidates.length === 0) {
      return;
    }

    // Pick a candidate bot with highest remaining purse / appetite
    const chosenBot = candidates[Math.floor(Math.random() * candidates.length)];

    await tx.insert(bids).values({
      roomId: room.id,
      roomPlayerId: activeRp.id,
      teamId: chosenBot.id,
      amountLakhs: nextBidLakhs,
      isJumpBid: false,
    });

    const newTimerEndsAt = new Date(Date.now() + (room.rules.bidTimerSeconds || 20) * 1000);
    const event: LastAuctionEvent = {
      id: `${Date.now()}-${chosenBot.id}`,
      type: "bid",
      message: `${chosenBot.shortCode} bid ${formatLakhs(nextBidLakhs)} for ${player.name}`,
      teamName: chosenBot.name,
      teamShortCode: chosenBot.shortCode,
      teamColor: chosenBot.color,
      playerName: player.name,
      playerRole: player.role,
      amountLakhs: nextBidLakhs,
      timestamp: new Date().toISOString(),
    };

    await tx
      .update(rooms)
      .set({
        currentBidLakhs: nextBidLakhs,
        currentBidTeamId: chosenBot.id,
        timerEndsAt: newTimerEndsAt,
        lastEvent: event,
        version: sql`${rooms.version} + 1`,
      })
      .where(eq(rooms.id, room.id));

    didMutate = true;
  });

  if (didMutate) {
    notifyRoomUpdated(normalizedCode);
  }
}

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Puts the next pending player (lowest orderIndex) on the block, or completes the auction. */
export async function startNextLotInTx(
  tx: DbTx,
  room: typeof rooms.$inferSelect
): Promise<void> {
  const [nextRp] = await tx
    .select()
    .from(roomPlayers)
    .where(and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.status, "pending")))
    .orderBy(asc(roomPlayers.orderIndex), asc(roomPlayers.id))
    .limit(1);

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
    return;
  }

  await tx
    .update(roomPlayers)
    .set({ status: "on_block", soldToTeamId: null, soldPriceLakhs: null, updatedAt: new Date() })
    .where(eq(roomPlayers.id, nextRp.id));

  const snap = nextRp.customPlayerSnapshot;
  await tx
    .update(rooms)
    .set({
      status: "live",
      currentRoomPlayerId: nextRp.id,
      currentBidLakhs: null,
      currentBidTeamId: null,
      timerEndsAt: new Date(Date.now() + (room.rules.bidTimerSeconds || 20) * 1000),
      pausedRemainingMs: null,
      lastEvent: {
        id: `lot-${nextRp.id}-${Date.now()}`,
        type: "lot_started",
        message: `NOW ON THE BLOCK: ${snap.name} (${snap.country} • ${snap.role}) — Base Price ${formatLakhs(
          snap.basePriceLakhs
        )}`,
        playerName: snap.name,
        playerRole: snap.role,
        amountLakhs: snap.basePriceLakhs,
        timestamp: new Date().toISOString(),
      },
      version: sql`${rooms.version} + 1`,
    })
    .where(eq(rooms.id, room.id));
}

export async function resolveCurrentLotInTx(
  tx: DbTx,
  room: typeof rooms.$inferSelect
): Promise<LastAuctionEvent | null> {
  if (!room.currentRoomPlayerId) return null;

  const [rp] = await tx
    .select()
    .from(roomPlayers)
    .where(eq(roomPlayers.id, room.currentRoomPlayerId));

  if (!rp) return null;

  const player = rp.customPlayerSnapshot;

  if (room.currentBidTeamId && room.currentBidLakhs) {
    const [winningTeam] = await tx
      .select()
      .from(teams)
      .where(eq(teams.id, room.currentBidTeamId));

    if (winningTeam) {
      const updatedPurse = Math.max(0, winningTeam.purseRemainingLakhs - room.currentBidLakhs);
      await tx
        .update(teams)
        .set({ purseRemainingLakhs: updatedPurse })
        .where(eq(teams.id, winningTeam.id));

      await tx
        .update(roomPlayers)
        .set({
          status: "sold",
          soldToTeamId: winningTeam.id,
          soldPriceLakhs: room.currentBidLakhs,
          soldViaRtm: false,
          updatedAt: new Date(),
        })
        .where(eq(roomPlayers.id, rp.id));

      const soldEvent: LastAuctionEvent = {
        id: `sold-${rp.id}-${Date.now()}`,
        type: "sold",
        message: `SOLD! ${player.name} goes to ${winningTeam.name} for ${formatLakhs(
          room.currentBidLakhs
        )}!`,
        teamName: winningTeam.name,
        teamShortCode: winningTeam.shortCode,
        teamColor: winningTeam.color,
        playerName: player.name,
        playerRole: player.role,
        amountLakhs: room.currentBidLakhs,
        timestamp: new Date().toISOString(),
      };

      // Check if any pending players remain
      const remainingPending = await tx
        .select({ id: roomPlayers.id })
        .from(roomPlayers)
        .where(and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.status, "pending")));

      await tx
        .update(rooms)
        .set({
          status: remainingPending.length === 0 ? "completed" : "live",
          currentRoomPlayerId: null,
          currentBidLakhs: null,
          currentBidTeamId: null,
          timerEndsAt: null,
          pausedRemainingMs: null,
          lastEvent: soldEvent,
          version: sql`${rooms.version} + 1`,
        })
        .where(eq(rooms.id, room.id));

      return soldEvent;
    }
  }

  // Otherwise UNSOLD
  await tx
    .update(roomPlayers)
    .set({
      status: "unsold",
      soldToTeamId: null,
      soldPriceLakhs: null,
      updatedAt: new Date(),
    })
    .where(eq(roomPlayers.id, rp.id));

  const unsoldEvent: LastAuctionEvent = {
    id: `unsold-${rp.id}-${Date.now()}`,
    type: "unsold",
    message: `${player.name} goes UNSOLD at base price ${formatLakhs(player.basePriceLakhs)}.`,
    playerName: player.name,
    playerRole: player.role,
    amountLakhs: player.basePriceLakhs,
    timestamp: new Date().toISOString(),
  };

  const remainingPending = await tx
    .select({ id: roomPlayers.id })
    .from(roomPlayers)
    .where(and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.status, "pending")));

  await tx
    .update(rooms)
    .set({
      status: remainingPending.length === 0 ? "completed" : "live",
      currentRoomPlayerId: null,
      currentBidLakhs: null,
      currentBidTeamId: null,
      timerEndsAt: null,
      pausedRemainingMs: null,
      lastEvent: unsoldEvent,
      version: sql`${rooms.version} + 1`,
    })
    .where(eq(rooms.id, room.id));

  return unsoldEvent;
}

export async function getRoomState(
  roomCode: string,
  participantToken?: string | null
): Promise<RoomStateDTO | null> {
  const normalizedCode = roomCode.toUpperCase();

  // Advance timers or AI bids if needed before reading state
  await tickRoomAutomation(normalizedCode);

  const [room] = await db.select().from(rooms).where(eq(rooms.code, normalizedCode));
  if (!room) return null;

  const [roomTeams, rpRows] = await Promise.all([
    db.select().from(teams).where(eq(teams.roomId, room.id)).orderBy(asc(teams.id)),
    db
      .select()
      .from(roomPlayers)
      .where(eq(roomPlayers.roomId, room.id))
      .orderBy(asc(roomPlayers.orderIndex), asc(roomPlayers.id)),
  ]);

  let currentLotBids: BidDTO[] = [];
  if (room.currentRoomPlayerId) {
    const rawBids = await db
      .select()
      .from(bids)
      .where(eq(bids.roomPlayerId, room.currentRoomPlayerId))
      .orderBy(desc(bids.id))
      .limit(30);

    const teamMap = new Map(roomTeams.map((t) => [t.id, t]));
    currentLotBids = rawBids.map((b) => {
      const t = teamMap.get(b.teamId);
      return {
        id: b.id,
        roomId: b.roomId,
        roomPlayerId: b.roomPlayerId,
        teamId: b.teamId,
        teamName: t?.name ?? "Franchise",
        teamShortCode: t?.shortCode ?? "TM",
        teamColor: t?.color ?? "#F59E0B",
        amountLakhs: b.amountLakhs,
        isJumpBid: b.isJumpBid,
        createdAt: b.createdAt.toISOString(),
      };
    });
  }

  // Pre-cache photos for the player on the block + the next few in the queue
  warmPlayerPhotos(
    rpRows
      .filter((rp) => rp.status === "on_block" || rp.status === "pending")
      .slice(0, 5)
      .map((rp) => ({ slug: rp.customPlayerSnapshot.slug, name: rp.customPlayerSnapshot.name }))
  );

  const myTeam = participantToken
    ? roomTeams.find((t) => !t.isBot && t.ownerToken === participantToken)
    : undefined;

  const isHost = Boolean(participantToken && room.hostToken === participantToken);

  return {
    id: room.id,
    code: room.code,
    name: room.name,
    hostName: room.hostName,
    format: room.format,
    status: room.status,
    rules: room.rules,
    currentRoomPlayerId: room.currentRoomPlayerId,
    currentBidLakhs: room.currentBidLakhs,
    currentBidTeamId: room.currentBidTeamId,
    timerEndsAt: room.timerEndsAt ? room.timerEndsAt.toISOString() : null,
    pausedRemainingMs: room.pausedRemainingMs ?? null,
    lastEvent: room.lastEvent ?? null,
    version: room.version,
    serverNow: new Date().toISOString(),
    isHost,
    myTeamId: myTeam?.id ?? null,
    teams: roomTeams.map((t) => ({
      id: t.id,
      roomId: t.roomId,
      name: t.name,
      shortCode: t.shortCode,
      ownerName: t.ownerName,
      color: t.color,
      purseRemainingLakhs: t.purseRemainingLakhs,
      rtmCardsRemaining: t.rtmCardsRemaining,
      isBot: t.isBot,
      isMe: myTeam?.id === t.id,
    })),
    players: rpRows.map((rp) => ({
      id: rp.id,
      roomId: rp.roomId,
      playerId: rp.playerId,
      player: rp.customPlayerSnapshot,
      orderIndex: rp.orderIndex,
      status: rp.status,
      soldToTeamId: rp.soldToTeamId,
      soldPriceLakhs: rp.soldPriceLakhs,
      soldViaRtm: rp.soldViaRtm,
    })),
    currentLotBids,
  };
}

export async function buildRoomPoolForFormat(format: CricketFormat): Promise<
  Array<{
    id: number;
    snapshot: PlayerSnapshot;
  }>
> {
  const allPlayers = await db.select().from(players).orderBy(desc(players.rating));

  const filtered = allPlayers.filter((p) => {
    // Players inactive in every format (retired / not playing in 2025-26) are left out of new pools
    if (format === "ALL") return p.formats.length > 0;
    return p.formats.includes(format);
  });

  const snapshots: Array<{ id: number; snapshot: PlayerSnapshot }> = filtered.map((p) => ({
    id: p.id,
    snapshot: {
      id: p.id,
      slug: p.slug,
      name: p.name,
      country: p.country,
      isOverseasDefault: p.isOverseasDefault,
      role: p.role,
      battingStyle: p.battingStyle,
      bowlingStyle: p.bowlingStyle,
      setCategory: p.setCategory,
      isCapped: p.isCapped,
      isMarquee: p.isMarquee,
      basePriceLakhs: p.basePriceLakhs,
      franchiseTag: p.franchiseTag,
      formats: p.formats,
      stats: p.stats,
      rating: p.rating,
      profile: p.profile ?? null,
    },
  }));

  // Sort by set category with randomized order inside each set
  const sortedSnapshots = sortPlayersIntoSets(snapshots.map((s) => s.snapshot));
  const bySlug = new Map(snapshots.map((s) => [s.snapshot.slug, s.id]));

  return sortedSnapshots.map((snap) => ({
    id: bySlug.get(snap.slug) ?? 0,
    snapshot: snap,
  }));
}

export function sanitizeRules(input: Partial<AuctionRules>, base: AuctionRules): AuctionRules {
  const minSquadSize = Math.max(1, Math.min(25, Number(input.minSquadSize ?? base.minSquadSize)));
  const maxSquadSize = Math.max(
    minSquadSize,
    Math.min(35, Number(input.maxSquadSize ?? base.maxSquadSize))
  );
  return {
    purseLakhs: Math.max(500, Math.min(100000, Math.round(Number(input.purseLakhs ?? base.purseLakhs)))),
    maxTeams: Math.max(2, Math.min(16, Math.round(Number(input.maxTeams ?? base.maxTeams)))),
    minSquadSize,
    maxSquadSize,
    maxOverseas: Math.max(0, Math.min(35, Math.round(Number(input.maxOverseas ?? base.maxOverseas)))),
    homeCountry: String(input.homeCountry ?? base.homeCountry).trim() || "India",
    maxMarqueePerTeam: Math.max(
      1,
      Math.min(99, Math.round(Number(input.maxMarqueePerTeam ?? base.maxMarqueePerTeam)))
    ),
    maxUncappedPerTeam: Math.max(
      0,
      Math.min(99, Math.round(Number(input.maxUncappedPerTeam ?? base.maxUncappedPerTeam)))
    ),
    minWicketkeepers: Math.max(
      0,
      Math.min(5, Math.round(Number(input.minWicketkeepers ?? base.minWicketkeepers)))
    ),
    bidTimerSeconds: Math.max(
      8,
      Math.min(120, Math.round(Number(input.bidTimerSeconds ?? base.bidTimerSeconds)))
    ),
    incrementMode: input.incrementMode === "fixed" ? "fixed" : "ipl_slabs",
    fixedIncrementLakhs: Math.max(
      5,
      Math.min(500, Math.round(Number(input.fixedIncrementLakhs ?? base.fixedIncrementLakhs)))
    ),
    allowJumpBids:
      input.allowJumpBids !== undefined ? Boolean(input.allowJumpBids) : base.allowJumpBids,
    reserveBasePriceProtection:
      input.reserveBasePriceProtection !== undefined
        ? Boolean(input.reserveBasePriceProtection)
        : base.reserveBasePriceProtection,
    minReservePerSlotLakhs: Math.max(
      10,
      Math.min(200, Math.round(Number(input.minReservePerSlotLakhs ?? base.minReservePerSlotLakhs)))
    ),
    // Lots always close automatically when the clock reaches zero
    autoHammerOnTimer: true,
    rtmCardsPerTeam: Math.max(
      0,
      Math.min(5, Math.round(Number(input.rtmCardsPerTeam ?? base.rtmCardsPerTeam)))
    ),
    includeAcceleratedUnsold:
      input.includeAcceleratedUnsold !== undefined
        ? Boolean(input.includeAcceleratedUnsold)
        : base.includeAcceleratedUnsold,
  };
}
