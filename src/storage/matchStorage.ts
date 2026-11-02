/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Match, Innings } from '../types/cricket';
import { createFreshMatch } from '../engine/defaultData';

const ACTIVE_MATCH_KEY = 'ak_cricket_active_match';
const MATCHES_LIST_KEY = 'ak_cricket_all_matches';
const HISTORY_STACK_KEY = 'ak_cricket_history_stack';

// Clear legacy keys if they exist
try {
  localStorage.removeItem('creasehq_active_match');
  localStorage.removeItem('creasehq_all_matches');
  localStorage.removeItem('creasehq_history_stack');
} catch {
  // localStorage disabled or private mode
}

// Clean up corrupted or duplicate Fall of Wicket entries (e.g. same batter out twice)
export function sanitizeMatch(match: Match): Match {
  if (!match || !match.innings) return match;

  let hasModified = false;
  const sanitizedInnings = match.innings.map(inn => {
    if (!inn.fallOfWickets || inn.fallOfWickets.length <= 1) return inn;

    const seenBatters = new Set<string>();
    const uniqueFow: typeof inn.fallOfWickets = [];
    let hadDuplicates = false;

    for (const fow of inn.fallOfWickets) {
      const key = fow.batterId || fow.batterName;
      if (!seenBatters.has(key)) {
        seenBatters.add(key);
        uniqueFow.push(fow);
      } else {
        hadDuplicates = true;
      }
    }

    if (!hadDuplicates) return inn;

    hasModified = true;
    const reindexedFow = uniqueFow.map((f, idx) => ({
      ...f,
      wicketNumber: idx + 1,
    }));

    return {
      ...inn,
      wickets: reindexedFow.length,
      fallOfWickets: reindexedFow,
    };
  });

  return hasModified ? { ...match, innings: sanitizedInnings as [Innings, Innings] } : match;
}

export function loadActiveMatch(): { match: Match; history: Match[] } {
  try {
    const raw = localStorage.getItem(ACTIVE_MATCH_KEY);
    const rawHistory = localStorage.getItem(HISTORY_STACK_KEY);

    if (raw) {
      let parsedMatch: Match = JSON.parse(raw);
      parsedMatch = sanitizeMatch(parsedMatch);
      let parsedHistory: Match[] = [];
      if (rawHistory) {
        try {
          parsedHistory = JSON.parse(rawHistory).map((m: Match) => sanitizeMatch(m));
        } catch {
          parsedHistory = [parsedMatch];
        }
      }
      if (!parsedHistory || parsedHistory.length === 0) {
        parsedHistory = [parsedMatch];
      }
      return { match: parsedMatch, history: parsedHistory };
    }
  } catch (err) {
    console.warn('Failed to load active match from localStorage, fallback to fresh match:', err);
  }

  // Brand-new fresh match starting from 0.0 overs
  const fresh = createFreshMatch();
  try {
    localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(fresh));
    localStorage.setItem(HISTORY_STACK_KEY, JSON.stringify([fresh]));
    if (!localStorage.getItem(MATCHES_LIST_KEY)) {
      localStorage.setItem(MATCHES_LIST_KEY, JSON.stringify([]));
    }
  } catch {}
  return { match: fresh, history: [fresh] };
}

export function saveActiveMatch(match: Match, history?: Match[]): void {
  try {
    localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(match));
    if (history && history.length > 0) {
      // Keep at most 20 recent snapshots in history stack
      const trimmedHistory = history.slice(-20);
      localStorage.setItem(HISTORY_STACK_KEY, JSON.stringify(trimmedHistory));
    }

    // Only update match in MATCHES_LIST_KEY if balls have been bowled, match completed, or already in list
    const all = loadAllMatches();
    const idx = all.findIndex(m => m.id === match.id);
    const hasActivity = match.innings.some(inn => (inn.legalBalls > 0 || (inn.deliveries && inn.deliveries.length > 0) || inn.runs > 0));

    if (idx >= 0) {
      all[idx] = match;
      localStorage.setItem(MATCHES_LIST_KEY, JSON.stringify(all));
    } else if (hasActivity || match.status === 'completed') {
      all.unshift(match);
      localStorage.setItem(MATCHES_LIST_KEY, JSON.stringify(all));
    }
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }
}

