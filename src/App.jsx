// App.jsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  SidebarButton,
  Footer,
} from "/project/workspace/src/Components/ui.jsx";
import { FP_ADP_BY_YEAR } from "/project/workspace/src/Data/adpData.jsx";
import {
  primeOwnerMaps,
  ownerMapFor,
} from "/project/workspace/src/ownerMaps.jsx";
import {
  supabase,
  getLeaguesForCurrentUser,
  listLeaguesForCurrentUser,
  loadLeaguePayloadFromStorage,
} from "./Utils/supabaseClient";
console.log('Supabase connected:', supabase);
import {
  SetupTab,
  MembersTab,
  CareerTab,
  H2HTab,
  PlacementsTab,
  MoneyTab,
  RecordsTab,
  TradesTab,
  DraftTab,
  RosterTab,
  PlayoffProbTab,
  StrengthOfScheduleTab,
  WeeklyOutlookTab,
  ScenarioTab,
  LuckIndexTab,
  YearlyRecapTab,
  TradingTab,
  UpdatesWhatsNewTab,
  UpdatesComingSoonTab,
  DEFAULT_LEAGUE_ICONS,
} from "/project/workspace/src/Components/tabs.jsx";
import { buildFromRows } from "/project/workspace/src/Utils/buildFromRows.jsx";
import { normalizeNicknameMap } from "/project/workspace/src/Utils/nicknames.js";
const LS_KEY = "FL_STORE_v1";
const DEFAULT_LEAGUE_ICON_GLYPH = DEFAULT_LEAGUE_ICONS[0]?.glyph || "🏈";
const DEFAULT_LEAGUE_ICON_OBJECT = {
  type: "preset",
  value: DEFAULT_LEAGUE_ICON_GLYPH,
};
const DEFAULT_LEAGUE_FONT_FAMILY =
  '"Inter", "Helvetica Neue", Arial, sans-serif';
function makeDefaultLeagueIcon() {
  return { ...DEFAULT_LEAGUE_ICON_OBJECT };
}
// --- FL hand-off PROBE (debug) ----------------------------------------------
(function handoffProbe() {
  if (typeof window === "undefined") return;
  try {
    const initialTitle =
      typeof document !== "undefined" ? document.title || "" : "";
    const cleanedInitialTitle = initialTitle
      .replace(/^(?:FL[^\s]*\s+)+/g, "")
      .trim();
    const defaultTitle = cleanedInitialTitle || initialTitle;
    const stripStatusFromTitle = () => {
      if (typeof document === "undefined") return;
      const cleaned = (document.title || "")
        .replace(/^(?:FL[^\s]*\s+)+/g, "")
        .trim();
      if (cleaned) {
        document.title = cleaned;
      } else if (defaultTitle) {
        document.title = defaultTitle;
      }
    };

    stripStatusFromTitle();

    const raw = window.name;
    console.log(
      "[FL][probe] window.name typeof=",
      typeof raw,
      " length=",
      raw ? raw.length : 0
    );

    if (raw && typeof raw === "string" && raw.trim().startsWith("{")) {
      // Try to persist, but don't die (or loop) if it's too big
      let stored = false;
      try {
        sessionStorage.setItem("FL_HANDOFF_RAW", raw);
        stored = true;
      } catch (e) {
        console.warn(
          "[FL][probe] FL_HANDOFF_RAW too large; using in-memory only:",
          e?.name
        );
        try {
          sessionStorage.removeItem("FL_HANDOFF_RAW");
        } catch {}
      }

      window.__FL_HANDOFF = JSON.parse(raw);

      // Prevent re-import loops: clear window.name immediately
      try {
        window.name = "";
      } catch {}

      console.log(
        "[FL][probe] parsed window.name ok; keys=",
        Object.keys(window.__FL_HANDOFF || {}).slice(0, 10)
      );
    } else {
      const fromSS = sessionStorage.getItem("FL_HANDOFF_RAW");
      if (fromSS) {
        window.__FL_HANDOFF = JSON.parse(fromSS);
        // also make sure window.name can’t resurrect an old payload
        try {
          window.name = "";
        } catch {}
        console.log(
          "[FL][probe] restored payload from sessionStorage; len=",
          fromSS.length
        );
      } else {
        console.log("[FL][probe] no payload in window.name or sessionStorage");
      }
    }

    stripStatusFromTitle();

    // postMessage ping/pong so the popup can confirm the app is alive
    window.addEventListener("message", (e) => {
      try {
        console.log(
          "[FL][probe] postMessage received:",
          e.origin,
          e.data && e.data.type
        );
        if (e.data && e.data.type === "FL_PING") {
          e.source &&
            e.source.postMessage(
              {
                type: "FL_PONG",
                got: !!window.__FL_HANDOFF,
                nameLen: (window.name || "").length,
              },
              "*"
            );
        }
      } catch (err) {
        console.warn("[FL][probe] message handler error", err);
      }
    });

    // keep the function bridge
    window.FL_ADD_LEAGUE = (payload) => {
      try {
        console.log(
          "[FL][probe] FL_ADD_LEAGUE()",
          payload && Object.keys(payload)
        );

        // Always keep an in-memory copy
        window.__FL_HANDOFF = payload;

        // If the app exposes a live handler, use it and avoid a reload.
        try {
          if (typeof window.FL_HANDLE_EXTENSION_PAYLOAD === "function") {
            window.FL_HANDLE_EXTENSION_PAYLOAD(payload);
            console.log(
              "[FL][probe] dispatched to FL_HANDLE_EXTENSION_PAYLOAD (no reload)"
            );
            return;
          }
        } catch (err) {
          console.warn(
            "[FL][probe] FL_HANDLE_EXTENSION_PAYLOAD error:",
            err?.name,
            err?.message
          );
        }

        // Fallback: persist a copy so the bootstrap can pick it up after reload.
        const json = JSON.stringify(payload);
        const channels = [];
        try {
          sessionStorage.setItem("FL_HANDOFF_RAW", json);
          channels.push("sessionStorage");
        } catch (err) {
          console.warn(
            "[FL][probe] sessionStorage.setItem failed; falling back:",
            err?.name,
            err?.message
          );
        }
        try {
          window.name = json;
          channels.push("window.name");
        } catch (err) {
          console.warn(
            "[FL][probe] window.name fallback failed:",
            err?.name,
            err?.message
          );
        }

        if (!channels.length) {
          console.warn(
            "[FL][probe] FL_ADD_LEAGUE had no durable handoff channel; aborting reload"
          );
          return;
        }

        console.log(
          "[FL][probe] FL_ADD_LEAGUE stored via",
          channels.join(" + ")
        );
        window.location.reload();
      } catch (e) {
        console.warn("[FL][probe] FL_ADD_LEAGUE failed:", e);
      }
    };
  } catch (e) {
    console.warn("[FL][probe] failed to run:", e);
  }
})();
// --- Storage probe (add right here) ---
(function FL_probeStorage() {
  try {
    const testKey = "__fl_probe__";
    const payload = "x".repeat(1024);
    localStorage.setItem(testKey, payload);
    const got = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    window.__FL_STORAGE_OK = got === payload;
    console.log(
      "[FL][probe][storage] localStorage ok =",
      window.__FL_STORAGE_OK
    );
  } catch (e) {
    window.__FL_STORAGE_OK = false;
    window.__FL_STORAGE_ERR = e;
    console.warn(
      "[FL][probe][storage] localStorage failed:",
      e?.name,
      e?.message
    );
  }
  try {
    const t = "__fl_probe_s__";
    sessionStorage.setItem(t, "1");
    const sOK = sessionStorage.getItem(t) === "1";
    sessionStorage.removeItem(t);
    window.__FL_SESSION_OK = sOK;
    if (!window.__FL_STORAGE_OK) {
      console.log("[FL][probe][storage] sessionStorage ok =", sOK);
    }
  } catch (e) {
    window.__FL_SESSION_OK = false;
    console.warn(
      "[FL][probe][storage] sessionStorage failed:",
      e?.name,
      e?.message
    );
  }
})();
/*
  Storage shape:
  {
    leaguesById: {
      // Keys are ALWAYS platform-prefixed to keep leagues separate
      // e.g. "ESPN:123456", "SLEEPER:987654", or "ESPN:my_custom_key"
      [leagueId]: {
        leagueId, leagueKey, name, platform, scoring, lastUpdated,
        rows, draftByYear, adpSourceByYear, moneyInputs,
        activityBySeason,
        espnTransactionsByYear,
        espnOwnerByTeamByYear,   // { [year]: { [teamId]: "Owner Name" } }
        espnOwnerMapByYear,      // alias kept for back-compat
        espnRostersByYear        // { [year]: { [teamId]: { [week]: [{pid,name,posId,slotId,pts,projStart?}] } } }
        espnPlayoffTeamsBySeason // { [year]: number }
        espnInjuriesByYear,
        hiddenManagers            // [ "Name A", "Name B", ... ] — globally hidden in UI
        managerNicknames          // { [ownerName]: ["Nickname", ...] }
        leagueIcon                // { type: 'preset' | 'upload', value, previousPreset?, name? }

      }
    },
    lastSelectedLeagueId
  }
*/

function _emptyStore() {
  return { leaguesById: {}, lastSelectedLeagueId: "" };
}

function ensureUniqueLeagueId(
  preferredId,
  leagueName,
  store,
  platform = "ESPN"
) {
  const byId = (store && store.leaguesById) || {};
  const normalizedName = String(leagueName || "")
    .trim()
    .toLowerCase();
  const normalizedPlat = String(platform || "ESPN")
    .trim()
    .toUpperCase();
  const preferredRaw = String(preferredId || "").trim();

  // Helper to test identity (strictly same league)
  const isSameLeague = (rec) => {
    if (!rec) return false;
    const recName = String(rec.name || "")
      .trim()
      .toLowerCase();
    const recPlat = String(rec.platform || "ESPN")
      .trim()
      .toUpperCase();
    if (!normalizedName) return false;
    return recName === normalizedName && recPlat === normalizedPlat;
  };

  // ALWAYS namespace keys by platform to avoid cross-provider collisions
  const withPlat = (id) => `${normalizedPlat}:${String(id || "").trim()}`;

  // 1) If a preferred (provider) ID is supplied, use "<PLAT>:<ID>"
  if (preferredRaw) {
    const preferred = withPlat(preferredRaw);
    const existing = byId[preferred];
    if (!existing) return preferred;

    if (isSameLeague(existing)) return preferred;

    let idx = 2;
    while (byId[`${preferred}__${idx}`]) idx += 1;
    return `${preferred}__${idx}`;
  }

  // 2) No preferred provider ID. If a league with the same name+platform exists, reuse its ID
  if (normalizedName) {
    const match = Object.entries(byId).find(([, rec]) => isSameLeague(rec));
    if (match) return match[0];
  }

  // 3) Build a platform-prefixed base from name (or timestamp) and ensure uniqueness
  const baseNameRaw =
    normalizedName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") ||
    `league_${Date.now()}`;
  const base = withPlat(baseNameRaw);

  if (!byId[base]) return base;
  if (isSameLeague(byId[base])) return base;

  let idx = 2;
  while (byId[`${base}__${idx}`]) idx += 1;
  return `${base}__${idx}`;
}

function readStore() {
  const BK_KEY = `${LS_KEY}::backend`;

  const parseOrNull = (txt) => {
    if (!txt) return null;
    try {
      const o = JSON.parse(txt);
      return o && typeof o === "object" ? o : null;
    } catch {
      return null;
    }
  };
  const shape = (o) => ({
    leaguesById: (o && o.leaguesById) || {},
    lastSelectedLeagueId: (o && o.lastSelectedLeagueId) || "",
  });
  const nonEmpty = (o) =>
    !!o && !!o.leaguesById && Object.keys(o.leaguesById).length > 0;

  try {
    const hint = (
      sessionStorage.getItem(BK_KEY) ||
      localStorage.getItem(BK_KEY) ||
      ""
    ).toLowerCase();

    const localObj = parseOrNull(localStorage.getItem(LS_KEY));
    const sessObj = parseOrNull(sessionStorage.getItem(LS_KEY));
    const memObj =
      (typeof window !== "undefined" && window.__FL_VOLATILE_STORE__) || null;

    // Prefer the richest non-empty source: memory > session > local, unless an explicit hint forces a backend.
    if (hint === "session") {
      if (nonEmpty(sessObj)) return shape(sessObj);
      if (nonEmpty(localObj)) return shape(localObj);
      if (nonEmpty(memObj)) return shape(memObj);
      if (sessObj) return shape(sessObj);
      if (localObj) return shape(localObj);
      if (memObj) return shape(memObj);
      return _emptyStore();
    }

    if (hint === "local") {
      if (nonEmpty(localObj)) return shape(localObj);
      if (nonEmpty(sessObj)) return shape(sessObj);
      if (nonEmpty(memObj)) return shape(memObj);
      if (localObj) return shape(localObj);
      if (sessObj) return shape(sessObj);
      if (memObj) return shape(memObj);
      return _emptyStore();
    }

    // No hint — choose the one that actually contains data
    if (nonEmpty(memObj)) return shape(memObj);
    if (nonEmpty(sessObj)) return shape(sessObj);
    if (nonEmpty(localObj)) return shape(localObj);

    // fall back to any present (even if empty), preferring session, then local, then memory
    if (sessObj) return shape(sessObj);
    if (localObj) return shape(localObj);
    if (memObj) return shape(memObj);

    return _emptyStore();
  } catch (e) {
    console.warn("[FL][storage] readStore failed:", e?.name, e?.message);
    const mem = window.__FL_VOLATILE_STORE__;
    return mem && typeof mem === "object" ? shape(mem) : _emptyStore();
  }
}

function writeStore(next) {
  const normalized = next || _emptyStore();
  const json = JSON.stringify(normalized);
  const snapshot = (() => {
    try {
      return JSON.parse(json);
    } catch {
      return normalized;
    }
  })();
  if (typeof window !== "undefined") {
    window.__FL_STORE_v1 = snapshot;
  }
  const BK_KEY = `${LS_KEY}::backend`;
  try {
    // Try localStorage
    localStorage.setItem(LS_KEY, json);
    const back = localStorage.getItem(LS_KEY);
    if (!back) throw new Error("localStorage read-back empty");

    // Mark backend + clear session copy so it can't shadow later
    localStorage.setItem(BK_KEY, "local");
    sessionStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(BK_KEY);
  } catch (e1) {
    console.warn(
      "[FL][storage] localStorage.setItem failed:",
      e1?.name,
      e1?.message,
      "len=",
      json.length
    );

    // ensure no stale/bad local value can shadow session
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(`${LS_KEY}::backend`);
    } catch {}

    try {
      // Fallback to sessionStorage
      sessionStorage.setItem(LS_KEY, json);
      const back = sessionStorage.getItem(LS_KEY);
      if (!back) throw new Error("sessionStorage read-back empty");
      sessionStorage.setItem(BK_KEY, "session");

      // also clear any leftover volatile memory copy
      if (window.__FL_VOLATILE_STORE__) delete window.__FL_VOLATILE_STORE__;
      console.log("[FL][storage] fell back to sessionStorage");
    } catch (e2) {
      console.warn(
        "[FL][storage] sessionStorage.setItem failed:",
        e2?.name,
        e2?.message,
        "→ using in-memory only"
      );
      window.__FL_VOLATILE_STORE__ = snapshot;
      try {
        sessionStorage.removeItem(BK_KEY);
      } catch {}
    }
  }
}

async function testLoadFromSupabase() {
  try {
    const { data: leagues, error } = await listLeaguesForCurrentUser();
    if (error) {
      console.warn("[FL][supabase] listLeaguesForCurrentUser error", error);
      return { error };
    }

    if (!leagues?.length) {
      console.log("[FL][supabase] no remote leagues yet");
      return { data: null };
    }

    const first = leagues[0];
    const storagePath = first?.storage_path || first?.payload?.storage_path;
    if (!storagePath) {
      console.warn("[FL][supabase] selected league missing storage_path", first);
      return { error: new Error("missing storage_path") };
    }

    const { data: payload, error: loadError } =
      await loadLeaguePayloadFromStorage(storagePath);
    if (loadError || !payload) {
      console.warn("[FL][supabase] failed to load payload", loadError);
      return { error: loadError || new Error("load failed") };
    }

    const leagueId =
      payload.leagueKey ||
      payload.leagueId ||
      payload.league_id ||
      payload.league_key ||
      first?.league_key ||
      first?.leagueKey ||
      storagePath;

    if (!leagueId) {
      console.warn("[FL][supabase] could not derive league id", {
        first,
        payload,
      });
      return { error: new Error("missing league identifier") };
    }

    const currentStore = readStore();
    const nextStore = {
      ..._emptyStore(),
      ...currentStore,
      leaguesById: {
        ...(currentStore?.leaguesById || {}),
        [leagueId]: {
          ...(currentStore?.leaguesById?.[leagueId] || {}),
          ...payload,
        },
      },
      lastSelectedLeagueId: leagueId,
    };

    writeStore(nextStore);
    console.log("✅ rehydrated from Supabase!", { leagueId, storagePath });

    return { data: payload };
  } catch (err) {
    console.warn("[FL][supabase] testLoadFromSupabase failed", err);
    return { error: err };
  }
}

