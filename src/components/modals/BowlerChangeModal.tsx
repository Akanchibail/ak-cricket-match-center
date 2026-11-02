/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Match } from '../../types/cricket';
import { isBowlerEligible, getMaxOversPerBowler } from '../../engine/cricketEngine';

interface BowlerChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBowler: (bowlerId: string) => void;
  match: Match;
}

export const BowlerChangeModal: React.FC<BowlerChangeModalProps> = ({
  isOpen,
  onClose,
  onSelectBowler,
  match,
}) => {
  const currentInnings = match.innings[match.currentInningsIndex];
  const ballsPerOver = match.ballsPerOver || 6;
  const fieldingTeam = currentInnings
    ? (match.team1.id === currentInnings.bowlingTeamId ? match.team1 : match.team2)
    : undefined;
  const maxOvers = getMaxOversPerBowler(match.format, match.totalOvers);
  const completedOvers = currentInnings ? Math.floor(currentInnings.legalBalls / ballsPerOver) : 0;
  const nextOverNumber = completedOvers + 1;

  // Active playing XI (excluding substitutes who cannot bowl under Law 24.2)
  const players = (fieldingTeam?.players || []).filter(p => !p.isSubstitute);

  const [selectedBowlerId, setSelectedBowlerId] = useState<string>('');

  // Keep selection synchronized when modal opens or match changes
  useEffect(() => {
    if (!isOpen || !currentInnings) return;
    if (currentInnings.nextBowlerId && isBowlerEligible(match, currentInnings.nextBowlerId).eligible) {
      setSelectedBowlerId(currentInnings.nextBowlerId);
    } else {
      const eligible = players.find(p => isBowlerEligible(match, p.id).eligible);
      setSelectedBowlerId(eligible?.id || '');
    }
  }, [isOpen, currentInnings?.nextBowlerId, currentInnings?.lastBowlerId]);

  if (!isOpen || !currentInnings) return null;

  const selectedEligibility = selectedBowlerId ? isBowlerEligible(match, selectedBowlerId) : { eligible: false };

  const handleConfirm = () => {
    if (selectedBowlerId && selectedEligibility.eligible) {
      onSelectBowler(selectedBowlerId);
      onClose();
    }
  };

  const getFormatRuleText = () => {
    if (match.format === 'Test') {
      return 'Test Match: Unlimited overs per bowler • Bowlers must alternate overs (Law 17.8)';
    }
    if (match.format === 'ODI') {
      return `ODI Format: Max ${maxOvers} overs per bowler • Bowlers must alternate overs (Law 17.8)`;
    }
    if (match.format === 'T20') {
      return `T20 Format: Max ${maxOvers} overs per bowler • Bowlers must alternate overs (Law 17.8)`;
    }
    if (match.format === 'T10') {
      return `T10 Format: Max ${maxOvers} overs per bowler • Bowlers must alternate overs (Law 17.8)`;
    }
    if (match.format === 'The Hundred') {
      return 'The Hundred: Max 20 balls (4 sets) per bowler • Alternating sets mandatory';
    }
    return `Limited Overs: Max ${maxOvers === Infinity ? 'Unlimited' : `${maxOvers} overs`} • Alternating overs mandatory`;
  };

  return (
    <div className="fixed inset-0 bg-[#080e1b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b29] border border-[#3c4a42]/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 text-[#dde2f5] animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3c4a42]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#4edea3]">
              <span className="material-symbols-outlined text-[22px]">
                sync_alt
              </span>
            </div>
            <div>
              <h3 className="font-headline-md text-lg font-bold text-[#dde2f5]">
                Designate Bowler • Over {nextOverNumber}
              </h3>
              <p className="font-body-sm text-xs text-[#bbcabf]">
                Select an eligible bowler from {fieldingTeam?.name || 'fielding team'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-[#1a1f2d] hover:bg-[#242a38] text-[#bbcabf] hover:text-[#dde2f5] cursor-pointer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Rules Banner */}
        <div className="bg-[#080e1b] rounded-xl p-3 border border-[#3c4a42]/30 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#ffb95f] shrink-0 mt-0.5" />
          <div className="text-xs font-body-sm text-[#bbcabf]">
            <span className="font-semibold text-[#dde2f5] block">
              Official Bowling Restrictions:
            </span>
            <span>{getFormatRuleText()}</span>
          </div>
        </div>

        {/* Bowler Selection List */}
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {players.map(player => {
            const stats = currentInnings.bowlingCard.find(b => b.playerId === player.id);
            const eligibility = isBowlerEligible(match, player.id);
            const isSelected = selectedBowlerId === player.id;
            const isLastBowler = currentInnings.lastBowlerId === player.id;
            const legalBallsBowled = stats?.legalBalls || 0;
            const oversCompleted = Math.floor(legalBallsBowled / ballsPerOver);
            const oversRemaining = maxOvers !== Infinity ? Math.max(0, maxOvers - oversCompleted) : Infinity;

            return (
              <div
                key={player.id}
                onClick={() => {
                  if (eligibility.eligible) {
                    setSelectedBowlerId(player.id);
                  }
                }}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  !eligibility.eligible
                    ? 'bg-[#121622] border-[#ffb4ab]/20 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-[#242a38] border-[#4edea3] ring-1 ring-[#4edea3] cursor-pointer'
                    : 'bg-[#1a1f2d] border-[#3c4a42]/20 hover:bg-[#242a38] cursor-pointer'
                }`}
              >
                {/* Left: Player info */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${
                      !eligibility.eligible
                        ? 'bg-[#1a1f2d] text-[#bbcabf] border-[#3c4a42]/40'
                        : isSelected
                        ? 'bg-[#10b981] text-[#00422b] border-[#4edea3]'
                        : 'bg-[#161b29] text-[#4edea3] border-[#4edea3]/30'
                    }`}
                  >
                    {player.shortName.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-headline-sm text-xs font-bold text-[#dde2f5]">
                        {player.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#4edea3]" />
                      )}
                    </div>
                    <span className="font-body-sm text-[11px] text-[#bbcabf] block">
                      {player.bowlingStyle || player.role}
                    </span>
                  </div>
                </div>

                {/* Right: Stats & Eligibility badge */}
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="font-stat-mono-sm text-xs font-bold text-[#dde2f5]">
                    {stats ? `${stats.overs} ov • ${stats.wickets}/${stats.runsConceded}` : '0.0 ov (Yet to bowl)'}
                  </span>

                  {isLastBowler ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-stat-mono-sm font-semibold bg-[#93000a]/20 text-[#ffb4ab] border border-[#ffb4ab]/30">
                      <ShieldAlert className="w-3 h-3" />
                      Bowled Last Over (Law 17.8)
                    </span>
                  ) : !eligibility.eligible ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-stat-mono-sm font-semibold bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/30">
                      {eligibility.reason || 'Restricted'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-stat-mono-sm font-semibold bg-[#10b981]/15 text-[#4edea3] border border-[#10b981]/30">
                      {maxOvers === Infinity ? 'Eligible • Unlimited' : `Eligible • ${oversRemaining} ov remain`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#3c4a42]/30">
          <div className="text-[11px] font-body-sm text-[#bbcabf]">
            {selectedEligibility.eligible ? (
              <span className="text-[#4edea3] font-semibold">
                ✓ Ready to bowl Over {nextOverNumber}
              </span>
            ) : (
              <span className="text-[#ffb4ab]">
                ⚠️ {selectedEligibility.reason || 'Please select an eligible bowler'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#1a1f2d] text-[#bbcabf] hover:text-[#dde2f5] text-sm cursor-pointer"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedBowlerId || !selectedEligibility.eligible}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-stat-mono-sm text-sm font-bold shadow-md transition-all ${
                selectedBowlerId && selectedEligibility.eligible
                  ? 'bg-[#10b981] hover:bg-[#059669] text-[#00422b] cursor-pointer'
                  : 'bg-[#1a1f2d] text-[#6a7a70] border border-[#3c4a42]/30 cursor-not-allowed opacity-50'
              }`}
              type="button"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Bowler</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
