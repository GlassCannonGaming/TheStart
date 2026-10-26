/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Hammer,
  Sparkles,
  UserPlus,
  Grid,
  BookOpen,
  Play,
  Save,
  CheckCircle2,
  PackagePlus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  APPLICATION_SYSTEM_MANIFEST,
  Character,
  CreationToolSystemId,
  SmartObject,
} from '../game/simulation';
import { PremadeRoomTemplate, WorldBlueprint } from '../game/worldBuilder';

interface CreationToolsSuiteProps {
  activeTool: CreationToolSystemId;
  onSelectTool: (tool: CreationToolSystemId) => void;
  onReturnToTheHouse: () => void;
  characters: Character[];
  smartObjects: SmartObject[];
  customPremadeRooms: PremadeRoomTemplate[];
  worldBlueprint: WorldBlueprint;
  funds: number;
  onOpenAssetStudioModal: () => void;
  onOpenCASModal: () => void;
  onOpenRoomStudioModal: () => void;
  onOpenScenarioModal: () => void;
  onOpenWorldSavesModal: () => void;
  onGenerateEntity3DAsset: (
    prompt: string,
    roomOverride?: string
  ) => { smartObject: SmartObject; placementSummary: string };
  isDarkMode: boolean;
}

const TOOL_ICONS: Record<CreationToolSystemId, React.ReactNode> = {
  HOUSE_BUILDER: <Hammer className="w-3.5 h-3.5" />,
  ASSET_STUDIO: <Sparkles className="w-3.5 h-3.5" />,
  CAS_STUDIO: <UserPlus className="w-3.5 h-3.5" />,
  ROOM_STUDIO: <Grid className="w-3.5 h-3.5" />,
  WORLD_SCENARIO_CREATOR: <BookOpen className="w-3.5 h-3.5" />,
};

