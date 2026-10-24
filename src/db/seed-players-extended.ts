import type {
  CricketFormat,
  FormatStatLine,
  PlayerFormatStats,
  PlayerRole,
  PlayerSetCategory,
  PlayerSnapshot,
} from "@/types/auction";

// Bowling style shorthands
const RF = "Right-arm fast";
const RFM = "Right-arm fast-medium";
const RM = "Right-arm medium";
const LF = "Left-arm fast";
const LFM = "Left-arm fast-medium";
const OB = "Right-arm offbreak";
const LB = "Legbreak googly";
const SLA = "Slow left-arm orthodox";
const LWS = "Left-arm wrist-spin";
const NA = "None";

const ROLE: Record<string, PlayerRole> = {
  BAT: "Batsman",
  BOWL: "Bowler",
  AR: "All-Rounder",
  WK: "Wicketkeeper",
};

const SET: Record<string, PlayerSetCategory> = {
  BT: "Batsmen",
  ARS: "All-Rounders",
  WKS: "Wicketkeepers",
  FB: "Fast Bowlers",
  SP: "Spinners",
  UC: "Uncapped",
  MQ: "Marquee",
};

/**
 * Stats string format: "FMT Mat Runs Avg SR Wkts Econ Best|FMT ..."
 */
function parseStats(raw: string): {
  stats: PlayerFormatStats;
  formats: Exclude<CricketFormat, "ALL">[];
} {
  const stats: PlayerFormatStats = {};
  const formats: Exclude<CricketFormat, "ALL">[] = [];
  for (const chunk of raw.split("|")) {
    const t = chunk.trim().split(/\s+/);
    if (t.length < 8) continue;
    const fmt = t[0].toUpperCase() as Exclude<CricketFormat, "ALL">;
    const line: FormatStatLine = {
      matches: Number(t[1]),
      runs: Number(t[2]),
      average: Number(t[3]),
      strikeRate: Number(t[4]),
      wickets: Number(t[5]),
      economy: Number(t[6]),
      best: t[7],
    };
    const key = fmt.toLowerCase() as keyof PlayerFormatStats;
    stats[key] = line;
    formats.push(fmt);
  }
  return { stats, formats };
}

export function p(
  name: string,
  country: string,
  role: keyof typeof ROLE,
  bat: "R" | "L",
  bowl: string,
  set: keyof typeof SET,
  basePriceLakhs: number,
  franchiseTag: string,
  rating: number,
  statsRaw: string,
  flags = ""
): PlayerSnapshot {
  const { stats, formats } = parseStats(statsRaw);
  const isUncapped = flags.includes("U");
  return {
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    name,
    country,
    isOverseasDefault: country !== "India",
    role: ROLE[role],
    battingStyle: bat === "L" ? "Left-hand bat" : "Right-hand bat",
    bowlingStyle: bowl,
    setCategory: SET[set],
    isCapped: !isUncapped,
    isMarquee: flags.includes("M"),
    basePriceLakhs,
    franchiseTag,
    formats,
    stats,
    rating,
  };
}

