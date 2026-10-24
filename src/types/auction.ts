export type CricketFormat = "ALL" | "IPL" | "T20I" | "ODI" | "TEST";

export type PlayerRole = "Batsman" | "Bowler" | "All-Rounder" | "Wicketkeeper";

export type PlayerSetCategory =
  | "Marquee"
  | "Batsmen"
  | "All-Rounders"
  | "Wicketkeepers"
  | "Fast Bowlers"
  | "Spinners"
  | "Uncapped";

export interface FormatStatLine {
  matches: number;
  runs: number;
  average: number;
  strikeRate: number;
  wickets: number;
  economy: number;
  best: string;
  highScore?: string | null;
  bestBowling?: string | null;
  hundreds?: number | null;
  fifties?: number | null;
}

/** Live profile details synced from Wikipedia + Cricsheet (2026 season). */
export interface PlayerProfile {
  dataVersion?: string;
  statsAsOf?: string;
  wikiTitle?: string;
  cricinfoId?: string;
  birthDate?: string;
  age?: number;
  roleDetail?: string;
  internationalSpan?: string | null;
  internationalRetired?: boolean;
  inactiveFormats?: Exclude<CricketFormat, "ALL">[];
  lastPlayed?: Partial<Record<Exclude<CricketFormat, "ALL">, string>>;
  iplSeasons?: number;
  lastIplSeason?: string;
  lastIplTeam?: string;
  iplDataThrough?: string;
  latestIplSeason?: FormatStatLine & { season: string; team: string };
  sources?: string[];
}

export interface PlayerFormatStats {
  ipl?: FormatStatLine;
  t20i?: FormatStatLine;
  odi?: FormatStatLine;
  test?: FormatStatLine;
}

export interface PlayerSnapshot {
  id?: number;
  slug: string;
  name: string;
  country: string;
  isOverseasDefault: boolean;
  role: PlayerRole;
  battingStyle: string;
  bowlingStyle: string;
  setCategory: PlayerSetCategory;
  isCapped: boolean;
  isMarquee: boolean;
  basePriceLakhs: number;
  franchiseTag: string;
  formats: Exclude<CricketFormat, "ALL">[];
  stats: PlayerFormatStats;
  rating: number;
  /** Optional explicit photo URL (used for custom players); otherwise resolved automatically. */
  imageUrl?: string | null;
  /** Live 2026 profile details (age, current team, latest IPL season, inactive formats, sources) */
  profile?: PlayerProfile | null;
}

export interface AuctionRules {
  purseLakhs: number; // e.g., 12000 = ₹120.00 Cr
  maxTeams: number; // 2 to 12
  minSquadSize: number; // e.g., 11 or 15 or 18
  maxSquadSize: number; // e.g., 15 or 20 or 25
  maxOverseas: number; // e.g., 4 or 8 or 25 (no limit)
  homeCountry: string; // "India", "Australia", "England", or "NONE"
  maxMarqueePerTeam: number; // e.g., 3 or 99 (unlimited)
  maxUncappedPerTeam: number; // e.g., 99 (unlimited) or custom cap
  minWicketkeepers: number; // e.g., 1 or 2
  bidTimerSeconds: number; // 10 to 90
  incrementMode: "ipl_slabs" | "fixed";
  fixedIncrementLakhs: number; // e.g., 25
  allowJumpBids: boolean;
  reserveBasePriceProtection: boolean;
  minReservePerSlotLakhs: number; // e.g., 30 (₹30L saved per remaining mandatory minSquad slot)
  autoHammerOnTimer: boolean;
  rtmCardsPerTeam: number; // 0 to 4
  includeAcceleratedUnsold: boolean;
}

export interface LastAuctionEvent {
  id: string;
  type: "sold" | "unsold" | "bid" | "lot_started" | "paused" | "resumed" | "rule_updated" | "rtm";
  message: string;
  teamName?: string;
  teamShortCode?: string;
  teamColor?: string;
  playerName?: string;
  playerRole?: string;
  amountLakhs?: number;
  timestamp: string;
}

export interface TeamDTO {
  id: number;
  roomId: number;
  name: string;
  shortCode: string;
  ownerName: string;
  color: string;
  purseRemainingLakhs: number;
  rtmCardsRemaining: number;
  isBot: boolean;
  isMe?: boolean;
}

export interface RoomPlayerDTO {
  id: number;
  roomId: number;
  playerId: number | null;
  player: PlayerSnapshot;
  orderIndex: number;
  status: "pending" | "on_block" | "sold" | "unsold";
  soldToTeamId: number | null;
  soldPriceLakhs: number | null;
  soldViaRtm: boolean;
}

