#!/usr/bin/env python3
"""
Builds src/db/player-stats-2026.json from LIVE data sources:

  * Wikipedia "Infobox cricketer"  -> Test / ODI / T20I career figures (matches, runs,
    average, 100s/50s, top score, wickets, bowling average, best bowling, catches),
    batting / bowling style, role, date of birth, last-match dates, "stats as of" date.
  * Wikidata P2697                 -> ESPNcricinfo player id (exact identity key).
  * Cricsheet register + ball-by-ball JSON
        - IPL (2008 → latest season): full IPL career + latest-season line, current team
        - Men's ODI / T20I / Test     : strike rate & economy (balls are needed for these)

Players are matched between sources by ESPNcricinfo id, never by fuzzy name.
Usage:  python3 scripts/generate-player-stats.py
"""
import csv, glob, json, os, re, subprocess, sys, time, urllib.parse, urllib.request, zipfile
from collections import defaultdict
from datetime import date

UA = "CricbidPro/1.0 (cricket auction app stats sync; contact: admin@cricbid.app)"
DB = "postgresql://postgres:postgres@127.0.0.1:5432/app_db"
TMP = "/tmp"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "db", "player-stats-2026.json")

TITLE_OVERRIDES = {
    "ali-khan": "Ali Khan (American cricketer)",
    "mohammad-haris": "Mohammad Haris (cricketer)",
    "usman-khan": "Usman Khan (cricketer, born 1995)",
    "aaron-jones": "Aaron Jones (cricketer)",
    "akash-singh": "Akash Singh (cricketer, born 2002)",
    "prince-yadav": "Prince Yadav (cricketer)",
    "mark-wood": "Mark Wood (cricketer)",
    "rinku-singh": "Rinku Singh (cricketer)",
    "abhishek-sharma": "Abhishek Sharma (cricketer)",
    "rahul-chahar": "Rahul Chahar",
    "naman-dhir": "Naman Dhir",
    "harsh-dubey": "Harsh Dubey",
    "david-miller": "David Miller (South African cricketer)",
    "daryl-mitchell": "Daryl Mitchell (New Zealand cricketer)",
    "mohsin-khan": "Mohsin Khan (Indian cricketer)",
    "abdul-samad": "Abdul Samad (Indian cricketer)",
    "arshad-khan": "Arshad Khan (Indian cricketer)",
    "lalit-yadav": "Lalit Yadav (Delhi cricketer)",
    "nathan-smith": "Nathan Smith (New Zealand cricketer)",
    "mohammad-abbas-afridi": "Abbas Afridi (cricketer)",
    "ms-dhoni": "MS Dhoni",
}

IPL_TAGS = {
    "Chennai Super Kings": "CSK", "Mumbai Indians": "MI", "Royal Challengers Bengaluru": "RCB",
    "Royal Challengers Bangalore": "RCB", "Kolkata Knight Riders": "KKR", "Sunrisers Hyderabad": "SRH",
    "Rajasthan Royals": "RR", "Delhi Capitals": "DC", "Delhi Daredevils": "DC", "Gujarat Titans": "GT",
    "Punjab Kings": "PBKS", "Kings XI Punjab": "PBKS", "Lucknow Super Giants": "LSG",
    "Deccan Chargers": "DCH", "Pune Warriors": "PWI", "Rising Pune Supergiant": "RPS",
    "Rising Pune Supergiants": "RPS", "Gujarat Lions": "GL", "Kochi Tuskers Kerala": "KTK",
}
NON_BOWLER_WICKETS = {"run out", "retired hurt", "retired out", "obstructing the field", "retired not out"}


