/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Hammer,
  Trash2,
  RotateCw,
  Sparkles,
  Grid,
  Home,
  Check,
  Wand2,
  Layers,
  DoorOpen,
  Trees,
  Sofa,
  PaintBucket,
  X,
  PlusCircle,
  Undo2,
  Save,
} from 'lucide-react';
import {
  BuildCategory,
  BuildToolMode,
  BuildingPartDefinition,
  FurnishSubcategory,
  HOUSE_FOOTPRINT_PRESETS,
  WORLD_BUILDER_CATALOG,
  WorldBlueprint,
} from '../game/worldBuilder';
import { SmartObject } from '../game/simulation';
import { WallCutawayMode } from '../game/sceneBuilder';

interface SimsWorldBuilderHUDProps {
  blueprint: WorldBlueprint;
  selectedPart: BuildingPartDefinition | null;
  onSelectPart: (part: BuildingPartDefinition | null) => void;
  toolMode: BuildToolMode;
  onSetToolMode: (mode: BuildToolMode) => void;
  partRotationY: number;
  onRotatePart: () => void;
  onStartEmptyGrid: () => void;
  onRestoreStarterHouse: () => void;
  onQuickPlacePart: (part: BuildingPartDefinition) => void;
  onGenerateWorldFromPrompt: (prompt: string) => Promise<void>;
  onGenerateEntity3DAsset?: (
    prompt: string,
    roomOverride?: string
  ) => { smartObject: SmartObject; placementSummary: string };
  isGeneratingWorld: boolean;
  funds: number;
  cutawayMode: WallCutawayMode;
  onSetCutawayMode: (mode: WallCutawayMode) => void;
  targetRoomForPaint: string;
  onSetTargetRoomForPaint: (room: string) => void;
  onApplyWallpaper: (room: string, styleId: string, cost: number) => void;
  onApplyFloorPattern: (room: string, styleId: string, cost: number) => void;
  onExitBuildMode: () => void;
  onOpenRoomArchitectStudio?: () => void;
  onOpenWorldSaves?: () => void;
}

const CATEGORY_TABS: Array<{
  id: BuildCategory;
  label: string;
  shortLabel: string;
  badgeColor: string;
}> = [
  { id: 'rooms_walls', label: 'Rooms & Walls', shortLabel: 'Rooms/Walls', badgeColor: '#f59e0b' },
  { id: 'doors_windows', label: 'Doors & Windows', shortLabel: 'Doors/Win', badgeColor: '#38bdf8' },
  { id: 'roofs', label: 'Roofs & Skylights', shortLabel: 'Roofs', badgeColor: '#ef4444' },
  { id: 'foundations_decks', label: 'Decks, Stairs & Fences', shortLabel: 'Decks/Stairs', badgeColor: '#a855f7' },
  { id: 'wall_patterns', label: 'Wallpapers & Brick', shortLabel: 'Wallpapers', badgeColor: '#ec4899' },
  { id: 'floor_patterns', label: 'Floors & Carpets', shortLabel: 'Flooring', badgeColor: '#14b8a6' },
  { id: 'landscaping', label: 'Trees, Pools & Yard', shortLabel: 'Yard/Pools', badgeColor: '#22c55e' },
  { id: 'furnishings', label: 'Objects by Room', shortLabel: 'Furnishings', badgeColor: '#6366f1' },
];

const PROMPT_PRESETS = [
  'Cozy L-shaped 2-bedroom Craftsman cottage with an artist studio, backyard pool, and 3 creative roommates',
  'Sleek T-shaped Mid-Century Modern glass pavilion with gourmet chef kitchen, espresso bar, and tech founders',
  'Mysterious U-shaped Courtyard Gothic Revival manor with a library study, fireplace parlor, and eccentric heirs',
];

const QUICK_3D_ASSETS = [
  { label: 'Crystal Alchemy Table', prompt: 'Crystal Alchemy Table with glowing orbs', room: 'Study' },
  { label: 'Royal Canopy Bed', prompt: 'Royal Four-Poster Canopy Bed', room: 'Bedroom' },
  { label: 'Clawfoot Spa Sanctuary', prompt: 'Clawfoot Spa Bathtub with candles', room: 'Bathroom' },
  { label: 'Concert Grand Piano', prompt: 'Concert Grand Piano with brass pedals', room: 'LivingRoom' },
  { label: 'Artisan Banquet Table', prompt: 'Artisan Banquet Hearth Table with feast', room: 'Kitchen' },
  { label: 'Courtyard Fountain', prompt: 'Sculpted Marble Courtyard Fountain', room: 'Backyard' },
];

