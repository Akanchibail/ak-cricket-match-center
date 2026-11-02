/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import { Match } from '../../types/cricket';

interface InningsCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  onStartSecondInnings: (strikerId: string, nonStrikerId: string, openingBowlerId: string) => void;
}

export const InningsCompleteModal: React.FC<InningsCompleteModalProps> = ({
  isOpen,
  onClose,
  match,
  onStartSecondInnings,
}) => {
  const isBreak = match.status === 'innings_break';
  const isMatchOver = match.status === 'completed';

  const teamChasing = match.innings[1]?.battingTeamId === match.team1.id ? match.team1 : match.team2;
  const teamBowling = match.innings[1]?.bowlingTeamId === match.team1.id ? match.team1 : match.team2;

  const [strikerId, setStrikerId] = useState<string>(teamChasing?.players[0]?.id || '');
  const [nonStrikerId, setNonStrikerId] = useState<string>(teamChasing?.players[1]?.id || '');
  const [openingBowlerId, setOpeningBowlerId] = useState<string>(teamBowling?.players[8]?.id || '');

  useEffect(() => {
    if (isMatchOver && isOpen) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isMatchOver, isOpen]);

  if (!isOpen) return null;

  const handleStartInnings = () => {
    if (strikerId && nonStrikerId && openingBowlerId && strikerId !== nonStrikerId) {
      onStartSecondInnings(strikerId, nonStrikerId, openingBowlerId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#080e1b]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b29] border border-[#4edea3]/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5 text-[#dde2f5] animate-in fade-in zoom-in-95 duration-200">
        {/* Match Completed State */}
        {isMatchOver && (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-16 h-16 rounded-full bg-[#10b981]/20 border border-[#10b981] flex items-center justify-center shadow-lg">
              <Trophy className="w-8 h-8 text-[#4edea3]" />
            </div>

            <div>
              <span className="font-label-caps text-xs text-[#ffb95f] uppercase tracking-widest font-bold">
                Match Result Confirmed
              </span>
              <h2 className="font-headline-lg text-2xl font-bold text-[#dde2f5] mt-1">
                {match.result?.summary || 'Match Finished!'}
              </h2>
              <p className="font-body-md text-sm text-[#bbcabf] mt-1">
                {match.title} • {match.venue}
              </p>
            </div>

            {/* Scores summary */}
            <div className="w-full grid grid-cols-2 gap-3 mt-2">
              <div className="bg-[#1a1f2d] p-3 rounded-xl border border-[#3c4a42]/30 text-left">
                <div className="font-label-caps text-[10px] text-[#bbcabf] uppercase">1st Innings</div>
                <div className="font-headline-sm text-base font-bold text-[#dde2f5]">
                  {match.innings[0].battingTeamName}
                </div>
                <div className="font-stat-mono-md text-lg text-[#dde2f5] font-extrabold mt-0.5">
                  {match.innings[0].runs}/{match.innings[0].wickets}{' '}
                  <span className="text-xs font-normal text-[#86948a]">({match.innings[0].oversFormatted} ov)</span>
                </div>
              </div>

              <div className="bg-[#242a38] p-3 rounded-xl border border-[#4edea3]/40 text-left">
                <div className="font-label-caps text-[10px] text-[#4edea3] uppercase font-bold">2nd Innings</div>
                <div className="font-headline-sm text-base font-bold text-[#4edea3]">
                  {match.innings[1].battingTeamName}
                </div>
                <div className="font-stat-mono-md text-lg text-[#4edea3] font-extrabold mt-0.5">
                  {match.innings[1].runs}/{match.innings[1].wickets}{' '}
                  <span className="text-xs font-normal text-[#bbcabf]">({match.innings[1].oversFormatted} ov)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#00422b] font-headline-sm text-sm font-bold shadow-md cursor-pointer transition-colors"
                type="button"
              >
                Review Official Scorecard
              </button>
            </div>
          </div>
        )}

        {/* Innings Break State */}
        {isBreak && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-[#3c4a42]/30 pb-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffb95f]/20 border border-[#ffb95f] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#ffb95f]" />
              </div>
              <div>
                <h3 className="font-headline-md text-xl font-bold text-[#dde2f5]">
                  1st Innings Concluded
                </h3>
                <p className="font-body-sm text-xs text-[#bbcabf]">
                  Target set: <strong className="text-[#ffb95f]">{match.target} runs</strong> in {match.totalOvers} overs
                </p>
              </div>
            </div>

            <div className="bg-[#1a1f2d] p-3 rounded-xl border border-[#3c4a42]/30 flex items-center justify-between">
              <div>
                <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase">1st Innings Score</span>
                <span className="font-stat-mono-md text-base font-bold text-[#dde2f5] block">
                  {match.innings[0].battingTeamName}: {match.innings[0].runs}/{match.innings[0].wickets} ({match.innings[0].oversFormatted} ov)
                </span>
              </div>
              <div className="text-right">
                <span className="font-label-caps text-[10px] text-[#ffb95f] uppercase font-bold">Required RR</span>
                <span className="font-stat-mono-md text-base font-extrabold text-[#ffb95f] block">
                  {((match.target || 1) / match.totalOvers).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Configure 2nd Innings Lineup */}
            <div className="flex flex-col gap-3">
              <span className="font-label-caps text-xs text-[#4edea3] uppercase font-bold">
                Configure 2nd Innings Openers ({teamChasing.name})
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase">Opening Striker</label>
                  <select
                    value={strikerId}
                    onChange={e => setStrikerId(e.target.value)}
                    className="bg-[#080e1b] text-[#dde2f5] font-stat-mono-sm text-xs rounded-lg p-2 border border-[#3c4a42] focus:outline-none focus:border-[#4edea3]"
                  >
                    {teamChasing.players.map(p => (
                      <option key={p.id} value={p.id} disabled={p.id === nonStrikerId}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase">Opening Non-Striker</label>
                  <select
                    value={nonStrikerId}
                    onChange={e => setNonStrikerId(e.target.value)}
                    className="bg-[#080e1b] text-[#dde2f5] font-stat-mono-sm text-xs rounded-lg p-2 border border-[#3c4a42] focus:outline-none focus:border-[#4edea3]"
                  >
                    {teamChasing.players.map(p => (
                      <option key={p.id} value={p.id} disabled={p.id === strikerId}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase">
                  Opening Bowler ({teamBowling.name})
                </label>
                <select
                  value={openingBowlerId}
                  onChange={e => setOpeningBowlerId(e.target.value)}
                  className="bg-[#080e1b] text-[#dde2f5] font-stat-mono-sm text-xs rounded-lg p-2 border border-[#3c4a42] focus:outline-none focus:border-[#4edea3]"
                >
                  {teamBowling.players.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#1a1f2d] text-[#bbcabf] hover:text-[#dde2f5] text-sm cursor-pointer"
                type="button"
              >
                Close
              </button>
              <button
                onClick={handleStartInnings}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#00422b] font-headline-sm text-sm font-bold shadow-md cursor-pointer transition-colors"
                type="button"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Begin 2nd Innings Chase</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
