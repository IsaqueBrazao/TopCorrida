'use client';

import React from 'react';
import { BikeConfig, PlayerStats } from '@/lib/types';
import { BIKES } from '@/lib/game-data';
import {
  Wrench,
  Gauge,
  Zap,
  Shield,
  Swords,
  Coins,
  Check,
  Lock,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface GarageViewProps {
  stats: PlayerStats;
  onUpdateStats: (newStats: PlayerStats) => void;
  onBackToMenu: () => void;
  onSelectTrack: () => void;
}

export default function GarageView({
  stats,
  onUpdateStats,
  onBackToMenu,
  onSelectTrack,
}: GarageViewProps) {
  const selectedBike = BIKES.find((b) => b.id === stats.selectedBikeId) || BIKES[0];

  const handleSelectBike = (bikeId: string) => {
    if (stats.unlockedBikeIds.includes(bikeId)) {
      onUpdateStats({
        ...stats,
        selectedBikeId: bikeId,
      });
    }
  };

  const handleBuyBike = (bike: BikeConfig) => {
    if (stats.money >= bike.cost && !stats.unlockedBikeIds.includes(bike.id)) {
      onUpdateStats({
        ...stats,
        money: stats.money - bike.cost,
        unlockedBikeIds: [...stats.unlockedBikeIds, bike.id],
        selectedBikeId: bike.id,
      });
    }
  };

  const upgradeCostSpeed = (stats.upgrades.speedLevel + 1) * 350;
  const upgradeCostArmor = (stats.upgrades.armorLevel + 1) * 300;
  const upgradeCostWeapon = (stats.upgrades.weaponLevel + 1) * 400;

  const handleUpgradeSpeed = () => {
    if (stats.money >= upgradeCostSpeed && stats.upgrades.speedLevel < 5) {
      onUpdateStats({
        ...stats,
        money: stats.money - upgradeCostSpeed,
        upgrades: {
          ...stats.upgrades,
          speedLevel: stats.upgrades.speedLevel + 1,
        },
      });
    }
  };

  const handleUpgradeArmor = () => {
    if (stats.money >= upgradeCostArmor && stats.upgrades.armorLevel < 5) {
      onUpdateStats({
        ...stats,
        money: stats.money - upgradeCostArmor,
        upgrades: {
          ...stats.upgrades,
          armorLevel: stats.upgrades.armorLevel + 1,
        },
      });
    }
  };

  const handleUpgradeWeapon = () => {
    if (stats.money >= upgradeCostWeapon && stats.upgrades.weaponLevel < 5) {
      onUpdateStats({
        ...stats,
        money: stats.money - upgradeCostWeapon,
        upgrades: {
          ...stats.upgrades,
          weaponLevel: stats.upgrades.weaponLevel + 1,
        },
      });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Top Bar Status */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-amber-400" />
          <h2 className="font-speed font-black text-xl text-white tracking-wide">
            GARAGEM DE CARROS & TUNING DE COMBATE
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 font-mono font-bold text-sm">
            <Coins className="w-4 h-4" />
            <span>${stats.money.toLocaleString()}</span>
          </div>

          <button
            onClick={onSelectTrack}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-speed font-black text-sm rounded-lg flex items-center gap-2 transition-colors shadow-md"
          >
            <span>CORRER AGORA</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Car Selection List */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <h3 className="text-xs font-mono uppercase text-slate-400 font-bold px-1">
            Carros de Combate (5 Desbloqueáveis)
          </h3>

          <div className="flex flex-col gap-2">
            {BIKES.map((bike) => {
              const isUnlocked = stats.unlockedBikeIds.includes(bike.id);
              const isSelected = stats.selectedBikeId === bike.id;

              return (
                <div
                  key={bike.id}
                  onClick={() => isUnlocked && handleSelectBike(bike.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                      : isUnlocked
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner"
                      style={{ backgroundColor: bike.color, color: bike.accentColor }}
                    >
                      {bike.cc}cc
                    </div>
                    <div>
                      <div className="font-speed font-bold text-slate-200 text-sm">
                        {bike.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Weapon: {bike.weapon.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded">
                        <Check className="w-3.5 h-3.5" /> SELECTED
                      </span>
                    ) : isUnlocked ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectBike(bike.id);
                        }}
                        className="text-[11px] font-medium text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 border border-slate-700"
                      >
                        SELECT
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyBike(bike);
                        }}
                        disabled={stats.money < bike.cost}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded border flex items-center gap-1 ${
                          stats.money >= bike.cost
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        <span>UNLOCK ${bike.cost}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Bike Showcase & Upgrades */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Selected Bike Card */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                  Motor V8 / Turbo ({selectedBike.cc}cc)
                </span>
                <h3 className="font-speed font-black text-2xl text-white tracking-wide">
                  {selectedBike.name}
                </h3>
              </div>
              <div
                className="px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider"
                style={{ backgroundColor: `${selectedBike.color}25`, color: selectedBike.color }}
              >
                Arma: {selectedBike.weapon.replace('_', ' ')}
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {selectedBike.description}
            </p>

            {/* Performance Gauges */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="flex justify-between text-xs text-slate-300 font-mono mb-1">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" /> TOP SPEED
                  </span>
                  <span className="font-bold text-white">
                    {selectedBike.topSpeed + stats.upgrades.speedLevel * 8} KM/H
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${((selectedBike.topSpeed + stats.upgrades.speedLevel * 8) / 320) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 font-mono mb-1">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" /> ACCELERATION
                  </span>
                  <span className="font-bold text-white">{selectedBike.acceleration}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full"
                    style={{ width: `${selectedBike.acceleration}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 font-mono mb-1">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" /> ARMOR / HP
                  </span>
                  <span className="font-bold text-white">
                    {selectedBike.durability + stats.upgrades.armorLevel * 15} HP
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${((selectedBike.durability + stats.upgrades.armorLevel * 15) / 240) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 font-mono mb-1">
                  <span className="flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5 text-rose-400" /> WEAPON POWER
                  </span>
                  <span className="font-bold text-white">
                    {selectedBike.weaponDamage + stats.upgrades.weaponLevel * 6} DMG
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{
                      width: `${((selectedBike.weaponDamage + stats.upgrades.weaponLevel * 6) / 80) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Performance Upgrades Workshop */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 className="font-speed font-black text-sm text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Peças de Combate & Tuning (Aplica a todos os carros)
            </h3>

            <div className="flex flex-col gap-3">
              {/* Speed upgrade */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <div>
                  <div className="font-speed font-bold text-slate-200 text-xs">
                    Turbo Compressor & Escapamento Esportivo
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Nível {stats.upgrades.speedLevel}/5 (+8 KM/H por nível)
                  </div>
                </div>
                <button
                  onClick={handleUpgradeSpeed}
                  disabled={stats.upgrades.speedLevel >= 5 || stats.money < upgradeCostSpeed}
                  className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${
                    stats.upgrades.speedLevel >= 5
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : stats.money >= upgradeCostSpeed
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {stats.upgrades.speedLevel >= 5 ? 'MAX' : `TUNAR $${upgradeCostSpeed}`}
                </button>
              </div>

              {/* Armor upgrade */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <div>
                  <div className="font-speed font-bold text-slate-200 text-xs">
                    Chassi Blindado & Gaiola Roll-Cage
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Nível {stats.upgrades.armorLevel}/5 (+15 HP por nível)
                  </div>
                </div>
                <button
                  onClick={handleUpgradeArmor}
                  disabled={stats.upgrades.armorLevel >= 5 || stats.money < upgradeCostArmor}
                  className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${
                    stats.upgrades.armorLevel >= 5
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : stats.money >= upgradeCostArmor
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {stats.upgrades.armorLevel >= 5 ? 'MAX' : `BLINDAR $${upgradeCostArmor}`}
                </button>
              </div>

              {/* Weapon upgrade */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <div>
                  <div className="font-speed font-bold text-slate-200 text-xs">
                    Aríetes Reforçados & Esporões de Roda
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Nível {stats.upgrades.weaponLevel}/5 (+6 Dano por nível)
                  </div>
                </div>
                <button
                  onClick={handleUpgradeWeapon}
                  disabled={stats.upgrades.weaponLevel >= 5 || stats.money < upgradeCostWeapon}
                  className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${
                    stats.upgrades.weaponLevel >= 5
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : stats.money >= upgradeCostWeapon
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {stats.upgrades.weaponLevel >= 5 ? 'MAX' : `EQUIPAR $${upgradeCostWeapon}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
