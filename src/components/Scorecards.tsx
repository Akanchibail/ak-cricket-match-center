/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Download, Users, Shield, Trash2, X } from 'lucide-react';
import { Match, Player } from '../types/cricket';
import { exportMatchCSV } from '../storage/matchStorage';

interface ScorecardsProps {
  match: Match;
  onUpdateMatch?: (updated: Match) => void;
}

export const Scorecards: React.FC<ScorecardsProps> = ({ match, onUpdateMatch }) => {
  const [selectedInningsIdx, setSelectedInningsIdx] = useState<0 | 1>(match.currentInningsIndex);

  // Sync innings index when active match changes
  useEffect(() => {
    setSelectedInningsIdx(match.currentInningsIndex);
  }, [match.id, match.currentInningsIndex]);

  const safeIdx = Math.min(selectedInningsIdx, (match.innings.length - 1)) as 0 | 1;
  const innings = match.innings[safeIdx] || match.innings[0];
  const battingTeamName = innings.battingTeamName;
  const bowlingTeamName = innings.bowlingTeamName;

  // Deduplicate Fall of Wickets: ensure each batter appears strictly at most ONCE
  const sanitizedFallOfWickets = useMemo(() => {
    if (!innings.fallOfWickets) return [];
    const seen = new Set<string>();
    const result: typeof innings.fallOfWickets = [];
    for (const fow of innings.fallOfWickets) {
      const key = fow.batterId || fow.batterName;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(fow);
      }
    }
    return result.map((f, idx) => ({
      ...f,
      wicketNumber: idx + 1,
    }));
  }, [innings.fallOfWickets]);

  // Auto-clean any legacy duplicate wickets from active match state
  useEffect(() => {
    if (onUpdateMatch && innings.fallOfWickets && innings.fallOfWickets.length !== sanitizedFallOfWickets.length) {
      const nextMatch = JSON.parse(JSON.stringify(match)) as Match;
      const targetInn = nextMatch.innings[safeIdx];
      if (targetInn) {
        targetInn.fallOfWickets = sanitizedFallOfWickets;
        targetInn.wickets = sanitizedFallOfWickets.length;
        onUpdateMatch(nextMatch);
      }
    }
  }, [innings.fallOfWickets, sanitizedFallOfWickets, safeIdx, match, onUpdateMatch]);

  const handleRemoveWicket = (wicketNumber: number, batterId: string) => {
    if (!onUpdateMatch) return;
    if (!confirm(`Remove wicket #${wicketNumber} from Fall of Wickets?`)) return;

    const nextMatch = JSON.parse(JSON.stringify(match)) as Match;
    const targetInn = nextMatch.innings[safeIdx];
    if (!targetInn) return;

    targetInn.fallOfWickets = targetInn.fallOfWickets
      .filter(f => !(f.wicketNumber === wicketNumber && f.batterId === batterId))
      .map((f, i) => ({ ...f, wicketNumber: i + 1 }));

    targetInn.wickets = targetInn.fallOfWickets.length;

    const batter = targetInn.battingCard.find(b => b.playerId === batterId);
    if (batter) {
      batter.isOut = false;
      batter.dismissal = undefined;
    }

    onUpdateMatch(nextMatch);
  };

  const battingTeam = match.team1.id === innings.battingTeamId ? match.team1 : match.team2;
  const bowlingTeam = match.team1.id === innings.bowlingTeamId ? match.team1 : match.team2;

  // Did not bat from Playing XI
  const didNotBat = battingTeam.players.filter(
    p => !p.isSubstitute && !innings.battingCard.some(b => b.playerId === p.id)
  );

  // 4 Substitutes for each team
  const battingSubstitutes: Player[] = (battingTeam.substitutes && battingTeam.substitutes.length > 0)
    ? battingTeam.substitutes
    : battingTeam.players.filter(p => p.isSubstitute);

  const bowlingSubstitutes: Player[] = (bowlingTeam.substitutes && bowlingTeam.substitutes.length > 0)
    ? bowlingTeam.substitutes
    : bowlingTeam.players.filter(p => p.isSubstitute);

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-[#0d1320] text-[#dde2f5] p-6 max-w-[1440px] mx-auto space-y-6">
      {/* Top Banner & Innings Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3c4a42]/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-headline-lg text-2xl font-bold text-[#dde2f5]">
              Official Match Scorecards
            </span>
            <span className="px-2 py-0.5 rounded bg-[#242a38] text-[#4edea3] font-stat-mono-sm text-xs font-semibold">
              {match.format}
            </span>
            {match.status === 'completed' && (
              <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#4edea3] font-stat-mono-sm text-xs font-bold uppercase">
                Final Result
              </span>
            )}
          </div>
          <p className="font-body-sm text-xs text-[#bbcabf] mt-1">
            {match.title} • {match.venue} • {match.seriesName || 'Official Fixture'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Innings Tabs */}
          <div className="inline-flex p-1 rounded-lg bg-[#161b29] border border-[#3c4a42]/30">
            <button
              onClick={() => setSelectedInningsIdx(0)}
              className={`px-4 py-2 rounded-lg font-stat-mono-sm text-xs font-bold transition-all cursor-pointer ${
                safeIdx === 0
                  ? 'bg-[#10b981] text-[#00422b] shadow-md'
                  : 'text-[#bbcabf] hover:text-[#dde2f5]'
              }`}
              type="button"
            >
              1st Innings: {match.innings[0].battingTeamName} ({match.innings[0].runs}/{match.innings[0].wickets})
            </button>
            <button
              onClick={() => setSelectedInningsIdx(1)}
              className={`px-4 py-2 rounded-lg font-stat-mono-sm text-xs font-bold transition-all cursor-pointer ${
                safeIdx === 1
                  ? 'bg-[#10b981] text-[#00422b] shadow-md'
                  : 'text-[#bbcabf] hover:text-[#dde2f5]'
              }`}
              type="button"
            >
              2nd Innings: {match.innings[1].battingTeamName} ({match.innings[1].runs}/{match.innings[1].wickets})
            </button>
          </div>

          <button
            onClick={() => exportMatchCSV(match)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#242a38] hover:bg-[#333948] text-[#dde2f5] font-stat-mono-sm text-xs cursor-pointer border border-[#3c4a42]/40"
            title="Download CSV Scorecard"
            type="button"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Main Scorecard Sheet */}
      <div className="bg-[#161b29] rounded-xl border border-[#3c4a42]/30 shadow-md p-6 space-y-6">
        {/* Innings Headline Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/30">
          <div>
            <h2 className="font-headline-md text-xl font-bold text-[#dde2f5]">
              {battingTeamName} Batting
            </h2>
            <span className="font-label-caps text-xs text-[#bbcabf] uppercase">
              {innings.oversFormatted} Overs • Target: {match.target || 'N/A'}
            </span>
          </div>
          <div className="text-right">
            <span className="font-stat-mono-lg text-3xl font-extrabold text-[#4edea3]">
              {innings.runs}/{innings.wickets}
            </span>
            <span className="font-body-sm text-xs text-[#bbcabf] block">
              CRR: {innings.legalBalls > 0 ? ((innings.runs / innings.legalBalls) * 6).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* 1. Batting Scorecard Table */}
        <div className="overflow-x-auto rounded-lg border border-[#3c4a42]/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#080e1b] text-[#bbcabf] font-label-caps text-[11px] uppercase tracking-wider border-b border-[#3c4a42]/30">
                <th className="py-2.5 px-4">Batter</th>
                <th className="py-2.5 px-4">Dismissal</th>
                <th className="py-2.5 px-3 text-right">R</th>
                <th className="py-2.5 px-3 text-right">B</th>
                <th className="py-2.5 px-3 text-right">4s</th>
                <th className="py-2.5 px-3 text-right">6s</th>
                <th className="py-2.5 px-4 text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c4a42]/20 font-body-md text-xs">
              {innings.battingCard.map(batter => {
                const isOut = batter.isOut;
                const isBatting = batter.isBatting;
                return (
                  <tr
                    key={batter.playerId}
                    className={`hover:bg-[#242a38]/40 transition-colors ${
                      isBatting ? 'bg-[#242a38]/30 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-4 flex items-center gap-2">
                      {isBatting && (
                        <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
                      )}
                      <span className="text-[#dde2f5] font-headline-sm text-xs font-bold">
                        {batter.playerName}
                      </span>
                      {isBatting && (
                        <span className="text-[#4edea3] font-bold">*</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#bbcabf] font-body-sm text-[11px]">
                      {isOut
                        ? batter.dismissal?.text || 'out'
                        : isBatting
                        ? 'not out (batting)'
                        : 'yet to bat'}
                    </td>

                    <td className="py-3 px-3 text-right font-stat-mono-sm text-xs font-bold text-[#dde2f5]">
                      {batter.runs}
                    </td>

                    <td className="py-3 px-3 text-right font-stat-mono-sm text-xs text-[#bbcabf]">
                      {batter.ballsFaced}
                    </td>

                    <td className="py-3 px-3 text-right font-stat-mono-sm text-xs text-[#ffb95f]">
                      {batter.fours}
                    </td>

                    <td className="py-3 px-3 text-right font-stat-mono-sm text-xs text-[#4edea3]">
                      {batter.sixes}
                    </td>

                    <td className="py-3 px-4 text-right font-stat-mono-sm text-xs font-semibold text-[#dde2f5]">
                      {batter.strikeRate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Did Not Bat (Playing XI) */}
        {didNotBat.length > 0 && (
          <div className="bg-[#1a1f2d] p-3 rounded-lg border border-[#3c4a42]/30 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-label-caps text-xs uppercase text-[#bbcabf] font-bold mr-1">
              Did not bat:
            </span>
            {didNotBat.map((p, idx) => (
              <span key={p.id} className="text-[#dde2f5] font-medium">
                {p.name}
                {p.isWicketkeeper ? ' †' : ''}
                {p.isCaptain ? ' *' : ''}
                {idx < didNotBat.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        )}

        {/* Extras & Totals Strip */}
        <div className="bg-[#1a1f2d] p-3.5 rounded-xl border border-[#3c4a42]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-label-caps text-xs uppercase text-[#bbcabf] font-bold">
              Extras:
            </span>
            <span className="font-stat-mono-sm text-xs text-[#dde2f5] font-bold">
              {innings.extras.total}
            </span>
            <span className="text-[#bbcabf] font-body-sm text-xs">
              (b {innings.extras.byes}, lb {innings.extras.legByes}, w {innings.extras.wides}, nb {innings.extras.noBalls}, pen {innings.extras.penaltyRuns})
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-xs uppercase text-[#bbcabf]">Total:</span>
              <span className="font-stat-mono-md text-sm font-extrabold text-[#4edea3]">
                {innings.runs}/{innings.wickets}
              </span>
              <span className="font-stat-mono-sm text-xs text-[#bbcabf]">
                ({innings.oversFormatted} ov, RR: {innings.legalBalls > 0 ? ((innings.runs / innings.legalBalls) * 6).toFixed(2) : '0.00'})
              </span>
            </div>
          </div>
        </div>

        {/* 2. Bowling Scorecard Table */}
        <div className="space-y-2 pt-2">
          <h3 className="font-headline-sm text-base font-bold text-[#dde2f5]">
            {bowlingTeamName} Bowling
          </h3>

          <div className="overflow-x-auto rounded-lg border border-[#3c4a42]/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#080e1b] text-[#bbcabf] font-label-caps text-[11px] uppercase tracking-wider border-b border-[#3c4a42]/30">
                  <th className="py-2.5 px-4">Bowler</th>
                  <th className="py-2.5 px-3 text-right">O</th>
                  <th className="py-2.5 px-3 text-right">M</th>
                  <th className="py-2.5 px-3 text-right">R</th>
                  <th className="py-2.5 px-3 text-right">W</th>
                  <th className="py-2.5 px-3 text-right">ECON</th>
                  <th className="py-2.5 px-3 text-right">Wd</th>
                  <th className="py-2.5 px-4 text-right">Nb</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3c4a42]/20 font-body-md text-xs">
                {innings.bowlingCard.filter(b => b.legalBalls > 0 || b.wides > 0 || b.noBalls > 0).map(bowler => (
                  <tr key={bowler.playerId} className="hover:bg-[#242a38]/40 transition-colors">
                    <td className="py-3 px-4 font-headline-sm text-xs font-bold text-[#dde2f5]">
                      {bowler.playerName}
                    </td>
                    <td className="py-3 px-3 text-right font-stat-mono-sm text-xs text-[#dde2f5] font-semibold">
                      {bowler.overs}
                    </td>
                    <td className="py-3 px-3 text-right font-stat-mono-sm text-xs text-[#bbcabf]">
                      {bowler.maidens}
                    </td>
                    <td className="py-3 px-3 text-right font-stat-mono-sm text-xs font-bold text-[#dde2f5]">
                      {bowler.runsConceded}
                    </td>
                    <td className="py-3 px-3 text-right font-stat-mono-sm text-xs font-extrabold text-[#ffb4ab]">
                      {bowler.wickets}
                    </td>
                    <td className="py-3 px-3 text-right font-stat-mono-sm text-xs font-semibold text-[#4edea3]">
                      {bowler.economy}
                    </td>
                    <td className="py-3 px-3 text-right font-stat-mono-sm text-xs text-[#bbcabf]">
                      {bowler.wides}
                    </td>
                    <td className="py-3 px-4 text-right font-stat-mono-sm text-xs text-[#bbcabf]">
                      {bowler.noBalls}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Fall of Wickets Timeline */}
        {sanitizedFallOfWickets.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-base font-bold text-[#dde2f5]">
                Fall of Wickets
              </h3>
              <span className="font-body-sm text-[11px] text-[#bbcabf]">
                {sanitizedFallOfWickets.length} wicket{sanitizedFallOfWickets.length === 1 ? '' : 's'} fallen
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sanitizedFallOfWickets.map(fow => (
                <div
                  key={`${fow.wicketNumber}-${fow.batterId}`}
                  className="bg-[#1a1f2d] border border-[#3c4a42]/30 px-3 py-1.5 rounded-lg font-stat-mono-sm text-xs flex items-center gap-2 group hover:border-[#ffb4ab]/40 transition-colors"
                >
                  <span className="text-[#ffb4ab] font-bold">
                    {fow.teamRuns}/{fow.wicketNumber}
                  </span>
                  <span className="text-[#dde2f5]">({fow.batterName}, {fow.overs} ov)</span>
                  {onUpdateMatch && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWicket(fow.wicketNumber, fow.batterId)}
                      className="text-[#86948a] hover:text-[#ffb4ab] p-0.5 rounded transition-colors cursor-pointer"
                      title={`Remove wicket #${fow.wicketNumber} (${fow.batterName})`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bench / Substitutes Section (4 Substitutes per Team) */}
        <div className="pt-4 border-t border-[#3c4a42]/30 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#4edea3]" />
            <h3 className="font-headline-sm text-base font-bold text-[#dde2f5]">
              Bench & Reserve Substitutes (4 Players per Team)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Batting Team Substitutes */}
            <div className="bg-[#1a1f2d] p-4 rounded-xl border border-[#3c4a42]/30 space-y-3">
              <div className="flex items-center justify-between border-b border-[#3c4a42]/30 pb-2">
                <span className="font-headline-sm text-sm font-bold text-[#dde2f5] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#ffb95f]" />
                  {battingTeam.name} Reserves
                </span>
                <span className="px-2 py-0.5 rounded bg-[#242a38] text-[#ffb95f] font-stat-mono-sm text-[10px] uppercase font-bold">
                  {battingSubstitutes.length} Substitutes
                </span>
              </div>
              <div className="space-y-2">
                {battingSubstitutes.length > 0 ? (
                  battingSubstitutes.map(sub => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded bg-[#242a38]/60 text-xs border border-[#3c4a42]/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#161b29] text-[10px] font-stat-mono-sm flex items-center justify-center font-bold text-[#bbcabf]">
                          {sub.jerseyNumber || '#'}
                        </span>
                        <span className="text-[#dde2f5] font-semibold">{sub.name}</span>
                        {sub.isWicketkeeper && <span className="text-[#ffb95f] text-[10px]">(WK)</span>}
                        {sub.isCaptain && <span className="text-[#4edea3] text-[10px]">(C)</span>}
                      </div>
                      <span className="font-label-caps text-[10px] uppercase text-[#bbcabf]">
                        {sub.role}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#bbcabf] italic">No reserve substitutes registered</p>
                )}
              </div>
            </div>

            {/* Bowling Team Substitutes */}
            <div className="bg-[#1a1f2d] p-4 rounded-xl border border-[#3c4a42]/30 space-y-3">
              <div className="flex items-center justify-between border-b border-[#3c4a42]/30 pb-2">
                <span className="font-headline-sm text-sm font-bold text-[#dde2f5] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#4edea3]" />
                  {bowlingTeam.name} Reserves
                </span>
                <span className="px-2 py-0.5 rounded bg-[#242a38] text-[#4edea3] font-stat-mono-sm text-[10px] uppercase font-bold">
                  {bowlingSubstitutes.length} Substitutes
                </span>
              </div>
              <div className="space-y-2">
                {bowlingSubstitutes.length > 0 ? (
                  bowlingSubstitutes.map(sub => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded bg-[#242a38]/60 text-xs border border-[#3c4a42]/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#161b29] text-[10px] font-stat-mono-sm flex items-center justify-center font-bold text-[#bbcabf]">
                          {sub.jerseyNumber || '#'}
                        </span>
                        <span className="text-[#dde2f5] font-semibold">{sub.name}</span>
                        {sub.isWicketkeeper && <span className="text-[#ffb95f] text-[10px]">(WK)</span>}
                        {sub.isCaptain && <span className="text-[#4edea3] text-[10px]">(C)</span>}
                      </div>
                      <span className="font-label-caps text-[10px] uppercase text-[#bbcabf]">
                        {sub.role}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#bbcabf] italic">No reserve substitutes registered</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

