"use client";

import React, { useMemo, useState } from "react";
import {
  formatLakhs,
  formatLakhsCompact,
  isPlayerOverseasForRoom,
  type AuctionRules,
  type CricketFormat,
  type RoomPlayerDTO,
  type TeamDTO,
} from "@/types/auction";
import { getCountryMeta } from "@/lib/client-utils";
import { PlayerBroadcastCard } from "./PlayerBroadcastCard";
import { PlayerPhoto } from "./PlayerPhoto";
import { SetPhotoControl } from "./SetPhotoControl";
import { ListOrdered, Plane, Search, X } from "lucide-react";

const ROLE_STYLE: Record<string, string> = {
  Batsman: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  Wicketkeeper: "text-purple-300 bg-purple-500/10 border-purple-500/30",
  "All-Rounder": "text-amber-300 bg-amber-500/10 border-amber-500/30",
  Bowler: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
};

type Tab = "upcoming" | "sold" | "unsold";

export function UpcomingPlayersModal({
  open,
  onClose,
  players,
  teams,
  rules,
  format,
  canNominate,
  onNominate,
  canEditPhotos = false,
}: {
  open: boolean;
  onClose: () => void;
  players: RoomPlayerDTO[];
  teams: TeamDTO[];
  rules: AuctionRules;
  format: CricketFormat;
  canNominate: boolean;
  onNominate: (roomPlayerId: number) => void;
  canEditPhotos?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [setCat, setSetCat] = useState("ALL");
  const [osFilter, setOsFilter] = useState<"ALL" | "OS" | "DOM">("ALL");
  const [previewId, setPreviewId] = useState<number | null>(null);

  const upcoming = useMemo(() => players.filter((p) => p.status === "pending"), [players]);
  const sold = useMemo(
    () => players.filter((p) => p.status === "sold").sort((a, b) => (b.soldPriceLakhs || 0) - (a.soldPriceLakhs || 0)),
    [players]
  );
  const unsold = useMemo(() => players.filter((p) => p.status === "unsold"), [players]);
  const onBlock = players.find((p) => p.status === "on_block");

  const queuePos = useMemo(() => {
    const m = new Map<number, number>();
    upcoming.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [upcoming]);

  const source = tab === "upcoming" ? upcoming : tab === "sold" ? sold : unsold;
  const filtered = source.filter((rp) => {
    if (role !== "ALL" && rp.player.role !== role) return false;
    if (setCat !== "ALL" && rp.player.setCategory !== setCat) return false;
    const os = isPlayerOverseasForRoom(rp.player, rules);
    if (osFilter === "OS" && !os) return false;
    if (osFilter === "DOM" && os) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!`${rp.player.name} ${rp.player.country} ${rp.player.franchiseTag}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (!open) return null;

  const preview = players.find((p) => p.id === previewId) || null;
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const roleCounts = ["Batsman", "Wicketkeeper", "All-Rounder", "Bowler"].map((r) => ({
    r,
    n: upcoming.filter((p) => p.player.role === r).length,
  }));

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="mx-auto max-w-7xl rounded-2xl border border-sky-500/30 bg-[#111827] p-4 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              <ListOrdered className="h-6 w-6 text-sky-400" />
              Auction Player List
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {upcoming.length} upcoming • {sold.length} sold • {unsold.length} unsold
              {onBlock && (
                <>
                  {" "}• <span className="text-amber-300">On the block: {onBlock.player.name}</span>
                </>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roleCounts.map(({ r, n }) => (
                <span key={r} className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${ROLE_STYLE[r]}`}>
                  {r === "Batsman" ? "Batters" : r + "s"} upcoming: {n}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs + filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(
            [
              ["upcoming", `Upcoming (${upcoming.length})`],
              ["sold", `Sold (${sold.length})`],
              ["unsold", `Unsold (${unsold.length})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                tab === k ? "bg-sky-500 text-slate-950" : "bg-[#0A0E17] text-gray-300 border border-white/10"
              }`}
            >
              {label}
            </button>
          ))}

          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player / country / team..."
              className="w-full rounded-lg border border-white/10 bg-[#0A0E17] pl-8 pr-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
            />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-white/10 bg-[#0A0E17] px-2.5 py-1.5 text-xs text-white">
            <option value="ALL">All Roles</option>
            <option value="Batsman">Batters</option>
            <option value="Wicketkeeper">Wicketkeepers</option>
            <option value="All-Rounder">All-Rounders</option>
            <option value="Bowler">Bowlers</option>
          </select>
          <select value={setCat} onChange={(e) => setSetCat(e.target.value)} className="rounded-lg border border-white/10 bg-[#0A0E17] px-2.5 py-1.5 text-xs text-white">
            <option value="ALL">All Sets</option>
            {["Marquee", "Batsmen", "All-Rounders", "Wicketkeepers", "Fast Bowlers", "Spinners", "Uncapped"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {rules.homeCountry !== "NONE" && (
            <select
              value={osFilter}
              onChange={(e) => setOsFilter(e.target.value as "ALL" | "OS" | "DOM")}
              className="rounded-lg border border-white/10 bg-[#0A0E17] px-2.5 py-1.5 text-xs text-white"
            >
              <option value="ALL">Domestic + Overseas</option>
              <option value="DOM">Domestic only</option>
              <option value="OS">Overseas only</option>
            </select>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Table */}
          <div className={`${preview ? "lg:col-span-8" : "lg:col-span-12"} rounded-xl border border-white/10 overflow-hidden`}>
            <div className="max-h-[62vh] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0A0E17] text-[10px] uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-3 py-2">{tab === "upcoming" ? "#" : ""}</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2 hidden md:table-cell">Set</th>
                    <th className="px-3 py-2 hidden lg:table-cell">Style</th>
                    <th className="px-3 py-2 text-right">Base</th>
                    <th className="px-3 py-2 text-right hidden sm:table-cell">OVR</th>
                    <th className="px-3 py-2 text-right">{tab === "sold" ? "Sold To" : tab === "upcoming" && canNominate ? "" : "Formats"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                        No players match these filters.
                      </td>
                    </tr>
                  )}
                  {filtered.map((rp, idx) => {
                    const os = isPlayerOverseasForRoom(rp.player, rules);
                    const prevSet = idx > 0 ? filtered[idx - 1].player.setCategory : null;
                    const showSetHeader = tab === "upcoming" && rp.player.setCategory !== prevSet;
                    const buyer = rp.soldToTeamId ? teamMap.get(rp.soldToTeamId) : null;
                    return (
                      <React.Fragment key={rp.id}>
                        {showSetHeader && (
                          <tr className="bg-sky-500/5">
                            <td colSpan={8} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-300">
                              {rp.player.setCategory} Set
                            </td>
                          </tr>
                        )}
                        <tr
                          onClick={() => setPreviewId(previewId === rp.id ? null : rp.id)}
                          className={`cursor-pointer border-t border-white/5 hover:bg-white/5 ${previewId === rp.id ? "bg-sky-500/10" : ""}`}
                        >
                          <td className="px-3 py-2 font-mono text-gray-500">{tab === "upcoming" ? queuePos.get(rp.id) : ""}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <PlayerPhoto
                                slug={rp.player.slug}
                                name={rp.player.name}
                                country={rp.player.country}
                                imageUrl={rp.player.imageUrl}
                                className="h-9 w-9"
                                rounded="rounded-lg"
                                initialsClass="text-xs"
                              />
                              <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span>{getCountryMeta(rp.player.country).flag}</span>
                              <span className="font-semibold text-white">{rp.player.name}</span>
                              {rp.player.isMarquee && <span className="text-amber-400" title="Marquee">★</span>}
                              {os && <Plane className="h-3 w-3 text-indigo-300" aria-label="Overseas" />}
                              {!rp.player.isCapped && (
                                <span className="rounded bg-teal-500/15 px-1 text-[9px] font-bold text-teal-300">UNCAPPED</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {rp.player.country} • {rp.player.franchiseTag}
                            </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${ROLE_STYLE[rp.player.role]}`}>
                              {rp.player.role}
                            </span>
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell text-gray-300">{rp.player.setCategory}</td>
                          <td className="px-3 py-2 hidden lg:table-cell text-[10px] text-gray-400">
                            {rp.player.battingStyle}
                            {rp.player.bowlingStyle !== "None" ? ` • ${rp.player.bowlingStyle}` : ""}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-amber-400">
                            {formatLakhsCompact(rp.player.basePriceLakhs)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-300 hidden sm:table-cell">{rp.player.rating}</td>
                          <td className="px-3 py-2 text-right">
                            {tab === "sold" ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: buyer?.color || "#999" }} />
                                <span className="font-mono text-[10px] font-bold text-white">{buyer?.shortCode || "—"}</span>
                                <span className="font-mono text-[11px] font-bold text-emerald-400">{formatLakhs(rp.soldPriceLakhs)}</span>
                              </span>
                            ) : tab === "upcoming" && canNominate ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNominate(rp.id);
                                }}
                                className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300 hover:bg-amber-500 hover:text-slate-950"
                              >
                                Bring Up
                              </button>
                            ) : (
                              <span className="font-mono text-[10px] text-gray-400">{rp.player.formats.join(" • ")}</span>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="lg:col-span-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Player Preview</span>
                <button type="button" onClick={() => setPreviewId(null)} className="text-xs text-gray-400 hover:text-white">
                  Close
                </button>
              </div>
              <PlayerBroadcastCard
                key={preview.id}
                player={preview.player}
                preferredFormat={format}
                variant="catalog"
                isOverseasInRoom={isPlayerOverseasForRoom(preview.player, rules)}
              />
              <div className="rounded-xl border border-white/10 bg-[#0A0E17] p-3 text-xs text-gray-300 space-y-1">
                <div>
                  Base price: <strong className="font-mono text-amber-400">{formatLakhs(preview.player.basePriceLakhs)}</strong>
                </div>
                {canNominate !== undefined && canEditPhotos && (
                  <div className="pt-1">
                    <SetPhotoControl slug={preview.player.slug} name={preview.player.name} />
                  </div>
                )}
                <div>Batting: {preview.player.battingStyle}</div>
                <div>Bowling: {preview.player.bowlingStyle}</div>
                {preview.status === "pending" && (
                  <div>
                    Queue position: <strong className="font-mono text-white">#{queuePos.get(preview.id)}</strong> of {upcoming.length}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
