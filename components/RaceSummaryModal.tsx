'use client';

import React from 'react';
import { Trophy, Swords, Timer, Coins, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { TrackConfig, BikeConfig } from '@/lib/types';

interface RaceSummaryModalProps {
  results: {
    rank: number;
    raceTime: number;
    bestLap: number;
    knockdowns: number;
  };
  track: TrackConfig;
  bike: BikeConfig;
  earnings: number;
  hasNextTrack: boolean;
  onNextTrack: () => void;
  onRetry: () => void;
  onGoToGarage: () => void;
  isChampionshipWin?: boolean;
}

export default function RaceSummaryModal({
  results,
  track,
  bike,
  earnings,
  hasNextTrack,
  onNextTrack,
  onRetry,
  onGoToGarage,
  isChampionshipWin,
}: RaceSummaryModalProps) {
  const isPodium = results.rank <= 3;
  const isWinner = results.rank === 1;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
            <Trophy className="w-8 h-8" />
          </div>

          <span className="text-xs font-mono text-amber-400 font-bold tracking-widest uppercase">
            {(track.city || track.name).toUpperCase()} CONCLUÍDO
          </span>

          <h2 className="font-speed font-black text-3xl text-white tracking-wide mt-1">
            {isWinner ? '1ST PLACE VICTORY!' : isPodium ? `${results.rank}ND PLACE PODIUM!` : `FINISHED ${results.rank}TH`}
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            {isPodium ? 'Classificado! Próxima cidade desbloqueada.' : 'Fique no top 3 para desbloquear a próxima cidade.'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center gap-3">
            <Timer className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-mono">TOTAL TIME</div>
              <div className="font-speed font-bold text-white text-sm">
                {formatTime(results.raceTime)}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center gap-3">
            <Timer className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-mono">BEST LAP</div>
              <div className="font-speed font-bold text-white text-sm">
                {formatTime(results.bestLap || results.raceTime / 2)}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center gap-3">
            <Swords className="w-4 h-4 text-rose-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-mono">RIVALS K.O.</div>
              <div className="font-speed font-bold text-rose-300 text-sm">
                {results.knockdowns} Knockdowns
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center gap-3">
            <Coins className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-mono">PRIZE EARNED</div>
              <div className="font-speed font-bold text-amber-400 text-sm">
                +${earnings.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Championship victory alert */}
        {isChampionshipWin && (
          <div className="p-4 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-blue-500/20 rounded-xl border border-amber-500/40 text-left flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-300 shrink-0" />
            <div className="text-xs text-slate-200">
              <span className="font-speed font-bold text-amber-300 block">
                CAMPEÃO MUNDIAL DO ROADKILL!
              </span>
              Você completou todas as 5 pistas mundiais! O lendário supercarro Thunder Titan V12 foi desbloqueado na sua garagem.
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onRetry}
            className="w-full sm:w-1/2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-speed font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REINICIAR</span>
          </button>

          {hasNextTrack && isPodium ? (
            <button
              onClick={onNextTrack}
              className="w-full sm:w-1/2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-speed font-black text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-lg"
            >
              <span>PRÓXIMA CIDADE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onRetry}
              className="w-full sm:w-1/2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-speed font-black text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-lg"
            >
              <span>CONTINUAR</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
