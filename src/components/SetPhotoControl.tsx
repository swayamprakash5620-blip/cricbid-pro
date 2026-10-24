"use client";

import React, { useState } from "react";
import { Camera, Check, RotateCcw } from "lucide-react";
import { setCachedPlayerPhoto } from "./PlayerPhoto";

export function SetPhotoControl({ slug, name, compact = false }: { slug: string; name: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (slug.startsWith("custom-")) return null;

  const save = async (value: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/player-image", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, url: value }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg(j.error || "Could not save photo");
        return;
      }
      setCachedPlayerPhoto(slug, j.version ?? Date.now());
      setMsg(value ? "Photo saved for everyone" : j.hasPhoto ? "Reset to automatic photo" : "Reset — no automatic photo found");
      setUrl("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 font-bold text-gray-300 hover:border-sky-500/40 hover:text-sky-300 ${
            compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
          }`}
        >
          <Camera className="h-3 w-3" />
          Set photo
        </button>
        {msg && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
            <Check className="h-3 w-3" />
            {msg}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        type="url"
        value={url}
        autoFocus
        onChange={(e) => setUrl(e.target.value)}
        placeholder={`Image URL for ${name}`}
        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0A0E17] px-2.5 py-1 text-[11px] text-white focus:border-sky-500 focus:outline-none"
      />
      <button
        type="button"
        disabled={busy || !url.trim()}
        onClick={() => save(url.trim())}
        className="rounded-lg bg-sky-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 disabled:opacity-40"
      >
        Save
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => save("")}
        title="Reset to automatic photo"
        className="rounded-lg border border-white/15 p-1 text-gray-400 hover:text-white"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-gray-500 hover:text-white">
        Cancel
      </button>
      {msg && <span className="w-full text-[10px] text-red-400">{msg}</span>}
    </div>
  );
}
