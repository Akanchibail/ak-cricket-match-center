/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Duckworth-Lewis-Stern (DLS) Standard Edition Engine
 * Provides accurate, ball-by-ball resource percentages, par score calculations,
 * revised target projections, and live match state differentials.
 */

// Benchmark resource knot points for overs left (0 to 50)
export const DLS_RESOURCE_KNOTS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;

// Official Standard Edition resource percentage table across wickets lost (0 to 9)
// Index: oversLeft knot -> [0w, 1w, 2w, 3w, 4w, 5w, 6w, 7w, 8w, 9w]
export const DLS_RESOURCE_DATA: Record<number, number[]> = {
  0:  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  5:  [17.2, 17.0, 16.8, 16.5, 16.1, 15.4, 14.3, 12.5, 9.4, 4.6],
  10: [32.1, 31.6, 30.8, 29.8, 28.3, 26.1, 22.8, 17.9, 11.4, 4.7],
  15: [45.1, 44.1, 42.6, 40.5, 37.6, 33.5, 27.9, 20.3, 11.8, 4.7],
  20: [56.6, 54.8, 52.4, 49.1, 44.6, 38.6, 30.5, 21.0, 11.8, 4.7],
  25: [66.5, 63.9, 60.5, 56.0, 50.0, 42.2, 32.6, 21.6, 11.9, 4.7],
  30: [75.1, 71.8, 67.3, 61.6, 54.1, 44.7, 33.6, 21.8, 11.9, 4.7],
  35: [82.7, 78.5, 73.0, 66.0, 57.2, 46.4, 34.2, 21.9, 11.9, 4.7],
  40: [89.3, 84.2, 77.8, 69.6, 59.5, 47.6, 34.6, 22.0, 11.9, 4.7],
  45: [95.0, 89.1, 81.8, 72.5, 61.3, 48.4, 34.8, 22.0, 11.9, 4.7],
  50: [100.0, 93.4, 85.1, 74.9, 62.7, 49.0, 34.9, 22.0, 11.9, 4.7],
};

/**
 * Standard average 50-over run benchmark (G50 constant)
 */
export const G50_DEFAULT = 245;

export interface DLSInput {
  totalOvers: number;             // Scheduled match overs (e.g. 50 or 20)
  team1TotalRuns: number;         // 1st innings total runs scored (e.g. 186)
  team1OversFaced?: number | string; // Overs faced by team 1 (default: totalOvers)
  team1WicketsLost?: number;      // Wickets lost by team 1 (default: 10 if all out, or 0)
  team2OversBatted: number | string; // Overs faced so far by team 2 (e.g. 10.5 or "10.5")
  team2WicketsLost: number;       // Wickets lost by team 2 (0 - 10)
  team2CurrentRuns?: number;      // Current runs scored by team 2 (e.g. 54)
  team2RevisedOvers?: number;     // If innings is shortened due to rain
}

export interface DLSResult {
  parScore: number;               // Expected par score to tie at current ball (e.g. 31)
  winningTarget: number;          // Minimum runs to win if match stopped now (e.g. 32)
  currentRuns: number;            // Team 2's current runs (e.g. 54)
  runDifferential: number;        // currentRuns - parScore (e.g. +23)
  status: 'ahead' | 'behind' | 'level';
  statusDescription: string;      // e.g. "Ahead of DLS Par by 23 runs"
  team1Resources: number;         // % resources available to team 1
  team2ResourcesRemaining: number;// % resources still in hand for team 2
  team2ResourcesUsed: number;     // % resources consumed so far by team 2
  oversRemaining: number;         // Exact overs left to face
  revisedFullTarget: number;      // Full innings revised target if overs were reduced
}

/**
 * Converts overs formatted string or number (e.g., "10.5" or 10.5) into decimal overs (10 + 5/6 = 10.833)
 */
export function parseOversToDecimal(overs: number | string): number {
  if (typeof overs === 'string') {
    const parts = overs.split('.');
    const ov = parseInt(parts[0], 10) || 0;
    const balls = parts[1] ? parseInt(parts[1], 10) : 0;
    return ov + (balls % 6) / 6;
  }
  const whole = Math.floor(overs);
  const frac = Math.round((overs - whole) * 10);
  if (frac > 0 && frac < 6) {
    return whole + frac / 6;
  }
  return overs;
}

/**
 * Calculates remaining resource percentage for any number of overs left and wickets lost
 * with ball-by-ball precision using piecewise linear interpolation across knot points.
 */
export function getDLSResource(oversLeft: number, wicketsLost: number): number {
  if (wicketsLost >= 10 || oversLeft <= 0) return 0;
  const w = Math.min(9, Math.max(0, wicketsLost));
  const u = Math.min(50, Math.max(0, oversLeft));

  let lowerKnot = 0;
  let upperKnot = 50;
  for (let i = 0; i < DLS_RESOURCE_KNOTS.length - 1; i++) {
    if (u >= DLS_RESOURCE_KNOTS[i] && u <= DLS_RESOURCE_KNOTS[i + 1]) {
      lowerKnot = DLS_RESOURCE_KNOTS[i];
      upperKnot = DLS_RESOURCE_KNOTS[i + 1];
      break;
    }
  }

  if (lowerKnot === upperKnot) {
    return DLS_RESOURCE_DATA[lowerKnot][w];
  }

  const frac = (u - lowerKnot) / (upperKnot - lowerKnot);
  const rLow = DLS_RESOURCE_DATA[lowerKnot][w];
  const rHigh = DLS_RESOURCE_DATA[upperKnot][w];
  const res = rLow + frac * (rHigh - rLow);
  return Math.min(100, Math.max(0, res));
}

