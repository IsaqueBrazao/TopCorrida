'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  TrackConfig,
  BikeConfig,
  GameControls,
  ResolutionMode,
  CombatRacer,
} from '@/lib/types';
import { RoadkillGameEngine } from '@/lib/game-engine';
import { audio } from '@/lib/audio';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Zap,
  ShieldAlert,
  Lock,
} from 'lucide-react';

interface RoadkillGameProps {
  track: TrackConfig;
  bike: BikeConfig;
  allTracks: TrackConfig[];
  allBikes: BikeConfig[];
  unlockedTrackIndices: number[];
  unlockedBikeIds: string[];
  selectedTrackIndex: number;
  onSelectTrackIndex: (idx: number) => void;
  onSelectBikeId: (id: string) => void;
  onOpenGarage: () => void;
  onOpenControls: () => void;
  money: number;
  onRaceFinished: (results: {
    rank: number;
    raceTime: number;
    bestLap: number;
    knockdowns: number;
  }) => void;
  resolutionMode: ResolutionMode;
  onToggleResolution: () => void;
  onRestartRace: () => void;
}

export default function RoadkillGame({
  track,
  bike,
  allTracks,
  allBikes,
  unlockedTrackIndices,
  unlockedBikeIds,
  selectedTrackIndex,
  onSelectTrackIndex,
  onSelectBikeId,
  onOpenGarage,
  onOpenControls,
  money,
  onRaceFinished,
  resolutionMode,
  onToggleResolution,
  onRestartRace,
}: RoadkillGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<RoadkillGameEngine | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Game UI State
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(3);

  // Live HUD metrics
  const [hudSpeed, setHudSpeed] = useState(0);
  const [hudRank, setHudRank] = useState(1);
  const [hudLap, setHudLap] = useState(1);
  const [hudTotalLaps, setHudTotalLaps] = useState(2);
  const [hudHp, setHudHp] = useState(100);
  const [hudMaxHp, setHudMaxHp] = useState(100);
  const [hudNitro, setHudNitro] = useState(100);
  const [hudKnockdowns, setHudKnockdowns] = useState(0);
  const [hudLapProgress, setHudLapProgress] = useState(0);
  const [hudWipedOut, setHudWipedOut] = useState(false);
  const [hudPlayerZ, setHudPlayerZ] = useState(0);
  const [hudRivals, setHudRivals] = useState<CombatRacer[]>([]);

  // Active keyboard/touch controls
  const controlsRef = useRef<GameControls>({
    up: false,
    down: false,
    left: false,
    right: false,
    punchLeft: false,
    punchRight: false,
    kick: false,
    nitro: false,
    pause: false,
  });

  // Initialize Audio & BGM on mount
  useEffect(() => {
    const trackTheme = track.country.toUpperCase() as 'USA' | 'ITALY' | 'JAPAN' | 'FRANCE';
    audio.playBgm(trackTheme);
    return () => {
      audio.stopBgm();
      audio.stopEngineSound();
    };
  }, [track]);

  // Countdown timer on start
  useEffect(() => {
    let count = 3;
    audio.playCountDown(false);
    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        audio.playCountDown(false);
      } else if (count === 0) {
        setCountdown(0);
        audio.playCountDown(true);
      } else {
        setCountdown(null);
        clearInterval(timer);
      }
    }, 900);

    return () => clearInterval(timer);
  }, []);

  // Initialize Game Engine
  useEffect(() => {
    const engine = new RoadkillGameEngine(track, bike, resolutionMode);
    engineRef.current = engine;
    lastTimeRef.current = performance.now();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [track, bike, resolutionMode]);

  // Gamepad Poller
  const pollGamepad = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0] || gamepads[1];
    if (!gp) return;

    const ctrl = controlsRef.current;
    // Axes: 0 = Left stick horizontal, 1 = Left stick vertical
    const stickX = gp.axes[0] || 0;
    const stickY = gp.axes[1] || 0;

    // Buttons
    // 0 = A, 1 = B, 2 = X, 3 = Y, 4 = LB, 5 = RB, 6 = LT, 7 = RT, 12 = Up, 13 = Down, 14 = Left, 15 = Right
    const btnA = gp.buttons[0]?.pressed;
    const btnB = gp.buttons[1]?.pressed;
    const btnX = gp.buttons[2]?.pressed;
    const btnY = gp.buttons[3]?.pressed;
    const btnLB = gp.buttons[4]?.pressed;
    const btnRB = gp.buttons[5]?.pressed;
    const btnRT = gp.buttons[7]?.pressed || (gp.buttons[7]?.value > 0.3);
    const btnLT = gp.buttons[6]?.pressed || (gp.buttons[6]?.value > 0.3);

    const dUp = gp.buttons[12]?.pressed;
    const dDown = gp.buttons[13]?.pressed;
    const dLeft = gp.buttons[14]?.pressed;
    const dRight = gp.buttons[15]?.pressed;

    ctrl.up = Boolean(btnA || btnRT || dUp || stickY < -0.4);
    ctrl.down = Boolean(btnB || btnLT || dDown || stickY > 0.4);
    ctrl.left = Boolean(dLeft || stickX < -0.3);
    ctrl.right = Boolean(dRight || stickX > 0.3);
    ctrl.punchLeft = Boolean(btnX);
    ctrl.punchRight = Boolean(btnY);
    ctrl.kick = Boolean(btnLB);
    ctrl.nitro = Boolean(btnRB);
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling with arrows/space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const ctrl = controlsRef.current;
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          ctrl.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          ctrl.down = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          ctrl.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          ctrl.right = true;
          break;
        case 'KeyZ':
        case 'KeyJ':
          ctrl.punchLeft = true;
          break;
        case 'KeyX':
        case 'KeyK':
          ctrl.punchRight = true;
          break;
        case 'KeyC':
        case 'KeyL':
          ctrl.kick = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'Space':
          ctrl.nitro = true;
          break;
        case 'KeyP':
        case 'Escape':
          setIsPaused((prev) => !prev);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const ctrl = controlsRef.current;
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          ctrl.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          ctrl.down = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          ctrl.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          ctrl.right = false;
          break;
        case 'KeyZ':
        case 'KeyJ':
          ctrl.punchLeft = false;
          break;
        case 'KeyX':
        case 'KeyK':
          ctrl.punchRight = false;
          break;
        case 'KeyC':
        case 'KeyL':
          ctrl.kick = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'Space':
          ctrl.nitro = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Loop
  useEffect(() => {
    let hudThrottle = 0;

    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - lastTimeRef.current) / 1000);
      lastTimeRef.current = currentTime;

      const engine = engineRef.current;
      const canvas = canvasRef.current;

      if (engine && canvas) {
        pollGamepad();

        // During countdown, lock acceleration
        const activeControls = countdown !== null ? { ...controlsRef.current, up: false, nitro: false } : controlsRef.current;

        // Set raceStarted flag on engine
        engine.raceStarted = countdown === null;

        if (!isPaused) {
          engine.update(dt, activeControls);

          // Check for race finish
          if (engine.raceFinished) {
            onRaceFinished({
              rank: engine.finishRank,
              raceTime: engine.raceTime,
              bestLap: engine.bestLapTime,
              knockdowns: engine.knockdowns,
            });
            return;
          }
        }

        engine.render(canvas);

        // Throttle HUD state updates to ~15fps for high React performance
        hudThrottle += dt;
        if (hudThrottle > 0.06) {
          hudThrottle = 0;
          setHudSpeed(Math.round(engine.speed));
          setHudRank(engine.finishRank);
          setHudLap(engine.currentLap);
          setHudTotalLaps(engine.totalLaps);
          setHudHp(Math.round(engine.playerHp));
          setHudMaxHp(engine.playerMaxHp);
          setHudNitro(Math.round(engine.nitro));
          setHudKnockdowns(engine.knockdowns);
          setHudWipedOut(engine.isWipedOut);
          setHudPlayerZ(engine.playerZ);
          setHudRivals(engine.rivals);

          const trackLength = engine.track.totalSegments * 200;
          setHudLapProgress(Math.min(100, Math.round((engine.playerZ / trackLength) * 100)));
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPaused, countdown, onRaceFinished, pollGamepad]);

  const toggleSound = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center select-none">
      {/* Top Arcade Control & Bezel Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-t-xl text-xs text-slate-300">
        {/* Cities Quick Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="font-speed font-bold text-amber-400 text-xs hidden sm:inline mr-1 tracking-wider">
            CIDADES:
          </span>
          {allTracks.map((t, idx) => {
            const isUnlocked = unlockedTrackIndices.includes(idx);
            const isSelected = selectedTrackIndex === idx;
            return (
              <button
                key={t.id}
                onClick={() => isUnlocked && onSelectTrackIndex(idx)}
                disabled={!isUnlocked}
                className={`px-2.5 py-1 rounded text-[11px] font-speed font-bold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isUnlocked
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    : 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed opacity-50'
                }`}
                title={isUnlocked ? `Correr em ${t.city || t.name}` : 'Bloqueado: vença a fase anterior'}
              >
                <span>{t.city || t.name}</span>
                {!isUnlocked && <Lock className="w-2.5 h-2.5 ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Minimal Utilities (Sound, Restart, Pause) */}
        <div className="flex items-center gap-1.5">
          {/* Audio mute toggle */}
          <button
            onClick={toggleSound}
            title="Som e Trilha 8-Bit"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* Restart Race */}
          <button
            onClick={onRestartRace}
            title="Reiniciar Corrida"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Pause */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            title="Pausar Jogo (P / Esc)"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Arcade Frame & Viewport (Strict 16:9 Aspect Ratio) */}
      <div className="relative w-full aspect-video bg-black border-x border-b border-slate-800 rounded-b-xl overflow-hidden shadow-2xl flex items-center justify-center">
        {/* Render Canvas (16:9 High Precision Retro Scaler) */}
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="w-full h-full object-contain pixelated bg-slate-950"
        />

        {/* CRT Scanline and Phosphor Layer */}
        {crtEnabled && <div className="absolute inset-0 crt-overlay crt-flicker pointer-events-none" />}

        {/* Subtle Arcade Glass Screen Glare */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.04] pointer-events-none" />

        {/* BOTTOM HUD: HP, NITRO, SPEEDOMETER (KMS) ONLY */}
        <div className="absolute bottom-2 inset-x-3 flex justify-between items-end pointer-events-none">
          {/* Left Bottom: Rider HP & Nitro Tanks */}
          <div className="bg-black/70 backdrop-blur-xs p-2.5 rounded-lg border border-white/10 flex flex-col gap-1.5 w-44 font-speed">
            {/* Health Bar */}
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-200">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldAlert className="w-3 h-3" /> HP
                </span>
                <span className="font-mono">{hudHp}/{hudMaxHp}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded border border-slate-700 overflow-hidden mt-0.5">
                <div
                  className={`h-full transition-all duration-150 ${
                    hudHp > 50 ? 'bg-emerald-500' : hudHp > 25 ? 'bg-amber-500' : 'bg-red-600 animate-pulse'
                  }`}
                  style={{ width: `${Math.max(0, (hudHp / hudMaxHp) * 100)}%` }}
                />
              </div>
            </div>

            {/* Nitro Boost Bar */}
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-200">
                <span className="flex items-center gap-1 text-cyan-400">
                  <Zap className="w-3 h-3" /> NITRO
                </span>
                <span className="font-mono">{hudNitro}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded border border-slate-700 overflow-hidden mt-0.5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-100"
                  style={{ width: `${hudNitro}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right Bottom: Digital Speedometer (Kms) */}
          <div className="bg-black/70 backdrop-blur-xs px-4 py-2 rounded-lg border border-white/10 flex flex-col items-end font-speed">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-amber-400 font-speed tabular-nums tracking-tighter">
                {hudSpeed}
              </span>
              <span className="text-xs font-bold text-slate-400">KM/H</span>
            </div>
          </div>
        </div>

        {/* TOTAL ENGINE BREAKDOWN / REPAIR OVERLAY */}
        {hudWipedOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs pointer-events-none z-10 animate-fade-in">
            <div className="bg-red-950/90 border-2 border-red-500/80 rounded-xl p-4 max-w-xs w-full text-center shadow-[0_0_30px_rgba(239,68,68,0.5)]">
              <div className="flex items-center justify-center gap-2 text-red-400 font-speed font-black text-sm uppercase tracking-wider mb-1 animate-pulse">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <span>MOTOR DANIFICADO!</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono mb-2.5">
                Veículo parado. Reparando motor...
              </p>
              {/* Repair Progress Bar */}
              <div className="w-full h-3 bg-slate-900 rounded-full border border-red-500/50 overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-100"
                  style={{ width: `${Math.max(0, Math.min(100, (hudHp / hudMaxHp) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono font-bold mt-1 text-slate-300">
                <span>HP: {hudHp}/{hudMaxHp}</span>
                <span className="text-emerald-400">{Math.round((hudHp / hudMaxHp) * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* COUNTDOWN OVERLAY ON RACE START */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-2xs pointer-events-none">
            <div className="text-center font-arcade animate-pulse">
              <span className="text-6xl font-black text-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.8)]">
                {countdown === 0 ? 'GO!' : countdown}
              </span>
            </div>
          </div>
        )}

        {/* PAUSE MODAL OVERLAY */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 text-center shadow-2xl">
              <h3 className="font-speed font-black text-xl text-amber-400 tracking-wider mb-2">
                CORRIDA PAUSADA
              </h3>
              <p className="text-xs text-slate-400 mb-6 font-mono">
                Pressione P ou ESC para continuar
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setIsPaused(false)}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Continuar Corrida
                </button>
                <button
                  onClick={() => {
                    setIsPaused(false);
                    onRestartRace();
                  }}
                  className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 border border-slate-700"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  Reiniciar Pista
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