if (typeof window !== "undefined") {
  window.__testLoadFromSupabase = testLoadFromSupabase;
}

function upsertLeague({
  leagueId,
  leagueKey,
  name,
  platform,
  scoring,
  rows,
  draftByYear,
  adpSourceByYear,
  moneyInputs,
  activityBySeason,
  espnTransactionsByYear,
  espnOwnerByTeamByYear,
  espnOwnerFullByTeamByYear,
  espnTeamNamesByOwner,
  espnRostersByYear,
  espnLineupSlotsByYear,
  espnRosterAcqByYear,
  espnPlayoffTeamsBySeason,
  playoffTeamsOverrides,
  espnCurrentWeekBySeason,
  espnScheduleByYear: scheduleByYear,
  espnSeasonsByYear,
  hiddenManagers,
  managerNicknames,
  leagueFontFamily,
  leagueIcon,
  espnTradesDetailedBySeason,
  espnProTeamsByYear,
  espnInjuriesByYear,
}) {
  const store = readStore();
  const prev = store.leaguesById[leagueId] || {};
  const keepIfNonEmpty = (next, prevVal = {}) =>
    next && typeof next === "object" && Object.keys(next).length > 0
      ? next
      : prevVal;
  const prevNicknames = normalizeNicknameMap(prev.managerNicknames || {});
  const nicknamesToPersist =
    managerNicknames === undefined
      ? prevNicknames
      : normalizeNicknameMap(managerNicknames);
  store.leaguesById[leagueId] = {
    leagueId,
    leagueKey,
    name: name || prev.name || `League ${leagueId}`,
    platform: platform || prev.platform || "ESPN",
    scoring: scoring || prev.scoring || "Standard",
    lastUpdated: Date.now(),
    rows: Array.isArray(rows) ? rows : prev.rows || [],
    draftByYear: draftByYear || prev.draftByYear || {},
    adpSourceByYear: adpSourceByYear || prev.adpSourceByYear || {},
    moneyInputs: moneyInputs || prev.moneyInputs || {},
    activityBySeason: activityBySeason || prev.activityBySeason || {},
    espnTransactionsByYear:
      espnTransactionsByYear || prev.espnTransactionsByYear || {},
    espnOwnerByTeamByYear:
      espnOwnerByTeamByYear ||
      prev.espnOwnerByTeamByYear ||
      prev.espnOwnerMapByYear ||
      {},
    espnOwnerMapByYear: espnOwnerByTeamByYear || prev.espnOwnerMapByYear || {},
    espnOwnerFullByTeamByYear:
      espnOwnerFullByTeamByYear || prev.espnOwnerFullByTeamByYear || {},
    espnTeamNamesByOwner:
      espnTeamNamesByOwner || prev.espnTeamNamesByOwner || {},
    espnRostersByYear: espnRostersByYear || prev.espnRostersByYear || {},
    espnLineupSlotsByYear:
      espnLineupSlotsByYear || prev.espnLineupSlotsByYear || {},
    espnRosterAcqByYear: espnRosterAcqByYear || prev.espnRosterAcqByYear || {},
    espnPlayoffTeamsBySeason:
      espnPlayoffTeamsBySeason || prev.espnPlayoffTeamsBySeason || {},
    espnTradesDetailedBySeason:
      espnTradesDetailedBySeason || prev.espnTradesDetailedBySeason || {},
    espnProTeamsByYear: espnProTeamsByYear || prev.espnProTeamsByYear || {},
    espnInjuriesByYear: espnInjuriesByYear || prev.espnInjuriesByYear || {},


    hiddenManagers: Array.isArray(hiddenManagers)
      ? hiddenManagers
      : Array.from(prev.hiddenManagers || []),
    managerNicknames: nicknamesToPersist,
    playoffTeamsOverrides:
      playoffTeamsOverrides || prev.playoffTeamsOverrides || {},
    espnCurrentWeekBySeason: keepIfNonEmpty(
      espnCurrentWeekBySeason,
      prev.espnCurrentWeekBySeason || {}
    ),
    leagueIcon:
      leagueIcon && typeof leagueIcon === "object"
        ? leagueIcon
        : prev.leagueIcon || {
            type: "preset",
            value: DEFAULT_LEAGUE_ICON_GLYPH,
          },
    leagueFontFamily:
      typeof leagueFontFamily === "string" && leagueFontFamily.trim()
        ? leagueFontFamily.trim()
        : prev.leagueFontFamily || DEFAULT_LEAGUE_FONT_FAMILY,
  };
  store.lastSelectedLeagueId = leagueId;
  writeStore(store);
  return store;
}
function deleteLeagueById(leagueId) {
  const store = readStore();
  if (store.leaguesById[leagueId]) {
    delete store.leaguesById[leagueId];
    if (store.lastSelectedLeagueId === leagueId) {
      store.lastSelectedLeagueId = Object.keys(store.leaguesById)[0] || "";
    }

    if (Object.keys(store.leaguesById).length === 0) {
      // No leagues left — purge storage in both backends to avoid resurrection
      try {
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem(`${LS_KEY}::backend`);
      } catch {}
      try {
        sessionStorage.removeItem(LS_KEY);
        sessionStorage.removeItem(`${LS_KEY}::backend`);
      } catch {}
    } else {
      writeStore(store);
    }
  }
  return readStore();
}

/* ---------------- Rows-only helpers (kept lightweight) ------------- */

function buildRowsLight(seasons) {
  const out = { rows: [], txRows: [], draftByYear: {}, leagueNameGuess: "" };
  if (!Array.isArray(seasons)) return out;

  for (const season of seasons) {
    const year =
      Number(season?.seasonId) ||
      Number(season?.scoringPeriodId) ||
      new Date().getFullYear();

    const leagueName =
      season?.settings?.name ||
      season?.settings?.leagueName ||
      season?.settings?.leagueNickname ||
      "";
    if (leagueName && !out.leagueNameGuess) out.leagueNameGuess = leagueName;
    const memberMap = new Map();
    (season?.members || []).forEach((m) => {
      const dn = m?.displayName || "";
      const fn = m?.firstName || "";
      const ln = m?.lastName || "";
      const best = dn || [fn, ln].filter(Boolean).join(" ").trim() || "Unknown";
      if (m?.id != null) memberMap.set(m.id, best);
    });
    const teamMap = new Map();
    (season?.teams || []).forEach((t) => {
      const tName =
        `${t?.location || ""} ${t?.nickname || ""}`.trim() ||
        t?.name ||
        `Team ${t?.id}`;
      const ownerId =
        t?.primaryOwner || (t?.owners && t?.owners[0]) || "__unknown__";
      const finalRank = t?.finalRank ?? t?.rankCalculatedFinal ?? null;
      if (t?.id != null) teamMap.set(t.id, { name: tName, ownerId, finalRank });
    });

    const scoringName =
      season?.scoringSettings?.name ||
      season?.settings?.scoringSettings?.name ||
      season?.settings?.scoringType ||
      undefined;

    (season?.schedule || []).forEach((g) => {
      const hId = g?.home?.teamId ?? g?.homeTeamId ?? g?.homeId;
      const aId = g?.away?.teamId ?? g?.awayTeamId ?? g?.awayId;
      if (hId == null || aId == null) return;

      const home = teamMap.get(hId);
      const away = teamMap.get(aId);
      if (!home || !away) return;

      const hPts =
        Number(g?.home?.totalPoints ?? g?.home?.score ?? g?.homePoints ?? 0) ||
        0;
      const aPts =
        Number(g?.away?.totalPoints ?? g?.away?.score ?? g?.awayPoints ?? 0) ||
        0;

      // Projections (live/scoreboard fallbacks)
      const hProjRaw =
        g?.home?.totalProjectedPointsLive ??
        g?.home?.totalProjectedPoints ??
        g?.home?.totalProjectedScore ??
        g?.home?.overallProjectedScore ??
        null;
      const aProjRaw =
        g?.away?.totalProjectedPointsLive ??
        g?.away?.totalProjectedPoints ??
        g?.away?.totalProjectedScore ??
        g?.away?.overallProjectedScore ??
        null;
      const hProj = hProjRaw != null ? Number(hProjRaw) : null;
      const aProj = aProjRaw != null ? Number(aProjRaw) : null;

      const week =
        Number(g?.matchupPeriodId ?? g?.scoringPeriodId ?? g?.period) || null;

      const tier = String(g?.playoffTierType || "").toUpperCase();
      const mtype = String(g?.matchupType || "").toUpperCase();
      const isPlayoff =
        g?.playoffMatchup === true ||
        (tier && tier !== "NONE") ||
        /PLAYOFF|CHAMP/.test(mtype);

      const homeOwner = memberMap.get(home.ownerId) || "Unknown";
      const awayOwner = memberMap.get(away.ownerId) || "Unknown";

      out.rows.push({
        season: year,
        week,
        manager: homeOwner,
        opponent: awayOwner,
        team_name: home.name,
        points_for: hPts,
        points_against: aPts,
        proj_for: Number.isFinite(hProj) ? hProj : null,
        proj_against: Number.isFinite(aProj) ? aProj : null,
        result: hPts > aPts ? "W" : hPts < aPts ? "L" : "T",
        final_rank: home.finalRank ?? "",
        league_name: leagueName,
        platform: "ESPN",
        scoring: scoringName,
        is_playoff: !!isPlayoff,
      });

      out.rows.push({
        season: year,
        week,
        manager: awayOwner,
        opponent: homeOwner,
        team_name: away.name,
        points_for: aPts,
        points_against: hPts,
        proj_for: Number.isFinite(aProj) ? aProj : null,
        proj_against: Number.isFinite(hProj) ? hProj : null,
        result: aPts > hPts ? "W" : aPts < hPts ? "L" : "T",
        final_rank: away.finalRank ?? "",
        league_name: leagueName,
        platform: "ESPN",
        scoring: scoringName,
        is_playoff: !!isPlayoff,
      });
    });

    teamMap.forEach((t) => {
      const ownerName = memberMap.get(t.ownerId) || "Unknown";
      out.txRows.push({
        season: year,
        manager: ownerName,
        opponent: "",
        team_name: t.name,
        points_for: "",
        points_against: "",
        result: "",
        final_rank: t.finalRank ?? "",
        league_name: leagueName,
        platform: "ESPN",
        is_playoff: false,
      });
    });
  }
  return out;
}
function coerceLegacyRows(legacy, { seasons, leagueId, leagueName }) {
  const nameFromSeasons =
    seasons?.[0]?.settings?.name ||
    seasons?.[0]?.settings?.leagueName ||
    seasons?.[0]?.settings?.leagueNickname ||
    null;

  const idFromSeasons =
    String(
      seasons?.[0]?.id || seasons?.[0]?.leagueId || leagueId || ""
    ).trim() || null;

  const finalName =
    (leagueName || nameFromSeasons || "").trim() ||
    (idFromSeasons ? `League ${idFromSeasons}` : "");

  const finalId = (leagueId || idFromSeasons || "").trim();

  return (Array.isArray(legacy) ? legacy : []).map((r) => ({
    ...r,
    league_name: (r.league_name || finalName || "").trim(),
    league_id: String(r.league_id || finalId || "").trim(),
    manager: r.manager ?? r.manager_name ?? r.owner ?? r.manager,
    platform: r.platform || "ESPN",
  }));
}
function preferRealMemberNames(rows, seasons) {
  const replaceMap = new Map();
  (seasons || []).forEach((s) => {
    (s?.members || []).forEach((m) => {
      const real = [m?.firstName || "", m?.lastName || ""].join(" ").trim();
      const disp = (m?.displayName || "").trim();
      if (real && disp) replaceMap.set(disp, real);
    });
  });
  return (rows || []).map((r) => {
    const mgr = replaceMap.get((r.manager || "").trim()) || r.manager;
    const opp = replaceMap.get((r.opponent || "").trim()) || r.opponent;
    return { ...r, manager: mgr, opponent: opp };
  });
}
function lockLeagueIdentity(rows, id, name) {
  const idStr = String(id || "").trim();
  const nameStr = String(name || "").trim();
  return (rows || []).map((r) => ({
    ...r,
    league_id: idStr,
    league_name: nameStr,
    platform: r.platform || "ESPN",
  }));
}

