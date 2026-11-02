/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DismissalType, Match, DeliveryInput } from '../../types/cricket';
import { isDismissalCreditedToBowler, isWicketCountIncremented } from '../../engine/cricketEngine';

interface WicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (input: DeliveryInput) => void;
  match: Match;
}

export const WicketModal: React.FC<WicketModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  match,
}) => {
  const currentInnings = match.innings[match.currentInningsIndex];
  const striker = currentInnings?.battingCard.find(b => b.playerId === currentInnings.strikerId);
  const nonStriker = currentInnings?.battingCard.find(b => b.playerId === currentInnings.nonStrikerId);
  const bowler = currentInnings?.bowlingCard.find(b => b.playerId === currentInnings.currentBowlerId);

  // Fielding team players for fielder selector
  const fieldingTeam = match.team1.id === currentInnings?.bowlingTeamId ? match.team1 : match.team2;
  const battingTeam = match.team1.id === currentInnings?.battingTeamId ? match.team1 : match.team2;

  // Available incoming batters (those who haven't batted yet)
  const remainingBatters = currentInnings?.battingCard.filter(b => !b.isBatting && !b.isOut) || [];

  const [dismissedBatterId, setDismissedBatterId] = useState<string>(striker?.playerId || '');
  const [dismissalType, setDismissalType] = useState<DismissalType>('caught');
  const [selectedFielderId, setSelectedFielderId] = useState<string>(fieldingTeam?.players[3]?.id || '');
  const [incomingBatterId, setIncomingBatterId] = useState<string>(remainingBatters[0]?.playerId || '');
  const [runsCompletedBeforeOut, setRunsCompletedBeforeOut] = useState<number>(0);

  // Reset state whenever modal opens or crease batters change to prevent stale dismissed batter IDs
  useEffect(() => {
    if (isOpen && striker) {
      setDismissedBatterId(striker.playerId);
      setDismissalType('caught');
      setIncomingBatterId(remainingBatters[0]?.playerId || '');
      setRunsCompletedBeforeOut(0);
    }
  }, [isOpen, striker?.playerId, nonStriker?.playerId]);

  if (!isOpen || !currentInnings || !striker || !nonStriker || !bowler) return null;

  // Guarantee dismissed batter must be one of the active crease batters
  const activeDismissedBatter = (dismissedBatterId === nonStriker.playerId) ? nonStriker : striker;
  const isBowlerCredited = isDismissalCreditedToBowler(dismissalType);
  const isWicketCounted = isWicketCountIncremented(dismissalType);

  const dismissalMethods: { type: DismissalType; label: string; bowlerCredited: boolean }[] = [
    { type: 'bowled', label: 'BOWLED', bowlerCredited: true },
    { type: 'caught', label: 'CAUGHT', bowlerCredited: true },
    { type: 'lbw', label: 'LBW', bowlerCredited: true },
    { type: 'stumped', label: 'STUMPED', bowlerCredited: true },
    { type: 'hit_wicket', label: 'HIT WICKET', bowlerCredited: true },
    { type: 'run_out', label: 'RUN OUT', bowlerCredited: false },
    { type: 'obstructing_the_field', label: 'OBSTRUCTING', bowlerCredited: false },
    { type: 'hit_the_ball_twice', label: 'HIT TWICE', bowlerCredited: false },
    { type: 'timed_out', label: 'TIMED OUT', bowlerCredited: false },
    { type: 'retired_out', label: 'RETIRED OUT', bowlerCredited: false },
    { type: 'retired_hurt', label: 'RETIRED HURT', bowlerCredited: false },
    { type: 'retired_not_out', label: 'RETIRED NOT OUT', bowlerCredited: false },
  ];

  const handleConfirm = () => {
    const selectedFielder = fieldingTeam?.players.find(p => p.id === selectedFielderId);

    const input: DeliveryInput = {
      deliveryType: 'normal',
      batterRuns: dismissalType === 'run_out' ? runsCompletedBeforeOut : 0,
      extraRuns: 0,
      dismissal: {
        type: dismissalType,
        dismissedBatterId: activeDismissedBatter.playerId,
        fielderId: selectedFielder ? selectedFielder.name : undefined,
        incomingBatterId: remainingBatters.length > 0 ? incomingBatterId : undefined,
        runOutCompletedRuns: runsCompletedBeforeOut,
      },
    };

    onConfirm(input);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#080e1b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b29] border border-[#ffb4ab]/30 rounded-2xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-4 text-[#dde2f5] animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#3c4a42]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[26px] text-[#ffb4ab]">
              gavel
            </span>
            <div>
              <h3 className="font-headline-md text-xl font-bold text-[#ffb4ab] leading-none">
                Record Dismissal (Wicket)
              </h3>
              <p className="font-body-sm text-xs text-[#bbcabf] mt-1">
                All 10 recognized Laws of Cricket dismissal methods with official credit attribution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1a1f2d] hover:bg-[#242a38] text-[#bbcabf] hover:text-[#dde2f5] transition-colors cursor-pointer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dismissed Batter Selection */}
        <div className="flex flex-col gap-1.5">
          <span className="font-label-caps text-xs text-[#bbcabf] uppercase">
            Select Dismissed Batter
          </span>
          <div className="grid grid-cols-2 gap-2">
            {/* Striker */}
            <div
              onClick={() => setDismissedBatterId(striker.playerId)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeDismissedBatter.playerId === striker.playerId
                  ? 'bg-[#242a38] border-[#4edea3] ring-1 ring-[#4edea3]'
                  : 'bg-[#1a1f2d] border-[#3c4a42]/30 hover:bg-[#242a38]'
              }`}
            >
              <div>
                <span className="font-stat-mono-md text-sm font-bold text-[#dde2f5] block">
                  {striker.playerName}
                </span>
                <span className="font-body-sm text-xs text-[#bbcabf] block">
                  Striker • {striker.runs} runs ({striker.ballsFaced}b)
                </span>
              </div>
              <span className={`material-symbols-outlined text-[20px] ${activeDismissedBatter.playerId === striker.playerId ? 'text-[#4edea3]' : 'text-[#86948a]'}`}>
                {activeDismissedBatter.playerId === striker.playerId ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </div>

            {/* Non-Striker */}
            <div
              onClick={() => setDismissedBatterId(nonStriker.playerId)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeDismissedBatter.playerId === nonStriker.playerId
                  ? 'bg-[#242a38] border-[#4edea3] ring-1 ring-[#4edea3]'
                  : 'bg-[#1a1f2d] border-[#3c4a42]/30 hover:bg-[#242a38]'
              }`}
            >
              <div>
                <span className="font-stat-mono-md text-sm font-bold text-[#dde2f5] block">
                  {nonStriker.playerName}
                </span>
                <span className="font-body-sm text-xs text-[#bbcabf] block">
                  Non-Striker • {nonStriker.runs} runs ({nonStriker.ballsFaced}b)
                </span>
              </div>
              <span className={`material-symbols-outlined text-[20px] ${activeDismissedBatter.playerId === nonStriker.playerId ? 'text-[#4edea3]' : 'text-[#86948a]'}`}>
                {activeDismissedBatter.playerId === nonStriker.playerId ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </div>
          </div>
        </div>

        {/* 10 Official Cricket Dismissal Methods Grid */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-xs text-[#bbcabf] uppercase">
              Method of Dismissal
            </span>
            <span className="font-stat-mono-sm text-[11px] text-[#ffb95f]">
              {isBowlerCredited ? 'Credited to Bowler' : 'Not Credited to Bowler'}
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {dismissalMethods.map(item => (
              <button
                key={item.type}
                onClick={() => setDismissalType(item.type)}
                className={`py-2 px-1.5 rounded-lg font-label-caps text-[10px] uppercase font-bold text-center transition-all cursor-pointer ${
                  dismissalType === item.type
                    ? 'bg-[#93000a] text-[#ffdad6] border border-[#ffb4ab] shadow-sm'
                    : 'bg-[#1a1f2d] text-[#dde2f5] hover:bg-[#242a38] border border-transparent'
                }`}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Fields: Fielder & Incoming Batter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#1a1f2d] p-3 rounded-xl border border-[#3c4a42]/30">
          {/* Fielder Selector (if caught, stumped, or run out) */}
          {(dismissalType === 'caught' || dismissalType === 'stumped' || dismissalType === 'run_out') && (
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-[11px] text-[#bbcabf] uppercase">
                {dismissalType === 'caught' ? 'Catching Fielder' : dismissalType === 'stumped' ? 'Wicketkeeper' : 'Run Out Fielder'}
              </label>
              <select
                value={selectedFielderId}
                onChange={e => setSelectedFielderId(e.target.value)}
                className="bg-[#080e1b] text-[#dde2f5] font-stat-mono-sm text-xs rounded-lg px-2.5 py-2 border border-[#3c4a42] focus:outline-none focus:border-[#4edea3]"
              >
                {dismissalType === 'caught' && (
                  <option value={bowler.playerName}>Bowler ({bowler.playerName} - Caught & Bowled)</option>
                )}
                {fieldingTeam?.players.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Incoming Batter Selector */}
          {remainingBatters.length > 0 && currentInnings.wickets < 9 && (
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-[11px] text-[#bbcabf] uppercase">
                Next Incoming Batter
              </label>
              <select
                value={incomingBatterId}
                onChange={e => setIncomingBatterId(e.target.value)}
                className="bg-[#080e1b] text-[#dde2f5] font-stat-mono-sm text-xs rounded-lg px-2.5 py-2 border border-[#3c4a42] focus:outline-none focus:border-[#4edea3]"
              >
                {remainingBatters.map(b => (
                  <option key={b.playerId} value={b.playerId}>
                    {b.playerName} ({battingTeam?.players.find(p => p.id === b.playerId)?.battingStyle || 'Batter'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Run Out Completed Runs */}
          {dismissalType === 'run_out' && (
            <div className="flex flex-col gap-1 col-span-full">
              <label className="font-label-caps text-[11px] text-[#bbcabf] uppercase">
                Completed Runs Before Run Out
              </label>
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3].map(r => (
                  <button
                    key={r}
                    onClick={() => setRunsCompletedBeforeOut(r)}
                    className={`px-3 py-1.5 rounded font-stat-mono-sm text-xs font-bold ${
                      runsCompletedBeforeOut === r ? 'bg-[#10b981] text-[#00422b]' : 'bg-[#080e1b] text-[#dde2f5]'
                    }`}
                    type="button"
                  >
                    {r} run{r !== 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Summary Audit */}
        <div className="bg-[#080e1b] rounded-xl p-3 border border-[#ffb4ab]/20 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-label-caps uppercase text-[#bbcabf]">
            <span>Dismissal Audit Summary</span>
            <span className="text-[#ffb4ab] font-bold">Wicket #{isWicketCounted ? currentInnings.wickets + 1 : currentInnings.wickets}</span>
          </div>

          <div className="text-sm font-stat-mono-sm text-[#dde2f5]">
            Out: <strong className="text-[#ffb4ab]">{activeDismissedBatter.playerName}</strong> ({dismissalType.toUpperCase().replace(/_/g, ' ')})
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-body-sm text-[#bbcabf]">
            <span>Bowler Credited: <strong className={isBowlerCredited ? 'text-[#4edea3]' : 'text-[#ffb4ab]'}>{isBowlerCredited ? 'YES (+1 Wkt to Starc)' : 'NO (Uncredited)'}</strong></span>
            <span>•</span>
            <span>Wicket Tally: <strong className={isWicketCounted ? 'text-[#ffb4ab]' : 'text-[#86948a]'}>{isWicketCounted ? '+1 Wicket' : '0 (Retired Not Out)'}</strong></span>
          </div>
        </div>

        {/* Action Confirmation Row */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1f2d] text-[#bbcabf] hover:text-[#dde2f5] hover:bg-[#242a38] font-body-md text-sm transition-colors cursor-pointer"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#93000a] hover:bg-[#ba1a1a] text-[#ffdad6] font-stat-mono-sm text-sm font-bold shadow-md active:scale-95 transition-all cursor-pointer"
            type="button"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Out ({dismissalType.toUpperCase().replace(/_/g, ' ')})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