# ----------------------------------------------------------------------------- helpers
def http_json(url, retries=5):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except Exception as e:  # noqa
            wait = 5 * (attempt + 1)
            print(f"   ! {e} – retry in {wait}s", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("request failed: " + url)


def psql(sql):
    out = subprocess.check_output(["psql", "-At", DB, "-c", sql]).decode()
    return out


def clean_wiki(v):
    v = re.sub(r"<ref[^>]*/>", "", v)
    v = re.sub(r"<ref[^>]*>.*?</ref>", "", v, flags=re.S)
    v = re.sub(r"\{\{(?:efn|sfn|sfnm|refn)[^{}]*\}\}", "", v, flags=re.I)
    v = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", v)
    v = re.sub(r"\{\{nowrap\|([^{}]*)\}\}", r"\1", v, flags=re.I)
    v = re.sub(r"'''?", "", v)
    v = re.sub(r"<[^>]+>", "", v)
    return v.strip()


def num(v, kind=float):
    v = clean_wiki(v or "").replace(",", "").replace("*", "").strip()
    m = re.match(r"^-?\d+(?:\.\d+)?", v)
    if not m:
        return None
    return kind(float(m.group(0)))


def extract_infobox(text):
    i = text.find("{{Infobox cricketer")
    if i < 0:
        i = text.lower().find("{{infobox cricketer")
    if i < 0:
        return None
    depth, j = 0, i
    while j < len(text):
        if text.startswith("{{", j):
            depth += 1; j += 2; continue
        if text.startswith("}}", j):
            depth -= 1; j += 2
            if depth == 0:
                break
            continue
        j += 1
    body = text[i:j]
    params, depth, cur = {}, 0, ""
    # split on top-level pipes
    parts, k = [], 0
    while k < len(body):
        if body.startswith("{{", k) or body.startswith("[[", k):
            depth += 1; cur += body[k:k + 2]; k += 2; continue
        if body.startswith("}}", k) or body.startswith("]]", k):
            depth -= 1; cur += body[k:k + 2]; k += 2; continue
        if body[k] == "|" and depth == 1:
            parts.append(cur); cur = ""; k += 1; continue
        cur += body[k]; k += 1
    parts.append(cur)
    for p in parts[1:]:
        if "=" in p:
            key, val = p.split("=", 1)
            params[key.strip().lower()] = val.strip()
    return params


def norm_format(label):
    l = clean_wiki(label).lower()
    if l in ("test", "tests"): return "TEST"
    if l in ("odi", "odis"): return "ODI"
    if l in ("t20i", "t20is"): return "T20I"
    return None


def parse_date_template(v):
    m = re.search(r"(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})", v or "")
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    m = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", clean_wiki(v or ""))
    if m and m.group(2).lower() in MONTHS:
        try:
            return date(int(m.group(3)), MONTHS[m.group(2).lower()], int(m.group(1)))
        except ValueError:
            return None
    return None


MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], 1)}


def parse_plain_date(day_month, year):
    try:
        y = int(clean_wiki(year or "")[:4])
    except ValueError:
        return None
    dm = clean_wiki(day_month or "").lower().split()
    d, mth = 1, 1
    for t in dm:
        if t.isdigit(): d = int(t)
        elif t in MONTHS: mth = MONTHS[t]
    try:
        return date(y, mth, d)
    except ValueError:
        return None


# ----------------------------------------------------------------------------- 1. players
print("1/6 loading players from database…")
rows = psql("SELECT row_to_json(p) FROM (SELECT slug,name,country,role,set_category,formats,stats,is_capped,"
            "franchise_tag,batting_style,bowling_style,is_marquee FROM players ORDER BY slug) p").strip().splitlines()
players = [json.loads(r) for r in rows]
known_titles = {}
for r in psql("SELECT slug, page_url FROM player_images WHERE page_url IS NOT NULL").strip().splitlines():
    slug, url = r.split("|", 1)
    known_titles[slug] = urllib.parse.unquote(url.rsplit("/wiki/", 1)[-1]).replace("_", " ")
print(f"   {len(players)} players, {len(known_titles)} with known Wikipedia titles")

# ----------------------------------------------------------------------------- 2. wikipedia
print("2/6 fetching Wikipedia infoboxes…")
cands = {}
for p in players:
    lst = [TITLE_OVERRIDES.get(p["slug"]), known_titles.get(p["slug"]), f'{p["name"]} (cricketer)', p["name"]]
    seen, out = set(), []
    for t in lst:
        if t and t not in seen:
            seen.add(t); out.append(t)
    cands[p["slug"]] = out