/**
 * Computes full DLS state, par score, win target, and differentials.
 */
export function calculateDLS(input: DLSInput): DLSResult {
  const totalOvers = Math.max(1, input.totalOvers || 50);
  const team1TotalRuns = Math.max(0, input.team1TotalRuns || 0);

  // Parse decimal overs faced
  const team2OversBattedDec = parseOversToDecimal(input.team2OversBatted);
  const team2TargetOvers = Math.max(team2OversBattedDec, input.team2RevisedOvers || totalOvers);
  const team2Wickets = Math.min(10, Math.max(0, input.team2WicketsLost));
  const team2Runs = Math.max(0, input.team2CurrentRuns || 0);

  // Overs remaining for team 2
  const oversRemaining = Math.max(0, team2TargetOvers - team2OversBattedDec);

  // Team 1 resources
  const team1OversFacedDec = input.team1OversFaced !== undefined
    ? parseOversToDecimal(input.team1OversFaced)
    : totalOvers;

  let team1Resources = getDLSResource(team1OversFacedDec, 0);
  if (team1Resources <= 0) {
    team1Resources = 100;
  }

  // Team 2 resources
  const team2InitialResource = getDLSResource(team2TargetOvers, 0);
  const team2ResourcesRemaining = getDLSResource(oversRemaining, team2Wickets);
  const team2ResourcesUsed = Math.max(0, team2InitialResource - team2ResourcesRemaining);

  // Scaled benchmark for match format
  const benchmarkRuns = (G50_DEFAULT * totalOvers) / 50;

  // Calculate Par Score at current ball
  let rawPar: number;
  if (team2ResourcesUsed <= team1Resources) {
    rawPar = team1TotalRuns * (team2ResourcesUsed / team1Resources);
  } else {
    rawPar = team1TotalRuns + ((team2ResourcesUsed - team1Resources) / 100) * benchmarkRuns;
  }

  const parScore = Math.round(rawPar);
  const winningTarget = parScore + 1;

  // Full-innings revised target if overs were reduced
  let revisedFullTarget: number;
  if (team2InitialResource <= team1Resources) {
    revisedFullTarget = Math.floor(team1TotalRuns * (team2InitialResource / team1Resources)) + 1;
  } else {
    revisedFullTarget = Math.floor(team1TotalRuns + ((team2InitialResource - team1Resources) / 100) * benchmarkRuns) + 1;
  }

  // Run differential and status
  const runDifferential = team2Runs - parScore;
  let status: 'ahead' | 'behind' | 'level' = 'level';
  let statusDescription = `Level with DLS Par (${parScore} runs)`;

  if (runDifferential > 0) {
    status = 'ahead';
    statusDescription = `Ahead of DLS Par by ${runDifferential} run${runDifferential === 1 ? '' : 's'} (Winning Position)`;
  } else if (runDifferential < 0) {
    status = 'behind';
    const deficit = Math.abs(runDifferential);
    statusDescription = `Behind DLS Par by ${deficit} run${deficit === 1 ? '' : 's'} (Losing Position)`;
  }

  return {
    parScore,
    winningTarget,
    currentRuns: team2Runs,
    runDifferential,
    status,
    statusDescription,
    team1Resources: Number(team1Resources.toFixed(2)),
    team2ResourcesRemaining: Number(team2ResourcesRemaining.toFixed(2)),
    team2ResourcesUsed: Number(team2ResourcesUsed.toFixed(2)),
    oversRemaining: Number(oversRemaining.toFixed(3)),
    revisedFullTarget,
  };
}

/**
 * Extracts match state and computes dynamic DLS calculation for live chase.
 */
export function calculateMatchLiveDLS(match: {
  format: string;
  totalOvers: number;
  currentInningsIndex: number;
  innings: Array<{
    runs: number;
    wickets: number;
    legalBalls: number;
    oversFormatted: string;
    isCompleted?: boolean;
  }>;
}): DLSResult | null {
  if (match.format === 'Test' || match.currentInningsIndex !== 1) {
    return null;
  }

  const firstInn = match.innings[0];
  const secondInn = match.innings[1];
  if (!firstInn || !secondInn || firstInn.runs === undefined) {
    return null;
  }

  // Total overs bowled in decimal
  const oversDecimal = secondInn.legalBalls / 6;

  return calculateDLS({
    totalOvers: match.totalOvers || (match.format === 'T20' ? 20 : 50),
    team1TotalRuns: firstInn.runs,
    team1OversFaced: firstInn.legalBalls / 6,
    team2OversBatted: oversDecimal,
    team2WicketsLost: secondInn.wickets || 0,
    team2CurrentRuns: secondInn.runs || 0,
  });
}