function extractPlayoffTeamsBySeason(seasons = []) {
  const out = {};
  (seasons || []).forEach((s) => {
    const yr = Number(s?.seasonId);
    if (!yr) return;
    const n = Number(
      s?.settings?.scheduleSettings?.playoffTeamCount ??
        s?.settings?.playoffTeamCount ??
        s?.scheduleSettings?.playoffTeamCount ??
        s?.playoffTeamCount
    );
    if (Number.isFinite(n) && n > 0) out[yr] = n;
  });
  return out;
}
function buildScheduleFromRows(rows = []) {
  const byYear = {};
  const seen = new Set();

  for (const r of rows || []) {
    const year = Number(r.season);
    const week = Number(r.week);
    if (!Number.isFinite(year) || !Number.isFinite(week)) continue;

    const a = String(r.manager || "");
    const b = String(r.opponent || "");
    if (!a || !b) continue;

    const lo = [a, b].sort();
    const key = `${year}|${week}|${lo[0]}|${lo[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const opp = (rows || []).find(
      (x) =>
        Number(x.season) === year &&
        Number(x.week) === week &&
        String(x.manager || "") === b &&
        String(x.opponent || "") === a
    );

    const homePts = Number(r.points_for) || 0;
    const awayPts = Number(opp?.points_for) || Number(r.points_against) || 0;

    const game = {
      matchupPeriodId: week,
      home: {
        teamName: r.team_name || a,
        ownerName: a,
        totalPoints: homePts,
      },
      away: {
        teamName: opp?.team_name || b,
        ownerName: b,
        totalPoints: awayPts,
      },
      playoffTierType: r.is_playoff ? "PLAYOFF" : "NONE",
    };

    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(game);
  }

  Object.values(byYear).forEach((arr) =>
    arr.sort((x, y) => (x.matchupPeriodId || 0) - (y.matchupPeriodId || 0))
  );
  return byYear;
}

/* ---------------- Draft helpers (robust) ------------------- */

const POS_LITE = { 0: "QB", 2: "RB", 4: "WR", 6: "TE", 16: "DST", 17: "K" };
const NFL_LITE = {
  1: "ATL",
  2: "BUF",
  3: "CHI",
  4: "CIN",
  5: "CLE",
  6: "DAL",
  7: "DEN",
  8: "DET",
  9: "GB",
  10: "TEN",
  11: "IND",
  12: "KC",
  13: "LV",
  14: "LAR",
  15: "MIA",
  16: "MIN",
  17: "NE",
  18: "NO",
  19: "NYG",
  20: "NYJ",
  21: "PHI",
  22: "ARI",
  23: "PIT",
  24: "LAC",
  25: "SF",
  26: "SEA",
  27: "TB",
  28: "WSH",
  29: "CAR",
  30: "JAX",
  33: "BAL",
  34: "HOU",
};
function buildPlayerIndexLight(season) {
  const idx = new Map();
  const put = (id, fullName, posId, teamId) => {
    if (id == null) return;
    const name = String(fullName || "").trim();
    const pos = POS_LITE[posId] || "";
    const nfl = NFL_LITE[teamId] || "";
    const prev = idx.get(Number(id));
    if (!prev || (name && name.length > (prev.fullName || "").length)) {
      idx.set(Number(id), { fullName: name, pos, nfl });
    }
  };
  const fromPlayer = (p) => {
    if (!p) return;
    const id = p.id ?? p.playerId ?? p.player?.id;
    if (id == null) return;
    const full =
      p.fullName ??
      p.player?.fullName ??
      (p.firstName && p.lastName
        ? `${p.firstName} ${p.lastName}`
        : p.name || p.displayName);
    const posId =
      p.defaultPositionId ??
      p.player?.defaultPositionId ??
      p.defaultPos ??
      p.positionId;
    const teamId =
      p.proTeamId ?? p.player?.proTeamId ?? p.proTeam ?? p.proTeamIdCurrent;
    put(id, full, posId, teamId);
  };

  (season?.playersLite || []).forEach(fromPlayer);
  (season?.players || []).forEach(fromPlayer);
  (season?.playerPool?.players || []).forEach(fromPlayer);

  if (Array.isArray(season?.draftDetail?.players))
    season.draftDetail.players.forEach(fromPlayer);

  if (
    season?.draftDetail?.playerIdMap &&
    typeof season.draftDetail.playerIdMap === "object"
  )
    Object.values(season.draftDetail.playerIdMap).forEach(fromPlayer);

  if (season?.playersMap && typeof season.playersMap === "object")
    Object.values(season.playersMap).forEach(fromPlayer);

  (season?.teams || []).forEach((t) => {
    const entries =
      t?.roster?.entries || t?.roster?.entriesByScoringPeriod || [];
    const flat = Array.isArray(entries)
      ? entries
      : Object.values(entries).flat();
    flat.forEach((e) => {
      const p = e?.playerPoolEntry?.player || e?.playerPoolEntry || e?.player;
      fromPlayer(p);
    });
  });
  const seen = new WeakSet();
  const visit = (node, depth = 0) => {
    if (!node || typeof node !== "object" || seen.has(node) || depth > 3)
      return;
    seen.add(node);
    const id = node.id ?? node.playerId ?? node?.player?.id;
    const hasNameLike = !!(
      node.fullName ||
      node.displayName ||
      (node.firstName && node.lastName)
    );
    if (id != null && hasNameLike) {
      const full =
        node.fullName ??
        (node.firstName && node.lastName
          ? `${node.firstName} ${node.lastName}`
          : node.displayName);
      const posId =
        node.defaultPositionId ??
        node.positionId ??
        node.player?.defaultPositionId;
      const teamId =
        node.proTeamId ??
        node.proTeam ??
        node.player?.proTeamId ??
        node.proTeamIdCurrent;
      put(id, full, posId, teamId);
    }
    if (Array.isArray(node)) node.forEach((x) => visit(x, depth + 1));
    else Object.values(node).forEach((v) => visit(v, depth + 1));
  };
  visit(season);

  return idx;
}
function extractSeasonPicks(season) {
  const cands = [
    season?.draftDetail?.picks,
    season?.draftDetail?.draft?.picks,
    season?.draft?.picks,
    season?.draftDetail?.picks?.items,
  ];
  let picks = [];
  cands.forEach((a) => Array.isArray(a) && (picks = picks.concat(a)));
  return picks;
}
function reconstructFromRosters(season, ownerByTeam, pIdx) {
  const out = [];
  (season?.teams || []).forEach((t) => {
    const teamId = t?.id;
    const entries =
      t?.roster?.entries || t?.roster?.entriesByScoringPeriod || [];
    const flat = Array.isArray(entries)
      ? entries
      : Object.values(entries).flat();

    flat.forEach((e) => {
      const acq = String(
        e?.acquisitionType || e?.playerPoolEntry?.acquisitionType || ""
      ).toUpperCase();
      if (acq !== "DRAFT" && acq !== "KEEPER") return;

      const pid =
        e?.playerId ?? e?.playerPoolEntry?.id ?? e?.playerPoolEntry?.player?.id;
      const p = pid != null ? pIdx.get(Number(pid)) : null;

      out.push({
        owner: ownerByTeam.get(teamId) || "Unknown",
        round: null,
        overall: null,
        playerId: pid != null ? Number(pid) : null,
        player: p?.fullName || "",
        pos: p?.pos || "",
        nfl: p?.nfl || "",
        adp: null,
        posRank: null,
        keeper: acq === "KEEPER",
      });
    });
  });
  return out;
}
function buildDraftRich(seasons) {
  const byYear = {};
  (seasons || []).forEach((season) => {
    const year = Number(season?.seasonId);
    if (!year) return;
    const members = new Map();
    (season?.members || []).forEach((m) => {
      const dn =
        m?.displayName || `${m?.firstName || ""} ${m?.lastName || ""}`.trim();
      if (m?.id != null) members.set(m.id, dn || "Unknown");
    });
    const ownerByTeam = new Map();
    (season?.teams || []).forEach((t) => {
      const ownerId = t?.primaryOwner || (t?.owners && t.owners[0]) || null;
      if (t?.id != null)
        ownerByTeam.set(t.id, members.get(ownerId) || "Unknown");
    });

    const pIdx = buildPlayerIndexLight(season);
    const picks = extractSeasonPicks(season);

    let rows = [];
    if (picks.length) {
      rows = picks.map((pk) => {
        const teamId = pk?.teamId ?? pk?.franchiseId ?? pk?.team;
        const owner = ownerByTeam.get(teamId) || "Unknown";

        const pid = Number(
          pk?.playerId ??
            pk?.player?.id ??
            pk?.draftedPlayerId ??
            pk?.entityId ??
            pk?.player?.playerId
        );
        const p = Number.isFinite(pid) ? pIdx.get(pid) : null;

        const pObj =
          pk?.player || pk?.draftedPlayer || pk?.playerPoolEntry?.player || {};
        const pName =
          p?.fullName ||
          pObj?.fullName ||
          (pObj?.firstName && pObj?.lastName
            ? `${pObj.firstName} ${pObj.lastName}`.trim()
            : pObj?.name ||
              pObj?.displayName ||
              (Number.isFinite(pid) ? `Player #${pid}` : "Unknown Player"));

        const pos = p?.pos || POS_LITE[pObj?.defaultPositionId] || "";
        const nfl =
          p?.nfl ||
          NFL_LITE[
            pObj?.proTeamId ?? pObj?.proTeam ?? pObj?.proTeamIdCurrent
          ] ||
          "";

        return {
          owner,
          round: Number(pk?.roundId ?? pk?.round ?? pk?.draftRound) || null,
          overall:
            Number(
              pk?.overallPickNumber ?? pk?.overallPick ?? pk?.pickNumber
            ) || null,
          playerId: Number.isFinite(pid) ? pid : null,
          player: String(pName || "Unknown Player"),
          pos,
          nfl,
          adp: null,
          posRank: null,
          keeper: !!(pk?.keeper || pk?.isKeeper || pk?.reservedForKeeper),
        };
      });
    } else {
      rows = reconstructFromRosters(season, ownerByTeam, pIdx);
    }

    rows.sort((a, b) => {
      const ao = a.overall ?? 1e9;
      const bo = b.overall ?? 1e9;
      return ao - bo;
    });

    byYear[year] = rows;
  });
  return byYear;
}
const _normName = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v|vi)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

function overlayMissingAdpByNameOnly(draftByYear) {
  const byYearIdx = {};
  try {
    for (const [yrStr, rows] of Object.entries(FP_ADP_BY_YEAR || {})) {
      const yr = Number(yrStr);
      const m = new Map();
      (rows || []).forEach((r) => {
        const nm = r?.name ?? r?.player ?? "";
        const adp = Number(r?.adp ?? r?.ADP);
        if (!nm || Number.isNaN(adp)) return;
        m.set(_normName(nm), adp);
      });
      byYearIdx[yr] = m;
    }
  } catch {}
  const out = {};
  for (const [yrStr, rows] of Object.entries(draftByYear || {})) {
    const yr = Number(yrStr);
    const idx = byYearIdx[yr] || new Map();
    out[yr] = (rows || []).map((r) => {
      if (r?.adp != null && !Number.isNaN(Number(r.adp))) return r;
      const adp = idx.get(_normName(r?.player));
      return adp != null ? { ...r, adp, adpSource: "FP(stored)" } : r;
    });
  }
  return out;
}
function attachAdpFromPopup(draftByYear, adpByYearObj) {
  if (!draftByYear || !adpByYearObj) return draftByYear || {};
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[.'"]/g, "")
      .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const out = {};
  for (const [yr, arr] of Object.entries(draftByYear || {})) {
    const adpMap = new Map(
      Object.entries(adpByYearObj[yr] || {}).map(([k, v]) => [
        norm(k),
        Number(v),
      ])
    );
    out[yr] = (arr || []).map((r) => {
      if (r?.adp != null) return r;
      const v = adpMap.get(norm(r?.player));
      return v != null && !Number.isNaN(v) ? { ...r, adp: v } : r;
    });
  }
  return out;
}
function attachPosFromPopup(draftByYear, adpPosByYear) {
  if (!draftByYear || !adpPosByYear) return draftByYear || {};
  const out = {};
  for (const [yrStr, rows] of Object.entries(draftByYear || {})) {
    const yr = Number(yrStr);
    const sourceMap = adpPosByYear?.[yr] || {};
    const idx = new Map();
    Object.entries(sourceMap).forEach(([name, v]) => {
      const label = typeof v === "string" ? v : v && v.pos ? v.pos : null;
      if (!name || !label) return;
      idx.set(_normName(name), String(label).trim());
    });
    out[yr] = (rows || []).map((r) => {
      const lbl = idx.get(_normName(r.player));
      if (!lbl) return r;
      const m = lbl.match(/^([A-Z]+)\s*([0-9]+)$/i);
      const code = m
        ? m[1].toUpperCase()
        : lbl.replace(/[0-9]+/g, "").toUpperCase();
      const rank = m ? Number(m[2]) : null;
      return {
        ...r,
        adpPos: lbl,
        adpPosRank: Number.isFinite(rank) ? rank : null,
        pos: r.pos || code || r.pos,
      };
    });
  }
  return out;
}
function overlayMissingPosByNameOnly(draftByYear) {
  const nameIdx = {};
  try {
    for (const [yrStr, rows] of Object.entries(FP_ADP_BY_YEAR || {})) {
      const yr = Number(yrStr);
      const m = new Map();
      (rows || []).forEach((r) => {
        const nm = r?.name ?? r?.player ?? "";
        const lbl = r?.pos ?? r?.position ?? "";
        if (!nm || !lbl) return;
        const t = String(lbl).trim();
        const mm = t.match(/^([A-Za-z]+)\s*([0-9]+)$/);
        const code = mm
          ? mm[1].toUpperCase()
          : t.replace(/[0-9]+/g, "").toUpperCase();
        const rank = mm ? Number(mm[2]) : null;
        m.set(_normName(nm), {
          lbl: t,
          code,
          rank: Number.isFinite(rank) ? rank : null,
        });
      });
      nameIdx[yr] = m;
    }
  } catch {}
  const out = {};
  for (const [yrStr, rows] of Object.entries(draftByYear || {})) {
    const yr = Number(yrStr);
    const idx = nameIdx[yr] || new Map();
    out[yr] = (rows || []).map((r) => {
      if (r?.adpPos) return r;
      const hit = idx.get(_normName(r?.player));
      if (!hit) return r;
      return {
        ...r,
        adpPos: hit.lbl,
        adpPosRank: hit.rank,
        pos: r.pos || hit.code || r.pos,
      };
    });
  }
  return out;
}
function attachPickPosFromDraftOrder(draftByYear) {
  if (!draftByYear) return {};
  const baseFrom = (r) => {
    const p = (r.pos || r.position || "").toString().toUpperCase().trim();
    if (p) return p;
    const ap = (r.adpPos || "").toString().toUpperCase();
    const m = ap.match(/^([A-Z]+)/);
    return m ? m[1] : "";
  };
  const out = {};
  for (const [yrStr, rows] of Object.entries(draftByYear || {})) {
    const rowsArr = Array.isArray(rows) ? rows : [];
    const sorted = rowsArr.slice().sort((a, b) => {
      const ao = Number(a.overall ?? Infinity);
      const bo = Number(b.overall ?? Infinity);
      return ao - bo;
    });
    const counts = Object.create(null);
    const rankMap = new WeakMap();
    sorted.forEach((r) => {
      const code = baseFrom(r);
      if (!code) return;
      counts[code] = (counts[code] || 0) + 1;
      rankMap.set(r, {
        posAtPick: counts[code],
        posAtPickLabel: `${code}${counts[code]}`,
      });
    });
    out[Number(yrStr)] = rowsArr.map((r) => {
      const add = rankMap.get(r);
      return add
        ? { ...r, ...add }
        : { ...r, posAtPick: null, posAtPickLabel: null };
    });
  }
  return out;
}
/* -------- Finish-pos overlay (optional; driven by your CSV ingest) -------- */
const FINISH_LS_KEY = "fl_finishpos_by_year";
function _normFinishName(s = "") {
  return s
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v|vi)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function _splitCSVLine(line) {
  const out = [];
  let cur = "",
    inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
function parseFantasyDataLeadersCSV(text) {
  const lines = String(text || "")
    .trim()
    .split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = _splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (kList) => {
    for (const k of kList) {
      const j = headers.indexOf(k);
      if (j !== -1) return j;
    }
    return -1;
  };
  const iName = idx(["name", "player"]);
  const iPos = idx(["pos", "position"]);
  const iFpts = idx([
    "fpts",
    "fantasy points",
    "fantasy_points",
    "fantasy points (ppr)",
    "points",
  ]);
  if (iName === -1 || iPos === -1 || iFpts === -1) return [];
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = _splitCSVLine(lines[i]);
    const name = (cols[iName] || "").trim();
    const pos = (cols[iPos] || "").trim().toUpperCase();
    const fpts = Number(
      (cols[iFpts] || "").toString().replace(/[^0-9.\-]/g, "")
    );
    if (!name || !pos || !Number.isFinite(fpts)) continue;
    out.push({ name, pos, fpts });
  }
  return out;
}
function buildFinishPosMap(rows) {
  const byPos = new Map();
  rows.forEach((r) => {
    if (!byPos.has(r.pos)) byPos.set(r.pos, []);
    byPos.get(r.pos).push(r);
  });
  const out = new Map();
  for (const [pos, arr] of byPos.entries()) {
    arr.sort((a, b) => b.fpts - a.fpts);
    arr.forEach((r, i) => out.set(_normFinishName(r.name), `${pos}${i + 1}`));
  }
  return out;
}
function loadFinishStore() {
  try {
    const o = JSON.parse(localStorage.getItem(FINISH_LS_KEY) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
function saveFinishStore(obj) {
  try {
    localStorage.setItem(FINISH_LS_KEY, JSON.stringify(obj || {}));
  } catch {}
}
window.FL_ingestFinishCSV = (year, scoring, csvText) => {
  const y = Number(year);
  const sc = (scoring || "PPR").toUpperCase();
  const parsed = parseFantasyDataLeadersCSV(csvText);
  if (!parsed.length) {
    console.warn("No rows parsed.");
    return;
  }
  const map = buildFinishPosMap(parsed);
  const store = loadFinishStore();
  if (!store[y]) store[y] = {};
  store[y][sc] = Object.fromEntries(map.entries());
  saveFinishStore(store);
  try {
    const app = window;
    if (typeof app.FL_attachFinishNow === "function") app.FL_attachFinishNow();
  } catch {}
};
function attachFinishPosFromLocal(draftByYear, scoringLabel = "PPR") {
  const store = loadFinishStore();
  const sc = (scoringLabel || "PPR").toUpperCase();
  const out = {};
  for (const [yrStr, rows] of Object.entries(draftByYear || {})) {
    const yr = Number(yrStr);
    const idx = store?.[yr]?.[sc] || {};
    out[yr] = (rows || []).map((r) => {
      const key = _normFinishName(r.player);
      const label = idx[key];
      return label ? { ...r, finishPos: label } : r;
    });
  }
  return out;
}

/* ---------------- ROSTER BUILD (for Roster tab & adds inference) --- */
function buildRostersByYear(seasons = []) {
  const toFinite = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  };
  const firstDefined = (...cands) => {
    for (const cand of cands) {
      if (cand !== undefined && cand !== null) return cand;
    }
    return null;
  };
  const collectWeekNums = (value, outSet) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((v) => collectWeekNums(v, outSet));
      return;
    }
    if (typeof value === "object") {
      Object.values(value || {}).forEach((v) => collectWeekNums(v, outSet));
      return;
    }
    const n = toFinite(value);
    if (n != null) outSet.add(n);
  };

  const out = {};
  seasons.forEach((s) => {
    const yr = Number(s?.seasonId);
    if (!yr) return;
    const byTeam = (out[yr] = {});
    (s?.teams || []).forEach((t) => {
      const tid = Number(t?.id);
      if (!Number.isFinite(tid)) return;
      const weeks = {};
      const bySp = t?.roster?.entriesByScoringPeriod;
      if (bySp && typeof bySp === "object") {
        Object.entries(bySp).forEach(([spid, arrOrObj]) => {
          const arr = Array.isArray(arrOrObj)
            ? arrOrObj
            : Object.values(arrOrObj || {}).flat();
          const list = [];
          arr.forEach((e) => {
            const p =
              e?.playerPoolEntry?.player ||
              e?.player ||
              e?.playerPoolEntry ||
              {};
            const pid = Number(p?.id ?? e?.playerId);
            if (!Number.isFinite(pid)) return;
            const name =
              p?.fullName ||
              (p?.firstName && p?.lastName
                ? `${p.firstName} ${p.lastName}`.trim()
                : p?.name || "");
            const posId = Number(
              p?.defaultPositionId ??
                e?.defaultPositionId ??
                e?.playerPoolEntry?.player?.defaultPositionId
            );
            const slotId = Number(
              e?.lineupSlotId ??
                e?.playerPoolEntry?.lineupSlotId ??
                e?.lineupSlotIdFinal
            );
            const pts =
              Number(
                e?.appliedTotal ??
                  e?.playerPoints?.appliedTotal ??
                  e?.appliedStatTotal ??
                  0
              ) || 0;

            const proj = (() => {
              const v =
                e?.proj ??
                e?.projectedPoints ??
                e?.playerPoolEntry?.projectedPoints ??
                e?.projStart ?? // legacy support
                null;
              const n = Number(v);
              return Number.isFinite(n) ? n : 0;
            })();

            const entry = { pid, name, posId, slotId, pts, proj };

            const injuredSource = firstDefined(
              e?.injured,
              e?.player?.injured,
              e?.playerPoolEntry?.injured,
              p?.injured
            );
            if (injuredSource != null) entry.injured = Boolean(injuredSource);

            const onByeSource = firstDefined(
              e?.onBye,
              e?.player?.onBye,
              e?.playerPoolEntry?.onBye,
              p?.onBye
            );
            if (onByeSource != null) entry.onBye = Boolean(onByeSource);

            const byeWeeksSet = new Set();
            collectWeekNums(e?.byeWeeks, byeWeeksSet);
            collectWeekNums(e?.player?.byeWeeks, byeWeeksSet);
            collectWeekNums(e?.playerPoolEntry?.byeWeeks, byeWeeksSet);
            collectWeekNums(p?.byeWeeks, byeWeeksSet);
            collectWeekNums(p?.byeWeekSchedule, byeWeeksSet);
            collectWeekNums(p?.proTeamByeWeekSchedule, byeWeeksSet);
            if (byeWeeksSet.size) entry.byeWeeks = Array.from(byeWeeksSet);

            const byeWeek = firstDefined(
              toFinite(e?.byeWeek),
              toFinite(e?.player?.byeWeek),
              toFinite(e?.playerPoolEntry?.byeWeek),
              toFinite(p?.byeWeek)
            );
            if (byeWeek != null) entry.byeWeek = byeWeek;

            const proTeamByeWeek = firstDefined(
              toFinite(e?.proTeamByeWeek),
              toFinite(e?.player?.proTeamByeWeek),
              toFinite(e?.playerPoolEntry?.proTeamByeWeek),
              toFinite(p?.proTeamByeWeek)
            );
            if (proTeamByeWeek != null) entry.proTeamByeWeek = proTeamByeWeek;

            list.push(entry);
          });
          weeks[Number(spid)] = list;
        });
      }
      byTeam[tid] = weeks;
    });
  });
  return out;
}
// --- User menu (profile dropdown) + dark-mode persistence
const THEME_STORAGE_KEY = "theme";
const DARK_THEME = "luxury";
const LIGHT_THEME = "light";

function useTheme() {
  const [theme, setTheme] = React.useState(() => {
    if (typeof window === "undefined") return DARK_THEME;
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === DARK_THEME || saved === "dark") return DARK_THEME;
      if (saved === LIGHT_THEME || saved === "light") return LIGHT_THEME;
    } catch (e) {
      console.warn("[FL][theme] unable to read saved theme", e);
    }
    return DARK_THEME;
  });

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (!root) return;
    const isDark = theme === DARK_THEME;

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.warn("[FL][theme] unable to persist theme", e);
    }
  }, [theme]);

  const toggle = React.useCallback(() => {
    setTheme((prev) => (prev === DARK_THEME ? LIGHT_THEME : DARK_THEME));
  }, []);

  return { isDark: theme === DARK_THEME, toggle };
}