export const EXTENDED_PLAYERS_SEED: PlayerSnapshot[] = [
  // ==================== INDIA ====================
  p("MS Dhoni", "India", "WK", "R", RM, "WKS", 200, "CSK", 89, "IPL 278 5439 38.3 137.5 0 0 84*"),
  p("Deepak Chahar", "India", "BOWL", "R", RM, "FB", 100, "MI", 85, "IPL 95 101 13.0 135.0 88 7.9 4/13|T20I 25 80 20.0 140.0 31 7.6 6/7|ODI 13 203 33.8 98.0 16 6.0 3/24"),
  p("Bhuvneshwar Kumar", "India", "BOWL", "R", RFM, "FB", 100, "RCB", 86, "IPL 190 320 9.4 108.0 198 7.6 5/19|T20I 87 67 9.6 103.0 90 6.9 5/4|ODI 121 552 13.5 79.0 141 5.1 6/31|TEST 21 552 22.0 49.0 63 2.9 6/82"),
  p("T Natarajan", "India", "BOWL", "L", LFM, "FB", 75, "DC", 83, "IPL 64 10 3.3 50.0 67 8.8 4/19|T20I 4 0 0 0 7 7.6 3/30|ODI 2 0 0 0 3 6.9 2/70|TEST 1 1 0.5 10.0 3 3.4 3/78"),
  p("Avesh Khan", "India", "BOWL", "R", RF, "FB", 100, "LSG", 84, "IPL 64 60 10.0 115.0 74 9.1 4/24|T20I 25 20 6.7 95.0 19 9.2 4/18|ODI 8 16 8.0 64.0 9 6.6 4/27"),
  p("Mukesh Kumar", "India", "BOWL", "R", RFM, "FB", 75, "DC", 83, "IPL 33 12 4.0 80.0 32 10.2 4/33|T20I 17 3 3.0 60.0 20 9.6 4/22|ODI 6 6 6.0 50.0 5 6.1 3/30|TEST 3 2 1.0 25.0 7 3.4 2/18"),
  p("Khaleel Ahmed", "India", "BOWL", "R", LFM, "FB", 100, "CSK", 85, "IPL 70 22 4.4 70.0 89 8.8 3/21|T20I 18 6 3.0 75.0 16 8.6 3/13|ODI 11 9 3.0 60.0 15 5.6 3/13"),
  p("Shardul Thakur", "India", "AR", "R", RM, "ARS", 75, "LSG", 84, "IPL 105 325 15.5 138.0 107 9.2 4/34|T20I 25 69 23.0 136.0 33 9.2 4/27|ODI 47 329 17.3 106.0 65 6.2 4/37|TEST 11 331 20.7 70.0 31 3.6 7/61"),
  p("Venkatesh Iyer", "India", "AR", "L", RM, "ARS", 150, "KKR", 85, "IPL 61 1468 28.2 137.0 3 9.5 104|T20I 9 133 33.3 133.0 5 8.0 2/40|ODI 2 24 12.0 85.0 0 7.0 0/18"),
  p("Krunal Pandya", "India", "AR", "L", SLA, "ARS", 100, "RCB", 85, "IPL 141 1748 22.4 132.0 93 7.3 4/45|T20I 19 124 15.5 125.0 15 8.1 3/18|ODI 5 130 65.0 130.0 2 6.0 1/59"),
  p("Devdutt Padikkal", "India", "BAT", "L", OB, "BT", 75, "RCB", 84, "IPL 71 1806 26.6 126.0 0 0 101*|T20I 2 38 38.0 105.0 0 0 29|TEST 2 90 45.0 60.0 0 0 65"),
  p("Jitesh Sharma", "India", "WK", "R", NA, "WKS", 100, "RCB", 84, "IPL 55 991 22.5 155.0 0 0 85*|T20I 9 100 14.3 147.0 0 0 35"),
  p("Karun Nair", "India", "BAT", "R", OB, "BT", 50, "DC", 82, "IPL 84 1694 23.9 130.0 0 0 89|ODI 2 46 23.0 82.0 0 0 39|TEST 10 579 48.3 56.0 0 0 303*"),
  p("Abhishek Porel", "India", "WK", "L", NA, "UC", 75, "DC", 83, "IPL 31 661 24.5 151.0 0 0 65", "U"),
  p("Rahul Chahar", "India", "BOWL", "R", LB, "SP", 75, "SRH", 82, "IPL 79 70 7.0 85.0 75 7.6 4/27|T20I 6 5 5.0 70.0 7 8.4 3/15|ODI 1 0 0 0 3 6.6 3/54"),
  p("Harshal Patel", "India", "BOWL", "R", RM, "FB", 125, "SRH", 86, "IPL 119 453 12.6 140.0 151 8.9 5/27|T20I 25 52 13.0 120.0 29 9.2 4/25"),
  p("Sandeep Sharma", "India", "BOWL", "R", RM, "FB", 75, "RR", 84, "IPL 135 46 5.1 64.0 146 7.9 5/18|T20I 2 0 0 0 1 7.0 1/23"),
  p("Tushar Deshpande", "India", "BOWL", "L", RFM, "FB", 75, "RR", 82, "IPL 47 33 8.3 110.0 51 9.6 4/27|T20I 2 0 0 0 1 10.5 1/30"),
  p("Shahbaz Ahmed", "India", "AR", "L", SLA, "ARS", 50, "LSG", 82, "IPL 55 525 18.1 120.0 18 8.4 3/7|T20I 2 0 0 0 0 7.4 0/37|ODI 3 0 0 0 4 4.9 3/32"),
  p("Ramandeep Singh", "India", "AR", "R", RM, "ARS", 50, "KKR", 81, "IPL 26 210 21.0 175.0 5 10.0 2/20|T20I 2 6 6.0 100.0 1 6.0 1/5"),
  p("Nitish Rana", "India", "BAT", "L", OB, "BT", 75, "RR", 82, "IPL 117 2853 28.0 136.0 10 7.5 87|T20I 2 15 7.5 107.0 0 0 9|ODI 1 7 7.0 50.0 0 0 7"),
  p("Ajinkya Rahane", "India", "BAT", "R", RM, "BT", 100, "KKR", 84, "IPL 198 5032 30.0 124.0 1 5.0 105*|T20I 20 375 20.8 113.0 0 0 61|ODI 90 2962 35.3 78.6 0 0 111|TEST 85 5077 38.5 49.6 0 0 188"),
  p("R Sai Kishore", "India", "BOWL", "L", SLA, "SP", 75, "GT", 83, "IPL 25 25 8.3 100.0 25 8.0 4/33|T20I 3 0 0 0 4 7.2 1/12"),
  p("Ishant Sharma", "India", "BOWL", "R", RF, "FB", 50, "GT", 80, "IPL 116 39 3.9 72.0 96 8.2 5/12|ODI 80 72 5.1 52.0 115 5.7 4/34|TEST 105 785 8.0 30.0 311 3.2 7/74"),
  p("Mohit Sharma", "India", "BOWL", "R", RM, "FB", 50, "DC", 81, "IPL 120 95 7.3 95.0 134 8.6 5/10|T20I 8 0 0 0 6 8.3 2/39|ODI 26 31 5.2 48.0 31 5.5 4/22"),
  p("Rahul Tewatia", "India", "AR", "L", LB, "UC", 75, "GT", 83, "IPL 107 1205 25.6 140.0 32 8.0 3/18", "U"),
  p("Shahrukh Khan", "India", "BAT", "R", OB, "UC", 50, "GT", 82, "IPL 43 548 20.3 140.5 0 0 58", "U"),
  p("Naman Dhir", "India", "AR", "R", OB, "UC", 40, "MI", 81, "IPL 23 392 24.5 180.0 1 9.0 1/14", "U"),
  p("Priyansh Arya", "India", "BAT", "L", NA, "UC", 40, "PBKS", 84, "IPL 17 475 27.9 179.2 0 0 103", "U"),
  p("Vaibhav Suryavanshi", "India", "BAT", "L", SLA, "UC", 30, "RR", 85, "IPL 7 252 36.0 206.6 0 0 101", "U"),
  p("Ayush Mhatre", "India", "BAT", "R", OB, "UC", 30, "CSK", 83, "IPL 7 240 34.3 188.9 0 0 94", "U"),
  p("Vipraj Nigam", "India", "AR", "R", LB, "UC", 30, "DC", 81, "IPL 14 142 20.3 179.7 11 9.5 2/18", "U"),
  p("Digvesh Rathi", "India", "BOWL", "R", LB, "UC", 30, "LSG", 82, "IPL 13 1 1.0 50.0 14 8.2 2/30", "U"),
  p("Ashwani Kumar", "India", "BOWL", "L", LFM, "UC", 30, "MI", 80, "IPL 4 0 0 0 6 10.2 4/24", "U"),
  p("Aniket Verma", "India", "BAT", "R", OB, "UC", 30, "SRH", 81, "IPL 14 236 26.2 166.2 0 0 74", "U"),
  p("Anshul Kamboj", "India", "AR", "R", RM, "UC", 40, "CSK", 82, "IPL 11 25 12.5 113.6 10 8.4 3/13", "U"),
  p("Vijaykumar Vyshak", "India", "BOWL", "R", RM, "UC", 30, "PBKS", 80, "IPL 17 18 6.0 120.0 15 10.1 3/20", "U"),

  // ==================== AUSTRALIA ====================
  p("Mitchell Marsh", "Australia", "AR", "R", RM, "ARS", 200, "LSG", 90, "IPL 52 1111 26.5 141.0 37 9.2 4/25|T20I 64 1679 32.9 135.0 20 8.0 3/17|ODI 92 2805 35.5 95.0 61 5.5 5/33|TEST 46 2265 31.5 62.0 50 3.4 4/61"),
  p("Usman Khawaja", "Australia", "BAT", "L", RM, "BT", 75, "INTL", 87, "T20I 9 241 26.8 122.0 0 0 58|ODI 40 1554 42.0 84.3 0 0 104|TEST 85 6206 43.4 49.0 0 0 232"),
  p("Nathan Ellis", "Australia", "BOWL", "R", RFM, "FB", 100, "CSK", 85, "IPL 16 12 6.0 90.0 17 8.6 4/30|T20I 28 41 13.7 120.0 36 8.1 3/21|ODI 10 52 17.3 85.0 13 5.9 3/33"),
  p("Spencer Johnson", "Australia", "BOWL", "L", LF, "FB", 100, "KKR", 84, "IPL 10 9 4.5 100.0 4 10.9 1/29|T20I 9 6 6.0 85.0 11 8.3 5/26|ODI 3 0 0 0 6 6.2 4/41"),
  p("Sean Abbott", "Australia", "BOWL", "R", RFM, "FB", 75, "INTL", 83, "IPL 2 0 0 0 1 12.0 1/36|T20I 21 125 20.8 140.0 23 9.0 3/20|ODI 30 386 18.4 102.0 37 5.8 4/27"),
  p("Xavier Bartlett", "Australia", "BOWL", "R", RFM, "FB", 100, "PBKS", 84, "IPL 6 4 4.0 80.0 6 9.2 2/26|T20I 8 20 10.0 120.0 9 7.8 2/22|ODI 7 54 13.5 95.0 13 5.1 4/17"),
  p("Matthew Short", "Australia", "AR", "R", OB, "ARS", 75, "INTL", 83, "IPL 6 117 19.5 130.0 0 8.0 0/12|T20I 15 330 25.4 150.0 6 8.2 5/22|ODI 13 315 26.3 104.0 5 5.4 2/38"),
  p("Aaron Hardie", "Australia", "AR", "R", RFM, "ARS", 75, "PBKS", 82, "T20I 9 104 20.8 135.0 7 9.5 3/20|ODI 13 216 21.6 85.0 9 6.2 2/34"),
  p("Scott Boland", "Australia", "BOWL", "R", RFM, "FB", 75, "INTL", 89, "ODI 14 26 6.5 55.0 16 5.8 3/67|TEST 14 168 12.9 37.0 62 2.7 6/7"),
  p("Beau Webster", "Australia", "AR", "R", OB, "ARS", 75, "INTL", 84, "TEST 5 302 43.1 62.0 7 3.4 3/49"),
  p("Sam Konstas", "Australia", "BAT", "R", OB, "BT", 50, "INTL", 82, "TEST 5 192 21.3 66.0 0 0 60"),
  p("Cooper Connolly", "Australia", "AR", "L", SLA, "ARS", 50, "INTL", 81, "T20I 4 28 9.3 115.0 2 8.5 1/14|ODI 6 120 30.0 110.0 6 4.9 5/22|TEST 1 4 2.0 30.0 2 3.1 1/26"),
  p("Mitchell Owen", "Australia", "AR", "R", RM, "ARS", 75, "PBKS", 82, "IPL 1 0 0 0 0 0 0|T20I 6 145 29.0 190.0 3 8.0 1/20"),
  p("Ben Dwarshuis", "Australia", "BOWL", "L", LFM, "FB", 75, "PBKS", 83, "T20I 10 47 15.7 140.0 15 7.9 3/21|ODI 8 105 26.3 110.0 9 6.2 3/56"),
  p("Tanveer Sangha", "Australia", "BOWL", "R", LB, "SP", 50, "INTL", 81, "T20I 7 2 2.0 50.0 10 8.2 4/31|ODI 3 0 0 0 4 6.3 2/57"),
  p("Matt Kuhnemann", "Australia", "BOWL", "L", SLA, "SP", 50, "INTL", 83, "ODI 4 2 2.0 33.0 6 5.6 2/30|TEST 7 50 8.3 40.0 37 2.9 6/63"),
  p("Todd Murphy", "Australia", "BOWL", "R", OB, "SP", 50, "INTL", 82, "TEST 7 141 20.1 45.0 25 3.0 7/124"),

  // ==================== ENGLAND ====================
  p("Ben Duckett", "England", "BAT", "L", OB, "BT", 125, "INTL", 90, "T20I 19 457 26.9 145.0 0 0 70|ODI 19 1009 59.4 101.0 0 0 165|TEST 39 2721 42.5 86.5 0 0 182"),
  p("Zak Crawley", "England", "BAT", "R", RM, "BT", 75, "INTL", 85, "ODI 7 121 20.2 80.0 0 0 58|TEST 59 3354 31.3 70.0 0 0 267"),
  p("Ollie Pope", "England", "BAT", "R", NA, "BT", 75, "INTL", 85, "TEST 61 3600 35.0 62.0 0 0 205"),
  p("Jamie Smith", "England", "WK", "R", NA, "WKS", 125, "INTL", 89, "T20I 2 0 0 0 0 0 0|ODI 9 291 32.3 120.0 0 0 62|TEST 13 1035 51.8 82.0 0 0 184*"),
  p("Jonny Bairstow", "England", "WK", "R", NA, "WKS", 125, "MI", 86, "IPL 50 1589 34.5 144.5 0 0 114|T20I 80 1671 27.0 137.0 0 0 86*|ODI 107 3868 44.5 103.6 0 0 141*|TEST 100 5974 36.4 58.0 0 0 167*"),
  p("Brydon Carse", "England", "AR", "R", RF, "ARS", 100, "SRH", 86, "T20I 5 30 15.0 130.0 6 8.6 3/23|ODI 18 180 18.0 95.0 25 6.0 5/36|TEST 9 260 21.7 72.0 37 3.5 6/42"),
  p("Chris Woakes", "England", "AR", "R", RFM, "ARS", 100, "INTL", 86, "IPL 21 77 15.4 135.0 30 9.6 3/19|T20I 33 147 21.0 140.0 31 8.4 4/37|ODI 122 1524 23.8 89.0 173 5.4 6/45|TEST 62 2034 25.1 49.0 192 3.0 6/17"),
  p("Reece Topley", "England", "BOWL", "R", LFM, "FB", 75, "MI", 82, "IPL 3 0 0 0 1 10.6 1/37|T20I 25 7 3.5 70.0 34 7.8 4/22|ODI 28 33 5.5 55.0 39 5.4 6/24"),
  p("Rehan Ahmed", "England", "BOWL", "R", LB, "SP", 50, "INTL", 81, "T20I 7 25 12.5 120.0 10 8.4 3/39|ODI 6 30 10.0 80.0 9 6.4 4/62|TEST 4 136 17.0 58.0 16 4.1 5/48"),
  p("Shoaib Bashir", "England", "BOWL", "R", OB, "SP", 50, "INTL", 82, "TEST 19 220 11.0 40.0 68 3.8 6/41"),
  p("Jamie Overton", "England", "AR", "R", RF, "ARS", 150, "CSK", 85, "IPL 2 0 0 0 0 11.0 0/30|T20I 4 40 20.0 145.0 3 9.0 1/18|ODI 6 120 30.0 115.0 7 6.3 3/47|TEST 2 108 54.0 66.0 3 3.8 2/85"),
  p("Moeen Ali", "England", "AR", "L", OB, "ARS", 75, "KKR", 84, "IPL 73 1167 22.4 140.0 41 7.4 4/26|T20I 92 1229 21.6 140.0 51 7.6 3/24|ODI 138 2355 24.5 99.0 111 5.2 4/46|TEST 68 3094 28.1 51.0 204 3.6 6/53"),
  p("Saqib Mahmood", "England", "BOWL", "R", RFM, "FB", 75, "INTL", 83, "T20I 10 4 4.0 60.0 13 7.6 3/18|ODI 9 20 10.0 70.0 14 5.3 4/36|TEST 2 7 3.5 20.0 3 2.6 2/21"),
  p("Josh Tongue", "England", "BOWL", "R", RF, "FB", 75, "INTL", 83, "TEST 5 70 14.0 50.0 25 3.6 5/66"),

  // ==================== SOUTH AFRICA ====================
  p("Temba Bavuma", "South Africa", "BAT", "R", RM, "BT", 75, "INTL", 86, "T20I 36 670 23.1 120.0 0 0 72|ODI 49 1948 45.3 89.0 0 0 144|TEST 63 3708 38.6 49.0 1 3.0 172"),
  p("Reeza Hendricks", "South Africa", "BAT", "R", RM, "BT", 75, "INTL", 83, "T20I 75 2131 30.0 128.0 0 0 117|ODI 34 1100 34.4 82.0 0 0 102"),
  p("Rassie van der Dussen", "South Africa", "BAT", "R", LB, "BT", 100, "INTL", 85, "IPL 3 22 11.0 110.0 0 0 13|T20I 49 1265 33.3 125.0 0 0 94*|ODI 72 2700 49.0 87.0 0 0 134|TEST 18 905 30.2 42.0 0 0 98"),
  p("David Bedingham", "South Africa", "BAT", "R", NA, "BT", 50, "INTL", 83, "TEST 10 640 37.6 63.0 0 0 110"),
  p("Tony de Zorzi", "South Africa", "BAT", "L", OB, "BT", 50, "INTL", 83, "ODI 15 520 37.1 88.0 0 0 177*|TEST 12 790 39.5 50.0 0 0 177"),
  p("Lungi Ngidi", "South Africa", "BOWL", "R", RF, "FB", 100, "RCB", 86, "IPL 15 7 3.5 50.0 26 8.7 4/10|T20I 45 18 3.6 55.0 67 8.5 5/39|ODI 62 140 9.3 75.0 99 5.9 6/58|TEST 19 220 9.6 45.0 58 3.0 6/39"),
  p("Tabraiz Shamsi", "South Africa", "BOWL", "R", LWS, "SP", 75, "INTL", 85, "IPL 5 1 1.0 33.0 4 8.4 1/23|T20I 70 25 5.0 75.0 89 7.0 5/24|ODI 51 50 5.5 60.0 72 5.4 5/49"),
  p("Nandre Burger", "South Africa", "BOWL", "L", LF, "FB", 75, "RR", 83, "IPL 6 3 3.0 40.0 7 9.0 2/29|T20I 6 5 5.0 80.0 7 8.4 3/34|ODI 3 0 0 0 4 6.1 2/38|TEST 4 52 13.0 50.0 15 3.5 4/33"),
  p("Kwena Maphaka", "South Africa", "BOWL", "L", LF, "FB", 75, "RR", 83, "IPL 3 0 0 0 1 12.0 1/45|T20I 4 3 3.0 60.0 6 9.0 4/20|TEST 1 0 0 0 4 4.5 4/76"),
  p("Lizaad Williams", "South Africa", "BOWL", "L", RFM, "FB", 50, "MI", 81, "IPL 2 0 0 0 1 10.0 1/38|T20I 15 20 10.0 100.0 15 8.6 3/20|ODI 4 0 0 0 5 5.9 2/36"),
  p("Wiaan Mulder", "South Africa", "AR", "R", RFM, "ARS", 75, "INTL", 86, "T20I 9 110 18.3 115.0 4 9.0 2/10|ODI 25 300 20.0 80.0 22 5.6 3/32|TEST 21 1180 33.7 52.0 33 3.0 4/16"),
  p("Corbin Bosch", "South Africa", "AR", "R", RFM, "ARS", 50, "MI", 82, "IPL 2 27 27.0 135.0 1 10.0 1/30|ODI 4 51 25.5 90.0 6 5.9 2/41|TEST 4 230 46.0 62.0 9 3.4 4/63"),
  p("Senuran Muthusamy", "South Africa", "AR", "L", SLA, "ARS", 50, "INTL", 82, "ODI 3 20 10.0 70.0 3 5.0 2/26|TEST 6 220 31.4 45.0 22 3.1 6/117"),
  p("Kyle Verreynne", "South Africa", "WK", "R", NA, "WKS", 75, "INTL", 84, "ODI 18 450 30.0 95.0 0 0 95|TEST 25 1180 32.8 51.0 0 0 136*"),
  p("Donovan Ferreira", "South Africa", "BAT", "R", OB, "BT", 50, "RR", 81, "IPL 7 24 4.8 110.0 0 0 13|T20I 12 180 20.0 160.0 2 8.5 1/8"),

  // ==================== NEW ZEALAND ====================
  p("Tom Latham", "New Zealand", "WK", "L", NA, "WKS", 100, "INTL", 86, "T20I 26 516 21.5 112.0 0 0 65|ODI 147 4600 35.6 85.0 0 0 145*|TEST 88 5800 38.4 48.5 0 0 264*"),
  p("Will Young", "New Zealand", "BAT", "R", OB, "BT", 75, "INTL", 84, "T20I 18 300 18.8 120.0 0 0 56|ODI 37 1250 36.8 85.0 0 0 120|TEST 21 1150 32.9 48.0 0 0 89"),
  p("Lockie Ferguson", "New Zealand", "BOWL", "R", RF, "FB", 125, "PBKS", 87, "IPL 48 30 6.0 100.0 49 8.9 4/28|T20I 45 40 8.0 90.0 64 6.9 4/0|ODI 65 230 9.6 75.0 99 5.4 5/45|TEST 1 1 1.0 10.0 0 4.3 0/47"),
  p("Mark Chapman", "New Zealand", "BAT", "L", SLA, "BT", 75, "INTL", 83, "T20I 85 1900 26.4 135.0 3 8.5 2/9|ODI 26 750 34.1 98.0 2 6.0 1/10"),
  p("Michael Bracewell", "New Zealand", "AR", "L", OB, "ARS", 100, "INTL", 85, "IPL 5 58 19.3 145.0 4 7.4 2/27|T20I 30 500 25.0 142.0 25 7.3 5/26|ODI 50 1200 30.0 102.0 40 5.2 4/26|TEST 8 400 29.0 55.0 15 3.9 3/31"),
  p("Finn Allen", "New Zealand", "BAT", "R", NA, "BT", 100, "INTL", 85, "IPL 3 80 26.7 160.0 0 0 41|T20I 45 1200 27.3 165.0 0 0 137|ODI 25 700 28.0 105.0 0 0 96"),
  p("Tim Seifert", "New Zealand", "WK", "R", NA, "WKS", 75, "RCB", 83, "IPL 3 26 8.7 110.0 0 0 21|T20I 70 1600 25.4 135.0 0 0 97*|ODI 3 40 13.3 85.0 0 0 24"),
  p("Kyle Jamieson", "New Zealand", "AR", "R", RFM, "ARS", 100, "PBKS", 85, "IPL 13 65 10.8 130.0 9 9.6 2/41|T20I 15 40 13.3 115.0 15 8.1 3/22|ODI 15 180 25.7 90.0 20 5.4 4/42|TEST 20 515 25.8 60.0 82 2.7 6/48"),
  p("Will O'Rourke", "New Zealand", "BOWL", "R", RF, "FB", 75, "INTL", 85, "ODI 12 30 7.5 50.0 22 5.9 3/57|TEST 13 50 5.0 30.0 52 3.6 5/34"),
  p("Ish Sodhi", "New Zealand", "BOWL", "R", LB, "SP", 75, "INTL", 84, "IPL 8 3 3.0 60.0 9 7.8 3/26|T20I 120 300 10.0 115.0 150 8.0 4/12|ODI 55 500 18.0 90.0 64 5.4 6/39|TEST 20 800 26.6 47.0 50 3.6 6/86"),
  p("Jacob Duffy", "New Zealand", "BOWL", "R", RFM, "FB", 75, "INTL", 84, "T20I 35 30 7.5 110.0 50 7.7 4/15|ODI 15 40 8.0 60.0 25 5.6 4/45"),
  p("Tom Blundell", "New Zealand", "WK", "R", NA, "WKS", 50, "INTL", 82, "T20I 2 22 11.0 110.0 0 0 15|ODI 7 120 20.0 80.0 0 0 41|TEST 37 1800 32.0 50.0 0 0 138"),

  // ==================== WEST INDIES ====================
  p("Shai Hope", "West Indies", "WK", "R", NA, "WKS", 125, "DC", 87, "IPL 9 183 22.9 165.0 0 0 41|T20I 40 900 28.1 140.0 0 0 82|ODI 140 5600 50.0 83.0 0 0 170|TEST 41 2000 26.0 45.0 0 0 147*"),
  p("Brandon King", "West Indies", "BAT", "R", NA, "BT", 75, "INTL", 84, "T20I 65 1900 31.1 135.0 0 0 104*|ODI 50 1500 32.6 88.0 0 0 112"),
  p("Alzarri Joseph", "West Indies", "BOWL", "R", RF, "FB", 100, "INTL", 85, "IPL 19 26 6.5 115.0 20 9.2 6/12|T20I 50 110 11.0 120.0 60 8.9 4/40|ODI 80 450 13.2 85.0 120 5.4 5/56|TEST 35 750 15.0 55.0 105 3.4 5/33"),
  p("Akeal Hosein", "West Indies", "BOWL", "L", SLA, "SP", 75, "INTL", 85, "IPL 2 0 0 0 1 8.0 1/26|T20I 70 300 14.0 125.0 75 7.0 5/11|ODI 40 450 22.5 95.0 50 4.6 4/21"),
  p("Gudakesh Motie", "West Indies", "BOWL", "L", SLA, "SP", 50, "INTL", 83, "T20I 35 90 9.0 110.0 40 7.2 4/30|ODI 25 300 20.0 85.0 35 4.7 4/30|TEST 10 300 21.4 50.0 30 3.0 4/50"),
  p("Romario Shepherd", "West Indies", "AR", "R", RFM, "ARS", 150, "RCB", 86, "IPL 15 220 31.4 210.0 7 10.6 2/40|T20I 50 450 16.0 150.0 50 9.3 4/22|ODI 30 500 25.0 100.0 40 6.3 5/50"),
  p("Sherfane Rutherford", "West Indies", "BAT", "L", RM, "BT", 100, "GT", 85, "IPL 21 350 25.0 155.0 1 9.0 1/12|T20I 40 750 26.8 140.0 0 0 76*|ODI 15 600 46.2 115.0 0 0 113"),
  p("Jason Holder", "West Indies", "AR", "R", RFM, "ARS", 125, "GT", 86, "IPL 46 259 13.0 120.0 53 8.5 4/24|T20I 70 600 15.0 120.0 70 8.3 5/27|ODI 138 2200 24.0 94.0 159 5.5 5/27|TEST 69 2900 29.0 54.0 162 2.7 6/42"),
  p("Kraigg Brathwaite", "West Indies", "BAT", "R", OB, "BT", 50, "INTL", 82, "ODI 10 249 27.7 65.0 0 0 78|TEST 98 5900 33.0 41.0 24 3.0 6/29"),
  p("Roston Chase", "West Indies", "AR", "R", OB, "ARS", 75, "INTL", 84, "T20I 25 300 20.0 120.0 15 7.4 3/14|ODI 45 950 28.0 82.0 30 5.0 3/30|TEST 50 2300 26.0 44.0 85 3.4 8/60"),
  p("Jayden Seales", "West Indies", "BOWL", "L", RF, "FB", 75, "INTL", 84, "ODI 15 25 5.0 50.0 25 5.4 6/18|TEST 22 150 6.0 30.0 85 2.9 6/61"),
  p("Evin Lewis", "West Indies", "BAT", "L", NA, "BT", 75, "LSG", 83, "IPL 27 654 25.2 131.0 0 0 65|T20I 60 1700 29.0 155.0 0 0 125*|ODI 70 2200 37.0 85.0 0 0 176*"),

  // ==================== AFGHANISTAN ====================
  p("Ibrahim Zadran", "Afghanistan", "BAT", "R", NA, "BT", 100, "INTL", 87, "T20I 50 1400 31.1 115.0 0 0 100|ODI 37 1800 52.9 85.0 0 0 177|TEST 9 650 38.2 45.0 0 0 114"),
  p("Mohammad Nabi", "Afghanistan", "AR", "R", OB, "ARS", 75, "INTL", 83, "IPL 24 180 15.0 135.0 13 7.2 4/11|T20I 135 2300 22.0 136.0 100 7.3 4/10|ODI 170 3600 27.0 86.0 170 4.3 4/30|TEST 3 33 5.5 40.0 8 3.5 3/36"),
  p("Gulbadin Naib", "Afghanistan", "AR", "R", RM, "ARS", 50, "DC", 81, "IPL 2 25 12.5 140.0 0 9.0 0/9|T20I 70 1000 20.0 125.0 30 8.0 4/20|ODI 85 1500 21.0 85.0 70 5.6 6/43"),
  p("Mujeeb Ur Rahman", "Afghanistan", "BOWL", "R", OB, "SP", 100, "MI", 85, "IPL 19 10 5.0 70.0 19 8.1 3/27|T20I 50 100 11.0 110.0 60 6.4 5/20|ODI 75 200 10.0 85.0 100 4.3 5/50"),
  p("Naveen-ul-Haq", "Afghanistan", "BOWL", "R", RFM, "FB", 75, "LSG", 84, "IPL 18 10 5.0 90.0 25 8.9 4/38|T20I 50 50 7.1 95.0 65 7.3 4/20|ODI 15 40 10.0 70.0 22 5.9 4/42"),
  p("Hashmatullah Shahidi", "Afghanistan", "BAT", "L", NA, "BT", 50, "INTL", 82, "ODI 80 2600 38.0 72.0 0 0 97*|TEST 10 650 40.0 40.0 0 0 246"),
  p("AM Ghazanfar", "Afghanistan", "BOWL", "R", OB, "SP", 75, "MI", 84, "ODI 15 50 8.0 70.0 30 4.4 6/26"),

  // ==================== SRI LANKA ====================
  p("Kusal Mendis", "Sri Lanka", "WK", "R", NA, "WKS", 100, "GT", 86, "IPL 1 0 0 0 0 0 0|T20I 75 2200 30.0 133.0 0 0 86|ODI 140 4500 33.0 87.0 0 0 143|TEST 70 4700 39.0 60.0 0 0 245*"),
  p("Charith Asalanka", "Sri Lanka", "BAT", "L", OB, "BT", 100, "INTL", 85, "T20I 65 1300 24.0 120.0 5 7.5 1/16|ODI 75 2400 42.0 92.0 6 5.6 2/18"),
  p("Dhananjaya de Silva", "Sri Lanka", "AR", "R", OB, "ARS", 75, "INTL", 84, "T20I 40 600 20.0 115.0 15 7.0 3/16|ODI 90 2000 29.0 82.0 50 5.2 3/32|TEST 60 3600 40.0 55.0 40 3.5 4/48"),
  p("Angelo Mathews", "Sri Lanka", "AR", "R", RM, "ARS", 75, "DC", 84, "IPL 30 600 25.0 125.0 14 8.6 3/16|T20I 90 1400 23.0 120.0 45 7.4 4/16|ODI 221 5900 41.0 83.0 126 5.0 6/20|TEST 119 8167 44.6 48.0 33 3.0 4/44"),
  p("Dasun Shanaka", "Sri Lanka", "AR", "R", RM, "ARS", 75, "GT", 82, "IPL 3 26 8.7 100.0 0 9.0 0/9|T20I 100 1500 18.0 125.0 30 8.1 3/5|ODI 70 1300 23.0 100.0 30 6.0 5/43"),
  p("Dunith Wellalage", "Sri Lanka", "AR", "L", SLA, "ARS", 75, "INTL", 84, "T20I 6 40 13.3 110.0 4 8.0 2/31|ODI 35 600 26.0 85.0 45 5.2 5/27|TEST 2 40 13.3 50.0 3 3.3 2/43"),
  p("Prabath Jayasuriya", "Sri Lanka", "BOWL", "L", SLA, "SP", 75, "INTL", 86, "ODI 2 4 4.0 40.0 2 5.2 1/40|TEST 23 300 11.0 45.0 125 3.0 6/42"),
  p("Dilshan Madushanka", "Sri Lanka", "BOWL", "R", LFM, "FB", 75, "MI", 83, "T20I 15 3 1.5 50.0 15 8.4 3/24|ODI 30 50 5.0 65.0 45 6.0 5/80|TEST 2 3 3.0 30.0 6 3.6 3/67"),
  p("Asitha Fernando", "Sri Lanka", "BOWL", "R", RFM, "FB", 50, "INTL", 83, "ODI 15 30 6.0 50.0 18 6.2 4/51|TEST 22 150 7.0 35.0 75 3.4 5/102"),
  p("Kusal Perera", "Sri Lanka", "WK", "L", NA, "WKS", 75, "INTL", 82, "T20I 80 2100 27.0 132.0 0 0 84|ODI 115 3500 31.0 92.0 0 0 135|TEST 22 1180 31.0 63.0 0 0 153*"),

  // ==================== PAKISTAN ====================
  p("Fakhar Zaman", "Pakistan", "BAT", "L", SLA, "BT", 125, "INTL", 86, "T20I 95 1900 22.0 130.0 0 0 91|ODI 85 3600 45.0 93.0 1 6.0 1/19|TEST 3 192 32.0 55.0 0 0 94"),
  p("Shadab Khan", "Pakistan", "AR", "R", LB, "ARS", 100, "INTL", 84, "T20I 110 800 18.0 140.0 115 7.3 4/8|ODI 70 850 25.0 85.0 85 5.3 4/28|TEST 6 300 30.0 55.0 14 3.6 3/127"),
  p("Haris Rauf", "Pakistan", "BOWL", "R", RF, "FB", 125, "INTL", 86, "T20I 85 100 8.0 110.0 115 8.4 5/22|ODI 45 100 7.0 75.0 80 5.8 5/18|TEST 1 0 0 0 1 4.7 1/78"),
  p("Abrar Ahmed", "Pakistan", "BOWL", "R", LB, "SP", 75, "INTL", 84, "T20I 15 5 5.0 50.0 20 7.0 4/10|ODI 10 10 5.0 40.0 15 4.8 4/27|TEST 10 100 8.0 40.0 45 3.5 7/114"),
  p("Salman Ali Agha", "Pakistan", "AR", "R", OB, "ARS", 75, "INTL", 83, "T20I 25 400 24.0 120.0 8 7.5 2/16|ODI 30 1000 42.0 92.0 15 5.4 3/45|TEST 23 1300 38.0 60.0 20 3.6 4/53"),
  p("Saud Shakeel", "Pakistan", "BAT", "L", SLA, "BT", 75, "INTL", 85, "ODI 15 350 25.0 80.0 0 0 68|TEST 18 1400 50.0 48.0 0 0 208*"),
  p("Abdullah Shafique", "Pakistan", "BAT", "R", OB, "BT", 50, "INTL", 82, "T20I 5 50 10.0 120.0 0 0 41|ODI 15 500 33.0 77.0 0 0 113|TEST 23 1600 40.0 48.0 0 0 201"),
  p("Shan Masood", "Pakistan", "BAT", "L", RM, "BT", 50, "INTL", 82, "T20I 19 400 22.0 120.0 0 0 65|ODI 9 163 18.1 81.0 0 0 50|TEST 40 2300 31.0 52.0 0 0 156"),
  p("Noman Ali", "Pakistan", "BOWL", "L", SLA, "SP", 50, "INTL", 83, "TEST 20 400 15.0 45.0 90 2.6 8/46"),
  p("Mohammad Nawaz", "Pakistan", "AR", "L", SLA, "ARS", 50, "INTL", 82, "T20I 70 700 18.0 130.0 70 7.3 4/5|ODI 45 800 23.0 92.0 50 4.9 4/19|TEST 5 144 18.0 45.0 6 3.0 2/50"),

  // ==================== BANGLADESH ====================
  p("Najmul Hossain Shanto", "Bangladesh", "BAT", "L", OB, "BT", 75, "INTL", 83, "T20I 50 1000 22.0 115.0 3 7.0 1/9|ODI 50 1500 33.0 80.0 6 5.4 2/23|TEST 30 1800 33.0 50.0 1 4.0 1/18"),
  p("Litton Das", "Bangladesh", "WK", "R", NA, "WKS", 75, "INTL", 84, "IPL 1 4 4.0 100.0 0 0 4|T20I 110 2600 23.0 125.0 0 0 98|ODI 95 2600 30.0 82.0 0 0 176|TEST 50 2900 33.0 55.0 0 0 141"),
  p("Mushfiqur Rahim", "Bangladesh", "WK", "R", NA, "WKS", 50, "INTL", 82, "ODI 274 7795 36.4 79.7 0 0 144|TEST 98 6300 38.0 48.0 0 0 219*"),
  p("Taskin Ahmed", "Bangladesh", "BOWL", "L", RF, "FB", 75, "INTL", 84, "T20I 70 100 8.0 100.0 80 7.6 4/16|ODI 80 400 10.0 80.0 110 5.4 5/28|TEST 15 300 13.0 50.0 35 3.6 6/46"),
  p("Towhid Hridoy", "Bangladesh", "BAT", "R", NA, "BT", 50, "INTL", 82, "T20I 40 900 28.0 130.0 0 0 57*|ODI 30 900 35.0 85.0 0 0 100"),
  p("Rishad Hossain", "Bangladesh", "BOWL", "R", LB, "SP", 50, "INTL", 82, "T20I 30 100 10.0 160.0 40 7.9 3/18|ODI 15 100 12.0 115.0 15 5.6 4/37"),
  p("Taijul Islam", "Bangladesh", "BOWL", "L", SLA, "SP", 50, "INTL", 83, "ODI 15 80 10.0 60.0 20 4.6 4/11|TEST 55 1000 12.0 38.0 230 3.0 8/39"),
  p("Nahid Rana", "Bangladesh", "BOWL", "R", RF, "FB", 50, "INTL", 82, "ODI 6 2 2.0 25.0 8 5.4 5/32|TEST 10 20 3.0 20.0 30 3.6 5/61"),

  // ==================== ASSOCIATE & OTHER NATIONS ====================
  p("Sikandar Raza", "Zimbabwe", "AR", "R", OB, "ARS", 100, "PBKS", 86, "IPL 9 182 26.0 139.0 3 8.6 2/13|T20I 100 2500 27.0 140.0 85 7.0 4/8|ODI 150 4600 35.0 90.0 90 4.9 7/22|TEST 20 1100 31.0 55.0 35 3.4 7/113"),
  p("Blessing Muzarabani", "Zimbabwe", "BOWL", "R", RFM, "FB", 50, "INTL", 82, "T20I 70 100 6.0 90.0 80 7.4 4/14|ODI 55 150 7.0 70.0 70 5.2 5/49|TEST 14 200 9.0 45.0 50 3.0 6/73"),
  p("Paul Stirling", "Ireland", "BAT", "R", OB, "BT", 50, "INTL", 82, "T20I 150 3900 28.0 136.0 20 7.0 3/21|ODI 170 5900 35.0 87.0 40 5.0 6/55|TEST 7 200 16.0 55.0 0 4.0 0/0"),
  p("Josh Little", "Ireland", "BOWL", "R", LFM, "FB", 50, "GT", 82, "IPL 11 2 2.0 50.0 12 8.9 4/45|T20I 70 100 7.0 100.0 85 7.6 4/23|ODI 35 100 7.0 70.0 50 5.8 6/36|TEST 3 30 10.0 50.0 4 4.0 2/40"),
  p("Bas de Leede", "Netherlands", "AR", "R", RM, "ARS", 50, "INTL", 81, "T20I 50 1100 26.0 130.0 30 8.4 4/19|ODI 45 1300 31.0 90.0 50 5.9 5/52"),
];
