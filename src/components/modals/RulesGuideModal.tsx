/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, BookOpen, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface RulesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesGuideModal: React.FC<RulesGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#080e1b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b29] border border-[#3c4a42]/40 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-4 text-[#dde2f5] animate-in fade-in duration-150 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#3c4a42]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#4edea3]" />
            <div>
              <h3 className="font-headline-md text-xl font-bold text-[#dde2f5]">
                Official Laws of Cricket Reference
              </h3>
              <p className="font-body-sm text-xs text-[#bbcabf]">
                MCC Rules, Scoring Conventions & AK Engine Standards
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

        <div className="space-y-4 text-xs font-body-md text-[#bbcabf]">
          {/* Section 1: Extras */}
          <div className="bg-[#1a1f2d] p-3.5 rounded-xl border border-[#3c4a42]/30 space-y-2">
            <div className="flex items-center gap-2 text-sm font-headline-sm font-bold text-[#4edea3]">
              <Info className="w-4 h-4 text-[#4edea3]" />
              <span>1. Delivery Legality & Extras (Laws 21 & 22)</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong className="text-[#dde2f5]">Wide (Law 22):</strong> 1 penalty run + any additional runs scored. Does not count as a legal ball. Not charged as a ball faced to the batter. Bowler concedes all wide runs.</li>
              <li><strong className="text-[#dde2f5]">No-Ball (Law 21):</strong> 1 penalty run. Does not count as a legal ball. Batter can score runs off the bat (credited to batter). Bowler concedes penalty + runs off bat. Byes/leg-byes off a no-ball are not charged to the bowler.</li>
              <li><strong className="text-[#dde2f5]">Byes & Leg-Byes (Laws 23 & 24):</strong> Legal deliveries. Added to team extras, NOT to batter. Bowler does NOT concede byes or leg-byes in their bowling figures.</li>
              <li><strong className="text-[#dde2f5]">Penalty Runs (Law 41):</strong> Awarded for breaches of fair play or ball striking fielder helmet. Does not count as a legal ball and does not affect bowler figures.</li>
            </ul>
          </div>

          {/* Section 2: 10 Dismissal Methods */}
          <div className="bg-[#1a1f2d] p-3.5 rounded-xl border border-[#3c4a42]/30 space-y-2">
            <div className="flex items-center gap-2 text-sm font-headline-sm font-bold text-[#ffb4ab]">
              <AlertCircle className="w-4 h-4 text-[#ffb4ab]" />
              <span>2. 10 Recognized Dismissal Methods & Bowler Credit</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="p-2 rounded bg-[#080e1b] border border-[#10b981]/20">
                <span className="font-label-caps text-[10px] text-[#4edea3] uppercase font-bold block mb-1">
                  Credited to Bowler (Wicket +1)
                </span>
                <ul className="space-y-0.5 text-[11px]">
                  <li>• Bowled (Law 32)</li>
                  <li>• Caught (Law 33)</li>
                  <li>• Leg Before Wicket / LBW (Law 36)</li>
                  <li>• Stumped (Law 39)</li>
                  <li>• Hit Wicket (Law 35)</li>
                </ul>
              </div>

              <div className="p-2 rounded bg-[#080e1b] border border-[#ffb4ab]/20">
                <span className="font-label-caps text-[10px] text-[#ffb4ab] uppercase font-bold block mb-1">
                  NOT Credited to Bowler
                </span>
                <ul className="space-y-0.5 text-[11px]">
                  <li>• Run Out (Law 38)</li>
                  <li>• Obstructing the Field (Law 37)</li>
                  <li>• Hit the Ball Twice (Law 34)</li>
                  <li>• Timed Out (Law 40)</li>
                  <li>• Retired Out (Law 25)</li>
                </ul>
              </div>
            </div>
            <p className="text-[11px] text-[#86948a] pt-1">
              * Note: Retired Hurt and Retired Not Out do NOT increment the team wicket tally.
            </p>
          </div>

          {/* Section 3: Strike Rotation & Over Completion */}
          <div className="bg-[#1a1f2d] p-3.5 rounded-xl border border-[#3c4a42]/30 space-y-2">
            <div className="flex items-center gap-2 text-sm font-headline-sm font-bold text-[#ffb95f]">
              <CheckCircle className="w-4 h-4 text-[#ffb95f]" />
              <span>3. Strike Rotation & Over Management</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Odd runs scored off the bat (1, 3, 5) rotate the strike between striker and non-striker.</li>
              <li>Odd completed byes, leg-byes, or completed runs on illegal deliveries also rotate strike.</li>
              <li>At the end of each completed over (6 legal balls), batters change ends.</li>
              <li><strong className="text-[#dde2f5]">Law 17.8 (Bowler Changing Ends):</strong> The same bowler cannot bowl two consecutive overs in the same innings. Alternating overs is strictly enforced across all formats.</li>
            </ul>
          </div>

          {/* Section 4: Format Bowling Quotas */}
          <div className="bg-[#1a1f2d] p-3.5 rounded-xl border border-[#3c4a42]/30 space-y-2">
            <div className="flex items-center gap-2 text-sm font-headline-sm font-bold text-[#4edea3]">
              <span className="material-symbols-outlined text-[18px] text-[#4edea3]">
                sports_cricket
              </span>
              <span>4. Format Bowling Quotas (ICC & MCC Rules)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="p-2 rounded bg-[#080e1b] border border-[#3c4a42]/30">
                <span className="font-label-caps text-[10px] text-[#4edea3] uppercase font-bold block mb-0.5">
                  Limited-Overs Quotas
                </span>
                <ul className="space-y-0.5 text-[11px]">
                  <li>• <strong className="text-[#dde2f5]">T20 (20 ov):</strong> Max 4 overs (24 balls) per bowler</li>
                  <li>• <strong className="text-[#dde2f5]">ODI (50 ov):</strong> Max 10 overs (60 balls) per bowler</li>
                  <li>• <strong className="text-[#dde2f5]">T10 (10 ov):</strong> Max 2 overs (12 balls) per bowler</li>
                  <li>• <strong className="text-[#dde2f5]">The Hundred:</strong> Max 20 balls (4 sets of 5) per bowler</li>
                  <li>• <strong className="text-[#dde2f5]">Shortened Matches:</strong> Max ceil(Total Overs / 5)</li>
                </ul>
              </div>

              <div className="p-2 rounded bg-[#080e1b] border border-[#3c4a42]/30">
                <span className="font-label-caps text-[10px] text-[#ffb95f] uppercase font-bold block mb-0.5">
                  Multi-Day & Test Rules
                </span>
                <ul className="space-y-0.5 text-[11px]">
                  <li>• <strong className="text-[#dde2f5]">Test Matches:</strong> Unlimited overs per bowler</li>
                  <li>• <strong className="text-[#dde2f5]">Alternating Rule:</strong> Bowler must still alternate overs (Law 17.8)</li>
                  <li>• <strong className="text-[#dde2f5]">Substitute Fielders:</strong> Cannot bowl under Law 24.2</li>
                  <li>• <strong className="text-[#dde2f5]">Over Transitions:</strong> Auto-prompt for designated alternating bowler</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#242a38] hover:bg-[#333948] text-[#dde2f5] font-stat-mono-sm text-xs font-bold transition-colors cursor-pointer"
            type="button"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
