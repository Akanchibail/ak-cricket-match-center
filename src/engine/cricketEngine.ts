/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Match,
  Innings,
  DeliveryInput,
  Delivery,
  OverSummary,
  BatterStats,
  BowlerStats,
  DismissalInfo,
  DismissalType,
  FallOfWicket,
  Partnership,
  WagonShot,
  MatchResult,
  MatchFormat,
  Player,
} from '../types/cricket';

export function formatOvers(legalBalls: number, ballsPerOver: number = 6): string {
  const completedOvers = Math.floor(legalBalls / ballsPerOver);
  const ballsInCurrent = legalBalls % ballsPerOver;
  return `${completedOvers}.${ballsInCurrent}`;
}

export function calculateOversNumber(legalBalls: number, ballsPerOver: number = 6): number {
  const completedOvers = Math.floor(legalBalls / ballsPerOver);
  const ballsInCurrent = legalBalls % ballsPerOver;
  return completedOvers + ballsInCurrent / 10;
}

export function isDismissalCreditedToBowler(type: DismissalType): boolean {
  switch (type) {
    case 'bowled':
    case 'caught':
    case 'lbw':
    case 'stumped':
    case 'hit_wicket':
      return true;
    case 'run_out':
    case 'obstructing_the_field':
    case 'hit_the_ball_twice':
    case 'timed_out':
    case 'retired_out':
    case 'retired_hurt':
    case 'retired_not_out':
      return false;
  }
}

export function isWicketCountIncremented(type: DismissalType): boolean {
  return type !== 'retired_hurt' && type !== 'retired_not_out';
}

export function getDismissalDescription(
  type: DismissalType,
  bowlerName?: string,
  fielderName?: string
): string {
  switch (type) {
    case 'bowled':
      return `b ${bowlerName || 'Bowler'}`;
    case 'caught':
      if (fielderName && fielderName.toLowerCase().includes('bowler') || fielderName === bowlerName) {
        return `c & b ${bowlerName || 'Bowler'}`;
      }
      return `c ${fielderName || 'Fielder'} b ${bowlerName || 'Bowler'}`;
    case 'lbw':
      return `lbw b ${bowlerName || 'Bowler'}`;
    case 'stumped':
      return `st ${fielderName || 'Wk'} b ${bowlerName || 'Bowler'}`;
    case 'hit_wicket':
      return `hit wicket b ${bowlerName || 'Bowler'}`;
    case 'run_out':
      return fielderName ? `run out (${fielderName})` : 'run out';
    case 'obstructing_the_field':
      return 'obstructing the field';
    case 'hit_the_ball_twice':
      return 'hit ball twice';
    case 'timed_out':
      return 'timed out';
    case 'retired_out':
      return 'retired out';
    case 'retired_hurt':
      return 'retired hurt';
    case 'retired_not_out':
      return 'retired not out';
  }
}

export function cloneMatch(match: Match): Match {
  return JSON.parse(JSON.stringify(match));
}

/**
 * Calculate max overs allowed per bowler based on match format and total match overs
 * Official Rules:
 * - Test / First-Class: Unlimited overs per bowler (strict alternating overs required under Law 17.8)
 * - T20: Max 4 overs in standard 20-over match (or ceil(totalOvers / 5) for shortened matches)
 * - ODI: Max 10 overs in standard 50-over match (or ceil(totalOvers / 5) for shortened matches)
 * - T10: Max 2 overs in standard 10-over match
 * - The Hundred: Max 20 balls (4 overs/sets of 5 balls)
 * - Custom / Limited overs: ceil(totalOvers / 5) if totalOvers > 0, else Infinity
 */
export function getMaxOversPerBowler(format: MatchFormat, totalOvers: number): number {
  if (format === 'Test') {
    return Infinity;
  }
  if (format === 'The Hundred') {
    return 4; // 20 balls max
  }
  if (format === 'T10') {
    return 2;
  }
  if (format === 'T20') {
    return Math.max(1, Math.ceil(totalOvers / 5)); // Standard 4 for 20 ov
  }
  if (format === 'ODI') {
    return Math.max(1, Math.ceil(totalOvers / 5)); // Standard 10 for 50 ov
  }
  if (totalOvers > 0) {
    return Math.max(1, Math.ceil(totalOvers / 5));
  }
  return Infinity;
}

/**
 * Validate whether a bowler is eligible to bowl the next over
 * Rules enforced:
 * 1. Law 17.8: No bowler can bowl two consecutive overs in the same innings.
 * 2. Format Over Limit: Bowler cannot exceed their format-specific quota.
 * 3. Law 24.2: Substitute fielders cannot bowl.
 */
