/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Trophy,
  Activity,
  CheckCircle,
  PieChart,
  ArrowRight,
  Download,
  Eye,
  LineChart,
  FileSpreadsheet,
  Clock,
  ChevronDown,
  Layers,
  Plus,
} from 'lucide-react';
import { Match } from '../types/cricket';
import { loadAllMatches, exportMatchJSON, exportMatchCSV } from '../storage/matchStorage';

interface DashboardProps {
  activeMatch: Match;
  onNavigate: (tab: string) => void;
  onLoadMatch: (matchId: string, targetTab?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  activeMatch,
  onNavigate,
  onLoadMatch,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const allStoredMatches = loadAllMatches();
  const currentInnings = activeMatch.innings[activeMatch.currentInningsIndex];
  const isChasing = activeMatch.currentInningsIndex === 1 && activeMatch.target !== null;
  const runsNeeded = isChasing ? Math.max(0, (activeMatch.target || 0) - (currentInnings?.runs || 0)) : 0;
  const ballsRemaining = Math.max(0, activeMatch.totalOvers * 6 - (currentInnings?.legalBalls || 0));

  const filteredMatches = allStoredMatches.filter(m => {
    if (filter === 'all') return true;
    if (filter === 't20') return m.format.toLowerCase().includes('t20');
    if (filter === 'odi') return m.format.toLowerCase().includes('odi');
    if (filter === 'test') return m.format.toLowerCase().includes('test') || m.format.toLowerCase().includes('4-day');
    if (filter === 'completed') return m.status === 'completed';
    if (filter === 'in_progress') return m.status === 'live' || m.status === 'innings_break';
    return true;
  });

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-[#0d1320] text-[#dde2f5] p-6 max-w-[1440px] mx-auto space-y-6">
      {/* 1. Header & Quick Launch Deck */}
      <header className="bg-[#161b29] rounded-xl p-6 shadow-md border border-[#3c4a42]/30 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#10b981]/5 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1f2d] text-[#4edea3] font-label-caps text-xs uppercase tracking-wider border border-[#3c4a42]/30">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              AK System Online • Real-Time Scoring
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-[#dde2f5] tracking-tight">
              Welcome back, Scorer Akshay Kanchibail
            </h1>
            <p className="font-body-md text-sm text-[#bbcabf]">
              Official Match Center • Real-Time Scoring & Telemetry • Sub-second sync 14ms
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('new-match')}
              className="group flex items-center gap-2 px-5 py-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#00422b] font-headline-sm text-sm font-bold shadow-md transition-all duration-150 cursor-pointer active:scale-95"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">
                sports_cricket
              </span>
              <span>Start New Match</span>
            </button>

            <button
              onClick={() => onNavigate('live-scoring')}
              className="group flex items-center gap-4 px-5 py-2.5 rounded-lg bg-[#242a38] text-[#dde2f5] hover:bg-[#333948] transition-all shadow-md border border-[#4edea3]/30 cursor-pointer text-left"
              type="button"
            >
              <div className="flex flex-col text-left">
                <span className="font-label-caps text-[10px] text-[#4edea3] uppercase font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffb95f] animate-ping"></span>
                  Continue Active Match
                </span>
                <span className="font-stat-mono-sm text-xs text-[#dde2f5] font-semibold">
                  {activeMatch.title} • Over {currentInnings?.oversFormatted || '0.0'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#4edea3] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Match Summary Statistics KPI Cards (4 Grid Cards) */}
      {(() => {
        const totalMatchesCount = allStoredMatches.length;
        const completedMatchesCount = allStoredMatches.filter(m => m.status === 'completed').length;
        const isMatchLive = activeMatch.status === 'live' || activeMatch.status === 'innings_break';
        const liveMatchesCount = isMatchLive ? 1 : allStoredMatches.filter(m => m.status === 'live' || m.status === 'innings_break').length;
        const t20Count = allStoredMatches.filter(m => m.format?.toLowerCase().includes('t20')).length;
        const odiCount = allStoredMatches.filter(m => m.format?.toLowerCase().includes('odi')).length;
        const testCount = allStoredMatches.filter(m => m.format?.toLowerCase().includes('test') || m.format?.toLowerCase().includes('4-day')).length;
        const otherCount = Math.max(0, totalMatchesCount - t20Count - odiCount - testCount);
        const t20Pct = totalMatchesCount > 0 ? Math.round((t20Count / totalMatchesCount) * 100) : 0;
        const odiPct = totalMatchesCount > 0 ? Math.round((odiCount / totalMatchesCount) * 100) : 0;
        const testPct = totalMatchesCount > 0 ? Math.round((testCount / totalMatchesCount) * 100) : 0;

        const inn0 = activeMatch.innings[0];
        const inn0Batters = [...(inn0?.battingCard || [])].sort((a, b) => b.runs - a.runs);
        const inn0TopBatter = inn0Batters[0];

        const inn1 = activeMatch.innings[1];
        const inn1Batters = [...(inn1?.battingCard || [])].sort((a, b) => b.runs - a.runs);
        const inn1TopBatter = inn1Batters[0];

        const currentOverDeliveries = currentInnings?.overs && currentInnings.overs.length > 0
          ? currentInnings.overs[currentInnings.overs.length - 1].deliveries
          : (currentInnings?.deliveries || []).slice(-6);

        const currentOverNum = currentInnings?.overs && currentInnings.overs.length > 0
          ? currentInnings.overs[currentInnings.overs.length - 1].displayOverNumber
          : (Math.floor((currentInnings?.legalBalls || 0) / (activeMatch.ballsPerOver || 6)) + 1);

        return (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* KPI 1 */}
              <div className="bg-[#161b29] rounded-xl p-4 shadow-sm border border-[#3c4a42]/30 flex flex-col justify-between group hover:bg-[#1a1f2d] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-xs uppercase text-[#bbcabf] font-semibold">
                    Total Matches Managed
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#242a38] flex items-center justify-center text-[#4edea3]">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="font-score-massive text-4xl text-[#dde2f5] font-extrabold tracking-tight">
                    {String(totalMatchesCount).padStart(2, '0')}
                  </span>
                  <span className="font-stat-mono-sm text-xs text-[#4edea3] font-bold">
                    {totalMatchesCount === 0 ? 'Fresh Slate' : 'Official Archive'}
                  </span>
                </div>
                <div className="mt-1 pt-1 text-[#bbcabf] font-body-sm text-xs border-t border-[#3c4a42]/20">
                  {totalMatchesCount === 0 ? 'No matches stored yet. Start scoring below.' : `${totalMatchesCount} matches saved in local database`}
                </div>
              </div>

              {/* KPI 2 */}
              <div className="bg-[#161b29] rounded-xl p-4 shadow-sm border border-[#3c4a42]/30 flex flex-col justify-between group hover:bg-[#1a1f2d] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-xs uppercase text-[#ffb95f] font-semibold">
                    Live & Ongoing Matches
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#ffb95f]/10 flex items-center justify-center text-[#ffb95f]">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="font-score-massive text-4xl text-[#ffb95f] font-extrabold tracking-tight">
                    {String(liveMatchesCount).padStart(2, '0')}
                  </span>
                  <span className="inline-flex items-center gap-1 font-stat-mono-sm text-xs text-[#ffb95f] uppercase font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#ffb95f] animate-pulse"></span> {isMatchLive ? 'IN PROGRESS' : 'IDLE'}
                  </span>
                </div>
                <div className="mt-1 pt-1 text-[#dde2f5] font-body-sm text-xs truncate border-t border-[#3c4a42]/20">
                  {activeMatch.title} • {activeMatch.venue}
                </div>
              </div>

              {/* KPI 3 */}
              <div className="bg-[#161b29] rounded-xl p-4 shadow-sm border border-[#3c4a42]/30 flex flex-col justify-between group hover:bg-[#1a1f2d] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-xs uppercase text-[#bbcabf] font-semibold">
                    Completed Matches
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#242a38] flex items-center justify-center text-[#10b981]">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="font-score-massive text-4xl text-[#dde2f5] font-extrabold tracking-tight">
                    {String(completedMatchesCount).padStart(2, '0')}
                  </span>
                  <span className="font-stat-mono-sm text-xs text-[#bbcabf]">
                    {totalMatchesCount > 0 ? `${Math.round((completedMatchesCount / totalMatchesCount) * 100)}% archived` : 'Ready to record'}
                  </span>
                </div>
                <div className="mt-1 pt-1 text-[#bbcabf] font-body-sm text-xs border-t border-[#3c4a42]/20">
                  Official certified results
                </div>
              </div>

              {/* KPI 4 */}
              <div className="bg-[#161b29] rounded-xl p-4 shadow-sm border border-[#3c4a42]/30 flex flex-col justify-between group hover:bg-[#1a1f2d] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-xs uppercase text-[#bbcabf] font-semibold">
                    Tournament Formats
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#242a38] flex items-center justify-center text-[#4edea3]">
                    <PieChart className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[#dde2f5] font-stat-mono-sm text-xs py-0.5">
                    <span className="text-[#bbcabf]">Active: {activeMatch.format}</span>
                    <span className="text-[#4edea3] font-bold">Total: {totalMatchesCount}</span>
                  </div>
                  <div className="w-full bg-[#242a38] h-1.5 rounded-full overflow-hidden flex mt-1">
                    <div className="bg-[#4edea3] h-full" style={{ width: `${t20Pct || (totalMatchesCount === 0 ? 100 : 0)}%` }}></div>
                    <div className="bg-[#ffb95f] h-full" style={{ width: `${odiPct}%` }}></div>
                    <div className="bg-[#ff7a73] h-full" style={{ width: `${testPct}%` }}></div>
                  </div>
                </div>
                <div className="mt-2 text-[#bbcabf] font-stat-mono-sm text-[11px] flex justify-between border-t border-[#3c4a42]/20 pt-1">
                  <span>T20: {t20Count}</span>
                  <span>ODI: {odiCount}</span>
                  <span>Test: {testCount}</span>
                </div>
              </div>
            </section>

            {/* 3. Ongoing Match Live Spotlight Banner */}
            <section className="bg-[#161b29] rounded-xl p-6 shadow-xl border border-[#3c4a42]/30 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Match Branding & Telemetry Header */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded bg-[#ee9800]/20 text-[#ffb95f] font-label-caps text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-[#ffb95f]/30">
                      <span className="w-2 h-2 rounded-full bg-[#ffb95f] animate-pulse"></span>
                      Live Match Spotlight
                    </span>
                    <span className="text-[#bbcabf] font-body-sm text-xs">
                      • {activeMatch.seriesName || `${activeMatch.format} Championship`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#dde2f5] font-stat-mono-sm text-xs px-2.5 py-1 rounded bg-[#1a1f2d] border border-[#3c4a42]/30">
                      <span className="material-symbols-outlined text-[16px] text-[#4edea3]">stadium</span>{' '}
                      {activeMatch.venue}
                    </span>
                  </div>

                  {/* Scoreboard Duel View */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-1">
                    <div className="bg-[#1a1f2d] rounded-lg p-4 border border-[#3c4a42]/30">
                      <div className="flex items-center justify-between text-[#bbcabf] font-label-caps text-xs uppercase mb-1">
                        <span>1st Innings ({inn0?.battingTeamName || activeMatch.team1.name})</span>
                        <span className="text-[#bbcabf]">{inn0?.oversFormatted || '0.0'} ov</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="font-headline-md text-xl font-bold text-[#dde2f5]">
                          {inn0?.battingTeamName || activeMatch.team1.shortName}
                        </span>
                        <span className="font-stat-mono-lg text-2xl font-bold text-[#dde2f5]">
                          {inn0?.runs || 0}
                          <span className="text-[#bbcabf] font-normal text-base">/{inn0?.wickets || 0}</span>
                        </span>
                      </div>
                      <p className="font-stat-mono-sm text-xs text-[#bbcabf] mt-1">
                        Run Rate: {inn0 && inn0.legalBalls > 0 ? ((inn0.runs / inn0.legalBalls) * 6).toFixed(2) : '0.00'}
                        {inn0TopBatter && inn0TopBatter.runs > 0 && (
                          <span> • Top: {inn0TopBatter.playerName.split(' ').pop()} {inn0TopBatter.runs} ({inn0TopBatter.ballsFaced})</span>
                        )}
                      </p>
                    </div>

                    <div className="bg-[#242a38] rounded-lg p-4 relative overflow-hidden border border-[#4edea3]/30 border-l-4 border-l-[#4edea3]">
                      <div className="flex items-center justify-between text-[#4edea3] font-label-caps text-xs uppercase mb-1">
                        <span className="flex items-center gap-1">
                          {isChasing ? `Chasing Target ${activeMatch.target}` : '2nd Innings'}
                          <span className="material-symbols-outlined text-[14px]">bolt</span>
                        </span>
                        <span className="font-stat-mono-sm text-xs text-[#4edea3] font-bold">
                          {inn1?.oversFormatted || '0.0'} ov
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="font-headline-md text-xl font-bold text-[#dde2f5]">
                          {inn1?.battingTeamName || activeMatch.team2.shortName}
                        </span>
                        <span className="font-stat-mono-lg text-2xl font-extrabold text-[#4edea3]">
                          {inn1?.runs || 0}
                          <span className="text-[#bbcabf] font-normal text-base">/{inn1?.wickets || 0}</span>
                        </span>
                      </div>
                      <p className="font-stat-mono-sm text-xs text-[#ffb95f] font-semibold mt-1">
                        {isChasing ? (
                          <>Req RR: {((runsNeeded / (ballsRemaining || 1)) * 6).toFixed(2)} • </>
                        ) : null}
                        Cur RR: {currentInnings && currentInnings.legalBalls > 0
                          ? ((currentInnings.runs / currentInnings.legalBalls) * 6).toFixed(2)
                          : '0.00'}
                        {inn1TopBatter && inn1TopBatter.runs > 0 && (
                          <span className="text-[#dde2f5]"> • Top: {inn1TopBatter.playerName.split(' ').pop()} {inn1TopBatter.runs} ({inn1TopBatter.ballsFaced})</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Pressure Index Strip */}
                  <div className="bg-[#1a1f2d] rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-[#3c4a42]/30">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[#ffb95f] text-[24px]">flag</span>
                      <div className="font-body-md text-sm text-[#dde2f5]">
                        Match Situation:{' '}
                        <strong className="text-[#4edea3] font-semibold">
                          {activeMatch.status === 'completed'
                            ? (activeMatch.result?.summary || 'Match completed.')
                            : isChasing
                            ? `${currentInnings?.battingTeamName || activeMatch.team2.name} need ${runsNeeded} runs in ${ballsRemaining} balls to win.`
                            : (currentInnings?.legalBalls || 0) === 0
                            ? 'Match ready to start at 0.0 overs. Click Jump to Live Scoring to record delivery.'
                            : `${currentInnings?.battingTeamName || activeMatch.team1.name} batting in 1st Innings.`}
                        </strong>
                      </div>
                    </div>

                    {/* Delivery Sequence Reel */}
                    <div className="flex items-center gap-1.5 self-start md:self-auto">
                      <span className="font-label-caps text-xs text-[#bbcabf] uppercase mr-1">
                        Over {currentOverNum}:
                      </span>
                      {currentOverDeliveries && currentOverDeliveries.length > 0 ? (
                        currentOverDeliveries.map((del, dIdx) => (
                          <span
                            key={del.id || dIdx}
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-stat-mono-sm text-xs font-bold ${
                              del.dismissal
                                ? 'bg-[#93000a] text-[#ffdad6]'
                                : del.isSix
                                ? 'bg-[#10b981] text-[#00422b]'
                                : del.isFour
                                ? 'bg-[#ee9800] text-[#472a00]'
                                : del.deliveryType === 'wide' || del.deliveryType === 'no_ball'
                                ? 'bg-[#164E63] text-[#06B6D4]'
                                : del.batterRuns === 0
                                ? 'bg-[#242a38] text-[#86948a]'
                                : 'bg-[#242a38] text-[#dde2f5]'
                            }`}
                          >
                            {del.dismissal
                              ? 'W'
                              : del.deliveryType === 'wide'
                              ? 'Wd'
                              : del.deliveryType === 'no_ball'
                              ? 'Nb'
                              : del.batterRuns === 0
                              ? '•'
                              : del.batterRuns}
                          </span>
                        ))
                      ) : (
                        <span className="font-stat-mono-sm text-xs text-[#86948a] italic">
                          Awaiting first ball
                        </span>
                      )}
                    </div>
                  </div>
                </div>

          {/* Action Column */}
          <div className="flex flex-col gap-2.5 w-full lg:w-64 shrink-0">
            <button
              onClick={() => onNavigate('live-scoring')}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-lg bg-[#4edea3] text-[#003824] font-headline-sm text-sm font-bold hover:bg-[#6ffbbe] transition-colors shadow-lg text-center cursor-pointer active:scale-95"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">bolt</span>
              <span>Jump to Live Scoring</span>
            </button>

            <button
              onClick={() => onNavigate('scorecards')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#1a1f2d] text-[#dde2f5] font-body-md text-sm font-semibold hover:bg-[#242a38] border border-[#3c4a42]/30 transition-colors text-center cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">table_view</span>
              <span>View Live Scorecard</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#080e1b] text-[#bbcabf] font-stat-mono-sm text-xs hover:text-[#dde2f5] hover:bg-[#1a1f2d] border border-[#3c4a42]/20 transition-colors cursor-pointer"
                type="button"
              >
                <Download className="w-4 h-4" />
                <span>Export Match Data (JSON/CSV)</span>
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 bottom-full mb-1 w-full bg-[#1a1f2d] border border-[#3c4a42] rounded-lg shadow-xl p-1 z-20 flex flex-col gap-1 animate-in fade-in">
                  <button
                    onClick={() => {
                      exportMatchJSON(activeMatch);
                      setExportMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#dde2f5] hover:bg-[#242a38] rounded text-left cursor-pointer"
                    type="button"
                  >
                    <span>Download Official JSON</span>
                  </button>
                  <button
                    onClick={() => {
                      exportMatchCSV(activeMatch);
                      setExportMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#dde2f5] hover:bg-[#242a38] rounded text-left cursor-pointer"
                    type="button"
                  >
                    <span>Download Deliveries CSV</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
})()}

      {/* 4. Recent Matches Data Table & Filters */}
      <section className="bg-[#161b29] rounded-xl p-6 shadow-md border border-[#3c4a42]/30 space-y-4">
        {/* Table Header & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-headline-md text-xl text-[#dde2f5] font-semibold tracking-tight">
              Recent Matches Log
            </h2>
            <p className="font-body-sm text-xs text-[#bbcabf]">
              Archived match telemetries, official sign-offs & export archives
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="inline-flex p-1 rounded-lg bg-[#080e1b] border border-[#3c4a42]/30 overflow-x-auto max-w-full">
            {['all', 't20', 'odi', 'test', 'completed', 'in_progress'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg font-label-caps text-[11px] uppercase transition-colors cursor-pointer ${
                  filter === f
                    ? 'bg-[#10b981] text-[#00422b] font-bold'
                    : 'text-[#bbcabf] hover:text-[#dde2f5]'
                }`}
                type="button"
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table or Empty State */}
        {filteredMatches.length === 0 ? (
          <div className="bg-[#1a1f2d] rounded-xl p-8 text-center border border-[#3c4a42]/30 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#10b981]/20 text-[#4edea3] mx-auto flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="font-headline-sm text-base font-bold text-[#dde2f5]">
              No Match Records Found
            </h3>
            <p className="font-body-sm text-xs text-[#bbcabf] max-w-md mx-auto">
              All previous matches have been cleared. You can start scoring from the beginning or create a new match with your selected teams!
            </p>
            <button
              onClick={() => onNavigate('new-match')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#00422b] font-headline-sm text-xs font-bold cursor-pointer transition-all shadow-md active:scale-95"
              type="button"
            >
              <Plus className="w-4 h-4" />
              <span>Setup & Start New Match</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#3c4a42]/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#080e1b] text-[#bbcabf] font-label-caps text-xs uppercase tracking-wider border-b border-[#3c4a42]/30">
                  <th className="py-3 px-4">Match Title & Format</th>
                  <th className="py-3 px-4">Teams & Venues</th>
                  <th className="py-3 px-4">Scores & Overs</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3c4a42]/20 font-body-md text-sm">
                {filteredMatches.map(m => {
                  const inn1 = m.innings[0];
                  const inn2 = m.innings[1];
                  const isLive = m.status === 'live' || m.status === 'innings_break';
                  return (
                    <tr
                      key={m.id}
                      onClick={() => onLoadMatch(m.id, isLive ? 'live-scoring' : 'scorecards')}
                      className="bg-[#1a1f2d] hover:bg-[#242a38] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {isLive && (
                            <span className="w-2 h-2 rounded-full bg-[#ffb95f] animate-pulse"></span>
                          )}
                          <span className="font-headline-sm text-sm font-bold text-[#dde2f5] hover:text-[#4edea3]">
                            {m.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#242a38] text-[#4edea3] font-stat-mono-sm text-[10px] uppercase font-semibold">
                            {m.format}
                          </span>
                        </div>
                        <div className="font-body-sm text-xs text-[#bbcabf] mt-0.5">
                          {m.seriesName || m.subtitle}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[#dde2f5] font-semibold text-xs">
                          {m.team1.name} vs {m.team2.name}
                        </div>
                        <div className="font-body-sm text-xs text-[#bbcabf]">{m.venue}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-stat-mono-sm text-xs text-[#dde2f5] font-bold">
                          {inn1 ? `${m.team1.shortName} ${inn1.runs}/${inn1.wickets} (${inn1.oversFormatted} ov)` : '0/0'}
                        </div>
                        {inn2 && inn2.runs > 0 && (
                          <div className="font-stat-mono-sm text-xs text-[#4edea3] font-medium">
                            {`${m.team2.shortName} ${inn2.runs}/${inn2.wickets} (${inn2.oversFormatted} ov)`}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-label-caps text-[10px] uppercase font-semibold ${
                            isLive
                              ? 'bg-[#ee9800]/20 text-[#ffb95f]'
                              : 'bg-[#10b981]/20 text-[#4edea3]'
                          }`}
                        >
                          {isLive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ffb95f] animate-ping"></span>
                          )}
                          {isLive ? 'Live' : 'Completed'}
                        </span>
                        {m.result && (
                          <div className="font-body-sm text-[11px] text-[#bbcabf] mt-0.5">
                            {m.result.summary}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-stat-mono-sm text-xs text-[#bbcabf]">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'Today'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLive ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLoadMatch(m.id, 'live-scoring');
                              }}
                              className="px-3 py-1.5 rounded bg-[#4edea3] text-[#003824] font-headline-sm text-xs font-semibold hover:bg-[#6ffbbe] transition-colors cursor-pointer"
                              type="button"
                            >
                              Continue
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLoadMatch(m.id, 'scorecards');
                              }}
                              className="px-2.5 py-1.5 rounded bg-[#242a38] text-[#dde2f5] font-body-sm text-xs hover:bg-[#333948] transition-colors cursor-pointer"
                              type="button"
                            >
                              Scorecard
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLoadMatch(m.id, 'analytics');
                            }}
                            className="p-1.5 rounded bg-[#242a38] text-[#dde2f5] hover:text-[#4edea3] transition-colors cursor-pointer"
                            title="Match Analytics"
                            type="button"
                          >
                            <LineChart className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Quick-Start Templates Drawer */}
      <details className="group bg-[#161b29] rounded-xl shadow-md border border-[#3c4a42]/30 overflow-hidden transition-all duration-300">
        <summary className="flex items-center justify-between p-4 cursor-pointer bg-[#1a1f2d] hover:bg-[#242a38] transition-colors select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#10b981]/20 text-[#4edea3] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-headline-sm text-base text-[#dde2f5] font-semibold">
                No Matches Found or Starting Offline? Quick-Start Templates
              </span>
              <span className="font-body-sm text-xs text-[#bbcabf] ml-2 hidden sm:inline">
                Instant match setups with preset rosters
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[#bbcabf]">
            <span className="font-label-caps text-xs uppercase group-open:hidden">Explore Presets</span>
            <ChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" />
          </div>
        </summary>

        <div className="p-6 space-y-4 bg-[#161b29]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Template 1 */}
            <div className="p-4 rounded-lg bg-[#1a1f2d] border border-[#3c4a42]/30 hover:bg-[#242a38] transition-all shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#4edea3] font-label-caps text-[10px] uppercase font-bold">
                    Standard 20 Over
                  </span>
                  <Clock className="w-4 h-4 text-[#4edea3]" />
                </div>
                <h3 className="font-headline-sm text-base text-[#dde2f5] font-semibold">
                  Club T20 Standard
                </h3>
                <p className="font-body-sm text-xs text-[#bbcabf]">
                  Pre-configured 11v11 roster with standard fielding restrictions, powerplays, and bowler max 4 overs.
                </p>
              </div>
              <button
                onClick={() => onNavigate('new-match')}
                className="mt-4 w-full py-2 rounded bg-[#242a38] text-[#dde2f5] font-label-caps text-xs uppercase hover:bg-[#10b981] hover:text-[#00422b] transition-colors cursor-pointer font-bold"
                type="button"
              >
                Deploy Preset
              </button>
            </div>

            {/* Template 2 */}
            <div className="p-4 rounded-lg bg-[#1a1f2d] border border-[#3c4a42]/30 hover:bg-[#242a38] transition-all shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#ffb95f]/20 text-[#ffb95f] font-label-caps text-[10px] uppercase font-bold">
                    Limited 50 Over
                  </span>
                  <Clock className="w-4 h-4 text-[#ffb95f]" />
                </div>
                <h3 className="font-headline-sm text-base text-[#dde2f5] font-semibold">
                  One Day Championship
                </h3>
                <p className="font-body-sm text-xs text-[#bbcabf]">
                  Full 50-over regulations, Duckworth-Lewis Stern par calculation tables, and mandatory batting powerplays.
                </p>
              </div>
              <button
                onClick={() => onNavigate('new-match')}
                className="mt-4 w-full py-2 rounded bg-[#242a38] text-[#dde2f5] font-label-caps text-xs uppercase hover:bg-[#ffb95f] hover:text-[#472a00] transition-colors cursor-pointer font-bold"
                type="button"
              >
                Deploy Preset
              </button>
            </div>

            {/* Template 3 */}
            <div className="p-4 rounded-lg bg-[#1a1f2d] border border-[#3c4a42]/30 hover:bg-[#242a38] transition-all shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#333948] text-[#dde2f5] font-label-caps text-[10px] uppercase font-bold">
                    Custom CSV / Sheet
                  </span>
                  <FileSpreadsheet className="w-4 h-4 text-[#dde2f5]" />
                </div>
                <h3 className="font-headline-sm text-base text-[#dde2f5] font-semibold">
                  Official Team Import
                </h3>
                <p className="font-body-sm text-xs text-[#bbcabf]">
                  Import official match sheets via Play-Cricket, CricHQ, or formatted Excel spreadsheet with jersey assignments.
                </p>
              </div>
              <button
                onClick={() => onNavigate('new-match')}
                className="mt-4 w-full py-2 rounded bg-[#242a38] text-[#dde2f5] font-label-caps text-xs uppercase hover:bg-[#333948] transition-colors cursor-pointer font-bold"
                type="button"
              >
                Configure Custom Match
              </button>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
};
