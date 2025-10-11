import type { LeagueState } from "../store/leagueSlice";
import type { Payload, SeasonSlim } from "../types/payload";

function getLeague(state: LeagueState, leagueId: string | number | undefined | null) {
  if (!leagueId) return undefined;
  const key = String(leagueId);
  return state.leagues[key];
}

function coerceSeasonKey(season: string | number | undefined | null) {
  if (season == null) return undefined;
  return String(season);
}

export function getSeasons(state: LeagueState, leagueId: string | number | undefined): SeasonSlim[] {
  return getLeague(state, leagueId)?.seasons ?? [];
}

export function getLineupSlotsByYear(
  state: LeagueState,
  leagueId: string | number | undefined
): Payload["lineupSlotsByYear"] {
  return getLeague(state, leagueId)?.lineupSlotsByYear ?? {};
}

export function getRostersByYear(
  state: LeagueState,
  leagueId: string | number | undefined
): Payload["rostersByYear"] {
  return getLeague(state, leagueId)?.rostersByYear ?? {};
}

export function getCurrentWeek(
  state: LeagueState,
  leagueId: string | number | undefined,
  season: string | number | undefined
): number {
  const league = getLeague(state, leagueId);
  if (!league) return 1;
  const key = coerceSeasonKey(season);
  if (!key) return 1;
  const explicit = league.currentWeekByYear?.[key];
  if (typeof explicit === "number" && explicit > 0) {
    return explicit;
  }
  const seasonId = Number(key);
  const seasonObj = league.seasons?.find((s) => Number(s?.seasonId) === seasonId);
  if (seasonObj?.currentWeek && seasonObj.currentWeek > 0) {
    return seasonObj.currentWeek;
  }
  return 1;
}

export function getOwnerByTeam(
  state: LeagueState,
  leagueId: string | number | undefined,
  season: string | number | undefined
): Record<string, string> {
  const league = getLeague(state, leagueId);
  if (!league) return {};
  const key = coerceSeasonKey(season);
  if (!key) return {};
  return league.ownerByTeamByYear?.[key] ?? {};
}

export function getTeamNamesByOwner(
  state: LeagueState,
  leagueId: string | number | undefined
): Payload["teamNamesByOwner"] {
  return getLeague(state, leagueId)?.teamNamesByOwner ?? {};
}

export function getProTeamsByYear(
  state: LeagueState,
  leagueId: string | number | undefined
): Payload["proTeamsByYear"] {
  return getLeague(state, leagueId)?.proTeamsByYear ?? {};
}

export function getRosterAcqByYear(
  state: LeagueState,
  leagueId: string | number | undefined
): Payload["rosterAcqByYear"] {
  return getLeague(state, leagueId)?.rosterAcqByYear ?? {};
}

export function getAdp(
  state: LeagueState,
  leagueId: string | number | undefined,
  season: string | number | undefined
) {
  const league = getLeague(state, leagueId);
  if (!league) return {};
  const key = coerceSeasonKey(season);
  if (!key) return {};
  const rich = league.adpRichByYear?.[key];
  if (rich) return rich;
  return league.adpByYear?.[key] ?? {};
}
