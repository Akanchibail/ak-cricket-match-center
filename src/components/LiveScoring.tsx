/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';
import { Match, DeliveryInput, WagonShot } from '../types/cricket';
import { ExtrasModal } from './modals/ExtrasModal';
import { WicketModal } from './modals/WicketModal';
import { PenaltyModal } from './modals/PenaltyModal';
import { BowlerChangeModal } from './modals/BowlerChangeModal';
import { getMaxOversPerBowler, isBowlerEligible } from '../engine/cricketEngine';

interface LiveScoringProps {
  match: Match;
  onRecordDelivery: (input: DeliveryInput) => void;
  onSwapStrike: () => void;
  onChangeBowler: (bowlerId: string) => void;
  onSetNextBowler: (bowlerId: string) => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

export const LiveScoring: React.FC<LiveScoringProps> = ({
  match,
  onRecordDelivery,
  onSwapStrike,
  onChangeBowler,
  onSetNextBowler,
  onUndo,
  canUndo = false,
}) => {
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
  const [isBowlerModalOpen, setIsBowlerModalOpen] = useState(false);
  const [wagonView, setWagonView] = useState<'striker' | 'innings'>('innings');
  const [aimedWagonZone, setAimedWagonZone] = useState<{ angle: number; distance: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentInnings = match.innings[match.currentInningsIndex];
  const isChasing = match.currentInningsIndex === 1 && match.target !== null;
  const ballsPerOver = match.ballsPerOver || 6;
  const maxOvers = getMaxOversPerBowler(match.format, match.totalOvers);

  // Auto-prompt bowler selection when an over completes and currentBowlerId is empty
  useEffect(() => {
    if (
      currentInnings &&
      !currentInnings.isCompleted &&
      match.status === 'live' &&
      !currentInnings.currentBowlerId
    ) {
      setIsBowlerModalOpen(true);
    }
  }, [currentInnings?.currentBowlerId, currentInnings?.isCompleted, match.status]);

  // Active Batters
  const striker = currentInnings?.battingCard.find(b => b.playerId === currentInnings.strikerId);
  const nonStriker = currentInnings?.battingCard.find(b => b.playerId === currentInnings.nonStrikerId);
  const bowler = currentInnings?.bowlingCard.find(b => b.playerId === currentInnings.currentBowlerId);

  // Fielding team for next bowler options
  const fieldingTeam = match.team1.id === currentInnings?.bowlingTeamId ? match.team1 : match.team2;

  // Chase Telemetry calculations
  const totalTargetBalls = match.totalOvers * ballsPerOver;
  const ballsRemaining = Math.max(0, totalTargetBalls - (currentInnings?.legalBalls || 0));
  const runsRequired = isChasing ? Math.max(0, (match.target || 0) - (currentInnings?.runs || 0)) : 0;
  const currentRunRate = currentInnings && currentInnings.legalBalls > 0
    ? ((currentInnings.runs / currentInnings.legalBalls) * ballsPerOver).toFixed(2)
    : '0.00';
  const requiredRunRate = isChasing && ballsRemaining > 0
    ? ((runsRequired / ballsRemaining) * ballsPerOver).toFixed(2)
    : '0.00';
  const progressPercent = match.target
    ? Math.min(100, Math.max(0, Number(((currentInnings.runs / match.target) * 100).toFixed(1))))
    : 0;

  // Current over balls calculation
  const currentOverIndex = currentInnings ? Math.floor(currentInnings.legalBalls / ballsPerOver) : 0;
  const currentOverSummary = currentInnings?.overs.find(o => o.overNumber === currentOverIndex);
  const currentOverDeliveries = currentOverSummary ? currentOverSummary.deliveries : [];
  const currentOverRunsConceded = currentOverSummary ? currentOverSummary.runsConceded : 0;
  const legalBallsInCurrentOver = currentInnings ? currentInnings.legalBalls % ballsPerOver : 0;

  // Current Partnership
  const activePartnership = currentInnings?.partnerships.find(p => p.isCurrent) || currentInnings?.partnerships[currentInnings?.partnerships.length - 1];

  // Last dismissal
  const lastDismissal = currentInnings?.fallOfWickets.length
    ? currentInnings.fallOfWickets[currentInnings.fallOfWickets.length - 1]
    : null;
  const lastDismissedBatter = lastDismissal
    ? currentInnings.battingCard.find(b => b.playerId === lastDismissal.batterId)
    : null;

  // Latest commentary
  const latestDelivery = currentInnings?.deliveries.length
    ? currentInnings.deliveries[currentInnings.deliveries.length - 1]
    : null;

  // Toast feedback trigger
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const handleRecordRun = (runs: number) => {
    if (!currentInnings?.currentBowlerId) {
      setIsBowlerModalOpen(true);
      showToast('Select an alternating bowler for this over (Law 17.8)');
      return;
    }

    let customZone = undefined;
    if (aimedWagonZone) {
      customZone = {
        angle: aimedWagonZone.angle,
        distance: runs === 6 ? Math.max(95, aimedWagonZone.distance) : runs === 4 ? Math.max(86, aimedWagonZone.distance) : aimedWagonZone.distance,
        description: `${runs} run(s) aimed at ${aimedWagonZone.angle}°`,
      };
      setAimedWagonZone(null);
    }

    onRecordDelivery({
      deliveryType: 'normal',
      batterRuns: runs,
      extraRuns: 0,
      isFour: runs === 4,
      isSix: runs === 6,
      wagonZone: customZone,
    });
    showToast(`Recorded: ${runs} run(s) off ball ${currentInnings?.oversFormatted}`);
  };

  // Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (['0', '1', '2', '3', '4', '6'].includes(e.key)) {
        if (!currentInnings?.currentBowlerId) {
          setIsBowlerModalOpen(true);
          showToast('Select an alternating bowler for this over (Law 17.8)');
          return;
        }
        handleRecordRun(parseInt(e.key));
      } else if (e.key.toLowerCase() === 'w') {
        if (!currentInnings?.currentBowlerId) {
          setIsBowlerModalOpen(true);
          showToast('Select an alternating bowler for this over (Law 17.8)');
          return;
        }
        setIsWicketModalOpen(true);
      } else if (e.key.toLowerCase() === 'e') {
        if (!currentInnings?.currentBowlerId) {
          setIsBowlerModalOpen(true);
          showToast('Select an alternating bowler for this over (Law 17.8)');
          return;
        }
        setIsExtrasModalOpen(true);
      } else if (e.key.toLowerCase() === 'x') {
        onSwapStrike();
        showToast('Strike swapped manually (X)');
      } else if (e.key.toLowerCase() === 'z') {
        if (onUndo && canUndo) {
          onUndo();
          showToast('Undid previous ball / score');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentInnings, onSwapStrike, onUndo, canUndo]);

  // Wagon wheel shots to render
  const visibleShots: WagonShot[] = currentInnings
    ? wagonView === 'striker'
      ? striker?.wagonShots || []
      : currentInnings.wagonShots || []
    : [];

  const fourCount = visibleShots.filter(s => s.isFour || s.runs === 4).length;
  const sixCount = visibleShots.filter(s => s.isSix || s.runs === 6).length;
  const singleDoubleCount = visibleShots.filter(s => s.runs > 0 && s.runs < 4).length;
  const totalShotsCount = visibleShots.length;

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden bg-[#0d1320] text-[#dde2f5] select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#10b981] text-[#00422b] font-stat-mono-sm text-xs font-bold px-4 py-2.5 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}

      {/* Top Match Status Header Strip */}
      <header className="w-full bg-[#080e1b] px-4 py-2.5 flex items-center justify-between gap-4 shrink-0 shadow-md border-b border-[#3c4a42]/30">
        {/* Match Info & Badges */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#242a38] text-[#4edea3] font-stat-mono-sm text-xs font-semibold">
                {match.format === 'T20' ? '2nd T20I' : match.format}
              </span>
              <span className="font-headline-sm text-base text-[#dde2f5] font-bold tracking-tight">
                {match.title}
              </span>
              <span className="font-body-sm text-xs text-[#bbcabf] truncate">
                {match.venue}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10b981] text-[#00422b] font-label-caps text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00422b] animate-ping"></span>
                {isChasing ? 'CHASE IN PROGRESS' : '1ST INNINGS'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#1a1f2d] text-[#ffb95f] font-label-caps text-[10px] font-semibold">
                {match.powerplayDetails || 'POWERPLAY (1-6)'}
              </span>
              <span className="font-label-caps text-[10px] text-[#bbcabf]">
                DLS PAR: {match.dlsPar || 142}
              </span>
            </div>
          </div>
        </div>

        {/* Massive Score & Rates */}
        <div className="flex items-center gap-5 bg-[#161b29] px-4 py-1.5 rounded-xl border border-[#3c4a42]/30">
          <div className="flex items-baseline gap-2">
            <span className="font-headline-sm text-base text-[#bbcabf] font-bold">
              {currentInnings?.battingTeamName === 'England' ? 'ENG' : match.team1.shortName}
            </span>
            <span className="font-stat-mono-lg text-4xl leading-none font-extrabold text-[#dde2f5] tracking-tight">
              {currentInnings?.runs || 0}
              <span className="text-[#ffb4ab] font-medium">/{currentInnings?.wickets || 0}</span>
            </span>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase">OVERS</span>
              <span className="font-stat-mono-md text-sm text-[#4edea3] font-bold">
                {currentInnings?.oversFormatted || '0.0'}{' '}
                <span className="text-[#bbcabf] font-normal">/ {match.totalOvers}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase">CRR</span>
              <span className="font-stat-mono-sm text-xs text-[#dde2f5] font-semibold">
                {currentRunRate}
              </span>
            </div>
            {/* Live Extras Breakdown Capsule */}
            <div
              onClick={() => setIsExtrasModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#080e1b] px-2.5 py-1 rounded-lg border border-[#3c4a42]/30 hover:border-[#4edea3]/50 cursor-pointer transition-all"
              title="Click to record or review Extras"
            >
              <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase font-bold">Extras</span>
              <span className="font-stat-mono-sm text-xs text-[#4edea3] font-extrabold">
                {currentInnings ? currentInnings.extras.total : 0}
              </span>
              <span className="text-[10px] text-[#bbcabf] font-stat-mono-sm hidden md:inline">
                ({currentInnings ? `w${currentInnings.extras.wides} nb${currentInnings.extras.noBalls} lb${currentInnings.extras.legByes} b${currentInnings.extras.byes}` : ''})
              </span>
            </div>
          </div>
        </div>

        {/* Chase Telemetry HUD */}
        {isChasing ? (
          <div className="flex items-center gap-4 bg-[#242a38] px-4 py-2 rounded-xl shadow-inner border border-[#3c4a42]/40">
            <div className="flex flex-col">
              <span className="font-label-caps text-[10px] text-[#ffb95f] uppercase font-bold">
                TARGET {match.target}
              </span>
              <span className="font-stat-mono-md text-sm font-bold text-[#dde2f5]">
                NEED <span className="text-[#ffb95f]">{runsRequired}</span> OFF{' '}
                <span className="text-[#4edea3]">{ballsRemaining}b</span>
              </span>
            </div>
            <div className="h-8 w-px bg-[#3c4a42]/60"></div>
            <div className="flex flex-col">
              <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase">RRR</span>
              <span className="font-stat-mono-md text-sm font-bold text-[#ffb95f]">
                {requiredRunRate}
              </span>
            </div>
            {/* Progress Bar Visual Target */}
            <div className="w-24 flex flex-col gap-1">
              <div className="w-full bg-[#080e1b] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#4edea3] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="font-stat-mono-sm text-[10px] text-right text-[#bbcabf] leading-none">
                {progressPercent}% REQ
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-[#242a38] px-4 py-2 rounded-xl">
            <div className="flex flex-col">
              <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase">ESTIMATED TOTAL</span>
              <span className="font-stat-mono-md text-sm font-bold text-[#4edea3]">
                {Math.round(Number(currentRunRate) * match.totalOvers)} RUNS
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Main 3-Column Cockpit Workspace */}
      <main className="grid grid-cols-12 gap-3 p-3 flex-1 min-h-0 w-full overflow-hidden">
        {/* LEFT COLUMN: Batting Metrics & Wagon Wheel */}
        <section className="col-span-3 flex flex-col gap-3 min-h-0 h-full">
          {/* Active Batters Panel */}
          <div className="bg-[#161b29] rounded-xl p-3 flex flex-col gap-2 shadow-sm border border-[#3c4a42]/30">
            <div className="flex items-center justify-between pb-1">
              <span className="font-label-caps text-xs uppercase text-[#bbcabf] flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[16px] text-[#4edea3]">
                  sports_cricket
                </span>
                Batter in Middle
              </span>
              <button
                onClick={() => {
                  onSwapStrike();
                  showToast('Strike swapped manually (X)');
                }}
                className="font-label-caps text-xs text-[#4edea3] hover:underline cursor-pointer font-bold"
                type="button"
              >
                Swap Strike (X)
              </button>
            </div>

            {/* Striker Card */}
            {striker && (
              <div className="bg-[#242a38] rounded-lg p-2.5 relative overflow-hidden transition-all duration-150 border-l-4 border-[#4edea3]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
                    <span className="font-headline-sm text-sm font-bold text-[#dde2f5]">
                      {striker.playerName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#10b981] text-[#00422b] font-label-caps text-[9px] uppercase tracking-wide font-extrabold">
                      Strike
                    </span>
                  </div>
                  <span className="font-stat-mono-md text-base font-extrabold text-[#4edea3]">
                    {striker.runs}
                    <span className="text-xs font-normal">*</span>
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1 mt-2 pt-1 bg-[#080e1b]/60 rounded px-2 text-center">
                  <div>
                    <div className="font-label-caps text-[9px] text-[#bbcabf] uppercase">Balls</div>
                    <div className="font-stat-mono-sm text-xs text-[#dde2f5]">{striker.ballsFaced}</div>
                  </div>
                  <div>
                    <div className="font-label-caps text-[9px] text-[#bbcabf] uppercase">4s</div>
                    <div className="font-stat-mono-sm text-xs text-[#ffb95f] font-bold">{striker.fours}</div>
                  </div>
                  <div>
                    <div className="font-label-caps text-[9px] text-[#bbcabf] uppercase">6s</div>
                    <div className="font-stat-mono-sm text-xs text-[#4edea3] font-bold">{striker.sixes}</div>
                  </div>
                  <div>
                    <div className="font-label-caps text-[9px] text-[#bbcabf] uppercase">SR</div>
                    <div className="font-stat-mono-sm text-xs text-[#dde2f5]">{striker.strikeRate}</div>
                  </div>
                  <div>
                    <div className="font-label-caps text-[9px] text-[#bbcabf] uppercase">Dots</div>
                    <div className="font-stat-mono-sm text-xs text-[#bbcabf]">{striker.dots}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Non-Striker Card */}
            {nonStriker && (
              <div className="bg-[#1a1f2d] rounded-lg p-2.5 border border-[#3c4a42]/30">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-sm font-semibold text-[#dde2f5]">
                    {nonStriker.playerName}
                  </span>
                  <span className="font-stat-mono-md text-base font-bold text-[#dde2f5]">
                    {nonStriker.runs}
                    <span className="text-xs font-normal text-[#bbcabf]">*</span>
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1 mt-2 pt-1 bg-[#080e1b]/40 rounded px-2 text-center">
                  <div>
                    <div className="font-label-caps text-[9px] text-[#bbcabf] uppercase">Balls</div>
                    <div className="font-stat-mono-sm text-xs text-[#dde2f5]">{nonStriker.ballsFaced}</div>
                  </div>
                  <div>
                    <div className="font-label-caps text-[9px] text-[#bbcabf] uppercase">4s</div>
                    <div className="font-stat-mono-sm text-xs text-[#ffb95f]">{nonStriker.fours}</div>
                  </div>
                  <div>
                    <div className="font-label-caps text-[9px] text-[#bbcabf] uppercase">6s</div>
                    <div className="font-stat-mono-sm text-xs text-[#bbcabf]">{nonStriker.sixes}</div>
                  </div>
                  <div>
                    <div className="font-label-caps text-[9px] text-[#bbcabf] uppercase">SR</div>
                    <div className="font-stat-mono-sm text-xs text-[#dde2f5]">{nonStriker.strikeRate}</div>
                  </div>
                  <div>
                    <div className="font-label-caps text-[9px] text-[#bbcabf] uppercase">Dots</div>
                    <div className="font-stat-mono-sm text-xs text-[#bbcabf]">{nonStriker.dots}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Partnership Metric Capsule */}
            {(() => {
              const b1IsStriker = striker && activePartnership?.batter1Id === striker.playerId;
              const strikerRunsInStand = activePartnership
                ? (b1IsStriker ? activePartnership.batter1Runs : activePartnership.batter2Runs)
                : 0;
              const nonStrikerRunsInStand = activePartnership
                ? (b1IsStriker ? activePartnership.batter2Runs : activePartnership.batter1Runs)
                : 0;

              return (
                <div className="bg-[#080e1b] p-2 rounded-lg flex items-center justify-between border border-[#3c4a42]/20">
                  <div className="flex flex-col">
                    <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase flex items-center gap-1.5">
                      <span>{currentInnings ? `${currentInnings.wickets + 1}th Wkt Partnership` : 'Current Partnership'}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                    </span>
                    <span className="font-stat-mono-sm text-xs font-semibold text-[#dde2f5]">
                      {activePartnership ? activePartnership.totalRuns : 0} runs{' '}
                      <span className="text-[#bbcabf] font-normal">({activePartnership ? activePartnership.totalBalls : 0}b)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-label-caps text-[10px] text-[#bbcabf]">
                    <span className="text-[#dde2f5] font-semibold">
                      {striker?.playerName.split(' ').slice(-1)[0] || 'Bat1'}: {strikerRunsInStand}
                    </span>
                    <span>•</span>
                    <span>
                      {nonStriker?.playerName.split(' ').slice(-1)[0] || 'Bat2'}: {nonStrikerRunsInStand}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Wagon Wheel & Pitch Zone Telemetry */}
          <div className="bg-[#161b29] rounded-xl p-3 flex-1 min-h-0 flex flex-col justify-between shadow-sm border border-[#3c4a42]/30">
            <div className="flex items-center justify-between pb-1">
              <span className="font-label-caps text-xs uppercase text-[#bbcabf] flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[15px] text-[#ffb95f]">
                  scatter_plot
                </span>
                Wagon Wheel & Pitch Map
              </span>
              <div className="flex bg-[#080e1b] rounded p-0.5 border border-[#3c4a42]/30">
                <button
                  onClick={() => setWagonView('striker')}
                  className={`px-2 py-0.5 text-[10px] font-label-caps rounded uppercase cursor-pointer ${
                    wagonView === 'striker' ? 'bg-[#242a38] text-[#4edea3] font-bold' : 'text-[#bbcabf]'
                  }`}
                  type="button"
                >
                  {striker?.playerName.split(' ')[1] || 'Striker'} ({striker?.wagonShots?.length || 0})
                </button>
                <button
                  onClick={() => setWagonView('innings')}
                  className={`px-2 py-0.5 text-[10px] font-label-caps rounded uppercase cursor-pointer ${
                    wagonView === 'innings' ? 'bg-[#242a38] text-[#4edea3] font-bold' : 'text-[#bbcabf]'
                  }`}
                  type="button"
                >
                  Innings ({currentInnings?.wagonShots?.length || 0})
                </button>
              </div>
            </div>

            {/* Wagon Wheel SVG with Interactive Aiming */}
            <div className="relative w-full aspect-square max-h-[165px] mx-auto flex items-center justify-center bg-[#080e1b] rounded-full overflow-hidden border border-[#3c4a42]/40 shadow-inner group">
              <svg
                className="w-full h-full p-1.5 cursor-crosshair"
                viewBox="0 0 200 200"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const svgX = (x / rect.width) * 200;
                  const svgY = (y / rect.height) * 200;
                  const dx = svgX - 100;
                  const dy = svgY - 100;
                  const rawAngle = Math.atan2(dy, dx) * (180 / Math.PI);
                  const cricketAngle = (Math.round(rawAngle + 90) + 360) % 360;
                  const distPercent = Math.min(100, Math.round((Math.sqrt(dx * dx + dy * dy) / 90) * 100));
                  setAimedWagonZone({ angle: cricketAngle, distance: Math.max(25, distPercent) });
                  showToast(`Aimed shot: ${cricketAngle}° angle (${distPercent}% depth). Press 0-6 to score.`);
                }}
              >
                {/* Boundary Oval */}
                <ellipse cx="100" cy="100" rx="92" ry="92" fill="#0c1322" stroke="#2f3543" strokeWidth="1" strokeDasharray="3 3" />
                {/* 30-yard Circle */}
                <circle cx="100" cy="100" r="48" fill="none" stroke="#242a38" strokeWidth="1" strokeDasharray="2 2" />
                {/* Pitch Rectangle */}
                <rect x="95" y="76" width="10" height="48" rx="1" fill="#334155" />

                {/* Render Shot Vectors */}
                {visibleShots.map((shot, idx) => {
                  const rad = (shot.angle - 90) * (Math.PI / 180);
                  const length = (shot.distance / 100) * 85;
                  const x2 = 100 + length * Math.cos(rad);
                  const y2 = 100 + length * Math.sin(rad);

                  // Distinct color per scoring tier
                  let strokeColor = '#38bdf8'; // 1-2 runs (sky blue)
                  let strokeWidth = 1.6;
                  let dotRadius = 2;

                  if (shot.isSix || shot.runs === 6) {
                    strokeColor = '#4edea3'; // 6 runs (emerald)
                    strokeWidth = 2.6;
                    dotRadius = 3.5;
                  } else if (shot.isFour || shot.runs === 4) {
                    strokeColor = '#ffb95f'; // 4 runs (amber)
                    strokeWidth = 2.2;
                    dotRadius = 3;
                  } else if (shot.runs === 3) {
                    strokeColor = '#c084fc'; // 3 runs (violet)
                    strokeWidth = 1.8;
                    dotRadius = 2.4;
                  } else if (shot.runs === 2) {
                    strokeColor = '#38bdf8'; // 2 runs (cyan)
                    strokeWidth = 1.6;
                    dotRadius = 2;
                  } else {
                    strokeColor = '#60a5fa'; // 1 run (blue)
                    strokeWidth = 1.4;
                    dotRadius = 1.8;
                  }

                  const isLatest = idx === visibleShots.length - 1;

                  return (
                    <g key={shot.id || idx}>
                      <line
                        x1="100"
                        y1="100"
                        x2={x2}
                        y2={y2}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        opacity={isLatest ? 1 : 0.85}
                      />
                      <circle cx={x2} cy={y2} r={dotRadius} fill={strokeColor} />
                      {isLatest && (
                        <circle cx={x2} cy={y2} r={dotRadius + 2.5} fill="none" stroke={strokeColor} strokeWidth="1" opacity="0.75" />
                      )}
                    </g>
                  );
                })}

                {/* Aiming Reticle when scorer clicks the wheel */}
                {aimedWagonZone && (() => {
                  const rad = (aimedWagonZone.angle - 90) * (Math.PI / 180);
                  const length = (aimedWagonZone.distance / 100) * 85;
                  const ax = 100 + length * Math.cos(rad);
                  const ay = 100 + length * Math.sin(rad);
                  return (
                    <g>
                      <line x1="100" y1="100" x2={ax} y2={ay} stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle cx={ax} cy={ay} r="6" fill="#10b981" fillOpacity="0.3" stroke="#4edea3" strokeWidth="1.5" />
                      <circle cx={ax} cy={ay} r="2" fill="#ffffff" />
                    </g>
                  );
                })()}

                {/* Pitcher / Batter Center Dot */}
                <circle cx="100" cy="100" r="3" fill="#4edea3" />
              </svg>

              {/* Aiming Indicator Badge */}
              {aimedWagonZone && (
                <div className="absolute top-1 left-2 bg-[#10b981] text-[#00422b] px-2 py-0.5 rounded font-stat-mono-sm text-[10px] font-bold flex items-center gap-1 shadow-md">
                  <span>Aimed: {aimedWagonZone.angle}°</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAimedWagonZone(null);
                    }}
                    className="text-[#00422b] hover:text-[#000000] font-extrabold ml-1 cursor-pointer"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Shot Breakdown Badges */}
              <div className="absolute bottom-1 right-2 text-right bg-[#080e1b]/80 px-1.5 py-0.5 rounded backdrop-blur-sm border border-[#3c4a42]/30 pointer-events-none">
                <span className="font-stat-mono-sm text-[10px] text-[#4edea3] block leading-none font-bold">
                  {sixCount} x 6s
                </span>
                <span className="font-stat-mono-sm text-[10px] text-[#ffb95f] block leading-none mt-1 font-bold">
                  {fourCount} x 4s
                </span>
                <span className="font-stat-mono-sm text-[10px] text-[#38bdf8] block leading-none mt-1 font-semibold">
                  {singleDoubleCount} x 1s/2s
                </span>
              </div>

              {visibleShots.length === 0 && !aimedWagonZone && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-[#86948a] font-stat-mono-sm bg-[#080e1b]/80 px-2 py-1 rounded">
                    Click field to aim • Score 1-6
                  </span>
                </div>
              )}
            </div>

            {/* Last Dismissal Card */}
            <div className="bg-[#1a1f2d] rounded-lg p-2 flex items-center justify-between border border-[#3c4a42]/30">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className={`px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase font-extrabold shrink-0 ${
                  lastDismissal ? 'bg-[#93000a] text-[#ffdad6]' : 'bg-[#10b981]/20 text-[#4edea3]'
                }`}>
                  {lastDismissal ? 'WKT' : '0 W'}
                </span>
                <div className="truncate">
                  <span className="font-stat-mono-sm text-xs text-[#dde2f5] truncate block font-bold">
                    {lastDismissedBatter
                      ? `${lastDismissedBatter.playerName} ${lastDismissedBatter.dismissal?.text || 'out'} ${lastDismissedBatter.runs}`
                      : 'No dismissals in innings yet'}
                  </span>
                  <span className="font-body-sm text-[10px] text-[#bbcabf] block">
                    {lastDismissal
                      ? `${lastDismissal.balls}b • FOW: ${lastDismissal.teamRuns}/${lastDismissal.wicketNumber} (${lastDismissal.overs} ov)`
                      : 'All 10 wickets in hand'}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-[#bbcabf] shrink-0">
                info
              </span>
            </div>
          </div>
        </section>

        {/* CENTER COLUMN: Live Scoring Keypad & Over Timeline */}
        <section className="col-span-6 flex flex-col gap-3 min-h-0 h-full">
          {/* Current Over Delivery Reel Tracker Strip */}
          <div className="bg-[#161b29] rounded-xl p-3 flex flex-col gap-2 shadow-sm border border-[#3c4a42]/30 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-label-caps text-xs uppercase text-[#4edea3] font-extrabold">
                  OVER {currentOverIndex + 1} ({bowler?.playerName.toUpperCase()} TO {striker?.playerName.toUpperCase()})
                </span>
                <span className="text-[#bbcabf] font-label-caps text-xs">•</span>
                <span className="font-stat-mono-sm text-xs text-[#dde2f5] font-semibold">
                  {currentOverRunsConceded} Runs Conceded
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label-caps text-xs text-[#bbcabf] uppercase font-bold">
                  Ball {legalBallsInCurrentOver} of {ballsPerOver}
                </span>
                {onUndo && (
                  <button
                    type="button"
                    onClick={() => {
                      if (canUndo) {
                        onUndo();
                        showToast('Undid previous ball / score');
                      }
                    }}
                    disabled={!canUndo}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-stat-mono-sm transition-all border ${
                      canUndo
                        ? 'bg-[#242a38] hover:bg-[#93000a] text-[#ffb4ab] hover:text-[#ffffff] border-[#ffb4ab]/40 cursor-pointer shadow-sm active:scale-95'
                        : 'bg-[#1a1f2d]/40 text-[#86948a]/40 border-transparent cursor-not-allowed opacity-50'
                    }`}
                    title="Undo last delivery [Z]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Over Timeline Badges Reel (6 Slots) */}
            <div className="grid grid-cols-6 gap-2 pt-1">
              {Array.from({ length: 6 }).map((_, slotIdx) => {
                const delivery = currentOverDeliveries[slotIdx];
                const isCurrentActiveSlot = slotIdx === currentOverDeliveries.length;

                if (delivery) {
                  const isWicket = !!delivery.dismissal;
                  const isFour = delivery.isFour;
                  const isSix = delivery.isSix;
                  const isWide = delivery.deliveryType === 'wide';
                  const isNb = delivery.deliveryType === 'no_ball';

                  return (
                    <div
                      key={delivery.id || slotIdx}
                      className="bg-[#242a38] rounded-lg p-1.5 flex flex-col items-center justify-center text-center border border-[#3c4a42]/30"
                    >
                      <span className="font-stat-mono-sm text-[10px] text-[#bbcabf]">
                        {delivery.displayOver}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center my-1 shadow-sm font-stat-mono-md text-sm font-bold ${
                          isWicket
                            ? 'bg-[#93000a] text-[#ffdad6]'
                            : isSix
                            ? 'bg-[#10b981] text-[#00422b]'
                            : isFour
                            ? 'bg-[#ee9800] text-[#472a00]'
                            : isWide || isNb
                            ? 'bg-[#164E63] text-[#06B6D4]'
                            : delivery.batterRuns === 0
                            ? 'bg-[#2f3543] text-[#bbcabf]'
                            : 'bg-[#1a1f2d] text-[#dde2f5]'
                        }`}
                      >
                        {isWicket ? 'W' : isWide ? `Wd` : isNb ? `Nb` : delivery.batterRuns === 0 ? '•' : delivery.batterRuns}
                      </div>
                      <span className="font-label-caps text-[9px] text-[#bbcabf] truncate w-full">
                        {delivery.strikerName.split(' ')[1] || delivery.strikerName}
                      </span>
                    </div>
                  );
                }

                if (isCurrentActiveSlot) {
                  return (
                    <div
                      key={slotIdx}
                      className="bg-[#2f3543] rounded-lg p-1.5 flex flex-col items-center justify-center text-center relative overflow-hidden animate-pulse border border-[#4edea3]/40"
                    >
                      <span className="font-stat-mono-sm text-[10px] text-[#4edea3] font-bold">
                        {currentOverIndex}.{legalBallsInCurrentOver + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-[#10b981] text-[#00422b] flex items-center justify-center my-1 shadow-md">
                        <span className="material-symbols-outlined text-[18px]">
                          radio_button_checked
                        </span>
                      </div>
                      <span className="font-label-caps text-[9px] text-[#4edea3] font-bold uppercase truncate w-full">
                        Awaiting
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={slotIdx}
                    className="bg-[#1a1f2d]/50 rounded-lg p-1.5 flex flex-col items-center justify-center text-center border border-[#3c4a42]/20 opacity-50"
                  >
                    <span className="font-stat-mono-sm text-[10px] text-[#86948a]">
                      {currentOverIndex}.{slotIdx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#080e1b] flex items-center justify-center my-1 text-[#86948a]">
                      -
                    </div>
                    <span className="font-label-caps text-[9px] text-[#86948a] uppercase truncate w-full">
                      Slot
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* High-Intensity Scoring Keypad Engine */}
          <div className="bg-[#161b29] rounded-xl p-4 flex-1 flex flex-col justify-between shadow-lg border border-[#3c4a42]/30">
            {/* Scoring Keypad Banner Indicator */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-sm font-semibold text-[#dde2f5]">
                  Record Ball Output
                </span>
                <span className="font-body-sm text-[11px] text-[#bbcabf] hidden sm:inline">
                  Hotkeys: [0-6] Runs | [W] Wicket | [E] Extras | [X] Swap | [Z] Undo
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onUndo && (
                  <button
                    type="button"
                    onClick={() => {
                      if (canUndo) {
                        onUndo();
                        showToast('Undid previous score/ball entry');
                      }
                    }}
                    disabled={!canUndo}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-stat-mono-sm text-xs font-bold transition-all shadow-sm ${
                      canUndo
                        ? 'bg-[#93000a]/20 border border-[#ffb4ab]/60 text-[#ffb4ab] hover:bg-[#93000a] hover:text-[#ffffff] active:scale-95 cursor-pointer ring-1 ring-[#ffb4ab]/30'
                        : 'bg-[#1a1f2d]/40 border border-[#3c4a42]/20 text-[#86948a]/40 cursor-not-allowed opacity-40'
                    }`}
                    title="Undo Last Delivery / Mistake (Z or Ctrl+Z)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo Ball</span>
                  </button>
                )}
                <span className="font-stat-mono-sm text-xs px-2 py-0.5 rounded bg-[#1a1f2d] text-[#4edea3] font-bold border border-[#4edea3]/30">
                  Fast-Input Mode
                </span>
              </div>
            </div>

            {/* 6 Main Big Target Buttons */}
            <div className="grid grid-cols-3 gap-3 flex-1 my-2">
              {/* 0 Dot Ball */}
              <button
                onClick={() => handleRecordRun(0)}
                className="group flex flex-col items-center justify-center bg-[#1a1f2d] hover:bg-[#242a38] border border-[#3c4a42]/40 hover:border-[#4edea3]/50 rounded-xl p-4 transition-all active:scale-[0.98] shadow-sm cursor-pointer min-h-[90px]"
                type="button"
              >
                <span className="font-stat-mono-lg text-4xl leading-none text-[#dde2f5] font-extrabold group-hover:text-[#4edea3] transition-colors">
                  0
                </span>
                <span className="font-label-caps text-xs text-[#bbcabf] uppercase mt-2 font-semibold">
                  Dot Ball [0]
                </span>
              </button>

              {/* 1 Single */}
              <button
                onClick={() => handleRecordRun(1)}
                className="group flex flex-col items-center justify-center bg-[#1a1f2d] hover:bg-[#242a38] border border-[#3c4a42]/40 hover:border-[#4edea3]/50 rounded-xl p-4 transition-all active:scale-[0.98] shadow-sm cursor-pointer min-h-[90px]"
                type="button"
              >
                <span className="font-stat-mono-lg text-4xl leading-none text-[#dde2f5] font-extrabold group-hover:text-[#4edea3] transition-colors">
                  1
                </span>
                <span className="font-label-caps text-xs text-[#bbcabf] uppercase mt-2 font-semibold">
                  Single [1]
                </span>
              </button>

              {/* 2 Runs */}
              <button
                onClick={() => handleRecordRun(2)}
                className="group flex flex-col items-center justify-center bg-[#1a1f2d] hover:bg-[#242a38] border border-[#3c4a42]/40 hover:border-[#4edea3]/50 rounded-xl p-4 transition-all active:scale-[0.98] shadow-sm cursor-pointer min-h-[90px]"
                type="button"
              >
                <span className="font-stat-mono-lg text-4xl leading-none text-[#dde2f5] font-extrabold group-hover:text-[#4edea3] transition-colors">
                  2
                </span>
                <span className="font-label-caps text-xs text-[#bbcabf] uppercase mt-2 font-semibold">
                  Two Runs [2]
                </span>
              </button>

              {/* 3 Runs */}
              <button
                onClick={() => handleRecordRun(3)}
                className="group flex flex-col items-center justify-center bg-[#1a1f2d] hover:bg-[#242a38] border border-[#3c4a42]/40 hover:border-[#4edea3]/50 rounded-xl p-4 transition-all active:scale-[0.98] shadow-sm cursor-pointer min-h-[90px]"
                type="button"
              >
                <span className="font-stat-mono-lg text-4xl leading-none text-[#dde2f5] font-extrabold group-hover:text-[#4edea3] transition-colors">
                  3
                </span>
                <span className="font-label-caps text-xs text-[#bbcabf] uppercase mt-2 font-semibold">
                  Three Runs [3]
                </span>
              </button>

              {/* 4 Boundary Four (Amber Theme) */}
              <button
                onClick={() => handleRecordRun(4)}
                className="group flex flex-col items-center justify-center bg-[#242a38] hover:bg-[#ee9800] border border-[#ffb95f]/40 hover:border-[#ee9800] rounded-xl p-4 transition-all active:scale-[0.98] shadow-md cursor-pointer min-h-[90px]"
                type="button"
              >
                <span className="font-stat-mono-lg text-4xl leading-none text-[#ffb95f] font-black group-hover:text-[#472a00] transition-colors">
                  4
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-2 h-2 rounded-full bg-[#ffb95f] group-hover:bg-[#472a00]"></span>
                  <span className="font-label-caps text-xs text-[#ffb95f] uppercase font-bold group-hover:text-[#472a00]">
                    Boundary Four [4]
                  </span>
                </div>
              </button>

              {/* 6 Maximum Six (Emerald High-Energy Theme) */}
              <button
                onClick={() => handleRecordRun(6)}
                className="group flex flex-col items-center justify-center bg-[#10b981]/20 hover:bg-[#10b981] border border-[#4edea3]/50 hover:border-[#10b981] rounded-xl p-4 transition-all active:scale-[0.98] shadow-md cursor-pointer min-h-[90px]"
                type="button"
              >
                <span className="font-stat-mono-lg text-4xl leading-none text-[#4edea3] font-black group-hover:text-[#00422b] transition-colors">
                  6
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-ping group-hover:bg-[#00422b]"></span>
                  <span className="font-label-caps text-xs text-[#4edea3] uppercase font-bold group-hover:text-[#00422b]">
                    Maximum Six [6]
                  </span>
                </div>
              </button>
            </div>

            {/* Secondary Operational Triggers Grid (Extras, Wickets, Undo, Over End, Penalty) */}
            <div className="grid grid-cols-5 gap-2 pt-2 border-t border-[#3c4a42]/30">
              {/* Extras Launcher Button */}
              <button
                onClick={() => {
                  if (!currentInnings?.currentBowlerId) {
                    setIsBowlerModalOpen(true);
                    showToast('Select an alternating bowler for this over (Law 17.8)');
                    return;
                  }
                  setIsExtrasModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg bg-[#1a1f2d] hover:bg-[#242a38] text-[#06B6D4] border border-[#164E63] transition-all active:scale-95 shadow-sm cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
                  add_moderator
                </span>
                <div className="text-left">
                  <span className="font-stat-mono-sm text-xs font-bold block leading-tight">
                    EXTRAS
                  </span>
                  <span className="font-label-caps text-[9px] text-[#bbcabf] block uppercase">
                    Wd, Nb, B
                  </span>
                </div>
              </button>

              {/* Wicket Modal Launcher Button (Crimson) */}
              <button
                onClick={() => {
                  if (!currentInnings?.currentBowlerId) {
                    setIsBowlerModalOpen(true);
                    showToast('Select an alternating bowler for this over (Law 17.8)');
                    return;
                  }
                  setIsWicketModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg bg-[#93000a] hover:bg-[#ba1a1a] text-[#ffdad6] border border-[#ffb4ab]/40 transition-all active:scale-95 shadow-md cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
                  gavel
                </span>
                <div className="text-left">
                  <span className="font-headline-sm text-xs font-extrabold block leading-tight">
                    WICKET
                  </span>
                  <span className="font-label-caps text-[9px] uppercase tracking-wider block">
                    Out [W]
                  </span>
                </div>
              </button>

              {/* UNDO Last Ball / Score Entry Button */}
              <button
                onClick={() => {
                  if (onUndo && canUndo) {
                    onUndo();
                    showToast('Undid previous score/ball');
                  }
                }}
                disabled={!canUndo}
                className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg border transition-all shadow-sm ${
                  canUndo
                    ? 'bg-[#242a38] hover:bg-[#93000a] text-[#ffb4ab] hover:text-[#ffffff] border-[#ffb4ab]/50 active:scale-95 cursor-pointer ring-1 ring-[#ffb4ab]/30'
                    : 'bg-[#1a1f2d]/50 text-[#86948a]/40 border-[#3c4a42]/20 cursor-not-allowed opacity-40'
                }`}
                type="button"
                title="Undo last score / delivery entered by mistake (Z)"
              >
                <span className="material-symbols-outlined text-[20px]">
                  undo
                </span>
                <div className="text-left">
                  <span className="font-stat-mono-sm text-xs font-bold block leading-tight">
                    UNDO
                  </span>
                  <span className="font-label-caps text-[9px] text-[#bbcabf] block uppercase">
                    Last Ball [Z]
                  </span>
                </div>
              </button>

              {/* End Over / Change Bowler */}
              <button
                onClick={() => setIsBowlerModalOpen(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg bg-[#1a1f2d] hover:bg-[#242a38] text-[#dde2f5] border border-[#3c4a42]/40 transition-all active:scale-95 shadow-sm cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px] text-[#4edea3]">
                  sync_alt
                </span>
                <div className="text-left">
                  <span className="font-stat-mono-sm text-xs font-bold block leading-tight">
                    OVER END
                  </span>
                  <span className="font-label-caps text-[9px] text-[#bbcabf] block uppercase">
                    New Bowler
                  </span>
                </div>
              </button>

              {/* Penalty Runs Adjustment */}
              <button
                onClick={() => setIsPenaltyModalOpen(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg bg-[#1a1f2d] hover:bg-[#242a38] text-[#ffb95f] border border-[#ffb95f]/30 transition-all active:scale-95 shadow-sm cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
                  exposure
                </span>
                <div className="text-left">
                  <span className="font-stat-mono-sm text-xs font-bold block leading-tight">
                    PENALTY
                  </span>
                  <span className="font-label-caps text-[9px] text-[#bbcabf] block uppercase">
                    +5 / -5 Runs
                  </span>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Bowling Figures, Selector & Match Feed */}
        <section className="col-span-3 flex flex-col gap-3 min-h-0 h-full">
          {/* Active Bowler Card */}
          <div className="bg-[#161b29] rounded-xl p-3 flex flex-col gap-2 shadow-sm border border-[#3c4a42]/30">
            <div className="flex items-center justify-between pb-1">
              <span className="font-label-caps text-xs uppercase text-[#bbcabf] flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[15px] text-[#4edea3]">
                  sports_baseball
                </span>
                Active Bowler
              </span>
              <span className="font-stat-mono-sm text-[11px] text-[#ffb95f] font-bold">
                {match.format === 'Test'
                  ? `SPELL: ${bowler?.overs || '0.0'} ov (Unlimited)`
                  : `SPELL: ${bowler?.overs || '0.0'} / ${maxOvers === Infinity ? '∞' : `${maxOvers}.0`} ov`}
              </span>
            </div>

            {bowler ? (
              <div className="bg-[#242a38] rounded-lg p-2.5 flex flex-col gap-2 border border-[#3c4a42]/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#161b29] flex items-center justify-center font-stat-mono-sm text-xs font-bold text-[#4edea3] border border-[#4edea3]/40">
                      {bowler.playerName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-headline-sm text-xs font-bold text-[#dde2f5] block leading-tight">
                        {bowler.playerName}
                      </span>
                      <span className="font-body-sm text-[11px] text-[#bbcabf] block">
                        {fieldingTeam?.players.find(p => p.id === bowler.playerId)?.bowlingStyle || 'Bowler'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-stat-mono-md text-base font-extrabold text-[#ffb4ab]">
                      {bowler.wickets}
                      <span className="text-[#bbcabf] font-normal">/</span>
                      {bowler.runsConceded}
                    </span>
                    <span className="font-label-caps text-[9px] text-[#bbcabf] block uppercase">
                      Wkts / Runs
                    </span>
                  </div>
                </div>

                {/* Tabular Figures */}
                <div className="grid grid-cols-5 gap-1 bg-[#080e1b]/60 rounded p-1.5 text-center">
                  <div>
                    <span className="font-label-caps text-[9px] text-[#bbcabf] block uppercase">O</span>
                    <span className="font-stat-mono-sm text-xs text-[#dde2f5] font-semibold">{bowler.overs}</span>
                  </div>
                  <div>
                    <span className="font-label-caps text-[9px] text-[#bbcabf] block uppercase">M</span>
                    <span className="font-stat-mono-sm text-xs text-[#dde2f5]">{bowler.maidens}</span>
                  </div>
                  <div>
                    <span className="font-label-caps text-[9px] text-[#bbcabf] block uppercase">R</span>
                    <span className="font-stat-mono-sm text-xs text-[#dde2f5]">{bowler.runsConceded}</span>
                  </div>
                  <div>
                    <span className="font-label-caps text-[9px] text-[#bbcabf] block uppercase">W</span>
                    <span className="font-stat-mono-sm text-xs text-[#ffb4ab] font-bold">{bowler.wickets}</span>
                  </div>
                  <div>
                    <span className="font-label-caps text-[9px] text-[#bbcabf] block uppercase">ECON</span>
                    <span className="font-stat-mono-sm text-xs text-[#4edea3] font-bold">{bowler.economy}</span>
                  </div>
                </div>

                {/* Extras breakdown bar */}
                <div className="flex items-center justify-between px-1 text-[11px] font-stat-mono-sm text-[#bbcabf]">
                  <span>Discipline: {bowler.wides} Wd, {bowler.noBalls} Nb</span>
                  <span className="text-[#4edea3] font-bold">{ballsPerOver - legalBallsInCurrentOver} Balls Remain</span>
                </div>
              </div>
            ) : (
              <div className="bg-[#242a38] rounded-lg p-3 flex flex-col items-center justify-center gap-2 border border-[#3c4a42]/30 text-center">
                <div className="w-8 h-8 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#4edea3]">
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                </div>
                <div>
                  <span className="font-headline-sm text-xs font-bold text-[#dde2f5] block">
                    Over Complete • Bowler Required
                  </span>
                  <span className="font-body-sm text-[11px] text-[#bbcabf] block">
                    Law 17.8: Select alternating bowler for Over {currentOverIndex + 1}
                  </span>
                </div>
                <button
                  onClick={() => setIsBowlerModalOpen(true)}
                  className="mt-1 px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#00422b] font-stat-mono-sm text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                  <span>Designate Bowler</span>
                </button>
              </div>
            )}

            {/* Next Bowler Selector Dropdown */}
            <div className="flex flex-col gap-1 mt-1">
              <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase">
                Designate Next Bowler (Over {currentOverIndex + (bowler ? 2 : 1)})
              </label>
              <div className="relative">
                <select
                  value={currentInnings?.nextBowlerId || ''}
                  onChange={e => onSetNextBowler(e.target.value)}
                  className="w-full bg-[#1a1f2d] text-[#dde2f5] font-stat-mono-sm text-xs rounded-lg px-2.5 py-1.5 appearance-none focus:outline-none focus:bg-[#242a38] transition-colors cursor-pointer border border-[#3c4a42]/30"
                >
                  <option value="">Select Next Bowler...</option>
                  {fieldingTeam?.players.filter(p => !p.isSubstitute).map(p => {
                    const stats = currentInnings?.bowlingCard.find(b => b.playerId === p.id);
                    const isCurrent = p.id === currentInnings?.currentBowlerId;
                    const isLast = p.id === currentInnings?.lastBowlerId;
                    const eligibility = isBowlerEligible(match, p.id);
                    const maxStr = maxOvers === Infinity ? '' : `/${maxOvers}`;
                    const isDisabled = isCurrent || !eligibility.eligible;
                    return (
                      <option key={p.id} value={p.id} disabled={isDisabled}>
                        {p.name} ({stats ? `${stats.overs}${maxStr} ov` : 'Yet to bowl'})
                        {isCurrent ? ' - Currently bowling' : isLast ? ' - Bowled last over' : !eligibility.eligible ? ` - ${eligibility.reason}` : ''}
                      </option>
                    );
                  })}
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none text-[#bbcabf]">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Over-By-Over Log Feed */}
          <div className="bg-[#161b29] rounded-xl p-3 flex-1 min-h-0 flex flex-col gap-2 shadow-sm border border-[#3c4a42]/30">
            <div className="flex items-center justify-between pb-1">
              <span className="font-label-caps text-xs uppercase text-[#bbcabf] flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[15px] text-[#4edea3]">
                  history
                </span>
                Over-by-Over Reel
              </span>
              <span className="font-stat-mono-sm text-[10px] text-[#bbcabf]">
                Completed Overs
              </span>
            </div>

            {/* Over Log Cards */}
            <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1">
              {currentInnings?.overs.slice(-4).reverse().map(over => (
                <div
                  key={over.overNumber}
                  className="bg-[#1a1f2d] rounded-lg p-2 flex items-center justify-between border border-[#3c4a42]/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-stat-mono-md text-xs font-bold text-[#dde2f5]">
                      Ov {over.displayOverNumber}
                    </span>
                    <div className="flex items-center gap-1">
                      {over.deliveries.slice(0, 6).map((d, dIdx) => (
                        <span
                          key={dIdx}
                          className={`w-5 h-5 rounded-full text-[10px] font-stat-mono-sm flex items-center justify-center font-bold ${
                            d.dismissal
                              ? 'bg-[#93000a] text-[#ffdad6]'
                              : d.isSix
                              ? 'bg-[#10b981] text-[#00422b]'
                              : d.isFour
                              ? 'bg-[#ee9800] text-[#472a00]'
                              : 'bg-[#242a38] text-[#dde2f5]'
                          }`}
                        >
                          {d.dismissal ? 'W' : d.batterRuns}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-stat-mono-sm text-xs font-bold text-[#4edea3] block leading-none">
                      {over.runsConceded}r {over.wickets > 0 ? `• ${over.wickets}w` : ''}
                    </span>
                    <span className="font-label-caps text-[9px] text-[#bbcabf]">
                      {over.bowlerName.split(' ')[1] || over.bowlerName}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Automated Commentary Live Teletype */}
            <div className="bg-[#080e1b] p-2 rounded-lg flex items-start gap-2 border border-[#3c4a42]/30 shrink-0">
              <span className="material-symbols-outlined text-[16px] text-[#4edea3] shrink-0 mt-0.5">
                terminal
              </span>
              <div className="text-[11px] font-body-sm leading-tight text-[#bbcabf]">
                {latestDelivery ? (
                  <>
                    <span className="font-stat-mono-sm text-[#dde2f5] font-semibold">
                      {latestDelivery.displayOver}:
                    </span>{' '}
                    {latestDelivery.commentary}
                  </>
                ) : (
                  'Live telemetry active. Awaiting first delivery of the session.'
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      <ExtrasModal
        isOpen={isExtrasModalOpen}
        onClose={() => setIsExtrasModalOpen(false)}
        onConfirm={onRecordDelivery}
        match={match}
      />

      <WicketModal
        isOpen={isWicketModalOpen}
        onClose={() => setIsWicketModalOpen(false)}
        onConfirm={onRecordDelivery}
        match={match}
      />

      <PenaltyModal
        isOpen={isPenaltyModalOpen}
        onClose={() => setIsPenaltyModalOpen(false)}
        onConfirm={onRecordDelivery}
      />

      <BowlerChangeModal
        isOpen={isBowlerModalOpen}
        onClose={() => setIsBowlerModalOpen(false)}
        onSelectBowler={onChangeBowler}
        match={match}
      />
    </div>
  );
};
