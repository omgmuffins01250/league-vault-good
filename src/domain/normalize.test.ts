import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { getLineupSlotsByYear, getOwnerByTeam, getRostersByYear } from "./normalize.ts";
import { initialState, leagueReducer, upsertLeagueFromExtension } from "../store/leagueSlice.ts";

type FixturePayload = Parameters<typeof upsertLeagueFromExtension>[0];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadFixture(name: string): FixturePayload {
  const raw = readFileSync(resolve(__dirname, `../../fixtures/${name}`), "utf8");
  return JSON.parse(raw);
}

describe("normalize selectors", () => {
  const espnPayload = loadFixture("espnPayload.json");
  const sleeperPayload = loadFixture("sleeperPayload.json");

  const espnState = leagueReducer(initialState, upsertLeagueFromExtension(espnPayload));
  const combinedState = leagueReducer(espnState, upsertLeagueFromExtension(sleeperPayload));

  it("returns owner names for both platforms", () => {
    assert.deepEqual(getOwnerByTeam(combinedState, "espn-123", 2024), {
      1: "Alice",
      2: "Bob",
    });
    assert.deepEqual(getOwnerByTeam(combinedState, "sleeper-456", 2024), {
      1: "Casey",
      2: "Devon",
    });
  });

  it("returns weekly roster arrays with projections handled", () => {
    const espnRosters = getRostersByYear(combinedState, "espn-123");
    assert.ok(Array.isArray(espnRosters["2024"]["1"]["1"]));
    assert.ok(espnRosters["2024"]["1"]["1"][0].proj > 0);

    const sleeperRosters = getRostersByYear(combinedState, "sleeper-456");
    assert.ok(Array.isArray(sleeperRosters["2024"]["1"]["7"]));
    assert.equal(sleeperRosters["2024"]["1"]["7"][0].proj, 0);
  });

  it("exposes lineup slot counts for each league", () => {
    const espnSlots = getLineupSlotsByYear(combinedState, "espn-123");
    assert.equal(espnSlots["2024"]["0"], 1);

    const sleeperSlots = getLineupSlotsByYear(combinedState, "sleeper-456");
    assert.equal(sleeperSlots["2024"]["2"], 2);
  });
});
