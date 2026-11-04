/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDLS,
  getDLSResource,
  parseOversToDecimal,
  calculateMatchLiveDLS,
} from '../dlsEngine';

describe('Duckworth-Lewis-Stern (DLS) Engine Tests', () => {
  it('1. Correctly calculates user reported scenario: 50 ov match, 186 total, 10.5 ov, 54/1', () => {
    // 50 over match, 1st innings total 186
    // Team 2 has scored 54 runs in 10.5 overs, losing 1 wicket
    const result = calculateDLS({
      totalOvers: 50,
      team1TotalRuns: 186,
      team1OversFaced: 50,
      team2OversBatted: '10.5',
      team2WicketsLost: 1,
      team2CurrentRuns: 54,
    });

    // Par score should be ~31 runs (NOT 1 run as previously bugged)
    expect(result.parScore).toBe(31);
    expect(result.winningTarget).toBe(32);
    expect(result.currentRuns).toBe(54);
    // Team 2 is ahead of par by 23 runs
    expect(result.runDifferential).toBe(23);
    expect(result.status).toBe('ahead');
    expect(result.statusDescription).toContain('Ahead of DLS Par by 23 runs');
    expect(result.team2ResourcesUsed).toBeGreaterThan(15);
    expect(result.team2ResourcesUsed).toBeLessThan(18);
  });

  it('2. Resource percentage decreases as wickets fall for same overs batted', () => {
    // 10.5 overs bowled in 50 ov match (39.167 overs left)
    const res1Wicket = getDLSResource(39.167, 1);
    const res3Wickets = getDLSResource(39.167, 3);
    const res6Wickets = getDLSResource(39.167, 6);
    const res9Wickets = getDLSResource(39.167, 9);
    const res10Wickets = getDLSResource(39.167, 10);

    // More wickets lost = less resources remaining
    expect(res1Wicket).toBeGreaterThan(res3Wickets);
    expect(res3Wickets).toBeGreaterThan(res6Wickets);
    expect(res6Wickets).toBeGreaterThan(res9Wickets);
    expect(res10Wickets).toBe(0);
  });

  it('3. Par score increases when more wickets are lost (penalizes wicket loss)', () => {
    const result1W = calculateDLS({
      totalOvers: 50,
      team1TotalRuns: 186,
      team2OversBatted: 10.5,
      team2WicketsLost: 1,
      team2CurrentRuns: 54,
    });

    const result5W = calculateDLS({
      totalOvers: 50,
      team1TotalRuns: 186,
      team2OversBatted: 10.5,
      team2WicketsLost: 5,
      team2CurrentRuns: 54,
    });

    // If 5 wickets lost, team 2 used up far more resources, so par score must be higher!
    expect(result5W.parScore).toBeGreaterThan(result1W.parScore);
    expect(result5W.status).toBe('behind');
  });

  it('4. Format scaling: T20 match (20 overs) DLS calculations', () => {
    // 20-over match, 1st innings 160
    // Team 2 at 10.0 overs (10 overs left), 2 wickets down, 80 runs scored
    const result = calculateDLS({
      totalOvers: 20,
      team1TotalRuns: 160,
      team2OversBatted: 10.0,
      team2WicketsLost: 2,
      team2CurrentRuns: 80,
    });

    expect(result.parScore).toBeGreaterThan(60);
    expect(result.parScore).toBeLessThan(85);
    expect(result.winningTarget).toBe(result.parScore + 1);
  });

  it('5. Correctly parses fractional overs in string and number formats', () => {
    expect(parseOversToDecimal('10.0')).toBeCloseTo(10.0);
    expect(parseOversToDecimal('10.3')).toBeCloseTo(10.5); // 3 balls = 0.5 overs
    expect(parseOversToDecimal('10.5')).toBeCloseTo(10.833, 2); // 5 balls = 5/6 = 0.833
    expect(parseOversToDecimal(10.5)).toBeCloseTo(10.833, 2);
  });

  it('6. calculateMatchLiveDLS integrates live match state seamlessly', () => {
    const liveMatch = {
      format: 'ODI',
      totalOvers: 50,
      currentInningsIndex: 1,
      innings: [
        {
          runs: 186,
          wickets: 10,
          legalBalls: 300,
          oversFormatted: '50.0',
        },
        {
          runs: 54,
          wickets: 1,
          legalBalls: 65, // 10.5 overs = 10 * 6 + 5 = 65 balls
          oversFormatted: '10.5',
        },
      ],
    };

    const liveDls = calculateMatchLiveDLS(liveMatch);
    expect(liveDls).not.toBeNull();
    expect(liveDls?.parScore).toBe(31);
    expect(liveDls?.runDifferential).toBe(23);
    expect(liveDls?.status).toBe('ahead');
  });

  it('7. Returns null for Test matches or 1st innings', () => {
    expect(
      calculateMatchLiveDLS({
        format: 'Test',
        totalOvers: 90,
        currentInningsIndex: 1,
        innings: [
          { runs: 200, wickets: 10, legalBalls: 300, oversFormatted: '50.0' },
          { runs: 50, wickets: 1, legalBalls: 60, oversFormatted: '10.0' },
        ],
      })
    ).toBeNull();

    expect(
      calculateMatchLiveDLS({
        format: 'ODI',
        totalOvers: 50,
        currentInningsIndex: 0,
        innings: [
          { runs: 186, wickets: 2, legalBalls: 120, oversFormatted: '20.0' },
          { runs: 0, wickets: 0, legalBalls: 0, oversFormatted: '0.0' },
        ],
      })
    ).toBeNull();
  });
});
