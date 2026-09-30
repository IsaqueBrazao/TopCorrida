'use client';

import React from 'react';
import { Gamepad2, Keyboard, Smartphone, X } from 'lucide-react';

interface ControlsModalProps {
  onClose: () => void;
}

export default function ControlsModal({ onClose }: ControlsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-speed font-black text-lg text-white tracking-wide">
              HOW TO PLAY & CONTROLS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Keyboard Controls */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 font-speed font-bold text-amber-400 text-sm">
              <Keyboard className="w-4 h-4" />
              <span>KEYBOARD</span>
            </div>

            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Steer Left / Right:</span>
                <span className="text-white font-bold">A / D or ← / →</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Accelerate (Gas):</span>
                <span className="text-white font-bold">W or ↑</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Brake / Reverse:</span>
                <span className="text-white font-bold">S or ↓</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Tactical Ram Left:</span>
                <span className="text-rose-400 font-bold">Z or J</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Tactical Ram Right:</span>
                <span className="text-rose-400 font-bold">X or K</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Heavy Bump Slam:</span>
                <span className="text-amber-400 font-bold">C or L</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Nitro Boost:</span>
                <span className="text-cyan-400 font-bold">Space or Shift</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Pause:</span>
                <span className="text-white font-bold">P or Esc</span>
              </div>
            </div>
          </div>

          {/* Gamepad & Touch Controls */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 font-speed font-bold text-cyan-400 text-sm">
              <Gamepad2 className="w-4 h-4" />
              <span>GAMEPAD / CONTROLLER</span>
            </div>

            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Steer:</span>
                <span className="text-white font-bold">Left Stick / D-Pad</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Accelerate:</span>
                <span className="text-white font-bold">A Button or RT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Brake:</span>
                <span className="text-white font-bold">B Button or LT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Side Ram:</span>
                <span className="text-rose-400 font-bold">X / Y Buttons</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Heavy Slam:</span>
                <span className="text-amber-400 font-bold">LB (Bumper)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Nitro:</span>
                <span className="text-cyan-400 font-bold">RB (Bumper)</span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-2 text-slate-400 text-[11px]">
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Mobile devices: Use on-screen virtual buttons for full touch steering and bumper rams.</span>
            </div>
          </div>
        </div>

        {/* Bump Drafting Physics */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 leading-relaxed">
          <span className="font-bold text-amber-300 font-speed uppercase block mb-1">
            Física de Impacto e Impulso Traseiro (Bump Drafting):
          </span>
          Ao bater na traseira de outro carro, o carro de trás transfere momento cinético (desacelera) e o carro da frente ganha um forte impulso de velocidade para frente! Se um rival bater na sua traseira, você ganha um Boost cinético instantâneo. Use os aríetes laterais (Z/X/C) para empurrar os rivais para fora do traçado ideal e roubar impulso!
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-speed font-black text-sm rounded-xl transition-colors"
        >
          GOT IT, LET&apos;S RACE!
        </button>
      </div>
    </div>
  );
}