all_titles = sorted({t for v in cands.values() for t in v})
pages = {}
for i in range(0, len(all_titles), 50):
    chunk = all_titles[i:i + 50]
    q = urllib.parse.urlencode({
        "action": "query", "format": "json", "formatversion": "2", "redirects": "1",
        "prop": "revisions|pageprops|description", "rvprop": "content", "rvslots": "main",
        "rvsection": "0", "ppprop": "wikibase_item|disambiguation", "titles": "|".join(chunk)})
    j = http_json("https://en.wikipedia.org/w/api.php?" + q)
    mapping = {}
    for n in j["query"].get("normalized", []): mapping[n["from"]] = n["to"]
    for r in j["query"].get("redirects", []): mapping[r["from"]] = r["to"]
    for pg in j["query"]["pages"]:
        pages[pg["title"]] = pg
    for t in chunk:
        cur = t
        for _ in range(3):
            cur = mapping.get(cur, cur)
        if cur != t and cur in pages:
            pages[t] = pages[cur]
    time.sleep(1.0)
    print(f"   {min(i + 50, len(all_titles))}/{len(all_titles)} titles")

wiki = {}
for p in players:
    for t in cands[p["slug"]]:
        pg = pages.get(t)
        if not pg or pg.get("missing") or "disambiguation" in pg.get("pageprops", {}):
            continue
        if "cricket" not in (pg.get("description") or "").lower():
            continue
        content = pg.get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("content", "")
        ib = extract_infobox(content)
        if not ib:
            continue
        wiki[p["slug"]] = {"title": pg["title"], "qid": pg.get("pageprops", {}).get("wikibase_item"), "ib": ib}
        break
print(f"   matched infoboxes: {len(wiki)}/{len(players)}")

# ----------------------------------------------------------------------------- 3. wikidata cricinfo ids
print("3/6 fetching ESPNcricinfo ids from Wikidata…")
qids = sorted({w["qid"] for w in wiki.values() if w.get("qid")})
qid_to_ci = {}
for i in range(0, len(qids), 50):
    q = urllib.parse.urlencode({"action": "wbgetentities", "format": "json", "props": "claims",
                                "ids": "|".join(qids[i:i + 50])})
    j = http_json("https://www.wikidata.org/w/api.php?" + q)
    for qid, ent in j.get("entities", {}).items():
        for c in ent.get("claims", {}).get("P2697", []):
            try:
                qid_to_ci[qid] = str(c["mainsnak"]["datavalue"]["value"]); break
            except KeyError:
                pass
    time.sleep(1.0)
for slug, w in wiki.items():
    ci = qid_to_ci.get(w.get("qid"))
    if not ci:
        m = re.search(r"(\d{4,7})(?:\.html)?\s*(?:\]|\s|$|\|)", w["ib"].get("source", "") + " ")
        ci = m.group(1) if m else None
    w["cricinfo"] = ci
print(f"   cricinfo ids: {sum(1 for w in wiki.values() if w.get('cricinfo'))}")

# ----------------------------------------------------------------------------- 4. cricsheet register
print("4/6 mapping to Cricsheet register…")
ci_to_cs, cs_names = {}, {}
with open(os.path.join(TMP, "people.csv"), newline="", encoding="utf-8") as fh:
    for r in csv.DictReader(fh):
        cs_names[r["identifier"]] = r["name"]
        for k in ("key_cricinfo", "key_cricinfo_2", "key_cricinfo_3"):
            if r.get(k):
                ci_to_cs[r[k].strip()] = r["identifier"]
slug_to_cs = {s: ci_to_cs.get(w.get("cricinfo")) for s, w in wiki.items() if ci_to_cs.get(w.get("cricinfo"))}
print(f"   cricsheet ids: {len(slug_to_cs)}")
wanted = set(slug_to_cs.values())


