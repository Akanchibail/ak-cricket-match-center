/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MatchFormat = 'T20' | 'ODI' | 'Test' | 'T10' | 'The Hundred' | 'Custom';

export type DismissalType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run_out'
  | 'stumped'
  | 'hit_wicket'
  | 'obstructing_the_field'
  | 'hit_the_ball_twice'
  | 'timed_out'
  | 'retired_out'
  | 'retired_hurt'
  | 'retired_not_out';

export interface Player {
  id: string;
  name: string;
  shortName: string;
  role: 'batter' | 'bowler' | 'allrounder' | 'wicketkeeper';
  battingStyle?: string;
  bowlingStyle?: string;
  jerseyNumber?: number;
  isCaptain?: boolean;
  isWicketkeeper?: boolean;
  isSubstitute?: boolean;
}

export interface BatterStats {
  playerId: string;
  playerName: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  dots: number;
  strikeRate: number;
  isOut: boolean;
  dismissal?: DismissalInfo;
  isBatting: boolean; // currently in middle
  wagonShots?: WagonShot[];
}

export interface DismissalInfo {
  type: DismissalType;
  dismissedBatterId: string;
  dismissedBatterName: string;
  bowlerId?: string;
  bowlerName?: string;
  fielderId?: string;
  fielderName?: string;
  creditedToBowler: boolean;
  text: string; // e.g. "c Maxwell b Starc"
  over: string; // e.g. "14.5"
  teamScoreAtDismissal: number;
  wicketNumber: number;
}

export interface BowlerStats {
  playerId: string;
  playerName: string;
  legalBalls: number;
  overs: string; // "3.3"
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
  dots: number;
  currentOverBalls?: number; // legal balls in current over
  currentOverRuns?: number;
}

export interface ExtrasBreakdown {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penaltyRuns: number;
  total: number;
}

export interface WagonShot {
  id: string;
  angle: number; // 0 - 360 degrees
  distance: number; // 0 - 100 percentage
  runs: number;
  isFour: boolean;
  isSix: boolean;
  batterName: string;
  over: string;
  description: string;
}

export interface Delivery {
  id: string;
  deliveryIndex: number;
  overNumber: number; // 0-based over index (e.g. 17 for 18th over)
  ballInOver: number; // 1 to 6 for legal balls, or 0/special for extras
  displayOver: string; // "17.1", "17.2", "Wd", "Nb", etc.
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  bowlerId: string;
  bowlerName: string;
  deliveryType: 'normal' | 'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'penalty';
  batterRuns: number;
  extraRuns: number;
  totalRuns: number;
  isLegalBall: boolean;
  isFour: boolean;
  isSix: boolean;
  isDot: boolean;
  dismissal?: DismissalInfo;
  commentary: string;
  wagonShot?: WagonShot;
  timestamp: number;
}

export interface OverSummary {
  overNumber: number; // 0-based
  displayOverNumber: number; // 1-based (e.g. 18)
  bowlerId: string;
  bowlerName: string;
  runsConceded: number;
  wickets: number;
  deliveries: Delivery[];
  isMaiden: boolean;
  isCompleted: boolean;
}

export interface FallOfWicket {
  wicketNumber: number;
  teamRuns: number;
  overs: string;
  batterId: string;
  batterName: string;
  score: number;
  balls: number;
}

export interface Partnership {
  wicketNumber: number;
  batter1Id: string;
  batter1Name: string;
  batter1Runs: number;
  batter1Balls: number;
  batter2Id: string;
  batter2Name: string;
  batter2Runs: number;
  batter2Balls: number;
  totalRuns: number;
  totalBalls: number;
  isCurrent: boolean;
}

export interface Innings {
  inningsNumber: 1 | 2;
  battingTeamId: string;
  battingTeamName: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  oversFormatted: string; // "17.3"
  extras: ExtrasBreakdown;
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  nextBowlerId?: string;
  lastBowlerId?: string; // ID of the bowler who bowled the preceding over (consecutive overs prohibited)
  battingCard: BatterStats[];
  bowlingCard: BowlerStats[];
  deliveries: Delivery[];
  overs: OverSummary[];
  fallOfWickets: FallOfWicket[];
  partnerships: Partnership[];
  wagonShots: WagonShot[];
  isCompleted: boolean;
  completedReason?: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string; // "ENG", "AUS"
  color?: string;
  players: Player[];
  substitutes?: Player[];
}

export interface MatchResult {
  winnerTeamId?: string;
  winnerTeamName?: string;
  margin?: string; // "by 4 runs", "by 6 wickets"
  summary: string;
  playerOfTheMatch?: string;
  isTie: boolean;
  isDraw: boolean;
}

export interface Match {
  id: string;
  title: string; // "ENG vs AUS"
  subtitle: string; // "2nd T20I • Lord's London"
  seriesName: string; // "Men's T20 Tri-Series"
  venue: string; // "Lord's, London"
  format: MatchFormat;
  totalOvers: number;
  ballsPerOver: number;
  team1: Team;
  team2: Team;
  tossWinnerId: string;
  tossDecision: 'bat' | 'bowl';
  currentInningsIndex: 0 | 1;
  innings: [Innings, Innings];
  target: number | null;
  dlsPar?: number;
  powerplayDetails?: string; // "POWERPLAY 3 (16-20)"
  status: 'live' | 'innings_break' | 'completed' | 'abandoned';
  result?: MatchResult;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryInput {
  deliveryType: 'normal' | 'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'penalty';
  batterRuns: number;
  extraRuns: number;
  isFour?: boolean;
  isSix?: boolean;
  dismissal?: {
    type: DismissalType;
    dismissedBatterId: string;
    fielderId?: string;
    incomingBatterId?: string;
    runOutCompletedRuns?: number;
  };
  wagonZone?: {
    angle: number;
    distance: number;
    description?: string;
  };
  customCommentary?: string;
  penaltyAwardedTo?: 'batting' | 'bowling';
}
