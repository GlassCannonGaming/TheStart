/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Smartphone, X, Wifi, Battery, MapPin, Sparkles, MessageSquare, User } from 'lucide-react';
import { Character, SmartObject } from '../game/simulation';

interface MobileSimulatorViewProps {
  onClose: () => void;
  characters: Character[];
  smartObjects: SmartObject[];
  timeStr: string;
  day: number;
  onSelectCharacter: (id: string) => void;
  onOpenChatbot: () => void;
  isDarkMode: boolean;
}

export const MobileSimulatorView: React.FC<MobileSimulatorViewProps> = ({
  onClose,
  characters,
  timeStr,
  day,
  onSelectCharacter,
  onOpenChatbot,
  isDarkMode,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      {/* Smartphone Frame */}
      <div className="relative w-[360px] h-[720px] bg-gray-900 rounded-[48px] p-3 shadow-2xl border-4 border-gray-700 flex flex-col overflow-hidden">
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-gray-800" />
        </div>

        {/* Screen Bezel */}
        <div className="relative w-full h-full bg-gray-950 text-gray-100 rounded-[38px] overflow-hidden flex flex-col border border-gray-800">
          {/* Mobile Status Bar */}
          <div className="pt-2 px-6 pb-1 flex justify-between items-center text-[10px] text-gray-400 font-mono select-none">
            <span>{timeStr.split(' ')[0]}</span>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] text-emerald-400 font-bold">PC SYNC</span>
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* App Header */}
          <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <h1 className="font-bold text-xs tracking-tight">The House Mobile</h1>
              <span className="text-[10px] px-1 rounded bg-indigo-950 text-indigo-300 font-mono">Day {day}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Remote Feed Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/60 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-indigo-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Live Household Sync
              </div>
              <p className="text-[11px] text-gray-300 leading-snug">
                Managing your household on the 64x64 grid remotely from your phone.
              </p>
            </div>

            {/* Characters List */}
            <div className="space-y-2">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Occupants</h2>
              {characters.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCharacter(c.id);
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-indigo-500 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-xs">{c.name}</div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-indigo-400" />
                          {c.onGrid ? c.room : 'Off-Grid (Downtown)'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono font-bold text-purple-400">
                        Sanity: {Math.round(c.motives.sanity)}%
                      </div>
                      <div className="text-[9px] text-gray-400">{c.currentAction}</div>
                    </div>
                  </div>

                  {/* Mini Motives Meter */}
                  <div className="grid grid-cols-3 gap-1 mt-2 text-[9px] font-mono">
                    <div className="bg-gray-950 px-1 py-0.5 rounded text-orange-400">
                      Hunger {Math.round(c.motives.hunger)}%
                    </div>
                    <div className="bg-gray-950 px-1 py-0.5 rounded text-blue-400">
                      Energy {Math.round(c.motives.energy)}%
                    </div>
                    <div className="bg-gray-950 px-1 py-0.5 rounded text-pink-400">
                      Fun {Math.round(c.motives.fun)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Remote Action */}
            <button
              onClick={() => {
                onOpenChatbot();
                onClose();
              }}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ask The House Black-Box Logs
            </button>
          </div>

          {/* Android Home Bar */}
          <div className="py-2 flex justify-center">
            <div className="w-32 h-1 bg-gray-700 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
