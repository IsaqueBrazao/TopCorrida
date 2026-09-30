'use client';

import React, { useState } from 'react';
import {
  ResolutionMode,
  PlayerStats,
  TrackConfig,
  BikeConfig,
} from '@/lib/types';
import { TRACKS, BIKES } from '@/lib/game-data';
import RoadkillGame from '@/components/RoadkillGame';
import GarageView from '@/components/GarageView';
import RaceSummaryModal from '@/components/RaceSummaryModal';
import ControlsModal from '@/components/ControlsModal';
import { X } from 'lucide-react';

export default function Home() {
  const [resolutionMode, setResolutionMode] = useState<ResolutionMode>('ARCADE_256');
  const [showControlsModal, setShowControlsModal] = useState<boolean>(false);
  const [showGarageModal, setShowGarageModal] = useState<boolean>(false);
  const [raceKey, setRaceKey] = useState<number>(0);

  // Player Progression Stats (persisted in localStorage)
  const [stats, setStats] = useState<PlayerStats>({
    money: 800,
    currentTrackIndex: 0,
    unlockedBikeIds: ['bike_50cc'],
    selectedBikeId: 'bike_50cc',
    upgrades: {
      speedLevel: 0,
      armorLevel: 0,
      weaponLevel: 0,
    },
    totalRivalsKnocked: 0,
    championshipWon: false,
  });

  const [unlockedTrackIndices, setUnlockedTrackIndices] = useState<number[]>(() => {
    const defaultUnlocked = TRACKS.map((t, idx) => (t.unlocked ? idx : -1)).filter((idx) => idx !== -1);
    return defaultUnlocked.length > 0 ? defaultUnlocked : [0];
  });

  // Load saved progress from localStorage on client mount to prevent hydration mismatch
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('roadkill_save_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.stats) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStats(parsed.stats);
        }
        if (parsed.unlockedTracks) {
          const defaultUnlocked = TRACKS.map((t, idx) => (t.unlocked ? idx : -1)).filter((idx) => idx !== -1);
          setUnlockedTrackIndices(Array.from(new Set([...parsed.unlockedTracks, ...defaultUnlocked])));
        }
      }
    } catch {}
  }, []);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);

  // Completed Race Results Modal State
  const [lastRaceResults, setLastRaceResults] = useState<{
    rank: number;
    raceTime: number;
    bestLap: number;
    knockdowns: number;
  } | null>(null);
  const [lastEarnings, setLastEarnings] = useState<number>(0);

  // Save progress
  const saveProgress = (newStats: PlayerStats, newUnlockedTracks: number[]) => {
    try {
      localStorage.setItem(
        'roadkill_save_v1',
        JSON.stringify({ stats: newStats, unlockedTracks: newUnlockedTracks })
      );
    } catch {}
  };

  const handleUpdateStats = (newStats: PlayerStats) => {
    setStats(newStats);
    saveProgress(newStats, unlockedTrackIndices);
  };

  const currentTrack: TrackConfig = TRACKS[selectedTrackIndex] || TRACKS[0];
  const currentBike: BikeConfig =
    BIKES.find((b) => b.id === stats.selectedBikeId) || BIKES[0];

  const handleSelectTrack = (idx: number) => {
    setSelectedTrackIndex(idx);
    setRaceKey((prev) => prev + 1);
  };

  const handleSelectBikeId = (bikeId: string) => {
    if (stats.unlockedBikeIds.includes(bikeId)) {
      handleUpdateStats({
        ...stats,
        selectedBikeId: bikeId,
      });
      setRaceKey((prev) => prev + 1);
    }
  };

  const handleRestartRace = () => {
    setRaceKey((prev) => prev + 1);
  };

  const handleRaceFinished = (results: {
    rank: number;
    raceTime: number;
    bestLap: number;
    knockdowns: number;
  }) => {
    // Prize calculation:
    // 1st: $1500, 2nd: $1000, 3rd: $700, 4th+: $300 + $100 per knockdown
    const basePrizes = [1500, 1000, 700, 450, 350, 250, 200, 150];
    const base = basePrizes[results.rank - 1] || 100;
    const earned = base + results.knockdowns * 100;

    setLastEarnings(earned);
    setLastRaceResults(results);

    const newUnlockedTracks = [...unlockedTrackIndices];
    let champWon = stats.championshipWon;

    // If top 3, unlock next stage
    if (results.rank <= 3) {
      const nextTrack = selectedTrackIndex + 1;
      if (nextTrack < TRACKS.length && !newUnlockedTracks.includes(nextTrack)) {
        newUnlockedTracks.push(nextTrack);
        setUnlockedTrackIndices(newUnlockedTracks);
      } else if (selectedTrackIndex === TRACKS.length - 1 && results.rank === 1) {
        champWon = true;
        if (!stats.unlockedBikeIds.includes('bike_1000cc')) {
          stats.unlockedBikeIds.push('bike_1000cc');
        }
      }
    }

    const updatedStats: PlayerStats = {
      ...stats,
      money: stats.money + earned,
      totalRivalsKnocked: stats.totalRivalsKnocked + results.knockdowns,
      championshipWon: champWon,
    };

    setStats(updatedStats);
    saveProgress(updatedStats, newUnlockedTracks);
  };

  const toggleResolution = () => {
    setResolutionMode((prev) => (prev === 'ARCADE_256' ? 'RETRO_64' : 'ARCADE_256'));
  };

  return (
    <div className="w-full min-h-screen bg-black text-slate-100 flex flex-col justify-center items-center p-1 sm:p-3 font-sans selection:bg-amber-500 selection:text-slate-950 overflow-x-hidden">
      {/* 100% PURE GAME ARCADE VIEWPORT */}
      <div className="w-full max-w-5xl flex-1 flex flex-col justify-center items-center">
        <RoadkillGame
          key={raceKey}
          track={currentTrack}
          bike={currentBike}
          allTracks={TRACKS}
          allBikes={BIKES}
          unlockedTrackIndices={unlockedTrackIndices}
          unlockedBikeIds={stats.unlockedBikeIds}
          selectedTrackIndex={selectedTrackIndex}
          onSelectTrackIndex={handleSelectTrack}
          onSelectBikeId={handleSelectBikeId}
          onOpenGarage={() => setShowGarageModal(true)}
          onOpenControls={() => setShowControlsModal(true)}
          money={stats.money}
          onRaceFinished={handleRaceFinished}
          resolutionMode={resolutionMode}
          onToggleResolution={toggleResolution}
          onRestartRace={handleRestartRace}
        />
      </div>

      {/* IN-GAME GARAGE & TUNING OVERLAY */}
      {showGarageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowGarageModal(false);
                setRaceKey((prev) => prev + 1); // reload with selected bike/upgrades
              }}
              className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700 z-10"
              title="Voltar ao Jogo"
            >
              <X className="w-5 h-5" />
            </button>

            <GarageView
              stats={stats}
              onUpdateStats={handleUpdateStats}
              onBackToMenu={() => {
                setShowGarageModal(false);
                setRaceKey((prev) => prev + 1);
              }}
              onSelectTrack={() => {
                setShowGarageModal(false);
                setRaceKey((prev) => prev + 1);
              }}
            />
          </div>
        </div>
      )}

      {/* RACE FINISH / RESULTS MODAL */}
      {lastRaceResults && (
        <RaceSummaryModal
          results={lastRaceResults}
          track={currentTrack}
          bike={currentBike}
          earnings={lastEarnings}
          hasNextTrack={selectedTrackIndex + 1 < TRACKS.length}
          onNextTrack={() => {
            setSelectedTrackIndex((prev) => prev + 1);
            setLastRaceResults(null);
            setRaceKey((prev) => prev + 1);
          }}
          onRetry={() => {
            setLastRaceResults(null);
            setRaceKey((prev) => prev + 1);
          }}
          onGoToGarage={() => {
            setLastRaceResults(null);
            setShowGarageModal(true);
          }}
          isChampionshipWin={
            selectedTrackIndex === TRACKS.length - 1 && lastRaceResults.rank === 1
          }
        />
      )}

      {/* CONTROLS & HOW TO PLAY MODAL */}
      {showControlsModal && (
        <ControlsModal onClose={() => setShowControlsModal(false)} />
      )}
    </div>
  );
}