function UserMenu({
  user = { name: "You", email: "" },
  onNavigate = (path) => path && (window.location.href = path),
  onSignOut = () => {
    try {
      if (window.FL_signOut) window.FL_signOut();
    } catch {}
    window.location.href = "/"; // back to home
  },
}) {
  const { isDark, toggle } = useTheme();
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, right: 0 });
  const portalTarget =
    typeof document !== "undefined" ? document.body : null;

  React.useEffect(() => {
    const onClick = (e) => {
      if (!open) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      )
        setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  React.useLayoutEffect(() => {
    if (!open || typeof window === "undefined") return;
    const updatePosition = () => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: Math.max(window.innerWidth - rect.right, 8),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const initials = React.useMemo(() => {
    const s = String(user?.name || "You")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => (w[0] || "").toUpperCase())
      .join("");
    return s || "U"; // ✅ return the local var we computed
  }, [user?.name]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
        title="Account"
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold">
          {initials}
        </span>
        <span className="hidden sm:block text-sm text-zinc-700 dark:text-zinc-200 max-w-[120px] truncate">
          {user?.name || "You"}
        </span>
        <svg
          className={`h-4 w-4 opacity-70 transition ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
        </svg>
      </button>

      {open && portalTarget &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: menuPosition.top, right: menuPosition.right }}
            className="fixed z-[120] w-56 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden"
          >
            <div className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
              Signed in as
              <div className="text-zinc-900 dark:text-zinc-100 font-medium truncate">
                {user?.name || "You"}
              </div>
            {user?.email ? <div className="truncate">{user.email}</div> : null}
          </div>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => {
              setOpen(false);
              onNavigate("/profile");
            }}
          >
            My Profile
          </button>
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => {
              setOpen(false);
              onNavigate("/settings");
            }}
          >
            Settings
          </button>

          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
          <div className="px-3 py-2 flex items-center justify-between text-sm">
            <span>Dark Mode</span>
            <button
              aria-label="Toggle dark mode"
              onClick={toggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition border ${
                isDark
                  ? "bg-zinc-900 border-zinc-700"
                  : "bg-zinc-300 border-zinc-400"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-200 transition ${
                  isDark ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            Sign out
          </button>
          </div>,
          portalTarget
        )}
    </div>
  );
}
// Minimal error boundary to prevent a blank app if a child throws (e.g., hook-order bug)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, msg: "" };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, msg: String(err?.message || err) || "Error" };
  }
  componentDidCatch(err, info) {
    console.warn(
      `[ErrorBoundary:${this.props.name || "Component"}]`,
      err,
      info
    );
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-error">
          <div className="font-semibold">
            {this.props.name || "Component"} failed to render
          </div>
          <div className="text-xs opacity-80">{this.state.msg}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* --------------------------------- App ------------------------------------ */
export default function App() {
  const [section, setSection] = useState("setup");
  const [leagueName, setLeagueName] = useState("Your Fantasy League");
  const [leagueFontFamily, setLeagueFontFamily] = useState(
    DEFAULT_LEAGUE_FONT_FAMILY
  );
  const [leagueIcon, setLeagueIcon] = useState(makeDefaultLeagueIcon);
  const [derivedAll, setDerivedAll] = useState(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [selectedLeagueKey, setSelectedLeagueKey] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [leagueMenuOpen, setLeagueMenuOpen] = useState(false);
  const [managerNicknames, setManagerNicknames] = useState({});
  const [moneyInputs, setMoneyInputs] = useState({});
  const [error, setError] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [draftByYear, setDraftByYear] = useState({});
  const [adpSourceByYear, setAdpSourceByYear] = useState({});
  const [activityBySeason, setActivityBySeason] = useState({});
  const [rostersByYear, setRostersByYear] = useState({});
  const [ownerByTeamByYear, setOwnerByTeamByYear] = useState({});
  const [teamNamesByOwner, setTeamNamesByOwner] = useState({});
  const [lineupSlotsByYear, setLineupSlotsByYear] = useState({});
  const [rosterAcqByYear, setRosterAcqByYear] = useState({});
  const [currentWeekBySeason, setCurrentWeekBySeason] = useState({});
  const [proTeamsByYear, setProTeamsByYear] = useState({});
  const [ownerFullByTeamByYear, setOwnerFullByTeamByYear] = useState({});
  const [playoffTeamsBySeason, setPlayoffTeamsBySeason] = useState({});
  const [playoffTeamsOverrides, setPlayoffTeamsOverrides] = useState({});
  const [hiddenManagers, setHiddenManagers] = useState(new Set());
  const [seasonsByYear, setSeasonsByYear] = useState({});
  const [scheduleByYear, setScheduleByYear] = useState({});
  const [injuriesByYear, setInjuriesByYear] = useState({});
  const [remoteLeagues, setRemoteLeagues] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await getLeaguesForCurrentUser();
        if (error) {
          console.warn("[FL][supabase] failed to load leagues from Supabase:", error);
          return;
        }
        setRemoteLeagues(data);
        console.log("📦 loaded leagues from Supabase:", data);
        // here is where you can hydrate your existing FL_STORE if you want
      } catch (err) {
        console.warn("[FL][supabase] getLeaguesForCurrentUser threw:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!remoteLeagues.length) return;
    console.log("[FL][supabase] remote leagues ready:", remoteLeagues);
  }, [remoteLeagues]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const root = document.documentElement;
    if (!root) return undefined;

    if (!leagueFontFamily) {
      root.style.removeProperty("--league-font-family");
      return undefined;
    }

    root.style.setProperty("--league-font-family", leagueFontFamily);
    return () => {
      root.style.removeProperty("--league-font-family");
    };
  }, [leagueFontFamily]);

  const leagueMenuButtonRef = React.useRef(null);
  const leagueMenuRef = React.useRef(null);
  const lastSupabaseAutoSaveRef = React.useRef({ key: null, stamp: null });
  const currentYear = React.useMemo(() => {
    const yrs = Object.keys(currentWeekBySeason || {})
      .map(Number)
      .filter(Number.isFinite);
    return yrs.length ? Math.max(...yrs) : null;
  }, [currentWeekBySeason]);

  const scheduleThisYearNormalized = React.useMemo(() => {
    const arr = scheduleByYear?.[currentYear] || [];
    return arr.map((g) => {
      const homeProj =
        g?.home?.totalProjectedPointsLive ??
        g?.home?.totalProjectedPoints ??
        g?.home?.totalProjectedScore ??
        g?.home?.overallProjectedScore ??
        null;
      const awayProj =
        g?.away?.totalProjectedPointsLive ??
        g?.away?.totalProjectedPoints ??
        g?.away?.totalProjectedScore ??
        g?.away?.overallProjectedScore ??
        null;
      return {
        ...g,
        __proj: {
          home: Number.isFinite(Number(homeProj)) ? Number(homeProj) : null,
          away: Number.isFinite(Number(awayProj)) ? Number(awayProj) : null,
        },
      };
    });
  }, [scheduleByYear, currentYear]);

  React.useEffect(() => {
    if (!leagueMenuOpen) return;
    const handleClick = (event) => {
      if (
        leagueMenuRef.current &&
        !leagueMenuRef.current.contains(event.target) &&
        leagueMenuButtonRef.current &&
        !leagueMenuButtonRef.current.contains(event.target)
      ) {
        setLeagueMenuOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setLeagueMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [leagueMenuOpen]);

  const seasonThisYear = React.useMemo(() => {
    if (!currentYear) return null;
    const n = Number(currentWeekBySeason?.[currentYear]);
    return Number.isFinite(n) ? { year: currentYear, currentWeek: n } : null;
  }, [currentYear, currentWeekBySeason]);
  function rebuildFromStore() {
    const store = readStore();
    const leaguesArr = Object.values(store.leaguesById || {});
    const allRows = leaguesArr.flatMap((L) => {
      const mergeKey = L?.leagueId ?? L?.leagueKey ?? "";
      return normalizeAndApplyMergeMap(L?.rows || [], mergeKey);
    });
    const built = buildFromRows(allRows);
    setDerivedAll(built);

    // Prefer what the store says (it’s updated by upsertLeague on import / switch)
    let nextLeagueId = store.lastSelectedLeagueId || selectedLeagueId;
    // If that ID isn’t present (e.g., got deleted), fall back safely
    if (nextLeagueId && !store.leaguesById[nextLeagueId]) {
      const ids = Object.keys(store.leaguesById);
      nextLeagueId = ids[0] || "";
    }
    if (!nextLeagueId) {
      const ids = Object.keys(store.leaguesById);
      if (ids.length) nextLeagueId = ids[0];
    }
    setSelectedLeagueId(nextLeagueId || "");

    if (nextLeagueId) {
      const rec = store.leaguesById[nextLeagueId];
      const rowsWithMerges = normalizeAndApplyMergeMap(
        rec?.rows || [],
        nextLeagueId ?? rec?.leagueKey
      );
      let key = rec?.leagueKey || "";
      if (!key) {
        const keys = built?.leagues || [];
        key =
          keys.find((k) => {
            const meta = built.byLeague[k]?.meta || {};
            return String(meta.id || "") === String(nextLeagueId);
          }) ||
          keys.find((k) => built.byLeague[k]?.meta?.name === rec?.name) ||
          keys[0] ||
          "";
      }
      setSelectedLeagueKey(key);
      setSelectedLeague(key);
      setRawRows(rowsWithMerges);
      setDraftByYear(rec?.draftByYear || {});
      setAdpSourceByYear(rec?.adpSourceByYear || {});
      setLeagueName(rec?.name || leagueName);
      setLeagueFontFamily(
        rec?.leagueFontFamily || DEFAULT_LEAGUE_FONT_FAMILY
      );
      const iconFromStore =
        rec?.leagueIcon && typeof rec.leagueIcon === "object"
          ? normalizeLeagueIcon(rec.leagueIcon, makeDefaultLeagueIcon())
          : makeDefaultLeagueIcon();
      setLeagueIcon(iconFromStore);
      setMoneyInputs(rec?.moneyInputs || {});
      setActivityBySeason(rec?.activityBySeason || {});
      setRostersByYear(rec?.espnRostersByYear || {});
      setOwnerByTeamByYear(
        rec?.espnOwnerByTeamByYear || rec?.espnOwnerMapByYear || {}
      );
      setOwnerFullByTeamByYear(rec?.espnOwnerFullByTeamByYear || {});
      setTeamNamesByOwner(rec?.espnTeamNamesByOwner || {});
      setLineupSlotsByYear(rec?.espnLineupSlotsByYear || {});
      setRosterAcqByYear(rec?.espnRosterAcqByYear || {});
      setSeasonsByYear(rec?.espnSeasonsByYear || {});
      setPlayoffTeamsBySeason(rec?.espnPlayoffTeamsBySeason || {});
      setPlayoffTeamsOverrides(rec?.playoffTeamsOverrides || {});
      setCurrentWeekBySeason(rec?.espnCurrentWeekBySeason || {});
      setProTeamsByYear(rec?.espnProTeamsByYear || {});
      setManagerNicknames(normalizeNicknameMap(rec?.managerNicknames || {}));
      setInjuriesByYear(rec?.espnInjuriesByYear || {});
      const sched =
        rec?.espnScheduleByYear && Object.keys(rec.espnScheduleByYear).length
          ? rec.espnScheduleByYear
          : buildScheduleFromRows(rowsWithMerges);
      setScheduleByYear(sched);
      setHiddenManagers(new Set(rec?.hiddenManagers || []));
    } else {
      setSelectedLeagueKey("");
      setSelectedLeague("");
      setRawRows([]);
      setDraftByYear({});
      setAdpSourceByYear({});
      setMoneyInputs({});
      setActivityBySeason({});
      setRostersByYear({});
      setOwnerByTeamByYear({});
      setTeamNamesByOwner({});
      setLineupSlotsByYear({});
      setRosterAcqByYear({});
      setSeasonsByYear({});
      setPlayoffTeamsBySeason({});
      setPlayoffTeamsOverrides({});
      setCurrentWeekBySeason({});
      setScheduleByYear({});
      setLeagueIcon(makeDefaultLeagueIcon());
      setManagerNicknames({});
      setLeagueFontFamily(DEFAULT_LEAGUE_FONT_FAMILY);
      setInjuriesByYear({});
    }
  }

  function switchLeagueById(id) {
    const store = readStore();
    if (!store.leaguesById[id]) return;
    store.lastSelectedLeagueId = id;
    writeStore(store);
    const rec = store.leaguesById[id];
    const rowsWithMerges = normalizeAndApplyMergeMap(
      rec?.rows || [],
      id ?? rec?.leagueKey
    );
    setSelectedLeagueId(id);
    setSelectedLeagueKey(rec.leagueKey || "");
    setSelectedLeague(rec.leagueKey || "");
    setRawRows(rowsWithMerges);
    setDraftByYear(rec.draftByYear || {});
    setAdpSourceByYear(rec.adpSourceByYear || {});
    setLeagueName(rec.name || "Your Fantasy League");
    setLeagueFontFamily(rec.leagueFontFamily || DEFAULT_LEAGUE_FONT_FAMILY);
    const iconFromStore =
      rec?.leagueIcon && typeof rec.leagueIcon === "object"
        ? normalizeLeagueIcon(rec.leagueIcon, makeDefaultLeagueIcon())
        : makeDefaultLeagueIcon();
    setLeagueIcon(iconFromStore);
    setMoneyInputs(rec.moneyInputs || {});
    setActivityBySeason(rec.activityBySeason || {});
    setRostersByYear(rec?.espnRostersByYear || {});
    setOwnerByTeamByYear(
      rec?.espnOwnerByTeamByYear || rec?.espnOwnerMapByYear || {}
    );
    setOwnerFullByTeamByYear(rec?.espnOwnerFullByTeamByYear || {});
    setTeamNamesByOwner(rec?.espnTeamNamesByOwner || {});
    setLineupSlotsByYear(rec?.espnLineupSlotsByYear || {});
    setRosterAcqByYear(rec?.espnRosterAcqByYear || {});
    setSeasonsByYear(rec?.espnSeasonsByYear || {});
    setManagerNicknames(normalizeNicknameMap(rec?.managerNicknames || {}));
    setPlayoffTeamsBySeason(rec?.espnPlayoffTeamsBySeason || {});
    setPlayoffTeamsOverrides(rec?.playoffTeamsOverrides || {});
    setProTeamsByYear(rec?.espnProTeamsByYear || {});
    setCurrentWeekBySeason(rec?.espnCurrentWeekBySeason || {});
    setInjuriesByYear(rec?.espnInjuriesByYear || {});
    const sched =
      rec?.espnScheduleByYear && Object.keys(rec.espnScheduleByYear).length
        ? rec.espnScheduleByYear
        : buildScheduleFromRows(rowsWithMerges);
    setScheduleByYear(sched);
    setHiddenManagers(new Set(rec?.hiddenManagers || []));
  }

  const handleDeleteCurrentLeague = (idToDelete) => {
    const targetId = idToDelete || selectedLeagueId;
    if (!targetId) return;
    const ok = window.confirm("Delete this league and all its stored data?");
    if (!ok) return;
    deleteLeagueById(targetId);
    setSelectedLeagueId("");
    setSelectedLeagueKey("");
    setSelectedLeague("");
    setRawRows([]);
    setDraftByYear({});
    setAdpSourceByYear({});
    setMoneyInputs({});
    setActivityBySeason({});
    setRostersByYear({});
    setOwnerByTeamByYear({});
    setLeagueName("Your Fantasy League");
    setLeagueIcon(makeDefaultLeagueIcon());
    setLeagueFontFamily(DEFAULT_LEAGUE_FONT_FAMILY);
    rebuildFromStore();
    setLineupSlotsByYear({});
    setHiddenManagers(new Set());
    setManagerNicknames({});
    try {
      sessionStorage.removeItem("FL_HANDOFF_RAW");
    } catch {}
    try {
      window.name = "";
    } catch {}
  };

  const handleFileParsed = (built, rawRowsIn) => {
    setDerivedAll(built);
    setRawRows(rawRowsIn || []);
    setDraftByYear({});
    const leagues = built.leagues || [];
    if (leagues.length && !selectedLeague) setSelectedLeague(leagues[0]);
    const ln =
      rawRowsIn?.[0]?.["league_name"] ||
      rawRowsIn?.[0]?.["league"] ||
      rawRowsIn?.[0]?.["espn_league"];
    if (ln) setLeagueName(String(ln));
  };

  function handleMoneyInputsChanged(update) {
    setMoneyInputs((prev) => {
      const next =
        typeof update === "function" ? update(prev) ?? {} : update || {};
      const { leagueId, leagueName, platform, scoring } =
        getCurrentLeagueIdentity();
      upsertLeague({
        leagueId,
        leagueKey: selectedLeague,
        name: leagueName,
        platform,
        scoring,
        rows: rawRows,
        draftByYear,
        adpSourceByYear,
        moneyInputs: next,
        activityBySeason,
        espnOwnerByTeamByYear: ownerByTeamByYear,
        espnOwnerFullByTeamByYear: ownerFullByTeamByYear,
        espnTeamNamesByOwner: teamNamesByOwner,
        espnRostersByYear: rostersByYear,
        espnPlayoffTeamsBySeason: playoffTeamsBySeason,
        playoffTeamsOverrides: playoffTeamsOverrides,
        espnCurrentWeekBySeason: currentWeekBySeason,
        espnScheduleByYear: scheduleByYear,
        espnSeasonsByYear: seasonsByYear,
        hiddenManagers: Array.from(hiddenManagers),
        managerNicknames,
        leagueIcon,
        leagueFontFamily,
      });
      return next;
    });
  }

  function handleManagerNicknamesChange(next) {
    const normalized = normalizeNicknameMap(next);
    setManagerNicknames(normalized);
    const { leagueId, leagueName, platform, scoring } =
      getCurrentLeagueIdentity();
    upsertLeague({
      leagueId,
      leagueKey: selectedLeague,
      name: leagueName,
      platform,
      scoring,
      rows: rawRows,
      draftByYear,
      adpSourceByYear,
      moneyInputs,
      activityBySeason,
      espnOwnerByTeamByYear: ownerByTeamByYear,
      espnOwnerFullByTeamByYear: ownerFullByTeamByYear,
      espnTeamNamesByOwner: teamNamesByOwner,
      espnRostersByYear: rostersByYear,
      espnLineupSlotsByYear: lineupSlotsByYear,
      espnRosterAcqByYear: rosterAcqByYear,
      espnPlayoffTeamsBySeason: playoffTeamsBySeason,
      playoffTeamsOverrides: playoffTeamsOverrides,
      espnCurrentWeekBySeason: currentWeekBySeason,
      espnScheduleByYear: scheduleByYear,
      espnSeasonsByYear: seasonsByYear,
      hiddenManagers: Array.from(hiddenManagers),
      managerNicknames: normalized,
      leagueIcon,
      leagueFontFamily,
    });
  }

  const MERGE_KEY = (leagueId) =>
    `fl_merge_map::${String(leagueId || "").trim()}`;
  function loadMergeMap(leagueId) {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage?.getItem(MERGE_KEY(leagueId));
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch {
      return {};
    }
  }
  function saveMergeMap(leagueId, mapObj) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage?.setItem(
        MERGE_KEY(leagueId),
        JSON.stringify(mapObj || {})
      );
    } catch {}
  }
  function canonicalize(name, map) {
    let cur = (name || "").trim();
    if (!cur) return cur;
    const seen = new Set();
    while (map[cur] && !seen.has(cur)) {
      seen.add(cur);
      cur = String(map[cur] || "").trim();
    }
    return cur || name;
  }
  function flattenMergeMap(map) {
    const flat = {};
    Object.keys(map || {}).forEach((alias) => {
      const canon = canonicalize(alias, map);
      if (canon && alias && alias !== canon) flat[alias] = canon;
    });
    return flat;
  }
  function applyMergeMap(rows, map) {
    const keys = Object.keys(map || {});
    if (!rows || !keys.length) return rows || [];
    return rows.map((r) => {
      const mgr = canonicalize(r.manager, map);
      const opp = canonicalize(r.opponent, map);
      return { ...r, manager: mgr, opponent: opp };
    });
  }
  function normalizeAndApplyMergeMap(rows, leagueId) {
    const rawMap = loadMergeMap(leagueId);
    const flatMap = flattenMergeMap(rawMap);
    if (JSON.stringify(rawMap) !== JSON.stringify(flatMap)) {
      saveMergeMap(leagueId, flatMap);
    }
    return applyMergeMap(rows || [], flatMap);
  }
  // ---------------- BOOTSTRAP --------------------
  useEffect(() => {
    window.FL_mergeHelpers = {
      MERGE_KEY,
      loadMergeMap,
      saveMergeMap,
      canonicalize,
      flattenMergeMap,
      applyMergeMap,
    };
    window.FL_applyOwnerMergesNow = (leagueId) => {
      try {
        window.__FL_LAST_MERGE_LEAGUE_ID__ = String(leagueId || "");
        rebuildFromStore();
      } catch (e) {
        console.warn("FL_applyOwnerMergesNow failed:", e);
      }
    };

    // ===========================
    // NEW: hot-path ingest function
    // ===========================
    const bootstrapFromPayload = async (data) => {
      try {
        if (!data || !Object.keys(data).length) {
          console.warn("[FL] bootstrapFromPayload: no data");
          rebuildFromStore();
          return;
        }

        window.__FL_PAYLOAD = data;
        (function normalizePickupsPayload(p) {
          let txByYear = {};
          if (p && p.transactionsSlim && !Array.isArray(p.transactionsSlim)) {
            txByYear = p.transactionsSlim;
          }
          if ((!txByYear || !Object.keys(txByYear).length) && Array.isArray(p?.seasons)) {
            p.seasons.forEach((s) => {
              const y = Number(s?.seasonId);
              if (!y) return;
              if (Array.isArray(s?.transactionsSlim) && s.transactionsSlim.length) {
                txByYear[y] = s.transactionsSlim;
              }
            });
          }
          p.transactionsSlim = txByYear;
          p.transactionsSlimFlat = Object.entries(txByYear).flatMap(
            ([yr, arr]) =>
              (Array.isArray(arr) ? arr : []).map((r) => ({
                ...r,
                seasonId: Number(yr),
              }))
          );
        })(data);

        const seasons = Array.isArray(data.seasons) ? data.seasons : [];
        if (typeof window !== "undefined") {
          window.__espnSeasons = seasons;
        }

        // Sleeper support: turn data.games → rows your pipeline understands
        function _rowsFromSleeperGames(games, leagueNameGuess) {
          const out = [];
          (games || []).forEach((g) => {
            const season = Number(g?.season) || null;
            const week = Number(g?.week) || null;
            const aOwner =
              String(g?.home?.owner || "").trim() ||
              `Owner ${g?.home?.teamId || ""}`;
            const bOwner =
              String(g?.away?.owner || "").trim() ||
              `Owner ${g?.away?.teamId || ""}`;
            const aPts = Number(g?.home?.points || 0) || 0;
            const bPts = Number(g?.away?.points || 0) || 0;
            const isPlayoff = !!g?.playoff;
            const leagueName = String(leagueNameGuess || "").trim();

            out.push({
              season,
              week,
              manager: aOwner,
              opponent: bOwner,
              team_name: g?.home?.teamName || aOwner,
              points_for: aPts,
              points_against: bPts,
              proj_for: null,
              proj_against: null,
              result: aPts > bPts ? "W" : aPts < bPts ? "L" : "T",
              final_rank: "",
              league_name: leagueName,
              platform: "SLEEPER",
              scoring: "Standard",
              is_playoff: isPlayoff,
            });
            out.push({
              season,
              week,
              manager: bOwner,
              opponent: aOwner,
              team_name: g?.away?.teamName || bOwner,
              points_for: bPts,
              points_against: aPts,
              proj_for: null,
              proj_against: null,
              result: bPts > aPts ? "W" : bPts < aPts ? "L" : "T",
              final_rank: "",
              league_name: leagueName,
              platform: "SLEEPER",
              scoring: "Standard",
              is_playoff: isPlayoff,
            });
          });
          return out;
        }

        // Build rows from Sleeper games if present
        const sleeperRows = Array.isArray(data?.games)
          ? _rowsFromSleeperGames(
              data.games,
              data?.meta?.name || data?.leagueName
            )
          : [];

        const seasonsMap = Object.fromEntries(
          seasons.map((s) => [Number(s.seasonId), s])
        );
        console.log("[FL][dbg] payload keys:", Object.keys(data || {}));
        console.log("[FL][dbg] seasonsLen=", seasons.length);
        setSeasonsByYear(seasonsMap);

        const scheduleMap = Object.fromEntries(
          (seasons || []).map((s) => [
            Number(s?.seasonId),
            Array.isArray(s?.schedule) ? s.schedule : [],
          ])
        );
        setScheduleByYear(scheduleMap);

        const currentWeekBySeasonMap =
          data?.currentWeekByYear && Object.keys(data.currentWeekByYear).length
            ? data.currentWeekByYear
            : {};
        setCurrentWeekBySeason(currentWeekBySeasonMap);

        // ← NEW: capture pro team byes map supplied by popup
        const proTeamsPayload =
          data?.proTeamsByYear || data?.espnProTeamsByYear || {};
        setProTeamsByYear(proTeamsPayload);

        // NEW: injuries payload (supports several possible keys from popup)
        const injuriesPayload =
          data?.injuriesByYear ||
          data?.injuryByYear ||
          data?.injuryWeeksByYear ||
          {};
        setInjuriesByYear(injuriesPayload);

        const playoffTeamsFromSeasons = {};
        for (const s of seasons || []) {
          const yr = Number(s?.seasonId);
          if (!yr) continue;
          const cnt =
            Number(
              s?.settings?.playoffTeamCount ??
                s?.settings?.scheduleSettings?.playoffTeamCount ??
                s?.playoffTeamCount ??
                0
            ) || 0;
          playoffTeamsFromSeasons[yr] = cnt;
        }
        setPlayoffTeamsBySeason(playoffTeamsFromSeasons);

        const playoffTeamsBySeasonMap = extractPlayoffTeamsBySeason(seasons);
        setPlayoffTeamsBySeason(playoffTeamsBySeasonMap);

        const legacy = Array.isArray(data.legacyRows) ? data.legacyRows : [];
        const legacyLite = Array.isArray(data.legacySeasonsLite)
          ? data.legacySeasonsLite
          : [];
        console.log(
          "[FL][dbg] legacyRowsLen=",
          legacy.length,
          " legacyLiteLen=",
          legacyLite.length
        );

        if (!seasons.length && !legacy.length && !sleeperRows.length) {
          rebuildFromStore();
          try {
            window.name = "";
          } catch {}
          return;
        }

        const light = buildRowsLight(seasons);

        // 👇 include Sleeper rows that were built earlier in bootstrapFromPayload
        const combinedRows = [...light.rows, ...light.txRows, ...sleeperRows];
        console.log(
          "[FL][dbg] lightRowsLen=",
          (light.rows || []).length,
          " lightTxLen=",
          (light.txRows || []).length,
          " sleeperRowsLen=",
          (sleeperRows || []).length,
          " combinedRowsLen=",
          combinedRows.length
        );

        let draftMinimal = buildDraftRich(seasons);
        draftMinimal = attachAdpFromPopup(draftMinimal, data.adpByYear || null);
        draftMinimal = overlayMissingAdpByNameOnly(draftMinimal);
        draftMinimal = attachPosFromPopup(
          draftMinimal,
          data.adpPosByYear || data.adpRichByYear || null
        );
        draftMinimal = overlayMissingPosByNameOnly(draftMinimal);
        draftMinimal = attachPickPosFromDraftOrder(draftMinimal);
        draftMinimal = attachFinishPosFromLocal(draftMinimal, "PPR");
        setDraftByYear(draftMinimal);

        function buildActivityFromSeasons(seasonsArr = []) {
          const out = {};
          seasonsArr.forEach((s) => {
            const year = Number(s?.seasonId);
            if (!year) return;
            const members = new Map();
            (s?.members || []).forEach((m) => {
              const dn = m?.displayName || "";
              const fn = m?.firstName || "";
              const ln = m?.lastName || "";
              const best = dn || `${fn} ${ln}`.trim() || "Unknown";
              if (m?.id != null) members.set(m.id, best);
            });
            const ownerByTeam = new Map();
            (s?.teams || []).forEach((t) => {
              const ownerId =
                t?.primaryOwner || (t?.owners && t.owners[0]) || null;
              if (t?.id != null)
                ownerByTeam.set(t.id, members.get(ownerId) || "Unknown");
            });
            const yearMap = (out[year] = out[year] || {});
            (s?.teams || []).forEach((t) => {
              const owner = ownerByTeam.get(t?.id) || "Unknown";
              const tc = t?.transactionCounter || {};
              const row = yearMap[owner] || {
                acquisitions: 0,
                drops: 0,
                trades: 0,
                moveToActive: 0,
                ir: 0,
              };
              row.acquisitions += Number(tc.acquisitions || 0);
              row.drops += Number(tc.drops || 0);
              row.trades += Number(tc.trades || 0);
              row.moveToActive += Number(tc.moveToActive || 0);
              row.ir += Number(tc.moveToIR || 0);
              yearMap[owner] = row;
            });
          });
          return out;
        }
        const activityNewRaw = buildActivityFromSeasons(seasons);

        function buildLegacyActivityFromLite(legacyLiteArr) {
          const out = {};
          for (const s of legacyLiteArr || []) {
            const year = Number(s?.seasonId);
            if (!year) continue;

            const idToName = {};
            (s?.members || []).forEach((m) => {
              const nm =
                (m?.displayName || "").trim() ||
                [m?.firstName || "", m?.lastName || ""].join(" ").trim();
              if (m?.id && nm) idToName[m.id] = nm;
            });

            (s?.teams || []).forEach((t) => {
              const owner =
                idToName[t?.primaryOwner] ||
                idToName[(t?.owners || [])[0]] ||
                "Unknown";
              const tc = t?.transactionCounter || {};
              out[year] = out[year] || {};
              const prev = out[year][owner] || {
                acquisitions: 0,
                drops: 0,
                trades: 0,
                moveToActive: 0,
                ir: 0,
              };
              out[year][owner] = {
                acquisitions: prev.acquisitions + (tc.acquisitions || 0),
                drops: prev.drops + (tc.drops || 0),
                trades: prev.trades + (tc.trades || 0),
                moveToActive: prev.moveToActive + (tc.moveToActive || 0),
                ir: prev.ir + (tc.moveToIR || 0),
              };
            });
          }
          return out;
        }
        const activityLegacyBySeason =
          data.activityLegacyBySeason ||
          buildLegacyActivityFromLite(legacyLite);

        const activityPreMerge = {};
        const addYear = (yr, map) => {
          const y = Number(yr);
          activityPreMerge[y] = activityPreMerge[y] || {};
          Object.entries(map || {}).forEach(([owner, st]) => {
            const prev = activityPreMerge[y][owner] || {
              acquisitions: 0,
              drops: 0,
              trades: 0,
              moveToActive: 0,
              ir: 0,
            };
            activityPreMerge[y][owner] = {
              acquisitions: prev.acquisitions + (st?.acquisitions || 0),
              drops: prev.drops + (st?.drops || 0),
              trades: prev.trades + (st?.trades || 0),
              moveToActive: prev.moveToActive + (st?.moveToActive || 0),
              ir: prev.ir + (st?.ir || 0),
            };
          });
        };
        Object.entries(activityNewRaw || {}).forEach(([yr, m]) =>
          addYear(yr, m)
        );
        Object.entries(activityLegacyBySeason || {}).forEach(([yr, m]) =>
          addYear(yr, m)
        );
        setActivityBySeason(activityPreMerge);

        // 👇 schedule fallback: if seasonal schedules were empty earlier, derive from the rows we have
        if (!Object.keys(scheduleByYear || {}).length) {
          const fallback = buildScheduleFromRows([...combinedRows]);
          setScheduleByYear(fallback);
        }

        const legacyNorm = coerceLegacyRows(legacy, {
          seasons,
          leagueId: data.leagueId,
          leagueName: data.leagueName,
        });
        const combinedPlusLegacy = preferRealMemberNames(
          [...combinedRows, ...legacyNorm],
          seasons
        );

        const provisional = buildFromRows(combinedPlusLegacy);
        const candidateName = (
          data.leagueName ||
          light.leagueNameGuess ||
          ""
        ).trim();
        const keys0 = provisional.leagues || [];
        const meta0 = keys0.length
          ? provisional.byLeague[keys0[0]]?.meta || {}
          : {};
        const storeBeforeImport = readStore();
        const idCandidate = String(
          data.leagueId ||
            meta0.id ||
            meta0.leagueId ||
            meta0.espnLeagueId ||
            ""
        ).trim();
        const nameCandidate =
          candidateName ||
          meta0.name ||
          (idCandidate ? `League ${idCandidate}` : "");
        const resolvedLeagueId = ensureUniqueLeagueId(
          idCandidate,
          nameCandidate,
          storeBeforeImport
        );
        const resolvedLeagueName =
          nameCandidate || `League ${resolvedLeagueId}`;
        setSelectedLeagueId(resolvedLeagueId);
        const savedForLeague =
          storeBeforeImport.leaguesById?.[resolvedLeagueId]?.moneyInputs || {};
        if (
          savedForLeague &&
          Object.keys(savedForLeague).length > 0 &&
          JSON.stringify(savedForLeague) !== JSON.stringify(moneyInputs)
        ) {
          setMoneyInputs(savedForLeague);
        }

        const rowsLocked = lockLeagueIdentity(
          combinedPlusLegacy,
          resolvedLeagueId,
          resolvedLeagueName
        );
        const rawMergeMap = loadMergeMap(resolvedLeagueId);
        const flatMergeMap = flattenMergeMap(rawMergeMap);
        if (JSON.stringify(rawMergeMap) !== JSON.stringify(flatMergeMap)) {
          saveMergeMap(resolvedLeagueId, flatMergeMap);
        }
        const rowsAfterMerges = (function apply() {
          const keys = Object.keys(flatMergeMap || {});
          if (!keys.length) return rowsLocked;
          return rowsLocked.map((r) => {
            const mgr = canonicalize(r.manager, flatMergeMap);
            const opp = canonicalize(r.opponent, flatMergeMap);
            return { ...r, manager: mgr, opponent: opp };
          });
        })();
        let rowsFinal = rowsAfterMerges;
        (() => {
          const key = (r) =>
            `${r.season}|${r.week}|${String(
              r.team_name || ""
            ).trim()}|${Math.round(Number(r.points_for) || 0)}|${Math.round(
              Number(r.points_against) || 0
            )}`;
          const playoffMap = new Map(
            (light.rows || []).map((r) => [key(r), r.is_playoff === true])
          );
          rowsFinal = (rowsAfterMerges || []).map((r) =>
            r.is_playoff === true || r.is_playoff === false
              ? r
              : { ...r, is_playoff: !!playoffMap.get(key(r)) }
          );
        })();
        const built = buildFromRows(rowsFinal);
        setDerivedAll(built);
        const keys = built.leagues || [];
        const selectedKey =
          keys.find(
            (k) =>
              (built.byLeague[k]?.meta?.name || "").trim() ===
              resolvedLeagueName
          ) ||
          keys.find(
            (k) =>
              String(built.byLeague[k]?.meta?.id || "").trim() ===
              resolvedLeagueId
          ) ||
          keys[0] ||
          "";
        if (selectedKey) setSelectedLeague(selectedKey);
        console.log(
          "[FL][dbg] built.leagues=",
          keys,
          " selectedKey=",
          selectedKey
        );
        console.log(
          "[FL][dbg] meta for selected:",
          built.byLeague?.[selectedKey]?.meta
        );

        const adpSrc = {};
        Object.entries(draftMinimal || {}).forEach(([yr, arr]) => {
          adpSrc[yr] = (arr || []).some((r) => r?.adp != null)
            ? "FantasyPros (from extension)"
            : "—";
        });
        const ownerMap =
          data.ownerByTeamByYear && Object.keys(data.ownerByTeamByYear).length
            ? data.ownerByTeamByYear
            : (() => {
                const tmp = {};
                for (const s of seasons || []) {
                  const yr = Number(s?.seasonId);
                  if (!yr) continue;
                  const memberName = {};
                  (s?.members || []).forEach((m) => {
                    const fn = (m?.firstName || "").trim();
                    const ln = (m?.lastName || "").trim();
                    const full = [fn, ln].filter(Boolean).join(" ").trim();
                    const dn = (m?.displayName || "").trim();
                    const preferred = full || dn || "Unknown";
                    if (m?.id != null) memberName[m.id] = preferred;
                  });
                  const inner = {};
                  (s?.teams || []).forEach((t) => {
                    const ownerId =
                      t?.primaryOwner || (t?.owners && t.owners[0]) || null;
                    if (t?.id != null)
                      inner[t.id] =
                        (ownerId && memberName[ownerId]) || "Unknown";
                  });
                  tmp[yr] = inner;
                }
                return tmp;
              })();
        const teamNamesFromData = data.teamNamesByOwner || {};
        const ownerFullByTeamByYear = (() => {
          const out = {};
          for (const s of seasons || []) {
            const yr = Number(s?.seasonId);
            if (!yr) continue;
            const fullByMember = {};
            (s?.members || []).forEach((m) => {
              const fn = (m?.firstName || "").trim();
              const ln = (m?.lastName || "").trim();
              const full = [fn, ln].filter(Boolean).join(" ").trim();
              const dn = (m?.displayName || "").trim();
              if (m?.id != null) fullByMember[m.id] = full || dn || "Unknown";
            });
            const inner = {};
            (s?.teams || []).forEach((t) => {
              const ownerId =
                t?.primaryOwner ||
                (Array.isArray(t?.owners) && t.owners[0]) ||
                null;
              const tid = Number(t?.id);
              if (!Number.isFinite(tid)) return;
              inner[tid] = ownerId ? fullByMember[ownerId] : "Unknown";
            });
            out[yr] = inner;
          }
          return out;
        })();
        const rosterMap =
          data.rostersByYear && Object.keys(data.rostersByYear).length
            ? data.rostersByYear
            : buildRostersByYear(seasons);
        const lineupSlots = data.lineupSlotsByYear || {};
        const rosterAcq = data.rosterAcqByYear || {};
        const existingMoney =
          readStore().leaguesById?.[resolvedLeagueId]?.moneyInputs || {};
        const mergedMoney = { ...existingMoney, ...(moneyInputs || {}) };
        console.log("[FL][dbg] upsertLeague →", {
          id: resolvedLeagueId,
          name: resolvedLeagueName,
          rowsFinalLen: rowsFinal.length,
          seasonsLen: seasons.length,
        });

        // 👇 platform + schedule resolution (Sleeper-friendly)
        const platformResolved =
          (data?.provider && String(data.provider).toUpperCase()) ||
          built.byLeague[selectedKey]?.meta?.platform ||
          (rowsFinal?.[0]?.platform || "").toUpperCase() ||
          "ESPN";

        const scheduleForSave =
          scheduleByYear && Object.keys(scheduleByYear).length
            ? scheduleByYear
            : buildScheduleFromRows(rowsFinal);

        upsertLeague({
          leagueId: resolvedLeagueId,
          leagueKey: selectedKey,
          name: resolvedLeagueName,
          platform: platformResolved,
          scoring: built.byLeague[selectedKey]?.meta?.scoring || "Standard",
          rows: rowsFinal,
          draftByYear: draftMinimal,
          adpSourceByYear: adpSrc,
          moneyInputs: mergedMoney,
          activityBySeason: activityPreMerge,
          espnTransactionsByYear: data.transactionsSlim || {},
          espnOwnerByTeamByYear: ownerMap,
          espnTeamNamesByOwner: teamNamesFromData,
          espnOwnerFullByTeamByYear: ownerFullByTeamByYear,
          espnRostersByYear: rosterMap,
          espnLineupSlotsByYear: lineupSlots,
          espnRosterAcqByYear: rosterAcq,
          espnPlayoffTeamsBySeason: playoffTeamsFromSeasons,
          espnCurrentWeekBySeason: currentWeekBySeasonMap,
          espnScheduleByYear: scheduleForSave,
          espnSeasonsByYear: seasonsMap,
          managerNicknames,
          leagueIcon,
          leagueFontFamily,
          espnTradesDetailedBySeason: data.espnTradesDetailedBySeason || {},
          espnProTeamsByYear: proTeamsPayload,
          espnInjuriesByYear: injuriesPayload,
        });

        setTimeout(() => {
          const s = readStore();
          const backend =
            typeof window.__FL_VOLATILE_STORE__ === "object"
              ? "memory"
              : sessionStorage.getItem(LS_KEY)
              ? "sessionStorage"
              : "localStorage";
          console.log("[FL][dbg] store after upsert", {
            backend,
            ids: Object.keys(s.leaguesById || {}),
            last: s.lastSelectedLeagueId,
            rec: s.leaguesById?.[resolvedLeagueId]
              ? {
                  name: s.leaguesById[resolvedLeagueId].name,
                  rows: (s.leaguesById[resolvedLeagueId].rows || []).length,
                }
              : null,
          });
        }, 0);

        setOwnerByTeamByYear(ownerMap);
        setTeamNamesByOwner(teamNamesFromData);
        setRostersByYear(rosterMap);
        setLineupSlotsByYear(lineupSlots);
        setRosterAcqByYear(rosterAcq);
        console.debug("Loaded from popup:", {
          lineupSlotsByYear: Object.keys(lineupSlots || {}).length,
          rosterAcqByYear: Object.keys(rosterAcq || {}).length,
          rostersByYear: Object.keys(rosterMap || {}).length,
        });

        try {
          sessionStorage.removeItem("FL_HANDOFF_RAW");
        } catch {}
        try {
          window.name = "";
        } catch {}

        rebuildFromStore();
      } catch (e) {
        console.warn(
          "bootstrapFromPayload failed; falling back to stored leagues:",
          e
        );
        rebuildFromStore();
      }
    };

    // expose live handler so the popup can add leagues without reloading
    if (typeof window !== "undefined") {
      window.FL_HANDLE_EXTENSION_PAYLOAD = (p) => {
        window.__FL_HANDOFF = p;
        bootstrapFromPayload(p).catch((err) => {
          console.warn("[FL] FL_HANDLE_EXTENSION_PAYLOAD bootstrap failed:", err);
        });
      };
    }

    // cold boot path (unchanged: read from handoff channels once)
    (async () => {
      try {
        const data =
          window.__FL_HANDOFF ||
          (() => {
            try {
              const ss = sessionStorage.getItem("FL_HANDOFF_RAW");
              return ss ? JSON.parse(ss) : null;
            } catch {
              return null;
            }
          })() ||
          (() => {
            try {
              return JSON.parse(window.name || "{}");
            } catch {
              return null;
            }
          })();

        if (!data || !Object.keys(data).length) {
          console.warn(
            "[FL] No payload detected in __FL_HANDOFF / sessionStorage / window.name"
          );
          rebuildFromStore();
          return;
        }

        await bootstrapFromPayload(data);
      } catch (e) {
        console.warn("Bootstrap failed; falling back to stored leagues:", e);
        rebuildFromStore();
      }
    })();
  }, []);

  const league =
    selectedLeague && derivedAll?.byLeague?.[selectedLeague]
      ? derivedAll.byLeague[selectedLeague]
      : null;
  const leagueWithHidden = React.useMemo(() => {
    if (!league) return null;
    const normalizedNicknames = normalizeNicknameMap(managerNicknames);
    const mergedOwnerMap =
      league.ownerByTeamByYear && Object.keys(league.ownerByTeamByYear).length
        ? league.ownerByTeamByYear
        : ownerByTeamByYear;
    const mergedOwnerFullMap =
      league.espnOwnerFullByTeamByYear &&
      Object.keys(league.espnOwnerFullByTeamByYear).length
        ? league.espnOwnerFullByTeamByYear
        : ownerFullByTeamByYear;
    const mergedTeamNames =
      league.teamNamesByOwner && Object.keys(league.teamNamesByOwner).length
        ? league.teamNamesByOwner
        : teamNamesByOwner;
    const mergedSchedule =
      league.espnScheduleByYear && Object.keys(league.espnScheduleByYear).length
        ? league.espnScheduleByYear
        : scheduleByYear;
    const mergedSeasons =
      league.seasonsByYear && Object.keys(league.seasonsByYear).length
        ? league.seasonsByYear
        : seasonsByYear;
    const mergedProTeams =
      league.proTeamsByYear && Object.keys(league.proTeamsByYear).length
        ? league.proTeamsByYear
        : proTeamsByYear;
    const mergedCurrentWeeks =
      league.currentWeekByYear && Object.keys(league.currentWeekByYear).length
        ? league.currentWeekByYear
        : currentWeekBySeason;

    const mergedInjuries =
      league.espnInjuriesByYear && Object.keys(league.espnInjuriesByYear).length
        ? league.espnInjuriesByYear
        : injuriesByYear;

    return {
      ...league,
      hiddenManagers: Array.from(hiddenManagers),
      managerNicknames: normalizedNicknames,
      ownerByTeamByYear: mergedOwnerMap,
      ownersByTeamByYear: league.ownersByTeamByYear || mergedOwnerMap,
      espnOwnerByTeamByYear: league.espnOwnerByTeamByYear || mergedOwnerMap,
      espnOwnerFullByTeamByYear: mergedOwnerFullMap,
      teamNamesByOwner: mergedTeamNames,
      espnTeamNamesByOwner: league.espnTeamNamesByOwner || mergedTeamNames,
      rostersByYear: league.rostersByYear || rostersByYear,
      espnRostersByYear: league.espnRostersByYear || rostersByYear,
      scheduleByYear: league.scheduleByYear || mergedSchedule,
      espnScheduleByYear: mergedSchedule,
      seasonsByYear: mergedSeasons,
      espnSeasonsByYear: league.espnSeasonsByYear || mergedSeasons,
      proTeamsByYear: mergedProTeams,
      espnProTeamsByYear: league.espnProTeamsByYear || mergedProTeams,
      currentWeekByYear: mergedCurrentWeeks,
      currentWeekBySeason: league.currentWeekBySeason || mergedCurrentWeeks,
      espnCurrentWeekBySeason:
        league.espnCurrentWeekBySeason || mergedCurrentWeeks,
      espnInjuriesByYear: mergedInjuries,
    };
  }, [
    league,
    hiddenManagers,
    managerNicknames,
    ownerByTeamByYear,
    ownerFullByTeamByYear,
    teamNamesByOwner,
    scheduleByYear,
    seasonsByYear,
    proTeamsByYear,
    rostersByYear,
    currentWeekBySeason,
    injuriesByYear,
  ]);

  const currentWeekResolved = React.useMemo(() => {
    const wk = currentWeekBySeason?.[currentYear];
    const n = Number(wk);
    return Number.isFinite(n) ? n : null;
  }, [currentYear, currentWeekBySeason]);
  const leagueForWeekly = React.useMemo(() => {
    if (!leagueWithHidden || currentWeekResolved == null)
      return leagueWithHidden;
    const meta = leagueWithHidden.meta || {};
    return {
      ...leagueWithHidden,
      meta: {
        ...meta,
        currentWeek: currentWeekResolved,
        status: {
          ...(meta.status || {}),
          currentMatchupPeriod: currentWeekResolved,
        },
      },
    };
  }, [leagueWithHidden, currentWeekResolved]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__sources = {
        league,
        selectedLeague,
        ownerByTeamByYear,
        currentWeekBySeason,
        rostersByYear,
        lineupSlotsByYear,
        rosterAcqByYear,
        seasonsByYear,
        scheduleByYear,
        proTeamsByYear,
      };
      window.__FL_SOURCES = {
        seasonsByYear,
        currentWeekBySeason,
        scheduleByYear,
      };
      console.debug("FL sources ready", window.__sources);
    }
  }, [
    league,
    selectedLeague,
    ownerByTeamByYear,
    currentWeekBySeason,
    rostersByYear,
    lineupSlotsByYear,
    rosterAcqByYear,
    seasonsByYear,
    scheduleByYear,
    proTeamsByYear,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let cancelled = false;

    (async () => {
      let activeId = null;
      let stamp = null;
      try {
        const fromWindow =
          (typeof window !== "undefined" && window.__FL_STORE_v1) || null;
        let store =
          (fromWindow && typeof fromWindow === "object" ? fromWindow : null) ||
          null;

        if (!store) {
          try {
            const rawLocal = window.localStorage?.getItem(LS_KEY) || "";
            if (rawLocal) store = JSON.parse(rawLocal);
          } catch (err) {
            console.warn("[FL][supabase] failed to parse local store:", err);
          }
        }

        if (!store) {
          try {
            const rawSession = window.sessionStorage?.getItem(LS_KEY) || "";
            if (rawSession) store = JSON.parse(rawSession);
          } catch (err) {
            console.warn("[FL][supabase] failed to parse session store:", err);
          }
        }

        if (!store && typeof window !== "undefined") {
          const volatile = window.__FL_VOLATILE_STORE__;
          if (volatile && typeof volatile === "object") {
            store = volatile;
          }
        }

        if (!store || typeof store !== "object") {
          store = readStore();
        }

        activeId = store?.lastSelectedLeagueId;
        const leagueToSave = store?.leaguesById?.[activeId];
        if (!leagueToSave) return;

        stamp = `${activeId || ""}::${
          leagueToSave.lastUpdated ||
          leagueToSave.updated_at ||
          leagueToSave.updatedAt ||
          0
        }`;
        const prev = lastSupabaseAutoSaveRef.current || {};
        if (prev.key === activeId && prev.stamp === stamp) {
          if (prev.pending) return;
          if (prev.error === false) return;
        }

        lastSupabaseAutoSaveRef.current = {
          key: activeId,
          stamp,
          pending: true,
        };

        if (typeof window.__saveFullLeagueToSupabase === "function") {
          await window.__saveFullLeagueToSupabase({
            leagueKey:
              leagueToSave.leagueKey ||
              leagueToSave.leagueId ||
              activeId ||
              leagueToSave.id,
            leagueName:
              leagueToSave.name ||
              leagueToSave.leagueName ||
              "Unknown League",
            platform: leagueToSave.platform || "ESPN",
            ...leagueToSave,
          });
          if (!cancelled) {
            console.log("[FL][supabase] auto-saved active league");
          }
          lastSupabaseAutoSaveRef.current = {
            key: activeId,
            stamp,
            pending: false,
            error: false,
          };
        } else {
          lastSupabaseAutoSaveRef.current = {
            key: activeId,
            stamp,
            pending: false,
            error: true,
          };
          console.warn("[FL][supabase] helper not found on window");
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[FL][supabase] auto-save failed (non-blocking):", err);
        }
        if (activeId) {
          lastSupabaseAutoSaveRef.current = {
            key: activeId,
            stamp,
            pending: false,
            error: true,
          };
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedLeagueId, rawRows]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.FL_debugRoster = (year, teamId, week) => {
        const y = Number(year) || Number(Object.keys(rostersByYear || {})[0]);
        const t =
          Number(teamId) || Number(Object.keys(rostersByYear?.[y] || {})[0]);
        const w =
          Number(week) || Number(Object.keys(rostersByYear?.[y]?.[t] || {})[0]);

        const entries = rostersByYear?.[y]?.[t]?.[w] || [];
        const acqMap = rosterAcqByYear?.[y]?.[t] || {};

        console.group(`[FL_debugRoster] y=${y} t=${t} w=${w}`);
        console.table(
          entries.map((e) => {
            const pid = e?.pid ?? e?.playerId ?? e?.player?.id;
            return {
              name: e?.name,
              pid,
              slotId: e?.lineupSlotId ?? e?.slotId ?? e?.slot,
              defaultPositionId:
                e?.defaultPositionId ?? e?.player?.defaultPositionId,
              eligibleSlots: JSON.stringify(
                e?.eligibleSlots ?? e?.player?.eligibleSlots ?? null
              ),
              pts:
                e?.appliedTotal ?? e?.playerPoints?.appliedTotal ?? e?.pts ?? 0,
              proj: e?.proj ?? 0,
            };
          })
        );

        console.log("acqMap (for team/year):", acqMap);
        console.groupEnd();

        return { entries, acqMap };
      };
    }
  }, [rostersByYear, rosterAcqByYear]);

  // Prime centralized owner-name maps for the whole app (auto-build displayName -> First Last)
  useEffect(() => {
    if (!derivedAll || !selectedLeague) return;

    const leagueObj = derivedAll.byLeague?.[selectedLeague];
    if (!leagueObj) return;

    // Auto-build alias overrides from ESPN members: displayName/nickname/username => "First Last"
    // Auto-build alias overrides from ESPN members: displayName/nickname/username => "First Last"
    const manualAliases = {};
    Object.values(seasonsByYear || {}).forEach((s) => {
      (s?.members || []).forEach((m) => {
        const disp = (m?.displayName || "").trim();
        const full = [m?.firstName || "", m?.lastName || ""].join(" ").trim();
        if (disp && full && full !== disp) manualAliases[disp] = full;
        if (m?.username && full && m.username !== full)
          manualAliases[m.username] = full;
        if (m?.userName && full && m.userName !== full)
          manualAliases[m.userName] = full;
        if (m?.nickname && full && m.nickname !== full)
          manualAliases[m.nickname] = full;
      });
    });

    // Fallback for Sleeper (no seasons/members): seed identity aliases from latest owner map
    if (
      !Object.keys(manualAliases).length &&
      ownerByTeamByYear &&
      Object.keys(ownerByTeamByYear).length
    ) {
      const years = Object.keys(ownerByTeamByYear)
        .map(Number)
        .filter(Number.isFinite);
      const latest = years.length ? Math.max(...years) : null;
      const byTeam = latest ? ownerByTeamByYear[latest] : {};
      Object.values(byTeam || {}).forEach((name) => {
        const n = String(name || "").trim();
        if (n && !manualAliases[n]) manualAliases[n] = n;
      });
    }

    // Flatten seasonsByYear (object → array) if needed
    const espnSeasons = Array.isArray(seasonsByYear)
      ? seasonsByYear
      : Object.values(seasonsByYear || {});

    primeOwnerMaps({
      league: {
        owners: leagueObj.owners || [],
        meta: leagueObj.meta || {},
        teamNamesByOwner,
        ownerByTeamByYear,
      },
      espnOwnerByTeamByYear: ownerByTeamByYear,
      manualAliases: manualAliases || {}, // or {} if you want no overrides
      espnSeasons: Array.isArray(seasonsByYear)
        ? seasonsByYear
        : Object.values(seasonsByYear || {}),
    });

    // 🔎 USE THE OWNERMAP to log
    if (typeof window !== "undefined" && window.__ownerMaps) {
      const sampleSeason = 2018; // or whichever you want
      const m = window.__ownerMaps.mapFor(sampleSeason);
      console.debug("Owner map sources ready", m);
      // For a single team:
      console.debug({
        teamId: 2,
        name: window.__ownerMaps.name(sampleSeason, 2),
        handle: window.__ownerMaps.handle?.(sampleSeason, 2),
        ownerId: window.__ownerMaps.id(sampleSeason, 2),
      });
    }
  }, [
    derivedAll,
    selectedLeague,
    ownerByTeamByYear,
    teamNamesByOwner,
    seasonsByYear,
  ]);

  const storeSnapshot = readStore();
  const leagueOptions = Object.values(storeSnapshot.leaguesById).map((L) => ({
    id: L.leagueId,
    name: L.name || `League ${L.leagueId}`,
  }));

  React.useEffect(() => {
    if (!leagueOptions.length && leagueMenuOpen) {
      setLeagueMenuOpen(false);
    }
  }, [leagueOptions.length, leagueMenuOpen]);

  function getCurrentLeagueIdentity() {
    const meta = derivedAll?.byLeague?.[selectedLeague]?.meta || {};

    // Always prefer the currently-selected persisted ID (already platform-prefixed)
    const persistedId =
      (selectedLeagueId && String(selectedLeagueId).trim()) || "";

    const fallbackId =
      String(
        meta.id ??
          meta.leagueId ??
          meta.espnLeagueId ??
          meta.name ??
          selectedLeague ??
          ""
      )
        .trim()
        .replace(/\s+/g, "_") || `league_${Date.now()}`;

    const leagueId = persistedId || fallbackId;

    const leagueName = meta.name || "Your Fantasy League";
    const firstRowPlatform = (rawRows?.[0]?.platform || "").toUpperCase();
    const platform = meta.platform || firstRowPlatform || "ESPN";
    const scoring = meta.scoring || "Standard";
    return { leagueId, leagueName, platform, scoring, meta };
  }

  function normalizeLeagueIcon(nextIcon, prevIcon) {
    const fallbackPreset =
      (prevIcon?.type === "preset" && prevIcon?.value) ||
      prevIcon?.previousPreset ||
      DEFAULT_LEAGUE_ICON_GLYPH;
    if (!nextIcon || typeof nextIcon !== "object") {
      return { type: "preset", value: fallbackPreset };
    }
    if (
      nextIcon.type === "upload" &&
      typeof nextIcon.value === "string" &&
      nextIcon.value
    ) {
      const previousPreset =
        nextIcon.previousPreset ||
        (prevIcon?.type === "preset"
          ? prevIcon.value
          : prevIcon?.previousPreset) ||
        DEFAULT_LEAGUE_ICON_GLYPH;
      return {
        type: "upload",
        value: nextIcon.value,
        name: nextIcon.name || "",
        previousPreset,
      };
    }
    if (
      nextIcon.type === "preset" &&
      typeof nextIcon.value === "string" &&
      nextIcon.value
    ) {
      return { type: "preset", value: nextIcon.value };
    }
    return { type: "preset", value: fallbackPreset };
  }

  function savePlayoffOverrides(nextOverrides) {
    const safe = nextOverrides || {};
    setPlayoffTeamsOverrides(safe);
    const { leagueId, leagueName, platform, scoring } =
      getCurrentLeagueIdentity();
    upsertLeague({
      leagueId,
      leagueKey: selectedLeague,
      name: leagueName,
      platform,
      scoring,
      rows: rawRows,
      draftByYear,
      adpSourceByYear,
      moneyInputs,
      activityBySeason,
      espnOwnerByTeamByYear: ownerByTeamByYear,
      espnOwnerFullByTeamByYear: ownerFullByTeamByYear,
      espnTeamNamesByOwner: teamNamesByOwner,
      espnRostersByYear: rostersByYear,
      espnLineupSlotsByYear: lineupSlotsByYear,
      espnRosterAcqByYear: rosterAcqByYear,
      espnPlayoffTeamsBySeason: playoffTeamsBySeason,
      playoffTeamsOverrides: safe,
      espnCurrentWeekBySeason: currentWeekBySeason,
      espnScheduleByYear: scheduleByYear,
      espnSeasonsByYear: seasonsByYear,
      hiddenManagers: Array.from(hiddenManagers),
      managerNicknames,
      leagueIcon,
      leagueFontFamily,
    });
  }

  function handleLegacyCsvMerged(legacyRows) {
    const all = [...(rawRows || []), ...(legacyRows || [])];
    const built = buildFromRows(all);
    setDerivedAll(built);
    setRawRows(all);

    const { leagueId, leagueName, platform, scoring } =
      getCurrentLeagueIdentity();
    upsertLeague({
      leagueId,
      leagueKey: selectedLeague,
      name: leagueName,
      platform,
      scoring,
      rows: all,
      draftByYear,
      adpSourceByYear,
      moneyInputs,
      activityBySeason,
      espnOwnerByTeamByYear: ownerByTeamByYear,
      espnTeamNamesByOwner: teamNamesByOwner,
      espnRostersByYear: rostersByYear,
      espnPlayoffTeamsBySeason: playoffTeamsBySeason,
      playoffTeamsOverrides: playoffTeamsOverrides,
      espnCurrentWeekBySeason: currentWeekBySeason,
      espnScheduleByYear: scheduleByYear,
      espnSeasonsByYear: seasonsByYear,
      hiddenManagers: Array.from(hiddenManagers),
      managerNicknames,
      leagueIcon,
      leagueFontFamily,
    });
  }

  function handleLeagueFontFamilyChange(nextFontFamily) {
    const trimmed =
      typeof nextFontFamily === "string" ? nextFontFamily.trim() : "";
    const resolved = trimmed || DEFAULT_LEAGUE_FONT_FAMILY;
    setLeagueFontFamily(resolved);
    const { leagueId, leagueName, platform, scoring } =
      getCurrentLeagueIdentity();
    upsertLeague({
      leagueId,
      leagueKey: selectedLeague,
      name: leagueName,
      platform,
      scoring,
      rows: rawRows,
      draftByYear,
      adpSourceByYear,
      moneyInputs,
      activityBySeason,
      espnOwnerByTeamByYear: ownerByTeamByYear,
      espnOwnerFullByTeamByYear: ownerFullByTeamByYear,
      espnTeamNamesByOwner: teamNamesByOwner,
      espnRostersByYear: rostersByYear,
      espnLineupSlotsByYear: lineupSlotsByYear,
      espnRosterAcqByYear: rosterAcqByYear,
      espnPlayoffTeamsBySeason: playoffTeamsBySeason,
      playoffTeamsOverrides: playoffTeamsOverrides,
      espnCurrentWeekBySeason: currentWeekBySeason,
      espnScheduleByYear: scheduleByYear,
      espnSeasonsByYear: seasonsByYear,
      hiddenManagers: Array.from(hiddenManagers),
      managerNicknames,
      leagueIcon,
      leagueFontFamily: resolved,
    });
  }

  function handleLeagueIconChange(nextIcon) {
    const normalized = normalizeLeagueIcon(nextIcon, leagueIcon);
    setLeagueIcon(normalized);
    const { leagueId, leagueName, platform, scoring } =
      getCurrentLeagueIdentity();
    upsertLeague({
      leagueId,
      leagueKey: selectedLeague,
      name: leagueName,
      platform,
      scoring,
      rows: rawRows,
      draftByYear,
      adpSourceByYear,
      moneyInputs,
      activityBySeason,
      espnOwnerByTeamByYear: ownerByTeamByYear,
      espnOwnerFullByTeamByYear: ownerFullByTeamByYear,
      espnTeamNamesByOwner: teamNamesByOwner,
      espnRostersByYear: rostersByYear,
      espnPlayoffTeamsBySeason: playoffTeamsBySeason,
      playoffTeamsOverrides: playoffTeamsOverrides,
      espnCurrentWeekBySeason: currentWeekBySeason,
      espnScheduleByYear: scheduleByYear,
      espnSeasonsByYear: seasonsByYear,
      hiddenManagers: Array.from(hiddenManagers),
      managerNicknames,
      leagueIcon: normalized,
      leagueFontFamily,
    });
  }
  const headerIconIsUpload =
    leagueIcon?.type === "upload" &&
    typeof leagueIcon?.value === "string" &&
    leagueIcon.value;
  const headerIconGlyph =
    leagueIcon?.type === "preset" && leagueIcon?.value
      ? leagueIcon.value
      : leagueIcon?.previousPreset || DEFAULT_LEAGUE_ICON_GLYPH;
  const activeLeagueId = selectedLeagueId || storeSnapshot.lastSelectedLeagueId;
  return (
    <div
      data-theme="luxury"
      className="relative min-h-screen overflow-hidden bg-base-100 text-base-content"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[620px] w-[620px] rounded-full bg-sky-500/10 blur-[200px]" />
        <div className="absolute top-[12%] left-[-160px] h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-[160px]" />
      </div>
      <div className="relative z-10 px-3 pb-12 pt-6 sm:px-4 lg:px-6 xl:px-8">
        <div className="w-full space-y-8">
          {/* NAVBAR */}
          <div className="relative grid w-full items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white/90 shadow-[0_30px_90px_-45px_rgba(8,12,24,0.85)] backdrop-blur-xl grid-cols-1 md:grid-cols-[auto_1fr_auto]">
            <div className="flex items-center justify-center gap-3 md:justify-start">
              {leagueOptions.length > 0 && (
                <div className="relative">
                  <button
                    ref={leagueMenuButtonRef}
                    type="button"
                    onClick={() => setLeagueMenuOpen((prev) => !prev)}
                    className="btn btn-sm btn-outline normal-case flex items-center gap-2"
                    aria-haspopup="listbox"
                    aria-expanded={leagueMenuOpen ? "true" : "false"}
                  >
                    <span className="truncate max-w-[220px]">
                      {leagueOptions.find(
                        (o) => o.id === activeLeagueId
                      )?.name ||
                        leagueName ||
                        "Select league"}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 opacity-70 transition ${
                        leagueMenuOpen ? "rotate-180" : ""
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {leagueMenuOpen && (
                    <div
                      ref={leagueMenuRef}
                      className="absolute right-0 mt-2 max-h-80 w-64 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 text-sm text-white shadow-lg backdrop-blur-xl z-50"
                      role="listbox"
                    >
                      <ul className="py-1">
                        {leagueOptions.map((opt) => (
                          <li key={opt.id} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg">
                            <button
                              type="button"
                              onClick={() => {
                                switchLeagueById(opt.id);
                                setLeagueMenuOpen(false);
                              }}
                              className={`flex-1 text-left truncate ${
                                opt.id === activeLeagueId ? "font-semibold" : ""
                              }`}
                              title={opt.name}
                            >
                              {opt.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteCurrentLeague(opt.id);
                                setLeagueMenuOpen(false);
                              }}
                              className="shrink-0 text-rose-400 transition hover:text-rose-300"
                              title="Delete this league"
                            >
                              🗑️
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 text-center">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-900/90 text-white shadow-inner dark:bg-white/90 dark:text-zinc-900">
                {headerIconIsUpload ? (
                  <img
                    src={leagueIcon?.value}
                    alt={`${leagueName || "League"} icon`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-lg leading-none">
                    {headerIconGlyph}
                  </span>
                )}
              </div>
              <h1
                className="text-2xl md:text-4xl font-semibold tracking-tight text-white"
                style={{ fontFamily: leagueFontFamily || "var(--league-font-family)" }}
              >
                {leagueName}
              </h1>
            </div>
            <div className="flex justify-center md:justify-end">
              <UserMenu user={{ name: "You" /* or pull from your auth */ }} />
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* SIDEBAR */}
            <aside className="space-y-2 rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl shadow-[0_26px_75px_-50px_rgba(8,12,24,0.85)]">
            <SidebarButton
              active={section === "setup"}
              onClick={() => setSection("setup")}
            >
              League Setup
            </SidebarButton>
            <SidebarButton
              active={section === "members"}
              onClick={() => setSection("members")}
              disabled={!league}
            >
              League Members
            </SidebarButton>
            <div className="pt-2">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-white/70">
                Current Season
              </div>
              <div className="mt-2 space-y-2">
                <SidebarButton
                  active={section === "weekly"}
                  onClick={() => setSection("weekly")}
                  disabled={!league}
                >
                  Weekly Outlook
                </SidebarButton>
                <SidebarButton
                  active={section === "sos"}
                  onClick={() => setSection("sos")}
                  disabled={!league}
                >
                  Strength of Schedule
                </SidebarButton>
                <SidebarButton
                  active={section === "playoffprob"}
                  onClick={() => setSection("playoffprob")}
                  disabled={!league}
                >
                  Playoff Probability
                </SidebarButton>
              </div>
            </div>
            <div className="pt-4">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-white/70">
                League History
              </div>
              <div className="mt-2 space-y-2">
                <SidebarButton
                  active={section === "career"}
                  onClick={() => setSection("career")}
                  disabled={!league}
                >
                  Career Stats
                </SidebarButton>
                <SidebarButton
                  active={section === "h2h"}
                  onClick={() => setSection("h2h")}
                  disabled={!league}
                >
                  H2H Matchups
                </SidebarButton>
                <SidebarButton
                  active={section === "placements"}
                  onClick={() => setSection("placements")}
                  disabled={!league}
                >
                  Placements
                </SidebarButton>
                <SidebarButton
                  active={section === "recap"}
                  onClick={() => setSection("recap")}
                  disabled={!league}
                >
                  Yearly Recap
                </SidebarButton>
                <SidebarButton
                  active={section === "money"}
                  onClick={() => setSection("money")}
                  disabled={!league}
                >
                  Money
                </SidebarButton>
                <SidebarButton
                  active={section === "records"}
                  onClick={() => setSection("records")}
                  disabled={!league}
                >
                  Records
                </SidebarButton>
                {/* ✅ Roster */}
                <SidebarButton
                  active={section === "roster"}
                  onClick={() => setSection("roster")}
                  disabled={!league}
                >
                  Roster
                </SidebarButton>
                <SidebarButton
                  active={section === "trades"}
                  onClick={() => setSection("trades")}
                  disabled={!league}
                >
                  Waivers
                </SidebarButton>
                <SidebarButton
                  active={section === "trading"}
                  onClick={() => setSection("trading")}
                  disabled={!league}
                >
                  Trades
                </SidebarButton>
                <SidebarButton
                  active={section === "draft"}
                  onClick={() => setSection("draft")}
                  disabled={!league}
                >
                  Draft
                </SidebarButton>
                <SidebarButton
                  active={section === "luck"}
                  onClick={() => setSection("luck")}
                  disabled={!league}
                >
                  Luck Index
                </SidebarButton>
                <SidebarButton
                  active={section === "scenario"} // 👈 new
                  onClick={() => setSection("scenario")} // 👈 new
                  disabled={!league}
                >
                  Scenario
                </SidebarButton>
              </div>
            </div>
            <div className="pt-4">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-white/70">
                Updates
              </div>
              <div className="mt-2 space-y-2">
                <SidebarButton
                  active={section === "updates-whats-new"}
                  onClick={() => setSection("updates-whats-new")}
                >
                  What's New
                </SidebarButton>
                <SidebarButton
                  active={section === "updates-coming"}
                  onClick={() => setSection("updates-coming")}
                >
                  What's Coming
                </SidebarButton>
              </div>
            </div>
          </aside>
          <main className="space-y-6 min-w-0">
            {/* Setup should always render */}
            {section === "setup" && (
              <ErrorBoundary name="SetupTab">
                <SetupTab
                  // Always provide an object so SetupTab doesn't branch hooks off a null/undefined
                  derivedAll={derivedAll || { leagues: [], byLeague: {} }}
                  selectedLeague={selectedLeague}
                  setSelectedLeague={setSelectedLeague}
                  activeLeagueName={leagueName}
                  onLegacyCsvMerged={handleLegacyCsvMerged}
                  hiddenManagers={hiddenManagers}
                  onChangeHiddenManagers={(nextSet) => {
                    const nextArr = Array.from(nextSet || []);
                    setHiddenManagers(new Set(nextArr));
                    const { leagueId, leagueName, platform, scoring } =
                      getCurrentLeagueIdentity();
                    upsertLeague({
                      leagueId,
                      leagueKey: selectedLeague,
                      name: leagueName,
                      platform,
                      scoring,
                      rows: rawRows,
                      draftByYear,
                      adpSourceByYear,
                      moneyInputs,
                      activityBySeason,
                      espnOwnerByTeamByYear: ownerByTeamByYear,
                      espnOwnerFullByTeamByYear: ownerFullByTeamByYear,
                      espnTeamNamesByOwner: teamNamesByOwner,
                      espnRostersByYear: rostersByYear,
                      espnLineupSlotsByYear: lineupSlotsByYear,
                      espnRosterAcqByYear: rosterAcqByYear,
                      espnPlayoffTeamsBySeason: playoffTeamsBySeason,
                      playoffTeamsOverrides: playoffTeamsOverrides,
                      espnCurrentWeekBySeason: currentWeekBySeason,
                      espnScheduleByYear: scheduleByYear,
                      espnSeasonsByYear: seasonsByYear,
                      hiddenManagers: nextArr,
                      managerNicknames,
                      leagueIcon,
                    });
                  }}
                  managerNicknames={managerNicknames}
                  onChangeManagerNicknames={handleManagerNicknamesChange}
                  leagueIcon={leagueIcon}
                  onLeagueIconChange={handleLeagueIconChange}
                  leagueFontFamily={leagueFontFamily}
                  onChangeLeagueFontFamily={handleLeagueFontFamilyChange}
                  onManagerMergesChanged={rebuildFromStore}
                />
              </ErrorBoundary>
            )}

            {/* Everything else waits for derivedAll */}
            {derivedAll && (
              <>
                {leagueWithHidden && section === "members" && (
                  <MembersTab league={leagueWithHidden} />
                )}

                {league && section === "weekly" && (
                  <WeeklyOutlookTab
                    league={leagueForWeekly}
                    playoffTeamsBase={playoffTeamsBySeason}
                    playoffTeamsOverrides={playoffTeamsOverrides}
                    seasonThisYear={seasonThisYear}
                    scheduleThisYear={scheduleThisYearNormalized}
                    managerNicknames={managerNicknames}
                  />
                )}

                {league && section === "sos" && (
                  <StrengthOfScheduleTab
                    league={leagueForWeekly}
                    seasonThisYear={seasonThisYear}
                  />
                )}

                {leagueWithHidden && section === "career" && (
                  <CareerTab league={leagueWithHidden} />
                )}
                {leagueWithHidden && section === "h2h" && (
                  <H2HTab league={leagueWithHidden} />
                )}
                {leagueWithHidden && section === "scenario" && (
                  <ScenarioTab league={leagueWithHidden} />
                )}

                {league && section === "placements" && (
                  <PlacementsTab
                    league={leagueWithHidden}
                    playoffTeamsBase={playoffTeamsBySeason}
                    playoffTeamsOverrides={playoffTeamsOverrides}
                    onSavePlayoffOverrides={savePlayoffOverrides}
                  />
                )}
                {leagueWithHidden && section === "recap" && (
                  <YearlyRecapTab
                    league={leagueWithHidden}
                    rostersByYear={rostersByYear}
                    lineupSlotsByYear={lineupSlotsByYear}
                    ownerByTeamByYear={ownerByTeamByYear}
                    currentWeekByYear={currentWeekBySeason}
                  />
                )}

                {leagueWithHidden && section === "money" && (
                  <MoneyTab
                    league={leagueWithHidden}
                    moneyInputs={moneyInputs}
                    setMoneyInputs={handleMoneyInputsChanged}
                  />
                )}

                {leagueWithHidden && section === "records" && (
                  <RecordsTab
                    league={leagueWithHidden}
                    scheduleByYear={scheduleByYear}
                    ownerByTeamByYear={ownerByTeamByYear}
                  />
                )}

                {leagueWithHidden && section === "luck" && (
                  <LuckIndexTab
                    league={leagueWithHidden}
                    rawRows={rawRows}
                    rostersByYear={rostersByYear}
                    currentWeekByYear={currentWeekBySeason}
                    draftByYear={draftByYear}
                    managerNicknames={managerNicknames}
                  />
                )}

                {leagueWithHidden && section === "playoffprob" && (
                  <PlayoffProbTab
                    league={leagueWithHidden}
                    playoffTeamsBase={playoffTeamsBySeason}
                    playoffTeamsOverrides={playoffTeamsOverrides}
                  />
                )}

                {league && section === "roster" && (
                  <RosterTab
                    rostersByYear={rostersByYear}
                    ownerByTeamByYear={ownerByTeamByYear}
                    lineupSlotsByYear={lineupSlotsByYear}
                    currentWeekByYear={currentWeekBySeason}
                    rosterAcqByYear={rosterAcqByYear}
                    league={leagueWithHidden}
                    hiddenManagers={leagueWithHidden?.hiddenManagers}
                  />
                )}

                {league &&
                  section === "trades" &&
                  (() => {
                    const store = readStore();
                    const curId =
                      selectedLeagueId ||
                      store.lastSelectedLeagueId ||
                      Object.keys(store.leaguesById || {})[0] ||
                      "";
                    const recForTrades =
                      (curId &&
                        store.leaguesById &&
                        store.leaguesById[curId]) ||
                      {};
                    return (
                      <TradesTab
                        league={leagueWithHidden}
                        rawRows={rawRows}
                        selectedLeague={selectedLeague}
                        activityBySeason={activityBySeason}
                        espnAddsByYear={
                          recForTrades.espnTransactionsByYear || {}
                        }
                        espnOwnerByTeamByYear={
                          recForTrades.espnOwnerByTeamByYear ||
                          recForTrades.espnOwnerMapByYear ||
                          {}
                        }
                        espnTeamNamesByOwner={
                          recForTrades.espnTeamNamesByOwner || {}
                        }
                        espnRostersByYear={recForTrades.espnRostersByYear || {}}
                        espnRosterAcqByYear={
                          recForTrades.espnRosterAcqByYear || {}
                        }
                        espnOwnerFullByTeamByYear={
                          recForTrades.espnOwnerFullByTeamByYear || {}
                        }
                        espnInjuriesByYear={recForTrades.espnInjuriesByYear || {}}
                      />
                    );
                  })()}

                {league && section === "trading" && (
                  <ErrorBoundary name="TradingTab">
                    {(() => {
                      const store = readStore();
                      const curId =
                        selectedLeagueId ||
                        store.lastSelectedLeagueId ||
                        Object.keys(store.leaguesById || {})[0] ||
                        "";
                      const recForTrading =
                        (curId &&
                          store.leaguesById &&
                          store.leaguesById[curId]) ||
                        {};

                      return (
                        <TradingTab
                          league={leagueWithHidden}
                          selectedLeague={selectedLeague}
                          espnTradesDetailedBySeason={
                            recForTrading.espnTradesDetailedBySeason || {}
                          }
                          espnOwnerByTeamByYear={
                            recForTrading.espnOwnerByTeamByYear ||
                            recForTrading.espnOwnerMapByYear ||
                            {}
                          }
                          espnOwnerFullByTeamByYear={
                            recForTrading.espnOwnerFullByTeamByYear || {}
                          }
                          espnTeamNamesByOwner={
                            recForTrading.espnTeamNamesByOwner || {}
                          }
                          espnRostersByYear={
                            recForTrading.espnRostersByYear || {}
                          }
                          espnRosterAcqByYear={
                            recForTrading.espnRosterAcqByYear || {}
                          }
                          currentWeekBySeason={
                            recForTrading.espnCurrentWeekBySeason || {}
                          }
                          fallbackTransactionsByYear={
                            recForTrading.espnTransactionsByYear || {}
                          }
                          espnInjuriesByYear={
                            recForTrading.espnInjuriesByYear || {}
                          }
                        />
                      );
                    })()}
                  </ErrorBoundary>
                )}

                {league && section === "draft" && (
                  <DraftTab
                    league={leagueWithHidden}
                    draftByYear={draftByYear}
                    hiddenManagers={leagueWithHidden?.hiddenManagers}
                    managerNicknames={leagueWithHidden?.managerNicknames}
                  />
                )}
              </>
            )}
            {section === "updates-whats-new" && <UpdatesWhatsNewTab />}
            {section === "updates-coming" && <UpdatesComingSoonTab />}
          </main>
        </div>
        <Footer />
      </div>
    </div>
  </div>
  );
}