export function loadAllMatches(): Match[] {
  try {
    const raw = localStorage.getItem(MATCHES_LIST_KEY);
    if (raw) {
      const stored: Match[] = JSON.parse(raw);
      return Array.isArray(stored) ? stored.map(m => sanitizeMatch(m)) : [];
    }
  } catch (err) {
    console.warn('Failed to load all matches:', err);
  }

  return [];
}

export function getMatchById(matchId: string): Match | undefined {
  const all = loadAllMatches();
  return all.find(m => m.id === matchId);
}

export function deleteSavedMatch(matchId: string): void {
  try {
    const all = loadAllMatches().filter(m => m.id !== matchId);
    localStorage.setItem(MATCHES_LIST_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('Failed to delete match:', err);
  }
}

export function clearAllMatchesData(): { match: Match; history: Match[] } {
  try {
    localStorage.removeItem(ACTIVE_MATCH_KEY);
    localStorage.removeItem(MATCHES_LIST_KEY);
    localStorage.removeItem(HISTORY_STACK_KEY);
  } catch {
    // Ignore storage issues
  }
  const fresh = createFreshMatch();
  try {
    localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(fresh));
    localStorage.setItem(HISTORY_STACK_KEY, JSON.stringify([fresh]));
    localStorage.setItem(MATCHES_LIST_KEY, JSON.stringify([]));
  } catch {}
  return { match: fresh, history: [fresh] };
}

export function resetMatchToDefault(): { match: Match; history: Match[] } {
  return clearAllMatchesData();
}

export function resetActiveMatchToFresh(currentMatch?: Match): { match: Match; history: Match[] } {
  const team1 = currentMatch?.team1;
  const team2 = currentMatch?.team2;
  const fresh = createFreshMatch(team1, team2);
  if (currentMatch) {
    fresh.id = currentMatch.id; // Retain current match id so it resets this match cleanly
    fresh.venue = currentMatch.venue;
    fresh.seriesName = currentMatch.seriesName;
    fresh.format = currentMatch.format;
    fresh.totalOvers = currentMatch.totalOvers;
    fresh.subtitle = currentMatch.subtitle;
    fresh.tossWinnerId = currentMatch.tossWinnerId;
    fresh.tossDecision = currentMatch.tossDecision;
  }
  try {
    localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(fresh));
    localStorage.setItem(HISTORY_STACK_KEY, JSON.stringify([fresh]));
    // Also update this reset match in the all matches list if it existed there
    const all = loadAllMatches();
    const idx = all.findIndex(m => m.id === fresh.id);
    if (idx >= 0) {
      all[idx] = fresh;
      localStorage.setItem(MATCHES_LIST_KEY, JSON.stringify(all));
    }
  } catch (err) {
    console.warn('Reset storage update failed:', err);
  }
  return { match: fresh, history: [fresh] };
}

export function exportMatchJSON(match: Match): void {
  const jsonStr = JSON.stringify(match, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AK_${match.title.replace(/\s+/g, '_')}_${match.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMatchCSV(match: Match): void {
  const innings = match.innings[match.currentInningsIndex];
  if (!innings) return;

  const headers = ['DeliveryIndex', 'Over', 'Striker', 'NonStriker', 'Bowler', 'DeliveryType', 'BatterRuns', 'ExtraRuns', 'TotalRuns', 'IsLegal', 'IsWicket', 'Commentary'];
  const rows = innings.deliveries.map(d => [
    d.deliveryIndex,
    d.displayOver,
    `"${d.strikerName}"`,
    `"${d.nonStrikerName}"`,
    `"${d.bowlerName}"`,
    d.deliveryType,
    d.batterRuns,
    d.extraRuns,
    d.totalRuns,
    d.isLegalBall ? 'Yes' : 'No',
    d.dismissal ? `"${d.dismissal.text}"` : 'No',
    `"${d.commentary.replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AK_${match.title.replace(/\s+/g, '_')}_Innings${innings.inningsNumber}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
