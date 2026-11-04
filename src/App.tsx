/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Match, DeliveryInput } from './types/cricket';
import {
  recordDelivery,
  swapStrikeManual,
  changeBowler,
  setNextBowler,
  startSecondInnings,
  undoLastDelivery,
} from './engine/cricketEngine';
import {
  loadActiveMatch,
  saveActiveMatch,
  resetMatchToDefault,
  resetActiveMatchToFresh,
  getMatchById,
  sanitizeMatch,
} from './storage/matchStorage';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { Dashboard } from './components/Dashboard';
import { LiveScoring } from './components/LiveScoring';
import { Scorecards } from './components/Scorecards';
import { Analytics } from './components/Analytics';
import { MatchHistory } from './components/MatchHistory';
import { NewMatch } from './components/NewMatch';
import { Settings } from './components/Settings';
import { RulesGuideModal } from './components/modals/RulesGuideModal';
import { InningsCompleteModal } from './components/modals/InningsCompleteModal';

// Web Audio API tactile audio synthesizer
function playCricketSound(type: 'run' | 'boundary' | 'wicket' | 'undo') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'boundary') {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'wicket') {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch {
    // AudioContext not allowed before user interaction
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [matchData, setMatchData] = useState<{ match: Match; history: Match[] }>(() => loadActiveMatch());
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [isInningsModalOpen, setIsInningsModalOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const activeMatch = matchData.match;
  const history = matchData.history;

  // Persist after changes
  useEffect(() => {
    saveActiveMatch(matchData.match, matchData.history);
  }, [matchData]);

  // Auto-sanitize loaded match data to purge any duplicate Fall of Wicket records (e.g. batter out twice)
  useEffect(() => {
    const hasCorruptedFOW = activeMatch.innings.some(inn => {
      if (!inn.fallOfWickets || inn.fallOfWickets.length <= 1) return false;
      const seen = new Set<string>();
      return inn.fallOfWickets.some(f => {
        const k = f.batterId || f.batterName;
        if (seen.has(k)) return true;
        seen.add(k);
        return false;
      });
    });

    if (hasCorruptedFOW) {
      setMatchData(prev => ({
        match: sanitizeMatch(prev.match),
        history: prev.history.map(m => sanitizeMatch(m)),
      }));
    }
  }, [activeMatch]);

  const handleUpdateMatch = useCallback((updated: Match) => {
    setMatchData(prev => ({
      match: updated,
      history: [...prev.history, updated],
    }));
  }, []);

  // Check if innings break or completed
  useEffect(() => {
    if (activeMatch.status === 'innings_break' || activeMatch.status === 'completed') {
      setIsInningsModalOpen(true);
    }
  }, [activeMatch.status]);

  // Record a delivery
  const handleRecordDelivery = useCallback((input: DeliveryInput) => {
    setMatchData(prev => {
      const updatedMatch = recordDelivery(prev.match, input);
      const newHistory = [...prev.history, updatedMatch];

      if (soundEnabled) {
        if (input.dismissal) playCricketSound('wicket');
        else if (input.isFour || input.isSix || input.batterRuns >= 4) playCricketSound('boundary');
        else playCricketSound('run');
      }

      return { match: updatedMatch, history: newHistory };
    });
  }, [soundEnabled]);

  // Undo last delivery
  const handleUndo = useCallback(() => {
    if (history.length <= 1) return;
    const { restoredMatch, newHistory } = undoLastDelivery(history);
    if (restoredMatch) {
      setMatchData({ match: restoredMatch, history: newHistory });
      if (soundEnabled) playCricketSound('undo');
    }
  }, [history, soundEnabled]);

  // Keyboard shortcut Ctrl+Z or Cmd+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Manual strike swap
  const handleSwapStrike = useCallback(() => {
    setMatchData(prev => {
      const swapped = swapStrikeManual(prev.match);
      return { match: swapped, history: [...prev.history, swapped] };
    });
  }, []);

  // Change active bowler
  const handleChangeBowler = useCallback((bowlerId: string) => {
    setMatchData(prev => {
      const changed = changeBowler(prev.match, bowlerId);
      return { match: changed, history: [...prev.history, changed] };
    });
  }, []);

  // Set upcoming next bowler
  const handleSetNextBowler = useCallback((bowlerId: string) => {
    setMatchData(prev => {
      const nextMatch = setNextBowler(prev.match, bowlerId);
      return { match: nextMatch, history: prev.history };
    });
  }, []);

  // Start 2nd innings
  const handleStartSecondInnings = useCallback((strikerId: string, nonStrikerId: string, openingBowlerId: string) => {
    setMatchData(prev => {
      const secondInn = startSecondInnings(prev.match, strikerId, nonStrikerId, openingBowlerId);
      return { match: secondInn, history: [...prev.history, secondInn] };
    });
    setActiveTab('live-scoring');
  }, []);

  // Reset all match data and history to fresh clean slate
  const handleResetToDefault = useCallback(() => {
    const restored = resetMatchToDefault();
    setMatchData(restored);
  }, []);

  // Reset current active match back to 0.0 overs (0/0)
  const handleResetActiveMatch = useCallback(() => {
    const restored = resetActiveMatchToFresh(activeMatch);
    setMatchData(restored);
  }, [activeMatch]);

  // New match launched
  const handleStartNewMatch = useCallback((newMatch: Match) => {
    setMatchData({ match: newMatch, history: [newMatch] });
    setActiveTab('live-scoring');
  }, []);

  // Load match by ID and navigate to specified tab
  const handleLoadMatch = useCallback((matchId: string, targetTab?: string) => {
    const found = getMatchById(matchId);
    if (found) {
      setMatchData({ match: found, history: [found] });
      saveActiveMatch(found, [found]);
      setActiveTab(targetTab || (found.status === 'live' ? 'live-scoring' : 'scorecards'));
    }
  }, []);

  // Reopen an existing match
  const handleSelectMatch = useCallback((selectedMatch: Match) => {
    setMatchData({ match: selectedMatch, history: [selectedMatch] });
    saveActiveMatch(selectedMatch, [selectedMatch]);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1320] text-[#dde2f5] font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        activeMatch={activeMatch}
      />

      {/* Main View Area Offset by Sidebar (72 = 18rem = 288px) */}
      <div className="pl-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <TopHeader
          match={activeMatch}
          onUndo={handleUndo}
          canUndo={history.length > 1}
          onOpenRules={() => setIsRulesModalOpen(true)}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
        />

        {/* Tab Content Routed Views (offset by 4rem / 64px header) */}
        <main className="w-full pt-16 bg-[#0d1320] flex-1">
          {activeTab === 'dashboard' && (
            <Dashboard
              activeMatch={activeMatch}
              onNavigate={setActiveTab}
              onLoadMatch={handleLoadMatch}
            />
          )}

          {activeTab === 'live-scoring' && (
            <LiveScoring
              match={activeMatch}
              onRecordDelivery={handleRecordDelivery}
              onSwapStrike={handleSwapStrike}
              onChangeBowler={handleChangeBowler}
              onSetNextBowler={handleSetNextBowler}
              onUndo={handleUndo}
              canUndo={history.length > 1}
              onUpdateMatch={handleUpdateMatch}
            />
          )}

          {activeTab === 'scorecards' && (
            <Scorecards match={activeMatch} onUpdateMatch={handleUpdateMatch} />
          )}

          {activeTab === 'analytics' && <Analytics match={activeMatch} />}

          {activeTab === 'history' && (
            <MatchHistory
              currentMatch={activeMatch}
              onSelectMatch={handleSelectMatch}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'new-match' && (
            <NewMatch
              onStartMatch={handleStartNewMatch}
              onCancel={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'settings' && (
            <Settings
              onResetToDefault={handleResetToDefault}
              onResetActiveMatch={handleResetActiveMatch}
              onNavigate={setActiveTab}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <RulesGuideModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      <InningsCompleteModal
        isOpen={isInningsModalOpen}
        onClose={() => setIsInningsModalOpen(false)}
        match={activeMatch}
        onStartSecondInnings={handleStartSecondInnings}
      />
    </div>
  );
}
