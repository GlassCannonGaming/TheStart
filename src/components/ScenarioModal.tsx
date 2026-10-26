/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, BookOpen, Dices, Skull, ShieldCheck, Play } from 'lucide-react';
import { PRESET_SCENARIOS, Scenario, Character, MaturityRating } from '../game/simulation';

interface ScenarioModalProps {
  onClose: () => void;
  onStartScenario: (scenario: Scenario, maturity: MaturityRating) => void;
  onStartRandomGame: (maturity: MaturityRating) => void;
  currentMaturity: MaturityRating;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  onClose,
  onStartScenario,
  onStartRandomGame,
  currentMaturity,
}) => {
  const [maturity, setMaturity] = useState<MaturityRating>(currentMaturity);

  const filteredScenarios = PRESET_SCENARIOS.filter((s) => {
    if (maturity === 'FAMILY_FRIENDLY') {
      return s.maturity === 'FAMILY_FRIENDLY';
    }
    return true; // Dark mode allows all
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border shadow-2xl p-6 overflow-hidden max-h-[92vh] flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">New Game & Scenarios</h2>
              <p className="text-xs text-gray-500">
                Choose a pre-made narrative scenario or launch a procedural random start
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* World Generation Maturity Toggle */}
        <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold">
                {maturity === 'FAMILY_FRIENDLY' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Skull className="w-4 h-4 text-purple-500" />
                )}
                <span>World Content Mode: {maturity === 'FAMILY_FRIENDLY' ? 'Family-Friendly (PG)' : 'Dark Mode (Mature Thriller)'}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {maturity === 'FAMILY_FRIENDLY'
                  ? 'Classic lighthearted Sims slapstick; strips violence, blood decals, and basement dungeons.'
                  : 'Unlocks paranoia, psychological sanity breakdown, secret locked dungeons, and dark traits.'}
              </p>
            </div>

            <button
              onClick={() => setMaturity(maturity === 'FAMILY_FRIENDLY' ? 'DARK_MODE' : 'FAMILY_FRIENDLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                maturity === 'DARK_MODE'
                  ? 'bg-purple-950 border-purple-600 text-purple-200'
                  : 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
              }`}
            >
              Toggle to {maturity === 'FAMILY_FRIENDLY' ? 'Dark Mode' : 'Family Friendly'}
            </button>
          </div>
        </div>

        {/* Scenarios Grid */}
        <div className="overflow-y-auto flex-1 my-4 space-y-3 pr-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span>Pre-Made Scenarios</span>
            <span>{filteredScenarios.length} Available</span>
          </div>

          {filteredScenarios.map((scen) => (
            <div
              key={scen.id}
              className={`p-4 rounded-xl border transition-all ${
                scen.maturity === 'DARK_MODE'
                  ? 'border-purple-800/80 bg-purple-950/20 hover:bg-purple-950/35'
                  : 'border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 hover:border-indigo-400'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{scen.title}</h3>
                    {scen.maturity === 'DARK_MODE' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-purple-200">
                        DARK
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                    {scen.description}
                  </p>
                </div>
                <button
                  onClick={() => {
                    onStartScenario(scen, maturity);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer shrink-0 ml-3"
                >
                  <Play className="w-3.5 h-3.5" />
                  Start
                </button>
              </div>

              {/* Characters Preview */}
              <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-gray-400">Cast:</span>
                <div className="flex gap-2">
                  {scen.characters.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 dark:text-gray-300"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name.split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer: Procedural Random Start */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold block">Prefer a surprise?</span>
            <span className="text-[11px] text-gray-500">
              Generates random characters, traits, and secret starting memories.
            </span>
          </div>
          <button
            onClick={() => {
              onStartRandomGame(maturity);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Dices className="w-4 h-4" />
            Launch Procedural Random Start
          </button>
        </div>
      </div>
    </div>
  );
};