export interface BidDTO {
  id: number;
  roomId: number;
  roomPlayerId: number;
  teamId: number;
  teamName: string;
  teamShortCode: string;
  teamColor: string;
  amountLakhs: number;
  isJumpBid: boolean;
  createdAt: string;
}

export interface RoomStateDTO {
  id: number;
  code: string;
  name: string;
  hostName: string;
  format: CricketFormat;
  status: "waiting" | "live" | "paused" | "completed";
  rules: AuctionRules;
  currentRoomPlayerId: number | null;
  currentBidLakhs: number | null;
  currentBidTeamId: number | null;
  timerEndsAt: string | null;
  pausedRemainingMs: number | null;
  lastEvent: LastAuctionEvent | null;
  version: number;
  serverNow: string;
  isHost: boolean;
  myTeamId: number | null;
  teams: TeamDTO[];
  players: RoomPlayerDTO[];
  currentLotBids: BidDTO[];
}

/** Delay between a lot closing (SOLD / UNSOLD) and the next player automatically coming on the block. */
export const AUTO_NEXT_LOT_DELAY_MS = 7000;

export const ROLE_GROUPS: Array<{ role: PlayerRole; label: string; short: string }> = [
  { role: "Batsman", label: "Batters", short: "BAT" },
  { role: "Wicketkeeper", label: "Wicketkeepers", short: "WK" },
  { role: "All-Rounder", label: "All-Rounders", short: "AR" },
  { role: "Bowler", label: "Bowlers", short: "BOWL" },
];

export const RULE_PRESETS: Record<
  string,
  {
    label: string;
    subtitle: string;
    format: CricketFormat;
    rules: AuctionRules;
  }
> = {
  ipl_mega: {
    label: "IPL Mega Auction",
    subtitle: "₹120 Cr Purse • Max 25 Squad • Max 8 Overseas • IPL Bid Slabs",
    format: "IPL",
    rules: {
      purseLakhs: 12000,
      maxTeams: 10,
      minSquadSize: 15,
      maxSquadSize: 25,
      maxOverseas: 8,
      homeCountry: "India",
      maxMarqueePerTeam: 99,
      maxUncappedPerTeam: 99,
      minWicketkeepers: 2,
      bidTimerSeconds: 20,
      incrementMode: "ipl_slabs",
      fixedIncrementLakhs: 25,
      allowJumpBids: true,
      reserveBasePriceProtection: true,
      minReservePerSlotLakhs: 30,
      autoHammerOnTimer: true,
      rtmCardsPerTeam: 2,
      includeAcceleratedUnsold: true,
    },
  },
  odi_world_xi: {
    label: "ODI World Cup Draft",
    subtitle: "₹100 Cr Purse • 15-Man ODI Squad • Global Pool • Max 6 Overseas",
    format: "ODI",
    rules: {
      purseLakhs: 10000,
      maxTeams: 8,
      minSquadSize: 11,
      maxSquadSize: 16,
      maxOverseas: 6,
      homeCountry: "India",
      maxMarqueePerTeam: 3,
      maxUncappedPerTeam: 99,
      minWicketkeepers: 1,
      bidTimerSeconds: 25,
      incrementMode: "ipl_slabs",
      fixedIncrementLakhs: 25,
      allowJumpBids: true,
      reserveBasePriceProtection: true,
      minReservePerSlotLakhs: 50,
      autoHammerOnTimer: true,
      rtmCardsPerTeam: 1,
      includeAcceleratedUnsold: true,
    },
  },
  test_championship: {
    label: "Test Championship XI",
    subtitle: "₹90 Cr Purse • Red-Ball Specialists • No Overseas Cap (Global XI)",
    format: "TEST",
    rules: {
      purseLakhs: 9000,
      maxTeams: 8,
      minSquadSize: 11,
      maxSquadSize: 15,
      maxOverseas: 15,
      homeCountry: "NONE",
      maxMarqueePerTeam: 3,
      maxUncappedPerTeam: 99,
      minWicketkeepers: 1,
      bidTimerSeconds: 25,
      incrementMode: "fixed",
      fixedIncrementLakhs: 25,
      allowJumpBids: true,
      reserveBasePriceProtection: true,
      minReservePerSlotLakhs: 50,
      autoHammerOnTimer: true,
      rtmCardsPerTeam: 0,
      includeAcceleratedUnsold: true,
    },
  },
  quick_party: {
    label: "Fast 5-Aside / Party T20I",
    subtitle: "₹60 Cr Purse • 8–12 Squad • 15s Rapid Timer • All Formats Pool",
    format: "ALL",
    rules: {
      purseLakhs: 6000,
      maxTeams: 8,
      minSquadSize: 7,
      maxSquadSize: 12,
      maxOverseas: 4,
      homeCountry: "India",
      maxMarqueePerTeam: 2,
      maxUncappedPerTeam: 99,
      minWicketkeepers: 1,
      bidTimerSeconds: 15,
      incrementMode: "ipl_slabs",
      fixedIncrementLakhs: 20,
      allowJumpBids: true,
      reserveBasePriceProtection: false,
      minReservePerSlotLakhs: 30,
      autoHammerOnTimer: true,
      rtmCardsPerTeam: 1,
      includeAcceleratedUnsold: true,
    },
  },
};