export const SimsWorldBuilderHUD: React.FC<SimsWorldBuilderHUDProps> = ({
  blueprint,
  selectedPart,
  onSelectPart,
  toolMode,
  onSetToolMode,
  partRotationY,
  onRotatePart,
  onStartEmptyGrid,
  onRestoreStarterHouse,
  onQuickPlacePart,
  onGenerateWorldFromPrompt,
  onGenerateEntity3DAsset,
  isGeneratingWorld,
  funds,
  cutawayMode,
  onSetCutawayMode,
  targetRoomForPaint,
  onSetTargetRoomForPaint,
  onApplyWallpaper,
  onApplyFloorPattern,
  onExitBuildMode,
  onOpenRoomArchitectStudio,
  onOpenWorldSaves,
}) => {
  const [activeCategory, setActiveCategory] = useState<BuildCategory>('rooms_walls');
  const [furnishSub, setFurnishSub] = useState<FurnishSubcategory>('all');
  const [scenarioPrompt, setScenarioPrompt] = useState<string>('');
  const [showPromptPanel, setShowPromptPanel] = useState<boolean>(false);
  const [assetPrompt, setAssetPrompt] = useState<string>('');
  const [assetRoom, setAssetRoom] = useState<string>('LivingRoom');
  const [lastForgedBanner, setLastForgedBanner] = useState<string | null>(null);

  const filteredParts = WORLD_BUILDER_CATALOG.filter((item) => {
    if (item.category !== activeCategory) return false;
    if (activeCategory === 'furnishings' && furnishSub !== 'all') {
      return item.subcategory === furnishSub;
    }
    return true;
  });

  const handleSelectCategory = (cat: BuildCategory) => {
    setActiveCategory(cat);
    const firstPart = WORLD_BUILDER_CATALOG.find((p) => p.category === cat);
    if (firstPart && firstPart.partType !== 'WALLPAPER' && firstPart.partType !== 'FLOOR_PATTERN') {
      onSelectPart(firstPart);
      onSetToolMode('PLACE');
    }
  };

  const handleSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioPrompt.trim() || isGeneratingWorld) return;
    await onGenerateWorldFromPrompt(scenarioPrompt.trim());
    setShowPromptPanel(false);
  };

  const handleForge3DAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetPrompt.trim() || !onGenerateEntity3DAsset) return;
    const res = onGenerateEntity3DAsset(assetPrompt.trim(), assetRoom);
    setLastForgedBanner(res.placementSummary);
    setAssetPrompt('');
  };

  const rotationDegrees = Math.round(((partRotationY * 180) / Math.PI) % 360);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between select-none"
      data-testid="sims-world-builder-hud"
    >
      {/* 1. TOP-CENTER HYBRID BUILD MODE TOOLBAR (Paralives + Sims 4 + Tiny Glade) */}
      <div className="w-full flex flex-col items-center pt-3 px-4 gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-slate-950/95 text-slate-100 border border-slate-700 rounded-2xl px-4 py-2 shadow-2xl flex flex-wrap items-center gap-2.5 max-w-[96vw]">
          {/* Mode Title & Household Funds */}
          <div className="flex items-center gap-2.5 pr-3 border-r border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Hammer className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold tracking-tight flex items-center gap-2">
                <span>HYBRID HOUSE ARCHITECT</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  §{funds.toLocaleString()}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {blueprint.isEmptyGridMode
                  ? `Custom Multi-Wing Lot (${blueprint.placedParts.length} architectural parts placed)`
                  : 'Editing Multi-Wing L-Shaped Estate (Quoin Corner Pillars + Carved Windows/Doors)'}
              </div>
            </div>
          </div>

          {/* Core Build Tools (Place, Sledgehammer, Rotate, Empty Grid Bulldoze) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSetToolMode('PLACE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                toolMode === 'PLACE'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="Click on the 3D lot grid to place the selected building part or room"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Place on Grid</span>
            </button>

            <button
              onClick={() => onSetToolMode('SLEDGEHAMMER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                toolMode === 'SLEDGEHAMMER'
                  ? 'bg-red-600 text-white border-red-400 shadow'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="Sledgehammer Tool: Click any placed part or furniture on the 3D grid to demolish & refund §"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Sledgehammer</span>
            </button>

            <button
              onClick={onRotatePart}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Rotate active building part 90 degrees (Shortcut: R)"
            >
              <RotateCw className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono">{rotationDegrees}° (R)</span>
            </button>
          </div>

          {/* Empty Grid / Bulldoze Lot & Restore Starter House */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <button
              onClick={onStartEmptyGrid}
              data-testid="start-empty-grid-btn"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                blueprint.isEmptyGridMode && blueprint.placedParts.length === 0
                  ? 'bg-amber-600 text-white border-amber-400'
                  : 'bg-amber-950/90 hover:bg-amber-900 text-amber-200 border-amber-600/80'
              }`}
              title="Bulldoze the lot to a completely Empty 36x36 Grid and build your own house from scratch"
            >
              <Grid className="w-3.5 h-3.5 text-amber-400" />
              <span>Start Empty Grid</span>
            </button>

            {blueprint.isEmptyGridMode && (
              <button
                onClick={onRestoreStarterHouse}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Restore the default multi-wing L-shaped Craftsman estate"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Default Estate</span>
              </button>
            )}
          </div>

          {/* AI Prompt Scenario & World Builder Toggle */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <button
              onClick={() => setShowPromptPanel(!showPromptPanel)}
              data-testid="open-ai-world-prompt-btn"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 text-xs font-extrabold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Multi-Wing House &amp; 3D Asset Studio</span>
            </button>

            {/* Wall Cutaway Cycle */}
            <button
              onClick={() => {
                const next: WallCutawayMode =
                  cutawayMode === 'CUTAWAY'
                    ? 'WALLS_UP'
                    : cutawayMode === 'WALLS_UP'
                    ? 'WALLS_DOWN'
                    : 'CUTAWAY';
                onSetCutawayMode(next);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Cycle Wall Cutaway Mode"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>{cutawayMode === 'WALLS_UP' ? 'Walls Up + Roof' : cutawayMode === 'CUTAWAY' ? 'Cutaway' : 'Walls Down'}</span>
            </button>

            {/* Open Pre-Made Rooms & Blank Grid Pathing Studio */}
            {onOpenRoomArchitectStudio && (
              <button
                onClick={onOpenRoomArchitectStudio}
                data-testid="open-room-architect-from-builder-btn"
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white border border-teal-400 text-xs font-extrabold flex items-center gap-1.5 shadow transition cursor-pointer"
                title="Open Blank Grid Room Designer & Pre-Made Rooms Pathing Database"
              >
                <DoorOpen className="w-3.5 h-3.5" />
                <span>Pre-Made Rooms &amp; Pathing DB</span>
              </button>
            )}

            {/* Save / Load World Button inside House Builder */}
            {onOpenWorldSaves && (
              <button
                onClick={onOpenWorldSaves}
                data-testid="builder-open-world-saves-btn"
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 text-xs font-extrabold flex items-center gap-1.5 shadow transition cursor-pointer"
                title="Save or Load a Complete World & House Blueprint"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save / Load World</span>
              </button>
            )}

            {/* Prominent Exit House Building Button */}
            <button
              onClick={onExitBuildMode}
              data-testid="exit-world-builder-btn"
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 text-xs font-extrabold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              title="Exit House Building Feature and return to Live Simulation (Shortcut: ESC)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit House Builder [ESC]</span>
            </button>
          </div>
        </div>

        {/* AI MULTI-WING ARCHITECT & ENTITY 3D ASSET FORGE DRAWER */}
        {showPromptPanel && (
          <div
            className="pointer-events-auto w-full max-w-4xl bg-slate-950/95 text-slate-100 border-2 border-indigo-500/80 rounded-2xl p-4 shadow-2xl space-y-3"
            data-testid="ai-world-prompt-drawer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                  Non-Square Multi-Wing House Architect &amp; Entity 3D Asset Forge
                </h3>
              </div>
              <button
                onClick={() => setShowPromptPanel(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Non-Square Multi-Wing Architectural Footprint Presets */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1.5">
                1. Non-Square Multi-Wing House Footprints (Paralives + Sims 4 + Tiny Glade)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HOUSE_FOOTPRINT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`footprint-preset-btn-${preset.id}`}
                    disabled={isGeneratingWorld}
                    onClick={() => onGenerateWorldFromPrompt(preset.promptHint)}
                    className="text-left p-2 rounded-xl bg-slate-950 hover:bg-indigo-950/90 border border-slate-700 hover:border-indigo-400 transition cursor-pointer"
                  >
                    <div className="text-[11px] font-extrabold text-white">{preset.label}</div>
                    <div className="text-[9px] text-slate-400 line-clamp-2 mt-0.5">
                      {preset.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Scenario & House Generator */}
            <form onSubmit={handleSubmitPrompt} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={scenarioPrompt}
                onChange={(e) => setScenarioPrompt(e.target.value)}
                placeholder="Describe any non-square house layout & household scenario (e.g., L-shaped artisan cottage with pool)..."
                data-testid="world-builder-prompt-input"
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                disabled={isGeneratingWorld || !scenarioPrompt.trim()}
                data-testid="world-builder-prompt-submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{isGeneratingWorld ? 'Constructing Lot...' : 'Generate Multi-Wing House'}</span>
              </button>
            </form>

            {/* Entity 3D Asset Generator & In-Game Placer */}
            {onGenerateEntity3DAsset && (
              <div
                data-testid="entity-3d-asset-forge-panel"
                className="bg-purple-950/35 border border-purple-500/50 rounded-xl p-2.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300">
                    2. Entity Procedural 3D Asset Forge &amp; In-Game Placer
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300">
                    Multi-Primitive PBR 3D Mesh Synthesis
                  </span>
                </div>
                <form onSubmit={handleForge3DAsset} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={assetPrompt}
                    onChange={(e) => setAssetPrompt(e.target.value)}
                    placeholder="Prompt any 3D asset (e.g., Crystal Alchemy Table, Royal Canopy Bed, Grand Piano)..."
                    data-testid="entity-3d-asset-prompt-input"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-purple-700/70 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
                  />
                  <select
                    value={assetRoom}
                    onChange={(e) => setAssetRoom(e.target.value)}
                    data-testid="entity-3d-asset-room-select"
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-purple-700/70 text-xs text-purple-200 font-bold"
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
                    disabled={!assetPrompt.trim()}
                    data-testid="entity-3d-asset-submit-btn"
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white text-xs font-extrabold transition cursor-pointer shrink-0"
                  >
                    Forge &amp; Place 3D Asset
                  </button>
                </form>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-purple-300 mr-1">Instant 3D Assets:</span>
                  {QUICK_3D_ASSETS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      data-testid={`quick-forge-3d-${item.room.toLowerCase()}`}
                      onClick={() => {
                        const res = onGenerateEntity3DAsset(item.prompt, item.room);
                        setLastForgedBanner(res.placementSummary);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-purple-900/60 hover:bg-purple-600 text-purple-100 border border-purple-500/40 transition cursor-pointer"
                    >
                      + {item.label} ({item.room})
                    </button>
                  ))}
                </div>
                {lastForgedBanner && (
                  <div
                    data-testid="entity-3d-forged-banner"
                    className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-600/60 rounded-lg px-2.5 py-1"
                  >
                    ✦ {lastForgedBanner}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. BOTTOM SIMS 4 BUILD/BUY DOCK (Interactive House Diagram + Scrolling Swatch Catalog) */}
      <div className="w-full px-3 pb-3 pointer-events-none flex justify-center">
        <div className="pointer-events-auto w-full max-w-6xl bg-slate-950/95 text-slate-100 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          {/* LEFT PANE: Authentic Sims 4 Interactive House Diagram Selector */}
          <div className="w-full md:w-72 bg-slate-900/95 border-b md:border-b-0 md:border-r border-slate-800 p-3 flex flex-col justify-between shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" />
                <span>Interactive Build Diagram</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Click Part</span>
            </div>

            {/* Clickable SVG Architectural House Cross-Section */}
            <div className="relative w-full h-40 bg-slate-950 rounded-xl border border-slate-800 p-2 flex items-center justify-center">
              <svg viewBox="0 0 260 145" className="w-full h-full">
                {/* Sky / Yard Backdrop */}
                <rect x="4" y="4" width="252" height="137" rx="8" fill="#0f172a" />

                {/* 1. ROOF (Clickable Triangle) */}
                <g
                  onClick={() => handleSelectCategory('roofs')}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                >
                  <polygon
                    points="45,48 130,10 215,48"
                    fill={activeCategory === 'roofs' ? '#ef4444' : '#7c2d12'}
                    stroke={activeCategory === 'roofs' ? '#fca5a5' : '#fdba74'}
                    strokeWidth="2"
                  />
                  <text x="130" y="38" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                    ROOFS
                  </text>
                </g>

                {/* 2. ROOMS & WALLS (Left Room Box) */}
                <g
                  onClick={() => handleSelectCategory('rooms_walls')}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                >
                  <rect
                    x="55"
                    y="48"
                    width="75"
                    height="62"
                    fill={activeCategory === 'rooms_walls' ? '#d97706' : '#334155'}
                    stroke="#94a3b8"
                    strokeWidth="2"
                  />
                  <text x="92" y="72" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold">
                    ROOMS &amp; WALLS
                  </text>
                </g>

                {/* 3. WALL PATTERNS & FLOORING (Right Room Cutaway) */}
                <g
                  onClick={() => handleSelectCategory('wall_patterns')}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                >
                  <rect
                    x="130"
                    y="48"
                    width="75"
                    height="46"
                    fill={activeCategory === 'wall_patterns' ? '#db2777' : '#475569'}
                    stroke="#94a3b8"
                    strokeWidth="2"
                  />
                  <text x="167" y="70" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold">
                    WALLPAPERS
                  </text>
                </g>

                {/* 4. FLOOR PATTERNS (Right Room Floor Strip) */}
                <g
                  onClick={() => handleSelectCategory('floor_patterns')}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                >
                  <rect
                    x="130"
                    y="94"
                    width="75"
                    height="16"
                    fill={activeCategory === 'floor_patterns' ? '#0d9488' : '#78350f'}
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                  />
                  <text x="167" y="105" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                    FLOORING
                  </text>
                </g>

                {/* 5. DOORS & WINDOWS (Overlay on Left Room) */}
                <g
                  onClick={() => handleSelectCategory('doors_windows')}
                  className="cursor-pointer transition-opacity hover:opacity-95"
                >
                  <rect
                    x="68"
                    y="80"
                    width="22"
                    height="30"
                    rx="2"
                    fill={activeCategory === 'doors_windows' ? '#0284c7' : '#1e293b'}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="96"
                    y="80"
                    width="24"
                    height="18"
                    rx="2"
                    fill={activeCategory === 'doors_windows' ? '#0284c7' : '#0ea5e9'}
                    stroke="#e0f2fe"
                    strokeWidth="1.5"
                  />
                  <text x="94" y="106" textAnchor="middle" fill="#bae6fd" fontSize="7.5" fontWeight="bold">
                    DOORS/WIN
                  </text>
                </g>

                {/* 6. FOUNDATIONS, DECKS & STAIRS (Bottom Foundation Strip) */}
                <g
                  onClick={() => handleSelectCategory('foundations_decks')}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                >
                  <rect
                    x="48"
                    y="110"
                    width="164"
                    height="18"
                    rx="3"
                    fill={activeCategory === 'foundations_decks' ? '#9333ea' : '#57534e'}
                    stroke="#d6d3d1"
                    strokeWidth="1.5"
                  />
                  <text x="130" y="122" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold">
                    DECKS • STAIRS • FENCES
                  </text>
                </g>

                {/* 7. LANDSCAPING & POOLS (Left Yard Tree & Pool) */}
                <g
                  onClick={() => handleSelectCategory('landscaping')}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                >
                  <circle
                    cx="26"
                    cy="76"
                    r="16"
                    fill={activeCategory === 'landscaping' ? '#16a34a' : '#15803d'}
                    stroke="#86efac"
                    strokeWidth="1.5"
                  />
                  <rect x="23" y="92" width="6" height="18" fill="#78350f" />
                  <text x="26" y="79" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">
                    YARD
                  </text>
                </g>

                {/* 8. FURNISHINGS BY ROOM (Right Sofa Badge) */}
                <g
                  onClick={() => handleSelectCategory('furnishings')}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                >
                  <rect
                    x="212"
                    y="62"
                    width="40"
                    height="46"
                    rx="6"
                    fill={activeCategory === 'furnishings' ? '#4f46e5' : '#312e81'}
                    stroke="#a5b4fc"
                    strokeWidth="1.5"
                  />
                  <text x="232" y="83" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">
                    OBJECTS
                  </text>
                  <text x="232" y="94" textAnchor="middle" fill="#c7d2fe" fontSize="6.5">
                    BY ROOM
                  </text>
                </g>
              </svg>
            </div>

            {/* Active Tool Status Footer + Bottom Exit Build Mode Button */}
            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <span className="truncate">
                Active:{' '}
                <strong className="text-emerald-400">
                  {toolMode === 'SLEDGEHAMMER'
                    ? 'Sledgehammer (Click 3D Item)'
                    : selectedPart
                    ? selectedPart.name
                    : 'Select a Part'}
                </strong>
              </span>
              <button
                type="button"
                onClick={onExitBuildMode}
                data-testid="exit-world-builder-bottom-btn"
                className="shrink-0 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
              >
                <X className="w-3 h-3" />
                Exit Build [ESC]
              </button>
            </div>
          </div>

          {/* RIGHT PANE: Category Tabs + Subcategory Filter + Scrolling Part Swatch Grid */}
          <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
            {/* Category Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-1">
                {CATEGORY_TABS.map((tab) => {
                  const isActive = activeCategory === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleSelectCategory(tab.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tab.badgeColor }}
                      />
                      <span>{tab.shortLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Room Subcategory Filter when in Furnishings OR Room Selector when in Wall/Floor Patterns */}
              {activeCategory === 'furnishings' && (
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                  {(['all', 'kitchen', 'living', 'bedroom', 'bathroom', 'study', 'outdoor'] as FurnishSubcategory[]).map(
                    (sub) => (
                      <button
                        key={sub}
                        onClick={() => setFurnishSub(sub)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                          furnishSub === sub
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {sub}
                      </button>
                    )
                  )}
                </div>
              )}

              {(activeCategory === 'wall_patterns' || activeCategory === 'floor_patterns') && (
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <PaintBucket className="w-3.5 h-3.5 text-pink-400 ml-1" />
                  <span className="text-[10px] text-slate-400 font-bold mr-1">Target Room:</span>
                  {['LivingRoom', 'Kitchen', 'Bedroom', 'Bathroom', 'Study'].map((r) => (
                    <button
                      key={r}
                      onClick={() => onSetTargetRoomForPaint(r)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        targetRoomForPaint === r
                          ? 'bg-pink-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scrolling Swatch Grid of Building Parts & Objects */}
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-40 overflow-y-auto pr-1">
              {filteredParts.map((part) => {
                const isSelected = selectedPart?.id === part.id;
                const canAfford = funds >= part.cost;

                return (
                  <div
                    key={part.id}
                    onClick={() => {
                      if (part.partType === 'WALLPAPER' && part.styleId) {
                        onApplyWallpaper(targetRoomForPaint, part.styleId, part.cost);
                        return;
                      }
                      if (part.partType === 'FLOOR_PATTERN' && part.styleId) {
                        onApplyFloorPattern(targetRoomForPaint, part.styleId, part.cost);
                        return;
                      }
                      onSelectPart(part);
                      onSetToolMode('PLACE');
                    }}
                    className={`group relative rounded-xl p-2.5 border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-950/90 border-indigo-400 ring-1 ring-indigo-400'
                        : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Swatch Preview Header */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1">
                          <span
                            className="w-4 h-4 rounded-md border border-white/20 shadow-inner shrink-0"
                            style={{ backgroundColor: part.colorHex }}
                          />
                          {part.secondaryColorHex && (
                            <span
                              className="w-3 h-4 rounded-sm border border-white/20 shrink-0"
                              style={{ backgroundColor: part.secondaryColorHex }}
                            />
                          )}
                        </div>
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            canAfford
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : 'bg-red-950 text-red-300'
                          }`}
                        >
                          §{part.cost}
                        </span>
                      </div>

                      {/* Name & Dimensions */}
                      <div className="text-xs font-bold text-slate-100 leading-tight truncate">
                        {part.name}
                      </div>
                      {(part.partType === 'SMART_FURNITURE' || part.partType === 'POOL') &&
                        (part.roomTag || part.smartObjectTemplate?.room) && (
                          <div className="mt-1">
                            <span
                              title={`Room Rule: Must be placed in ${
                                part.smartObjectTemplate?.room || part.roomTag
                              } only`}
                              className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-950/90 text-indigo-300 border border-indigo-500/40"
                            >
                              {part.smartObjectTemplate?.room || part.roomTag} Only
                            </span>
                          </div>
                        )}
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {part.description}
                      </div>
                    </div>

                    {/* Action Row: Click Grid or Quick-Place Button */}
                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[9px] font-mono text-slate-400">
                        {part.partType === 'WALLPAPER' || part.partType === 'FLOOR_PATTERN'
                          ? `Apply to ${targetRoomForPaint}`
                          : `${part.width}×${part.depth}m`}
                      </span>
                      {part.partType !== 'WALLPAPER' && part.partType !== 'FLOOR_PATTERN' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPart(part);
                            onQuickPlacePart(part);
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer"
                          title="Place immediately onto the lot grid"
                        >
                          + Place
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
