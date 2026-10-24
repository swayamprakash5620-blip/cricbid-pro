"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy, Link2, MessageSquareShare, Users, X } from "lucide-react";
import { formatLakhs, type AuctionRules, type CricketFormat } from "@/types/auction";

interface ShareRoomModalProps {
  open: boolean;
  onClose: () => void;
  roomCode: string;
  roomName: string;
  format: CricketFormat;
  rules: AuctionRules;
  joinedTeamsCount: number;
}

export function ShareRoomModal({
  open,
  onClose,
  roomCode,
  roomName,
  format,
  rules,
  joinedTeamsCount,
}: ShareRoomModalProps) {
  const [origin, setOrigin] = useState("");
  const [copiedField, setCopiedField] = useState<"link" | "code" | "msg" | null>(
    null
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!open) return null;

  const shareUrl = `${origin}/room/${roomCode}`;
  const inviteMessage = `🏏 Join my Live Cricket Auction Room: "${roomName}"!\n• Format: ${format}\n• Purse: ${formatLakhs(
    rules.purseLakhs
  )} | Max Squad: ${rules.maxSquadSize} | Max Overseas: ${
    rules.homeCountry === "NONE" ? "Unlimited" : rules.maxOverseas
  }\n• Room Code: ${roomCode}\n👉 Click to Join Live: ${shareUrl}`;

  const copyText = async (text: string, type: "link" | "code" | "msg") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(type);
      setTimeout(() => setCopiedField(null), 2200);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/30 bg-[#111827] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          aria-label="Close Share Modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
              Invite Friends to Auction Room
            </h3>
            <p className="text-xs text-gray-400">
              Anyone with this link can claim a franchise or watch live in real time.
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#0A0E17] border border-white/10 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Users className="h-4 w-4 text-amber-400" />
            <span>
              Franchises Joined:{" "}
              <strong className="font-mono text-white">
                {joinedTeamsCount} / {rules.maxTeams}
              </strong>
            </span>
          </div>
          <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
            {format} POOL
          </span>
        </div>

        {/* Shareable Direct URL */}
        <div className="mt-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            Direct Shareable Join Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-xl border border-white/15 bg-[#0A0E17] px-3.5 py-2.5 font-mono text-xs sm:text-sm text-emerald-300 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => copyText(shareUrl, "link")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 transition hover:bg-emerald-400"
            >
              {copiedField === "link" ? (
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
          </div>
        </div>

        {/* Room Code */}
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            Room Access Code
          </label>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0A0E17] px-4 py-2.5">
            <span className="font-mono text-xl font-bold tracking-widest text-amber-400">
              {roomCode}
            </span>
            <button
              type="button"
              onClick={() => copyText(roomCode, "code")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              {copiedField === "code" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Code Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Full Invite Message */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => copyText(inviteMessage, "msg")}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-500 hover:text-slate-950"
          >
            {copiedField === "msg" ? (
              <>
                <Check className="h-4 w-4" />
                Full Invite Message Copied!
              </>
            ) : (
              <>
                <MessageSquareShare className="h-4 w-4" />
                Copy Full WhatsApp / Discord Invite
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
