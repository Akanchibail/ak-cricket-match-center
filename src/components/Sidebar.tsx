/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  TableProperties,
  LineChart,
  History,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { AKLogo } from './AKLogo';
import { Match } from '../types/cricket';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeMatch: Match;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeMatch,
}) => {
  const isMatchLive = activeMatch.status === 'live' || activeMatch.status === 'innings_break';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-match', label: 'New Match', icon: PlusCircle },
    {
      id: 'live-scoring',
      label: 'Live Scoring',
      icon: null, // cricket bat icon via material-symbols
      isLive: isMatchLive,
    },
    { id: 'scorecards', label: 'Scorecards', icon: TableProperties },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'history', label: 'Match History', icon: History },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-[#080e1b] z-50 flex flex-col justify-between border-r border-[#3c4a42]/30 shadow-[0_1px_8px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#3c4a42]/20 bg-[#080e1b]">
          <AKLogo size={36} className="shrink-0 drop-shadow-md" />
          <div className="flex flex-col">
            <span className="font-headline-sm text-xl font-extrabold text-[#4edea3] leading-none tracking-tight">
              AK
            </span>
            <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase tracking-wider mt-1 font-semibold truncate">
              Match Center & Analytics
            </span>
          </div>
        </div>

        {/* Section Title */}
        <div className="px-4 py-2 mt-1">
          <span className="px-2 font-label-caps text-[11px] uppercase text-[#86948a] tracking-widest font-semibold">
            Scoring Command
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col px-2 gap-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-left transition-colors font-medium text-sm w-full ${
                  isActive
                    ? 'bg-[#242a38] text-[#4edea3] border-l-2 border-[#4edea3]'
                    : 'text-[#bbcabf] hover:bg-[#1a1f2d] hover:text-[#dde2f5]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.id === 'live-scoring' ? (
                    <span className="material-symbols-outlined text-[20px] text-[#4edea3]">
                      sports_cricket
                    </span>
                  ) : item.icon ? (
                    <item.icon className="w-5 h-5 text-current shrink-0" />
                  ) : null}
                  <span>{item.label}</span>
                </div>

                {item.isLive && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#4edea3] border border-[#4edea3]/30 font-stat-mono-sm text-[11px] uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                    LIVE
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Sync Status footer */}
      <div className="p-4 border-t border-[#3c4a42]/30 bg-[#161b29]/60">
        <div className="p-2.5 rounded-lg bg-[#1a1f2d] border border-[#3c4a42]/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#10b981] to-[#047857] border border-[#4edea3]/40 flex items-center justify-center font-extrabold text-xs text-[#080e1b] shadow-sm">
              AK
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-xs font-bold text-[#dde2f5] leading-tight">
                Akshay Kanchibail
              </span>
              <span className="font-label-caps text-[10px] text-[#4edea3] font-medium">
                Lead Official Scorer
              </span>
            </div>
          </div>
          <ShieldCheck className="w-4 h-4 text-[#4edea3]" />
        </div>

        <div className="mt-2 flex items-center justify-between px-1">
          <span className="font-label-caps text-[10px] text-[#86948a] uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
            Sync: Local & Active
          </span>
          <span className="font-stat-mono-sm text-xs text-[#4edea3] font-semibold">
            14ms
          </span>
        </div>
      </div>
    </aside>
  );
};