# ----------------------------------------------------------------------------- 5. ball-by-ball aggregation
def new_acc():
    return {"matches": set(), "runs": 0, "balls": 0, "outs": 0, "hs": 0, "hs_no": False, "50": 0, "100": 0,
            "bballs": 0, "conc": 0, "wkts": 0, "best": (0, 999), "teams": {}, "seasons": set()}


def aggregate(zip_path, fmt_is_ipl=False, season_filter=None):
    acc = defaultdict(new_acc)
    with zipfile.ZipFile(zip_path) as z:
        for name in z.namelist():
            if not name.endswith(".json"):
                continue
            j = json.loads(z.read(name))
            info = j["info"]
            season = str(info.get("season", ""))[:4]
            if season_filter and season != season_filter:
                continue
            reg = info.get("registry", {}).get("people", {})
            mdate = info["dates"][0]
            ids_in_match = {}
            for team, plist in info.get("players", {}).items():
                for pn in plist:
                    pid = reg.get(pn)
                    if pid in wanted:
                        ids_in_match[pn] = pid
                        a = acc[pid]
                        a["matches"].add(name)
                        a["seasons"].add(season)
                        prev = a["teams"].get(season)
                        if not prev or mdate >= prev[0]:
                            a["teams"][season] = (mdate, team)
            if not ids_in_match:
                continue
            match_bowl = defaultdict(lambda: [0, 0])
            for inn in j.get("innings", []):
                if inn.get("super_over"):
                    continue
                inn_runs = defaultdict(lambda: [0, False])
                for ov in inn.get("overs", []):
                    for d in ov.get("deliveries", []):
                        ex = d.get("extras", {})
                        b, bw = d.get("batter"), d.get("bowler")
                        if b in ids_in_match:
                            a = acc[ids_in_match[b]]
                            a["runs"] += d["runs"]["batter"]
                            inn_runs[b][0] += d["runs"]["batter"]
                            inn_runs[b][1] = True
                            if "wides" not in ex:
                                a["balls"] += 1
                        if bw in ids_in_match:
                            a = acc[ids_in_match[bw]]
                            if "wides" not in ex and "noballs" not in ex:
                                a["bballs"] += 1
                            c = d["runs"]["batter"] + ex.get("wides", 0) + ex.get("noballs", 0)
                            a["conc"] += c
                            match_bowl[bw][1] += c
                        for w in d.get("wickets", []):
                            po = w.get("player_out")
                            if po in ids_in_match and w.get("kind") not in ("retired hurt", "retired not out"):
                                acc[ids_in_match[po]]["outs"] += 1
                                inn_runs[po].append("out")
                            if bw in ids_in_match and w.get("kind") not in NON_BOWLER_WICKETS:
                                acc[ids_in_match[bw]]["wkts"] += 1
                                match_bowl[bw][0] += 1
                for pn, v in inn_runs.items():
                    a = acc[ids_in_match[pn]]
                    r, notout = v[0], ("out" not in v)
                    if r > a["hs"] or (r == a["hs"] and notout):
                        a["hs"], a["hs_no"] = r, notout
                    if r >= 100: a["100"] += 1
                    elif r >= 50: a["50"] += 1
            for pn, (w, r) in match_bowl.items():
                a = acc[ids_in_match[pn]]
                if w > a["best"][0] or (w == a["best"][0] and r < a["best"][1]):
                    a["best"] = (w, r)
    return acc


def line_from_acc(a):
    m = len(a["matches"])
    if m == 0:
        return None
    return {
        "matches": m,
        "runs": a["runs"],
        "average": round(a["runs"] / a["outs"], 2) if a["outs"] else (float(a["runs"]) if a["runs"] else 0.0),
        "strikeRate": round(a["runs"] * 100 / a["balls"], 2) if a["balls"] else 0.0,
        "wickets": a["wkts"],
        "economy": round(a["conc"] * 6 / a["bballs"], 2) if a["bballs"] else 0.0,
        "best": f'{a["best"][0]}/{a["best"][1]}' if a["wkts"] else f'{a["hs"]}{"*" if a["hs_no"] else ""}',
        "highScore": f'{a["hs"]}{"*" if a["hs_no"] else ""}',
        "bestBowling": f'{a["best"][0]}/{a["best"][1]}' if a["wkts"] else None,
        "hundreds": a["100"], "fifties": a["50"],
    }


