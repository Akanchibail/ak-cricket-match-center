/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertCircle,
  Users,
  Shield,
  Check,
} from 'lucide-react';
import { Match, MatchFormat, Team, Player, Innings } from '../types/cricket';
import { allPresetTeams, indiaTeam, australiaTeam } from '../engine/defaultData';

interface NewMatchProps {
  onStartMatch: (newMatch: Match) => void;
  onCancel: () => void;
}

// Ensures first 11 are Playing XI and remaining are Substitutes
const normalizeSquad = (players: Player[]): Player[] => {
  return players.map((p, idx) => ({
    ...p,
    isSubstitute: p.isSubstitute !== undefined ? p.isSubstitute : idx >= 11,
  }));
};

export const NewMatch: React.FC<NewMatchProps> = ({ onStartMatch, onCancel }) => {
  const [format, setFormat] = useState<MatchFormat>('T20');
  const [seriesName, setSeriesName] = useState("Men's International T20 Series");
  const [venue, setVenue] = useState("Melbourne Cricket Ground");
  const [totalOvers, setTotalOvers] = useState<number>(20);
  const [ballsPerOver, setBallsPerOver] = useState<number>(6);

  // Selected preset team templates
  const [selectedPreset1, setSelectedPreset1] = useState<string>('team-ind');
  const [selectedPreset2, setSelectedPreset2] = useState<string>('team-aus');

  // Team 1 configuration (default: India with 15 players)
  const [team1Name, setTeam1Name] = useState(indiaTeam.name);
  const [team1Short, setTeam1Short] = useState(indiaTeam.shortName);
  const [team1Color, setTeam1Color] = useState(indiaTeam.color || '#0284c7');
  const [team1Players, setTeam1Players] = useState<Player[]>(() => normalizeSquad(indiaTeam.players));

  // Team 2 configuration (default: Australia with 15 players)
  const [team2Name, setTeam2Name] = useState(australiaTeam.name);
  const [team2Short, setTeam2Short] = useState(australiaTeam.shortName);
  const [team2Color, setTeam2Color] = useState(australiaTeam.color || '#eab308');
  const [team2Players, setTeam2Players] = useState<Player[]>(() => normalizeSquad(australiaTeam.players));

  // Toss
  const [tossWinner, setTossWinner] = useState<'team1' | 'team2'>('team1');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  // Quick player addition
  const [newPlayerTeam, setNewPlayerTeam] = useState<'team1' | 'team2'>('team1');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<'batter' | 'bowler' | 'allrounder' | 'wicketkeeper'>('batter');
  const [newPlayerIsSub, setNewPlayerIsSub] = useState(false);

  // Error validation feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Change preset for Team 1
  const handleSelectPreset1 = (teamId: string) => {
    setSelectedPreset1(teamId);
    setErrorMessage(null);
    if (teamId === 'custom') {
      setTeam1Name('Custom Team A');
      setTeam1Short('CTA');
      return;
    }
    const found = allPresetTeams.find(t => t.id === teamId);
    if (found) {
      setTeam1Name(found.name);
      setTeam1Short(found.shortName);
      setTeam1Color(found.color || '#0284c7');
      setTeam1Players(normalizeSquad(JSON.parse(JSON.stringify(found.players))));
    }
  };

  // Change preset for Team 2
  const handleSelectPreset2 = (teamId: string) => {
    setSelectedPreset2(teamId);
    setErrorMessage(null);
    if (teamId === 'custom') {
      setTeam2Name('Custom Team B');
      setTeam2Short('CTB');
      return;
    }
    const found = allPresetTeams.find(t => t.id === teamId);
    if (found) {
      setTeam2Name(found.name);
      setTeam2Short(found.shortName);
      setTeam2Color(found.color || '#eab308');
      setTeam2Players(normalizeSquad(JSON.parse(JSON.stringify(found.players))));
    }
  };

  // Move player from Playing XI to Bench Substitutes
  const moveXIToSub = (team: 'team1' | 'team2', playerId: string) => {
    setErrorMessage(null);
    const setter = team === 'team1' ? setTeam1Players : setTeam2Players;
    setter(prev =>
      prev.map(p => (p.id === playerId ? { ...p, isSubstitute: true } : p))
    );
  };

  // Move player from Bench Substitutes to Playing XI (swaps with 11th player if XI already has 11)
  const moveSubToXI = (team: 'team1' | 'team2', playerId: string) => {
    setErrorMessage(null);
    const players = team === 'team1' ? team1Players : team2Players;
    const setter = team === 'team1' ? setTeam1Players : setTeam2Players;

    const currentXI = players.filter(p => !p.isSubstitute);
    if (currentXI.length >= 11) {
      // XI already has 11: swap this substitute with the 11th player to preserve 11 players
      const lastXI = currentXI[currentXI.length - 1];
      setter(prev =>
        prev.map(p => {
          if (p.id === playerId) return { ...p, isSubstitute: false };
          if (p.id === lastXI.id) return { ...p, isSubstitute: true };
          return p;
        })
      );
    } else {
      // XI has fewer than 11: promote directly to fill vacancy in Playing XI
      setter(prev =>
        prev.map(p => (p.id === playerId ? { ...p, isSubstitute: false } : p))
      );
    }
  };

  // Toggle player between Playing XI and Substitute
  const togglePlayerSub = (team: 'team1' | 'team2', playerId: string) => {
    const players = team === 'team1' ? team1Players : team2Players;
    const target = players.find(p => p.id === playerId);
    if (!target) return;
    if (target.isSubstitute) {
      moveSubToXI(team, playerId);
    } else {
      moveXIToSub(team, playerId);
    }
  };

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newPlayerName.trim(),
      shortName: newPlayerName.trim().charAt(0) + '. ' + newPlayerName.trim().split(' ').slice(1).join(' '),
      role: newPlayerRole,
      isSubstitute: newPlayerIsSub,
    };
    if (newPlayerTeam === 'team1') {
      setTeam1Players([...team1Players, newPlayer]);
    } else {
      setTeam2Players([...team2Players, newPlayer]);
    }
    setNewPlayerName('');
    setErrorMessage(null);
  };

  const handleRemovePlayer = (team: 'team1' | 'team2', playerId: string) => {
    setErrorMessage(null);
    if (team === 'team1') {
      setTeam1Players(team1Players.filter(p => p.id !== playerId));
    } else {
      setTeam2Players(team2Players.filter(p => p.id !== playerId));
    }
  };

  const handleCreate = () => {
    // Separate playing XI and substitutes
    const t1Playing = team1Players.filter(p => !p.isSubstitute);
    const t1Subs = team1Players.filter(p => p.isSubstitute);

    const t2Playing = team2Players.filter(p => !p.isSubstitute);
    const t2Subs = team2Players.filter(p => p.isSubstitute);

    // Enforce exactly 11 players in Playing XI per team
    if (t1Playing.length !== 11) {
      setErrorMessage(
        `${team1Name} has ${t1Playing.length} players in the Playing XI. A cricket match requires exactly 11 players. Please ${
          t1Playing.length < 11
            ? `promote ${11 - t1Playing.length} substitute(s) to the Playing XI`
            : `move ${t1Playing.length - 11} player(s) to the bench`
        }.`
      );
      return;
    }

    if (t2Playing.length !== 11) {
      setErrorMessage(
        `${team2Name} has ${t2Playing.length} players in the Playing XI. A cricket match requires exactly 11 players. Please ${
          t2Playing.length < 11
            ? `promote ${11 - t2Playing.length} substitute(s) to the Playing XI`
            : `move ${t2Playing.length - 11} player(s) to the bench`
        }.`
      );
      return;
    }

    const t1: Team = {
      id: `team-1-${Date.now()}`,
      name: team1Name,
      shortName: team1Short,
      color: team1Color,
      players: t1Playing,
      substitutes: t1Subs,
    };

    const t2: Team = {
      id: `team-2-${Date.now()}`,
      name: team2Name,
      shortName: team2Short,
      color: team2Color,
      players: t2Playing,
      substitutes: t2Subs,
    };


    // Determine who bats first
    const tossWinnerTeam = tossWinner === 'team1' ? t1 : t2;
    const tossLoserTeam = tossWinner === 'team1' ? t2 : t1;
    const battingFirst = tossDecision === 'bat' ? tossWinnerTeam : tossLoserTeam;
    const bowlingFirst = tossDecision === 'bat' ? tossLoserTeam : tossWinnerTeam;

    const innings1: Innings = {
      inningsNumber: 1,
      battingTeamId: battingFirst.id,
      battingTeamName: battingFirst.name,
      bowlingTeamId: bowlingFirst.id,
      bowlingTeamName: bowlingFirst.name,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      oversFormatted: '0.0',
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penaltyRuns: 0, total: 0 },
      strikerId: battingFirst.players[0]?.id || '',
      nonStrikerId: battingFirst.players[1]?.id || '',
      currentBowlerId: bowlingFirst.players[bowlingFirst.players.length - 1]?.id || bowlingFirst.players[0]?.id || '',
      battingCard: battingFirst.players.map((p, idx) => ({
        playerId: p.id,
        playerName: p.name,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        dots: 0,
        strikeRate: 0,
        isOut: false,
        isBatting: idx < 2,
      })),
      bowlingCard: bowlingFirst.players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        legalBalls: 0,
        overs: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        wides: 0,
        noBalls: 0,
        dots: 0,
      })),
      deliveries: [],
      overs: [],
      fallOfWickets: [],
      partnerships: [
        {
          wicketNumber: 1,
          batter1Id: battingFirst.players[0]?.id || '',
          batter1Name: battingFirst.players[0]?.name || '',
          batter1Runs: 0,
          batter1Balls: 0,
          batter2Id: battingFirst.players[1]?.id || '',
          batter2Name: battingFirst.players[1]?.name || '',
          batter2Runs: 0,
          batter2Balls: 0,
          totalRuns: 0,
          totalBalls: 0,
          isCurrent: true,
        },
      ],
      wagonShots: [],
      isCompleted: false,
    };

    const innings2: Innings = {
      inningsNumber: 2,
      battingTeamId: bowlingFirst.id,
      battingTeamName: bowlingFirst.name,
      bowlingTeamId: battingFirst.id,
      bowlingTeamName: battingFirst.name,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      oversFormatted: '0.0',
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penaltyRuns: 0, total: 0 },
      strikerId: bowlingFirst.players[0]?.id || '',
      nonStrikerId: bowlingFirst.players[1]?.id || '',
      currentBowlerId: battingFirst.players[battingFirst.players.length - 1]?.id || battingFirst.players[0]?.id || '',
      battingCard: bowlingFirst.players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        dots: 0,
        strikeRate: 0,
        isOut: false,
        isBatting: false,
      })),
      bowlingCard: battingFirst.players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        legalBalls: 0,
        overs: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        wides: 0,
        noBalls: 0,
        dots: 0,
      })),
      deliveries: [],
      overs: [],
      fallOfWickets: [],
      partnerships: [],
      wagonShots: [],
      isCompleted: false,
    };

    const newMatch: Match = {
      id: `match-${Date.now()}`,
      title: `${t1.shortName} vs ${t2.shortName}`,
      subtitle: `${format} Match • ${venue}`,
      seriesName,
      venue,
      format,
      totalOvers,
      ballsPerOver,
      team1: t1,
      team2: t2,
      tossWinnerId: tossWinnerTeam.id,
      tossDecision,
      currentInningsIndex: 0,
      innings: [innings1, innings2],
      target: null,
      dlsPar: Math.round(totalOvers * 7.5),
      powerplayDetails: `POWERPLAY (1-${Math.max(1, Math.round(totalOvers * 0.3))})`,
      status: 'live',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onStartMatch(newMatch);
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-[#0d1320] text-[#dde2f5] p-6 max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3c4a42]/30 pb-4">
        <div>
          <h1 className="font-headline-lg text-2xl font-bold text-[#dde2f5] flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[28px] text-[#4edea3]">
              add_circle
            </span>
            New Match Setup & Squad Selector
          </h1>
          <p className="font-body-sm text-xs text-[#bbcabf] mt-1">
            Select from 11+ official international teams with complete 15-player squads (11 Playing XI + 4 Substitutes)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-[#1a1f2d] hover:bg-[#242a38] text-[#bbcabf] text-sm cursor-pointer"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#00422b] font-headline-sm text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
            type="button"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Live Match</span>
          </button>
        </div>
      </div>

      {/* Validation Error Message */}
      {errorMessage && (
        <div className="bg-[#93000a]/20 border border-[#ffb4ab]/40 rounded-xl p-3.5 flex items-center justify-between text-[#ffdad6] text-xs font-medium animate-in fade-in shadow-md">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#ffb4ab] shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[#ffb4ab] hover:text-[#ffffff] text-xs underline cursor-pointer ml-3 shrink-0"
            type="button"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Match Parameters & Toss */}
        <div className="bg-[#161b29] rounded-xl p-5 border border-[#3c4a42]/30 space-y-4 shadow-md">
          <h3 className="font-headline-sm text-base font-bold text-[#dde2f5] flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#4edea3]">tune</span>
            Match Parameters
          </h3>

          <div className="space-y-3 font-body-sm text-xs">
            <div>
              <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase block mb-1">
                Tournament / Series Name
              </label>
              <input
                type="text"
                value={seriesName}
                onChange={e => setSeriesName(e.target.value)}
                className="w-full bg-[#080e1b] border border-[#3c4a42] rounded px-3 py-2 text-[#dde2f5] focus:outline-none focus:border-[#4edea3]"
                placeholder="e.g. ICC T20 World Cup"
              />
            </div>

            <div>
              <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase block mb-1">
                Venue / Stadium
              </label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                className="w-full bg-[#080e1b] border border-[#3c4a42] rounded px-3 py-2 text-[#dde2f5] focus:outline-none focus:border-[#4edea3]"
                placeholder="e.g. Eden Gardens, Kolkata"
              />
            </div>

            {/* Match Format */}
            <div>
              <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase block mb-1">
                Match Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['T20', 'ODI', 'The Hundred', 'T10', 'Test', 'Custom'] as MatchFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => {
                      setFormat(fmt);
                      if (fmt === 'T20') setTotalOvers(20);
                      else if (fmt === 'ODI') setTotalOvers(50);
                      else if (fmt === 'T10') setTotalOvers(10);
                      else if (fmt === 'The Hundred') {
                        setTotalOvers(20);
                        setBallsPerOver(5);
                      } else if (fmt === 'Test') {
                        setTotalOvers(90);
                        setBallsPerOver(6);
                      }
                    }}
                    className={`py-2 rounded font-stat-mono-sm text-xs font-bold transition-all cursor-pointer ${
                      format === fmt
                        ? 'bg-[#10b981] text-[#00422b]'
                        : 'bg-[#1a1f2d] text-[#dde2f5] hover:bg-[#242a38]'
                    }`}
                    type="button"
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase block mb-1">
                  Overs Per Innings
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={totalOvers}
                  onChange={e => setTotalOvers(parseInt(e.target.value) || 20)}
                  className="w-full bg-[#080e1b] border border-[#3c4a42] rounded px-3 py-2 text-[#dde2f5] font-stat-mono-sm"
                />
              </div>

              <div>
                <label className="font-label-caps text-[10px] text-[#bbcabf] uppercase block mb-1">
                  Balls Per Over
                </label>
                <input
                  type="number"
                  min="4"
                  max="8"
                  value={ballsPerOver}
                  onChange={e => setBallsPerOver(parseInt(e.target.value) || 6)}
                  className="w-full bg-[#080e1b] border border-[#3c4a42] rounded px-3 py-2 text-[#dde2f5] font-stat-mono-sm"
                />
              </div>
            </div>

            {/* Toss */}
            <div className="pt-3 border-t border-[#3c4a42]/30 space-y-2">
              <span className="font-label-caps text-xs text-[#ffb95f] uppercase font-bold block">
                Toss Winner & Decision
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTossWinner('team1')}
                  className={`py-2 rounded text-xs font-stat-mono-sm font-bold cursor-pointer transition-all ${
                    tossWinner === 'team1'
                      ? 'bg-[#242a38] text-[#4edea3] border border-[#4edea3]'
                      : 'bg-[#1a1f2d] text-[#bbcabf]'
                  }`}
                  type="button"
                >
                  {team1Short} Won Toss
                </button>
                <button
                  onClick={() => setTossWinner('team2')}
                  className={`py-2 rounded text-xs font-stat-mono-sm font-bold cursor-pointer transition-all ${
                    tossWinner === 'team2'
                      ? 'bg-[#242a38] text-[#ffb95f] border border-[#ffb95f]'
                      : 'bg-[#1a1f2d] text-[#bbcabf]'
                  }`}
                  type="button"
                >
                  {team2Short} Won Toss
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => setTossDecision('bat')}
                  className={`py-2 rounded text-xs font-stat-mono-sm font-bold cursor-pointer transition-all ${
                    tossDecision === 'bat'
                      ? 'bg-[#10b981] text-[#00422b]'
                      : 'bg-[#1a1f2d] text-[#bbcabf]'
                  }`}
                  type="button"
                >
                  Elected to Bat First
                </button>
                <button
                  onClick={() => setTossDecision('bowl')}
                  className={`py-2 rounded text-xs font-stat-mono-sm font-bold cursor-pointer transition-all ${
                    tossDecision === 'bowl'
                      ? 'bg-[#10b981] text-[#00422b]'
                      : 'bg-[#1a1f2d] text-[#bbcabf]'
                  }`}
                  type="button"
                >
                  Elected to Bowl First
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Teams & 15-Player Squad Managers */}
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team 1 Squad Card */}
            {(() => {
              const t1XI = team1Players.filter(p => !p.isSubstitute);
              const t1Subs = team1Players.filter(p => p.isSubstitute);
              return (
                <div className="bg-[#161b29] rounded-xl p-4 border border-[#3c4a42]/30 flex flex-col justify-between shadow-sm space-y-3">
                  <div className="space-y-3">
                    {/* Team 1 Preset Selector */}
                    <div className="flex flex-col gap-1 pb-2 border-b border-[#3c4a42]/20">
                      <label className="font-label-caps text-[10px] text-[#4edea3] uppercase font-bold flex items-center justify-between">
                        <span>Select Team 1 Preset (10+ Teams)</span>
                        <span className="text-[#dde2f5] font-stat-mono-sm">{team1Players.length} in Squad</span>
                      </label>
                      <select
                        value={selectedPreset1}
                        onChange={e => handleSelectPreset1(e.target.value)}
                        className="w-full bg-[#080e1b] text-[#dde2f5] font-stat-mono-sm text-xs rounded-lg p-2 border border-[#3c4a42] focus:outline-none focus:border-[#4edea3]"
                      >
                        {allPresetTeams.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.shortName}) - 15 Players
                          </option>
                        ))}
                        <option value="custom">-- Custom Team --</option>
                      </select>
                    </div>

                    {/* Team 1 Custom Names */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={team1Name}
                        onChange={e => setTeam1Name(e.target.value)}
                        className="flex-1 bg-[#1a1f2d] px-2.5 py-1.5 rounded font-headline-sm text-sm font-bold text-[#dde2f5] border border-[#3c4a42]/30 focus:outline-none"
                        placeholder="Team 1 Name"
                      />
                      <input
                        type="text"
                        value={team1Short}
                        onChange={e => setTeam1Short(e.target.value.toUpperCase())}
                        className="w-16 bg-[#080e1b] px-2 py-1.5 rounded text-xs font-stat-mono-sm text-[#4edea3] font-bold text-center uppercase border border-[#3c4a42]"
                        placeholder="Short"
                      />
                    </div>

                    {/* SECTION 1: STARTING PLAYING XI */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-label-caps text-[11px] font-bold text-[#dde2f5] uppercase flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#4edea3]" />
                          Starting Playing XI ({t1XI.length})
                        </span>
                        {t1XI.length === 11 ? (
                          <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#4edea3] border border-[#4edea3]/30 font-label-caps text-[10px] font-bold uppercase flex items-center gap-1">
                            <Check className="w-3 h-3" /> 11/11 READY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#ee9800]/20 text-[#ffb95f] border border-[#ffb95f]/30 font-label-caps text-[10px] font-bold uppercase">
                            {t1XI.length}/11 ({t1XI.length < 11 ? `Need ${11 - t1XI.length} more` : `${t1XI.length - 11} too many`})
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                        {t1XI.length === 0 ? (
                          <div className="text-center py-3 text-xs text-[#86948a] border border-dashed border-[#3c4a42]/40 rounded-lg">
                            No players in Playing XI. Click ↑ on substitutes below to add.
                          </div>
                        ) : (
                          t1XI.map((p, idx) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#1a1f2d] hover:bg-[#242a38] border border-[#3c4a42]/30 text-xs transition-colors"
                            >
                              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 pr-2">
                                <span className="font-stat-mono-sm text-[11px] text-[#86948a] w-5 shrink-0">
                                  {idx + 1}.
                                </span>
                                <span className="font-semibold text-[#dde2f5] text-xs truncate">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-[#bbcabf] shrink-0 capitalize">
                                  ({p.role})
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => moveXIToSub('team1', p.id)}
                                  className="p-1.5 rounded text-[#ffb95f] hover:text-[#dde2f5] hover:bg-[#ee9800]/20 transition-colors cursor-pointer"
                                  title="Move to Bench Substitutes (↓)"
                                  type="button"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemovePlayer('team1', p.id)}
                                  className="p-1.5 text-[#86948a] hover:text-[#ffb4ab] rounded hover:bg-[#93000a]/20 cursor-pointer"
                                  title="Delete Player"
                                  type="button"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* SECTION 2: BENCH SUBSTITUTES */}
                    <div className="space-y-1.5 pt-2 border-t border-[#3c4a42]/20">
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-label-caps text-[11px] font-bold text-[#ffb95f] uppercase flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-[#ffb95f]" />
                          Bench Substitutes ({t1Subs.length})
                        </span>
                        <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase tracking-wider">
                          Reserves
                        </span>
                      </div>

                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {t1Subs.length === 0 ? (
                          <div className="text-center py-2.5 text-xs text-[#86948a] border border-dashed border-[#3c4a42]/40 rounded-lg">
                            No substitutes on bench. Click ↓ on XI players above to move to bench.
                          </div>
                        ) : (
                          t1Subs.map((p, idx) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#080e1b]/80 hover:bg-[#1a1f2d] border border-[#ffb95f]/20 text-xs transition-colors"
                            >
                              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 pr-2">
                                <span className="font-stat-mono-sm text-[11px] text-[#ffb95f] w-5 shrink-0">
                                  {idx + 1}.
                                </span>
                                <span className="font-semibold text-[#dde2f5] text-xs truncate">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-[#bbcabf] shrink-0 capitalize">
                                  ({p.role})
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => moveSubToXI('team1', p.id)}
                                  className="p-1.5 rounded text-[#4edea3] hover:text-[#dde2f5] hover:bg-[#10b981]/20 transition-colors cursor-pointer"
                                  title={
                                    t1XI.length >= 11
                                      ? "Swap into Starting Playing XI (↑)"
                                      : "Move to Starting Playing XI (↑)"
                                  }
                                  type="button"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemovePlayer('team1', p.id)}
                                  className="p-1.5 text-[#86948a] hover:text-[#ffb4ab] rounded hover:bg-[#93000a]/20 cursor-pointer"
                                  title="Delete Player"
                                  type="button"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-stat-mono-sm text-[#bbcabf] pt-2 border-t border-[#3c4a42]/20 flex justify-between">
                    <span className={t1XI.length === 11 ? 'text-[#4edea3] font-bold' : 'text-[#ffb95f] font-bold'}>
                      Playing XI: {t1XI.length} / 11 {t1XI.length === 11 ? '✓' : `(Need ${11 - t1XI.length})`}
                    </span>
                    <span className="text-[#ffb95f]">Substitutes: {t1Subs.length}</span>
                  </div>
                </div>
              );
            })()}

            {/* Team 2 Squad Card */}
            {(() => {
              const t2XI = team2Players.filter(p => !p.isSubstitute);
              const t2Subs = team2Players.filter(p => p.isSubstitute);
              return (
                <div className="bg-[#161b29] rounded-xl p-4 border border-[#3c4a42]/30 flex flex-col justify-between shadow-sm space-y-3">
                  <div className="space-y-3">
                    {/* Team 2 Preset Selector */}
                    <div className="flex flex-col gap-1 pb-2 border-b border-[#3c4a42]/20">
                      <label className="font-label-caps text-[10px] text-[#ffb95f] uppercase font-bold flex items-center justify-between">
                        <span>Select Team 2 Preset (10+ Teams)</span>
                        <span className="text-[#dde2f5] font-stat-mono-sm">{team2Players.length} in Squad</span>
                      </label>
                      <select
                        value={selectedPreset2}
                        onChange={e => handleSelectPreset2(e.target.value)}
                        className="w-full bg-[#080e1b] text-[#dde2f5] font-stat-mono-sm text-xs rounded-lg p-2 border border-[#3c4a42] focus:outline-none focus:border-[#ffb95f]"
                      >
                        {allPresetTeams.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.shortName}) - 15 Players
                          </option>
                        ))}
                        <option value="custom">-- Custom Team --</option>
                      </select>
                    </div>

                    {/* Team 2 Custom Names */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={team2Name}
                        onChange={e => setTeam2Name(e.target.value)}
                        className="flex-1 bg-[#1a1f2d] px-2.5 py-1.5 rounded font-headline-sm text-sm font-bold text-[#dde2f5] border border-[#3c4a42]/30 focus:outline-none"
                        placeholder="Team 2 Name"
                      />
                      <input
                        type="text"
                        value={team2Short}
                        onChange={e => setTeam2Short(e.target.value.toUpperCase())}
                        className="w-16 bg-[#080e1b] px-2 py-1.5 rounded text-xs font-stat-mono-sm text-[#ffb95f] font-bold text-center uppercase border border-[#3c4a42]"
                        placeholder="Short"
                      />
                    </div>

                    {/* SECTION 1: STARTING PLAYING XI */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-label-caps text-[11px] font-bold text-[#dde2f5] uppercase flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#4edea3]" />
                          Starting Playing XI ({t2XI.length})
                        </span>
                        {t2XI.length === 11 ? (
                          <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#4edea3] border border-[#4edea3]/30 font-label-caps text-[10px] font-bold uppercase flex items-center gap-1">
                            <Check className="w-3 h-3" /> 11/11 READY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#ee9800]/20 text-[#ffb95f] border border-[#ffb95f]/30 font-label-caps text-[10px] font-bold uppercase">
                            {t2XI.length}/11 ({t2XI.length < 11 ? `Need ${11 - t2XI.length} more` : `${t2XI.length - 11} too many`})
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                        {t2XI.length === 0 ? (
                          <div className="text-center py-3 text-xs text-[#86948a] border border-dashed border-[#3c4a42]/40 rounded-lg">
                            No players in Playing XI. Click ↑ on substitutes below to add.
                          </div>
                        ) : (
                          t2XI.map((p, idx) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#1a1f2d] hover:bg-[#242a38] border border-[#3c4a42]/30 text-xs transition-colors"
                            >
                              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 pr-2">
                                <span className="font-stat-mono-sm text-[11px] text-[#86948a] w-5 shrink-0">
                                  {idx + 1}.
                                </span>
                                <span className="font-semibold text-[#dde2f5] text-xs truncate">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-[#bbcabf] shrink-0 capitalize">
                                  ({p.role})
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => moveXIToSub('team2', p.id)}
                                  className="p-1.5 rounded text-[#ffb95f] hover:text-[#dde2f5] hover:bg-[#ee9800]/20 transition-colors cursor-pointer"
                                  title="Move to Bench Substitutes (↓)"
                                  type="button"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemovePlayer('team2', p.id)}
                                  className="p-1.5 text-[#86948a] hover:text-[#ffb4ab] rounded hover:bg-[#93000a]/20 cursor-pointer"
                                  title="Delete Player"
                                  type="button"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* SECTION 2: BENCH SUBSTITUTES */}
                    <div className="space-y-1.5 pt-2 border-t border-[#3c4a42]/20">
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-label-caps text-[11px] font-bold text-[#ffb95f] uppercase flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-[#ffb95f]" />
                          Bench Substitutes ({t2Subs.length})
                        </span>
                        <span className="font-label-caps text-[10px] text-[#bbcabf] uppercase tracking-wider">
                          Reserves
                        </span>
                      </div>

                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {t2Subs.length === 0 ? (
                          <div className="text-center py-2.5 text-xs text-[#86948a] border border-dashed border-[#3c4a42]/40 rounded-lg">
                            No substitutes on bench. Click ↓ on XI players above to move to bench.
                          </div>
                        ) : (
                          t2Subs.map((p, idx) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#080e1b]/80 hover:bg-[#1a1f2d] border border-[#ffb95f]/20 text-xs transition-colors"
                            >
                              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 pr-2">
                                <span className="font-stat-mono-sm text-[11px] text-[#ffb95f] w-5 shrink-0">
                                  {idx + 1}.
                                </span>
                                <span className="font-semibold text-[#dde2f5] text-xs truncate">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-[#bbcabf] shrink-0 capitalize">
                                  ({p.role})
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => moveSubToXI('team2', p.id)}
                                  className="p-1.5 rounded text-[#4edea3] hover:text-[#dde2f5] hover:bg-[#10b981]/20 transition-colors cursor-pointer"
                                  title={
                                    t2XI.length >= 11
                                      ? "Swap into Starting Playing XI (↑)"
                                      : "Move to Starting Playing XI (↑)"
                                  }
                                  type="button"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemovePlayer('team2', p.id)}
                                  className="p-1.5 text-[#86948a] hover:text-[#ffb4ab] rounded hover:bg-[#93000a]/20 cursor-pointer"
                                  title="Delete Player"
                                  type="button"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-stat-mono-sm text-[#bbcabf] pt-2 border-t border-[#3c4a42]/20 flex justify-between">
                    <span className={t2XI.length === 11 ? 'text-[#4edea3] font-bold' : 'text-[#ffb95f] font-bold'}>
                      Playing XI: {t2XI.length} / 11 {t2XI.length === 11 ? '✓' : `(Need ${11 - t2XI.length})`}
                    </span>
                    <span className="text-[#ffb95f]">Substitutes: {t2Subs.length}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Quick Add Player Component */}
          <div className="bg-[#161b29] rounded-xl p-4 border border-[#3c4a42]/30 flex flex-wrap items-center gap-3 shadow-sm">
            <span className="font-label-caps text-xs text-[#bbcabf] uppercase font-bold flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#4edea3]" />
              Add Custom Player:
            </span>
            <select
              value={newPlayerTeam}
              onChange={e => setNewPlayerTeam(e.target.value as 'team1' | 'team2')}
              className="bg-[#080e1b] text-[#dde2f5] font-stat-mono-sm text-xs rounded px-2.5 py-1.5 border border-[#3c4a42]"
            >
              <option value="team1">{team1Name}</option>
              <option value="team2">{team2Name}</option>
            </select>
            <input
              type="text"
              placeholder="Player Full Name"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              className="bg-[#080e1b] text-[#dde2f5] text-xs rounded px-3 py-1.5 border border-[#3c4a42] flex-1 min-w-[140px]"
            />
            <select
              value={newPlayerRole}
              onChange={e => setNewPlayerRole(e.target.value as any)}
              className="bg-[#080e1b] text-[#dde2f5] font-stat-mono-sm text-xs rounded px-2.5 py-1.5 border border-[#3c4a42]"
            >
              <option value="batter">Batter</option>
              <option value="bowler">Bowler</option>
              <option value="allrounder">All-Rounder</option>
              <option value="wicketkeeper">Wicketkeeper</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs font-body-sm text-[#bbcabf] cursor-pointer">
              <input
                type="checkbox"
                checked={newPlayerIsSub}
                onChange={e => setNewPlayerIsSub(e.target.checked)}
                className="rounded bg-[#080e1b] border-[#3c4a42] text-[#10b981]"
              />
              <span>As Substitute</span>
            </label>
            <button
              onClick={handleAddPlayer}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#10b981] hover:bg-[#059669] text-[#00422b] font-label-caps text-xs font-bold cursor-pointer"
              type="button"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Player</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
