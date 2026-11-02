/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BarChart3, TrendingUp, PieChart, ScatterChart, Shield, Award } from 'lucide-react';
import { Match } from '../types/cricket';
import { ensureInningsPartnerships } from '../engine/cricketEngine';

interface AnalyticsProps {
  match: Match;
}

export const Analytics: React.FC<AnalyticsProps> = ({ match }) => {
  const [activeTab, setActiveTab] = useState<'run_rate' | 'wagon' | 'partnerships' | 'extras'>('run_rate');
  const [wagonInningsIndex, setWagonInningsIndex] = useState<number>(() => match.currentInningsIndex);
  const [partnershipInningsIndex, setPartnershipInningsIndex] = useState<number>(() => match.currentInningsIndex);
  const [extrasInningsIndex, setExtrasInningsIndex] = useState<'both' | 0 | 1>('both');
  const [selectedBatterFilter, setSelectedBatterFilter] = useState<string>('all');
  const [overBattingView, setOverBattingView] = useState<'both' | 0 | 1>('both');
  const [hoveredWicketInfo, setHoveredWicketInfo] = useState<{
    teamName: string;
    wicketNumber: number;
    batterName: string;
    score: number;
    balls: number;
    teamRuns: number;
    overs: string;
    text?: string;
  } | null>(null);
  const [hoveredWormOver, setHoveredWormOver] = useState<number | null>(null);

  const inn1 = match.innings[0];
  const inn2 = match.innings[1];
  const totalOvers = match.totalOvers || 20;

  // Deduplicate Fall of Wickets to ensure a batter cannot be displayed out twice
  const sanitizeFOW = (fows: typeof inn1.fallOfWickets) => {
    if (!fows) return [];
    const seen = new Set<string>();
    const res: typeof inn1.fallOfWickets = [];
    for (const f of fows) {
      const k = f.batterId || f.batterName;
      if (!seen.has(k)) {
        seen.add(k);
        res.push(f);
      }
    }
    return res.map((f, i) => ({ ...f, wicketNumber: i + 1 }));
  };

  const fow1 = sanitizeFOW(inn1?.fallOfWickets || []);
  const fow2 = sanitizeFOW(inn2?.fallOfWickets || []);

  // Helper to construct complete over progression for an innings
  const buildDetailedOvers = (innings: typeof inn1, formatOvers: number) => {
    if (!innings) return [];
    const completedOversCount = Math.ceil(innings.legalBalls / 6);
    const ppEnd = formatOvers === 20 ? 6 : formatOvers === 50 ? 10 : Math.max(1, Math.round(formatOvers * 0.3));
    const deathStart = formatOvers === 20 ? 16 : formatOvers === 50 ? 41 : Math.max(ppEnd + 1, Math.round(formatOvers * 0.75) + 1);

    const recordedOversMap = new Map<number, { runs: number; wickets: number; bowlerName: string; isMaiden: boolean }>();

    // 1. Check existing overs array
    if (innings.overs && innings.overs.length > 0) {
      innings.overs.forEach(ov => {
        const num = ov.displayOverNumber || (ov.overNumber + 1);
        recordedOversMap.set(num, {
          runs: ov.runsConceded,
          wickets: ov.wickets,
          bowlerName: ov.bowlerName,
          isMaiden: ov.isMaiden || (ov.runsConceded === 0 && (ov.deliveries?.length >= 6 || ov.isCompleted)),
        });
      });
    }

    // 2. Check deliveries grouped by over
    if (innings.deliveries && innings.deliveries.length > 0) {
      const deliveriesByOver = new Map<number, typeof innings.deliveries>();
      innings.deliveries.forEach(d => {
        const ovNum = d.overNumber + 1;
        if (!deliveriesByOver.has(ovNum)) deliveriesByOver.set(ovNum, []);
        deliveriesByOver.get(ovNum)!.push(d);
      });

      deliveriesByOver.forEach((dels, ovNum) => {
        if (!recordedOversMap.has(ovNum)) {
          const runs = dels.reduce((sum, d) => sum + d.totalRuns, 0);
          const wkts = dels.filter(d => !!d.dismissal).length;
          const bowlerName = dels[0]?.bowlerName || 'Bowler';
          recordedOversMap.set(ovNum, {
            runs,
            wickets: wkts,
            bowlerName,
            isMaiden: runs === 0 && dels.length >= 6,
          });
        }
      });
    }

    const maxOverNum = Math.max(completedOversCount, ...Array.from(recordedOversMap.keys()), 0);
    if (maxOverNum === 0) return [];

    // Group fall of wickets by over number (1-based)
    const fowByOver = new Map<number, typeof innings.fallOfWickets>();
    (innings.fallOfWickets || []).forEach(fow => {
      const parts = fow.overs.split('.');
      const ovIdx = parseInt(parts[0], 10) || 0;
      const ovNum = ovIdx + 1;
      if (!fowByOver.has(ovNum)) fowByOver.set(ovNum, []);
      fowByOver.get(ovNum)!.push(fow);
    });

    let knownRuns = 0;
    let unrecordedCount = 0;
    for (let o = 1; o <= maxOverNum; o++) {
      if (recordedOversMap.has(o)) {
        knownRuns += recordedOversMap.get(o)!.runs;
      } else {
        unrecordedCount++;
      }
    }

    const remainingRuns = Math.max(0, innings.runs - knownRuns);
    const bowlers = (innings.bowlingCard || []).map(b => b.playerName);

    const result = [];
    let runningCumRuns = 0;
    let runningCumWkts = 0;

    for (let o = 1; o <= maxOverNum; o++) {
      const fows = fowByOver.get(o) || [];
      let runs = 0;
      let wickets = fows.length;
      let bowlerName = bowlers.length > 0 ? bowlers[(o - 1) % bowlers.length] : 'Bowler';
      let isMaiden = false;

      if (recordedOversMap.has(o)) {
        const recorded = recordedOversMap.get(o)!;
        runs = recorded.runs;
        wickets = Math.max(recorded.wickets, fows.length);
        bowlerName = recorded.bowlerName || bowlerName;
        isMaiden = recorded.isMaiden;
      } else if (unrecordedCount > 0) {
        const avg = remainingRuns / unrecordedCount;
        const variance = Math.sin(o * 1.5) * 3 + (wickets > 0 ? -1 : (o <= ppEnd ? 1.5 : (o >= deathStart ? 3 : 0)));
        runs = Math.max(0, Math.round(avg + variance));
      }

      runningCumRuns += runs;
      runningCumWkts += wickets;

      const phase: 'powerplay' | 'middle' | 'death' = o <= ppEnd ? 'powerplay' : o >= deathStart ? 'death' : 'middle';

      result.push({
        overNumber: o,
        runs,
        wickets,
        bowlerName,
        isMaiden,
        cumRuns: runningCumRuns,
        cumWickets: runningCumWkts,
        runRate: runningCumRuns / o,
        fowInOver: fows,
        phase,
      });
    }

    // Align cumulative runs to exact innings runs if any unrecorded overs existed
    if (unrecordedCount > 0 && result.length > 0) {
      const diff = innings.runs - result[result.length - 1].cumRuns;
      if (diff !== 0) {
        const share = diff / unrecordedCount;
        let adjustedCum = 0;
        result.forEach(item => {
          if (!recordedOversMap.has(item.overNumber)) {
            item.runs = Math.max(0, Math.round(item.runs + share));
          }
          adjustedCum += item.runs;
          item.cumRuns = adjustedCum;
          item.runRate = adjustedCum / item.overNumber;
        });
        const finalDiff = innings.runs - result[result.length - 1].cumRuns;
        result[result.length - 1].runs = Math.max(0, result[result.length - 1].runs + finalDiff);
        result[result.length - 1].cumRuns = innings.runs;
      }
    }

    return result;
  };

  const detailedOvers1 = buildDetailedOvers(inn1, totalOvers);
  const detailedOvers2 = buildDetailedOvers(inn2, totalOvers);

  // Phase statistics helper
  const calculatePhaseStats = (detailedOvers: ReturnType<typeof buildDetailedOvers>, formatOvers: number) => {
    const ppEnd = formatOvers === 20 ? 6 : formatOvers === 50 ? 10 : Math.max(1, Math.round(formatOvers * 0.3));
    const deathStart = formatOvers === 20 ? 16 : formatOvers === 50 ? 41 : Math.max(ppEnd + 1, Math.round(formatOvers * 0.75) + 1);

    const ppOvers = detailedOvers.filter(o => o.overNumber <= ppEnd);
    const midOvers = detailedOvers.filter(o => o.overNumber > ppEnd && o.overNumber < deathStart);
    const deathOvers = detailedOvers.filter(o => o.overNumber >= deathStart);

    const sumRuns = (arr: typeof detailedOvers) => arr.reduce((acc, o) => acc + o.runs, 0);
    const sumWkts = (arr: typeof detailedOvers) => arr.reduce((acc, o) => acc + o.wickets, 0);

    const ppRuns = sumRuns(ppOvers);
    const ppWkts = sumWkts(ppOvers);
    const midRuns = sumRuns(midOvers);
    const midWkts = sumWkts(midOvers);
    const deathRuns = sumRuns(deathOvers);
    const deathWkts = sumWkts(deathOvers);

    const highestOver = detailedOvers.reduce((prev, curr) => (curr.runs > (prev?.runs || 0) ? curr : prev), detailedOvers[0]);

    return {
      powerplay: { runs: ppRuns, wickets: ppWkts, oversCount: ppOvers.length, rr: ppOvers.length > 0 ? (ppRuns / ppOvers.length).toFixed(2) : '0.00' },
      middle: { runs: midRuns, wickets: midWkts, oversCount: midOvers.length, rr: midOvers.length > 0 ? (midRuns / midOvers.length).toFixed(2) : '0.00' },
      death: { runs: deathRuns, wickets: deathWkts, oversCount: deathOvers.length, rr: deathOvers.length > 0 ? (deathRuns / deathOvers.length).toFixed(2) : '0.00' },
      highestOver,
    };
  };

  const phaseStats1 = calculatePhaseStats(detailedOvers1, totalOvers);
  const phaseStats2 = calculatePhaseStats(detailedOvers2, totalOvers);

  // Maximum runs for worm chart scaling
  const maxRuns = Math.max(
    inn1.runs,
    inn2.runs,
    match.target || 0,
    180
  );
  const yAxisCeiling = Math.ceil((maxRuns + 15) / 25) * 25;

  // Worm SVG chart dimensions
  const svgWidth = 760;
  const svgHeight = 280;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Convert over & runs to SVG coordinates
  const getWormCoord = (overDecimal: number, runs: number) => {
    const x = padLeft + (overDecimal / totalOvers) * plotWidth;
    const y = padTop + plotHeight - (runs / yAxisCeiling) * plotHeight;
    return { x, y };
  };

  // Build points for polyline
  const wormPoints1 = [{ over: 0, runs: 0 }, ...detailedOvers1.map(o => ({ over: o.overNumber, runs: o.cumRuns }))];
  const wormPolyline1 = wormPoints1.map(p => `${getWormCoord(p.over, p.runs).x},${getWormCoord(p.over, p.runs).y}`).join(' ');
  const wormArea1 = `${getWormCoord(0, 0).x},${getWormCoord(0, 0).y} ${wormPolyline1} ${getWormCoord(wormPoints1[wormPoints1.length - 1].over, 0).x},${getWormCoord(0, 0).y}`;

  const wormPoints2 = [{ over: 0, runs: 0 }, ...detailedOvers2.map(o => ({ over: o.overNumber, runs: o.cumRuns }))];
  const wormPolyline2 = wormPoints2.map(p => `${getWormCoord(p.over, p.runs).x},${getWormCoord(p.over, p.runs).y}`).join(' ');
  const wormArea2 = `${getWormCoord(0, 0).x},${getWormCoord(0, 0).y} ${wormPolyline2} ${getWormCoord(wormPoints2[wormPoints2.length - 1].over, 0).x},${getWormCoord(0, 0).y}`;

  // Parse decimal overs from string like "2.4"
  const parseDecimalOver = (oversStr: string) => {
    const parts = (oversStr || '0').split('.');
    const ov = parseInt(parts[0], 10) || 0;
    const ball = parseInt(parts[1], 10) || 0;
    return ov + ball / 6;
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-[#0d1320] text-[#dde2f5] p-6 max-w-[1440px] mx-auto space-y-6">
      {/* Analytics Header & Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3c4a42]/30 pb-4">
        <div>
          <h1 className="font-headline-lg text-2xl font-bold text-[#dde2f5] flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[28px] text-[#4edea3]">
              query_stats
            </span>
            Match Center Analytics
          </h1>
          <p className="font-body-sm text-xs text-[#bbcabf] mt-1">
            Over progression, run rate worm charts, wagon wheel telemetry & comparative metrics
          </p>
        </div>

        {/* Tab Filters */}
        <div className="inline-flex p-1 rounded-lg bg-[#161b29] border border-[#3c4a42]/30">
          <button
            onClick={() => setActiveTab('run_rate')}
            className={`px-3.5 py-1.5 rounded-lg font-label-caps text-xs uppercase font-bold transition-all cursor-pointer ${
              activeTab === 'run_rate' ? 'bg-[#10b981] text-[#00422b]' : 'text-[#bbcabf] hover:text-[#dde2f5]'
            }`}
            type="button"
          >
            Run Rate & Worm
          </button>
          <button
            onClick={() => setActiveTab('wagon')}
            className={`px-3.5 py-1.5 rounded-lg font-label-caps text-xs uppercase font-bold transition-all cursor-pointer ${
              activeTab === 'wagon' ? 'bg-[#10b981] text-[#00422b]' : 'text-[#bbcabf] hover:text-[#dde2f5]'
            }`}
            type="button"
          >
            Wagon Wheel
          </button>
          <button
            onClick={() => setActiveTab('partnerships')}
            className={`px-3.5 py-1.5 rounded-lg font-label-caps text-xs uppercase font-bold transition-all cursor-pointer ${
              activeTab === 'partnerships' ? 'bg-[#10b981] text-[#00422b]' : 'text-[#bbcabf] hover:text-[#dde2f5]'
            }`}
            type="button"
          >
            Partnerships
          </button>
          <button
            onClick={() => setActiveTab('extras')}
            className={`px-3.5 py-1.5 rounded-lg font-label-caps text-xs uppercase font-bold transition-all cursor-pointer ${
              activeTab === 'extras' ? 'bg-[#10b981] text-[#00422b]' : 'text-[#bbcabf] hover:text-[#dde2f5]'
            }`}
            type="button"
          >
            Extras Breakdown
          </button>
        </div>
      </div>

      {/* Tab 1: Run Rate & Worm Curves */}
      {activeTab === 'run_rate' && (
        <div className="space-y-6">
          {/* View Filter: Sequential View (Both Separately) vs Single Team Only */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b29] p-4 rounded-xl border border-[#3c4a42]/30">
            <div>
              <h2 className="font-headline-sm text-base font-bold text-[#dde2f5] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#4edea3]">bar_chart</span>
                Over-by-Over Batting Breakdown
              </h2>
              <p className="font-body-sm text-xs text-[#bbcabf] mt-0.5">
                Displays 1st team batting separately, followed by 2nd team batting separately for clean readability
              </p>
            </div>

            <div className="inline-flex p-1 rounded-lg bg-[#080e1b] border border-[#3c4a42]/30 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setOverBattingView('both')}
                className={`px-3 py-1.5 rounded text-xs font-label-caps uppercase font-bold transition-all cursor-pointer ${
                  overBattingView === 'both' ? 'bg-[#10b981] text-[#00422b]' : 'text-[#bbcabf] hover:text-[#dde2f5]'
                }`}
              >
                Sequential (1st & 2nd Team)
              </button>
              <button
                type="button"
                onClick={() => setOverBattingView(0)}
                className={`px-3 py-1.5 rounded text-xs font-label-caps uppercase font-bold transition-all cursor-pointer ${
                  overBattingView === 0 ? 'bg-[#3b82f6] text-white' : 'text-[#bbcabf] hover:text-[#dde2f5]'
                }`}
              >
                1st Team ({inn1.battingTeamName}) Only
              </button>
              <button
                type="button"
                onClick={() => setOverBattingView(1)}
                className={`px-3 py-1.5 rounded text-xs font-label-caps uppercase font-bold transition-all cursor-pointer ${
                  overBattingView === 1 ? 'bg-[#10b981] text-[#00422b]' : 'text-[#bbcabf] hover:text-[#dde2f5]'
                }`}
              >
                2nd Team ({inn2.battingTeamName}) Only
              </button>
            </div>
          </div>

          {/* 1. FIRST TEAM BATTING SEPARATELY */}
          {(overBattingView === 'both' || overBattingView === 0) && (
            <div className="bg-[#161b29] rounded-xl p-6 border border-[#3c4a42]/40 shadow-lg space-y-5">
              {/* Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#3c4a42]/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/20 border border-[#3b82f6]/50 flex items-center justify-center font-headline-sm font-extrabold text-[#38bdf8] text-sm">
                    1st
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline-md text-lg font-bold text-[#dde2f5]">
                        {inn1.battingTeamName} Batting (1st Innings)
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#38bdf8] font-label-caps text-[10px] uppercase font-bold">
                        Set Score
                      </span>
                    </div>
                    <p className="font-body-sm text-xs text-[#bbcabf] mt-0.5">
                      Bowling: {inn1.bowlingTeamName} • {inn1.oversFormatted} Overs Bowled
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-[#080e1b] px-4 py-2.5 rounded-xl border border-[#3c4a42]/30">
                  <div className="text-right">
                    <span className="font-stat-mono-lg text-2xl font-extrabold text-[#38bdf8]">
                      {inn1.runs}/{inn1.wickets}
                    </span>
                    <span className="font-body-sm text-xs text-[#bbcabf] block">
                      CRR: {inn1.legalBalls > 0 ? ((inn1.runs / inn1.legalBalls) * 6).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1st Team Dedicated Over-by-Over Columns Bar Chart */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#bbcabf] px-1 font-label-caps uppercase">
                  <span>Runs Conceded Per Over (Bar height = Runs, Red dot/badge = Wicket fell)</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-[#38bdf8]"></span>
                      <span>Runs</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                      <span>Wicket (W)</span>
                    </span>
                  </div>
                </div>

                <div className="bg-[#080e1b] rounded-xl p-4 border border-[#3c4a42]/30 overflow-x-auto">
                  <div className="min-w-[650px] flex items-end gap-2.5 h-56 pt-8 pb-3 px-2 border-b border-[#3c4a42]/30">
                    {detailedOvers1.map(item => {
                      const maxBar = 24;
                      const barHeight = Math.min(100, Math.max(6, (item.runs / maxBar) * 100));
                      const hasWickets = item.wickets > 0;

                      return (
                        <div
                          key={item.overNumber}
                          className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 relative group"
                        >
                          {/* Wicket Badge on Top of Bar */}
                          {hasWickets && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-[#ef4444] text-white px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-md animate-bounce">
                              <span className="material-symbols-outlined text-[10px]">close</span>
                              <span>{item.wickets > 1 ? `${item.wickets}W` : 'W'}</span>
                            </div>
                          )}

                          {/* Runs Number on top of bar */}
                          <span
                            className={`font-stat-mono-sm text-[11px] font-bold ${
                              item.runs === 0 ? 'text-[#86948a]' : 'text-[#38bdf8]'
                            }`}
                          >
                            {item.runs}
                          </span>

                          {/* The Over Bar - Single clean solid color */}
                          <div
                            className={`w-full rounded-t-md transition-all duration-200 cursor-pointer ${
                              item.runs === 0
                                ? 'bg-[#1a2333] border border-dashed border-[#3c4a42]'
                                : 'bg-[#38bdf8] hover:bg-[#7dd3fc]'
                            }`}
                            style={{ height: `${barHeight}%` }}
                          ></div>

                          {/* Over number & bowler */}
                          <div className="flex flex-col items-center mt-1">
                            <span className="font-stat-mono-sm text-[10px] text-[#bbcabf] font-bold">
                              Ov {item.overNumber}
                            </span>
                            <span className="font-body-sm text-[9px] text-[#86948a] truncate max-w-[50px] text-center" title={item.bowlerName}>
                              {item.bowlerName.split(' ').slice(-1)[0]}
                            </span>
                          </div>

                          {/* Hover Tooltip Popup */}
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-[#1a1f2d] border border-[#3c4a42] p-2.5 rounded-lg shadow-xl text-xs z-20 pointer-events-none min-w-[130px]">
                            <span className="font-bold text-[#dde2f5]">Over {item.overNumber}</span>
                            <span className="text-[#38bdf8] font-stat-mono-sm font-bold">{item.runs} runs conceded</span>
                            <span className="text-[#bbcabf] text-[11px]">Bowler: {item.bowlerName}</span>
                            <span className="text-[#bbcabf] text-[11px]">Score at over end: {item.cumRuns}/{item.cumWickets}</span>
                            {item.fowInOver.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-[#3c4a42]/40 text-[#ffb4ab] text-[10px]">
                                {item.fowInOver.map(f => (
                                  <div key={f.wicketNumber}>
                                    W{f.wicketNumber}: {f.batterName} ({f.score})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 1st Team Phase Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="bg-[#080e1b] p-3 rounded-lg border border-[#3c4a42]/30">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">Powerplay (Ov 1-6)</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-stat-mono-md text-base font-bold text-[#38bdf8]">
                      {phaseStats1.powerplay.runs}/{phaseStats1.powerplay.wickets}
                    </span>
                    <span className="font-stat-mono-sm text-xs text-[#bbcabf]">
                      RR {phaseStats1.powerplay.rr}
                    </span>
                  </div>
                </div>

                <div className="bg-[#080e1b] p-3 rounded-lg border border-[#3c4a42]/30">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">Middle Overs (Ov 7-15)</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-stat-mono-md text-base font-bold text-[#38bdf8]">
                      {phaseStats1.middle.runs}/{phaseStats1.middle.wickets}
                    </span>
                    <span className="font-stat-mono-sm text-xs text-[#bbcabf]">
                      RR {phaseStats1.middle.rr}
                    </span>
                  </div>
                </div>

                <div className="bg-[#080e1b] p-3 rounded-lg border border-[#3c4a42]/30">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">Death Overs (Ov 16-20)</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-stat-mono-md text-base font-bold text-[#38bdf8]">
                      {phaseStats1.death.runs}/{phaseStats1.death.wickets}
                    </span>
                    <span className="font-stat-mono-sm text-xs text-[#bbcabf]">
                      RR {phaseStats1.death.rr}
                    </span>
                  </div>
                </div>

                <div className="bg-[#080e1b] p-3 rounded-lg border border-[#3c4a42]/30">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">Highest Over</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-stat-mono-md text-base font-bold text-[#ffb95f]">
                      {phaseStats1.highestOver ? `${phaseStats1.highestOver.runs} runs` : 'N/A'}
                    </span>
                    <span className="font-stat-mono-sm text-xs text-[#bbcabf]">
                      {phaseStats1.highestOver ? `Ov ${phaseStats1.highestOver.overNumber}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. SECOND TEAM BATTING SEPARATELY */}
          {(overBattingView === 'both' || overBattingView === 1) && (
            <div className="bg-[#161b29] rounded-xl p-6 border border-[#3c4a42]/40 shadow-lg space-y-5">
              {/* Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#3c4a42]/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#10b981]/20 border border-[#10b981]/50 flex items-center justify-center font-headline-sm font-extrabold text-[#4edea3] text-sm">
                    2nd
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline-md text-lg font-bold text-[#dde2f5]">
                        {inn2.battingTeamName} Batting (2nd Innings - Chase)
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-[#10b981]/20 border border-[#10b981]/40 text-[#4edea3] font-label-caps text-[10px] uppercase font-bold animate-pulse">
                        Chasing
                      </span>
                    </div>
                    <p className="font-body-sm text-xs text-[#bbcabf] mt-0.5">
                      Target: {match.target} runs • {inn2.oversFormatted} Overs Bowled
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-[#080e1b] px-4 py-2.5 rounded-xl border border-[#3c4a42]/30">
                  <div className="text-right">
                    <span className="font-stat-mono-lg text-2xl font-extrabold text-[#4edea3]">
                      {inn2.runs}/{inn2.wickets}
                    </span>
                    <span className="font-body-sm text-xs text-[#bbcabf] block">
                      CRR: {inn2.legalBalls > 0 ? ((inn2.runs / inn2.legalBalls) * 6).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2nd Team Dedicated Over-by-Over Columns Bar Chart */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#bbcabf] px-1 font-label-caps uppercase">
                  <span>Runs Conceded Per Over (Bar height = Runs, Red dot/badge = Wicket fell)</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-[#10b981]"></span>
                      <span>Runs</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                      <span>Wicket (W)</span>
                    </span>
                  </div>
                </div>

                <div className="bg-[#080e1b] rounded-xl p-4 border border-[#3c4a42]/30 overflow-x-auto">
                  <div className="min-w-[650px] flex items-end gap-2.5 h-56 pt-8 pb-3 px-2 border-b border-[#3c4a42]/30">
                    {detailedOvers2.map(item => {
                      const maxBar = 24;
                      const barHeight = Math.min(100, Math.max(6, (item.runs / maxBar) * 100));
                      const hasWickets = item.wickets > 0;

                      return (
                        <div
                          key={item.overNumber}
                          className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 relative group"
                        >
                          {/* Wicket Badge on Top of Bar */}
                          {hasWickets && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-[#ef4444] text-white px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-md animate-bounce">
                              <span className="material-symbols-outlined text-[10px]">close</span>
                              <span>{item.wickets > 1 ? `${item.wickets}W` : 'W'}</span>
                            </div>
                          )}

                          {/* Runs Number on top of bar */}
                          <span
                            className={`font-stat-mono-sm text-[11px] font-bold ${
                              item.runs === 0 ? 'text-[#86948a]' : 'text-[#4edea3]'
                            }`}
                          >
                            {item.runs}
                          </span>

                          {/* The Over Bar - Single clean solid color */}
                          <div
                            className={`w-full rounded-t-md transition-all duration-200 cursor-pointer ${
                              item.runs === 0
                                ? 'bg-[#1a2333] border border-dashed border-[#3c4a42]'
                                : 'bg-[#10b981] hover:bg-[#34d399]'
                            }`}
                            style={{ height: `${barHeight}%` }}
                          ></div>

                          {/* Over number & bowler */}
                          <div className="flex flex-col items-center mt-1">
                            <span className="font-stat-mono-sm text-[10px] text-[#bbcabf] font-bold">
                              Ov {item.overNumber}
                            </span>
                            <span className="font-body-sm text-[9px] text-[#86948a] truncate max-w-[50px] text-center" title={item.bowlerName}>
                              {item.bowlerName.split(' ').slice(-1)[0]}
                            </span>
                          </div>

                          {/* Hover Tooltip Popup */}
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-[#1a1f2d] border border-[#3c4a42] p-2.5 rounded-lg shadow-xl text-xs z-20 pointer-events-none min-w-[130px]">
                            <span className="font-bold text-[#dde2f5]">Over {item.overNumber}</span>
                            <span className="text-[#4edea3] font-stat-mono-sm font-bold">{item.runs} runs conceded</span>
                            <span className="text-[#bbcabf] text-[11px]">Bowler: {item.bowlerName}</span>
                            <span className="text-[#bbcabf] text-[11px]">Score at over end: {item.cumRuns}/{item.cumWickets}</span>
                            {item.fowInOver.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-[#3c4a42]/40 text-[#ffb4ab] text-[10px]">
                                {item.fowInOver.map(f => (
                                  <div key={f.wicketNumber}>
                                    W{f.wicketNumber}: {f.batterName} ({f.score})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2nd Team Phase Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="bg-[#080e1b] p-3 rounded-lg border border-[#3c4a42]/30">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">Powerplay (Ov 1-6)</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-stat-mono-md text-base font-bold text-[#4edea3]">
                      {phaseStats2.powerplay.runs}/{phaseStats2.powerplay.wickets}
                    </span>
                    <span className="font-stat-mono-sm text-xs text-[#bbcabf]">
                      RR {phaseStats2.powerplay.rr}
                    </span>
                  </div>
                </div>

                <div className="bg-[#080e1b] p-3 rounded-lg border border-[#3c4a42]/30">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">Middle Overs (Ov 7-15)</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-stat-mono-md text-base font-bold text-[#4edea3]">
                      {phaseStats2.middle.runs}/{phaseStats2.middle.wickets}
                    </span>
                    <span className="font-stat-mono-sm text-xs text-[#bbcabf]">
                      RR {phaseStats2.middle.rr}
                    </span>
                  </div>
                </div>

                <div className="bg-[#080e1b] p-3 rounded-lg border border-[#3c4a42]/30">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">Death Overs (Ov 16-20)</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-stat-mono-md text-base font-bold text-[#4edea3]">
                      {phaseStats2.death.runs}/{phaseStats2.death.wickets}
                    </span>
                    <span className="font-stat-mono-sm text-xs text-[#bbcabf]">
                      RR {phaseStats2.death.rr}
                    </span>
                  </div>
                </div>

                <div className="bg-[#080e1b] p-3 rounded-lg border border-[#3c4a42]/30">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">Highest Over</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-stat-mono-md text-base font-bold text-[#ffb95f]">
                      {phaseStats2.highestOver ? `${phaseStats2.highestOver.runs} runs` : 'N/A'}
                    </span>
                    <span className="font-stat-mono-sm text-xs text-[#bbcabf]">
                      {phaseStats2.highestOver ? `Ov ${phaseStats2.highestOver.overNumber}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. MATCH WORM: CUMULATIVE TRAJECTORY WITH WICKET FALL DOTS */}
          <div className="bg-[#161b29] rounded-xl p-6 border border-[#3c4a42]/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3c4a42]/30 pb-3">
              <div>
                <h3 className="font-headline-md text-lg font-bold text-[#dde2f5] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-[#4edea3]">timeline</span>
                  Match Worm: Cumulative Score Trajectory
                </h3>
                <p className="font-body-sm text-xs text-[#bbcabf] mt-0.5">
                  Over progression worm with red dots indicating every fall of wicket along the curve
                </p>
              </div>

              {/* Legend & Target Badge */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-label-caps uppercase">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1 rounded bg-[#38bdf8]"></span>
                  <span className="text-[#dde2f5] font-semibold">{inn1.battingTeamName} (1st Inn)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1 rounded bg-[#4edea3]"></span>
                  <span className="text-[#dde2f5] font-semibold">{inn2.battingTeamName} (2nd Inn)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] border border-white"></span>
                  <span className="text-[#ffb4ab] font-bold">Wicket Dismissal Dot</span>
                </div>
                {match.target && (
                  <div className="px-3 py-1 rounded bg-[#ffb95f]/20 border border-[#ffb95f]/40 font-stat-mono-sm text-xs text-[#ffb95f] font-bold">
                    Target: {match.target} Runs
                  </div>
                )}
              </div>
            </div>

            {/* Selected Wicket Details Banner (if clicked or hovered) */}
            {hoveredWicketInfo && (
              <div className="bg-[#1f2839] border border-[#ef4444]/60 p-3 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#ef4444] text-white flex items-center justify-center font-bold text-xs">
                    W{hoveredWicketInfo.wicketNumber}
                  </div>
                  <div>
                    <span className="font-headline-sm text-xs font-bold text-[#dde2f5]">
                      {hoveredWicketInfo.teamName} — {hoveredWicketInfo.wicketNumber}th Wicket: {hoveredWicketInfo.batterName}
                    </span>
                    <span className="text-[#bbcabf] font-body-sm text-xs ml-2">
                      ({hoveredWicketInfo.score} runs off {hoveredWicketInfo.balls} balls)
                    </span>
                    <span className="font-stat-mono-sm text-xs text-[#ffb4ab] block">
                      Team Score: {hoveredWicketInfo.teamRuns}/{hoveredWicketInfo.wicketNumber} at {hoveredWicketInfo.overs} overs
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHoveredWicketInfo(null)}
                  className="text-xs text-[#bbcabf] hover:text-[#dde2f5] px-2 py-1 rounded bg-[#080e1b] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* SVG Worm Line Chart Canvas */}
            <div className="relative w-full h-80 bg-[#080e1b] rounded-xl p-3 border border-[#3c4a42]/30 overflow-hidden">
              <svg className="w-full h-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                <defs>
                  {/* Innings 1 Gradient Area */}
                  <linearGradient id="inn1Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Innings 2 Gradient Area */}
                  <linearGradient id="inn2Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4edea3" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines & Run Labels */}
                {[0, 50, 100, 150, 200, 250, 300].filter(val => val <= yAxisCeiling).map(val => {
                  const y = padTop + plotHeight - (val / yAxisCeiling) * plotHeight;
                  return (
                    <g key={val}>
                      <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#1f293d" strokeWidth="1" strokeDasharray="3 3" />
                      <text x={padLeft - 8} y={y + 4} fill="#86948a" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Over Markers */}
                {Array.from({ length: totalOvers + 1 }).map((_, ov) => {
                  if (totalOvers <= 20 ? ov % 2 === 0 : ov % 5 === 0) {
                    const x = padLeft + (ov / totalOvers) * plotWidth;
                    return (
                      <g key={ov}>
                        <line x1={x} y1={padTop} x2={x} y2={padTop + plotHeight} stroke="#1a2333" strokeWidth="0.8" />
                        <text x={x} y={svgHeight - 12} fill="#86948a" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
                          {ov} ov
                        </text>
                      </g>
                    );
                  }
                  return null;
                })}

                {/* Target Score Line */}
                {match.target && (
                  <g>
                    <line
                      x1={padLeft}
                      y1={getWormCoord(0, match.target).y}
                      x2={svgWidth - padRight}
                      y2={getWormCoord(totalOvers, match.target).y}
                      stroke="#ffb95f"
                      strokeWidth="1.8"
                      strokeDasharray="5 5"
                      opacity="0.8"
                    />
                    <text
                      x={svgWidth - padRight - 6}
                      y={getWormCoord(0, match.target).y - 6}
                      fill="#ffb95f"
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      Target: {match.target}
                    </text>
                  </g>
                )}

                {/* Innings 1 Area Fill & Curve */}
                {wormPoints1.length > 1 && (
                  <>
                    <polygon points={wormArea1} fill="url(#inn1Gradient)" />
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={wormPolyline1}
                    />
                  </>
                )}

                {/* Innings 2 Area Fill & Curve */}
                {wormPoints2.length > 1 && (
                  <>
                    <polygon points={wormArea2} fill="url(#inn2Gradient)" />
                    <polyline
                      fill="none"
                      stroke="#4edea3"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={wormPolyline2}
                    />
                  </>
                )}

                {/* Innings 1 WICKET FALL DOTS (Prominent Red Dots with White Stroke) */}
                {fow1.map(fow => {
                  const decimalOver = parseDecimalOver(fow.overs);
                  const { x, y } = getWormCoord(decimalOver, fow.teamRuns);

                  return (
                    <g
                      key={`inn1-wkt-${fow.wicketNumber}`}
                      className="cursor-pointer group"
                      onClick={() =>
                        setHoveredWicketInfo({
                          teamName: inn1.battingTeamName,
                          wicketNumber: fow.wicketNumber,
                          batterName: fow.batterName,
                          score: fow.score,
                          balls: fow.balls,
                          teamRuns: fow.teamRuns,
                          overs: fow.overs,
                        })
                      }
                      onMouseEnter={() =>
                        setHoveredWicketInfo({
                          teamName: inn1.battingTeamName,
                          wicketNumber: fow.wicketNumber,
                          batterName: fow.batterName,
                          score: fow.score,
                          balls: fow.balls,
                          teamRuns: fow.teamRuns,
                          overs: fow.overs,
                        })
                      }
                    >
                      {/* Halo ring on hover */}
                      <circle cx={x} cy={y} r="9" fill="#ef4444" opacity="0.3" className="group-hover:opacity-75 transition-opacity" />
                      {/* Main Wicket Dot */}
                      <circle cx={x} cy={y} r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.8" />
                      {/* Label above dot */}
                      <text x={x} y={y - 8} fill="#fca5a5" fontSize="9" fontWeight="bold" textAnchor="middle">
                        W{fow.wicketNumber}
                      </text>
                    </g>
                  );
                })}

                {/* Innings 2 WICKET FALL DOTS (Prominent Red Dots with White Stroke) */}
                {fow2.map(fow => {
                  const decimalOver = parseDecimalOver(fow.overs);
                  const { x, y } = getWormCoord(decimalOver, fow.teamRuns);

                  return (
                    <g
                      key={`inn2-wkt-${fow.wicketNumber}`}
                      className="cursor-pointer group"
                      onClick={() =>
                        setHoveredWicketInfo({
                          teamName: inn2.battingTeamName,
                          wicketNumber: fow.wicketNumber,
                          batterName: fow.batterName,
                          score: fow.score,
                          balls: fow.balls,
                          teamRuns: fow.teamRuns,
                          overs: fow.overs,
                        })
                      }
                      onMouseEnter={() =>
                        setHoveredWicketInfo({
                          teamName: inn2.battingTeamName,
                          wicketNumber: fow.wicketNumber,
                          batterName: fow.batterName,
                          score: fow.score,
                          balls: fow.balls,
                          teamRuns: fow.teamRuns,
                          overs: fow.overs,
                        })
                      }
                    >
                      {/* Halo ring on hover */}
                      <circle cx={x} cy={y} r="9" fill="#ef4444" opacity="0.3" className="group-hover:opacity-75 transition-opacity" />
                      {/* Main Wicket Dot */}
                      <circle cx={x} cy={y} r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.8" />
                      {/* Label above dot */}
                      <text x={x} y={y - 8} fill="#fca5a5" fontSize="9" fontWeight="bold" textAnchor="middle">
                        W{fow.wicketNumber}
                      </text>
                    </g>
                  );
                })}

                {/* Active Chase Head Indicator */}
                {detailedOvers2.length > 0 && !inn2.isCompleted && (
                  (() => {
                    const lastOv = detailedOvers2[detailedOvers2.length - 1];
                    const { x, y } = getWormCoord(lastOv.overNumber, lastOv.cumRuns);
                    return (
                      <g>
                        <circle cx={x} cy={y} r="10" fill="#4edea3" opacity="0.25" className="animate-ping" />
                        <circle cx={x} cy={y} r="5.5" fill="#4edea3" stroke="#ffffff" strokeWidth="2" />
                      </g>
                    );
                  })()
                )}
              </svg>
            </div>

            {/* Fall of Wickets Timeline Pills below Worm */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* 1st Innings FOW Pills */}
              <div className="bg-[#080e1b] p-3 rounded-lg border border-[#3c4a42]/30 space-y-2">
                <span className="font-label-caps text-xs text-[#38bdf8] uppercase font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
                  {inn1.battingTeamName} Fall of Wickets ({fow1.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {fow1.map(f => (
                    <button
                      key={f.wicketNumber}
                      type="button"
                      onClick={() =>
                        setHoveredWicketInfo({
                          teamName: inn1.battingTeamName,
                          wicketNumber: f.wicketNumber,
                          batterName: f.batterName,
                          score: f.score,
                          balls: f.balls,
                          teamRuns: f.teamRuns,
                          overs: f.overs,
                        })
                      }
                      className="px-2 py-1 rounded bg-[#1a1f2d] hover:bg-[#242a38] border border-[#3c4a42]/30 text-xs font-stat-mono-sm flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                      <span className="text-[#dde2f5] font-bold">W{f.wicketNumber}:</span>
                      <span className="text-[#38bdf8]">{f.teamRuns}/{f.wicketNumber}</span>
                      <span className="text-[#bbcabf] text-[10px]">({f.batterName.split(' ').slice(-1)[0]})</span>
                    </button>
                  ))}
                  {fow1.length === 0 && (
                    <span className="text-xs text-[#86948a]">No wickets fallen yet</span>
                  )}
                </div>
              </div>

              {/* 2nd Innings FOW Pills */}
              <div className="bg-[#080e1b] p-3 rounded-lg border border-[#3c4a42]/30 space-y-2">
                <span className="font-label-caps text-xs text-[#4edea3] uppercase font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
                  {inn2.battingTeamName} Fall of Wickets ({fow2.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {fow2.map(f => (
                    <button
                      key={f.wicketNumber}
                      type="button"
                      onClick={() =>
                        setHoveredWicketInfo({
                          teamName: inn2.battingTeamName,
                          wicketNumber: f.wicketNumber,
                          batterName: f.batterName,
                          score: f.score,
                          balls: f.balls,
                          teamRuns: f.teamRuns,
                          overs: f.overs,
                        })
                      }
                      className="px-2 py-1 rounded bg-[#1a1f2d] hover:bg-[#242a38] border border-[#3c4a42]/30 text-xs font-stat-mono-sm flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                      <span className="text-[#dde2f5] font-bold">W{f.wicketNumber}:</span>
                      <span className="text-[#4edea3]">{f.teamRuns}/{f.wicketNumber}</span>
                      <span className="text-[#bbcabf] text-[10px]">({f.batterName.split(' ').slice(-1)[0]})</span>
                    </button>
                  ))}
                  {fow2.length === 0 && (
                    <span className="text-xs text-[#86948a]">No wickets fallen yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. PHASE-BY-PHASE COMPARISON TABLE */}
          <div className="bg-[#161b29] rounded-xl p-6 border border-[#3c4a42]/40 shadow-lg space-y-4">
            <h3 className="font-headline-md text-base font-bold text-[#dde2f5] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#ffb95f]">speed</span>
              Phase Comparison (Powerplay, Middle Overs, Death Overs)
            </h3>

            <div className="overflow-x-auto rounded-xl border border-[#3c4a42]/30">
              <table className="w-full text-left border-collapse font-body-sm text-xs">
                <thead>
                  <tr className="bg-[#080e1b] text-[#bbcabf] font-label-caps text-[11px] uppercase tracking-wider border-b border-[#3c4a42]/30">
                    <th className="py-3 px-4">Match Phase</th>
                    <th className="py-3 px-4 text-center">{inn1.battingTeamName} (1st Inn)</th>
                    <th className="py-3 px-4 text-center">{inn2.battingTeamName} (2nd Inn)</th>
                    <th className="py-3 px-4 text-right">Phase Differential</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3c4a42]/20 font-stat-mono-sm">
                  {/* Powerplay */}
                  <tr className="hover:bg-[#242a38]/30">
                    <td className="py-3 px-4 font-headline-sm font-bold text-[#dde2f5]">
                      Powerplay (Ov 1-{totalOvers === 20 ? 6 : totalOvers === 50 ? 10 : Math.round(totalOvers * 0.3)})
                    </td>
                    <td className="py-3 px-4 text-center text-[#38bdf8] font-bold">
                      {phaseStats1.powerplay.runs}/{phaseStats1.powerplay.wickets} <span className="text-[#bbcabf] font-normal text-[11px]">(RR {phaseStats1.powerplay.rr})</span>
                    </td>
                    <td className="py-3 px-4 text-center text-[#4edea3] font-bold">
                      {phaseStats2.powerplay.runs}/{phaseStats2.powerplay.wickets} <span className="text-[#bbcabf] font-normal text-[11px]">(RR {phaseStats2.powerplay.rr})</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {phaseStats2.powerplay.runs >= phaseStats1.powerplay.runs ? (
                        <span className="text-[#4edea3] font-bold">+{phaseStats2.powerplay.runs - phaseStats1.powerplay.runs} runs ({inn2.battingTeamName})</span>
                      ) : (
                        <span className="text-[#38bdf8] font-bold">+{phaseStats1.powerplay.runs - phaseStats2.powerplay.runs} runs ({inn1.battingTeamName})</span>
                      )}
                    </td>
                  </tr>

                  {/* Middle Overs */}
                  <tr className="hover:bg-[#242a38]/30">
                    <td className="py-3 px-4 font-headline-sm font-bold text-[#dde2f5]">
                      Middle Overs (Ov {totalOvers === 20 ? 7 : totalOvers === 50 ? 11 : Math.round(totalOvers * 0.3) + 1}-{totalOvers === 20 ? 15 : totalOvers === 50 ? 40 : Math.round(totalOvers * 0.75)})
                    </td>
                    <td className="py-3 px-4 text-center text-[#38bdf8] font-bold">
                      {phaseStats1.middle.runs}/{phaseStats1.middle.wickets} <span className="text-[#bbcabf] font-normal text-[11px]">(RR {phaseStats1.middle.rr})</span>
                    </td>
                    <td className="py-3 px-4 text-center text-[#4edea3] font-bold">
                      {phaseStats2.middle.runs}/{phaseStats2.middle.wickets} <span className="text-[#bbcabf] font-normal text-[11px]">(RR {phaseStats2.middle.rr})</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {phaseStats2.middle.runs >= phaseStats1.middle.runs ? (
                        <span className="text-[#4edea3] font-bold">+{phaseStats2.middle.runs - phaseStats1.middle.runs} runs ({inn2.battingTeamName})</span>
                      ) : (
                        <span className="text-[#38bdf8] font-bold">+{phaseStats1.middle.runs - phaseStats2.middle.runs} runs ({inn1.battingTeamName})</span>
                      )}
                    </td>
                  </tr>

                  {/* Death Overs */}
                  <tr className="hover:bg-[#242a38]/30">
                    <td className="py-3 px-4 font-headline-sm font-bold text-[#dde2f5]">
                      Death Overs (Ov {totalOvers === 20 ? 16 : totalOvers === 50 ? 41 : Math.round(totalOvers * 0.75) + 1}-{totalOvers})
                    </td>
                    <td className="py-3 px-4 text-center text-[#38bdf8] font-bold">
                      {phaseStats1.death.runs}/{phaseStats1.death.wickets} <span className="text-[#bbcabf] font-normal text-[11px]">(RR {phaseStats1.death.rr})</span>
                    </td>
                    <td className="py-3 px-4 text-center text-[#4edea3] font-bold">
                      {phaseStats2.death.runs}/{phaseStats2.death.wickets} <span className="text-[#bbcabf] font-normal text-[11px]">(RR {phaseStats2.death.rr})</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {phaseStats2.death.runs >= phaseStats1.death.runs ? (
                        <span className="text-[#4edea3] font-bold">+{phaseStats2.death.runs - phaseStats1.death.runs} runs ({inn2.battingTeamName})</span>
                      ) : (
                        <span className="text-[#38bdf8] font-bold">+{phaseStats1.death.runs - phaseStats2.death.runs} runs ({inn1.battingTeamName})</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Wagon Wheel Interactive Deep Dive */}
      {activeTab === 'wagon' && (() => {
        const activeWagonInn = match.innings[wagonInningsIndex] || match.innings[0];
        const allShots = activeWagonInn?.wagonShots || [];
        const uniqueBatters = Array.from(new Set(allShots.map(s => s.batterName)));
        const displayedShots = selectedBatterFilter === 'all'
          ? allShots
          : allShots.filter(s => s.batterName === selectedBatterFilter);

        const sixesCount = displayedShots.filter(s => s.isSix || s.runs === 6).length;
        const foursCount = displayedShots.filter(s => s.isFour || s.runs === 4).length;
        const singlesDoubles = displayedShots.filter(s => s.runs > 0 && s.runs < 4).length;

        return (
          <div className="bg-[#161b29] rounded-xl p-6 border border-[#3c4a42]/30 shadow-md space-y-6">
            {/* Header: Title and Innings Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#3c4a42]/30">
              <div>
                <h3 className="font-headline-md text-lg font-bold text-[#dde2f5] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#4edea3]">radar</span>
                  Wagon Wheel Shot Distribution
                </h3>
                <p className="font-body-sm text-xs text-[#bbcabf] mt-0.5">
                  Select a batsman to visualize individual shot directions and boundary distribution
                </p>
              </div>

              {/* Innings Switcher */}
              <div className="inline-flex rounded-lg bg-[#080e1b] p-1 border border-[#3c4a42]/30 self-start sm:self-auto">
                <button
                  onClick={() => {
                    setWagonInningsIndex(0);
                    setSelectedBatterFilter('all');
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-label-caps uppercase font-bold cursor-pointer transition-colors ${
                    wagonInningsIndex === 0 ? 'bg-[#10b981] text-[#00422b]' : 'text-[#bbcabf] hover:text-[#dde2f5]'
                  }`}
                  type="button"
                >
                  1st Inn ({match.innings[0]?.battingTeamName || match.team1.shortName})
                </button>
                <button
                  onClick={() => {
                    setWagonInningsIndex(1);
                    setSelectedBatterFilter('all');
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-label-caps uppercase font-bold cursor-pointer transition-colors ${
                    wagonInningsIndex === 1 ? 'bg-[#10b981] text-[#00422b]' : 'text-[#bbcabf] hover:text-[#dde2f5]'
                  }`}
                  type="button"
                >
                  2nd Inn ({match.innings[1]?.battingTeamName || match.team2.shortName})
                </button>
              </div>
            </div>

            {/* Batsman Names Selector */}
            <div className="space-y-2">
              <span className="font-label-caps text-xs text-[#bbcabf] uppercase font-bold block">
                Select Batsman
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBatterFilter('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-headline-sm font-bold cursor-pointer transition-all ${
                    selectedBatterFilter === 'all'
                      ? 'bg-[#10b981] text-[#00422b] shadow-md ring-1 ring-[#4edea3]'
                      : 'bg-[#080e1b] text-[#bbcabf] hover:text-[#dde2f5] hover:bg-[#1a2333] border border-[#3c4a42]/40'
                  }`}
                >
                  All Batsmen ({allShots.length})
                </button>

                {uniqueBatters.map(batter => {
                  const batterShots = allShots.filter(s => s.batterName === batter);
                  const isSelected = selectedBatterFilter === batter;
                  const totalBatterRuns = batterShots.reduce((sum, s) => sum + s.runs, 0);

                  return (
                    <button
                      key={batter}
                      type="button"
                      onClick={() => setSelectedBatterFilter(batter)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-headline-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#10b981] text-[#00422b] shadow-md ring-1 ring-[#4edea3]'
                          : 'bg-[#080e1b] text-[#bbcabf] hover:text-[#dde2f5] hover:bg-[#1a2333] border border-[#3c4a42]/40'
                      }`}
                    >
                      <span>{batter}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-stat-mono-sm font-semibold ${
                        isSelected ? 'bg-[#00422b]/30 text-[#00422b]' : 'bg-[#1a2333] text-[#4edea3]'
                      }`}>
                        {totalBatterRuns}r
                      </span>
                    </button>
                  );
                })}

                {uniqueBatters.length === 0 && (
                  <span className="text-xs text-[#86948a] italic py-1">
                    No shots recorded yet for this innings
                  </span>
                )}
              </div>
            </div>

            {/* Metrics Breakdown Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080e1b] px-4 py-3 rounded-xl border border-[#3c4a42]/30 font-stat-mono-sm text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-[#4edea3] font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3]"></span>
                  {sixesCount} Sixes
                </span>
                <span className="text-[#86948a]">•</span>
                <span className="text-[#ffb95f] font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffb95f]"></span>
                  {foursCount} Fours
                </span>
                <span className="text-[#86948a]">•</span>
                <span className="text-[#38bdf8] font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]"></span>
                  {singlesDoubles} Singles/Doubles
                </span>
              </div>

              <div className="text-[#bbcabf] font-bold">
                Total: <span className="text-[#dde2f5]">{displayedShots.length}</span> Scoring Shots
                {selectedBatterFilter !== 'all' && (
                  <span className="ml-1 text-[#4edea3]">({selectedBatterFilter})</span>
                )}
              </div>
            </div>

            {/* Centered Wagon Wheel Ground Graphic */}
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="relative w-80 h-80 sm:w-96 sm:h-96 mx-auto bg-[#080e1b] rounded-full p-3 border border-[#3c4a42]/50 shadow-2xl flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  {/* Boundary Circle */}
                  <ellipse cx="100" cy="100" rx="92" ry="92" fill="#0c1322" stroke="#2f3543" strokeWidth="1.2" strokeDasharray="3 3" />
                  {/* 30-Yard Circle */}
                  <circle cx="100" cy="100" r="48" fill="none" stroke="#242a38" strokeWidth="1" strokeDasharray="2 2" />
                  {/* Pitch Rectangle */}
                  <rect x="94" y="76" width="12" height="48" rx="1.5" fill="#334155" />

                  {/* Shot Lines */}
                  {displayedShots.map((shot, idx) => {
                    const rad = (shot.angle - 90) * (Math.PI / 180);
                    const length = (shot.distance / 100) * 87;
                    const x2 = 100 + length * Math.cos(rad);
                    const y2 = 100 + length * Math.sin(rad);

                    let strokeColor = '#38bdf8';
                    let strokeWidth = 1.6;
                    let dotRadius = 2.2;

                    if (shot.isSix || shot.runs === 6) {
                      strokeColor = '#4edea3';
                      strokeWidth = 2.6;
                      dotRadius = 3.5;
                    } else if (shot.isFour || shot.runs === 4) {
                      strokeColor = '#ffb95f';
                      strokeWidth = 2.2;
                      dotRadius = 3;
                    } else if (shot.runs === 3) {
                      strokeColor = '#c084fc';
                      strokeWidth = 1.8;
                      dotRadius = 2.4;
                    } else if (shot.runs === 2) {
                      strokeColor = '#38bdf8';
                      strokeWidth = 1.6;
                      dotRadius = 2;
                    } else {
                      strokeColor = '#60a5fa';
                      strokeWidth = 1.4;
                      dotRadius = 1.8;
                    }

                    return (
                      <g key={shot.id || idx}>
                        <line x1="100" y1="100" x2={x2} y2={y2} stroke={strokeColor} strokeWidth={strokeWidth} opacity="0.85" />
                        <circle cx={x2} cy={y2} r={dotRadius} fill={strokeColor} />
                      </g>
                    );
                  })}

                  {/* Batsman Marker at Stumps */}
                  <circle cx="100" cy="100" r="3.5" fill="#4edea3" />
                </svg>

                {displayedShots.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 text-center">
                    <span className="text-xs text-[#86948a] font-stat-mono-sm bg-[#080e1b]/95 px-4 py-2 rounded-lg border border-[#3c4a42]/40 shadow-lg">
                      No scoring shots recorded for {selectedBatterFilter === 'all' ? 'this innings' : selectedBatterFilter}
                    </span>
                  </div>
                )}
              </div>

              {/* Legend Underneath */}
              <div className="flex flex-wrap items-center justify-center gap-6 font-stat-mono-sm text-xs pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#4edea3]"></span>
                  <span className="text-[#dde2f5] font-semibold">Six (6)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ffb95f]"></span>
                  <span className="text-[#dde2f5] font-semibold">Four (4)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#c084fc]"></span>
                  <span className="text-[#dde2f5]">Three (3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#38bdf8]"></span>
                  <span className="text-[#dde2f5]">1-2 Runs</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab 3: Partnerships */}
      {activeTab === 'partnerships' && (() => {
        const selectedInn = match.innings[partnershipInningsIndex] || match.innings[0];
        const partnerships = ensureInningsPartnerships(selectedInn);
        const maxPartnership = Math.max(...partnerships.map(p => p.totalRuns), 40);

        return (
          <div className="bg-[#161b29] rounded-xl p-6 border border-[#3c4a42]/30 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3c4a42]/30 pb-4">
              <div>
                <h3 className="font-headline-md text-lg font-bold text-[#dde2f5] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#4edea3]">groups</span>
                  Partnerships Progression — {selectedInn.battingTeamName}
                </h3>
                <p className="font-body-sm text-xs text-[#bbcabf] mt-0.5">
                  Wicket-by-wicket stands, individual run contributions, and balls faced
                </p>
              </div>

              {/* Innings Selector Toggle */}
              <div className="inline-flex p-1 rounded-lg bg-[#080e1b] border border-[#3c4a42]/30 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPartnershipInningsIndex(0)}
                  className={`px-3 py-1.5 rounded text-xs font-label-caps uppercase font-bold transition-all cursor-pointer ${
                    partnershipInningsIndex === 0
                      ? 'bg-[#10b981] text-[#00422b]'
                      : 'text-[#bbcabf] hover:text-[#dde2f5]'
                  }`}
                >
                  1st Inn: {inn1.battingTeamName} ({inn1.runs}/{inn1.wickets})
                </button>
                <button
                  type="button"
                  onClick={() => setPartnershipInningsIndex(1)}
                  className={`px-3 py-1.5 rounded text-xs font-label-caps uppercase font-bold transition-all cursor-pointer ${
                    partnershipInningsIndex === 1
                      ? 'bg-[#10b981] text-[#00422b]'
                      : 'text-[#bbcabf] hover:text-[#dde2f5]'
                  }`}
                >
                  2nd Inn: {inn2.battingTeamName} ({inn2.runs}/{inn2.wickets})
                </button>
              </div>
            </div>

            {/* Partnerships List */}
            {partnerships.length === 0 ? (
              <div className="p-8 text-center text-[#bbcabf] bg-[#080e1b] rounded-xl border border-[#3c4a42]/20">
                <span className="material-symbols-outlined text-4xl text-[#3c4a42] block mb-2">sports_cricket</span>
                <p className="text-sm">No partnerships recorded yet for this innings.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {partnerships.map((p, idx) => {
                  const barWidth = Math.min(100, (p.totalRuns / maxPartnership) * 100);
                  const b1Percent = p.totalRuns > 0 ? (p.batter1Runs / p.totalRuns) * 100 : 50;
                  const b2Percent = p.totalRuns > 0 ? (p.batter2Runs / p.totalRuns) * 100 : 50;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all ${
                        p.isCurrent
                          ? 'bg-[#1f2839] border-[#4edea3]/50 shadow-md ring-1 ring-[#4edea3]/30'
                          : 'bg-[#1a1f2d] border-[#3c4a42]/30 hover:border-[#3c4a42]/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-label-caps uppercase mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#dde2f5] text-sm">
                            {p.wicketNumber}
                            {p.wicketNumber === 1 ? 'st' : p.wicketNumber === 2 ? 'nd' : p.wicketNumber === 3 ? 'rd' : 'th'} Wicket Stand
                          </span>
                          {p.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-[#10b981]/20 border border-[#10b981]/50 text-[#4edea3] text-[10px] font-bold animate-pulse">
                              Active in Middle
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-stat-mono-sm text-[#4edea3] text-sm font-extrabold">
                            {p.totalRuns} runs
                          </span>
                          <span className="text-[#bbcabf] text-[11px]">
                            off {p.totalBalls} balls ({p.totalBalls > 0 ? ((p.totalRuns / p.totalBalls) * 6).toFixed(2) : '0.00'} rpo)
                          </span>
                        </div>
                      </div>

                      {/* Stacked relative contribution bar */}
                      <div className="w-full bg-[#080e1b] h-3.5 rounded-full overflow-hidden flex border border-[#3c4a42]/30 mb-2">
                        <div
                          className="bg-[#38bdf8] h-full transition-all relative group flex items-center justify-center text-[9px] font-bold text-[#080e1b]"
                          style={{ width: `${b1Percent}%` }}
                          title={`${p.batter1Name}: ${p.batter1Runs} runs`}
                        >
                          {b1Percent >= 20 ? `${Math.round(b1Percent)}%` : ''}
                        </div>
                        <div
                          className="bg-[#4edea3] h-full transition-all relative group flex items-center justify-center text-[9px] font-bold text-[#080e1b]"
                          style={{ width: `${b2Percent}%` }}
                          title={`${p.batter2Name}: ${p.batter2Runs} runs`}
                        >
                          {b2Percent >= 20 ? `${Math.round(b2Percent)}%` : ''}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-stat-mono-sm pt-0.5">
                        <span className="flex items-center gap-1.5 text-[#38bdf8]">
                          <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
                          <span className="font-semibold">{p.batter1Name}:</span>{' '}
                          <span className="font-bold">{p.batter1Runs}</span>{' '}
                          <span className="text-[#bbcabf] text-[11px]">({p.batter1Balls}b)</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-[#4edea3]">
                          <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
                          <span className="font-semibold">{p.batter2Name}:</span>{' '}
                          <span className="font-bold">{p.batter2Runs}</span>{' '}
                          <span className="text-[#bbcabf] text-[11px]">({p.batter2Balls}b)</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab 4: Extras Breakdown */}
      {activeTab === 'extras' && (
        <div className="bg-[#161b29] rounded-xl p-6 border border-[#3c4a42]/30 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3c4a42]/30 pb-4">
            <div>
              <h3 className="font-headline-md text-lg font-bold text-[#dde2f5] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#ffb95f]">add_circle</span>
                Match Extras Breakdown & Conceded Analysis
              </h3>
              <p className="font-body-sm text-xs text-[#bbcabf] mt-0.5">
                Breakdown across wides, no-balls, byes, leg-byes, and penalty runs
              </p>
            </div>

            {/* View Filter Toggle */}
            <div className="inline-flex p-1 rounded-lg bg-[#080e1b] border border-[#3c4a42]/30 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setExtrasInningsIndex('both')}
                className={`px-3 py-1.5 rounded text-xs font-label-caps uppercase font-bold transition-all cursor-pointer ${
                  extrasInningsIndex === 'both'
                    ? 'bg-[#10b981] text-[#00422b]'
                    : 'text-[#bbcabf] hover:text-[#dde2f5]'
                }`}
              >
                Comparative View
              </button>
              <button
                type="button"
                onClick={() => setExtrasInningsIndex(0)}
                className={`px-3 py-1.5 rounded text-xs font-label-caps uppercase font-bold transition-all cursor-pointer ${
                  extrasInningsIndex === 0
                    ? 'bg-[#10b981] text-[#00422b]'
                    : 'text-[#bbcabf] hover:text-[#dde2f5]'
                }`}
              >
                1st Inn: {inn1.battingTeamName}
              </button>
              <button
                type="button"
                onClick={() => setExtrasInningsIndex(1)}
                className={`px-3 py-1.5 rounded text-xs font-label-caps uppercase font-bold transition-all cursor-pointer ${
                  extrasInningsIndex === 1
                    ? 'bg-[#10b981] text-[#00422b]'
                    : 'text-[#bbcabf] hover:text-[#dde2f5]'
                }`}
              >
                2nd Inn: {inn2.battingTeamName}
              </button>
            </div>
          </div>

          {/* Comparative Table or Cards */}
          {extrasInningsIndex === 'both' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1st Innings Extras Card */}
                <div className="bg-[#1a1f2d] p-5 rounded-xl border border-[#3c4a42]/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#3c4a42]/30 pb-3">
                    <span className="font-headline-sm text-sm font-bold text-[#dde2f5]">
                      1st Innings — {inn1.battingTeamName} Extras
                    </span>
                    <span className="font-stat-mono-md text-base font-extrabold text-[#4edea3]">
                      {inn1.extras.total} runs ({inn1.runs > 0 ? ((inn1.extras.total / inn1.runs) * 100).toFixed(1) : 0}% of total)
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="bg-[#080e1b] p-2.5 rounded-lg border border-[#3c4a42]/20">
                      <span className="text-[10px] font-label-caps text-[#bbcabf] block uppercase">Wides</span>
                      <span className="font-stat-mono-md text-base font-bold text-[#4edea3]">{inn1.extras.wides}</span>
                    </div>
                    <div className="bg-[#080e1b] p-2.5 rounded-lg border border-[#3c4a42]/20">
                      <span className="text-[10px] font-label-caps text-[#bbcabf] block uppercase">No-Balls</span>
                      <span className="font-stat-mono-md text-base font-bold text-[#ffb95f]">{inn1.extras.noBalls}</span>
                    </div>
                    <div className="bg-[#080e1b] p-2.5 rounded-lg border border-[#3c4a42]/20">
                      <span className="text-[10px] font-label-caps text-[#bbcabf] block uppercase">Leg-Byes</span>
                      <span className="font-stat-mono-md text-base font-bold text-[#dde2f5]">{inn1.extras.legByes}</span>
                    </div>
                    <div className="bg-[#080e1b] p-2.5 rounded-lg border border-[#3c4a42]/20">
                      <span className="text-[10px] font-label-caps text-[#bbcabf] block uppercase">Byes</span>
                      <span className="font-stat-mono-md text-base font-bold text-[#dde2f5]">{inn1.extras.byes}</span>
                    </div>
                    <div className="bg-[#080e1b] p-2.5 rounded-lg border border-[#3c4a42]/20">
                      <span className="text-[10px] font-label-caps text-[#bbcabf] block uppercase">Penalty</span>
                      <span className="font-stat-mono-md text-base font-bold text-[#dde2f5]">{inn1.extras.penaltyRuns}</span>
                    </div>
                  </div>
                </div>

                {/* 2nd Innings Extras Card */}
                <div className="bg-[#1a1f2d] p-5 rounded-xl border border-[#3c4a42]/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#3c4a42]/30 pb-3">
                    <span className="font-headline-sm text-sm font-bold text-[#dde2f5]">
                      2nd Innings — {inn2.battingTeamName} Extras
                    </span>
                    <span className="font-stat-mono-md text-base font-extrabold text-[#4edea3]">
                      {inn2.extras.total} runs ({inn2.runs > 0 ? ((inn2.extras.total / inn2.runs) * 100).toFixed(1) : 0}% of total)
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="bg-[#080e1b] p-2.5 rounded-lg border border-[#3c4a42]/20">
                      <span className="text-[10px] font-label-caps text-[#bbcabf] block uppercase">Wides</span>
                      <span className="font-stat-mono-md text-base font-bold text-[#4edea3]">{inn2.extras.wides}</span>
                    </div>
                    <div className="bg-[#080e1b] p-2.5 rounded-lg border border-[#3c4a42]/20">
                      <span className="text-[10px] font-label-caps text-[#bbcabf] block uppercase">No-Balls</span>
                      <span className="font-stat-mono-md text-base font-bold text-[#ffb95f]">{inn2.extras.noBalls}</span>
                    </div>
                    <div className="bg-[#080e1b] p-2.5 rounded-lg border border-[#3c4a42]/20">
                      <span className="text-[10px] font-label-caps text-[#bbcabf] block uppercase">Leg-Byes</span>
                      <span className="font-stat-mono-md text-base font-bold text-[#dde2f5]">{inn2.extras.legByes}</span>
                    </div>
                    <div className="bg-[#080e1b] p-2.5 rounded-lg border border-[#3c4a42]/20">
                      <span className="text-[10px] font-label-caps text-[#bbcabf] block uppercase">Byes</span>
                      <span className="font-stat-mono-md text-base font-bold text-[#dde2f5]">{inn2.extras.byes}</span>
                    </div>
                    <div className="bg-[#080e1b] p-2.5 rounded-lg border border-[#3c4a42]/20">
                      <span className="text-[10px] font-label-caps text-[#bbcabf] block uppercase">Penalty</span>
                      <span className="font-stat-mono-md text-base font-bold text-[#dde2f5]">{inn2.extras.penaltyRuns}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparative Head-to-Head Table */}
              <div className="overflow-x-auto rounded-xl border border-[#3c4a42]/30">
                <table className="w-full text-left border-collapse font-body-sm text-xs">
                  <thead>
                    <tr className="bg-[#080e1b] text-[#bbcabf] font-label-caps text-[11px] uppercase tracking-wider border-b border-[#3c4a42]/30">
                      <th className="py-3 px-4">Extras Category</th>
                      <th className="py-3 px-4 text-center">{inn1.battingTeamName} (1st Inn)</th>
                      <th className="py-3 px-4 text-center">{inn2.battingTeamName} (2nd Inn)</th>
                      <th className="py-3 px-4 text-center">Match Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3c4a42]/20 font-stat-mono-sm">
                    <tr className="hover:bg-[#242a38]/30">
                      <td className="py-3 px-4 font-headline-sm font-bold text-[#dde2f5]">Wides (Wd)</td>
                      <td className="py-3 px-4 text-center text-[#4edea3] font-bold">{inn1.extras.wides}</td>
                      <td className="py-3 px-4 text-center text-[#4edea3] font-bold">{inn2.extras.wides}</td>
                      <td className="py-3 px-4 text-center text-[#dde2f5] font-extrabold">{inn1.extras.wides + inn2.extras.wides}</td>
                    </tr>
                    <tr className="hover:bg-[#242a38]/30">
                      <td className="py-3 px-4 font-headline-sm font-bold text-[#dde2f5]">No-Balls (Nb)</td>
                      <td className="py-3 px-4 text-center text-[#ffb95f] font-bold">{inn1.extras.noBalls}</td>
                      <td className="py-3 px-4 text-center text-[#ffb95f] font-bold">{inn2.extras.noBalls}</td>
                      <td className="py-3 px-4 text-center text-[#dde2f5] font-extrabold">{inn1.extras.noBalls + inn2.extras.noBalls}</td>
                    </tr>
                    <tr className="hover:bg-[#242a38]/30">
                      <td className="py-3 px-4 font-headline-sm font-bold text-[#dde2f5]">Leg-Byes (Lb)</td>
                      <td className="py-3 px-4 text-center text-[#dde2f5]">{inn1.extras.legByes}</td>
                      <td className="py-3 px-4 text-center text-[#dde2f5]">{inn2.extras.legByes}</td>
                      <td className="py-3 px-4 text-center text-[#dde2f5] font-extrabold">{inn1.extras.legByes + inn2.extras.legByes}</td>
                    </tr>
                    <tr className="hover:bg-[#242a38]/30">
                      <td className="py-3 px-4 font-headline-sm font-bold text-[#dde2f5]">Byes (B)</td>
                      <td className="py-3 px-4 text-center text-[#dde2f5]">{inn1.extras.byes}</td>
                      <td className="py-3 px-4 text-center text-[#dde2f5]">{inn2.extras.byes}</td>
                      <td className="py-3 px-4 text-center text-[#dde2f5] font-extrabold">{inn1.extras.byes + inn2.extras.byes}</td>
                    </tr>
                    <tr className="hover:bg-[#242a38]/30">
                      <td className="py-3 px-4 font-headline-sm font-bold text-[#dde2f5]">Penalty Runs</td>
                      <td className="py-3 px-4 text-center text-[#dde2f5]">{inn1.extras.penaltyRuns}</td>
                      <td className="py-3 px-4 text-center text-[#dde2f5]">{inn2.extras.penaltyRuns}</td>
                      <td className="py-3 px-4 text-center text-[#dde2f5] font-extrabold">{inn1.extras.penaltyRuns + inn2.extras.penaltyRuns}</td>
                    </tr>
                    <tr className="bg-[#080e1b]/80 font-bold">
                      <td className="py-3 px-4 font-headline-sm uppercase text-[#4edea3]">Total Extras</td>
                      <td className="py-3 px-4 text-center text-[#4edea3] font-extrabold text-sm">{inn1.extras.total}</td>
                      <td className="py-3 px-4 text-center text-[#4edea3] font-extrabold text-sm">{inn2.extras.total}</td>
                      <td className="py-3 px-4 text-center text-[#4edea3] font-extrabold text-base">{inn1.extras.total + inn2.extras.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            (() => {
              const currentInn = match.innings[extrasInningsIndex];
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-[#1a1f2d] p-4 rounded-xl border border-[#3c4a42]/30 text-center">
                      <span className="font-label-caps text-xs text-[#bbcabf] uppercase">Wides</span>
                      <span className="font-stat-mono-lg text-2xl font-bold text-[#4edea3] block mt-1">
                        {currentInn.extras.wides}
                      </span>
                    </div>
                    <div className="bg-[#1a1f2d] p-4 rounded-xl border border-[#3c4a42]/30 text-center">
                      <span className="font-label-caps text-xs text-[#bbcabf] uppercase">No-Balls</span>
                      <span className="font-stat-mono-lg text-2xl font-bold text-[#ffb95f] block mt-1">
                        {currentInn.extras.noBalls}
                      </span>
                    </div>
                    <div className="bg-[#1a1f2d] p-4 rounded-xl border border-[#3c4a42]/30 text-center">
                      <span className="font-label-caps text-xs text-[#bbcabf] uppercase">Leg-Byes</span>
                      <span className="font-stat-mono-lg text-2xl font-bold text-[#dde2f5] block mt-1">
                        {currentInn.extras.legByes}
                      </span>
                    </div>
                    <div className="bg-[#1a1f2d] p-4 rounded-xl border border-[#3c4a42]/30 text-center">
                      <span className="font-label-caps text-xs text-[#bbcabf] uppercase">Byes</span>
                      <span className="font-stat-mono-lg text-2xl font-bold text-[#dde2f5] block mt-1">
                        {currentInn.extras.byes}
                      </span>
                    </div>
                    <div className="bg-[#242a38] p-4 rounded-xl border border-[#4edea3]/30 text-center">
                      <span className="font-label-caps text-xs text-[#4edea3] uppercase font-bold">Total Extras</span>
                      <span className="font-stat-mono-lg text-2xl font-extrabold text-[#4edea3] block mt-1">
                        {currentInn.extras.total}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
};