export const FRANCHISE_PRESETS = [
  { name: "Chennai Super Kings", shortCode: "CSK", color: "#F59E0B" },
  { name: "Mumbai Indians", shortCode: "MI", color: "#3B82F6" },
  { name: "Royal Challengers Bengaluru", shortCode: "RCB", color: "#EF4444" },
  { name: "Kolkata Knight Riders", shortCode: "KKR", color: "#A855F7" },
  { name: "Sunrisers Hyderabad", shortCode: "SRH", color: "#F97316" },
  { name: "Rajasthan Royals", shortCode: "RR", color: "#EC4899" },
  { name: "Delhi Capitals", shortCode: "DC", color: "#06B6D4" },
  { name: "Gujarat Titans", shortCode: "GT", color: "#14B8A6" },
  { name: "Punjab Kings", shortCode: "PBKS", color: "#F43F5E" },
  { name: "Lucknow Super Giants", shortCode: "LSG", color: "#38BDF8" },
  { name: "Sydney Sixers XI", shortCode: "SYS", color: "#D946EF" },
  { name: "London Spirit XI", shortCode: "LDN", color: "#10B981" },
];

export function formatLakhs(lakhs: number | null | undefined): string {
  if (lakhs === null || lakhs === undefined || Number.isNaN(lakhs)) return "₹0 L";
  if (lakhs >= 100) {
    const crores = lakhs / 100;
    const formatted = crores % 1 === 0 ? crores.toFixed(2) : crores.toFixed(2);
    return `₹${formatted} Cr`;
  }
  return `₹${lakhs} L`;
}

export function formatLakhsCompact(lakhs: number | null | undefined): string {
  if (lakhs === null || lakhs === undefined || Number.isNaN(lakhs)) return "₹0L";
  if (lakhs >= 100) {
    const crores = lakhs / 100;
    return `₹${crores.toFixed(crores % 1 === 0 ? 1 : 2)}Cr`;
  }
  return `₹${lakhs}L`;
}

export function isPlayerOverseasForRoom(player: PlayerSnapshot, rules: AuctionRules): boolean {
  if (!rules.homeCountry || rules.homeCountry === "NONE") {
    return false;
  }
  return player.country.toLowerCase() !== rules.homeCountry.toLowerCase();
}

export function getNextBidIncrementLakhs(currentLakhs: number, rules: AuctionRules): number {
  if (rules.incrementMode === "fixed") {
    return Math.max(5, rules.fixedIncrementLakhs || 25);
  }
  // Authentic IPL Mega Auction Slab Increments
  if (currentLakhs < 100) return 10; // Under ₹1 Cr -> +₹10 L
  if (currentLakhs < 200) return 20; // ₹1 Cr to ₹2 Cr -> +₹20 L
  if (currentLakhs < 500) return 25; // ₹2 Cr to ₹5 Cr -> +₹25 L
  return 50; // ₹5 Cr+ -> +₹50 L
}

export function computeNextValidBidLakhs(
  basePriceLakhs: number,
  currentBidLakhs: number | null,
  currentBidTeamId: number | null,
  rules: AuctionRules
): number {
  // Opening bid on a player with no bids yet starts at basePriceLakhs!
  if (currentBidTeamId === null || currentBidLakhs === null) {
    return basePriceLakhs;
  }
  return currentBidLakhs + getNextBidIncrementLakhs(currentBidLakhs, rules);
}

export interface TeamSquadSummary {
  totalPlayers: number;
  overseasCount: number;
  marqueeCount: number;
  uncappedCount: number;
  batsmenCount: number;
  bowlersCount: number;
  allRoundersCount: number;
  wicketkeepersCount: number;
  maxAllowedBidLakhs: number;
}

