/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sliders,
  Cpu,
  Zap,
  Activity,
  Plus,
  Minus,
  Sparkles,
  Coffee,
  Bed,
  Utensils,
  Smile,
  Shield,
  BookOpen,
} from 'lucide-react';
import { Character, Motives, SmartObject } from '../game/simulation';

interface SystemsMechanicsModalProps {
  onClose: () => void;
  characters: Character[];
  smartObjects: SmartObject[];
  onUpdateCharacterMotives: (charId: string, deltaMotives: Partial<Motives>) => void;
  isDarkMode: boolean;
}

export const SystemsMechanicsModal: React.FC<SystemsMechanicsModalProps> = ({
  onClose,
  characters,
  smartObjects,
  onUpdateCharacterMotives,
  isDarkMode,
}) => {
  const [selectedCharId, setSelectedCharId] = useState<string>(characters[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'motives' | 'interactions' | 'decay'>('motives');

  const selectedChar = characters.find((c) => c.id === selectedCharId) || characters[0];

  // Converts 0-100 internal motive to 1.0 - 10.0 scale
  const toTenScale = (val: number): number => {
    return Math.max(1, Math.min(10, Math.round((val / 10) * 10) / 10));
  };

  const handleAdjustMotive = (motiveKey: keyof Motives, deltaTen: number) => {
    if (!selectedChar) return;
    // deltaTen is on 1-10 scale, which translates to deltaTen * 10 on the 0-100 scale
    onUpdateCharacterMotives(selectedChar.id, {
      [motiveKey]: deltaTen * 10,
    });
  };

  const MOTIVE_CONFIGS: {
    key: keyof Motives;
    label: string;
    decayRate: string;
    description: string;
    icon: any;
    color: string;
  }[] = [
    {
      key: 'hunger',
      label: 'Hunger Mechanic',
      decayRate: '-0.8 / in-game hour',
      description: 'Satisfied by Refrigerator, BBQ Grill, and Kitchen snacks (+1 to +5)',
      icon: Utensils,
      color: '#f97316',
    },
    {
      key: 'energy',
      label: 'Energy Mechanic',
      decayRate: '-0.5 / in-game hour',
      description: 'Restored via Canopy Bed (+7.0), Velvet Sofa (+2.0), or Espresso (+2.5)',
      icon: Bed,
      color: '#3b82f6',
    },
    {
      key: 'bladder',
      label: 'Bladder Mechanic',
      decayRate: '-0.7 / in-game hour',
      description: 'Relieved at Flush Toilet (+8.0). Decays faster when drinking espresso',
      icon: Activity,
      color: '#eab308',
    },
    {
      key: 'hygiene',
      label: 'Hygiene Mechanic',
      decayRate: '-0.4 / in-game hour',
      description: 'Restored via Clawfoot Bathtub (+7.5) and Swimming Pool (+1.5)',
      icon: Sparkles,
      color: '#06b6d4',
    },
    {
      key: 'social',
      label: 'Social Mechanic',
      decayRate: '-0.6 / in-game hour',
      description: 'Built through Autonomous Toon Conversations (+2.5) and Phone Calls',
      icon: Smile,
      color: '#a855f7',
    },
    {
      key: 'fun',
      label: 'Fun Mechanic',
      decayRate: '-0.8 / in-game hour',
      description: 'Boosted by Arcade Cabinet (+4.0), TV Sitcom (+3.5), and Pool (+5.0)',
      icon: Zap,
      color: '#ec4899',
    },
    {
      key: 'sanity',
      label: 'Sanity Mechanic',
      decayRate: 'Maturity dependent (-1.5 in Dark Mode)',
      description: 'Preserved by Bookshelf & Painting. Threatened by locked basement secrets',
      icon: Shield,
      color: '#10b981',
    },
  ] as any;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div
        className={`w-full max-w-4xl rounded-2xl border shadow-2xl p-6 overflow-hidden max-h-[92vh] flex flex-col ${
          isDarkMode
            ? 'bg-gray-950 text-gray-100 border-indigo-900/80'
            : 'bg-white text-gray-900 border-gray-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-md">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">House Systems & 1–10 Mechanics Console</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Deterministic Math Engine
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Calibrated motive formulas, discrete 1 to 10 ratings, and live (+ / -) interaction dynamics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex items-center gap-2 pt-3 border-b border-gray-200 dark:border-gray-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('motives')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'motives'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            Motive Mechanics (1–10 Scale)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('interactions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'interactions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            Smart Object (+-) Deltas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('decay')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'decay'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            Autonomous Decay Math
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {activeTab === 'motives' && (
            <div className="space-y-4">
              {/* Character Selector Pill Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-gray-400 shrink-0">Resident:</span>
                {characters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCharId(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition ${
                      selectedChar?.id === c.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>

              {/* Live Motive Ratings on 1 to 10 Scale with Direct Stepper Buttons */}
              {selectedChar && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MOTIVE_CONFIGS.map((config: any) => {
                    const Icon = config.icon;
                    const currentValue = selectedChar.motives[config.key as keyof Motives] ?? 50;
                    const valTen = toTenScale(currentValue);

                    return (
                      <div
                        key={config.key}
                        className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="p-1.5 rounded-lg text-white"
                              style={{ backgroundColor: config.color }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold block">{config.label}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                Decay: {config.decayRate}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 font-mono text-xs">
                            <span
                              className="font-bold text-sm px-2 py-0.5 rounded-md text-white shadow-xs"
                              style={{ backgroundColor: config.color }}
                            >
                              {valTen.toFixed(1)} / 10
                            </span>
                          </div>
                        </div>

                        {/* Visual 1-10 Bar */}
                        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-200"
                            style={{
                              width: `${(valTen / 10) * 100}%`,
                              backgroundColor: config.color,
                            }}
                          />
                        </div>

                        {/* Interactive Steppers (+- 1.0 on 1-10 scale) */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-gray-500 truncate max-w-[180px]">
                            {config.description}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAdjustMotive(config.key as keyof Motives, -1.0)}
                              className="p-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-red-500 hover:text-white transition text-xs font-bold"
                              title="Decrease by -1.0"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono text-gray-400 px-1">+-1.0</span>
                            <button
                              type="button"
                              onClick={() => handleAdjustMotive(config.key as keyof Motives, 1.0)}
                              className="p-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-emerald-500 hover:text-white transition text-xs font-bold"
                              title="Increase by +1.0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'interactions' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Every Smart Object in The House applies deterministic motive delta values between 1 and
                10 (+-) when toons autonomously interact:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {smartObjects.map((obj) => (
                  <div
                    key={obj.id}
                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{obj.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
                        {obj.room}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 italic">Action: "{obj.actionLabel}"</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(obj.effects).map(([motive, delta]) => {
                        const deltaTen = Math.round(((delta as number) / 10) * 10) / 10;
                        const isPositive = deltaTen > 0;
                        return (
                          <span
                            key={motive}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              isPositive
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/15 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {motive.toUpperCase()}: {isPositive ? `+${deltaTen.toFixed(1)}` : deltaTen.toFixed(1)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'decay' && (
            <div className="space-y-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 text-xs space-y-3">
              <h3 className="font-bold text-sm text-indigo-400">Deterministic Mathematical Formulation</h3>
              <p className="text-gray-400 leading-relaxed">
                The House calculates motive values using continuous state equations bounded strictly
                between 1.0 and 10.0:
              </p>
              <div className="p-3 rounded-lg bg-black/40 font-mono text-cyan-300 space-y-1">
                <div>MotiveRating(t) = Clamp(Motive(t) / 10.0, 1.0, 10.0)</div>
                <div>dMotive/dt = -DecayRate * TimeScale</div>
                <div>InteractionImpact: MotiveNew = Clamp(MotiveOld + DeltaValue * Multiplier, 10, 100)</div>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Autonomous decision weights choose whichever smart object maximizes utility for the
                lowest motive score (&lt; 3.0 triggers urgent goal-directed steering).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
