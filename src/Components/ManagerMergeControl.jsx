import React, { useMemo, useState, useEffect } from "react";
import { Card } from "./ui.jsx";

// Small helpers (per-league, persistent)
const MERGE_KEY = (leagueId) =>
  `fl_merge_map::${String(leagueId || "").trim()}`;

function loadMergeMap(leagueId) {
  try {
    const raw = localStorage.getItem(MERGE_KEY(leagueId));
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}
function saveMergeMap(leagueId, mapObj) {
  try {
    localStorage.setItem(MERGE_KEY(leagueId), JSON.stringify(mapObj || {}));
  } catch {}
}

// Flatten A->B, B->C chains
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

export default function ManagerMergeControl({
  leagueMeta,
  leagueRows = [],
  onChanged,
}) {
  const leagueId =
    String(leagueMeta?.id || "").trim() ||
    String(leagueMeta?.name || "league").trim();

  // Build unique owner list from rows (owner + opponent)
  const owners = useMemo(() => {
    const s = new Set();
    (leagueRows || []).forEach((r) => {
      if (r?.owner) s.add(String(r.owner));
      if (r?.opponent) s.add(String(r.opponent));
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [leagueRows]);

  const [alias, setAlias] = useState("");
  const [canon, setCanon] = useState("");
  const [mergeMap, setMergeMap] = useState({});

  // Load existing map
  useEffect(() => {
    setMergeMap(loadMergeMap(leagueId));
  }, [leagueId]);

  // Save flattened map each change

  const save = (next) => {
    const flat = flattenMergeMap(next);
    saveMergeMap(leagueId, flat);
    setMergeMap(flat);
    // optional immediate refresh callback
    if (typeof onChanged === "function") onChanged();
  };

  const addRule = () => {
    const a = (alias || "").trim();
    const c = (canon || "").trim();
    if (!a || !c || a === c) return;
    const next = { ...mergeMap, [a]: c };
    save(next);
    setAlias("");
    setCanon("");
  };

  const removeRule = (a) => {
    const next = { ...mergeMap };
    delete next[a];
    save(next);
  };

  const pairs = Object.entries(mergeMap);

  return (
    <Card
      title="Combine managers"
      subtitle="Alias one manager into another. This persists for this league and is applied on every import."
    >
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
        >
          <option value="">(pick alias)</option>
          {owners.map((o) => (
            <option key={`a-${o}`} value={o}>
              {o}
            </option>
          ))}
        </select>

        <span className="text-sm text-zinc-500">combine into</span>

        <select
          className="px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700"
          value={canon}
          onChange={(e) => setCanon(e.target.value)}
        >
          <option value="">(pick canonical)</option>
          {owners.map((o) => (
            <option key={`c-${o}`} value={o}>
              {o}
            </option>
          ))}
        </select>

        <button
          className="px-3 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
          disabled={!alias || !canon || alias === canon}
          onClick={addRule}
        >
          Combine
        </button>
      </div>

      {/* Existing rules */}
      {pairs.length > 0 && (
        <div className="mt-3 space-y-2">
          {pairs.map(([a, c]) => (
            <div
              key={a}
              className="flex items-center justify-between rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2"
            >
              <span className="text-sm">
                <span className="font-medium">{a}</span> →{" "}
                <span className="font-medium">{c}</span>
              </span>
              <button
                className="text-xs px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700"
                onClick={() => removeRule(a)}
              >
                remove
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
