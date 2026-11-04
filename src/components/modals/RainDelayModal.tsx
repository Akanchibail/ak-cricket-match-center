/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, CloudRain, CheckCircle2, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Match } from '../../types/cricket';
import { calculateRainReduction, RainReductionResult } from '../../engine/dlsEngine';

interface RainDelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  onApplyReduction: (revisedOvers: number, revisedTarget: number) => void;
}

export const RainDelayModal: React.FC<RainDelayModalProps> = ({
  isOpen,
  onClose,
  match,
  onApplyReduction,
}) => {
  const firstInn = match.innings[0];
  const secondInn = match.innings[1];
  const isChasing = match.currentInningsIndex === 1;

  const originalOvers = match.totalOvers || 50;
  const oversBowledDecimal = secondInn ? secondInn.legalBalls / 6 : 0;
  const minPossibleOvers = Math.max(10, Math.ceil(oversBowledDecimal) + 1);

  const [revisedOvers, setRevisedOvers] = useState<number>(() => {
    // Default suggestion: 40 if 50, or 10 fewer overs
    return Math.max(minPossibleOvers, originalOvers > 30 ? originalOvers - 10 : 20);
  });

  const [reductionResult, setReductionResult] = useState<RainReductionResult | null>(null);

  useEffect(() => {
    if (!isOpen || !firstInn) return;

    const res = calculateRainReduction({
      originalTotalOvers: originalOvers,
      team1TotalRuns: firstInn.runs || 0,
      team1OversFaced: firstInn.legalBalls / 6,
      team2OversBowledAtInterruption: secondInn?.oversFormatted || '0.0',
      team2WicketsLostAtInterruption: secondInn?.wickets || 0,
      team2RunsAtInterruption: secondInn?.runs || 0,
      revisedTotalOvers: revisedOvers,
    });

    setReductionResult(res);
  }, [isOpen, originalOvers, revisedOvers, firstInn?.runs, secondInn?.oversFormatted, secondInn?.wickets, secondInn?.runs]);

  if (!isOpen || !firstInn) return null;

  const candidatePills = [45, 40, 35, 30, 25, 20, 15].filter(
    ov => ov < originalOvers && ov >= minPossibleOvers
  );

  const handleApply = () => {
    if (reductionResult) {
      onApplyReduction(reductionResult.revisedTotalOvers, reductionResult.revisedTarget);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#161b29] border border-[#3c4a42]/50 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#3c4a42]/30 flex items-center justify-between bg-[#1a1f2d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/20 border border-[#06B6D4]/40 flex items-center justify-center text-[#06B6D4]">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline-sm text-base font-bold text-[#dde2f5]">
                Rain Delay & DLS Overs Reduction
              </h2>
              <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase tracking-wider">
                Recalculate Revised Target for 2nd Innings
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-[#bbcabf] hover:text-[#dde2f5] hover:bg-[#242a38] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Match Snapshot Strip */}
          <div className="grid grid-cols-2 gap-3 bg-[#080e1b] p-3 rounded-xl border border-[#3c4a42]/30 font-stat-mono-sm text-xs">
            <div>
              <span className="text-[#bbcabf] text-[10px] uppercase font-label-caps block">
                1st Innings Score:
              </span>
              <span className="font-bold text-[#dde2f5]">
                {firstInn.runs}/{firstInn.wickets} ({firstInn.oversFormatted} ov)
              </span>
            </div>
            <div>
              <span className="text-[#bbcabf] text-[10px] uppercase font-label-caps block">
                2nd Innings At Rain Stoppage:
              </span>
              <span className="font-bold text-[#4edea3]">
                {secondInn ? `${secondInn.runs}/${secondInn.wickets} (${secondInn.oversFormatted} ov)` : 'Yet to Bat'}
              </span>
            </div>
          </div>

          {/* Quick Reduction Presets */}
          <div>
            <label className="font-label-caps text-[11px] text-[#bbcabf] uppercase font-bold block mb-1.5">
              Select Revised Total Match Overs:
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {candidatePills.map(ov => (
                <button
                  key={ov}
                  type="button"
                  onClick={() => setRevisedOvers(ov)}
                  className={`px-3 py-1.5 rounded-lg font-stat-mono-sm text-xs font-bold transition-all cursor-pointer border ${
                    revisedOvers === ov
                      ? 'bg-[#06B6D4] text-[#002b33] border-[#06B6D4] shadow-md scale-105'
                      : 'bg-[#1a1f2d] hover:bg-[#242a38] text-[#dde2f5] border-[#3c4a42]/40'
                  }`}
                >
                  {ov} Overs
                </button>
              ))}
            </div>
          </div>

          {/* Custom Overs Slider & Input */}
          <div className="bg-[#1a1f2d] p-3 rounded-xl border border-[#3c4a42]/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-label-caps text-[#bbcabf] uppercase text-[10px] font-bold">
                Custom Match Overs:
              </span>
              <span className="font-stat-mono-sm font-bold text-[#06B6D4] text-sm">
                {revisedOvers} Overs
              </span>
            </div>
            <input
              type="range"
              min={minPossibleOvers}
              max={originalOvers - 1}
              value={revisedOvers}
              onChange={e => setRevisedOvers(parseInt(e.target.value) || minPossibleOvers)}
              className="w-full accent-[#06B6D4] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#86948a] font-stat-mono-sm">
              <span>Min: {minPossibleOvers} ov</span>
              <span>Original: {originalOvers} ov</span>
            </div>
          </div>

          {/* Revised Target Output Display Card */}
          {reductionResult && (
            <div className="bg-[#242a38] p-4 rounded-xl border border-[#06B6D4]/50 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-label-caps text-[10px] text-[#06B6D4] uppercase font-bold tracking-wider block">
                    DLS Revised Target
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-stat-mono-lg text-4xl font-extrabold text-[#4edea3]">
                      {reductionResult.revisedTarget}
                    </span>
                    <span className="text-xs text-[#bbcabf] font-semibold">
                      Runs in {reductionResult.revisedTotalOvers}.0 overs
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase block">
                    Needed to Win
                  </span>
                  <span className="font-stat-mono-lg text-2xl font-bold text-[#ffb95f]">
                    {reductionResult.runsNeededToWin} Runs
                  </span>
                  <span className="font-stat-mono-sm text-[10px] text-[#bbcabf] block">
                    off {reductionResult.oversRemainingFormatted} ov (RRR: {reductionResult.requiredRunRate})
                  </span>
                </div>
              </div>

              {/* Bowler Quota Notice */}
              <div className="pt-2 border-t border-[#3c4a42]/30 flex items-center justify-between text-xs font-stat-mono-sm text-[#bbcabf]">
                <div className="flex items-center gap-1.5 text-[#dde2f5]">
                  <ShieldCheck className="w-4 h-4 text-[#4edea3]" />
                  <span>Max {reductionResult.maxOversPerBowler}.0 ov per bowler (Law 17)</span>
                </div>
                <span>Lost to rain: {reductionResult.resourceLostDueToRain}%</span>
              </div>
            </div>
          )}

          {/* DLS Rule Explanation */}
          {reductionResult && (
            <p className="text-[11px] text-[#bbcabf] bg-[#080e1b] p-2.5 rounded-lg border border-[#3c4a42]/20 leading-relaxed font-body-sm">
              {reductionResult.explanation}
            </p>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-[#3c4a42]/30 flex items-center justify-end gap-3 bg-[#1a1f2d]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#242a38] hover:bg-[#333948] text-[#dde2f5] font-stat-mono-sm text-xs font-bold border border-[#3c4a42]/40 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-lg bg-[#06B6D4] hover:bg-[#0891b2] text-[#002b33] font-headline-sm text-xs font-bold cursor-pointer transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <span>Apply Revised Target ({reductionResult?.revisedTarget} Runs)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