export const CreationToolsSuite: React.FC<CreationToolsSuiteProps> = ({
  activeTool,
  onSelectTool,
  onReturnToTheHouse,
  characters,
  smartObjects,
  customPremadeRooms,
  onOpenAssetStudioModal,
  onOpenCASModal,
  onOpenRoomStudioModal,
  onOpenScenarioModal,
  onOpenWorldSavesModal,
  onGenerateEntity3DAsset,
  isDarkMode,
}) => {
  const [quick3DPrompt, setQuick3DPrompt] = useState('');
  const [quick3DRoom, setQuick3DRoom] = useState('LivingRoom');
  const [lastCreatedBanner, setLastCreatedBanner] = useState<string | null>(null);
  const [showQuickForge, setShowQuickForge] = useState(false);

  const handleQuickForgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quick3DPrompt.trim()) return;
    const res = onGenerateEntity3DAsset(quick3DPrompt.trim(), quick3DRoom);
    setLastCreatedBanner(
      `Created 3D Asset "${res.smartObject.name}" (${res.placementSummary}) — synced to The House!`
    );
    setQuick3DPrompt('');
  };

  const handleTriggerToolAction = (toolId: CreationToolSystemId) => {
    onSelectTool(toolId);
    if (toolId === 'ASSET_STUDIO') {
      onOpenAssetStudioModal();
    } else if (toolId === 'CAS_STUDIO') {
      onOpenCASModal();
    } else if (toolId === 'ROOM_STUDIO') {
      onOpenRoomStudioModal();
    } else if (toolId === 'WORLD_SCENARIO_CREATOR') {
      onOpenScenarioModal();
    }
  };

  return (
    <div
      data-testid="creation-tools-app-shell"
      className="fixed top-3 left-[400px] right-3 z-40 pointer-events-none flex flex-col items-end"
    >
      {/* Single-Row Top Studio Bar aligned beside the App Switcher */}
      <div
        className={`pointer-events-auto w-full rounded-2xl border shadow-2xl px-2.5 py-1.5 transition-all ${
          isDarkMode
            ? 'bg-gray-950/95 text-gray-100 border-amber-500/60'
            : 'bg-gray-900/95 text-white border-amber-500/70'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
          {/* 5 User Asset Creation Tool Tabs */}
          <div
            data-testid="creation-tools-nav-tabs"
            className="flex items-center gap-1 shrink-0"
          >
            {(
              [
                'HOUSE_BUILDER',
                'ASSET_STUDIO',
                'CAS_STUDIO',
                'ROOM_STUDIO',
                'WORLD_SCENARIO_CREATOR',
              ] as CreationToolSystemId[]
            ).map((toolId) => {
              const sys = APPLICATION_SYSTEM_MANIFEST[toolId];
              const isSelected = activeTool === toolId;
              return (
                <button
                  key={toolId}
                  type="button"
                  data-testid={`creation-tool-tab-${toolId}`}
                  onClick={() => handleTriggerToolAction(toolId)}
                  title={`${sys.title}: ${sys.description}`}
                  className={`px-2 py-1 rounded-xl border text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-500 text-gray-950 border-amber-300 shadow-sm'
                      : 'bg-gray-900 hover:bg-gray-800 border-gray-700 text-gray-200'
                  }`}
                >
                  {TOOL_ICONS[toolId]}
                  <span>{sys.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Right-side Asset Counter + Quick 3D Asset Forge Toggle + Save + Play in The House */}
          <div className="flex items-center gap-1 shrink-0">
            <span
              data-testid="creation-tools-asset-registry-summary"
              className="hidden 2xl:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-900 border border-gray-800 text-[10px] font-mono text-gray-300 whitespace-nowrap"
            >
              <span>{smartObjects.length} Obj</span>
              <span>·</span>
              <span>{characters.length} Toons</span>
              <span>·</span>
              <span>{customPremadeRooms.length} Rooms</span>
            </span>

            <button
              type="button"
              onClick={() => setShowQuickForge(!showQuickForge)}
              data-testid="toggle-quick-3d-forge-btn"
              className="px-2.5 py-1 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold flex items-center gap-1 border border-purple-400/70 transition cursor-pointer whitespace-nowrap"
              title="Toggle Quick 3D Procedural Asset Forge"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>3D Forge</span>
              {showQuickForge ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenWorldSavesModal}
              data-testid="creation-tools-save-load-btn"
              className="px-2.5 py-1 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1 border border-sky-400/70 transition cursor-pointer whitespace-nowrap"
              title="Save or Export Created World & Assets"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={onReturnToTheHouse}
              data-testid="return-to-the-house-btn"
              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 border border-indigo-400 shadow-md transition cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Play &quot;The House&quot;</span>
            </button>
          </div>
        </div>

        {/* Expandable Quick 3D Procedural Asset Forge Drawer */}
        {showQuickForge && (
          <form
            onSubmit={handleQuickForgeSubmit}
            data-testid="creation-tools-quick-3d-forge-form"
            className="mt-2 pt-2 border-t border-gray-800 flex flex-wrap items-center gap-2"
          >
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 shrink-0">
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Quick 3D Asset Forge:</span>
            </span>
            <input
              type="text"
              value={quick3DPrompt}
              onChange={(e) => setQuick3DPrompt(e.target.value)}
              placeholder="Describe any custom 3D furniture/object (e.g., Clawfoot Bathtub, Arcade Cabinet, Espresso Bar)..."
              data-testid="creation-tools-3d-prompt-input"
              className="flex-1 min-w-[220px] px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-amber-400"
            />
            <select
              value={quick3DRoom}
              onChange={(e) => setQuick3DRoom(e.target.value)}
              data-testid="creation-tools-3d-room-select"
              className="px-2 py-1 rounded-lg bg-gray-900 border border-gray-700 text-xs font-bold text-gray-200"
            >
              <option value="LivingRoom">LivingRoom</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Bedroom">Bedroom</option>
              <option value="Bathroom">Bathroom</option>
              <option value="Study">Study</option>
              <option value="Basement">Basement</option>
              <option value="Backyard">Backyard</option>
            </select>
            <button
              type="submit"
              data-testid="creation-tools-3d-forge-submit-btn"
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold transition cursor-pointer shrink-0"
            >
              Create 3D Asset
            </button>
          </form>
        )}

        {lastCreatedBanner && (
          <div
            data-testid="creation-tools-created-banner"
            className="mt-2 px-3 py-1 rounded-xl bg-emerald-950/90 border border-emerald-600/70 text-emerald-200 text-xs flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{lastCreatedBanner}</span>
            </span>
            <button
              type="button"
              onClick={() => setLastCreatedBanner(null)}
              className="text-emerald-300 hover:text-white text-xs px-1.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
