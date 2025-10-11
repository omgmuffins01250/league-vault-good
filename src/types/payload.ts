export type LegacyRow = {
  season: number;
  week: number | null;
  manager: string;
  opponent: string;
  team_name: string;
  points_for: number;
  points_against: number;
  proj_for?: number;
  proj_against?: number;
  result: "W" | "L" | "T" | "";
  final_rank?: string | number | "";
  league_name?: string;
  platform?: "ESPN" | "SLEEPER" | string;
  scoring?: string;
  is_playoff?: boolean;
  is_winners_bracket?: boolean;
  playoff_tier?: string;
  matchup_type?: string;
};

export type SeasonSlim = {
  seasonId: number;
  settings: { name?: string } | Record<string, any>;
  scoringSettings?: { name?: string } | Record<string, any>;
  members: Array<{
    id: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
  }>;
  teams: Array<{
    id: number;
    primaryOwner?: string | null;
    owners?: string[];
    roster?: { entriesByScoringPeriod?: Record<string, any[]> };
  }>;
  schedule?: any[];
  draftDetail?: { picks?: any[] } | null;
  transactionsSlim?: any[];
  weeklyPointsByPlayer?: any;
  currentWeek?: number;
};

export type Payload = {
  leagueId: string | number;
  leagueName: string;
  seasons: SeasonSlim[];
  legacyRows?: LegacyRow[];
  legacySeasonsLite?: any[];
  rostersByYear: {
    [season: string]: {
      [teamId: string]: {
        [week: string]: Array<{
          pid: number | string;
          name: string;
          lineupSlotId: number | null;
          slotOrder?: number;
          pts: number;
          proj: number;
          projStart?: number | null;
          defaultPositionId: number | null;
          proTeamId: number | null;
        }>;
      };
    };
  };
  lineupSlotsByYear: { [season: string]: { [slotId: string]: number } };
  currentWeekByYear: { [season: string]: number };
  rosterAcqByYear: {
    [season: string]: {
      [teamId: string]: {
        [playerId: string]: {
          acquisitionType: string;
          slotId?: number | null;
          slot?: string;
          defaultPositionId?: number | null;
          name?: string;
        };
      };
    };
  };
  ownerByTeamByYear: {
    [season: string]: { [teamId: string]: string };
  };
  teamNamesByOwner: {
    [ownerName: string]: { [season: string]: string };
  };
  proTeamsByYear: {
    [season: string]: {
      [proTeamId: string]: {
        id: number;
        abbrev: string;
        name: string;
        location: string;
        byeWeek: number | null;
      };
    };
  };
  adpByYear: { [season: string]: { [normalizedPlayerName: string]: number } };
  adpRichByYear: {
    [season: string]: {
      [normalizedPlayerName: string]: { adp: number; pos: string | null };
    };
  };
};
