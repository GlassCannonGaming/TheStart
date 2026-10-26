/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Box,
  Sliders,
  Grid,
  PaintBucket,
  Layers,
  Home,
  Cpu,
  Check,
  Search,
} from 'lucide-react';
import {
  SmartObject,
  getRequiredRoomForFurniture,
  STARTER_HOUSE_ROOM_BOUNDS,
} from '../game/simulation';
import { COMPLETE_FURNISHINGS_CATALOG, CatalogItem } from '../game/furnishingsCatalog';
import {
  AgentArtClass,
  WALLPAPER_CATALOG,
  CARPET_CATALOG,
  HOME_LAYOUT_PRESETS,
  HomeLayoutPreset,
} from '../AgentArtClass/AgentArtPipeline';

interface AssetStudioModalProps {
  onClose: () => void;
  onAddSmartObject: (object: SmartObject) => void;
  roomWallpapers: Record<string, string>;
  onSelectWallpaper: (room: string, wallpaperId: string) => void;
  roomCarpets: Record<string, string>;
  onSelectCarpet: (room: string, carpetId: string) => void;
  openConceptKitchen: boolean;
  openConceptLiving: boolean;
  onToggleOpenConcept: (target: 'kitchen' | 'living') => void;
  onApplyLayoutPreset: (preset: HomeLayoutPreset) => void;
  funds: number;
  onSpendFunds: (amount: number) => void;
  isDarkMode: boolean;
}

type StudioTab = 'FURNISHINGS' | 'WALLPAPERS' | 'CARPETS' | 'LAYOUTS' | 'AGENT_SYNTH';

const TARGET_ROOMS = ['LivingRoom', 'Kitchen', 'Bedroom', 'Bathroom', 'Study', 'Yard'] as const;

