"use client";

import React, { useEffect, useState } from "react";
import { getCountryMeta, getInitials } from "@/lib/client-utils";

/**
 * Photos are served from our own domain (/api/player-photo/[slug]) — the server downloads
 * each image once from Wikimedia and caches the bytes in Postgres. A per-slug version
 * number busts the browser cache when a host sets / resets a photo manually.
 */
const versions = new Map<string, number>();
const failed = new Set<string>();
const listeners = new Map<string, Set<() => void>>();

function photoSrc(slug: string, name: string) {
  const v = versions.get(slug) ?? 1;
  return `/api/player-photo/${encodeURIComponent(slug)}?name=${encodeURIComponent(name)}&v=${v}`;
}

/** Called after a manual photo change so every mounted PlayerPhoto re-fetches. */
export function setCachedPlayerPhoto(slug: string, version: number = Date.now()) {
  const key = slug.toLowerCase();
  versions.set(key, version);
  failed.delete(key);
  listeners.get(key)?.forEach((fn) => fn());
}

/** Warm the browser cache (e.g. for the next player in the queue). */
export function prefetchPlayerPhoto(slug: string, name: string) {
  const key = slug.toLowerCase();
  if (typeof window === "undefined" || key.startsWith("custom-") || failed.has(key)) return;
  const img = new window.Image();
  img.decoding = "async";
  img.src = photoSrc(key, name);
}

interface PlayerPhotoProps {
  slug: string;
  name: string;
  country: string;
  imageUrl?: string | null;
  /** kept for API compatibility — all photos are stored at 500px */
  quality?: "thumb" | "large";
  /** "cover" crops to fill; "showcase" shows the whole photo over a blurred backdrop */
  fit?: "cover" | "showcase";
  className?: string;
  rounded?: string;
  showFlag?: boolean;
  eager?: boolean;
  initialsClass?: string;
}

export function PlayerPhoto({
  slug,
  name,
  country,
  imageUrl,
  fit = "cover",
  className = "h-12 w-12",
  rounded = "rounded-xl",
  showFlag = false,
  eager = false,
  initialsClass = "text-lg",
}: PlayerPhotoProps) {
  const key = slug.toLowerCase();
  const [, force] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(() => !imageUrl && failed.has(key));

  useEffect(() => {
    const fn = () => {
      setLoaded(false);
      setError(false);
      force((n) => n + 1);
    };
    const set = listeners.get(key) ?? new Set();
    set.add(fn);
    listeners.set(key, set);
    return () => {
      set.delete(fn);
    };
  }, [key]);

  useEffect(() => {
    setLoaded(false);
    setError(!imageUrl && failed.has(key));
  }, [key, imageUrl]);

  const meta = getCountryMeta(country);
  const isCustomWithoutImage = key.startsWith("custom-") && !imageUrl;
  const src = imageUrl || (isCustomWithoutImage ? null : photoSrc(key, name));
  const showImage = Boolean(src) && !error;

  const onError = () => {
    if (!imageUrl) failed.add(key);
    setError(true);
  };

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-white/15 bg-gradient-to-br ${meta.gradient} bg-[#0A0E17] ${rounded} ${className}`}
    >
      {/* Fallback crest: visible until the photo has loaded (or if none exists) */}
      {(!showImage || !loaded) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span
            className={`font-display font-extrabold tracking-tight leading-none ${initialsClass} ${
              showImage ? "animate-pulse opacity-60" : ""
            }`}
            style={{ color: meta.accent }}
          >
            {getInitials(name)}
          </span>
        </div>
      )}

      {showImage && fit === "showcase" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full scale-110 object-cover blur-2xl transition-opacity duration-500 ${
            loaded ? "opacity-50" : "opacity-0"
          }`}
        />
      )}

      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src as string}
          src={src as string}
          alt={name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          // @ts-expect-error fetchpriority is a valid HTML attribute
          fetchpriority={eager ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={onError}
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
            fit === "showcase" ? "object-contain object-center" : "object-cover object-[center_22%]"
          } ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {showFlag && (
        <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1 text-xs leading-5 shadow">{meta.flag}</span>
      )}
    </div>
  );
}
