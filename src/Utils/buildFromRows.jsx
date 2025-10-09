// src/Utils/buildFromRows.jsx

// Normalize header names to lower_snake
export const norm = (h) =>
  String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

// Helper: pick the most recent non-empty value
function mostRecent(values) {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v != null && String(v).trim() !== "") return v;
  }
  return "";
}

// Internal helpers to pull values with many possible aliases
function firstNonEmpty(obj, keys) {
  for (const k of keys) {
    if (k in obj) {
      const v = obj[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return "";
}

function guessManagerField(obj) {
  const explicit = [
    "manager_name",
    "manager",
    "manager_names",
    "managername",
    "managers",
    "manager(s)",
    "team_manager",
    "team_managers",
    "team_manager(s)",
    "owner_name",
    "owner",
    "team_owner",
    "member_name",
    "member",
  ];
  const v = firstNonEmpty(obj, explicit);
  if (v) return v;

  for (const k of Object.keys(obj)) {
    const isMgr = /manager|owner/.test(k);
    const isTeamName = /team_name|teamname|^team$/.test(k);
    if (isMgr && !isTeamName) {
      const val = obj[k];
      if (val != null && String(val).trim() !== "") return String(val).trim();
    }
  }
  return "";
}

function guessOpponentManagerField(obj) {
  const explicit = [
    "opponent_manager_name",
    "opponent_manager",
    "opponent_owner",
    "opponent_member",
    "opponent",
    "opp",
    "opponent_manager(s)",
  ];
  const v = firstNonEmpty(obj, explicit);
  if (v) return v;

  for (const k of Object.keys(obj)) {
    if (
      /^opponent/.test(k) &&
      /manager|owner|member/.test(k) &&
      !/team_name|teamname|^team$/.test(k)
    ) {
      const val = obj[k];
      if (val != null && String(val).trim() !== "") return String(val).trim();
    }
  }
  return "";
}

/* ---------------- Playoff flag helpers ---------------- */
function __fl_readBool(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1";
}

/**
 * Reads a playoff flag from a raw row. If absent, optionally infers it
 * using league meta (per-season playoff start week) when available.
 *
 * Accepted raw fields: is_playoff, isPlayoff, playoff, is_postseason,
 * postseason, playoff_week, playoffWeek (boolean-ish).
 *
 * If no direct flag is present and no meta is provided, returns undefined.
 */
function __fl_readPlayoffFlag(rawRow, leagueMeta /* optional */) {
  const direct =
    rawRow?.is_playoff ??
    rawRow?.isPlayoff ??
    rawRow?.playoff ??
    rawRow?.is_postseason ??
    rawRow?.postseason ??
    rawRow?.playoff_week ??
    rawRow?.playoffWeek;

  if (direct != null && direct !== "") {
    return __fl_readBool(direct);
  }

  // Optional inference if your meta ever carries playoff start weeks
  const season = Number(rawRow?.season);
  const week = Number(rawRow?.week);
  const pswBySeason = leagueMeta?.playoffStartWeekBySeason || null;
  const psw =
    (pswBySeason && season != null ? pswBySeason[season] : null) ??
    leagueMeta?.playoffStartWeek ??
    null;

  if (psw && Number.isFinite(week)) {
    return Number(week) >= Number(psw);
  }

  return undefined; // unknown
}

export function buildFromRows(rowsIn) {
  // 1) basic normalization of column names
  const rows = (rowsIn || []).map((r) => {
    const o = {};
    Object.keys(r || {}).forEach((k) => (o[norm(k)] = r[k]));
    return o;
  });

  const getOwner = (r) => guessManagerField(r) || "";
  const getOpponentOwner = (r) => guessOpponentManagerField(r) || "";

  // Prefer stable league_id over name to prevent accidental splits on rename
  const getLeagueKey = (r) => {
    const id = String(r.league_id || r.leagueid || "").trim();
    if (id) return `id:${id}`;
    const name =
      r.league_name ||
      r.league ||
      r.espn_league ||
      r.league_title ||
      "League 1";
    return `name:${String(name)}`;
  };

  // 2) which leagues exist
  const leaguesSet = new Set();
  rows.forEach((r) => leaguesSet.add(getLeagueKey(r)));
  const leagues = Array.from(leaguesSet);

  // 3) group by league
  const byLeague = {};
  leagues.forEach((lg) => {
    const rLeague = rows.filter((r) => getLeagueKey(r) === lg);

    const seasonsAll = Array.from(
      new Set(
        rLeague
          .map((r) => Number(r.season))
          .filter((x) => !isNaN(x))
          .sort((a, b) => a - b)
      )
    );

    // owners = **people** (manager names), NOT team names
    const owners = Array.from(
      new Set(rLeague.map((r) => getOwner(r)).filter(Boolean))
    );

    const sizeGuess =
      rLeague.reduce((s, r) => Math.max(s, Number(r.league_size) || 0), 0) ||
      owners.length;

    // capture stable id + human name in meta
    const leagueId = String(
      rLeague.find((r) => r.league_id)?.league_id ||
        rLeague.find((r) => r.leagueid)?.leagueid ||
        ""
    ).trim();

    const nameCandidate =
      rLeague.find((r) => r.league_name)?.league_name ||
      rLeague.find((r) => r.league)?.league ||
      rLeague.find((r) => r.espn_league)?.espn_league ||
      (leagueId ? `League ${leagueId}` : "League 1");

    const meta = {
      id: leagueId || null,
      key: lg,
      name: nameCandidate,
      size: sizeGuess,
      startSeason: seasonsAll[0] || null,
      yearsRunning: seasonsAll.length,
      platform:
        rLeague.find((r) => r.platform)?.platform ||
        rLeague.find((r) => r.site)?.site ||
        "ESPN",
      scoring: rLeague.find((r) => r.scoring)?.scoring || "Standard",
      // Optional: playoffStartWeek[BySeason] can be attached later if computed elsewhere
    };

    // --- games (keyed by owner names)
    const games = [];
    rLeague.forEach((r) => {
      const owner = getOwner(r);
      const opp = getOpponentOwner(r);
      if (!owner || !opp) return;

      const pf = Number(r.points_for ?? r.pf);
      const pa = Number(r.points_against ?? r.pa);
      const res = String(r.result || "").toUpperCase(); // "W" | "L" | maybe ""
      const season = Number(r.season);
      const week = Number(r.week);

      // carry playoff flag through (true/false/undefined)
      const isPlayoff = __fl_readPlayoffFlag(r, meta);

      games.push({
        owner,
        opp,
        pf,
        pa,
        res,
        season,
        week,
        is_playoff: isPlayoff,
      });
    });

    // --- per-owner career stats (raw; UI will filter regular-only)
    const careerMap = new Map();
    owners.forEach((m) =>
      careerMap.set(m, {
        id: norm(m),
        name: m,
        games: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        avgPF: 0,
        avgPA: 0,
        winPct: 0,
      })
    );

    games.forEach((g) => {
      const row = careerMap.get(g.owner);
      if (!row) return;
      row.games += 1;
      if (g.res === "W") row.wins += 1;
      if (g.res === "L") row.losses += 1;
      row.pointsFor += isNaN(g.pf) ? 0 : g.pf;
      row.pointsAgainst += isNaN(g.pa) ? 0 : g.pa;
    });

    for (const r of careerMap.values()) {
      r.avgPF = r.games ? r.pointsFor / r.games : 0;
      r.avgPA = r.games ? r.pointsAgainst / r.games : 0;
      r.winPct = r.games ? r.wins / r.games : 0;
    }

    // --- H2H matrix
    const matrix = {};
    owners.forEach((a) => {
      matrix[a] = {};
      owners.forEach((b) => {
        matrix[a][b] = "0-0";
      });
    });
    const wl = {};
    owners.forEach((a) => {
      wl[a] = {};
      owners.forEach((b) => (wl[a][b] = { w: 0, l: 0 }));
    });
    games.forEach((g) => {
      if (!wl[g.owner] || !wl[g.owner][g.opp]) return;
      if (g.res === "W") wl[g.owner][g.opp].w += 1;
      if (g.res === "L") wl[g.owner][g.opp].l += 1;
    });
    owners.forEach((a) =>
      owners.forEach((b) => {
        const v = wl[a][b];
        matrix[a][b] = `${v.w}-${v.l}`;
      })
    );

    // --- best/worst opponents
    const bestWorst = {};
    owners.forEach((a) => {
      let best = { opp: null, w: 0, l: 0, pct: -1 };
      let worst = { opp: null, w: 0, l: 0, pct: 2 };
      owners.forEach((b) => {
        if (a === b) return;
        const v = wl[a][b];
        const total = v.w + v.l;
        const pct = total ? v.w / total : 0;
        if (pct > best.pct && total >= 1)
          best = { opp: b, w: v.w, l: v.l, pct };
        if (pct < worst.pct && total >= 1)
          worst = { opp: b, w: v.w, l: v.l, pct };
      });
      bestWorst[a] = { best, worst };
    });

    // --- placements (key by owner name)
    const placementMap = {};
    owners.forEach((o) => (placementMap[o] = {}));
    rLeague.forEach((r) => {
      const o = getOwner(r);
      const season = Number(r.season);
      const place = Number(r.final_rank ?? r.place ?? r.rank);
      if (!o || !season || !place) return;
      placementMap[o][season] = place;
    });

    // --- team names by owner per season
    const teamNamesByOwner = {};
    owners.forEach((o) => (teamNamesByOwner[o] = {}));
    const _seen = new Map(); // owner__season -> last name
    rLeague.forEach((r) => {
      const owner = getOwner(r);
      const season = Number(r.season);
      if (!owner || !season) return;
      const team = String(r.team_name ?? r.team ?? "").trim();
      if (!team) return;
      _seen.set(`${owner}__${season}`, team);
    });
    Array.from(_seen.entries()).forEach(([k, v]) => {
      const [owner, sStr] = k.split("__");
      const s = Number(sStr);
      if (!teamNamesByOwner[owner]) teamNamesByOwner[owner] = {};
      teamNamesByOwner[owner][s] = v;
    });

    // --- members metadata
    const byMemberSeason = {};
    rLeague.forEach((r) => {
      const o = getOwner(r);
      const season = Number(r.season);
      if (!o || !season) return;
      if (!byMemberSeason[o]) byMemberSeason[o] = new Set();
      byMemberSeason[o].add(season);
    });

    const membersMeta = owners.map((o) => {
      const seasons = Array.from(byMemberSeason[o] || []).sort((a, b) => a - b);
      const currentTeam = mostRecent(
        seasons.map((yr) => teamNamesByOwner[o]?.[yr])
      );
      return {
        id: norm(o),
        name: o,
        joined: seasons[0] || seasonsAll[0] || null,
        yearsPlayed: seasons.length,
        currentTeam: currentTeam || "",
      };
    });

    byLeague[lg] = {
      meta,
      owners,
      seasonsAll,
      games,
      bestWorst,
      matrix,
      placementMap,
      members: membersMeta,
      teamNamesByOwner,
      careerStats: Array.from(careerMap.values()),
    };
  });

  return { leagues, byLeague };
}