export const AssetStudioModal: React.FC<AssetStudioModalProps> = ({
  onClose,
  onAddSmartObject,
  roomWallpapers,
  onSelectWallpaper,
  roomCarpets,
  onSelectCarpet,
  openConceptKitchen,
  openConceptLiving,
  onToggleOpenConcept,
  onApplyLayoutPreset,
  funds,
  onSpendFunds,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('FURNISHINGS');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoomForStyle, setSelectedRoomForStyle] = useState<string>('LivingRoom');

  // AgentArtClass Custom Synthesis State
  const [prompt, setPrompt] = useState('Vintage Brass Espresso Bar');
  const [room, setRoom] = useState<'Kitchen' | 'LivingRoom' | 'Bedroom' | 'Bathroom' | 'Study' | 'Yard' | 'Basement'>('Kitchen');
  const [maturity, setMaturity] = useState<'ALL' | 'DARK_ONLY'>('ALL');
  const [actionLabel, setActionLabel] = useState('Pulling a rich double espresso shot');
  const [materialFinish, setMaterialFinish] = useState<'Wood' | 'Marble' | 'Steel' | 'Fabric' | 'Glass' | 'Stone'>('Steel');
  const [styleTheme, setStyleTheme] = useState<'Modern' | 'Victorian' | 'Rustic' | 'Gothic' | 'Retro'>('Modern');
  const [cost, setCost] = useState(850);
  const [energyScore, setEnergyScore] = useState(7); // 1-10 AgentArtClass scale
  const [funScore, setFunScore] = useState(6);       // 1-10 AgentArtClass scale
  const [sanityScore, setSanityScore] = useState(7); // 1-10 AgentArtClass scale
  const [envQualityScore, setEnvQualityScore] = useState(8); // 1-10 Surroundings Influence

  const filteredCatalog = COMPLETE_FURNISHINGS_CATALOG.filter((item) => {
    const matchesRoom = roomFilter === 'ALL' || item.room === roomFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.styleTheme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.materialFinish.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRoom && matchesSearch;
  });

  const synthRoomRule = getRequiredRoomForFurniture({ name: prompt });
  const effectiveSynthRoom = synthRoomRule.isRoomRestricted
    ? synthRoomRule.requiredRoom
    : room;

  const handlePlaceCatalogItem = (item: CatalogItem) => {
    const rule = getRequiredRoomForFurniture({
      id: item.id,
      name: item.name,
      category: item.category,
      room: item.room,
      gridPos: item.gridPos,
    });
    const enforcedRoom = rule.isRoomRestricted ? rule.requiredRoom : item.room;
    const bounds = STARTER_HOUSE_ROOM_BOUNDS[enforcedRoom] || STARTER_HOUSE_ROOM_BOUNDS.LivingRoom;
    const basePos = item.gridPos
      ? { ...item.gridPos }
      : { x: bounds.centerX, y: bounds.y, z: bounds.centerZ };

    const newObj: SmartObject = {
      id: `${item.id}_${Date.now()}`,
      name: item.name,
      room: enforcedRoom,
      category: item.category,
      gridPos: basePos,
      state: 'Clean',
      maturity: 'ALL',
      effects: item.effects,
      actionLabel: item.actionLabel,
      durationSeconds: item.durationSeconds,
    };

    onSpendFunds(Math.min(funds, item.cost));
    onAddSmartObject(newObj);
  };

  const handleSynthesizeViaAgentArtClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const targetRoom = effectiveSynthRoom;
    const bounds =
      STARTER_HOUSE_ROOM_BOUNDS[targetRoom] || STARTER_HOUSE_ROOM_BOUNDS.LivingRoom;

    const descriptor = AgentArtClass.buildAssetDescriptor({
      name: prompt.trim(),
      category: 'FURNITURE',
      targetRoom:
        targetRoom === 'Basement' || targetRoom === 'SecondFloor' || targetRoom === 'Hallway'
          ? 'LivingRoom'
          : targetRoom,
      styleTheme,
      materialFinish,
      cost,
      actionLabel,
      motiveRatings1To10: {
        energy: energyScore,
        fun: funScore,
        sanity: sanityScore,
        environmentalInfluence: envQualityScore,
      },
    });

    const basePos = {
      x: bounds.centerX,
      y: bounds.y,
      z: bounds.centerZ,
    };

    const newObj: SmartObject = {
      id: descriptor.id,
      name: descriptor.name,
      room: targetRoom,
      category: targetRoom.toLowerCase() as SmartObject['category'],
      gridPos: basePos,
      state: 'Clean',
      maturity,
      effects: {
        energy: AgentArtClass.scoreToMotiveDelta(energyScore),
        fun: AgentArtClass.scoreToMotiveDelta(funScore),
        sanity: AgentArtClass.scoreToMotiveDelta(sanityScore),
      },
      actionLabel: descriptor.actionLabel,
      durationSeconds: 1800,
    };

    onSpendFunds(Math.min(funds, cost));
    onAddSmartObject(newObj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div
        className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
          isDarkMode
            ? 'bg-gray-950 text-gray-100 border-purple-900/80'
            : 'bg-white text-gray-900 border-gray-200'
        }`}
      >
        {/* Top Studio Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                <span>Home Creation & Build/Buy Catalog</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Household Funds: §{funds.toLocaleString()}
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Scrolling Grid Selector for Objects, Wallpapers, Carpets, Architectural Wall Layouts & AgentArtClass Synthesis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-2 bg-gray-50/40 dark:bg-gray-900/30">
          {[
            { id: 'FURNISHINGS', label: 'Furnishings Grid', icon: Grid },
            { id: 'WALLPAPERS', label: 'Wallpapers', icon: PaintBucket },
            { id: 'CARPETS', label: 'Carpets & Flooring', icon: Layers },
            { id: 'LAYOUTS', label: 'Home Layouts & Walls', icon: Home },
            { id: 'AGENT_SYNTH', label: 'AgentArtClass (Imagen + Meshy)', icon: Cpu },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as StudioTab)}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Scrolling Grid Style Furnishings Selector */}
        {activeTab === 'FURNISHINGS' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {['ALL', 'LivingRoom', 'Kitchen', 'Bedroom', 'Bathroom', 'Study', 'Yard'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoomFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      roomFilter === r
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {r === 'ALL' ? 'All Rooms' : r}
                  </button>
                ))}
              </div>
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search furniture, style..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Scrolling Grid Listing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[52vh] overflow-y-auto pr-1">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/70 hover:border-indigo-500 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-xs text-gray-900 dark:text-gray-100 group-hover:text-indigo-500 transition-colors">
                        {item.name}
                      </h3>
                      <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                        §{item.cost}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span
                        title={`Room Rule: Must be placed in ${item.room} only`}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30"
                      >
                        {item.room} Only
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        {item.styleTheme}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {item.materialFinish}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic">
                      "{item.actionLabel}"
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-200/70 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex gap-1.5 text-[10px] font-mono text-gray-500">
                      {Object.entries(item.effects)
                        .slice(0, 2)
                        .map(([k, v]) => (
                          <span key={k} className="text-emerald-600 dark:text-emerald-400">
                            {k}: +{v}
                          </span>
                        ))}
                    </div>
                    <button
                      onClick={() => handlePlaceCatalogItem(item)}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
                    >
                      + Place on Lot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Scrolling Grid Style Wallpapers */}
        {activeTab === 'WALLPAPERS' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                1. Choose Room to Wallpaper:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TARGET_ROOMS.filter((r) => r !== 'Yard').map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRoomForStyle(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedRoomForStyle === r
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {WALLPAPER_CATALOG.map((wp) => {
                const isSelected = (roomWallpapers[selectedRoomForStyle] || 'wp_classic_wainscot') === wp.id;
                return (
                  <div
                    key={wp.id}
                    onClick={() => onSelectWallpaper(selectedRoomForStyle, wp.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-indigo-400 bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    <div>
                      <div
                        className="w-full h-20 rounded-lg border border-black/10 mb-2.5 flex items-center justify-center relative overflow-hidden shadow-inner"
                        style={{
                          background: `repeating-linear-gradient(90deg, ${wp.baseColorHex}, ${wp.baseColorHex} 14px, ${wp.accentColorHex} 14px, ${wp.accentColorHex} 20px)`,
                        }}
                      >
                        {isSelected && (
                          <span className="p-1 rounded-full bg-indigo-600 text-white shadow">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs">{wp.name}</h4>
                      <span className="text-[10px] text-gray-500 uppercase font-mono">{wp.patternType}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-800 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Env Rating: {wp.environmentRating}/10
                      </span>
                      <span className="font-mono font-bold">§{wp.cost}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Scrolling Grid Style Carpets & Flooring */}
        {activeTab === 'CARPETS' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                1. Choose Room for Flooring / Carpet:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TARGET_ROOMS.filter((r) => r !== 'Yard').map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRoomForStyle(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedRoomForStyle === r
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {CARPET_CATALOG.map((cp) => {
                const isSelected = roomCarpets[selectedRoomForStyle] === cp.id;
                return (
                  <div
                    key={cp.id}
                    onClick={() => onSelectCarpet(selectedRoomForStyle, cp.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-indigo-400 bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    <div>
                      <div
                        className="w-full h-20 rounded-lg border border-black/10 mb-2.5 flex items-center justify-center relative overflow-hidden shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${cp.baseColorHex} 50%, ${cp.secondaryColorHex} 50%)`,
                        }}
                      >
                        {isSelected && (
                          <span className="p-1 rounded-full bg-indigo-600 text-white shadow">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs">{cp.name}</h4>
                      <span className="text-[10px] text-gray-500 uppercase font-mono">{cp.patternType}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-800 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Comfort: {cp.comfortRating}/10
                      </span>
                      <span className="font-mono font-bold">§{cp.cost}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Home Layouts & Error-Free Wall Cutaway Architecture */}
        {activeTab === 'LAYOUTS' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                Architectural Floorplan Presets (Instant Wall & Surface Reconfiguration)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {HOME_LAYOUT_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                        {preset.name}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                    <button
                      onClick={() => onApplyLayoutPreset(preset)}
                      className="mt-4 w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      Apply Architectural Layout
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Individual Interior Partition Wall Toggles (Error-Free Open Concept)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => onToggleOpenConcept('kitchen')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    openConceptKitchen
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">Kitchen — Living Room Partition Wall</div>
                    <div className="text-[11px] text-gray-500">
                      {openConceptKitchen ? 'Open-Concept Archway (Wall Removed)' : 'Standard Framed Wall & Door'}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                    {openConceptKitchen ? 'Open' : 'Framed'}
                  </span>
                </button>

                <button
                  onClick={() => onToggleOpenConcept('living')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    openConceptLiving
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">East Hallway — Living Partition Wall</div>
                    <div className="text-[11px] text-gray-500">
                      {openConceptLiving ? 'Grand Open Salon (Wall Removed)' : 'Standard Divided Hallway'}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                    {openConceptLiving ? 'Open' : 'Framed'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: AgentArtClass (Imagen 2D + Meshy.ai 3D + 1-10 Mechanics Binding) */}
        {activeTab === 'AGENT_SYNTH' && (
          <form onSubmit={handleSynthesizeViaAgentArtClass} className="p-6 flex-1 overflow-y-auto space-y-4">
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              <strong>AgentArtClass Pipeline (/src/AgentArtClass/):</strong> Synthesizes orthographic concept prompts for cost-effective Gemini Lite Image (`gemini-3.1-flash-lite-image`), 3D PBR meshes for Meshy.ai (`meshy-4`), and binds deterministic 1–10 environmental ratings that shape autonomous toon behavior.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Asset Concept & Prompt</label>
                <input
                  type="text"
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Interaction Action Label</label>
                <input
                  type="text"
                  required
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold mb-1">
                  Target Room{' '}
                  {synthRoomRule.isRoomRestricted && (
                    <span className="text-[10px] font-bold text-amber-500">
                      (Locked: {synthRoomRule.requiredRoom} Only)
                    </span>
                  )}
                </label>
                <select
                  value={effectiveSynthRoom}
                  disabled={synthRoomRule.isRoomRestricted}
                  onChange={(e) => setRoom(e.target.value as typeof room)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 disabled:opacity-75"
                >
                  <option value="Kitchen">Kitchen</option>
                  <option value="LivingRoom">Living Room</option>
                  <option value="Bedroom">Bedroom</option>
                  <option value="Bathroom">Bathroom</option>
                  <option value="Study">Study</option>
                  <option value="Yard">Yard</option>
                  <option value="Basement">Basement</option>
                  <option value="SecondFloor">Upstairs Loft</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Material Finish</label>
                <select
                  value={materialFinish}
                  onChange={(e) => setMaterialFinish(e.target.value as typeof materialFinish)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                >
                  <option value="Wood">Oak Wood</option>
                  <option value="Marble">Carrara Marble</option>
                  <option value="Steel">Brushed Steel</option>
                  <option value="Fabric">Velvet Fabric</option>
                  <option value="Glass">Tempered Glass</option>
                  <option value="Stone">Granite Stone</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Style Theme</label>
                <select
                  value={styleTheme}
                  onChange={(e) => setStyleTheme(e.target.value as typeof styleTheme)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                >
                  <option value="Modern">Modern</option>
                  <option value="Victorian">Victorian</option>
                  <option value="Rustic">Rustic</option>
                  <option value="Retro">Retro</option>
                  <option value="Gothic">Gothic</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Cost (§)</label>
                <input
                  type="number"
                  min={100}
                  max={9000}
                  step={50}
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                AgentArtClass 1–10 Autonomous Surroundings & Motive Ratings
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Energy (1–10)</span>
                    <span className="font-mono font-bold">{energyScore}/10</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={energyScore}
                    onChange={(e) => setEnergyScore(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Fun (1–10)</span>
                    <span className="font-mono font-bold">{funScore}/10</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={funScore}
                    onChange={(e) => setFunScore(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Sanity (1–10)</span>
                    <span className="font-mono font-bold">{sanityScore}/10</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={sanityScore}
                    onChange={(e) => setSanityScore(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Surroundings Aura</span>
                    <span className="font-mono font-bold text-emerald-500">{envQualityScore}/10</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={envQualityScore}
                    onChange={(e) => setEnvQualityScore(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Box className="w-4 h-4" />
                Synthesize & Place Smart Object on Lot
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
