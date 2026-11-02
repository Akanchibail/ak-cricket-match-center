/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ShieldAlert, Check } from 'lucide-react';
import { DeliveryInput, Match } from '../../types/cricket';

interface ExtrasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (input: DeliveryInput) => void;
  match: Match;
}

type ExtraTab = 'wide' | 'no_ball' | 'leg_bye' | 'bye';

export const ExtrasModal: React.FC<ExtrasModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  match,
}) => {
  const [activeTab, setActiveTab] = useState<ExtraTab>('wide');
  const [additionalRuns, setAdditionalRuns] = useState<number>(0);
  const [noBallOffBat, setNoBallOffBat] = useState<boolean>(true);
  const [isBoundary, setIsBoundary] = useState<boolean>(false);
  const [customRuns, setCustomRuns] = useState<string>('');

  if (!isOpen) return null;

  const currentInnings = match.innings[match.currentInningsIndex];
  const striker = currentInnings?.battingCard.find(b => b.playerId === currentInnings.strikerId);
  const bowler = currentInnings?.bowlingCard.find(b => b.playerId === currentInnings.currentBowlerId);

  // Calculate detailed summary preview
  let penaltyRuns = 0;
  let batterRuns = 0;
  let byeRuns = 0;
  let legByeRuns = 0;
  let totalTeamRuns = 0;
  let isLegal = false;
  let deliveryType: 'wide' | 'no_ball' | 'bye' | 'leg_bye' = activeTab;

  const runsCount = customRuns !== '' ? Math.max(0, parseInt(customRuns) || 0) : additionalRuns;

  switch (activeTab) {
    case 'wide':
      penaltyRuns = 1;
      batterRuns = 0;
      totalTeamRuns = 1 + runsCount;
      isLegal = false;
      break;
    case 'no_ball':
      penaltyRuns = 1;
      isLegal = false;
      if (noBallOffBat) {
        batterRuns = runsCount;
        totalTeamRuns = 1 + runsCount;
      } else {
        batterRuns = 0;
        byeRuns = runsCount;
        totalTeamRuns = 1 + runsCount;
      }
      break;
    case 'bye':
      penaltyRuns = 0;
      batterRuns = 0;
      byeRuns = runsCount;
      totalTeamRuns = runsCount;
      isLegal = true;
      break;
    case 'leg_bye':
      penaltyRuns = 0;
      batterRuns = 0;
      legByeRuns = runsCount;
      totalTeamRuns = runsCount;
      isLegal = true;
      break;
  }

  const handleConfirm = () => {
    let input: DeliveryInput;
    if (activeTab === 'wide') {
      input = {
        deliveryType: 'wide',
        batterRuns: 0,
        extraRuns: totalTeamRuns,
        isFour: isBoundary && totalTeamRuns >= 4,
      };
    } else if (activeTab === 'no_ball') {
      input = {
        deliveryType: 'no_ball',
        batterRuns: noBallOffBat ? runsCount : 0,
        extraRuns: !noBallOffBat ? runsCount : 0,
        isFour: isBoundary && runsCount === 4,
        isSix: isBoundary && runsCount === 6,
      };
    } else if (activeTab === 'bye') {
      input = {
        deliveryType: 'bye',
        batterRuns: 0,
        extraRuns: runsCount,
        isFour: isBoundary && runsCount === 4,
      };
    } else {
      input = {
        deliveryType: 'leg_bye',
        batterRuns: 0,
        extraRuns: runsCount,
        isFour: isBoundary && runsCount === 4,
      };
    }

    onConfirm(input);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#080e1b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b29] border border-[#3c4a42]/40 rounded-2xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-5 text-[#dde2f5] animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#3c4a42]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[24px] text-[#06B6D4]">
              add_moderator
            </span>
            <div>
              <h3 className="font-headline-md text-xl font-bold text-[#dde2f5] leading-none">
                Record Extra Delivery
              </h3>
              <p className="font-body-sm text-xs text-[#bbcabf] mt-1">
                Wide, No-Ball, Leg-Bye, or Bye accounting according to MCC Laws of Cricket
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

        {/* Extras Type Selector Tabs */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => {
              setActiveTab('wide');
              setAdditionalRuns(0);
              setCustomRuns('');
            }}
            className={`py-2.5 rounded-lg font-stat-mono-sm text-xs font-bold text-center transition-all cursor-pointer ${
              activeTab === 'wide'
                ? 'bg-[#10b981] text-[#00422b] shadow-md'
                : 'bg-[#1a1f2d] text-[#dde2f5] hover:bg-[#242a38]'
            }`}
            type="button"
          >
            WIDE (Wd)
          </button>
          <button
            onClick={() => {
              setActiveTab('no_ball');
              setAdditionalRuns(0);
              setCustomRuns('');
            }}
            className={`py-2.5 rounded-lg font-stat-mono-sm text-xs font-bold text-center transition-all cursor-pointer ${
              activeTab === 'no_ball'
                ? 'bg-[#10b981] text-[#00422b] shadow-md'
                : 'bg-[#1a1f2d] text-[#dde2f5] hover:bg-[#242a38]'
            }`}
            type="button"
          >
            NO-BALL (Nb)
          </button>
          <button
            onClick={() => {
              setActiveTab('leg_bye');
              setAdditionalRuns(1);
              setCustomRuns('');
            }}
            className={`py-2.5 rounded-lg font-stat-mono-sm text-xs font-bold text-center transition-all cursor-pointer ${
              activeTab === 'leg_bye'
                ? 'bg-[#10b981] text-[#00422b] shadow-md'
                : 'bg-[#1a1f2d] text-[#dde2f5] hover:bg-[#242a38]'
            }`}
            type="button"
          >
            LEG-BYE (Lb)
          </button>
          <button
            onClick={() => {
              setActiveTab('bye');
              setAdditionalRuns(1);
              setCustomRuns('');
            }}
            className={`py-2.5 rounded-lg font-stat-mono-sm text-xs font-bold text-center transition-all cursor-pointer ${
              activeTab === 'bye'
                ? 'bg-[#10b981] text-[#00422b] shadow-md'
                : 'bg-[#1a1f2d] text-[#dde2f5] hover:bg-[#242a38]'
            }`}
            type="button"
          >
            BYE (B)
          </button>
        </div>

        {/* Tab Specific Options */}
        {activeTab === 'wide' && (
          <div className="flex flex-col gap-3 bg-[#1a1f2d] p-3.5 rounded-xl border border-[#3c4a42]/30">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-xs text-[#bbcabf] uppercase">
                Preset Wide Delivery Options
              </span>
              <span className="font-stat-mono-sm text-xs text-[#4edea3]">
                Standard 1 Run Penalty Included
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'WD (0 Runs)', add: 0, total: 1 },
                { label: '1 WD (+1)', add: 1, total: 2 },
                { label: '2 WD (+2)', add: 2, total: 3 },
                { label: '3 WD (+3)', add: 3, total: 4 },
                { label: '4 WD (+4)', add: 4, total: 5 },
              ].map(opt => (
                <button
                  key={opt.add}
                  onClick={() => {
                    setAdditionalRuns(opt.add);
                    setCustomRuns('');
                  }}
                  className={`py-2.5 px-1 rounded-lg font-stat-mono-sm text-xs font-bold text-center transition-all cursor-pointer ${
                    additionalRuns === opt.add && customRuns === ''
                      ? 'bg-[#242a38] text-[#4edea3] ring-2 ring-[#4edea3]'
                      : 'bg-[#161b29] text-[#dde2f5] hover:bg-[#242a38]'
                  }`}
                  type="button"
                >
                  <div className="text-[11px] leading-tight">{opt.label}</div>
                  <div className="text-[9px] text-[#bbcabf] mt-0.5 font-normal">
                    {opt.total} Team Run{opt.total > 1 ? 's' : ''}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom completed runs on wide */}
            <div className="flex items-center gap-3 pt-1">
              <span className="font-body-sm text-xs text-[#bbcabf]">
                Or custom additional completed runs:
              </span>
              <input
                type="number"
                min="0"
                max="10"
                placeholder="e.g. 5"
                value={customRuns}
                onChange={e => setCustomRuns(e.target.value)}
                className="w-20 bg-[#080e1b] border border-[#3c4a42] rounded px-2.5 py-1 text-sm font-stat-mono-sm text-[#4edea3] focus:outline-none focus:border-[#4edea3]"
              />
            </div>
          </div>
        )}

        {activeTab === 'no_ball' && (
          <div className="flex flex-col gap-3 bg-[#1a1f2d] p-3.5 rounded-xl border border-[#3c4a42]/30">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-xs text-[#bbcabf] uppercase">
                Runs Scored Off No-Ball
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNoBallOffBat(true)}
                  className={`px-2.5 py-1 rounded text-xs font-label-caps uppercase transition-colors cursor-pointer ${
                    noBallOffBat ? 'bg-[#10b981] text-[#00422b] font-bold' : 'bg-[#161b29] text-[#bbcabf]'
                  }`}
                  type="button"
                >
                  Off Bat (Striker)
                </button>
                <button
                  onClick={() => setNoBallOffBat(false)}
                  className={`px-2.5 py-1 rounded text-xs font-label-caps uppercase transition-colors cursor-pointer ${
                    !noBallOffBat ? 'bg-[#10b981] text-[#00422b] font-bold' : 'bg-[#161b29] text-[#bbcabf]'
                  }`}
                  type="button"
                >
                  Byes / Extras
                </button>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {[
                { label: 'NB', runs: 0 },
                { label: 'NB + 1', runs: 1 },
                { label: 'NB + 2', runs: 2 },
                { label: 'NB + 3', runs: 3 },
                { label: 'NB + 4', runs: 4 },
                { label: 'NB + 6', runs: 6 },
              ].map(opt => (
                <button
                  key={opt.runs}
                  onClick={() => {
                    setAdditionalRuns(opt.runs);
                    setCustomRuns('');
                    if (opt.runs === 4 || opt.runs === 6) setIsBoundary(true);
                    else setIsBoundary(false);
                  }}
                  className={`py-2 px-1 rounded-lg font-stat-mono-sm text-xs font-bold text-center transition-all cursor-pointer ${
                    additionalRuns === opt.runs && customRuns === ''
                      ? 'bg-[#242a38] text-[#4edea3] ring-2 ring-[#4edea3]'
                      : 'bg-[#161b29] text-[#dde2f5] hover:bg-[#242a38]'
                  }`}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-body-sm text-xs text-[#bbcabf]">
                <input
                  type="checkbox"
                  checked={isBoundary}
                  onChange={e => setIsBoundary(e.target.checked)}
                  className="rounded text-[#10b981] focus:ring-0 bg-[#080e1b] border-[#3c4a42]"
                />
                <span>Boundary four / six off the bat</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="font-body-sm text-xs text-[#bbcabf]">Other completed:</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="runs"
                  value={customRuns}
                  onChange={e => setCustomRuns(e.target.value)}
                  className="w-16 bg-[#080e1b] border border-[#3c4a42] rounded px-2 py-0.5 text-xs font-stat-mono-sm text-[#4edea3] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'bye' || activeTab === 'leg_bye') && (
          <div className="flex flex-col gap-3 bg-[#1a1f2d] p-3.5 rounded-xl border border-[#3c4a42]/30">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-xs text-[#bbcabf] uppercase">
                {activeTab === 'bye' ? 'Byes' : 'Leg-Byes'} Completed
              </span>
              <span className="font-stat-mono-sm text-xs text-[#4edea3]">
                Legal Ball • Not Conceded by Bowler
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { label: '1 Run', runs: 1 },
                { label: '2 Runs', runs: 2 },
                { label: '3 Runs', runs: 3 },
                { label: '4 (Boundary)', runs: 4 },
                { label: 'Custom', runs: -1 },
              ].map(opt => (
                <button
                  key={opt.runs}
                  onClick={() => {
                    if (opt.runs !== -1) {
                      setAdditionalRuns(opt.runs);
                      setCustomRuns('');
                      setIsBoundary(opt.runs === 4);
                    }
                  }}
                  className={`py-2.5 rounded-lg font-stat-mono-sm text-xs font-bold text-center transition-all cursor-pointer ${
                    additionalRuns === opt.runs && customRuns === ''
                      ? 'bg-[#242a38] text-[#4edea3] ring-2 ring-[#4edea3]'
                      : 'bg-[#161b29] text-[#dde2f5] hover:bg-[#242a38]'
                  }`}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="font-body-sm text-xs text-[#bbcabf]">Enter custom runs:</span>
              <input
                type="number"
                min="1"
                max="10"
                placeholder="e.g. 5"
                value={customRuns}
                onChange={e => setCustomRuns(e.target.value)}
                className="w-20 bg-[#080e1b] border border-[#3c4a42] rounded px-2.5 py-1 text-sm font-stat-mono-sm text-[#4edea3] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Confirmation Breakdown Audit Table */}
        <div className="bg-[#080e1b] rounded-xl p-3.5 border border-[#3c4a42]/30 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-label-caps uppercase text-[#bbcabf] pb-1 border-b border-[#3c4a42]/20">
            <span>Scoring Engine Audit</span>
            <span className="text-[#4edea3] font-bold">Delivery Preview</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs py-1">
            <div className="bg-[#161b29] p-2 rounded">
              <div className="text-[#86948a] font-label-caps text-[10px] uppercase">Penalty</div>
              <div className="font-stat-mono-md text-sm font-bold text-[#dde2f5]">{penaltyRuns}</div>
            </div>
            <div className="bg-[#161b29] p-2 rounded">
              <div className="text-[#86948a] font-label-caps text-[10px] uppercase">Batter Runs</div>
              <div className="font-stat-mono-md text-sm font-bold text-[#4edea3]">{batterRuns}</div>
            </div>
            <div className="bg-[#161b29] p-2 rounded">
              <div className="text-[#86948a] font-label-caps text-[10px] uppercase">Byes / Extras</div>
              <div className="font-stat-mono-md text-sm font-bold text-[#ffb95f]">
                {activeTab === 'wide' ? totalTeamRuns : (byeRuns || legByeRuns)}
              </div>
            </div>
            <div className="bg-[#242a38] p-2 rounded border border-[#4edea3]/30">
              <div className="text-[#4edea3] font-label-caps text-[10px] uppercase font-bold">Total Added</div>
              <div className="font-stat-mono-lg text-base font-extrabold text-[#4edea3]">+{totalTeamRuns}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-body-sm text-[#bbcabf] pt-1 px-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLegal ? 'bg-[#10b981]' : 'bg-[#ffb4ab]'}`}></span>
              <span>Counts as Legal Ball: <strong className={isLegal ? 'text-[#4edea3]' : 'text-[#ffb4ab]'}>{isLegal ? 'YES (+1 ball)' : 'NO (Re-bowl)'}</strong></span>
            </div>
            <div>
              Bowler Concedes: <strong className="text-[#dde2f5]">+{activeTab === 'bye' || activeTab === 'leg_bye' ? 0 : (penaltyRuns + batterRuns + (activeTab === 'wide' ? runsCount : 0))} runs</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1f2d] text-[#bbcabf] hover:text-[#dde2f5] hover:bg-[#242a38] font-body-md text-sm transition-colors cursor-pointer"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#00422b] font-stat-mono-sm text-sm font-bold shadow-md active:scale-95 transition-all cursor-pointer"
            type="button"
          >
            <Check className="w-4 h-4" />
            <span>Confirm {activeTab.toUpperCase().replace('_', '-')} (+{totalTeamRuns} Runs)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
