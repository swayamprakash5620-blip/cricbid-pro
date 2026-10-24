"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PlayerBroadcastCard } from "./PlayerBroadcastCard";
import type {
  CricketFormat,
  PlayerRole,
  PlayerSetCategory,
  PlayerSnapshot,
} from "@/types/auction";
import {
  Filter,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";

export function PlayerDatabaseSection() {
  const [players, setPlayers] = useState<PlayerSnapshot[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [formatCounts, setFormatCounts] = useState<Record<string, number>>({
    ALL: 0,
    IPL: 0,
    T20I: 0,
    ODI: 0,
    TEST: 0,
  });

  const [format, setFormat] = useState<CricketFormat>("ALL");
  const [role, setRole] = useState<string>("ALL");
  const [country, setCountry] = useState<string>("ALL");
  const [setCategory, setSetCategory] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [visibleCount, setVisibleCount] = useState<number>(18);

  // Add Custom Player Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCountry, setCustomCountry] = useState("India");
  const [customRole, setCustomRole] = useState<PlayerRole>("All-Rounder");
  const [customSet, setCustomSet] = useState<PlayerSetCategory>("All-Rounders");
  const [customBasePrice, setCustomBasePrice] = useState(100);
  const [customRating, setCustomRating] = useState(86);
  const [customFormats, setCustomFormats] = useState<
    Exclude<CricketFormat, "ALL">[]
  >(["IPL", "T20I", "ODI"]);
  const [customRuns, setCustomRuns] = useState(1250);
  const [customWickets, setCustomWickets] = useState(28);
  const [customSr, setCustomSr] = useState(146.5);
  const [adding, setAdding] = useState(false);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        format,
        role,
        country,
        set: setCategory,
        q: search,
      });
      const res = await fetch(`/api/players?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setPlayers(data.players || []);
        if (data.countries) setCountries(data.countries);
        if (data.formatCounts) setFormatCounts(data.formatCounts);
      }
    } catch {
      // Ignore network hiccup
    } finally {
      setLoading(false);
    }
  }, [format, role, country, setCategory, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPlayers();
    }, 150);
    return () => clearTimeout(timer);
  }, [loadPlayers]);

  const toggleFormatCheck = (fmt: Exclude<CricketFormat, "ALL">) => {
    setCustomFormats((prev) =>
      prev.includes(fmt)
        ? prev.length > 1
          ? prev.filter((x) => x !== fmt)
          : prev
        : [...prev, fmt]
    );
  };

  const handleCreateCustomPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customName,
          country: customCountry,
          role: customRole,
          setCategory: customSet,
          basePriceLakhs: customBasePrice,
          rating: customRating,
          formats: customFormats,
          runs: customRuns,
          wickets: customWickets,
          strikeRate: customSr,
        }),
      });
      if (res.ok) {
        setCustomName("");
        setShowAddModal(false);
        void loadPlayers();
      }
    } finally {
      setAdding(false);
    }
  };

  const FORMAT_TABS: Array<{ key: CricketFormat; label: string }> = [
    { key: "ALL", label: "All Formats" },
    { key: "IPL", label: "IPL T20" },
    { key: "T20I", label: "T20I" },
    { key: "ODI", label: "ODI" },
    { key: "TEST", label: "Test" },
  ];

  const displayedPlayers = players.slice(0, visibleCount);

  return (
    <section id="players-explorer" className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
            <Users className="h-3.5 w-3.5" />
            Global Multi-Format Roster
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">
            Current World Cricket Player Pool
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Scout active international & franchise stars across IPL, T20I, ODI, and Test cricket — or add custom players to the pool.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950"
        >
          <Plus className="h-4 w-4" />
          Add Custom Player
        </button>
      </div>

      {/* Format Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-white/10">
        {FORMAT_TABS.map((tab) => {
          const active = format === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setFormat(tab.key);
                setVisibleCount(18);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition ${
                active
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-[#111827] text-gray-300 border border-white/10 hover:border-white/25"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] ${
                  active ? "bg-black/20 text-slate-950" : "bg-white/10 text-amber-300"
                }`}
              >
                {formatCounts[tab.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Multi-Facet Filter Bar */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-2xl border border-white/10 bg-[#111827]/90 p-3.5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Kohli, Bumrah, Cummins, Klaasen, RCB, spin..."
            className="w-full rounded-xl border border-white/10 bg-[#0A0E17] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#0A0E17] px-3 py-2.5 text-xs font-semibold text-gray-200 focus:border-amber-500 focus:outline-none"
        >
          <option value="ALL">All Roles</option>
          <option value="Batsman">Batsmen</option>
          <option value="Bowler">Bowlers</option>
          <option value="All-Rounder">All-Rounders</option>
          <option value="Wicketkeeper">Wicketkeepers</option>
        </select>

        <select
          value={setCategory}
          onChange={(e) => setSetCategory(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#0A0E17] px-3 py-2.5 text-xs font-semibold text-gray-200 focus:border-amber-500 focus:outline-none"
        >
          <option value="ALL">All Auction Sets</option>
          <option value="Marquee">Marquee Set</option>
          <option value="Batsmen">Specialist Batsmen</option>
          <option value="All-Rounders">All-Rounders Set</option>
          <option value="Wicketkeepers">Wicketkeepers Set</option>
          <option value="Fast Bowlers">Fast Bowlers Set</option>
          <option value="Spinners">Spinners Set</option>
          <option value="Uncapped">Uncapped Stars</option>
        </select>

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#0A0E17] px-3 py-2.5 text-xs font-semibold text-gray-200 focus:border-amber-500 focus:outline-none"
        >
          <option value="ALL">All Countries ({countries.length})</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-xl border border-white/5 bg-[#111827] animate-pulse"
            />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#111827] p-10 text-center">
          <Filter className="mx-auto h-8 w-8 text-gray-500" />
          <p className="mt-2 font-display text-xl font-bold uppercase text-white">
            No matching players found
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Try resetting your format or role filters, or add a custom player!
          </p>
          <button
            type="button"
            onClick={() => {
              setFormat("ALL");
              setRole("ALL");
              setCountry("ALL");
              setSetCategory("ALL");
              setSearch("");
            }}
            className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold uppercase text-slate-950"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedPlayers.map((player) => (
              <PlayerBroadcastCard
                key={player.slug}
                player={player}
                preferredFormat={format}
                variant="catalog"
              />
            ))}
          </div>

          {visibleCount < players.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 18)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#111827] px-6 py-3 text-xs font-bold uppercase tracking-wider text-amber-300 transition hover:border-amber-500/40 hover:bg-white/5"
              >
                Show More Players ({players.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Custom Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-[#111827] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Add Custom Player to Global Pool
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Added players become immediately available across new auction rooms matching their formats.
            </p>

            <form onSubmit={handleCreateCustomPlayer} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-300 mb-1">
                    Player Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Vaibhav Suryavanshi"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    required
                    value={customCountry}
                    onChange={(e) => setCustomCountry(e.target.value)}
                    placeholder="India"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                    Role
                  </label>
                  <select
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value as PlayerRole)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-2 py-2 text-xs text-white"
                  >
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                    Set
                  </label>
                  <select
                    value={customSet}
                    onChange={(e) => setCustomSet(e.target.value as PlayerSetCategory)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-2 py-2 text-xs text-white"
                  >
                    <option value="Marquee">Marquee</option>
                    <option value="Batsmen">Batsmen</option>
                    <option value="All-Rounders">All-Rounders</option>
                    <option value="Wicketkeepers">Wicketkeepers</option>
                    <option value="Fast Bowlers">Fast Bowlers</option>
                    <option value="Spinners">Spinners</option>
                    <option value="Uncapped">Uncapped</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                    Base (Lakhs)
                  </label>
                  <select
                    value={customBasePrice}
                    onChange={(e) => setCustomBasePrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-2 py-2 font-mono text-xs text-amber-300"
                  >
                    <option value={30}>₹30 L</option>
                    <option value={50}>₹50 L</option>
                    <option value={75}>₹75 L</option>
                    <option value={100}>₹1.00 Cr</option>
                    <option value={150}>₹1.50 Cr</option>
                    <option value={200}>₹2.00 Cr</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                    OVR Rating
                  </label>
                  <input
                    type="number"
                    min={65}
                    max={99}
                    value={customRating}
                    onChange={(e) => setCustomRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-2.5 py-2 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1.5">
                  Eligible Cricket Formats
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["IPL", "T20I", "ODI", "TEST"] as const).map((fmt) => {
                    const checked = customFormats.includes(fmt);
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => toggleFormatCheck(fmt)}
                        className={`rounded-lg border px-3 py-1 font-mono text-xs font-bold transition ${
                          checked
                            ? "border-amber-500 bg-amber-500/20 text-amber-300"
                            : "border-white/10 bg-[#0A0E17] text-gray-400"
                        }`}
                      >
                        {checked ? "✓ " : ""}
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    Career Runs
                  </label>
                  <input
                    type="number"
                    value={customRuns}
                    onChange={(e) => setCustomRuns(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-2.5 py-1.5 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    Strike Rate
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={customSr}
                    onChange={(e) => setCustomSr(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-2.5 py-1.5 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    Wickets
                  </label>
                  <input
                    type="number"
                    value={customWickets}
                    onChange={(e) => setCustomWickets(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-2.5 py-1.5 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold uppercase text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {adding ? "Saving..." : "Save Player"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
