import React from "react";
import { canonicalizeOwner, primeOwnerMaps } from "../ownerMaps.jsx";
import { normalizeNicknameMap } from "./nicknames.js";

const TEAM_NAME_RE = /^team\s*\d+$/i;

const extractOwnerName = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const direct =
      value?.name ??
      value?.owner ??
      value?.ownerName ??
      value?.fullName ??
      value?.displayName ??
      value?.nickname ??
      value?.teamManager ??
      value?.teamOwner ??
      value?.manager ??
      null;
    if (direct && String(direct).trim()) return String(direct).trim();
    const composed = [value?.firstName, value?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (composed) return composed;
  }
  return String(value ?? "").trim();
};

export function useOwnerNameResolver({
  league,
  managerNicknames = {},
  rawRows = [],
} = {}) {
  const [ownerMapsVersion, setOwnerMapsVersion] = React.useState(0);

  const normalizedNicknamesProp = React.useMemo(
    () => normalizeNicknameMap(managerNicknames),
    [managerNicknames]
  );
  const normalizedNicknamesLeague = React.useMemo(
    () => normalizeNicknameMap(league?.managerNicknames || {}),
    [league?.managerNicknames]
  );

  const ownerMapsForPrime = React.useMemo(() => {
    const merged = {};
    const mergeSource = (source = {}) => {
      Object.entries(source || {}).forEach(([seasonKey, teamMap]) => {
        if (!merged[seasonKey]) merged[seasonKey] = {};
        Object.assign(merged[seasonKey], teamMap || {});
      });
    };
    mergeSource(league?.ownerByTeamByYear);
    mergeSource(league?.espnOwnerByTeamByYear);
    mergeSource(league?.espnOwnerFullByTeamByYear);
    return merged;
  }, [
    league?.ownerByTeamByYear,
    league?.espnOwnerByTeamByYear,
    league?.espnOwnerFullByTeamByYear,
  ]);

  React.useEffect(() => {
    if (!league) return;
    const aliases =
      (typeof window !== "undefined" && window.__FL_ALIASES) || {};
    try {
      primeOwnerMaps({
        league,
        selectedLeague: league,
        espnOwnerByTeamByYear: ownerMapsForPrime,
        manualAliases: aliases,
      });
      setOwnerMapsVersion((v) => v + 1);
    } catch (err) {
      console.warn("useOwnerNameResolver primeOwnerMaps failed", err);
    }
  }, [league, ownerMapsForPrime]);

  const teamAliasMap = React.useMemo(() => {
    const map = new Map();
    const addAlias = (alias, target) => {
      const aliasStr = String(alias || "").trim();
      const targetStr = String(target || "").trim();
      if (!aliasStr || !targetStr) return;
      const canonicalTarget = canonicalizeOwner(targetStr) || targetStr;
      const key = aliasStr.toLowerCase();
      if (!key) return;
      map.set(key, canonicalTarget);
    };
    const addTeamAliases = (teamId, target) => {
      if (!Number.isFinite(teamId)) return;
      const variants = [
        `Team ${teamId}`,
        `team ${teamId}`,
        `Team${teamId}`,
        `team${teamId}`,
        String(teamId),
      ];
      variants.forEach((variant) => addAlias(variant, target));
    };
    const addFromNicknames = (source) => {
      Object.entries(source || {}).forEach(([owner, aliases]) => {
        const canonicalOwner =
          canonicalizeOwner(owner) || String(owner || "").trim();
        if (!canonicalOwner) return;
        const list = Array.isArray(aliases) ? aliases : [aliases];
        list
          .map((alias) => String(alias || "").trim())
          .filter(Boolean)
          .forEach((alias) => addAlias(alias, canonicalOwner));
      });
    };

    addFromNicknames(normalizedNicknamesProp);
    addFromNicknames(normalizedNicknamesLeague);

    const manualAliasSource =
      (typeof window !== "undefined" && window.__FL_ALIASES) || {};
    Object.entries(manualAliasSource || {}).forEach(([alias, target]) =>
      addAlias(alias, target)
    );

    const explicitTeamAliasSource =
      (typeof window !== "undefined" && window.__FL_TEAM_ALIASES) || {};
    Object.entries(explicitTeamAliasSource || {}).forEach(([alias, target]) => {
      const numeric = Number(alias);
      if (Number.isFinite(numeric)) {
        addTeamAliases(numeric, target);
      } else {
        addAlias(alias, target);
      }
    });

    const addFromOwnerMap = (source = {}) => {
      Object.values(source || {}).forEach((byTeam) => {
        Object.entries(byTeam || {}).forEach(([teamKey, owner]) => {
          const teamId = Number(teamKey);
          if (!Number.isFinite(teamId)) return;
          const ownerName = extractOwnerName(owner);
          const normalizedOwner =
            canonicalizeOwner(ownerName) || ownerName || "";
          if (!normalizedOwner) return;
          if (/^team\s*\d+$/i.test(normalizedOwner)) return;
          addTeamAliases(teamId, normalizedOwner);
        });
      });
    };

    addFromOwnerMap(league?.ownerByTeamByYear);
    addFromOwnerMap(league?.espnOwnerByTeamByYear);
    addFromOwnerMap(league?.espnOwnerFullByTeamByYear);

    const ownersList = Array.isArray(league?.owners) ? league.owners : [];
    ownersList.forEach((ownerName, index) => {
      const normalizedOwner =
        canonicalizeOwner(ownerName) || String(ownerName || "").trim();
      if (!normalizedOwner) return;
      if (TEAM_NAME_RE.test(normalizedOwner)) return;
      addTeamAliases(index + 1, normalizedOwner);
    });

    return map;
  }, [
    league?.managerNicknames,
    league?.ownerByTeamByYear,
    league?.espnOwnerByTeamByYear,
    league?.espnOwnerFullByTeamByYear,
    league?.owners,
    managerNicknames,
    normalizedNicknamesLeague,
    normalizedNicknamesProp,
    ownerMapsVersion,
  ]);

  const canonicalOwnerList = React.useMemo(() => {
    const seen = new Set();
    const owners = [];
    teamAliasMap.forEach((target) => {
      const trimmed = String(target || "").trim();
      if (!trimmed || TEAM_NAME_RE.test(trimmed)) return;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      owners.push(trimmed);
    });
    return owners;
  }, [teamAliasMap]);

  const looseMatchOwnerName = React.useCallback(
    (value) => {
      if (value == null) return null;
      const str = String(value).trim();
      if (!str) return null;
      const parts = str.split(/\s+/).filter(Boolean);
      if (parts.length < 2) return null;
      const firstRaw = parts[0].toLowerCase();
      const last = parts.slice(1).join(" ").toLowerCase();
      if (!last) return null;

      const dedupeDoubleLetters = (text) =>
        text.replace(/(.)\1+/g, "$1");
      const first = dedupeDoubleLetters(firstRaw);

      const matches = [];
      canonicalOwnerList.forEach((candidate) => {
        const tokens = candidate.split(/\s+/).filter(Boolean);
        if (tokens.length < 2) return;
        const candidateFirstRaw = tokens[0].toLowerCase();
        const candidateLast = tokens.slice(1).join(" ").toLowerCase();
        if (candidateLast !== last) return;

        const candidateFirst = dedupeDoubleLetters(candidateFirstRaw);
        if (
          candidateFirstRaw.startsWith(firstRaw) ||
          firstRaw.startsWith(candidateFirstRaw) ||
          candidateFirst.startsWith(first) ||
          first.startsWith(candidateFirst)
        ) {
          matches.push(candidate);
        }
      });

      const uniqueMatches = Array.from(new Set(matches));
      if (uniqueMatches.length === 1) return uniqueMatches[0];
      return null;
    },
    [canonicalOwnerList]
  );

  const normalizeOwnerNameLoose = React.useCallback(
    (value) => {
      if (value == null) return null;
      const str = String(value).trim();
      if (!str) return null;
      const lookup = (raw) => {
        if (raw == null) return null;
        const key = String(raw).trim().toLowerCase();
        if (!key) return null;
        return teamAliasMap.get(key) || null;
      };
      const aliasDirect = lookup(str);
      if (aliasDirect) return aliasDirect;

      const canonical = canonicalizeOwner(str);
      if (canonical) {
        const aliasCanonical = lookup(canonical);
        if (aliasCanonical) return aliasCanonical;
        if (!TEAM_NAME_RE.test(canonical)) {
          const looseCanonical = looseMatchOwnerName(canonical);
          if (looseCanonical) return looseCanonical;
          return canonical;
        }
      }

      const loose = looseMatchOwnerName(str);
      if (loose) return loose;

      const numeric = Number(str.replace(/[^0-9]/g, ""));
      if (Number.isFinite(numeric)) {
        const aliasNumeric = lookup(`team ${numeric}`);
        if (aliasNumeric) return aliasNumeric;
      }

      return canonical || str;
    },
    [teamAliasMap, looseMatchOwnerName]
  );

  const resolveAliasForTeamId = React.useCallback(
    (teamIdRaw) => {
      const teamIdNum = Number(teamIdRaw);
      if (!Number.isFinite(teamIdNum)) return null;
      const label = `Team ${teamIdNum}`;
      const normalized = normalizeOwnerNameLoose(label);
      if (normalized && !/^team\s*\d+$/i.test(normalized)) {
        return normalized;
      }
      const direct = teamAliasMap.get(String(teamIdNum).toLowerCase());
      if (direct && !/^team\s*\d+$/i.test(direct)) return direct;
      return null;
    },
    [normalizeOwnerNameLoose, teamAliasMap]
  );

  const managerBySeasonTeam = React.useMemo(() => {
    const map = {};
    const assign = (seasonRaw, teamRaw, name) => {
      const seasonNum = Number(seasonRaw);
      const teamId = Number(teamRaw);
      if (!Number.isFinite(seasonNum) || !Number.isFinite(teamId)) return;
      let candidate = extractOwnerName(name);
      const normalized = normalizeOwnerNameLoose(candidate);
      if (!normalized) return;
      map[seasonNum] ??= {};
      if (!map[seasonNum][teamId]) {
        map[seasonNum][teamId] = normalized;
      }
    };

    const consumeOwnerMap = (seasonRaw, ownerMap = {}) => {
      Object.entries(ownerMap || {}).forEach(([teamKey, nm]) => {
        assign(seasonRaw, teamKey, nm);
      });
    };

    try {
      if (typeof window !== "undefined" && window.__ownerMaps?.mapFor) {
        const seasons = new Set();
        Object.keys(league?.ownerByTeamByYear || {}).forEach((s) =>
          seasons.add(Number(s))
        );
        Object.keys(league?.seasonsByYear || {}).forEach((s) =>
          seasons.add(Number(s))
        );
        seasons.forEach((seasonNum) => {
          if (!Number.isFinite(seasonNum)) return;
          const rawMap = window.__ownerMaps.mapFor(seasonNum) || {};
          consumeOwnerMap(seasonNum, rawMap);
        });
      }
    } catch (err) {
      console.warn("useOwnerNameResolver manager map from ownerMaps failed", err);
    }

    const ownerMapSources = [
      league?.ownerByTeamByYear,
      league?.espnOwnerByTeamByYear,
      league?.espnOwnerFullByTeamByYear,
    ];
    ownerMapSources.forEach((source) => {
      Object.entries(source || {}).forEach(([seasonKey, ownerMap]) => {
        consumeOwnerMap(seasonKey, ownerMap);
      });
    });

    Object.entries(league?.seasonsByYear || {}).forEach(
      ([seasonKey, seasonValue]) => {
        const seasonNum = Number(seasonKey);
        const teams = Array.isArray(seasonValue?.teams)
          ? seasonValue.teams
          : [];
        teams.forEach((team) => {
          const teamIdCandidate =
            team?.id ?? team?.teamId ?? team?.teamID ?? team?.team?.id;
          if (!Number.isFinite(Number(teamIdCandidate))) return;
          const candidates = [
            team?.owner,
            team?.ownerName,
            team?.teamManager,
            team?.teamOwner,
            team?.manager,
            team?.primaryOwnerName,
          ];
          if (Array.isArray(team?.owners)) {
            team.owners.forEach((owner) => {
              candidates.push(
                owner?.displayName,
                owner?.fullName,
                owner?.nickname,
                owner?.firstName && owner?.lastName
                  ? `${owner.firstName} ${owner.lastName}`
                  : null
              );
            });
          }
          for (const cand of candidates) {
            if (!cand) continue;
            assign(seasonNum, teamIdCandidate, cand);
            break;
          }
        });
      }
    );

    (rawRows || []).forEach((row) => {
      const seasonCand =
        row?.season ??
        row?.year ??
        row?.season_id ??
        row?.seasonId ??
        row?.seasonYear;
      const teamCand =
        row?.team_id ??
        row?.teamId ??
        row?.team ??
        row?.teamID ??
        row?.tid;
      const managerCand =
        row?.manager ??
        row?.manager_name ??
        row?.owner ??
        row?.owner_name ??
        row?.ownerName ??
        row?.team_owner ??
        row?.team_manager ??
        row?.teamManager ??
        row?.manager1 ??
        row?.managerName;
      assign(seasonCand, teamCand, managerCand);
    });

    return map;
  }, [
    league,
    league?.espnOwnerByTeamByYear,
    league?.espnOwnerFullByTeamByYear,
    rawRows,
    normalizeOwnerNameLoose,
    ownerMapsVersion,
  ]);

  const ownerNameOf = React.useCallback(
    (season, teamId) => {
      try {
        if (window.__ownerMaps?.name) {
          const nm = window.__ownerMaps.name(Number(season), Number(teamId));
          if (nm) return nm;
        }
      } catch {}
      const aliasByTeamId = resolveAliasForTeamId(teamId);
      if (aliasByTeamId) return aliasByTeamId;
      const fromMap = managerBySeasonTeam?.[Number(season)]?.[Number(teamId)];
      if (fromMap) return fromMap;
      const g = (obj, ...ks) =>
        ks.reduce((o, k) => (o == null ? o : o[k]), obj);
      const fallback =
        g(league, "ownerByTeamByYear", season, teamId) ||
        g(league, "ownerByTeamByYear", String(season), teamId) ||
        g(league, "ownerByTeamByYear", season, String(teamId)) ||
        g(league, "ownerByTeamByYear", String(season), String(teamId)) ||
        null;
      if (fallback) {
        const normalized = normalizeOwnerNameLoose(fallback);
        return normalized || fallback;
      }

      const seasonObj =
        g(league, "seasonsByYear", season) ||
        g(league, "seasonsByYear", String(season));
      const numericTeamId = Number(teamId);
      if (seasonObj && Number.isFinite(numericTeamId)) {
        const teams = Array.isArray(seasonObj?.teams)
          ? seasonObj.teams
          : [];
        const matchTeam = teams.find((team) => {
          const candidates = [team?.id, team?.teamId, team?.teamID];
          return candidates.some(
            (cand) => Number(cand) === numericTeamId
          );
        });

        const members = Array.isArray(seasonObj?.members)
          ? seasonObj.members
          : [];
        const normalizeFromMembers = (id) => {
          if (id == null) return null;
          const idStr = String(id);
          const member = members.find((m) => String(m?.id) === idStr);
          if (!member) return null;
          const parts = [member?.firstName, member?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          const candidates = [
            parts,
            member?.fullName,
            member?.displayName,
            member?.nickname,
          ];
          for (const cand of candidates) {
            const normalized = normalizeOwnerNameLoose(cand);
            if (normalized) return normalized;
          }
          return null;
        };

        if (matchTeam) {
          const ownerCandidates = [];
          ownerCandidates.push(
            matchTeam?.owner,
            matchTeam?.ownerName,
            matchTeam?.teamOwner,
            matchTeam?.teamManager,
            matchTeam?.manager,
            matchTeam?.managerName,
            matchTeam?.primaryOwnerName
          );
          if (Array.isArray(matchTeam?.owners)) {
            matchTeam.owners.forEach((owner) => {
              ownerCandidates.push(
                owner?.displayName,
                owner?.fullName,
                owner?.nickname,
                owner?.firstName && owner?.lastName
                  ? `${owner.firstName} ${owner.lastName}`
                  : null
              );
            });
          }
          for (const cand of ownerCandidates) {
            if (!cand) continue;
            const normalized = normalizeOwnerNameLoose(cand);
            if (normalized) return normalized;
          }
        }

        const idCandidates = [
          matchTeam?.primaryOwner,
          matchTeam?.ownerId,
          matchTeam?.primaryOwnerId,
          matchTeam?.owners?.[0]?.id,
          matchTeam?.owners?.[0]?.ownerId,
        ];
        for (const id of idCandidates) {
          const normalized = normalizeFromMembers(id);
          if (normalized) return normalized;
        }

        for (const member of members) {
          const teams = Array.isArray(member?.teams) ? member.teams : [];
          const found = teams.some((team) => {
            const candidates = [team?.id, team?.teamId, team?.teamID];
            return candidates.some((cand) => Number(cand) === numericTeamId);
          });
          if (!found) continue;
          const normalized = normalizeFromMembers(member?.id);
          if (normalized) return normalized;
        }
      }

      if (Number.isFinite(numericTeamId)) {
        return `Team ${numericTeamId}`;
      }
      if (teamId != null) return String(teamId).trim();
      return null;
    },
    [
      league,
      managerBySeasonTeam,
      normalizeOwnerNameLoose,
      resolveAliasForTeamId,
    ]
  );

  return {
    ownerNameOf,
    normalizeOwnerNameLoose,
    resolveAliasForTeamId,
    managerBySeasonTeam,
  };
}
