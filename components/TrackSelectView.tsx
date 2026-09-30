'use client';

import React from 'react';
import { TrackConfig, BikeConfig } from '@/lib/types';
import { TRACKS } from '@/lib/game-data';
import {
  MapPin,
  Flag,
  Trophy,
  Lock,
  ArrowRight,
  Flame,
  Wrench,
  Sparkles,
} from 'lucide-react';

interface TrackSelectViewProps {
  unlockedTrackIndices: number[];
  selectedTrackIndex: number;
  onSelectTrackIndex: (index: number) => void;
  onStartRace: () => void;
  onOpenGarage: () => void;
  selectedBike: BikeConfig;
}

export default function TrackSelectView({
  unlockedTrackIndices,
  selectedTrackIndex,
  onSelectTrackIndex,
  onStartRace,
  onOpenGarage,
  selectedBike,
}: TrackSelectViewProps) {
  const currentTrack = TRACKS[selectedTrackIndex] || TRACKS[0];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-amber-400" />
          <h2 className="font-speed font-black text-xl text-white tracking-wide">
            GLOBAL GRAND PRIX CHAMPIONSHIP
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenGarage}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-speed font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>GARAGE: {selectedBike.name.toUpperCase()} ({selectedBike.cc}cc)</span>
          </button>

          <button
            onClick={onStartRace}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-speed font-black text-sm rounded-lg flex items-center gap-2 transition-colors shadow-lg"
          >
            <span>START RACE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* All Tracks Grid (5 Global Stages) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {TRACKS.map((track, idx) => {
          const isUnlocked = unlockedTrackIndices.includes(idx);
          const isSelected = selectedTrackIndex === idx;

          return (
            <div
              key={track.id}
              onClick={() => isUnlocked && onSelectTrackIndex(idx)}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-800 border-amber-500 shadow-xl ring-2 ring-amber-500/50'
                  : isUnlocked
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  : 'bg-slate-950/70 border-slate-800/80 opacity-60'
              }`}
            >
              {/* Sky Color preview stripe */}
              <div
                className="h-14 w-full rounded-lg mb-3 flex items-end p-2 relative overflow-hidden border border-white/10"
                style={{
                  background: `linear-gradient(to bottom, ${track.skyColors[0]}, ${track.skyColors[1]})`,
                }}
              >
                <div className="flex items-center gap-1.5 z-10">
                  <span className="text-2xl drop-shadow">{track.flag}</span>
                  <span className="font-speed font-black text-xs text-white drop-shadow">
                    STAGE {idx + 1}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {track.country.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {track.distanceKm} KM
                  </span>
                </div>

                <h3 className="font-speed font-black text-base text-white mb-2">
                  {track.name}
                </h3>

                <div className="text-[11px] text-slate-400 font-mono space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span>Laps:</span>
                    <span className="text-slate-200 font-bold">{track.laps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Turns:</span>
                    <span className="text-slate-200 font-bold">
                      {track.curveComplexity > 1.6 ? 'Hairpins' : track.curveComplexity > 1.2 ? 'Challenging' : 'High Speed'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scenery:</span>
                    <span className="text-slate-300 truncate max-w-[120px]">
                      {track.scenerySprites.join(', ').toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {isSelected ? (
                  <div className="w-full py-2 bg-amber-500 text-slate-950 font-speed font-black text-xs rounded text-center">
                    SELECTED STAGE
                  </div>
                ) : isUnlocked ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTrackIndex(idx);
                    }}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded border border-slate-700 transition-colors"
                  >
                    Select Stage
                  </button>
                ) : (
                  <div className="w-full py-1.5 bg-slate-950 text-slate-500 text-xs font-mono rounded flex items-center justify-center gap-1.5 border border-slate-800">
                    <Lock className="w-3.5 h-3.5" />
                    <span>LOCKED (Finish Stage {idx})</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Track Deep Dive */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{currentTrack.flag}</span>
            <div>
              <span className="text-xs font-mono text-amber-400 uppercase font-bold">
                Selected Destination
              </span>
              <h3 className="font-speed font-black text-xl text-white">
                {currentTrack.name} ({currentTrack.country})
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Battle against 7 aggressive rival bikers across {currentTrack.distanceKm} km of high-speed curves and elevation hills. Knock down rivals to fill your nitrous tank and secure top 3 placement to advance.
          </p>
        </div>

        <button
          onClick={onStartRace}
          className="w-full md:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-speed font-black text-base rounded-xl flex items-center justify-center gap-3 transition-colors shadow-xl"
        >
          <Flame className="w-5 h-5 fill-current" />
          <span>START {currentTrack.name.toUpperCase()}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
