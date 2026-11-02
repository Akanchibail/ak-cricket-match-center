/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Undo2, BookOpen, Maximize2, Bell, Volume2, VolumeX } from 'lucide-react';
import { Match } from '../types/cricket';

interface TopHeaderProps {
  match: Match;
  onUndo: () => void;
  canUndo: boolean;
  onOpenRules: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  match,
  onUndo,
  canUndo,
  onOpenRules,
  soundEnabled,
  onToggleSound,
}) => {
  const currentInnings = match.innings[match.currentInningsIndex];
  const isChasing = match.currentInningsIndex === 1 && match.target !== null;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="fixed top-0 left-72 right-0 h-16 bg-[#080e1b]/95 backdrop-blur-xl border-b border-[#3c4a42]/30 z-40 flex items-center justify-between px-6 shadow-[0_1px_8px_rgba(0,0,0,0.25)]">
      {/* Left Match Context Strip */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1f2d] border border-[#3c4a42]/30">
          <span className="w-2 h-2 rounded-full bg-[#ffb95f] animate-pulse"></span>
          <span className="font-stat-mono-sm text-xs font-semibold text-[#dde2f5] tracking-tight">
            {match.title}
          </span>
          <span className="text-[#86948a] font-stat-mono-sm">•</span>
          <span className="font-body-sm text-xs text-[#bbcabf] truncate max-w-[140px]">
            {match.venue}
          </span>
          <span className="text-[#86948a] font-stat-mono-sm">•</span>
          <span className="font-label-caps text-[10px] text-[#ffb95f] font-semibold uppercase">
            {match.seriesName || match.format}
          </span>
          {isChasing && (
            <>
              <span className="text-[#86948a] font-stat-mono-sm">•</span>
              <span className="font-stat-mono-sm text-xs text-[#4edea3] font-semibold">
                2nd Innings (Chasing {match.target})
              </span>
            </>
          )}
        </div>
      </div>

      {/* Center Status HUD */}
      <div className="hidden md:flex items-center gap-3">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-lg bg-[#242a38] border border-[#4edea3]/30 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]">
          <div className="flex items-center gap-1.5">
            <span className="font-label-caps text-[10px] text-[#86948a] uppercase">Status</span>
            <span className="font-stat-mono-md text-sm font-bold text-[#dde2f5]">
              {match.status === 'completed'
                ? 'Completed'
                : match.status === 'innings_break'
                ? 'Innings Break'
                : `Innings ${match.currentInningsIndex + 1}`}
            </span>
          </div>
          <span className="text-[#86948a] font-stat-mono-sm">|</span>
          <div className="flex items-center gap-1.5">
            <span className="font-label-caps text-[10px] text-[#86948a] uppercase">Over</span>
            <span className="font-stat-mono-md text-sm font-bold text-[#4edea3]">
              {currentInnings ? currentInnings.oversFormatted : '0.0'}
            </span>
          </div>
          <span className="text-[#86948a] font-stat-mono-sm">|</span>
          <div className="flex items-center gap-1.5">
            <span className="font-label-caps text-[10px] text-[#86948a] uppercase">
              {isChasing ? 'Target' : 'DLS Par'}
            </span>
            <span className="font-stat-mono-md text-sm font-bold text-[#ffb95f]">
              {isChasing ? match.target : (match.dlsPar || 142)}
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Undo Button */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-stat-mono-sm text-xs transition-colors ${
            canUndo
              ? 'bg-[#1a1f2d] border-[#ffb4ab]/40 text-[#ffb4ab] hover:bg-[#93000a] hover:text-[#ffdad6] active:scale-95 cursor-pointer'
              : 'bg-[#1a1f2d]/50 border-[#3c4a42]/30 text-[#86948a] cursor-not-allowed opacity-50'
          }`}
          title="Undo Last Delivery (Ctrl+Z)"
          type="button"
        >
          <Undo2 className="w-4 h-4" />
          <span>Undo</span>
        </button>

        {/* Cricket Rules Guide */}
        <button
          onClick={onOpenRules}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1f2d] border border-[#3c4a42]/40 text-[#bbcabf] hover:bg-[#242a38] hover:text-[#dde2f5] transition-colors font-body-sm text-xs cursor-pointer"
          type="button"
          title="Official Laws of Cricket Reference"
        >
          <BookOpen className="w-4 h-4" />
          <span>Rules</span>
        </button>

        {/* Sound toggle */}
        <button
          onClick={onToggleSound}
          className="p-1.5 rounded-lg bg-[#1a1f2d] border border-[#3c4a42]/40 text-[#bbcabf] hover:bg-[#242a38] hover:text-[#dde2f5] transition-colors flex items-center justify-center cursor-pointer"
          title={soundEnabled ? 'Mute sound effects' : 'Enable audio feedback'}
          type="button"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-[#4edea3]" /> : <VolumeX className="w-4 h-4 text-[#86948a]" />}
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg bg-[#1a1f2d] border border-[#3c4a42]/40 text-[#bbcabf] hover:bg-[#242a38] hover:text-[#dde2f5] transition-colors flex items-center justify-center cursor-pointer"
          title="Fullscreen Mode"
          type="button"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Notifications Icon with active dot */}
        <button
          className="relative p-1.5 rounded-lg bg-[#1a1f2d] border border-[#3c4a42]/40 text-[#bbcabf] hover:bg-[#242a38] hover:text-[#dde2f5] transition-colors flex items-center justify-center cursor-pointer"
          title="Notifications"
          type="button"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#4edea3] ring-2 ring-[#080e1b]"></span>
        </button>
      </div>
    </header>
  );
};
