"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AUTO_NEXT_LOT_DELAY_MS,
  FRANCHISE_PRESETS,
  computeNextValidBidLakhs,
  computeTeamSquadSummary,
  formatLakhs,
  formatLakhsCompact,
  isPlayerOverseasForRoom,
  validateTeamBidEligibility,
  type AuctionRules,
  type PlayerRole,
  type RoomPlayerDTO,
  type RoomStateDTO,
} from "@/types/auction";
import {
  getCountryMeta,
  getOrCreateParticipantToken,
} from "@/lib/client-utils";
import { PlayerBroadcastCard } from "./PlayerBroadcastCard";
import { ShareRoomModal } from "./ShareRoomModal";
import { TeamSquadCard, TeamSquadsModal } from "./TeamSquadsModal";
import { UpcomingPlayersModal } from "./UpcomingPlayersModal";
import { PlayerPhoto, prefetchPlayerPhoto } from "./PlayerPhoto";
import { SetPhotoControl } from "./SetPhotoControl";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  Flame,
  Gavel,
  Link2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";

interface AuctionRoomClientProps {
  roomCode: string;
}

export function AuctionRoomClient({ roomCode }: AuctionRoomClientProps) {
  const searchParams = useSearchParams();
  const normalizedCode = roomCode.toUpperCase();

  const [token, setToken] = useState<string>("");
  const [state, setState] = useState<RoomStateDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<boolean>(false);

  // Clock offset: serverNowMs - clientNowMs
  const clockOffsetRef = useRef<number>(0);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [nextLotMs, setNextLotMs] = useState<number>(0);
  const [showTeamsModal, setShowTeamsModal] = useState<boolean>(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState<boolean>(false);

  // Share & Modals
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [quickCopied, setQuickCopied] = useState<boolean>(false);
  const [spectatorDismissedJoin, setSpectatorDismissedJoin] =
    useState<boolean>(false);

  // Join Franchise Form State
  const [joinOwnerName, setJoinOwnerName] = useState<string>("");
  const [joinTeamName, setJoinTeamName] = useState<string>("");
  const [joinShortCode, setJoinShortCode] = useState<string>("");
  const [joinColor, setJoinColor] = useState<string>("#10B981");
  const [joining, setJoining] = useState<boolean>(false);

  // Jump Bid & Floor Auctioneer State
  const [customJumpLakhsInput, setCustomJumpLakhsInput] = useState<string>("");
  const [floorTeamId, setFloorTeamId] = useState<number | "">("");

  // Right Column Tabs & Pool Search
  const [rightTab, setRightTab] = useState<"bids" | "pool" | "squads">("bids");
  const [poolFilter, setPoolFilter] = useState<
    "pending" | "sold" | "unsold" | "all"
  >("pending");
  const [poolSearch, setPoolSearch] = useState<string>("");
  const [selectedSquadTeamId, setSelectedSquadTeamId] = useState<number | null>(
    null
  );
  const [expandedSidebarTeamId, setExpandedSidebarTeamId] = useState<
    number | null
  >(null);

  // Mobile main view switcher
  const [mobileSection, setMobileSection] = useState<
    "stage" | "teams" | "feed"
  >("stage");

  // Edit Custom Rules Modal State
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [draftRules, setDraftRules] = useState<AuctionRules | null>(null);
  const [draftRoomName, setDraftRoomName] = useState<string>("");

  // Add Custom Player to Room Modal State
  const [showAddPlayerModal, setShowAddPlayerModal] = useState<boolean>(false);
  const [cpName, setCpName] = useState<string>("");
  const [cpCountry, setCpCountry] = useState<string>("India");
  const [cpRole, setCpRole] = useState<PlayerRole>("All-Rounder");
  const [cpBaseLakhs, setCpBaseLakhs] = useState<number>(100);
  const [cpMarquee, setCpMarquee] = useState<boolean>(false);
  const [cpCapped, setCpCapped] = useState<boolean>(true);
  const [cpRating, setCpRating] = useState<number>(88);
  const [cpImageUrl, setCpImageUrl] = useState<string>("");

  useEffect(() => {
    const t = getOrCreateParticipantToken();
    setToken(t);
    if (searchParams.get("share") === "1") {
      setShowShareModal(true);
    }
  }, [searchParams]);

  const applyIncomingState = useCallback((incoming: RoomStateDTO) => {
    if (incoming.serverNow) {
      clockOffsetRef.current =
        new Date(incoming.serverNow).getTime() - Date.now();
    }
    setState(incoming);
    setLoading(false);
    setNotFoundError(null);
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/rooms/${normalizedCode}`, {
        headers: { "x-participant-token": token },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setNotFoundError(data.error || "Auction room not found.");
        }
        setLoading(false);
        return;
      }
      applyIncomingState(data);
    } catch {
      setLoading(false);
    }
  }, [normalizedCode, token, applyIncomingState]);

  // Connect to Real-Time SSE Stream + Fallback Poll
  useEffect(() => {
    if (!token) return;
    void fetchSnapshot();

    const es = new EventSource(
      `/api/rooms/${normalizedCode}/stream?token=${encodeURIComponent(token)}`
    );

    es.addEventListener("state", (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as RoomStateDTO;
        applyIncomingState(parsed);
      } catch {
        // Ignore malformed frame
      }
    });

    es.addEventListener("ping", (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as {
          serverNow: string;
        };
        if (parsed.serverNow) {
          clockOffsetRef.current =
            new Date(parsed.serverNow).getTime() - Date.now();
        }
      } catch {
        // Ignore
      }
    });

    const fallbackInterval = setInterval(() => {
      if (es.readyState !== EventSource.OPEN) {
        void fetchSnapshot();
      }
    }, 3000);

    return () => {
      clearInterval(fallbackInterval);
      es.close();
    };
  }, [normalizedCode, token, fetchSnapshot, applyIncomingState]);

  // Pre-fill available franchise preset for join form
  useEffect(() => {
    if (!state || joinTeamName) return;
    const usedCodes = new Set(
      state.teams.map((t) => t.shortCode.toUpperCase())
    );
    const available =
      FRANCHISE_PRESETS.find((p) => !usedCodes.has(p.shortCode)) ||
      FRANCHISE_PRESETS[0];
    if (available) {
      setJoinTeamName(available.name);
      setJoinShortCode(available.shortCode);
      setJoinColor(available.color);
    }
  }, [state, joinTeamName]);

  // Smooth 60fps / 100ms Countdown Ticker
  useEffect(() => {
    if (!state) return;

    const updateTimer = () => {
      if (state.status === "paused" && state.pausedRemainingMs) {
        setRemainingMs(state.pausedRemainingMs);
        return;
      }
      if (state.status === "live" && state.timerEndsAt) {
        const syncedNow = Date.now() + clockOffsetRef.current;
        const diff = Math.max(
          0,
          new Date(state.timerEndsAt).getTime() - syncedNow
        );
        setRemainingMs(diff);
        setNextLotMs(0);
        return;
      }
      setRemainingMs(0);
      if (state.status === "live" && !state.currentRoomPlayerId && state.lastEvent?.timestamp) {
        const syncedNow = Date.now() + clockOffsetRef.current;
        setNextLotMs(
          Math.max(0, new Date(state.lastEvent.timestamp).getTime() + AUTO_NEXT_LOT_DELAY_MS - syncedNow)
        );
      } else {
        setNextLotMs(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [state]);

  // Preload the photo of the next player in the queue so it appears instantly when he comes up
  const nextPendingSlug = state?.players.find((p) => p.status === "pending")?.player;
  useEffect(() => {
    if (nextPendingSlug) prefetchPlayerPhoto(nextPendingSlug.slug, nextPendingSlug.name);
  }, [nextPendingSlug?.slug, nextPendingSlug?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss transient error after 5s
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 5500);
    return () => clearTimeout(t);
  }, [actionError]);

  const activeLot: RoomPlayerDTO | null = useMemo(() => {
    if (!state || !state.currentRoomPlayerId) return null;
    return (
      state.players.find((p) => p.id === state.currentRoomPlayerId) || null
    );
  }, [state]);

  const myTeam = useMemo(() => {
    if (!state || !state.myTeamId) return null;
    return state.teams.find((t) => t.id === state.myTeamId) || null;
  }, [state]);

  const highestBidTeam = useMemo(() => {
    if (!state || !state.currentBidTeamId) return null;
    return state.teams.find((t) => t.id === state.currentBidTeamId) || null;
  }, [state]);

  const mostRecentlySoldRp = useMemo(() => {
    if (
      !state ||
      state.currentRoomPlayerId !== null ||
      !state.lastEvent ||
      (state.lastEvent.type !== "sold" && state.lastEvent.type !== "rtm")
    ) {
      return null;
    }
    const targetName = state.lastEvent.playerName;
    return (
      state.players.find(
        (p) => p.status === "sold" && p.player.name === targetName
      ) || null
    );
  }, [state]);

  const copyShareUrlQuick = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/room/${normalizedCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setQuickCopied(true);
      setTimeout(() => setQuickCopied(false), 2000);
    } catch {
      setShowShareModal(true);
    }
  };

  const handleJoinFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setJoining(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/rooms/${normalizedCode}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-token": token,
        },
        body: JSON.stringify({
          participantToken: token,
          ownerName: joinOwnerName || "Franchise Owner",
          name: joinTeamName,
          shortCode: joinShortCode,
          color: joinColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Could not join room.");
      } else {
        applyIncomingState(data);
      }
    } catch {
      setActionError("Network error while joining room.");
    } finally {
      setJoining(false);
    }
  };

  const handleAddBot = async () => {
    if (!token) return;
    setBusyAction(true);
    try {
      const res = await fetch(`/api/rooms/${normalizedCode}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-token": token,
        },
        body: JSON.stringify({ participantToken: token, addBot: true }),
      });
      const data = await res.json();
      if (!res.ok) setActionError(data.error || "Could not add AI bot.");
      else applyIncomingState(data);
    } finally {
      setBusyAction(false);
    }
  };

  const handleRemoveTeam = async (teamId: number) => {
    if (!token) return;
    setBusyAction(true);
    try {
      const res = await fetch(`/api/rooms/${normalizedCode}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-token": token,
        },
        body: JSON.stringify({ participantToken: token, removeTeamId: teamId }),
      });
      const data = await res.json();
      if (!res.ok) setActionError(data.error || "Could not remove team.");
      else applyIncomingState(data);
    } finally {
      setBusyAction(false);
    }
  };

  const sendRoomAction = async (payload: Record<string, unknown>) => {
    if (!token) return;
    setBusyAction(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/rooms/${normalizedCode}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-token": token,
        },
        body: JSON.stringify({ participantToken: token, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Action failed.");
      } else {
        applyIncomingState(data);
      }
    } catch {
      setActionError("Network error executing auction action.");
    } finally {
      setBusyAction(false);
    }
  };

  const placeBid = async (teamId?: number, amountLakhs?: number) => {
    if (!token) return;
    setBusyAction(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/rooms/${normalizedCode}/bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-token": token,
        },
        body: JSON.stringify({
          participantToken: token,
          teamId,
          amountLakhs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Bid rejected by custom rules.");
      } else {
        setCustomJumpLakhsInput("");
        applyIncomingState(data);
      }
    } catch {
      setActionError("Network error placing bid.");
    } finally {
      setBusyAction(false);
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftRules || !token) return;
    setBusyAction(true);
    try {
      const res = await fetch(`/api/rooms/${normalizedCode}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-participant-token": token,
        },
        body: JSON.stringify({
          participantToken: token,
          name: draftRoomName,
          rules: draftRules,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to update rules.");
      } else {
        applyIncomingState(data);
        setShowRulesModal(false);
      }
    } finally {
      setBusyAction(false);
    }
  };

  const handleAddCustomRoomPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpName.trim()) return;
    await sendRoomAction({
      action: "add_custom_player",
      name: cpName,
      country: cpCountry,
      role: cpRole,
      basePriceLakhs: cpBaseLakhs,
      isMarquee: cpMarquee,
      isCapped: cpCapped,
      rating: cpRating,
      imageUrl: cpImageUrl,
    });
    setCpName("");
    setCpImageUrl("");
    setShowAddPlayerModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0E17] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 rounded-2xl border-2 border-amber-500 border-t-transparent animate-spin mb-4" />
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-wider text-white">
          Connecting to Broadcast Room {normalizedCode}...
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Syncing live franchises, custom purse limits, and auction clock
        </p>
      </div>
    );
  }

  if (notFoundError || !state) {
    return (
      <div className="min-h-screen bg-[#0A0E17] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-[#111827] p-8">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-400 mb-3" />
          <h1 className="font-display text-3xl font-extrabold uppercase text-white">
            Room Not Found
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {notFoundError ||
              `No auction room exists with code "${normalizedCode}". Double-check your shareable link or create a new room!`}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-amber-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Stadium Lobby
          </Link>
        </div>
      </div>
    );
  }

  const { rules } = state;
  const pendingPlayers = state.players.filter((p) => p.status === "pending");
  const soldPlayers = state.players.filter((p) => p.status === "sold");
  const unsoldPlayers = state.players.filter((p) => p.status === "unsold");
  const lastLotRp =
    state.lastEvent?.playerName &&
    (state.lastEvent.type === "sold" || state.lastEvent.type === "rtm" || state.lastEvent.type === "unsold")
      ? state.players.find(
          (p) =>
            p.player.name === state.lastEvent?.playerName &&
            (p.status === "sold" || p.status === "unsold")
        ) || null
      : null;

  const nextValidBidLakhs = activeLot
    ? computeNextValidBidLakhs(
        activeLot.player.basePriceLakhs,
        state.currentBidLakhs,
        state.currentBidTeamId,
        rules
      )
    : 0;

  const myEligibility =
    myTeam && activeLot
      ? validateTeamBidEligibility({
          team: myTeam,
          player: activeLot.player,
          proposedBidLakhs: nextValidBidLakhs,
          currentBidLakhs: state.currentBidLakhs,
          currentBidTeamId: state.currentBidTeamId,
          allRoomPlayers: state.players,
          rules,
        })
      : null;

  const mySquadSummary = myTeam
    ? computeTeamSquadSummary(myTeam, state.players, rules)
    : null;

  // Check if myTeam can exercise RTM right now
  const canExerciseRtm =
    Boolean(
      myTeam &&
        myTeam.rtmCardsRemaining > 0 &&
        mostRecentlySoldRp &&
        !mostRecentlySoldRp.soldViaRtm &&
        mostRecentlySoldRp.soldToTeamId !== myTeam.id &&
        mostRecentlySoldRp.soldPriceLakhs &&
        myTeam.purseRemainingLakhs >= mostRecentlySoldRp.soldPriceLakhs
    );

  const timerProgressPct =
    activeLot && rules.bidTimerSeconds > 0
      ? Math.min(
          100,
          Math.max(0, (remainingMs / (rules.bidTimerSeconds * 1000)) * 100)
        )
      : 0;

  const isTimerCritical = activeLot && remainingMs > 0 && remainingMs <= 5500;

  const filteredPool = state.players.filter((rp) => {
    if (poolFilter !== "all" && rp.status !== poolFilter) return false;
    if (poolSearch.trim()) {
      const q = poolSearch.trim().toLowerCase();
      const hay = `${rp.player.name} ${rp.player.country} ${rp.player.role} ${rp.player.setCategory}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const activeSquadInspectTeam =
    state.teams.find((t) => t.id === selectedSquadTeamId) ||
    myTeam ||
    state.teams[0] ||
    null;

  const availablePresetsForJoin = FRANCHISE_PRESETS.filter(
    (fp) =>
      !state.teams.some(
        (t) => t.shortCode.toUpperCase() === fp.shortCode.toUpperCase()
      )
  );

  return (
    <div className="min-h-screen bg-[#0A0E17] text-[#F9FAFB] flex flex-col broadcast-grid">
      {/* ==================== TOP BROADCAST HEADER ==================== */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0E17]/95 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand + Room Name + Status */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#111827] px-2.5 py-1.5 text-xs font-bold text-gray-300 hover:border-amber-500/40 hover:text-white"
              title="Back to Lobby"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lobby</span>
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-wide text-white truncate">
                  {state.name}
                </h1>
                <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300 shrink-0">
                  {state.format}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                    state.status === "live"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : state.status === "paused"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : state.status === "completed"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      state.status === "live"
                        ? "bg-emerald-400 animate-ping"
                        : "bg-current"
                    }`}
                  />
                  {state.status}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 hidden sm:flex items-center gap-2">
                <span>Host: {state.hostName}</span>
                <span>•</span>
                <span>
                  Purse: <strong className="text-gray-200">{formatLakhs(rules.purseLakhs)}</strong>
                </span>
                <span>•</span>
                <span>
                  Squad: <strong className="text-gray-200">{rules.minSquadSize}–{rules.maxSquadSize}</strong>
                </span>
                <span>•</span>
                <span>
                  Overseas Cap:{" "}
                  <strong className="text-gray-200">
                    {rules.homeCountry === "NONE" ? "Unlimited" : rules.maxOverseas}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Shareable Link Button + Custom Rules + My Team Pill */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Copy + Invite Modal Button */}
            <div className="inline-flex items-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 overflow-hidden">
              <button
                type="button"
                onClick={copyShareUrlQuick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
                title="Copy Direct Shareable Room Link"
              >
                {quickCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{state.code}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="border-l border-emerald-500/30 bg-emerald-500 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-emerald-400 transition flex items-center gap-1"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Share Link</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowTeamsModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition"
            >
              <Users className="h-3.5 w-3.5" />
              <span>All Teams</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUpcomingModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500 hover:text-slate-950 transition"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Upcoming ({state.players.filter((p) => p.status === "pending").length})</span>
            </button>

            {/* Rules View / Edit Button */}
            <button
              type="button"
              onClick={() => {
                setDraftRules({ ...state.rules });
                setDraftRoomName(state.name);
                setShowRulesModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#111827] px-3 py-1.5 text-xs font-bold text-gray-200 hover:border-amber-500/40 hover:text-amber-300"
            >
              <Settings className="h-3.5 w-3.5 text-amber-400" />
              <span>{state.isHost ? "Custom Rules" : "View Rules"}</span>
            </button>

            {state.isHost && (
              <button
                type="button"
                onClick={() => setShowAddPlayerModal(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Add Player</span>
              </button>
            )}

            {myTeam && (
              <div
                className="hidden xl:flex items-center gap-2 rounded-xl border px-3 py-1.5 bg-[#111827]"
                style={{ borderColor: `${myTeam.color}66` }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: myTeam.color }}
                />
                <span className="font-mono text-xs font-bold text-white">
                  {myTeam.shortCode}
                </span>
                <span className="font-mono text-xs font-bold text-amber-400 tabular-nums">
                  {formatLakhs(myTeam.purseRemainingLakhs)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden border-t border-white/10 bg-[#111827]">
          <button
            type="button"
            onClick={() => setMobileSection("stage")}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${
              mobileSection === "stage"
                ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5"
                : "text-gray-400"
            }`}
          >
            Auction Stage
          </button>
          <button
            type="button"
            onClick={() => setMobileSection("teams")}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${
              mobileSection === "teams"
                ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5"
                : "text-gray-400"
            }`}
          >
            Teams ({state.teams.length}/{rules.maxTeams})
          </button>
          <button
            type="button"
            onClick={() => setMobileSection("feed")}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${
              mobileSection === "feed"
                ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5"
                : "text-gray-400"
            }`}
          >
            Pool & Feed ({pendingPlayers.length})
          </button>
        </div>
      </header>

      {/* ==================== ERROR / EVENT TELEMETRY BANNER ==================== */}
      {actionError && (
        <div className="mx-auto mt-3 w-full max-w-[1600px] px-3 sm:px-6">
          <div className="flex items-center justify-between rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-2.5 text-xs sm:text-sm text-red-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-red-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================== SHAREABLE LINK ONBOARDING BANNER ==================== */}
      {!myTeam &&
        !spectatorDismissedJoin &&
        state.status !== "completed" &&
        state.teams.length < rules.maxTeams && (
          <div className="mx-auto mt-4 w-full max-w-[1600px] px-3 sm:px-6">
            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-[#111827] to-[#111827] p-4 sm:p-5 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    You&apos;re Invited to {state.name}
                  </div>
                  <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
                    Claim Your Franchise Table & Start Bidding Live
                  </h2>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Starting Purse:{" "}
                    <strong className="font-mono text-amber-400">
                      {formatLakhs(rules.purseLakhs)}
                    </strong>{" "}
                    • Slots Open:{" "}
                    <strong className="font-mono text-white">
                      {rules.maxTeams - state.teams.length} of {rules.maxTeams}
                    </strong>
                  </p>
                </div>

                <form
                  onSubmit={handleJoinFranchise}
                  className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2.5"
                >
                  {availablePresetsForJoin.length > 0 && (
                    <div className="w-full flex flex-wrap gap-1.5 mb-1">
                      {availablePresetsForJoin.slice(0, 6).map((fp) => (
                        <button
                          key={fp.shortCode}
                          type="button"
                          onClick={() => {
                            setJoinTeamName(fp.name);
                            setJoinShortCode(fp.shortCode);
                            setJoinColor(fp.color);
                          }}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold transition ${
                            joinShortCode === fp.shortCode
                              ? "border-amber-400 bg-amber-500/20 text-white"
                              : "border-white/10 bg-[#0A0E17] text-gray-300 hover:border-white/30"
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: fp.color }}
                          />
                          {fp.shortCode}
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    required
                    value={joinOwnerName}
                    onChange={(e) => setJoinOwnerName(e.target.value)}
                    placeholder="Your Name"
                    className="rounded-xl border border-white/15 bg-[#0A0E17] px-3 py-2 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    value={joinTeamName}
                    onChange={(e) => setJoinTeamName(e.target.value)}
                    placeholder="Franchise Name"
                    className="rounded-xl border border-white/15 bg-[#0A0E17] px-3 py-2 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={joinShortCode}
                      onChange={(e) =>
                        setJoinShortCode(e.target.value.toUpperCase())
                      }
                      placeholder="CODE"
                      className="w-20 rounded-xl border border-white/15 bg-[#0A0E17] px-3 py-2 font-mono text-xs sm:text-sm font-bold uppercase text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <input
                      type="color"
                      value={joinColor}
                      onChange={(e) => setJoinColor(e.target.value)}
                      className="h-9 w-10 cursor-pointer rounded-lg border border-white/15 bg-[#0A0E17] p-0.5"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={joining}
                    className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {joining ? "Joining..." : "Claim Franchise"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpectatorDismissedJoin(true)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/10"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Spectate
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      {/* ==================== MAIN 3-COLUMN ARENA ==================== */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ---------- LEFT COLUMN: FRANCHISES & PURSE TELEMETRY ---------- */}
        <aside
          className={`lg:col-span-3 space-y-3 ${
            mobileSection === "teams" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-400" />
                <h2 className="font-display text-lg font-extrabold uppercase tracking-wider text-white">
                  Franchises ({state.teams.length}/{rules.maxTeams})
                </h2>
              </div>

              {state.isHost &&
                state.teams.length < rules.maxTeams &&
                state.status !== "completed" && (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleAddBot}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition"
                    title="Add an AI Auto-Bidder Franchise"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    + AI Bot
                  </button>
                )}
            </div>

            {state.teams.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 p-5 text-center text-xs text-gray-400">
                No franchises have joined yet. Claim a franchise above or share your invite link!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {state.teams.map((team) => {
                  const summary = computeTeamSquadSummary(
                    team,
                    state.players,
                    rules
                  );
                  const isLeading = state.currentBidTeamId === team.id;
                  const pursePct = Math.min(
                    100,
                    Math.max(
                      0,
                      (team.purseRemainingLakhs /
                        Math.max(1, rules.purseLakhs)) *
                        100
                    )
                  );
                  const teamPlayers = state.players.filter(
                    (rp) => rp.status === "sold" && rp.soldToTeamId === team.id
                  );
                  const isExpanded = expandedSidebarTeamId === team.id;

                  return (
                    <div
                      key={team.id}
                      className={`rounded-xl border p-3 transition-all ${
                        isLeading
                          ? "border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                          : team.isMe
                          ? "border-emerald-500/50 bg-emerald-500/5"
                          : "border-white/10 bg-[#0A0E17]/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-extrabold text-slate-950 shadow-sm"
                            style={{ backgroundColor: team.color }}
                          >
                            {team.shortCode}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-display text-base font-bold uppercase tracking-wide text-white truncate">
                                {team.name}
                              </span>
                              {team.isMe && (
                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase text-emerald-300">
                                  YOU
                                </span>
                              )}
                              {team.isBot && (
                                <Bot className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate">
                              {team.ownerName}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-sm font-bold text-amber-400 tabular-nums">
                            {formatLakhs(team.purseRemainingLakhs)}
                          </div>
                          {isLeading && (
                            <span className="inline-block rounded bg-amber-500 px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase text-slate-950">
                              Leading
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Purse Bar */}
                      <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pursePct}%`,
                            backgroundColor: team.color,
                          }}
                        />
                      </div>

                      {/* Custom Limits Telemetry Pills */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-gray-300">
                        <span
                          className={
                            summary.totalPlayers >= rules.maxSquadSize
                              ? "text-red-400 font-bold"
                              : ""
                          }
                        >
                          Squad: {summary.totalPlayers}/{rules.maxSquadSize}
                        </span>

                        {rules.homeCountry !== "NONE" && (
                          <span
                            className={
                              summary.overseasCount >= rules.maxOverseas
                                ? "text-red-400 font-bold"
                                : "text-indigo-300"
                            }
                          >
                            OS: {summary.overseasCount}/{rules.maxOverseas}
                          </span>
                        )}

                        {rules.rtmCardsPerTeam > 0 && (
                          <span className="text-sky-300">
                            RTM: {team.rtmCardsRemaining}
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSidebarTeamId(
                                isExpanded ? null : team.id
                              )
                            }
                            className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-300 hover:bg-white/15 flex items-center gap-0.5"
                          >
                            Roster
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>

                          {state.isHost &&
                            state.status === "waiting" &&
                            team.isBot && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTeam(team.id)}
                                className="rounded p-1 text-gray-500 hover:bg-red-500/20 hover:text-red-300"
                                title="Remove Bot Franchise"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                        </div>
                      </div>

                      {/* Expanded Bought Squad Mini-List */}
                      {isExpanded && (
                        <div className="mt-2.5 border-t border-white/10 pt-2 space-y-1">
                          {teamPlayers.length === 0 ? (
                            <div className="text-[11px] text-gray-500 italic">
                              No signings yet.
                            </div>
                          ) : (
                            teamPlayers.map((rp) => (
                              <div
                                key={rp.id}
                                className="flex items-center justify-between text-[11px]"
                              >
                                <span className="text-gray-200 truncate">
                                  {getCountryMeta(rp.player.country).flag}{" "}
                                  {rp.player.name}{" "}
                                  <span className="text-gray-500">
                                    ({rp.player.role.slice(0, 3)})
                                  </span>
                                </span>
                                <span className="font-mono font-bold text-emerald-400 shrink-0 ml-2">
                                  {formatLakhsCompact(rp.soldPriceLakhs)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ---------- CENTER COLUMN: THE AUCTION STAGE & GAVEL CONSOLE ---------- */}
        <section
          className={`lg:col-span-6 space-y-4 ${
            mobileSection === "stage" ? "block" : "hidden lg:block"
          }`}
        >
          {/* Live Last Event Ticker Strip */}
          {state.lastEvent && (
            <div
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold ${
                state.lastEvent.type === "sold"
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                  : state.lastEvent.type === "rtm"
                  ? "border-sky-500/50 bg-sky-500/15 text-sky-200"
                  : state.lastEvent.type === "unsold"
                  ? "border-red-500/40 bg-red-500/15 text-red-200"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Gavel className="h-4 w-4 shrink-0" />
                <span className="truncate">{state.lastEvent.message}</span>
              </div>
              <span className="font-mono text-[11px] opacity-75 shrink-0">
                LIVE FEED
              </span>
            </div>
          )}

          {/* ========== STAGE MODE 1: WAITING LOBBY ========== */}
          {state.status === "waiting" && !activeLot && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-[#111827] p-6 sm:p-8 shadow-2xl">
              <div
                className="pointer-events-none absolute inset-0 opacity-20 bg-cover bg-center"
                style={{ backgroundImage: "url('/images/stadium-hero.jpg')" }}
              />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <Flame className="h-3.5 w-3.5" />
                  Pre-Auction Broadcast Control Room
                </div>

                <h2 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold uppercase tracking-wide text-white">
                  {state.name}
                </h2>
                <p className="mt-2 text-sm text-gray-300 max-w-xl">
                  Share the invite link below with your friends so they can claim their franchises, or add AI Rival Franchises for instant bidding wars!
                </p>

                {/* Shareable Invite Box right inside Lobby */}
                <div className="mt-5 rounded-xl border border-emerald-500/30 bg-[#0A0E17]/90 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        Shareable Multiplayer Invite Link
                      </div>
                      <div className="font-mono text-xs sm:text-sm text-gray-200 break-all mt-0.5">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/room/${state.code}`
                          : `/room/${state.code}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={copyShareUrlQuick}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-emerald-400"
                      >
                        {quickCopied ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy Link
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowShareModal(true)}
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-bold text-white hover:bg-white/10"
                      >
                        More Options
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Rules Snapshot Grid */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-[#0A0E17]/85 border border-white/10 p-3">
                    <div className="text-[10px] uppercase text-gray-400">
                      Team Purse
                    </div>
                    <div className="font-mono text-lg font-bold text-amber-400">
                      {formatLakhs(rules.purseLakhs)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0A0E17]/85 border border-white/10 p-3">
                    <div className="text-[10px] uppercase text-gray-400">
                      Squad Limits
                    </div>
                    <div className="font-mono text-lg font-bold text-white">
                      {rules.minSquadSize} – {rules.maxSquadSize}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0A0E17]/85 border border-white/10 p-3">
                    <div className="text-[10px] uppercase text-gray-400">
                      Overseas Cap
                    </div>
                    <div className="font-mono text-lg font-bold text-indigo-300">
                      {rules.homeCountry === "NONE"
                        ? "No Cap"
                        : `Max ${rules.maxOverseas}`}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0A0E17]/85 border border-white/10 p-3">
                    <div className="text-[10px] uppercase text-gray-400">
                      Pool Size
                    </div>
                    <div className="font-mono text-lg font-bold text-emerald-400">
                      {pendingPlayers.length} Players
                    </div>
                  </div>
                </div>

                {/* Start Auction Button (Host) or Waiting Notice */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                  <div className="text-xs text-gray-300">
                    Franchises Ready:{" "}
                    <strong className="font-mono text-white">
                      {state.teams.length} / {rules.maxTeams}
                    </strong>{" "}
                    {state.teams.length < 2 && (
                      <span className="text-amber-300 ml-1">
                        (Need at least 2 franchises to begin)
                      </span>
                    )}
                  </div>

                  {state.isHost ? (
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => sendRoomAction({ action: "sync_pool" })}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-3 text-xs font-bold uppercase tracking-wider text-sky-300 hover:bg-sky-500 hover:text-slate-950"
                        title="Add any newly added players from the global database to this room"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Sync Latest Players
                      </button>
                      {state.teams.length < 2 && (
                        <button
                          type="button"
                          disabled={busyAction}
                          onClick={handleAddBot}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500 hover:text-slate-950"
                        >
                          <Bot className="h-4 w-4" />
                          Add AI Rival Team
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyAction || state.teams.length < 2}
                        onClick={() =>
                          sendRoomAction({ action: "start_or_next" })
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 disabled:opacity-40"
                      >
                        <Gavel className="h-5 w-5" />
                        Start Auction — Bring 1st Player
                      </button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-semibold text-amber-300">
                      <Clock className="h-4 w-4 animate-spin" />
                      Waiting for Host ({state.hostName}) to start the first lot...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========== STAGE MODE 2: LIVE / PAUSED PLAYER ON THE BLOCK ========== */}
          {activeLot && (
            <div className="space-y-4">
              {/* Spotlight Player Card */}
              <PlayerBroadcastCard
                player={activeLot.player}
                preferredFormat={state.format}
                variant="spotlight"
                isOverseasInRoom={isPlayerOverseasForRoom(
                  activeLot.player,
                  rules
                )}
              />
              {state.isHost && (
                <div className="-mt-2 flex justify-end">
                  <SetPhotoControl slug={activeLot.player.slug} name={activeLot.player.name} compact />
                </div>
              )}

              {/* Live Bid Clock & Highest Bid Scoreboard */}
              <div className="rounded-2xl border border-white/15 bg-[#111827] p-5 shadow-xl space-y-4">
                {/* Countdown Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Clock
                        className={`h-4 w-4 ${
                          isTimerCritical
                            ? "text-red-400 animate-bounce"
                            : "text-amber-400"
                        }`}
                      />
                      {state.status === "paused"
                        ? "AUCTION CLOCK PAUSED"
                        : isTimerCritical
                        ? "GOING ONCE... GOING TWICE!"
                        : "LIVE BIDDING CLOCK"}
                    </span>
                    <span
                      className={`font-mono text-xl font-extrabold tabular-nums ${
                        state.status === "paused"
                          ? "text-amber-300"
                          : isTimerCritical
                          ? "text-red-400 animate-pulse"
                          : "text-emerald-400"
                      }`}
                    >
                      {(remainingMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#0A0E17] overflow-hidden border border-white/10">
                    <div
                      className={`h-full transition-all duration-100 ${
                        state.status === "paused"
                          ? "bg-amber-400"
                          : isTimerCritical
                          ? "bg-red-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${timerProgressPct}%` }}
                    />
                  </div>
                </div>

                {/* Current Bid Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center rounded-xl bg-[#0A0E17] border border-white/10 p-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {highestBidTeam
                        ? "Current Highest Bid"
                        : "Opening Base Price"}
                    </div>
                    <div className="font-mono text-3xl sm:text-4xl font-extrabold text-amber-400 tabular-nums mt-0.5">
                      {formatLakhs(
                        state.currentBidLakhs ?? activeLot.player.basePriceLakhs
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    {highestBidTeam ? (
                      <div className="inline-flex sm:flex-col items-center sm:items-end gap-2">
                        <span className="text-[11px] uppercase tracking-wider text-gray-400">
                          Held By Franchise
                        </span>
                        <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#111827] px-3.5 py-2">
                          <span
                            className="h-3.5 w-3.5 rounded-full"
                            style={{ backgroundColor: highestBidTeam.color }}
                          />
                          <span className="font-display text-xl font-extrabold uppercase text-white">
                            {highestBidTeam.name}
                          </span>
                          <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-300">
                            {highestBidTeam.shortCode}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        No Paddles Raised Yet — Open at{" "}
                        <span className="font-mono text-white">
                          {formatLakhs(activeLot.player.basePriceLakhs)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Franchise Owner Bidding Paddle */}
                {myTeam ? (
                  <div className="space-y-3 pt-1">
                    <button
                      type="button"
                      disabled={
                        busyAction ||
                        state.status !== "live" ||
                        Boolean(myEligibility && !myEligibility.ok)
                      }
                      onClick={() => placeBid(myTeam.id, nextValidBidLakhs)}
                      className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 px-6 py-4 text-slate-950 font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wider shadow-xl shadow-amber-500/20 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Gavel className="h-6 w-6" />
                      <span>
                        Raise Paddle ({myTeam.shortCode}) — Bid{" "}
                        {formatLakhs(nextValidBidLakhs)}
                      </span>
                    </button>

                    {/* Eligibility Feedback & Safe Purse Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      {myEligibility && !myEligibility.ok ? (
                        <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          {myEligibility.reason}
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">
                          ✓ Eligible to Bid • Max Allowed:{" "}
                          <strong className="font-mono">
                            {formatLakhs(mySquadSummary?.maxAllowedBidLakhs)}
                          </strong>
                        </span>
                      )}

                      <span className="font-mono text-gray-400">
                        Purse Left: {formatLakhs(myTeam.purseRemainingLakhs)}
                      </span>
                    </div>

                    {/* Jump Bid Controls (if enabled in custom rules) */}
                    {rules.allowJumpBids &&
                      state.status === "live" &&
                      (!myEligibility || myEligibility.ok) && (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#0A0E17]/70 border border-white/10 p-2.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1 mr-1">
                            <Zap className="h-3.5 w-3.5 text-amber-400" />
                            Jump Bid:
                          </span>
                          {[50, 100, 200].map((extraLakhs) => {
                            const jumpAmt = nextValidBidLakhs + extraLakhs;
                            const canAfford =
                              mySquadSummary &&
                              jumpAmt <= mySquadSummary.maxAllowedBidLakhs;
                            return (
                              <button
                                key={extraLakhs}
                                type="button"
                                disabled={busyAction || !canAfford}
                                onClick={() => placeBid(myTeam.id, jumpAmt)}
                                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-30 transition"
                              >
                                {formatLakhs(jumpAmt)}
                              </button>
                            );
                          })}

                          <div className="flex items-center gap-1 ml-auto">
                            <input
                              type="number"
                              min={Math.ceil(nextValidBidLakhs)}
                              step={10}
                              value={customJumpLakhsInput}
                              onChange={(e) =>
                                setCustomJumpLakhsInput(e.target.value)
                              }
                              placeholder="Lakhs (e.g. 500)"
                              className="w-32 rounded-lg border border-white/15 bg-[#111827] px-2.5 py-1 font-mono text-xs text-white"
                            />
                            <button
                              type="button"
                              disabled={
                                busyAction || !Number(customJumpLakhsInput)
                              }
                              onClick={() =>
                                placeBid(
                                  myTeam.id,
                                  Math.round(Number(customJumpLakhsInput))
                                )
                              }
                              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-500 hover:text-slate-950 disabled:opacity-40"
                            >
                              Jump
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs text-gray-300">
                    Watching Live in Spectator Mode —{" "}
                    {state.teams.length < rules.maxTeams && (
                      <button
                        type="button"
                        onClick={() => setSpectatorDismissedJoin(false)}
                        className="font-bold text-emerald-400 underline ml-1"
                      >
                        Claim a Franchise to Bid!
                      </button>
                    )}
                  </div>
                )}

                {/* Host / Commissioner Gavel Controls */}
                {state.isHost && (
                  <div className="border-t border-white/10 pt-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Gavel className="h-3.5 w-3.5" />
                        Commissioner Gavel Controls
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        {state.status === "live" ? (
                          <button
                            type="button"
                            disabled={busyAction}
                            onClick={() => sendRoomAction({ action: "pause" })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-white/15"
                          >
                            <Pause className="h-3.5 w-3.5" />
                            Pause Clock
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyAction}
                            onClick={() => sendRoomAction({ action: "resume" })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Resume Clock
                          </button>
                        )}

                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                          <Clock className="h-3.5 w-3.5" />
                          Auto-SOLD at 0s
                        </span>
                      </div>
                    </div>

                    {/* Floor Auctioneer Assist: Enter Bid on behalf of any Franchise */}
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#0A0E17]/60 border border-white/5 px-3 py-2">
                      <span className="text-[11px] text-gray-400">
                        Floor Paddle Assist:
                      </span>
                      <select
                        value={floorTeamId}
                        onChange={(e) =>
                          setFloorTeamId(
                            e.target.value ? Number(e.target.value) : ""
                          )
                        }
                        className="rounded-lg border border-white/15 bg-[#111827] px-2.5 py-1 text-xs text-white"
                      >
                        <option value="">Select Franchise...</option>
                        {state.teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.shortCode} — {t.name} (
                            {formatLakhsCompact(t.purseRemainingLakhs)})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={
                          busyAction ||
                          !floorTeamId ||
                          state.status !== "live"
                        }
                        onClick={() =>
                          floorTeamId &&
                          placeBid(Number(floorTeamId), nextValidBidLakhs)
                        }
                        className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-40"
                      >
                        Log Floor Bid ({formatLakhs(nextValidBidLakhs)})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== STAGE MODE 3: BETWEEN LOTS (HAMMER RESULT + RTM WINDOW) ========== */}
          {(state.status === "live" || state.status === "paused") &&
            !activeLot && (
              <div className="rounded-2xl border border-white/15 bg-[#111827] p-6 sm:p-8 text-center shadow-2xl space-y-5">
                {state.lastEvent?.type === "sold" ||
                state.lastEvent?.type === "rtm" ? (
                  <div className="space-y-3">
                    {lastLotRp && (
                      <div className="relative mx-auto w-48 sm:w-56">
                        <PlayerPhoto
                          key={lastLotRp.player.slug}
                          slug={lastLotRp.player.slug}
                          name={lastLotRp.player.name}
                          country={lastLotRp.player.country}
                          imageUrl={lastLotRp.player.imageUrl}
                          quality="large"
                          eager
                          rounded="rounded-2xl"
                          className="h-56 sm:h-64 w-full border-2"
                          initialsClass="text-6xl"
                        />
                        <div
                          className="pointer-events-none absolute inset-0 rounded-2xl border-4"
                          style={{ boxShadow: `0 0 40px ${state.lastEvent.teamColor || "#10B981"}55`, borderColor: state.lastEvent.teamColor || "#10B981" }}
                        />
                        {state.lastEvent.teamShortCode && (
                          <span
                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-lg px-3 py-1 font-mono text-sm font-extrabold text-slate-950 shadow-lg"
                            style={{ backgroundColor: state.lastEvent.teamColor || "#10B981" }}
                          >
                            {state.lastEvent.teamShortCode}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="inline-block animate-gavel-stamp rounded-xl border-2 border-emerald-400 bg-emerald-500/20 px-6 py-2 font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-widest text-emerald-300">
                      {state.lastEvent.type === "rtm"
                        ? "⚡ RTM SIGNED!"
                        : "🔨 HAMMERED SOLD!"}
                    </div>
                    <h3 className="font-display text-3xl sm:text-4xl font-extrabold uppercase text-white">
                      {state.lastEvent.playerName}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-300">
                      Signed by{" "}
                      <strong
                        className="font-bold"
                        style={{ color: state.lastEvent.teamColor || "#F59E0B" }}
                      >
                        {state.lastEvent.teamName}
                      </strong>{" "}
                      for{" "}
                      <span className="font-mono text-xl font-extrabold text-amber-400">
                        {formatLakhs(state.lastEvent.amountLakhs)}
                      </span>
                    </p>
                  </div>
                ) : state.lastEvent?.type === "unsold" ? (
                  <div className="space-y-3">
                    {lastLotRp && (
                      <div className="mx-auto w-40 sm:w-48 grayscale opacity-80">
                        <PlayerPhoto
                          key={lastLotRp.player.slug}
                          slug={lastLotRp.player.slug}
                          name={lastLotRp.player.name}
                          country={lastLotRp.player.country}
                          imageUrl={lastLotRp.player.imageUrl}
                          quality="large"
                          eager
                          rounded="rounded-2xl"
                          className="h-48 sm:h-56 w-full"
                          initialsClass="text-5xl"
                        />
                      </div>
                    )}
                    <div className="inline-block animate-gavel-stamp rounded-xl border-2 border-red-400 bg-red-500/20 px-6 py-2 font-display text-3xl font-extrabold uppercase tracking-widest text-red-300">
                      PASSED UNSOLD
                    </div>
                    <h3 className="font-display text-3xl font-extrabold uppercase text-white">
                      {state.lastEvent.playerName}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Available later for Accelerated Re-Auction Round
                    </p>
                  </div>
                ) : (
                  <h3 className="font-display text-2xl font-bold uppercase text-white">
                    Ready for Next Auction Lot
                  </h3>
                )}

                {/* IPL Right-To-Match (RTM) Button */}
                {canExerciseRtm && mostRecentlySoldRp && myTeam && (
                  <div className="mx-auto max-w-md rounded-2xl border border-sky-400/50 bg-sky-500/15 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-sky-300 mb-2">
                      Right-To-Match Opportunity ({myTeam.rtmCardsRemaining} RTM
                      Left)
                    </div>
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() =>
                        sendRoomAction({ action: "use_rtm", teamId: myTeam.id })
                      }
                      className="w-full rounded-xl bg-sky-500 px-5 py-3 font-display text-xl font-extrabold uppercase tracking-wider text-slate-950 hover:bg-sky-400 transition"
                    >
                      Play RTM Card — Match{" "}
                      {formatLakhs(mostRecentlySoldRp.soldPriceLakhs)}
                    </button>
                  </div>
                )}

                {state.status === "live" && pendingPlayers.length > 0 && (
                  <div className="mx-auto max-w-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Next player on the block in
                    </div>
                    <div className="font-mono text-4xl font-extrabold text-amber-400 tabular-nums">
                      {Math.ceil(nextLotMs / 1000)}s
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-100"
                        style={{ width: `${(nextLotMs / AUTO_NEXT_LOT_DELAY_MS) * 100}%` }}
                      />
                    </div>
                    {pendingPlayers[0] && (
                      <div className="mt-2 text-xs text-gray-300">
                        Up next: <strong className="text-white">{pendingPlayers[0].player.name}</strong> (
                        {pendingPlayers[0].player.role} • Base {formatLakhs(pendingPlayers[0].player.basePriceLakhs)})
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-3">
                  {state.isHost ? (
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() =>
                        sendRoomAction({ action: "start_or_next" })
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
                    >
                      <Gavel className="h-5 w-5" />
                      Bring Next Player to the Block ({pendingPlayers.length}{" "}
                      Left)
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">
                      Waiting for Commissioner ({state.hostName}) to draw the
                      next player...
                    </span>
                  )}
                </div>
              </div>
            )}

          {/* ========== UP NEXT STRIP (visible to everyone) ========== */}
          {state.status !== "completed" && pendingPlayers.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
                  Up Next in the Auction
                </span>
                <button
                  type="button"
                  onClick={() => setShowUpcomingModal(true)}
                  className="text-[11px] font-bold uppercase text-sky-400 hover:text-sky-300"
                >
                  View all {pendingPlayers.length} →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {pendingPlayers.slice(0, 6).map((rp, i) => (
                  <div
                    key={rp.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-[#0A0E17] px-2.5 py-2"
                  >
                    <PlayerPhoto
                      slug={rp.player.slug}
                      name={rp.player.name}
                      country={rp.player.country}
                      imageUrl={rp.player.imageUrl}
                      className="h-11 w-11"
                      initialsClass="text-sm"
                      eager={i === 0}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        <span className="font-mono text-gray-500 mr-1">#{i + 1}</span>
                        {getCountryMeta(rp.player.country).flag} {rp.player.name}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {rp.player.role} • {rp.player.setCategory}
                        {isPlayerOverseasForRoom(rp.player, rules) ? " • ✈ OS" : ""}
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400 shrink-0">
                      {formatLakhsCompact(rp.player.basePriceLakhs)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========== STAGE MODE 4: AUCTION COMPLETED ========== */}
          {state.status === "completed" && (
            <div className="rounded-2xl border border-amber-500/40 bg-[#111827] p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase text-amber-300 mb-2">
                    <Trophy className="h-3.5 w-3.5" />
                    Final Auction Gala Summary
                  </div>
                  <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase text-white">
                    Auction Complete — {soldPlayers.length} Players Signed!
                  </h2>
                </div>

                {state.isHost && (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={() => sendRoomAction({ action: "sync_pool" })}
                    className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-sky-300 hover:bg-sky-500 hover:text-slate-950"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Sync Latest Players
                  </button>
                )}
                {state.isHost && unsoldPlayers.length > 0 && (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={() =>
                      sendRoomAction({ action: "requeue_unsold" })
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-emerald-400"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Re-Auction {unsoldPlayers.length} Unsold Players
                  </button>
                )}
              </div>

              {/* Top Signings Leaderboard */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
                  Most Expensive Signings of the Room
                </h3>
                {soldPlayers.length === 0 ? (
                  <p className="text-xs text-gray-400">No players were sold.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[...soldPlayers]
                      .sort(
                        (a, b) =>
                          (b.soldPriceLakhs || 0) - (a.soldPriceLakhs || 0)
                      )
                      .slice(0, 6)
                      .map((rp, idx) => {
                        const buyer = state.teams.find(
                          (t) => t.id === rp.soldToTeamId
                        );
                        return (
                          <div
                            key={rp.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0A0E17] p-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-xs font-bold text-gray-500">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-display text-lg font-bold uppercase text-white truncate">
                                  {rp.player.name}
                                </div>
                                <div className="text-[11px] text-gray-400">
                                  {buyer?.name || "Franchise"} • {rp.player.role}
                                </div>
                              </div>
                            </div>
                            <div className="font-mono text-sm font-extrabold text-amber-400 shrink-0">
                              {formatLakhs(rp.soldPriceLakhs)}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ---------- RIGHT COLUMN: LIVE BID TICKER, POOL QUEUE & SQUADS ---------- */}
        <aside
          className={`lg:col-span-3 space-y-3 ${
            mobileSection === "feed" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4 flex flex-col h-[76vh]">
            {/* Tab Selector */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#0A0E17] p-1 mb-3 shrink-0">
              <button
                type="button"
                onClick={() => setRightTab("bids")}
                className={`rounded-lg py-1.5 text-xs font-bold uppercase transition ${
                  rightTab === "bids"
                    ? "bg-amber-500 text-slate-950"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Bids ({state.currentLotBids.length})
              </button>
              <button
                type="button"
                onClick={() => setRightTab("pool")}
                className={`rounded-lg py-1.5 text-xs font-bold uppercase transition ${
                  rightTab === "pool"
                    ? "bg-amber-500 text-slate-950"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Pool ({pendingPlayers.length})
              </button>
              <button
                type="button"
                onClick={() => setRightTab("squads")}
                className={`rounded-lg py-1.5 text-xs font-bold uppercase transition ${
                  rightTab === "squads"
                    ? "bg-amber-500 text-slate-950"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Squads
              </button>
            </div>

            {/* TAB 1: LIVE BID TICKER */}
            {rightTab === "bids" && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {state.currentLotBids.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                    <Gavel className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs">
                      {activeLot
                        ? `Awaiting opening paddle at ${formatLakhs(
                            activeLot.player.basePriceLakhs
                          )}...`
                        : "Live paddle history appears here as soon as a player goes on the block."}
                    </p>
                  </div>
                ) : (
                  state.currentLotBids.map((bid, index) => (
                    <div
                      key={bid.id}
                      className={`flex items-center justify-between rounded-xl border p-2.5 ${
                        index === 0
                          ? "border-amber-500/40 bg-amber-500/10"
                          : "border-white/5 bg-[#0A0E17]/75"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-extrabold text-slate-950"
                          style={{ backgroundColor: bid.teamColor }}
                        >
                          {bid.teamShortCode}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {bid.teamName}
                          </div>
                          {bid.isJumpBid && (
                            <span className="text-[10px] font-bold uppercase text-amber-400">
                              ⚡ Jump Bid
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-sm font-extrabold text-amber-400 tabular-nums shrink-0">
                        {formatLakhs(bid.amountLakhs)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: AUCTION PLAYER POOL & HOST NOMINATOR */}
            {rightTab === "pool" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="space-y-2 mb-2.5 shrink-0">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                    <input
                      type="text"
                      value={poolSearch}
                      onChange={(e) => setPoolSearch(e.target.value)}
                      placeholder="Filter room pool..."
                      className="w-full rounded-lg border border-white/10 bg-[#0A0E17] pl-8 pr-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        ["pending", `Queue (${pendingPlayers.length})`],
                        ["sold", `Sold (${soldPlayers.length})`],
                        ["unsold", `Unsold (${unsoldPlayers.length})`],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPoolFilter(key)}
                        className={`flex-1 rounded-md py-1 text-[10px] font-bold uppercase ${
                          poolFilter === key
                            ? "bg-white/15 text-white"
                            : "bg-[#0A0E17] text-gray-400"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredPool.map((rp) => {
                    const soldTeam = rp.soldToTeamId
                      ? state.teams.find((t) => t.id === rp.soldToTeamId)
                      : null;

                    return (
                      <div
                        key={rp.id}
                        className="rounded-xl border border-white/10 bg-[#0A0E17]/80 p-2.5 flex items-center justify-between gap-2"
                      >
                        <PlayerPhoto
                          slug={rp.player.slug}
                          name={rp.player.name}
                          country={rp.player.country}
                          imageUrl={rp.player.imageUrl}
                          className="h-10 w-10"
                          rounded="rounded-lg"
                          initialsClass="text-xs"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {getCountryMeta(rp.player.country).flag}{" "}
                              {rp.player.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {rp.player.role} • {rp.player.setCategory} • Base{" "}
                            <span className="font-mono text-amber-300">
                              {formatLakhsCompact(rp.player.basePriceLakhs)}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {rp.status === "sold" ? (
                            <div>
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                                {soldTeam?.shortCode || "SOLD"}{" "}
                                {formatLakhsCompact(rp.soldPriceLakhs)}
                              </span>
                            </div>
                          ) : state.isHost && !activeLot &&
                            (rp.status === "pending" ||
                              rp.status === "unsold") &&
                            state.teams.length >= 2 ? (
                            <button
                              type="button"
                              disabled={busyAction}
                              onClick={() =>
                                sendRoomAction({
                                  action: "start_or_next",
                                  roomPlayerId: rp.id,
                                })
                              }
                              className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition"
                            >
                              Bring Up
                            </button>
                          ) : (
                            <span className="font-mono text-[10px] uppercase text-gray-500">
                              {rp.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: FULL SQUAD MATRIX */}
            {rightTab === "squads" && (
              <div className="flex-1 flex flex-col min-h-0">
                <select
                  value={activeSquadInspectTeam?.id || ""}
                  onChange={(e) =>
                    setSelectedSquadTeamId(Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 text-xs font-bold text-white mb-3 shrink-0"
                >
                  {state.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.shortCode} — {t.name} (
                      {formatLakhs(t.purseRemainingLakhs)} left)
                    </option>
                  ))}
                </select>

                {activeSquadInspectTeam ? (
                  <div className="flex-1 overflow-y-auto pr-1">
                    <TeamSquadCard
                      team={activeSquadInspectTeam}
                      players={state.players}
                      rules={rules}
                      isLeading={state.currentBidTeamId === activeSquadInspectTeam.id}
                    />
                    <button
                      type="button"
                      onClick={() => setShowTeamsModal(true)}
                      className="mt-3 w-full rounded-xl border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-500 hover:text-slate-950"
                    >
                      Compare All Teams Side by Side
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No franchises joined.</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      <TeamSquadsModal
        open={showTeamsModal}
        onClose={() => setShowTeamsModal(false)}
        teams={state.teams}
        players={state.players}
        rules={state.rules}
        currentBidTeamId={state.currentBidTeamId}
      />

      <UpcomingPlayersModal
        open={showUpcomingModal}
        onClose={() => setShowUpcomingModal(false)}
        players={state.players}
        teams={state.teams}
        rules={state.rules}
        format={state.format}
        canNominate={state.isHost && !activeLot && state.teams.length >= 2 && state.status !== "completed"}
        canEditPhotos={state.isHost}
        onNominate={(id) => {
          setShowUpcomingModal(false);
          void sendRoomAction({ action: "start_or_next", roomPlayerId: id });
        }}
      />

      {/* ==================== SHARE LINK MODAL ==================== */}
      <ShareRoomModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        roomCode={state.code}
        roomName={state.name}
        format={state.format}
        rules={state.rules}
        joinedTeamsCount={state.teams.length}
      />

      {/* ==================== VIEW / EDIT CUSTOM RULES MODAL ==================== */}
      {showRulesModal && draftRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative my-auto w-full max-w-2xl rounded-2xl border border-amber-500/30 bg-[#111827] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowRulesModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-amber-400" />
              {state.isHost
                ? "Edit Custom Room Limits & Rules"
                : "Room Rules & Custom Limits"}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {state.isHost
                ? "Modify purse caps, squad sizes, overseas limits, or timer speed live — changes sync immediately to all franchises."
                : "Every bid in this room is validated in real time against these custom rules."}
            </p>

            <form onSubmit={handleSaveRules} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Room Title
                </label>
                <input
                  type="text"
                  disabled={!state.isHost}
                  value={draftRoomName}
                  onChange={(e) => setDraftRoomName(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 text-sm text-white disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    Purse (₹ Crores)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    disabled={!state.isHost}
                    value={Math.round(draftRules.purseLakhs / 100)}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        purseLakhs: Number(e.target.value || 100) * 100,
                      })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 font-mono text-sm font-bold text-amber-400 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    Min Squad Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    disabled={!state.isHost}
                    value={draftRules.minSquadSize}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        minSquadSize: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 font-mono text-sm text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    Max Squad Limit
                  </label>
                  <input
                    type="number"
                    min={draftRules.minSquadSize}
                    max={35}
                    disabled={!state.isHost}
                    value={draftRules.maxSquadSize}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        maxSquadSize: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 font-mono text-sm text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    Max Overseas
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={35}
                    disabled={!state.isHost || draftRules.homeCountry === "NONE"}
                    value={draftRules.maxOverseas}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        maxOverseas: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 font-mono text-sm text-indigo-300 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    Max Teams
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={16}
                    disabled={!state.isHost}
                    value={draftRules.maxTeams}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        maxTeams: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 font-mono text-sm text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    Bid Timer (Sec)
                  </label>
                  <input
                    type="number"
                    min={8}
                    max={120}
                    disabled={!state.isHost}
                    value={draftRules.bidTimerSeconds}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        bidTimerSeconds: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 font-mono text-sm text-emerald-400 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    Max Marquee / Team
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    disabled={!state.isHost}
                    value={draftRules.maxMarqueePerTeam}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        maxMarqueePerTeam: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 font-mono text-sm text-amber-300 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    RTM Cards / Team
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    disabled={!state.isHost}
                    value={draftRules.rtmCardsPerTeam}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        rtmCardsPerTeam: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 font-mono text-sm text-sky-300 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase text-gray-400 mb-1">
                    Increment Mode
                  </label>
                  <select
                    disabled={!state.isHost}
                    value={draftRules.incrementMode}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        incrementMode:
                          e.target.value === "fixed" ? "fixed" : "ipl_slabs",
                      })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-2.5 py-2 text-xs text-white disabled:opacity-60"
                  >
                    <option value="ipl_slabs">IPL Slabs</option>
                    <option value="fixed">Fixed Step</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="inline-flex items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    disabled={!state.isHost}
                    checked={draftRules.allowJumpBids}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        allowJumpBids: e.target.checked,
                      })
                    }
                  />
                  Allow Jump Bids
                </label>

                <label className="inline-flex items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    disabled={!state.isHost}
                    checked={draftRules.reserveBasePriceProtection}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        reserveBasePriceProtection: e.target.checked,
                      })
                    }
                  />
                  Reserve Purse for Min-Squad Slots
                </label>

                <span className="inline-flex items-center gap-2 text-xs text-emerald-300">
                  <Clock className="h-3.5 w-3.5" />
                  Players are SOLD automatically when the timer hits 0s
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold uppercase text-gray-300"
                >
                  Close
                </button>
                {state.isHost && (
                  <button
                    type="submit"
                    disabled={busyAction}
                    className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-amber-400"
                  >
                    Save Custom Limits
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ADD CUSTOM PLAYER TO ROOM MODAL ==================== */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#111827] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowAddPlayerModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-display text-2xl font-extrabold uppercase text-white">
              Add Custom Player to This Room
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Inject any custom player or friend directly to the front of this room&apos;s auction queue!
            </p>

            <form
              onSubmit={handleAddCustomRoomPlayer}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs uppercase text-gray-300 mb-1">
                  Player Name
                </label>
                <input
                  type="text"
                  required
                  value={cpName}
                  onChange={(e) => setCpName(e.target.value)}
                  placeholder="e.g. MS Dhoni / Local Club Star"
                  className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase text-gray-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    required
                    value={cpCountry}
                    onChange={(e) => setCpCountry(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={cpRole}
                    onChange={(e) => setCpRole(e.target.value as PlayerRole)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-2.5 py-2 text-xs text-white"
                  >
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase text-gray-300 mb-1">
                    Base Price
                  </label>
                  <select
                    value={cpBaseLakhs}
                    onChange={(e) => setCpBaseLakhs(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-2.5 py-2 font-mono text-xs text-amber-300"
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
                  <label className="block text-xs uppercase text-gray-300 mb-1">
                    OVR Rating
                  </label>
                  <input
                    type="number"
                    min={65}
                    max={99}
                    value={cpRating}
                    onChange={(e) => setCpRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase text-gray-300 mb-1">
                  Photo URL (optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={cpImageUrl}
                    onChange={(e) => setCpImageUrl(e.target.value)}
                    placeholder="https://.../player.jpg"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0E17] px-3 py-2 text-xs text-white"
                  />
                  <PlayerPhoto
                    slug={`custom-preview-${cpImageUrl}`}
                    name={cpName || "New Player"}
                    country={cpCountry}
                    imageUrl={cpImageUrl || null}
                    className="h-10 w-10"
                    rounded="rounded-lg"
                    initialsClass="text-xs"
                    eager
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={cpMarquee}
                    onChange={(e) => setCpMarquee(e.target.checked)}
                  />
                  Marquee Player
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={cpCapped}
                    onChange={(e) => setCpCapped(e.target.checked)}
                  />
                  Capped International
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(false)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold uppercase text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyAction}
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-extrabold uppercase text-slate-950 hover:bg-amber-400"
                >
                  Add to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