print("5/6 aggregating ball-by-ball data (IPL + internationals)…")
ipl = aggregate(os.path.join(TMP, "ipl.zip"), True)
all_ipl_seasons = sorted({s for a in ipl.values() for s in a["seasons"]})
latest_season = max(all_ipl_seasons) if all_ipl_seasons else "2026"
ipl_latest = aggregate(os.path.join(TMP, "ipl.zip"), True, season_filter=latest_season)
print(f"   IPL players matched: {len(ipl)} (latest season {latest_season}: {len(ipl_latest)})")
intl = {}
for fmt, zp in (("ODI", "odis_male_json.zip"), ("T20I", "t20s_male_json.zip"), ("TEST", "tests_male_json.zip")):
    t0 = time.time()
    intl[fmt] = aggregate(os.path.join(TMP, zp))
    print(f"   {fmt}: {len(intl[fmt])} players ({time.time() - t0:.0f}s)")

# ----------------------------------------------------------------------------- 6. merge
print("6/6 merging…")
result, as_of_dates = {}, []
for p in players:
    slug = p["slug"]
    w = wiki.get(slug)
    cs = slug_to_cs.get(slug)
    ib = w["ib"] if w else {}
    entry = {"stats": {}, "profile": {"dataVersion": "2026.3"}}
    prof = entry["profile"]

    as_of = clean_wiki(ib.get("date", "")) if ib else ""
    if as_of:
        prof["statsAsOf"] = as_of
        as_of_dates.append(as_of)
    if w:
        prof["wikiTitle"] = w["title"]
    if w and w.get("cricinfo"):
        prof["cricinfoId"] = w["cricinfo"]

    dob = parse_date_template(ib.get("birth_date", ""))
    if dob:
        prof["birthDate"] = dob.isoformat()
        ref = date(2026, 9, 30)
        prof["age"] = ref.year - dob.year - ((ref.month, ref.day) < (dob.month, dob.day))

    if ib.get("batting"):
        b = clean_wiki(ib["batting"]).lower()
        entry["battingStyle"] = "Left-hand bat" if "left" in b else "Right-hand bat"
    if ib.get("bowling"):
        bw = clean_wiki(ib["bowling"])
        bw = re.sub(r"\s+", " ", bw).strip().rstrip(",")
        if bw and bw != "–":
            entry["bowlingStyle"] = bw[:60]
    if ib.get("role"):
        r = clean_wiki(ib["role"]).lower()
        prof["roleDetail"] = clean_wiki(ib["role"])[:60]
        if "wicket" in r: entry["role"] = "Wicketkeeper"
        elif "all-round" in r or "allround" in r or "all round" in r: entry["role"] = "All-Rounder"
        elif "bowl" in r: entry["role"] = "Bowler"
        elif "bat" in r: entry["role"] = "Batsman"

    span = clean_wiki(ib.get("internationalspan", ""))
    # Editors often bump the span end year ("2011–2026") — only treat it as retirement when the
    # span ended before 2025, or ended in 2025 while the page has already been updated in 2026.
    _as_of_year = re.search(r"(\d{4})", as_of or "")
    _as_of_year = int(_as_of_year.group(1)) if _as_of_year else 2026
    _end = re.search(r"(\d{4})\s*$", span)
    intl_retired = bool(span) and "present" not in span.lower() and bool(_end) and (
        int(_end.group(1)) < 2025 or (int(_end.group(1)) < 2026 and _as_of_year >= 2026))
    prof["internationalSpan"] = span or None

    # International career lines from infobox, SR / economy from Cricsheet
    ref_date = date(2026, 9, 30)
    inactive = []
    for n in range(1, 7):
        fmt = norm_format(ib.get(f"column{n}", ""))
        if not fmt:
            continue
        m = num(ib.get(f"matches{n}"), int)
        if not m:
            continue
        runs = num(ib.get(f"runs{n}"), int) or 0
        avg = num(ib.get(f"bat avg{n}")) or 0.0
        wk = num(ib.get(f"wickets{n}"), int) or 0
        deliveries = num(ib.get(f"deliveries{n}"), int) or 0
        bavg = num(ib.get(f"bowl avg{n}")) or 0.0
        bb = clean_wiki(ib.get(f"best bowling{n}", "")).replace("–", "").strip() or None
        hs = clean_wiki(ib.get(f"top score{n}", "")).replace("–", "").strip() or None
        hf = clean_wiki(ib.get(f"100s/50s{n}", ""))
        h100, h50 = (hf.split("/") + ["", ""])[:2] if "/" in hf else ("", "")
        cs_acc = intl.get(fmt, {}).get(cs) if cs else None
        sr = round(cs_acc["runs"] * 100 / cs_acc["balls"], 2) if cs_acc and cs_acc["balls"] else 0.0
        if cs_acc and cs_acc["bballs"] >= 30:
            econ = round(cs_acc["conc"] * 6 / cs_acc["bballs"], 2)
        elif wk and deliveries:
            econ = round(bavg * wk * 6 / deliveries, 2)
        else:
            econ = 0.0
        line = {
            "matches": m, "runs": runs, "average": avg, "strikeRate": sr, "wickets": wk, "economy": econ,
            "best": bb if wk else (hs or "—"), "highScore": hs, "bestBowling": bb if wk else None,
            "hundreds": num(h100, int), "fifties": num(h50, int),
        }
        entry["stats"][fmt.lower()] = line
        key = {"TEST": "test", "ODI": "odi", "T20I": "T20I"}[fmt]
        last = parse_plain_date(ib.get(f"last{key}date") or ib.get(f"last{key.lower()}date"),
                                ib.get(f"last{key}year") or ib.get(f"last{key.lower()}year"))
        if last:
            prof.setdefault("lastPlayed", {})[fmt] = last.isoformat()
        if intl_retired or (last and (ref_date - last).days > 550):
            inactive.append(fmt)

    # IPL career + latest season from Cricsheet
    if cs and cs in ipl:
        a = ipl[cs]
        line = line_from_acc(a)
        if line:
            entry["stats"]["ipl"] = line
        seasons = sorted(a["seasons"])
        prof["iplSeasons"] = len(seasons)
        prof["lastIplSeason"] = seasons[-1]
        last_team = a["teams"][seasons[-1]][1]
        prof["lastIplTeam"] = last_team
        tag = IPL_TAGS.get(last_team, last_team[:4].upper())
        if seasons[-1] >= str(int(latest_season) - 1):
            entry["franchiseTag"] = tag
        if seasons[-1] < str(int(latest_season) - 1):
            inactive.append("IPL")
        if cs in ipl_latest:
            sl = line_from_acc(ipl_latest[cs])
            if sl:
                prof["latestIplSeason"] = {"season": latest_season, "team": tag, **sl}

    have = [f for f in ("IPL", "T20I", "ODI", "TEST") if f.lower() in entry["stats"]]
    active = [f for f in have if f not in inactive]
    entry["formats"] = active
    prof["inactiveFormats"] = [f for f in have if f in inactive]
    prof["internationalRetired"] = intl_retired
    entry["isCapped"] = any(k in entry["stats"] for k in ("test", "odi", "t20i")) or p["is_capped"]
    sources = []
    if any(k in entry["stats"] for k in ("test", "odi", "t20i")): sources.append("Wikipedia")
    if cs: sources.append("Cricsheet")
    prof["sources"] = sources
    prof["iplDataThrough"] = latest_season

    if not entry["stats"]:
        # nothing found → keep the existing seed data untouched
        continue
    result[slug] = entry

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump({"generatedAt": date.today().isoformat(), "iplThrough": latest_season, "players": result}, fh,
              ensure_ascii=False, separators=(",", ":"))
print(f"done → {OUT}: {len(result)} players updated "
      f"(wiki {len(wiki)}, cricsheet {len(slug_to_cs)}, ipl {sum(1 for e in result.values() if 'ipl' in e['stats'])})")
