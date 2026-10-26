/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  FastForward,
  Grid,
  Volume2,
  VolumeX,
  Tv,
  Smartphone,
  ChevronUp,
  ChevronDown,
  Pencil,
  Mic,
  Radio,
  Cpu,
  Brain,
  Save,
  Wrench,
} from 'lucide-react';
import { WallCutawayMode } from '../game/sceneBuilder';
import { Character } from '../game/simulation';
import {
  FloorLevel,
  FLOOR_LEVELS_ORDER,
  FLOOR_LEVEL_METADATA,
  stepFloorLevel,
} from '../game/houseAgent';

interface BottomDockProps {
  timeStr: string;
  day: number;
  timeScale: number;
  onSetTimeScale: (scale: number) => void;
  cutawayMode: WallCutawayMode;
  onSetCutawayMode: (mode: WallCutawayMode) => void;
  activeFloor: FloorLevel;
  onSelectFloor: (floor: FloorLevel) => void;
  funds: number;
  characters: Character[];
  selectedCharId: string | null;
  onSelectCharacter: (charId: string) => void;
  onOpenEntityVoiceChat: () => void;
  onOpenOmniscientHouse?: () => void;
  onOpenSystems?: () => void;
  onOpenWorldSaves?: () => void;
  onOpenCreationTools?: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showPencilOutline: boolean;
  onTogglePencilOutline: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  alwaysSpeakOutLoud: boolean;
  onToggleAlwaysSpeakOutLoud: () => void;
  isScreensaverMode: boolean;
  onToggleScreensaver: () => void;
  onActivateDesktopBackground?: () => void;
  isMobileSimMode: boolean;
  onToggleMobileSim: () => void;
  isDarkMode: boolean;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  timeStr,
  day,
  timeScale,
  onSetTimeScale,
  cutawayMode,
  onSetCutawayMode,
  activeFloor,
  onSelectFloor,
  funds,
  characters,
  selectedCharId,
  onSelectCharacter,
  onOpenEntityVoiceChat,
  onOpenOmniscientHouse,
  onOpenSystems,
  onOpenWorldSaves,
  onOpenCreationTools,
  showGrid,
  onToggleGrid,
  showPencilOutline,
  onTogglePencilOutline,
  isMuted,
  onToggleMute,
  alwaysSpeakOutLoud,
  onToggleAlwaysSpeakOutLoud,
  isScreensaverMode,
  onToggleScreensaver,
  onActivateDesktopBackground,
  isMobileSimMode,
  onToggleMobileSim,
  isDarkMode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const canStepUp = activeFloor !== 'UPSTAIRS';
  const canStepDown = activeFloor !== 'BASEMENT';

