"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { PlayerDatabaseSection } from "@/components/PlayerDatabaseSection";
import {
  RULE_PRESETS,
  formatLakhs,
  type AuctionRules,
  type CricketFormat,
} from "@/types/auction";
import {
  ArrowRight,
  Flame,
  Gavel,
  Globe2,
  Link2,
  Radio,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

interface PublicRoomSummary {
  id: number;
  code: string;
  name: string;
  hostName: string;
  format: CricketFormat;
  status: "waiting" | "live" | "paused" | "completed";
  rules: AuctionRules;
  teamCount: number;
  teams: Array<{
    id: number;
    name: string;
    shortCode: string;
    color: string;
    isBot: boolean;
  }>;
  createdAt: string;
}

export default function HomePage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState("ipl_mega");

  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const [recentRooms, setRecentRooms] = useState<PublicRoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const res = await fetch("/api/rooms");
        const data = await res.json();
        if (res.ok && data.rooms) {
          setRecentRooms(data.rooms);
        }
      } catch {
        // Ignore
      } finally {
        setLoadingRooms(false);
      }
    };
    void loadRooms();
  }, []);

  const extractRoomCode = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    // Support pasting full shareable link e.g. https://.../room/IPL-4829?share=1
    const match = trimmed.match(/\/room\/([A-Za-z0-9-]+)/i);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
    return trimmed.toUpperCase();
  };

  const handleJoinByCodeOrLink = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const parsedCode = extractRoomCode(joinInput);
    if (!parsedCode || parsedCode.length < 3) {
      setJoinError("Enter a valid Room Code (e.g. IPL-4829) or Shareable Room URL.");
      return;
    }
    router.push(`/room/${encodeURIComponent(parsedCode)}`);
  };

  const openPresetModal = (presetKey: string) => {
    setSelectedPresetKey(presetKey);
    setCreateOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-[#F9FAFB] broadcast-grid">
      {/* ==================== STICKY BROADCAST NAVBAR ==================== */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0E17]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20">
              <Gavel className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-extrabold uppercase tracking-wider text-white">
                  CRICBID <span className="text-amber-400">PRO</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  <Radio className="h-3 w-3 animate-pulse" />
                  Live Arena
                </span>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-gray-300">
            <a href="#active-rooms" className="hover:text-amber-400 transition">
              Active Rooms
            </a>
            <a href="#custom-rules" className="hover:text-amber-400 transition">
              Custom Rules Engine
            </a>
            <a href="#players-explorer" className="hover:text-amber-400 transition">
              All-Format Players
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => openPresetModal("ipl_mega")}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-md shadow-amber-500/20 transition hover:bg-amber-400"
            >
              <Gavel className="h-4 w-4" />
              <span>Create Room</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================== STADIUM FLOODLIGHT HERO ==================== */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/images/stadium-hero.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0A0E17]/75 via-[#0A0E17]/85 to-[#0A0E17]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Hero Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>IPL • T20I • ODI • Test • Custom Rules & Shareable Links</span>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold uppercase leading-[0.96] tracking-wide text-white">
                Host Live Cricket{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-400">
                  Mega Auctions
                </span>{" "}
                Your Way.
              </h1>

              <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed">
                Draft from <strong className="text-amber-300">420+ current global stars</strong> across{" "}
                <strong className="text-white">IPL, ODI, T20I & Test</strong>{" "}
                formats. Configure custom purse budgets, squad size limits,
                overseas caps, RTM cards, and timer slabs — then invite friends
                instantly with a{" "}
                <strong className="text-emerald-400">one-click shareable room link</strong>.
              </p>

              {/* Format Quick Launch Pills */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Launch With a Custom Format Preset:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.entries(RULE_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => openPresetModal(key)}
                      className="group rounded-xl border border-white/15 bg-[#111827]/90 p-3 text-left transition hover:border-amber-500 hover:bg-[#162033]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                          {preset.format}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-500 group-hover:text-amber-400 transition" />
                      </div>
                      <div className="mt-1.5 font-display text-base font-bold uppercase text-white">
                        {preset.label}
                      </div>
                      <div className="text-[11px] font-mono text-gray-400">
                        Purse {formatLakhs(preset.rules.purseLakhs)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hero Right Action Console */}
            <div className="lg:col-span-5 space-y-4">
              {/* Create Room Primary Card */}
              <div className="rounded-2xl border border-amber-500/35 bg-[#111827]/95 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <Sliders className="h-4 w-4" />
                    Commissioner Studio
                  </span>
                  <span className="font-mono text-xs text-gray-400">
                    100% Custom Limits
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-white">
                  Create a Custom Room
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-400">
                  Set custom purse limits, max overseas players, marquee caps, RTM cards, and AI bot rivals — get a shareable URL in seconds.
                </p>

                <button
                  type="button"
                  onClick={() => openPresetModal("ipl_mega")}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-4 font-display text-xl font-extrabold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-105"
                >
                  <Gavel className="h-5 w-5" />
                  Configure Rules & Create Room
                </button>
              </div>

              {/* Join via Shareable Link or Code Card */}
              <div className="rounded-2xl border border-emerald-500/30 bg-[#111827]/95 p-6 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  <Link2 className="h-4 w-4" />
                  Have a Shareable Link or Room Code?
                </div>
                <form onSubmit={handleJoinByCodeOrLink} className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value)}
                      placeholder="Paste link or code (e.g. IPL-4829)"
                      className="flex-1 rounded-xl border border-white/15 bg-[#0A0E17] px-4 py-3 font-mono text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-emerald-400 transition shrink-0"
                    >
                      Join Room
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  {joinError && (
                    <p className="text-xs text-red-400">{joinError}</p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CUSTOM RULES SHOWCASE ==================== */}
      <section
        id="custom-rules"
        className="mx-auto max-w-7xl px-4 sm:px-6 py-12 border-b border-white/10"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 mb-3">
              <Sliders className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl font-bold uppercase text-white">
              Custom Purse & Reserve Caps
            </h3>
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              Set any franchise budget from ₹5 Cr to ₹1,000 Cr and toggle automatic minimum-squad reserve purse protection.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 mb-3">
              <Globe2 className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl font-bold uppercase text-white">
              Overseas & Marquee Limits
            </h3>
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              Enforce 4, 6, or 8 overseas caps, pick any domestic home nation (or Global XI), and cap marquee stars per franchise.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 mb-3">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl font-bold uppercase text-white">
              RTM Cards & Jump Bids
            </h3>
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              Play authentic Right-To-Match (RTM) steals after the hammer, choose IPL bid slabs or fixed steps, and fire jump bids.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl font-bold uppercase text-white">
              Shareable Links + AI Bots
            </h3>
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              Every room gets a direct `/room/CODE` invite link for friends — plus smart AI bot franchises for solo or mixed tables.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== ACTIVE / RECENT ROOMS LOBBY ==================== */}
      <section
        id="active-rooms"
        className="mx-auto max-w-7xl px-4 sm:px-6 pt-12 pb-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-400" />
              Active & Recent Auction Rooms
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Jump straight into an open room or inspect live auctions in Spectator mode.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openPresetModal("ipl_mega")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition"
          >
            <Sparkles className="h-4 w-4" />
            New Custom Room
          </button>
        </div>

        {loadingRooms ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-2xl border border-white/5 bg-[#111827] animate-pulse"
              />
            ))}
          </div>
        ) : recentRooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-[#111827]/70 p-8 text-center">
            <Gavel className="mx-auto h-8 w-8 text-amber-400 mb-2" />
            <h3 className="font-display text-xl font-bold uppercase text-white">
              No Active Rooms Yet — Be the First Commissioner!
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Create an IPL, ODI, T20I, or Test auction room in 10 seconds and share the invite link with your squad.
            </p>
            <button
              type="button"
              onClick={() => openPresetModal("ipl_mega")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-amber-400"
            >
              Launch First Auction Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentRooms.map((room) => (
              <Link
                key={room.id}
                href={`/room/${room.code}`}
                className="group rounded-2xl border border-white/10 bg-[#111827] p-5 transition hover:border-amber-500/50 hover:bg-[#151f33]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {room.code}
                      </span>
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                        {room.format}
                      </span>
                    </div>
                    <h3 className="mt-1 font-display text-xl font-extrabold uppercase text-white group-hover:text-amber-300 transition">
                      {room.name}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      room.status === "live"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : room.status === "waiting"
                        ? "bg-sky-500/20 text-sky-300"
                        : "bg-gray-500/20 text-gray-300"
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 font-mono">
                  <span>Purse: {formatLakhs(room.rules.purseLakhs)}</span>
                  <span>•</span>
                  <span>Max Squad: {room.rules.maxSquadSize}</span>
                  <span>•</span>
                  <span>
                    Teams: {room.teamCount}/{room.rules.maxTeams}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex items-center -space-x-1.5">
                    {room.teams.slice(0, 6).map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#111827] font-mono text-[9px] font-extrabold text-slate-950"
                        style={{ backgroundColor: t.color }}
                        title={t.name}
                      >
                        {t.shortCode.slice(0, 2)}
                      </span>
                    ))}
                    {room.teamCount === 0 && (
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" /> Open Lobby
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-amber-400 group-hover:translate-x-0.5 transition">
                    Enter Room
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ==================== ALL-FORMAT PLAYER DATABASE EXPLORER ==================== */}
      <PlayerDatabaseSection />

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-white/10 bg-[#070A10] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-amber-400" />
            <span className="font-display text-base font-bold uppercase tracking-wider text-gray-300">
              CRICBID PRO
            </span>
            <span>— Multi-Format Live Cricket Auction Engine</span>
          </div>
          <div>
            Supports IPL • T20I • ODI • Test Pools • Custom Purse & Overseas Limits • Instant Shareable Links
          </div>
        </div>
      </footer>

      {/* ==================== CREATE CUSTOM ROOM MODAL ==================== */}
      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultPresetKey={selectedPresetKey}
      />
    </div>
  );
}
