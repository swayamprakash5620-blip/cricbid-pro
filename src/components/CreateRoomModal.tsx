"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FRANCHISE_PRESETS,
  RULE_PRESETS,
  formatLakhs,
  type AuctionRules,
  type CricketFormat,
} from "@/types/auction";
import { getOrCreateParticipantToken } from "@/lib/client-utils";
import {
  Bot,
  Gavel,
  Sliders,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  defaultPresetKey?: string;
}

export function CreateRoomModal({
  open,
  onClose,
  defaultPresetKey = "ipl_mega",
}: CreateRoomModalProps) {
  const router = useRouter();
  const initialPreset = RULE_PRESETS[defaultPresetKey] || RULE_PRESETS.ipl_mega;

  const [selectedPreset, setSelectedPreset] = useState<string>(defaultPresetKey);
  const [roomName, setRoomName] = useState("IPL 2026 Mega Auction Room");
  const [hostName, setHostName] = useState("Commissioner");
  const [format, setFormat] = useState<CricketFormat>(initialPreset.format);
  const [rules, setRules] = useState<AuctionRules>({ ...initialPreset.rules });

  const [createHostTeam, setCreateHostTeam] = useState(true);
  const [selectedFranchiseIdx, setSelectedFranchiseIdx] = useState(0);
  const [customTeamName, setCustomTeamName] = useState(FRANCHISE_PRESETS[0].name);
  const [customShortCode, setCustomShortCode] = useState(
    FRANCHISE_PRESETS[0].shortCode
  );
  const [customTeamColor, setCustomTeamColor] = useState(
    FRANCHISE_PRESETS[0].color
  );
  const [initialBotCount, setInitialBotCount] = useState(3);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const applyPreset = (key: string) => {
    const preset = RULE_PRESETS[key];
    if (!preset) return;
    setSelectedPreset(key);
    setFormat(preset.format);
    setRules({ ...preset.rules });
    if (key === "ipl_mega") setRoomName("IPL 2026 Mega Auction");
    if (key === "odi_world_xi") setRoomName("ODI World XI Super Draft");
    if (key === "test_championship") setRoomName("WTC Red-Ball Championship Draft");
    if (key === "quick_party") setRoomName("Friday Night All-Format Cricket Draft");
  };

  const selectFranchisePreset = (idx: number) => {
    setSelectedFranchiseIdx(idx);
    const p = FRANCHISE_PRESETS[idx];
    if (p) {
      setCustomTeamName(p.name);
      setCustomShortCode(p.shortCode);
      setCustomTeamColor(p.color);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const hostToken = getOrCreateParticipantToken();
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName,
          hostName,
          hostToken,
          format,
          rules,
          createHostTeam,
          teamName: customTeamName,
          teamShortCode: customShortCode,
          teamColor: customTeamColor,
          initialBotCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create room.");
        setSubmitting(false);
        return;
      }

      router.push(`/room/${data.code}?share=1`);
    } catch {
      setError("Network error while creating auction room.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="relative my-auto w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-amber-500/30 bg-[#111827] p-5 sm:p-7 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-white">
              Create Custom Cricket Auction Room
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Choose IPL, ODI, T20I, Test, or All Formats — customize every limit & generate a shareable join link.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* 1. Quick Preset Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              1. Quick Rule Presets (Fully Customizable Below)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {Object.entries(RULE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedPreset === key
                      ? "border-amber-500 bg-amber-500/15 shadow-md"
                      : "border-white/10 bg-[#0A0E17] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-bold uppercase text-white">
                      {preset.label}
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                      {preset.format}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-gray-400">
                    {preset.subtitle}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Room Identity & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl bg-[#0A0E17]/80 border border-white/10 p-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                Auction Room Title
              </label>
              <input
                type="text"
                required
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. IPL 2026 Mega Auction"
                className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                Your Name (Host)
              </label>
              <input
                type="text"
                required
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Your Name"
                className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                Player Format Pool
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as CricketFormat)}
                className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 text-sm font-semibold text-amber-300 focus:border-amber-500 focus:outline-none"
              >
                <option value="IPL">IPL Franchise T20 Pool</option>
                <option value="T20I">T20 International Pool</option>
                <option value="ODI">ODI International Pool</option>
                <option value="TEST">Test Championship Pool</option>
                <option value="ALL">All Formats Global Pool (Every Player)</option>
              </select>
            </div>
          </div>

          {/* 3. Custom Rules & Limits Matrix */}
          <div className="rounded-xl bg-[#0A0E17]/80 border border-white/10 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                2. Custom Purse, Squad & Overseas Limits
              </span>
              <span className="font-mono text-xs text-gray-400">
                Purse: <strong className="text-amber-400">{formatLakhs(rules.purseLakhs)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {/* Total Purse in Crores */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                  Team Purse (₹ Crores)
                </label>
                <input
                  type="number"
                  min={5}
                  max={1000}
                  step={5}
                  value={Math.round(rules.purseLakhs / 100)}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      purseLakhs: Math.max(5, Number(e.target.value || 100)) * 100,
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 font-mono text-sm font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Max Teams */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                  Max Franchises
                </label>
                <input
                  type="number"
                  min={2}
                  max={16}
                  value={rules.maxTeams}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      maxTeams: Math.max(2, Math.min(16, Number(e.target.value || 8))),
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 font-mono text-sm font-bold text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Min Squad */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                  Min Squad Size
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={rules.minSquadSize}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(25, Number(e.target.value || 11)));
                    setRules({
                      ...rules,
                      minSquadSize: val,
                      maxSquadSize: Math.max(val, rules.maxSquadSize),
                    });
                  }}
                  className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 font-mono text-sm font-bold text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Max Squad */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                  Max Squad Limit
                </label>
                <input
                  type="number"
                  min={rules.minSquadSize}
                  max={35}
                  value={rules.maxSquadSize}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      maxSquadSize: Math.max(
                        rules.minSquadSize,
                        Math.min(35, Number(e.target.value || 25))
                      ),
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 font-mono text-sm font-bold text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Home Country */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                  Domestic Nation
                </label>
                <select
                  value={rules.homeCountry}
                  onChange={(e) => setRules({ ...rules, homeCountry: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#111827] px-2.5 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="India">India (IPL Style)</option>
                  <option value="Australia">Australia (BBL Style)</option>
                  <option value="England">England (Hundred Style)</option>
                  <option value="South Africa">South Africa (SA20)</option>
                  <option value="Pakistan">Pakistan (PSL Style)</option>
                  <option value="NONE">Global XI (No Overseas Rule)</option>
                </select>
              </div>

              {/* Max Overseas */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                  Max Overseas Limit
                </label>
                <input
                  type="number"
                  min={0}
                  max={35}
                  disabled={rules.homeCountry === "NONE"}
                  value={rules.homeCountry === "NONE" ? rules.maxSquadSize : rules.maxOverseas}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      maxOverseas: Math.max(0, Math.min(35, Number(e.target.value || 8))),
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 font-mono text-sm font-bold text-indigo-300 disabled:opacity-40 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Max Marquee Per Team */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                  Max Marquee / Team
                </label>
                <select
                  value={rules.maxMarqueePerTeam >= 50 ? "99" : String(rules.maxMarqueePerTeam)}
                  onChange={(e) =>
                    setRules({ ...rules, maxMarqueePerTeam: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#111827] px-2.5 py-2 font-mono text-xs font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
                >
                  <option value="99">Unlimited</option>
                  <option value="2">Max 2 Marquees</option>
                  <option value="3">Max 3 Marquees</option>
                  <option value="4">Max 4 Marquees</option>
                  <option value="5">Max 5 Marquees</option>
                </select>
              </div>

              {/* RTM Cards Per Team */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                  RTM Cards / Team
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={rules.rtmCardsPerTeam}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      rtmCardsPerTeam: Math.max(0, Math.min(5, Number(e.target.value || 0))),
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 font-mono text-sm font-bold text-sky-300 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Timer & Bidding Mechanics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-white/10">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                  Bid Timer (Seconds)
                </label>
                <input
                  type="number"
                  min={8}
                  max={120}
                  value={rules.bidTimerSeconds}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      bidTimerSeconds: Math.max(8, Math.min(120, Number(e.target.value || 20))),
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 font-mono text-sm font-bold text-emerald-400 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                  Bid Increment System
                </label>
                <select
                  value={rules.incrementMode}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      incrementMode: e.target.value === "fixed" ? "fixed" : "ipl_slabs",
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#111827] px-2.5 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="ipl_slabs">IPL Slabs (+10L / +20L / +25L / +50L)</option>
                  <option value="fixed">Custom Fixed Increment</option>
                </select>
              </div>

              {rules.incrementMode === "fixed" ? (
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                    Fixed Step (Lakhs)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    step={5}
                    value={rules.fixedIncrementLakhs}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        fixedIncrementLakhs: Math.max(5, Number(e.target.value || 25)),
                      })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 font-mono text-sm font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="flex flex-col justify-center gap-1.5 pt-2">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rules.allowJumpBids}
                      onChange={(e) =>
                        setRules({ ...rules, allowJumpBids: e.target.checked })
                      }
                      className="rounded border-white/20 bg-slate-900 text-amber-500"
                    />
                    Allow Custom Jump Bids
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rules.reserveBasePriceProtection}
                      onChange={(e) =>
                        setRules({
                          ...rules,
                          reserveBasePriceProtection: e.target.checked,
                        })
                      }
                      className="rounded border-white/20 bg-slate-900 text-amber-500"
                    />
                    Min-Squad Purse Protection
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* 4. Host Franchise & Optional AI Bots */}
          <div className="rounded-xl bg-[#0A0E17]/80 border border-white/10 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createHostTeam}
                  onChange={(e) => setCreateHostTeam(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 text-amber-500"
                />
                <Users className="h-4 w-4" />
                Join as a Franchise Owner Myself
              </label>

              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-gray-300">AI Rival Franchises:</span>
                <select
                  value={initialBotCount}
                  onChange={(e) => setInitialBotCount(Number(e.target.value))}
                  className="rounded-lg border border-white/15 bg-[#111827] px-2.5 py-1 font-mono text-xs font-bold text-emerald-300"
                >
                  <option value={0}>0 Bots (Friends Only via Link)</option>
                  <option value={1}>1 AI Bot Team</option>
                  <option value={3}>3 AI Bot Teams (Instant Bidding)</option>
                  <option value={5}>5 AI Bot Teams (Mega Table)</option>
                  <option value={7}>7 AI Bot Teams (Full Stadium)</option>
                </select>
              </div>
            </div>

            {createHostTeam && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {FRANCHISE_PRESETS.slice(0, 10).map((fp, idx) => (
                    <button
                      key={fp.shortCode}
                      type="button"
                      onClick={() => selectFranchisePreset(idx)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                        selectedFranchiseIdx === idx
                          ? "border-white bg-white/15 text-white"
                          : "border-white/10 bg-[#111827] text-gray-400 hover:text-white"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: fp.color }}
                      />
                      {fp.shortCode}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required={createHostTeam}
                      value={customTeamName}
                      onChange={(e) => setCustomTeamName(e.target.value)}
                      placeholder="Custom Franchise Name"
                      className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required={createHostTeam}
                      maxLength={5}
                      value={customShortCode}
                      onChange={(e) => setCustomShortCode(e.target.value.toUpperCase())}
                      placeholder="CODE"
                      className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 font-mono text-sm font-bold uppercase text-white"
                    />
                    <input
                      type="color"
                      value={customTeamColor}
                      onChange={(e) => setCustomTeamColor(e.target.value)}
                      className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-[#111827] p-1"
                      title="Team Jersey Color"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-xl border border-white/15 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-7 py-3 text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50"
            >
              <Gavel className="h-4 w-4" />
              {submitting ? "Creating Stadium Room..." : "Create Room & Get Shareable Link"}
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