export function isBowlerEligible(
  match: Match,
  bowlerId: string,
  inningsIndex?: number
): { eligible: boolean; reason?: string } {
  const innIndex = inningsIndex !== undefined ? inningsIndex : match.currentInningsIndex;
  const innings = match.innings[innIndex];
  if (!innings) return { eligible: true };

  // Rule 1: Alternating overs (Law 17.8) - Cannot bowl consecutive overs
  // Check against innings.lastBowlerId
  if (innings.lastBowlerId && bowlerId === innings.lastBowlerId) {
    return {
      eligible: false,
      reason: 'Consecutive overs prohibited (Law 17.8: Bowler must alternate overs)',
    };
  }

  // Rule 2: Substitute check (Law 24.2)
  const fieldingTeam = match.team1.id === innings.bowlingTeamId ? match.team1 : match.team2;
  const player = fieldingTeam?.players.find(p => p.id === bowlerId);
  if (player?.isSubstitute) {
    return {
      eligible: false,
      reason: 'Substitute fielders are not permitted to bowl (Law 24.2)',
    };
  }

  // Rule 3: Format Max Overs Quota
  const maxOvers = getMaxOversPerBowler(match.format, match.totalOvers);
  if (maxOvers !== Infinity) {
    const ballsPerOver = match.ballsPerOver || 6;
    const bowlerStats = innings.bowlingCard.find(b => b.playerId === bowlerId);
    const legalBallsBowled = bowlerStats?.legalBalls || 0;
    if (legalBallsBowled >= maxOvers * ballsPerOver) {
      return {
        eligible: false,
        reason: `Maximum quota reached (${maxOvers} overs max in ${match.format})`,
      };
    }
  }

  return { eligible: true };
}

/**
 * Get the list of all fielding team players with their bowling eligibility status
 */
export function getEligibleBowlers(
  match: Match,
  inningsIndex?: number
): { player: Player; eligible: boolean; reason?: string; oversBowled: string; maxOvers: number }[] {
  const innIndex = inningsIndex !== undefined ? inningsIndex : match.currentInningsIndex;
  const innings = match.innings[innIndex];
  if (!innings) return [];

  const fieldingTeam = match.team1.id === innings.bowlingTeamId ? match.team1 : match.team2;
  const maxOvers = getMaxOversPerBowler(match.format, match.totalOvers);

  return (fieldingTeam?.players || [])
    .filter(p => !p.isSubstitute)
    .map(player => {
      const stats = innings.bowlingCard.find(b => b.playerId === player.id);
      const check = isBowlerEligible(match, player.id, innIndex);
      return {
        player,
        eligible: check.eligible,
        reason: check.reason,
        oversBowled: stats ? stats.overs : '0.0',
        maxOvers,
      };
    });
}

/**
 * Ensures an innings has an initialized, complete, and accurate partnerships list.
 * If partnerships are empty or missing, it reconstructs them from fallOfWickets and battingCard.
 * Ensures the currently active partnership (if innings is live) is present with isCurrent: true.
 */
export function ensureInningsPartnerships(innings: Innings): Partnership[] {
  if (!innings) return [];

  const fows = innings.fallOfWickets || [];
  const battingCard = innings.battingCard || [];
  const existingPartnerships = innings.partnerships || [];

  if (innings.extras) {
    innings.extras.total = (innings.extras.wides || 0) + (innings.extras.noBalls || 0) + (innings.extras.byes || 0) + (innings.extras.legByes || 0) + (innings.extras.penaltyRuns || 0);
  }

  // If already populated with at least fallOfWickets.length + (live ? 1 : 0), return
  if (existingPartnerships.length >= fows.length + (innings.isCompleted ? 0 : 1) && existingPartnerships.length > 0) {
    if (!innings.isCompleted && !existingPartnerships.some(p => p.isCurrent)) {
      existingPartnerships[existingPartnerships.length - 1].isCurrent = true;
    }
    return existingPartnerships;
  }

  const partnerships: Partnership[] = [];
  let prevScore = 0;
  let prevBalls = 0;

  // Reconstruct completed partnerships from Fall of Wickets
  fows.forEach((fow) => {
    const existing = existingPartnerships.find(p => p.wicketNumber === fow.wicketNumber);
    if (existing) {
      partnerships.push(existing);
      prevScore = fow.teamRuns;
      return;
    }

    const partnerRuns = Math.max(0, fow.teamRuns - prevScore);
    const dismissedBatter = battingCard.find(b => b.playerId === fow.batterId);
    
    // Find the other batter who was at the crease during this partnership
    const otherBatter = battingCard.find(b => b.playerId !== fow.batterId && (b.runs > 0 || b.ballsFaced > 0 || b.isBatting));
    
    const b1Name = dismissedBatter ? dismissedBatter.playerName : fow.batterName;
    const b1Id = dismissedBatter ? dismissedBatter.playerId : fow.batterId;
    const b2Name = otherBatter ? otherBatter.playerName : 'Partner';
    const b2Id = otherBatter ? otherBatter.playerId : 'partner-id';

    const b1Runs = Math.min(partnerRuns, dismissedBatter?.runs || Math.floor(partnerRuns * 0.55));
    const b2Runs = Math.max(0, partnerRuns - b1Runs);
    const totalBalls = Math.max(1, (dismissedBatter?.ballsFaced || 6) + Math.floor(b2Runs * 0.8));

    partnerships.push({
      wicketNumber: fow.wicketNumber,
      batter1Id: b1Id,
      batter1Name: b1Name,
      batter1Runs: b1Runs,
      batter1Balls: dismissedBatter?.ballsFaced || Math.max(1, Math.floor(totalBalls * 0.6)),
      batter2Id: b2Id,
      batter2Name: b2Name,
      batter2Runs: b2Runs,
      batter2Balls: Math.max(0, totalBalls - (dismissedBatter?.ballsFaced || 0)),
      totalRuns: partnerRuns,
      totalBalls,
      isCurrent: false,
    });

    prevScore = fow.teamRuns;
  });

  // If innings is not completed, ensure current partnership exists
  if (!innings.isCompleted && innings.strikerId && innings.nonStrikerId) {
    const activeExisting = existingPartnerships.find(p => p.isCurrent);
    if (activeExisting) {
      partnerships.push(activeExisting);
    } else {
      const striker = battingCard.find(b => b.playerId === innings.strikerId);
      const nonStriker = battingCard.find(b => b.playerId === innings.nonStrikerId);
      const currentWicketNumber = fows.length + 1;
      const currentRuns = Math.max(0, innings.runs - prevScore);

      partnerships.push({
        wicketNumber: currentWicketNumber,
        batter1Id: striker?.playerId || innings.strikerId,
        batter1Name: striker?.playerName || 'Striker',
        batter1Runs: striker?.runs || 0,
        batter1Balls: striker?.ballsFaced || 0,
        batter2Id: nonStriker?.playerId || innings.nonStrikerId,
        batter2Name: nonStriker?.playerName || 'Non-Striker',
        batter2Runs: nonStriker?.runs || 0,
        batter2Balls: nonStriker?.ballsFaced || 0,
        totalRuns: currentRuns,
        totalBalls: Math.max(0, innings.legalBalls - prevBalls),
        isCurrent: true,
      });
    }
  }

  innings.partnerships = partnerships;
  return partnerships;
}

