/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, ShieldAlert } from 'lucide-react';
import { DeliveryInput } from '../../types/cricket';

interface PenaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (input: DeliveryInput) => void;
}

export const PenaltyModal: React.FC<PenaltyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [awardTo, setAwardTo] = useState<'batting' | 'bowling'>('batting');
  const [runs, setRuns] = useState<number>(5);
  const [reason, setReason] = useState<string>('Ball struck helmet on field');

  if (!isOpen) return null;

  const reasons = [
    'Ball struck fielding helmet placed on ground (Law 28.3)',
    'Deliberate short run by batter (Law 18.5)',
    'Unfair play / ball tampering (Law 41.3)',
    'Time wasting / slow over rate (Law 41.9)',
    'Deliberate distraction of batter (Law 41.4)',
    'Other official umpire sanction',
  ];

  const handleConfirm = () => {
    onConfirm({
      deliveryType: 'penalty',
      batterRuns: 0,
      extraRuns: runs,
      penaltyAwardedTo: awardTo,
      customCommentary: `PENALTY: ${runs} runs awarded to ${awardTo} team. Reason: ${reason}.`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#080e1b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b29] border border-[#ffb95f]/40 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-[#dde2f5] animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-[#3c4a42]/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px] text-[#ffb95f]">
              exposure
            </span>
            <h3 className="font-headline-md text-xl font-bold text-[#ffb95f]">
              Award Penalty Runs
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-[#1a1f2d] hover:bg-[#242a38] text-[#bbcabf] hover:text-[#dde2f5] cursor-pointer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Penalty recipient selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setAwardTo('batting')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
              awardTo === 'batting'
                ? 'bg-[#242a38] border-[#ffb95f] text-[#ffb95f]'
                : 'bg-[#1a1f2d] border-[#3c4a42]/30 text-[#bbcabf] hover:bg-[#242a38]'
            }`}
            type="button"
          >
            <span className="font-stat-mono-lg text-2xl font-bold">+{runs} Runs</span>
            <span className="font-label-caps text-[10px] uppercase">To Batting Team</span>
          </button>

          <button
            onClick={() => setAwardTo('bowling')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
              awardTo === 'bowling'
                ? 'bg-[#242a38] border-[#ffb4ab] text-[#ffb4ab]'
                : 'bg-[#1a1f2d] border-[#3c4a42]/30 text-[#bbcabf] hover:bg-[#242a38]'
            }`}
            type="button"
          >
            <span className="font-stat-mono-lg text-2xl font-bold">+{runs} Runs</span>
            <span className="font-label-caps text-[10px] uppercase">To Bowling Team</span>
          </button>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between bg-[#1a1f2d] p-3 rounded-lg border border-[#3c4a42]/30">
          <span className="font-label-caps text-xs text-[#bbcabf] uppercase">Penalty Amount</span>
          <div className="flex items-center gap-2">
            {[5, 10].map(val => (
              <button
                key={val}
                onClick={() => setRuns(val)}
                className={`px-3 py-1 rounded font-stat-mono-sm text-xs font-bold cursor-pointer ${
                  runs === val ? 'bg-[#ffb95f] text-[#472a00]' : 'bg-[#080e1b] text-[#dde2f5]'
                }`}
                type="button"
              >
                +{val}
              </button>
            ))}
          </div>
        </div>

        {/* Reason selector */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-caps text-[11px] text-[#bbcabf] uppercase">
            Official Reason / MCC Law
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="bg-[#080e1b] text-[#dde2f5] font-body-sm text-xs rounded-lg p-2.5 border border-[#3c4a42] focus:outline-none focus:border-[#ffb95f]"
          >
            {reasons.map((r, i) => (
              <option key={i} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1f2d] text-[#bbcabf] hover:text-[#dde2f5] text-sm cursor-pointer"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg bg-[#ffb95f] hover:bg-[#ee9800] text-[#472a00] font-stat-mono-sm text-sm font-bold shadow-md cursor-pointer"
            type="button"
          >
            Confirm +{runs} Penalty
          </button>
        </div>
      </div>
    </div>
  );
};