  return (
    <div
      data-testid="bottom-dock"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto max-w-[98vw]"
    >
      {/* Collapse / Expand Toggle Tab */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-3.5 py-1 bg-gray-900/95 hover:bg-gray-800 text-gray-200 text-xs font-semibold rounded-t-xl border-t border-x border-gray-700/80 shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
        aria-label="Toggle Controls Dock"
      >
        {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{isCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
      </button>

      {/* Main Unified Controls Window */}
      {!isCollapsed && (
        <div
          data-testid="controls-window"
          className={`px-4 py-2.5 rounded-2xl border shadow-2xl flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 transition-all duration-200 ${
            isDarkMode
              ? 'bg-gray-950/95 text-gray-100 border-purple-900/70 shadow-purple-950/30'
              : 'bg-white/95 text-gray-800 border-gray-200/90 shadow-black/15'
          }`}
          style={{ maxWidth: 'min(1380px, 98vw)' }}
        >
          {/* 1. Cash Amount + Toon Name Buttons + Autonomous Game Systems Bar */}
          <div
            data-testid="controls-household-and-entity-bar"
            className="flex flex-wrap items-center gap-1.5 pr-3 border-r border-gray-300 dark:border-gray-800"
          >
            {/* Cash Amount */}
            <span
              data-testid="controls-cash-amount"
              className="px-2.5 py-1 rounded-xl font-mono text-xs font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-700/80 shadow-xs"
              title="Current Household Cash Amount"
            >
              §{funds.toLocaleString()}
            </span>

            {/* Toon Name Buttons (Quick access to Read-Only Toon Life List) */}
            <div
              data-testid="controls-toon-names-list"
              className="flex flex-wrap items-center gap-1.5"
            >
              {characters.map((c) => {
                const isSelected = selectedCharId === c.id;
                return (
                  <button
                    key={c.id}
                    data-testid={`select-char-btn-${c.id}`}
                    onClick={() => onSelectCharacter(c.id)}
                    title={`Inspect ${c.name}'s Autonomous Life List`}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                        : 'bg-gray-900/90 hover:bg-gray-800 text-gray-100 border-gray-700'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span>{c.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Systems (1-10 Autonomous AI Mechanics Console) */}
            {onOpenSystems && (
              <button
                onClick={onOpenSystems}
                data-testid="controls-open-systems-btn"
                title="Open Autonomous AI Simulation Systems & 1–10 Mechanics Console"
                className="px-2.5 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-extrabold flex items-center gap-1.5 border border-cyan-400/80 shadow-sm transition-all cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Systems</span>
              </button>
            )}

            {/* The House - Omniscient */}
            <button
              onClick={onOpenOmniscientHouse || onOpenEntityVoiceChat}
              data-testid="controls-open-omniscient-house-btn"
              title="Open The House - Omniscient (Entity Conversation, Persuasion, Cross-World Memory & Logs)"
              className="px-2.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-extrabold flex items-center gap-1.5 border border-purple-400/80 shadow-sm transition-all cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>The House - Omniscient</span>
            </button>

            {/* Purple "Voice [V]" Button to Converse with the Entity */}
            <button
              onClick={onOpenEntityVoiceChat}
              data-testid="controls-voice-entity-btn"
              title="Converse with the Entity by Voice (Hotkey: V)"
              className="px-2.5 py-1.5 rounded-xl bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-xs font-extrabold flex items-center gap-1 border border-fuchsia-400/80 shadow-sm transition-all cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice [V]</span>
            </button>

            {/* Save / Load Worlds Manager Button */}
            {onOpenWorldSaves && (
              <button
                onClick={onOpenWorldSaves}
                data-testid="controls-open-world-saves-btn"
                title="Save & Load Worlds (Store/Restore 3D House Blueprints, Furnishings & Residents)"
                className="px-2.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-extrabold flex items-center gap-1.5 border border-sky-400/80 shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save / Load Worlds</span>
              </button>
            )}

            {/* Switch to Creation Tools App Button */}
            {onOpenCreationTools && (
              <button
                onClick={onOpenCreationTools}
                data-testid="controls-open-creation-tools-btn"
                title="Switch to the 'Creation Tools' App (Build House, Asset Studio, Character Creator CAS, Room Studio & Scenario Creator)"
                className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold flex items-center gap-1.5 border border-amber-400/80 shadow-sm transition-all cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Creation Tools</span>
              </button>
            )}
          </div>

          {/* 2. Sims-Style Stacked Multi-Level Floor Switcher (Up Arrow + Stack of Sideways Floor Squares + Down Arrow) */}
          <div
            data-testid="sims-floor-switcher"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 pr-3"
            title="Switch Active Floor Level (Upstairs 2F / Main 1F / Basement B1)"
          >
            {/* Up Floor Arrow */}
            <button
              type="button"
              data-testid="floor-switch-up-btn"
              disabled={!canStepUp}
              onClick={() => onSelectFloor(stepFloorLevel(activeFloor, 'UP'))}
              aria-label="Go Up One Floor"
              title="Go Up One Floor Level"
              className={`p-1 rounded-lg border transition-colors ${
                canStepUp
                  ? 'bg-white dark:bg-gray-800 hover:bg-indigo-600 hover:text-white text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 cursor-pointer'
                  : 'opacity-35 cursor-not-allowed border-transparent text-gray-400'
              }`}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>

            {/* Vertical Stack of Sideways Isometric "Floors" */}
            <div
              data-testid="floor-stack-selector"
              className="flex flex-col items-center gap-[3px] px-1.5 py-0.5"
            >
              {FLOOR_LEVELS_ORDER.map((lvl) => {
                const isActive = activeFloor === lvl;
                const meta = FLOOR_LEVEL_METADATA[lvl];
                return (
                  <button
                    key={lvl}
                    type="button"
                    data-testid={`floor-stack-btn-${lvl}`}
                    onClick={() => onSelectFloor(lvl)}
                    aria-label={`Select ${meta.label} (${meta.code})`}
                    title={`${meta.label} (${meta.code} · ${meta.elevationLabel})`}
                    style={{ transform: 'skewX(-28deg)' }}
                    className={`w-9 h-3.5 rounded-[3px] border text-[8px] font-mono font-extrabold leading-none flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-300 shadow-xs scale-105 z-10'
                        : 'bg-gray-300/90 hover:bg-indigo-400/70 dark:bg-gray-700 dark:hover:bg-indigo-800 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-600'
                    }`}
                  >
                    <span style={{ transform: 'skewX(28deg)' }}>{meta.code}</span>
                  </button>
                );
              })}
            </div>

            {/* Down Floor Arrow */}
            <button
              type="button"
              data-testid="floor-switch-down-btn"
              disabled={!canStepDown}
              onClick={() => onSelectFloor(stepFloorLevel(activeFloor, 'DOWN'))}
              aria-label="Go Down One Floor"
              title="Go Down One Floor Level"
              className={`p-1 rounded-lg border transition-colors ${
                canStepDown
                  ? 'bg-white dark:bg-gray-800 hover:bg-indigo-600 hover:text-white text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 cursor-pointer'
                  : 'opacity-35 cursor-not-allowed border-transparent text-gray-400'
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <span
              data-testid="active-floor-label"
              className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 min-w-[54px] text-center"
            >
              {FLOOR_LEVEL_METADATA[activeFloor].label.split(' ')[0]}
            </span>
          </div>

          {/* 3. Clock & Speed Section */}
          <div className="flex items-center gap-2 pr-3 border-r border-gray-300 dark:border-gray-800">
            <div className="text-left leading-tight min-w-[66px]">
              <span className="block text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
                Day {day}
              </span>
              <span className="font-mono font-extrabold text-sm tabular-nums tracking-tight">
                {timeStr}
              </span>
            </div>

            <div className="flex items-center bg-gray-100 dark:bg-gray-850 p-0.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onSetTimeScale(0)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  timeScale === 0
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Pause Simulation"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSetTimeScale(1)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  timeScale === 1
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="1x Real Pacing"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSetTimeScale(3)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  timeScale === 3
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="3x Time Scale (20m = 1hr)"
              >
                3x
              </button>
              <button
                onClick={() => onSetTimeScale(5)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  timeScale === 5
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="5x Fast Forward"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4. Wall Cutaway Mode Segmented Control */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-850 p-0.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => onSetCutawayMode('CUTAWAY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                cutawayMode === 'CUTAWAY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Cutaway
            </button>
            <button
              onClick={() => onSetCutawayMode('WALLS_UP')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                cutawayMode === 'WALLS_UP'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Walls Up
            </button>
            <button
              onClick={() => onSetCutawayMode('WALLS_DOWN')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                cutawayMode === 'WALLS_DOWN'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Walls Down
            </button>
          </div>

          {/* 5. View Toggles: Grid & Pencil */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleGrid}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showGrid
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/80 dark:border-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="Toggle Lot Grid Lines"
            >
              <Grid className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePencilOutline}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showPencilOutline
                  ? 'bg-amber-50 border-amber-400 text-amber-700 dark:bg-amber-950/80 dark:border-amber-600 dark:text-amber-300 shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="Toggle 1-Pixel Sobel Pencil-Outline Shader"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>

          {/* 6. Voice Engine + Mute + Screensaver / Desktop BG */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleAlwaysSpeakOutLoud}
              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                alwaysSpeakOutLoud
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950/80 dark:border-emerald-600 dark:text-emerald-300 shadow-xs'
                  : 'bg-indigo-50/70 border-indigo-300 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-700 dark:text-indigo-300'
              }`}
              title={
                alwaysSpeakOutLoud
                  ? 'Peanuts Trombone + Real English TTS Voice: ON'
                  : 'Click to always speak toon thoughts out loud in English (TTS)'
              }
            >
              {alwaysSpeakOutLoud ? (
                <Mic className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              ) : (
                <Radio className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span className="hidden sm:inline">
                {alwaysSpeakOutLoud ? 'Voice: Peanuts + TTS' : 'Voice: Peanuts Horn'}
              </span>
              <span className="sm:hidden">{alwaysSpeakOutLoud ? 'TTS ON' : 'Horn'}</span>
            </button>

            <button
              onClick={onToggleMute}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-red-50 border-red-300 text-red-600 dark:bg-red-950 dark:border-red-800'
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleScreensaver}
              data-testid="activate-screensaver-btn"
              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                isScreensaverMode
                  ? 'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-200 shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Screensaver Mode: Hides all UI, mutes audio, and follows toons"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Screensaver</span>
            </button>

            {onActivateDesktopBackground && (
              <button
                onClick={onActivateDesktopBackground}
                data-testid="activate-desktop-bg-btn"
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer"
                title="Desktop Background Mode: No UI, no sound, camera follows toons"
              >
                <span className="hidden sm:inline">Desktop BG</span>
                <span className="sm:hidden">BG</span>
              </button>
            )}

            <button
              onClick={onToggleMobileSim}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isMobileSimMode
                  ? 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-300 shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="Toggle Remote Observation View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

