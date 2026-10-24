export const PARTICIPANT_TOKEN_KEY = "cricbid_participant_token_v1";

export function getOrCreateParticipantToken(): string {
  if (typeof window === "undefined") return "";
  let existing = window.localStorage.getItem(PARTICIPANT_TOKEN_KEY);
  if (!existing) {
    existing =
      "cb_" +
      Math.random().toString(36).slice(2, 10) +
      "_" +
      Date.now().toString(36);
    window.localStorage.setItem(PARTICIPANT_TOKEN_KEY, existing);
  }
  return existing;
}

export interface CountryVisualMeta {
  code: string;
  flag: string;
  gradient: string;
  accent: string;
}

const COUNTRY_MAP: Record<string, CountryVisualMeta> = {
  india: {
    code: "IND",
    flag: "🇮🇳",
    gradient: "from-sky-500/30 via-blue-600/20 to-amber-500/20",
    accent: "#38BDF8",
  },
  australia: {
    code: "AUS",
    flag: "🇦🇺",
    gradient: "from-amber-400/30 via-yellow-500/20 to-emerald-600/20",
    accent: "#FACC15",
  },
  england: {
    code: "ENG",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    gradient: "from-rose-500/30 via-red-600/20 to-blue-700/20",
    accent: "#FB7185",
  },
  "south africa": {
    code: "RSA",
    flag: "🇿🇦",
    gradient: "from-emerald-500/30 via-green-600/20 to-amber-500/20",
    accent: "#34D399",
  },
  "new zealand": {
    code: "NZL",
    flag: "🇳🇿",
    gradient: "from-slate-400/30 via-zinc-700/30 to-sky-500/20",
    accent: "#E2E8F0",
  },
  "west indies": {
    code: "WI",
    flag: "🌴",
    gradient: "from-rose-700/35 via-amber-600/20 to-red-900/25",
    accent: "#F43F5E",
  },
  afghanistan: {
    code: "AFG",
    flag: "🇦🇫",
    gradient: "from-blue-500/30 via-emerald-600/20 to-rose-500/20",
    accent: "#60A5FA",
  },
  "sri lanka": {
    code: "SL",
    flag: "🇱🇰",
    gradient: "from-indigo-500/30 via-blue-700/20 to-amber-400/25",
    accent: "#818CF8",
  },
  pakistan: {
    code: "PAK",
    flag: "🇵🇰",
    gradient: "from-emerald-600/35 via-teal-700/20 to-lime-500/20",
    accent: "#10B981",
  },
  zimbabwe: {
    code: "ZIM",
    flag: "🇿🇼",
    gradient: "from-red-600/30 via-yellow-500/20 to-emerald-600/20",
    accent: "#FBBF24",
  },
  ireland: {
    code: "IRE",
    flag: "🇮🇪",
    gradient: "from-emerald-500/30 via-slate-600/20 to-orange-500/20",
    accent: "#34D399",
  },
  netherlands: {
    code: "NED",
    flag: "🇳🇱",
    gradient: "from-orange-500/35 via-red-600/20 to-blue-700/20",
    accent: "#FB923C",
  },
  scotland: {
    code: "SCO",
    flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    gradient: "from-blue-600/30 via-slate-700/20 to-sky-400/20",
    accent: "#60A5FA",
  },
  nepal: {
    code: "NEP",
    flag: "🇳🇵",
    gradient: "from-red-600/30 via-blue-800/20 to-rose-500/20",
    accent: "#F87171",
  },
  usa: {
    code: "USA",
    flag: "🇺🇸",
    gradient: "from-blue-700/30 via-slate-700/20 to-red-600/20",
    accent: "#93C5FD",
  },
  uae: {
    code: "UAE",
    flag: "🇦🇪",
    gradient: "from-emerald-600/30 via-slate-700/20 to-red-600/20",
    accent: "#4ADE80",
  },
  namibia: {
    code: "NAM",
    flag: "🇳🇦",
    gradient: "from-blue-600/30 via-red-600/20 to-emerald-600/20",
    accent: "#38BDF8",
  },
  bangladesh: {
    code: "BAN",
    flag: "🇧🇩",
    gradient: "from-teal-600/35 via-emerald-700/20 to-rose-500/20",
    accent: "#2DD4BF",
  },
};

export function getCountryMeta(country: string): CountryVisualMeta {
  const key = (country || "").trim().toLowerCase();
  return (
    COUNTRY_MAP[key] || {
      code: (country || "INT").slice(0, 3).toUpperCase(),
      flag: "🏏",
      gradient: "from-amber-500/25 via-slate-700/20 to-emerald-500/20",
      accent: "#F59E0B",
    }
  );
}

export function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length === 0) return "CR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
