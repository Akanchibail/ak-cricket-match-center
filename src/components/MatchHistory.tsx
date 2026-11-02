/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Download, Trash2, ExternalLink, LineChart, Upload, Plus } from 'lucide-react';
import { Match } from '../types/cricket';
import { loadAllMatches, deleteSavedMatch, exportMatchJSON, exportMatchCSV } from '../storage/matchStorage';

interface MatchHistoryProps {
  currentMatch: Match;
  onSelectMatch: (match: Match) => void;
  onNavigate: (tab: string) => void;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({
  currentMatch,
  onSelectMatch,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'live' | 'completed'>('all');
  const [allMatches, setAllMatches] = useState<Match[]>(() => loadAllMatches());

  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRefresh = () => {
    setAllMatches(loadAllMatches());
  };

  const handleDelete = (matchId: string) => {
    deleteSavedMatch(matchId);
    handleRefresh();
    setFeedback('Match record deleted.');
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed: Match = JSON.parse(event.target?.result as string);
        if (parsed.id && parsed.innings) {
          onSelectMatch(parsed);
          handleRefresh();
          setFeedback(`Imported match: ${parsed.title}`);
        } else {
          setFeedback('Invalid match file structure.');
        }
      } catch (err) {
        setFeedback('Failed to parse match JSON.');
      }
      setTimeout(() => setFeedback(null), 3000);
    };
    reader.readAsText(file);
  };

  const filtered = allMatches.filter(m => {
    const query = search.toLowerCase();
    const matchesSearch =
      m.title.toLowerCase().includes(query) ||
      m.venue.toLowerCase().includes(query) ||
      m.team1.name.toLowerCase().includes(query) ||
      m.team2.name.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (filter === 'live') return m.status === 'live' || m.status === 'innings_break';
    if (filter === 'completed') return m.status === 'completed';
    return true;
  });

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-[#0d1320] text-[#dde2f5] p-6 max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3c4a42]/30 pb-4">
        <div>
          <h1 className="font-headline-lg text-2xl font-bold text-[#dde2f5] flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[28px] text-[#4edea3]">
              history
            </span>
            Match History & Archives
          </h1>
          <p className="font-body-sm text-xs text-[#bbcabf] mt-1">
            Reopen active matches, inspect archived scorecards, and export official match telemetries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a1f2d] hover:bg-[#242a38] text-[#dde2f5] font-stat-mono-sm text-xs cursor-pointer border border-[#3c4a42]/40">
            <Upload className="w-3.5 h-3.5 text-[#4edea3]" />
            <span>Import Match JSON</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={() => onNavigate('new-match')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#00422b] font-headline-sm text-xs font-bold cursor-pointer"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>New Match</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b29] p-4 rounded-xl border border-[#3c4a42]/30">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#86948a] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by team, venue, tournament..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#080e1b] border border-[#3c4a42] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#dde2f5] focus:outline-none focus:border-[#4edea3]"
          />
        </div>

        <div className="inline-flex p-1 rounded-lg bg-[#080e1b] border border-[#3c4a42]/30">
          {(['all', 'live', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg font-label-caps text-xs uppercase cursor-pointer ${
                filter === f ? 'bg-[#10b981] text-[#00422b] font-bold' : 'text-[#bbcabf]'
              }`}
              type="button"
            >
              {f === 'live' ? 'In Progress' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className="bg-[#10b981] text-[#00422b] font-stat-mono-sm text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg">
          {feedback}
        </div>
      )}

      {/* Matches List Cards or Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-[#161b29] rounded-xl p-8 text-center border border-[#3c4a42]/30 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#10b981]/20 text-[#4edea3] mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">sports_cricket</span>
          </div>
          <h3 className="font-headline-sm text-base font-bold text-[#dde2f5]">
            No Match Records Found
          </h3>
          <p className="font-body-sm text-xs text-[#bbcabf] max-w-md mx-auto">
            All previous matches have been cleared. You can start scoring your own match from the beginning!
          </p>
          <button
            onClick={() => onNavigate('new-match')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#00422b] font-headline-sm text-xs font-bold cursor-pointer transition-all shadow-md active:scale-95"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>Setup & Start New Match</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(match => {
          const isCurrentActive = match.id === currentMatch.id;
          const inn1 = match.innings[0];
          const inn2 = match.innings[1];

          return (
            <div
              key={match.id}
              className={`bg-[#161b29] rounded-xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                isCurrentActive ? 'border-[#4edea3] ring-1 ring-[#4edea3]/40' : 'border-[#3c4a42]/30 hover:bg-[#1a1f2d]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {match.status === 'live' && (
                      <span className="w-2 h-2 rounded-full bg-[#ffb95f] animate-pulse"></span>
                    )}
                    <span className="font-headline-sm text-base font-bold text-[#dde2f5]">
                      {match.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#242a38] text-[#4edea3] font-stat-mono-sm text-[10px] uppercase font-bold">
                      {match.format}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase font-bold ${
                      match.status === 'live'
                        ? 'bg-[#ee9800]/20 text-[#ffb95f]'
                        : 'bg-[#10b981]/20 text-[#4edea3]'
                    }`}
                  >
                    {match.status === 'live' ? 'In Progress' : 'Completed'}
                  </span>
                </div>

                <div className="font-body-sm text-xs text-[#bbcabf]">
                  {match.venue} • {match.seriesName}
                </div>

                {/* Score telemetry box */}
                <div className="bg-[#080e1b] p-3 rounded-lg border border-[#3c4a42]/20 space-y-1">
                  <div className="flex items-center justify-between font-stat-mono-sm text-xs">
                    <span className="text-[#bbcabf]">{inn1.battingTeamName}:</span>
                    <span className="text-[#dde2f5] font-bold">
                      {inn1.runs}/{inn1.wickets} ({inn1.oversFormatted} ov)
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-stat-mono-sm text-xs">
                    <span className="text-[#bbcabf]">{inn2.battingTeamName}:</span>
                    <span className="text-[#4edea3] font-bold">
                      {inn2.runs}/{inn2.wickets} ({inn2.oversFormatted} ov)
                    </span>
                  </div>
                </div>

                {match.result && (
                  <p className="font-body-sm text-xs text-[#ffb95f] font-semibold">
                    Result: {match.result.summary}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#3c4a42]/20 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectMatch(match);
                      onNavigate('live-scoring');
                    }}
                    className="px-3 py-1.5 rounded bg-[#10b981] text-[#00422b] font-label-caps uppercase font-bold hover:bg-[#059669] cursor-pointer"
                    type="button"
                  >
                    {match.status === 'live' ? 'Continue Live' : 'Open'}
                  </button>
                  <button
                    onClick={() => {
                      onSelectMatch(match);
                      onNavigate('scorecards');
                    }}
                    className="px-3 py-1.5 rounded bg-[#242a38] text-[#dde2f5] hover:bg-[#333948] cursor-pointer"
                    type="button"
                  >
                    Scorecard
                  </button>
                  <button
                    onClick={() => {
                      onSelectMatch(match);
                      onNavigate('analytics');
                    }}
                    className="p-1.5 rounded bg-[#242a38] text-[#dde2f5] hover:text-[#4edea3] cursor-pointer"
                    title="Analytics"
                    type="button"
                  >
                    <LineChart className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => exportMatchJSON(match)}
                    className="p-1.5 text-[#bbcabf] hover:text-[#dde2f5] cursor-pointer"
                    title="Export JSON"
                    type="button"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(match.id)}
                    className="p-1.5 text-[#86948a] hover:text-[#ffb4ab] cursor-pointer"
                    title="Delete Match"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
