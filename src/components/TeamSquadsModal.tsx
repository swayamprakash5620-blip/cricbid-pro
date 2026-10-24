"use client";

import React, { useMemo, useState } from "react";
import {
  ROLE_GROUPS,
  computeTeamSquadSummary,
  formatLakhs,
  formatLakhsCompact,
  isPlayerOverseasForRoom,
  type AuctionRules,
  type RoomPlayerDTO,
  type TeamDTO,
} from "@/types/auction";
import { getCountryMeta } from "@/lib/client-utils";
import { PlayerPhoto } from "./PlayerPhoto";
import { Bot, Plane, Users, Wallet, X } from "lucide-react";

const ROLE_STYLE: Record<string, string> = {
  Batsman: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  Wicketkeeper: "text-purple-300 border-purple-500/30 bg-purple-500/10",
  "All-Rounder": "text-amber-300 border-amber-500/30 bg-amber-500/10",
  Bowler: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
};

export function TeamSquadCard({
  team,
  players,
  rules,
  isLeading,
}: {
  team: TeamDTO;
  players: RoomPlayerDTO[];
  rules: AuctionRules;
  isLeading?: boolean;
}) {
  const squad = players.filter((rp) => rp.status === "sold" && rp.soldToTeamId === team.id);
  const summary = computeTeamSquadSummary(team, players, rules);
  const spent = squad.reduce((s, rp) => s + (rp.soldPriceLakhs || 0), 0);
  const pursePct = Math.max(0, Math.min(100, (team.purseRemainingLakhs / Math.max(1, rules.purseLakhs)) * 100));
  const wkShort = summary.wicketkeepersCount < rules.minWicketkeepers;
  const minShort = Math.max(0, rules.minSquadSize - summary.totalPlayers);

  return (
    <div
      className={`rounded-2xl border bg-[#0F1522] p-4 flex flex-col ${
        isLeading ? "border-amber-400 shadow-lg shadow-amber-500/10" : team.isMe ? "border-emerald-500/50" : "border-white/10"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-extrabold text-slate-950"
            style={{ backgroundColor: team.color }}
          >
            {team.shortCode}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-display text-lg font-extrabold uppercase tracking-wide text-white truncate">{team.name}</h4>
              {team.isMe && (
                <span className="rounded bg-emerald-500/20 px-1.5 text-[9px] font-bold uppercase text-emerald-300">You</span>
              )}
              {team.isBot && <Bot className="h-3.5 w-3.5 text-gray-400" />}
            </div>
            <div className="text-[11px] text-gray-400 truncate">Owner: {team.ownerName}</div>
          </div>
        </div>
        {isLeading && (
          <span className="rounded bg-amber-500 px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase text-slate-950">
            Leading Bid
          </span>
        )}
      </div>

      {/* Purse */}
      <div className="mt-3 rounded-xl bg-[#0A0E17] border border-white/5 p-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Purse Balance
            </div>
            <div className="font-mono text-xl font-extrabold text-amber-400 tabular-nums">{formatLakhs(team.purseRemainingLakhs)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-gray-400">Spent</div>
            <div className="font-mono text-sm font-bold text-gray-200 tabular-nums">{formatLakhs(spent)}</div>
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pursePct}%`, backgroundColor: team.color }} />
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
          <Stat label="Squad" value={`${summary.totalPlayers}/${rules.maxSquadSize}`} warn={summary.totalPlayers >= rules.maxSquadSize} />
          <Stat
            label="Overseas"
            value={rules.homeCountry === "NONE" ? `${summary.overseasCount}` : `${summary.overseasCount}/${rules.maxOverseas}`}
            warn={rules.homeCountry !== "NONE" && summary.overseasCount >= rules.maxOverseas}
          />
          <Stat label="RTM" value={`${team.rtmCardsRemaining}`} />
          <Stat label="Max Bid" value={formatLakhsCompact(summary.maxAllowedBidLakhs)} />
        </div>
        {(minShort > 0 || wkShort) && (
          <div className="mt-2 text-[10px] text-amber-300/90">
            {minShort > 0 && <span>Needs {minShort} more to reach min squad ({rules.minSquadSize}). </span>}
            {wkShort && <span>Needs {rules.minWicketkeepers - summary.wicketkeepersCount} more WK.</span>}
          </div>
        )}
      </div>

      {/* Role groups */}
      <div className="mt-3 space-y-2.5 flex-1">
        {ROLE_GROUPS.map((g) => {
          const list = squad
            .filter((rp) => rp.player.role === g.role)
            .sort((a, b) => (b.soldPriceLakhs || 0) - (a.soldPriceLakhs || 0));
          return (
            <div key={g.role}>
              <div className="flex items-center justify-between mb-1">
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ROLE_STYLE[g.role]}`}>
                  {g.label} ({list.length})
                </span>
                {list.length > 0 && (
                  <span className="font-mono text-[10px] text-gray-500">
                    {formatLakhsCompact(list.reduce((s, rp) => s + (rp.soldPriceLakhs || 0), 0))}
                  </span>
                )}
              </div>
              {list.length === 0 ? (
                <div className="text-[11px] text-gray-600 italic pl-1">None yet</div>
              ) : (
                <div className="space-y-1">
                  {list.map((rp) => {
                    const os = isPlayerOverseasForRoom(rp.player, rules);
                    return (
                      <div
                        key={rp.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[#0A0E17] border border-white/5 px-2.5 py-1.5"
                      >
                        <div className="min-w-0 flex items-center gap-1.5">
                          <PlayerPhoto
                            slug={rp.player.slug}
                            name={rp.player.name}
                            country={rp.player.country}
                            imageUrl={rp.player.imageUrl}
                            className="h-8 w-8"
                            rounded="rounded-md"
                            initialsClass="text-[10px]"
                          />
                          <span>{getCountryMeta(rp.player.country).flag}</span>
                          <span className="text-xs font-semibold text-white truncate">{rp.player.name}</span>
                          {os && <Plane className="h-3 w-3 shrink-0 text-indigo-300" aria-label="Overseas" />}
                          {rp.soldViaRtm && (
                            <span className="rounded bg-sky-500/20 px-1 text-[9px] font-bold text-sky-300">RTM</span>
                          )}
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-400 shrink-0 tabular-nums">
                          {formatLakhs(rp.soldPriceLakhs)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-md bg-white/5 px-1 py-1">
      <div className="text-[9px] uppercase text-gray-500">{label}</div>
      <div className={`font-mono text-[11px] font-bold tabular-nums ${warn ? "text-red-400" : "text-gray-100"}`}>{value}</div>
    </div>
  );
}

export function TeamSquadsModal({
  open,
  onClose,
  teams,
  players,
  rules,
  currentBidTeamId,
}: {
  open: boolean;
  onClose: () => void;
  teams: TeamDTO[];
  players: RoomPlayerDTO[];
  rules: AuctionRules;
  currentBidTeamId: number | null;
}) {
  const [filterTeamId, setFilterTeamId] = useState<number | "all">("all");

  const shown = useMemo(
    () => (filterTeamId === "all" ? teams : teams.filter((t) => t.id === filterTeamId)),
    [teams, filterTeamId]
  );

  if (!open) return null;

  const totalSold = players.filter((p) => p.status === "sold").length;
  const totalSpent = players.reduce((s, p) => s + (p.status === "sold" ? p.soldPriceLakhs || 0 : 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="mx-auto max-w-7xl rounded-2xl border border-amber-500/30 bg-[#111827] p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-amber-400" />
              All Franchises — Squads & Purse
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {teams.length} teams • {totalSold} players sold • {formatLakhs(totalSpent)} spent in total. Updates live.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterTeamId}
              onChange={(e) => setFilterTeamId(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 text-xs font-bold text-white"
            >
              <option value="all">Show All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.shortCode} — {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Purse leaderboard strip */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {[...teams]
            .sort((a, b) => b.purseRemainingLakhs - a.purseRemainingLakhs)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTeamId(filterTeamId === t.id ? "all" : t.id)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                  filterTeamId === t.id ? "border-amber-400 bg-amber-500/10" : "border-white/10 bg-[#0A0E17] hover:border-white/25"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="font-mono text-xs font-bold text-white">{t.shortCode}</span>
                </div>
                <div className="font-mono text-xs font-bold text-amber-400">{formatLakhsCompact(t.purseRemainingLakhs)}</div>
              </button>
            ))}
        </div>

        {teams.length === 0 ? (
          <p className="mt-6 text-center text-sm text-gray-400">No franchises have joined yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {shown.map((t) => (
              <TeamSquadCard key={t.id} team={t} players={players} rules={rules} isLeading={currentBidTeamId === t.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
