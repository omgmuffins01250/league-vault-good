// All tab components bundled in one module.
// Exports: SetupTab, MembersTab, CareerTab, H2HTab, PlacementsTab, YearlyRecapTab, MoneyTab, RecordsTab, TradesTab
import React, { useEffect, useMemo, useState } from "react";
import { Card, TableBox } from "./ui.jsx";
import ManagerMergeControl from "./ManagerMergeControl.jsx";
import {
  ownerName,
  canonicalizeOwner,
  primeOwnerMaps,
  ownerMapFor,
} from "../ownerMaps.jsx";
// near the top of App.jsx (or tabs.jsx)
import "../Data/finishData.jsx";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  BarChart, // + add
  Bar, // + add
  ReferenceLine,
  Cell,
} from "recharts";

/* NEW: ESPN activity extractor                                       */
/**
 * Turn ESPN seasons (2018+) into:
 *   activityBySeason = {
 *     [year]: {
 *       [ownerDisplayName]: {
 *          acquisitions, drops, trades, moveToActive, ir, budget
 *       }
 *     }
 *   }
 *
 * Pass this into <TradesTab activityBySeason={…} />.
 */
export function extractEspnActivity(seasons = []) {
  const activity = {};
  for (const season of seasons || []) {
    const yr = Number(season?.seasonId);
    if (!Number.isFinite(yr)) continue;
    const memberName = new Map();
    (season?.members || []).forEach((m) => {
      const dn = m?.displayName || "";
      const fn = m?.firstName || "";
      const ln = m?.lastName || "";
      const full = [fn, ln].filter(Boolean).join(" ").trim();
      const best = full || dn || "";
      if (m?.id) memberName.set(m.id, best);
    });
    if (!activity[yr]) activity[yr] = {};
    (season?.teams || []).forEach((t) => {
      const ownerId = t?.primaryOwner || (t?.owners || [])[0] || "__unknown__";
      const owner =
        memberName.get(ownerId) ||
        (t?.location && t?.nickname
          ? `${t.location} ${t.nickname}`.trim()
          : t?.name || `Team ${t?.id}`) ||
        "Unknown";
      const tx = t?.transactionCounter || {};
      activity[yr][owner] = {
        acquisitions: Number(tx.acquisitions || 0),
        drops: Number(tx.drops || 0),
        trades: Number(tx.trades || 0),
        moveToActive: Number(tx.moveToActive || 0),
        ir: Number(tx.moveToIR || 0),
        budget: Number(tx.acquisitionBudgetSpent || 0),
      };
    });
  }
  return activity;
}
const TROPHIES = {
  1: "/trophies/gold.png",
  2: "/trophies/silver.png",
  3: "/trophies/bronze.png",
};

export const DEFAULT_LEAGUE_ICONS = [
  { glyph: "🏈", label: "Football" },
  { glyph: "🏀", label: "Basketball" },
  { glyph: "⚾️", label: "Baseball" },
  { glyph: "🏒", label: "Hockey" },
  { glyph: "⚽️", label: "Soccer" },
  { glyph: "🎯", label: "Bullseye" },
  { glyph: "🎲", label: "Dice" },
  { glyph: "🛡️", label: "Shield" },
  { glyph: "👑", label: "Crown" },
  { glyph: "🔥", label: "Fire" },
  { glyph: "⭐️", label: "Star" },
  { glyph: "🎉", label: "Celebration" },
];
const ordinal = (n) => {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  const j = n % 10,
    k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
};

/* HideManagerControl — choose which managers are hidden across tabs */
function HideManagerControl({
  owners = [],
  hidden = new Set(),
  onChangeHidden, // (nextSet: Set<string>) => void
}) {
  const toggle = (name) => {
    const next = new Set(hidden);
    next.has(name) ? next.delete(name) : next.add(name);
    onChangeHidden?.(next);
  };
  const clearAll = () => onChangeHidden?.(new Set());
  const selectAll = () => onChangeHidden?.(new Set(owners));

  return (
    <Card title="Hide managers (global)">
      <div className="text-xs text-zinc-500 mb-2">
        Hidden managers won’t appear in charts/tables. Other managers’ stats
        still include games played against them.
      </div>
      <div className="flex items-center gap-2 mb-2">
        <button
          className="px-2 py-1 rounded-full text-xs border border-zinc-300 dark:border-zinc-700"
          onClick={selectAll}
        >
          Hide all
        </button>
        <button
          className="px-2 py-1 rounded-full text-xs border border-zinc-300 dark:border-zinc-700"
          onClick={clearAll}
        >
          Show all
        </button>
        <span className="text-xs text-zinc-500">
          Hidden: {hidden.size}/{owners.length}
        </span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto pr-1">
        {owners.map((name) => (
          <label
            key={name}
            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={hidden.has(name)}
              onChange={() => toggle(name)}
            />
            <span className="truncate">{name}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers shared by League Setup UI                                  */
/* ------------------------------------------------------------------ */
const SETUP_SLOT_LABEL = {
  0: "QB",
  1: "TQB",
  2: "RB",
  3: "RB/WR",
  4: "WR",
  5: "WR/TE",
  6: "TE",
  7: "OP",
  8: "DL",
  9: "DE",
  10: "LB",
  11: "DL/DT",
  12: "DB",
  13: "DB/S",
  14: "DP",
  15: "D",
  16: "D/ST",
  17: "K",
  18: "P",
  19: "HC",
  20: "Bench",
  21: "IR",
  22: "UTIL",
  23: "FLEX",
  24: "EDR",
  25: "Bench (DL)",
  26: "Bench (LB)",
  27: "Bench (DB)",
  28: "Bench (DP)",
  29: "Taxi",
};
const SETUP_SLOT_ORDER = [
  0, 2, 3, 4, 23, 7, 6, 16, 17, 15, 8, 9, 10, 11, 12, 13, 14, 18, 19, 22, 20,
  21, 24, 25, 26, 27, 28, 29,
];
const ALWAYS_UPPER = new Set(["PPR", "FAAB", "IDP"]);
function pickFirst(...vals) {
  for (const val of vals) {
    if (val === undefined || val === null) continue;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed) return trimmed;
      continue;
    }
    return val;
  }
  return undefined;
}
function humanizeToken(token) {
  if (token === undefined || token === null) return "";
  const raw = String(token).trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper === "HALF_PPR" || upper === "HALF-PPR" || upper === "HALF PPR")
    return "Half PPR";
  if (upper === "H2H_POINTS") return "H2H Points";
  if (upper === "ROTO") return "Roto";
  if (ALWAYS_UPPER.has(upper)) return upper;
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toLocaleString()}`;
}
function formatDateTime(value) {
  if (value === undefined || value === null) return "—";
  let date = null;
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    date = new Date(ms);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";
    const asNum = Number(trimmed);
    if (Number.isFinite(asNum)) {
      const ms = asNum > 1e12 ? asNum : asNum * 1000;
      date = new Date(ms);
    } else {
      date = new Date(trimmed);
    }
  }
  if (!date || Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}
function getFromYearMap(map, year) {
  if (!map || !year) return null;
  return map[year] || map[String(year)] || null;
}
function hasPositiveCount(obj) {
  if (!obj || typeof obj !== "object") return false;
  return Object.values(obj).some((v) => Number(v) > 0);
}
function buildRosterSlots(counts = {}) {
  const seen = new Set();
  const out = [];
  SETUP_SLOT_ORDER.forEach((slotId) => {
    const cnt = Number(counts?.[slotId] ?? counts?.[String(slotId)] ?? 0);
    if (!Number.isFinite(cnt) || cnt <= 0) return;
    seen.add(String(slotId));
    const label = SETUP_SLOT_LABEL[slotId] || `Slot ${slotId}`;
    out.push({ key: `slot-${slotId}`, label, count: cnt });
  });
  Object.entries(counts || {}).forEach(([slotId, cnt]) => {
    if (seen.has(String(slotId))) return;
    const num = Number(cnt);
    if (!Number.isFinite(num) || num <= 0) return;
    const numId = Number(slotId);
    const label = SETUP_SLOT_LABEL[numId] || `Slot ${slotId}`;
    out.push({ key: `slot-${slotId}`, label, count: num });
  });
  return out;
}
function resolveSeasonsSource(league) {
  if (league?.seasonsByYear && Object.keys(league.seasonsByYear).length)
    return league.seasonsByYear;
  if (typeof window !== "undefined") {
    return (
      window.__sources?.seasonsByYear ||
      window.__FL_SOURCES?.seasonsByYear ||
      {}
    );
  }
  return {};
}
function resolveLineupSource(league) {
  if (league?.lineupSlotsByYear && Object.keys(league.lineupSlotsByYear).length)
    return league.lineupSlotsByYear;
  if (typeof window !== "undefined") {
    return window.__sources?.lineupSlotsByYear || {};
  }
  return {};
}
function resolveScoringLabel(league, season) {
  const scoringRaw = pickFirst(
    season?.scoringSettings?.name,
    season?.scoringSettings?.scoringType,
    season?.scoringSettings?.playerRankType,
    season?.settings?.scoringSettings?.name,
    season?.settings?.scoringSettings?.scoringType,
    season?.settings?.scoringSettings?.playerRankType,
    season?.settings?.playerRankType,
    league?.meta?.scoring
  );
  const label = humanizeToken(scoringRaw);
  return label || "Standard";
}
function resolveFaab(acquisitionSettings) {
  if (!acquisitionSettings || typeof acquisitionSettings !== "object") {
    return { usesFaab: null, budget: null, waiverType: null };
  }
  const waiverType = pickFirst(
    acquisitionSettings.acquisitionType,
    acquisitionSettings.waiverType,
    acquisitionSettings.waiverProcessType
  );
  const usesFaab = pickFirst(
    acquisitionSettings.isUsingFaab,
    acquisitionSettings.usingFaab,
    typeof waiverType === "string"
      ? waiverType.toUpperCase().includes("FAAB")
      : undefined
  );
  const budget = pickFirst(
    acquisitionSettings.acquisitionBudget,
    acquisitionSettings.faabBudget,
    acquisitionSettings.freeAgentBudget,
    acquisitionSettings.waiverBudget
  );
  return {
    usesFaab: typeof usesFaab === "boolean" ? usesFaab : !!usesFaab,
    budget: Number.isFinite(Number(budget)) ? Number(budget) : null,
    waiverType,
  };
}
function resolveDraftMeta(season) {
  const draftSettings =
    season?.settings?.draftSettings || season?.draftSettings || {};
  const draftDetail = season?.draftDetail || {};
  const draftType = pickFirst(
    draftSettings.type,
    draftDetail.type,
    season?.draftType
  );
  const draftOrderRaw = pickFirst(
    draftSettings.orderType,
    draftSettings.draftOrderType,
    draftDetail.orderType,
    draftDetail.draftOrderType
  );
  const snakeFlag = pickFirst(
    draftSettings.isSnakeDraft,
    draftSettings.isSnake,
    draftDetail.isSnake,
    draftDetail.isSnakeDraft
  );
  const inferredSnake = (() => {
    if (typeof snakeFlag === "boolean") return snakeFlag;
    if (typeof draftOrderRaw === "string") {
      const upper = draftOrderRaw.toUpperCase();
      if (upper.includes("SNAKE")) return true;
      if (upper.includes("LINEAR") || upper.includes("FIXED")) return false;
    }
    return null;
  })();
  const draftDateRaw = pickFirst(
    draftDetail.draftedDate,
    draftDetail.draftDate,
    draftDetail.draftedDateTime,
    draftDetail.scheduledStartTime,
    draftDetail.startTime,
    draftSettings.date,
    draftSettings.draftDate
  );
  return {
    draftType,
    draftOrderRaw,
    isSnake: inferredSnake,
    draftDateRaw,
  };
}

/* SetupTab                                                           */
/* SetupTab                                                           */
export function SetupTab({
  derivedAll,
  selectedLeague,
  setSelectedLeague,
  onLegacyCsvMerged,
  hiddenManagers = new Set(), // ← add
  onChangeHiddenManagers, // ← add
  leagueIcon,
  onLeagueIconChange,
}) {
  if (!derivedAll) return null;
  const league = selectedLeague && derivedAll?.byLeague?.[selectedLeague];
  const defaultIconGlyph = DEFAULT_LEAGUE_ICONS[0]?.glyph || "🏈";
  const presetSelection =
    leagueIcon?.type !== "upload" && leagueIcon?.value
      ? leagueIcon.value
      : null;
  const isUploadActive =
    leagueIcon?.type === "upload" &&
    typeof leagueIcon?.value === "string" &&
    leagueIcon.value;
  const previewGlyph = presetSelection || defaultIconGlyph;
  const handleIconUpload = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      onLeagueIconChange?.({
        type: "upload",
        value,
        name: file.name,
        previousPreset: presetSelection || defaultIconGlyph,
      });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  const handleRemoveUpload = () => {
    const fallback =
      leagueIcon?.previousPreset || presetSelection || defaultIconGlyph;
    onLeagueIconChange?.({ type: "preset", value: fallback });
  };
  const seasonsSource = useMemo(() => resolveSeasonsSource(league), [league]);
  const lineupSource = useMemo(() => resolveLineupSource(league), [league]);
  const { latestSeason, latestYear } = useMemo(() => {
    let bestSeason = null;
    let bestYear = null;
    Object.entries(seasonsSource || {}).forEach(([key, season]) => {
      const byKey = Number(key);
      const bySeasonId = Number(season?.seasonId);
      const candidate = Number.isFinite(byKey)
        ? byKey
        : Number.isFinite(bySeasonId)
        ? bySeasonId
        : null;
      if (candidate == null) {
        if (!bestSeason) bestSeason = season;
        return;
      }
      if (bestYear == null || candidate > bestYear) {
        bestYear = candidate;
        bestSeason = season;
      }
    });
    return { latestSeason: bestSeason, latestYear: bestYear };
  }, [seasonsSource]);
  const scoringDisplay = useMemo(
    () => resolveScoringLabel(league, latestSeason),
    [league, latestSeason]
  );
  const faabInfo = useMemo(() => {
    const acquisitionSettings =
      latestSeason?.settings?.acquisitionSettings ||
      latestSeason?.acquisitionSettings ||
      null;
    return resolveFaab(acquisitionSettings);
  }, [latestSeason]);
  const waiverLabel = useMemo(() => {
    if (faabInfo.usesFaab === true) return "FAAB";
    if (faabInfo.waiverType) {
      const upper = String(faabInfo.waiverType).toUpperCase();
      if (upper.includes("FAAB")) return "FAAB";
      return humanizeToken(faabInfo.waiverType);
    }
    if (faabInfo.usesFaab === false) return "Waivers";
    return faabInfo.usesFaab ? "FAAB" : "—";
  }, [faabInfo]);
  const faabBudgetLabel = useMemo(() => {
    if (faabInfo.budget != null) return formatCurrency(faabInfo.budget);
    if (faabInfo.usesFaab) return "—";
    return "—";
  }, [faabInfo]);
  const draftMeta = useMemo(
    () => resolveDraftMeta(latestSeason || {}),
    [latestSeason]
  );
  const draftTypeLabel = useMemo(() => {
    const label = humanizeToken(draftMeta.draftType);
    return label || "—";
  }, [draftMeta.draftType]);
  const draftOrderLabel = useMemo(() => {
    if (draftMeta.isSnake === true) return "Snake";
    if (draftMeta.isSnake === false) return "Linear";
    const label = humanizeToken(draftMeta.draftOrderRaw);
    return label || "—";
  }, [draftMeta.draftOrderRaw, draftMeta.isSnake]);
  const draftDateLabel = useMemo(
    () => formatDateTime(draftMeta.draftDateRaw),
    [draftMeta.draftDateRaw]
  );
  const lineupCounts = useMemo(() => {
    const countsFromSeason =
      latestSeason?.settings?.rosterSettings?.lineupSlotCounts;
    if (hasPositiveCount(countsFromSeason)) return countsFromSeason;
    const fromNested = latestSeason?.rosterSettings?.lineupSlotCounts;
    if (hasPositiveCount(fromNested)) return fromNested;
    const directRoster = latestSeason?.rosterSettings;
    if (hasPositiveCount(directRoster)) return directRoster;
    const fromMap = getFromYearMap(lineupSource, latestYear);
    if (hasPositiveCount(fromMap)) return fromMap;
    return {};
  }, [latestSeason, latestYear, lineupSource]);
  const rosterSlots = useMemo(
    () => buildRosterSlots(lineupCounts),
    [lineupCounts]
  );
  const extraGeneralInfos = useMemo(
    () => [
      { label: "Waiver Type", value: waiverLabel || "—" },
      { label: "FAAB Budget", value: faabBudgetLabel || "—" },
      { label: "Draft Type", value: draftTypeLabel || "—" },
      { label: "Draft Date", value: draftDateLabel || "—" },
      { label: "Draft Order", value: draftOrderLabel || "—" },
    ],
    [
      waiverLabel,
      faabBudgetLabel,
      draftTypeLabel,
      draftDateLabel,
      draftOrderLabel,
    ]
  );
  const hasExtras = useMemo(
    () =>
      rosterSlots.length > 0 ||
      extraGeneralInfos.some((info) => info.value && info.value !== "—"),
    [rosterSlots, extraGeneralInfos]
  );
  const [showMore, setShowMore] = useState(false);
  useEffect(() => {
    setShowMore(false);
  }, [selectedLeague, league]);
  // 👇 ADD THIS EFFECT (keeps ownerMaps in sync with the selected league)
  React.useEffect(() => {
    if (!league) return;
    const aliases = window.__FL_ALIASES || {};
    primeOwnerMaps({
      league,
      selectedLeague: league,
      espnOwnerByTeamByYear: league.ownerByTeamByYear || {},
      manualAliases: aliases,
    });
    // Optional sanity log:
    console.log(
      "Owner map sources ready",
      window.__ownerMaps?.mapFor?.(Number(league?.seasonsAll?.slice?.(-1)?.[0]))
    );
  }, [league]);
  const keys = derivedAll.leagues;
  const [wantLegacy, setWantLegacy] = useState(false);
  const inferredId = (league?.meta?.id && String(league.meta.id)) || "";
  const [legacyLeagueId, setLegacyLeagueId] = useState(inferredId);
  const inferredStart = useMemo(() => {
    const s = Number(league?.meta?.startSeason);
    if (Number.isFinite(s) && s < 2019) return s;
    return 2018;
  }, [league?.meta?.startSeason]);
  const [legacyStartYear, setLegacyStartYear] = useState(inferredStart);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState("");
  useEffect(() => {
    setLegacyLeagueId(inferredId);
  }, [inferredId]);
  useEffect(() => {
    setLegacyStartYear(inferredStart);
  }, [inferredStart]);
  return (
    <div className="space-y-4">
      <Card title="League selection">
        <select
          className="px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700"
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value)}
        >
          {keys.map((k) => (
            <option key={k} value={k}>
              {derivedAll.byLeague[k].meta.name || k}
            </option>
          ))}
        </select>
      </Card>
      {league && (
        <Card title="League icon">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/60 bg-white/90 text-3xl shadow-[0_12px_30px_-18px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-zinc-900/70">
              {isUploadActive ? (
                <img
                  src={leagueIcon?.value}
                  alt={`${league?.meta?.name || "League"} icon`}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span>{previewGlyph}</span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="league-icon-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleIconUpload}
                />
                <label
                  htmlFor="league-icon-upload"
                  className="btn btn-sm btn-primary"
                >
                  Upload image
                </label>
                {isUploadActive && (
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={handleRemoveUpload}
                  >
                    Remove upload
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Upload a square image (PNG, JPG, WEBP, or SVG). It will appear
                in the circle next to your league name.
              </p>
            </div>
          </div>
          {isUploadActive ? (
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              Remove the uploaded image to choose from the built-in icons.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                Or pick a quick icon
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {DEFAULT_LEAGUE_ICONS.map((icon) => {
                  const active =
                    leagueIcon?.type !== "upload" &&
                    leagueIcon?.value === icon.glyph;
                  return (
                    <button
                      key={icon.glyph}
                      type="button"
                      onClick={() =>
                        onLeagueIconChange?.({
                          type: "preset",
                          value: icon.glyph,
                        })
                      }
                      aria-pressed={active}
                      aria-label={`Use the ${icon.label} icon`}
                      className={`flex h-12 w-12 items-center justify-center rounded-full border text-2xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
                        active
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:border-indigo-400/70 dark:text-indigo-300"
                          : "border-zinc-300/70 text-zinc-600 hover:border-indigo-300 hover:text-indigo-500 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-indigo-400/70 dark:hover:text-indigo-300"
                      }`}
                    >
                      <span>{icon.glyph}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}
      {/* Pre-2019 history helper unchanged... */}
      {league && (
        <ManagerMergeControl
          leagueMeta={league.meta}
          leagueRows={league.games || []}
        />
      )}
      {league && (
        <HideManagerControl
          owners={league.owners || []}
          hidden={hiddenManagers}
          onChangeHidden={onChangeHiddenManagers}
        />
      )}
      {league && (
        <Card title="League details">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <Info label="League Name" value={league.meta.name} />
            <Info label="League Size" value={league.meta.size} />
            <Info label="Start Season" value={league.meta.startSeason} />
            <Info label="Years Running" value={league.meta.yearsRunning} />
            <Info label="Platform" value={league.meta.platform} />
            <Info label="Scoring" value={scoringDisplay || "Standard"} />
          </div>
          {hasExtras && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setShowMore((prev) => !prev)}
                  aria-expanded={showMore}
                >
                  {showMore ? "Hide details" : "See more details"}
                </button>
                <div className="text-lg leading-none text-zinc-400">
                  {showMore ? "−" : "+"}
                </div>
              </div>
              {showMore && (
                <div className="mt-4 grid lg:grid-cols-2 gap-4 text-sm">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {extraGeneralInfos.map((info) => (
                      <Info
                        key={info.label}
                        label={info.label}
                        value={info.value}
                      />
                    ))}
                  </div>
                  {rosterSlots.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {rosterSlots.map((slot) => (
                        <Info
                          key={slot.key}
                          label={slot.label}
                          value={slot.count}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
function Info({ label, value }) {
  return (
    <div>
      <div className="text-zinc-500">{label}</div>
      <div className="font-medium">{String(value ?? "—")}</div>
    </div>
  );
}
/* MembersTab  ----------------------------------------------                                                       */
export function MembersTab({ league }) {
  if (!league) return null;

  // Prime ownerMaps (safe no-op if already primed)
  try {
    window.__ownerMaps?.prime?.({ league });
  } catch {}

  // Canonical owner resolver: ownerMaps first, then league fallback
  const ownerNameOf = React.useCallback(
    (season, teamId) => {
      try {
        const nm = window.__ownerMaps?.name?.(Number(season), Number(teamId));
        if (nm) return nm;
      } catch {}
      const g = (o, ...ks) => ks.reduce((p, k) => (p == null ? p : p[k]), o);
      return (
        g(league, "ownerByTeamByYear", season, teamId) ||
        g(league, "ownerByTeamByYear", String(season), teamId) ||
        g(league, "ownerByTeamByYear", season, String(teamId)) ||
        g(league, "ownerByTeamByYear", String(season), String(teamId)) ||
        null
      );
    },
    [league]
  );

  const owners = league.owners || [];
  const seasons = league.seasonsAll || [];
  const teamNames = league.teamNamesByOwner || {}; // { owner -> { season -> team_name } }
  const latest = seasons.length ? Math.max(...seasons) : null;
  const seasonsDescRaw = [...seasons].sort((a, b) => b - a);
  const seasonsDesc = seasonsDescRaw.filter((yr) => yr !== latest); // ← hides newest column
  const labelFor = (yr) => `${yr} Team Name`;
  const latestLabel = latest ? `Updated through ${latest}` : null;

  return (
    <Card
      title="League Members"
      right={
        latestLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/60 dark:border-white/15 bg-white/40 dark:bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
            {latestLabel}
          </span>
        ) : null
      }
    >
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/30 dark:border-white/10 bg-white/80 dark:bg-zinc-950/70 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.85)]">
          <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(120%_140%_at_100%_100%,rgba(147,197,253,0.14),transparent_55%)]" />
          <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />

          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[660px] text-[12px] text-slate-700 dark:text-slate-200">
              <thead className="text-[10px] uppercase tracking-[0.22em] text-slate-500/90 dark:text-slate-400/80">
                <tr className="bg-white/70 dark:bg-zinc-950/60 backdrop-blur sticky top-0">
                  <th className="px-3 py-2 text-left font-semibold ...">
                    Member
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    Yr Joined
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    Yrs Played
                  </th>
                  <th className="px-3 py-2 text-center font-medium whitespace-nowrap">
                    Current Team
                  </th>

                  {seasonsDesc.map((yr) => (
                    <th
                      key={`hdr-${yr}`}
                      className="px-4 py-3 text-center font-medium whitespace-nowrap"
                    >
                      {labelFor(yr)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(odd)]:bg-white/60 dark:[&>tr:nth-child(odd)]:bg-white/5 [&>tr]:border-b [&>tr]:border-white/30 dark:[&>tr]:border-white/10">
                {league.members.map((m) => (
                  <tr
                    key={m.id}
                    className="transition-all duration-150 hover:bg-amber-50/90 dark:hover:bg-amber-500/10 hover:shadow-[0_12px_40px_-30px_rgba(251,191,36,0.75)]"
                  >
                    {/* OWNER (manager) NAME */}
                    <td className="px-3 py-2 text-left">
                      <div className="flex flex-col leading-tight">
                        <span className="text-[14px] font-semibold tracking-tight ...">
                          {m.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-2 text-center tabular-nums font-semibold ...">
                      {m.joined}
                    </td>

                    <td className="px-3 py-2 text-center tabular-nums">
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-2 py-[2px] text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
                        {m.yearsPlayed}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex max-w-[16rem] items-center justify-center rounded-full bg-slate-900/5 dark:bg-white/10 px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400 dark:text-amber-300 whitespace-nowrap overflow-hidden text-ellipsis">
                        {m.currentTeam || teamNames?.[m.name]?.[latest] || "—"}
                      </span>
                    </td>

                    {/* Per-season team names, newest -> oldest (with fixed width) */}
                    {seasonsDesc.map((yr) => (
                      <td
                        key={`${m.id}-${yr}`}
                        className="px-4 py-3 text-center"
                      >
                        <div className="inline-flex min-w-[8.5rem] max-w-[14rem] items-center justify-center rounded-full bg-slate-900/5 dark:bg-white/10 px-2.5 py-[3px] text-[11px] font-medium uppercase tracking-[0.16em] text-slate-600 dark:text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis">
                          {teamNames?.[m.name]?.[yr] || "—"}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}
/* CareerTab — Playful Sport styling (wider + ticks + hover tooltip) */
export function CareerTab({ league }) {
  if (!league) return null;

  const hiddenSet = new Set(league.hiddenManagers || []); // will be set from App later
  const visibleOwners = (league.owners || []).filter((n) => !hiddenSet.has(n));

  /* --- tiny UI helpers (local-only) --- */
  const Chip = ({ children, className = "" }) => (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase
        bg-gradient-to-r from-amber-300/70 via-amber-200/50 to-amber-100/70 text-amber-700
        dark:from-amber-500/30 dark:via-amber-400/20 dark:to-amber-500/30 dark:text-amber-200
        border border-amber-400/40 shadow-[0_6px_18px_-12px_rgba(251,191,36,0.8)] backdrop-blur-sm ${className}`}
    >
      {children}
    </span>
  );
  const SoftButton = ({ children, onClick, className = "" }) => (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide uppercase
        text-slate-700 dark:text-slate-200
        bg-gradient-to-r from-white/95 via-white/80 to-white/90 dark:from-zinc-900/80 dark:via-zinc-900/50 dark:to-zinc-950/70
        border border-white/70 dark:border-white/10 shadow-[0_20px_40px_-25px_rgba(15,23,42,0.85)] backdrop-blur
        transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-25px_rgba(59,130,246,0.55)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${className}`}
    >
      <span className="tracking-wider">{children}</span>
    </button>
  );
  const Section = ({ title, right, children }) => {
    const titleNode =
      typeof title === "string" ? (
        <span className="bg-gradient-to-r from-[#f6f8fc] via-[#d5deeb] to-[#a9b6c9] bg-clip-text text-transparent drop-shadow">
          {title}
        </span>
      ) : (
        title
      );

    return (
      <div
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-white/10
        bg-white/80 dark:bg-zinc-950/60 shadow-[0_30px_65px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-80 bg-[radial-gradient(110%_130%_at_0%_0%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(120%_140%_at_100%_100%,rgba(16,185,129,0.14),transparent_60%)]" />
          <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
        </div>
        <div
          className="sticky top-0 z-20 flex items-center justify-between gap-3 px-5 py-4
          border-b border-white/60 dark:border-white/10 bg-white/90 dark:bg-zinc-950/85 backdrop-blur-xl"
        >
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-100">
            {titleNode}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            {right}
          </div>
        </div>
        <div className="relative z-10 p-5 md:p-6 text-sm text-slate-700 dark:text-slate-200">
          {children}
        </div>
      </div>
    );
  };

  /* --- logic (unchanged) --- */

  // <-- this must be defined before any state that uses it
  const allSeasons = (league.seasonsAll || []).slice().sort((a, b) => b - a); // newest first

  const [metricKey, setMetricKey] = React.useState("pointsFor");
  const [showMemberPicker, setShowMemberPicker] = React.useState(false);
  const [selectedNames, setSelectedNames] = React.useState(new Set());
  const [showYearPicker, setShowYearPicker] = React.useState(false);
  const [selectedYears, setSelectedYears] = React.useState(new Set(allSeasons));
  const [hoverI, setHoverI] = React.useState(null);

  // Year selector for the Win%-by-score table (defaults to newest season)
  // Use string so we can support "ALL"
  const [wpYear, setWpYear] = React.useState(
    String(allSeasons[0] || new Date().getFullYear())
  );
  React.useEffect(() => {
    setWpYear(String(allSeasons[0] || new Date().getFullYear()));
  }, [JSON.stringify(allSeasons)]);

  // Toggle: show graph instead of table for Win%-by-score
  const [showWpGraph, setShowWpGraph] = React.useState(false);

  React.useEffect(() => {
    setSelectedNames(new Set(visibleOwners.map(String)));
    setSelectedYears(new Set(allSeasons));
  }, [league, JSON.stringify(visibleOwners), JSON.stringify(allSeasons)]);

  const toggleName = (name) =>
    setSelectedNames((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  const toggleYear = (yr) =>
    setSelectedYears((prev) => {
      const next = new Set(prev);
      next.has(yr) ? next.delete(yr) : next.add(yr);
      return next;
    });
  const selectAllNames = () =>
    setSelectedNames(new Set((league.owners || []).map(String)));
  const clearNames = () => setSelectedNames(new Set());
  const selectAllYears = () => setSelectedYears(new Set(allSeasons));
  const clearYears = () => setSelectedYears(new Set());

  const metrics = [
    {
      key: "pointsFor",
      label: "Total Points For (PF)",
      accessor: (r) => r.pointsFor,
      better: "high",
    },
    {
      key: "pointsAgainst",
      label: "Total Points Against (PA)",
      accessor: (r) => r.pointsAgainst,
      better: "low",
    },
    { key: "wins", label: "Wins", accessor: (r) => r.wins, better: "high" },
    {
      key: "losses",
      label: "Losses",
      accessor: (r) => r.losses,
      better: "low",
    },
    {
      key: "games",
      label: "Games Played",
      accessor: (r) => r.games,
      better: "high",
    },
    {
      key: "winPct",
      label: "Win %",
      accessor: (r) => r.winPct,
      better: "high",
    },
    {
      key: "avgPF",
      label: "Avg Points For",
      accessor: (r) => r.avgPF,
      better: "high",
    },
    {
      key: "avgPA",
      label: "Avg Points Against",
      accessor: (r) => r.avgPA,
      better: "low",
    },
  ];
  const metric = metrics.find((m) => m.key === metricKey) || metrics[0];

  const filteredGames = React.useMemo(() => {
    if (!selectedYears.size) return [];
    return (league?.games || []).filter(
      (g) => selectedYears.has(Number(g.season)) && g?.is_playoff !== true
    );
  }, [league?.games, selectedYears]);

  const careerStatsFiltered = React.useMemo(() => {
    const base = new Map();
    visibleOwners.forEach((name) =>
      base.set(name, {
        id: (name || "").toLowerCase().replace(/\s+/g, "_"),
        name,
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
    filteredGames.forEach((g) => {
      const decided = g?.res === "W" || g?.res === "L";
      if (!decided) return;
      const row = base.get(g.owner);
      if (!row) return;
      row.games += 1;
      if (g.res === "W") row.wins += 1;
      else row.losses += 1;
      const pf = Number(g.pf);
      const pa = Number(g.pa);
      row.pointsFor += isNaN(pf) ? 0 : pf;
      row.pointsAgainst += isNaN(pa) ? 0 : pa;
    });
    for (const r of base.values()) {
      r.avgPF = r.games ? r.pointsFor / r.games : 0;
      r.avgPA = r.games ? r.pointsAgainst / r.games : 0;
      r.winPct = r.games ? r.wins / r.games : 0;
    }
    return Array.from(base.values());
  }, [league?.owners, filteredGames]);

  const visibleStats = careerStatsFiltered.filter((r) =>
    selectedNames.has(r.name)
  );
  const chartData = visibleStats
    .map((r) => ({ name: r.name, value: metric.accessor(r) }))
    .sort((a, b) =>
      metric.better === "high" ? b.value - a.value : a.value - b.value
    );

  /* -------- Chart: slightly wider, ticks, hover tooltip, auto-scale -------- */
  const baseW = 880; // tad wider than before
  const H = 360; // a bit taller so labels never clip
  const M = { top: 20, right: 24, bottom: 96, left: 64 };
  const innerW = Math.max(1, baseW - M.left - M.right);
  const n = Math.max(1, chartData.length);
  const barW = innerW / n;

  const values = chartData.map((d) => Number(d.value) || 0);
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const padFrac = 0.1;
  const domainMin = Math.max(0, min - (max - min) * padFrac);
  const domainMax = max + (max - min) * padFrac;
  const denom = Math.max(1e-6, domainMax - domainMin);

  const x = (i) => M.left + i * barW + barW * 0.1;
  const y = (v) =>
    M.top +
    (1 - Math.max(0, Number(v) - domainMin) / denom) * (H - M.top - M.bottom);

  // Y ticks (5 lines)
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const t = i / tickCount;
    const val = domainMin + t * (domainMax - domainMin);
    return { val, y: y(val) };
  });

  // Tooltip formatting and rough width for the pill bg
  const fmtVal = (v) => {
    if (
      metricKey === "avgPF" ||
      metricKey === "avgPA" ||
      metricKey === "winPct"
    ) {
      return metricKey === "winPct"
        ? `${(v * 100).toFixed(1)}%`
        : Number(v).toFixed(1);
    }
    return Math.round(Number(v)).toLocaleString();
  };
  const approxTextW = (s) => s.length * 8 + 12; // simple estimate

  const owners = visibleOwners;
  const avgPlacement = (name) => {
    if (!selectedYears.size) return null;
    let sum = 0,
      c = 0;
    selectedYears.forEach((yr) => {
      const p = league?.placementMap?.[name]?.[yr];
      if (p) {
        sum += p;
        c++;
      }
    });
    return c ? sum / c : null;
  };

  const rank = (arr, better = "high") => {
    const vals = arr.map((a) => a.val);
    const uniqSorted = Array.from(new Set(vals.filter((v) => v != null))).sort(
      (a, b) => (better === "high" ? b - a : a - b)
    );
    const map = new Map();
    uniqSorted.forEach((v, i) => map.set(v, i + 1));
    return arr.map((a) => ({
      name: a.name,
      r: a.val == null ? null : map.get(a.val),
    }));
  };
  const rowsForRank = careerStatsFiltered.map((r) => ({
    name: r.name,
    avgPF: r.avgPF,
    pa: r.pointsAgainst,
    winPct: r.winPct,
    avgPlace: avgPlacement(r.name) == null ? null : -avgPlacement(r.name),
  }));
  const rAvgPF = rank(
    rowsForRank.map((r) => ({ name: r.name, val: r.avgPF })),
    "high"
  );
  const rPA = rank(
    rowsForRank.map((r) => ({ name: r.name, val: -r.pa })),
    "high"
  );
  const rWin = rank(
    rowsForRank.map((r) => ({ name: r.name, val: r.winPct })),
    "high"
  );
  const rPlace = rank(
    rowsForRank.map((r) => ({ name: r.name, val: r.avgPlace })),
    "high"
  );
  const rankRow = (name) => ({
    name,
    avgPF: rAvgPF.find((x) => x.name === name)?.r ?? "—",
    pa: rPA.find((x) => x.name === name)?.r ?? "—",
    winPct: rWin.find((x) => x.name === name)?.r ?? "—",
    place: rPlace.find((x) => x.name === name)?.r ?? "—",
  });
  const rankTable = owners.map((o) => rankRow(o));

  // ---------- Win% by own scoring buckets (per manager, per season) ----------
  // Buckets: 10, 20, ..., 200 (200 means 200+)
  const bucketStops = React.useMemo(
    () => Array.from({ length: 20 }, (_, i) => (i + 1) * 10), // 10..200
    []
  );
  const bucketLabels = React.useMemo(
    () => bucketStops.map((b) => (b === 200 ? "200+" : String(b))),
    [bucketStops]
  );
  // Build per-owner rows and an overall aggregator.
  // If Year = "ALL", collapse to ONE row per owner across all seasons.
  const wpRowsAndOverall = React.useMemo(() => {
    const rows = new Map(); // key depends on isAll: owner OR `${owner}__${season}`
    const overall = {}; // stop -> {wins,games}
    const isAll = String(wpYear) === "ALL";

    const yearGames = isAll
      ? filteredGames || []
      : (filteredGames || []).filter(
          (g) => Number(g?.season) === Number(wpYear)
        );

    for (const g of yearGames) {
      const owner = g?.owner;
      const season = Number(g?.season);
      if (!owner || !Number.isFinite(season)) continue;
      if (!selectedNames.has(owner)) continue;

      const pf = Number(g?.pf);
      const res = g?.res; // 'W' / 'L'
      if (!Number.isFinite(pf) || (res !== "W" && res !== "L")) continue;

      let stop = Math.floor(pf / 10) * 10;
      if (stop < 10) stop = 10;
      if (stop > 200) stop = 200;

      // Key by OWNER when isAll; otherwise by OWNER+SEASON
      const key = isAll ? owner : `${owner}__${season}`;
      if (!rows.has(key)) {
        rows.set(key, {
          owner,
          season: isAll ? "All" : season,
          buckets: {},
        });
      }
      const row = rows.get(key);
      if (!row.buckets[stop]) row.buckets[stop] = { wins: 0, games: 0 };
      row.buckets[stop].games += 1;
      if (res === "W") row.buckets[stop].wins += 1;

      // overall aggregator (always across whatever set we're viewing)
      if (!overall[stop]) overall[stop] = { wins: 0, games: 0 };
      overall[stop].games += 1;
      if (res === "W") overall[stop].wins += 1;
    }

    const rowsSorted = Array.from(rows.values()).sort((a, b) =>
      a.owner.localeCompare(b.owner)
    );

    return {
      rows: rowsSorted, // one row per OWNER if isAll, else per owner-season
      overallBuckets: overall,
      label: isAll ? "All" : String(wpYear),
      isAll,
    };
  }, [filteredGames, selectedNames, wpYear]);

  const fmtPct0 = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

  /* --- UI --- */

  /* --- UI --- */
  return (
    <div className="space-y-6">
      <Section
        title="Career bar chart (Regular Season)"
        right={
          <div className="flex items-center gap-2">
            <select
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wider uppercase
                bg-white/95 dark:bg-zinc-900/80 border border-white/70 dark:border-white/10 text-slate-700 dark:text-slate-100
                shadow-[inset_0_1px_2px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              value={metricKey}
              onChange={(e) => setMetricKey(e.target.value)}
            >
              {metrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>

            <div className="relative">
              <SoftButton onClick={() => setShowYearPicker((v) => !v)}>
                Years <Chip className="ml-1">{selectedYears.size || 0}</Chip>
              </SoftButton>
              {showYearPicker && (
                <div
                  className="absolute right-0 z-30 mt-3 w-60 max-h-72 overflow-auto rounded-2xl border border-white/20 dark:border-white/10
                  bg-gradient-to-br from-white/95 via-white/85 to-white/75 dark:from-zinc-950/95 dark:via-zinc-950/80 dark:to-black/70
                  shadow-[0_24px_50px_-28px_rgba(59,130,246,0.55)] backdrop-blur-xl p-3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <SoftButton
                      className="!px-2.5 !py-1 text-[10px]"
                      onClick={selectAllYears}
                    >
                      Select all
                    </SoftButton>
                    <SoftButton
                      className="!px-2.5 !py-1 text-[10px]"
                      onClick={clearYears}
                    >
                      Clear
                    </SoftButton>
                  </div>
                  <div className="space-y-1">
                    {allSeasons.map((yr) => (
                      <label
                        key={yr}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium
                          bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10
                          hover:border-sky-400/50 hover:bg-sky-100/60 dark:hover:bg-sky-500/10 transition"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs accent-sky-500"
                          checked={selectedYears.has(yr)}
                          onChange={() => toggleYear(yr)}
                        />
                        <span className="truncate">{yr}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <SoftButton onClick={() => setShowMemberPicker((v) => !v)}>
                Members <Chip className="ml-1">{selectedNames.size}</Chip>
              </SoftButton>
              {showMemberPicker && (
                <div
                  className="absolute right-0 z-30 mt-3 w-72 max-h-72 overflow-auto rounded-2xl border border-white/20 dark:border-white/10
                  bg-gradient-to-br from-white/95 via-white/85 to-white/75 dark:from-zinc-950/95 dark:via-zinc-950/80 dark:to-black/70
                  shadow-[0_24px_50px_-28px_rgba(168,85,247,0.55)] backdrop-blur-xl p-3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <SoftButton
                      className="!px-2.5 !py-1 text-[10px]"
                      onClick={selectAllNames}
                    >
                      Select all
                    </SoftButton>
                    <SoftButton
                      className="!px-2.5 !py-1 text-[10px]"
                      onClick={clearNames}
                    >
                      Clear
                    </SoftButton>
                  </div>
                  <div className="space-y-1">
                    {visibleOwners.map((name) => (
                      <label
                        key={name}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium
                          bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10
                          hover:border-fuchsia-400/50 hover:bg-fuchsia-100/60 dark:hover:bg-fuchsia-500/10 transition"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs accent-fuchsia-500"
                          checked={selectedNames.has(name)}
                          onChange={() => toggleName(name)}
                        />
                        <span className="truncate">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      >
        <div className="mb-4 text-[12px] text-slate-500/90 dark:text-slate-400/90">
          Regular season only. Filtering by{" "}
          {selectedYears.size
            ? Array.from(selectedYears)
                .sort((a, b) => a - b)
                .join(", ")
            : "—"}
          .
          {selectedYears.size === 0 &&
            " (No years selected — showing empty state.)"}
        </div>

        {/* Optional: friendly “Outfit” font just for this tab */}
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&display=swap');`}</style>

        {/* Fixed width (wider), taller, with ticks + hover tooltips */}
        <svg
          width={baseW}
          height={H}
          className="mx-auto block drop-shadow-[0_18px_40px_-30px_rgba(59,130,246,0.6)]"
          style={{ fontFamily: "'Outfit', ui-sans-serif" }}
        >
          <defs>
            <linearGradient id="bar" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopOpacity="1" stopColor="#6AB1FF" />
              <stop offset="100%" stopOpacity="1" stopColor="#8BE28B" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* gridlines + y-axis */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={M.left}
                y1={t.y}
                x2={baseW - M.right}
                y2={t.y}
                stroke="#64748b22"
                strokeWidth="1"
              />
              <text
                x={M.left - 10}
                y={t.y + 4}
                fontSize="11"
                textAnchor="end"
                className="fill-white"
                style={{
                  paintOrder: "stroke",
                  stroke: "rgba(0,0,0,.35)",
                  strokeWidth: 2,
                }}
              >
                {fmtVal(t.val)}
              </text>
            </g>
          ))}
          <line
            x1={M.left}
            y1={M.top}
            x2={M.left}
            y2={H - M.bottom}
            stroke="#94a3b8"
            strokeWidth="1"
          />

          {/* bars + diagonal names + hover highlight */}
          {chartData.map((d, i) => {
            const cx = x(i) + (barW * 0.8) / 2;
            const topY = y(d.value);
            const tip = fmtVal(d.value);
            const w = approxTextW(tip);
            const tipX = Math.min(
              Math.max(cx, M.left + w / 2 + 6),
              baseW - M.right - w / 2 - 6
            );
            const tipY = Math.max(M.top + 18, topY - 12);

            const dimOthers = hoverI !== null && hoverI !== i;
            return (
              <g
                key={d.name}
                onMouseEnter={() => setHoverI(i)}
                onMouseLeave={() => setHoverI(null)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={x(i)}
                  y={topY}
                  width={barW * 0.8}
                  height={H - M.bottom - topY}
                  fill="url(#bar)"
                  rx="10"
                  filter={hoverI === i ? "url(#glow)" : undefined}
                  opacity={dimOthers ? 0.45 : 1}
                  stroke={hoverI === i ? "#ffffffaa" : "none"}
                  strokeWidth={hoverI === i ? 1.5 : 0}
                  className="transition-[transform,opacity] duration-150 will-change-transform"
                  transform={hoverI === i ? `translate(0,-2)` : undefined}
                />

                {/* diagonal name */}
                <g
                  transform={`translate(${cx}, ${
                    H - M.bottom + 30
                  }) rotate(-35)`}
                >
                  <text
                    fontSize="12"
                    textAnchor="end"
                    className="fill-white"
                    style={{
                      paintOrder: "stroke",
                      stroke: "rgba(0,0,0,.35)",
                      strokeWidth: 2,
                      opacity: dimOthers ? 0.6 : 1,
                    }}
                  >
                    {d.name}
                  </text>
                </g>

                {/* tooltip on hover */}
                {hoverI === i && (
                  <g>
                    <rect
                      x={tipX - w / 2}
                      y={tipY - 18}
                      width={w}
                      height={22}
                      rx="11"
                      fill="rgba(17,24,39,.9)"
                      stroke="rgba(255,255,255,.25)"
                    />
                    <text
                      x={tipX}
                      y={tipY - 3}
                      fontSize="12"
                      textAnchor="middle"
                      className="fill-white"
                    >
                      {tip}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </Section>

      {/* Raw career table (filtered) */}
      <Section title="Career totals (filtered)">
        <div className="overflow-x-auto">
          <div
            className="min-w-full overflow-hidden rounded-2xl border border-white/20 dark:border-white/10
            bg-white/55 dark:bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
          >
            <table className="w-full text-[13px] text-slate-700 dark:text-slate-200">
              <thead
                className="bg-gradient-to-r from-white/80 via-white/60 to-white/40 dark:from-white/10 dark:via-white/5 dark:to-white/0
                border-b border-white/40 dark:border-white/10 uppercase text-[11px] tracking-[0.25em] text-slate-600 dark:text-slate-300"
              >
                <tr>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-center">GP</th>
                  <th className="px-4 py-3 text-center">W</th>
                  <th className="px-4 py-3 text-center">L</th>
                  <th className="px-4 py-3 text-center">Win %</th>
                  <th className="px-4 py-3 text-center">PF</th>
                  <th className="px-4 py-3 text-center">PA</th>
                  <th className="px-4 py-3 text-center">Avg PF</th>
                  <th className="px-4 py-3 text-center">Avg PA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40 dark:divide-white/5">
                {careerStatsFiltered.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      idx % 2 === 0
                        ? "bg-white/65 dark:bg-white/[0.04]"
                        : "bg-white/45 dark:bg-white/[0.025]"
                    } hover:bg-sky-100/60 dark:hover:bg-sky-500/10`}
                  >
                    <td className="px-4 py-3 text-left font-semibold text-slate-800 dark:text-slate-100">
                      {r.name}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {r.games}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {r.wins}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {r.losses}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {(r.winPct * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {Math.round(r.pointsFor).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {Math.round(r.pointsAgainst).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {r.avgPF.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {r.avgPA.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Rank table (filtered) */}
      <Section title="Career ranks (filtered)">
        <div className="overflow-x-auto">
          <div
            className="min-w-full overflow-hidden rounded-2xl border border-white/20 dark:border-white/10
            bg-white/55 dark:bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
          >
            <table className="w-full text-[13px] text-slate-700 dark:text-slate-200">
              <thead
                className="bg-gradient-to-r from-white/80 via-white/60 to-white/40 dark:from-white/10 dark:via-white/5 dark:to-white/0
                border-b border-white/40 dark:border-white/10 uppercase text-[11px] tracking-[0.25em] text-slate-600 dark:text-slate-300"
              >
                <tr>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-center">Rank: Avg PF</th>
                  <th className="px-4 py-3 text-center">
                    Rank: PA (lower better)
                  </th>
                  <th className="px-4 py-3 text-center">Rank: Win %</th>
                  <th className="px-4 py-3 text-center">
                    Rank: Placement (avg)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40 dark:divide-white/5">
                {rankTable.map((r, idx) => (
                  <tr
                    key={r.name}
                    className={`transition-colors ${
                      idx % 2 === 0
                        ? "bg-white/65 dark:bg-white/[0.04]"
                        : "bg-white/45 dark:bg-white/[0.025]"
                    } hover:bg-violet-100/50 dark:hover:bg-violet-500/10`}
                  >
                    <td className="px-4 py-3 text-left font-semibold text-slate-800 dark:text-slate-100">
                      {r.name}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {r.avgPF}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {r.pa}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {r.winPct}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {r.place}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* NEW: Win % by scoring bucket (per season) */}
      <Section
        title="Win % by own points scored"
        right={
          <div className="flex flex-wrap items-center justify-end gap-3 text-right">
            <div className="max-w-[240px] text-[11px] uppercase tracking-[0.25em] text-slate-500/80 dark:text-slate-400/80">
              Regular season only. Buckets = score floored to nearest 10 (10,
              20, …, 200+).
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase text-slate-600 dark:text-slate-300">
              <span>Year:</span>
              <select
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wider uppercase
                  bg-white/95 dark:bg-zinc-900/80 border border-white/70 dark:border-white/10 text-slate-700 dark:text-slate-100
                  shadow-[inset_0_1px_2px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                value={wpYear}
                onChange={(e) => setWpYear(e.target.value)}
              >
                <option value="ALL">All</option>
                {allSeasons.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
            <SoftButton
              className="!px-3 !py-1.5 text-[10px]"
              onClick={() => setShowWpGraph((v) => !v)}
            >
              {showWpGraph ? "Show table" : "Show graph"}
            </SoftButton>
          </div>
        }
      >
        {/* Toggle: Graph vs Table */}
        {showWpGraph ? (
          // ---- GRAPH VIEW (overall line = all selected managers) ----
          (() => {
            const W = 920,
              H = 320;
            const M = { top: 16, right: 20, bottom: 40, left: 48 };
            const innerW = W - M.left - M.right;
            const innerH = H - M.top - M.bottom;

            const xPos = (i) =>
              M.left + (i / (bucketStops.length - 1)) * innerW;

            const yPos = (p) => {
              const v = Math.max(0, Math.min(1, Number(p) || 0));
              return M.top + (1 - v) * innerH;
            };

            const pts = bucketStops.map((stop, i) => {
              const cell = wpRowsAndOverall.overallBuckets[stop];
              const pct =
                cell && cell.games > 0 ? cell.wins / cell.games : null;
              return { i, stop, pct, games: cell?.games || 0 };
            });

            let d = "";
            let started = false;
            pts.forEach((p) => {
              if (p.pct == null) return;
              const X = xPos(p.i);
              const Y = yPos(p.pct);
              d += started ? ` L ${X} ${Y}` : `M ${X} ${Y}`;
              started = true;
            });

            return (
              <svg width={W} height={H} className="block">
                {/* axes */}
                <line
                  x1={M.left}
                  y1={M.top}
                  x2={M.left}
                  y2={H - M.bottom}
                  stroke="#94a3b8"
                />
                <line
                  x1={M.left}
                  y1={H - M.bottom}
                  x2={W - M.right}
                  y2={H - M.bottom}
                  stroke="#94a3b8"
                />
                {/* y grid (0..100%) */}
                {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                  <g key={v}>
                    <line
                      x1={M.left}
                      x2={W - M.right}
                      y1={yPos(v)}
                      y2={yPos(v)}
                      stroke="#64748b22"
                    />
                    <text
                      x={M.left - 8}
                      y={yPos(v) + 4}
                      textAnchor="end"
                      fontSize="11"
                      className="fill-white"
                    >
                      {Math.round(v * 100)}%
                    </text>
                  </g>
                ))}
                {/* x labels every 20 points */}
                {bucketStops.map((stop, i) =>
                  stop % 20 === 0 ? (
                    <text
                      key={stop}
                      x={xPos(i)}
                      y={H - M.bottom + 16}
                      fontSize="11"
                      textAnchor="middle"
                      className="fill-white"
                    >
                      {stop === 200 ? "200+" : stop}
                    </text>
                  ) : null
                )}

                {/* line + dots */}
                <path d={d} fill="none" stroke="url(#bar)" strokeWidth="2.5" />
                {pts.map((p) =>
                  p.pct == null ? null : (
                    <circle
                      key={p.stop}
                      cx={xPos(p.i)}
                      cy={yPos(p.pct)}
                      r="3.5"
                      fill="#8BE28B"
                    />
                  )
                )}

                {/* caption */}
                <text
                  x={W - M.right}
                  y={M.top + 12}
                  textAnchor="end"
                  fontSize="12"
                  className="fill-white"
                >
                  {`Overall — ${wpRowsAndOverall.label}`}
                </text>
              </svg>
            );
          })()
        ) : (
          // ---- TABLE VIEW ----
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/70 dark:bg-zinc-800/70 sticky top-0 backdrop-blur border-b border-zinc-200/60 dark:border-zinc-700/60">
                <tr>
                  <th className="px-2 py-2 text-left">Member</th>
                  <th className="px-2 py-2 text-center">Season</th>
                  {bucketLabels.map((lbl) => (
                    <th key={lbl} className="px-2 py-2 text-center">
                      {lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(odd)]:bg-zinc-50/60 dark:[&>tr:nth-child(odd)]:bg-white/[.03] [&>tr:hover]:bg-white/80 dark:[&>tr:hover]:bg-zinc-800/70 transition">
                {/* Summary row first */}
                <tr className="border-b border-zinc-200/40 dark:border-zinc-700/40 bg-white/60 dark:bg-zinc-800/50">
                  <td className="px-2 py-1 font-semibold text-left whitespace-nowrap">
                    All managers
                  </td>
                  <td className="px-2 py-1 text-center">
                    {wpRowsAndOverall.label}
                  </td>
                  {bucketStops.map((stop) => {
                    const cell = wpRowsAndOverall.overallBuckets[stop];
                    const pct =
                      cell && cell.games > 0 ? cell.wins / cell.games : null;
                    return (
                      <td
                        key={stop}
                        className="px-2 py-1 text-center tabular-nums"
                        title={
                          cell
                            ? `${cell.wins}-${
                                cell.games - cell.wins
                              } (${Math.round((pct || 0) * 100)}%)`
                            : ""
                        }
                      >
                        {fmtPct0(pct)}
                      </td>
                    );
                  })}
                </tr>

                {/* Per-owner rows */}
                {wpRowsAndOverall.rows.map((row) => (
                  <tr
                    key={`${row.owner}-${row.season}`}
                    className="border-b border-zinc-200/40 dark:border-zinc-700/40"
                  >
                    <td className="px-2 py-1 font-medium text-left whitespace-nowrap">
                      {row.owner}
                    </td>
                    <td className="px-2 py-1 text-center">{row.season}</td>
                    {bucketStops.map((stop) => {
                      const cell = row.buckets[stop];
                      const pct =
                        cell && cell.games > 0 ? cell.wins / cell.games : null;
                      return (
                        <td
                          key={stop}
                          className="px-2 py-1 text-center tabular-nums"
                          title={
                            cell
                              ? `${cell.wins}-${
                                  cell.games - cell.wins
                                } (${Math.round((pct || 0) * 100)}%)`
                              : ""
                          }
                        >
                          {fmtPct0(pct)}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {wpRowsAndOverall.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={2 + bucketStops.length}
                      className="px-3 py-6 text-center text-zinc-500"
                    >
                      No games for {wpRowsAndOverall.label} in the current
                      filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// H2HTab.jsx — regular season only (ignores ties)
export function H2HTab({ league }) {
  if (!league) return null;

  const hidden = new Set(league.hiddenManagers || []); // ← NEW
  const owners = (league.owners || []).filter((n) => !hidden.has(n)); // ← NEW

  // Scope filter: REG = regular season, PO = playoffs, ALL = both
  const [seg, setSeg] = React.useState("REG");
  const segLabel = React.useMemo(
    () => ({ REG: "Regular season", PO: "Playoffs", ALL: "All games" }),
    []
  );

  // Filtered, completed games (ties ignored)
  const gamesFiltered = React.useMemo(
    () =>
      (league.games || []).filter((g) => {
        if (!(g.res === "W" || g.res === "L")) return false; // ignore ties/unfinished
        if (seg === "REG") return g.is_playoff !== true;
        if (seg === "PO") return g.is_playoff === true;
        return true; // ALL
      }),
    [league.games, seg]
  );

  // helper to pick the first finite numeric candidate
  const pickNum = (...vals) => {
    for (const v of vals) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  // Popup state for clicked pair
  const [detailPair, setDetailPair] = React.useState(null); // {a, b} or null
  // track hovered row/col
  const [hover, setHover] = React.useState({ row: null, col: null });
  const clearHover = () => setHover({ row: null, col: null });

  const Chip = ({ children, className = "" }) => (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-[0.22em] uppercase
        bg-gradient-to-r from-amber-300/70 via-amber-200/50 to-amber-100/70 text-amber-700
        dark:from-amber-500/30 dark:via-amber-400/20 dark:to-amber-500/30 dark:text-amber-200
        border border-amber-400/40 shadow-[0_6px_18px_-12px_rgba(251,191,36,0.8)] backdrop-blur-sm ${className}`}
    >
      {children}
    </span>
  );

  const SoftButton = ({
    children,
    onClick,
    active = false,
    className = "",
  }) => (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.28em] uppercase transition-all duration-200 ease-out
        ${
          active
            ? "bg-gradient-to-r from-white/95 via-amber-100/80 to-white/95 text-amber-900 border border-amber-400/60 shadow-[0_24px_55px_-24px_rgba(251,191,36,0.75)]"
            : "text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-zinc-900/60 border border-white/60 dark:border-white/10 hover:border-amber-300/60 hover:text-amber-400"
        }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 backdrop-blur ${className}`}
      type="button"
    >
      <span className="tracking-[0.32em]">{children}</span>
    </button>
  );

  // Build list of games per (owner A, owner B) from the filtered games
  const pairGames = React.useMemo(() => {
    const m = new Map(); // key: "A__B" -> array of games from A's perspective
    const keyOf = (a, b) => `${a}__${b}`;

    for (const g of gamesFiltered || []) {
      const a = g?.owner;
      const b = g?.opp;
      if (!a || !b) continue;
      if (hidden.has(a) || hidden.has(b)) continue; // ← NEW: don’t record pairs that involve hidden owners

      const ownerPts = pickNum(
        g.pf,
        g.points_for,
        g.points,
        g.score,
        g.owner_points,
        g.pts,
        g.fpts
      );
      const oppPts = pickNum(
        g.pa,
        g.points_against,
        g.opp_points,
        g.oppPts,
        g.against,
        g.opp_score
      );

      const rec = {
        res: (g?.res || "").toUpperCase(), // 'W' | 'L'
        a,
        b,
        aPts: ownerPts,
        bPts: oppPts,
        week: Number(g?.week) || null,
        year: Number(g?.season) || null,
      };

      const k = keyOf(a, b);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(rec);
    }

    // Sort each list by (year asc, week asc)
    for (const arr of m.values()) {
      arr.sort(
        (x, y) => (x.year ?? 0) - (y.year ?? 0) || (x.week ?? 0) - (y.week ?? 0)
      );
    }
    return m;
  }, [gamesFiltered, league.hiddenManagers]); // ← NEW dep

  // Win/Loss tallies per pair
  const wl = React.useMemo(() => {
    const map = {};
    owners.forEach((a) => {
      map[a] = {};
      owners.forEach((b) => (map[a][b] = { w: 0, l: 0 }));
    });

    gamesFiltered.forEach((g) => {
      if (!map[g.owner] || !map[g.owner][g.opp]) return;
      if (g.res === "W") map[g.owner][g.opp].w += 1;
      else if (g.res === "L") map[g.owner][g.opp].l += 1;
    });

    return map;
  }, [owners, gamesFiltered]);

  // Matrix: "w-l"
  const matrix = React.useMemo(() => {
    const out = {};
    owners.forEach((a) => {
      out[a] = {};
      owners.forEach((b) => {
        const v = wl[a][b];
        out[a][b] = `${v.w}-${v.l}`;
      });
    });
    return out;
  }, [owners, wl]);

  // Best / Worst (based on win %; needs at least 1 game)
  const bestWorst = React.useMemo(() => {
    const out = {};
    owners.forEach((a) => {
      let best = { opp: null, w: 0, l: 0, pct: -1 };
      let worst = { opp: null, w: 0, l: 0, pct: 2 };
      owners.forEach((b) => {
        if (a === b) return;
        const v = wl[a][b];
        const total = v.w + v.l;
        if (!total) return;
        const pct = v.w / total;
        if (pct > best.pct) best = { opp: b, w: v.w, l: v.l, pct };
        if (pct < worst.pct) worst = { opp: b, w: v.w, l: v.l, pct };
      });
      out[a] = best.opp
        ? { best, worst }
        : {
            best: { opp: null, w: 0, l: 0, pct: 0 },
            worst: { opp: null, w: 0, l: 0, pct: 0 },
          };
    });
    return out;
  }, [owners, wl]);

  // --- UI (keep your existing table components/styles) ---
  return (
    <div className="space-y-6">
      <Card
        title="Head-to-Head"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Chip>Scope</Chip>
            <div className="flex items-center gap-1">
              {[
                { key: "REG", label: "Regular" },
                { key: "PO", label: "Playoffs" },
                { key: "ALL", label: "All games" },
              ].map(({ key, label }) => (
                <SoftButton
                  key={key}
                  active={seg === key}
                  onClick={() => setSeg(key)}
                  className="min-w-[92px] justify-center"
                >
                  {label}
                </SoftButton>
              ))}
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500/90 dark:text-slate-400/90 mb-3">
          <Chip>{segLabel[seg]}</Chip>
        </div>

        {/* Matrix */}
        <div
          className="relative overflow-hidden rounded-2xl border border-white/25 dark:border-white/10 bg-white/75 dark:bg-zinc-950/50 shadow-[0_30px_65px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl"
          onMouseLeave={clearHover}
        >
          <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(120%_140%_at_100%_100%,rgba(16,185,129,0.14),transparent_60%)]" />
          <div className="relative overflow-auto">
            <table className="min-w-[700px] w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">Owner</th>
                  {owners.map((b) => (
                    <th
                      key={b}
                      className={`px-3 py-2 text-center transition-all duration-150 ${
                        hover.col === b
                          ? "bg-white/80 dark:bg-white/10 text-slate-900 dark:text-white"
                          : ""
                      }`}
                      onMouseEnter={() => setHover((h) => ({ ...h, col: b }))}
                      onMouseLeave={clearHover}
                    >
                      {b}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40 dark:divide-white/10">
                {owners.map((a) => (
                  <tr key={a}>
                    <td
                      className={`px-3 py-2 font-medium transition-all duration-150 ${
                        hover.row === a
                          ? "bg-white/80 dark:bg-white/10 text-slate-900 dark:text-white"
                          : ""
                      }`}
                      onMouseEnter={() => setHover((h) => ({ ...h, row: a }))}
                      onMouseLeave={clearHover}
                    >
                      {a}
                    </td>
                    {owners.map((b) => {
                      const key = `${a}__${b}`;
                      const hasGames =
                        a !== b && (pairGames.get(key)?.length || 0) > 0;
                      const isHilited = hover.row === a || hover.col === b;
                      return (
                        <td
                          key={b}
                          className={`px-3 py-2 text-center transition-all duration-150 ease-out ${
                            isHilited
                              ? "bg-white/80 dark:bg-white/10 text-slate-900 dark:text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
                              : hasGames
                              ? "hover:bg-white/70 dark:hover:bg-white/10 hover:shadow-[0_16px_40px_-30px_rgba(59,130,246,0.75)] cursor-pointer"
                              : "text-slate-400 dark:text-slate-600"
                          }`}
                          onMouseEnter={() => setHover({ row: a, col: b })}
                          onMouseLeave={clearHover}
                          onClick={() => {
                            if (hasGames) setDetailPair({ a, b });
                          }}
                          title={hasGames ? `View ${a} vs ${b}` : ""}
                        >
                          {a === b ? "—" : matrix[a][b]}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
      {/* Matchup detail modal */}
      {detailPair &&
        (() => {
          const key = `${detailPair.a}__${detailPair.b}`;
          const list = pairGames.get(key) || [];
          const totals = list.reduce(
            (acc, g) => {
              if (g.res === "W") acc.w += 1;
              else if (g.res === "L") acc.l += 1;
              return acc;
            },
            { w: 0, l: 0 }
          );
          const fmtPts = (v) =>
            Number.isFinite(Number(v)) ? Number(v).toFixed(1) : "—";

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                onClick={() => setDetailPair(null)}
              />
              <div className="relative w-[min(880px,92vw)] max-h-[85vh] overflow-hidden rounded-3xl border border-white/25 dark:border-white/10 bg-white/90 dark:bg-zinc-950/85 shadow-[0_40px_90px_-45px_rgba(15,23,42,0.95)] backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(110%_130%_at_0%_0%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(120%_140%_at_100%_100%,rgba(16,185,129,0.18),transparent_60%)]" />
                <div className="relative">
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/50 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
                    <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700 dark:text-slate-100">
                      {detailPair.a} vs {detailPair.b}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-300">
                      <Chip>{segLabel[seg]}</Chip>
                      <span className="tabular-nums text-slate-600 dark:text-slate-200">
                        {totals.w}-{totals.l}
                      </span>
                      <SoftButton onClick={() => setDetailPair(null)}>
                        Close
                      </SoftButton>
                    </div>
                  </div>

                  <div
                    className="p-4 overflow-y-auto text-sm text-slate-700 dark:text-slate-200"
                    style={{ maxHeight: "calc(85vh - 64px)" }}
                  >
                    {list.length ? (
                      <table className="w-full text-sm">
                        <thead className="text-xs uppercase opacity-60">
                          <tr className="border-b border-zinc-200 dark:border-zinc-800">
                            <th className="text-left px-2 py-1 w-[52px]">
                              W/L
                            </th>
                            <th className="text-left px-2 py-1">Owner</th>
                            <th className="text-right px-2 py-1 w-[90px]">
                              {detailPair.a} Pts
                            </th>
                            <th className="text-center px-2 py-1 w-[40px]">
                              vs
                            </th>
                            <th className="text-left px-2 py-1">
                              Opponent (W/L)
                            </th>
                            <th className="text-right px-2 py-1 w-[90px]">
                              {detailPair.b} Pts
                            </th>
                            <th className="text-right px-2 py-1 w-[64px]">
                              Week
                            </th>
                            <th className="text-right px-2 py-1 w-[64px]">
                              Year
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/30 dark:divide-white/10">
                          {list.map((g, i) => (
                            <tr
                              key={i}
                              className="transition-colors duration-150 ease-out hover:bg-white/70 dark:hover:bg-white/10"
                            >
                              <td className="px-2 py-1 font-semibold">
                                <span
                                  className={
                                    g.res === "W"
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  }
                                >
                                  {g.res}
                                </span>
                              </td>
                              <td className="px-2 py-1">{g.a}</td>
                              <td className="px-2 py-1 text-right tabular-nums">
                                {fmtPts(g.aPts)}
                              </td>
                              <td className="px-2 py-1 text-center">v</td>
                              <td className="px-2 py-1">
                                <span
                                  className={
                                    g.res === "W"
                                      ? "mr-1 font-semibold text-red-600 dark:text-red-400"
                                      : "mr-1 font-semibold text-green-600 dark:text-green-400"
                                  }
                                  title={
                                    g.res === "W"
                                      ? "Opponent loss"
                                      : "Opponent win"
                                  }
                                >
                                  {g.res === "W" ? "L" : "W"}
                                </span>
                                {g.b}
                              </td>
                              <td className="px-2 py-1 text-right tabular-nums">
                                {fmtPts(g.bPts)}
                              </td>
                              <td className="px-2 py-1 text-right">
                                {g.week ?? "—"}
                              </td>
                              <td className="px-2 py-1 text-right">
                                {g.year ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-sm opacity-70 px-2 py-3">
                        No games found.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div> // <<< this is the missing closing </div> for the outer overlay container
          );
        })()}

      {/* Best / Worst opponents */}
      <Card title="Best / Worst Opponents">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500/90 dark:text-slate-400/90 mb-4">
          <Chip>{segLabel[seg]}</Chip>
          <span className="uppercase tracking-[0.22em] text-[10px] text-slate-400 dark:text-slate-500">
            Lifetime records • ties ignored
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {owners.map((o) => {
            const bw = bestWorst[o] || {};
            const fmt = (x) =>
              x?.opp
                ? `${x.opp} (${x.w}-${x.l}, ${(x.pct * 100).toFixed(1)}%)`
                : "—";
            const OutcomeBadge = ({ tone, children }) => (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.28em]
                  border backdrop-blur-sm
                  ${
                    tone === "good"
                      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/40"
                      : "bg-rose-500/15 text-rose-200 border-rose-400/40"
                  }
                `}
              >
                {children}
              </span>
            );

            return (
              <div
                key={o}
                className="group relative overflow-hidden rounded-2xl border border-white/25 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.9)] backdrop-blur-xl p-4"
              >
                <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(120%_140%_at_100%_100%,rgba(139,92,246,0.14),transparent_60%)]" />
                <div className="relative space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-semibold text-slate-800 dark:text-slate-100">
                      {o}
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                      {segLabel[seg]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[12px] text-slate-600 dark:text-slate-300">
                    <OutcomeBadge tone="good">Best</OutcomeBadge>
                    <span className="font-medium text-slate-700 dark:text-slate-100">
                      {fmt(bw.best)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[12px] text-slate-600 dark:text-slate-300">
                    <OutcomeBadge tone="bad">Worst</OutcomeBadge>
                    <span className="font-medium text-slate-700 dark:text-slate-100">
                      {fmt(bw.worst)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
/* PlacementsTab ------------------------------------------------------------------ */
export function PlacementsTab({
  league,
  playoffTeamsBase = {}, // ESPN-scraped counts (2018+)
  playoffTeamsOverrides = {}, // manual overrides
  onSavePlayoffOverrides, // saver from App
}) {
  if (!league) return null;

  const SoftButton = ({
    children,
    className = "",
    disabled = false,
    ...props
  }) => (
    <button
      type="button"
      disabled={disabled}
      {...props}
      className={`group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]
        text-slate-700 dark:text-slate-200
        bg-gradient-to-r from-white/95 via-white/80 to-white/90 dark:from-zinc-900/80 dark:via-zinc-900/55 dark:to-zinc-950/70
        border border-white/70 dark:border-white/10 shadow-[0_18px_40px_-28px_rgba(30,41,59,0.85)] backdrop-blur transition-all duration-200
        ease-out hover:-translate-y-0.5 hover:shadow-[0_22px_52px_-28px_rgba(59,130,246,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70
        ${
          disabled
            ? "opacity-40 cursor-not-allowed hover:translate-y-0 hover:shadow-none"
            : ""
        }
        ${className}`}
    >
      <span className="tracking-[0.32em]">{children}</span>
    </button>
  );

  const hiddenManagersSet = React.useMemo(() => {
    const list = Array.isArray(league?.hiddenManagers)
      ? league.hiddenManagers
      : [];
    return new Set(list);
  }, [league?.hiddenManagers]);

  const owners = React.useMemo(
    () => (league.owners || []).filter((name) => !hiddenManagersSet.has(name)),
    [league?.owners, hiddenManagersSet]
  );
  const seasons = league.seasonsAll || [];
  // Everyone who has any placement data (used for totals + “last place” math).
  const allOwnersForPlacements = React.useMemo(() => {
    const pm = league?.placementMap;
    if (!pm || typeof pm !== "object") return [];
    return Object.keys(pm).filter((name) => !hiddenManagersSet.has(name));
  }, [league?.placementMap, hiddenManagersSet]);
  const maxPlaceBySeason = React.useMemo(() => {
    const out = {};
    (seasons || []).forEach((yr) => {
      let max = 0;
      (allOwnersForPlacements || []).forEach((m) => {
        const p = Number(league?.placementMap?.[m]?.[yr]);
        if (Number.isFinite(p) && p > max) max = p;
      });
      out[yr] = max || 0;
    });
    return out;
  }, [seasons, allOwnersForPlacements, league?.placementMap]);
  // compute the global worst finishing position seen across seasons
  const globalMaxPlace = React.useMemo(() => {
    const vals = Object.values(maxPlaceBySeason || {});
    const m = Math.max(0, ...vals);
    return m || 12; // fallback to 12 if empty
  }, [maxPlaceBySeason]);

  // build Y-axis ticks: globalMaxPlace .. 1 (descending so 12, 11, ... 1)
  const yTicks = React.useMemo(() => {
    const max = Number(globalMaxPlace || 12);
    return Array.from({ length: max }, (_, i) => max - i);
  }, [globalMaxPlace]);

  /* NEW: sorting for the placements grid */
  const [gridSort, setGridSort] = React.useState({ key: "member", dir: "asc" });
  const toggleGrid = (key) =>
    setGridSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  const sortArrow = (state, key) =>
    state.key !== key ? "↕" : state.dir === "asc" ? "▲" : "▼";

  const ownersSorted = React.useMemo(() => {
    const arr = [...owners];
    const k = gridSort.key;
    const dir = gridSort.dir === "asc" ? 1 : -1;

    const getYearPlace = (name, year) => {
      const v = league?.placementMap?.[name]?.[year];
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    arr.sort((a, b) => {
      if (k === "member") return dir * a.localeCompare(b);

      // year column sort
      const ya = getYearPlace(a, k);
      const yb = getYearPlace(b, k);

      const aa = ya ?? (gridSort.dir === "asc" ? Infinity : -Infinity);
      const bb = yb ?? (gridSort.dir === "asc" ? Infinity : -Infinity);

      // Make sure we return a number
      if (aa === bb) return dir * a.localeCompare(b);
      return dir * (aa - bb);
    });

    return arr;
  }, [owners, gridSort, league?.placementMap]);

  // Merged playoff-team counts (override wins)
  const mergedPlayoffTeams = React.useMemo(() => {
    const out = {};
    (seasons || []).forEach((yr) => {
      const base = Number(playoffTeamsBase?.[yr] ?? 0) || 0;
      const ovrd = Number(playoffTeamsOverrides?.[yr] ?? 0) || 0;
      out[yr] = ovrd || base || 0;
    });
    return out;
  }, [seasons, playoffTeamsBase, playoffTeamsOverrides]);
  const [showPlayoffInputs, setShowPlayoffInputs] = React.useState(false);

  // Local editor state for the override inputs
  const [edit, setEdit] = React.useState(playoffTeamsOverrides || {});
  React.useEffect(
    () => setEdit(playoffTeamsOverrides || {}),
    [playoffTeamsOverrides]
  );
  const setYr = (yr, val) => {
    const n = Math.max(0, Math.round(Number(val) || 0));
    setEdit((p) => ({ ...p, [yr]: n }));
  };
  const commit = () => {
    if (onSavePlayoffOverrides) onSavePlayoffOverrides(edit);
  };

  const summary = owners.map((m) => {
    let total = 0;
    let count = 0;
    let firsts = 0;
    let top3 = 0;
    let lasts = 0;
    let playoffs = 0;

    seasons.forEach((yr) => {
      const p = league.placementMap?.[m]?.[yr];
      if (p) {
        total += p;
        count += 1;
        if (p === 1) firsts += 1;
        if (p <= 3) top3 += 1;

        /* NEW: "last" = equals the worst actual finish for that season */
        const worst = Number(maxPlaceBySeason?.[yr] || 0);
        if (Number(p) === worst && worst > 0) lasts += 1;

        // Playoff appearance = placement <= playoff-team-count for that season
        const poCnt = Number(mergedPlayoffTeams?.[yr] || 0);
        if (poCnt > 0 && p <= poCnt) playoffs += 1;
      }
    });

    const avg = count ? total / count : 0;
    return { member: m, avg, firsts, top3, playoffs, lasts, count };
  });
  // sorting for the summary table
  const [sumSort, setSumSort] = React.useState({ key: "avg", dir: "asc" });
  const toggleSummary = (key) =>
    setSumSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));

  const summarySorted = React.useMemo(() => {
    const arr = [...summary];
    const dir = sumSort.dir === "asc" ? 1 : -1;
    const k = sumSort.key;

    arr.sort((a, b) => {
      if (k === "member") return dir * a.member.localeCompare(b.member);
      const av = Number(a[k]);
      const bv = Number(b[k]);
      const aa = Number.isFinite(av)
        ? av
        : sumSort.dir === "asc"
        ? Infinity
        : -Infinity;
      const bb = Number.isFinite(bv)
        ? bv
        : sumSort.dir === "asc"
        ? Infinity
        : -Infinity;
      return dir * (aa - bb);
    });

    return arr;
  }, [summary, sumSort]);

  const heroTiles = React.useMemo(() => {
    if (!summary.length) return [];

    const playable = summary.filter((s) => (s?.count || 0) > 0);
    const bestAvg = playable
      .filter((s) => Number.isFinite(s.avg) && s.avg > 0)
      .sort((a, b) => a.avg - b.avg)[0];
    const mostTitles = [...summary].sort(
      (a, b) => b.firsts - a.firsts || a.avg - b.avg
    )[0];
    const bestPlayoff = playable
      .map((s) => ({
        ...s,
        rate: s.count > 0 ? s.playoffs / s.count : 0,
      }))
      .sort((a, b) => b.rate - a.rate || a.avg - b.avg)[0];

    const tiles = [];
    if (bestAvg) {
      tiles.push({
        id: "avg",
        label: "Best Average Finish",
        owner: bestAvg.member,
        value: bestAvg.avg.toFixed(2),
        detail: `${bestAvg.count} season${bestAvg.count === 1 ? "" : "s"}`,
        accent:
          "from-amber-200/80 via-orange-200/70 to-rose-200/60 border-amber-300/70 shadow-[0_25px_60px_-35px_rgba(245,158,11,0.75)] text-amber-900 dark:text-amber-100",
        textGradient: "from-amber-500 via-orange-500 to-rose-500",
      });
    }
    if (mostTitles) {
      tiles.push({
        id: "titles",
        label: "Most Championships",
        owner: mostTitles.member,
        value: `${mostTitles.firsts}x`,
        detail:
          mostTitles.firsts === 1
            ? "Title secured"
            : `${mostTitles.firsts} trophies earned`,
        accent:
          "from-sky-200/80 via-indigo-200/70 to-purple-200/60 border-sky-300/60 shadow-[0_25px_60px_-35px_rgba(96,165,250,0.7)] text-slate-800 dark:text-slate-100",
        textGradient: "from-sky-500 via-blue-500 to-indigo-500",
      });
    }
    if (bestPlayoff) {
      const pct = Math.round((bestPlayoff.rate || 0) * 100);
      tiles.push({
        id: "playoffs",
        label: "Playoff Rate Leader",
        owner: bestPlayoff.member,
        value: `${pct}%`,
        detail: `${bestPlayoff.playoffs} of ${bestPlayoff.count} seasons`,
        accent:
          "from-emerald-200/80 via-teal-200/70 to-cyan-200/60 border-emerald-300/60 shadow-[0_25px_60px_-35px_rgba(16,185,129,0.7)] text-emerald-900 dark:text-emerald-100",
        textGradient: "from-emerald-500 via-teal-500 to-cyan-500",
      });
    }
    return tiles;
  }, [summary]);
  const ordinalSafe = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return "";
    if (x % 100 >= 11 && x % 100 <= 13) return `${x}th`;
    switch (x % 10) {
      case 1:
        return `${x}st`;
      case 2:
        return `${x}nd`;
      case 3:
        return `${x}rd`;
      default:
        return `${x}th`;
    }
  };
  // ============================================================
  // Placements line chart prep
  // ============================================================

  // Small emoji fallback for medals (uses emojis if TROPHIES images aren’t handy)
  const medalFor = (place) =>
    place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : null;

  // Build a tidy series per owner: [{ year, owner, place }]
  const seriesByOwner = React.useMemo(() => {
    const out = new Map(); // owner -> [{year, place}]
    (owners || []).forEach((o) => out.set(o, []));
    (seasons || []).forEach((yr) => {
      (owners || []).forEach((o) => {
        const p = Number(league?.placementMap?.[o]?.[yr] ?? NaN);
        out.get(o).push({ year: yr, place: Number.isFinite(p) ? p : null });
      });
    });
    return out; // Map(owner -> array)
  }, [owners, seasons, league?.placementMap]);
  // Years that actually have final placements (exclude empty/in-progress years)
  // Years that actually have final placements (must be exactly 1..N with no gaps)
  const seasonsChart = React.useMemo(() => {
    const out = [];
    for (const yr of seasons || []) {
      // collect all numeric placements for this year
      const places = (allOwnersForPlacements || [])
        .map((o) => Number(league?.placementMap?.[o]?.[yr]))
        .filter((p) => Number.isFinite(p) && p > 0);

      if (places.length === 0) continue;

      const max = Math.max(...places);
      const min = Math.min(...places);

      // Completed if we have exactly one of each rank 1..max (no gaps/dupes)
      const set = new Set(places);
      const looksComplete =
        min === 1 && set.size === max && places.length === max;

      if (looksComplete) out.push(yr);
    }
    return out;
  }, [seasons, allOwnersForPlacements, league?.placementMap]);

  const chartRows = React.useMemo(() => {
    return (seasonsChart || []).map((yr) => {
      const row = { year: yr };
      (owners || []).forEach((o) => {
        const p = Number(league?.placementMap?.[o]?.[yr] ?? NaN);
        row[o] = Number.isFinite(p) ? p : null;
      });
      return row;
    });
  }, [owners, seasonsChart, league?.placementMap]);

  // Visible owners (toggle via checkboxes)
  const [visibleOwners, setVisibleOwners] = React.useState(
    () => new Set(owners || [])
  );
  React.useEffect(() => {
    setVisibleOwners((prev) => {
      const next = new Set();
      (owners || []).forEach((o) => prev.has(o) && next.add(o));
      if (next.size === 0 && (owners || []).length)
        (owners || []).forEach((o) => next.add(o));
      return next;
    });
  }, [owners]);

  const toggleOwnerVisible = (o) => {
    setVisibleOwners((prev) => {
      const n = new Set(prev);
      if (n.has(o)) n.delete(o);
      else n.add(o);
      return n;
    });
  };
  const selectAllOwners = () => setVisibleOwners(new Set(owners || []));
  const clearAllOwners = () => setVisibleOwners(new Set());

  // Axis domain: 1 is best; worst = max placement in any season
  const worstOverall = React.useMemo(() => {
    let max = 0;
    (seasons || []).forEach((yr) => {
      const w = Number(maxPlaceBySeason?.[yr] || 0);
      if (w > max) max = w;
    });
    return max || 12; // fallback
  }, [seasons, maxPlaceBySeason]);

  // “Playoff line” per season (uses override if present, else ESPN base, else 0)
  const playoffBySeason = React.useMemo(() => {
    const out = {};
    (seasons || []).forEach((yr) => {
      out[yr] = Number(mergedPlayoffTeams?.[yr] || 0);
    });
    return out;
  }, [seasons, mergedPlayoffTeams]);

  // Simple color palette for lines
  const COLORS = [
    "#8ab4f8",
    "#f28b82",
    "#fdd663",
    "#81c995",
    "#d7aefb",
    "#78d9ec",
    "#fbbc04",
    "#34a853",
    "#e8710a",
    "#a142f4",
    "#46bdc6",
    "#ea4335",
  ];
  const colorFor = (idx) => COLORS[idx % COLORS.length];
  // Always show full range 1..12 on the Y-axis
  const Y_TICKS = React.useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1),
    []
  );

  // add these:
  const ownerIndex = React.useCallback(
    (o) => (owners || []).indexOf(o),
    [owners]
  );

  const ownerColor = React.useCallback(
    (o) => colorFor(Math.max(0, ownerIndex(o))),
    [ownerIndex]
  );

  const MedalDot = ({ cx, cy, value }) => {
    if (value == null) return null;
    const medal = medalFor(Number(value));
    if (medal) {
      return (
        <text x={cx} y={cy} dy={6} textAnchor="middle" fontSize={24}>
          {medal}
        </text>
      );
    }
    return <circle cx={cx} cy={cy} r={3} fill="currentColor" opacity="0.9" />;
  };

  return (
    <div className="space-y-6">
      {heroTiles.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {heroTiles.map((tile) => (
            <div
              key={tile.id}
              className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${tile.accent}
                px-5 py-6 md:px-6 md:py-7 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.8)] backdrop-blur-xl`}
            >
              <div className="pointer-events-none absolute inset-0 opacity-80">
                <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,255,255,0.55),transparent_55%),radial-gradient(130%_130%_at_100%_100%,rgba(255,255,255,0.35),transparent_60%)]" />
                <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" />
              </div>
              <div className="relative z-10 space-y-3 text-slate-800 dark:text-slate-100">
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600/80 dark:text-slate-200/70">
                  {tile.label}
                </div>
                <div
                  className={`text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r ${tile.textGradient} bg-clip-text text-transparent drop-shadow-[0_2px_6px_rgba(255,255,255,0.28)]`}
                >
                  {tile.value}
                </div>
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700/90 dark:text-slate-100/90">
                  {tile.owner}
                </div>
                <div className="text-xs text-slate-600/80 dark:text-slate-200/70">
                  {tile.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Overrides row */}
      <Card
        title="Playoff teams per season"
        right={
          <SoftButton
            onClick={() => setShowPlayoffInputs((v) => !v)}
            className="text-amber-900 dark:text-amber-100 bg-gradient-to-r from-amber-400/90 via-amber-300/80 to-yellow-300/80 border-amber-200/70 shadow-[0_18px_40px_-26px_rgba(245,158,11,0.65)] hover:shadow-[0_26px_60px_-28px_rgba(245,158,11,0.75)]"
            title={showPlayoffInputs ? "Collapse inputs" : "Expand inputs"}
          >
            {showPlayoffInputs ? "Collapse" : "Expand"}
          </SoftButton>
        }
      >
        {showPlayoffInputs ? (
          <>
            <div className="flex flex-wrap gap-3 items-center">
              {seasons.map((yr) => {
                const espnVal = Number(playoffTeamsBase?.[yr] || 0) || 0;
                const show = edit[yr] ?? mergedPlayoffTeams[yr] ?? 0;
                return (
                  <label key={yr} className="flex items-center gap-2 text-sm">
                    <span className="w-12 text-right opacity-70">{yr}</span>
                    <input
                      type="number"
                      min={0}
                      className="w-16 px-2 py-1 rounded bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700"
                      value={show || ""}
                      placeholder={espnVal ? String(espnVal) : "0"}
                      onChange={(e) => setYr(yr, e.target.value)}
                      onBlur={commit}
                    />
                    {espnVal ? (
                      <span className="text-xs text-zinc-500">
                        (ESPN: {espnVal})
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              ESPN usually provides values from ~2018+. Enter or override
              earlier years here. Your changes are saved locally and used across
              tabs.
            </div>
          </>
        ) : (
          <div className="text-xs text-zinc-500">
            Inputs hidden. Click <span className="font-semibold">Expand</span>{" "}
            to edit per-season playoff team counts.
          </div>
        )}
      </Card>

      {/* Placements grid */}
      <Card
        title="Placements by season"
        subtitle="Final finishes by manager across every recorded year"
      >
        <div className="overflow-x-auto">
          <div className="relative min-w-full overflow-hidden rounded-2xl border border-white/25 dark:border-white/10 bg-white/75 dark:bg-zinc-950/50 shadow-[0_30px_65px_-40px_rgba(15,23,42,0.9)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(120%_140%_at_100%_100%,rgba(16,185,129,0.14),transparent_60%)]" />
            <div className="relative overflow-x-auto">
              <table className="min-w-[720px] w-full text-[13px] text-slate-800 dark:text-slate-200">
                <thead className="sticky top-0 z-20 bg-slate-950/85 text-slate-200 uppercase tracking-[0.22em] text-[11px]">
                  <tr className="border-b border-white/20">
                    <th className="px-4 py-3 text-left">
                      <button
                        className="inline-flex items-center gap-1 font-semibold"
                        onClick={() => toggleGrid("member")}
                        title="Sort by member"
                      >
                        Member{" "}
                        <span className="text-xs opacity-60">
                          {sortArrow(gridSort, "member")}
                        </span>
                      </button>
                    </th>
                    {seasons.map((yr) => (
                      <th key={yr} className="px-4 py-3 text-center">
                        <button
                          className="inline-flex items-center justify-center gap-1 font-semibold"
                          onClick={() => toggleGrid(yr)}
                          title={`Sort by ${yr}`}
                        >
                          {yr}{" "}
                          <span className="text-xs opacity-60">
                            {sortArrow(gridSort, yr)}
                          </span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="relative z-10 divide-y divide-white/20">
                  {ownersSorted.map((member, idx) => (
                    <tr
                      key={member}
                      className={`transition-colors duration-200 ease-out ${
                        idx % 2 === 0
                          ? "bg-white/65 dark:bg-white/[0.035]"
                          : "bg-white/40 dark:bg-white/[0.02]"
                      } hover:bg-white/85 dark:hover:bg-white/10`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">
                        {member}
                      </td>
                      {seasons.map((yr) => {
                        const place = league.placementMap?.[member]?.[yr];
                        const poCnt = Number(mergedPlayoffTeams?.[yr] || 0);
                        const hasPOInfo = poCnt > 0;
                        const madePO = !!(place && hasPOInfo && place <= poCnt);

                        return (
                          <td
                            key={`${member}-${yr}`}
                            className="px-4 py-3 text-center"
                          >
                            {place ? (
                              <span
                                className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.65)] backdrop-blur ${
                                  madePO
                                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                                    : "bg-slate-900/80 text-slate-100 dark:bg-slate-200/20 dark:text-slate-100"
                                }`}
                                title={
                                  hasPOInfo
                                    ? madePO
                                      ? "Playoffs: Yes"
                                      : "Playoffs: No"
                                    : "Playoffs: (unknown for this season)"
                                }
                              >
                                {(() => {
                                  const m = medalFor(Number(place));
                                  if (m)
                                    return (
                                      <span className="text-lg drop-shadow-sm">
                                        {m}
                                      </span>
                                    );
                                  return (
                                    <span className="tabular-nums font-semibold">
                                      {ordinalSafe(Number(place))}
                                    </span>
                                  );
                                })()}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>
      {/* ============================================================
          Placements over time (toggle owners, shaded playoff area)
          ============================================================ */}
      <Card title="Placements over time">
        {/* Quick toggles */}
        <div className="mb-3 flex flex-wrap gap-2">
          <SoftButton
            className="px-2 py-1 text-[10px]"
            onClick={selectAllOwners}
          >
            Select all
          </SoftButton>
          <SoftButton
            className="px-2 py-1 text-[10px] text-rose-700 dark:text-rose-200 bg-gradient-to-r from-rose-100/80 via-pink-100/70 to-orange-100/60 border-rose-300/60 hover:shadow-[0_22px_52px_-32px_rgba(244,114,182,0.55)]"
            onClick={clearAllOwners}
          >
            Deselect all
          </SoftButton>
        </div>

        {/* Owner toggles */}
        <div className="mb-3 flex flex-wrap gap-3 max-h-28 overflow-auto pr-1">
          {(owners || []).map((o, i) => (
            <label key={o} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={visibleOwners.has(o)}
                onChange={() => toggleOwnerVisible(o)}
              />
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colorFor(i) }}
                />
                {o}
              </span>
            </label>
          ))}
        </div>

        <div className="h-[560px] w-full">
          {" "}
          {/* taller chart so labels don't collide */}
          <ResponsiveContainer width="100%" height={520}>
            <LineChart
              data={chartRows}
              margin={{ top: 16, right: 28, bottom: 44, left: 16 }} // more bottom space
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />

              <XAxis
                dataKey="year"
                type="number"
                allowDecimals={false}
                tickCount={seasonsChart.length}
                interval="preserveStartEnd"
                tick={{ fill: "#e5e7eb", fontSize: 14, fontWeight: 700 }}
                domain={[
                  (seasonsChart[0] ?? 2013) - 0.5,
                  (seasonsChart[seasonsChart.length - 1] ??
                    new Date().getFullYear()) + 0.5,
                ]}
                tickFormatter={(v) => String(v)}
                axisLine={{ stroke: "rgba(255,255,255,0.28)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.28)" }}
              />

              {/* Y axis: 1 at the top; label every finishing position */}
              <YAxis
                type="number"
                domain={[1, globalMaxPlace]} // fixed: 1..max; no padding
                ticks={yTicks} // 12, 11, ..., 1
                allowDecimals={false}
                reversed // so 1 is at the top
                tick={{ fill: "#e5e7eb", fontSize: 14, fontWeight: 700 }}
                axisLine={{ stroke: "rgba(255,255,255,0.28)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.28)" }}
              />

              <Tooltip
                contentStyle={{
                  background: "rgba(24,24,27,0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#e5e7eb",
                }}
                labelStyle={{ color: "#fff", fontWeight: 700 }}
                labelFormatter={(v) => `Season ${v}`}
                formatter={(value, name) => [`Place: ${value}`, name]}
              />

              {/* Per-season playoff shading (independent of selected owners) */}
              {seasonsChart.map((yr) => {
                const raw = Number(mergedPlayoffTeams?.[yr] || 0);
                if (!raw) return null;
                const cutoff = Math.max(1, Math.min(globalMaxPlace, raw));
                return (
                  <ReferenceArea
                    key={`po-${yr}`}
                    x1={yr - 0.5}
                    x2={yr + 0.5}
                    y1={1}
                    y2={cutoff}
                    stroke="none"
                    fill="rgba(34,197,94,0.25)" // brighter green
                  />
                );
              })}

              {/* Lines for each visible owner */}
              {Array.from(visibleOwners).map((owner, i) => (
                <Line
                  key={owner}
                  type="monotone"
                  dataKey={owner}
                  stroke={colorFor(i)}
                  strokeWidth={3.5} // thicker lines
                  dot={<MedalDot />} // medals visible at 1/2/3
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 text-xs text-zinc-500">
          Shaded band indicates playoff placements (uses your per-season playoff
          team counts; manual overrides take precedence). Medals mark
          1st/2nd/3rd finishes.
        </div>
      </Card>

      <Card title="Playoff stats">
        <TableBox>
          <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
            <tr className="border-b-2 border-zinc-300 dark:border-zinc-700">
              <th className="px-3 py-2 text-left">
                <button
                  className="inline-flex items-center gap-1"
                  onClick={() => toggleSummary("member")}
                >
                  Member{" "}
                  <span className="opacity-60 text-xs">
                    {sortArrow(sumSort, "member")}
                  </span>
                </button>
              </th>
              <th className="px-3 py-2">
                <button
                  className="inline-flex items-center gap-1"
                  onClick={() => toggleSummary("avg")}
                >
                  Avg Place{" "}
                  <span className="opacity-60 text-xs">
                    {sortArrow(sumSort, "avg")}
                  </span>
                </button>
              </th>
              <th className="px-3 py-2">
                <button
                  className="inline-flex items-center gap-1"
                  onClick={() => toggleSummary("firsts")}
                >
                  # 1sts{" "}
                  <span className="opacity-60 text-xs">
                    {sortArrow(sumSort, "firsts")}
                  </span>
                </button>
              </th>
              <th className="px-3 py-2">
                <button
                  className="inline-flex items-center gap-1"
                  onClick={() => toggleSummary("top3")}
                >
                  # Top 3s{" "}
                  <span className="opacity-60 text-xs">
                    {sortArrow(sumSort, "top3")}
                  </span>
                </button>
              </th>
              <th className="px-3 py-2">
                <button
                  className="inline-flex items-center gap-1"
                  onClick={() => toggleSummary("playoffs")}
                >
                  # Playoff Apps{" "}
                  <span className="opacity-60 text-xs">
                    {sortArrow(sumSort, "playoffs")}
                  </span>
                </button>
              </th>
              <th className="px-3 py-2">
                <button
                  className="inline-flex items-center gap-1"
                  onClick={() => toggleSummary("lasts")}
                >
                  # Lasts{" "}
                  <span className="opacity-60 text-xs">
                    {sortArrow(sumSort, "lasts")}
                  </span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 [&>tr:nth-child(odd)]:bg-zinc-50 dark:[&>tr:nth-child(odd)]:bg-zinc-900 [&>tr:hover]:bg-zinc-100 dark:[&>tr:hover]:bg-zinc-800">
            {summarySorted.map((s) => (
              <tr key={s.member}>
                <td className="px-3 py-2 text-left font-medium">{s.member}</td>
                <td className="px-3 py-2 text-center">
                  {Number.isFinite(s.avg) && s.avg > 0 ? s.avg.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2 text-center">{s.firsts}</td>
                <td className="px-3 py-2 text-center">{s.top3}</td>
                <td className="px-3 py-2 text-center">{s.playoffs}</td>
                <td className="px-3 py-2 text-center">{s.lasts}</td>
              </tr>
            ))}
          </tbody>
        </TableBox>
      </Card>

      {/* (Chart section unchanged) ... */}
    </div>
  );
}

function __resolveOwnerName(league, season, teamId) {
  const seasonNum = Number(season);
  const teamNum = Number(teamId);
  if (!Number.isFinite(teamNum)) return null;
  try {
    const resolved = ownerName?.(seasonNum, teamNum);
    if (resolved) return resolved;
  } catch {}
  const fallback = (obj, ...keys) =>
    keys.reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  return (
    fallback(league, "ownerByTeamByYear", seasonNum, teamNum) ||
    fallback(league, "ownerByTeamByYear", String(seasonNum), teamNum) ||
    fallback(league, "ownerByTeamByYear", seasonNum, String(teamNum)) ||
    fallback(league, "ownerByTeamByYear", String(seasonNum), String(teamNum)) ||
    null
  );
}

const __DEFAULT_START_SLOTS = new Set([0, 2, 3, 4, 5, 6, 7, 16, 17, 23]);
const __RECAP_SLOT_LABEL = {
  0: "QB",
  1: "QB",
  2: "RB",
  3: "WR",
  4: "WR",
  5: "WR",
  6: "TE",
  7: "FLEX",
  16: "DST",
  17: "K",
  20: "Bench",
  21: "IR",
  23: "FLEX",
};
const __RECAP_POS_LABEL = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DST",
};
const __RECAP_SLOT_ORDER = [0, 2, 3, 4, 6, 7, 23, 16, 17, 21, 20];

const __recapEntrySlotId = (e) =>
  e?.lineupSlotId ?? e?.slotId ?? e?.slot ?? null;
const __recapEntryPts = (e) => {
  const n = Number(
    e?.appliedTotal ??
      e?.playerPoints?.appliedTotal ??
      e?.appliedStatTotal ??
      e?.pts ??
      0
  );
  return Number.isFinite(n) ? n : 0;
};
const __recapEntryProj = (e) => {
  const n = Number(
    e?.proj ??
      e?.projStart ??
      e?.projectedStart ??
      e?.playerPoints?.projectedTotal ??
      0
  );
  return Number.isFinite(n) ? n : 0;
};
const __recapEntryPosId = (e) => {
  const val =
    e?.defaultPositionId ??
    e?.playerPoolEntry?.player?.defaultPositionId ??
    e?.player?.defaultPositionId ??
    e?.posId;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

function __resolveCurrentWeekExclusiveSimple(
  league,
  currentWeekByYear,
  season
) {
  const candidates = new Set();
  const push = (value) => {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) candidates.add(Math.floor(n));
  };
  const keys = [season, Number(season), String(season)].filter(
    (k) => k != null
  );
  keys.forEach((key) => {
    if (currentWeekByYear) {
      push(currentWeekByYear[key]);
      push(currentWeekByYear[String(key)]);
    }
    push(league?.currentWeekByYear?.[key]);
    push(league?.currentWeekByYear?.[String(key)]);
    push(league?.espnCurrentWeekBySeason?.[key]);
    push(league?.espnCurrentWeekBySeason?.[String(key)]);
    push(league?.currentWeekBySeason?.[key]);
    push(league?.currentWeekBySeason?.[String(key)]);
  });
  keys.forEach((key) => {
    const seasonInfo =
      league?.seasonsByYear?.[key] ||
      league?.seasonsByYear?.[String(key)] ||
      null;
    if (!seasonInfo) return;
    [
      seasonInfo?.currentWeek,
      seasonInfo?.currentMatchupPeriod,
      seasonInfo?.currentMatchupPeriodId,
      seasonInfo?.status?.currentMatchupPeriod,
      seasonInfo?.status?.currentScoringPeriod,
      seasonInfo?.status?.latestScoringPeriod,
      seasonInfo?.status?.matchupPeriodId,
    ].forEach(push);
  });
  if (!candidates.size) return 0;
  return Math.max(...candidates);
}

function __resolveTeamIdForOwner({ league, season, ownerByTeamByYear, owner }) {
  const ownerNameVal = String(owner || "").trim();
  if (!ownerNameVal) return null;
  const seasonNum = Number(season);
  if (!Number.isFinite(seasonNum)) return null;
  const canonTarget = canonicalizeOwner(ownerNameVal);
  if (!canonTarget) return null;

  const byYear =
    ownerByTeamByYear?.[seasonNum] ||
    ownerByTeamByYear?.[String(seasonNum)] ||
    {};
  for (const [teamKey, mappedOwner] of Object.entries(byYear || {})) {
    const tid = Number(teamKey);
    if (!Number.isFinite(tid)) continue;
    if (canonicalizeOwner(mappedOwner) === canonTarget) return tid;
  }

  try {
    const fromOwnerMaps = ownerMapFor?.(seasonNum) || {};
    for (const [teamKey, info] of Object.entries(fromOwnerMaps)) {
      const tid = Number(teamKey);
      if (!Number.isFinite(tid)) continue;
      if (canonicalizeOwner(info?.name) === canonTarget) return tid;
    }
  } catch {}

  return null;
}

function __collectGamesForSeason(league, season, ownerByTeamByYear) {
  const out = [];
  const seasonNum = Number(season);
  if (!Number.isFinite(seasonNum)) return out;

  const seenGames = new Set();
  const toNumberOrNull = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  };

  const resolveTeamId = (ownerNameVal, fallbackId) => {
    if (Number.isFinite(fallbackId)) return Math.floor(fallbackId);
    return __resolveTeamIdForOwner({
      league,
      season: seasonNum,
      ownerByTeamByYear,
      owner: ownerNameVal,
    });
  };

  const pushGame = ({
    week,
    team1Id,
    team2Id,
    score1,
    score2,
    owner1,
    owner2,
  }) => {
    const wk = Number(week);
    if (!Number.isFinite(wk) || wk <= 0) return;

    let ownerName1 = typeof owner1 === "string" ? owner1.trim() : "";
    let ownerName2 = typeof owner2 === "string" ? owner2.trim() : "";

    let resolvedTeam1Id = resolveTeamId(ownerName1, team1Id);
    let resolvedTeam2Id = resolveTeamId(ownerName2, team2Id);

    if (!ownerName1 && Number.isFinite(resolvedTeam1Id)) {
      const resolved = __resolveOwnerName(league, seasonNum, resolvedTeam1Id);
      ownerName1 = resolved ? String(resolved) : "";
    }
    if (!ownerName2 && Number.isFinite(resolvedTeam2Id)) {
      const resolved = __resolveOwnerName(league, seasonNum, resolvedTeam2Id);
      ownerName2 = resolved ? String(resolved) : "";
    }

    ownerName1 = ownerName1.trim();
    ownerName2 = ownerName2.trim();
    if (!ownerName1 || !ownerName2) return;

    const canonA = canonicalizeOwner(ownerName1);
    const canonB = canonicalizeOwner(ownerName2);
    const keyParts = [canonA, canonB].sort();
    const key = `${seasonNum}|${Math.floor(wk)}|${keyParts[0]}|${keyParts[1]}`;
    if (seenGames.has(key)) return;
    seenGames.add(key);

    out.push({
      week: Math.floor(wk),
      team1Id: Number.isFinite(resolvedTeam1Id) ? resolvedTeam1Id : null,
      team2Id: Number.isFinite(resolvedTeam2Id) ? resolvedTeam2Id : null,
      score1: toNumberOrNull(score1),
      score2: toNumberOrNull(score2),
      owner1: ownerName1,
      owner2: ownerName2,
    });
  };

  if (Array.isArray(league?.games)) {
    for (const g of league.games) {
      const s = Number(g?.season ?? g?.year);
      if (s !== seasonNum) continue;
      const week = Number(
        g?.week ?? g?.matchupPeriodId ?? g?.scoringPeriodId ?? g?.period
      );
      const owner1 = g?.owner ?? g?.team1Owner ?? g?.homeOwner;
      const owner2 = g?.opp ?? g?.opponent ?? g?.team2Owner ?? g?.awayOwner;
      pushGame({
        week,
        team1Id:
          g?.team1?.teamId ??
          g?.team1?.team?.id ??
          g?.team1?.id ??
          g?.home?.teamId ??
          g?.home?.team?.id ??
          g?.home?.id ??
          g?.team1Id ??
          g?.homeTeamId,
        team2Id:
          g?.team2?.teamId ??
          g?.team2?.team?.id ??
          g?.team2?.id ??
          g?.away?.teamId ??
          g?.away?.team?.id ??
          g?.away?.id ??
          g?.team2Id ??
          g?.awayTeamId,
        score1:
          g?.team1?.score ??
          g?.home?.score ??
          g?.team1Score ??
          g?.points_for ??
          g?.pf,
        score2:
          g?.team2?.score ??
          g?.away?.score ??
          g?.team2Score ??
          g?.points_against ??
          g?.pa,
        owner1,
        owner2,
      });
    }
  }

  const seasonObj =
    league?.seasonsByYear?.[seasonNum] ||
    league?.seasonsByYear?.[String(seasonNum)] ||
    null;
  if (seasonObj?.schedule) {
    for (const m of seasonObj.schedule || []) {
      const week = Number(
        m?.matchupPeriodId ?? m?.scoringPeriodId ?? m?.period ?? m?.week
      );
      const home = m?.home ?? m?.homeTeam ?? {};
      const away = m?.away ?? m?.awayTeam ?? {};
      const pickScore = (side) => {
        const total = Number(side?.totalPoints);
        if (Number.isFinite(total)) return total;
        const byWeek = side?.pointsByScoringPeriod;
        const wkVal = byWeek ? Number(byWeek?.[week]) : NaN;
        return Number.isFinite(wkVal) ? wkVal : null;
      };
      pushGame({
        week,
        team1Id: home?.teamId ?? home?.team?.id ?? home?.id,
        team2Id: away?.teamId ?? away?.team?.id ?? away?.id,
        score1: pickScore(home),
        score2: pickScore(away),
        owner1: home?.ownerName ?? home?.teamName,
        owner2: away?.ownerName ?? away?.teamName,
      });
    }
  }

  return out;
}

function __buildTeamWeekTotalsForSeason({
  rostersByYear,
  lineupSlotsByYear,
  league,
  currentWeekByYear,
  season,
}) {
  const totals = {};
  const seasonNum = Number(season);
  if (!Number.isFinite(seasonNum)) return totals;
  const byTeam =
    rostersByYear?.[seasonNum] || rostersByYear?.[String(seasonNum)] || {};
  const capExclusive = __resolveCurrentWeekExclusiveSimple(
    league,
    currentWeekByYear,
    seasonNum
  );
  const startSlots = __buildStartSlots(lineupSlotsByYear?.[seasonNum] || {});
  const startSlotSet = startSlots.length
    ? new Set(startSlots)
    : __DEFAULT_START_SLOTS;

  for (const [teamKey, byWeek] of Object.entries(byTeam || {})) {
    const teamId = Number(teamKey);
    if (!Number.isFinite(teamId)) continue;
    totals[teamId] = totals[teamId] || {};
    for (const [weekKey, entriesRaw] of Object.entries(byWeek || {})) {
      const weekNum = Number(weekKey);
      if (!Number.isFinite(weekNum)) continue;
      if (capExclusive > 0 && weekNum >= capExclusive) continue;
      const entries = Array.isArray(entriesRaw) ? entriesRaw : [];
      let proj = 0;
      let actual = 0;
      for (const entry of entries) {
        const slotId = Number(__recapEntrySlotId(entry));
        if (!startSlotSet.has(slotId)) continue;
        proj += __recapEntryProj(entry);
        actual += __recapEntryPts(entry);
      }
      totals[teamId][weekNum] = { proj, actual };
    }
  }
  return totals;
}

function __computeLuckScoresForSeason({
  league,
  season,
  games,
  teamWeekTotals,
  hiddenManagers,
  ownerByTeamByYear,
}) {
  const diffTotals = {};
  const hidden = hiddenManagers || new Set();
  games.forEach((game) => {
    const { week } = game;
    let owner1 =
      (typeof game?.owner1 === "string" && game.owner1.trim()) ||
      __resolveOwnerName(league, season, game?.team1Id);
    let owner2 =
      (typeof game?.owner2 === "string" && game.owner2.trim()) ||
      __resolveOwnerName(league, season, game?.team2Id);
    owner1 = owner1 ? owner1.trim() : "";
    owner2 = owner2 ? owner2.trim() : "";
    if (!owner1 || !owner2) return;
    if (hidden.has(owner1) || hidden.has(owner2)) return;
    const team1Id = Number.isFinite(game?.team1Id)
      ? game.team1Id
      : __resolveTeamIdForOwner({
          league,
          season,
          ownerByTeamByYear,
          owner: owner1,
        });
    const team2Id = Number.isFinite(game?.team2Id)
      ? game.team2Id
      : __resolveTeamIdForOwner({
          league,
          season,
          ownerByTeamByYear,
          owner: owner2,
        });
    const oppTotals1 = Number.isFinite(team2Id)
      ? teamWeekTotals?.[team2Id]?.[week]
      : null;
    const oppTotals2 = Number.isFinite(team1Id)
      ? teamWeekTotals?.[team1Id]?.[week]
      : null;
    const diff1 = (oppTotals1?.proj ?? 0) - (oppTotals1?.actual ?? 0);
    const diff2 = (oppTotals2?.proj ?? 0) - (oppTotals2?.actual ?? 0);
    diffTotals[owner1] = (diffTotals[owner1] || 0) + diff1;
    diffTotals[owner2] = (diffTotals[owner2] || 0) + diff2;
  });

  const entries = Object.entries(diffTotals);
  if (!entries.length) return {};
  let min = Infinity;
  let max = -Infinity;
  entries.forEach(([, value]) => {
    if (value < min) min = value;
    if (value > max) max = value;
  });
  if (!Number.isFinite(min) || !Number.isFinite(max)) return {};
  const range = max - min;
  const scaled = {};
  entries.forEach(([owner, value]) => {
    let normalized;
    if (range === 0) normalized = 50;
    else normalized = ((value - min) / range) * 100;
    scaled[owner] = Math.max(0, Math.min(100, normalized));
  });
  return scaled;
}

function __computeSeasonWins({
  league,
  season,
  games,
  teamWeekTotals,
  hiddenManagers,
}) {
  const wins = {};
  const hidden = hiddenManagers || new Set();
  const isHidden = (name) => {
    if (!name) return false;
    return hidden.has(name) || hidden.has(canonicalizeOwner(name));
  };
  const toNumberOrNull = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  };
  games.forEach((game) => {
    const { week, team1Id, team2Id, score1, score2 } = game;
    let owner1 =
      (typeof game?.owner1 === "string" && game.owner1.trim()) ||
      __resolveOwnerName(league, season, team1Id);
    let owner2 =
      (typeof game?.owner2 === "string" && game.owner2.trim()) ||
      __resolveOwnerName(league, season, team2Id);
    owner1 = owner1 ? owner1.trim() : "";
    owner2 = owner2 ? owner2.trim() : "";
    if (!owner1 || !owner2) return;
    if (isHidden(owner1) || isHidden(owner2)) return;
    const totals1 =
      Number.isFinite(team1Id) && Number.isFinite(week)
        ? teamWeekTotals?.[team1Id]?.[week] || {}
        : {};
    const totals2 =
      Number.isFinite(team2Id) && Number.isFinite(week)
        ? teamWeekTotals?.[team2Id]?.[week] || {}
        : {};
    const actual1 = Number.isFinite(totals1.actual)
      ? totals1.actual
      : toNumberOrNull(score1);
    const actual2 = Number.isFinite(totals2.actual)
      ? totals2.actual
      : toNumberOrNull(score2);
    if (!Number.isFinite(actual1) || !Number.isFinite(actual2)) return;
    if (actual1 > actual2) wins[owner1] = (wins[owner1] || 0) + 1;
    else if (actual2 > actual1) wins[owner2] = (wins[owner2] || 0) + 1;
  });
  return wins;
}

function __computeHighestScore({
  league,
  season,
  teamWeekTotals,
  hiddenManagers,
}) {
  let best = null;
  const hidden = hiddenManagers || new Set();
  for (const [teamIdStr, byWeek] of Object.entries(teamWeekTotals || {})) {
    const teamId = Number(teamIdStr);
    for (const [weekStr, totals] of Object.entries(byWeek || {})) {
      const pts = Number(totals?.actual);
      if (!Number.isFinite(pts)) continue;
      const owner = __resolveOwnerName(league, season, teamId);
      if (!owner || hidden.has(owner)) continue;
      if (!best || pts > best.points) {
        best = {
          owner,
          week: Number(weekStr),
          points: pts,
        };
      }
    }
  }
  return best;
}

function __podiumColor(place) {
  if (place === 1) return "from-amber-300 via-amber-200 to-amber-100";
  if (place === 2) return "from-zinc-300 via-zinc-200 to-zinc-100";
  if (place === 3) return "from-orange-300 via-orange-200 to-yellow-100";
  return "from-slate-200 via-slate-100 to-white";
}

const __CONFETTI_COLORS = [
  "#FACC15",
  "#60A5FA",
  "#F472B6",
  "#34D399",
  "#F97316",
  "#A855F7",
];

function ConfettiOverlay({ active }) {
  const pieces = React.useMemo(() => {
    return Array.from({ length: 120 }).map((_, index) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 1.5;
      const duration = 4 + Math.random() * 2.5;
      const size = 6 + Math.random() * 6;
      const color = __CONFETTI_COLORS[index % __CONFETTI_COLORS.length];
      return { left, delay, duration, size, color };
    });
  }, []);

  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece, idx) => (
        <span
          key={idx}
          className="absolute block rounded-sm"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 2}px`,
            backgroundColor: piece.color,
            animation: `yv-confetti ${piece.duration}s linear ${piece.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* YearlyRecapTab ------------------------------------------------------------ */
export function YearlyRecapTab({
  league,
  rostersByYear = {},
  lineupSlotsByYear = {},
  ownerByTeamByYear = {},
  currentWeekByYear = {},
}) {
  if (!league) return null;

  const hiddenManagersSet = React.useMemo(() => {
    const list = Array.isArray(league?.hiddenManagers)
      ? league.hiddenManagers
      : [];
    return new Set(list);
  }, [league?.hiddenManagers]);

  const completedSeasons = React.useMemo(() => {
    const out = (league?.seasonsAll || []).filter((season) =>
      Object.values(league?.placementMap || {}).some((byYear) =>
        Number.isFinite(Number(byYear?.[season]))
      )
    );
    return out.sort((a, b) => a - b);
  }, [league?.seasonsAll, league?.placementMap]);

  const latestSeason = completedSeasons.length
    ? completedSeasons[completedSeasons.length - 1]
    : null;

  const placements = React.useMemo(() => {
    if (!Number.isFinite(latestSeason)) return [];
    const rows = [];
    Object.entries(league?.placementMap || {}).forEach(([owner, byYear]) => {
      if (hiddenManagersSet.has(owner)) return;
      const place = Number(byYear?.[latestSeason]);
      if (Number.isFinite(place) && place > 0) {
        rows.push({ owner, place });
      }
    });
    return rows.sort((a, b) => a.place - b.place);
  }, [league?.placementMap, hiddenManagersSet, latestSeason]);

  const topThree = placements.slice(0, 3);
  const champion = topThree[0] || null;

  const [confettiActive, setConfettiActive] = React.useState(false);
  React.useEffect(() => {
    if (!champion) return;
    setConfettiActive(true);
    const t = setTimeout(() => setConfettiActive(false), 5000);
    return () => clearTimeout(t);
  }, [champion?.owner, latestSeason]);

  const teamNamesByOwner = league?.teamNamesByOwner || {};

  const championTeamName = champion
    ? teamNamesByOwner?.[champion.owner]?.[latestSeason] ||
      teamNamesByOwner?.[champion.owner]?.[String(latestSeason)] ||
      ""
    : "";

  const championSummary = React.useMemo(() => {
    if (!champion) return null;
    const member = (league?.members || []).find(
      (m) => m?.name === champion.owner
    );
    const titles = Object.values(league?.placementMap?.[champion.owner] || {})
      .map((val) => Number(val))
      .filter((val) => val === 1).length;
    let yearsInLeague = Number(member?.yearsPlayed);
    if (!Number.isFinite(yearsInLeague) || yearsInLeague <= 0) {
      const joined = Number(member?.joined);
      if (Number.isFinite(joined) && Number.isFinite(latestSeason)) {
        yearsInLeague = Math.max(1, latestSeason - joined + 1);
      } else {
        const seenSeasons = Object.keys(
          league?.placementMap?.[champion.owner] || {}
        )
          .map((s) => Number(s))
          .filter(Number.isFinite);
        yearsInLeague = seenSeasons.length || 1;
      }
    }
    const titleLabel =
      titles <= 1
        ? `won their first ever championship after ${yearsInLeague} year${
            yearsInLeague === 1 ? "" : "s"
          } in the league.`
        : `won their ${ordinal(titles)} championship in ${yearsInLeague} year${
            yearsInLeague === 1 ? "" : "s"
          }.`;
    return {
      headline: `Congrats to ${champion.owner}${
        championTeamName ? ` – ${championTeamName}` : ""
      }`,
      detail: `Manager ${champion.owner} ${titleLabel}`,
    };
  }, [
    champion,
    championTeamName,
    league?.members,
    league?.placementMap,
    latestSeason,
  ]);

  const [selectedOwner, setSelectedOwner] = React.useState(
    champion?.owner || null
  );
  React.useEffect(() => {
    setSelectedOwner(champion?.owner || null);
  }, [champion?.owner, latestSeason]);

  const selectedPlacement =
    topThree.find((p) => p.owner === selectedOwner) || null;

  const canonicalSelectedOwner = React.useMemo(() => {
    return selectedOwner ? canonicalizeOwner(selectedOwner) : "";
  }, [selectedOwner]);

  const teamIdsForOwner = React.useMemo(() => {
    if (!selectedOwner || !Number.isFinite(latestSeason)) return [];
    const map =
      ownerByTeamByYear?.[latestSeason] ||
      ownerByTeamByYear?.[String(latestSeason)] ||
      {};
    return Object.entries(map)
      .filter(
        ([, owner]) => canonicalizeOwner(owner) === canonicalSelectedOwner
      )
      .map(([teamId]) => Number(teamId))
      .filter(Number.isFinite);
  }, [selectedOwner, canonicalSelectedOwner, ownerByTeamByYear, latestSeason]);

  const seasonTeamTotals = React.useMemo(
    () =>
      __buildTeamWeekTotalsForSeason({
        rostersByYear,
        lineupSlotsByYear,
        league,
        currentWeekByYear,
        season: latestSeason,
      }),
    [rostersByYear, lineupSlotsByYear, league, currentWeekByYear, latestSeason]
  );

  const gamesThisSeason = React.useMemo(
    () => __collectGamesForSeason(league, latestSeason, ownerByTeamByYear),
    [league, latestSeason, ownerByTeamByYear]
  );

  const winsBySeason = React.useMemo(() => {
    const map = new Map();
    completedSeasons.forEach((seasonVal) => {
      const totals = __buildTeamWeekTotalsForSeason({
        rostersByYear,
        lineupSlotsByYear,
        league,
        currentWeekByYear,
        season: seasonVal,
      });
      const seasonGames = __collectGamesForSeason(
        league,
        seasonVal,
        ownerByTeamByYear
      );
      const wins = __computeSeasonWins({
        league,
        season: seasonVal,
        games: seasonGames,
        teamWeekTotals: totals,
        hiddenManagers: hiddenManagersSet,
      });
      map.set(seasonVal, wins);
    });
    return map;
  }, [
    completedSeasons,
    rostersByYear,
    lineupSlotsByYear,
    league,
    currentWeekByYear,
    hiddenManagersSet,
    ownerByTeamByYear,
  ]);

  const selectedTeamId = React.useMemo(() => {
    for (const teamId of teamIdsForOwner) {
      const byWeek = rostersByYear?.[latestSeason]?.[teamId];
      if (byWeek && Object.keys(byWeek).length) return teamId;
    }
    return teamIdsForOwner[0] ?? null;
  }, [teamIdsForOwner, rostersByYear, latestSeason]);

  const rosterForSelected = React.useMemo(() => {
    if (!Number.isFinite(latestSeason) || !Number.isFinite(selectedTeamId)) {
      return { week: null, entries: [] };
    }
    const byWeek =
      rostersByYear?.[latestSeason]?.[selectedTeamId] ||
      rostersByYear?.[String(latestSeason)]?.[selectedTeamId] ||
      {};
    const weeks = Object.keys(byWeek)
      .map((w) => Number(w))
      .filter((w) => Number.isFinite(w))
      .sort((a, b) => b - a);
    for (const wk of weeks) {
      const entries = byWeek?.[wk];
      if (Array.isArray(entries) && entries.length) {
        return { week: wk, entries };
      }
    }
    return { week: null, entries: [] };
  }, [rostersByYear, latestSeason, selectedTeamId]);

  const rosterStartSlots = React.useMemo(() => {
    if (!Number.isFinite(latestSeason)) return [];
    return __buildStartSlots(lineupSlotsByYear?.[latestSeason] || {});
  }, [lineupSlotsByYear, latestSeason]);

  const rosterStartSet = React.useMemo(() => {
    const arr = rosterStartSlots;
    return arr.length ? new Set(arr) : __DEFAULT_START_SLOTS;
  }, [rosterStartSlots]);

  const rosterGroups = React.useMemo(() => {
    const entries = Array.isArray(rosterForSelected.entries)
      ? rosterForSelected.entries
      : [];
    const starters = [];
    const bench = [];
    entries.forEach((entry) => {
      const slotId = Number(__recapEntrySlotId(entry));
      const target = rosterStartSet.has(slotId) ? starters : bench;
      target.push(entry);
    });
    const sortBySlot = (list) =>
      list.sort((a, b) => {
        const slotA = Number(__recapEntrySlotId(a));
        const slotB = Number(__recapEntrySlotId(b));
        const idxA = __RECAP_SLOT_ORDER.indexOf(slotA);
        const idxB = __RECAP_SLOT_ORDER.indexOf(slotB);
        return idxA - idxB;
      });
    sortBySlot(starters);
    sortBySlot(bench);
    return { starters, bench };
  }, [rosterForSelected.entries, rosterStartSet]);

  const luckScores = React.useMemo(
    () =>
      __computeLuckScoresForSeason({
        league,
        season: latestSeason,
        games: gamesThisSeason,
        teamWeekTotals: seasonTeamTotals,
        hiddenManagers: hiddenManagersSet,
        ownerByTeamByYear,
      }),
    [
      league,
      latestSeason,
      gamesThisSeason,
      seasonTeamTotals,
      hiddenManagersSet,
      ownerByTeamByYear,
    ]
  );

  const luckiest = React.useMemo(() => {
    let best = null;
    Object.entries(luckScores || {}).forEach(([owner, value]) => {
      if (hiddenManagersSet.has(owner)) return;
      if (!Number.isFinite(value)) return;
      if (!best || value > best.value) best = { owner, value };
    });
    return best;
  }, [luckScores, hiddenManagersSet]);

  const unluckiest = React.useMemo(() => {
    let worst = null;
    Object.entries(luckScores || {}).forEach(([owner, value]) => {
      if (hiddenManagersSet.has(owner)) return;
      if (!Number.isFinite(value)) return;
      if (!worst || value < worst.value) worst = { owner, value };
    });
    return worst;
  }, [luckScores, hiddenManagersSet]);

  const highestScore = React.useMemo(
    () =>
      __computeHighestScore({
        league,
        season: latestSeason,
        teamWeekTotals: seasonTeamTotals,
        hiddenManagers: hiddenManagersSet,
      }),
    [league, latestSeason, seasonTeamTotals, hiddenManagersSet]
  );

  const seasonWins = React.useMemo(
    () =>
      __computeSeasonWins({
        league,
        season: latestSeason,
        games: gamesThisSeason,
        teamWeekTotals: seasonTeamTotals,
        hiddenManagers: hiddenManagersSet,
      }),
    [league, latestSeason, gamesThisSeason, seasonTeamTotals, hiddenManagersSet]
  );

  const mostWins = React.useMemo(() => {
    let best = null;
    Object.entries(seasonWins || {}).forEach(([owner, value]) => {
      if (!Number.isFinite(value)) return;
      if (!best || value > best.value) best = { owner, value };
    });
    return best;
  }, [seasonWins]);

  const previousSeason =
    completedSeasons.length > 1
      ? completedSeasons[completedSeasons.length - 2]
      : null;

  const improvement = React.useMemo(() => {
    if (!Number.isFinite(latestSeason) || !Number.isFinite(previousSeason)) {
      return { mostImproved: null, biggestDrop: null };
    }
    const currentWins = winsBySeason.get(latestSeason) || {};
    const prevWins = winsBySeason.get(previousSeason) || {};
    let best = null;
    let worst = null;
    const owners = new Set([
      ...Object.keys(currentWins || {}),
      ...Object.keys(prevWins || {}),
    ]);
    owners.forEach((owner) => {
      if (hiddenManagersSet.has(owner)) return;
      const delta = (currentWins?.[owner] || 0) - (prevWins?.[owner] || 0);
      if (delta > 0 && (!best || delta > best.delta)) {
        best = { owner, delta };
      }
      if (delta < 0 && (!worst || delta < worst.delta)) {
        worst = { owner, delta };
      }
    });
    return { mostImproved: best, biggestDrop: worst };
  }, [latestSeason, previousSeason, winsBySeason, hiddenManagersSet]);

  if (!Number.isFinite(latestSeason) || !championSummary) {
    return (
      <Card title="Yearly Recap">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          No completed seasons found yet. Finish a season to unlock the recap.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-white/40 dark:border-white/10 bg-white/90 dark:bg-zinc-950/70">
        <ConfettiOverlay active={confettiActive} />
        <div className="relative z-10 flex flex-col items-center gap-3 py-10 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.45em] text-slate-500 dark:text-slate-300">
            {latestSeason} Season Recap
          </div>
          <div className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            {championSummary.headline}
          </div>
          <div className="max-w-2xl text-sm md:text-base text-slate-600 dark:text-slate-300">
            {championSummary.detail}
          </div>
        </div>
      </Card>

      <Card
        title="Podium Finishers"
        subtitle="Tap a finalist to view their championship roster"
        className="relative overflow-hidden border-white/35 dark:border-white/10 bg-white/85 dark:bg-zinc-950/70"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {topThree.map((entry) => {
            const isActive = entry.owner === selectedOwner;
            return (
              <button
                key={entry.owner}
                type="button"
                onClick={() => setSelectedOwner(entry.owner)}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border border-white/50 dark:border-white/10 bg-gradient-to-t ${__podiumColor(
                  entry.place
                )} px-6 py-6 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.8)] transition-transform ${
                  isActive ? "ring-2 ring-amber-400" : "hover:-translate-y-1"
                }`}
              >
                <span className="text-4xl" aria-hidden>
                  {entry.place === 1 ? "🥇" : entry.place === 2 ? "🥈" : "🥉"}
                </span>
                <div className="text-xs uppercase tracking-[0.4em] text-slate-600/80 dark:text-slate-800/80">
                  {ordinal(entry.place)}
                </div>
                <div className="text-lg font-semibold text-slate-800 dark:text-slate-900">
                  {entry.owner}
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600/80 dark:text-slate-800/80">
                  {teamNamesByOwner?.[entry.owner]?.[latestSeason] ||
                    teamNamesByOwner?.[entry.owner]?.[String(latestSeason)] ||
                    "Team"}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card
        title="Championship Roster"
        subtitle={
          selectedPlacement
            ? `${selectedPlacement.owner} · Week ${
                rosterForSelected.week != null ? rosterForSelected.week : "—"
              }`
            : "Select a finalist to view their roster"
        }
        className="border-white/35 dark:border-white/10 bg-white/85 dark:bg-zinc-950/70"
      >
        {selectedPlacement && rosterForSelected.entries.length ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              { label: "Starters", list: rosterGroups.starters },
              { label: "Bench & Other", list: rosterGroups.bench },
            ].map(({ label, list }) => (
              <div key={label} className="space-y-3">
                <div className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
                  {label}
                </div>
                <div className="space-y-2">
                  {list.length ? (
                    list.map((entry, idx) => {
                      const slotId = Number(__recapEntrySlotId(entry));
                      const slotLabel =
                        __RECAP_SLOT_LABEL[slotId] || `Slot ${slotId}`;
                      const posId = __recapEntryPosId(entry);
                      const posLabel =
                        posId != null ? __RECAP_POS_LABEL[posId] || "" : "";
                      return (
                        <div
                          key={`${slotLabel}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-sm shadow-[0_16px_36px_-30px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-zinc-900/70"
                        >
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {entry?.name || "Unknown Player"}
                            </div>
                            <div className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                              {slotLabel}
                              {posLabel ? ` • ${posLabel}` : ""}
                            </div>
                          </div>
                          <div className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-300">
                            {__fmtPts(__recapEntryPts(entry))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/50 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      No data available.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/50 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            Roster data for this finalist is unavailable.
          </div>
        )}
      </Card>

      <Card
        title="Season Snapshots"
        className="border-white/35 dark:border-white/10 bg-white/85 dark:bg-zinc-950/70"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/60 bg-white/90 px-4 py-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-zinc-900/70">
            <div className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-300">
              Highest Scorer
            </div>
            {highestScore ? (
              <>
                <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {highestScore.owner}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  Week {highestScore.week} · {__fmtPts(highestScore.points)} pts
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                No scoring data.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/90 px-4 py-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-zinc-900/70">
            <div className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-300">
              Most Wins
            </div>
            {mostWins ? (
              <>
                <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {mostWins.owner}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  {mostWins.value} win{mostWins.value === 1 ? "" : "s"}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                No win data.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/90 px-4 py-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-zinc-900/70">
            <div className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-300">
              Most Improved
            </div>
            {improvement.mostImproved ? (
              <>
                <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {improvement.mostImproved.owner}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  +{improvement.mostImproved.delta} win
                  {improvement.mostImproved.delta === 1 ? "" : "s"} vs{" "}
                  {previousSeason}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Not enough history to calculate.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/90 px-4 py-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-zinc-900/70">
            <div className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-300">
              Biggest Faller
            </div>
            {improvement.biggestDrop ? (
              <>
                <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {improvement.biggestDrop.owner}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  {improvement.biggestDrop.delta} win
                  {Math.abs(improvement.biggestDrop.delta) === 1
                    ? ""
                    : "s"} vs {previousSeason}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Not enough history to calculate.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/90 px-4 py-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-zinc-900/70">
            <div className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-300">
              Luckiest (Luck Index)
            </div>
            {luckiest ? (
              <>
                <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {luckiest.owner}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  {Math.round(luckiest.value)} score
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Luck data unavailable.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/90 px-4 py-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-zinc-900/70">
            <div className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-300">
              Unluckiest (Luck Index)
            </div>
            {unluckiest ? (
              <>
                <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {unluckiest.owner}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  {Math.round(unluckiest.value)} score
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Luck data unavailable.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* MoneyTab (updated with dynamic heat, collapse, copy/paste, and earnings chart) */
export function MoneyTab({ league, moneyInputs = {}, setMoneyInputs }) {
  if (!league) return null;
  const updateMoneyInputs =
    typeof setMoneyInputs === "function" ? setMoneyInputs : () => {};
  const SoftButton = ({
    children,
    className = "",
    disabled = false,
    ...props
  }) => (
    <button
      type="button"
      disabled={disabled}
      {...props}
      className={`group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]
        text-slate-700 dark:text-slate-200
        bg-gradient-to-r from-white/95 via-white/80 to-white/90 dark:from-zinc-900/80 dark:via-zinc-900/55 dark:to-zinc-950/70
        border border-white/70 dark:border-white/10 shadow-[0_18px_40px_-28px_rgba(30,41,59,0.85)] backdrop-blur transition-all duration-200
        ease-out hover:-translate-y-0.5 hover:shadow-[0_22px_52px_-28px_rgba(59,130,246,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70
        ${
          disabled
            ? "opacity-40 cursor-not-allowed hover:translate-y-0 hover:shadow-none"
            : ""
        }
        ${className}`}
    >
      <span className="tracking-[0.32em]">{children}</span>
    </button>
  );
  const seasons = league.seasonsAll || [];
  const rawOwners = Array.isArray(league?.owners) ? league.owners : [];
  const hidden = new Set(
    Array.isArray(league?.hiddenManagers) ? league.hiddenManagers : []
  );
  const ownersList = rawOwners.filter((o) => !hidden.has(o));

  // UI: payout tiers + weekly addon visibility
  const [payoutTiers, setPayoutTiers] = useState(3);
  const [showWeekly, setShowWeekly] = useState(() => {
    // auto-show if any season already has a weekly value saved
    return seasons.some((yr) => moneyInputs?.[yr]?.weeklyHigh != null);
  });

  // NEW: collapse/expand for inputs (collapsed by default)
  const [inputsOpen, setInputsOpen] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState("owner");
  const [sortDir, setSortDir] = useState(1); // 1 = asc, -1 = desc
  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => d * -1);
    else {
      setSortBy(key);
      setSortDir(-1); // default to desc on first click for numeric fields
    }
  };
  const sortIndicator = (key) =>
    sortBy !== key ? "↕" : sortDir === -1 ? "▼" : "▲";

  // Input helper
  const setSeasonVal = (yr, field, val) =>
    updateMoneyInputs((prev) => ({
      ...prev,
      [yr]: { ...(prev[yr] || {}), [field]: Number(val) || 0 },
    }));

  // Season participation map (to charge buy-ins only when they played)
  const playedByOwnerSeason = new Map();
  (league.games || []).forEach((g) => {
    playedByOwnerSeason.set(`${g.owner}__${g.season}`, true);
  });

  // Collect season payout amounts per place and weeklyHigh
  const seasonPayouts = {};
  seasons.forEach((yr) => {
    seasonPayouts[yr] = [];
    for (let i = 1; i <= payoutTiers; i++) {
      const key =
        i === 1 ? "first" : i === 2 ? "second" : i === 3 ? "third" : `p${i}`;
      seasonPayouts[yr][i] = moneyInputs[yr]?.[key] || 0;
    }
  });

  // Weekly highest-scorer counts per owner per season (regular season only)
  const weeklyCountsByOwnerSeason = useMemo(() => {
    const map = new Map(); // key: `${owner}__${season}` -> integer count
    const bySeasonWeek = new Map(); // `${season}__${week}` -> array of { owner, pf }

    (league.games || []).forEach((g) => {
      if (g.is_playoff === true) return; // regular season only
      // ignore future/undecided weeks
      if (!(g.res === "W" || g.res === "L")) return;

      const s = Number(g.season);
      const w = Number(g.week);
      if (!Number.isFinite(s) || !Number.isFinite(w)) return;
      const key = `${s}__${w}`;
      if (!bySeasonWeek.has(key)) bySeasonWeek.set(key, []);
      bySeasonWeek.get(key).push({ owner: g.owner, pf: Number(g.pf) || 0 });
    });

    for (const [key, arr] of bySeasonWeek.entries()) {
      if (!arr.length) continue;
      const [sStr] = key.split("__");
      const s = Number(sStr);
      let max = -Infinity;
      arr.forEach((r) => (max = Math.max(max, r.pf)));
      // count ALL tied highest scorers (each receives full weekly payout)
      arr
        .filter((r) => r.pf === max)
        .forEach((r) => {
          const k = `${r.owner}__${s}`;
          map.set(k, (map.get(k) || 0) + 1);
        });
    }
    return map;
  }, [league.games]);

  // Aggregate invested / earned (totals) + per-year (for chart)
  const invested = {};
  const earned = {};
  const earnedByPlace = {};
  const weeklyEarned = {};
  const earnedByOwnerYear = {};
  const investedByOwnerYear = {};
  const ownersSet = new Set(ownersList);
  (ownersList || []).forEach((o) => {
    invested[o] = 0;
    earned[o] = 0;
    weeklyEarned[o] = 0;
    earnedByPlace[o] = {};
    earnedByOwnerYear[o] = {};
    investedByOwnerYear[o] = {};
    for (let i = 1; i <= payoutTiers; i++) earnedByPlace[o][i] = 0;
  });

  seasons.forEach((yr) => {
    const buyin = moneyInputs[yr]?.buyin || 0;

    // Charge buy-ins
    (ownersList || []).forEach((o) => {
      if (playedByOwnerSeason.get(`${o}__${yr}`)) {
        invested[o] += buyin;
        investedByOwnerYear[o][yr] = (investedByOwnerYear[o][yr] || 0) + buyin;
      }
    });

    // Season placements -> payouts
    const placeToOwner = Object.entries(league.placementMap || {}).reduce(
      (acc, [owner, map]) => {
        const p = map?.[yr];
        if (p) acc[p] = owner;
        return acc;
      },
      {}
    );
    for (let i = 1; i <= payoutTiers; i++) {
      const o = placeToOwner[i];
      const amt = seasonPayouts[yr][i] || 0;
      if (o && amt && ownersSet.has(o)) {
        earned[o] += amt;
        earnedByPlace[o][i] += amt;
        earnedByOwnerYear[o][yr] = (earnedByOwnerYear[o][yr] || 0) + amt;
      }
    }

    // Weekly highest-scorer payouts (addon)
    const weeklyAmt = moneyInputs[yr]?.weeklyHigh || 0;
    if (weeklyAmt) {
      (ownersList || []).forEach((o) => {
        const count = weeklyCountsByOwnerSeason.get(`${o}__${yr}`) || 0;
        if (count > 0) {
          const payout = count * weeklyAmt; // no split on ties
          earned[o] += payout;
          weeklyEarned[o] += payout;
          earnedByOwnerYear[o][yr] = (earnedByOwnerYear[o][yr] || 0) + payout;
        }
      });
    }
  });

  // Build rows
  let rows = (ownersList || []).map((o) => ({
    owner: o,
    invested: invested[o],
    earned: earned[o],
    roi: invested[o] ? (earned[o] - invested[o]) / invested[o] : 0,
    byPlace: earnedByPlace[o],
    weekly: weeklyEarned[o],
  }));

  // Sorting across supported keys
  rows.sort((a, b) => {
    if (sortBy === "owner") return a.owner.localeCompare(b.owner) * sortDir;
    if (sortBy === "invested") return (a.invested - b.invested) * sortDir;
    if (sortBy === "earned") return (a.earned - b.earned) * sortDir;
    if (sortBy === "roi") return (a.roi - b.roi) * sortDir;
    const m = /^place(\d+)$/.exec(sortBy);
    if (m) {
      const idx = Number(m[1]);
      return ((a.byPlace[idx] || 0) - (b.byPlace[idx] || 0)) * sortDir;
    }
    if (sortBy === "weekly") return (a.weekly - b.weekly) * sortDir;
    return 0;
  });

  const fmtCurrency = (n) => `$${Math.round(Number(n || 0)).toLocaleString()}`;
  const totalEarnedAll = rows.reduce(
    (sum, r) => sum + (Number(r.earned) || 0),
    0
  );
  const totalInvestedAll = rows.reduce(
    (sum, r) => sum + (Number(r.invested) || 0),
    0
  );
  const topEarnerRow = rows.reduce(
    (best, cur) =>
      best == null || Number(cur.earned || 0) > Number(best.earned || 0)
        ? cur
        : best,
    null
  );
  const bestRoiRow = rows
    .filter((r) => Number(r.invested || 0) > 0)
    .reduce(
      (best, cur) =>
        best == null || Number(cur.roi || 0) > Number(best.roi || 0)
          ? cur
          : best,
      null
    );
  const weeklyBossRow = rows.reduce(
    (best, cur) =>
      best == null || Number(cur.weekly || 0) > Number(best.weekly || 0)
        ? cur
        : best,
    null
  );
  const moneyHeroTiles = [
    rows.length
      ? {
          id: "pool",
          label: "Total Prize Pool",
          owner: "League",
          value: fmtCurrency(totalEarnedAll),
          detail: `${fmtCurrency(totalInvestedAll)} collected across ${
            seasons.length
          } season${seasons.length === 1 ? "" : "s"}`,
          accent:
            "from-amber-200/85 via-yellow-200/70 to-orange-200/60 border-amber-300/70 shadow-[0_28px_60px_-35px_rgba(251,191,36,0.75)] text-amber-900 dark:text-amber-100",
          textGradient: "from-amber-500 via-orange-500 to-yellow-500",
        }
      : null,
    topEarnerRow
      ? {
          id: "earner",
          label: "Top Earner",
          owner: topEarnerRow.owner,
          value: fmtCurrency(topEarnerRow.earned),
          detail: `Net ${fmtCurrency(
            (Number(topEarnerRow.earned) || 0) -
              (Number(topEarnerRow.invested) || 0)
          )}`,
          accent:
            "from-violet-200/80 via-purple-200/70 to-pink-200/60 border-violet-300/70 shadow-[0_28px_60px_-35px_rgba(167,139,250,0.7)] text-violet-900 dark:text-violet-100",
          textGradient: "from-violet-500 via-purple-500 to-pink-500",
        }
      : null,
    bestRoiRow
      ? {
          id: "roi",
          label: "Best ROI",
          owner: bestRoiRow.owner,
          value: `${Math.round(Number(bestRoiRow.roi || 0) * 100)}%`,
          detail: `${fmtCurrency(
            Number(bestRoiRow.earned || 0)
          )} on ${fmtCurrency(Number(bestRoiRow.invested || 0))}`,
          accent:
            "from-emerald-200/80 via-teal-200/70 to-cyan-200/60 border-emerald-300/70 shadow-[0_28px_60px_-35px_rgba(52,211,153,0.65)] text-emerald-900 dark:text-emerald-100",
          textGradient: "from-emerald-500 via-teal-500 to-cyan-500",
        }
      : weeklyBossRow
      ? {
          id: "weekly",
          label: "Weekly Bonus Boss",
          owner: weeklyBossRow.owner,
          value: fmtCurrency(weeklyBossRow.weekly),
          detail: "Weekly payouts collected",
          accent:
            "from-sky-200/80 via-blue-200/70 to-cyan-200/60 border-sky-300/70 shadow-[0_28px_60px_-35px_rgba(96,165,250,0.65)] text-sky-900 dark:text-sky-100",
          textGradient: "from-sky-500 via-blue-500 to-cyan-500",
        }
      : null,
  ].filter(Boolean);

  // Value-based tones for Earned/ROI (always reflects values, not order)
  const extent = (arr) => {
    let min = Infinity,
      max = -Infinity;
    arr.forEach((v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return;
      if (n < min) min = n;
      if (n > max) max = n;
    });
    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max)) max = 0;
    return [min, max];
  };

  const [roiMin, roiMax] = extent(rows.map((r) => r.roi));
  const [earnedMin, earnedMax] = extent(rows.map((r) => r.earned));

  const toneByValue = (value, min, max, goodHigh = true) => {
    if (max === min) {
      return "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100";
    }
    let t = (Number(value) - min) / (max - min);
    if (!goodHigh) t = 1 - t;
    if (t <= 0.2)
      return "bg-red-300 text-red-900 dark:bg-red-950/60 dark:text-red-200";
    if (t <= 0.4)
      return "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200";
    if (t <= 0.6)
      return "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200";
    if (t <= 0.8)
      return "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200";
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200";
  };

  // Helper to show weekly column if enabled or any season has a value
  const weeklyEnabled =
    showWeekly ||
    seasons.some((yr) => (moneyInputs[yr]?.weeklyHigh ?? null) != null);

  // ====== COPY/PASTE row state & helpers ====================================
  const [copiedFrom, setCopiedFrom] = useState(null); // season number or null
  const buildRowPayload = (yr) => {
    const payload = { buyin: Number(moneyInputs[yr]?.buyin || 0) };
    for (let i = 1; i <= payoutTiers; i++) {
      const key =
        i === 1 ? "first" : i === 2 ? "second" : i === 3 ? "third" : `p${i}`;
      payload[key] = Number(moneyInputs[yr]?.[key] || 0);
    }
    const hasWeekly =
      moneyInputs[yr]?.weeklyHigh != null ? moneyInputs[yr]?.weeklyHigh : null;
    if (hasWeekly != null) payload.weeklyHigh = Number(hasWeekly) || 0;
    return payload;
  };
  const pastePayloadToYear = (yr, payload) =>
    updateMoneyInputs((prev) => ({
      ...prev,
      [yr]: { ...(prev[yr] || {}), ...payload },
    }));

  // ====== CHART: cumulative earned + ROI line ================================
  const yearsAsc = useMemo(() => [...seasons].sort((a, b) => a - b), [seasons]);

  const [ownerSel, setOwnerSel] = useState(ownersList[0] || "");
  const [metricMode, setMetricMode] = useState("earned"); // 'earned' | 'profit'
  useEffect(() => {
    if (!ownersList.length) setOwnerSel("");
    else if (!ownersList.includes(ownerSel)) setOwnerSel(ownersList[0]);
  }, [ownersList, ownerSel]);
  // REPLACE the existing ownerSeries/posMax/negMin/barFill/roiDomain block with this:
  const ownerSeries = useMemo(() => {
    let cumE = 0,
      cumI = 0;
    const out = [];
    yearsAsc.forEach((y) => {
      const e = Number(earnedByOwnerYear?.[ownerSel]?.[y] || 0);
      const i = Number(investedByOwnerYear?.[ownerSel]?.[y] || 0);
      cumE += e;
      cumI += i;
      const cumProfit = cumE - cumI;
      const roi = cumI > 0 ? cumProfit / cumI : 0;

      // unified "value" key drives the bars
      out.push({
        year: y,
        value: metricMode === "earned" ? cumE : cumProfit,
        cumEarned: cumE,
        cumInvested: cumI,
        roi,
      });
    });
    return out;
  }, [yearsAsc, ownerSel, metricMode, earnedByOwnerYear, investedByOwnerYear]);

  // Color scaling for bars depends on the selected metric's values
  const seriesVals = ownerSeries.map((d) => Number(d.value) || 0);
  const posMax = Math.max(0, ...seriesVals.map((v) => (v > 0 ? v : 0)));
  const negMin = Math.min(0, ...seriesVals.map((v) => (v < 0 ? v : 0)));

  const barFill = (v) => {
    if (v >= 0) {
      const t = posMax > 0 ? v / posMax : 0.5;
      const L = 88 - t * 48; // 88% → 40%
      return `hsl(142 70% ${L}%)`; // green
    } else {
      const t = negMin < 0 ? Math.abs(v) / Math.abs(negMin) : 0.5;
      const L = 88 - t * 48;
      return `hsl(0 75% ${L}%)`; // red
    }
  };

  // ROI axis domain (with a little padding)
  const [roiMinSel, roiMaxSel] = (function () {
    let mn = Infinity,
      mx = -Infinity;
    ownerSeries.forEach((d) => {
      const r = Number(d.roi);
      if (!Number.isFinite(r)) return;
      if (r < mn) mn = r;
      if (r > mx) mx = r;
    });
    if (!Number.isFinite(mn)) mn = 0;
    if (!Number.isFinite(mx)) mx = 0;
    return [mn, mx];
  })();
  const roiDomain = [
    Math.min(roiMinSel - 0.05, -0.1),
    Math.max(roiMaxSel + 0.05, 0.1),
  ];

  return (
    <div className="space-y-6">
      {moneyHeroTiles.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {moneyHeroTiles.map((tile) => (
            <div
              key={tile.id}
              className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${tile.accent}
                px-5 py-6 md:px-6 md:py-7 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.8)] backdrop-blur-xl`}
            >
              <div className="pointer-events-none absolute inset-0 opacity-80">
                <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,255,255,0.55),transparent_55%),radial-gradient(130%_130%_at_100%_100%,rgba(255,255,255,0.35),transparent_60%)]" />
                <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" />
              </div>
              <div className="relative z-10 space-y-3 text-slate-800 dark:text-slate-100">
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600/80 dark:text-slate-200/70">
                  {tile.label}
                </div>
                <div
                  className={`text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r ${tile.textGradient} bg-clip-text text-transparent drop-shadow-[0_2px_6px_rgba(255,255,255,0.28)]`}
                >
                  {tile.value}
                </div>
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700/90 dark:text-slate-100/90">
                  {tile.owner}
                </div>
                <div className="text-xs text-slate-600/80 dark:text-slate-200/70">
                  {tile.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Card
        title="Season Buy-ins & Payouts"
        right={
          <div className="flex items-center gap-2">
            {/* collapse/expand */}
            <SoftButton
              className="px-2 py-1 text-[10px]"
              onClick={() => setInputsOpen((o) => !o)}
              title={inputsOpen ? "Collapse inputs" : "Expand inputs"}
            >
              {inputsOpen ? "Collapse" : "Expand"}
            </SoftButton>

            {/* copy mode indicator/cancel */}
            {copiedFrom != null ? (
              <SoftButton
                className="px-2 py-1 text-[10px] text-amber-800 dark:text-amber-200 bg-gradient-to-r from-amber-200/90 via-amber-100/70 to-yellow-200/80 border-amber-400/70 hover:shadow-[0_26px_60px_-32px_rgba(245,158,11,0.6)]"
                onClick={() => setCopiedFrom(null)}
                title="Exit copy mode"
              >
                Cancel copy
              </SoftButton>
            ) : null}

            <SoftButton
              className="px-2 py-1 text-[10px]"
              onClick={() => setPayoutTiers((p) => Math.min(10, p + 1))}
              disabled={!inputsOpen}
              title={!inputsOpen ? "Expand to edit tiers" : "Add payout tier"}
            >
              + Add payout tier
            </SoftButton>
            <SoftButton
              className="px-2 py-1 text-[10px] text-cyan-800 dark:text-cyan-100 bg-gradient-to-r from-cyan-200/80 via-sky-200/70 to-emerald-200/60 border-cyan-300/70 hover:shadow-[0_26px_60px_-32px_rgba(14,165,233,0.55)]"
              onClick={() => setShowWeekly(true)}
              disabled={!inputsOpen}
              title={
                !inputsOpen ? "Expand to edit weekly" : "Add weekly payout"
              }
            >
              + Add weekly payout
            </SoftButton>
          </div>
        }
      >
        {inputsOpen ? (
          <TableBox>
            <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
              <tr className="border-b-2 border-zinc-300 dark:border-zinc-700">
                <th className="px-2 py-1 text-left">Season</th>
                <th className="px-2 py-1">Buy-in (per team)</th>
                {[...Array(payoutTiers)].map((_, i) => (
                  <th key={i} className="px-2 py-1">
                    {i + 1}
                    {i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"}
                  </th>
                ))}
                {weeklyEnabled && <th className="px-2 py-1">Weekly</th>}
                <th className="px-2 py-1 text-right">Tools</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 [&>tr:nth-child(odd)]:bg-zinc-50 dark:[&>tr:nth-child(odd)]:bg-zinc-900 [&>tr:hover]:bg-zinc-100 dark:[&>tr:hover]:bg-zinc-800">
              {seasons.map((yr) => (
                <tr key={yr} className="text-center">
                  <td className="px-2 py-1 text-left font-medium">{yr}</td>
                  <td>
                    <input
                      className="w-24 px-2 py-1 rounded bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700"
                      type="number"
                      step="1"
                      value={moneyInputs[yr]?.buyin || ""}
                      onChange={(e) =>
                        setSeasonVal(yr, "buyin", e.target.value)
                      }
                    />
                  </td>
                  {[...Array(payoutTiers)].map((_, i) => {
                    const key =
                      i === 0
                        ? "first"
                        : i === 1
                        ? "second"
                        : i === 2
                        ? "third"
                        : `p${i + 1}`;
                    return (
                      <td key={i}>
                        <input
                          className="w-24 px-2 py-1 rounded bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700"
                          type="number"
                          step="1"
                          value={moneyInputs[yr]?.[key] || ""}
                          onChange={(e) =>
                            setSeasonVal(yr, key, e.target.value)
                          }
                        />
                      </td>
                    );
                  })}
                  {weeklyEnabled && (
                    <td>
                      <input
                        className="w-24 px-2 py-1 rounded bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700"
                        type="number"
                        step="1"
                        placeholder="0"
                        value={
                          moneyInputs[yr]?.weeklyHigh != null
                            ? moneyInputs[yr]?.weeklyHigh
                            : ""
                        }
                        onChange={(e) =>
                          setSeasonVal(yr, "weeklyHigh", e.target.value)
                        }
                      />
                    </td>
                  )}
                  <td className="px-2 py-1 text-right">
                    {copiedFrom == null ? (
                      <SoftButton
                        className="px-2 py-1 text-[10px]"
                        onClick={() => setCopiedFrom(yr)}
                        title="Copy this year's payouts"
                      >
                        Copy
                      </SoftButton>
                    ) : copiedFrom === yr ? (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-900 dark:text-emerald-100 bg-gradient-to-r from-emerald-200/80 via-emerald-100/70 to-teal-200/60 border border-emerald-300/70 shadow-[0_18px_40px_-30px_rgba(16,185,129,0.6)]">
                        Copied ✓
                      </span>
                    ) : (
                      <SoftButton
                        className="px-2 py-1 text-[10px] text-sky-900 dark:text-sky-100 bg-gradient-to-r from-sky-200/80 via-indigo-200/70 to-blue-200/60 border-sky-300/70 hover:shadow-[0_24px_55px_-30px_rgba(59,130,246,0.55)]"
                        onClick={() =>
                          pastePayloadToYear(yr, buildRowPayload(copiedFrom))
                        }
                        title={`Paste values from ${copiedFrom}`}
                      >
                        Paste
                      </SoftButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableBox>
        ) : (
          <div className="text-xs opacity-70">
            Inputs are collapsed. Click <b>Expand</b> to edit buy-ins, payout
            tiers, and weekly payouts. You can also copy a year and paste to
            others once expanded.
          </div>
        )}
      </Card>
      {/* ====== Earnings & ROI Over Time (chart) ====== */}
      <Card
        title="Earnings & ROI Over Time"
        subtitle={
          metricMode === "earned"
            ? "Cumulative earnings by year with ROI line"
            : "Cumulative profit (earned − invested) by year with ROI line"
        }
        right={
          <div className="flex items-center gap-2">
            <select
              className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
              value={ownerSel}
              onChange={(e) => setOwnerSel(e.target.value)}
              title="Select manager"
            >
              {(ownersList || []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>

            <select
              className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
              value={metricMode}
              onChange={(e) => setMetricMode(e.target.value)}
              title="Bar metric"
            >
              <option value="earned">Earned</option>
              <option value="profit">Profit</option>
            </select>
          </div>
        }
      >
        <div className="h-[440px] w-full">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart
              data={ownerSeries}
              margin={{ top: 8, right: 28, bottom: 24, left: 12 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.25}
                vertical={false}
              />
              <XAxis
                dataKey="year"
                allowDecimals={false}
                tick={{ fill: "#e5e7eb", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.28)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.28)" }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#e5e7eb", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.28)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.28)" }}
                tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={roiDomain}
                tick={{ fill: "#e5e7eb", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.28)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.28)" }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <ReferenceLine
                y={0}
                yAxisId="left"
                stroke="rgba(255,255,255,0.2)"
              />

              <Tooltip
                contentStyle={{
                  background: "rgba(24,24,27,0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#e5e7eb",
                }}
                labelFormatter={(y) => `Season ${y}`}
                formatter={(val, key) => {
                  if (key === "roi")
                    return [`${(val * 100).toFixed(1)}%`, "ROI"];
                  if (key === "cumInvested")
                    return [
                      `$${Math.round(val).toLocaleString()}`,
                      "Cum Invested",
                    ];
                  if (key === "value") {
                    return [
                      `$${Math.round(val).toLocaleString()}`,
                      metricMode === "earned" ? "Cum Earned" : "Cum Profit",
                    ];
                  }
                  return [`$${Math.round(val).toLocaleString()}`, key];
                }}
              />

              <Bar yAxisId="left" dataKey="value" barSize={24} stroke="none">
                {ownerSeries.map((d, i) => (
                  <Cell key={`c${i}`} fill={barFill(d.value)} />
                ))}
              </Bar>

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="roi"
                stroke="#8ab4f8"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      {/* Bottom table */}
      <div className="overflow-x-auto">
        <div className="relative min-w-full overflow-hidden rounded-3xl border border-white/30 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 shadow-[0_30px_65px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 opacity-70 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(120%_140%_at_100%_100%,rgba(16,185,129,0.14),transparent_60%)]" />
            <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
          </div>
          <div className="relative">
            <table className="min-w-[960px] w-full text-[13px] text-slate-700 dark:text-slate-200">
              <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0 z-10">
                <tr className="border-b-2 border-zinc-300 dark:border-zinc-700">
                  <th className="px-4 py-3 text-left">
                    <button
                      className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.22em] text-[11px] text-slate-600 dark:text-slate-200"
                      onClick={() => toggleSort("owner")}
                      title="Sort by Member"
                    >
                      Member
                      <span className="opacity-70 text-xs">
                        {sortIndicator("owner")}
                      </span>
                    </button>
                  </th>

                  <th className="px-4 py-3 text-center">
                    <button
                      className="inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-[0.22em] text-[11px] text-slate-600 dark:text-slate-200"
                      onClick={() => toggleSort("invested")}
                      title="Sort by Invested"
                    >
                      Invested
                      <span className="opacity-70 text-xs">
                        {sortIndicator("invested")}
                      </span>
                    </button>
                  </th>

                  <th className="px-4 py-3 text-center">
                    <button
                      className="inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-[0.22em] text-[11px] text-slate-600 dark:text-slate-200"
                      onClick={() => toggleSort("earned")}
                      title="Sort by Earned"
                    >
                      Earned
                      <span className="opacity-70 text-xs">
                        {sortIndicator("earned")}
                      </span>
                    </button>
                  </th>

                  <th className="px-4 py-3 text-center">
                    <button
                      className="inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-[0.22em] text-[11px] text-slate-600 dark:text-slate-200"
                      onClick={() => toggleSort("roi")}
                      title="Sort by ROI"
                    >
                      ROI
                      <span className="opacity-70 text-xs">
                        {sortIndicator("roi")}
                      </span>
                    </button>
                  </th>

                  {[1, 2, 3].map((place) => (
                    <th
                      key={`place-h-${place}`}
                      className="px-4 py-3 text-center"
                    >
                      <button
                        className="inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-[0.22em] text-[11px] text-slate-600 dark:text-slate-200"
                        onClick={() => toggleSort(`place${place}`)}
                        title={`Sort by ${
                          place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"
                        }`}
                      >
                        {place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}
                        <span className="opacity-70 text-xs">
                          {sortIndicator(`place${place}`)}
                        </span>
                      </button>
                    </th>
                  ))}

                  {weeklyEnabled && (
                    <th className="px-4 py-3 text-center">
                      <button
                        className="inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-[0.22em] text-[11px] text-slate-600 dark:text-slate-200"
                        onClick={() => toggleSort("weekly")}
                        title="Sort by Weekly payouts"
                      >
                        Weekly
                        <span className="opacity-70 text-xs">
                          {sortIndicator("weekly")}
                        </span>
                      </button>
                    </th>
                  )}

                  {payoutTiers > 3 &&
                    [...Array(payoutTiers - 3)].map((_, idx) => {
                      const place = idx + 4;
                      return (
                        <th
                          key={`place-h-${place}`}
                          className="px-4 py-3 text-center"
                        >
                          <button
                            className="inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-[0.22em] text-[11px] text-slate-600 dark:text-slate-200"
                            onClick={() => toggleSort(`place${place}`)}
                            title={`Sort by ${place}th`}
                          >
                            {place}
                            {place === 1
                              ? "st"
                              : place === 2
                              ? "nd"
                              : place === 3
                              ? "rd"
                              : "th"}
                            <span className="opacity-70 text-xs">
                              {sortIndicator(`place${place}`)}
                            </span>
                          </button>
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody className="relative z-10 divide-y divide-white/40 dark:divide-white/10">
                {rows.map((r, idx) => (
                  <tr
                    key={r.owner}
                    className={`text-center transition-colors ${
                      idx % 2 === 0
                        ? "bg-white/70 dark:bg-white/[0.04]"
                        : "bg-white/45 dark:bg-white/[0.025]"
                    } hover:bg-white/80 dark:hover:bg-white/10`}
                  >
                    <td className="px-4 py-3 text-left font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {r.owner}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex min-w-[96px] items-center justify-center rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-800 dark:text-slate-100 bg-white/70 dark:bg-white/[0.08] shadow-[0_20px_45px_-32px_rgba(15,23,42,0.85)]">
                        ${Math.round(r.invested).toLocaleString()}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex min-w-[96px] items-center justify-center rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[0_20px_45px_-32px_rgba(15,23,42,0.85)] ${toneByValue(
                          r.earned,
                          earnedMin,
                          earnedMax,
                          true
                        )}`}
                      >
                        ${Math.round(r.earned).toLocaleString()}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex min-w-[96px] items-center justify-center rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[0_20px_45px_-32px_rgba(15,23,42,0.85)] ${toneByValue(
                          r.roi,
                          roiMin,
                          roiMax,
                          true
                        )}`}
                      >
                        {(r.roi * 100).toFixed(1)}%
                      </span>
                    </td>

                    {[1, 2, 3].map((place) => (
                      <td key={`p-${place}`} className="px-4 py-3">
                        <span
                          className={`inline-flex min-w-[86px] items-center justify-center rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[0_20px_45px_-32px_rgba(15,23,42,0.85)] ${
                            place === 1
                              ? "bg-gradient-to-r from-amber-200/90 via-amber-100/75 to-yellow-200/80 text-amber-900 dark:from-amber-500/25 dark:via-amber-400/20 dark:to-yellow-500/15 dark:text-amber-100"
                              : place === 2
                              ? "bg-gradient-to-r from-zinc-200/90 via-zinc-100/75 to-zinc-200/80 text-zinc-900 dark:from-zinc-500/25 dark:via-zinc-400/20 dark:to-zinc-500/15 dark:text-zinc-100"
                              : "bg-gradient-to-r from-orange-200/85 via-orange-100/70 to-amber-200/70 text-orange-900 dark:from-orange-500/25 dark:via-orange-400/20 dark:to-amber-500/15 dark:text-orange-100"
                          }`}
                        >
                          ${Math.round(r.byPlace[place] || 0).toLocaleString()}
                        </span>
                      </td>
                    ))}

                    {weeklyEnabled && (
                      <td className="px-4 py-3">
                        <span className="inline-flex min-w-[86px] items-center justify-center rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-900 dark:text-sky-100 bg-gradient-to-r from-sky-200/80 via-sky-100/70 to-emerald-200/70 dark:from-sky-500/20 dark:via-sky-400/20 dark:to-emerald-500/20 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.85)]">
                          ${Math.round(r.weekly || 0).toLocaleString()}
                        </span>
                      </td>
                    )}

                    {payoutTiers > 3 &&
                      [...Array(payoutTiers - 3)].map((_, idx2) => {
                        const place = 4 + idx2;
                        return (
                          <td key={`p-${place}`} className="px-4 py-3">
                            <span className="inline-flex min-w-[86px] items-center justify-center rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-800 dark:text-slate-100 bg-white/70 dark:bg-white/[0.08] shadow-[0_20px_45px_-32px_rgba(15,23,42,0.85)]">
                              $
                              {Math.round(
                                r.byPlace[place] || 0
                              ).toLocaleString()}
                            </span>
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
/* RecordsTab with scope filter (Regular / Playoffs / All)
   Updated: “Most Highest-Scoring Weeks” uses the same schedule logic as your weekScores()
*/
export function RecordsTab({ league }) {
  if (!league) return null;
  const rawOwners = Array.isArray(league?.owners) ? league.owners : [];
  const hidden = new Set(
    Array.isArray(league?.hiddenManagers) ? league.hiddenManagers : []
  );
  const ownersList = rawOwners.filter((o) => !hidden.has(o));
  const ownersSet = new Set(ownersList);

  // -------- Scope control --------
  const [scope, setScope] = React.useState("regular"); // "regular" | "playoffs" | "all"
  const scopeLabel = {
    regular: "Regular season",
    playoffs: "Playoffs",
    all: "All games",
  }[scope];

  // finished (decided) games only
  const decided = (g) =>
    g &&
    (String(g.res).toUpperCase() === "W" ||
      String(g.res).toUpperCase() === "L");
  const inScope = (g) =>
    scope === "regular"
      ? g.is_playoff !== true
      : scope === "playoffs"
      ? g.is_playoff === true
      : true;

  const finishedGames = (league.games || []).filter(
    (g) => decided(g) && ownersSet.has(g.owner) && ownersSet.has(g.opp)
  );

  const scopeGames = finishedGames.filter(inScope);

  // completed seasons only (has a placement)
  const completedSeasons = new Set(
    (league.seasonsAll || []).filter((yr) =>
      Object.values(league.placementMap || {}).some((m) => Number(m?.[yr]))
    )
  );

  // --- helpers ---
  const fmtWeek = (w) => (w == null || isNaN(Number(w)) ? "?" : String(w));
  const byDesc = (sel) => (a, b) =>
    (sel(b) ?? -Infinity) - (sel(a) ?? -Infinity);
  const byAsc = (sel) => (a, b) => (sel(a) ?? Infinity) - (sel(b) ?? Infinity);

  const pickNum = (...vals) => {
    for (const v of vals) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  // Build quick map: teamId -> display name / owner
  const teamNameById = React.useMemo(() => {
    const m = {};
    (league.teams || []).forEach((t) => {
      const name =
        t?.owner?.name ||
        t?.ownerName ||
        [t?.location, t?.nickname].filter(Boolean).join(" ") ||
        t?.name ||
        `Team ${t?.id ?? "?"}`;
      if (t?.id != null) m[t.id] = name;
    });
    return m;
  }, [league.teams]);

  // -------- Season aggregates (completed seasons only, in-scope games) --------
  const bySeasonOwner = new Map(); // `${owner}__${season}` -> { pf, pa, wins, games }
  scopeGames.forEach((g) => {
    if (!completedSeasons.has(Number(g.season))) return;
    const k = `${g.owner}__${g.season}`;
    if (!bySeasonOwner.has(k))
      bySeasonOwner.set(k, { pf: 0, pa: 0, wins: 0, games: 0 });
    const s = bySeasonOwner.get(k);
    const pf =
      pickNum(
        g.pf,
        g.points_for,
        g.points,
        g.score,
        g.owner_points,
        g.pts,
        g.fpts
      ) || 0;
    const pa =
      pickNum(
        g.pa,
        g.points_against,
        g.opp_points,
        g.oppPts,
        g.against,
        g.opp_score
      ) || 0;
    s.pf += pf;
    s.pa += pa;
    s.games += 1;
    if (String(g.res).toUpperCase() === "W") s.wins += 1;
  });

  // -------- Weekly records (finished games in scope; require finite week) -----
  const scopeGamesWithWeek = scopeGames.filter((g) =>
    Number.isFinite(Number(g.week))
  );

  const weeklyHigh = { owner: null, val: -Infinity, season: null, week: null };
  const weeklyLow = { owner: null, val: Infinity, season: null, week: null };

  scopeGamesWithWeek.forEach((g) => {
    const pf = pickNum(
      g.pf,
      g.points_for,
      g.points,
      g.score,
      g.owner_points,
      g.pts,
      g.fpts
    );
    if (!Number.isFinite(pf)) return;
    if (pf > weeklyHigh.val)
      Object.assign(weeklyHigh, {
        owner: g.owner,
        val: pf,
        season: g.season,
        week: g.week,
      });
    if (pf < weeklyLow.val)
      Object.assign(weeklyLow, {
        owner: g.owner,
        val: pf,
        season: g.season,
        week: g.week,
      });
  });

  // ====== Most Highest-Scoring Weeks (manager counts) ======
  const topWeeklyWinnersAll = React.useMemo(() => {
    // prefer ESPN schedules (same logic as your weekScores), fallback to league.games
    const seasonsObj =
      league?.seasonsByYear ||
      (typeof window !== "undefined"
        ? window.__FL_SOURCES?.seasonsByYear
        : {}) ||
      {};
    const ownerByTeamByYear =
      league?.ownerByTeamByYear ||
      (typeof window !== "undefined"
        ? window.__sources?.ownerByTeamByYear
        : {}) ||
      {};

    const weeklyMaxByKey = new Map(); // "season__week" -> { max:number, owners:Set<string> }

    const isPlayoff = (m) => {
      const tier = String(
        m?.playoffTierType || m?.playoffTier || ""
      ).toUpperCase();
      const mtype = String(m?.matchupType || "").toUpperCase();
      return (
        (tier && tier !== "NONE") ||
        /PLAYOFF|CHAMP/.test(mtype) ||
        m?.playoffMatchup === true
      );
    };
    const inScopeMatch = (m) =>
      scope === "regular"
        ? !isPlayoff(m)
        : scope === "playoffs"
        ? isPlayoff(m)
        : true;

    const add = (season, week, owner, pts) => {
      if (!Number.isFinite(pts) || !owner || !ownersSet.has(owner)) return;
      const key = `${Number(season)}__${Number(week)}`;
      const rec = weeklyMaxByKey.get(key);
      if (!rec) {
        weeklyMaxByKey.set(key, { max: pts, owners: new Set([owner]) });
      } else if (pts > rec.max) {
        rec.max = pts;
        rec.owners = new Set([owner]);
      } else if (pts === rec.max) {
        rec.owners.add(owner);
      }
    };

    // 1) schedules
    for (const [yearStr, seasonObj] of Object.entries(seasonsObj || {})) {
      const season = Number(seasonObj?.seasonId ?? yearStr);
      const sched = Array.isArray(seasonObj?.schedule)
        ? seasonObj.schedule
        : [];
      const ownerByTeam = ownerByTeamByYear?.[season] || {};
      for (const m of sched) {
        if (!inScopeMatch(m)) continue;
        const week = Number(m?.matchupPeriodId ?? m?.scoringPeriodId ?? 0);
        if (!week) continue;

        const hId =
          m?.home?.teamId ??
          m?.homeTeam?.teamId ??
          m?.teams?.find?.((t) => t.homeAway === "home")?.teamId ??
          null;
        const aId =
          m?.away?.teamId ??
          m?.awayTeam?.teamId ??
          m?.teams?.find?.((t) => t.homeAway === "away")?.teamId ??
          null;
        const hs =
          Number(
            m?.home?.totalPoints ?? m?.homeTeam?.totalPoints ?? m?.home?.score
          ) || 0;
        const as =
          Number(
            m?.away?.totalPoints ?? m?.awayTeam?.totalPoints ?? m?.away?.score
          ) || 0;

        const hOwner = ownerByTeam[hId] || null;
        const aOwner = ownerByTeam[aId] || null;
        const top = Math.max(hs, as);
        if (hOwner && hs === top) add(season, week, hOwner, hs);
        if (aOwner && as === top) add(season, week, aOwner, as);
      }
    }

    // 2) fallback to league.games if no schedule data yielded anything
    if (weeklyMaxByKey.size === 0) {
      const inScopeGame = (g) =>
        scope === "regular"
          ? g.is_playoff !== true
          : scope === "playoffs"
          ? g.is_playoff === true
          : true;

      (league.games || [])
        .filter((g) => inScopeGame(g) && Number.isFinite(Number(g.week)))
        .forEach((g) => {
          const season = Number(g.season);
          const week = Number(g.week);
          const pf = Number(
            g.pf ??
              g.points_for ??
              g.points ??
              g.score ??
              g.owner_points ??
              g.pts ??
              g.fpts
          );
          const pa = Number(
            g.pa ??
              g.points_against ??
              g.opp_points ??
              g.oppPts ??
              g.against ??
              g.opp_score
          );
          if (Number.isFinite(pf)) add(season, week, g.owner, pf);
          if (Number.isFinite(pa)) add(season, week, g.opp, pa);
        });
    }

    // collapse to counts per owner
    const counts = {};
    weeklyMaxByKey.forEach(({ owners }) =>
      owners.forEach((o) => (counts[o] = (counts[o] || 0) + 1))
    );

    return Object.entries(counts)
      .map(([owner, cnt]) => ({ owner, cnt }))
      .sort((a, b) => b.cnt - a.cnt);
  }, [
    league?.seasonsByYear,
    league?.ownerByTeamByYear,
    league?.games,
    scope,
    ownersSet,
  ]);

  // Win streaks (per-owner PER-SEASON; in-scope finished games)
  const longestStreaks = React.useMemo(() => {
    // owner -> season -> sorted games
    const map = new Map();
    scopeGames
      .map((g) => ({
        owner: g.owner,
        season: Number(g.season),
        week: Number(g.week) || 0,
        res: String(g.res).toUpperCase(),
      }))
      .sort((a, b) => a.season - b.season || a.week - b.week)
      .forEach((g) => {
        if (!map.has(g.owner)) map.set(g.owner, new Map());
        const bySeason = map.get(g.owner);
        if (!bySeason.has(g.season)) bySeason.set(g.season, []);
        bySeason.get(g.season).push(g);
      });

    const rows = [];
    for (const [owner, bySeason] of map.entries()) {
      for (const [season, arr] of bySeason.entries()) {
        let cur = 0,
          best = 0,
          bestEndWeek = null,
          streakStart = null,
          bestStartWeek = null;
        arr.forEach((g) => {
          if (g.res === "W") {
            cur = cur + 1;
            if (cur === 1) streakStart = g.week; // new streak
            if (cur > best) {
              best = cur;
              bestEndWeek = g.week;
              bestStartWeek = streakStart;
            }
          } else {
            cur = 0;
            streakStart = null;
          }
        });
        if (best > 0)
          rows.push({
            owner,
            best,
            season,
            startW: bestStartWeek,
            endW: bestEndWeek,
          });
      }
    }
    return rows.sort(byDesc((r) => r.best));
  }, [scopeGames]);

  // Per-season highs/lows (completed seasons only, in-scope)
  let seasonHigh = { owner: null, season: null, val: -Infinity };
  let seasonLow = { owner: null, season: null, val: Infinity };
  let mostWins = { owner: null, season: null, val: -Infinity };
  let leastWins = { owner: null, season: null, val: Infinity };

  for (const [k, v] of bySeasonOwner.entries()) {
    const [owner, season] = k.split("__");
    if (v.pf > seasonHigh.val)
      seasonHigh = { owner, season: Number(season), val: v.pf };
    if (v.pf < seasonLow.val)
      seasonLow = { owner, season: Number(season), val: v.pf };
    if (v.wins > mostWins.val)
      mostWins = { owner, season: Number(season), val: v.wins };
    if (v.wins < leastWins.val)
      leastWins = { owner, season: Number(season), val: v.wins };
  }

  // ---------- Top lists from games ----------
  const topWeeklyHighAll = scopeGamesWithWeek
    .slice()
    .sort(
      byDesc((g) =>
        pickNum(
          g.pf,
          g.points_for,
          g.points,
          g.score,
          g.owner_points,
          g.pts,
          g.fpts
        )
      )
    );
  const topWeeklyLowAll = scopeGamesWithWeek
    .slice()
    .sort(
      byAsc((g) =>
        pickNum(
          g.pf,
          g.points_for,
          g.points,
          g.score,
          g.owner_points,
          g.pts,
          g.fpts
        )
      )
    );

  const seasonRows = Array.from(bySeasonOwner.entries()).map(([k, v]) => {
    const [owner, season] = k.split("__");
    return { owner, season: Number(season), pf: v.pf, wins: v.wins, pa: v.pa };
  });
  const topSeasonPFHighAll = seasonRows.slice().sort(byDesc((r) => r.pf));
  const topSeasonPFLowAll = seasonRows.slice().sort(byAsc((r) => r.pf));
  const topSeasonWinsHighAll = seasonRows.slice().sort(byDesc((r) => r.wins));
  const topSeasonWinsLowAll = seasonRows.slice().sort(byAsc((r) => r.wins));
  const topPunchingBagAll = seasonRows.slice().sort(byDesc((r) => r.pa)); // Highest PA in season

  // Largest Win Differential (in-scope)
  const largestDiffAll = scopeGamesWithWeek
    .map((g) => {
      const pf = pickNum(
        g.pf,
        g.points_for,
        g.points,
        g.score,
        g.owner_points,
        g.pts,
        g.fpts
      );
      const pa = pickNum(
        g.pa,
        g.points_against,
        g.opp_points,
        g.oppPts,
        g.against,
        g.opp_score
      );
      if (!Number.isFinite(pf) || !Number.isFinite(pa)) return null;
      const diff = Math.abs(pf - pa);
      const winner = pf >= pa ? g.owner : g.opp;
      const loser = pf >= pa ? g.opp : g.owner;
      return { winner, loser, diff, season: g.season, week: g.week };
    })
    .filter(Boolean)
    .sort(byDesc((r) => r.diff));

  const highestScoringPlayersAll = React.useMemo(() => {
    const out = [];
    const seasonsObj =
      league?.seasonsByYear ||
      (typeof window !== "undefined"
        ? window.__FL_SOURCES?.seasonsByYear
        : {}) ||
      {};
    for (const [yearStr, seasonObj] of Object.entries(seasonsObj || {})) {
      const year = Number(seasonObj?.seasonId ?? yearStr);
      const rbtbw =
        seasonObj?.rostersByTeamByWeek || seasonObj?.rostersByTeamWeek || {};
      for (const [teamIdStr, byWeek] of Object.entries(rbtbw || {})) {
        const teamId = Number(teamIdStr);
        const manager =
          ownerName(year, teamId) || teamNameById[teamId] || `Team ${teamId}`;
        for (const [weekStr, roster] of Object.entries(byWeek || {})) {
          const week = Number(weekStr);
          (roster || []).forEach((p) => {
            const pts = Number(p?.pts);
            if (!Number.isFinite(pts)) return;
            const name = p?.name || p?.playerName || "Unknown";
            out.push({ owner: manager, player: name, pts, season: year, week });
          });
        }
      }
    }
    return out.sort(byDesc((r) => r.pts));
  }, [teamNameById, league?.seasonsByYear]);

  // Longest win streak top list (already computed)
  const topWinStreaksAll = longestStreaks;

  // ---------- Championships / Sackos / Playoff Appearances ----------
  const champs = {},
    sackos = {},
    poApps = {};
  ownersList.forEach((o) => {
    champs[o] = 0;
    sackos[o] = 0;
    poApps[o] = 0;
  });

  const placementsBySeason = new Map(); // yr -> [{owner, place}]
  for (const [owner, byYear] of Object.entries(league.placementMap || {})) {
    if (!ownersSet.has(owner)) continue; // guard
    Object.entries(byYear || {}).forEach(([yrStr, place]) => {
      const yr = Number(yrStr);
      const p = Number(place);
      if (!Number.isFinite(p) || p <= 0) return;
      poApps[owner] = (poApps[owner] || 0) + 1; // playoff appearance: any positive place
      if (!placementsBySeason.has(yr)) placementsBySeason.set(yr, []);
      placementsBySeason.get(yr).push({ owner, place: p });
    });
  }
  placementsBySeason.forEach((arr) => {
    if (!arr.length) return;
    const maxPlace = Math.max(...arr.map((r) => r.place));
    arr.forEach((r) => {
      if (r.place === 1) champs[r.owner] = (champs[r.owner] || 0) + 1;
      if (r.place === maxPlace) sackos[r.owner] = (sackos[r.owner] || 0) + 1;
    });
  });

  const champArr = Object.entries(champs).sort((a, b) => b[1] - a[1]);
  const sackoArr = Object.entries(sackos).sort((a, b) => b[1] - a[1]);
  const poArr = Object.entries(poApps).sort((a, b) => b[1] - a[1]);

  const maxChamp = champArr.length ? champArr[0][1] : 0;
  const mostChamps = champArr.filter(([, c]) => c === maxChamp && c > 0);

  // ---------- Shared “Top block” renderer ----------
  const Medal = ({ place }) =>
    place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : null;

  // “see more” modal state
  const [moreKey, setMoreKey] = React.useState(null);
  const closeMore = () => setMoreKey(null);

  // generic card section (1 big line + rows 2–5 + modal)
  const TopSection = ({ title, bigLine, listAll, renderRow, moreKeyName }) => {
    const top5 = listAll.slice(0, 5);
    const tail2to5 = top5.slice(1);
    const badgeClass = (place) =>
      place === 1
        ? "bg-gradient-to-br from-amber-300/85 via-amber-200/70 to-emerald-200/70 text-amber-900 dark:from-amber-500/35 dark:via-amber-400/25 dark:to-emerald-400/25 dark:text-amber-100"
        : place === 2
        ? "bg-gradient-to-br from-zinc-200/85 via-zinc-100/60 to-zinc-200/70 text-zinc-900 dark:from-zinc-500/30 dark:via-zinc-400/20 dark:to-zinc-500/25 dark:text-zinc-100"
        : place === 3
        ? "bg-gradient-to-br from-orange-200/85 via-orange-100/60 to-amber-200/65 text-orange-900 dark:from-orange-500/30 dark:via-orange-400/20 dark:to-amber-500/25 dark:text-orange-100"
        : "bg-white/80 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-white/50 dark:border-white/10";

    return (
      <Card
        title={title}
        className="bg-white/85 dark:bg-slate-950/60 border-white/30 dark:border-white/10"
      >
        {bigLine ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/35 dark:border-white/10 px-4 py-4 shadow-[0_32px_68px_-44px_rgba(15,23,42,0.95)]">
            <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(115%_140%_at_0%_0%,rgba(251,191,36,0.22),transparent_58%),radial-gradient(120%_145%_at_100%_100%,rgba(45,212,191,0.18),transparent_62%)]" />
            <div className="relative text-base md:text-xl font-semibold leading-snug text-slate-800 dark:text-slate-100 drop-shadow-[0_1px_0_rgba(255,255,255,0.35)] dark:drop-shadow-none">
              {bigLine}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/25 dark:border-white/10 bg-white/70 dark:bg-white/[0.05] px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
            —
          </div>
        )}

        {tail2to5.length > 0 && (
          <ul className="mt-4 space-y-2">
            {tail2to5.map((item, i) => {
              const overallPlace = i + 2;
              return (
                <li key={i} className="flex items-center gap-3">
                  <div
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold uppercase tracking-[0.24em] shadow-[0_18px_42px_-32px_rgba(15,23,42,0.9)] ${badgeClass(
                      overallPlace
                    )}`}
                  >
                    {overallPlace <= 3 ? (
                      <span className="text-lg leading-none">
                        <Medal place={overallPlace} />
                      </span>
                    ) : (
                      <span>{overallPlace}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="rounded-2xl border border-white/25 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] px-4 py-2 text-[13px] md:text-sm leading-snug text-slate-700 dark:text-slate-100 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.92)]">
                      {renderRow(item, overallPlace)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {listAll.length > 5 && (
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/35 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600 transition-colors duration-200 ease-out hover:border-amber-300/70 hover:text-amber-500 dark:text-slate-200 dark:hover:text-amber-300"
            onClick={() => setMoreKey(moreKeyName)}
          >
            <span className="text-xs">View full list</span>
            <span aria-hidden="true">↗</span>
          </button>
        )}
      </Card>
    );
  };

  // ---------- Modal payloads ----------
  const modalMap = {
    weeklyHigh: {
      title: "Highest Points (week) — more",
      items: topWeeklyHighAll.slice(5, 25),
      render: (g) => (
        <div className="flex flex-wrap items-baseline gap-2 leading-tight">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {g.owner}
          </span>
          <span className="text-slate-500 dark:text-slate-300">
            —{" "}
            {Math.round(
              pickNum(
                g.pf,
                g.points_for,
                g.points,
                g.score,
                g.owner_points,
                g.pts,
                g.fpts
              )
            )}{" "}
            pts (S{g.season} W{fmtWeek(g.week)})
          </span>
        </div>
      ),
    },

    weeklyWinners: {
      title: "Most Highest-Scoring Weeks — more",
      items: topWeeklyWinnersAll.slice(5, 25),
      render: (r) => (
        <div className="flex flex-wrap items-baseline gap-2 leading-tight">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {r.owner}
          </span>
          <span className="text-slate-500 dark:text-slate-300">
            — {r.cnt} {r.cnt === 1 ? "week" : "weeks"}
          </span>
        </div>
      ),
    },

    weeklyLow: {
      title: "Lowest Points (week) — more",
      items: topWeeklyLowAll.slice(5, 25),
      render: (g) => (
        <div className="flex flex-wrap items-baseline gap-2 leading-tight">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {g.owner}
          </span>
          <span className="text-slate-500 dark:text-slate-300">
            —{" "}
            {Math.round(
              pickNum(
                g.pf,
                g.points_for,
                g.points,
                g.score,
                g.owner_points,
                g.pts,
                g.fpts
              )
            )}{" "}
            pts (S{g.season} W{fmtWeek(g.week)})
          </span>
        </div>
      ),
    },
    seasonPFHigh: {
      title: "Highest Points (season) — more",
      items: topSeasonPFHighAll.slice(5, 25),
      render: (r) => (
        <div className="flex flex-wrap items-baseline gap-2 leading-tight">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {r.owner}
          </span>
          <span className="text-slate-500 dark:text-slate-300">
            — {Math.round(r.pf)} pts (S{r.season})
          </span>
        </div>
      ),
    },
    seasonPFLow: {
      title: "Lowest Points (season) — more",
      items: topSeasonPFLowAll.slice(5, 25),
      render: (r) => (
        <div className="flex flex-wrap items-baseline gap-2 leading-tight">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {r.owner}
          </span>
          <span className="text-slate-500 dark:text-slate-300">
            — {Math.round(r.pf)} pts (S{r.season})
          </span>
        </div>
      ),
    },
    winsHigh: {
      title: "Most Wins (season) — more",
      items: topSeasonWinsHighAll.slice(5, 25),
      render: (r) => (
        <div className="flex flex-wrap items-baseline gap-2 leading-tight">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {r.owner}
          </span>
          <span className="text-slate-500 dark:text-slate-300">
            — {r.wins} wins (S{r.season})
          </span>
        </div>
      ),
    },
    winsLow: {
      title: "Least Wins (season) — more",
      items: topSeasonWinsLowAll.slice(5, 25),
      render: (r) => (
        <div className="flex flex-wrap items-baseline gap-2 leading-tight">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {r.owner}
          </span>
          <span className="text-slate-500 dark:text-slate-300">
            — {r.wins} wins (S{r.season})
          </span>
        </div>
      ),
    },
    streaks: {
      title: "Longest Win Streak — more",
      items: longestStreaks.slice(5, 25),
      render: (r) => (
        <div className="flex flex-wrap items-baseline gap-2 leading-tight">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {r.owner}
          </span>
          <span className="text-slate-500 dark:text-slate-300">
            — {r.best} straight (S{r.season} W{fmtWeek(r.startW)} → W
            {fmtWeek(r.endW)})
          </span>
        </div>
      ),
    },
    players: {
      title: "Highest Scoring Player — more",
      items: highestScoringPlayersAll.slice(5, 25),
      render: (r) => (
        <div className="flex flex-wrap items-baseline gap-2 leading-tight">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {r.team}
          </span>
          <span className="text-slate-500 dark:text-slate-300">
            — {r.player} — {Math.round(r.pts)} pts (S{r.season} W
            {fmtWeek(r.week)})
          </span>
        </div>
      ),
    },
    diff: {
      title: "Largest Win Differential — more",
      items: largestDiffAll.slice(5, 25),
      render: (r) => (
        <div className="flex flex-wrap items-baseline gap-2 leading-tight">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {r.winner}
          </span>
          <span className="text-slate-500 dark:text-slate-300">
            over {r.loser} — {Math.round(r.diff)} diff (S{r.season} W
            {fmtWeek(r.week)})
          </span>
        </div>
      ),
    },
    pa: {
      title: "League Punching Bag — more (Highest Points Against, season)",
      items: topPunchingBagAll.slice(5, 25),
      render: (r) => (
        <div className="flex flex-wrap items-baseline gap-2 leading-tight">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {r.owner}
          </span>
          <span className="text-slate-500 dark:text-slate-300">
            — {Math.round(r.pa)} against (S{r.season})
          </span>
        </div>
      ),
    },
    poapps: {
      title: "Most Playoff Appearances — more",
      items: poArr.slice(5, 25),
      render: (r) => {
        const [owner, cnt] = r;
        return (
          <div className="flex flex-wrap items-baseline gap-2 leading-tight">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {owner}
            </span>
            <span className="text-slate-500 dark:text-slate-300">— {cnt}</span>
          </div>
        );
      },
    },
  };

  const activeModal = moreKey ? modalMap[moreKey] : null;

  // ---------- UI ----------
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80 bg-[radial-gradient(120%_150%_at_0%_0%,rgba(59,130,246,0.22),transparent_58%),radial-gradient(120%_150%_at_100%_100%,rgba(45,212,191,0.18),transparent_60%)]" />
      <div className="grid md:grid-cols-2 gap-5 text-sm">
        {/* Scope picker */}
        <div className="md:col-span-2">
          <Card
            title="Records scope"
            className="bg-white/85 dark:bg-slate-950/60 border-white/30 dark:border-white/10"
            right={
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-slate-500 dark:text-slate-300">
                <span>Show</span>
                <div className="relative">
                  <select
                    className="appearance-none rounded-full border border-white/50 dark:border-white/10 bg-white/80 dark:bg-white/10 px-3 pr-8 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-200 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  >
                    <option value="regular">Regular season</option>
                    <option value="playoffs">Playoffs</option>
                    <option value="all">All games</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-400 dark:text-slate-500">
                    ▾
                  </span>
                </div>
              </div>
            }
          >
            <div className="rounded-2xl border border-white/30 dark:border-white/10 bg-white/70 dark:bg-white/[0.05] px-4 py-3 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.9)]">
              Calculations use finished games only. Season totals use completed
              seasons only. Current scope:{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-300">
                {scopeLabel}
              </span>
              .
            </div>
          </Card>
        </div>

        {/* Highest Points (week) */}
        <TopSection
          title="Highest Points (week)"
          bigLine={
            weeklyHigh.owner ? (
              <span>
                <span className="mr-1">🥇</span>
                {weeklyHigh.owner} — {Math.round(weeklyHigh.val)} (S
                {weeklyHigh.season} W{fmtWeek(weeklyHigh.week)})
              </span>
            ) : null
          }
          listAll={topWeeklyHighAll}
          renderRow={(g) => (
            <span>
              {g.owner} —{" "}
              {Math.round(
                pickNum(
                  g.pf,
                  g.points_for,
                  g.points,
                  g.score,
                  g.owner_points,
                  g.pts,
                  g.fpts
                )
              )}{" "}
              (S{g.season} W{fmtWeek(g.week)})
            </span>
          )}
          moreKeyName="weeklyHigh"
        />

        {/* Most Highest-Scoring Weeks (manager who topped the week most often) */}
        <TopSection
          title="Most Highest-Scoring Weeks"
          bigLine={
            topWeeklyWinnersAll.length ? (
              <span>
                <span className="mr-1">🥇</span>
                {topWeeklyWinnersAll[0].owner} — {topWeeklyWinnersAll[0].cnt}{" "}
                {topWeeklyWinnersAll[0].cnt === 1 ? "week" : "weeks"}
              </span>
            ) : null
          }
          listAll={topWeeklyWinnersAll}
          renderRow={(r) => (
            <span>
              {r.owner} — {r.cnt} {r.cnt === 1 ? "week" : "weeks"}
            </span>
          )}
          moreKeyName="weeklyWinners"
        />

        {/* Lowest Points (week) */}
        <TopSection
          title="Lowest Points (week)"
          bigLine={
            weeklyLow.owner ? (
              <span>
                <span className="mr-1">🥇</span>
                {weeklyLow.owner} — {Math.round(weeklyLow.val)} (S
                {weeklyLow.season} W{fmtWeek(weeklyLow.week)})
              </span>
            ) : null
          }
          listAll={topWeeklyLowAll}
          renderRow={(g) => (
            <span>
              {g.owner} —{" "}
              {Math.round(
                pickNum(
                  g.pf,
                  g.points_for,
                  g.points,
                  g.score,
                  g.owner_points,
                  g.pts,
                  g.fpts
                )
              )}{" "}
              (S{g.season} W{fmtWeek(g.week)})
            </span>
          )}
          moreKeyName="weeklyLow"
        />

        {/* Highest Points (season) */}
        <TopSection
          title="Highest Points (season)"
          bigLine={
            seasonHigh.owner ? (
              <span>
                <span className="mr-1">🥇</span>
                {seasonHigh.owner} — {Math.round(seasonHigh.val)} (S
                {seasonHigh.season})
              </span>
            ) : null
          }
          listAll={topSeasonPFHighAll}
          renderRow={(r) => (
            <span>
              {r.owner} — {Math.round(r.pf)} (S{r.season})
            </span>
          )}
          moreKeyName="seasonPFHigh"
        />

        {/* Lowest Points (season) */}
        <TopSection
          title="Lowest Points (season)"
          bigLine={
            seasonLow.owner ? (
              <span>
                <span className="mr-1">🥇</span>
                {seasonLow.owner} — {Math.round(seasonLow.val)} (S
                {seasonLow.season})
              </span>
            ) : null
          }
          listAll={topSeasonPFLowAll}
          renderRow={(r) => (
            <span>
              {r.owner} — {Math.round(r.pf)} (S{r.season})
            </span>
          )}
          moreKeyName="seasonPFLow"
        />

        {/* Most Wins (season) */}
        <TopSection
          title="Most Wins (season)"
          bigLine={
            mostWins.owner ? (
              <span>
                <span className="mr-1">🥇</span>
                {mostWins.owner} — {mostWins.val} (S{mostWins.season})
              </span>
            ) : null
          }
          listAll={topSeasonWinsHighAll}
          renderRow={(r) => (
            <span>
              {r.owner} — {r.wins} (S{r.season})
            </span>
          )}
          moreKeyName="winsHigh"
        />

        {/* Least Wins (season) */}
        <TopSection
          title="Least Wins (season)"
          bigLine={
            leastWins.owner ? (
              <span>
                <span className="mr-1">🥇</span>
                {leastWins.owner} — {leastWins.val} (S{leastWins.season})
              </span>
            ) : null
          }
          listAll={topSeasonWinsLowAll}
          renderRow={(r) => (
            <span>
              {r.owner} — {r.wins} (S{r.season})
            </span>
          )}
          moreKeyName="winsLow"
        />

        {/* Longest Win Streak (per season) */}
        <TopSection
          title="Longest Win Streak"
          bigLine={
            longestStreaks.length ? (
              <span>
                <span className="mr-1">🥇</span>
                {longestStreaks[0].owner} — {longestStreaks[0].best} (S
                {longestStreaks[0].season} W{fmtWeek(longestStreaks[0].startW)}{" "}
                → W{fmtWeek(longestStreaks[0].endW)})
              </span>
            ) : null
          }
          listAll={longestStreaks}
          renderRow={(r) => (
            <span>
              {r.owner} — {r.best} (S{r.season} W{fmtWeek(r.startW)} → W
              {fmtWeek(r.endW)})
            </span>
          )}
          moreKeyName="streaks"
        />

        {/* Highest Scoring Player */}
        <TopSection
          title="Highest Scoring Player"
          bigLine={
            highestScoringPlayersAll.length ? (
              <span>
                <span className="mr-1">🥇</span>
                {highestScoringPlayersAll[0].owner} —{" "}
                {highestScoringPlayersAll[0].player} —{" "}
                {Math.round(highestScoringPlayersAll[0].pts)} (S
                {highestScoringPlayersAll[0].season} W
                {fmtWeek(highestScoringPlayersAll[0].week)})
              </span>
            ) : null
          }
          listAll={highestScoringPlayersAll}
          renderRow={(r) => (
            <span>
              {r.owner} — {r.player} — {Math.round(r.pts)} (S{r.season} W
              {fmtWeek(r.week)})
            </span>
          )}
          moreKeyName="players"
        />

        {/* Largest Win Differential */}
        <TopSection
          title="Largest Win Differential"
          bigLine={
            largestDiffAll.length ? (
              <span>
                <span className="mr-1">🥇</span>
                {largestDiffAll[0].winner} over {largestDiffAll[0].loser} —{" "}
                {Math.round(largestDiffAll[0].diff)} (S
                {largestDiffAll[0].season} W{fmtWeek(largestDiffAll[0].week)})
              </span>
            ) : null
          }
          listAll={largestDiffAll}
          renderRow={(r) => (
            <span>
              {r.winner} over {r.loser} — {Math.round(r.diff)} (S{r.season} W
              {fmtWeek(r.week)})
            </span>
          )}
          moreKeyName="diff"
        />

        {/* Highest Points Against (season) */}
        <TopSection
          title="League Punching Bag — Highest Points Against (season)"
          bigLine={
            topPunchingBagAll.length ? (
              <span>
                <span className="mr-1">🥇</span>
                {topPunchingBagAll[0].owner} —{" "}
                {Math.round(topPunchingBagAll[0].pa)} against (S
                {topPunchingBagAll[0].season})
              </span>
            ) : null
          }
          listAll={topPunchingBagAll}
          renderRow={(r) => (
            <span>
              {r.owner} — {Math.round(r.pa)} against (S{r.season})
            </span>
          )}
          moreKeyName="pa"
        />

        {/* Most Championships (all tied shown as 🥇) */}
        <Card
          title="Most Championships"
          className="bg-white/85 dark:bg-slate-950/60 border-white/30 dark:border-white/10"
        >
          {mostChamps.length ? (
            <div className="space-y-2">
              {mostChamps.slice(0, 5).map(([o, c], idx) => (
                <div key={`mc-${o}`} className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300/90 via-yellow-200/75 to-emerald-200/70 text-lg shadow-[0_20px_55px_-32px_rgba(15,23,42,0.95)]">
                    {idx === 0 ? "🏆" : "🥇"}
                  </div>
                  <div className="flex-1 rounded-2xl border border-white/30 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] px-4 py-2 text-sm md:text-base leading-snug text-slate-700 dark:text-slate-100 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.92)]">
                    <span className="font-semibold">{o}</span>
                    <span className="ml-1 text-slate-500 dark:text-slate-300">
                      — {c}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/25 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              —
            </div>
          )}
        </Card>

        {/* Most Playoff Appearances */}
        <TopSection
          title="Most Playoff Appearances"
          bigLine={
            poArr.length ? (
              <span>
                <span className="mr-1">🥇</span>
                {poArr[0][0]} — {poArr[0][1]}
              </span>
            ) : null
          }
          listAll={poArr}
          renderRow={(r) => {
            const [o, c] = r;
            return (
              <span>
                {o} — {c}
              </span>
            );
          }}
          moreKeyName="poapps"
        />

        {/* Most Sackos */}
        <Card
          title="Most Sackos"
          className="bg-white/85 dark:bg-slate-950/60 border-white/30 dark:border-white/10"
        >
          {sackoArr.length ? (
            <div className="space-y-2">
              {sackoArr.slice(0, 5).map(([o, c], i) => (
                <div key={`ms-${o}`} className="flex items-center gap-3">
                  <div
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm shadow-[0_18px_42px_-32px_rgba(15,23,42,0.9)] ${
                      i === 0
                        ? "bg-gradient-to-br from-rose-300/85 via-red-200/65 to-amber-200/70 text-rose-900"
                        : "bg-white/70 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 border border-white/40 dark:border-white/10"
                    }`}
                  >
                    {i === 0 ? "💀" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </div>
                  <div className="flex-1 rounded-2xl border border-white/25 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] px-4 py-2 text-sm leading-snug text-slate-700 dark:text-slate-100">
                    <span className="font-semibold">{o}</span>
                    <span className="ml-1 text-slate-500 dark:text-slate-300">
                      — {c}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/25 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              —
            </div>
          )}
        </Card>

        {/* footnote */}
        <Card className="bg-white/85 dark:bg-slate-950/60 border-white/30 dark:border-white/10">
          <div className="rounded-2xl border border-white/25 dark:border-white/10 bg-white/70 dark:bg-white/[0.05] px-4 py-4 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.92)]">
            Transactions and trades need supplemental data from ESPN or your
            CSV. If your file includes per-season columns named{" "}
            <code>transactions</code> or <code>trades</code>, the Trades /
            Transactions tab will display them. Include{" "}
            <code>trade_partner</code> (or traded_with / partner / trade_with)
            to surface the most common pairings.
          </div>
        </Card>
      </div>

      {/* See-more modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={closeMore}
          />
          <div className="relative w-[min(880px,92vw)] max-h-[85vh] overflow-hidden rounded-3xl border border-white/30 dark:border-white/10 bg-white/90 dark:bg-slate-950/85 shadow-[0_45px_110px_-50px_rgba(15,23,42,0.95)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 opacity-85 bg-[radial-gradient(120%_150%_at_0%_0%,rgba(59,130,246,0.18),transparent_58%),radial-gradient(120%_150%_at_100%_100%,rgba(45,212,191,0.16),transparent_62%)]" />
            <div className="relative">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/40 dark:border-white/10 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl">
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700 dark:text-slate-200">
                  {activeModal.title}
                </div>
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-white/40 dark:border-white/15 bg-white/80 dark:bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-200 transition hover:text-amber-500 dark:hover:text-amber-300"
                  onClick={closeMore}
                >
                  Close
                </button>
              </div>
              <div
                className="p-5 overflow-y-auto text-sm text-slate-700 dark:text-slate-200"
                style={{ maxHeight: "calc(85vh - 72px)" }}
              >
                {activeModal.items.length ? (
                  <ol className="space-y-2">
                    {activeModal.items.map((item, i) => {
                      const place = i + 6;
                      return (
                        <li key={i}>
                          <div className="flex items-center gap-3 rounded-2xl border border-white/30 dark:border-white/10 bg-white/75 dark:bg-white/[0.07] px-4 py-2 shadow-[0_24px_65px_-40px_rgba(15,23,42,0.95)]">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/85 dark:bg-white/10 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
                              {place}
                            </span>
                            <div className="flex-1 leading-snug">
                              {activeModal.render(item, place)}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="rounded-2xl border border-white/25 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] px-4 py-3 text-sm text-slate-500 dark:text-slate-300">
                    No more results.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

//------------------------trade tab, TradeTab, Tradetab ----------------
// Helper: load league-specific merge map (Combine Managers)
function getMergeMap(league) {
  try {
    const lid = league?.meta?.leagueId || league?.leagueId || null;
    if (!lid) return {};
    const key = `fl_merge_map::${lid}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function TradesTab({
  league,
  rawRows = [],
  espnRostersByYear = {},
  espnOwnerByTeamByYear = {},
  espnTeamNamesByOwner = {}, // (kept but unused)
  espnOwnerFullByTeamByYear = {}, // (kept but unused)
  espnRosterAcqByYear: rosterAcqByYearProp = {},
  selectedLeague,
  activityBySeason: activityFromProp = {},
  hiddenManagers, // ✅ optional: explicit list; falls back to league.hiddenManagers
}) {
  const fmt1 = (n) => Number(n || 0).toFixed(1);
  const fmt2 = (n) => Number(n || 0).toFixed(2);

  React.useEffect(() => {
    if (!league) return;
    try {
      const aliases = window.__FL_ALIASES || {};
      primeOwnerMaps({
        league,
        selectedLeague: league,
        espnOwnerByTeamByYear: espnOwnerByTeamByYear || {},
        manualAliases: aliases,
      });
    } catch (err) {
      console.warn("primeOwnerMaps failed", err);
    }
  }, [league, espnOwnerByTeamByYear]);

  const canonicalizeViaOwnerMaps = React.useCallback((raw) => {
    const name = String(raw || "").trim();
    if (!name) return name;
    try {
      if (
        typeof window !== "undefined" &&
        window.__ownerMaps &&
        typeof window.__ownerMaps.canon === "function"
      ) {
        const mapped = window.__ownerMaps.canon(name);
        if (mapped) return mapped;
      }
    } catch (err) {
      console.warn("ownerMaps canon failed", err);
    }
    return canonicalizeOwner(name);
  }, []);
  // Build an expanded merge map so aliases like "Jacob966788" also match the pretty member name ("Jacob Teitelbaum")
  const expandedMergeMap = React.useMemo(() => {
    const out = new Map();
    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim();

    try {
      // 1) Base entries from your league-specific localStorage map
      const mm = getMergeMap(league) || {};
      for (const [alias, canonical] of Object.entries(mm)) {
        out.set(norm(alias), canonical);
      }

      // 2) If any alias is actually an ESPN "handle"/displayName, add that member's pretty name as an alias too
      const payload = JSON.parse(window.name || "{}");
      const seasons = [
        ...(Array.isArray(payload?.seasons) ? payload.seasons : []),
        ...(Array.isArray(payload?.legacySeasonsLite)
          ? payload.legacySeasonsLite
          : []),
      ];

      // Build a set of (handle -> prettyName) for all seasons we have
      const handleToPretty = new Map();
      for (const s of seasons) {
        (s?.members || []).forEach((m) => {
          const handle = String(m?.displayName || "").trim(); // may be "Jacob966788" or already a name
          const pretty =
            [m?.firstName || "", m?.lastName || ""]
              .filter(Boolean)
              .join(" ")
              .trim() || handle;
          if (handle) handleToPretty.set(handle.toLowerCase(), pretty);
        });
      }

      // For each saved alias, if it equals some member handle, also map that member's pretty name to the same canonical
      for (const [alias, canonical] of Object.entries(mm)) {
        const pretty = handleToPretty.get(String(alias).toLowerCase());
        if (pretty) {
          out.set(norm(pretty), canonical); // e.g., norm("Jacob Teitelbaum") → "Jake Teitelbaum"
        }
      }
    } catch (e) {
      console.warn("expandedMergeMap build failed", e);
    }

    return out;
  }, [league]);

  // Canonicalize owner names; honor the merge map if present
  // Canonicalize owner names; honor the merge map if present
  // Canonicalize owner names; honor expanded merge map (aliases + pretty names)
  const canonOwner = React.useCallback(
    (raw) => {
      const name = String(raw || "").trim();
      if (!name) return name;

      const norm = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim();

      // 1) Try expanded map (covers both saved alias AND that alias's pretty name)
      const hit = expandedMergeMap.get(norm);
      if (hit) return canonicalizeViaOwnerMaps(hit);

      // 2) Fallback: use the global owner maps canonicalizer
      return canonicalizeViaOwnerMaps(name);
    },
    [expandedMergeMap, canonicalizeViaOwnerMaps]
  );

  // ✅ canonicalized hidden set (league prop wins, else explicit prop)
  const hiddenSet = React.useMemo(() => {
    const list = Array.isArray(league?.hiddenManagers)
      ? league.hiddenManagers
      : Array.isArray(hiddenManagers)
      ? hiddenManagers
      : [];
    return new Set(list.map((n) => canonOwner(n)));
  }, [league?.hiddenManagers, hiddenManagers, canonOwner]);

  const rosterAcqByYear = React.useMemo(
    () => rosterAcqByYearProp || {},
    [rosterAcqByYearProp]
  );

  // ---------------- Owner name normalization (prevents duplicated rows) ----------------
  const normName = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const leagueOwners = React.useMemo(() => {
    const out = new Set();
    try {
      const payload = parsePayloadString(window.name) || {};
      const map = payload?.ownerByTeamByYear || {};
      Object.values(map).forEach((byTeam) => {
        Object.values(byTeam || {}).forEach((owner) => {
          const o = canonOwner(owner);
          if (o && !hiddenSet.has(o)) out.add(o);
        });
      });
    } catch {}
    return Array.from(out).sort((a, b) => a.localeCompare(b));
  }, [hiddenSet, canonOwner]);

  // Map normalized → canonical (from leagueOwners)
  const canonByNorm = React.useMemo(() => {
    const m = new Map();
    leagueOwners.forEach((o) => m.set(normName(o), o));
    return m;
  }, [leagueOwners]);

  const activityFromWindow = React.useMemo(() => {
    // shape: { [year]: { [Owner Name]: { acquisitions,drops,trades,moveToActive,ir } } }
    const bySeason = {};
    try {
      const payload = parsePayloadString(window.name) || {};
      const seasons = [
        ...(Array.isArray(payload?.seasons) ? payload.seasons : []),
        ...(Array.isArray(payload?.legacySeasonsLite)
          ? payload.legacySeasonsLite
          : []),
      ];

      for (const s of seasons) {
        const yr = Number(s?.seasonId);
        if (!Number.isFinite(yr)) continue;

        // memberId → best display name (prefer First Last over handle)
        const memberName = {};
        (s?.members || []).forEach((m) => {
          const dn = m?.displayName || "";
          const fn = m?.firstName || "";
          const ln = m?.lastName || "";
          const real = [fn, ln].filter(Boolean).join(" ").trim();
          const best = real || dn || "Unknown";
          if (m?.id != null) memberName[m.id] = best;
        });

        const seasonMap = bySeason[yr] || (bySeason[yr] = {});
        (s?.teams || []).forEach((t) => {
          // team can be t.id or t.teamId; owner can be t.primaryOwner or t.owners[0]
          const ownerId =
            t?.primaryOwner ?? (Array.isArray(t?.owners) ? t.owners[0] : null);
          let owner =
            ownerId != null
              ? String(memberName[ownerId] || "Unknown")
              : "Unknown";
          owner = canonOwner(owner); // ✅ collapse aliases immediately

          const tx = t?.transactionCounter || {};
          const prev = seasonMap[owner] || {
            acquisitions: 0,
            drops: 0,
            trades: 0,
            moveToActive: 0,
            ir: 0,
          };
          seasonMap[owner] = {
            acquisitions: prev.acquisitions + Number(tx.acquisitions || 0),
            drops: prev.drops + Number(tx.drops || 0),
            trades: prev.trades + Number(tx.trades || 0),
            moveToActive: prev.moveToActive + Number(tx.moveToActive || 0),
            ir: prev.ir + Number(tx.moveToIR || 0),
          };
        });
      }
    } catch {}
    return bySeason;
  }, []);

  // Prefer explicit prop if present; else use window.name harvest
  // Prefer explicit prop if present; else use window.name harvest
  const activityBySeasonRaw = activityFromWindow;

  // ✅ Re-key to canonical and accumulate (protects against any stray raw names)
  // Names coming from ownerByTeamByYear are already correct.
  const activityBySeason = activityBySeasonRaw;

  const activityBySeasonCanon = React.useMemo(() => {
    // Ensure we don’t accidentally show hidden owners
    const out = {};
    Object.entries(activityBySeason || {}).forEach(([yrStr, byOwner]) => {
      const y = Number(yrStr);
      out[y] = {};
      Object.entries(byOwner || {}).forEach(([owner, stats]) => {
        const o = canonOwner(owner);
        if (!hiddenSet.has(o)) out[y][o] = { ...stats };
      });
    });
    return out;
  }, [activityBySeason, hiddenSet, canonOwner]);

  const seasonsForTable = React.useMemo(() => {
    const s = new Set();
    Object.keys(activityBySeasonCanon || {}).forEach((yr) => s.add(Number(yr)));
    return Array.from(s).sort((a, b) => a - b);
  }, [activityBySeasonCanon]);

  const ownersUnionTx = React.useMemo(() => {
    const set = new Set();
    Object.values(activityBySeasonCanon || {}).forEach((byOwner) => {
      Object.keys(byOwner || {}).forEach((o) => {
        const c = canonOwner(o);
        if (!hiddenSet.has(c)) set.add(c);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activityBySeasonCanon, hiddenSet, canonOwner]);

  // ESPN defaultPositionId → position code
  const POS_LITE = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
  const posFromDefaultId = (n) =>
    Number.isFinite(Number(n)) ? POS_LITE[Number(n)] || "" : "";

  /** Pull position from espnRosterAcqByYear (season/teamId/playerId).
   *  If team-specific record isn’t present, scan any team in that season. */
  const getPosFromAcq = React.useCallback(
    (season, teamId, playerId) => {
      const yr = Number(season);
      const tid = Number(teamId);
      const pid = Number(playerId);
      if (!Number.isFinite(yr) || !Number.isFinite(pid)) return "";

      const rec =
        rosterAcqByYear?.[yr]?.[tid]?.[pid] ??
        (() => {
          const byTeam = rosterAcqByYear?.[yr] || {};
          for (const t of Object.values(byTeam)) {
            if (t && t[pid]) return t[pid];
          }
          return null;
        })();

      const posId =
        (rec && typeof rec === "object" ? rec.defaultPositionId : null) ?? null;
      return posFromDefaultId(posId);
    },
    [rosterAcqByYear]
  );

  // filters
  const [posFilter, setPosFilter] = React.useState("all");
  function includeByPos(posCode, filter) {
    if (!filter || filter === "all") return true;
    if (filter === "WR/RB/TE") return ["WR", "RB", "TE"].includes(posCode);
    if (filter === "WR/RB") return ["WR", "RB"].includes(posCode);
    return posCode === filter;
  }
  const [yearFilter, setYearFilter] = React.useState("all");
  const [rankMetric, setRankMetric] = React.useState("total");
  const [scopeFilter, setScopeFilter] = React.useState("regular");
  const [minWeeks, setMinWeeks] = React.useState(3);

  // Index which weeks were playoffs vs regular for each season
  const weekScopesBySeason = React.useMemo(() => {
    const map = {};
    (rawRows || []).forEach((r) => {
      const y = Number(r?.season);
      const w = Number(r?.week);
      if (!y || !w) return;
      const isPO = r?.is_playoff === true;
      if (!map[y]) map[y] = { regular: new Set(), playoffs: new Set() };
      (isPO ? map[y].playoffs : map[y].regular).add(w);
    });
    return map;
  }, [rawRows]);

  function includeWeekForScope(year, week, scopeWanted) {
    const s = weekScopesBySeason[Number(year)];
    if (!s || scopeWanted === "all") return true;
    if (scopeWanted === "playoffs") return s.playoffs.has(Number(week));
    if (scopeWanted === "regular") return s.regular.has(Number(week));
    return true;
  }

  // --- NEW: season-only exclusion sets (by id AND by name) ----------------------------------
  const excludedBySeasonId = React.useMemo(() => {
    const out = {};
    const mark = (season, pid) => {
      const s = Number(season);
      const id = Number(pid);
      if (!Number.isFinite(s) || !Number.isFinite(id)) return;
      if (!out[s]) out[s] = new Set();
      out[s].add(id);
    };
    const normAcq = (v) =>
      String(v || "")
        .trim()
        .toUpperCase();

    if (Array.isArray(rosterAcqByYear)) {
      for (const row of rosterAcqByYear) {
        const acq = normAcq(row?.acquisitionType || row?.type);
        if (acq === "TRADE" || acq === "DRAFT") {
          mark(row?.season, row?.playerId ?? row?.pid ?? row?.player_id);
        }
      }
    } else {
      for (const [seasonStr, teams] of Object.entries(rosterAcqByYear || {})) {
        for (const players of Object.values(teams || {})) {
          for (const [pidStr, rec] of Object.entries(players || {})) {
            const raw =
              typeof rec === "string"
                ? rec
                : rec && typeof rec === "object"
                ? rec.acquisitionType || rec.type || null
                : null;
            const tag = normAcq(raw);
            if (tag === "TRADE" || tag === "DRAFT") mark(seasonStr, pidStr);
          }
        }
      }
    }
    return out;
  }, [rosterAcqByYear]);

  const excludedBySeasonName = React.useMemo(() => {
    const out = {};
    const mark = (season, name) => {
      const s = Number(season);
      const nm = normName(name);
      if (!Number.isFinite(s) || !nm) return;
      if (!out[s]) out[s] = new Set();
      out[s].add(nm);
    };
    const normAcq = (v) =>
      String(v || "")
        .trim()
        .toUpperCase();

    if (Array.isArray(rosterAcqByYear)) {
      for (const row of rosterAcqByYear) {
        const acq = normAcq(row?.acquisitionType || row?.type);
        if (acq === "TRADE" || acq === "DRAFT") {
          mark(row?.season, row?.name ?? row?.playerName ?? row?.player);
        }
      }
    } else {
      for (const [seasonStr, teams] of Object.entries(rosterAcqByYear || {})) {
        for (const players of Object.values(teams || {})) {
          for (const [, rec] of Object.entries(players || {})) {
            const raw =
              typeof rec === "string"
                ? rec
                : rec && typeof rec === "object"
                ? rec.acquisitionType || rec.type || null
                : null;
            const tag = normAcq(raw);
            const nm =
              (rec &&
                typeof rec === "object" &&
                (rec.name || rec.playerName || rec.player)) ||
              null;
            if ((tag === "TRADE" || tag === "DRAFT") && nm) mark(seasonStr, nm);
          }
        }
      }
    }
    return out;
  }, [rosterAcqByYear]);

  const isExcluded = React.useCallback(
    (season, playerId, playerName) => {
      const s = Number(season);
      if (excludedBySeasonId?.[s]?.has(Number(playerId))) return true;
      const nm = normName(playerName);
      if (nm && excludedBySeasonName?.[s]?.has(nm)) return true;
      return false;
    },
    [excludedBySeasonId, excludedBySeasonName]
  );

  // ---- playoff scope helper ----
  const playoffWeeksBySeason = React.useMemo(() => {
    const out = {};
    try {
      const payload = parsePayloadString(window.name) || {};
      const allSeasons = [
        ...(Array.isArray(payload?.seasons) ? payload.seasons : []),
        ...(Array.isArray(payload?.legacySeasonsLite)
          ? payload.legacySeasonsLite
          : []),
      ];
      for (const s of allSeasons) {
        const season = Number(s?.seasonId);
        const set = new Set();
        (s?.schedule || []).forEach((g) => {
          const wk = Number(g?.matchupPeriodId);
          const tier = String(g?.playoffTierType || "").toUpperCase();
          const mtype = String(g?.matchupType || "").toUpperCase();
          const isPO =
            g?.playoffMatchup === true ||
            (tier && tier !== "NONE") ||
            /PLAYOFF|CHAMP/.test(mtype);
          if (isPO && Number.isFinite(wk)) set.add(wk);
        });
        if (set.size) out[season] = set;
      }
    } catch {}
    return out;
  }, []);

  const weekScope = React.useCallback(
    (season, week) => {
      const set = playoffWeeksBySeason[Number(season)];
      if (!set) return "regular";
      return set.has(Number(week)) ? "playoffs" : "regular";
    },
    [playoffWeeksBySeason]
  );

  // ---- build windows; exclude players tagged Trade/Draft for that season ----
  const acquisitionsAll = React.useMemo(() => {
    const out = [];
    const seasons = Object.keys(espnRostersByYear)
      .map(Number)
      .filter((y) => y >= 2019)
      .sort((a, b) => a - b);

    for (const season of seasons) {
      const byTeam = espnRostersByYear[season] || {};

      for (const [teamIdStr, wkMapRaw] of Object.entries(byTeam)) {
        const teamId = Number(teamIdStr);
        const wkMap = wkMapRaw || {};
        const weeks = Object.keys(wkMap)
          .map(Number)
          .sort((a, b) => a - b);

        const open = new Map(); // pid -> { startWeek, totalPts, weeks, name }
        const sumPtsForPid = (arr, pid) =>
          (arr || [])
            .filter((e) => Number(e?.pid) === Number(pid))
            .reduce((s, e) => s + (Number(e?.pts) || 0), 0);

        let prevSet = new Set();

        for (const w of weeks) {
          const entries = wkMap[w] || [];
          const curSet = new Set(
            entries.map((e) => Number(e?.pid)).filter(Boolean)
          );

          // open new windows
          for (const pid of curSet) {
            if (!prevSet.has(pid)) {
              const ent = entries.find((e) => Number(e?.pid) === pid);
              const name = ent?.name || `Player ${pid}`;

              let pos = getPosFromAcq(season, teamId, pid);
              if (!pos) {
                const rawPosId =
                  ent?.defaultPositionId ??
                  ent?.posId ??
                  ent?.player?.defaultPositionId ??
                  ent?.playerPoolEntry?.player?.defaultPositionId ??
                  ent?.player?.defaultPosition ??
                  null;
                pos = posFromDefaultId(rawPosId);
                if (!pos) {
                  const s =
                    ent?.pos ||
                    ent?.position ||
                    ent?.slot ||
                    ent?.player?.position ||
                    "";
                  const t = String(s || "")
                    .toUpperCase()
                    .replace(/[^A-Z]/g, "");
                  if (["QB", "RB", "WR", "TE", "K", "DST"].includes(t)) pos = t;
                }
              }

              open.set(pid, { startWeek: w, totalPts: 0, weeks: 0, name, pos });
            }
          }

          // accumulate points for open windows this week (respect scope)
          for (const [pid, win] of open.entries()) {
            if (curSet.has(pid)) {
              if (includeWeekForScope(season, w, scopeFilter)) {
                win.totalPts += sumPtsForPid(entries, pid);
                win.weeks += 1;
              }
            }
          }

          // close dropped
          for (const pid of prevSet) {
            if (!curSet.has(pid) && open.has(pid)) {
              const win = open.get(pid);
              if (win.weeks > 0 && !isExcluded(season, pid, win.name)) {
                const total = Number(win.totalPts);
                out.push({
                  season,
                  teamId,
                  owner: ownerName(season, teamId) || `Team ${teamId}`, // ✅ central mapping
                  playerId: pid,
                  player: win.name,
                  pos: win.pos,
                  weekAcquired: win.startWeek,
                  weeks: win.weeks,
                  totalPts: total,
                  ppg: win.weeks ? total / win.weeks : 0,
                  scope: weekScope(season, win.startWeek),
                });
              }
              open.delete(pid);
            }
          }

          prevSet = curSet;
        }

        // close anything still open at end of season
        for (const [pid, win] of open.entries()) {
          if (win.weeks > 0 && !isExcluded(season, pid, win.name)) {
            const total = Number(win.totalPts);
            out.push({
              season,
              teamId,
              owner: ownerName(season, teamId) || `Team ${teamId}`, // ✅ central mapping
              playerId: pid,
              player: win.name,
              pos: win.pos,
              weekAcquired: win.startWeek,
              weeks: win.weeks,
              totalPts: total,
              ppg: win.weeks ? total / win.weeks : 0,
              scope: weekScope(season, win.startWeek),
            });
          }
        }
      }
    }

    // only count acquisitions that start at week >= 2
    return out.filter((r) => Number(r.weekAcquired || 0) >= 2);
  }, [espnRostersByYear, isExcluded, weekScope, scopeFilter]);

  // ---- filters & UI (unchanged) ----
  const seasonOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          acquisitionsAll.map((a) => Number(a.season)).filter((y) => y >= 2019)
        )
      ).sort((a, b) => b - a),
    [acquisitionsAll]
  );

  const filtered = React.useMemo(() => {
    const yr = yearFilter === "all" ? null : Number(yearFilter);
    return acquisitionsAll.filter((a) => {
      if (hiddenSet.has(canonOwner(a.owner))) return false;
      if (yr && a.season !== yr) return false;
      if (scopeFilter !== "all" && a.scope !== scopeFilter) return false;
      if (Number(a.weeks || 0) < Number(minWeeks || 0)) return false;
      if (!includeByPos(a.pos, posFilter)) return false;
      return true;
    });
  }, [
    acquisitionsAll,
    yearFilter,
    scopeFilter,
    minWeeks,
    posFilter,
    hiddenSet,
    canonOwner,
  ]);

  const metricValue = React.useCallback(
    (a) => (rankMetric === "ppg" ? a.ppg : a.totalPts),
    [rankMetric]
  );

  const top20Global = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort(
      (a, b) =>
        metricValue(b) - metricValue(a) ||
        a.season - b.season ||
        a.weekAcquired - b.weekAcquired
    );
    return arr.slice(0, 20);
  }, [filtered, metricValue]);

  const top5Global = React.useMemo(
    () => top20Global.slice(0, 5),
    [top20Global]
  );

  const ownersUnion = React.useMemo(
    () =>
      Array.from(
        new Set(
          filtered
            .map((a) => a.owner)
            .filter((o) => !hiddenSet.has(canonOwner(o)))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [filtered, hiddenSet, canonOwner]
  );

  const top5ByOwner = React.useMemo(() => {
    const out = {};
    ownersUnion.forEach((o) => {
      const mine = filtered.filter((a) => a.owner === o);
      mine.sort(
        (a, b) =>
          metricValue(b) - metricValue(a) ||
          a.season - b.season ||
          a.weekAcquired - b.weekAcquired
      );
      out[o] = mine.slice(0, 5);
    });
    return out;
  }, [ownersUnion, filtered, metricValue]);

  const FancySelect = ({ label, className = "", children, ...props }) => (
    <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700 dark:text-amber-300">
      {label ? <span>{label}</span> : null}
      <div className="relative">
        <select
          {...props}
          className={`appearance-none min-w-[8.75rem] px-4 py-2 pr-9 rounded-full border border-amber-300/60 bg-white/85 dark:bg-zinc-950/60 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-800 dark:text-amber-100 shadow-[0_18px_40px_-28px_rgba(251,191,36,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 transition-all ${className}`}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500">
          ▾
        </span>
      </div>
    </label>
  );

  const FancyStepper = ({ label, value, onDec, onInc }) => (
    <div className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700 dark:text-amber-300">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/60 bg-white/85 dark:bg-zinc-950/60 text-amber-700 dark:text-amber-100 shadow-[0_18px_40px_-30px_rgba(251,191,36,0.7)] transition-transform hover:-translate-y-0.5"
          onClick={onDec}
        >
          –
        </button>

        <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-full border border-amber-300/60 bg-amber-50/70 dark:bg-amber-900/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-800 dark:text-amber-100">
          {value}
        </span>

        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/60 bg-white/85 dark:bg-zinc-950/60 text-amber-700 dark:text-amber-100 shadow-[0_18px_40px_-30px_rgba(251,191,36,0.7)] transition-transform hover:-translate-y-0.5"
          onClick={onInc}
        >
          +
        </button>
      </div>
    </div>
  );

  const PickupRow = ({ a, showOwner = true, rank }) => (
    <div className="group relative overflow-hidden rounded-2xl border border-white/55 dark:border-white/10 bg-white/85 dark:bg-zinc-950/60 px-4 py-3 shadow-[0_28px_60px_-40px_rgba(59,130,246,0.65)] transition-all hover:-translate-y-[1px] hover:shadow-[0_26px_55px_-32px_rgba(129,140,248,0.75)]">
      <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(120%_140%_at_100%_100%,rgba(236,72,153,0.14),transparent_60%)]" />
      <div className="relative flex items-center gap-4">
        {rank ? (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/70 dark:border-white/15 bg-gradient-to-br from-indigo-500/20 via-sky-400/20 to-emerald-400/30 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-100">
            #{rank}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            {showOwner ? (
              <>
                <span>{a.owner || "—"}</span>
                <span className="mx-1 text-slate-400">•</span>
              </>
            ) : null}
            <span>{a.player}</span>
            {a.pos ? (
              <span className="ml-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                ({a.pos})
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.32em] text-slate-400 dark:text-slate-500">
            <span>
              Wk {a.weekAcquired}, {a.season}
            </span>
            <span>
              {a.weeks} wk{a.weeks === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
            {fmt1(a.totalPts)} pts
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 tabular-nums">
            {fmt2(a.ppg)} PPG
          </div>
        </div>
      </div>
    </div>
  );

  const Top5Panel = () => (
    <div className="relative">
      <Card
        title={`Best Pickups${
          yearFilter === "all" ? " (All-time)" : ` (${yearFilter})`
        }`}
        right={
          <div className="flex flex-wrap items-end gap-3 justify-end">
            <FancySelect
              label="Season"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              title="Season"
            >
              <option value="all">All seasons</option>
              {seasonOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </FancySelect>

            <FancySelect
              label="Scope"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              title="Scope"
            >
              <option value="regular">Regular season</option>
              <option value="playoffs">Playoffs</option>
              <option value="all">All games</option>
            </FancySelect>

            <FancySelect
              label="Position"
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              title="Position"
            >
              <option value="all">All positions</option>
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
              <option value="DST">DEF</option>
              <option value="K">K</option>
              <option value="WR/RB/TE">WR/RB/TE</option>
              <option value="WR/RB">WR/RB</option>
            </FancySelect>

            <FancySelect
              label="Metric"
              value={rankMetric}
              onChange={(e) => setRankMetric(e.target.value)}
              title="Ranking metric"
            >
              <option value="total">Rank by Total points</option>
              <option value="ppg">Rank by PPG</option>
            </FancySelect>

            <FancyStepper
              label="Min Weeks"
              value={minWeeks}
              onDec={() => setMinWeeks((x) => Math.max(1, Number(x || 0) - 1))}
              onInc={() => setMinWeeks((x) => Math.min(99, Number(x || 0) + 1))}
            />
          </div>
        }
      >
        {filtered.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            No qualifying free-agency acquisitions found.
          </div>
        ) : (
          <div className="space-y-3">
            {top5Global.map((a, i) => (
              <PickupRow
                key={`${a.season}-${a.weekAcquired}-${a.playerId}-${i}`}
                a={a}
                rank={i + 1}
              />
            ))}
          </div>
        )}

        <div className="mt-4 text-[10px] uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
          {rankMetric === "ppg"
            ? "PPG since acquisition"
            : "Total points since acquisition"}{" "}
          • Scope:{" "}
          {scopeFilter === "all"
            ? "All games"
            : scopeFilter === "playoffs"
            ? "Playoffs"
            : "Regular season"}{" "}
          • Min weeks: {minWeeks} • Source: Free Agency / Waivers (excludes
          players tagged Draft/Trade for that season)
        </div>
      </Card>

      {/* Floating + anchored to the true card corner (outside padded content) */}
      {top20Global.length > 5 && (
        <button
          onClick={() => setMoreGlobal(true)}
          title="Show more"
          className="absolute bottom-6 right-6 inline-flex h-9 w-9 translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-amber-300/60 bg-gradient-to-br from-amber-300/40 via-amber-200/35 to-amber-100/30 text-amber-800 dark:text-amber-100 shadow-[0_20px_45px_-26px_rgba(251,191,36,0.75)] backdrop-blur transition-all hover:scale-105"
        >
          +
        </button>
      )}
    </div>
  );

  const PerOwnerPanels = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {ownersUnion.map((o) => {
        const list = top5ByOwner[o] || [];

        // build a sorted list for this owner (same sort as top5), up to 20
        const fullList = React.useMemo(() => {
          const mine = filtered.filter((a) => a.owner === o);
          mine.sort(
            (a, b) =>
              metricValue(b) - metricValue(a) ||
              a.season - b.season ||
              a.weekAcquired - b.weekAcquired
          );
          return mine.slice(0, 20);
        }, [filtered, o, metricValue]);

        return (
          <Card
            key={o}
            title={`${o} — Top 5 FA Pickups`}
            right={
              fullList.length > 5 ? (
                <button
                  onClick={() => setMoreOwner(o)}
                  title="Show more"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/60 bg-gradient-to-br from-amber-300/40 via-amber-200/35 to-amber-100/30 text-[12px] font-semibold text-amber-800 dark:text-amber-100 shadow-[0_18px_40px_-30px_rgba(251,191,36,0.7)] transition-transform hover:scale-105"
                >
                  +
                </button>
              ) : null
            }
          >
            {list.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                No qualifying pickups.
              </div>
            ) : (
              <div className="space-y-3">
                {list.map((a, i) => (
                  <PickupRow
                    key={`${o}-${a.season}-${a.weekAcquired}-${a.playerId}-${i}`}
                    a={a}
                    showOwner={false}
                    rank={i + 1}
                  />
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );

  // ---------------- Single transactions table (metric switcher) ----------------
  const METRIC_OPTIONS = [
    { value: "acquisitions", label: "Acquisitions" },
    { value: "drops", label: "Drops" },
    { value: "trades", label: "Trades" },
    { value: "moveToActive", label: "Moves to Active" },
    { value: "ir", label: "IR Moves" },
    { value: "all", label: "All (sum)" },
  ];
  const [metric, setMetric] = React.useState("acquisitions");

  const sumAll = (s) =>
    (s?.acquisitions || 0) +
    (s?.drops || 0) +
    (s?.trades || 0) +
    (s?.moveToActive || 0) +
    (s?.ir || 0);

  const pickMetric = (s, m) => (m === "all" ? sumAll(s) : s?.[m] || 0);

  const rowsTx = React.useMemo(() => {
    return ownersUnionTx.map((o) => {
      const canon = canonOwner(o);
      const row = { owner: canon, total: 0 };
      seasonsForTable.forEach((yr) => {
        const v = pickMetric(activityBySeasonCanon?.[yr]?.[canon], metric);
        row[yr] = v;
        row.total += v;
      });
      return row;
    });
  }, [
    ownersUnionTx,
    seasonsForTable,
    activityBySeasonCanon,
    metric,
    canonOwner,
  ]);

  const metricLabel =
    METRIC_OPTIONS.find((m) => m.value === metric)?.label || "Metric";

  // modal state for "see more" on per-owner cards
  // modal state for "see more" on per-owner cards
  const [moreOwner, setMoreOwner] = React.useState(null);
  // modal state for "see more" on the global Best Pickups card
  const [moreGlobal, setMoreGlobal] = React.useState(false);

  const TransactionsTable = () => (
    <Card
      title={
        <div className="flex flex-wrap items-end justify-between gap-4">
          <span>{metricLabel} by Member (per season)</span>
          <FancySelect
            label="Metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            title="Metric"
          >
            {METRIC_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FancySelect>
        </div>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-zinc-950/50 backdrop-blur">
        <table className="min-w-full text-[13px]">
          <thead className="sticky top-0 bg-gradient-to-r from-indigo-500/20 via-sky-400/20 to-emerald-400/25 text-[10px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-200">
            <tr className="divide-x divide-white/40 dark:divide-white/10">
              <th className="px-4 py-3 text-left font-semibold">Member</th>
              {seasonsForTable.map((yr) => (
                <th
                  key={`h-${yr}`}
                  className="px-4 py-3 text-center font-semibold"
                >
                  {yr}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/45 dark:divide-white/10 text-sm text-slate-700 dark:text-slate-200">
            {rowsTx.map((r) => (
              <tr
                key={r.owner}
                className="transition-colors hover:bg-white/55 dark:hover:bg-white/5"
              >
                <td className="px-4 py-3 text-left font-semibold">{r.owner}</td>
                {seasonsForTable.map((yr) => (
                  <td
                    key={`${r.owner}-${yr}`}
                    className="px-4 py-3 text-center tabular-nums"
                  >
                    {r[yr] || 0}
                  </td>
                ))}
                <td className="px-4 py-3 text-center font-semibold tabular-nums text-indigo-600 dark:text-indigo-300">
                  {r.total || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  // simple local modal for showing 20 rows
  const MoreModal = ({ owner, onClose }) => {
    // rebuild 20 for the selected owner (same sort)
    const mine = React.useMemo(() => {
      const arr = filtered.filter((a) => a.owner === owner);
      arr.sort(
        (a, b) =>
          metricValue(b) - metricValue(a) ||
          a.season - b.season ||
          a.weekAcquired - b.weekAcquired
      );
      return arr.slice(0, 20);
    }, [filtered, owner, metricValue]);

    return (
      <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0 bg-slate-950/75 backdrop-blur"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="absolute left-1/2 top-1/2 w-[min(680px,92vw)] max-h-[82vh] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl border border-white/20 dark:border-white/10 bg-white/85 dark:bg-zinc-950/80 shadow-[0_35px_85px_-45px_rgba(59,130,246,0.8)] backdrop-blur-xl">
          <div className="relative flex items-center justify-between gap-3 border-b border-white/40 dark:border-white/10 bg-white/90 dark:bg-zinc-950/85 px-6 py-4">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-200">
              {owner} — Top 20 FA Pickups
            </div>
            <button
              className="inline-flex items-center justify-center rounded-full border border-white/60 dark:border-white/15 bg-gradient-to-br from-rose-500/25 via-amber-400/20 to-emerald-400/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-700 dark:text-slate-100 shadow-[0_20px_45px_-30px_rgba(244,114,182,0.6)] transition-transform hover:scale-105"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <div className="p-5">
            {mine.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                No qualifying pickups.
              </div>
            ) : (
              <div className="space-y-3">
                {mine.map((a, i) => (
                  <PickupRow
                    key={`${owner}-${a.season}-${a.weekAcquired}-${a.playerId}-${i}`}
                    a={a}
                    showOwner={false}
                    rank={i + 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Top5Panel />
      <PerOwnerPanels />

      {moreOwner ? (
        <MoreModal owner={moreOwner} onClose={() => setMoreOwner(null)} />
      ) : null}

      {moreGlobal ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-950/75 backdrop-blur"
            onClick={() => setMoreGlobal(false)}
            aria-hidden="true"
          />
          <div className="absolute left-1/2 top-1/2 w-[min(720px,92vw)] max-h-[82vh] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl border border-white/20 dark:border-white/10 bg-white/85 dark:bg-zinc-950/80 shadow-[0_35px_85px_-45px_rgba(59,130,246,0.8)] backdrop-blur-xl">
            <div className="relative flex items-center justify-between gap-3 border-b border-white/40 dark:border-white/10 bg-white/90 dark:bg-zinc-950/85 px-6 py-4">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-200">
                Best Pickups — Top 20
              </div>
              <button
                className="inline-flex items-center justify-center rounded-full border border-white/60 dark:border-white/15 bg-gradient-to-br from-rose-500/25 via-amber-400/20 to-emerald-400/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-700 dark:text-slate-100 shadow-[0_20px_45px_-30px_rgba(244,114,182,0.6)] transition-transform hover:scale-105"
                onClick={() => setMoreGlobal(false)}
              >
                Close
              </button>
            </div>
            <div className="p-5">
              {top20Global.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  No qualifying pickups.
                </div>
              ) : (
                <div className="space-y-3">
                  {top20Global.map((a, i) => (
                    <PickupRow
                      key={`global-${a.season}-${a.weekAcquired}-${a.playerId}-${i}`}
                      a={a}
                      showOwner={true}
                      rank={i + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Transactions table (ESPN transactionCounter with owner normalization) */}
      <TransactionsTable />
    </div>
  );
}

/* ---------------- RosterTab — per-week lineups by team --------------- */
/** ESPN lineup slot ids -> row label */
const __SLOT_LABEL = {
  0: "QB",
  2: "RB",
  3: "WR",
  4: "WR", // WR/TE counts can live on WR row
  6: "TE",
  7: "OP",
  16: "D/ST",
  17: "K",
  20: "BENCH",
  21: "IR",
  23: "FLEX",
};

/** sensible display order */
const __ROW_ORDER = [0, 2, 3, 4, 6, 7, 23, 16, 17, 21, 20];

function __buildRowSpecs(lineupCounts = {}) {
  const specs = [];
  __ROW_ORDER.forEach((slotId) => {
    const cnt = Number(lineupCounts?.[slotId] ?? 0);
    if (!cnt || cnt < 0) return;
    const base = __SLOT_LABEL[slotId] || `SLOT ${slotId}`;
    for (let i = 1; i <= cnt; i++) {
      const label =
        slotId === 20 ? `BENCH${i}` : cnt > 1 ? `${base}${i}` : base;
      specs.push({ slotId, label, index: i }); // index 1..cnt
    }
  });
  return specs;
}

// --- slot + position helpers (ESPN ids) ---
const SLOT = {
  QB: 0,
  RB: 2,
  WR: 3,
  TE: 6,
  OP: 7,
  DST: 16,
  K: 17,
  BENCH: 20,
  IR: 21,
  FLEX: 23,
};
// ESPN defaultPositionId for players: QB=1, RB=2, WR=3, TE=4, K=5, DST=16
const POS = { QB: 1, RB: 2, WR: 3, TE: 4, K: 5, DST: 16 };
const __POS_LABEL = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
// Sleeper → ESPN id coercion
const SLP_TO_SLOT = {
  QB: 0,
  RB: 2,
  WR: 3,
  TE: 6,
  OP: 7,
  FLEX: 23,
  DST: 16,
  D: 16,
  K: 17,
  BN: 20,
  BENCH: 20,
  IR: 21,
};
const SLP_TO_POS = { QB: 1, RB: 2, WR: 3, TE: 4, K: 5, DST: 16, D: 16 };

// Coerce any slot token (number | string) to an ESPN slot id (number) or null
function __coerceSlotId(token) {
  if (Number.isFinite(Number(token))) return Number(token);
  const t = String(token || "").toUpperCase();
  return Number.isFinite(SLP_TO_SLOT[t]) ? SLP_TO_SLOT[t] : null;
}

// Coerce any position token (number | string) to an ESPN defaultPositionId (number) or null
function __coercePosId(token) {
  if (Number.isFinite(Number(token))) {
    const n = Number(token);
    return n === 0 ? null : n; // guard zeroes
  }
  const t = String(token || "").toUpperCase();
  return Number.isFinite(SLP_TO_POS[t]) ? SLP_TO_POS[t] : null;
}

// is player (by posId) eligible for a given slotId?
function __eligible(posId, slotId) {
  if (slotId === SLOT.QB) return posId === POS.QB;
  if (slotId === SLOT.RB) return posId === POS.RB;
  if (slotId === SLOT.WR || slotId === 4) return posId === POS.WR;
  if (slotId === SLOT.TE) return posId === POS.TE;
  if (slotId === SLOT.DST) return posId === POS.DST;
  if (slotId === SLOT.K) return posId === POS.K;
  if (slotId === SLOT.FLEX)
    return posId === POS.RB || posId === POS.WR || posId === POS.TE;
  if (slotId === SLOT.OP)
    return (
      posId === POS.QB ||
      posId === POS.RB ||
      posId === POS.WR ||
      posId === POS.TE
    );
  return false;
}

const __num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function __normalizeLineupCountsPerSeason(src = {}) {
  const out = {};
  Object.entries(src || {}).forEach(([season, val]) => {
    if (Array.isArray(val)) {
      const counts = {};
      for (const tok of val) {
        const sid = __coerceSlotId(tok);
        if (!Number.isFinite(sid)) continue;
        counts[sid] = (counts[sid] || 0) + 1;
      }
      out[season] = counts;
    } else if (val && typeof val === "object") {
      // also coerce keys if they’re strings like "QB"
      const counts = {};
      Object.entries(val).forEach(([k, v]) => {
        const sid = __coerceSlotId(k);
        if (!Number.isFinite(sid)) return;
        counts[sid] = Number(v) || 0;
      });
      out[season] = counts;
    } else {
      out[season] = {};
    }
  });
  return out;
}

// NEW: first non-empty object helper
function __firstNonEmpty(...cands) {
  for (const c of cands) {
    if (c && typeof c === "object" && Object.keys(c).length) return c;
  }
  return {};
}

const __entrySlotId = (e) => {
  // ESPN first
  const espn = e?.lineupSlotId ?? e?.slotId ?? e?.slot ?? null;
  // Sleeper often uses strings like "RB", "BN"
  return __coerceSlotId(espn ?? e?.position ?? e?.roster_slot);
};

const __entryPosId = (e) => {
  // ESPN
  const espn =
    e?.defaultPositionId ??
    e?.playerPoolEntry?.player?.defaultPositionId ??
    e?.player?.defaultPositionId ??
    e?.posId;
  if (espn != null) return __coercePosId(espn);

  // Sleeper: position / fantasy_positions[0]
  const sl =
    e?.position ??
    e?.player?.position ??
    (Array.isArray(e?.player?.fantasy_positions)
      ? e.player.fantasy_positions[0]
      : null);
  return __coercePosId(sl);
};

const __entryPts = (e) =>
  __num(
    e?.appliedTotal ??
      e?.playerPoints?.appliedTotal ??
      e?.appliedStatTotal ??
      e?.pts ??
      0
  );

// projected points for that roster entry (week)
const __entryProj = (e) =>
  __num(
    e?.proj ??
      e?.projStart ??
      e?.projectedStart ??
      e?.playerPoints?.projectedTotal ??
      0
  );

// Prefer ESPN's eligibleSlots; fall back to any nested path we find.
const __entryEligibleSlots = (e) =>
  e?.eligibleSlots ??
  e?.player?.eligibleSlots ??
  e?.playerPoolEntry?.player?.eligibleSlots ??
  null;
const __entryIsMarkedInjured = (entry) => {
  if (!entry) return false;
  if (entry?.injured === true) return true;
  const sid = Number(__entrySlotId(entry));
  if (sid === SLOT.IR) return true;
  return false;
};
const __collectWeekNums = (value, outSet) => {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((v) => __collectWeekNums(v, outSet));
    return;
  }
  if (typeof value === "object") {
    Object.values(value || {}).forEach((v) => __collectWeekNums(v, outSet));
    return;
  }
  const n = Number(value);
  if (Number.isFinite(n)) outSet.add(n);
};
const __entryByeWeekNumbers = (entry) => {
  const set = new Set();
  __collectWeekNums(entry?.byeWeeks, set);
  __collectWeekNums(entry?.byeWeekSchedule, set);
  __collectWeekNums(entry?.proTeamByeWeekSchedule, set);
  __collectWeekNums(entry?.player?.byeWeeks, set);
  __collectWeekNums(entry?.player?.byeWeekSchedule, set);
  __collectWeekNums(entry?.playerPoolEntry?.byeWeeks, set);
  __collectWeekNums(entry?.playerPoolEntry?.byeWeekSchedule, set);
  __collectWeekNums(entry?.playerPoolEntry?.player?.byeWeeks, set);
  __collectWeekNums(entry?.playerPoolEntry?.player?.byeWeekSchedule, set);
  return Array.from(set);
};
const __entryIsOnByeForWeek = (entry, week) => {
  if (!entry) return false;
  if (entry?.onBye != null) return Boolean(entry.onBye);
  const w = Number(week);
  if (!Number.isFinite(w) || w <= 0) return false;
  const singles = [
    entry?.byeWeek,
    entry?.proTeamByeWeek,
    entry?.player?.byeWeek,
    entry?.player?.proTeamByeWeek,
    entry?.playerPoolEntry?.byeWeek,
    entry?.playerPoolEntry?.proTeamByeWeek,
    entry?.playerPoolEntry?.player?.byeWeek,
    entry?.playerPoolEntry?.player?.proTeamByeWeek,
  ];
  for (const cand of singles) {
    const n = Number(cand);
    if (Number.isFinite(n) && n === w) return true;
  }
  const weeks = __entryByeWeekNumbers(entry);
  return weeks.some((n) => n === w);
};
const __normalizeTeamToken = (value) => {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  return str.toUpperCase();
};

const __hasAnyEntries = (value) => {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof Map) return value.size > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
};

const __seasonKeyVariants = (seasonKey) => {
  const keys = [];
  if (seasonKey != null) keys.push(seasonKey);
  const seasonNum = Number(seasonKey);
  if (Number.isFinite(seasonNum)) {
    keys.push(seasonNum);
    const str = String(seasonNum);
    if (str !== seasonKey) keys.push(str);
  }
  return keys
    .map((k) => (typeof k === "number" ? k : String(k)))
    .filter((k, idx, arr) => {
      if (k == null || k === "" || k === "NaN") return false;
      return arr.indexOf(k) === idx;
    });
};

const __getFromContainer = (container, key) => {
  if (!container) return undefined;
  if (container instanceof Map) return container.get(key);
  if (typeof container.get === "function") {
    try {
      const val = container.get(key);
      if (val !== undefined) return val;
    } catch {}
  }
  return container[key];
};

function __resolveProTeamsForSeason(seasonKey, league) {
  const variants = __seasonKeyVariants(seasonKey);
  const pick = (source) => {
    if (!source) return null;
    for (const key of variants) {
      const direct = __getFromContainer(source, key);
      if (__hasAnyEntries(direct)) return direct;
      if (typeof key === "string") {
        const alt = __getFromContainer(source, Number(key));
        if (__hasAnyEntries(alt)) return alt;
      } else if (Number.isFinite(key)) {
        const alt = __getFromContainer(source, String(key));
        if (__hasAnyEntries(alt)) return alt;
      }
    }
    return null;
  };

  const fromByYear = pick(league?.proTeamsByYear);
  if (__hasAnyEntries(fromByYear)) return fromByYear;

  const seasonObj = pick(league?.seasonsByYear);
  if (__hasAnyEntries(seasonObj)) {
    const nested =
      seasonObj?.proTeams ??
      seasonObj?.proTeamsById ??
      seasonObj?.proTeamsMap ??
      seasonObj?.proTeamInfo;
    if (__hasAnyEntries(nested)) return nested;
  }

  if (__hasAnyEntries(league?.proTeams)) return league.proTeams;

  try {
    const payload = parsePayloadString(window.name) || {};
    const payloadByYear = pick(payload?.proTeamsByYear);
    if (__hasAnyEntries(payloadByYear)) return payloadByYear;

    if (Array.isArray(payload?.seasons)) {
      const seasonNum = Number(seasonKey);
      const seasonFromPayload = payload.seasons.find((s) => {
        const sid = Number(s?.seasonId);
        if (Number.isFinite(seasonNum)) return sid === seasonNum;
        return variants.some((key) => String(sid) === String(key));
      });
      if (__hasAnyEntries(seasonFromPayload)) {
        const nested =
          seasonFromPayload?.proTeams ??
          seasonFromPayload?.proTeamsById ??
          seasonFromPayload?.proTeamsMap ??
          seasonFromPayload?.proTeamInfo;
        if (__hasAnyEntries(nested)) return nested;
      }
    }

    if (__hasAnyEntries(payload?.proTeams)) return payload.proTeams;
  } catch {}

  return null;
}

const __teamByeWeekNumbers = (team) => {
  const set = new Set();
  __collectWeekNums(team?.byeWeek, set);
  __collectWeekNums(team?.byeWeeks, set);
  __collectWeekNums(team?.byeWeekSchedule, set);
  __collectWeekNums(team?.byeWeekNumber, set);
  __collectWeekNums(team?.byeWeekNumbers, set);
  __collectWeekNums(team?.byeWeek?.week, set);
  __collectWeekNums(team?.byeWeek?.byeWeek, set);
  return Array.from(set).sort((a, b) => a - b);
};

function __buildProTeamLookup(source) {
  const byeById = new Map();
  const abbrevToId = new Map();
  if (!__hasAnyEntries(source)) return { byeById, abbrevToId };

  const pushTeam = (team, key) => {
    if (!team || typeof team !== "object") return;
    const idCand =
      team?.id ??
      team?.teamId ??
      team?.proTeamId ??
      (Number.isFinite(Number(key)) ? Number(key) : null);
    const id = Number(idCand);
    if (!Number.isFinite(id)) return;

    const byeWeeks = __teamByeWeekNumbers(team);
    if (byeWeeks.length) byeById.set(id, byeWeeks[0]);

    const tokens = [
      team?.abbrev,
      team?.abbreviation,
      team?.teamAbbrev,
      team?.teamAbbreviation,
      team?.shortName,
      team?.nickname,
      team?.nickName,
      team?.nameShort,
    ];
    const location = String(team?.location || "").trim();
    const name = String(team?.name || "").trim();
    if (location) tokens.push(location);
    if (name) tokens.push(name);
    if (location && name) tokens.push(`${location} ${name}`);

    tokens
      .map(__normalizeTeamToken)
      .filter(Boolean)
      .forEach((token) => {
        if (!abbrevToId.has(token)) abbrevToId.set(token, id);
      });
  };

  if (source instanceof Map) {
    source.forEach((team, key) => pushTeam(team, key));
  } else if (Array.isArray(source)) {
    source.forEach((team, idx) => pushTeam(team, team?.id ?? idx));
  } else if (typeof source === "object") {
    Object.entries(source).forEach(([key, team]) => pushTeam(team, key));
  }

  return { byeById, abbrevToId };
}

function __entryProTeamIds(entry, abbrevToId) {
  const ids = new Set();
  if (!entry) return [];

  const lookup = (token) => {
    if (!token) return;
    const numeric = Number(token);
    if (Number.isFinite(numeric)) {
      ids.add(numeric);
      return;
    }
    const norm = __normalizeTeamToken(token);
    if (!norm) return;
    if (abbrevToId instanceof Map && abbrevToId.has(norm)) {
      ids.add(abbrevToId.get(norm));
      return;
    }
    if (abbrevToId && typeof abbrevToId === "object") {
      const cand = abbrevToId[norm];
      const candId = Number(
        cand?.id ?? cand?.teamId ?? cand?.proTeamId ?? cand
      );
      if (Number.isFinite(candId)) ids.add(candId);
    }
  };

  const candidates = [
    entry?.proTeamId,
    entry?.proTeam,
    entry?.teamId,
    entry?.nflTeamId,
    entry?.player?.proTeamId,
    entry?.player?.proTeam,
    entry?.player?.teamId,
    entry?.player?.nflTeamId,
    entry?.player?.proTeamIdCurrent,
    entry?.player?.proTeamAbbreviation,
    entry?.player?.teamAbbreviation,
    entry?.playerPoolEntry?.proTeamId,
    entry?.playerPoolEntry?.proTeam,
    entry?.playerPoolEntry?.teamId,
    entry?.playerPoolEntry?.player?.proTeamId,
    entry?.playerPoolEntry?.player?.proTeam,
    entry?.playerPoolEntry?.player?.teamId,
    entry?.playerPoolEntry?.player?.nflTeamId,
    entry?.playerPoolEntry?.player?.proTeamIdCurrent,
    entry?.playerPoolEntry?.player?.proTeamAbbreviation,
    entry?.playerPoolEntry?.player?.teamAbbreviation,
  ];
  candidates.forEach(lookup);

  return Array.from(ids);
}

function __entryHasTeamBye(entry, week, lookup) {
  if (!lookup) return false;
  const w = Number(week);
  if (!Number.isFinite(w) || w <= 0) return false;
  const ids = __entryProTeamIds(entry, lookup.abbrevToId);
  return ids.some((id) => Number.isFinite(id) && lookup.byeById.get(id) === w);
}

// Build the list of starting slotIds for this league (exclude BENCH/IR)
function __buildStartSlots(lineupCounts = {}) {
  const out = [];
  Object.entries(lineupCounts || {}).forEach(([k, v]) => {
    const slotId = Number(k);
    const cnt = __num(v);
    if (!cnt) return;
    if (slotId === SLOT.BENCH || slotId === SLOT.IR) return; // exclude bench/IR
    for (let i = 0; i < cnt; i++) out.push(slotId);
  });
  // keep a stable order using our display order
  out.sort((a, b) => __ROW_ORDER.indexOf(a) - __ROW_ORDER.indexOf(b));
  return out;
}

// Actual starters points (sum of entries in true starting slots)
function __actualStarterPoints(entries = [], startSlotsSet) {
  let sum = 0;
  for (const e of entries) {
    const sid = __entrySlotId(e);
    if (startSlotsSet.has(sid)) sum += __entryPts(e);
  }
  return sum;
}

// tiny readers for pick helper
const __readLineupSlotId = (e) =>
  e?.lineupSlotId ?? e?.slotId ?? e?.slot ?? null;
const __readTeamId = (e) =>
  e?.onTeamId ??
  e?.teamId ??
  e?.team?.id ??
  e?.playerPoolEntry?.onTeamId ??
  null;

// REPLACE the old __pickEntryForRow with this one (note: +teamId param)
function __pickEntryForRow(entries = [], rowSpec, teamId) {
  const candidates = (entries || []).filter((e) => {
    const onThisTeam = Number(__readTeamId(e)) === Number(teamId);
    const hasSlot = Number.isFinite(Number(__readLineupSlotId(e)));
    const locked = e?.lineupLocked === true;
    return onThisTeam || hasSlot || locked;
  });
  const sameSlot = candidates.filter(
    (e) => Number(__readLineupSlotId(e)) === rowSpec.slotId
  );
  const pool = sameSlot.length ? sameSlot : candidates;
  if (!pool.length) return null;
  pool.sort(
    (a, b) =>
      (a?.lineupOrder ?? a?.slotOrder ?? 0) -
      (b?.lineupOrder ?? b?.slotOrder ?? 0)
  );
  return pool[Math.max(0, rowSpec.index - 1)] || null;
}

function __fmtPts(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return v.toFixed(v % 1 ? 1 : 0);
}

// add:
function __redScale(n) {
  // HSL red with lightness from 92% (bottom) to 40% (top)
  const L1 = 92,
    L2 = 40;
  if (n <= 1) return ["hsl(0 85% 60%)"];
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const L = L1 + (L2 - L1) * t;
    return `hsl(0 85% ${L}%)`;
  });
}

// Build manager display names per teamId for the chosen season.
function __managerMapForSeason(season, providedByYear = {}) {
  const direct = providedByYear?.[season];
  if (direct && Object.keys(direct).length) return direct;

  try {
    const payload = parsePayloadString(window.name) || {};
    const seasonObj = (payload?.seasons || []).find(
      (s) => Number(s?.seasonId) === Number(season)
    );
    if (!seasonObj) return {};
    const nameByMemberId = {};
    (seasonObj.members || []).forEach((m) => {
      const dn = m?.displayName || "";
      const fn = m?.firstName || "";
      const ln = m?.lastName || "";
      const full = [fn, ln].filter(Boolean).join(" ").trim();
      const best = full || dn || "Unknown";
      if (m?.id != null) nameByMemberId[m.id] = best;
    });
    const out = {};
    (seasonObj.teams || []).forEach((t) => {
      const ownerId = t?.primaryOwner || (t?.owners && t.owners[0]) || null;
      if (t?.id != null) out[t.id] = nameByMemberId[ownerId] || `Team ${t.id}`;
    });
    return out;
  } catch {
    return {};
  }
}

/**
 * Compute max potential points for the week by optimally filling the start slots.
 * Now also falls back to rosterAcqByYear for a player's defaultPositionId when needed.
 */
function __potentialPoints(
  entries = [],
  startSlots = [],
  season = null,
  teamId = null,
  rosterAcqByYear = {}
) {
  // Build best-per-player record for this week
  const bestByPid = new Map(); // pid -> { pid, pts, posId }
  for (const e of entries || []) {
    const pid =
      e?.pid ??
      e?.playerId ??
      e?.player?.id ??
      e?.playerPoolEntry?.player?.id ??
      null;
    if (pid == null) continue;

    const pts = __entryPts(e);
    const prev = bestByPid.get(pid);

    // use defaultPositionId directly from this weekly roster entry
    const posId = __entryPosId(e);

    if (!prev || pts > prev.pts) {
      bestByPid.set(Number(pid), { pid: Number(pid), pts, posId });
    }
  }

  if (!bestByPid.size || !startSlots?.length) return 0;

  // Count how many of each slot we must fill
  const need = startSlots.reduce((m, s) => {
    m[s] = (m[s] || 0) + 1;
    return m;
  }, {});

  // Treat slotId=4 (your WR/TE display row) as an extra WR requirement
  need[SLOT.WR] = (need[SLOT.WR] || 0) + (need[4] || 0);

  const needQB = need[SLOT.QB] || 0;
  const needRB = need[SLOT.RB] || 0;
  const needWR = need[SLOT.WR] || 0;
  const needTE = need[SLOT.TE] || 0;
  const needDST = need[SLOT.DST] || 0;
  const needK = need[SLOT.K] || 0;
  const needFLEX = need[SLOT.FLEX] || 0;
  const needOP = need[SLOT.OP] || 0;

  // Split candidates by position and sort by points desc
  const poolQB = [];
  const poolRB = [];
  const poolWR = [];
  const poolTE = [];
  const poolDST = [];
  const poolK = [];

  for (const rec of bestByPid.values()) {
    switch (rec.posId) {
      case POS.QB:
        poolQB.push(rec);
        break;
      case POS.RB:
        poolRB.push(rec);
        break;
      case POS.WR:
        poolWR.push(rec);
        break;
      case POS.TE:
        poolTE.push(rec);
        break;
      case POS.DST:
        poolDST.push(rec);
        break;
      case POS.K:
        poolK.push(rec);
        break;
      default:
        break; // unknown/missing pos → cannot be used
    }
  }
  const byPts = (a, b) => b.pts - a.pts;
  poolQB.sort(byPts);
  poolRB.sort(byPts);
  poolWR.sort(byPts);
  poolTE.sort(byPts);
  poolDST.sort(byPts);
  poolK.sort(byPts);

  // Helper to take top N while marking used
  const used = new Set();
  const takeTop = (arr, n) => {
    let sum = 0;
    for (const rec of arr) {
      if (sum === sum && used.size >= 0) {
      } // keep linter calm in some bundlers
      if (n <= 0) break;
      if (used.has(rec.pid)) continue;
      used.add(rec.pid);
      sum += rec.pts;
      n--;
    }
    return sum;
  };

  // 1) Fill strict slots
  let total = 0;
  total += takeTop(poolQB, needQB);
  total += takeTop(poolRB, needRB);
  total += takeTop(poolWR, needWR);
  total += takeTop(poolTE, needTE);
  total += takeTop(poolDST, needDST);
  total += takeTop(poolK, needK);

  // 2) FLEX (RB/WR/TE only) from remaining
  if (needFLEX > 0) {
    const flexPool = []
      .concat(poolRB, poolWR, poolTE)
      .filter((r) => !used.has(r.pid))
      .sort(byPts);
    total += takeTop(flexPool, needFLEX);
  }

  // 3) OP (if present): QB/RB/WR/TE from remaining
  if (needOP > 0) {
    const opPool = []
      .concat(poolQB, poolRB, poolWR, poolTE)
      .filter((r) => !used.has(r.pid))
      .sort(byPts);
    total += takeTop(opPool, needOP);
  }

  return total;
}
export function RosterTab({
  rostersByYear = {},
  lineupSlotsByYear = {},
  currentWeekByYear = {},
  rosterAcqByYear = {},
  league,
  hiddenManagers,
}) {
  // —— NEW: accept data from props OR fall back to league.* if props are empty
  const RB = React.useMemo(
    () =>
      __firstNonEmpty(
        rostersByYear,
        league?.espnRostersByYear,
        league?.rostersByYear
      ),
    [rostersByYear, league]
  );

  const LSYraw = React.useMemo(
    () =>
      __firstNonEmpty(
        lineupSlotsByYear,
        league?.espnLineupSlotsByYear,
        league?.lineupSlotsByYear,
        league?.espnLineupTemplateByYear // allow ordered template too
      ),
    [lineupSlotsByYear, league]
  );

  // counts map per season regardless of original shape
  const LSY = React.useMemo(
    () => __normalizeLineupCountsPerSeason(LSYraw),
    [LSYraw]
  );

  const hidden = React.useMemo(() => {
    const fromLeague = Array.isArray(league?.hiddenManagers)
      ? league.hiddenManagers
      : null;
    const fromProp = Array.isArray(hiddenManagers) ? hiddenManagers : null;
    return new Set(fromLeague || fromProp || []);
  }, [league?.hiddenManagers, hiddenManagers]);

  const seasons = React.useMemo(
    () =>
      Object.keys(RB)
        .map((y) => Number(y))
        .filter((y) => y >= 2019)
        .sort((a, b) => b - a),
    [RB]
  );

  const [season, setSeason] = React.useState(
    seasons[0] || new Date().getFullYear()
  );
  React.useEffect(() => {
    if (!seasons.length) return;
    if (!seasons.includes(season)) setSeason(seasons[0]);
  }, [seasons]);
  const byTeam = RB?.[season] || {};

  // Central owner resolver (tries ownerName, falls back to window.__ownerMaps.name, else Team X)
  const resolveOwner = React.useCallback(
    (teamId) => {
      try {
        if (typeof ownerName === "function") {
          return ownerName(season, teamId) || `Team ${teamId}`;
        }
      } catch {}
      try {
        const nm = window?.__ownerMaps?.name;
        if (typeof nm === "function") {
          return nm(season, teamId) || `Team ${teamId}`;
        }
      } catch {}
      return `Team ${teamId}`;
    },
    [season]
  );

  const weekCap = React.useMemo(
    () => Number(currentWeekByYear?.[season]) || 0,
    [currentWeekByYear, season]
  );
  const weeks = React.useMemo(() => {
    const s = new Set();
    Object.values(byTeam).forEach((wkMap) =>
      Object.keys(wkMap || {}).forEach((w) => s.add(Number(w)))
    );
    let all = Array.from(s).sort((a, b) => a - b);
    if (weekCap > 0) all = all.filter((w) => w <= weekCap);
    return all;
  }, [byTeam, weekCap]);
  const rowSpecs = React.useMemo(() => {
    const fromSettings = __buildRowSpecs(LSY?.[season] || {});
    if (fromSettings.length) return fromSettings;
    return __buildRowSpecs({
      0: 1,
      2: 2,
      3: 2,
      6: 1,
      23: 1,
      16: 1,
      17: 1,
      20: 6,
    });
  }, [LSY, season]);

  // starter slots for this season (derived from ESPN lineup settings)
  const startSlots = React.useMemo(
    () => __buildStartSlots(LSY?.[season] || {}),
    [LSY, season]
  );

  const startSlotsSet = React.useMemo(() => new Set(startSlots), [startSlots]);

  const teamIds = React.useMemo(
    () =>
      Object.keys(byTeam)
        .map((t) => Number(t))
        .filter((tid) => !hidden.has(resolveOwner(tid)))
        .sort((a, b) =>
          resolveOwner(a)
            .toLowerCase()
            .localeCompare(resolveOwner(b).toLowerCase())
        ),
    [byTeam, resolveOwner, hidden]
  );

  const [summaryMode, setSummaryMode] = React.useState("weekly"); // "weekly" | "yearly"
  const [summaryView, setSummaryView] = React.useState("chart"); // "table" | "chart"
  const [showProj, setShowProj] = React.useState(false); // show projections in roster tables

  const summaryToggleWrapperCls =
    "inline-flex items-center rounded-full border border-white/60 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 backdrop-blur px-1 py-1 shadow-[0_18px_45px_-30px_rgba(59,130,246,0.65)]";
  const summaryToggleBtnCls = (active, variant = "blue") => {
    const base =
      "px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] transition-all rounded-full";
    const inactive =
      "text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white";
    if (!active) return `${base} ${inactive}`;
    if (variant === "violet")
      return `${base} bg-gradient-to-r from-violet-500/90 via-fuchsia-500/85 to-rose-500/85 text-white shadow-[0_12px_30px_-10px_rgba(217,70,239,0.8)]`;
    return `${base} bg-gradient-to-r from-sky-500/90 via-blue-500/85 to-indigo-500/85 text-white shadow-[0_12px_30px_-10px_rgba(59,130,246,0.8)]`;
  };
  const pillSelectCls =
    "appearance-none px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] rounded-full border border-white/60 dark:border-white/10 bg-white/85 dark:bg-zinc-900/70 text-slate-700 dark:text-slate-200 shadow-[0_18px_45px_-30px_rgba(59,130,246,0.55)] focus:outline-none focus:ring-2 focus:ring-sky-400/60 dark:focus:ring-sky-500/40";
  const chartFrameCls =
    "h-full rounded-3xl border border-white/55 dark:border-white/10 bg-[radial-gradient(120%_160%_at_0%_0%,rgba(56,189,248,0.25),transparent_62%),radial-gradient(120%_160%_at_100%_100%,rgba(129,140,248,0.25),transparent_62%)] p-6 shadow-[0_45px_110px_-60px_rgba(59,130,246,0.7)] backdrop-blur-xl";
  const entryCardCls =
    "space-y-1 rounded-xl border border-white/55 dark:border-white/10 bg-white/85 dark:bg-zinc-900/70 px-3 py-2 shadow-[0_18px_50px_-30px_rgba(59,130,246,0.85)]";
  const noEntryCls =
    "inline-flex h-16 w-full items-center justify-center rounded-xl border border-white/45 dark:border-white/10 bg-white/50 dark:bg-zinc-900/50 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400 dark:text-slate-500";

  // --- helper: bench left (potential - actual) for one team/week ---
  const __benchLeftFor = React.useCallback(
    (seasonId, teamId, week) => {
      const entries = RB?.[seasonId]?.[teamId]?.[week] || [];
      const starts = __buildStartSlots(LSY?.[seasonId] || {});
      const startSet = new Set(starts);
      const actual = __actualStarterPoints(entries, startSet);
      const potential = __potentialPoints(
        entries,
        starts,
        seasonId,
        teamId,
        rosterAcqByYear
      );
      return Math.max(0, potential - actual);
    },
    [RB, LSY, rosterAcqByYear]
  );

  // ---------- WEEKLY SUMMARY (current `season`) ----------
  const weeklySummary = React.useMemo(() => {
    const wksSet = new Set();
    Object.values(byTeam).forEach((wmap) =>
      Object.keys(wmap || {}).forEach((w) => wksSet.add(Number(w)))
    );
    const weekCols = Array.from(wksSet).sort((a, b) => a - b);
    // limit to currentWeek if provided
    const cap = Number(currentWeekByYear?.[season]) || 0;
    const weeksToUse = cap ? weekCols.filter((w) => w <= cap) : weekCols;

    // rows keyed by manager name for the selected season
    const rows = teamIds.map((tid) => {
      const manager = resolveOwner(tid);
      const values = weeksToUse.map((w) => __benchLeftFor(season, tid, w));
      const sum = values.reduce((s, n) => s + (Number(n) || 0), 0);
      return { manager, teamId: tid, values, sum };
    });

    return { weeks: weeksToUse, rows };
  }, [
    byTeam,
    teamIds,
    resolveOwner,
    season,
    currentWeekByYear,
    __benchLeftFor,
  ]);

  // ---------- YEARLY SUMMARY (all seasons) ----------
  const yearlySummary = React.useMemo(() => {
    const yearsAsc = [...seasons].sort((a, b) => a - b);
    const allManagers = new Set();
    for (const yr of seasons) {
      const teams = Object.keys(RB?.[yr] || {}).map(Number);
      teams.forEach((tid) => {
        const name = resolveOwner(tid);
        if (!hidden.has(name)) allManagers.add(name);
      });
    }
    const managers = Array.from(allManagers).sort((a, b) => a.localeCompare(b));

    // For each manager, for each year, sum bench left over all weeks for the teamIds that map to that manager in that year
    const rows = managers.map((mgr) => {
      const perYear = yearsAsc.map((yr) => {
        // Collect teamIds whose resolveOwner(yr, tid) === mgr (use rostersByYear keys for that yr)
        const tids = Object.keys(RB?.[yr] || {})
          .map(Number)
          .filter((tid) => resolveOwner(tid) === mgr);

        if (!tids.length) return 0;

        // Weeks in this year (cap by currentWeek if present)
        const wksSet = new Set();
        tids.forEach((tid) =>
          Object.keys(RB?.[yr]?.[tid] || {}).forEach((w) =>
            wksSet.add(Number(w))
          )
        );
        const allWks = Array.from(wksSet).sort((a, b) => a - b);
        const cap = Number(currentWeekByYear?.[yr]) || 0;
        const weeksToUse = cap ? allWks.filter((w) => w <= cap) : allWks;

        // Sum across those teams & weeks
        let sum = 0;
        for (const tid of tids) {
          for (const w of weeksToUse) {
            sum += __benchLeftFor(yr, tid, w);
          }
        }
        return sum;
      });

      const total = perYear.reduce((s, n) => s + (Number(n) || 0), 0);
      const avg = yearsAsc.length ? total / yearsAsc.length : 0;

      return { manager: mgr, perYear, total, avg };
    });

    return { years: yearsAsc, rows };
  }, [seasons, rostersByYear, resolveOwner, currentWeekByYear, __benchLeftFor]);
  // ---- sorting helpers/state ----
  const SortHeader = ({ label, active, dir, onClick, className = "" }) => (
    <th className={className}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:underline"
        title="Click to sort"
      >
        <span>{label}</span>
        <span className="opacity-60 text-[10px]">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );

  const cmpDir = (a, b, dir) => {
    const as = typeof a === "string",
      bs = typeof b === "string";
    if (as || bs) {
      const r = String(a ?? "").localeCompare(String(b ?? ""));
      return dir === "asc" ? r : -r;
    }
    const r = Number(a ?? -Infinity) - Number(b ?? -Infinity);
    return dir === "asc" ? r : -r;
  };

  const [weeklySort, setWeeklySort] = React.useState({
    key: "manager",
    dir: "asc",
  });
  const [yearlySort, setYearlySort] = React.useState({
    key: "manager",
    dir: "asc",
  });

  const toggleSort = (cur, set, key) =>
    set(
      cur.key === key
        ? { key, dir: cur.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );

  const weekIndexByWeek = React.useMemo(
    () =>
      Object.fromEntries((weeklySummary?.weeks || []).map((w, i) => [w, i])),
    [weeklySummary]
  );
  const yearIndexByYear = React.useMemo(
    () =>
      Object.fromEntries((yearlySummary?.years || []).map((y, i) => [y, i])),
    [yearlySummary]
  );

  const weeklyRowsSorted = React.useMemo(() => {
    const rows = [...(weeklySummary?.rows || [])];
    const { key, dir } = weeklySort;
    return rows.sort((a, b) => {
      let va, vb;
      if (key === "manager") {
        va = a.manager;
        vb = b.manager;
      } else if (key === "sum") {
        va = a.sum;
        vb = b.sum;
      } else if (key.startsWith("w:")) {
        const w = Number(key.slice(2));
        const idx = weekIndexByWeek[w] ?? -1;
        va = a.values[idx] ?? 0;
        vb = b.values[idx] ?? 0;
      }
      return cmpDir(va, vb, dir);
    });
  }, [weeklySummary, weeklySort, weekIndexByWeek]);

  const yearlyRowsSorted = React.useMemo(() => {
    const rows = [...(yearlySummary?.rows || [])];
    const { key, dir } = yearlySort;
    return rows.sort((a, b) => {
      let va, vb;
      if (key === "manager") {
        va = a.manager;
        vb = b.manager;
      } else if (key === "total") {
        va = a.total;
        vb = b.total;
      } else if (key === "avg") {
        va = a.avg;
        vb = b.avg;
      } else if (key.startsWith("y:")) {
        const y = Number(key.slice(2));
        const idx = yearIndexByYear[y] ?? -1;
        va = a.perYear[idx] ?? 0;
        vb = b.perYear[idx] ?? 0;
      }
      return cmpDir(va, vb, dir);
    });
  }, [yearlySummary, yearlySort, yearIndexByYear]);
  // add: keys, colors, and data for the chart views
  const weekKeys = React.useMemo(
    () => (weeklySummary?.weeks || []).map((w) => `W${w}`),
    [weeklySummary]
  );
  const weekColors = React.useMemo(
    () => __redScale(weekKeys.length),
    [weekKeys]
  );
  const weeklyChartData = React.useMemo(() => {
    return (weeklyRowsSorted || []).map((r) => {
      const row = { manager: r.manager, total: Number(r.sum || 0) };
      (weeklySummary?.weeks || []).forEach((w, i) => {
        row[`W${w}`] = Number(r.values?.[i] || 0);
      });
      return row;
    });
  }, [weeklyRowsSorted, weeklySummary]);

  const yearKeys = React.useMemo(
    () => (yearlySummary?.years || []).map((y) => `Y${y}`),
    [yearlySummary]
  );
  const yearColors = React.useMemo(
    () => __redScale(yearKeys.length),
    [yearKeys]
  );
  const yearlyChartData = React.useMemo(() => {
    return (yearlyRowsSorted || []).map((r) => {
      const row = { manager: r.manager, total: Number(r.total || 0) };
      (yearlySummary?.years || []).forEach((y, i) => {
        row[`Y${y}`] = Number(r.perYear?.[i] || 0);
      });
      return row;
    });
  }, [yearlyRowsSorted, yearlySummary]);

  const TeamTable = ({ teamId, showProj }) => {
    const wkMap = byTeam?.[teamId] || {};
    const manager = resolveOwner(teamId);

    // per-week totals for this team
    const perWeekTotals = React.useMemo(() => {
      const out = {};
      weeks.forEach((w) => {
        const entries = wkMap?.[w] || [];

        // team actual in true starting slots
        const actual = __actualStarterPoints(entries, startSlotsSet);

        // team projected = sum of projected points for entries in true starting slots
        let projected = 0;
        for (const e of entries) {
          const sid = __entrySlotId(e);
          if (startSlotsSet.has(sid)) projected += __entryProj(e);
        }

        // team potential = optimal lineup ceiling (existing logic)
        const potential = __potentialPoints(
          entries,
          startSlots,
          season,
          teamId,
          rosterAcqByYear
        );

        const left = Math.max(0, potential - actual);
        out[w] = { actual, projected, potential, left };
      });
      return out;
    }, [
      wkMap,
      weeks,
      startSlots,
      startSlotsSet,
      season,
      teamId,
      rosterAcqByYear,
    ]);

    const NameCell = ({ entry }) => {
      // use the entry's defaultPositionId (already present on weekly rosters)
      const posId = __entryPosId(entry);
      const label = posId != null ? __POS_LABEL[posId] || "" : "";

      const name = entry?.name || "";
      const actualText = Number.isFinite(entry?.pts)
        ? `${__fmtPts(entry.pts)} pts`
        : "";

      let projText = null;
      if (showProj) {
        const p = __entryProj(entry);
        if (Number.isFinite(p)) {
          const d = __entryPts(entry) - p;
          const sign = d > 0 ? "+" : d < 0 ? "−" : "±";
          const mag = __fmtPts(Math.abs(d));
          projText = `proj ${__fmtPts(p)} (${sign}${mag})`;
        }
      }

      return (
        <div className={entryCardCls}>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 truncate text-[13px] font-semibold tracking-tight text-slate-700 dark:text-slate-100"
              title={name}
            >
              {name}
            </div>
            {label ? (
              <span className="inline-flex items-center rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-300/45 via-amber-200/35 to-amber-100/30 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-800 dark:text-amber-100 shadow-[0_10px_24px_-16px_rgba(251,191,36,0.8)]">
                {label}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium">
            {actualText ? (
              <span className="tabular-nums text-slate-700 dark:text-slate-100">
                {actualText}
              </span>
            ) : null}
            {projText ? (
              <span className="tabular-nums text-sky-600 dark:text-sky-300">
                {projText}
              </span>
            ) : null}
          </div>
        </div>
      );
    };
    return (
      <Card
        className="mb-6 border-white/55 dark:border-white/10 bg-gradient-to-br from-sky-100/70 via-white/80 to-indigo-100/60 dark:from-sky-500/15 dark:via-zinc-950/80 dark:to-indigo-500/15"
        title={manager}
        subtitle="Weekly lineups by slot"
      >
        <TableBox className="bg-white/85 dark:bg-zinc-900/70 border border-white/55 dark:border-white/10 backdrop-blur-xl shadow-[0_32px_90px_-60px_rgba(59,130,246,0.75)]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
              <th className="w-16 text-center font-semibold">Row</th>
              <th className="w-32 font-semibold text-slate-600 dark:text-slate-100">
                Slot
              </th>
              {weeks.map((w) => (
                <th key={w} className="text-center font-semibold">
                  <span className="inline-flex items-center justify-center rounded-full border border-amber-300/60 bg-gradient-to-br from-amber-300/40 via-amber-200/35 to-amber-100/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-800 dark:text-amber-100 shadow-[0_14px_35px_-26px_rgba(251,191,36,0.7)]">
                    {`W${w}`}
                  </span>
                </th>
              ))}
            </tr>
            <tr className="text-[10px] uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
              <th />
              <th className="pr-3 text-right align-top"></th>
              {weeks.map((w) => {
                const t = perWeekTotals[w] || {
                  actual: 0,
                  projected: 0,
                  potential: 0,
                  left: 0,
                };
                return (
                  <th
                    key={`band-${w}`}
                    className="align-top text-center font-normal"
                  >
                    <div className="mx-auto w-full max-w-[180px] space-y-1.5 rounded-xl border border-amber-300/60 bg-white/75 dark:bg-zinc-900/65 px-3 py-2 text-[9px] uppercase tracking-[0.34em] text-amber-700 dark:text-amber-200 shadow-[0_20px_48px_-34px_rgba(251,191,36,0.75)]">
                      <div className="flex items-baseline justify-between gap-2">
                        <span>Actual:</span>
                        <span className="tabular-nums text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                          {__fmtPts(t.actual)}
                        </span>
                      </div>

                      {showProj ? (
                        <div className="flex items-baseline justify-between gap-2">
                          <span>Projected:</span>
                          <span className="tabular-nums text-[12px] font-semibold text-amber-700 dark:text-amber-200">
                            {__fmtPts(t.projected)}
                          </span>
                        </div>
                      ) : null}

                      <div className="flex items-baseline justify-between gap-2">
                        <span>Potential:</span>
                        <span className="tabular-nums text-[12px] font-semibold text-amber-700 dark:text-amber-200">
                          {__fmtPts(t.potential)}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <span>Left:</span>
                        <span className="tabular-nums text-[12px] font-semibold text-rose-500 dark:text-rose-300">
                          {__fmtPts(t.left)}
                        </span>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rowSpecs.map((rs, i) => (
              <tr key={`${rs.slotId}-${rs.index}`}>
                <td className="text-center align-middle">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/55 dark:border-white/10 bg-white/70 dark:bg-zinc-900/55 text-[11px] font-semibold text-slate-500 dark:text-slate-300 shadow-[0_14px_32px_-28px_rgba(148,163,184,0.6)]">
                    {i + 1}
                  </span>
                </td>
                <td className="font-semibold text-slate-700 dark:text-slate-100">
                  {rs.label}
                </td>
                {weeks.map((w) => {
                  const entries = wkMap?.[w] || [];
                  const e = __pickEntryForRow(entries, rs, teamId);
                  return (
                    <td key={w} className="align-top p-2">
                      {e ? (
                        <NameCell entry={e} />
                      ) : (
                        <span className={noEntryCls}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </TableBox>
      </Card>
    );
  };

  return (
    <>
      <Card
        title={
          <div className="flex flex-wrap items-center gap-3">
            <span className="tracking-[0.42em]">Bench Points Summary</span>
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/60 dark:border-white/20 bg-gradient-to-br from-white/80 via-sky-100/70 to-indigo-100/70 text-[11px] font-bold text-slate-700 dark:text-slate-100 shadow-[0_12px_30px_-14px_rgba(59,130,246,0.75)] cursor-help"
              title="Bench Points Summary shows how many points a manager left on the bench. It compares the lineup that was actually played vs. the optimal lineup for that week’s roster. Higher bars/values mean more points left on the bench (worse lineup decisions)."
              aria-label="Help: Bench Points Summary explanation"
            >
              ?
            </span>
          </div>
        }
        subtitle={
          summaryMode === "weekly"
            ? `Managers × Weeks — points left on bench (season ${season})`
            : `Managers × Years — season totals of points left on bench`
        }
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              className={`${summaryToggleWrapperCls} shadow-[0_18px_45px_-30px_rgba(59,130,246,0.55)]`}
            >
              {["table", "chart"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSummaryView(value)}
                  className={summaryToggleBtnCls(summaryView === value)}
                  aria-pressed={summaryView === value}
                >
                  {value === "table" ? "DATA" : "GRAPH"}
                </button>
              ))}
            </div>

            <div
              className={`${summaryToggleWrapperCls} shadow-[0_18px_45px_-30px_rgba(217,70,239,0.55)]`}
            >
              {["weekly", "yearly"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSummaryMode(value)}
                  className={summaryToggleBtnCls(
                    summaryMode === value,
                    "violet"
                  )}
                  aria-pressed={summaryMode === value}
                >
                  {value.toUpperCase()}
                </button>
              ))}
            </div>

            {summaryMode === "weekly" && seasons.length > 0 ? (
              <select
                className={`${pillSelectCls} pr-9`}
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
                title="Season"
              >
                {seasons.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        }
      >
        {summaryView === "table" ? (
          summaryMode === "weekly" ? (
            <TableBox className="bg-white/80 dark:bg-zinc-900/60 border border-white/50 dark:border-white/10 backdrop-blur-xl shadow-[0_30px_90px_-60px_rgba(59,130,246,0.75)]">
              <thead>
                <tr>
                  <SortHeader
                    label="Manager"
                    active={weeklySort.key === "manager"}
                    dir={weeklySort.dir}
                    onClick={() =>
                      toggleSort(weeklySort, setWeeklySort, "manager")
                    }
                    className="w-44"
                  />
                  {weeklySummary.weeks.map((w) => (
                    <SortHeader
                      key={`w${w}`}
                      label={`W${w}`}
                      active={weeklySort.key === `w:${w}`}
                      dir={weeklySort.dir}
                      onClick={() =>
                        toggleSort(weeklySort, setWeeklySort, `w:${w}`)
                      }
                      className="text-center"
                    />
                  ))}
                  <SortHeader
                    label="Season Sum"
                    active={weeklySort.key === "sum"}
                    dir={weeklySort.dir}
                    onClick={() => toggleSort(weeklySort, setWeeklySort, "sum")}
                    className="text-right"
                  />
                </tr>
              </thead>
              <tbody>
                {weeklyRowsSorted.map((r) => (
                  <tr key={r.manager}>
                    <td className="font-medium">{r.manager}</td>
                    {r.values.map((v, i) => (
                      <td key={i} className="text-center tabular-nums">
                        {__fmtPts(v)}
                      </td>
                    ))}
                    <td className="text-right tabular-nums font-semibold">
                      {__fmtPts(r.sum)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableBox>
          ) : (
            <TableBox className="bg-white/80 dark:bg-zinc-900/60 border border-white/50 dark:border-white/10 backdrop-blur-xl shadow-[0_30px_90px_-60px_rgba(168,85,247,0.6)]">
              <thead>
                <tr>
                  <SortHeader
                    label="Manager"
                    active={yearlySort.key === "manager"}
                    dir={yearlySort.dir}
                    onClick={() =>
                      toggleSort(yearlySort, setYearlySort, "manager")
                    }
                    className="w-44"
                  />
                  {yearlySummary.years.map((y) => (
                    <SortHeader
                      key={`y${y}`}
                      label={y}
                      active={yearlySort.key === `y:${y}`}
                      dir={yearlySort.dir}
                      onClick={() =>
                        toggleSort(yearlySort, setYearlySort, `y:${y}`)
                      }
                      className="text-center"
                    />
                  ))}
                  <SortHeader
                    label="Total"
                    active={yearlySort.key === "total"}
                    dir={yearlySort.dir}
                    onClick={() =>
                      toggleSort(yearlySort, setYearlySort, "total")
                    }
                    className="text-right"
                  />
                  <SortHeader
                    label="Avg/Season"
                    active={yearlySort.key === "avg"}
                    dir={yearlySort.dir}
                    onClick={() => toggleSort(yearlySort, setYearlySort, "avg")}
                    className="text-right"
                  />
                </tr>
              </thead>
              <tbody>
                {yearlyRowsSorted.map((r) => (
                  <tr key={r.manager}>
                    <td className="font-medium">{r.manager}</td>
                    {r.perYear.map((v, i) => (
                      <td key={i} className="text-center tabular-nums">
                        {__fmtPts(v)}
                      </td>
                    ))}
                    <td className="text-right tabular-nums font-semibold">
                      {__fmtPts(r.total)}
                    </td>
                    <td className="text-right tabular-nums">
                      {__fmtPts(r.avg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableBox>
          )
        ) : (
          <div className="h-[520px] w-full">
            <div className={chartFrameCls}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={
                    summaryMode === "weekly" ? weeklyChartData : yearlyChartData
                  }
                  margin={{ top: 8, right: 24, bottom: 56, left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.25}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="manager"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    tick={{ fill: "#e5e7eb", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.28)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.28)" }}
                  />
                  <YAxis
                    tick={{ fill: "#e5e7eb", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.28)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.28)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(24,24,27,0.95)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#e5e7eb",
                    }}
                    formatter={(v, k) => [__fmtPts(v), k]}
                  />
                  {(summaryMode === "weekly" ? weekKeys : yearKeys).map(
                    (key, i) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="bench"
                        fill={
                          (summaryMode === "weekly" ? weekColors : yearColors)[
                            i
                          ]
                        }
                      />
                    )
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>

      <Card
        title="Roster"
        subtitle={`Weekly lineups by team. Rows follow the league's roster settings; columns are weeks${
          weekCap ? ` (through W${weekCap})` : ""
        }.`}
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowProj((v) => !v)}
              aria-pressed={showProj}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] transition-all backdrop-blur ${
                showProj
                  ? "border-emerald-300/60 bg-gradient-to-r from-emerald-200/80 via-emerald-100/80 to-white/85 text-emerald-700 shadow-[0_18px_45px_-28px_rgba(16,185,129,0.75)] dark:border-emerald-400/50 dark:text-emerald-100"
                  : "border-white/60 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white shadow-[0_12px_35px_-28px_rgba(148,163,184,0.55)]"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  showProj
                    ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
                    : "bg-slate-400/70"
                }`}
              />
              Show projections
            </button>

            {seasons.length > 0 ? (
              <select
                className={`${pillSelectCls} pr-9`}
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
              >
                {seasons.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        }
      >
        {teamIds.length ? (
          teamIds.map((tid) => (
            <TeamTable key={tid} teamId={tid} showProj={showProj} />
          ))
        ) : (
          <div className="text-sm opacity-70">
            No roster data found for {season}.
          </div>
        )}
      </Card>
    </>
  );
}
/* DraftTab — per-year draft picks grouped by manager (owner names canonicalized on read) */
export function DraftTab({ draftByYear, hiddenManagers }) {
  const draftWithFinish = React.useMemo(
    () =>
      window.FL_attachFinishPosFromLocal
        ? window.FL_attachFinishPosFromLocal(draftByYear, "PPR")
        : draftByYear,
    [draftByYear]
  );

  const canonicalize =
    (typeof window !== "undefined" &&
      window.__ownerMaps &&
      typeof window.__ownerMaps.canon === "function" &&
      window.__ownerMaps.canon.bind(window.__ownerMaps)) ||
    ((s) => (s == null ? "" : String(s)));

  // canonical hidden managers set (compare using canonicalize)
  const hiddenSet = React.useMemo(() => {
    const list = Array.isArray(hiddenManagers) ? hiddenManagers : [];
    return new Set(list.map((n) => canonicalize(n)));
  }, [hiddenManagers, canonicalize]);

  // also keep a normalized (case/spacing/punct stripped) set for robustness
  const normName = React.useCallback(
    (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    []
  );
  const hiddenNormSet = React.useMemo(() => {
    const list = Array.isArray(hiddenManagers) ? hiddenManagers : [];
    return new Set(list.map((n) => normName(canonicalize(n))));
  }, [hiddenManagers, canonicalize, normName]);

  function groupByOwner(rows = []) {
    const m = new Map();
    rows.forEach((r) => {
      const rawOwner =
        r?.owner ??
        r?.manager ??
        r?.manager_name ??
        r?.ownerName ??
        r?.owner_full ??
        "";
      const owner = canonicalize(rawOwner) || "—";
      const ownerNorm = normName(rawOwner) || normName(owner);
      if (hiddenSet.has(owner) || hiddenNormSet.has(ownerNorm)) return; // skip hidden
      if (!m.has(owner)) m.set(owner, []);
      m.get(owner).push(r);
    });
    return Array.from(m.entries()).map(([owner, picks]) => ({ owner, picks }));
  }

  const [weighted, setWeighted] = React.useState(true);
  const [alpha, setAlpha] = React.useState(0.5);
  const [includeKeepers, setIncludeKeepers] = React.useState(true);
  const [includeKDst, setIncludeKDst] = React.useState(true);
  const [showExplain, setShowExplain] = React.useState(false);

  // NEW: breakdown modal
  const [showBreakdown, setShowBreakdown] = React.useState(false);
  const [breakdownTitle, setBreakdownTitle] = React.useState("");
  const [breakdownRows, setBreakdownRows] = React.useState([]);

  const goldToggleCls = (active) =>
    `relative inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.26em] uppercase transition-all duration-200 ease-out shadow-[0_18px_45px_-30px_rgba(251,191,36,0.75)] backdrop-blur ${
      active
        ? "text-amber-900 dark:text-amber-100 border border-amber-300/70 bg-gradient-to-r from-amber-300/95 via-amber-200/90 to-amber-100/95 dark:from-amber-600/30 dark:via-amber-500/25 dark:to-amber-400/25"
        : "text-amber-700 dark:text-amber-200 border border-amber-300/50 bg-white/80 dark:bg-zinc-900/60 hover:border-amber-300/70 hover:text-amber-400"
    }`;

  const Panel = ({ title, subtitle, children, right }) => (
    <div className="relative overflow-hidden rounded-2xl border border-white/55 dark:border-white/10 bg-white/85 dark:bg-zinc-950/70 p-4 md:p-5 text-sm text-slate-700 dark:text-slate-200 shadow-[0_35px_85px_-50px_rgba(59,130,246,0.6)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(120%_150%_at_0%_0%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(130%_160%_at_100%_100%,rgba(45,212,191,0.16),transparent_65%)]" />
        <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
      </div>
      <div className="relative z-10 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-[12px] font-semibold uppercase tracking-[0.32em] text-slate-700 dark:text-slate-100 drop-shadow">
              {title}
            </div>
            {subtitle ? (
              <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                {subtitle}
              </div>
            ) : null}
          </div>
          {right ? (
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-200">
              {right}
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-white/50 dark:border-white/5 bg-white/70 dark:bg-zinc-900/30 backdrop-blur-sm">
          <div className="overflow-hidden rounded-[1.1rem]">{children}</div>
        </div>
      </div>
    </div>
  );

  const [year, setYear] = React.useState(() => {
    const years = Object.keys(draftByYear || {})
      .map((y) => Number(y))
      .sort((a, b) => b - a);
    return years[0] || new Date().getFullYear();
  });
  React.useEffect(() => {
    const years = Object.keys(draftByYear || {})
      .map((y) => Number(y))
      .sort((a, b) => b - a);
    if (years.length && !years.includes(Number(year))) setYear(years[0]);
  }, [draftByYear]);
  const years = React.useMemo(
    () =>
      Object.keys(draftByYear || {})
        .map((y) => Number(y))
        .sort((a, b) => b - a),
    [draftByYear]
  );
  // Local "Drafted Points" year selection (adds All Years without affecting your global Year)
  const [dpYear, setDpYear] = React.useState(() =>
    String((years && years[0]) || new Date().getFullYear())
  );
  const dpIsAllYears = dpYear === "ALL";

  // Week selection (only used when a single year is selected)
  const [week, setWeek] = React.useState(0); // 0 = All Weeks
  React.useEffect(() => {
    setWeek(0); // reset when the Drafted Points year changes
  }, [dpYear]);

  // Current week by season (from sources if present; else infer from rosters)
  const currentWeekByYear = React.useMemo(() => {
    const S = (typeof window !== "undefined" && (window.__sources || {})) || {};
    const out = {};
    const fromSrc = S.currentWeekBySeason || S.espnCurrentWeekBySeason || {};
    Object.entries(fromSrc || {}).forEach(([yrStr, wk]) => {
      const yr = Number(yrStr);
      const n = Number(wk);
      if (Number.isFinite(yr) && Number.isFinite(n) && n > 0) out[yr] = n;
    });

    // Fallback: highest week with any starter having numeric points
    const rosters = S.rostersByYear || {};
    Object.entries(rosters || {}).forEach(([yrStr, teams]) => {
      const yr = Number(yrStr);
      if (out[yr] != null) return;
      let maxW = 0;
      Object.values(teams || {}).forEach((weeksObj) => {
        Object.entries(weeksObj || {}).forEach(([wStr, entries]) => {
          const w = Number(wStr);
          const arr = Array.isArray(entries) ? entries : [];
          const played = arr.some((e) => {
            const sid = e?.lineupSlotId ?? e?.slotId ?? e?.slot;
            const isStarter = Number(sid) !== 20 && Number(sid) !== 21; // Bench/IR
            const pts = Number(
              e?.pts ??
                e?.appliedTotal ??
                e?.playerPoints?.appliedTotal ??
                e?.appliedStatTotal ??
                NaN
            );
            return isStarter && Number.isFinite(pts);
          });
          if (played && w > maxW) maxW = w;
        });
      });
      if (maxW > 0) out[yr] = maxW;
    });
    return out;
  }, []);

  const availableWeeks = React.useMemo(() => {
    if (dpIsAllYears) return [];
    const S = (typeof window !== "undefined" && (window.__sources || {})) || {};
    const rostersByYear = S.rostersByYear || {};
    const byTeam = rostersByYear?.[Number(dpYear)] || {};
    const set = new Set();
    Object.keys(byTeam || {}).forEach((tid) => {
      const weeksObj = byTeam[tid] || {};
      Object.keys(weeksObj || {}).forEach((w) => set.add(Number(w)));
    });
    const weeks = Array.from(set).sort((a, b) => a - b);
    const cap = currentWeekByYear[Number(dpYear)];
    return Number.isFinite(cap) ? weeks.filter((w) => w <= cap) : weeks;
  }, [dpYear, dpIsAllYears, currentWeekByYear]);

  const ownerDisplay = React.useCallback((s) => canonicalize(s) || "—", []);

  const rows = React.useMemo(() => {
    const arr = draftWithFinish?.[year] || [];
    return arr.slice().sort((a, b) => {
      const ra = Number(a.round || 0),
        rb = Number(b.round || 0);
      if (ra !== rb) return ra - rb;
      const oa = Number(a.overall || 0),
        ob = Number(b.overall || 0);
      return oa - ob;
    });
  }, [draftWithFinish, year]);

  const fmtADP = (v) => {
    if (v == null || Number.isNaN(Number(v))) return "—";
    const n = Number(v);
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  };
  const fmtPts = (n) =>
    n == null || !Number.isFinite(Number(n)) ? "—" : Number(n).toFixed(1);
  const fmtPct = (x) =>
    x == null || !Number.isFinite(Number(x)) ? "—" : `${Math.round(x * 100)}%`;

  const baseFromAdpPos = (s) => {
    if (!s || typeof s !== "string") return "";
    const m = s.match(/^([A-Za-z]+)\s*\d*$/);
    return m ? m[1].toUpperCase() : "";
  };
  const getPos = (r) => {
    if (r.adpPos && typeof r.adpPos === "string") return r.adpPos;
    const code = (
      r.fp_posCode ||
      r.posCode ||
      r.pos ||
      baseFromAdpPos(r.fp_pos) ||
      ""
    )
      .toString()
      .toUpperCase()
      .replace(/\s+/g, "");
    const rank =
      r.adpPosRank ??
      r.fp_posRank ??
      r.posRank ??
      r.posAtPick ??
      r.pos_at_pick ??
      null;
    if (code && rank != null && String(rank).trim() !== "")
      return `${code}${rank}`;
    if (code) return code;
    return "—";
  };
  const getFinishPos = (r) => {
    const fp = r.finishPos ?? r.finish_pos ?? r.finalPos ?? null;
    return fp == null || fp === "" ? "—" : fp;
  };
  const getUnderName = (r) => {
    const code = (r.pos || r.position || baseFromAdpPos(r.adpPos) || "")
      .toString()
      .toUpperCase();
    const team = (r.nfl || r.team || r.proTeam || "").toString().toUpperCase();
    const bits = [code || null, team || null].filter(Boolean);
    return bits.length ? bits.join("—") : "—";
  };
  const getPickPos = (r) => {
    if (typeof r?.posAtPickLabel === "string" && r.posAtPickLabel)
      return r.posAtPickLabel;
    const base = (r.pos || r.position || "").toString().toUpperCase().trim();
    const rank = r?.posAtPick;
    return base && Number.isFinite(rank) ? `${base}${rank}` : "—";
  };
  const posRankFromLabel = (label) => {
    if (!label || typeof label !== "string") return null;
    const m = label
      .toUpperCase()
      .replace(/\s+/g, "")
      .match(/^([A-Z/]+)(\d+)$/);
    if (!m) return null;
    let pos = m[1];
    if (pos === "D/ST") pos = "DST";
    if (pos === "DEF") pos = "DST";
    const rank = Number(m[2]);
    return Number.isFinite(rank) ? { pos, rank } : null;
  };
  const scoreFromPickLabels = (pickLabel, finishLabel) => {
    const p = posRankFromLabel(pickLabel);
    const f = posRankFromLabel(finishLabel);
    if (!p || !f || p.pos !== f.pos) return null;
    if (!includeKDst && (p.pos === "K" || p.pos === "DST")) return null;
    let diff = p.rank - f.rank;
    if (diff > 40) diff = 40;
    if (diff < -40) diff = -40;
    let s = weighted ? diff / Math.pow(p.rank, alpha) : diff;
    if (p.pos === "K" || p.pos === "DST") s *= 0.25;
    return s;
  };
  const meanScoreForPicks = (picks) => {
    let sum = 0,
      cnt = 0;
    for (const r of picks) {
      if (!includeKeepers && r?.keeper) continue;
      const pickLabel = getPickPos(r);
      const finLabel = getFinishPos(r);
      const s = scoreFromPickLabels(pickLabel, finLabel);
      if (s == null) continue;
      sum += s;
      cnt += 1;
    }
    return { sum, count: cnt, mean: cnt ? sum / cnt : 0 };
  };

  const bestYearScores = React.useMemo(() => {
    const groups = groupByOwner(draftWithFinish?.[year] || []);
    const rows = groups
      .map(({ owner, picks }) => ({ owner, ...meanScoreForPicks(picks) }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.mean - a.mean);
    return rows;
  }, [draftWithFinish, year, weighted, alpha, includeKeepers, includeKDst]);

  // NEW: count all draft seasons per owner (even if not scorable)
  const allDraftYearsByOwner = React.useMemo(() => {
    const map = new Map(); // owner -> Set(years)
    for (const yrStr of Object.keys(draftByYear || {})) {
      const yrRows = draftByYear[yrStr] || [];
      for (const r of yrRows) {
        const raw =
          r?.owner ??
          r?.manager ??
          r?.manager_name ??
          r?.ownerName ??
          r?.owner_full ??
          "";
        const o = ownerDisplay(raw);
        const isHidden =
          hiddenSet.has(canonicalize(o)) || hiddenNormSet.has(normName(o));
        if (isHidden) continue; // skip hidden
        if (!map.has(o)) map.set(o, new Set());
        map.get(o).add(Number(yrStr));
      }
    }
    return map; // Map(owner -> Set(years))
  }, [
    draftByYear,
    ownerDisplay,
    hiddenSet,
    hiddenNormSet,
    canonicalize,
    normName,
  ]);

  const bestOverallScores = React.useMemo(() => {
    const agg = new Map(); // owner -> { sumMeans, scorableYears, allYears }
    // gather scorable means across years
    for (const yrStr of Object.keys(draftWithFinish || {})) {
      const groups = groupByOwner(draftWithFinish?.[yrStr] || []);
      for (const { owner, picks } of groups) {
        const { mean, count } = meanScoreForPicks(picks);
        const cur = agg.get(owner) || {
          sumMeans: 0,
          scorableYears: 0,
          allYears: 0,
        };
        if (count > 0) {
          cur.sumMeans += mean;
          cur.scorableYears += 1;
        }
        agg.set(owner, cur);
      }
    }
    // attach total draft seasons (even if not scorable)
    for (const [owner, setYears] of allDraftYearsByOwner.entries()) {
      const cur = agg.get(owner) || {
        sumMeans: 0,
        scorableYears: 0,
        allYears: 0,
      };
      cur.allYears = setYears.size;
      agg.set(owner, cur);
    }

    const out = Array.from(agg.entries()).map(([owner, v]) => ({
      owner,
      years: v.allYears, // <-- show ALL draft years
      mean: v.scorableYears ? v.sumMeans / v.scorableYears : 0,
    }));
    out.sort((a, b) => b.mean - a.mean);
    return out;
  }, [
    draftWithFinish,
    meanScoreForPicks,
    allDraftYearsByOwner,
    weighted,
    alpha,
    includeKeepers,
    includeKDst,
  ]);
  // ---------- Drafted-points contribution (per owner, per season, and totals)
  const draftedPoints = React.useMemo(() => {
    const S = (typeof window !== "undefined" && (window.__sources || {})) || {};
    const rostersByYear = S.rostersByYear || {};
    const ownerByTeamByYear = S.ownerByTeamByYear || {};

    // Build: owner/year -> Set(playerId) drafted
    const draftedPidByOwnerYear = new Map();
    for (const [yrStr, picks] of Object.entries(draftByYear || {})) {
      const yr = Number(yrStr);
      (picks || []).forEach((r) => {
        if (!includeKeepers && r?.keeper) return;
        const raw =
          r?.owner ??
          r?.manager ??
          r?.manager_name ??
          r?.ownerName ??
          r?.owner_full ??
          "";
        const owner = canonicalize(raw) || "—";
        const ownerNorm = normName(raw) || normName(owner);
        if (hiddenSet.has(owner) || hiddenNormSet.has(ownerNorm)) return;

        const pid = Number(r?.playerId);
        if (!Number.isFinite(pid)) return;

        const key = `${owner}__${yr}`;
        if (!draftedPidByOwnerYear.has(key))
          draftedPidByOwnerYear.set(key, new Set());
        draftedPidByOwnerYear.get(key).add(pid);
      });
    }

    const teamIdForOwner = (yr, owner) => {
      const map = ownerByTeamByYear?.[yr] || {};
      for (const [tid, nm] of Object.entries(map)) {
        if (canonicalize(nm) === owner) return Number(tid);
      }
      return null;
    };

    const isStarterSlot = (slotId) => {
      const n = Number(
        slotId?.lineupSlotId ?? slotId?.slotId ?? slotId?.slot ?? slotId
      );
      // ESPN: 20 = Bench, 21 = IR
      return Number.isFinite(n) && n !== 20 && n !== 21;
    };

    const perSeason = [];
    const perWeek = []; // ADD
    const totals = new Map(); // owner -> { drafted, total, seasons:Set }

    for (const yrStr of Object.keys(draftByYear || {})) {
      const yr = Number(yrStr);

      // owners with picks this year (filtered by hidden)
      const ownersThisYear = new Set();
      (draftByYear?.[yr] || []).forEach((r) => {
        const raw =
          r?.owner ??
          r?.manager ??
          r?.manager_name ??
          r?.ownerName ??
          r?.owner_full ??
          "";
        const o = canonicalize(raw) || "—";
        const oNorm = normName(raw) || normName(o);
        if (hiddenSet.has(o) || hiddenNormSet.has(oNorm)) return;
        ownersThisYear.add(o);
      });

      ownersThisYear.forEach((owner) => {
        const teamId = teamIdForOwner(yr, owner);
        const weeksObj = rostersByYear?.[yr]?.[teamId] || {};
        const pidSet =
          draftedPidByOwnerYear.get(`${owner}__${yr}`) || new Set();

        const capW = currentWeekByYear?.[yr];
        let drafted = 0;
        let teamTotal = 0;

        Object.entries(weeksObj).forEach(([wStr, entries]) => {
          const w = Number(wStr);
          if (Number.isFinite(capW) && w > capW) return; // ignore future weeks

          const arr = Array.isArray(entries) ? entries : [];
          let draftedW = 0;
          let teamW = 0;
          arr.forEach((e) => {
            const sid = e?.lineupSlotId ?? e?.slotId ?? e?.slot;
            if (!isStarterSlot(sid)) return;
            const pts =
              Number(
                e?.pts ??
                  e?.appliedTotal ??
                  e?.playerPoints?.appliedTotal ??
                  e?.appliedStatTotal ??
                  0
              ) || 0;

            teamW += pts;
            const pid = Number(e?.pid ?? e?.playerId ?? e?.player?.id);
            if (Number.isFinite(pid) && pidSet.has(pid)) draftedW += pts;
          });

          perWeek.push({
            owner,
            year: yr,
            week: w,
            draftedPts: draftedW,
            teamPts: teamW,
            pct: teamW > 0 ? draftedW / teamW : null,
          });
          drafted += draftedW;
          teamTotal += teamW;
        });

        perSeason.push({
          owner,
          year: yr,
          draftedPts: drafted,
          teamPts: teamTotal,
          pct: teamTotal > 0 ? drafted / teamTotal : null,
        });
        const cur = totals.get(owner) || {
          drafted: 0,
          total: 0,
          seasons: new Set(),
        };
        cur.drafted += drafted;
        cur.total += teamTotal;
        cur.seasons.add(yr);
        totals.set(owner, cur);
      });
    }

    perSeason.sort((a, b) => b.year - a.year || a.owner.localeCompare(b.owner));

    const totalsRows = Array.from(totals.entries())
      .map(([owner, v]) => ({
        owner,
        seasons: v.seasons.size,
        draftedPts: v.drafted,
        teamPts: v.total,
        pct: v.total > 0 ? v.drafted / v.total : null,
      }))
      .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

    return { perSeason, perWeek, totals: totalsRows }; // ADD perWeek in return
  }, [
    draftByYear,
    includeKeepers,
    hiddenSet,
    hiddenNormSet,
    canonicalize,
    normName,
  ]);
  // ---------- breakdown helpers ----------
  const contribForPick = React.useCallback(
    (r) => {
      if (!includeKeepers && r?.keeper) return null;
      const pickLabel = getPickPos(r);
      const finLabel = getFinishPos(r);
      const s = scoreFromPickLabels(pickLabel, finLabel);
      if (s == null) return null;
      return {
        round: r.round ?? "—",
        player: r.player || "Unknown Player",
        adp: fmtADP(r.adp),
        pickPos: pickLabel || "—",
        finishPos: finLabel || "—",
        contrib: s,
      };
    },
    [includeKeepers, getPickPos, getFinishPos, scoreFromPickLabels]
  );

  const openOwnerBreakdownForYear = React.useCallback(
    (owner) => {
      const allRows = (draftWithFinish?.[year] || []).filter((r) => {
        const rawOwner =
          r?.owner ??
          r?.manager ??
          r?.manager_name ??
          r?.ownerName ??
          r?.owner_full ??
          "";
        return ownerDisplay(rawOwner) === ownerDisplay(owner);
      });
      const items = [];
      for (const r of allRows) {
        const c = contribForPick(r);
        if (c) items.push({ key: `${r.player}-${r.round}-${r.overall}`, ...c });
      }
      items.sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib));
      setBreakdownTitle(`${ownerDisplay(owner)} — ${year}`);
      setBreakdownRows(items);
      setShowBreakdown(true);
    },
    [draftWithFinish, year, ownerDisplay, contribForPick]
  );

  const openOwnerBreakdownAllYears = React.useCallback(
    (owner) => {
      const items = [];
      for (const yrStr of Object.keys(draftWithFinish || {})) {
        const yr = Number(yrStr);
        for (const r of draftWithFinish[yrStr] || []) {
          const rawOwner =
            r?.owner ??
            r?.manager ??
            r?.manager_name ??
            r?.ownerName ??
            r?.owner_full ??
            "";
          if (ownerDisplay(rawOwner) !== ownerDisplay(owner)) continue;
          const c = contribForPick(r);
          if (!c) continue;
          items.push({
            key: `${yr}-${r.player}-${r.round}-${r.overall}`,
            year: yr,
            ...c,
          });
        }
      }
      items.sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib));
      setBreakdownTitle(`${ownerDisplay(owner)} — All years`);
      setBreakdownRows(items);
      setShowBreakdown(true);
    },
    [draftWithFinish, ownerDisplay, contribForPick]
  );

  return (
    <div className="space-y-6">
      <Card
        title="Draft"
        right={
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-600 dark:text-slate-200">
            <span>Year</span>
            <select
              className="rounded-full border border-white/60 dark:border-white/10 bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-700 dark:text-slate-200 shadow-[0_18px_45px_-32px_rgba(59,130,246,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 dark:bg-zinc-950/80"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="mb-4 rounded-2xl border border-white/45 dark:border-white/10 bg-white/75 dark:bg-zinc-900/60 p-4 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 shadow-[0_30px_65px_-48px_rgba(59,130,246,0.45)] backdrop-blur">
          Showing each manager’s drafted players for {year}. Columns include
          Round, Overall pick,{" "}
          <span className="font-semibold text-sky-600 dark:text-sky-300">
            Pick&nbsp;POS
          </span>{" "}
          (your league’s RB/WR/… order), Player,{" "}
          <span className="font-semibold text-sky-600 dark:text-sky-300">
            ADP
          </span>
          ,{" "}
          <span className="font-semibold text-sky-600 dark:text-sky-300">
            POS
          </span>{" "}
          (FantasyPros position rank like <em>WR5</em>), Finish (Pos), and
          Keeper.
        </div>

        {/* controls */}
        <div className="mb-6 relative overflow-hidden rounded-2xl border border-white/55 dark:border-white/10 bg-white/85 dark:bg-zinc-950/75 p-4 shadow-[0_28px_70px_-45px_rgba(59,130,246,0.55)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 opacity-70 bg-[radial-gradient(130%_140%_at_0%_0%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(130%_150%_at_100%_100%,rgba(45,212,191,0.16),transparent_65%)]" />
            <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-200">
            <label className={`${goldToggleCls(weighted)} cursor-pointer`}>
              <input
                type="checkbox"
                className="sr-only"
                checked={weighted}
                onChange={(e) => setWeighted(e.target.checked)}
              />
              <span className="tracking-[0.32em]">Weighted</span>
              <span className="text-[10px] font-medium uppercase text-amber-600/80 dark:text-amber-200/80">
                (α)
              </span>

              <input
                type="number"
                step="0.1"
                min="0.1"
                max="1"
                value={alpha}
                onChange={(e) =>
                  setAlpha(
                    Math.min(1, Math.max(0.1, Number(e.target.value) || 0.5))
                  )
                }
                className="w-16 rounded-full border border-white/60 dark:border-white/15 bg-white/95 px-2 py-1 text-[11px] font-semibold tracking-[0.12em] text-slate-700 dark:text-slate-200 shadow-[inset_0_1px_2px_rgba(15,23,42,0.25)] focus:outline-none focus:ring-2 focus:ring-sky-400/70 dark:bg-zinc-950/80"
                title="Weight exponent (lower = softer, higher = steeper)"
              />
            </label>

            <label
              className={`${goldToggleCls(includeKeepers)} cursor-pointer`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={includeKeepers}
                onChange={(e) => setIncludeKeepers(e.target.checked)}
              />
              <span className="tracking-[0.32em]">Include keepers</span>
            </label>

            <label className={`${goldToggleCls(includeKDst)} cursor-pointer`}>
              <input
                type="checkbox"
                className="sr-only"
                checked={includeKDst}
                onChange={(e) => setIncludeKDst(e.target.checked)}
              />
              <span className="tracking-[0.32em]">Include K/DST</span>
            </label>

            <button
              type="button"
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/60 bg-white/95 text-amber-600 shadow-[0_18px_40px_-28px_rgba(251,191,36,0.6)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-32px_rgba(251,191,36,0.75)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 dark:bg-zinc-950/80 dark:text-amber-200"
              title="How the Best Drafter score is calculated"
              onClick={() => setShowExplain(true)}
            >
              ℹ️
            </button>
          </div>
        </div>

        {/* leaderboards */}
        <div className="grid gap-5 md:grid-cols-2 mb-6">
          <Panel title={`Best Drafter — ${year}`}>
            <table className="w-full text-sm text-slate-700 dark:text-slate-200">
              <thead className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
                <tr>
                  <th className="py-2 pl-3 text-left">Owner</th>
                  <th className="py-2 text-right pr-3">Score</th>
                  <th className="py-2 text-right pr-3">Picks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/10 text-[13px]">
                {bestYearScores.map((r) => (
                  <tr
                    key={r.owner}
                    className="cursor-pointer transition hover:bg-white/60 dark:hover:bg-sky-500/15"
                    onClick={() => openOwnerBreakdownForYear(r.owner)}
                    title="Click for pick-by-pick breakdown"
                  >
                    <td className="py-2 pl-3" title={r.owner}>
                      {ownerDisplay(r.owner)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {weighted ? r.mean.toFixed(3) : r.mean.toFixed(1)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {r.count}
                    </td>
                  </tr>
                ))}
                {bestYearScores.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-3 text-center text-slate-500 dark:text-slate-400"
                    >
                      No scorable picks this year.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel
            title="Best Drafter — Overall"
            subtitle="Years = total seasons with any draft picks (score averages only across seasons that have Finish POS data)."
          >
            <table className="w-full text-sm text-slate-700 dark:text-slate-200">
              <thead className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
                <tr>
                  <th className="py-2 pl-3 text-left">Owner</th>
                  <th className="py-2 text-right pr-3">Score</th>
                  <th className="py-2 text-right pr-3">Years</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/10 text-[13px]">
                {bestOverallScores.map((r) => (
                  <tr
                    key={r.owner}
                    className="cursor-pointer transition hover:bg-white/60 dark:hover:bg-sky-500/15"
                    onClick={() => openOwnerBreakdownAllYears(r.owner)}
                    title="Click for pick-by-pick breakdown"
                  >
                    <td className="py-2 pl-3" title={r.owner}>
                      {ownerDisplay(r.owner)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {weighted ? r.mean.toFixed(3) : r.mean.toFixed(1)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {r.years}
                    </td>
                  </tr>
                ))}
                {bestOverallScores.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-3 text-center text-slate-500 dark:text-slate-400"
                    >
                      No seasons found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>
        </div>
        {/* Drafted points contribution */}
        <div className="grid gap-5 md:grid-cols-2 mb-6">
          {/* Per-season (single year) or ALL YEARS total, plus optional specific week */}
          <Panel
            title={`Drafted Points — ${dpIsAllYears ? "All Years" : dpYear}${
              !dpIsAllYears && week ? ` (Week ${week})` : ""
            }`}
            right={
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-600 dark:text-slate-200">
                <span>Year</span>
                <select
                  className="rounded-full border border-white/60 dark:border-white/10 bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700 dark:text-slate-200 shadow-[0_18px_45px_-32px_rgba(59,130,246,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 dark:bg-zinc-950/80"
                  value={dpYear}
                  onChange={(e) => setDpYear(e.target.value)}
                >
                  <option value="ALL">All Years</option>
                  {years.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>

                {!dpIsAllYears && (
                  <>
                    <span>Week</span>
                    <select
                      className="rounded-full border border-white/60 dark:border-white/10 bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700 dark:text-slate-200 shadow-[0_18px_45px_-32px_rgba(59,130,246,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 dark:bg-zinc-950/80"
                      value={week}
                      onChange={(e) => setWeek(Number(e.target.value))}
                    >
                      <option value={0}>All Weeks</option>
                      {availableWeeks.map((w) => (
                        <option key={w} value={w}>
                          Week {w}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            }
          >
            <table className="w-full text-sm text-slate-700 dark:text-slate-200">
              <thead className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
                <tr>
                  <th className="py-2 pl-3 text-left">Owner</th>
                  <th className="py-2 text-right pr-3">Drafted Pts</th>
                  <th className="py-2 text-right pr-3">Team Pts</th>
                  <th className="py-2 text-right pr-3">% of Team</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200/60 dark:divide-white/10 text-[13px]">
                {(dpIsAllYears
                  ? draftedPoints.totals
                  : week
                  ? draftedPoints.perWeek.filter(
                      (r) =>
                        r.year === Number(dpYear) && r.week === Number(week)
                    )
                  : draftedPoints.perSeason.filter(
                      (r) => r.year === Number(dpYear)
                    )
                )
                  .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))
                  .map((r) => (
                    <tr
                      key={`${r.owner}-${dpIsAllYears ? "ALL" : r.year}${
                        r.week ? `-w${r.week}` : ""
                      }`}
                    >
                      <td className="py-2 pl-3" title={r.owner}>
                        {ownerDisplay(r.owner)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {fmtPts(r.draftedPts)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {fmtPts(r.teamPts)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {fmtPct(r.pct)}
                      </td>
                    </tr>
                  ))}

                {(dpIsAllYears
                  ? draftedPoints.totals
                  : week
                  ? draftedPoints.perWeek.filter(
                      (r) =>
                        r.year === Number(dpYear) && r.week === Number(week)
                    )
                  : draftedPoints.perSeason.filter(
                      (r) => r.year === Number(dpYear)
                    )
                ).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-3 text-center text-slate-500 dark:text-slate-400"
                    >
                      No drafted-points data for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="px-3 pb-3 pt-2 text-[11px] text-slate-600 dark:text-slate-300">
              Based on weekly starter lineups (bench/IR excluded). Keepers obey
              the toggle above.
            </div>
          </Panel>

          {/* Totals across all seasons */}
          <Panel title="Drafted Points — Totals (All Years)">
            <table className="w-full text-sm text-slate-700 dark:text-slate-200">
              <thead className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
                <tr>
                  <th className="py-2 pl-3 text-left">Owner</th>
                  <th className="py-2 text-right pr-3">Drafted Pts</th>
                  <th className="py-2 text-right pr-3">Team Pts</th>
                  <th className="py-2 text-right pr-3">% of Team</th>
                  <th className="py-2 text-right pr-3">Seasons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/10 text-[13px]">
                {draftedPoints.totals.map((r) => (
                  <tr key={r.owner}>
                    <td className="py-2 pl-3" title={r.owner}>
                      {ownerDisplay(r.owner)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {fmtPts(r.draftedPts)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {fmtPts(r.teamPts)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {fmtPct(r.pct)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {r.seasons}
                    </td>
                  </tr>
                ))}
                {draftedPoints.totals.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-3 text-center text-slate-500 dark:text-slate-400"
                    >
                      No seasons found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Help modal */}
        {showExplain && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowExplain(false)}
            />
            <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                <div className="text-base font-semibold">
                  Best Drafter — How it’s calculated
                </div>
                <button
                  className="btn btn-xs"
                  onClick={() => setShowExplain(false)}
                >
                  Close
                </button>
              </div>
              <div className="text-sm space-y-3 p-4 overflow-y-auto flex-1">
                <p>
                  <strong>Per pick:</strong> (PickRank − FinishRank)
                  {weighted ? " ÷ PickRank^α" : ""}, with ranks capped at ±40.
                  Positive is good; negative is bad. K/DST and Keepers obey the
                  toggles above.
                </p>
                <p>
                  <strong>Owner score:</strong> mean of pick contributions (with
                  your current filters). The Overall table shows <em>Years</em>{" "}
                  = all seasons where that manager made any picks; score still
                  averages only seasons that have Finish POS data available.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown modal */}
        {showBreakdown && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setShowBreakdown(false)}
            />
            <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/25 dark:border-white/10 bg-white/90 dark:bg-zinc-950/85 shadow-[0_40px_90px_-45px_rgba(15,23,42,0.95)] backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(120%_150%_at_0%_0%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(130%_160%_at_100%_100%,rgba(45,212,191,0.18),transparent_60%)]" />
              <div className="relative flex max-h-[85vh] flex-col">
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/60 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.32em] text-slate-700 dark:text-slate-100">
                    {breakdownTitle}
                  </div>
                  <button
                    className="inline-flex items-center gap-1 rounded-full border border-white/60 dark:border-white/15 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-600 shadow-[0_18px_45px_-32px_rgba(59,130,246,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_26px_60px_-38px_rgba(59,130,246,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 dark:bg-zinc-950/70 dark:text-slate-200"
                    onClick={() => setShowBreakdown(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="px-5 pt-4 pb-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  Contribution = (Pick POS rank − Finish POS rank)
                  {weighted ? (
                    <>
                      {" "}
                      ÷ (Pick POS rank<sup>{alpha}</sup>)
                    </>
                  ) : null}
                  {includeKDst ? null : "  • K/DST excluded"}
                  {!includeKeepers ? "  • Keepers excluded" : null}
                </div>

                <div className="px-5 pb-5">
                  <div className="relative overflow-hidden rounded-2xl border border-white/55 dark:border-white/10 bg-white/85 dark:bg-zinc-950/70 shadow-[0_30px_75px_-48px_rgba(59,130,246,0.55)] backdrop-blur">
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute inset-0 opacity-70 bg-[radial-gradient(120%_150%_at_0%_0%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(120%_160%_at_100%_100%,rgba(45,212,191,0.16),transparent_60%)]" />
                      <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
                    </div>
                    <div className="relative overflow-auto rounded-[1.1rem] border border-white/50 bg-white/80 dark:border-white/5 dark:bg-zinc-950/30 max-h-[60vh]">
                      <table className="w-full text-sm text-slate-700 dark:text-slate-200">
                        <thead className="sticky top-0 bg-white/85 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:bg-zinc-950/50 dark:text-slate-200">
                          <tr className="border-b border-white/60 dark:border-white/10">
                            {breakdownRows.some((r) => r.year) && (
                              <th className="px-3 py-2 text-left w-[68px]">
                                Year
                              </th>
                            )}
                            <th className="px-3 py-2 text-left w-[56px]">Rd</th>
                            <th className="px-3 py-2 text-left">Player</th>
                            <th className="px-3 py-2 text-center w-[70px]">
                              ADP
                            </th>
                            <th className="px-3 py-2 text-center w-[90px]">
                              Pick POS
                            </th>
                            <th className="px-3 py-2 text-center w-[110px]">
                              Finish POS
                            </th>
                            <th className="px-3 py-2 text-right w-[110px]">
                              Contribution
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
                          {breakdownRows.map((r) => {
                            const color =
                              r.contrib > 0
                                ? "text-emerald-500 dark:text-emerald-300"
                                : r.contrib < 0
                                ? "text-rose-500 dark:text-rose-300"
                                : "text-slate-500 dark:text-slate-300";
                            return (
                              <tr
                                key={r.key}
                                className="transition-colors duration-150 ease-out hover:bg-white/70 dark:hover:bg-sky-500/20"
                              >
                                {r.year && (
                                  <td className="px-3 py-2">{r.year}</td>
                                )}
                                <td className="px-3 py-2">{r.round}</td>
                                <td className="px-3 py-2">{r.player}</td>
                                <td className="px-3 py-2 text-center tabular-nums">
                                  {r.adp}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {r.pickPos}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {r.finishPos}
                                </td>
                                <td
                                  className={`px-3 py-2 text-right tabular-nums font-semibold ${color}`}
                                >
                                  {weighted
                                    ? r.contrib.toFixed(3)
                                    : r.contrib.toFixed(1)}
                                </td>
                              </tr>
                            );
                          })}
                          {breakdownRows.length === 0 && (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
                              >
                                No scorable picks with current filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {groupByOwner(rows).map(({ owner, picks }) => (
          <div key={owner} className="mb-8">
            <button
              type="button"
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/60 dark:border-white/15 bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-700 shadow-[0_22px_55px_-36px_rgba(59,130,246,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-40px_rgba(59,130,246,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 dark:bg-zinc-950/80 dark:text-slate-200"
              title="Show pick-by-pick breakdown"
              onClick={() => openOwnerBreakdownForYear(owner)}
            >
              <span>{ownerDisplay(owner)}</span>
              <span className="text-[9px] font-medium uppercase tracking-[0.4em] text-amber-500/90 dark:text-amber-200/80">
                Picks
              </span>
            </button>
            <div className="relative overflow-hidden rounded-2xl border border-white/55 dark:border-white/10 bg-white/85 p-3 shadow-[0_35px_85px_-52px_rgba(59,130,246,0.6)] backdrop-blur dark:bg-zinc-950/70">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 opacity-75 bg-[radial-gradient(130%_160%_at_0%_0%,rgba(59,130,246,0.22),transparent_60%),radial-gradient(130%_170%_at_100%_100%,rgba(45,212,191,0.18),transparent_65%)]" />
                <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
              </div>
              <div className="relative overflow-x-auto rounded-[1.05rem] border border-white/50 bg-white/80 dark:border-white/5 dark:bg-zinc-950/30">
                <table className="w-full text-sm text-slate-700 dark:text-slate-200">
                  <thead className="sticky top-0 bg-white/80 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:bg-zinc-950/50 dark:text-slate-200">
                    <tr className="border-b border-white/60 dark:border-white/10">
                      <th className="px-3 py-2 text-left w-[56px]">Rd</th>
                      <th className="px-3 py-2 text-left w-[88px]">Overall</th>
                      <th className="px-3 py-2 text-left w-[90px]">
                        Pick&nbsp;POS
                      </th>
                      <th className="px-3 py-2 text-left">Player</th>
                      <th className="px-3 py-2 text-center w-[90px]">ADP</th>
                      <th className="px-3 py-2 text-center w-[90px]">POS</th>
                      <th className="px-3 py-2 text-center w-[120px]">
                        Finish (Pos)
                      </th>
                      <th className="px-3 py-2 text-center w-[90px]">Keeper</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/10 [&>tr:nth-child(odd)]:bg-white/40 dark:[&>tr:nth-child(odd)]:bg-white/5">
                    {picks.map((r, i) => (
                      <tr
                        key={i}
                        className="transition-colors duration-150 ease-out hover:bg-white/70 dark:hover:bg-sky-500/20"
                      >
                        <td className="px-3 py-2">{r.round ?? "—"}</td>
                        <td className="px-3 py-2">{r.overall ?? "—"}</td>
                        <td className="px-3 py-2">{getPickPos(r)}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold tracking-wide">
                            {r.player || "Unknown Player"}
                          </div>
                          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                            {getUnderName(r)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {fmtADP(r.adp)}
                        </td>
                        <td className="px-3 py-2 text-center">{getPos(r)}</td>
                        <td className="px-3 py-2 text-center">
                          {getFinishPos(r)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.keeper ? "Yes" : "No"}
                        </td>
                      </tr>
                    ))}
                    {picks.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
                        >
                          No draft picks found for {owner}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------------- PlayoffProbTab — Prob of making playoffs by record after week N -------- */
export function PlayoffProbTab({
  league,
  playoffTeamsBase = {},
  playoffTeamsOverrides = {},
}) {
  if (!league) return null;
  const owners = league.owners || [];
  const seasonsAll = league.seasonsAll || [];
  const mergedPlayoffTeams = React.useMemo(() => {
    const out = {};
    seasonsAll.forEach((yr) => {
      const base = Number(playoffTeamsBase?.[yr] ?? 0) || 0;
      const ovrd = Number(playoffTeamsOverrides?.[yr] ?? 0) || 0;
      out[yr] = ovrd || base || 0;
    });
    return out;
  }, [seasonsAll, playoffTeamsBase, playoffTeamsOverrides]);
  const [strictWeekGames, setStrictWeekGames] = React.useState(true);
  const completedSeasons = React.useMemo(() => {
    const set = new Set();
    (owners || []).forEach((o) => {
      const bySeason = league.placementMap?.[o] || {};
      Object.entries(bySeason).forEach(([yrStr, p]) => {
        const yr = Number(yrStr);
        if (yr && Number.isFinite(Number(p))) set.add(yr);
      });
    });
    return set;
  }, [owners, league.placementMap]);
  const madePO = React.useMemo(() => {
    const map = new Map(); // key: "owner__year" -> boolean
    (owners || []).forEach((o) => {
      const bySeason = league.placementMap?.[o] || {};
      Object.entries(bySeason).forEach(([yrStr, place]) => {
        const yr = Number(yrStr);
        if (!completedSeasons.has(yr)) return;
        const poCnt = Number(mergedPlayoffTeams?.[yr] || 0);
        if (!poCnt) return; // skip seasons we don't know playoff count for
        const made = Number(place) > 0 && Number(place) <= poCnt;
        map.set(`${o}__${yr}`, made);
      });
    });
    return map;
  }, [owners, league.placementMap, completedSeasons, mergedPlayoffTeams]);
  const { perOwnerSeasonWeek, maxWeekByYear } = React.useMemo(() => {
    const m = new Map(); // "owner__year" -> Map(week -> {w,l,t})
    const maxByYr = new Map(); // year -> max regular-season week seen
    for (const g of league.games || []) {
      const yr = Number(g?.season);
      const wk = Number(g?.week);
      if (!Number.isFinite(yr) || !Number.isFinite(wk)) continue;
      if (!completedSeasons.has(yr)) continue;
      if (!mergedPlayoffTeams?.[yr]) continue;
      if (g?.is_playoff === true) continue;
      const owner = g?.owner;
      const res = String(g?.res || "").toUpperCase();
      if (!owner || !res) continue;
      const key = `${owner}__${yr}`;
      if (!m.has(key)) m.set(key, new Map());
      const wkMap = m.get(key);
      if (!wkMap.has(wk)) wkMap.set(wk, { w: 0, l: 0 });
      const slot = wkMap.get(wk);
      if (res === "W") slot.w += 1;
      else if (res === "L") slot.l += 1;
      const prevMax = maxByYr.get(yr) || 0;
      if (wk > prevMax) maxByYr.set(yr, wk);
    }
    return { perOwnerSeasonWeek: m, maxWeekByYear: maxByYr };
  }, [league.games, completedSeasons, mergedPlayoffTeams]);
  const { aggAll, aggByGames, examplesAll, examplesByGames } =
    React.useMemo(() => {
      const aggAll = new Map(); // week -> Map(recordKey -> {made,total})
      const aggByGames = new Map(); // week -> Map(gamesPlayed -> Map(recordKey -> {made,total}))
      const examplesAll = new Map(); // week -> Map(recordKey -> Array<{owner,year,finalRec}>)
      const examplesByGames = new Map(); // week -> Map(gamesPlayed -> Map(recordKey -> Array<...>))
      const bumpAll = (week, key, made) => {
        if (!aggAll.has(week)) aggAll.set(week, new Map());
        const m = aggAll.get(week);
        const row = m.get(key) || { made: 0, total: 0 };
        row.total += 1;
        if (made) row.made += 1;
        m.set(key, row);
      };
      const bumpBy = (week, games, key, made) => {
        if (!aggByGames.has(week)) aggByGames.set(week, new Map());
        const gm = aggByGames.get(week);
        if (!gm.has(games)) gm.set(games, new Map());
        const recMap = gm.get(games);
        const row = recMap.get(key) || { made: 0, total: 0 };
        row.total += 1;
        if (made) row.made += 1;
        recMap.set(key, row);
      };
      const pushExAll = (week, key, item) => {
        if (!examplesAll.has(week)) examplesAll.set(week, new Map());
        const m = examplesAll.get(week);
        if (!m.has(key)) m.set(key, []);
        m.get(key).push(item);
      };
      const pushExBy = (week, games, key, item) => {
        if (!examplesByGames.has(week)) examplesByGames.set(week, new Map());
        const gm = examplesByGames.get(week);
        if (!gm.has(games)) gm.set(games, new Map());
        const recMap = gm.get(games);
        if (!recMap.has(key)) recMap.set(key, []);
        recMap.get(key).push(item);
      };
      perOwnerSeasonWeek.forEach((wkMap, ownerSeasonKey) => {
        const made = madePO.get(ownerSeasonKey);
        if (made === undefined) return;
        const [owner, yrStr] = ownerSeasonKey.split("__");
        const year = Number(yrStr);
        let Wfin = 0,
          Lfin = 0;
        wkMap.forEach((slot) => {
          Wfin += slot.w;
          Lfin += slot.l;
        });
        const finalRec = `${Wfin}-${Lfin}`;
        const weeks = Array.from(wkMap.keys()).sort((a, b) => a - b);
        let W = 0,
          L = 0;
        for (const w of weeks) {
          const slot = wkMap.get(w);
          W += slot.w;
          L += slot.l;
          const gamesPlayed = W + L; // strict filter key (no ties)
          const recKey = `${W}-${L}`;
          bumpAll(w, recKey, made === true);
          bumpBy(w, gamesPlayed, recKey, made === true);
          const item = { owner, year, finalRec, made: made === true }; // <- add Y/N flag
          pushExAll(w, recKey, item);
          pushExBy(w, gamesPlayed, recKey, item);
        }
      });
      return { aggAll, aggByGames, examplesAll, examplesByGames };
    }, [perOwnerSeasonWeek, madePO]);
  const weeksSorted = React.useMemo(() => {
    const s = new Set([...aggAll.keys(), ...aggByGames.keys()]);
    return Array.from(s).sort((a, b) => a - b);
  }, [aggAll, aggByGames]);
  const sortRecordKeys = (a, b) => {
    const [aw, al] = a.split("-").map(Number);
    const [bw, bl] = b.split("-").map(Number);
    if (aw !== bw) return bw - aw; // more wins first
    if (al !== bl) return al - bl; // fewer losses next
    return 0;
  };
  const getRecMapForWeek = React.useCallback(
    (wk) =>
      strictWeekGames
        ? aggByGames.get(wk)?.get(wk) || new Map() // exactly N games after week N
        : aggAll.get(wk) || new Map(), // any games after week N
    [strictWeekGames, aggByGames, aggAll]
  );
  const [selectedWeek, setSelectedWeek] = React.useState(() => {
    return weeksSorted.length ? weeksSorted[weeksSorted.length - 1] : null;
  });
  React.useEffect(() => {
    if (!weeksSorted.length) return;
    if (!weeksSorted.includes(selectedWeek)) {
      setSelectedWeek(weeksSorted[weeksSorted.length - 1]);
    }
  }, [weeksSorted, selectedWeek]);
  const currentRecMap = React.useMemo(
    () => (selectedWeek != null ? getRecMapForWeek(selectedWeek) : new Map()),
    [getRecMapForWeek, selectedWeek]
  );
  const currentKeys = React.useMemo(
    () => Array.from(currentRecMap.keys()).sort(sortRecordKeys),
    [currentRecMap]
  );
  const [detail, setDetail] = React.useState(null);
  React.useEffect(() => {
    if (!detail) return;
    const el = document.getElementById(
      `pp-detail-${detail.week}-${detail.record}`
    );
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [detail]);
  const detailRows = React.useMemo(() => {
    if (!detail) return [];
    const { week, record } = detail;
    return strictWeekGames
      ? examplesByGames.get(week)?.get(week)?.get(record) || []
      : examplesAll.get(week)?.get(record) || [];
  }, [detail, strictWeekGames, examplesAll, examplesByGames]);
  const detailStat = React.useMemo(() => {
    if (!detail) return null;
    const recMap = strictWeekGames
      ? aggByGames.get(detail.week)?.get(detail.week) || new Map()
      : aggAll.get(detail.week) || new Map();
    const stat = recMap.get(detail.record);
    if (!stat) return null;
    const { made, total } = stat;
    const pct = total ? Math.round((made / total) * 100) : null;
    return { made, total, pct };
  }, [detail, strictWeekGames, aggAll, aggByGames]);
  const pctToBarColor = (p) => {
    if (p == null) return "hsl(0, 0%, 75%)"; // no data, light gray
    if (p === 0.5) return "hsl(0, 0%, 60%)"; // mid gray
    if (p > 0.5) {
      const t = Math.min(1, (p - 0.5) / 0.5); // 0..1 over 50..100
      const light = 60 - t * 25; // 60% -> 35% (darker = stronger)
      return `hsl(120, 70%, ${light}%)`; // green
    }
    const t = Math.min(1, (0.5 - p) / 0.5); // 0..1 over 50..0
    const light = 60 - t * 25; // 60% -> 35%
    return `hsl(0, 70%, ${light}%)`; // red
  };
  if (!weeksSorted.length) {
    return (
      <Card
        title="Playoff Probability Lab"
        subtitle="Historical playoff odds by record after each week — now with a little extra shine."
      >
        <div className="flex flex-col gap-3 text-slate-600 dark:text-slate-300/90">
          <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-emerald-300 to-sky-300 bg-clip-text text-transparent drop-shadow-sm">
            Playoff Probability by Record
          </div>
          <p className="text-sm">
            No data yet. This view only includes completed seasons where the
            number of playoff teams is known (from ESPN or your overrides) and
            uses regular-season games only.
          </p>
        </div>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      <Card
        title="Playoff Probability Lab"
        subtitle="Historical playoff odds by record after each week — now with a little extra shine."
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-emerald-300 to-sky-300 bg-clip-text text-transparent drop-shadow-sm">
                Playoff Probability by Record
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300/90 max-w-2xl">
                For each week N, explore the historical probability of making
                the playoffs given that week&apos;s record. The sample uses only
                regular-season games, and a playoff berth means finishing at or
                above the playoff-team line for that season.
              </p>
            </div>
            <label className="inline-flex items-center gap-3 self-start rounded-full border border-white/60 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-200 shadow-[0_18px_32px_-22px_rgba(15,23,42,0.75)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-25px_rgba(34,197,94,0.5)]">
              <input
                type="checkbox"
                className="checkbox checkbox-sm border-slate-400/60"
                checked={strictWeekGames}
                onChange={(e) => setStrictWeekGames(e.target.checked)}
              />
              <span>Exclude Bye Weeks</span>
            </label>
          </div>

          {/* BAR CHART */}
          <div className="relative overflow-hidden rounded-2xl border border-white/30 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 p-4 md:p-6 shadow-[0_26px_60px_-35px_rgba(15,23,42,0.85)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 opacity-70 bg-[radial-gradient(130%_160%_at_0%_0%,rgba(253,224,71,0.22),transparent_58%),radial-gradient(120%_150%_at_100%_100%,rgba(110,231,183,0.18),transparent_60%)]" />
              <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
            </div>
            <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-base font-semibold text-slate-700 dark:text-slate-100">
                Playoff Odds by Record
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Week
                </label>
                <select
                  className="select select-sm rounded-full border border-slate-200/70 bg-white/90 dark:border-zinc-700 dark:bg-zinc-900/80 shadow-sm"
                  value={selectedWeek ?? ""}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                >
                  {weeksSorted.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="relative z-10 mt-5 h-64">
              <div className="flex h-full items-end gap-5">
                {currentKeys.map((k) => {
                  const { made, total } = currentRecMap.get(k) || {
                    made: 0,
                    total: 0,
                  };
                  const p = total ? made / total : null;
                  const pctLabel = p == null ? "—" : `${Math.round(p * 100)}%`;
                  const h = p == null ? 0 : Math.max(2, Math.round(p * 100)); // 0..100%, min 2px
                  return (
                    <div
                      key={k}
                      className="flex h-full w-14 flex-col items-center"
                    >
                      <div className="flex h-full items-end">
                        <div
                          className="w-10 rounded-xl bg-gradient-to-t from-slate-800/10 via-slate-800/10 to-slate-50/80 dark:from-zinc-700/30 dark:via-zinc-600/40 dark:to-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_24px_-16px_rgba(15,23,42,0.7)] transition-all"
                          style={{
                            height: `${h}%`,
                            backgroundColor: pctToBarColor(p),
                          }}
                          title={
                            p == null
                              ? "No data"
                              : `${pctLabel} (${made}/${total})`
                          }
                        />
                      </div>
                      <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                        {k}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-300">
                        {pctLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>
      {weeksSorted.map((wk) => {
        const recMap = strictWeekGames
          ? aggByGames.get(wk)?.get(wk) || new Map() // exactly N games after week N
          : aggAll.get(wk) || new Map(); // all records after week N
        const keys = Array.from(recMap.keys()).sort(sortRecordKeys);
        return (
          <div
            key={`week-${wk}`}
            className="relative overflow-hidden rounded-2xl border border-white/30 dark:border-white/10 bg-white/75 dark:bg-zinc-950/60 p-5 shadow-[0_24px_58px_-38px_rgba(15,23,42,0.85)] backdrop-blur-xl"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 opacity-70 bg-[radial-gradient(120%_150%_at_0%_0%,rgba(94,234,212,0.16),transparent_55%),radial-gradient(120%_140%_at_100%_100%,rgba(129,140,248,0.14),transparent_60%)]" />
              <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
            </div>
            <div className="relative z-10 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-200 mb-3">
              Week {wk}
            </div>
            <div className="relative z-10 flex flex-wrap gap-3">
              {keys.map((k) => {
                const { made, total } = recMap.get(k);
                const pct = total ? Math.round((made / total) * 100) : 0;
                return (
                  <div
                    key={k}
                    onClick={() => setDetail({ week: wk, record: k })}
                    className="group cursor-pointer rounded-xl border border-white/50 dark:border-white/10 bg-gradient-to-br from-white/85 via-slate-50/60 to-slate-100/80 px-3 py-2 text-slate-700 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_52px_-25px_rgba(56,189,248,0.55)] dark:from-zinc-800/70 dark:via-zinc-900/60 dark:to-zinc-950/70"
                  >
                    <div className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
                      {k}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 group-hover:text-sky-500 dark:text-slate-300">
                      {pct}% ({made}/{total})
                    </div>
                  </div>
                );
              })}
            </div>
            {detail && detail.week === wk && (
              <div
                id={`pp-detail-${wk}-${detail.record}`}
                className="relative z-10 mt-4 overflow-hidden rounded-2xl border border-white/40 dark:border-white/10 bg-white/85 dark:bg-zinc-950/70 p-4 shadow-[0_22px_55px_-32px_rgba(15,23,42,0.85)]"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-slate-700 dark:text-slate-200">
                  <div className="font-semibold text-sm uppercase tracking-[0.18em]">
                    Week {detail.week} — {detail.record}
                    {detailStat && (
                      <span className="ml-2 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        • {detailStat.pct}% ({detailStat.made}/
                        {detailStat.total})
                      </span>
                    )}
                  </div>
                  <button
                    className="inline-flex items-center gap-1 rounded-full border border-white/60 dark:border-white/10 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-20px_rgba(59,130,246,0.5)] dark:bg-zinc-900/70 dark:text-slate-200"
                    onClick={() => setDetail(null)}
                  >
                    Close
                  </button>
                </div>
                {detailRows.length ? (
                  <>
                    {/* header row for alignment */}
                    <div
                      className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 grid
                        [grid-template-columns:minmax(0,1fr)_72px_84px_86px]"
                    >
                      <div>Manager</div>
                      <div className="text-right">Year</div>
                      <div className="text-right">Finish</div>
                      <div className="text-center">Made PO</div>
                    </div>
                    <ul className="text-sm divide-y divide-white/50 dark:divide-white/10">
                      {detailRows.map((r, i) => (
                        <li
                          key={i}
                          className="py-2 grid items-center
                         [grid-template-columns:minmax(0,1fr)_72px_84px_86px] text-slate-700 dark:text-slate-200"
                        >
                          <div className="font-medium truncate">{r.owner}</div>
                          <div className="text-right tabular-nums text-slate-500 dark:text-slate-300">
                            {r.year}
                          </div>
                          <div className="text-right font-mono text-slate-600 dark:text-slate-200">
                            {r.finalRec}
                          </div>
                          <div className="text-center font-semibold text-slate-600 dark:text-slate-200">
                            {r.made ? "Y" : "N"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    No teams matched.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
// ================== WeeklyOutlookTab ==================
export function WeeklyOutlookTab({
  league,
  seasonThisYear,
  playoffTeamsBase = {},
  playoffTeamsOverrides = {},
  scheduleThisYear = [],
}) {
  if (!league) return null;
  React.useEffect(() => {
    const aliases = window.__FL_ALIASES || {};
    primeOwnerMaps({
      league,
      selectedLeague: league,
      espnOwnerByTeamByYear: league.ownerByTeamByYear || {},
      manualAliases: aliases,
    });
  }, [league]);
  // Canonicalize owner display names everywhere (same as Trades/Draft tabs)
  const canonicalize =
    (typeof window !== "undefined" &&
      window.__ownerMaps &&
      typeof window.__ownerMaps.canon === "function" &&
      window.__ownerMaps.canon.bind(window.__ownerMaps)) ||
    ((s) => (s == null ? "" : String(s)));

  // ---------- tiny helpers ----------
  const pickNum = (...vals) => {
    for (const v of vals) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };
  const owners = league.owners || [];
  const seasonsAll = league.seasonsAll || [];
  // Render an owner name on exactly two lines: first word, then the rest.
  // No ellipses; if the second line is too long it clips cleanly.
  const OwnerTwoLine = ({ name }) => {
    const parts = String(name || "")
      .trim()
      .split(/\s+/);
    const first = parts.shift() || "";
    const second = parts.join(" ");
    return (
      <span className="flex flex-col leading-tight text-[13px]">
        <span className="whitespace-nowrap overflow-hidden">{first}</span>
        <span className="whitespace-nowrap overflow-hidden">{second}</span>
      </span>
    );
  };

  // Render exactly two lines: FIRST on line 1, LAST on line 2 (no third line)
  const NameTwoLine = ({ name, className = "" }) => {
    const parts = String(name || "")
      .trim()
      .split(/\s+/);
    const first = parts[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    return (
      <div className={`leading-tight ${className}`}>
        <div className="whitespace-nowrap overflow-hidden">{first}</div>
        <div className="whitespace-nowrap overflow-hidden">{last}</div>
      </div>
    );
  };
  // Auto-fit: first name on line 1, last name on line 2. Shrinks font until both lines fit.
  const AutoFitTwoLine = ({ name, className = "", maxPx = 22, minPx = 12 }) => {
    const ref = React.useRef(null);

    // split once so we only render First + Last
    const parts = String(name || "")
      .trim()
      .split(/\s+/);
    const first = parts[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1] : "";

    const fit = React.useCallback(() => {
      const el = ref.current;
      if (!el) return;
      const firstEl = el.querySelector(".fit-first");
      const lastEl = el.querySelector(".fit-last");
      if (!firstEl || !lastEl) return;

      // start at max, reduce until both lines are <= container width
      let s = maxPx;
      el.style.fontSize = `${s}px`;
      const containerW = el.clientWidth || 0;

      const tooWide = () =>
        firstEl.scrollWidth > containerW || lastEl.scrollWidth > containerW;

      while (s > minPx && tooWide()) {
        s -= 0.5;
        el.style.fontSize = `${s}px`;
      }
    }, [name, maxPx, minPx]);

    React.useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;
      fit();
      const ro = new ResizeObserver(() => fit());
      ro.observe(el);
      return () => ro.disconnect();
    }, [fit]);

    return (
      <div
        ref={ref}
        className={`leading-tight ${className}`}
        style={{ lineHeight: 1.05 }}
      >
        <div className="fit-first whitespace-nowrap">{first}</div>
        <div className="fit-last  whitespace-nowrap">{last}</div>
      </div>
    );
  };
  // ---------- current year / week (no hardcoding) ----------
  const currentYear = React.useMemo(() => {
    const yr = Number(seasonThisYear?.year);
    if (Number.isFinite(yr)) return yr;
    const yrs = Array.from(
      new Set(
        (league?.games || [])
          .map((g) => Number(g?.season))
          .filter(Number.isFinite)
      )
    );
    return yrs.length ? Math.max(...yrs) : new Date().getFullYear();
  }, [seasonThisYear, league?.games]);

  const currentWeek = React.useMemo(() => {
    const wk = Number(seasonThisYear?.currentWeek);
    if (Number.isFinite(wk) && wk > 0) return wk;
    const weeks = (league?.games || [])
      .filter((g) => Number(g?.season) === Number(currentYear))
      .map((g) => Number(g?.week))
      .filter(Number.isFinite);
    return weeks.length ? Math.max(...weeks) : 1;
  }, [seasonThisYear, league?.games, currentYear]);
  const COLORish_PROPS = new Set([
    "color",
    "background",
    "background-color",
    "background-image",
    "border-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "text-decoration-color",
    "column-rule-color",
    "caret-color",
    "accent-color",
    "fill",
    "stroke",
    "box-shadow",
    "text-shadow",
  ]);

  const hasOKColor = (value) =>
    typeof value === "string" && /okl(ch|ab)/i.test(value || "");

  let sharedColorCtx = null;
  const getColorContext = () => {
    if (sharedColorCtx) return sharedColorCtx;
    try {
      sharedColorCtx = document.createElement("canvas").getContext("2d");
    } catch {
      sharedColorCtx = null;
    }
    return sharedColorCtx;
  };

  const normalizeColorValue = (ctx, value) => {
    if (!value || !ctx || !hasOKColor(value)) return value;
    try {
      ctx.fillStyle = "#000";
      ctx.fillStyle = value;
      return ctx.fillStyle;
    } catch {
      return value;
    }
  };

  // Inline computed styles into a deep clone of a node (so the SVG has everything it needs)
  function cloneWithInlineStyles(root, { filter } = {}) {
    const clone = root.cloneNode(true);

    const walk = (src, dst) => {
      if (filter && filter(src) === false) {
        dst.remove(); // drop ignored nodes
        return;
      }
      if (src.nodeType !== 1 || dst.nodeType !== 1) return;
      const cs = getComputedStyle(src);

      const style = dst.style;
      Array.from(cs).forEach((prop) => {
        let value = cs.getPropertyValue(prop);
        if (!value) return;

        if (
          COLORish_PROPS.has(prop) ||
          /color/i.test(prop) ||
          prop.includes("shadow") ||
          prop === "background" ||
          prop.startsWith("border")
        ) {
          value = normalizeColorValue(getColorContext(), value);
          if (prop === "background-image" && hasOKColor(value)) {
            // Drop gradients html2canvas / SVG can’t parse yet
            value = "none";
          }
        }

        style.setProperty(prop, value, cs.getPropertyPriority(prop));
      });

      // ensure images/fonts can load
      if (dst.tagName === "IMG") {
        dst.setAttribute("crossorigin", "anonymous");
      }

      // recurse
      const srcKids = src.childNodes || [];
      const dstKids = dst.childNodes || [];
      for (let i = 0; i < srcKids.length; i++) {
        if (!dstKids[i]) continue;
        if (srcKids[i].nodeType === 1) walk(srcKids[i], dstKids[i]); // ELEMENT_NODE
      }
    };

    walk(root, clone);
    return clone;
  }

  // Render an element to PNG using SVG <foreignObject> + canvas
  async function exportElementToPNG(
    node,
    { pixelRatio = 2, backgroundColor = "#ffffff", filter } = {}
  ) {
    const rect = node.getBoundingClientRect();
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);

    // Deep clone with inline styles
    const cloned = cloneWithInlineStyles(node, { filter });

    // Force a solid background so the PNG isn’t transparent in dark mode
    cloned.style.background = backgroundColor;

    // Wrap in a container that fixes relative positioning contexts
    const wrapper = document.createElement("div");
    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;
    wrapper.style.position = "relative";
    wrapper.style.isolation = "isolate"; // prevent blending glitches
    wrapper.appendChild(cloned);

    // Build SVG with foreignObject
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const fo = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "foreignObject"
    );
    fo.setAttribute("x", "0");
    fo.setAttribute("y", "0");
    fo.setAttribute("width", String(width));
    fo.setAttribute("height", String(height));
    fo.appendChild(wrapper);
    svg.appendChild(fo);

    // Serialize SVG to data URL
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const svgDataUrl =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);

    // Draw to canvas
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = (e) => rej(e);
      img.src = svgDataUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(height * pixelRatio));
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // fill bg
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  }

  // Screenshot: capture target + handler (robust clone-in-place + html2canvas)
  // Screenshot: capture target + handler (clone + targeted color normalization)
  const captureRef = React.useRef(null);

  const onSnap = React.useCallback(async () => {
    try {
      const node = captureRef.current;
      if (!node) return;

      const dark =
        document.documentElement.classList.contains("dark") ||
        window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
      const backgroundColor = dark ? "rgb(17,17,20)" : "rgb(255,255,255)";
      const pixelRatio = Math.max(2, window.devicePixelRatio || 1);

      // fonts first to avoid reflow in the clone
      try {
        await document.fonts?.ready;
      } catch {}

      const download = (dataUrl) => {
        if (!dataUrl) throw new Error("No snapshot data generated");
        const wk = Number(currentWeek) || 0;
        const yr = Number(currentYear) || new Date().getFullYear();
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `weekly-outlook-wk${wk}-${yr}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      };

      const captureWithHtml2Canvas = async () => {
        const download = (dataUrl) => {
          if (!dataUrl) throw new Error("No snapshot data generated");
          const wk = Number(currentWeek) || 0;
          const yr = Number(currentYear) || new Date().getFullYear();
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `weekly-outlook-wk${wk}-${yr}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        };
        // off-screen wrapper with same width as live node
        const rect = node.getBoundingClientRect();
        const wrapper = document.createElement("div");
        wrapper.style.position = "fixed";
        wrapper.style.left = "-100000px";
        wrapper.style.top = "0";
        wrapper.style.width = `${Math.ceil(rect.width)}px`;
        wrapper.style.pointerEvents = "none";
        wrapper.style.background = backgroundColor;
        document.body.appendChild(wrapper);

        try {
          // deep clone into wrapper so browser lays it out naturally
          const clone = node.cloneNode(true);
          wrapper.appendChild(clone);

          // targeted OKLCH → RGB normalization (preserve other styling)
          const ctx = document.createElement("canvas").getContext("2d");
          const toRGB = (val) => {
            if (!val || !ctx) return val;
            try {
              ctx.fillStyle = "#000";
              ctx.fillStyle = val;
              return ctx.fillStyle;
            } catch {
              return val;
            }
          };
          const hasOK = (s) => typeof s === "string" && /okl(ch|ab)/i.test(s);
          const COLOR_PROPS = [
            "color",
            "backgroundColor",
            "borderColor",
            "borderTopColor",
            "borderRightColor",
            "borderBottomColor",
            "borderLeftColor",
            "outlineColor",
            "textDecorationColor",
            "columnRuleColor",
            "caretColor",
            "accentColor",
            "fill",
            "stroke",
          ];
          const win = document.defaultView || window;

          clone.querySelectorAll("*").forEach((el) => {
            const cs = win.getComputedStyle(el);

            // 1) simple color props
            COLOR_PROPS.forEach((p) => {
              const v = cs[p];
              if (hasOK(v)) el.style[p] = toRGB(v);
            });

            // 2) gradients containing OKLCH → fall back to solid bg
            const bgi = cs.backgroundImage;
            if (hasOK(bgi)) {
              el.style.backgroundImage = "none";
              el.style.backgroundColor =
                toRGB(cs.backgroundColor) ||
                (dark ? "rgb(24,24,27)" : "rgb(255,255,255)");
            }

            // 3) shadows containing OKLCH only
            if (hasOK(cs.boxShadow)) el.style.boxShadow = "none";
            if (hasOK(cs.textShadow)) el.style.textShadow = "none";
          });

          // let styles apply
          await new Promise((r) => requestAnimationFrame(r));

          // render the CLONE at full height
          const fullW = Math.ceil(clone.scrollWidth || clone.clientWidth);
          const fullH = Math.ceil(clone.scrollHeight || clone.clientHeight);

          const canvas = await html2canvas(clone, {
            backgroundColor,
            scale: pixelRatio,
            useCORS: true,
            removeContainer: true,
            width: fullW,
            height: fullH,
            windowWidth: fullW,
            windowHeight: fullH,
            scrollX: 0,
            scrollY: 0,
            ignoreElements: (el) =>
              el?.getAttribute?.("data-snapshot-ignore") === "true",
          });

          return canvas.toDataURL("image/png");
        } finally {
          wrapper.remove();
        }
      };

      let dataUrl = null;
      try {
        dataUrl = await captureWithHtml2Canvas();
      } catch (err) {
        console.warn("Primary snapshot attempt failed, falling back", err);
        dataUrl = await exportElementToPNG(node, {
          pixelRatio,
          backgroundColor,
          filter: (el) => el?.getAttribute?.("data-snapshot-ignore") !== "true",
        });
      }

      download(dataUrl);
    } catch (err) {
      console.error("Snapshot failed:", err);
      alert("Snapshot failed. See console for details.");
    }
  }, [currentWeek, currentYear]);

  // Pull projections directly from stored rows in localStorage
  const projByOwner = React.useMemo(() => {
    try {
      const STORE_KEY = "FL_STORE_v1";
      const store = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      const lid =
        store.lastSelectedLeagueId || Object.keys(store.leaguesById || {})[0];
      const L = (store.leaguesById || {})[lid] || {};

      const yr = Number(currentYear) || 0;
      const wk = Number(currentWeek) || 0;

      const rows = (L.rows || []).filter(
        (r) => Number(r.season) === yr && Number(r.week) === wk
      );

      const m = new Map();
      rows.forEach((r) => {
        const owner = canonicalize(r?.manager || r?.owner || "").trim();
        const p = Number(r?.proj_for ?? r?.projFor);
        if (owner && Number.isFinite(p)) m.set(owner, p);
      });
      return m;
    } catch {
      return new Map();
    }
  }, [currentYear, currentWeek]);

  // ---------- live/current score from ESPN schedule (Week N) ----------
  const scoreByOwner = React.useMemo(() => {
    const wk = Number(currentWeek);
    const S = (typeof window !== "undefined" && window.__FL_SOURCES) || {};
    const seasonObj =
      S.seasonsByYear?.[currentYear] ||
      S.seasonsByYear?.[String(currentYear)] ||
      {};
    const sched =
      (Array.isArray(seasonObj?.schedule) && seasonObj.schedule.length
        ? seasonObj.schedule
        : Array.isArray(scheduleThisYear)
        ? scheduleThisYear
        : []) || [];

    if (!wk || !sched.length) return new Map();

    const ownerNameFromMap =
      typeof window !== "undefined" &&
      window.__ownerMaps &&
      typeof window.__ownerMaps.name === "function"
        ? window.__ownerMaps.name.bind(window.__ownerMaps)
        : null;

    const nameForTeam = (tid) => {
      const nm = ownerNameFromMap
        ? ownerNameFromMap(Number(currentYear), Number(tid))
        : null;
      return nm ? canonicalize(nm) : null;
    };

    const readScore = (side) =>
      Number(
        side?.totalPointsLive ??
          side?.rosterForMatchupPeriod?.appliedStatTotal ??
          side?.totalPoints ??
          side?.score ??
          0
      ) || 0;

    const out = new Map();
    for (const g of sched) {
      const period = Number(g?.matchupPeriodId ?? g?.scoringPeriodId);
      if (period !== wk) continue;

      const hId = Number(g?.home?.teamId ?? g?.homeTeamId ?? g?.homeId);
      const aId = Number(g?.away?.teamId ?? g?.awayTeamId ?? g?.awayId);

      if (Number.isFinite(hId)) {
        const owner = nameForTeam(hId);
        if (owner) out.set(owner, readScore(g.home));
      }
      if (Number.isFinite(aId)) {
        const owner = nameForTeam(aId);
        if (owner) out.set(owner, readScore(g.away));
      }
    }
    return out;
  }, [currentWeek, currentYear, canonicalize, scheduleThisYear]);

  // A) This week's REGULAR-SEASON matchups from league.games (keep 0–0 & ties)
  const rowsThisWeek = React.useMemo(() => {
    const all = Array.isArray(league?.games) ? league.games : [];
    return all
      .filter(
        (g) =>
          Number(g?.season) === Number(currentYear) &&
          g?.is_playoff !== true &&
          Number(g?.week) === Number(currentWeek)
      )
      .map((g) => {
        const ownerPts = pickNum(
          g.pf,
          g.points_for,
          g.points,
          g.score,
          g.owner_points,
          g.pts,
          g.fpts
        );
        const oppPts = pickNum(
          g.pa,
          g.points_against,
          g.opp_points,
          g.oppPts,
          g.against,
          g.opp_score
        );
        return {
          owner: canonicalize(g?.owner ?? g?.manager ?? ""),
          opp: canonicalize(g?.opp ?? g?.opponent ?? ""),
          res: (g?.res || g?.result || "").toUpperCase(), // W/L/T or ''
          ownerPts,
          oppPts,
          week: Number(g?.week) || null,
        };
      })
      .sort(
        (a, b) =>
          (a.week ?? 0) - (b.week ?? 0) ||
          a.owner.localeCompare(b.owner) ||
          a.opp.localeCompare(b.opp)
      );
  }, [league?.games, currentYear, currentWeek]);
  const matchupsThisWeek = React.useMemo(() => {
    const byKey = new Map(); // `${week}|A|B` sorted
    const keyOf = (week, a, b) => {
      const [A, B] = [a || "", b || ""].map(String).sort();
      return `${week}|${A}|${B}`;
    };

    for (const r of rowsThisWeek) {
      const A = (r.owner || "").trim();
      const B = (r.opp || "").trim();
      if (!A || !B || !r.week) continue;
      const key = keyOf(r.week, A, B);
      const cur = byKey.get(key) || { week: r.week, A: null, B: null };
      if (!cur.A) cur.A = r;
      else if (!cur.B) cur.B = r;
      byKey.set(key, cur);
    }

    const out = [];
    byKey.forEach(({ week, A, B }) => {
      if (!A && !B) return;
      const left = A || B;
      const right = B || A;
      const aName = canonicalize(left?.owner || "");
      const bName = canonicalize(left?.opp || right?.owner || "");
      // current live score from schedule (fallback to historical rows)
      const sA = scoreByOwner.get(aName);
      const sB = scoreByOwner.get(bName);
      const aPts = Number.isFinite(sA)
        ? sA
        : Number.isFinite(left?.ownerPts)
        ? left.ownerPts
        : 0;
      const bPts = Number.isFinite(sB)
        ? sB
        : Number.isFinite(right?.ownerPts)
        ? right.ownerPts
        : Number.isFinite(left?.oppPts)
        ? left.oppPts
        : 0;

      const projA = projByOwner.get(aName) ?? null;
      const projB = projByOwner.get(bName) ?? null;

      out.push({ week, aName, bName, aPts, bPts, projA, projB });
    });

    // ...end of matchupsThisWeek memo
    out.sort(
      (x, y) =>
        (x.week ?? 0) - (y.week ?? 0) ||
        x.aName.localeCompare(y.aName) ||
        x.bName.localeCompare(y.bName)
    );
    return out;
  }, [
    rowsThisWeek,
    currentYear,
    currentWeek,
    seasonThisYear,
    projByOwner,
    scoreByOwner,
  ]);
  // ---------- head-to-head history (REG season only; deduped per game) ----------
  const h2hIndex = React.useMemo(() => {
    // key: "ownerA|ownerB" (sorted) -> { total, aWins, bWins, rows:[latest first] }
    const idx = new Map();

    // 1) Pair mirror rows into a single game per (season, week, pair)
    //    Only regular season (ignore playoffs), keep ties.
    const bucket = new Map(); // season|week|A__B -> { Arow, Brow }
    const keyForGame = (yr, wk, a, b) =>
      `${yr}|${wk}|${[String(a || ""), String(b || "")].sort().join("__")}`;

    for (const r of league.games || []) {
      const yr = Number(r?.season);
      const wk = Number(r?.week);
      if (!Number.isFinite(yr) || !Number.isFinite(wk)) continue;
      if (r?.is_playoff === true) continue; // REG only

      const a = (r?.owner || r?.manager || "").trim();
      const b = (r?.opp || r?.opponent || "").trim();
      if (!a || !b) continue;

      const k = keyForGame(yr, wk, a, b);
      const cur = bucket.get(k) || { Arow: null, Brow: null };

      // Put the first perspective we see into Arow; the other perspective into Brow
      if (!cur.Arow) cur.Arow = r;
      else if (!cur.Brow) cur.Brow = r;

      bucket.set(k, cur);
    }

    // 2) Fold each game into the lifetime pair aggregates (count once per game)
    bucket.forEach(({ Arow, Brow }) => {
      // Pick a consistent "left/right" (A = first row we saw)
      const row = Arow || Brow;
      if (!row) return;

      const yr = Number(row.season);
      const wk = Number(row.week);
      const a = (row.owner || row.manager || "").trim();
      const b = (row.opp || row.opponent || "").trim();
      if (!a || !b) return;

      const pairKey = [a, b].sort().join("|");

      // Scores from both sides if available (don’t double-count)
      const aPts =
        Number(
          Arow?.pf ??
            Arow?.points_for ??
            Arow?.points ??
            Arow?.score ??
            Arow?.owner_points ??
            Arow?.pts ??
            Arow?.fpts
        ) || 0;

      let bPts = 0;
      if (Brow) {
        bPts =
          Number(
            Brow?.pf ??
              Brow?.points_for ??
              Brow?.points ??
              Brow?.score ??
              Brow?.owner_points ??
              Brow?.pts ??
              Brow?.fpts
          ) || 0;
      } else {
        // If we only had one perspective, try to use its "opponent points" fields
        bPts =
          Number(
            row?.pa ??
              row?.points_against ??
              row?.opp_points ??
              row?.oppPts ??
              row?.against ??
              row?.opp_score
          ) || 0;
      }

      // Decide winner for THIS GAME (ties allowed)
      const resA = String(
        Arow?.res ?? Arow?.result ?? row?.res ?? row?.result ?? ""
      ).toUpperCase();
      let aWin = null;
      if (resA === "W") aWin = true;
      else if (resA === "L") aWin = false;
      else if (Number.isFinite(aPts) && Number.isFinite(bPts)) {
        aWin = aPts > bPts ? true : aPts < bPts ? false : null;
      }

      // Prepare per-pair record container
      const rec = idx.get(pairKey) || {
        total: 0,
        aWins: 0,
        bWins: 0,
        rows: [], // most-recent first
      };

      // Figure out which side of the sorted pair is "A" for counts
      const [left, right] = [a, b].sort();
      const aIsLeft = left === a;

      rec.total += 1;
      if (aWin === true) {
        if (aIsLeft) rec.aWins += 1;
        else rec.bWins += 1;
      } else if (aWin === false) {
        if (aIsLeft) rec.bWins += 1;
        else rec.aWins += 1;
      }

      rec.rows.push({ year: yr, week: wk, a, b, aPts, bPts });

      idx.set(pairKey, rec);
    });

    return idx;
  }, [league.games]);

  // helper: get h2h summary for two owners (REG-season only, deduped)
  const h2hSummary = React.useCallback(
    (ownerA, ownerB) => {
      const key = [ownerA, ownerB].sort().join("|");
      const rec = h2hIndex.get(key);
      if (!rec) return { total: 0, wA: 0, wB: 0, last3: [] };

      // Convert counts to the caller’s (ownerA, ownerB) orientation
      const [left] = [ownerA, ownerB].sort();
      const aIsLeft = left === ownerA;
      const wA = aIsLeft ? rec.aWins : rec.bWins;
      const wB = aIsLeft ? rec.bWins : rec.aWins;

      const last3 = rec.rows
        .filter(
          (r) =>
            (r.a === ownerA && r.b === ownerB) ||
            (r.a === ownerB && r.b === ownerA)
        )
        .slice(0, 3)
        .map((r) => {
          const viewA = r.a === ownerA;
          const myPts = viewA ? r.aPts : r.bPts;
          const oppPts = viewA ? r.bPts : r.aPts;
          const result = myPts > oppPts ? "W" : myPts < oppPts ? "L" : "T";
          return { year: r.year, week: r.week, result };
        });

      return { total: rec.total, wA, wB, last3 };
    },
    [h2hIndex]
  );
  const h2hFor = h2hSummary;
  // Most-recent meeting (year, week, scores) in the caller's A/B orientation
  // Most-recent meeting (year, week, scores) BEFORE the current week
  const lastMeeting = React.useCallback(
    (A, B) => {
      const key = [A, B].sort().join("|");
      const rec = h2hIndex.get(key);
      if (!rec || !rec.rows?.length) return null;

      // Only consider games strictly before the current (year, week)
      const cutY = Number(currentYear) || 0;
      const cutW = Number(currentWeek) || 0;
      const rowsBeforeNow = rec.rows.filter((r) => {
        const y = Number(r.year) || 0;
        const w = Number(r.week) || 0;
        return y < cutY || (y === cutY && w < cutW);
      });

      // If there are no prior meetings, bail
      if (!rowsBeforeNow.length) return null;

      // Latest by (year, week)
      const r = rowsBeforeNow.reduce((best, cur) => {
        if (!best) return cur;
        const by = Number(best.year) || 0,
          bw = Number(best.week) || 0;
        const cy = Number(cur.year) || 0,
          cw = Number(cur.week) || 0;
        return cy > by || (cy === by && cw > bw) ? cur : best;
      }, null);

      const aFirst = r.a === A && r.b === B;
      const aPts = aFirst ? r.aPts : r.bPts;
      const bPts = aFirst ? r.bPts : r.aPts;
      let winner = null;
      if (Number.isFinite(aPts) && Number.isFinite(bPts)) {
        winner = aPts > bPts ? A : aPts < bPts ? B : null;
      }
      return {
        year: r.year,
        week: r.week,
        aName: A,
        bName: B,
        aPts,
        bPts,
        winner,
      };
    },
    [h2hIndex, currentYear, currentWeek]
  );

  // =====================================================================
  // C) Playoff probability engine (same approach as before)
  // =====================================================================
  const mergedPlayoffTeams = React.useMemo(() => {
    const out = {};
    (seasonsAll || []).forEach((yr) => {
      const base = Number(playoffTeamsBase?.[yr] ?? 0) || 0;
      const ovrd = Number(playoffTeamsOverrides?.[yr] ?? 0) || 0;
      out[yr] = ovrd || base || 0;
    });
    return out;
  }, [seasonsAll, playoffTeamsBase, playoffTeamsOverrides]);

  const { recProbByWeekStrict, ownerRecordNow } = React.useMemo(() => {
    // completed seasons, only those with known # playoff teams
    const completedSeasons = new Set();
    (owners || []).forEach((o) => {
      const bySeason = league.placementMap?.[o] || {};
      Object.entries(bySeason).forEach(([yrStr, place]) => {
        const yr = Number(yrStr);
        if (yr && Number.isFinite(Number(place))) completedSeasons.add(yr);
      });
    });

    const madePO = new Map(); // "owner__year" -> boolean
    (owners || []).forEach((o) => {
      const bySeason = league.placementMap?.[o] || {};
      Object.entries(bySeason).forEach(([yrStr, place]) => {
        const yr = Number(yrStr);
        const poCnt = Number(mergedPlayoffTeams?.[yr] || 0);
        if (!completedSeasons.has(yr) || !poCnt) return;
        const made = Number(place) > 0 && Number(place) <= poCnt;
        madePO.set(`${o}__${yr}`, made);
      });
    });

    // per-owner current season record through (currentWeek-1)
    const ownerRecordNow = new Map(); // owner -> {W,L}
    (league.games || []).forEach((g) => {
      const yr = Number(g?.season);
      const wk = Number(g?.week);
      if (yr !== currentYear) return;
      if (!Number.isFinite(wk) || wk >= currentWeek) return; // completed weeks only
      const owner = g?.owner || g?.manager;
      const res = String(g?.res || g?.result || "").toUpperCase();
      if (!owner || !res) return;
      const slot = ownerRecordNow.get(owner) || { W: 0, L: 0 };
      if (res === "W") slot.W += 1;
      else if (res === "L") slot.L += 1;
      ownerRecordNow.set(owner, slot);
    });

    // aggregate history (strict sample: exactly N games after week N)
    const perOwnerSeasonWeek = new Map(); // "owner__year" -> Map(week -> {w,l})
    for (const g of league.games || []) {
      const yr = Number(g?.season);
      if (!completedSeasons.has(yr)) continue;
      if (!mergedPlayoffTeams?.[yr]) continue;
      const wk = Number(g?.week);
      if (!Number.isFinite(wk)) continue;
      if (g?.is_playoff === true) continue; // only regular-season path for sample
      const owner = g?.owner || g?.manager;
      const res = String(g?.res || g?.result || "").toUpperCase();
      if (!owner || !res) continue;
      const key = `${owner}__${yr}`;
      if (!perOwnerSeasonWeek.has(key)) perOwnerSeasonWeek.set(key, new Map());
      const wkMap = perOwnerSeasonWeek.get(key);
      if (!wkMap.has(wk)) wkMap.set(wk, { w: 0, l: 0 });
      const slot = wkMap.get(wk);
      if (res === "W") slot.w += 1;
      else if (res === "L") slot.l += 1;
    }

    const recProbByWeekStrict = new Map(); // week -> Map("W-L" -> {made,total})
    const bump = (week, recKey, made) => {
      if (!recProbByWeekStrict.has(week))
        recProbByWeekStrict.set(week, new Map());
      const m = recProbByWeekStrict.get(week);
      const row = m.get(recKey) || { made: 0, total: 0 };
      row.total += 1;
      if (made) row.made += 1;
      m.set(recKey, row);
    };

    perOwnerSeasonWeek.forEach((wkMap, ownerSeasonKey) => {
      const made = madePO.get(ownerSeasonKey);
      if (made === undefined) return;
      let W = 0,
        L = 0;
      const weeks = Array.from(wkMap.keys()).sort((a, b) => a - b);
      for (const w of weeks) {
        const slot = wkMap.get(w);
        W += slot.w;
        L += slot.l;
        if (W + L === w) bump(w, `${W}-${L}`, made === true);
      }
    });

    return { recProbByWeekStrict, ownerRecordNow };
  }, [
    league.games,
    league.placementMap,
    owners,
    mergedPlayoffTeams,
    currentYear,
    currentWeek,
  ]);

  const probAt = React.useCallback(
    (week, W, L) => {
      const map = recProbByWeekStrict.get(Number(week));
      if (!map) return null;
      const row = map.get(`${W}-${L}`);
      if (!row || !row.total) return null;
      return row.made / row.total; // 0..1
    },
    [recProbByWeekStrict]
  );

  // Build playoff-prob deltas for owners appearing this week
  const swingRows = React.useMemo(() => {
    const out = [];
    const inWeekOwners = new Set();
    matchupsThisWeek.forEach((m) => {
      inWeekOwners.add(m.aName);
      inWeekOwners.add(m.bName);
    });
    inWeekOwners.forEach((owner) => {
      const rec = ownerRecordNow.get(owner) || { W: 0, L: 0 };
      const P_now = probAt(currentWeek - 1, rec.W, rec.L);
      const P_win = probAt(currentWeek, rec.W + 1, rec.L);
      const P_loss = probAt(currentWeek, rec.W, rec.L + 1);
      if (P_win == null && P_loss == null && P_now == null) return;
      out.push({
        owner,
        now: P_now,
        win: P_win,
        loss: P_loss,
        gain: P_win != null && P_now != null ? P_win - P_now : null,
        drop: P_loss != null && P_now != null ? P_now - P_loss : null,
        swing: P_win != null && P_loss != null ? P_win - P_loss : null,
      });
    });
    const mostGain = [...out]
      .filter((r) => r.gain != null)
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 3);
    const mostDrop = [...out]
      .filter((r) => r.drop != null)
      .sort((a, b) => b.drop - a.drop)
      .slice(0, 3);
    return { rows: out, mostGain, mostDrop };
  }, [matchupsThisWeek, ownerRecordNow, currentWeek, probAt]);

  const outlookFor = React.useCallback(
    (owner) => swingRows.rows.find((r) => r.owner === owner) || {},
    [swingRows.rows]
  );

  // =====================================================================
  // D) Picks: Rivalry (closest) and Dad/Son (most lopsided)
  // =====================================================================
  const rivalryPick = React.useMemo(() => {
    let best = null;
    for (const m of matchupsThisWeek) {
      const { wA, wB, total } = h2hFor(m.aName, m.bName);
      if (!total) continue;
      const diff = Math.abs(wA - wB);
      const row = { A: m.aName, B: m.bName, wA, wB, total, diff };
      if (
        !best ||
        diff < best.diff ||
        (diff === best.diff && total > best.total) ||
        (diff === best.diff &&
          total === best.total &&
          m.aName.localeCompare(best.A) < 0)
      ) {
        best = row;
      }
    }
    return best;
  }, [matchupsThisWeek, h2hFor]);

  const dadSonPick = React.useMemo(() => {
    let best = null;
    for (const m of matchupsThisWeek) {
      const { wA, wB, total } = h2hFor(m.aName, m.bName);
      if (!total) continue; // require at least one meeting
      const diff = Math.abs(wA - wB);
      const dad = wA >= wB ? m.aName : m.bName;
      const son = dad === m.aName ? m.bName : m.aName;
      const dadWins = Math.max(wA, wB);
      const sonWins = Math.min(wA, wB);
      const row = { dad, son, dadWins, sonWins, total, diff };
      if (
        !best ||
        diff > best.diff ||
        (diff === best.diff && total > best.total)
      ) {
        best = row;
      }
    }
    return best;
  }, [matchupsThisWeek, h2hFor]);

  const pct = (x) =>
    x == null || !Number.isFinite(Number(x))
      ? "—"
      : `${Math.round(Number(x) * 100)}%`;

  const pctNum = (x) =>
    x == null || !Number.isFinite(Number(x))
      ? null
      : Math.round(Number(x) * 100);

  const winColor = (isUp) =>
    isUp == null
      ? "text-zinc-500"
      : isUp
      ? "text-emerald-500"
      : "text-rose-500";

  // convenience for H2H line styling
  const h2hLine = (myWins, oppWins) => {
    const total = Number(myWins) + Number(oppWins);
    const myPct = total > 0 ? Math.round((myWins / total) * 100) : null;
    const mineUp = myWins > oppWins ? true : myWins < oppWins ? false : null;
    return {
      text: `H2H: ${myWins}–${oppWins}${myPct == null ? "" : ` (${myPct}%)`}`,
      cls: winColor(mineUp),
    };
  };

  // =====================================================================
  // UI
  // =====================================================================
  return (
    <div ref={captureRef} className="space-y-6">
      <Card
        title={
          <div className="flex items-center justify-between gap-2">
            <span>{`Weekly Outlook — Week ${currentWeek} (${currentYear})`}</span>

            {/* Camera button (ignored in snapshot) */}
            <button
              type="button"
              onClick={onSnap}
              data-snapshot-ignore="true"
              className="inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs
                         border border-zinc-300/60 dark:border-zinc-700/60
                         bg-white/70 dark:bg-zinc-900/70
                         hover:bg-white/90 hover:dark:bg-zinc-900/90
                         shadow-sm"
              title="Save snapshot"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M9 3l1.5 2H14l1.5-2H19a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h4zM12 18a5 5 0 100-10 5 5 0 000 10zm0-2.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
              </svg>
              <span className="hidden sm:inline">Snapshot</span>
            </button>
          </div>
        }
        subtitle="Matchups, rivalries, and playoff-odds swings"
      >
        <div className="grid md:grid-cols-3 gap-4">
          {/* Rivalry — fiery, centered, VS coin, last meeting */}
          <div
            className="
    rounded-2xl p-4 text-center
    bg-gradient-to-br from-orange-500/10 via-rose-500/10 to-amber-400/10
    border border-orange-400/30 dark:border-orange-400/30
    shadow-[0_10px_28px_-10px_rgba(234,88,12,.35)]
  "
          >
            <div
              className="
      text-xl md:text-2xl font-extrabold tracking-tight
      bg-gradient-to-r from-orange-400 via-red-500 to-amber-300
      bg-clip-text text-transparent drop-shadow
    "
            >
              Rivalry of the Week
            </div>

            {rivalryPick ? (
              (() => {
                const last = lastMeeting(rivalryPick.A, rivalryPick.B);
                const winsCls = (mine, theirs) =>
                  mine > theirs
                    ? "bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/40"
                    : mine < theirs
                    ? "bg-rose-600/20 text-rose-400 ring-1 ring-rose-500/40"
                    : "bg-zinc-600/20 text-zinc-300 ring-1 ring-zinc-500/30";

                return (
                  <>
                    <div className="mt-3 text-sm opacity-90">
                      Lifetime record
                    </div>

                    <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      {/* Left name + centered wins */}
                      <div className="flex flex-col items-center">
                        <div className="text-base md:text-lg font-semibold">
                          {rivalryPick.A}
                        </div>
                        <span
                          className={`mt-1 inline-block text-[11px] px-2 py-0.5 rounded-full tabular-nums ${winsCls(
                            rivalryPick.wA,
                            rivalryPick.wB
                          )}`}
                        >
                          {rivalryPick.wA} wins
                        </span>
                      </div>

                      {/* Pronounced VS coin */}
                      <div
                        className="
                relative mx-1 h-12 w-12 rounded-full grid place-items-center
                bg-white/95 dark:bg-zinc-900
                ring-2 ring-zinc-200 dark:ring-zinc-700
                shadow-[0_14px_36px_-10px_rgba(0,0,0,0.45)]
              "
                        aria-hidden="true"
                        title="VS"
                      >
                        <span
                          className="
                text-lg font-black uppercase tracking-wider
                bg-gradient-to-br from-orange-400 via-yellow-300 to-red-400
                bg-clip-text text-transparent drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]
              "
                        >
                          VS
                        </span>
                      </div>

                      {/* Right name + centered wins */}
                      <div className="flex flex-col items-center">
                        <div className="text-base md:text-lg font-semibold">
                          {rivalryPick.B}
                        </div>
                        <span
                          className={`mt-1 inline-block text-[11px] px-2 py-0.5 rounded-full tabular-nums ${winsCls(
                            rivalryPick.wB,
                            rivalryPick.wA
                          )}`}
                        >
                          {rivalryPick.wB} wins
                        </span>
                      </div>
                    </div>

                    {/* Last meeting instead of Δ */}
                    {last && (
                      <div className="mt-3 text-xs text-zinc-300">
                        Last meeting: {last.year} Wk {last.week} —{" "}
                        {last.winner ? (
                          <>
                            <span className="font-medium">{last.winner}</span>{" "}
                            {Math.round(Math.max(last.aPts, last.bPts))}–
                            {Math.round(Math.min(last.aPts, last.bPts))}
                          </>
                        ) : (
                          <>
                            Tie {Math.round(last.aPts)}–{Math.round(last.bPts)}
                          </>
                        )}
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <div className="mt-2 text-sm opacity-80">
                No prior meetings among this week’s pairs.
              </div>
            )}
          </div>

          {/* Dad / Son — cool blue, icons, VS coin, last meeting */}
          <div
            className="rounded-2xl border border-zinc-200/30 dark:border-zinc-800/50 p-5 overflow-hidden
                bg-[radial-gradient(120%_140%_at_0%_0%,rgba(59,130,246,.15),transparent_60%),radial-gradient(120%_140%_at_100%_100%,rgba(147,197,253,.12),transparent_60%)]"
          >
            <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-center">
              Dad / Son Matchup
            </div>
            <div className="mt-1 text-center text-sm text-zinc-400">
              Lifetime record
            </div>

            {dadSonPick ? (
              <>
                <div className="mt-4 grid grid-cols-[minmax(0,1.35fr)_auto_minmax(0,1.35fr)] items-stretch gap-1 md:gap-3">
                  {/* DAD side */}
                  <div className="min-w-0 w-full h-full rounded-2xl bg-zinc-900/20 border border-zinc-800/60 px-4 md:px-5 py-3 text-center">
                    <div className="text-2xl mb-1">👨</div>
                    <div className="text-[11px] tracking-wide uppercase text-zinc-400">
                      Dad
                    </div>
                    <AutoFitTwoLine
                      name={dadSonPick.dad}
                      className="mt-1 font-semibold tracking-tight"
                    />
                    {/* wins pill (green) */}
                    <div className="mt-3">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full
                             bg-emerald-900/25 text-emerald-300 ring-1 ring-emerald-700/40
                             text-sm tabular-nums"
                      >
                        {dadSonPick.dadWins} wins
                      </span>
                    </div>
                  </div>

                  {/* VS badge */}
                  <div
                    className="mx-1 h-12 w-12 md:h-14 md:w-14 rounded-full grid place-items-center
   bg-zinc-900/60 text-white
   ring-2 ring-zinc-700/60 shadow-[0_10px_28px_-6px_rgba(0,0,0,0.35)]"
                  >
                    <span
                      className="text-lg font-black uppercase tracking-wider
                           bg-gradient-to-br from-orange-400 via-yellow-300 to-red-400
                           bg-clip-text text-transparent"
                    >
                      VS
                    </span>
                  </div>

                  {/* SON side */}
                  <div className="min-w-0 w-full h-full rounded-2xl bg-zinc-900/20 border border-zinc-800/60 px-4 md:px-5 py-3 text-center">
                    <div className="text-2xl mb-1">👦</div>
                    <div className="text-[11px] tracking-wide uppercase text-zinc-400">
                      Son
                    </div>
                    <AutoFitTwoLine
                      name={dadSonPick.son}
                      className="mt-1 font-semibold tracking-tight"
                    />
                    {/* wins pill (red) */}
                    <div className="mt-3">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full
                             bg-rose-900/25 text-rose-300 ring-1 ring-rose-700/40
                             text-sm tabular-nums"
                      >
                        {dadSonPick.sonWins} wins
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last meeting line — same format as Rivalry */}
                {(() => {
                  const lm = lastMeeting(dadSonPick.dad, dadSonPick.son);
                  return (
                    lm && (
                      <div className="mt-4 text-center text-sm text-zinc-300/90">
                        Last meeting: {lm.year} Wk {lm.week} —{" "}
                        {lm.winner ? (
                          <>
                            <span className="font-medium">{lm.winner}</span>{" "}
                            {Math.round(Math.max(lm.aPts, lm.bPts))}–
                            {Math.round(Math.min(lm.aPts, lm.bPts))}
                          </>
                        ) : (
                          <>
                            Tie {Math.round(lm.aPts)}–{Math.round(lm.bPts)}
                          </>
                        )}
                      </div>
                    )
                  );
                })()}
              </>
            ) : (
              <div className="mt-3 text-center text-sm opacity-70">
                Not enough history yet.
              </div>
            )}
          </div>
          {/* Playoff-Prob Swings — centered, aligned, no ellipses */}
          <div
            className="
  rounded-2xl p-4 text-center
  bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10
  border border-indigo-400/30 dark:border-indigo-400/30
"
          >
            <div className="text-base font-semibold mb-2">
              Playoff-Prob Swings
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Gainers */}
              <div>
                <div className="text-xs uppercase font-semibold text-emerald-400 mb-2">
                  Most to gain (win)
                </div>

                {swingRows.mostGain.length ? (
                  <ul className="space-y-1">
                    {swingRows.mostGain.map((r) => (
                      <li
                        key={`gain-${r.owner}`}
                        className="grid items-center gap-2
                         grid-cols-[minmax(0,1fr)_3rem]"
                      >
                        {/* exactly two lines */}
                        <OwnerTwoLine name={r.owner} />
                        {/* fixed-width %, right-aligned, tabular digits */}
                        <span className="text-sm tabular-nums text-right font-semibold text-emerald-400 w-12">
                          {pct(r.gain)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs opacity-70">—</div>
                )}
              </div>

              {/* Droppers */}
              <div>
                <div className="text-xs uppercase font-semibold text-rose-400 mb-2">
                  Most to lose (loss)
                </div>

                {swingRows.mostDrop.length ? (
                  <ul className="space-y-1">
                    {swingRows.mostDrop.map((r) => (
                      <li
                        key={`drop-${r.owner}`}
                        className="grid items-center gap-2
                         grid-cols-[minmax(0,1fr)_3rem]"
                      >
                        <OwnerTwoLine name={r.owner} />
                        <span className="text-sm tabular-nums text-right font-semibold text-rose-400 w-12">
                          {pct(r.drop)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs opacity-70">—</div>
                )}
              </div>
            </div>

            <div className="mt-3 text-[11px] text-zinc-500">
              Probabilities are historical P(make playoffs) by record after Week
              N (strict Week-N sample).
            </div>
          </div>
        </div>
      </Card>

      {/* Matchups */}
      <Card>
        <div className="mb-4 text-center">
          <div
            className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight
                    bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent
                    drop-shadow"
          >
            Matchups &amp; Outlook
          </div>
          <div className="mt-1 text-sm md:text-base font-semibold opacity-80">
            Regular-season slate for Week {currentWeek}.
          </div>
        </div>

        {matchupsThisWeek.length === 0 ? (
          <div className="text-sm opacity-70">
            No pairable matchups for this week.
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {matchupsThisWeek.map((m, i) => {
              const h = h2hFor(m.aName, m.bName);
              const Ao = outlookFor(m.aName);
              const Bo = outlookFor(m.bName);

              return (
                <div
                  key={i}
                  className="
                  group relative transform-gpu
                  rounded-2xl
                  bg-gradient-to-br from-white to-zinc-50
                  dark:from-zinc-900 dark:to-zinc-950
                  border border-zinc-200/70 dark:border-zinc-700
                  shadow-md
                  hover:shadow-xl hover:scale-[1.02]
                  active:scale-[0.99] active:shadow-md
                  transition-transform transition-shadow duration-300 ease-[cubic-bezier(.2,.8,.2,1)]
                  p-4
                "
                >
                  {/* faint highlight edge */}
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none
                              shadow-[inset_1px_1px_0_rgba(255,255,255,0.5)]
                              dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.08)]"
                  />
                  {/* Top row: names + records + VS badge */}
                  <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    {/* left side */}
                    <div className="text-left">
                      <div className="text-base md:text-lg font-semibold tracking-tight drop-shadow-sm">
                        {m.aName}
                        <span className="ml-2 text-xs md:text-sm font-medium text-zinc-500">
                          ({ownerRecordNow.get(m.aName)?.W || 0}-
                          {ownerRecordNow.get(m.aName)?.L || 0})
                        </span>
                      </div>
                      {(() => {
                        const row = h2hLine(h.wA, h.wB);
                        return (
                          <div className={`mt-1 text-[11px] ${row.cls}`}>
                            {row.text}
                          </div>
                        );
                      })()}
                    </div>

                    {/* VS badge */}
                    <div
                      className="
    relative mx-1 h-12 w-12 rounded-full grid place-items-center
    bg-white/95 dark:bg-zinc-900
    ring-2 ring-zinc-200 dark:ring-zinc-700
    shadow-[0_10px_28px_-6px_rgba(0,0,0,0.35)]
    group-hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.45)]
    transition-shadow duration-300
    after:absolute after:inset-0 after:rounded-full
    after:bg-[radial-gradient(closest-side,rgba(255,255,255,0.5),transparent)]
  "
                      aria-hidden="true"
                      title="VS"
                    >
                      {/* If you want an image, set window.__FL_VS_IMAGE = 'https://.../vs.png' */}
                      {typeof window !== "undefined" && window.__FL_VS_IMAGE ? (
                        <img
                          src={window.__FL_VS_IMAGE}
                          crossOrigin="anonymous"
                          alt="VS"
                          className="h-8 w-8 object-contain opacity-95"
                        />
                      ) : (
                        <span
                          className="
        text-lg font-black uppercase tracking-wider
        bg-gradient-to-br from-orange-400 via-yellow-300 to-red-400
        bg-clip-text text-transparent drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]
      "
                          style={{ letterSpacing: "0.08em" }}
                        >
                          VS
                        </span>
                      )}
                    </div>

                    {/* right side */}
                    <div className="text-right">
                      <div className="text-base md:text-lg font-semibold tracking-tight drop-shadow-sm">
                        {m.bName}
                        <span className="ml-2 text-xs md:text-sm font-medium text-zinc-500">
                          ({ownerRecordNow.get(m.bName)?.W || 0}-
                          {ownerRecordNow.get(m.bName)?.L || 0})
                        </span>
                      </div>
                      {(() => {
                        const row = h2hLine(h.wB, h.wA);

                        return (
                          <div className={`mt-1 text-[11px] ${row.cls}`}>
                            {row.text}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Score + projections row */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div
                      className="
    p-3 rounded-xl
    bg-gradient-to-b from-white/90 to-zinc-50/80
    dark:from-zinc-900/70 dark:to-zinc-900/50
    border border-zinc-200/70 dark:border-zinc-800
    shadow-sm
    group-hover:shadow
    transition-all duration-300
    group-active:translate-y-[1px] group-active:shadow-none
  "
                    >
                      <div className="text-[11px] uppercase tracking-wide opacity-70 font-semibold">
                        Score
                      </div>

                      <div className="mt-0.5 text-lg tabular-nums font-semibold">
                        {(m.aPts ?? 0).toFixed(1)} — {(m.bPts ?? 0).toFixed(1)}
                      </div>
                    </div>

                    <div
                      className="
    p-3 rounded-xl
    bg-gradient-to-b from-white/90 to-zinc-50/80
    dark:from-zinc-900/70 dark:to-zinc-900/50
    border border-zinc-200/70 dark:border-zinc-800
    shadow-sm
    group-hover:shadow
    transition-all duration-300
    group-active:translate-y-[1px] group-active:shadow-none
  "
                    >
                      <div className="text-[11px] uppercase tracking-wide opacity-70 font-semibold">
                        Proj (starters)
                      </div>
                      <div className="mt-0.5 text-lg tabular-nums font-semibold">
                        {Number.isFinite(m?.projA) ? m.projA.toFixed(1) : "—"} —{" "}
                        {Number.isFinite(m?.projB) ? m.projB.toFixed(1) : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Outlook pills */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div
                      className="
    p-3 rounded-xl
    bg-gradient-to-b from-white/90 to-zinc-50/80
    dark:from-zinc-900/70 dark:to-zinc-900/50
    border border-zinc-200/70 dark:border-zinc-800
    shadow-sm
    group-hover:shadow
    transition-all duration-300
    group-active:translate-y-[1px] group-active:shadow-none
  "
                    >
                      <div className="text-xs font-semibold mb-2">
                        {m.aName}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="opacity-70">Current Playoff Odds</span>
                        <span className="tabular-nums">
                          {pct(outlookFor(m.aName).now)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="opacity-70">With Win</span>
                        <span className={`tabular-nums ${winColor(true)}`}>
                          {pct(outlookFor(m.aName).win)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="opacity-70">With Loss</span>
                        <span className={`tabular-nums ${winColor(false)}`}>
                          {pct(outlookFor(m.aName).loss)}
                        </span>
                      </div>
                    </div>

                    <div
                      className="
  p-3 rounded-xl
  bg-gradient-to-b from-white/90 to-zinc-50/80
  dark:from-zinc-900/70 dark:to-zinc-900/50
  border border-zinc-200/70 dark:border-zinc-800
  shadow-sm group-hover:shadow transition-all duration-300
  group-active:translate-y-[1px] group-active:shadow-none
"
                    >
                      <div className="text-xs font-semibold mb-2">
                        {m.bName}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="opacity-70">Current Playoff Odds</span>
                        <span className="tabular-nums">
                          {pct(outlookFor(m.bName).now)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="opacity-70">With Win</span>
                        <span className={`tabular-nums ${winColor(true)}`}>
                          {pct(outlookFor(m.bName).win)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="opacity-70">With Loss</span>
                        <span className={`tabular-nums ${winColor(false)}`}>
                          {pct(outlookFor(m.bName).loss)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
/* ScenarioTab — “Last time X happened” explorer */
export function ScenarioTab({
  league,
  espnOwnerByTeamByYear = {},
  selectedLeague,
  hiddenManagers,

  // optional (kept for future scenarios)
  espnRostersByYear = {},
  rawRows = [],
  espnTeamNamesByOwner = {},
  espnOwnerFullByTeamByYear = {},
  espnRosterAcqByYear: rosterAcqByYearProp = {},
  activityBySeason: activityFromProp = {},
}) {
  if (!league) return null;

  // Make manager name lookups rock-solid
  primeOwnerMaps({
    league,
    selectedLeague,
    espnOwnerByTeamByYear,
    manualAliases: {}, // add overrides if needed later
  });

  // ---------- Basic data + helpers ----------
  const allOwners = Array.isArray(league?.owners) ? league.owners : [];
  const defaultHidden = new Set(
    Array.isArray(hiddenManagers)
      ? hiddenManagers
      : Array.isArray(league?.hiddenManagers)
      ? league.hiddenManagers
      : []
  );

  const [scope, setScope] = React.useState("all"); // "regular" | "playoffs" | "all"
  const [includeHidden, setIncludeHidden] = React.useState(false);
  const [ownerFilter, setOwnerFilter] = React.useState("_ALL_"); // "_ALL_" or one manager name
  const [andOwners, setAndOwners] = React.useState([]); // ["Name A", "Name B", ...]

  const [search, setSearch] = React.useState("");

  // Category & option pickers
  const [category, setCategory] = React.useState("points");
  const [option, setOption] = React.useState("pts_ge_150");

  const ownersBase = includeHidden
    ? allOwners
    : allOwners.filter((o) => !defaultHidden.has(o));

  const ownersSet = new Set(ownersBase);

  const decided = (g) =>
    g &&
    (String(g.res).toUpperCase() === "W" ||
      String(g.res).toUpperCase() === "L");

  const inScopeGame = (g) =>
    scope === "regular"
      ? g.is_playoff !== true
      : scope === "playoffs"
      ? g.is_playoff === true
      : true;

  // finished (decided) games for relevant owners
  const finishedGames = (league.games || []).filter(
    (g) => decided(g) && ownersSet.has(g.owner) && ownersSet.has(g.opp)
  );

  const scopeGames = finishedGames.filter(inScopeGame);

  const pickNum = (...vals) => {
    for (const v of vals) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  const fmtWeek = (w) => (w == null || isNaN(Number(w)) ? "?" : String(w));

  // quick per-season “last place” max helper
  const maxPlaceBySeason = React.useMemo(() => {
    const out = {};
    Object.values(league?.placementMap || {}).forEach((byYear) => {
      Object.entries(byYear || {}).forEach(([yr, place]) => {
        const y = Number(yr);
        const p = Number(place);
        if (!Number.isFinite(p) || p <= 0) return;
        out[y] = Math.max(out[y] || 0, p);
      });
    });
    return out;
  }, [league?.placementMap]);

  // ---------- Scenario registry ----------
  // Category: "points"
  // Options implement a predicate that returns TRUE if a single game by OWNER matches.
  const POINT_OPTIONS = [
    // highs (≥)
    { key: "pts_ge_130", label: "130+ points", test: (pf) => pf >= 130 },
    { key: "pts_ge_140", label: "140+ points", test: (pf) => pf >= 140 },
    { key: "pts_ge_150", label: "150+ points", test: (pf) => pf >= 150 },
    { key: "pts_ge_160", label: "160+ points", test: (pf) => pf >= 160 },
    { key: "pts_ge_170", label: "170+ points", test: (pf) => pf >= 170 },
    { key: "pts_ge_180", label: "180+ points", test: (pf) => pf >= 180 },
    { key: "pts_ge_190", label: "190+ points", test: (pf) => pf >= 190 },
    { key: "pts_ge_200", label: "200+ points", test: (pf) => pf >= 200 },

    // lows (≤)
    { key: "pts_le_90", label: "90 points or less", test: (pf) => pf <= 90 },
    { key: "pts_le_80", label: "80 points or less", test: (pf) => pf <= 80 },
    { key: "pts_le_70", label: "70 points or less", test: (pf) => pf <= 70 },
    { key: "pts_le_60", label: "60 points or less", test: (pf) => pf <= 60 },
    { key: "pts_le_50", label: "50 points or less", test: (pf) => pf <= 50 },
    { key: "pts_le_40", label: "40 points or less", test: (pf) => pf <= 40 },
    { key: "pts_le_30", label: "30 points or less", test: (pf) => pf <= 30 },
  ];

  // Category: "recordStart"
  // “Started N-0” → owner’s first N games of a season were wins.
  // Helper: given sorted season games for a manager, return the week where they
  // first reached X-0 (wins before first loss), or null if never.
  function weekStartedWins(games, xWinsNeeded) {
    let wins = 0;
    for (const g of games) {
      const res = String(g.res || g.result || "").toUpperCase();
      if (res === "W") {
        wins += 1;
        if (wins === xWinsNeeded) return Number(g.week) || null;
      } else if (res === "L") {
        // streak ended before reaching target
        return null;
      }
    }
    return null;
  }

  // Helper: first reached 0-X (losses before first win)
  function weekStartedLosses(games, xLossesNeeded) {
    let losses = 0;
    for (const g of games) {
      const res = String(g.res || g.result || "").toUpperCase();
      if (res === "L") {
        losses += 1;
        if (losses === xLossesNeeded) return Number(g.week) || null;
      } else if (res === "W") {
        // win breaks the 0-X path
        return null;
      }
    }
    return null;
  }

  const START_RECORD_OPTIONS = [
    // 1-0 .. 8-0
    ...Array.from({ length: 8 }, (_, i) => {
      const n = i + 1;
      return {
        key: `start_${n}_0`,
        label: `${n}-0 start`,
        // testSeason(gamesInSeasonForManager) -> returns week (number) when reached, else null
        seasonWeekPicker: (games) => weekStartedWins(games, n),
      };
    }),
    // 0-1 .. 0-8
    ...Array.from({ length: 8 }, (_, i) => {
      const n = i + 1;
      return {
        key: `start_0_${n}`,
        label: `0-${n} start`,
        seasonWeekPicker: (games) => weekStartedLosses(games, n),
      };
    }),
  ];

  // Category: "placement" — season-level
  const PLACEMENT_OPTIONS = [
    { key: "PLACED_CHAMP", label: "Won the championship (1st)" },
    { key: "PLACED_PLAYOFFS", label: "Made the playoffs (any place > 0)" },
    { key: "PLACED_LAST", label: "Finished last" },
  ];

  // To support a searchable dropdown, filter by text
  const filterBySearch = (arr) =>
    arr.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  const categoryOptions = {
    points: filterBySearch(POINT_OPTIONS),
    recordStart: filterBySearch(START_RECORD_OPTIONS),
    placement: filterBySearch(PLACEMENT_OPTIONS),
  };

  // Ensure `option` stays valid when category changes or search filters it out
  React.useEffect(() => {
    const opts = categoryOptions[category];
    if (!opts.some((o) => o.key === option)) {
      setOption(opts[0]?.key || "");
    }
  }, [category, search]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Core calculators (“last time X happened”) ----------
  // Returns { season, week } for game-based scenarios; { season } for placement
  function lastTimePoints(owner, selectorKey) {
    const opt = POINT_OPTIONS.find((o) => o.key === selectorKey);
    if (!opt) return null;

    // find latest game (by season then week) where owner PF meets condition
    // NOTE: Some rows may be missing week; treat them as week 0 for ordering.
    const rows = scopeGames
      .filter((g) => g.owner === owner)
      .map((g) => ({
        season: Number(g.season),
        week: Number(g.week) || 0,
        pf: pickNum(
          g.pf,
          g.points_for,
          g.points,
          g.score,
          g.owner_points,
          g.pts,
          g.fpts
        ),
      }))
      .filter((r) => Number.isFinite(r.pf))
      .sort((a, b) => a.season - b.season || a.week - b.week);

    let last = null;
    rows.forEach((r) => {
      if (opt.test(r.pf)) last = { season: r.season, week: r.week };
    });
    return last;
  }

  function lastTimeRecordStart(owner, selectorKey) {
    const opt = START_RECORD_OPTIONS.find((o) => o.key === selectorKey);
    if (!opt) return null;

    // group owner's games by season (sorted by week)
    const bySeason = new Map();
    scopeGames
      .filter((g) => g.owner === owner)
      .map((g) => ({
        season: Number(g.season),
        week: Number(g.week) || 0,
        res: String(g.res).toUpperCase(),
      }))
      .sort((a, b) => a.season - b.season || a.week - b.week)
      .forEach((g) => {
        if (!bySeason.has(g.season)) bySeason.set(g.season, []);
        bySeason.get(g.season).push(g);
      });

    // use the option’s picker to decide the week they reached the start
    let last = null;
    for (const [season, games] of bySeason.entries()) {
      const wk = opt.seasonWeekPicker(games); // returns week number or null
      if (wk != null) {
        if (
          !last ||
          season > last.season ||
          (season === last.season && wk > (last.week || 0))
        ) {
          last = { season, week: wk };
        }
      }
    }
    return last;
  }

  function lastTimePlacement(owner, selectorKey) {
    // read straight from placementMap
    const byYear = league?.placementMap?.[owner] || {};
    const entries = Object.entries(byYear)
      .map(([yr, place]) => ({ season: Number(yr), place: Number(place) }))
      .filter((r) => Number.isFinite(r.place) && r.place > 0) // playoffs appearance gate
      .sort((a, b) => a.season - b.season);

    let last = null;
    for (const r of entries) {
      if (selectorKey === "PLACED_CHAMP" && r.place === 1)
        last = { season: r.season };
      else if (selectorKey === "PLACED_PLAYOFFS" && r.place > 0)
        last = { season: r.season };
      else if (
        selectorKey === "PLACED_LAST" &&
        r.place === maxPlaceBySeason[r.season]
      )
        last = { season: r.season };
    }
    return last;
  }
  // ── Occurrence finders (for multi-manager AND) ───────────────────────────────

  // points: list of {season, week}
  function allPointsOccurrences(owner, selectorKey) {
    const opt = POINT_OPTIONS.find((o) => o.key === selectorKey);
    if (!opt) return [];
    return scopeGames
      .filter((g) => g.owner === owner)
      .map((g) => ({
        season: Number(g.season),
        week: Number(g.week) || 0,
        pf: pickNum(
          g.pf,
          g.points_for,
          g.points,
          g.score,
          g.owner_points,
          g.pts,
          g.fpts
        ),
      }))
      .filter((r) => Number.isFinite(r.pf) && opt.test(r.pf))
      .map(({ season, week }) => ({ season, week }));
  }

  // record start: list of {season, weekReached}
  function allRecordStartOccurrences(owner, selectorKey) {
    const opt = START_RECORD_OPTIONS.find((o) => o.key === selectorKey);
    if (!opt) return [];
    const bySeason = new Map();
    scopeGames
      .filter((g) => g.owner === owner)
      .map((g) => ({
        season: Number(g.season),
        week: Number(g.week) || 0,
        res: String(g.res).toUpperCase(),
      }))
      .sort((a, b) => a.season - b.season || a.week - b.week)
      .forEach((g) => {
        if (!bySeason.has(g.season)) bySeason.set(g.season, []);
        bySeason.get(g.season).push(g);
      });

    const out = [];
    for (const [season, games] of bySeason.entries()) {
      const wk = opt.seasonWeekPicker(games);
      if (wk != null) out.push({ season, week: wk });
    }
    return out;
  }

  // placement: list of {season} (week null)
  function allPlacementOccurrences(owner, selectorKey) {
    const byYear = league?.placementMap?.[owner] || {};
    const out = [];
    for (const [yr, placeRaw] of Object.entries(byYear)) {
      const season = Number(yr);
      const place = Number(placeRaw);
      if (!Number.isFinite(season) || !Number.isFinite(place) || place <= 0)
        continue;

      if (selectorKey === "PLACED_CHAMP" && place === 1)
        out.push({ season, week: null });
      else if (selectorKey === "PLACED_PLAYOFFS" && place > 0)
        out.push({ season, week: null });
      else if (selectorKey === "PLACED_LAST") {
        const lastMax = maxPlaceBySeason[season];
        if (lastMax && place === lastMax) out.push({ season, week: null });
      }
    }
    return out;
  }

  // unified getter
  function allOccurrences(owner, cat, optKey) {
    if (cat === "points") return allPointsOccurrences(owner, optKey);
    if (cat === "recordStart") return allRecordStartOccurrences(owner, optKey);
    if (cat === "placement") return allPlacementOccurrences(owner, optKey);
    return [];
  }

  // intersection finder: latest season/week where *all* owners satisfied
  function lastTimeAll(owners, cat, optKey) {
    if (!owners.length) return null;

    // Build maps: cat logic for “same moment”
    // - points: same (season, week)
    // - recordStart: same season (week is deterministic per option for everyone)
    // - placement: same season
    const keyOf = (occ) =>
      cat === "points" ? `${occ.season}|${occ.week ?? 0}` : `${occ.season}|*`; // season-only match

    const sets = owners.map(
      (o) => new Set(allOccurrences(o, cat, optKey).map(keyOf))
    );
    if (sets.some((s) => s.size === 0)) return null;

    // intersect
    const [first, ...rest] = sets;
    const inter = [];
    for (const k of first) {
      if (rest.every((s) => s.has(k))) inter.push(k);
    }
    if (!inter.length) return null;

    // pick latest by season/week
    inter.sort((a, b) => {
      const [sa, wa] = a.split("|").map((x) => Number(x === "*" ? 0 : x));
      const [sb, wb] = b.split("|").map((x) => Number(x === "*" ? 0 : x));
      return sa - sb || wa - wb;
    });
    const best = inter[inter.length - 1];
    const [seasonStr, weekStr] = best.split("|");
    const season = Number(seasonStr);
    const week = weekStr === "*" ? null : Number(weekStr);
    return { season, week };
  }

  // Dispatcher per category
  function lastTime(owner, cat, optKey) {
    if (!owner || !optKey) return null;
    if (cat === "points") return lastTimePoints(owner, optKey);
    if (cat === "recordStart") return lastTimeRecordStart(owner, optKey);
    if (cat === "placement") return lastTimePlacement(owner, optKey);
    return null;
  }

  // ---------- Build table rows ----------
  const rows = React.useMemo(() => {
    const targetOwners =
      ownerFilter === "_ALL_"
        ? ownersBase
        : ownersBase.filter((o) => o === ownerFilter);

    return targetOwners.map((o) => {
      const when = lastTime(o, category, option);
      return {
        owner: o,
        season: when?.season ?? null,
        week: when?.week ?? null,
        has: Boolean(when),
      };
    });
  }, [
    ownersBase,
    ownerFilter,
    category,
    option,
    scopeGames,
    league?.placementMap,
    maxPlaceBySeason,
  ]);

  // sorting
  const [sortKey, setSortKey] = React.useState("owner"); // "owner" | "when"
  const [sortDir, setSortDir] = React.useState("asc"); // "asc" | "desc"
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedRows = rows.slice().sort((a, b) => {
    if (sortKey === "owner") {
      const cmp = a.owner.localeCompare(b.owner);
      return sortDir === "asc" ? cmp : -cmp;
    }
    // when: nulls last (asc), first (desc)
    const aKey = a.has
      ? `${a.season.toString().padStart(4, "0")}-${(a.week || 0)
          .toString()
          .padStart(2, "0")}`
      : null;
    const bKey = b.has
      ? `${b.season.toString().padStart(4, "0")}-${(b.week || 0)
          .toString()
          .padStart(2, "0")}`
      : null;

    if (aKey === bKey) return a.owner.localeCompare(b.owner);
    if (aKey == null) return sortDir === "asc" ? 1 : -1;
    if (bKey == null) return sortDir === "asc" ? -1 : 1;
    return sortDir === "asc"
      ? aKey.localeCompare(bKey)
      : bKey.localeCompare(aKey);
  });

  // labels
  const categoryLabel = {
    points: "Points",
    recordStart: "Record start",
    placement: "Placement",
  }[category];

  const optionLabel =
    (categoryOptions[category].find((o) => o.key === option) || {}).label || "";

  const labelCls =
    "text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400";
  const inputCls =
    "w-full rounded-xl border border-white/50 dark:border-white/10 bg-white/90 dark:bg-zinc-950/70 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-100 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.85)] transition focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-300";
  const pillButtonCls =
    "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-900 dark:text-amber-100 bg-gradient-to-r from-amber-300/90 via-amber-200/80 to-amber-400/90 shadow-[0_22px_45px_-25px_rgba(245,158,11,0.8)] hover:from-amber-200 hover:via-amber-100 hover:to-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-400/50";
  const subtleButtonCls =
    "inline-flex items-center justify-center rounded-full px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-200 border border-white/60 dark:border-white/10 bg-white/80 dark:bg-zinc-950/70 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.8)] hover:bg-white/95 hover:dark:bg-zinc-900/70 transition focus:outline-none focus:ring-2 focus:ring-amber-400/40";
  const ControlPanel = ({ label, children, className = "" }) => (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/30 dark:border-white/10 bg-white/70 dark:bg-zinc-950/60 shadow-[0_24px_55px_-35px_rgba(15,23,42,0.9)] backdrop-blur ${className}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(110%_140%_at_0%_0%,rgba(250,204,21,0.18),transparent_60%),radial-gradient(120%_150%_at_100%_100%,rgba(253,224,71,0.14),transparent_60%)]" />
        <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
      </div>
      <div className="relative z-10 flex flex-col gap-2 p-4">
        {label ? <div className={`${labelCls}`}>{label}</div> : null}
        {children}
      </div>
    </div>
  );

  // ---------- UI ----------
  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card
        title="Scenarios"
        subtitle="Find the last time each manager hit a condition."
        right={
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-300">
              Scope
            </span>
            <select
              className="rounded-full border border-white/60 dark:border-white/10 bg-white/85 dark:bg-zinc-950/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-600 dark:text-slate-200 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.85)] focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="regular">Regular season</option>
              <option value="playoffs">Playoffs</option>
              <option value="all">All games</option>
            </select>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <ControlPanel label="Category" className="md:col-span-2">
            <select
              className={inputCls}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
              }}
            >
              <option value="points">Points</option>
              <option value="recordStart">Record start</option>
              <option value="placement">Placement</option>
            </select>
          </ControlPanel>

          <ControlPanel label="Option" className="md:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Search options…"
                className={`${inputCls} flex-1`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className={`${inputCls} flex-1`}
                value={option}
                onChange={(e) => setOption(e.target.value)}
              >
                {categoryOptions[category].map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </ControlPanel>

          <ControlPanel label="Manager" className="md:col-span-1">
            <select
              className={inputCls}
              value={ownerFilter}
              onChange={(e) => {
                setOwnerFilter(e.target.value);
                setAndOwners([]); // reset AND list if primary changes
              }}
            >
              <option value="_ALL_">All managers</option>
              {ownersBase.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>

            {/* AND selectors */}
            <div className="mt-3 space-y-2">
              {andOwners.map((name, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-white/50 dark:border-white/10 bg-white/70 dark:bg-zinc-950/60 px-2 py-2 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.85)]"
                >
                  <span className={`${labelCls} !m-0 text-[10px]`}>+ And</span>
                  <select
                    className={`${inputCls} flex-1 text-[12px]`}
                    value={name}
                    onChange={(e) => {
                      const next = andOwners.slice();
                      next[idx] = e.target.value;
                      setAndOwners(next);
                    }}
                  >
                    <option value="">— select —</option>
                    {ownersBase
                      .filter(
                        (o) =>
                          o !== ownerFilter &&
                          !andOwners.some((x, i) => i !== idx && x === o)
                      )
                      .map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                  </select>
                  <button
                    className={subtleButtonCls}
                    onClick={() =>
                      setAndOwners(andOwners.filter((_, i) => i !== idx))
                    }
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                className={pillButtonCls}
                onClick={() => setAndOwners([...andOwners, ""])}
                disabled={ownerFilter === "_ALL_"}
                title={
                  ownerFilter === "_ALL_"
                    ? "Pick a primary manager first"
                    : "Add another manager to AND together"
                }
              >
                + Add Manager
              </button>
            </div>

            <label className="mt-4 flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-white/60 dark:border-white/20 bg-white/80 dark:bg-zinc-950/70 text-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                checked={includeHidden}
                onChange={(e) => setIncludeHidden(e.target.checked)}
              />
              Include hidden managers
            </label>
          </ControlPanel>
        </div>
      </Card>

      {/* Results */}
      <Card title="Results" subtitle={`${categoryLabel} — ${optionLabel}`}>
        {/* AND summary (only when ownerFilter is a single manager and extra managers are chosen) */}
        {ownerFilter !== "_ALL_" &&
          andOwners.filter(Boolean).length > 0 &&
          (() => {
            const group = [ownerFilter, ...andOwners.filter(Boolean)];
            const joint = lastTimeAll(group, category, option);
            return (
              <div className="mb-4 rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-200/40 via-amber-100/30 to-amber-300/40 px-4 py-3 text-[13px] text-amber-900 shadow-[0_18px_40px_-30px_rgba(245,158,11,0.7)] dark:border-amber-400/40 dark:text-amber-100 dark:from-amber-500/10 dark:via-amber-400/10 dark:to-amber-500/10">
                <span className="font-semibold uppercase tracking-[0.25em] text-[11px] text-amber-600 dark:text-amber-200">
                  Last combo
                </span>
                <div className="mt-1">
                  <span className="opacity-80">Last time </span>
                  <span className="font-semibold tracking-wide">
                    {group.join(" + ")}
                  </span>
                  <span className="opacity-80"> all matched: </span>
                </div>
                {joint ? (
                  category === "points" ? (
                    <>
                      S{joint.season} W{fmtWeek(joint.week)}
                    </>
                  ) : (
                    <>S{joint.season}</>
                  )
                ) : (
                  <span className="opacity-60">— never —</span>
                )}
              </div>
            );
          })()}

        <div className="overflow-x-auto">
          <div className="min-w-full overflow-hidden rounded-2xl border border-white/25 dark:border-white/10 bg-white/70 dark:bg-white/[0.05] shadow-[0_30px_60px_-35px_rgba(15,23,42,0.85)]">
            <table className="w-full text-[13px] text-slate-700 dark:text-slate-200">
              <thead className="bg-gradient-to-r from-white/90 via-white/70 to-white/60 dark:from-white/10 dark:via-white/5 dark:to-white/0 border-b border-white/50 dark:border-white/10 uppercase text-[11px] tracking-[0.25em] text-slate-600 dark:text-slate-300">
                <tr>
                  <th
                    className="px-4 py-3 text-left cursor-pointer select-none"
                    onClick={() => toggleSort("owner")}
                  >
                    Manager{" "}
                    {sortKey === "owner" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer select-none"
                    onClick={() => toggleSort("when")}
                  >
                    Last time{" "}
                    {sortKey === "when" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/45 dark:divide-white/10">
                {(() => {
                  // Decide which names to render
                  const names =
                    ownerFilter !== "_ALL_" &&
                    andOwners.filter(Boolean).length > 0
                      ? [ownerFilter, ...andOwners.filter(Boolean)]
                      : sortedRows.map((r) => r.owner);

                  // De-dupe (just in case)
                  const uniqueNames = Array.from(new Set(names));

                  if (uniqueNames.length === 0) {
                    return (
                      <tr className="bg-white/60 dark:bg-white/[0.03]">
                        <td
                          colSpan={2}
                          className="px-4 py-6 text-center text-slate-500 dark:text-slate-300"
                        >
                          No managers to show.
                        </td>
                      </tr>
                    );
                  }

                  return uniqueNames.map((name) => {
                    // Find the computed row for this manager (or a blank fallback)
                    const r = sortedRows.find((x) => x.owner === name) || {
                      has: false,
                      season: null,
                      week: null,
                    };

                    return (
                      <tr
                        key={name}
                        className="transition-colors even:bg-white/55 odd:bg-white/40 hover:bg-amber-100/50 dark:even:bg-white/[0.04] dark:odd:bg-white/[0.02] dark:hover:bg-amber-500/10"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">
                          {name}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-200">
                          {r.has ? (
                            category === "placement" ? (
                              <>S{r.season}</>
                            ) : (
                              <>
                                S{r.season} W{fmtWeek(r.week)}
                              </>
                            )
                          ) : (
                            <span className="opacity-60">— never —</span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Footnote */}
      <Card>
        <div className="text-xs text-zinc-500">
          Notes: Points scenarios use finished games in the selected scope.
          “Record start” checks the first N weeks of each season (per manager).
          “Placement” uses final standings from your data.
        </div>
      </Card>
    </div>
  );
}
//---------------------------------LuckIndex-------------------
export function LuckIndexTab({
  league,
  rawRows = [],
  rostersByYear = {},
  playerProjByYear = {},
  currentWeekByYear: currentWeekByYearOverride = {},
  draftByYear = {},
}) {
  if (!league) return null;
  const hiddenManagersSet = React.useMemo(
    () =>
      new Set(
        Array.isArray(league?.hiddenManagers) ? league.hiddenManagers : []
      ),
    [league?.hiddenManagers]
  );
  if (typeof window !== "undefined") {
    window.__LDEBUG = {
      rostersByYear,
      seasonsByYear: league?.seasonsByYear,
      ownerByTeamByYear: league?.ownerByTeamByYear,
      currentWeekByYear:
        league?.currentWeekByYear || currentWeekByYearOverride || {},
    };
  }

  // unified owner resolver: prefer ownerMaps; fallback to league.ownerByTeamByYear
  const ownerNameOf = React.useCallback(
    (season, teamId) => {
      try {
        if (window.__ownerMaps?.name) {
          const nm = window.__ownerMaps.name(Number(season), Number(teamId));
          if (nm) return nm;
        }
      } catch {}
      const g = (obj, ...ks) =>
        ks.reduce((o, k) => (o == null ? o : o[k]), obj);
      return (
        g(league, "ownerByTeamByYear", season, teamId) ||
        g(league, "ownerByTeamByYear", String(season), teamId) ||
        g(league, "ownerByTeamByYear", season, String(teamId)) ||
        g(league, "ownerByTeamByYear", String(season), String(teamId)) ||
        null
      );
    },
    [league]
  );

  function getGamesFlexible(league) {
    const out = [];

    // 1) Already-normalized games (must include team objects/ids)
    if (Array.isArray(league?.games) && league.games.length) {
      const normalized = [];
      for (const g of league.games) {
        const season = Number(g?.season ?? g?.year);
        const week = Number(
          g?.week ?? g?.matchupPeriodId ?? g?.scoringPeriodId ?? g?.period
        );
        const raw1 = g?.team1 ?? g?.home ?? g?.homeTeam ?? g?.team1Id ?? null;
        const raw2 = g?.team2 ?? g?.away ?? g?.awayTeam ?? g?.team2Id ?? null;

        const teamId1 = Number(
          raw1?.teamId ?? raw1?.team?.id ?? raw1?.id ?? raw1
        );
        const teamId2 = Number(
          raw2?.teamId ?? raw2?.team?.id ?? raw2?.id ?? raw2
        );

        if (!season || !week || !teamId1 || !teamId2) continue;

        const score1 = Number(
          raw1?.score ??
            raw1?.totalPoints ??
            g?.team1Score ??
            g?.homeScore ??
            g?.pf ??
            g?.pointsFor ??
            0
        );
        const score2 = Number(
          raw2?.score ??
            raw2?.totalPoints ??
            g?.team2Score ??
            g?.awayScore ??
            g?.pa ??
            g?.pointsAgainst ??
            0
        );

        normalized.push({
          season,
          week,
          team1: {
            teamId: teamId1,
            score: Number.isFinite(score1) ? score1 : 0,
            projected: Number.isFinite(projected1) ? projected1 : null,
          },
          team2: {
            teamId: teamId2,
            score: Number.isFinite(score2) ? score2 : 0,
            projected: Number.isFinite(projected2) ? projected2 : null,
          },
          is_playoff:
            g?.is_playoff ??
            g?.isPlayoff ??
            g?.playoffMatchup ??
            (typeof g?.playoffTierType === "string" &&
              g.playoffTierType.toUpperCase() !== "NONE"),
        });
      }
      if (normalized.length) {
        console.log(
          "[Luck] using league.games (normalized):",
          normalized.length
        );
        return normalized;
      }
    }

    // 2) seasonsByYear[year].schedule[]
    const sb = league?.seasonsByYear;
    if (sb && typeof sb === "object") {
      for (const [yStr, seasonObj] of Object.entries(sb)) {
        const y = Number(yStr);
        const sched = seasonObj?.schedule || [];
        for (const m of sched) {
          const w = Number(
            m?.matchupPeriodId ?? m?.scoringPeriodId ?? m?.week ?? 0
          );
          const h = m?.home ?? m?.homeTeam ?? {};
          const a = m?.away ?? m?.awayTeam ?? {};

          const t1 = Number(h?.teamId ?? h?.team?.id ?? h?.id);
          const t2 = Number(a?.teamId ?? a?.team?.id ?? a?.id);

          // prefer totalPoints for each side; fall back to pointsByScoringPeriod[week]
          const pickSideScore = (side) => {
            const total = Number(side?.totalPoints);
            if (Number.isFinite(total)) return total;
            const byWk = side?.pointsByScoringPeriod;
            const wkVal = Number(byWk?.[w]);
            return Number.isFinite(wkVal) ? wkVal : 0;
          };
          const s1 = pickSideScore(h);
          const s2 = pickSideScore(a);
          const p1 = pickSideProjected(h);
          const p2 = pickSideProjected(a);

          if (y && w && t1 && t2) {
            out.push({
              season: y,
              week: w,
              team1: { teamId: t1, score: s1, projected: p1 },
              team2: { teamId: t2, score: s2, projected: p2 },
              is_playoff: m?.playoffTierType && m.playoffTierType !== "NONE",
            });
          }
        }
      }
      if (out.length) {
        console.log("[Luck] using seasonsByYear.schedule:", out.length);
        return out;
      }
    }

    // 3) window.name seasons (fallback)
    try {
      const payload = parsePayloadString(window.name) || {};
      const seasons = payload?.seasons || payload?.seasonObjs || [];
      for (const s of seasons) {
        const y = Number(s?.seasonId);
        for (const m of s?.schedule || []) {
          const w = Number(
            m?.matchupPeriodId ?? m?.scoringPeriodId ?? m?.week ?? 0
          );
          const h = m?.home ?? m?.homeTeam ?? {};
          const a = m?.away ?? m?.awayTeam ?? {};
          const t1 = Number(h?.teamId ?? h?.team?.id ?? h?.id);
          const t2 = Number(a?.teamId ?? a?.team?.id ?? a?.id);
          const s1 = Number(h?.totalPoints ?? 0) || 0;
          const s2 = Number(a?.totalPoints ?? 0) || 0;
          if (y && w && t1 && t2) {
            out.push({
              season: y,
              week: w,
              team1: { teamId: t1, score: s1 },
              team2: { teamId: t2, score: s2 },
              is_playoff: m?.playoffTierType && m.playoffTierType !== "NONE",
            });
          }
        }
      }
      if (out.length) {
        console.log("[Luck] using window.name seasons:", out.length);
        return out;
      }
    } catch {}

    console.warn(
      "[Luck] No games found. Expect league.seasonsByYear[year].schedule[]"
    );
    return out;
  }
  const get = React.useCallback(
    (obj, ...keys) => keys.reduce((o, k) => (o == null ? o : o[k]), obj),
    []
  );
  const yn = (y) => [y, String(y)];
  const tn = (t) => [t, String(t)];
  const wn = (w) => [w, String(w)];
  const resolveCurrentWeekExclusive = React.useCallback(
    (seasonKey) => {
      const candidates = new Set();
      const pushCandidate = (value) => {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) {
          candidates.add(Math.floor(n));
        }
      };

      const possibleKeys = (() => {
        const num = Number(seasonKey);
        const list = [seasonKey];
        if (Number.isFinite(num)) list.push(num);
        const str = String(seasonKey);
        if (str !== seasonKey) list.push(str);
        if (Number.isFinite(num)) {
          const numStr = String(num);
          if (!list.includes(numStr)) list.push(numStr);
        }
        return Array.from(new Set(list.filter((k) => k != null)));
      })();

      const pushFromSource = (source, key) => {
        if (source == null) return;
        if (typeof source === "number" || typeof source === "string") {
          pushCandidate(source);
          return;
        }
        if (typeof source.get === "function") {
          const direct = source.get(key);
          if (direct != null) pushCandidate(direct);
          const alt = source.get(String(key));
          if (alt != null) pushCandidate(alt);
        }
        if (typeof source === "object") {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            pushCandidate(source[key]);
          }
          const keyStr = String(key);
          if (Object.prototype.hasOwnProperty.call(source, keyStr)) {
            pushCandidate(source[keyStr]);
          }
        }
      };

      for (const key of possibleKeys) {
        pushFromSource(league?.currentWeekByYear, key);
        pushFromSource(league?.espnCurrentWeekBySeason, key);
        pushFromSource(league?.currentWeekBySeason, key);
        pushFromSource(currentWeekByYearOverride, key);
        pushFromSource(league?.currentWeek, key);
      }

      for (const key of possibleKeys) {
        const seasonInfo =
          get(league, "seasonsByYear", key) ??
          get(league, "seasonsByYear", Number(key));
        if (!seasonInfo) continue;
        pushCandidate(seasonInfo?.currentWeek);
        pushCandidate(seasonInfo?.currentMatchupPeriod);
        pushCandidate(seasonInfo?.currentMatchupPeriodId);
        pushCandidate(seasonInfo?.status?.currentMatchupPeriod);
        pushCandidate(seasonInfo?.status?.currentScoringPeriod);
        pushCandidate(seasonInfo?.status?.latestScoringPeriod);
        pushCandidate(seasonInfo?.status?.matchupPeriodId);
      }

      if (!candidates.size) return 0;
      return Math.max(...candidates);
    },
    [league, get, currentWeekByYearOverride]
  );

  // --- Build name index (playerId → name) from existing rosters ---
  const nameIndex = React.useMemo(() => {
    const idx = new Map();
    for (const [season, byTeam] of Object.entries(rostersByYear || {})) {
      for (const byWeek of Object.values(byTeam || {})) {
        for (const arr of Object.values(byWeek || {})) {
          for (const r of arr || []) {
            const key = `${season}|${r.pid}`;
            if (!idx.has(key) && r?.name) idx.set(key, r.name);
          }
        }
      }
    }
    return idx;
  }, [rostersByYear]);

  const seasons = React.useMemo(() => {
    const set = new Set();
    (rawRows || []).forEach((row) => {
      if (row?.season) set.add(Number(row.season));
    });
    if (Array.isArray(league?.seasons)) {
      league.seasons.forEach((s) => set.add(Number(s)));
    }
    Object.keys(league?.ownerByTeamByYear || {}).forEach((s) =>
      set.add(Number(s))
    );
    return Array.from(set).sort((a, b) => a - b);
  }, [league, rawRows]);
  const [selectedLuckSeason, setSelectedLuckSeason] = React.useState(() =>
    seasons.length ? seasons[seasons.length - 1] : null
  );
  React.useEffect(() => {
    if (!seasons.length) {
      if (selectedLuckSeason != null) setSelectedLuckSeason(null);
      return;
    }
    const fallback = seasons[seasons.length - 1];
    if (selectedLuckSeason == null || !seasons.includes(selectedLuckSeason)) {
      setSelectedLuckSeason(fallback);
    }
  }, [seasons, selectedLuckSeason]);
  const seasonsDescForLuck = React.useMemo(
    () => [...seasons].sort((a, b) => b - a),
    [seasons]
  );

  const ownersBase = React.useMemo(() => {
    const set = new Set();
    (rawRows || []).forEach((row) => {
      if (row?.manager) set.add(row.manager);
    });
    Object.values(league?.ownerByTeamByYear || {}).forEach((byTeam) => {
      Object.values(byTeam || {}).forEach((owner) => {
        if (owner) set.add(owner);
      });
    });
    return Array.from(set)
      .filter((name) => !hiddenManagersSet.has(name))
      .sort((a, b) => a.localeCompare(b));
  }, [league, rawRows, hiddenManagersSet]);
  const START_SLOTS = React.useMemo(
    () => new Set([0, 2, 3, 4, 5, 6, 7, 16, 17, 23]),
    []
  );

  // build starters-only totals per (year, teamId, week)
  const teamWeekTotals = React.useMemo(() => {
    const totals = {};
    for (const [yStr, byTeam] of Object.entries(rostersByYear || {})) {
      const y = Number(yStr);
      const capExclusive = resolveCurrentWeekExclusive(yStr);
      totals[y] = totals[y] || {};
      for (const [tidStr, byWeek] of Object.entries(byTeam || {})) {
        const tid = Number(tidStr);
        totals[y][tid] = totals[y][tid] || {};
        for (const [wStr, entries] of Object.entries(byWeek || {})) {
          const w = Number(wStr);
          if (capExclusive > 0 && w >= capExclusive) continue;
          let proj = 0,
            actual = 0;
          for (const e of entries || []) {
            const sid = Number(__entrySlotId(e));
            if (!START_SLOTS.has(sid)) continue;
            proj += __entryProj(e);
            actual += __entryPts(e);
          }
          totals[y][tid][w] = { proj, actual };
        }
      }
    }
    return totals;
  }, [rostersByYear, resolveCurrentWeekExclusive]);

  const games = React.useMemo(() => getGamesFlexible(league), [league]);
  const draftIndexByYear = React.useMemo(() => {
    const map = new Map();
    const toNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    for (const [seasonKey, picks] of Object.entries(draftByYear || {})) {
      const seasonNum = Number(seasonKey);
      if (!Number.isFinite(seasonNum)) continue;

      const pidMap = new Map();
      let maxRound = 0;

      for (const pick of picks || []) {
        const pid = toNumber(
          pick?.playerId ??
            pick?.pid ??
            pick?.player?.id ??
            pick?.player?.playerId
        );
        if (!Number.isFinite(pid)) continue;

        let round = toNumber(
          pick?.round ??
            pick?.roundNumber ??
            pick?.round_num ??
            pick?.roundId ??
            pick?.roundIndex
        );
        if (round != null && round <= 0) round = null;

        const overall = toNumber(
          pick?.overall ??
            pick?.overallPick ??
            pick?.pick ??
            pick?.pickNumber ??
            pick?.overallSelection ??
            pick?.overall_index
        );

        if (round != null && round > maxRound) {
          maxRound = round;
        }

        const existing = pidMap.get(pid);
        const record = {
          round: round != null ? round : null,
          overall: overall != null && overall > 0 ? overall : null,
        };

        if (!existing) {
          pidMap.set(pid, record);
        } else {
          const prevRound = existing.round;
          if (
            record.round != null &&
            (prevRound == null || record.round < prevRound)
          ) {
            pidMap.set(pid, record);
          } else if (prevRound == null && record.round == null) {
            const prevOverall = existing.overall;
            if (
              record.overall != null &&
              (prevOverall == null || record.overall < prevOverall)
            ) {
              pidMap.set(pid, record);
            }
          }
        }
      }

      map.set(seasonNum, {
        pidMap,
        maxRound: maxRound > 0 ? maxRound : null,
      });
    }

    return map;
  }, [draftByYear]);

  const comp1Data = React.useMemo(() => {
    const totals = {};
    const details = {};
    const num = (v) => (Number.isFinite(+v) ? +v : 0);

    // helper to fetch totals with string/number keys
    const getTotals = (y, t, w) =>
      get(teamWeekTotals, y, t, w) ??
      get(teamWeekTotals, y, t, String(w)) ??
      get(teamWeekTotals, y, String(t), w) ??
      get(teamWeekTotals, y, String(t), String(w)) ??
      get(teamWeekTotals, String(y), t, w) ??
      get(teamWeekTotals, String(y), t, String(w)) ??
      get(teamWeekTotals, String(y), String(t), w) ??
      get(teamWeekTotals, String(y), String(t), String(w)) ??
      null;

    for (const g of games || []) {
      const y = num(g?.season);
      const w = num(g?.week);
      const t1 = num(g?.team1?.teamId ?? g?.t1 ?? g?.team1);
      const t2 = num(g?.team2?.teamId ?? g?.t2 ?? g?.team2);
      if (!y || !w || !t1 || !t2) continue;

      // respect currentWeek cap
      const capExclusive = resolveCurrentWeekExclusive(y);
      if (capExclusive > 0 && w >= capExclusive) continue;
      // resolve owners
      const o1 = ownerNameOf(y, t1);
      const o2 = ownerNameOf(y, t2);
      if (!o1 || !o2) continue;

      // opponent totals (proj/actual); if missing, fall back to boxscore actual and proj=0
      const tOpp1 = getTotals(y, t2, w);
      const tOpp2 = getTotals(y, t1, w);

      const opp1Proj = num(tOpp1?.proj ?? 0);
      const opp1Act = num(tOpp1?.actual ?? g?.team2?.score ?? 0);

      const opp2Proj = num(tOpp2?.proj ?? 0);
      const opp2Act = num(tOpp2?.actual ?? g?.team1?.score ?? 0);

      const d1 = opp1Proj - opp1Act; // + means your opponent underperformed (you were lucky)
      const d2 = opp2Proj - opp2Act;

      totals[o1] ??= {};
      totals[o1][y] = (totals[o1][y] || 0) + d1;
      totals[o2] ??= {};
      totals[o2][y] = (totals[o2][y] || 0) + d2;

      const pushDetail = (owner, yr, entry) => {
        details[owner] ??= {};
        details[owner][yr] ??= [];
        details[owner][yr].push(entry);
      };

      pushDetail(o1, y, {
        week: w,
        opponentOwner: o2,
        opponentTeamId: t2,
        opponentProjected: opp1Proj,
        opponentActual: opp1Act,
        diff: d1,
      });

      pushDetail(o2, y, {
        week: w,
        opponentOwner: o1,
        opponentTeamId: t1,
        opponentProjected: opp2Proj,
        opponentActual: opp2Act,
        diff: d2,
      });
    }

    console.log("[Luck] comp1 (opp proj - opp actual) by owner/year:", totals);
    return { totals, details };
  }, [games, teamWeekTotals, resolveCurrentWeekExclusive, ownerNameOf]);
  const comp2Data = React.useMemo(() => {
    const totals = {};
    const details = {};
    const proTeamLookupCache = new Map();
    const getProTeamLookup = (seasonKey) => {
      const cacheKey = String(seasonKey ?? "");
      if (proTeamLookupCache.has(cacheKey)) {
        return proTeamLookupCache.get(cacheKey);
      }
      const lookup = __buildProTeamLookup(
        __resolveProTeamsForSeason(seasonKey, league)
      );
      proTeamLookupCache.set(cacheKey, lookup);
      return lookup;
    };

    const resolvePlayerId = (entry) => {
      const cand =
        entry?.pid ??
        entry?.playerId ??
        entry?.player?.id ??
        entry?.playerPoolEntry?.player?.id;
      const id = Number(cand);
      return Number.isFinite(id) ? id : null;
    };

    const resolvePlayerName = (seasonKey, seasonNum, entry) => {
      const playerNameParts = [
        entry?.player?.firstName,
        entry?.player?.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      const poolNameParts = [
        entry?.playerPoolEntry?.player?.firstName,
        entry?.playerPoolEntry?.player?.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      const direct =
        entry?.name ??
        entry?.playerName ??
        entry?.player?.fullName ??
        entry?.player?.name ??
        (playerNameParts ? playerNameParts : undefined) ??
        entry?.playerPoolEntry?.player?.fullName ??
        entry?.playerPoolEntry?.player?.name ??
        (poolNameParts ? poolNameParts : undefined);
      if (direct) return direct;

      const pid = resolvePlayerId(entry);
      if (pid != null) {
        const keyA = `${seasonKey}|${pid}`;
        const keyB = `${seasonNum}|${pid}`;
        if (nameIndex.has(keyA)) return nameIndex.get(keyA);
        if (nameIndex.has(keyB)) return nameIndex.get(keyB);
      }
      return "Unknown Player";
    };

    const pushDetail = (owner, season, row) => {
      details[owner] ??= {};
      details[owner][season] ??= [];
      details[owner][season].push(row);
    };

    for (const [seasonKey, byTeam] of Object.entries(rostersByYear || {})) {
      const seasonNum = Number(seasonKey);
      const currentWeekExclusive = resolveCurrentWeekExclusive(seasonKey);
      const proTeamLookup = getProTeamLookup(seasonKey);
      for (const [teamKey, byWeek] of Object.entries(byTeam || {})) {
        const teamId = Number(teamKey);
        const owner = ownerNameOf(seasonNum, teamId) || `Team ${teamId}`;
        if (!owner) continue;

        for (const [weekKey, entries] of Object.entries(byWeek || {})) {
          const weekNum = Number(weekKey);
          if (currentWeekExclusive > 0 && weekNum >= currentWeekExclusive)
            continue; // only completed weeks (match comp1 logic)
          const seen = new Set();

          for (const entry of entries || []) {
            const slotId = Number(__entrySlotId(entry));
            if (__entryIsOnByeForWeek(entry, weekNum)) continue;
            const proj = __entryProj(entry);
            if (proj > 0) continue;
            if (__entryHasTeamBye(entry, weekNum, proTeamLookup)) continue;

            const pid = resolvePlayerId(entry);
            const seenKey =
              pid != null ? `pid:${pid}` : `slot:${slotId}|${weekNum}`;
            if (seen.has(seenKey)) continue;
            seen.add(seenKey);

            totals[owner] ??= {};
            totals[owner][seasonNum] = (totals[owner][seasonNum] || 0) + 1;

            pushDetail(owner, seasonNum, {
              week: weekNum,
              player: resolvePlayerName(seasonKey, seasonNum, entry),
              slot: __SLOT_LABEL[slotId] || `Slot ${slotId}`,
              pid,
              projection: proj,
            });
          }
        }
      }
    }

    console.log(
      "[Luck] comp2 (injury weeks via proj=0) by owner/year:",
      totals
    );
    return { totals, details };
  }, [
    rostersByYear,
    league?.currentWeekByYear,
    resolveCurrentWeekExclusive,
    ownerNameOf,
    nameIndex,
    START_SLOTS,
    league?.proTeamsByYear,
    league?.seasonsByYear,
    league?.proTeams,
  ]);
  // This IS the Luck Index for now
  const comp1ByOwnerYear = comp1Data.totals;
  const comp1DetailByOwnerYear = comp1Data.details;
  const injuryByOwnerYear = comp2Data.totals;
  const injuryDetailByOwnerYear = comp2Data.details;
  const [injuryViewMode, setInjuryViewMode] = React.useState("raw");
  const [injuryWeightAlpha, setInjuryWeightAlpha] = React.useState(1);
  const [injuryWaiverRound, setInjuryWaiverRound] = React.useState(12);
  const normalizedWaiverRound = React.useMemo(
    () =>
      Math.max(
        1,
        Math.round(Number.isFinite(injuryWaiverRound) ? injuryWaiverRound : 12)
      ),
    [injuryWaiverRound]
  );
  const getBaseRoundForSeason = React.useCallback(
    (season) => {
      const seasonNum = Number(season);
      const meta = draftIndexByYear.get(seasonNum);
      const maxRound =
        meta && Number.isFinite(meta.maxRound) && meta.maxRound > 0
          ? Math.round(meta.maxRound)
          : null;
      return Math.max(1, normalizedWaiverRound, maxRound ?? 0);
    },
    [draftIndexByYear, normalizedWaiverRound]
  );
  const injuryWeightedByOwnerYear = React.useMemo(() => {
    const totals = {};
    const details = {};

    for (const [owner, seasons] of Object.entries(
      injuryDetailByOwnerYear || {}
    )) {
      for (const [seasonKey, rows] of Object.entries(seasons || {})) {
        const seasonNum = Number(seasonKey);
        const meta = draftIndexByYear.get(seasonNum);
        const baseRound = getBaseRoundForSeason(seasonNum);
        let sum = 0;
        const detailRows = (rows || []).map((row) => {
          const pid = Number(row?.pid);
          const info =
            Number.isFinite(pid) && meta?.pidMap ? meta.pidMap.get(pid) : null;
          const draftedRound =
            info && Number.isFinite(info.round) && info.round > 0
              ? Number(info.round)
              : null;
          const draftedOverall =
            info && Number.isFinite(info.overall) && info.overall > 0
              ? Number(info.overall)
              : null;
          const fallbackRound =
            draftedRound != null ? draftedRound : normalizedWaiverRound;
          const roundClamped = Math.min(
            Math.max(1, Math.round(fallbackRound)),
            baseRound
          );
          const base = baseRound + 1 - roundClamped;
          const weight = Math.pow(base, injuryWeightAlpha);
          sum += weight;
          return {
            ...row,
            draftRound: draftedRound,
            draftOverall: draftedOverall,
            weight,
            weightRound: roundClamped,
            weightBaseRound: baseRound,
            weightSource: draftedRound != null ? "draft" : "waiver",
          };
        });

        if (!totals[owner]) totals[owner] = {};
        if (!details[owner]) details[owner] = {};
        totals[owner][seasonNum] = sum;
        details[owner][seasonNum] = detailRows;
      }
    }

    return { totals, details };
  }, [
    injuryDetailByOwnerYear,
    draftIndexByYear,
    getBaseRoundForSeason,
    injuryWeightAlpha,
    normalizedWaiverRound,
  ]);
  const normalizeOwnerYearTotals = React.useCallback((data, options = {}) => {
    const { invert = false } = options;
    const entries = [];
    let min = Infinity;
    let max = -Infinity;

    for (const [owner, bySeason] of Object.entries(data || {})) {
      for (const [seasonKey, value] of Object.entries(bySeason || {})) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) continue;
        entries.push({ owner, seasonKey, value: numeric });
        if (numeric < min) min = numeric;
        if (numeric > max) max = numeric;
      }
    }

    if (!entries.length || !Number.isFinite(min) || !Number.isFinite(max)) {
      return { scaled: {}, min: null, max: null };
    }

    const range = max - min;
    const scaled = {};

    for (const { owner, seasonKey, value } of entries) {
      let normalized;
      if (range === 0) {
        normalized = 100;
      } else if (invert) {
        normalized = ((max - value) / range) * 100;
      } else {
        normalized = ((value - min) / range) * 100;
      }
      const clamped = Math.max(0, Math.min(100, normalized));
      scaled[owner] ??= {};
      scaled[owner][seasonKey] = clamped;
    }

    return { scaled, min, max };
  }, []);

  const comp1ScaledData = React.useMemo(
    () => normalizeOwnerYearTotals(comp1ByOwnerYear),
    [comp1ByOwnerYear, normalizeOwnerYearTotals]
  );
  const comp1ScaledByOwnerYear = comp1ScaledData.scaled;
  const comp1Min = comp1ScaledData.min;
  const comp1Max = comp1ScaledData.max;

  const injuryScaledData = React.useMemo(
    () => normalizeOwnerYearTotals(injuryByOwnerYear, { invert: true }),
    [injuryByOwnerYear, normalizeOwnerYearTotals]
  );
  const injuryScaledByOwnerYear = injuryScaledData.scaled;
  const injuryMin = injuryScaledData.min;
  const injuryMax = injuryScaledData.max;

  const luckByOwnerYear = React.useMemo(() => {
    const out = {};
    const ownersSet = new Set([
      ...Object.keys(comp1ScaledByOwnerYear || {}),
      ...Object.keys(injuryScaledByOwnerYear || {}),
    ]);

    for (const owner of ownersSet) {
      const seasonsSet = new Set([
        ...Object.keys(comp1ScaledByOwnerYear?.[owner] || {}),
        ...Object.keys(injuryScaledByOwnerYear?.[owner] || {}),
      ]);

      for (const seasonKey of seasonsSet) {
        const c1 = comp1ScaledByOwnerYear?.[owner]?.[seasonKey];
        const c2 = injuryScaledByOwnerYear?.[owner]?.[seasonKey];
        if (Number.isFinite(c1) && Number.isFinite(c2)) {
          out[owner] ??= {};
          out[owner][seasonKey] = (c1 + c2) / 2;
        }
      }
    }

    return out;
  }, [comp1ScaledByOwnerYear, injuryScaledByOwnerYear]);
  // Now that comp1 exists, build the owners list (base + any seen in results)
  // Now that comp1 exists, build the owners list (base + any seen in results), sorted
  const owners = React.useMemo(() => {
    const s = new Set(ownersBase);
    Object.keys(comp1ByOwnerYear || {}).forEach((o) => s.add(o));
    Object.keys(injuryByOwnerYear || {}).forEach((o) => s.add(o));
    return Array.from(s)
      .filter((name) => !hiddenManagersSet.has(name))
      .sort((a, b) => a.localeCompare(b));
  }, [ownersBase, comp1ByOwnerYear, injuryByOwnerYear, hiddenManagersSet]);
  const [comp1Detail, setComp1Detail] = React.useState(null);
  React.useEffect(() => {
    if (comp1Detail?.owner && hiddenManagersSet.has(comp1Detail.owner)) {
      setComp1Detail(null);
    }
  }, [comp1Detail, hiddenManagersSet]);
  const [comp2Detail, setComp2Detail] = React.useState(null);
  React.useEffect(() => {
    if (comp2Detail?.owner && hiddenManagersSet.has(comp2Detail.owner)) {
      setComp2Detail(null);
    }
  }, [comp2Detail, hiddenManagersSet]);

  // --- Table helper ---
  const fmt = (n) => (Number.isFinite(n) ? `${n.toFixed(0)}%` : "—");
  const ordinal = React.useCallback((value) => {
    if (!Number.isFinite(value)) return "—";
    const n = Math.round(value);
    const mod100 = n % 100;
    const mod10 = n % 10;
    let suffix = "th";
    if (mod100 < 11 || mod100 > 13) {
      if (mod10 === 1) suffix = "st";
      else if (mod10 === 2) suffix = "nd";
      else if (mod10 === 3) suffix = "rd";
    }
    return `${n}${suffix}`;
  }, []);
  const luckRows = React.useMemo(() => {
    if (!Number.isFinite(selectedLuckSeason)) return [];
    const rows = owners.map((owner) => {
      const raw = luckByOwnerYear?.[owner]?.[selectedLuckSeason];
      const value = Number.isFinite(raw) ? Number(raw) : null;
      return { owner, value };
    });
    return rows
      .sort((a, b) => {
        const aVal = a.value;
        const bVal = b.value;
        const aHas = Number.isFinite(aVal);
        const bHas = Number.isFinite(bVal);
        if (aHas && bHas) {
          if (bVal !== aVal) return bVal - aVal;
          return a.owner.localeCompare(b.owner);
        }
        if (aHas) return -1;
        if (bHas) return 1;
        return a.owner.localeCompare(b.owner);
      })
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [owners, luckByOwnerYear, selectedLuckSeason]);
  const totalLuckRows = luckRows.length;
  const renderLuckPlace = React.useCallback(
    (rank) => {
      if (!Number.isFinite(rank) || rank <= 0 || !totalLuckRows) return null;
      const label = ordinal(rank);
      const makeIcon = ({ emoji, overlay, aria }) => (
        <div className="relative flex h-12 w-12 items-center justify-center">
          <span
            role="img"
            aria-label={aria}
            className="text-[32px] leading-none drop-shadow-[0_4px_10px_rgba(15,23,42,0.35)]"
          >
            {emoji}
          </span>
          {overlay ? (
            <span className="absolute text-xl leading-none" aria-hidden="true">
              {overlay}
            </span>
          ) : null}
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.18em] text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.85)]">
            {label}
          </span>
        </div>
      );

      if (rank === 1) {
        return makeIcon({
          emoji: "🍀",
          aria: "Luckiest four leaf clover",
        });
      }
      if (rank === 2) {
        return makeIcon({
          emoji: "🧲",
          aria: "Second place horseshoe",
        });
      }
      if (rank === 3) {
        return makeIcon({
          emoji: "🐇",
          aria: "Third place rabbit foot",
        });
      }
      if (rank === totalLuckRows) {
        return makeIcon({
          emoji: "🪞",
          overlay: "💥",
          aria: "Unluckiest broken mirror",
        });
      }
      if (rank === totalLuckRows - 1 && totalLuckRows > 1) {
        return makeIcon({
          emoji: "🐈‍⬛",
          aria: "Second to last black cat",
        });
      }
      if (rank === totalLuckRows - 2 && totalLuckRows > 2) {
        return makeIcon({
          emoji: "🪜",
          aria: "Third to last ladder",
        });
      }

      return (
        <span className="inline-flex min-w-[3rem] items-center justify-center rounded-full border border-white/60 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100">
          {label}
        </span>
      );
    },
    [ordinal, totalLuckRows]
  );
  const fmtInjuryValue = React.useCallback(
    (v) => {
      if (!Number.isFinite(v)) return "—";
      return injuryViewMode === "weighted"
        ? Number(v).toFixed(2)
        : Math.round(Number(v)).toString();
    },
    [injuryViewMode]
  );
  const isWeightedView = injuryViewMode === "weighted";
  const injuryTotalsSource = isWeightedView
    ? injuryWeightedByOwnerYear.totals
    : injuryByOwnerYear;
  const injuryDetailSource = isWeightedView
    ? injuryWeightedByOwnerYear.details
    : injuryDetailByOwnerYear;
  const comp2RawRowsForDetail =
    comp2Detail?.owner != null && comp2Detail?.season != null
      ? injuryDetailByOwnerYear?.[comp2Detail.owner]?.[comp2Detail.season] || []
      : [];
  const comp2WeightedRowsForDetail =
    comp2Detail?.owner != null && comp2Detail?.season != null
      ? injuryWeightedByOwnerYear.details?.[comp2Detail.owner]?.[
          comp2Detail.season
        ] || []
      : [];
  const comp2DetailRows = isWeightedView
    ? comp2WeightedRowsForDetail
    : comp2RawRowsForDetail;
  const comp2RawCount = comp2RawRowsForDetail.length;
  const comp2WeightedTotal =
    comp2Detail?.owner != null && comp2Detail?.season != null
      ? injuryWeightedByOwnerYear.totals?.[comp2Detail.owner]?.[
          comp2Detail.season
        ] ?? 0
      : 0;
  const comp2BaseRoundForDetail =
    comp2Detail?.season != null
      ? getBaseRoundForSeason(comp2Detail.season)
      : normalizedWaiverRound;

  const tableShellBase =
    "relative overflow-hidden rounded-3xl border border-white/25 dark:border-white/10 bg-white/80 dark:bg-zinc-950/55 shadow-[0_30px_65px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl";
  const tableShellWide = `${tableShellBase} min-w-[640px]`;
  const tableShellLuck = `${tableShellBase} min-w-[420px]`;
  const tableBodyClass =
    "relative z-10 text-[13px] text-slate-700 dark:text-slate-100 [&>tr]:border-b [&>tr]:border-white/40 dark:[&>tr]:border-white/5 [&>tr:last-child]:border-0 [&>tr:nth-child(odd)]:bg-white/55 dark:[&>tr:nth-child(odd)]:bg-white/[0.06] [&>tr:nth-child(even)]:bg-white/35 dark:[&>tr:nth-child(even)]:bg-white/[0.03] [&>tr]:transition-colors [&>tr]:duration-200 [&>tr:hover]:bg-white/80 dark:[&>tr:hover]:bg-white/[0.12]";
  const headRowClass =
    "bg-white/80 dark:bg-zinc-900/60 backdrop-blur text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300";
  const placeCellClass =
    "px-4 py-3 text-left align-middle text-slate-800 dark:text-slate-100";
  const managerCellClass =
    "px-4 py-3 text-left font-semibold text-slate-800 dark:text-slate-100";
  const valueCellClass =
    "px-4 py-3 text-center tabular-nums text-slate-800 dark:text-slate-100";
  const detailPillClass =
    "inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-900 dark:text-amber-200 bg-gradient-to-r from-amber-300/90 via-amber-200/75 to-yellow-200/75 border border-amber-400/60 shadow-[0_24px_55px_-30px_rgba(245,158,11,0.6)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_65px_-32px_rgba(245,158,11,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 dark:focus-visible:ring-amber-400/70";
  const toggleButtonBase =
    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-200 border";
  const toggleButtonActive =
    "text-sky-900 dark:text-sky-100 bg-gradient-to-r from-sky-200/85 via-indigo-200/70 to-cyan-200/75 border-sky-300/70 shadow-[0_24px_55px_-30px_rgba(59,130,246,0.55)]";
  const toggleButtonInactive =
    "text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-white/[0.08] border-white/60 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/[0.12]";
  const softButtonClass =
    "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200 bg-gradient-to-r from-white/95 via-white/80 to-white/85 dark:from-zinc-900/80 dark:via-zinc-900/60 dark:to-zinc-950/70 border border-white/60 dark:border-white/10 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_65px_-32px_rgba(59,130,246,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70";
  return (
    <div className="space-y-6">
      {/* ===== Master Luck Index Table ===== */}
      <Card
        title="Luck Index (Experimental)"
        right={
          seasonsDescForLuck.length ? (
            <label className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Year
              </span>
              <select
                className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 dark:border-white/15 dark:bg-zinc-900/70 dark:text-slate-100"
                value={
                  selectedLuckSeason != null ? String(selectedLuckSeason) : ""
                }
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setSelectedLuckSeason(Number.isFinite(value) ? value : null);
                }}
              >
                {seasonsDescForLuck.map((season) => (
                  <option key={season} value={String(season)}>
                    {season}
                  </option>
                ))}
              </select>
            </label>
          ) : null
        }
      >
        <div className="overflow-x-auto">
          <div className={tableShellLuck}>
            <div className="pointer-events-none absolute inset-0 opacity-85">
              <div className="absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(59,130,246,0.16),transparent_60%),radial-gradient(120%_150%_at_100%_100%,rgba(16,185,129,0.12),transparent_65%)]" />
              <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
            </div>
            <table className="relative z-10 min-w-full border-collapse">
              <thead className="sticky top-0">
                <tr className={headRowClass}>
                  <th className="px-4 py-3 text-left">Luck Place</th>
                  <th className="px-4 py-3 text-left">Manager</th>
                  <th className="px-4 py-3 text-center">Luck Metric</th>
                </tr>
              </thead>
              <tbody className={tableBodyClass}>
                {luckRows.length ? (
                  luckRows.map(({ owner, value, rank }) => (
                    <tr key={owner}>
                      <td className={placeCellClass}>
                        {renderLuckPlace(rank)}
                      </td>
                      <td className={managerCellClass}>{owner}</td>
                      <td className={valueCellClass}>{fmt(value)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-6 text-center text-[12px] text-slate-500 dark:text-slate-400"
                    >
                      No luck data available for the selected year yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500/85 dark:text-slate-400">
          Scores are normalized between 0 (least lucky) and 100 (most lucky) for
          the selected year by averaging opponent luck and injury resilience on
          their respective ranges.
          {Number.isFinite(comp1Min) && Number.isFinite(comp1Max) && (
            <>
              {" "}
              Opponent luck span: {comp1Min.toFixed(1)} to {comp1Max.toFixed(1)}{" "}
              pts.
            </>
          )}
          {Number.isFinite(injuryMin) && Number.isFinite(injuryMax) && (
            <>
              {" "}
              Injury weeks span: {injuryMin.toFixed(0)} to{" "}
              {injuryMax.toFixed(0)}.
            </>
          )}
        </p>
      </Card>

      {/* ===== Component Breakdown ===== */}
      <Card title="Luck Components (Preview)">
        <Card title="Component 1 — Opponent vs Projection (sum to date)">
          <div className="overflow-x-auto">
            <div className={tableShellWide}>
              <div className="pointer-events-none absolute inset-0 opacity-85">
                <div className="absolute inset-0 bg-[radial-gradient(115%_135%_at_0%_0%,rgba(251,191,36,0.16),transparent_60%),radial-gradient(125%_145%_at_100%_100%,rgba(251,191,36,0.12),transparent_65%)]" />
                <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
              </div>
              <table className="relative z-10 min-w-full border-collapse">
                <thead className="sticky top-0">
                  <tr className={headRowClass}>
                    <th className="px-4 py-3 text-left">Manager</th>
                    {seasons.map((y) => (
                      <th key={y} className="px-4 py-3 text-center">
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={tableBodyClass}>
                  {owners.map((o) => (
                    <tr key={o}>
                      <td className={managerCellClass}>{o}</td>
                      {seasons.map((y) => {
                        const v = comp1ByOwnerYear?.[o]?.[y];
                        const rows = (comp1DetailByOwnerYear?.[o]?.[y] || [])
                          .length;
                        return (
                          <td key={y} className={valueCellClass}>
                            {Number.isFinite(v) && rows ? (
                              <button
                                type="button"
                                className={detailPillClass}
                                onClick={() =>
                                  setComp1Detail({
                                    owner: o,
                                    season: y,
                                    rows: (
                                      comp1DetailByOwnerYear?.[o]?.[y] || []
                                    ).slice(),
                                  })
                                }
                              >
                                {v.toFixed(1)}
                              </button>
                            ) : Number.isFinite(v) ? (
                              v.toFixed(1)
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
        <Card title="Component 2 — Injury Index (Player-Weeks Lost)">
          <div className="px-5 pt-5 pb-4 flex flex-wrap items-center gap-3 text-[12px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                View
              </span>
              <button
                type="button"
                className={`${toggleButtonBase} ${
                  injuryViewMode === "raw"
                    ? toggleButtonActive
                    : toggleButtonInactive
                }`}
                onClick={() => setInjuryViewMode("raw")}
              >
                Raw count
              </button>
              <button
                type="button"
                className={`${toggleButtonBase} ${
                  injuryViewMode === "weighted"
                    ? toggleButtonActive
                    : toggleButtonInactive
                }`}
                onClick={() => setInjuryViewMode("weighted")}
              >
                Weighted
              </button>
            </div>
            {isWeightedView && (
              <>
                <label className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-white/70 dark:bg-white/[0.08] border border-white/60 dark:border-white/10 shadow-[0_24px_55px_-32px_rgba(15,23,42,0.85)]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                    Waiver round
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    step={1}
                    value={injuryWaiverRound}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setInjuryWaiverRound(1);
                        return;
                      }
                      const next = Number(raw);
                      if (Number.isFinite(next)) {
                        const clamped = Math.min(
                          30,
                          Math.max(1, Math.round(next))
                        );
                        setInjuryWaiverRound(clamped);
                      }
                    }}
                    className="w-20 rounded-lg border border-white/50 dark:border-white/10 bg-white/90 dark:bg-white/[0.08] px-2.5 py-1 text-[12px] text-slate-700 dark:text-slate-100 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 dark:focus-visible:ring-sky-400/60"
                  />
                </label>
                <label className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-white/70 dark:bg-white/[0.08] border border-white/60 dark:border-white/10 shadow-[0_24px_55px_-32px_rgba(15,23,42,0.85)]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                    α
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.1}
                    value={injuryWeightAlpha}
                    onChange={(e) =>
                      setInjuryWeightAlpha(Number(e.target.value))
                    }
                    className="w-36 accent-amber-400"
                  />
                  <span className="tabular-nums w-12 text-right text-[12px] text-slate-700 dark:text-slate-200">
                    {injuryWeightAlpha.toFixed(2)}
                  </span>
                </label>
              </>
            )}
          </div>
          {isWeightedView && (
            <div className="px-5 pb-4 text-[11px] text-slate-500/85 dark:text-slate-400">
              Weight = (baseRound + 1 {"\u2212"} round)^α; baseRound is the
              larger of a season’s max draft round and the waiver round
              (currently treated as R{normalizedWaiverRound}). Players without
              draft data use the waiver round.
            </div>
          )}
          <div className="overflow-x-auto">
            <div className={tableShellWide}>
              <div className="pointer-events-none absolute inset-0 opacity-85">
                <div className="absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(14,165,233,0.16),transparent_60%),radial-gradient(130%_150%_at_100%_100%,rgba(236,72,153,0.14),transparent_65%)]" />
                <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
              </div>
              <table className="relative z-10 min-w-full border-collapse">
                <thead className="sticky top-0">
                  <tr className={headRowClass}>
                    <th className="px-4 py-3 text-left">Manager</th>
                    {seasons.map((y) => (
                      <th key={y} className="px-4 py-3 text-center">
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={tableBodyClass}>
                  {owners.map((o) => (
                    <tr key={`${o}-injury`}>
                      <td className={managerCellClass}>{o}</td>
                      {seasons.map((y) => {
                        const v = injuryTotalsSource?.[o]?.[y];
                        const detailRows = injuryDetailSource?.[o]?.[y] || [];
                        const hasDetail =
                          Number.isFinite(v) && detailRows.length > 0;
                        return (
                          <td key={`${y}-injury`} className={valueCellClass}>
                            {hasDetail ? (
                              <button
                                type="button"
                                className={detailPillClass}
                                onClick={() =>
                                  setComp2Detail({
                                    owner: o,
                                    season: y,
                                  })
                                }
                              >
                                {fmtInjuryValue(v)}
                              </button>
                            ) : Number.isFinite(v) ? (
                              fmtInjuryValue(v)
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <div className="text-[12px] leading-relaxed text-slate-500/90 dark:text-slate-400 space-y-2">
          <p>
            Component 1: Opponent Overperformance — how much opponents exceeded
            projections.
          </p>
          <p>
            Component 2: Injury Index — total starter player-weeks with a zero
            projection (proxy for weeks lost to injury). Weighted view applies a
            draft-round multiplier to emphasize early picks.
          </p>
          <p>Component 3: TBD (future feature).</p>
          <p>Additional ideas below.</p>
        </div>
      </Card>

      {comp1Detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur"
            onClick={() => setComp1Detail(null)}
          />
          <div className="relative w-[min(900px,92vw)] max-h-[85vh] overflow-hidden rounded-3xl border border-white/25 dark:border-white/10 bg-white/92 dark:bg-zinc-950/85 shadow-[0_40px_90px_-45px_rgba(15,23,42,0.95)] backdrop-blur-xl flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/60 dark:border-white/10 bg-white/95 dark:bg-zinc-950/85 backdrop-blur-xl">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Opponent Luck Breakdown
                </span>
                <div className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                  {comp1Detail.owner} — {comp1Detail.season}
                </div>
              </div>
              <button
                className={softButtonClass}
                onClick={() => setComp1Detail(null)}
              >
                Close
              </button>
            </div>

            <div className="px-6 py-4 text-[12px] text-slate-600/90 dark:text-slate-300 border-b border-white/45 dark:border-white/10 bg-white/75 dark:bg-white/[0.05]">
              Total impact:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {fmt(
                  comp1Detail.rows.reduce(
                    (sum, r) => sum + (Number.isFinite(r?.diff) ? r.diff : 0),
                    0
                  )
                )}
              </span>
            </div>

            <div className="px-6 py-5 overflow-auto">
              <div className={`${tableShellBase} min-w-full`}>
                <div className="pointer-events-none absolute inset-0 opacity-85">
                  <div className="absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(59,130,246,0.16),transparent_60%),radial-gradient(130%_150%_at_100%_100%,rgba(251,191,36,0.14),transparent_65%)]" />
                  <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
                </div>
                <table className="relative z-10 w-full text-sm border-collapse">
                  <thead className="sticky top-0">
                    <tr className={headRowClass}>
                      <th className="px-4 py-3 text-left">Week</th>
                      <th className="px-4 py-3 text-left">Opponent</th>
                      <th className="px-4 py-3 text-right">Proj</th>
                      <th className="px-4 py-3 text-right">Actual</th>
                      <th className="px-4 py-3 text-right">Diff</th>
                    </tr>
                  </thead>
                  <tbody className={tableBodyClass}>
                    {comp1Detail.rows
                      .slice()
                      .sort(
                        (a, b) => Number(a?.week || 0) - Number(b?.week || 0)
                      )
                      .map((row, idx) => (
                        <tr key={`${row.week}-${row.opponentTeamId}-${idx}`}>
                          <td className="px-4 py-3 tabular-nums text-left text-slate-800 dark:text-slate-100">
                            W{row.week}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                            {row.opponentOwner}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                            {Number.isFinite(row?.opponentProjected)
                              ? row.opponentProjected.toFixed(1)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                            {Number.isFinite(row?.opponentActual)
                              ? row.opponentActual.toFixed(1)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-800 dark:text-slate-100">
                            {Number.isFinite(row?.diff)
                              ? row.diff.toFixed(1)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    {comp1Detail.rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-5 text-center text-slate-500/75 dark:text-slate-400/80"
                        >
                          No weekly results available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {comp2Detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur"
            onClick={() => setComp2Detail(null)}
          />
          <div className="relative w-[min(760px,92vw)] max-h-[85vh] overflow-hidden rounded-3xl border border-white/25 dark:border-white/10 bg-white/92 dark:bg-zinc-950/85 shadow-[0_40px_90px_-45px_rgba(15,23,42,0.95)] backdrop-blur-xl flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/60 dark:border-white/10 bg-white/95 dark:bg-zinc-950/85 backdrop-blur-xl">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {isWeightedView
                    ? "Weighted Injury Impact"
                    : "Injury Weeks Lost"}
                </span>
                <div className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                  {comp2Detail.owner} — {comp2Detail.season}
                </div>
              </div>
              <button
                className={softButtonClass}
                onClick={() => setComp2Detail(null)}
              >
                Close
              </button>
            </div>

            <div className="px-6 py-4 text-[12px] text-slate-600/90 dark:text-slate-300 border-b border-white/45 dark:border-white/10 bg-white/75 dark:bg-white/[0.05]">
              {isWeightedView ? (
                <div className="space-y-1">
                  <div>Raw player-weeks flagged: {comp2RawCount}</div>
                  <div>
                    Weighted total:{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {fmtInjuryValue(comp2WeightedTotal)}
                    </span>{" "}
                    (α = {injuryWeightAlpha.toFixed(2)}, waiver R
                    {normalizedWaiverRound}, base R{comp2BaseRoundForDetail})
                  </div>
                </div>
              ) : (
                <>Total player-weeks flagged as injured: {comp2RawCount}</>
              )}
            </div>

            <div className="px-6 py-5 overflow-auto">
              <div className={`${tableShellBase} min-w-full`}>
                <div className="pointer-events-none absolute inset-0 opacity-85">
                  <div className="absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(14,165,233,0.16),transparent_60%),radial-gradient(125%_145%_at_100%_100%,rgba(236,72,153,0.14),transparent_65%)]" />
                  <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
                </div>
                <table className="relative z-10 w-full text-sm border-collapse">
                  <thead className="sticky top-0">
                    <tr className={headRowClass}>
                      <th className="px-4 py-3 text-left">Week</th>
                      <th className="px-4 py-3 text-left">Player</th>
                      <th className="px-4 py-3 text-left">Slot</th>
                      {isWeightedView && (
                        <th className="px-4 py-3 text-left">Draft</th>
                      )}
                      {isWeightedView && (
                        <th className="px-4 py-3 text-right">Weight</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className={tableBodyClass}>
                    {comp2DetailRows
                      .slice()
                      .sort((a, b) => {
                        const wDiff =
                          Number(a?.week || 0) - Number(b?.week || 0);
                        if (wDiff !== 0) return wDiff;
                        return (a?.player || "").localeCompare(b?.player || "");
                      })
                      .map((row, idx) => {
                        const draftLabel =
                          isWeightedView && row
                            ? row.draftRound != null
                              ? `R${row.draftRound}${
                                  row.draftOverall != null
                                    ? ` (#${row.draftOverall})`
                                    : ""
                                }`
                              : row.weightRound != null
                              ? `Waiver (R${row.weightRound})`
                              : "—"
                            : null;
                        return (
                          <tr
                            key={`${row.week}-${row.pid ?? row.player}-${idx}`}
                          >
                            <td className="px-4 py-3 tabular-nums text-slate-800 dark:text-slate-100">
                              W{row.week}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                              {row.player}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                              {row.slot || "—"}
                            </td>
                            {isWeightedView && (
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                                {draftLabel}
                              </td>
                            )}
                            {isWeightedView && (
                              <td className="px-4 py-3 text-right tabular-nums text-slate-800 dark:text-slate-100">
                                {Number.isFinite(row?.weight)
                                  ? row.weight.toFixed(2)
                                  : "—"}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    {comp2DetailRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={isWeightedView ? 5 : 3}
                          className="px-4 py-5 text-center text-slate-500/75 dark:text-slate-400/80"
                        >
                          No injury rows recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- tiny subcomponents / utils ----------
function TeamOutlook({ label, now, win, loss }) {
  const pct = (p) => (p == null ? "—" : `${Math.round(p * 100)}%`);
  const diffUp =
    now != null && win != null ? Math.round((win - now) * 100) : null;
  const diffDn =
    now != null && loss != null ? Math.round((now - loss) * 100) : null;
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2">
      <div className="text-xs font-semibold mb-1">{label}</div>
      <div className="text-xs grid grid-cols-3 gap-2">
        <div>
          <div className="opacity-60">Now</div>
          <div className="tabular-nums">{pct(now)}</div>
        </div>
        <div>
          <div className="opacity-60">With Win</div>
          <div className="tabular-nums">
            {pct(win)}
            {diffUp != null ? (
              <span className="ml-1 text-emerald-600">(+{diffUp})</span>
            ) : null}
          </div>
        </div>
        <div>
          <div className="opacity-60">With Loss</div>
          <div className="tabular-nums">
            {pct(loss)}
            {diffDn != null ? (
              <span className="ml-1 text-rose-600">(-{diffDn})</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtProj(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  return v.toFixed(v % 1 ? 1 : 0);
}

// Best-effort: team/owner names and projections from ESPN side object
function __ownerNameForTeam(seasonObj, teamId) {
  try {
    const t = (seasonObj?.teams || []).find(
      (x) => Number(x?.id) === Number(teamId)
    );
    const ownerId =
      t?.primaryOwner || (Array.isArray(t?.owners) && t.owners[0]) || null;
    const members = seasonObj?.members || [];
    const m = members.find((mm) => mm?.id === ownerId);
    const dn = (m?.displayName || "").trim();
    const fn = (m?.firstName || "").trim();
    const ln = (m?.lastName || "").trim();
    const full = [fn, ln].filter(Boolean).join(" ").trim();
    return full || dn || `Team ${teamId}`;
  } catch {
    return `Team ${teamId}`;
  }
}
function __teamNameForSide(side) {
  try {
    const t = side?.team || {};
    if (t.location && t.nickname) return `${t.location} ${t.nickname}`.trim();
    return t.name || "";
  } catch {
    return "";
  }
}
const QUERY_STORAGE_KEY = "lv_query_saved_v1";
const DEFAULT_METRIC_KEY = "pf_gte";
const SUBJECT_OPTIONS = [
  {
    key: "last_any",
    label: "When was the last time a manager",
    type: "last-any",
    needsManager: false,
    prompt: () => "When was the last time a manager",
    question: true,
  },
  {
    key: "last_manager",
    label: "When was the last time manager X",
    type: "last-manager",
    needsManager: true,
    prompt: ({ manager }) =>
      manager
        ? `When was the last time ${manager}`
        : "When was the last time a manager",
    question: true,
  },
  {
    key: "first_manager",
    label: "When was the first time manager X",
    type: "first-manager",
    needsManager: true,
    prompt: ({ manager }) =>
      manager
        ? `When was the first time ${manager}`
        : "When was the first time a manager",
    question: true,
  },
  {
    key: "last_manager_to",
    label: "Who was the last manager to",
    type: "who-last",
    needsManager: false,
    prompt: () => "Who was the last manager to",
    question: true,
  },
  {
    key: "which_have",
    label: "Which managers have",
    type: "which-have",
    needsManager: false,
    prompt: () => "Which managers have",
    question: true,
  },
  {
    key: "which_have_not",
    label: "Which managers haven’t",
    type: "which-have-not",
    needsManager: false,
    prompt: () => "Which managers haven’t",
    question: true,
  },
  {
    key: "how_many_manager",
    label: "How many times has manager X",
    type: "count-manager",
    needsManager: true,
    prompt: ({ manager }) =>
      manager
        ? `How many times has ${manager}`
        : "How many times has a manager",
    question: true,
  },
  {
    key: "most_manager",
    label: "Which manager has the most",
    type: "most",
    needsManager: false,
    prompt: () => "Which manager has the most",
    question: true,
  },
  {
    key: "least_manager",
    label: "Which manager has the least",
    type: "least",
    needsManager: false,
    prompt: () => "Which manager has the least",
    question: true,
  },
];

function buildMetricDefinitions({ owners, seasons, weeks, nameFor }) {
  const numberInput = (key, label, placeholder, extra = {}) => ({
    key,
    label,
    type: "number",
    placeholder,
    inputMode: "decimal",
    ...extra,
  });

  const seasonOptions = (seasons || []).map((s) => ({
    value: String(s),
    label: String(s),
  }));
  const weekOptions = (weeks || []).map((w) => ({
    value: String(w),
    label: `Week ${w}`,
  }));

  return [
    {
      key: "pf_gte",
      label: "Scored X or above in a game",
      inputs: [numberInput("value", "Points", "150", { min: 0, step: "0.1" })],
      defaultValues: { value: "150" },
      describe: ({ value }) =>
        value
          ? `scored ${value}+ points in a game`
          : "scored at least X points in a game",
      getPredicate: ({ value }) => {
        const target = Number(value);
        if (!Number.isFinite(target)) return null;
        return (record) => Number.isFinite(record.pf) && record.pf >= target;
      },
    },
    {
      key: "pf_lte",
      label: "Scored X or below in a game",
      inputs: [numberInput("value", "Points", "100", { min: 0, step: "0.1" })],
      defaultValues: { value: "100" },
      describe: ({ value }) =>
        value ? `scored ${value} or fewer points` : "scored X or fewer points",
      getPredicate: ({ value }) => {
        const target = Number(value);
        if (!Number.isFinite(target)) return null;
        return (record) => Number.isFinite(record.pf) && record.pf <= target;
      },
    },
    {
      key: "pf_eq",
      label: "Scored X points in a game",
      inputs: [numberInput("value", "Points", "150", { min: 0, step: "0.1" })],
      defaultValues: { value: "150" },
      describe: ({ value }) =>
        value
          ? `finished with exactly ${value} points`
          : "finished with X points",
      getPredicate: ({ value }) => {
        const target = Number(value);
        if (!Number.isFinite(target)) return null;
        return (record) =>
          Number.isFinite(record.pf) && Math.abs(record.pf - target) < 0.05;
      },
    },
    {
      key: "pa_gte",
      label: "Allowed X or more points",
      inputs: [
        numberInput("value", "Points Allowed", "140", { min: 0, step: "0.1" }),
      ],
      defaultValues: { value: "140" },
      describe: ({ value }) =>
        value ? `allowed ${value}+ points` : "allowed at least X points",
      getPredicate: ({ value }) => {
        const target = Number(value);
        if (!Number.isFinite(target)) return null;
        return (record) => Number.isFinite(record.pa) && record.pa >= target;
      },
    },
    {
      key: "pa_lte",
      label: "Allowed X or fewer points",
      inputs: [
        numberInput("value", "Points Allowed", "90", { min: 0, step: "0.1" }),
      ],
      defaultValues: { value: "90" },
      describe: ({ value }) =>
        value
          ? `held opponents to ${value} or fewer points`
          : "allowed X or fewer points",
      getPredicate: ({ value }) => {
        const target = Number(value);
        if (!Number.isFinite(target)) return null;
        return (record) => Number.isFinite(record.pa) && record.pa <= target;
      },
    },
    {
      key: "result_win",
      label: "Won the game",
      inputs: [],
      describe: () => "won the matchup",
      getPredicate: () => (record) => record.result === "W",
    },
    {
      key: "result_loss",
      label: "Lost the game",
      inputs: [],
      describe: () => "lost the matchup",
      getPredicate: () => (record) => record.result === "L",
    },
    {
      key: "playoff_game",
      label: "Played in a playoff game",
      inputs: [],
      describe: () => "played in a playoff game",
      getPredicate: () => (record) => record.isPlayoff === true,
    },
    {
      key: "top_week",
      label: "Had the top-score of the week",
      inputs: [],
      describe: () => "had the top score of the week",
      getPredicate: (_, { weeklyTop }) => {
        return (record) => {
          if (!record || record.season == null || record.week == null)
            return false;
          const key = `${record.season}__${record.week}`;
          const entry = weeklyTop.get(key);
          if (!entry) return false;
          return entry.owners.includes(record.owner);
        };
      },
    },
    {
      key: "low_week",
      label: "Had the lowest score of the week",
      inputs: [],
      describe: () => "had the lowest score of the week",
      getPredicate: (_, { weeklyLow }) => {
        return (record) => {
          if (!record || record.season == null || record.week == null)
            return false;
          const key = `${record.season}__${record.week}`;
          const entry = weeklyLow.get(key);
          if (!entry) return false;
          return entry.owners.includes(record.owner);
        };
      },
    },
    {
      key: "proj_win_loss",
      label: "Was projected to win and lost",
      inputs: [],
      describe: () => "was projected to win but lost",
      getPredicate: () => (record) =>
        Number.isFinite(record.projFor) &&
        Number.isFinite(record.projAgainst) &&
        record.projFor > record.projAgainst &&
        record.result === "L",
    },
    {
      key: "season_eq",
      label: "Happened in season N",
      inputs: [
        {
          key: "season",
          label: "Season",
          type: "select",
          placeholder: "Season",
          options: seasonOptions,
        },
      ],
      describe: ({ season }) =>
        season ? `in season ${season}` : "in a chosen season",
      getPredicate: ({ season }) => {
        const yr = Number(season);
        if (!Number.isFinite(yr)) return null;
        return (record) => record.season === yr;
      },
    },
    {
      key: "week_eq",
      label: "Happened in week N",
      inputs: [
        {
          key: "week",
          label: "Week",
          type: "select",
          placeholder: "Week",
          options: weekOptions,
        },
      ],
      describe: ({ week }) => (week ? `in week ${week}` : "in a chosen week"),
      getPredicate: ({ week }) => {
        const wk = Number(week);
        if (!Number.isFinite(wk)) return null;
        return (record) => record.week === wk;
      },
    },
    {
      key: "vs_manager",
      label: "Played against manager Y",
      inputs: [
        {
          key: "manager",
          label: "Opponent",
          type: "manager",
          placeholder: "Select manager",
        },
      ],
      describe: ({ manager }) =>
        manager
          ? `played against ${nameFor(manager)}`
          : "played against manager Y",
      getPredicate: ({ manager }) => {
        const opp = String(manager || "").trim();
        if (!opp) return null;
        return (record) => record.opponent === opp;
      },
    },
    {
      key: "vs_manager_week",
      label: "Played against manager Y in week N",
      inputs: [
        {
          key: "manager",
          label: "Opponent",
          type: "manager",
          placeholder: "Select manager",
        },
        {
          key: "week",
          label: "Week (optional)",
          type: "select",
          placeholder: "Week",
          options: weekOptions,
          optional: true,
        },
      ],
      describe: ({ manager, week }) => {
        if (!manager) return "played manager Y in week N";
        const name = nameFor(manager);
        return week ? `played ${name} in week ${week}` : `played ${name}`;
      },
      getPredicate: ({ manager, week }) => {
        const opp = String(manager || "").trim();
        if (!opp) return null;
        const wk = Number(week);
        const hasWeek = Number.isFinite(wk);
        return (record) =>
          record.opponent === opp && (!hasWeek || record.week === wk);
      },
    },
  ];
}

export function QueryTab({ league }) {
  const amberActionClasses =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-800 " +
    "bg-gradient-to-r from-amber-200/80 via-amber-100/70 to-amber-200/80 shadow-[0_18px_45px_-30px_rgba(251,191,36,0.85)] " +
    "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-28px_rgba(251,191,36,0.9)] " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70";

  React.useEffect(() => {
    if (!league) return;
    try {
      const aliases = window.__FL_ALIASES || {};
      primeOwnerMaps({
        league,
        selectedLeague: league,
        espnOwnerByTeamByYear: league?.ownerByTeamByYear || {},
        manualAliases: aliases,
      });
    } catch (err) {
      console.warn("QueryTab primeOwnerMaps failed", err);
    }
  }, [league]);

  const nextIdRef = React.useRef(1);
  const [subjectKey, setSubjectKey] = React.useState(SUBJECT_OPTIONS[0].key);
  const [subjectManager, setSubjectManager] = React.useState("");
  const [conditions, setConditions] = React.useState(() => [
    {
      id: nextIdRef.current++,
      metricKey: DEFAULT_METRIC_KEY,
      values: { value: "150" },
      conj: "AND",
    },
  ]);
  const [lastRun, setLastRun] = React.useState(null);
  const [savedQueries, setSavedQueries] = React.useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(QUERY_STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  });
  const [selectedSavedId, setSelectedSavedId] = React.useState("");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        QUERY_STORAGE_KEY,
        JSON.stringify(savedQueries || [])
      );
    } catch {}
  }, [savedQueries]);

  const hiddenManagersData = React.useMemo(() => {
    const arr = Array.isArray(league?.hiddenManagers)
      ? league.hiddenManagers
      : [];
    const canon = arr
      .map((name) => canonicalizeOwner(name))
      .filter(Boolean)
      .sort();
    return {
      key: canon.join("|"),
      set: new Set(canon),
    };
  }, [JSON.stringify(league?.hiddenManagers || [])]);
  const hiddenManagersSet = hiddenManagersData.set;

  const prepared = React.useMemo(() => {
    const toNumber = (...vals) => {
      for (const v of vals) {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
      return null;
    };
    const toString = (...vals) => {
      for (const v of vals) {
        const s = String(v ?? "").trim();
        if (s) return s;
      }
      return "";
    };

    const games = Array.isArray(league?.games) ? league.games : [];
    const seasonsSet = new Set();
    const weeksSet = new Set();
    const weeklyTop = new Map();
    const weeklyLow = new Map();
    const records = [];
    const epsilon = 0.0001;

    const addLeader = (map, key, value, owner, preferHigh) => {
      if (!owner || value == null) return;
      if (!map.has(key)) {
        map.set(key, { value, owners: new Set([owner]) });
        return;
      }
      const current = map.get(key);
      if (
        (preferHigh && value > current.value + epsilon) ||
        (!preferHigh && value < current.value - epsilon)
      ) {
        current.value = value;
        current.owners = new Set([owner]);
      } else if (Math.abs(value - current.value) <= epsilon) {
        current.owners.add(owner);
      }
    };

    for (const g of games) {
      const season = toNumber(g?.season, g?.seasonId, g?.year, g?.seasonID);
      const week = toNumber(
        g?.week,
        g?.matchupPeriodId,
        g?.scoringPeriodId,
        g?.period,
        g?.matchupPeriod
      );
      if (Number.isFinite(season)) seasonsSet.add(season);
      if (Number.isFinite(week)) weeksSet.add(week);

      const ownerRaw = toString(
        g?.owner,
        g?.manager,
        g?.team,
        g?.team_name,
        g?.teamName,
        g?.ownerName
      );
      const opponentRaw = toString(
        g?.opponent,
        g?.opp,
        g?.opponent_name,
        g?.opponentName,
        g?.vsOwner,
        g?.opponentOwner
      );
      const owner = ownerRaw ? canonicalizeOwner(ownerRaw) : "";
      const opponent = opponentRaw ? canonicalizeOwner(opponentRaw) : "";
      if (
        (owner && hiddenManagersSet.has(owner)) ||
        (opponent && hiddenManagersSet.has(opponent))
      ) {
        continue;
      }

      const pf = toNumber(
        g?.pf,
        g?.points_for,
        g?.pointsFor,
        g?.points,
        g?.score,
        g?.totalPoints,
        g?.owner_points,
        g?.pts,
        g?.fpts
      );
      const pa = toNumber(
        g?.pa,
        g?.points_against,
        g?.pointsAgainst,
        g?.opponent_points,
        g?.oppPts,
        g?.against,
        g?.opp_score,
        g?.oppPoints
      );
      const projFor = toNumber(
        g?.proj_for,
        g?.projected_for,
        g?.projectedPointsFor,
        g?.projFor,
        g?.projectedScore,
        g?.projected
      );
      const projAgainst = toNumber(
        g?.proj_against,
        g?.projected_against,
        g?.projectedPointsAgainst,
        g?.oppProjected
      );
      const resRaw = toString(
        g?.res,
        g?.result,
        g?.outcome,
        g?.winLoss,
        g?.wl,
        g?.gameResult,
        g?.record
      ).toUpperCase();
      let result = null;
      if (resRaw.startsWith("W")) result = "W";
      else if (resRaw.startsWith("L")) result = "L";
      else if (resRaw.startsWith("T")) result = "T";

      const seasonType = String(
        g?.seasonType || g?.segment || ""
      ).toLowerCase();
      const isPlayoff =
        g?.is_playoff === true ||
        g?.isPlayoff === true ||
        g?.isPlayoffs === true ||
        seasonType.includes("playoff") ||
        seasonType === "po";
      const finalRank = toNumber(
        g?.final_rank,
        g?.finalRank,
        g?.postseasonFinish,
        g?.finish,
        g?.finalStanding
      );

      const record = {
        game: g,
        owner,
        ownerRaw,
        opponent,
        opponentRaw,
        season: Number.isFinite(season) ? season : null,
        week: Number.isFinite(week) ? week : null,
        pf,
        pa,
        projFor,
        projAgainst,
        result,
        isPlayoff,
        finalRank,
      };
      if (!owner) continue;

      if (record.season != null && record.week != null && Number.isFinite(pf)) {
        const key = `${record.season}__${record.week}`;
        addLeader(weeklyTop, key, pf, owner, true);
        addLeader(weeklyLow, key, pf, owner, false);
      }

      records.push(record);
    }

    weeklyTop.forEach((entry, key) => {
      weeklyTop.set(key, {
        value: entry.value,
        owners: Array.from(entry.owners),
      });
    });
    weeklyLow.forEach((entry, key) => {
      weeklyLow.set(key, {
        value: entry.value,
        owners: Array.from(entry.owners),
      });
    });

    return {
      records,
      seasons: Array.from(seasonsSet).sort((a, b) => a - b),
      weeks: Array.from(weeksSet).sort((a, b) => a - b),
      weeklyTop,
      weeklyLow,
    };
  }, [league?.games, hiddenManagersData.key]);

  const ownerOptionsBase = React.useMemo(() => {
    const arr = Array.isArray(league?.owners) ? league.owners : [];
    const map = new Map();
    arr.forEach((name) => {
      const canon = canonicalizeOwner(name);
      if (!canon) return;
      if (!map.has(canon)) map.set(canon, name);
    });
    return map;
  }, [JSON.stringify(league?.owners || [])]);

  const ownerOptions = React.useMemo(() => {
    const map = new Map(ownerOptionsBase);
    (prepared.records || []).forEach((rec) => {
      if (rec.owner && !map.has(rec.owner)) {
        map.set(rec.owner, rec.ownerRaw || rec.owner);
      }
      if (rec.opponent && !map.has(rec.opponent)) {
        map.set(rec.opponent, rec.opponentRaw || rec.opponent);
      }
    });
    const list = Array.from(map.entries())
      .filter(([canon]) => !hiddenManagersSet.has(canon))
      .map(([canonical, display]) => ({ canonical, display }));
    list.sort((a, b) => a.display.localeCompare(b.display));
    return list;
  }, [ownerOptionsBase, prepared.records, hiddenManagersData.key]);

  const canonicalNameMap = React.useMemo(() => {
    const map = new Map();
    ownerOptions.forEach(({ canonical, display }) => {
      if (!map.has(canonical)) map.set(canonical, display);
    });
    return map;
  }, [ownerOptions]);

  const nameFor = React.useCallback(
    (canonical) => canonicalNameMap.get(canonical) || canonical || "—",
    [canonicalNameMap]
  );

  React.useEffect(() => {
    const subject = SUBJECT_OPTIONS.find((s) => s.key === subjectKey);
    if (subject?.needsManager) {
      if (!subjectManager && ownerOptions.length) {
        setSubjectManager(ownerOptions[0].canonical);
      }
    }
  }, [subjectKey, subjectManager, ownerOptions]);

  const metricDefinitions = React.useMemo(
    () =>
      buildMetricDefinitions({
        owners: ownerOptions,
        seasons: prepared.seasons,
        weeks: prepared.weeks,
        nameFor,
      }),
    [ownerOptions, prepared.seasons, prepared.weeks, nameFor]
  );

  const metricsByKey = React.useMemo(() => {
    const map = new Map();
    metricDefinitions.forEach((m) => map.set(m.key, m));
    return map;
  }, [metricDefinitions]);

  const getDefaultValues = React.useCallback((metric) => {
    const out = {};
    if (!metric) return out;
    if (metric.defaultValues) {
      Object.entries(metric.defaultValues).forEach(([key, val]) => {
        out[key] = val == null ? "" : String(val);
      });
    }
    (metric.inputs || []).forEach((input) => {
      if (out[input.key] != null) return;
      if (input.defaultValue != null) {
        out[input.key] = String(input.defaultValue);
      } else {
        out[input.key] = "";
      }
    });
    return out;
  }, []);

  const createDefaultCondition = React.useCallback(() => {
    const metric =
      metricsByKey.get(DEFAULT_METRIC_KEY) || metricDefinitions[0] || null;
    const metricKey = metric ? metric.key : DEFAULT_METRIC_KEY;
    const defaults = getDefaultValues(metric);
    return {
      id: nextIdRef.current++,
      metricKey,
      values: defaults,
      conj: "AND",
    };
  }, [getDefaultValues, metricDefinitions, metricsByKey]);

  const subject = React.useMemo(
    () =>
      SUBJECT_OPTIONS.find((s) => s.key === subjectKey) || SUBJECT_OPTIONS[0],
    [subjectKey]
  );

  const clauseParts = React.useMemo(() => {
    const parts = [];
    let first = true;
    conditions.forEach((row) => {
      const metric = metricsByKey.get(row.metricKey);
      if (!metric) return;
      const desc = metric.describe
        ? metric.describe(row.values || {})
        : (metric.label || "").toLowerCase();
      if (!desc) return;
      if (first) {
        parts.push(desc);
        first = false;
      } else {
        const joiner = (row.conj || "AND") === "OR" ? "or" : "and";
        parts.push(`${joiner} ${desc}`);
      }
    });
    return parts;
  }, [conditions, metricsByKey]);

  const sentence = React.useMemo(() => {
    const managerName = subjectManager ? nameFor(subjectManager) : "a manager";
    const prompt = subject.prompt({ manager: managerName }) || "";
    const clauseText = clauseParts.join(" ");
    let base = prompt.trim();
    if (clauseText) base = base ? `${base} ${clauseText}` : clauseText;
    if (!base) return "";
    if (subject.question && !base.endsWith("?")) base += "?";
    return base;
  }, [clauseParts, nameFor, subject, subjectManager]);

  const updateConditionMetric = (id, metricKey) => {
    const metric = metricsByKey.get(metricKey) || metricDefinitions[0];
    const defaults = getDefaultValues(metric);
    setConditions((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              metricKey: metric ? metric.key : metricKey,
              values: defaults,
            }
          : row
      )
    );
  };

  const updateConditionValue = (id, key, value) => {
    setConditions((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              values: { ...row.values, [key]: value },
            }
          : row
      )
    );
  };

  const updateConditionConj = (id, conj) => {
    setConditions((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              conj: conj === "OR" ? "OR" : "AND",
            }
          : row
      )
    );
  };

  const removeCondition = (id) => {
    setConditions((prev) => {
      if (prev.length <= 1) return [createDefaultCondition()];
      return prev.filter((row) => row.id !== id);
    });
  };

  const addCondition = () => {
    setConditions((prev) => [...prev, createDefaultCondition()]);
  };

  const renderInputs = (row, metric) => {
    if (!metric) return null;
    const fieldClass =
      "mt-1 w-full rounded-xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 " +
      "px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60";
    const labelClass =
      "text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400";

    return (metric.inputs || []).map((input) => {
      const value = row.values?.[input.key] ?? "";
      if (input.type === "number") {
        return (
          <div key={input.key} className="min-w-[120px]">
            <label className={labelClass}>{input.label}</label>
            <input
              type="number"
              inputMode={input.inputMode || "decimal"}
              className={fieldClass}
              value={value}
              placeholder={input.placeholder || ""}
              step={input.step}
              min={input.min}
              max={input.max}
              onChange={(e) =>
                updateConditionValue(row.id, input.key, e.target.value)
              }
            />
          </div>
        );
      }
      if (input.type === "select") {
        return (
          <div key={input.key} className="min-w-[140px]">
            <label className={labelClass}>{input.label}</label>
            <select
              className={fieldClass}
              value={value}
              onChange={(e) =>
                updateConditionValue(row.id, input.key, e.target.value)
              }
            >
              <option value="">
                {input.optional ? "Any" : input.placeholder || "Select"}
              </option>
              {(input.options || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      }
      if (input.type === "manager") {
        return (
          <div key={input.key} className="min-w-[160px]">
            <label className={labelClass}>{input.label}</label>
            <select
              className={fieldClass}
              value={value}
              onChange={(e) =>
                updateConditionValue(row.id, input.key, e.target.value)
              }
            >
              <option value="">{input.placeholder || "Select"}</option>
              {ownerOptions.map((opt) => (
                <option key={opt.canonical} value={opt.canonical}>
                  {opt.display}
                </option>
              ))}
            </select>
          </div>
        );
      }
      return (
        <div key={input.key} className="min-w-[160px]">
          <label className={labelClass}>{input.label}</label>
          <input
            type="text"
            className={fieldClass}
            value={value}
            placeholder={input.placeholder || ""}
            onChange={(e) =>
              updateConditionValue(row.id, input.key, e.target.value)
            }
          />
        </div>
      );
    });
  };

  const loadSavedQuery = (id) => {
    const entry = savedQueries.find((q) => String(q.id) === String(id));
    if (!entry) return;
    setSubjectKey(entry.subjectKey || SUBJECT_OPTIONS[0].key);
    setSubjectManager(entry.subjectManager || "");
    setConditions(() => {
      const rows =
        Array.isArray(entry.conditions) && entry.conditions.length
          ? entry.conditions
          : [
              {
                metricKey: DEFAULT_METRIC_KEY,
                values: { value: "150" },
                conj: "AND",
              },
            ];
      return rows.map((row) => ({
        id: nextIdRef.current++,
        metricKey: row.metricKey || DEFAULT_METRIC_KEY,
        values: Object.fromEntries(
          Object.entries(row.values || {}).map(([k, v]) => [
            k,
            v == null ? "" : String(v),
          ])
        ),
        conj: row.conj === "OR" ? "OR" : "AND",
      }));
    });
    setLastRun(null);
    setSelectedSavedId("");
  };

  const deleteSavedQuery = (id) => {
    const doDelete =
      typeof window === "undefined" ||
      window.confirm("Delete this saved query?");
    if (!doDelete) return;
    setSavedQueries((prev) => prev.filter((q) => String(q.id) !== String(id)));
    setSelectedSavedId("");
  };

  const saveCurrentQuery = () => {
    if (typeof window === "undefined") return;
    const name = window.prompt("Save query as", "My query");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const payload = {
      id: Date.now(),
      name: trimmed,
      subjectKey,
      subjectManager,
      conditions: conditions.map((row) => ({
        metricKey: row.metricKey,
        values: row.values,
        conj: row.conj,
      })),
    };
    setSavedQueries((prev) => {
      const filtered = prev.filter((q) => q.name !== trimmed);
      return [...filtered, payload];
    });
  };

  const runQuery = React.useCallback(() => {
    const managerFilter = subject.needsManager ? subjectManager : "";
    if (subject.needsManager && !managerFilter) {
      setLastRun({
        kind: "error",
        sentence,
        message: "Select a manager to run this query.",
      });
      return;
    }

    const context = {
      weeklyTop: prepared.weeklyTop,
      weeklyLow: prepared.weeklyLow,
    };
    const invalid = [];
    const active = [];
    conditions.forEach((row, index) => {
      const metric = metricsByKey.get(row.metricKey);
      if (!metric) return;
      const predicateFactory = metric.getPredicate;
      const predicate =
        typeof predicateFactory === "function"
          ? predicateFactory(row.values || {}, context)
          : null;
      if (typeof predicate !== "function") {
        invalid.push(metric.label || row.metricKey);
        return;
      }
      active.push({
        predicate,
        conj: index === 0 ? "AND" : row.conj || "AND",
        metric,
      });
    });

    if (invalid.length) {
      setLastRun({
        kind: "error",
        sentence,
        message: `Please complete the following inputs: ${invalid.join(", ")}`,
      });
      return;
    }

    if (!active.length) {
      setLastRun({
        kind: "error",
        sentence,
        message: "Add at least one condition before running the query.",
      });
      return;
    }

    const passes = (record) => {
      let state = null;
      for (let i = 0; i < active.length; i += 1) {
        const cond = active[i];
        const val = !!cond.predicate(record);
        if (i === 0) state = val;
        else if ((cond.conj || "AND") === "OR") state = state || val;
        else state = state && val;
      }
      return !!state;
    };

    const matching = prepared.records.filter((rec) => passes(rec));
    const relevant = managerFilter
      ? matching.filter((rec) => rec.owner === managerFilter)
      : matching;

    const compareDesc = (a, b) => {
      const seasonA = Number.isFinite(a.season) ? a.season : -Infinity;
      const seasonB = Number.isFinite(b.season) ? b.season : -Infinity;
      if (seasonA !== seasonB) return seasonB - seasonA;
      const weekA = Number.isFinite(a.week) ? a.week : -Infinity;
      const weekB = Number.isFinite(b.week) ? b.week : -Infinity;
      if (weekA !== weekB) return weekB - weekA;
      const pfA = Number.isFinite(a.pf) ? a.pf : -Infinity;
      const pfB = Number.isFinite(b.pf) ? b.pf : -Infinity;
      if (pfA !== pfB) return pfB - pfA;
      return nameFor(a.owner || "").localeCompare(nameFor(b.owner || ""));
    };
    const compareAsc = (a, b) => -compareDesc(a, b);

    const aggregate = new Map();
    matching.forEach((rec) => {
      if (!rec.owner) return;
      if (!aggregate.has(rec.owner)) {
        aggregate.set(rec.owner, {
          manager: rec.owner,
          count: 0,
          latest: null,
          earliest: null,
        });
      }
      const slot = aggregate.get(rec.owner);
      slot.count += 1;
      if (!slot.latest || compareDesc(rec, slot.latest) < 0) slot.latest = rec;
      if (!slot.earliest || compareDesc(rec, slot.earliest) > 0)
        slot.earliest = rec;
    });

    const ranking = ownerOptions.map(({ canonical }) => {
      const data = aggregate.get(canonical) || {
        manager: canonical,
        count: 0,
        latest: null,
        earliest: null,
      };
      return {
        canonical,
        count: data.count,
        latest: data.latest,
        earliest: data.earliest,
      };
    });

    const buildGameResult = (rows, order, totalMatches, message = null) => ({
      kind: "games",
      sentence,
      clauseParts,
      order,
      rows,
      totalMatches,
      totalUniverse: matching.length,
      manager: managerFilter ? nameFor(managerFilter) : null,
      subjectType: subject.type,
      message,
    });

    const managerName = managerFilter ? nameFor(managerFilter) : null;

    switch (subject.type) {
      case "last-any": {
        const sorted = [...matching].sort(compareDesc);
        setLastRun(
          buildGameResult(
            sorted.slice(0, 20),
            "desc",
            sorted.length,
            sorted.length ? null : "No matches found for any manager."
          )
        );
        return;
      }
      case "last-manager": {
        const sorted = [...relevant].sort(compareDesc);
        setLastRun(
          buildGameResult(
            sorted.slice(0, 20),
            "desc",
            sorted.length,
            sorted.length
              ? null
              : `No matches found for ${managerName || "that manager"}.`
          )
        );
        return;
      }
      case "who-last": {
        const sorted = [...matching].sort(compareDesc);
        setLastRun({
          ...buildGameResult(
            sorted.slice(0, 20),
            "desc",
            sorted.length,
            sorted.length ? null : "No matches found yet."
          ),
          highlightOwner: sorted[0]?.owner || null,
        });
        return;
      }
      case "first-manager": {
        const sorted = [...relevant].sort(compareAsc);
        setLastRun(
          buildGameResult(
            sorted.slice(0, 20),
            "asc",
            sorted.length,
            sorted.length
              ? null
              : `No matches found for ${managerName || "that manager"}.`
          )
        );
        return;
      }
      case "count-manager": {
        setLastRun({
          kind: "count",
          sentence,
          clauseParts,
          count: relevant.length,
          manager: managerName,
          totalUniverse: matching.length,
        });
        return;
      }
      case "which-have": {
        const rows = ranking
          .filter((row) => row.count > 0)
          .sort((a, b) =>
            b.count === a.count
              ? nameFor(a.canonical).localeCompare(nameFor(b.canonical))
              : b.count - a.count
          );
        setLastRun({
          kind: "list",
          sentence,
          clauseParts,
          rows,
          mode: "have",
        });
        return;
      }
      case "which-have-not": {
        const rows = ranking
          .filter((row) => row.count === 0)
          .sort((a, b) =>
            nameFor(a.canonical).localeCompare(nameFor(b.canonical))
          );
        setLastRun({
          kind: "list",
          sentence,
          clauseParts,
          rows,
          mode: "have-not",
        });
        return;
      }
      case "most": {
        const max = ranking.reduce((acc, row) => Math.max(acc, row.count), 0);
        if (max === 0) {
          setLastRun({
            kind: "error",
            sentence,
            message: "No managers have matching results yet.",
          });
          return;
        }
        const rows = ranking
          .filter((row) => row.count === max)
          .sort((a, b) =>
            nameFor(a.canonical).localeCompare(nameFor(b.canonical))
          );
        setLastRun({
          kind: "ranking",
          sentence,
          clauseParts,
          rows,
          stat: "most",
          value: max,
        });
        return;
      }
      case "least": {
        if (!ranking.length) {
          setLastRun({
            kind: "error",
            sentence,
            message: "No managers available to evaluate.",
          });
          return;
        }
        const min = ranking.reduce(
          (acc, row) => Math.min(acc, row.count),
          Infinity
        );
        const rows = ranking
          .filter((row) => row.count === min)
          .sort((a, b) =>
            nameFor(a.canonical).localeCompare(nameFor(b.canonical))
          );
        setLastRun({
          kind: "ranking",
          sentence,
          clauseParts,
          rows,
          stat: "least",
          value: min === Infinity ? 0 : min,
        });
        return;
      }
      default: {
        const sorted = [...relevant].sort(compareDesc);
        setLastRun(
          buildGameResult(
            sorted.slice(0, 20),
            "desc",
            sorted.length,
            sorted.length ? null : "No matches found."
          )
        );
      }
    }
  }, [
    clauseParts,
    conditions,
    metricsByKey,
    nameFor,
    ownerOptions,
    prepared,
    sentence,
    subject,
    subjectManager,
  ]);

  const fmtPoints = (n) =>
    Number.isFinite(n) ? Number(n).toFixed(1) : n == null ? "—" : String(n);

  const renderResults = () => {
    if (!lastRun) {
      return (
        <div className="text-sm text-zinc-500">
          Build a question and click{" "}
          <span className="font-semibold">Run Query</span> to see results.
        </div>
      );
    }
    if (lastRun.kind === "error") {
      return (
        <div className="rounded-2xl border border-red-200/60 bg-red-50/70 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200">
          {lastRun.message || "Unable to evaluate this query."}
        </div>
      );
    }
    if (lastRun.kind === "count") {
      return (
        <div className="flex flex-col items-start gap-3">
          <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Matches found
          </div>
          <div className="text-4xl font-semibold text-slate-800 dark:text-white">
            {lastRun.count}
          </div>
          {lastRun.manager ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-300">
              for {lastRun.manager}
            </div>
          ) : null}
        </div>
      );
    }
    if (lastRun.kind === "list") {
      const rows = lastRun.rows || [];
      if (!rows.length) {
        return (
          <div className="text-sm text-zinc-500">
            No managers match these conditions yet.
          </div>
        );
      }
      return (
        <TableBox className="bg-white/85 dark:bg-zinc-900/70 border border-white/50 dark:border-white/10 backdrop-blur-xl">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
              <th className="px-3 py-2 text-left">Manager</th>
              <th className="px-3 py-2 text-right">Matches</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.canonical}
                className="hover:bg-amber-50/60 dark:hover:bg-amber-500/10"
              >
                <td className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {nameFor(row.canonical)}
                </td>
                <td className="px-3 py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                  {row.count}
                </td>
              </tr>
            ))}
          </tbody>
        </TableBox>
      );
    }
    if (lastRun.kind === "ranking") {
      const rows = lastRun.rows || [];
      if (!rows.length) {
        return (
          <div className="text-sm text-zinc-500">
            No managers available for this ranking yet.
          </div>
        );
      }
      return (
        <TableBox className="bg-white/85 dark:bg-zinc-900/70 border border-white/50 dark:border-white/10 backdrop-blur-xl">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
              <th className="px-3 py-2 text-left">Manager</th>
              <th className="px-3 py-2 text-right">
                {lastRun.stat === "most" ? "Matches" : "Matches"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.canonical}
                className="hover:bg-amber-50/60 dark:hover:bg-amber-500/10"
              >
                <td className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {nameFor(row.canonical)}
                </td>
                <td className="px-3 py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                  {row.count}
                </td>
              </tr>
            ))}
          </tbody>
        </TableBox>
      );
    }
    const rows = lastRun.rows || [];
    return (
      <div className="space-y-3">
        {lastRun.message ? (
          <div className="text-sm text-zinc-500 dark:text-zinc-300">
            {lastRun.message}
          </div>
        ) : null}
        <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
          Showing {rows.length} of {lastRun.totalMatches || 0} matches
        </div>
        <TableBox className="bg-white/85 dark:bg-zinc-900/70 border border-white/50 dark:border-white/10 backdrop-blur-xl">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
              <th className="px-3 py-2 text-left">Season</th>
              <th className="px-3 py-2 text-left">Week</th>
              <th className="px-3 py-2 text-left">Manager</th>
              <th className="px-3 py-2 text-left">Opponent</th>
              <th className="px-3 py-2 text-right">PF</th>
              <th className="px-3 py-2 text-right">PA</th>
              <th className="px-3 py-2 text-center">Result</th>
              <th className="px-3 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`${row.owner}-${row.season}-${row.week}-${idx}`}
                className="hover:bg-amber-50/60 dark:hover:bg-amber-500/10"
              >
                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                  {row.season ?? "—"}
                </td>
                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                  {row.week ?? "—"}
                </td>
                <td className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {nameFor(row.owner)}
                </td>
                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                  {row.opponent ? nameFor(row.opponent) : "—"}
                </td>
                <td className="px-3 py-2 text-right text-sm text-slate-700 dark:text-slate-200">
                  {fmtPoints(row.pf)}
                </td>
                <td className="px-3 py-2 text-right text-sm text-slate-700 dark:text-slate-200">
                  {fmtPoints(row.pa)}
                </td>
                <td className="px-3 py-2 text-center text-sm font-semibold">
                  {row.result || "—"}
                </td>
                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                  {[row.isPlayoff ? "Playoff game" : null]
                    .filter(Boolean)
                    .join(" • ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </TableBox>
      </div>
    );
  };

  const ghostButtonClasses =
    "inline-flex items-center gap-1 rounded-full border border-white/60 dark:border-white/15 bg-white/70 dark:bg-zinc-900/60 px-3 py-1.5 " +
    "text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-300 transition-all duration-200 " +
    "hover:border-amber-300/60 hover:text-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60";

  return (
    <div className="space-y-6">
      <Card
        title="AI Query Builder"
        subtitle="Stack conditions to ask natural questions about every season, matchup, and manager."
      >
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/50 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.85)]">
            <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(110%_140%_at_0%_0%,rgba(251,191,36,0.15),transparent_60%),radial-gradient(120%_140%_at_100%_100%,rgba(59,130,246,0.16),transparent_60%)]" />
            <div className="relative space-y-2">
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
                Question preview
              </div>
              <div className="text-lg font-semibold text-slate-800 dark:text-white">
                {sentence ||
                  "Pick a subject and add conditions to start exploring."}
              </div>
              {clauseParts.length ? (
                <div className="text-xs text-slate-500 dark:text-slate-300">
                  Conditions: {clauseParts.join(" ")}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-5">
            {conditions.map((row, idx) => {
              const metric =
                metricsByKey.get(row.metricKey) || metricDefinitions[0];
              return (
                <div
                  key={row.id}
                  className="relative overflow-hidden rounded-2xl border border-white/50 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 p-5 shadow-[0_24px_65px_-42px_rgba(15,23,42,0.9)]"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(110%_140%_at_0%_0%,rgba(148,163,184,0.12),transparent_60%),radial-gradient(120%_140%_at_100%_100%,rgba(251,191,36,0.14),transparent_60%)]" />
                  {idx > 0 ? (
                    <div className="absolute -top-4 left-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
                      <span>Join with</span>
                      <div className="inline-flex overflow-hidden rounded-full border border-white/50 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60">
                        {["AND", "OR"].map((op) => (
                          <button
                            key={op}
                            type="button"
                            onClick={() => updateConditionConj(row.id, op)}
                            className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] transition ${
                              row.conj === op
                                ? "bg-amber-200/70 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                                : "text-slate-600 dark:text-slate-300 hover:text-amber-400"
                            }`}
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="relative z-10 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
                    {idx === 0 ? (
                      <div className="w-full md:w-60">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                          Subject
                        </label>
                        <select
                          className="mt-1 w-full rounded-xl border border-white/50 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                          value={subjectKey}
                          onChange={(e) => setSubjectKey(e.target.value)}
                        >
                          {SUBJECT_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {idx === 0 && subject.needsManager ? (
                      <div className="w-full md:w-56">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                          Manager
                        </label>
                        <select
                          className="mt-1 w-full rounded-xl border border-white/50 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                          value={subjectManager}
                          onChange={(e) => setSubjectManager(e.target.value)}
                        >
                          <option value="">Select manager</option>
                          {ownerOptions.map((opt) => (
                            <option key={opt.canonical} value={opt.canonical}>
                              {opt.display}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div className="w-full md:w-72">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                        Metric / action
                      </label>
                      <select
                        className="mt-1 w-full rounded-xl border border-white/50 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                        value={row.metricKey}
                        onChange={(e) =>
                          updateConditionMetric(row.id, e.target.value)
                        }
                      >
                        {metricDefinitions.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-1 flex-wrap gap-3">
                      {renderInputs(row, metric)}
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeCondition(row.id)}
                        className={ghostButtonClasses}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={amberActionClasses}
              onClick={runQuery}
            >
              Run query
            </button>
            <button
              type="button"
              className={amberActionClasses}
              onClick={addCondition}
            >
              + Add condition
            </button>
            <button
              type="button"
              className={ghostButtonClasses}
              onClick={saveCurrentQuery}
            >
              Save query
            </button>
            {savedQueries.length ? (
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
                <span>Saved queries</span>
                <select
                  className="rounded-full border border-white/50 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                  value={selectedSavedId}
                  onChange={(e) => setSelectedSavedId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {savedQueries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={ghostButtonClasses}
                  disabled={!selectedSavedId}
                  onClick={() =>
                    selectedSavedId && loadSavedQuery(selectedSavedId)
                  }
                >
                  Load
                </button>
                <button
                  type="button"
                  className={ghostButtonClasses}
                  disabled={!selectedSavedId}
                  onClick={() =>
                    selectedSavedId && deleteSavedQuery(selectedSavedId)
                  }
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <Card title="Results">
        <div className="space-y-4">
          <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            {sentence || "Configure a query to see answers."}
          </div>
          {renderResults()}
        </div>
      </Card>
    </div>
  );
}

function __projectedPointsForSide(side, seasonId, week) {
  // ESPN often places projected totals on roster entries as appliedStatTotal for the week
  // Sum any numeric appliedStatTotal on rosterForMatchupPeriod/ScoringPeriod entries.
  try {
    const roster =
      side?.rosterForCurrentScoringPeriod ??
      side?.rosterForScoringPeriod ??
      side?.rosterForMatchupPeriod ??
      side?.roster;
    const entries = Array.isArray(roster?.entries)
      ? roster.entries
      : Array.isArray(roster?.players)
      ? roster.players
      : [];
    let sum = 0;
    let hit = false;
    for (const e of entries) {
      let v =
        e?.appliedTotal ??
        e?.appliedStatTotal ??
        e?.playerPoints?.appliedTotal ??
        (e?.playerPoolEntry ? e.playerPoolEntry.appliedStatTotal : undefined);
      // fallback: player.stats row for this week/season
      if (v == null || !Number.isFinite(Number(v))) {
        const pe = e?.playerPoolEntry || e;
        const p = pe?.player || pe;
        const stat = (Array.isArray(p?.stats) ? p.stats : []).find(
          (s) =>
            Number(s?.seasonId) === Number(seasonId) &&
            Number(s?.scoringPeriodId) === Number(week)
        );
        v = stat?.appliedStatTotal ?? stat?.appliedTotal ?? stat?.total;
      }
      if (Number.isFinite(Number(v))) {
        sum += Number(v);
        hit = true;
      }
    }
    return hit ? sum : null;
  } catch {
    return null;
  }
}

function groupByOwner(rows) {
  const map = new Map();
  (rows || []).forEach((r) => {
    const key = r.owner || r.team || r.team_name || r.manager || "—";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });
  return Array.from(map.entries()).map(([owner, picks]) => ({ owner, picks }));
}
