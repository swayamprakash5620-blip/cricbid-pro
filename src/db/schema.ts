import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  customType,
} from "drizzle-orm/pg-core";
import type {
  AuctionRules,
  CricketFormat,
  LastAuctionEvent,
  PlayerFormatStats,
  PlayerProfile,
  PlayerRole,
  PlayerSetCategory,
  PlayerSnapshot,
} from "@/types/auction";

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    country: text("country").notNull(),
    isOverseasDefault: boolean("is_overseas_default").notNull().default(false),
    role: text("role").$type<PlayerRole>().notNull(),
    battingStyle: text("batting_style").notNull(),
    bowlingStyle: text("bowling_style").notNull(),
    setCategory: text("set_category").$type<PlayerSetCategory>().notNull(),
    isCapped: boolean("is_capped").notNull().default(true),
    isMarquee: boolean("is_marquee").notNull().default(false),
    basePriceLakhs: integer("base_price_lakhs").notNull(),
    franchiseTag: text("franchise_tag").notNull().default("INTL"),
    formats: jsonb("formats").$type<Exclude<CricketFormat, "ALL">[]>().notNull(),
    stats: jsonb("stats").$type<PlayerFormatStats>().notNull(),
    rating: integer("rating").notNull().default(82),
    profile: jsonb("profile").$type<PlayerProfile | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("players_role_idx").on(table.role),
    index("players_country_idx").on(table.country),
    index("players_set_idx").on(table.setCategory),
  ]
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** Locally cached photo bytes — served from our own domain so browsers never hit Wikimedia directly. */
export const playerPhotoFiles = pgTable("player_photo_files", {
  slug: text("slug").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  contentType: text("content_type").notNull(),
  data: bytea("data").notNull(),
  bytes: integer("bytes").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const playerImages = pgTable("player_images", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  thumbUrl: text("thumb_url"),
  largeUrl: text("large_url"),
  pageUrl: text("page_url"),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  hostName: text("host_name").notNull(),
  hostToken: text("host_token").notNull(),
  format: text("format").$type<CricketFormat>().notNull().default("IPL"),
  status: text("status")
    .$type<"waiting" | "live" | "paused" | "completed">()
    .notNull()
    .default("waiting"),
  rules: jsonb("rules").$type<AuctionRules>().notNull(),
  currentRoomPlayerId: integer("current_room_player_id"),
  currentBidLakhs: integer("current_bid_lakhs"),
  currentBidTeamId: integer("current_bid_team_id"),
  timerEndsAt: timestamp("timer_ends_at"),
  pausedRemainingMs: integer("paused_remaining_ms"),
  lastEvent: jsonb("last_event").$type<LastAuctionEvent | null>(),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shortCode: text("short_code").notNull(),
    ownerName: text("owner_name").notNull(),
    ownerToken: text("owner_token").notNull(),
    color: text("color").notNull().default("#F59E0B"),
    purseRemainingLakhs: integer("purse_remaining_lakhs").notNull(),
    rtmCardsRemaining: integer("rtm_cards_remaining").notNull().default(0),
    isBot: boolean("is_bot").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("teams_room_idx").on(table.roomId)]
);

export const roomPlayers = pgTable(
  "room_players",
  {
    id: serial("id").primaryKey(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    playerId: integer("player_id").references(() => players.id, {
      onDelete: "set null",
    }),
    customPlayerSnapshot: jsonb("custom_player_snapshot")
      .$type<PlayerSnapshot>()
      .notNull(),
    orderIndex: integer("order_index").notNull(),
    status: text("status")
      .$type<"pending" | "on_block" | "sold" | "unsold">()
      .notNull()
      .default("pending"),
    soldToTeamId: integer("sold_to_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    soldPriceLakhs: integer("sold_price_lakhs"),
    soldViaRtm: boolean("sold_via_rtm").notNull().default(false),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("room_players_room_idx").on(table.roomId),
    index("room_players_status_idx").on(table.roomId, table.status),
  ]
);

export const bids = pgTable(
  "bids",
  {
    id: serial("id").primaryKey(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    roomPlayerId: integer("room_player_id")
      .notNull()
      .references(() => roomPlayers.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    amountLakhs: integer("amount_lakhs").notNull(),
    isJumpBid: boolean("is_jump_bid").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("bids_room_idx").on(table.roomId),
    index("bids_lot_idx").on(table.roomPlayerId),
  ]
);
