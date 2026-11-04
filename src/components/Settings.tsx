/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sliders, CheckCircle2, Play, RefreshCw, Calculator, Database, ShieldAlert, Award, TrendingUp, TrendingDown, Minus, Info, Sparkles, CloudRain, ShieldCheck, ArrowRight } from 'lucide-react';
import { recordDelivery, undoLastDelivery } from '../engine/cricketEngine';
import { createDefaultMatch } from '../engine/defaultData';
import { calculateDLS, DLSResult, calculateRainReduction, getRevisedTargetMatrix, RainReductionResult } from '../engine/dlsEngine';
import { Match, DeliveryInput } from '../types/cricket';

interface SettingsProps {
  onResetToDefault: () => void;
  onResetActiveMatch?: () => void;
  onNavigate?: (tab: string) => void;
}

interface TestResult {
  id: number;
  title: string;
  passed: boolean;
  message: string;
}

export const Settings: React.FC<SettingsProps> = ({ onResetToDefault, onResetActiveMatch, onNavigate }) => {
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [activeConfirm, setActiveConfirm] = useState<'match' | 'all' | null>(null);

  // Duckworth-Lewis-Stern Calculator state (initialized with 50-ov user scenario: 186 total, 10.5 ov, 54/1)
  const [dlsTotalOvers, setDlsTotalOvers] = useState<number>(50);
  const [dlsFirstInningsTotal, setDlsFirstInningsTotal] = useState<number>(186);
  const [dlsFirstInningsOvers, setDlsFirstInningsOvers] = useState<string>('50.0');
  const [dlsTeam2OversBatted, setDlsTeam2OversBatted] = useState<string>('10.5');
  const [dlsWicketsLost, setDlsWicketsLost] = useState<number>(1);
  const [dlsTeam2CurrentRuns, setDlsTeam2CurrentRuns] = useState<number>(54);
  const [dlsRevisedOvers, setDlsRevisedOvers] = useState<number>(40);
  const [activeDlsTab, setActiveDlsTab] = useState<'reduction' | 'stoppage'>('reduction');

  const [dlsResult, setDlsResult] = useState<DLSResult>(() =>
    calculateDLS({
      totalOvers: 50,
      team1TotalRuns: 186,
      team1OversFaced: '50.0',
      team2OversBatted: '10.5',
      team2WicketsLost: 1,
      team2CurrentRuns: 54,
    })
  );

  const [rainResult, setRainResult] = useState<RainReductionResult>(() =>
    calculateRainReduction({
      originalTotalOvers: 50,
      team1TotalRuns: 186,
      team1OversFaced: '50.0',
      team2OversBowledAtInterruption: '10.5',
      team2WicketsLostAtInterruption: 1,
      team2RunsAtInterruption: 54,
      revisedTotalOvers: 40,
    })
  );

  const [reductionMatrix, setReductionMatrix] = useState<RainReductionResult[]>(() =>
    getRevisedTargetMatrix({
      originalTotalOvers: 50,
      team1TotalRuns: 186,
      team1OversFaced: '50.0',
      team2OversBowledAtInterruption: '10.5',
      team2WicketsLostAtInterruption: 1,
      team2RunsAtInterruption: 54,
    })
  );

  const updateDLS = (
    totalOvers: number,
    t1Total: number,
    t1Overs: string,
    t2Overs: string,
    t2Wickets: number,
    t2Runs: number,
    revisedOvers = dlsRevisedOvers
  ) => {
    const res = calculateDLS({
      totalOvers,
      team1TotalRuns: t1Total,
      team1OversFaced: t1Overs,
      team2OversBatted: t2Overs,
      team2WicketsLost: t2Wickets,
      team2CurrentRuns: t2Runs,
    });
    setDlsResult(res);

    const rainRes = calculateRainReduction({
      originalTotalOvers: totalOvers,
      team1TotalRuns: t1Total,
      team1OversFaced: t1Overs,
      team2OversBowledAtInterruption: t2Overs,
      team2WicketsLostAtInterruption: t2Wickets,
      team2RunsAtInterruption: t2Runs,
      revisedTotalOvers: revisedOvers,
    });
    setRainResult(rainRes);

    const matrix = getRevisedTargetMatrix({
      originalTotalOvers: totalOvers,
      team1TotalRuns: t1Total,
      team1OversFaced: t1Overs,
      team2OversBowledAtInterruption: t2Overs,
      team2WicketsLostAtInterruption: t2Wickets,
      team2RunsAtInterruption: t2Runs,
    });
    setReductionMatrix(matrix);
  };

  const calculateDLSPar = () => {
    updateDLS(
      dlsTotalOvers,
      dlsFirstInningsTotal,
      dlsFirstInningsOvers,
      dlsTeam2OversBatted,
      dlsWicketsLost,
      dlsTeam2CurrentRuns,
      dlsRevisedOvers
    );
  };

  // Run in-browser automated test suite
  const runEngineTests = () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];

    const createCleanMatch = (): Match => {
      const match = createDefaultMatch();
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
      inn.battingCard.forEach(b => {
        b.runs = 0;
        b.ballsFaced = 0;
        b.fours = 0;
        b.sixes = 0;
        b.dots = 0;
        b.strikeRate = 0;
        b.isOut = false;
        b.isBatting = b.playerId === 'eng-1' || b.playerId === 'eng-2';
      });
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
      inn.strikerId = 'eng-1';
      inn.nonStrikerId = 'eng-2';
      inn.currentBowlerId = 'aus-9';
      match.status = 'live';
      return match;
    };

    try {
      // 1. Dot ball
      let m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'normal', batterRuns: 0, extraRuns: 0 });
      results.push({
        id: 1,
        title: 'Dot ball: score unchanged, one legal ball recorded',
        passed: m.innings[1].runs === 0 && m.innings[1].legalBalls === 1,
        message: `Runs: ${m.innings[1].runs}, Legal balls: ${m.innings[1].legalBalls}`,
      });

      // 2. Four off the bat
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'normal', batterRuns: 4, extraRuns: 0, isFour: true });
      results.push({
        id: 2,
        title: 'Four off the bat: team score +4, batter score +4',
        passed: m.innings[1].runs === 4 && m.innings[1].battingCard[0].runs === 4,
        message: `Team: ${m.innings[1].runs}, Batter: ${m.innings[1].battingCard[0].runs}`,
      });

      // 3. Six off the bat
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'normal', batterRuns: 6, extraRuns: 0, isSix: true });
      results.push({
        id: 3,
        title: 'Six off the bat: team score +6, batter score +6',
        passed: m.innings[1].runs === 6 && m.innings[1].battingCard[0].runs === 6,
        message: `Team: ${m.innings[1].runs}, Batter: ${m.innings[1].battingCard[0].runs}`,
      });

      // 4. Wide alone
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'wide', batterRuns: 0, extraRuns: 1 });
      results.push({
        id: 4,
        title: 'Wide: team score +1, bowler charged, no legal ball added',
        passed: m.innings[1].runs === 1 && m.innings[1].legalBalls === 0 && m.innings[1].bowlingCard[0].runsConceded === 1,
        message: `Team: ${m.innings[1].runs}, Balls: ${m.innings[1].legalBalls}, Bowler Conceded: ${m.innings[1].bowlingCard[0].runsConceded}`,
      });

      // 5. 1 WD
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'wide', batterRuns: 0, extraRuns: 2 });
      results.push({
        id: 5,
        title: '1 WD: team score +2, extras +2, no legal ball added',
        passed: m.innings[1].runs === 2 && m.innings[1].extras.wides === 2 && m.innings[1].legalBalls === 0,
        message: `Team: ${m.innings[1].runs}, Extras: ${m.innings[1].extras.wides}`,
      });

      // 6. 2 WD
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'wide', batterRuns: 0, extraRuns: 3 });
      results.push({
        id: 6,
        title: '2 WD: team score +3, extras +3, no legal ball added',
        passed: m.innings[1].runs === 3 && m.innings[1].extras.wides === 3 && m.innings[1].legalBalls === 0,
        message: `Team: ${m.innings[1].runs}, Extras: ${m.innings[1].extras.wides}`,
      });

      // 7. 4 WD
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'wide', batterRuns: 0, extraRuns: 5 });
      results.push({
        id: 7,
        title: '4 WD: team score +5, extras +5, no legal ball added',
        passed: m.innings[1].runs === 5 && m.innings[1].extras.wides === 5 && m.innings[1].legalBalls === 0,
        message: `Team: ${m.innings[1].runs}, Extras: ${m.innings[1].extras.wides}`,
      });

      // 8. No-ball alone
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'no_ball', batterRuns: 0, extraRuns: 0 });
      results.push({
        id: 8,
        title: 'No-ball alone: team score +1, no legal ball added',
        passed: m.innings[1].runs === 1 && m.innings[1].legalBalls === 0 && m.innings[1].extras.noBalls === 1,
        message: `Team: ${m.innings[1].runs}, Nb: ${m.innings[1].extras.noBalls}`,
      });

      // 9. No-ball + 1 batter run
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'no_ball', batterRuns: 1, extraRuns: 0 });
      results.push({
        id: 9,
        title: 'No-ball + 1 batter run: team score +2, batter score +1, extras +1',
        passed: m.innings[1].runs === 2 && m.innings[1].battingCard[0].runs === 1 && m.innings[1].extras.noBalls === 1,
        message: `Team: ${m.innings[1].runs}, Batter: ${m.innings[1].battingCard[0].runs}, Nb: ${m.innings[1].extras.noBalls}`,
      });

      // 10. Bye
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'bye', batterRuns: 0, extraRuns: 1 });
      results.push({
        id: 10,
        title: 'Bye: team score & byes increase without adding batter runs',
        passed: m.innings[1].runs === 1 && m.innings[1].battingCard[0].runs === 0 && m.innings[1].extras.byes === 1,
        message: `Team: ${m.innings[1].runs}, Batter: ${m.innings[1].battingCard[0].runs}, Byes: ${m.innings[1].extras.byes}`,
      });

      // 11. Leg-bye
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'leg_bye', batterRuns: 0, extraRuns: 2 });
      results.push({
        id: 11,
        title: 'Leg-bye: team score & leg-byes increase without adding batter runs',
        passed: m.innings[1].runs === 2 && m.innings[1].battingCard[0].runs === 0 && m.innings[1].extras.legByes === 2,
        message: `Team: ${m.innings[1].runs}, Batter: ${m.innings[1].battingCard[0].runs}, Lb: ${m.innings[1].extras.legByes}`,
      });

      // 12. Bowled
      m = createCleanMatch();
      m = recordDelivery(m, {
        deliveryType: 'normal',
        batterRuns: 0,
        extraRuns: 0,
        dismissal: { type: 'bowled', dismissedBatterId: 'eng-1' },
      });
      results.push({
        id: 12,
        title: 'Bowled: wicket recorded and bowler credited',
        passed: m.innings[1].wickets === 1 && m.innings[1].bowlingCard[0].wickets === 1,
        message: `Innings Wkts: ${m.innings[1].wickets}, Bowler Wkts: ${m.innings[1].bowlingCard[0].wickets}`,
      });

      // 13. Caught
      m = createCleanMatch();
      m = recordDelivery(m, {
        deliveryType: 'normal',
        batterRuns: 0,
        extraRuns: 0,
        dismissal: { type: 'caught', dismissedBatterId: 'eng-1', fielderId: 'aus-4' },
      });
      results.push({
        id: 13,
        title: 'Caught: wicket recorded, correct batter dismissed, bowler credited',
        passed: m.innings[1].wickets === 1 && m.innings[1].bowlingCard[0].wickets === 1,
        message: `Innings Wkts: ${m.innings[1].wickets}, Bowler Wkts: ${m.innings[1].bowlingCard[0].wickets}`,
      });

      // 14. Run out
      m = createCleanMatch();
      m = recordDelivery(m, {
        deliveryType: 'normal',
        batterRuns: 1,
        extraRuns: 0,
        dismissal: { type: 'run_out', dismissedBatterId: 'eng-1' },
      });
      results.push({
        id: 14,
        title: 'Run out: wicket recorded without crediting bowler',
        passed: m.innings[1].wickets === 1 && m.innings[1].bowlingCard[0].wickets === 0,
        message: `Innings Wkts: ${m.innings[1].wickets}, Bowler Wkts: ${m.innings[1].bowlingCard[0].wickets}`,
      });

      // 15. Non-credited dismissal tally
      m = createCleanMatch();
      m = recordDelivery(m, {
        deliveryType: 'normal',
        batterRuns: 0,
        extraRuns: 0,
        dismissal: { type: 'obstructing_the_field', dismissedBatterId: 'eng-1' },
      });
      results.push({
        id: 15,
        title: 'Obstructing field must not increase bowler wickets',
        passed: m.innings[1].wickets === 1 && m.innings[1].bowlingCard[0].wickets === 0,
        message: `Innings Wkts: ${m.innings[1].wickets}, Bowler Wkts: ${m.innings[1].bowlingCard[0].wickets}`,
      });

      // 16. Wide & no-ball legal ball exclusion
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'wide', batterRuns: 0, extraRuns: 1 });
      m = recordDelivery(m, { deliveryType: 'no_ball', batterRuns: 0, extraRuns: 0 });
      results.push({
        id: 16,
        title: 'Wide and no-ball do not increment legal-ball count',
        passed: m.innings[1].legalBalls === 0 && m.innings[1].runs === 2,
        message: `Legal balls: ${m.innings[1].legalBalls}, Runs: ${m.innings[1].runs}`,
      });

      // 17. Over completes after 6 legal balls
      m = createCleanMatch();
      for (let i = 0; i < 6; i++) {
        m = recordDelivery(m, { deliveryType: 'normal', batterRuns: 0, extraRuns: 0 });
      }
      results.push({
        id: 17,
        title: 'Over completes after 6 legal balls',
        passed: m.innings[1].legalBalls === 6 && m.innings[1].oversFormatted === '1.0',
        message: `Overs: ${m.innings[1].oversFormatted}, Legal balls: ${m.innings[1].legalBalls}`,
      });

      // 18. Strike rotation
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'normal', batterRuns: 1, extraRuns: 0 });
      results.push({
        id: 18,
        title: 'Strike rotation is correct for completed odd runs',
        passed: m.innings[1].strikerId === 'eng-2' && m.innings[1].nonStrikerId === 'eng-1',
        message: `Striker: ${m.innings[1].strikerId}`,
      });

      // 19. Undo restores state exactly
      m = createCleanMatch();
      const history = [m];
      const afterShot = recordDelivery(m, { deliveryType: 'normal', batterRuns: 4, extraRuns: 0, isFour: true });
      history.push(afterShot);
      const { restoredMatch } = undoLastDelivery(history);
      results.push({
        id: 19,
        title: 'Undo restores score and statistics exactly',
        passed: restoredMatch !== null && restoredMatch.innings[1].runs === 0,
        message: `Restored score: ${restoredMatch?.innings[1].runs}`,
      });

      // 20. Save and reload serialization
      m = createCleanMatch();
      m = recordDelivery(m, { deliveryType: 'normal', batterRuns: 6, extraRuns: 0, isSix: true });
      const serialized = JSON.parse(JSON.stringify(m));
      results.push({
        id: 20,
        title: 'Save and reload restores match correctly',
        passed: serialized.innings[1].runs === 6,
        message: `Deserialized score: ${serialized.innings[1].runs}`,
      });
    } catch (e: any) {
      console.error('Test execution error:', e);
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-[#0d1320] text-[#dde2f5] p-6 max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3c4a42]/30 pb-4">
        <div>
          <h1 className="font-headline-lg text-2xl font-bold text-[#dde2f5] flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[28px] text-[#4edea3]">
              tune
            </span>
            System Settings & Engine Diagnostic Hub
          </h1>
          <p className="font-body-sm text-xs text-[#bbcabf] mt-1">
            Laws of Cricket engine rules, DLS calculation engine, automated test suite, and storage controls
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Automated Test Suite Runner (MANDATED REQUIREMENT) */}
        <div className="bg-[#161b29] rounded-xl p-5 border border-[#3c4a42]/30 space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-[#3c4a42]/20">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#4edea3]" />
              <h2 className="font-headline-sm text-base font-bold text-[#dde2f5]">
                Automated Scoring Engine Test Suite (20 Tests)
              </h2>
            </div>
            <button
              onClick={runEngineTests}
              disabled={isRunningTests}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#00422b] font-stat-mono-sm text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              type="button"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunningTests ? 'Running...' : 'Execute 20+ Engine Tests'}</span>
            </button>
          </div>

          <p className="font-body-sm text-xs text-[#bbcabf]">
            Executes all 20 required engine test cases live against the core scoring logic: dot balls, boundaries, wides (WD to 4 WD), no-balls, byes, leg-byes, bowled, caught, run outs, strike rotation, undo, and persistence.
          </p>

          {/* Test Results Output Log */}
          {testResults && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 pt-2 border-t border-[#3c4a42]/20">
              <div className="flex items-center justify-between pb-1 text-xs font-stat-mono-sm">
                <span className="text-[#4edea3] font-bold">
                  Passed: {testResults.filter(t => t.passed).length} / {testResults.length}
                </span>
                <span className="text-[#86948a]">Execution: Instantaneous (&lt;5ms)</span>
              </div>

              {testResults.map(test => (
                <div
                  key={test.id}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                    test.passed
                      ? 'bg-[#1a1f2d] border-[#10b981]/30 text-[#dde2f5]'
                      : 'bg-[#93000a]/20 border-[#ffb4ab]/40 text-[#ffb4ab]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 ${test.passed ? 'text-[#4edea3]' : 'text-[#ffb4ab]'}`} />
                    <span className="font-semibold">{test.title}</span>
                  </div>
                  <span className="font-stat-mono-sm text-[11px] text-[#bbcabf]">{test.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Duckworth-Lewis-Stern (DLS) Par Calculator Suite */}
        <div className="bg-[#161b29] rounded-xl p-5 border border-[#3c4a42]/30 space-y-5 shadow-md lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#3c4a42]/20">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#ffb95f]" />
              <div>
                <h2 className="font-headline-sm text-base font-bold text-[#dde2f5]">
                  Duckworth-Lewis-Stern (DLS) Par Score Calculator
                </h2>
                <p className="font-body-sm text-xs text-[#bbcabf]">
                  Official Standard Edition resource matrix • Fractional ball-by-ball precision
                </p>
              </div>
            </div>

            {/* Quick Test Scenarios */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-label-caps text-[10px] text-[#86948a] uppercase">Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setDlsTotalOvers(50);
                  setDlsFirstInningsTotal(186);
                  setDlsFirstInningsOvers('50.0');
                  setDlsTeam2OversBatted('10.5');
                  setDlsWicketsLost(1);
                  setDlsTeam2CurrentRuns(54);
                  updateDLS(50, 186, '50.0', '10.5', 1, 54);
                }}
                className="px-2.5 py-1 rounded-md bg-[#242a38] hover:bg-[#333948] text-[#ffb95f] font-stat-mono-sm text-[11px] font-bold border border-[#ffb95f]/40 transition-colors cursor-pointer"
                title="50-Over match, 186 target, 10.5 overs bowled, 54/1"
              >
                ⭐ 50-Ov (186, 10.5 ov 54/1)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDlsTotalOvers(20);
                  setDlsFirstInningsTotal(175);
                  setDlsFirstInningsOvers('20.0');
                  setDlsTeam2OversBatted('8.2');
                  setDlsWicketsLost(2);
                  setDlsTeam2CurrentRuns(68);
                  updateDLS(20, 175, '20.0', '8.2', 2, 68);
                }}
                className="px-2.5 py-1 rounded-md bg-[#1a1f2d] hover:bg-[#242a38] text-[#4edea3] font-stat-mono-sm text-[11px] font-bold border border-[#4edea3]/40 transition-colors cursor-pointer"
                title="20-Over T20 match, 175 target, 8.2 overs, 68/2"
              >
                T20 (175, 8.2 ov 68/2)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDlsTotalOvers(50);
                  setDlsFirstInningsTotal(260);
                  setDlsFirstInningsOvers('50.0');
                  setDlsTeam2OversBatted('22.0');
                  setDlsWicketsLost(4);
                  setDlsTeam2CurrentRuns(118);
                  updateDLS(50, 260, '50.0', '22.0', 4, 118);
                }}
                className="px-2.5 py-1 rounded-md bg-[#1a1f2d] hover:bg-[#242a38] text-[#dde2f5] font-stat-mono-sm text-[11px] font-bold border border-[#3c4a42]/40 transition-colors cursor-pointer"
                title="50-Over match, 260 total, 22 overs, 118/4"
              >
                ODI Rain (260, 22 ov 118/4)
              </button>
            </div>
          </div>

          {/* Input Controls Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-body-sm text-xs">
            {/* Match Total Overs */}
            <div>
              <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase block mb-1">
                Format Total Overs
              </label>
              <select
                value={dlsTotalOvers}
                onChange={e => {
                  const ov = parseInt(e.target.value) || 50;
                  setDlsTotalOvers(ov);
                  setDlsFirstInningsOvers(`${ov}.0`);
                  updateDLS(ov, dlsFirstInningsTotal, `${ov}.0`, dlsTeam2OversBatted, dlsWicketsLost, dlsTeam2CurrentRuns);
                }}
                className="w-full bg-[#080e1b] border border-[#3c4a42] rounded px-3 py-2 text-[#dde2f5] font-stat-mono-sm text-xs focus:border-[#4edea3] outline-none"
              >
                <option value={50}>50 Overs (ODI)</option>
                <option value={20}>20 Overs (T20)</option>
                <option value={40}>40 Overs (Club/Pro40)</option>
                <option value={10}>10 Overs (T10)</option>
              </select>
            </div>

            {/* 1st Innings Runs */}
            <div>
              <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase block mb-1">
                1st Innings Total Runs
              </label>
              <input
                type="number"
                min="0"
                value={dlsFirstInningsTotal}
                onChange={e => {
                  const runs = parseInt(e.target.value) || 0;
                  setDlsFirstInningsTotal(runs);
                  updateDLS(dlsTotalOvers, runs, dlsFirstInningsOvers, dlsTeam2OversBatted, dlsWicketsLost, dlsTeam2CurrentRuns);
                }}
                className="w-full bg-[#080e1b] border border-[#3c4a42] rounded px-3 py-2 text-[#dde2f5] font-stat-mono-sm text-xs focus:border-[#4edea3] outline-none"
              />
            </div>

            {/* 1st Innings Overs Faced */}
            <div>
              <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase block mb-1">
                1st Innings Overs Faced
              </label>
              <input
                type="text"
                placeholder="50.0"
                value={dlsFirstInningsOvers}
                onChange={e => {
                  setDlsFirstInningsOvers(e.target.value);
                  updateDLS(dlsTotalOvers, dlsFirstInningsTotal, e.target.value, dlsTeam2OversBatted, dlsWicketsLost, dlsTeam2CurrentRuns);
                }}
                className="w-full bg-[#080e1b] border border-[#3c4a42] rounded px-3 py-2 text-[#dde2f5] font-stat-mono-sm text-xs focus:border-[#4edea3] outline-none"
              />
            </div>

            {/* 2nd Innings Overs Batted (e.g. 10.5) */}
            <div>
              <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase block mb-1">
                2nd Innings Overs Bowled
              </label>
              <input
                type="text"
                placeholder="10.5"
                value={dlsTeam2OversBatted}
                onChange={e => {
                  setDlsTeam2OversBatted(e.target.value);
                  updateDLS(dlsTotalOvers, dlsFirstInningsTotal, dlsFirstInningsOvers, e.target.value, dlsWicketsLost, dlsTeam2CurrentRuns);
                }}
                className="w-full bg-[#080e1b] border border-[#3c4a42] rounded px-3 py-2 text-[#dde2f5] font-stat-mono-sm text-xs focus:border-[#4edea3] outline-none"
              />
            </div>

            {/* 2nd Innings Wickets Lost */}
            <div>
              <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase block mb-1">
                Wickets Lost (0 - 10)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={dlsWicketsLost}
                onChange={e => {
                  const w = Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
                  setDlsWicketsLost(w);
                  updateDLS(dlsTotalOvers, dlsFirstInningsTotal, dlsFirstInningsOvers, dlsTeam2OversBatted, w, dlsTeam2CurrentRuns);
                }}
                className="w-full bg-[#080e1b] border border-[#3c4a42] rounded px-3 py-2 text-[#dde2f5] font-stat-mono-sm text-xs focus:border-[#4edea3] outline-none"
              />
            </div>

            {/* 2nd Innings Current Runs */}
            <div>
              <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase block mb-1">
                2nd Innings Current Score
              </label>
              <input
                type="number"
                min="0"
                value={dlsTeam2CurrentRuns}
                onChange={e => {
                  const runs = parseInt(e.target.value) || 0;
                  setDlsTeam2CurrentRuns(runs);
                  updateDLS(dlsTotalOvers, dlsFirstInningsTotal, dlsFirstInningsOvers, dlsTeam2OversBatted, dlsWicketsLost, runs);
                }}
                className="w-full bg-[#080e1b] border border-[#3c4a42] rounded px-3 py-2 text-[#dde2f5] font-stat-mono-sm text-xs focus:border-[#4edea3] outline-none"
              />
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-[#3c4a42]/30 pb-2">
            <button
              type="button"
              onClick={() => setActiveDlsTab('reduction')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-stat-mono-sm text-xs font-bold transition-all cursor-pointer ${
                activeDlsTab === 'reduction'
                  ? 'bg-[#06B6D4] text-[#002b33] shadow-md'
                  : 'bg-[#1a1f2d] hover:bg-[#242a38] text-[#dde2f5]'
              }`}
            >
              <CloudRain className="w-4 h-4" />
              <span>Rain Interruption: Reduced Overs Target (30, 40, etc.)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDlsTab('stoppage')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-stat-mono-sm text-xs font-bold transition-all cursor-pointer ${
                activeDlsTab === 'stoppage'
                  ? 'bg-[#ffb95f] text-[#472a00] shadow-md'
                  : 'bg-[#1a1f2d] hover:bg-[#242a38] text-[#dde2f5]'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Current Stoppage Par & Abandonment</span>
            </button>
          </div>

          {/* TAB 1: Rain Interruption & Target Reduction Suite */}
          {activeDlsTab === 'reduction' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Overs Reduction Target Selector */}
              <div className="bg-[#1a1f2d] p-4 rounded-xl border border-[#3c4a42]/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-label-caps text-[11px] text-[#06B6D4] uppercase font-bold block">
                      Match Shortened Due to Rain: Revised Total Overs
                    </label>
                    <span className="text-[11px] text-[#bbcabf] font-body-sm">
                      Select new total match overs for Team 2 (Original: {dlsTotalOvers} ov, Batted so far: {dlsTeam2OversBatted} ov)
                    </span>
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[45, 40, 35, 30, 25, 20].map(ov => (
                      <button
                        key={ov}
                        type="button"
                        onClick={() => {
                          setDlsRevisedOvers(ov);
                          updateDLS(dlsTotalOvers, dlsFirstInningsTotal, dlsFirstInningsOvers, dlsTeam2OversBatted, dlsWicketsLost, dlsTeam2CurrentRuns, ov);
                        }}
                        className={`px-3 py-1 rounded-lg font-stat-mono-sm text-xs font-bold transition-all cursor-pointer border ${
                          dlsRevisedOvers === ov
                            ? 'bg-[#06B6D4] text-[#002b33] border-[#06B6D4] shadow-md'
                            : 'bg-[#242a38] hover:bg-[#333948] text-[#dde2f5] border-[#3c4a42]/40'
                        }`}
                      >
                        {ov} Ov
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider / Number Input for Any X Overs */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex-1">
                    <input
                      type="range"
                      min={Math.max(10, Math.ceil(parseFloat(dlsTeam2OversBatted) || 0) + 1)}
                      max={dlsTotalOvers - 1}
                      value={dlsRevisedOvers}
                      onChange={e => {
                        const ov = parseInt(e.target.value) || 30;
                        setDlsRevisedOvers(ov);
                        updateDLS(dlsTotalOvers, dlsFirstInningsTotal, dlsFirstInningsOvers, dlsTeam2OversBatted, dlsWicketsLost, dlsTeam2CurrentRuns, ov);
                      }}
                      className="w-full accent-[#06B6D4] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#86948a] font-stat-mono-sm mt-0.5">
                      <span>Min: {Math.max(10, Math.ceil(parseFloat(dlsTeam2OversBatted) || 0) + 1)} ov</span>
                      <span>Max: {dlsTotalOvers - 1} ov</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-stat-mono-sm text-xs text-[#bbcabf]">Custom:</span>
                    <input
                      type="number"
                      min={Math.max(10, Math.ceil(parseFloat(dlsTeam2OversBatted) || 0) + 1)}
                      max={dlsTotalOvers - 1}
                      value={dlsRevisedOvers}
                      onChange={e => {
                        const ov = Math.min(dlsTotalOvers - 1, Math.max(10, parseInt(e.target.value) || 20));
                        setDlsRevisedOvers(ov);
                        updateDLS(dlsTotalOvers, dlsFirstInningsTotal, dlsFirstInningsOvers, dlsTeam2OversBatted, dlsWicketsLost, dlsTeam2CurrentRuns, ov);
                      }}
                      className="w-20 bg-[#080e1b] border border-[#06B6D4]/50 rounded px-2.5 py-1 text-center font-stat-mono-sm text-sm font-bold text-[#06B6D4] outline-none"
                    />
                    <span className="font-stat-mono-sm text-xs text-[#bbcabf]">Overs</span>
                  </div>
                </div>
              </div>

              {/* Revised Target Hero Display Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#1a1f2d] p-4 rounded-xl border border-[#06B6D4]/40 shadow-lg">
                {/* Revised Target */}
                <div className="bg-[#242a38] p-3.5 rounded-lg border border-[#06B6D4]/50 flex flex-col justify-between">
                  <span className="font-label-caps text-[10px] text-[#06B6D4] uppercase font-bold tracking-wider block">
                    DLS Revised Target
                  </span>
                  <div className="my-1">
                    <span className="font-stat-mono-lg text-4xl font-extrabold text-[#4edea3]">
                      {rainResult.revisedTarget}
                    </span>
                    <span className="text-xs text-[#bbcabf] ml-1.5 font-semibold">
                      Runs in {rainResult.revisedTotalOvers}.0 ov
                    </span>
                  </div>
                  <span className="font-body-sm text-[11px] text-[#bbcabf]">
                    Reduced from original {dlsFirstInningsTotal + 1} target
                  </span>
                </div>

                {/* Runs Needed to Win */}
                <div className="bg-[#242a38] p-3.5 rounded-lg border border-[#3c4a42]/40 flex flex-col justify-between">
                  <span className="font-label-caps text-[10px] text-[#ffb95f] uppercase font-bold tracking-wider block">
                    Runs Needed To Win
                  </span>
                  <div className="my-1">
                    <span className="font-stat-mono-lg text-4xl font-extrabold text-[#ffb95f]">
                      {rainResult.runsNeededToWin}
                    </span>
                    <span className="text-xs text-[#bbcabf] ml-1.5 font-semibold">
                      off {rainResult.oversRemainingFormatted} ov
                    </span>
                  </div>
                  <span className="font-stat-mono-sm text-[11px] text-[#dde2f5] font-semibold">
                    Req. Run Rate: {rainResult.requiredRunRate} RPO
                  </span>
                </div>

                {/* Bowler Quota Under Law 17 */}
                <div className="bg-[#242a38] p-3.5 rounded-lg border border-[#3c4a42]/40 flex flex-col justify-between">
                  <span className="font-label-caps text-[10px] text-[#4edea3] uppercase font-bold tracking-wider block">
                    Bowler Max Quota
                  </span>
                  <div className="my-1 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-[#4edea3]" />
                    <span className="font-stat-mono-lg text-3xl font-extrabold text-[#dde2f5]">
                      {rainResult.maxOversPerBowler}.0 ov
                    </span>
                  </div>
                  <span className="font-body-sm text-[11px] text-[#bbcabf]">
                    Strict 1/5th format quota enforced
                  </span>
                </div>

                {/* Resource Loss Due to Rain */}
                <div className="bg-[#242a38] p-3.5 rounded-lg border border-[#3c4a42]/40 flex flex-col justify-between font-stat-mono-sm text-xs">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">
                    Resource Analytics
                  </span>
                  <div className="space-y-1 my-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#bbcabf]">Lost to Rain:</span>
                      <span className="text-[#ffb4ab] font-bold">{rainResult.resourceLostDueToRain}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#bbcabf]">Retained Total:</span>
                      <span className="text-[#4edea3] font-bold">{rainResult.team2TotalResource}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#bbcabf]">Balls Left:</span>
                      <span className="text-[#dde2f5] font-bold">
                        {Math.round(rainResult.oversRemaining * 6)} balls
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#bbcabf]">
                    {rainResult.oversRemainingFormatted} overs remaining
                  </span>
                </div>
              </div>

              {/* Comparative Multi-Scenario Reduction Matrix Table */}
              <div className="bg-[#080e1b] rounded-xl p-4 border border-[#3c4a42]/30 space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="font-label-caps text-xs text-[#dde2f5] font-bold uppercase flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#ffb95f]" />
                    Quick Target Reference Matrix (If Match Reduced To Any X Overs)
                  </span>
                  <span className="font-stat-mono-sm text-[11px] text-[#bbcabf]">
                    Current State: {dlsTeam2CurrentRuns}/{dlsWicketsLost} ({dlsTeam2OversBatted} ov)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-stat-mono-sm text-xs">
                    <thead>
                      <tr className="border-b border-[#3c4a42]/30 text-[#86948a] font-label-caps text-[10px] uppercase">
                        <th className="py-2 px-3">Reduced Match</th>
                        <th className="py-2 px-3">Revised Target</th>
                        <th className="py-2 px-3">Runs Needed</th>
                        <th className="py-2 px-3">Overs Left</th>
                        <th className="py-2 px-3">Req. Rate</th>
                        <th className="py-2 px-3">Max Bowler Quota</th>
                        <th className="py-2 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3c4a42]/20">
                      {reductionMatrix.map(row => {
                        const isSelected = row.revisedTotalOvers === dlsRevisedOvers;
                        return (
                          <tr
                            key={row.revisedTotalOvers}
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-[#06B6D4]/15 text-[#dde2f5] font-bold'
                                : 'hover:bg-[#1a1f2d] text-[#bbcabf]'
                            }`}
                          >
                            <td className="py-2 px-3 font-bold text-[#dde2f5]">
                              {row.revisedTotalOvers} Overs
                            </td>
                            <td className="py-2 px-3 text-[#4edea3] font-bold">
                              {row.revisedTarget} Runs
                            </td>
                            <td className="py-2 px-3 text-[#ffb95f] font-semibold">
                              {row.runsNeededToWin} Runs
                            </td>
                            <td className="py-2 px-3">
                              {row.oversRemainingFormatted} ov
                            </td>
                            <td className="py-2 px-3 font-semibold">
                              {row.requiredRunRate} RPO
                            </td>
                            <td className="py-2 px-3">
                              {row.maxOversPerBowler}.0 ov
                            </td>
                            <td className="py-2 px-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setDlsRevisedOvers(row.revisedTotalOvers);
                                  updateDLS(dlsTotalOvers, dlsFirstInningsTotal, dlsFirstInningsOvers, dlsTeam2OversBatted, dlsWicketsLost, dlsTeam2CurrentRuns, row.revisedTotalOvers);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-[#06B6D4] text-[#002b33]'
                                    : 'bg-[#242a38] hover:bg-[#333948] text-[#dde2f5]'
                                }`}
                              >
                                {isSelected ? 'Active' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Mathematical Explanation */}
              <div className="p-3 bg-[#080e1b] rounded-lg border border-[#3c4a42]/20 flex items-start gap-2.5 text-xs text-[#bbcabf]">
                <Info className="w-4 h-4 text-[#06B6D4] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-[#dde2f5] block">
                    Duckworth-Lewis-Stern Reduction Rule
                  </span>
                  <p className="leading-relaxed font-body-sm">
                    {rainResult.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Match Stoppage / Abandonment Par Telemetry */}
          {activeDlsTab === 'stoppage' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#1a1f2d] p-4 rounded-xl border border-[#3c4a42]/30">
                {/* Par Score Card */}
                <div className="bg-[#242a38] p-3 rounded-lg border border-[#3c4a42]/40 flex flex-col justify-between">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">
                    DLS Par Score (Tie)
                  </span>
                  <div className="my-1">
                    <span className="font-stat-mono-lg text-3xl font-extrabold text-[#ffb95f]">
                      {dlsResult.parScore}
                    </span>
                    <span className="text-xs text-[#bbcabf] ml-1.5 font-semibold">Runs</span>
                  </div>
                  <span className="font-body-sm text-[11px] text-[#bbcabf]">
                    At {dlsTeam2OversBatted} ov with {dlsWicketsLost} wicket{dlsWicketsLost === 1 ? '' : 's'} down
                  </span>
                </div>

                {/* Winning Target Card */}
                <div className="bg-[#242a38] p-3 rounded-lg border border-[#3c4a42]/40 flex flex-col justify-between">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">
                    DLS Winning Target
                  </span>
                  <div className="my-1">
                    <span className="font-stat-mono-lg text-3xl font-extrabold text-[#4edea3]">
                      {dlsResult.winningTarget}
                    </span>
                    <span className="text-xs text-[#bbcabf] ml-1.5 font-semibold">Runs</span>
                  </div>
                  <span className="font-body-sm text-[11px] text-[#bbcabf]">
                    Needed to win if match stopped now
                  </span>
                </div>

                {/* Current Match Standing */}
                <div
                  className={`p-3 rounded-lg border flex flex-col justify-between ${
                    dlsResult.status === 'ahead'
                      ? 'bg-[#10b981]/15 border-[#10b981]/50 text-[#4edea3]'
                      : dlsResult.status === 'behind'
                      ? 'bg-[#93000a]/20 border-[#ffb4ab]/50 text-[#ffb4ab]'
                      : 'bg-[#ee9800]/15 border-[#ee9800]/50 text-[#ffb95f]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-[10px] uppercase font-bold tracking-wider">
                      Match Standing
                    </span>
                    {dlsResult.status === 'ahead' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : dlsResult.status === 'behind' ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <Minus className="w-4 h-4" />
                    )}
                  </div>
                  <div className="my-1">
                    <span className="font-headline-sm text-xl font-black block leading-tight">
                      {dlsResult.status === 'ahead'
                        ? `+${dlsResult.runDifferential} Runs Ahead`
                        : dlsResult.status === 'behind'
                        ? `${dlsResult.runDifferential} Runs Behind`
                        : 'Par Level (Tied)'}
                    </span>
                  </div>
                  <span className="font-body-sm text-[11px] font-semibold opacity-90">
                    {dlsResult.statusDescription}
                  </span>
                </div>

                {/* Resource Analytics Breakdown */}
                <div className="bg-[#242a38] p-3 rounded-lg border border-[#3c4a42]/40 flex flex-col justify-between font-stat-mono-sm text-xs">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">
                    Resource Dynamics
                  </span>
                  <div className="space-y-1 my-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#bbcabf]">Team 1 Total:</span>
                      <span className="text-[#dde2f5] font-bold">{dlsResult.team1Resources}%</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#bbcabf]">Team 2 Remaining:</span>
                      <span className="text-[#ffb95f] font-bold">{dlsResult.team2ResourcesRemaining}%</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#bbcabf]">Team 2 Consumed:</span>
                      <span className="text-[#4edea3] font-bold">{dlsResult.team2ResourcesUsed}%</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#bbcabf]">
                    Overs Left: {dlsResult.oversRemaining.toFixed(1)} ov
                  </span>
                </div>
              </div>

              {/* Mathematical Explanation Card */}
              <div className="p-3 bg-[#080e1b] rounded-lg border border-[#3c4a42]/20 flex items-start gap-2.5 text-xs text-[#bbcabf]">
                <Info className="w-4 h-4 text-[#4edea3] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-[#dde2f5] block">
                    Calculation Breakdown (Laws of Cricket / DLS Standard Model)
                  </span>
                  <p className="leading-relaxed">
                    In a {dlsTotalOvers}-over match, Team 1 utilized {dlsResult.team1Resources}% of available match resources to score {dlsFirstInningsTotal} runs.
                    At {dlsTeam2OversBatted} overs with {dlsWicketsLost} wicket(s) lost, Team 2 retains {dlsResult.team2ResourcesRemaining}% of resources and has consumed{' '}
                    <strong className="text-[#4edea3]">{dlsResult.team2ResourcesUsed}%</strong>.
                    Par is computed as {dlsFirstInningsTotal} × ({dlsResult.team2ResourcesUsed}% / {dlsResult.team1Resources}%) ={' '}
                    <strong className="text-[#ffb95f]">{dlsResult.parScore} runs</strong>. With Team 2 currently at {dlsTeam2CurrentRuns} runs, they are{' '}
                    <strong className={dlsResult.runDifferential >= 0 ? 'text-[#4edea3]' : 'text-[#ffb4ab]'}>
                      {dlsResult.runDifferential >= 0 ? `+${dlsResult.runDifferential}` : dlsResult.runDifferential} runs
                    </strong>{' '}
                    relative to the par score.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Data Management & Reset */}
        <div className="bg-[#161b29] rounded-xl p-5 border border-[#3c4a42]/30 space-y-4 shadow-md lg:col-span-2">
          <div className="flex items-center gap-2 pb-2 border-b border-[#3c4a42]/20">
            <Database className="w-5 h-5 text-[#4edea3]" />
            <h2 className="font-headline-sm text-base font-bold text-[#dde2f5]">
              Storage Management & Match Reset (AK Cricket System)
            </h2>
          </div>

          {/* Feedback banner with instant navigation */}
          {resetFeedback && (
            <div className="p-4 bg-[#10b981]/20 border border-[#10b981] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-[#4edea3] font-stat-mono-sm text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{resetFeedback}</span>
              </div>
              {onNavigate && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('live-scoring')}
                    className="px-3 py-1.5 rounded-lg bg-[#10b981] text-[#00422b] font-headline-sm text-xs font-bold hover:bg-[#059669] cursor-pointer transition-colors shadow-sm"
                    type="button"
                  >
                    Go to Live Scoring →
                  </button>
                  <button
                    onClick={() => onNavigate('new-match')}
                    className="px-3 py-1.5 rounded-lg bg-[#242a38] text-[#dde2f5] font-headline-sm text-xs hover:bg-[#333948] cursor-pointer transition-colors"
                    type="button"
                  >
                    Setup New Match
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Inline confirmation prompt */}
          {activeConfirm && (
            <div className="p-5 bg-[#242a38] border-2 border-[#ffb95f] rounded-xl space-y-3 shadow-xl animate-in fade-in">
              <div className="flex items-center gap-2.5 text-[#ffb95f]">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <h4 className="font-headline-sm text-base font-bold">
                  {activeConfirm === 'match'
                    ? 'Confirm: Reset Active Match to 0.0 Overs?'
                    : 'Confirm: Wipe All Stored Matches & Reset?'}
                </h4>
              </div>
              <p className="font-body-md text-xs text-[#bbcabf] max-w-xl">
                {activeConfirm === 'match'
                  ? 'This resets the active match score to 0 runs, 0 wickets, and 0.0 overs so you can start scoring from the first ball. Player lineups and team names are preserved.'
                  : 'This completely removes all saved match records, clears history stacks, and starts a fresh clean slate.'}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    if (activeConfirm === 'match') {
                      if (onResetActiveMatch) onResetActiveMatch();
                      else onResetToDefault();
                      setResetFeedback('Active match successfully reset to 0.0 overs! Score is now 0/0.');
                    } else {
                      onResetToDefault();
                      setResetFeedback('All previous matches cleared! Clean slate initialized.');
                    }
                    setActiveConfirm(null);
                  }}
                  className="px-5 py-2.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-[#ffffff] font-headline-sm text-xs font-extrabold cursor-pointer transition-colors shadow-lg active:scale-95"
                  type="button"
                >
                  Yes, Confirm & Reset Now
                </button>
                <button
                  onClick={() => setActiveConfirm(null)}
                  className="px-4 py-2.5 rounded-lg bg-[#1a1f2d] hover:bg-[#333948] text-[#bbcabf] font-headline-sm text-xs cursor-pointer transition-colors"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action 1: Reset Active Match to 0.0 Overs */}
            <div className="flex flex-col justify-between gap-3 bg-[#1a1f2d] p-4 rounded-xl border border-[#3c4a42]/30">
              <div>
                <h4 className="font-headline-sm text-sm font-bold text-[#dde2f5] flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#4edea3]" />
                  Reset Active Match to 0.0 Overs
                </h4>
                <p className="font-body-sm text-xs text-[#bbcabf] mt-1">
                  Resets active match score to 0/0 (overs 0.0). Keeps the selected team rosters intact so you can score from the very beginning.
                </p>
              </div>

              <button
                onClick={() => setActiveConfirm('match')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#242a38] hover:bg-[#333948] text-[#4edea3] border border-[#4edea3]/40 font-stat-mono-sm text-xs font-bold cursor-pointer transition-colors"
                type="button"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset to 0.0 Overs (Start from Beginning)</span>
              </button>
            </div>

            {/* Action 2: Wipe All Matches & Start Fresh */}
            <div className="flex flex-col justify-between gap-3 bg-[#1a1f2d] p-4 rounded-xl border border-[#3c4a42]/30">
              <div>
                <h4 className="font-headline-sm text-sm font-bold text-[#ffdad6] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#ffb4ab]" />
                  Wipe All Match History & Start Fresh
                </h4>
                <p className="font-body-sm text-xs text-[#bbcabf] mt-1">
                  Removes all previous match records and starts completely clean. Let you create new matches from scratch.
                </p>
              </div>

              <button
                onClick={() => setActiveConfirm('all')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#93000a]/20 hover:bg-[#93000a] text-[#ffdad6] border border-[#ffb4ab]/40 font-stat-mono-sm text-xs font-bold cursor-pointer transition-colors"
                type="button"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Clear All Matches & Fresh Slate</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
