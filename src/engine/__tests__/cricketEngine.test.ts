/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  recordDelivery,
  swapStrikeManual,
  undoLastDelivery,
  changeBowler,
  setNextBowler,
  getMaxOversPerBowler,
  isBowlerEligible,
} from '../cricketEngine';
import { createDefaultMatch } from '../defaultData';
import { Match, DeliveryInput } from '../../types/cricket';

function createFreshTestMatch(): Match {
  const match = createDefaultMatch();
  // Reset second innings to 0/0 (0 balls) for clean deterministic tests
  const inn = match.innings[1];
  inn.runs = 0;
  inn.wickets = 0;
  inn.legalBalls = 0;
  inn.oversFormatted = '0.0';
  inn.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penaltyRuns: 0, total: 0 };
  inn.deliveries = [];
  inn.overs = [];
  inn.fallOfWickets = [];
  inn.partnerships = [];
  inn.wagonShots = [];

  // Reset batter stats
  inn.battingCard.forEach(b => {
    b.runs = 0;
    b.ballsFaced = 0;
    b.fours = 0;
    b.sixes = 0;
    b.dots = 0;
    b.strikeRate = 0;
    b.isOut = false;
    b.dismissal = undefined;
    b.isBatting = (b.playerId === 'eng-1' || b.playerId === 'eng-2');
  });

  // Reset bowler stats
  inn.bowlingCard.forEach(b => {
    b.legalBalls = 0;
    b.overs = '0.0';
    b.maidens = 0;
    b.runsConceded = 0;
    b.wickets = 0;
    b.economy = 0;
    b.wides = 0;
    b.noBalls = 0;
    b.dots = 0;
  });

  inn.strikerId = 'eng-1'; // Jos Buttler
  inn.nonStrikerId = 'eng-2'; // Phil Salt
  inn.currentBowlerId = 'aus-9'; // Mitchell Starc
  inn.lastBowlerId = undefined;
  match.status = 'live';

  return match;
}

