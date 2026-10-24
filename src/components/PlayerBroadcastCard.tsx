"use client";

import React, { useState } from "react";
import {
  formatLakhs,
  type CricketFormat,
  type PlayerSnapshot,
} from "@/types/auction";
import { getCountryMeta } from "@/lib/client-utils";
import { PlayerPhoto } from "./PlayerPhoto";
import { Award, Flame, Globe2, ShieldCheck, Sparkles } from "lucide-react";

interface PlayerBroadcastCardProps {
  player: PlayerSnapshot;
  preferredFormat?: CricketFormat;
  variant?: "catalog" | "spotlight";
  isOverseasInRoom?: boolean;
  onActionClick?: () => void;
  actionLabel?: string;
}

const ROLE_COLORS: Record<string, string> = {
  Batsman: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  Bowler: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "All-Rounder": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Wicketkeeper: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

export function PlayerBroadcastCard({
  player,
  preferredFormat = "ALL",
  variant = "catalog",
  isOverseasInRoom,
  onActionClick,
  actionLabel,
}: PlayerBroadcastCardProps) {
  const availableFormats: Exclude<CricketFormat, "ALL">[] =
    player.formats.length > 0 ? player.formats : ["IPL"];

  const defaultTab =
    preferredFormat !== "ALL" &&
    availableFormats.includes(preferredFormat as Exclude<CricketFormat, "ALL">)
      ? (preferredFormat as Exclude<CricketFormat, "ALL">)
      : availableFormats[0];

  const [selectedStatTab, setSelectedStatTab] =
    useState<Exclude<CricketFormat, "ALL">>(defaultTab);

  const allTabs: Exclude<CricketFormat, "ALL">[] = (["IPL", "T20I", "ODI", "TEST"] as const).filter((f) =>
    Boolean(player.stats?.[f.toLowerCase() as "ipl" | "t20i" | "odi" | "test"])
  );
  const activeTab = (allTabs.length ? allTabs : availableFormats).includes(selectedStatTab)
    ? selectedStatTab
    : (allTabs.length ? allTabs : availableFormats)[0];

  const statKey = activeTab.toLowerCase() as "ipl" | "t20i" | "odi" | "test";
  const currentStats =
    player.stats?.[statKey] ||
    player.stats?.ipl ||
    player.stats?.t20i ||
    player.stats?.odi ||
    player.stats?.test;

  const countryMeta = getCountryMeta(player.country);
  const showOverseasBadge =
    isOverseasInRoom !== undefined ? isOverseasInRoom : player.isOverseasDefault;
  const roleClass = ROLE_COLORS[player.role] || ROLE_COLORS.Batsman;
  const profile = player.profile ?? null;
  const inactive = new Set(profile?.inactiveFormats ?? []);
  // Show stat tabs for every format the player has data for (active first, then inactive)
  const statFormats: Exclude<CricketFormat, "ALL">[] = (["IPL", "T20I", "ODI", "TEST"] as const).filter(
    (f) => Boolean(player.stats?.[f.toLowerCase() as "ipl" | "t20i" | "odi" | "test"])
  );
  const tabFormats = statFormats.length > 0 ? statFormats : availableFormats;
  const latest = profile?.latestIplSeason ?? null;
  const lastPlayedYear = (f: Exclude<CricketFormat, "ALL">) =>
    f === "IPL" ? profile?.lastIplSeason : profile?.lastPlayed?.[f]?.slice(0, 4);

  // ============================ SPOTLIGHT (ON THE BLOCK) ============================
  if (variant === "spotlight") {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br ${countryMeta.gradient} bg-[#111827] shadow-2xl`}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative grid grid-cols-1 sm:grid-cols-12">
          {/* ---------- Big player photo panel ---------- */}
          <div className="relative sm:col-span-5 lg:col-span-5 xl:col-span-4">
            <PlayerPhoto
              key={player.slug}
              slug={player.slug}
              name={player.name}
              country={player.country}
              imageUrl={player.imageUrl}
              quality="large"
              fit="showcase"
              eager
              rounded="rounded-none"
              className="h-72 sm:h-full sm:min-h-[340px] w-full border-0 border-b sm:border-b-0 sm:border-r border-white/10"
              initialsClass="text-7xl"
            />
            {/* Gradient overlay + name strip */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-[#0A0E17]/10 to-transparent" />
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-white shadow">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                On the Block
              </span>
              {player.isMarquee && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-950 shadow">
                  <Flame className="h-3 w-3" />
                  Marquee
                </span>
              )}
            </div>
            <div className="absolute top-3 right-3 rounded-xl bg-black/70 border border-amber-400/40 px-2.5 py-1.5 text-center shadow">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">OVR</div>
              <div className="font-mono text-xl font-extrabold leading-none text-amber-400">{player.rating}</div>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl drop-shadow">{countryMeta.flag}</span>
                <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[11px] font-bold text-gray-200">
                  {countryMeta.code}
                </span>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleClass} bg-black/50`}>
                  {player.role}
                </span>
              </div>
              <h2 className="mt-1 font-display text-3xl sm:text-[2rem] font-extrabold uppercase leading-none tracking-wide text-white drop-shadow-lg sm:hidden">
                {player.name}
              </h2>
            </div>
          </div>

          {/* ---------- Details panel ---------- */}
          <div className="sm:col-span-7 lg:col-span-7 xl:col-span-8 p-5 md:p-6 flex flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-xs font-semibold text-gray-200">
                {countryMeta.flag} {player.country}
              </span>
              {showOverseasBadge ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-200">
                  <Globe2 className="h-3 w-3" />
                  Overseas
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  Domestic
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  player.isCapped
                    ? "bg-white/5 border-white/15 text-gray-300"
                    : "bg-teal-500/15 border-teal-400/30 text-teal-300"
                }`}
              >
                {!player.isCapped && <Sparkles className="h-3 w-3" />}
                {player.isCapped ? "Capped" : "Uncapped"}
              </span>
              {profile?.lastIplSeason ? (
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  IPL {profile.lastIplSeason}: {player.franchiseTag}
                </span>
              ) : (
                <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 font-mono text-[11px] text-gray-300">
                  Team: {player.franchiseTag}
                </span>
              )}
              {profile?.age ? (
                <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] text-gray-300">
                  Age {profile.age}
                </span>
              ) : null}
              {profile?.internationalRetired && (
                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
                  Retired from internationals
                </span>
              )}
            </div>

            <h2 className="hidden sm:block font-display text-4xl lg:text-5xl font-extrabold uppercase leading-none tracking-wide text-white">
              {player.name}
            </h2>

            {/* Profile detail grid */}
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <Detail label="Role" value={profile?.roleDetail || player.role} />
              <Detail label="Auction Set" value={player.setCategory} />
              <Detail label="Batting" value={player.battingStyle} />
              <Detail label="Bowling" value={player.bowlingStyle === "None" ? "—" : player.bowlingStyle} />
            </div>

            {/* Base price + formats */}
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Career stats by format</div>
                <div className="flex flex-wrap gap-1.5">
                  {tabFormats.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setSelectedStatTab(fmt)}
                      title={inactive.has(fmt) ? `Not played ${fmt} since ${lastPlayedYear(fmt) ?? "—"}` : undefined}
                      className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold transition ${
                        activeTab === fmt
                          ? "bg-amber-500 text-slate-950 shadow-sm"
                          : inactive.has(fmt)
                          ? "bg-black/30 text-gray-500 border border-white/5 line-through decoration-gray-600"
                          : "bg-black/40 text-gray-300 hover:bg-white/10 border border-white/10"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-black/45 border border-amber-500/30 px-4 py-2.5 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Base Price</div>
                <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
                  {formatLakhs(player.basePriceLakhs)}
                </div>
              </div>
            </div>

            {/* Stats strip */}
            {currentStats && (
              <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2.5 rounded-xl bg-[#0A0E17]/75 border border-white/10 p-3">
                <Stat label={`${activeTab} Mat`} value={String(currentStats.matches)} />
                <Stat label="Runs" value={currentStats.runs.toLocaleString()} />
                <Stat
                  label="Bat Avg"
                  value={currentStats.average > 0 ? currentStats.average.toFixed(1) : "—"}
                  tone="text-emerald-400"
                />
                <Stat
                  label="Strike Rate"
                  value={currentStats.strikeRate > 0 ? currentStats.strikeRate.toFixed(1) : "—"}
                  tone="text-amber-300"
                />
                <Stat label="Wickets" value={String(currentStats.wickets)} tone="text-sky-300" />
                <Stat
                  label={currentStats.wickets > 0 ? "Economy" : "Best"}
                  value={currentStats.wickets > 0 ? currentStats.economy.toFixed(2) : currentStats.best}
                />
                <Stat label="High Score" value={currentStats.highScore || "—"} />
                <Stat
                  label="100s / 50s"
                  value={
                    currentStats.hundreds != null || currentStats.fifties != null
                      ? `${currentStats.hundreds ?? 0} / ${currentStats.fifties ?? 0}`
                      : "—"
                  }
                />
                <Stat label="Best Bowling" value={currentStats.bestBowling || "—"} tone="text-sky-300" />
                <div className="col-span-3 flex items-end">
                  {inactive.has(activeTab) && (
                    <span className="rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-1 text-[10px] font-semibold text-rose-300">
                      Not played {activeTab} since {lastPlayedYear(activeTab) ?? "—"}
                    </span>
                  )}
                </div>
              </div>
            )}

            {latest && (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    IPL {latest.season} season • {latest.team}
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">{latest.matches} matches</span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
                  <Stat label="Runs" value={String(latest.runs)} />
                  <Stat label="Average" value={latest.average ? latest.average.toFixed(1) : "—"} tone="text-emerald-400" />
                  <Stat label="Strike Rate" value={latest.strikeRate ? latest.strikeRate.toFixed(1) : "—"} tone="text-amber-300" />
                  <Stat label="High Score" value={latest.highScore || "—"} />
                  <Stat label="Wickets" value={String(latest.wickets)} tone="text-sky-300" />
                  <Stat label="Economy" value={latest.wickets || latest.economy ? latest.economy.toFixed(2) : "—"} />
                </div>
              </div>
            )}

            {profile?.sources && profile.sources.length > 0 && (
              <div className="mt-2 text-[10px] text-gray-500">
                {profile.statsAsOf ? `International stats as of ${profile.statsAsOf}` : "International stats"} •{" "}
                {profile.iplDataThrough ? `IPL stats through ${profile.iplDataThrough} season` : ""} • Source:{" "}
                {profile.sources.join(" + ")}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================ CATALOG CARD ============================
  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#111827] p-4 transition-all hover:border-amber-500/40 hover:bg-[#141d2f]">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <PlayerPhoto
              slug={player.slug}
              name={player.name}
              country={player.country}
              imageUrl={player.imageUrl}
              className="h-16 w-16"
              showFlag
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white truncate">
                  {player.name}
                </h3>
                {player.isMarquee && (
                  <Award className="h-4 w-4 shrink-0 text-amber-400" aria-label="Marquee Star" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>
                  {countryMeta.flag} {player.country}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px] text-gray-300">{player.franchiseTag}</span>
                {profile?.age ? (
                  <>
                    <span>•</span>
                    <span>Age {profile.age}</span>
                  </>
                ) : null}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {player.battingStyle}
                {player.bowlingStyle !== "None" ? ` • ${player.bowlingStyle}` : ""}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-mono text-sm font-bold text-amber-400 tabular-nums">
              {formatLakhs(player.basePriceLakhs)}
            </div>
            <div className="font-mono text-[10px] text-gray-400">OVR {player.rating}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${roleClass}`}>{player.role}</span>
            {profile && player.formats.length === 0 && (
              <span className="rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                {profile.internationalRetired ? "Retired" : "Inactive 2026"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {tabFormats.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setSelectedStatTab(fmt)}
                title={inactive.has(fmt) ? `Not played since ${lastPlayedYear(fmt) ?? "—"}` : undefined}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold transition ${
                  activeTab === fmt
                    ? "bg-amber-500 text-slate-950"
                    : inactive.has(fmt)
                    ? "bg-white/5 text-gray-600 line-through"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {currentStats && (
          <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-lg bg-[#0A0E17]/80 border border-white/5 px-2.5 py-2 text-center">
            <MiniStat label="Mat" value={String(currentStats.matches)} />
            <MiniStat label="Runs" value={String(currentStats.runs)} />
            <MiniStat
              label={activeTab === "TEST" ? "Avg" : "SR"}
              value={activeTab === "TEST" ? currentStats.average.toFixed(1) : currentStats.strikeRate.toFixed(1)}
              tone="text-emerald-400"
            />
            <MiniStat label="Wkts" value={String(currentStats.wickets)} tone="text-sky-400" />
          </div>
        )}
      </div>

      {onActionClick && actionLabel && (
        <button
          type="button"
          onClick={onActionClick}
          className="mt-3 w-full rounded-lg bg-amber-500/15 border border-amber-500/30 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-500 hover:text-slate-950"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/30 border border-white/10 px-2.5 py-1.5 min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-xs font-semibold text-gray-100 truncate" title={value}>
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-400">{label}</div>
      <div className={`font-mono text-sm md:text-base font-bold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, tone = "text-gray-200" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase text-gray-500">{label}</div>
      <div className={`font-mono text-xs font-bold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}
