import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, beforeEach } from "node:test";
import React, { useMemo } from "react";
import { renderToString } from "react-dom/server";
import {
  getAdp,
  getCurrentWeek,
  getLineupSlotsByYear,
  getOwnerByTeam,
  getProTeamsByYear,
  getRosterAcqByYear,
  getRostersByYear,
  getSeasons,
  getTeamNamesByOwner,
} from "../domain/normalize.ts";
import { useLeagueSelector } from "../store/hooks.ts";
import { upsertLeagueFromExtension } from "../store/leagueSlice.ts";
import { resetStoreForTests, store } from "../store/store.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadSleeperFixture() {
  const raw = readFileSync(resolve(__dirname, "../../fixtures/sleeperPayload.json"), "utf8");
  return JSON.parse(raw);
}

function SleeperHarness({ leagueId }: { leagueId: string }) {
  const seasons = useLeagueSelector((state) => getSeasons(state, leagueId));
  const latestSeason = seasons[seasons.length - 1]?.seasonId ?? seasons[0]?.seasonId ?? 0;
  const seasonKey = latestSeason ? String(latestSeason) : "";
  const lineupSlots = useLeagueSelector((state) => getLineupSlotsByYear(state, leagueId));
  const rosters = useLeagueSelector((state) => getRostersByYear(state, leagueId));
  const owners = useLeagueSelector((state) => getOwnerByTeam(state, leagueId, latestSeason));
  const teamNames = useLeagueSelector((state) => getTeamNamesByOwner(state, leagueId));
  const currentWeek = useLeagueSelector((state) => getCurrentWeek(state, leagueId, latestSeason));
  const rosterAcq = useLeagueSelector((state) => getRosterAcqByYear(state, leagueId));
  const adp = useLeagueSelector((state) => getAdp(state, leagueId, latestSeason));
  const proTeams = useLeagueSelector((state) => getProTeamsByYear(state, leagueId));

  const slotCount = useMemo(() => {
    const counts = lineupSlots[seasonKey] || {};
    return Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
  }, [lineupSlots, seasonKey]);

  const rosterRows = useMemo(() => {
    const seasonRosters = rosters[seasonKey] || {};
    return Object.entries(seasonRosters).flatMap(([teamId, weeks]) =>
      Object.entries(weeks as Record<string, any[]>).map(([week, players]) => ({
        teamId,
        week,
        players,
      }))
    );
  }, [rosters, seasonKey]);

  const anyProjection = useMemo(
    () =>
      rosterRows.some((row) =>
        (row.players || []).some((player) => Number(player?.proj ?? 0) > 0)
      ),
    [rosterRows]
  );

  const acquisitions = useMemo(() => Object.keys(rosterAcq[seasonKey] || {}).length, [rosterAcq, seasonKey]);

  return (
    <div>
      <section aria-label="Overview">
        <h2>Overview</h2>
        <p>Current Week {currentWeek}</p>
        <p>Roster Slots {slotCount}</p>
      </section>

      <section aria-label="Standings">
        <h2>Standings</h2>
        <ul>
          {Object.entries(owners).map(([teamId, name]) => (
            <li key={teamId}>{teamNames[name]?.[seasonKey] ?? name}</li>
          ))}
        </ul>
      </section>

      <section aria-label="Matchups">
        <h2>Matchups</h2>
        <p>{rosterRows.length} roster rows available</p>
        {!anyProjection && <p>All projections unavailable</p>}
      </section>

      <section aria-label="Transactions">
        <h2>Transactions</h2>
        {acquisitions === 0 ? <p>No acquisition data for this platform</p> : <p>{acquisitions} acquisitions</p>}
      </section>

      <section aria-label="Draft">
        <h2>Draft & ADP</h2>
        <p>{Object.keys(adp).length} ADP entries</p>
        {Object.keys(proTeams[seasonKey] || {}).length === 0 && <p>No NFL team metadata</p>}
      </section>
    </div>
  );
}

describe("Sleeper tab smoke test", () => {
  beforeEach(() => {
    resetStoreForTests();
  });

  it("renders core sections without crashing", () => {
    const payload = loadSleeperFixture();
    store.dispatch(upsertLeagueFromExtension(payload));

    const markup = renderToString(<SleeperHarness leagueId={payload.leagueId} />);

    assert.match(markup, /Overview/);
    assert.match(markup, /Standings/);
    assert.match(markup, /Matchups/);
    assert.match(markup, /Transactions/);
    assert.match(markup, /Draft & ADP/);
    assert.match(markup, /No acquisition data for this platform/);
    assert.match(markup, /All projections unavailable/);
  });
});