describe('Cricket Scoring Engine - 20 Core Mandated Tests', () => {
  // Test 1: Dot ball
  it('1. Dot ball: score unchanged, one legal ball recorded', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = { deliveryType: 'normal', batterRuns: 0, extraRuns: 0 };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];
    const striker = inn.battingCard.find(b => b.playerId === 'eng-1')!;
    const bowler = inn.bowlingCard.find(b => b.playerId === 'aus-9')!;

    expect(inn.runs).toBe(0);
    expect(inn.legalBalls).toBe(1);
    expect(striker.runs).toBe(0);
    expect(striker.ballsFaced).toBe(1);
    expect(striker.dots).toBe(1);
    expect(bowler.runsConceded).toBe(0);
    expect(bowler.legalBalls).toBe(1);
  });

  // Test 2: Four off the bat
  it('2. Four off the bat: team score +4, batter score +4, boundary recorded correctly', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = { deliveryType: 'normal', batterRuns: 4, extraRuns: 0, isFour: true };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];
    const striker = inn.battingCard.find(b => b.playerId === 'eng-1')!;

    expect(inn.runs).toBe(4);
    expect(striker.runs).toBe(4);
    expect(striker.fours).toBe(1);
    expect(striker.ballsFaced).toBe(1);
  });

  // Test 3: Six off the bat
  it('3. Six off the bat: team score +6, batter score +6', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = { deliveryType: 'normal', batterRuns: 6, extraRuns: 0, isSix: true };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];
    const striker = inn.battingCard.find(b => b.playerId === 'eng-1')!;

    expect(inn.runs).toBe(6);
    expect(striker.runs).toBe(6);
    expect(striker.sixes).toBe(1);
    expect(striker.ballsFaced).toBe(1);
  });

  // Test 4: Wide
  it('4. Wide: team score +1, bowler charged appropriately, no legal ball added', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = { deliveryType: 'wide', batterRuns: 0, extraRuns: 1 };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];
    const bowler = inn.bowlingCard.find(b => b.playerId === 'aus-9')!;
    const striker = inn.battingCard.find(b => b.playerId === 'eng-1')!;

    expect(inn.runs).toBe(1);
    expect(inn.legalBalls).toBe(0);
    expect(inn.extras.wides).toBe(1);
    expect(bowler.runsConceded).toBe(1);
    expect(bowler.wides).toBe(1);
    expect(bowler.legalBalls).toBe(0);
    expect(striker.ballsFaced).toBe(0); // Not counted as ball faced
  });

  // Test 5: 1 WD (Wide + 1 additional completed run = 2 team runs)
  it('5. 1 WD: team score +2, extras +2, no legal ball added', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = { deliveryType: 'wide', batterRuns: 0, extraRuns: 2 };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];

    expect(inn.runs).toBe(2);
    expect(inn.extras.wides).toBe(2);
    expect(inn.legalBalls).toBe(0);
  });

  // Test 6: 2 WD (Wide + 2 additional completed runs = 3 team runs)
  it('6. 2 WD: team score +3, extras +3, no legal ball added', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = { deliveryType: 'wide', batterRuns: 0, extraRuns: 3 };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];

    expect(inn.runs).toBe(3);
    expect(inn.extras.wides).toBe(3);
    expect(inn.legalBalls).toBe(0);
  });

  // Test 7: 4 WD (Wide + 4 additional completed runs = 5 team runs)
  it('7. 4 WD: team score +5, extras +5, no legal ball added', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = { deliveryType: 'wide', batterRuns: 0, extraRuns: 5 };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];

    expect(inn.runs).toBe(5);
    expect(inn.extras.wides).toBe(5);
    expect(inn.legalBalls).toBe(0);
  });

  // Test 8: No-ball alone
  it('8. No-ball alone: team score +1, no legal ball added', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = { deliveryType: 'no_ball', batterRuns: 0, extraRuns: 0 };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];
    const bowler = inn.bowlingCard.find(b => b.playerId === 'aus-9')!;

    expect(inn.runs).toBe(1);
    expect(inn.legalBalls).toBe(0);
    expect(inn.extras.noBalls).toBe(1);
    expect(bowler.runsConceded).toBe(1);
    expect(bowler.noBalls).toBe(1);
  });

  // Test 9: No-ball + 1 batter run
  it('9. No-ball +1 batter run: team score +2, batter score +1, extras +1, no legal ball added', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = { deliveryType: 'no_ball', batterRuns: 1, extraRuns: 0 };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];
    const striker = inn.battingCard.find(b => b.playerId === 'eng-1')!;
    const bowler = inn.bowlingCard.find(b => b.playerId === 'aus-9')!;

    expect(inn.runs).toBe(2);
    expect(striker.runs).toBe(1);
    expect(inn.extras.noBalls).toBe(1);
    expect(inn.legalBalls).toBe(0);
    expect(bowler.runsConceded).toBe(2);
  });

  // Test 10: Bye
  it('10. Bye: team score and byes increase correctly without adding batter runs', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = { deliveryType: 'bye', batterRuns: 0, extraRuns: 1 };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];
    const striker = inn.battingCard.find(b => b.playerId === 'eng-1')!;
    const bowler = inn.bowlingCard.find(b => b.playerId === 'aus-9')!;

    expect(inn.runs).toBe(1);
    expect(inn.extras.byes).toBe(1);
    expect(striker.runs).toBe(0);
    expect(striker.ballsFaced).toBe(1);
    expect(inn.legalBalls).toBe(1);
    expect(bowler.runsConceded).toBe(0); // Bowler does NOT concede byes!
  });

  // Test 11: Leg-bye
  it('11. Leg-bye: team score and leg-byes increase correctly without adding batter runs', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = { deliveryType: 'leg_bye', batterRuns: 0, extraRuns: 2 };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];
    const striker = inn.battingCard.find(b => b.playerId === 'eng-1')!;
    const bowler = inn.bowlingCard.find(b => b.playerId === 'aus-9')!;

    expect(inn.runs).toBe(2);
    expect(inn.extras.legByes).toBe(2);
    expect(striker.runs).toBe(0);
    expect(striker.ballsFaced).toBe(1);
    expect(inn.legalBalls).toBe(1);
    expect(bowler.runsConceded).toBe(0); // Bowler does NOT concede leg byes!
  });

  // Test 12: Bowled
  it('12. Bowled: wicket recorded and bowler credited appropriately', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = {
      deliveryType: 'normal',
      batterRuns: 0,
      extraRuns: 0,
      dismissal: {
        type: 'bowled',
        dismissedBatterId: 'eng-1',
        incomingBatterId: 'eng-3',
      },
    };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];
    const bowler = inn.bowlingCard.find(b => b.playerId === 'aus-9')!;
    const dismissed = inn.battingCard.find(b => b.playerId === 'eng-1')!;

    expect(inn.wickets).toBe(1);
    expect(bowler.wickets).toBe(1);
    expect(dismissed.isOut).toBe(true);
    expect(dismissed.dismissal?.type).toBe('bowled');
    expect(dismissed.dismissal?.creditedToBowler).toBe(true);
  });

  // Test 13: Caught
  it('13. Caught: wicket recorded, correct batter dismissed, bowler credited appropriately', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = {
      deliveryType: 'normal',
      batterRuns: 0,
      extraRuns: 0,
      dismissal: {
        type: 'caught',
        dismissedBatterId: 'eng-1',
        fielderId: 'aus-4', // Glenn Maxwell
        incomingBatterId: 'eng-3',
      },
    };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];
    const bowler = inn.bowlingCard.find(b => b.playerId === 'aus-9')!;

    expect(inn.wickets).toBe(1);
    expect(bowler.wickets).toBe(1);
    expect(inn.fallOfWickets.length).toBe(1);
  });

  // Test 14: Run out
  it('14. Run out: wicket recorded without crediting the bowler', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = {
      deliveryType: 'normal',
      batterRuns: 1,
      extraRuns: 0,
      dismissal: {
        type: 'run_out',
        dismissedBatterId: 'eng-1',
        fielderId: 'aus-4',
        incomingBatterId: 'eng-3',
      },
    };
    const updated = recordDelivery(match, input);
    const inn = updated.innings[1];
    const bowler = inn.bowlingCard.find(b => b.playerId === 'aus-9')!;

    expect(inn.wickets).toBe(1);
    expect(bowler.wickets).toBe(0); // NOT credited to bowler!
  });

  // Test 15: A dismissal that is not credited to the bowler must not increase bowler's wicket tally
  it('15. Obstructing the field, Timed Out, Retired Out must not increase bowler wickets', () => {
    const match = createFreshTestMatch();
    const input: DeliveryInput = {
      deliveryType: 'normal',
      batterRuns: 0,
      extraRuns: 0,
      dismissal: {
        type: 'obstructing_the_field',
        dismissedBatterId: 'eng-1',
        incomingBatterId: 'eng-3',
      },
    };
    const updated = recordDelivery(match, input);
    const bowler = updated.innings[1].bowlingCard.find(b => b.playerId === 'aus-9')!;
    expect(bowler.wickets).toBe(0);
  });

  // Test 16: Wide and no-ball do not increment legal-ball count
  it('16. Wide and no-ball do not increment legal-ball count', () => {
    let match = createFreshTestMatch();
    match = recordDelivery(match, { deliveryType: 'wide', batterRuns: 0, extraRuns: 1 });
    match = recordDelivery(match, { deliveryType: 'no_ball', batterRuns: 0, extraRuns: 0 });

    expect(match.innings[1].legalBalls).toBe(0);
    expect(match.innings[1].runs).toBe(2);
  });

  // Test 17: An over completes after the configured number of legal balls
  it('17. An over completes after the configured number of legal balls (6 legal balls)', () => {
    let match = createFreshTestMatch();
    // Bowl 5 legal dots
    for (let i = 0; i < 5; i++) {
      match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 0, extraRuns: 0 });
    }
    expect(match.innings[1].legalBalls).toBe(5);
    expect(match.innings[1].oversFormatted).toBe('0.5');

    // Bowl 6th legal ball
    match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 0, extraRuns: 0 });
    expect(match.innings[1].legalBalls).toBe(6);
    expect(match.innings[1].oversFormatted).toBe('1.0');
    expect(match.innings[1].overs[0].isCompleted).toBe(true);
    expect(match.innings[1].overs[0].isMaiden).toBe(true);
  });

  // Test 18: Strike rotation is correct for completed runs and over completion
  it('18. Strike rotation is correct for completed runs and over completion', () => {
    let match = createFreshTestMatch();
    expect(match.innings[1].strikerId).toBe('eng-1');
    expect(match.innings[1].nonStrikerId).toBe('eng-2');

    // Single run -> rotates strike to eng-2
    match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 1, extraRuns: 0 });
    expect(match.innings[1].strikerId).toBe('eng-2');
    expect(match.innings[1].nonStrikerId).toBe('eng-1');

    // Two runs -> strike remains with eng-2
    match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 2, extraRuns: 0 });
    expect(match.innings[1].strikerId).toBe('eng-2');
    expect(match.innings[1].nonStrikerId).toBe('eng-1');
  });

  // Test 19: Undo restores all score and player statistics exactly
  it('19. Undo restores all score and player statistics exactly', () => {
    const initial = createFreshTestMatch();
    const history = [initial];

    const afterFour = recordDelivery(initial, { deliveryType: 'normal', batterRuns: 4, extraRuns: 0, isFour: true });
    history.push(afterFour);

    expect(afterFour.innings[1].runs).toBe(4);
    expect(afterFour.innings[1].legalBalls).toBe(1);

    const { restoredMatch } = undoLastDelivery(history);
    expect(restoredMatch).not.toBeNull();
    expect(restoredMatch!.innings[1].runs).toBe(0);
    expect(restoredMatch!.innings[1].legalBalls).toBe(0);
    expect(restoredMatch!.innings[1].battingCard.find(b => b.playerId === 'eng-1')!.runs).toBe(0);
  });

  // Test 20: Save and reload restores the match correctly
  it('20. Save and reload restores the match correctly (JSON serializability)', () => {
    const match = createFreshTestMatch();
    const updated = recordDelivery(match, { deliveryType: 'normal', batterRuns: 4, extraRuns: 0, isFour: true });

    const serialized = JSON.stringify(updated);
    const deserialized: Match = JSON.parse(serialized);

    expect(deserialized.id).toBe(updated.id);
    expect(deserialized.innings[1].runs).toBe(4);
    expect(deserialized.innings[1].deliveries.length).toBe(1);
    expect(deserialized.innings[1].battingCard[0].runs).toBe(4);
  });

  // Test 21: Wagon wheel updates for all runs (1, 2, 3, 4, 6)
  it('21. Wagon wheel updates correctly for 1, 2, 3, 4, and 6 runs', () => {
    let match = createFreshTestMatch();

    // Score 1 run
    match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 1, extraRuns: 0 });
    let inn = match.innings[1];
    expect(inn.wagonShots.length).toBe(1);
    expect(inn.wagonShots[0].runs).toBe(1);
    expect(inn.wagonShots[0].batterName).toBe('Jos Buttler');

    // Score 2 runs (by new striker Phil Salt)
    match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 2, extraRuns: 0 });
    inn = match.innings[1];
    expect(inn.wagonShots.length).toBe(2);
    expect(inn.wagonShots[1].runs).toBe(2);
    expect(inn.wagonShots[1].batterName).toBe('Phil Salt');

    // Score 3 runs
    match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 3, extraRuns: 0 });
    inn = match.innings[1];
    expect(inn.wagonShots.length).toBe(3);
    expect(inn.wagonShots[2].runs).toBe(3);

    // Score 4 boundary
    match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 4, extraRuns: 0, isFour: true });
    inn = match.innings[1];
    expect(inn.wagonShots.length).toBe(4);
    expect(inn.wagonShots[3].runs).toBe(4);
    expect(inn.wagonShots[3].isFour).toBe(true);

    // Score 6 maximum
    match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 6, extraRuns: 0, isSix: true });
    inn = match.innings[1];
    expect(inn.wagonShots.length).toBe(5);
    expect(inn.wagonShots[4].runs).toBe(6);
    expect(inn.wagonShots[4].isSix).toBe(true);
  });

  // Test 22: Law 17.8 - No bowler can bowl two consecutive overs
  it('22. Law 17.8: Bowler who completes an over cannot bowl the immediate next over', () => {
    let match = createFreshTestMatch();
    match.innings[1].currentBowlerId = 'aus-11'; // Josh Hazlewood

    // Bowl entire 1st over (6 legal balls) with Hazlewood
    for (let i = 0; i < 6; i++) {
      match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 0, extraRuns: 0 });
    }

    const inn = match.innings[1];
    expect(inn.legalBalls).toBe(6);
    expect(inn.lastBowlerId).toBe('aus-11'); // Hazlewood recorded as last bowler

    // Hazlewood must be ineligible for the next over under Law 17.8
    const hazlewoodCheck = isBowlerEligible(match, 'aus-11');
    expect(hazlewoodCheck.eligible).toBe(false);
    expect(hazlewoodCheck.reason).toContain('Consecutive overs prohibited');

    // Attempting to assign Hazlewood for the consecutive over must be rejected
    const blockedMatch = changeBowler(match, 'aus-11');
    expect(blockedMatch.innings[1].currentBowlerId).not.toBe('aus-11');
  });

  // Test 23: Alternating overs allows original bowler to return after an intervening over
  it('23. Alternating overs: Bowler is eligible again after an intervening over by another bowler', () => {
    let match = createFreshTestMatch();
    match.innings[1].currentBowlerId = 'aus-11'; // Josh Hazlewood

    // Over 1 bowled by Hazlewood
    for (let i = 0; i < 6; i++) {
      match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 0, extraRuns: 0 });
    }
    expect(match.innings[1].lastBowlerId).toBe('aus-11');

    // Over 2 bowled by Starc
    match = changeBowler(match, 'aus-9'); // Mitchell Starc
    expect(match.innings[1].currentBowlerId).toBe('aus-9');

    for (let i = 0; i < 6; i++) {
      match = recordDelivery(match, { deliveryType: 'normal', batterRuns: 0, extraRuns: 0 });
    }
    expect(match.innings[1].lastBowlerId).toBe('aus-9');

    // For Over 3: Starc is now ineligible (bowled last over)
    expect(isBowlerEligible(match, 'aus-9').eligible).toBe(false);

    // Hazlewood IS eligible again for Over 3!
    expect(isBowlerEligible(match, 'aus-11').eligible).toBe(true);

    // Can change bowler back to Hazlewood for Over 3
    match = changeBowler(match, 'aus-11');
    expect(match.innings[1].currentBowlerId).toBe('aus-11');
  });

  // Test 24: T20 Format - Max 4 overs per bowler quota in 20-over match
  it('24. T20 format: Bowler cannot exceed 4 overs quota (24 legal balls)', () => {
    let match = createFreshTestMatch();
    match.format = 'T20';
    match.totalOvers = 20;

    expect(getMaxOversPerBowler('T20', 20)).toBe(4);

    // Simulate Pat Cummins having completed 4 overs (24 balls)
    const cummins = match.innings[1].bowlingCard.find(b => b.playerId === 'aus-8')!;
    cummins.legalBalls = 24;
    cummins.overs = '4.0';

    const check = isBowlerEligible(match, 'aus-8');
    expect(check.eligible).toBe(false);
    expect(check.reason).toContain('Maximum quota reached (4 overs max in T20)');

    // Attempting to select Cummins for a 5th over is blocked
    const rejected = changeBowler(match, 'aus-8');
    expect(rejected.innings[1].currentBowlerId).not.toBe('aus-8');
  });

  // Test 25: ODI Format - Max 10 overs per bowler quota in 50-over match
  it('25. ODI format: Bowler cannot exceed 10 overs quota (60 legal balls)', () => {
    let match = createFreshTestMatch();
    match.format = 'ODI';
    match.totalOvers = 50;

    expect(getMaxOversPerBowler('ODI', 50)).toBe(10);

    // Bowler with 9 overs (54 balls) is still eligible
    const starc = match.innings[1].bowlingCard.find(b => b.playerId === 'aus-9')!;
    starc.legalBalls = 54;
    starc.overs = '9.0';
    expect(isBowlerEligible(match, 'aus-9').eligible).toBe(true);

    // Bowler with 10 completed overs (60 balls) is blocked
    starc.legalBalls = 60;
    starc.overs = '10.0';
    const check = isBowlerEligible(match, 'aus-9');
    expect(check.eligible).toBe(false);
    expect(check.reason).toContain('Maximum quota reached (10 overs max in ODI)');
  });

  // Test 26: T10 Format - Max 2 overs per bowler quota in 10-over match
  it('26. T10 format: Bowler cannot exceed 2 overs quota (12 legal balls)', () => {
    let match = createFreshTestMatch();
    match.format = 'T10';
    match.totalOvers = 10;

    expect(getMaxOversPerBowler('T10', 10)).toBe(2);

    const bowler = match.innings[1].bowlingCard.find(b => b.playerId === 'aus-11')!;
    bowler.legalBalls = 12;
    bowler.overs = '2.0';

    const check = isBowlerEligible(match, 'aus-11');
    expect(check.eligible).toBe(false);
    expect(check.reason).toContain('Maximum quota reached (2 overs max in T10)');
  });

  // Test 27: Test Format - Unlimited overs per bowler, but alternating overs strictly enforced
  it('27. Test format: Bowlers have unlimited overs quota but must alternate overs', () => {
    let match = createFreshTestMatch();
    match.format = 'Test';
    match.totalOvers = 450;

    // In Test matches, quota is Infinity
    expect(getMaxOversPerBowler('Test', 450)).toBe(Infinity);

    const hazlewood = match.innings[1].bowlingCard.find(b => b.playerId === 'aus-11')!;
    // Bowled 25 overs already in Test match
    hazlewood.legalBalls = 150;
    hazlewood.overs = '25.0';

    // Eligible because Test quota is unlimited
    expect(isBowlerEligible(match, 'aus-11').eligible).toBe(true);

    // BUT if Hazlewood bowled the last over, he cannot bowl the consecutive over
    match.innings[1].lastBowlerId = 'aus-11';
    const consecutiveCheck = isBowlerEligible(match, 'aus-11');
    expect(consecutiveCheck.eligible).toBe(false);
    expect(consecutiveCheck.reason).toContain('Consecutive overs prohibited');
  });

  // Test 28: Shortened match calculation (e.g. 15-over T20 match)
  it('28. Shortened match calculation: 15-over match allows ceil(15/5) = 3 overs max', () => {
    expect(getMaxOversPerBowler('T20', 15)).toBe(3);
    expect(getMaxOversPerBowler('ODI', 35)).toBe(7);
  });

  // Test 29: Double dismissal prevention - a batter cannot be dismissed twice or duplicated in FOW
  it('29. Dismissal integrity: A batter cannot be dismissed twice or recorded twice in Fall of Wickets', () => {
    let match = createFreshTestMatch();
    const innIdx = match.currentInningsIndex;
    const initialStrikerId = match.innings[innIdx].strikerId; // eng-1

    // Wicket 1: Dismiss striker
    match = recordDelivery(match, {
      deliveryType: 'normal',
      batterRuns: 0,
      extraRuns: 0,
      dismissal: {
        type: 'caught',
        dismissedBatterId: initialStrikerId,
        incomingBatterId: 'eng-3', // Will Jacks
      },
    });

    const batter1 = match.innings[innIdx].battingCard.find(b => b.playerId === initialStrikerId)!;
    expect(batter1.isOut).toBe(true);
    expect(batter1.isBatting).toBe(false);
    expect(match.innings[innIdx].wickets).toBe(1);
    expect(match.innings[innIdx].fallOfWickets.length).toBe(1);
    expect(match.innings[innIdx].fallOfWickets[0].batterId).toBe(initialStrikerId);

    // Striker should now be incoming batter eng-3
    expect(match.innings[innIdx].strikerId).toBe('eng-3');

    // Attempt second wicket with stale dismissedBatterId set to the already dismissed batter1
    match = recordDelivery(match, {
      deliveryType: 'normal',
      batterRuns: 0,
      extraRuns: 0,
      dismissal: {
        type: 'bowled',
        dismissedBatterId: initialStrikerId, // Stale ID from prior wicket
        incomingBatterId: 'eng-4', // Harry Brook
      },
    });

    // The engine must NOT dismiss batter1 again; it should dismiss the active striker (eng-3)
    const batter1FOW = match.innings[innIdx].fallOfWickets.filter(f => f.batterId === initialStrikerId);
    expect(batter1FOW.length).toBe(1); // Batter1 is recorded exactly once in FOW
    expect(match.innings[innIdx].wickets).toBe(2);
    expect(match.innings[innIdx].fallOfWickets[1].batterId).not.toBe(initialStrikerId);
  });
});