/**
 * Core cricket delivery execution engine
 */
export function recordDelivery(match: Match, input: DeliveryInput): Match {
  const nextMatch = cloneMatch(match);
  const innings = nextMatch.innings[nextMatch.currentInningsIndex];
  if (!innings || innings.isCompleted || nextMatch.status === 'completed') {
    return nextMatch;
  }

  const ballsPerOver = nextMatch.ballsPerOver || 6;
  const currentOverIndex = Math.floor(innings.legalBalls / ballsPerOver);
  const ballInOverBefore = (innings.legalBalls % ballsPerOver) + 1;

  // Bowler verification & alternating over enforcement
  let bowler = innings.bowlingCard.find(b => b.playerId === innings.currentBowlerId);

  // If no bowler or currently set to consecutive bowler who bowled the preceding over:
  if (!bowler || !innings.currentBowlerId || (innings.lastBowlerId && innings.currentBowlerId === innings.lastBowlerId)) {
    // If nextBowlerId is designated and eligible:
    if (innings.nextBowlerId && isBowlerEligible(nextMatch, innings.nextBowlerId).eligible) {
      innings.currentBowlerId = innings.nextBowlerId;
      innings.nextBowlerId = undefined;
    } else {
      // Find the first eligible bowler from the bowling team
      const eligibleList = getEligibleBowlers(nextMatch);
      const firstEligible = eligibleList.find(b => b.eligible);
      if (firstEligible) {
        innings.currentBowlerId = firstEligible.player.id;
      }
    }

    // Re-resolve bowler stats entry
    bowler = innings.bowlingCard.find(b => b.playerId === innings.currentBowlerId);
    if (!bowler && innings.currentBowlerId) {
      const fieldingTeam = nextMatch.team1.id === innings.bowlingTeamId ? nextMatch.team1 : nextMatch.team2;
      const player = fieldingTeam?.players.find(p => p.id === innings.currentBowlerId);
      if (player) {
        bowler = {
          playerId: player.id,
          playerName: player.name,
          legalBalls: 0,
          overs: '0.0',
          maidens: 0,
          runsConceded: 0,
          wickets: 0,
          economy: 0,
          wides: 0,
          noBalls: 0,
          dots: 0,
        };
        innings.bowlingCard.push(bowler);
      }
    }
  }

  // Extract participants
  const striker = innings.battingCard.find(b => b.playerId === innings.strikerId);
  const nonStriker = innings.battingCard.find(b => b.playerId === innings.nonStrikerId);

  if (!striker || !nonStriker || !bowler) {
    console.error('Missing participants in scoring engine');
    return nextMatch;
  }

  // Delivery legality & runs determination
  let isLegal = false;
  let teamRunsToAdd = 0;
  let batterRunsToAdd = 0;
  let extrasToAdd = 0;
  let bowlerRunsConceded = 0;
  let strikeRotates = false;
  let commentaryText = input.customCommentary || '';

  const { deliveryType, batterRuns = 0, extraRuns = 0 } = input;

  switch (deliveryType) {
    case 'normal': {
      isLegal = true;
      batterRunsToAdd = batterRuns;
      teamRunsToAdd = batterRuns;
      bowlerRunsConceded = batterRuns;
      extrasToAdd = 0;
      strikeRotates = batterRuns % 2 === 1;

      if (!commentaryText) {
        if (batterRuns === 0) commentaryText = `${bowler.playerName} bowls dot to ${striker.playerName}. Solid defense.`;
        else if (batterRuns === 4) commentaryText = `FOUR! Cracking shot through the covers by ${striker.playerName} off ${bowler.playerName}!`;
        else if (batterRuns === 6) commentaryText = `SIX! Dispatched deep into the stands! High and handsome from ${striker.playerName}!`;
        else commentaryText = `${striker.playerName} punches to field, good running for ${batterRuns} run(s).`;
      }
      break;
    }
    case 'wide': {
      isLegal = false;
      // Standard 1 penalty + additional completed runs
      extrasToAdd = extraRuns;
      teamRunsToAdd = extraRuns;
      bowlerRunsConceded = extraRuns;
      batterRunsToAdd = 0;
      innings.extras.wides += extraRuns;

      // Additional completed runs beyond the 1 penalty rotate strike if odd
      const additionalRuns = Math.max(0, extraRuns - 1);
      strikeRotates = additionalRuns % 2 === 1;

      if (!commentaryText) {
        commentaryText = `Wide ball! Fired way outside off stump by ${bowler.playerName}. ${extraRuns > 1 ? `+${extraRuns - 1} additional run(s) taken.` : ''}`;
      }
      break;
    }
    case 'no_ball': {
      isLegal = false;
      // 1 penalty run + batter runs or byes
      const noBallPenalty = 1;
      batterRunsToAdd = batterRuns;
      extrasToAdd = noBallPenalty + extraRuns;
      teamRunsToAdd = noBallPenalty + batterRuns + extraRuns;
      bowlerRunsConceded = noBallPenalty + batterRuns; // byes off noball not charged to bowler
      innings.extras.noBalls += noBallPenalty;
      if (extraRuns > 0) {
        innings.extras.byes += extraRuns;
      }

      // Total running runs that rotate strike
      const runningRuns = batterRuns + extraRuns;
      strikeRotates = runningRuns % 2 === 1;

      if (!commentaryText) {
        commentaryText = `No-ball called! Overstepping by ${bowler.playerName}. ${batterRuns > 0 ? `${batterRuns} run(s) scored off the free hit!` : ''}`;
      }
      break;
    }
    case 'bye': {
      isLegal = true;
      batterRunsToAdd = 0;
      extrasToAdd = extraRuns;
      teamRunsToAdd = extraRuns;
      bowlerRunsConceded = 0; // Byes do NOT count against bowler's runs conceded
      innings.extras.byes += extraRuns;
      strikeRotates = extraRuns % 2 === 1;

      if (!commentaryText) {
        commentaryText = `Bye! Ball beats keeper, batsmen scamper ${extraRuns} run(s).`;
      }
      break;
    }
    case 'leg_bye': {
      isLegal = true;
      batterRunsToAdd = 0;
      extrasToAdd = extraRuns;
      teamRunsToAdd = extraRuns;
      bowlerRunsConceded = 0; // Leg byes do NOT count against bowler
      innings.extras.legByes += extraRuns;
      strikeRotates = extraRuns % 2 === 1;

      if (!commentaryText) {
        commentaryText = `Leg-bye! Ball deflects off pad into vacant area for ${extraRuns} run(s).`;
      }
      break;
    }
    case 'penalty': {
      isLegal = false;
      teamRunsToAdd = extraRuns;
      extrasToAdd = extraRuns;
      bowlerRunsConceded = 0;
      innings.extras.penaltyRuns += extraRuns;
      strikeRotates = false;
      if (!commentaryText) {
        commentaryText = `Penalty runs awarded: ${extraRuns} runs to ${input.penaltyAwardedTo || 'batting team'}.`;
      }
      break;
    }
  }

  // Update Team Score
  innings.runs += teamRunsToAdd;
  innings.extras.total += extrasToAdd;

  if (isLegal) {
    innings.legalBalls += 1;
  }
  innings.oversFormatted = formatOvers(innings.legalBalls, ballsPerOver);

  // Update Batter Stats
  if (deliveryType !== 'wide' && deliveryType !== 'penalty') {
    striker.ballsFaced += 1;
  }
  striker.runs += batterRunsToAdd;
  if (input.isFour || batterRunsToAdd === 4) {
    striker.fours += 1;
  }
  if (input.isSix || batterRunsToAdd === 6) {
    striker.sixes += 1;
  }
  if (batterRunsToAdd === 0 && deliveryType === 'normal') {
    striker.dots += 1;
  }
  striker.strikeRate = striker.ballsFaced > 0 ? Number(((striker.runs / striker.ballsFaced) * 100).toFixed(1)) : 0;

  // Update Bowler Stats
  if (isLegal) {
    bowler.legalBalls += 1;
  }
  bowler.runsConceded += bowlerRunsConceded;
  if (deliveryType === 'wide') {
    bowler.wides += 1;
  }
  if (deliveryType === 'no_ball') {
    bowler.noBalls += 1;
  }
  if (bowlerRunsConceded === 0 && isLegal) {
    bowler.dots += 1;
  }
  bowler.overs = formatOvers(bowler.legalBalls, ballsPerOver);
  bowler.economy = bowler.legalBalls > 0 ? Number(((bowler.runsConceded / bowler.legalBalls) * ballsPerOver).toFixed(2)) : 0;

  // Handle Wagon Shot for all scoring deliveries (1, 2, 3, 4, 6 or explicit wagonZone)
  let wagonShotObj: WagonShot | undefined;
  if (input.wagonZone || input.isFour || input.isSix || batterRunsToAdd > 0) {
    let angle: number;
    let distance: number;
    let desc: string;

    if (input.wagonZone) {
      angle = input.wagonZone.angle;
      distance = input.wagonZone.distance;
      desc = input.wagonZone.description || `${batterRunsToAdd} run(s) by ${striker.playerName}`;
    } else {
      // Natural cricket shot angles based on shot type and runs
      // 0°/360°: straight down the ground (straight drive/long off)
      // 45°: cover drive, 90°: point/square cut, 135°: third man/gully
      // 180°: fine leg, 225°: backward square leg, 270°: mid-wicket, 315°: long on
      if (input.isSix || batterRunsToAdd === 6) {
        // Sixes tend to be over mid-wicket, long-on, long-off, deep square, or straight
        const sixAngles = [25, 45, 290, 315, 340, 270, 240];
        const baseAngle = sixAngles[Math.floor(Math.random() * sixAngles.length)];
        angle = (baseAngle + Math.floor(Math.random() * 20) - 10 + 360) % 360;
        distance = 95 + Math.floor(Math.random() * 8); // 95 to 103 (clearing the rope)
        desc = `Maximum 6! Towering shot sailing into the stands by ${striker.playerName}`;
      } else if (input.isFour || batterRunsToAdd === 4) {
        // Fours driven through covers, pulled through square leg, cuts through point, or straight
        const fourAngles = [30, 55, 80, 105, 140, 220, 260, 295, 330];
        const baseAngle = fourAngles[Math.floor(Math.random() * fourAngles.length)];
        angle = (baseAngle + Math.floor(Math.random() * 16) - 8 + 360) % 360;
        distance = 86 + Math.floor(Math.random() * 7); // 86 to 93 (boundary rope)
        desc = `Boundary 4! Beautifully placed along the carpet by ${striker.playerName}`;
      } else if (batterRunsToAdd === 3) {
        // Threes pushed deep into wide outfield gaps
        const threeAngles = [60, 110, 245, 290];
        const baseAngle = threeAngles[Math.floor(Math.random() * threeAngles.length)];
        angle = (baseAngle + Math.floor(Math.random() * 20) - 10 + 360) % 360;
        distance = 72 + Math.floor(Math.random() * 10);
        desc = `3 runs! Good running between the wickets by ${striker.playerName}`;
      } else if (batterRunsToAdd === 2) {
        // Twos placed into gaps inside deep circle
        const twoAngles = [40, 75, 120, 210, 255, 305, 345];
        const baseAngle = twoAngles[Math.floor(Math.random() * twoAngles.length)];
        angle = (baseAngle + Math.floor(Math.random() * 18) - 9 + 360) % 360;
        distance = 58 + Math.floor(Math.random() * 12);
        desc = `2 runs! Worked into the outfield pocket by ${striker.playerName}`;
      } else {
        // 1 run: singles tapped into the ring
        const singleAngles = [20, 50, 70, 95, 130, 205, 235, 265, 310, 335];
        const baseAngle = singleAngles[Math.floor(Math.random() * singleAngles.length)];
        angle = (baseAngle + Math.floor(Math.random() * 16) - 8 + 360) % 360;
        distance = 40 + Math.floor(Math.random() * 15);
        desc = `1 run! Single nudged into the gap by ${striker.playerName}`;
      }
    }

    wagonShotObj = {
      id: `ws-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      angle,
      distance,
      runs: batterRunsToAdd,
      isFour: !!input.isFour || batterRunsToAdd === 4,
      isSix: !!input.isSix || batterRunsToAdd === 6,
      batterName: striker.playerName,
      over: innings.oversFormatted,
      description: desc,
    };
    if (!striker.wagonShots) striker.wagonShots = [];
    striker.wagonShots.push(wagonShotObj);
    if (!innings.wagonShots) innings.wagonShots = [];
    innings.wagonShots.push(wagonShotObj);
  }

  // Recalculate and synchronize extras total
  innings.extras.total = (innings.extras.wides || 0) + (innings.extras.noBalls || 0) + (innings.extras.byes || 0) + (innings.extras.legByes || 0) + (innings.extras.penaltyRuns || 0);

  // Update active partnership with this delivery's runs and balls
  ensureInningsPartnerships(innings);
  const activePartnership = innings.partnerships.find(p => p.isCurrent);
  if (activePartnership) {
    activePartnership.totalRuns += teamRunsToAdd;
    if (isLegal) {
      activePartnership.totalBalls += 1;
    }
    if (striker.playerId === activePartnership.batter1Id) {
      activePartnership.batter1Runs += batterRunsToAdd;
      if (deliveryType !== 'wide') activePartnership.batter1Balls += 1;
    } else if (striker.playerId === activePartnership.batter2Id) {
      activePartnership.batter2Runs += batterRunsToAdd;
      if (deliveryType !== 'wide') activePartnership.batter2Balls += 1;
    } else {
      activePartnership.batter1Runs += batterRunsToAdd;
      if (deliveryType !== 'wide') activePartnership.batter1Balls += 1;
    }
  }

  // Handle Dismissal if applicable
  let dismissalInfo: DismissalInfo | undefined;
  if (input.dismissal) {
    const dType = input.dismissal.type;
    const isWicket = isWicketCountIncremented(dType);
    const isBowlerCredited = isDismissalCreditedToBowler(dType);

    // Dismissed batter must be an active not-out crease batter
    const activeCreaseBatters = innings.battingCard.filter(b => b.isBatting && !b.isOut);
    const requestedBatter = activeCreaseBatters.find(b => b.playerId === input.dismissal!.dismissedBatterId);
    const dismissedBatter = requestedBatter || (!striker.isOut ? striker : (activeCreaseBatters[0] || striker));

    const fielder = input.dismissal.fielderId ? nextMatch.team1.players.concat(nextMatch.team2.players).find(p => p.id === input.dismissal!.fielderId) : undefined;
    const fielderName = fielder ? fielder.name : (input.dismissal.fielderId || undefined);

    if (isWicket) {
      innings.wickets += 1;
    }

    if (isBowlerCredited) {
      bowler.wickets += 1;
    }

    dismissalInfo = {
      type: dType,
      dismissedBatterId: dismissedBatter.playerId,
      dismissedBatterName: dismissedBatter.playerName,
      bowlerId: bowler.playerId,
      bowlerName: bowler.playerName,
      fielderId: input.dismissal.fielderId,
      fielderName,
      creditedToBowler: isBowlerCredited,
      text: getDismissalDescription(dType, bowler.playerName, fielderName),
      over: innings.oversFormatted,
      teamScoreAtDismissal: innings.runs,
      wicketNumber: innings.wickets,
    };

    dismissedBatter.isOut = true;
    dismissedBatter.isBatting = false;
    dismissedBatter.dismissal = dismissalInfo;

    // Record Fall of Wicket (ensure a batter cannot be added more than once)
    if (isWicket && !innings.fallOfWickets.some(f => f.batterId === dismissedBatter.playerId)) {
      const fow: FallOfWicket = {
        wicketNumber: innings.wickets,
        teamRuns: innings.runs,
        overs: innings.oversFormatted,
        batterId: dismissedBatter.playerId,
        batterName: dismissedBatter.playerName,
        score: dismissedBatter.runs,
        balls: dismissedBatter.ballsFaced,
      };
      innings.fallOfWickets.push(fow);
    }

    // Close Current Partnership
    if (activePartnership) {
      activePartnership.isCurrent = false;
    }

    // Identify surviving batter before updating striker/nonStriker pointers
    const wasStriker = dismissedBatter.playerId === innings.strikerId;
    const otherBatterId = wasStriker ? innings.nonStrikerId : innings.strikerId;
    const otherBatter = innings.battingCard.find(b => b.playerId === otherBatterId);

    // Bring in Incoming Batter if available and wickets < 10
    if (innings.wickets < 10 && input.dismissal.incomingBatterId) {
      const incomingBatter = innings.battingCard.find(b => b.playerId === input.dismissal!.incomingBatterId && !b.isOut && !b.isBatting);
      if (incomingBatter) {
        incomingBatter.isBatting = true;
        incomingBatter.isOut = false;

        // If the dismissed batter was striker, replace striker
        if (wasStriker) {
          innings.strikerId = incomingBatter.playerId;
        } else {
          innings.nonStrikerId = incomingBatter.playerId;
        }

        // Start new partnership with the surviving batter
        innings.partnerships.push({
          wicketNumber: innings.wickets + 1,
          batter1Id: incomingBatter.playerId,
          batter1Name: incomingBatter.playerName,
          batter1Runs: 0,
          batter1Balls: 0,
          batter2Id: otherBatter ? otherBatter.playerId : otherBatterId,
          batter2Name: otherBatter ? otherBatter.playerName : 'Partner',
          batter2Runs: 0,
          batter2Balls: 0,
          totalRuns: 0,
          totalBalls: 0,
          isCurrent: true,
        });
      }
    }
  }

  // Record Delivery Entry
  const deliveryRecord: Delivery = {
    id: `del-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    deliveryIndex: innings.deliveries.length,
    overNumber: currentOverIndex,
    ballInOver: isLegal ? ballInOverBefore : 0,
    displayOver: isLegal ? `${currentOverIndex}.${ballInOverBefore}` : (deliveryType === 'wide' ? 'Wd' : 'Nb'),
    strikerId: striker.playerId,
    strikerName: striker.playerName,
    nonStrikerId: nonStriker.playerId,
    nonStrikerName: nonStriker.playerName,
    bowlerId: bowler.playerId,
    bowlerName: bowler.playerName,
    deliveryType,
    batterRuns: batterRunsToAdd,
    extraRuns: extrasToAdd,
    totalRuns: teamRunsToAdd,
    isLegalBall: isLegal,
    isFour: !!input.isFour || batterRunsToAdd === 4,
    isSix: !!input.isSix || batterRunsToAdd === 6,
    isDot: batterRunsToAdd === 0 && extrasToAdd === 0 && isLegal,
    dismissal: dismissalInfo,
    commentary: commentaryText,
    wagonShot: wagonShotObj,
    timestamp: Date.now(),
  };

  innings.deliveries.push(deliveryRecord);

  // Maintain Over Summary list
  let overSummary = innings.overs.find(o => o.overNumber === currentOverIndex);
  if (!overSummary) {
    overSummary = {
      overNumber: currentOverIndex,
      displayOverNumber: currentOverIndex + 1,
      bowlerId: bowler.playerId,
      bowlerName: bowler.playerName,
      runsConceded: 0,
      wickets: 0,
      deliveries: [],
      isMaiden: false,
      isCompleted: false,
    };
    innings.overs.push(overSummary);
  }
  overSummary.deliveries.push(deliveryRecord);
  overSummary.runsConceded += bowlerRunsConceded;
  if (dismissalInfo && dismissalInfo.creditedToBowler) {
    overSummary.wickets += 1;
  }

  // Rotate Strike for runs during the ball
  if (strikeRotates) {
    const temp = innings.strikerId;
    innings.strikerId = innings.nonStrikerId;
    innings.nonStrikerId = temp;
  }

  // Check Over Completion
  const legalBallsInThisOver = innings.legalBalls % ballsPerOver;
  const isOverFinished = isLegal && legalBallsInThisOver === 0;

  if (isOverFinished) {
    overSummary.isCompleted = true;
    if (overSummary.runsConceded === 0) {
      overSummary.isMaiden = true;
      bowler.maidens += 1;
    }

    // End of over: Strike rotation between ends!
    const temp = innings.strikerId;
    innings.strikerId = innings.nonStrikerId;
    innings.nonStrikerId = temp;

    // Law 17.8: Current bowler who just finished this over cannot bowl the next over
    innings.lastBowlerId = bowler.playerId;

    // Next bowler transition:
    // If a valid next bowler was designated and is eligible under Law 17.8 and format quota, promote them
    if (innings.nextBowlerId && isBowlerEligible(nextMatch, innings.nextBowlerId).eligible) {
      innings.currentBowlerId = innings.nextBowlerId;
      innings.nextBowlerId = undefined;
    } else {
      // Clear current bowler so scorer must select an eligible bowler for the new over
      innings.currentBowlerId = '';
      innings.nextBowlerId = undefined;
    }
  }

  // Check Innings & Match Termination Conditions
  const maxLegalBalls = nextMatch.totalOvers * ballsPerOver;
  const allOut = innings.wickets >= 10;
  const oversMaxed = innings.legalBalls >= maxLegalBalls;

  // Chase conditions (2nd Innings)
  if (nextMatch.currentInningsIndex === 1 && nextMatch.target !== null) {
    const target = nextMatch.target;
    if (innings.runs >= target) {
      // Batting Team Wins!
      innings.isCompleted = true;
      nextMatch.status = 'completed';
      const remainingWickets = 10 - innings.wickets;
      const margin = `${remainingWickets} wicket${remainingWickets === 1 ? '' : 's'}`;
      nextMatch.result = {
        winnerTeamId: innings.battingTeamId,
        winnerTeamName: innings.battingTeamName,
        margin,
        summary: `${innings.battingTeamName} won by ${margin}`,
        isTie: false,
        isDraw: false,
      };
    } else if (allOut || oversMaxed) {
      innings.isCompleted = true;
      nextMatch.status = 'completed';
      if (innings.runs === target - 1) {
        // Match Tied!
        nextMatch.result = {
          summary: 'Match Tied!',
          isTie: true,
          isDraw: false,
        };
      } else {
        // Bowling Team Wins!
        const winMarginRuns = (target - 1) - innings.runs;
        const margin = `${winMarginRuns} run${winMarginRuns === 1 ? '' : 's'}`;
        nextMatch.result = {
          winnerTeamId: innings.bowlingTeamId,
          winnerTeamName: innings.bowlingTeamName,
          margin,
          summary: `${innings.bowlingTeamName} won by ${margin}`,
          isTie: false,
          isDraw: false,
        };
      }
    }
  } else if (nextMatch.currentInningsIndex === 0) {
    // 1st Innings completion check
    if (allOut || oversMaxed) {
      innings.isCompleted = true;
      nextMatch.status = 'innings_break';
      nextMatch.target = innings.runs + 1;
    }
  }

  nextMatch.updatedAt = new Date().toISOString();
  return nextMatch;
}

/**
 * Manually switch strike between the two batters currently at the crease
 */
export function swapStrikeManual(match: Match): Match {
  const nextMatch = cloneMatch(match);
  const innings = nextMatch.innings[nextMatch.currentInningsIndex];
  if (!innings) return nextMatch;

  const temp = innings.strikerId;
  innings.strikerId = innings.nonStrikerId;
  innings.nonStrikerId = temp;
  nextMatch.updatedAt = new Date().toISOString();
  return nextMatch;
}

/**
 * Change the active bowler (e.g. at the end of an over or manually)
 */
export function changeBowler(match: Match, newBowlerId: string): Match {
  const nextMatch = cloneMatch(match);
  const innings = nextMatch.innings[nextMatch.currentInningsIndex];
  if (!innings) return nextMatch;

  // Law 17.8 and Format Quota Enforcement
  const eligibility = isBowlerEligible(nextMatch, newBowlerId);
  if (!eligibility.eligible) {
    console.warn(`Cannot select bowler ${newBowlerId}: ${eligibility.reason}`);
    return nextMatch;
  }

  let bowler = innings.bowlingCard.find(b => b.playerId === newBowlerId);
  if (!bowler) {
    const bowlingTeam = nextMatch.team1.id === innings.bowlingTeamId ? nextMatch.team1 : nextMatch.team2;
    const player = bowlingTeam.players.find(p => p.id === newBowlerId);
    if (player) {
      bowler = {
        playerId: player.id,
        playerName: player.name,
        legalBalls: 0,
        overs: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        wides: 0,
        noBalls: 0,
        dots: 0,
      };
      innings.bowlingCard.push(bowler);
    }
  }

  innings.currentBowlerId = newBowlerId;
  nextMatch.updatedAt = new Date().toISOString();
  return nextMatch;
}

/**
 * Designate the upcoming bowler for the next over
 */
export function setNextBowler(match: Match, nextBowlerId: string): Match {
  const nextMatch = cloneMatch(match);
  const innings = nextMatch.innings[nextMatch.currentInningsIndex];
  if (innings) {
    innings.nextBowlerId = nextBowlerId;
  }
  return nextMatch;
}

/**
 * Start the 2nd Innings after innings break
 */
export function startSecondInnings(
  match: Match,
  strikerId: string,
  nonStrikerId: string,
  openingBowlerId: string
): Match {
  const nextMatch = cloneMatch(match);
  if (nextMatch.currentInningsIndex !== 0) return nextMatch;

  nextMatch.currentInningsIndex = 1;
  nextMatch.status = 'live';

  const innings1 = nextMatch.innings[0];
  nextMatch.target = innings1.runs + 1;

  const innings2 = nextMatch.innings[1];
  innings2.strikerId = strikerId;
  innings2.nonStrikerId = nonStrikerId;
  innings2.currentBowlerId = openingBowlerId;
  innings2.lastBowlerId = undefined;

  // Set batting status for opening pair
  const striker = innings2.battingCard.find(b => b.playerId === strikerId);
  if (striker) striker.isBatting = true;
  const nonStriker = innings2.battingCard.find(b => b.playerId === nonStrikerId);
  if (nonStriker) nonStriker.isBatting = true;

  // Create initial partnership
  if (striker && nonStriker) {
    innings2.partnerships = [
      {
        wicketNumber: 1,
        batter1Id: striker.playerId,
        batter1Name: striker.playerName,
        batter1Runs: 0,
        batter1Balls: 0,
        batter2Id: nonStriker.playerId,
        batter2Name: nonStriker.playerName,
        batter2Runs: 0,
        batter2Balls: 0,
        totalRuns: 0,
        totalBalls: 0,
        isCurrent: true,
      },
    ];
  }

  nextMatch.updatedAt = new Date().toISOString();
  return nextMatch;
}

/**
 * Undo Last Delivery: Replaces current match with previous state snapshot
 */
export function undoLastDelivery(
  history: Match[]
): { restoredMatch: Match | null; newHistory: Match[] } {
  if (history.length <= 1) {
    return { restoredMatch: null, newHistory: history };
  }

  const newHistory = history.slice(0, history.length - 1);
  const restoredMatch = cloneMatch(newHistory[newHistory.length - 1]);
  return { restoredMatch, newHistory };
}