export function computeTeamSquadSummary(
  team: Pick<TeamDTO, "id" | "purseRemainingLakhs">,
  allRoomPlayers: RoomPlayerDTO[],
  rules: AuctionRules
): TeamSquadSummary {
  const bought = allRoomPlayers.filter((rp) => rp.status === "sold" && rp.soldToTeamId === team.id);
  const totalPlayers = bought.length;
  const overseasCount = bought.filter((rp) => isPlayerOverseasForRoom(rp.player, rules)).length;
  const marqueeCount = bought.filter((rp) => rp.player.isMarquee).length;
  const uncappedCount = bought.filter((rp) => !rp.player.isCapped).length;
  const batsmenCount = bought.filter((rp) => rp.player.role === "Batsman").length;
  const bowlersCount = bought.filter((rp) => rp.player.role === "Bowler").length;
  const allRoundersCount = bought.filter((rp) => rp.player.role === "All-Rounder").length;
  const wicketkeepersCount = bought.filter((rp) => rp.player.role === "Wicketkeeper").length;

  let maxAllowedBidLakhs = team.purseRemainingLakhs;
  if (rules.reserveBasePriceProtection) {
    // After buying THIS player (totalPlayers + 1), how many mandatory slots remain to hit minSquadSize?
    const remainingMandatoryAfterThis = Math.max(0, rules.minSquadSize - (totalPlayers + 1));
    const reserveNeeded = remainingMandatoryAfterThis * (rules.minReservePerSlotLakhs || 30);
    maxAllowedBidLakhs = Math.max(0, team.purseRemainingLakhs - reserveNeeded);
  }

  return {
    totalPlayers,
    overseasCount,
    marqueeCount,
    uncappedCount,
    batsmenCount,
    bowlersCount,
    allRoundersCount,
    wicketkeepersCount,
    maxAllowedBidLakhs,
  };
}

export function validateTeamBidEligibility(params: {
  team: Pick<TeamDTO, "id" | "name" | "purseRemainingLakhs">;
  player: PlayerSnapshot;
  proposedBidLakhs: number;
  currentBidLakhs: number | null;
  currentBidTeamId: number | null;
  allRoomPlayers: RoomPlayerDTO[];
  rules: AuctionRules;
}): { ok: true } | { ok: false; reason: string } {
  const { team, player, proposedBidLakhs, currentBidLakhs, currentBidTeamId, allRoomPlayers, rules } = params;

  if (currentBidTeamId === team.id) {
    return { ok: false, reason: `${team.name} already holds the highest bid.` };
  }

  const minRequired = computeNextValidBidLakhs(
    player.basePriceLakhs,
    currentBidLakhs,
    currentBidTeamId,
    rules
  );

  if (proposedBidLakhs < minRequired) {
    return {
      ok: false,
      reason: `Minimum valid bid is ${formatLakhs(minRequired)}.`,
    };
  }

  if (!rules.allowJumpBids && proposedBidLakhs > minRequired) {
    return {
      ok: false,
      reason: `Jump bids are disabled in this room's rules. Next slab is ${formatLakhs(minRequired)}.`,
    };
  }

  const summary = computeTeamSquadSummary(team, allRoomPlayers, rules);

  if (summary.totalPlayers >= rules.maxSquadSize) {
    return {
      ok: false,
      reason: `Max squad limit reached (${summary.totalPlayers}/${rules.maxSquadSize}).`,
    };
  }

  const isOverseas = isPlayerOverseasForRoom(player, rules);
  if (isOverseas && summary.overseasCount >= rules.maxOverseas) {
    return {
      ok: false,
      reason: `Overseas player limit reached (${summary.overseasCount}/${rules.maxOverseas}).`,
    };
  }

  if (player.isMarquee && summary.marqueeCount >= rules.maxMarqueePerTeam) {
    return {
      ok: false,
      reason: `Marquee player limit reached (${summary.marqueeCount}/${rules.maxMarqueePerTeam}).`,
    };
  }

  if (!player.isCapped && summary.uncappedCount >= rules.maxUncappedPerTeam) {
    return {
      ok: false,
      reason: `Uncapped player limit reached (${summary.uncappedCount}/${rules.maxUncappedPerTeam}).`,
    };
  }

  if (proposedBidLakhs > team.purseRemainingLakhs) {
    return {
      ok: false,
      reason: `Insufficient purse (${formatLakhs(team.purseRemainingLakhs)} remaining).`,
    };
  }

  if (proposedBidLakhs > summary.maxAllowedBidLakhs) {
    return {
      ok: false,
      reason: `Exceeds max safe bid (${formatLakhs(summary.maxAllowedBidLakhs)}) due to reserve purse protection for minimum squad of ${rules.minSquadSize}.`,
    };
  }

  return { ok: true };
}
