/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  PREMADE_ROOMS_DATABASE,
  PremadeRoomTemplate,
  PremadeRoomType,
  PremadeRoomShape,
  CardinalWall,
  RoomDoorwaySocket,
  createPremadeRoomTemplate,
  computeRoomPathingMap,
  evaluateRoomConnectionCompatibility,
  buildRoomShellParts,
} from '../game/premadeRoomsDatabase';
import {
  WORLD_BUILDER_CATALOG,
  BuildCategory,
  BuildingPartDefinition,
  BuildToolMode,
  PlacedBuildingPart,
} from '../game/worldBuilder';
import {
  SmartObject,
  DEFAULT_SMART_OBJECTS,
  getSmartObjectCollisionBox,
  resolveNonToonObjectPlacement,
} from '../game/simulation';
import {
  X,
  Grid,
  Database,
  Hammer,
  Trash2,
  RotateCw,
  DoorOpen,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Layers,
  Plus,
  Home,
  ArrowLeft,
  Link2,
} from 'lucide-react';

interface RoomArchitectStudioModalProps {
  customRooms: PremadeRoomTemplate[];
  onSaveCustomRoom: (room: PremadeRoomTemplate) => void;
  onStampRoomIntoHouse: (
    template: PremadeRoomTemplate,
    variant: 'EMPTY' | 'FURNISHED',
    worldPos: { x: number; y: number; z: number }
  ) => void;
  onLaunch3DBlankGridRoomBuilder?: (template: PremadeRoomTemplate, variant: 'EMPTY' | 'FURNISHED') => void;
  onClose: () => void;
}

const ROOM_TYPES: PremadeRoomType[] = [
  'Kitchen',
  'LivingRoom',
  'Bedroom',
  'Bathroom',
  'Study',
  'Hallway',
  'Patio',
];

const ROOM_SHAPES: Array<{ id: PremadeRoomShape; label: string }> = [
  { id: 'RECTANGLE', label: 'Rectangle' },
  { id: 'L_SHAPE', label: 'L-Shape Wing' },
  { id: 'BAY_ALCOVE', label: 'Bay Alcove' },
  { id: 'CORNER_SUITE', label: 'Corner Suite' },
  { id: 'COMPACT', label: 'Compact Galley' },
];

const BUILD_CATEGORIES: Array<{ id: BuildCategory; label: string; color: string }> = [
  { id: 'furnishings', label: 'Furnishings', color: '#4f46e5' },
  { id: 'rooms_walls', label: 'Walls & Dividers', color: '#d97706' },
  { id: 'doors_windows', label: 'Doors & Windows', color: '#0284c7' },
  { id: 'wall_patterns', label: 'Wallpapers', color: '#db2777' },
  { id: 'floor_patterns', label: 'Flooring', color: '#0d9488' },
  { id: 'foundations_decks', label: 'Pillars & Trim', color: '#9333ea' },
];

export const RoomArchitectStudioModal: React.FC<RoomArchitectStudioModalProps> = ({
  customRooms,
  onSaveCustomRoom,
  onStampRoomIntoHouse,
  onLaunch3DBlankGridRoomBuilder,
  onClose,
}) => {
  const allRooms = useMemo(
    () => [...customRooms, ...PREMADE_ROOMS_DATABASE],
    [customRooms]
  );

  const [studioTab, setStudioTab] = useState<'BLANK_GRID_EDITOR' | 'PREMADE_DATABASE'>(
    'BLANK_GRID_EDITOR'
  );
  const [filterRoomType, setFilterRoomType] = useState<'ALL' | PremadeRoomType>('ALL');
  const [selectedDatabaseRoomId, setSelectedDatabaseRoomId] = useState<string>(
    PREMADE_ROOMS_DATABASE[0].id
  );
  const [previewVariant, setPreviewVariant] = useState<'FURNISHED' | 'EMPTY'>('FURNISHED');

  // Connection Compatibility Tester state
  const [connectTargetRoomId, setConnectTargetRoomId] = useState<string>(
    PREMADE_ROOMS_DATABASE[2].id
  );
  const [anchorSocketId, setAnchorSocketId] = useState<string>(
    PREMADE_ROOMS_DATABASE[0].doorwaySockets[0]?.id || ''
  );
  const [targetSocketId, setTargetSocketId] = useState<string>(
    PREMADE_ROOMS_DATABASE[2].doorwaySockets[0]?.id || ''
  );

  // Blank Grid Designer State
  const [draftName, setDraftName] = useState<string>('Custom Sunlit Artisan Room');
  const [draftRoomType, setDraftRoomType] = useState<PremadeRoomType>('Kitchen');
  const [draftShape, setDraftShape] = useState<PremadeRoomShape>('L_SHAPE');
  const [draftWidth, setDraftWidth] = useState<number>(8.0);
  const [draftDepth, setDraftDepth] = useState<number>(6.5);
  const [draftVariantView, setDraftVariantView] = useState<'FURNISHED' | 'EMPTY'>('FURNISHED');
  const [showPathingOverlay, setShowPathingOverlay] = useState<boolean>(true);
  const [activeToolCat, setActiveToolCat] = useState<BuildCategory>('furnishings');
  const [toolMode, setToolMode] = useState<BuildToolMode>('PLACE');
  const [selectedPart, setSelectedPart] = useState<BuildingPartDefinition | null>(
    WORLD_BUILDER_CATALOG.find((p) => p.category === 'furnishings') || null
  );
  const [rotationY, setRotationY] = useState<number>(0);
  const [draftWallpaperId, setDraftWallpaperId] = useState<string>('wp_terracotta_venetian');
  const [draftFloorId, setDraftFloorId] = useState<string>('fl_herringbone_oak');
  const [draftWindowWalls, setDraftWindowWalls] = useState<CardinalWall[]>(['NORTH', 'WEST']);

  const [draftSockets, setDraftSockets] = useState<RoomDoorwaySocket[]>([
    {
      id: 'sock_custom_east',
      label: 'East Main Archway',
      wall: 'EAST',
      offsetMeters: 0,
      widthMeters: 1.6,
      doorStyle: 'OPEN_ARCH',
      localThresholdPos: { x: 4.0, z: 0 },
      allowedAdjacentRoomTypes: ['LivingRoom', 'Hallway', 'Study'],
      allowsExteriorExit: false,
    },
    {
      id: 'sock_custom_south',
      label: 'South Connector Door',
      wall: 'SOUTH',
      offsetMeters: -1.2,
      widthMeters: 1.3,
      doorStyle: 'HINGED_DOOR',
      localThresholdPos: { x: -1.2, z: 3.25 },
      allowedAdjacentRoomTypes: ['Hallway', 'Study', 'Bedroom', 'Bathroom'],
      allowsExteriorExit: true,
    },
  ]);

  const [draftObjects, setDraftObjects] = useState<SmartObject[]>([
    {
      ...DEFAULT_SMART_OBJECTS[0],
      id: 'draft_fridge',
      gridPos: { x: -2.4, y: 0, z: -2.0 },
    },
    {
      ...DEFAULT_SMART_OBJECTS[1],
      id: 'draft_stove',
      gridPos: { x: 0.2, y: 0, z: -2.0 },
    },
    {
      ...DEFAULT_SMART_OBJECTS[8],
      id: 'draft_sink',
      gridPos: { x: 2.2, y: 0, z: -1.6 },
    },
  ]);

  const [draftCustomParts, setDraftCustomParts] = useState<PlacedBuildingPart[]>([]);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Sync socket threshold coordinates whenever width/depth changes
  const normalizedSockets = useMemo(() => {
    const halfW = draftWidth * 0.5;
    const halfD = draftDepth * 0.5;
    return draftSockets.map((s) => ({
      ...s,
      localThresholdPos:
        s.wall === 'NORTH'
          ? { x: s.offsetMeters, z: -halfD }
          : s.wall === 'SOUTH'
          ? { x: s.offsetMeters, z: halfD }
          : s.wall === 'WEST'
          ? { x: -halfW, z: s.offsetMeters }
          : { x: halfW, z: s.offsetMeters },
    }));
  }, [draftSockets, draftWidth, draftDepth]);

  const draftShellParts = useMemo(() => {
    const baseShell = buildRoomShellParts({
      roomPrefix: 'draft_room',
      roomType: draftRoomType,
      shape: draftShape,
      width: draftWidth,
      depth: draftDepth,
      doorwaySockets: normalizedSockets,
      windowWalls: draftWindowWalls,
      wallColorHex: '#cbd5e1',
      floorColorHex: '#9a6b41',
    });
    return [...baseShell, ...draftCustomParts];
  }, [
    draftRoomType,
    draftShape,
    draftWidth,
    draftDepth,
    normalizedSockets,
    draftWindowWalls,
    draftCustomParts,
  ]);

  const activeDraftObjects = useMemo(
    () => (draftVariantView === 'FURNISHED' ? draftObjects : []),
    [draftVariantView, draftObjects]
  );

  const livePathingMap = useMemo(
    () =>
      computeRoomPathingMap({
        width: draftWidth,
        depth: draftDepth,
        doorwaySockets: normalizedSockets,
        placedParts: draftShellParts,
        smartObjects: activeDraftObjects,
        cellSize: 0.5,
      }),
    [draftWidth, draftDepth, normalizedSockets, draftShellParts, activeDraftObjects]
  );

  const filteredCatalogParts = useMemo(
    () => WORLD_BUILDER_CATALOG.filter((p) => p.category === activeToolCat),
    [activeToolCat]
  );

  const handleBlankGridCellClick = (worldX: number, worldZ: number) => {
    if (toolMode === 'SLEDGEHAMMER') {
      // Remove nearest furniture object or custom building part within 1.1m
      const nearestObjIdx = draftObjects.findIndex(
        (o) => Math.hypot(o.gridPos.x - worldX, o.gridPos.z - worldZ) <= 1.15
      );
      if (nearestObjIdx !== -1) {
        const removed = draftObjects[nearestObjIdx];
        setDraftObjects((prev) => prev.filter((_, i) => i !== nearestObjIdx));
        setStatusBanner(`Removed "${removed.name}" from room grid; pathing map updated.`);
        return;
      }
      const nearestPartIdx = draftCustomParts.findIndex(
        (p) => Math.hypot(p.gridPos.x - worldX, p.gridPos.z - worldZ) <= 1.15
      );
      if (nearestPartIdx !== -1) {
        setDraftCustomParts((prev) => prev.filter((_, i) => i !== nearestPartIdx));
        setStatusBanner('Removed custom architectural segment from room grid.');
      }
      return;
    }

    if (!selectedPart) return;

    if (selectedPart.partType === 'SMART_FURNITURE') {
      // Ensure we are viewing FURNISHED variant when placing furniture
      if (draftVariantView !== 'FURNISHED') {
        setDraftVariantView('FURNISHED');
      }
      const tmpl = selectedPart.smartObjectTemplate;
      const id = `${selectedPart.id}_${Date.now()
        .toString(36)
        .slice(-4)}`;
      const safe = resolveNonToonObjectPlacement(
        { x: worldX, y: 0, z: worldZ },
        {
          id,
          name: selectedPart.name,
          width: selectedPart.width,
          depth: selectedPart.depth,
          rotationY,
        },
        draftObjects,
        draftShellParts,
        false
      );
      const newObj: SmartObject = {
        id,
        name: tmpl?.name || selectedPart.name,
        room: draftRoomType,
        category: tmpl?.category || 'living',
        gridPos: safe.safePos,
        state: 'Clean',
        maturity: 'ALL',
        effects: tmpl?.effects || { fun: 25, sanity: 10 },
        actionLabel: tmpl?.actionLabel || `Using ${selectedPart.name}`,
        durationSeconds: tmpl?.durationSeconds || 3600,
      };
      setDraftObjects((prev) => [...prev, newObj]);
      setStatusBanner(
        `Placed "${newObj.name}" at (${safe.safePos.x}, ${safe.safePos.z}) — A* Pathing Reachability: ${livePathingMap.reachabilityScore100}%`
      );
    } else if (selectedPart.partType === 'DOOR' || selectedPart.partType === 'ARCHWAY') {
      // Snap a new doorway socket onto the nearest cardinal perimeter wall!
      const halfW = draftWidth * 0.5;
      const halfD = draftDepth * 0.5;
      const distN = Math.abs(worldZ - -halfD);
      const distS = Math.abs(worldZ - halfD);
      const distW = Math.abs(worldX - -halfW);
      const distE = Math.abs(worldX - halfW);
      const minD = Math.min(distN, distS, distW, distE);
      const wall: CardinalWall =
        minD === distN ? 'NORTH' : minD === distS ? 'SOUTH' : minD === distW ? 'WEST' : 'EAST';
      const offset =
        wall === 'NORTH' || wall === 'SOUTH'
          ? Math.max(-halfW + 1.0, Math.min(halfW - 1.0, Math.round(worldX * 2) / 2))
          : Math.max(-halfD + 1.0, Math.min(halfD - 1.0, Math.round(worldZ * 2) / 2));

      const newSock: RoomDoorwaySocket = {
        id: `sock_${wall.toLowerCase()}_${Date.now().toString(36).slice(-3)}`,
        label: `${wall} ${selectedPart.name}`,
        wall,
        offsetMeters: offset,
        widthMeters: Math.max(1.2, selectedPart.width || 1.3),
        doorStyle: selectedPart.id.includes('privacy')
          ? 'PRIVACY_DOOR'
          : selectedPart.partType === 'ARCHWAY'
          ? 'OPEN_ARCH'
          : 'HINGED_DOOR',
        localThresholdPos:
          wall === 'NORTH'
            ? { x: offset, z: -halfD }
            : wall === 'SOUTH'
            ? { x: offset, z: halfD }
            : wall === 'WEST'
            ? { x: -halfW, z: offset }
            : { x: halfW, z: offset },
        allowedAdjacentRoomTypes: ROOM_TYPES,
        allowsExteriorExit: true,
      };
      setDraftSockets((prev) => [...prev, newSock]);
      setStatusBanner(`Added ${wall} doorway socket (${newSock.widthMeters}m wide) at offset ${offset}m.`);
    } else {
      // Architectural wall/pillar/window segment inside the blank grid
      const newPart: PlacedBuildingPart = {
        id: `part_${Date.now().toString(36).slice(-4)}`,
        partId: selectedPart.id,
        name: selectedPart.name,
        category: selectedPart.category,
        partType: selectedPart.partType,
        roomTag: draftRoomType,
        gridPos: { x: worldX, y: 0, z: worldZ },
        rotationY,
        width: selectedPart.width,
        depth: selectedPart.depth,
        height: selectedPart.height,
        colorHex: selectedPart.colorHex,
      };
      setDraftCustomParts((prev) => [...prev, newPart]);
      setStatusBanner(`Placed architectural part "${selectedPart.name}" at (${worldX}, ${worldZ}).`);
    }
  };

  const buildCompiledTemplateFromDraft = (): PremadeRoomTemplate => {
    return createPremadeRoomTemplate({
      id: `custom_${draftRoomType.toLowerCase()}_${Date.now().toString(36).slice(-5)}`,
      name: draftName.trim() || `Custom ${draftShape} ${draftRoomType}`,
      roomType: draftRoomType,
      shape: draftShape,
      widthMeters: draftWidth,
      depthMeters: draftDepth,
      costEmpty: Math.round(draftWidth * draftDepth * 22),
      costFurnished: Math.round(draftWidth * draftDepth * 22 + draftObjects.length * 420),
      summary: `Custom ${draftWidth}×${draftDepth}m ${draftShape} ${draftRoomType} designed in the Blank Grid Room Architect Studio with ${normalizedSockets.length} doorway sockets and ${draftObjects.length} path-mapped fixtures.`,
      wallpaperId: draftWallpaperId,
      floorPatternId: draftFloorId,
      wallColorHex: '#cbd5e1',
      floorColorHex: '#9a6b41',
      windowWalls: draftWindowWalls,
      doorwaySockets: normalizedSockets,
      connectionConditions: {
        requiresDoorwayAlignment: true,
        minSharedWallLengthMeters: 2.5,
        mustMaintainExteriorWindowWalls: draftWindowWalls,
        requiresPrivacyDoor: draftRoomType === 'Bathroom',
        forbiddenDirectConnections: [],
        maxStoryLevel: 2,
        connectionNotes: 'Custom user-designed room with verified A* doorway-to-fixture pathing.',
      },
      furnishedObjects: draftObjects,
      isCustomUserRoom: true,
    });
  };

  const handleSaveDraftToDatabase = () => {
    const compiled = buildCompiledTemplateFromDraft();
    onSaveCustomRoom(compiled);
    setSelectedDatabaseRoomId(compiled.id);
    setStatusBanner(
      `Saved "${compiled.name}" (Empty + Furnished variants with ${compiled.furnishedVariant.mappedPathing.reachabilityScore100}% A* pathing) to Pre-Made Rooms Database!`
    );
  };

  const selectedDatabaseRoom =
    allRooms.find((r) => r.id === selectedDatabaseRoomId) || allRooms[0];
  const connectTargetRoom =
    allRooms.find((r) => r.id === connectTargetRoomId) || allRooms[1] || allRooms[0];

  const connectionEval = useMemo(() => {
    const sockA =
      selectedDatabaseRoom.doorwaySockets.find((s) => s.id === anchorSocketId) ||
      selectedDatabaseRoom.doorwaySockets[0];
    const sockB =
      connectTargetRoom.doorwaySockets.find((s) => s.id === targetSocketId) ||
      connectTargetRoom.doorwaySockets[0];
    return evaluateRoomConnectionCompatibility({
      anchorRoom: selectedDatabaseRoom,
      anchorSocketId: sockA?.id || '',
      anchorWorldPos: { x: 0, z: 0 },
      candidateRoom: connectTargetRoom,
      candidateSocketId: sockB?.id || '',
    });
  }, [selectedDatabaseRoom, connectTargetRoom, anchorSocketId, targetSocketId]);

  const filteredDatabaseRooms = useMemo(() => {
    if (filterRoomType === 'ALL') return allRooms;
    return allRooms.filter((r) => r.roomType === filterRoomType);
  }, [allRooms, filterRoomType]);

  return (
    <div
      data-testid="room-architect-studio-modal"
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="w-full max-w-6xl bg-slate-950 border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Bar with Mode Switcher & Prominent Exit Button */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                <span>ROOM ARCHITECT &amp; PRE-MADE PATHING DATABASE</span>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                  A* NavGrid Mapped
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Design custom rooms on a Blank Grid using House Building Tools, map A* furniture pathing, and connect Pre-Made Empty or Furnished Rooms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                data-testid="tab-blank-grid-editor"
                onClick={() => setStudioTab('BLANK_GRID_EDITOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  studioTab === 'BLANK_GRID_EDITOR'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Blank Grid Room Designer</span>
              </button>
              <button
                type="button"
                data-testid="tab-premade-database"
                onClick={() => setStudioTab('PREMADE_DATABASE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  studioTab === 'PREMADE_DATABASE'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Pre-Made Rooms Database ({allRooms.length})</span>
              </button>
            </div>

            {/* Prominent Exit Button */}
            <button
              type="button"
              data-testid="exit-room-architect-btn"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit to Live House [ESC]</span>
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className="px-4 py-2 bg-indigo-950/90 border-b border-indigo-500/30 text-indigo-200 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {statusBanner}
            </span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-slate-400 hover:text-white text-[10px] font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* BODY CONTENT */}
        {studioTab === 'BLANK_GRID_EDITOR' ? (
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT COLUMN (4 cols): Room Spec, Doorway Sockets & Building Tools Palette */}
            <div className="lg:col-span-5 space-y-3">
              {/* 1. Room Configuration Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    1. Room Blueprint &amp; Shape
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {draftWidth}×{draftDepth}m ({Math.round(draftWidth * draftDepth)} m²)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">
                      Room Title
                    </label>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">
                      Room Type
                    </label>
                    <select
                      value={draftRoomType}
                      onChange={(e) => setDraftRoomType(e.target.value as PremadeRoomType)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                    >
                      {ROOM_TYPES.map((rt) => (
                        <option key={rt} value={rt}>
                          {rt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Shape Selector Pills */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">
                    Room Shape Footprint
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {ROOM_SHAPES.map((sh) => (
                      <button
                        key={sh.id}
                        type="button"
                        onClick={() => setDraftShape(sh.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                          draftShape === sh.id
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {sh.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimensions Sliders */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-300 font-semibold">
                      <span>Width (X):</span>
                      <span className="font-mono text-indigo-300">{draftWidth.toFixed(1)}m</span>
                    </div>
                    <input
                      type="range"
                      min={4.5}
                      max={11.0}
                      step={0.5}
                      value={draftWidth}
                      onChange={(e) => setDraftWidth( parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-300 font-semibold">
                      <span>Depth (Z):</span>
                      <span className="font-mono text-indigo-300">{draftDepth.toFixed(1)}m</span>
                    </div>
                    <input
                      type="range"
                      min={4.5}
                      max={10.0}
                      step={0.5}
                      value={draftDepth}
                      onChange={(e) => setDraftDepth(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Installed House Building Tools Palette */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Hammer className="w-3.5 h-3.5" />
                    2. House Building Tools (Blank Grid)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setRotationY((prev) => (prev + Math.PI / 2) % (Math.PI * 2))}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3 h-3 text-amber-400" />
                      {Math.round((rotationY * 180) / Math.PI)}°
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setToolMode(toolMode === 'SLEDGEHAMMER' ? 'PLACE' : 'SLEDGEHAMMER')
                      }
                      className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                        toolMode === 'SLEDGEHAMMER'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Demolish
                    </button>
                  </div>
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-1">
                  {BUILD_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveToolCat(cat.id);
                        const first = WORLD_BUILDER_CATALOG.find((p) => p.category === cat.id);
                        if (first) setSelectedPart(first);
                        setToolMode('PLACE');
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 border ${
                        activeToolCat === cat.id
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Part Swatch List */}
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {filteredCatalogParts.map((part) => {
                    const isSel = selectedPart?.id === part.id;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => {
                          if (part.partType === 'WALLPAPER' && part.styleId) {
                            setDraftWallpaperId(part.styleId);
                            setStatusBanner(`Applied wallpaper "${part.name}" to room.`);
                            return;
                          }
                          if (part.partType === 'FLOOR_PATTERN' && part.styleId) {
                            setDraftFloorId(part.styleId);
                            setStatusBanner(`Applied flooring "${part.name}" to room.`);
                            return;
                          }
                          setSelectedPart(part);
                          setToolMode('PLACE');
                        }}
                        className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSel
                            ? 'bg-indigo-950 border-indigo-400 text-white'
                            : 'bg-slate-950/90 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold truncate">{part.name}</span>
                          <span
                            className="w-3 h-3 rounded-sm shrink-0 border border-white/20"
                            style={{ backgroundColor: part.colorHex }}
                          />
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono mt-1">
                          {part.width}×{part.depth}m • §{part.cost}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Doorway Connection Sockets Manager */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5" />
                    3. Doorways &amp; Connection Sockets ({normalizedSockets.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const walls: CardinalWall[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
                      const nextWall = walls[normalizedSockets.length % walls.length];
                      setDraftSockets((prev) => [
                        ...prev,
                        {
                          id: `sock_${nextWall.toLowerCase()}_${Date.now().toString(36).slice(-3)}`,
                          label: `${nextWall} Connection Doorway`,
                          wall: nextWall,
                          offsetMeters: 0,
                          widthMeters: 1.4,
                          doorStyle: draftRoomType === 'Bathroom' ? 'PRIVACY_DOOR' : 'HINGED_DOOR',
                          localThresholdPos: { x: 0, z: 0 },
                          allowedAdjacentRoomTypes: ROOM_TYPES,
                          allowsExteriorExit: true,
                        },
                      ]);
                    }}
                    className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Doorway Socket
                  </button>
                </div>

                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {normalizedSockets.map((sock) => (
                    <div
                      key={sock.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px]"
                    >
                      <div>
                        <span className="font-bold text-sky-300">{sock.wall} Wall</span> •{' '}
                        <span className="text-slate-200">{sock.label}</span>
                        <span className="text-slate-400 ml-1">
                          ({sock.widthMeters}m {sock.doorStyle})
                        </span>
                      </div>
                      {normalizedSockets.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraftSockets((prev) => prev.filter((s) => s.id !== sock.id))
                          }
                          className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (7 cols): Interactive Blank Grid Canvas & Live A* Pathing Map */}
            <div className="lg:col-span-7 flex flex-col justify-between bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              {/* Canvas Top Controls: Empty vs Furnished Variant + Pathing Overlay Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    data-testid="toggle-empty-variant-btn"
                    onClick={() => setDraftVariantView('EMPTY')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      draftVariantView === 'EMPTY'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Empty Room Design
                  </button>
                  <button
                    type="button"
                    data-testid="toggle-furnished-variant-btn"
                    onClick={() => setDraftVariantView('FURNISHED')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      draftVariantView === 'FURNISHED'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Furnished Room + Pathing ({draftObjects.length} Assets)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPathingOverlay((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 cursor-pointer ${
                      showPathingOverlay
                        ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{showPathingOverlay ? 'A* NavGrid Visible' : 'Show A* NavGrid'}</span>
                  </button>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 border ${
                      livePathingMap.reachabilityScore100 === 100
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}
                  >
                    {livePathingMap.reachabilityScore100 === 100 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    Path Reachability: {livePathingMap.reachabilityScore100}%
                  </span>
                </div>
              </div>

              {/* Interactive 2D/Isometric Blank Grid Blueprint Canvas with Click-to-Place & A* Pathing */}
              <div className="relative flex-1 flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800 p-3 overflow-hidden min-h-[340px]">
                <svg
                  data-testid="blank-room-grid-svg"
                  viewBox="-7 -6 14 12"
                  className="w-full h-full max-h-[380px] select-none"
                >
                  {/* Blank Architectural Grid Lines (0.5m & 1.0m increments) */}
                  {Array.from({ length: 27 }, (_, i) => -6.5 + i * 0.5).map((gx) => (
                    <line
                      key={`vg_${gx}`}
                      x1={gx}
                      y1={-5.5}
                      x2={gx}
                      y2={5.5}
                      stroke={Number.isInteger(gx) ? '#1e293b' : '#0f172a'}
                      strokeWidth={Number.isInteger(gx) ? 0.04 : 0.02}
                    />
                  ))}
                  {Array.from({ length: 23 }, (_, i) => -5.5 + i * 0.5).map((gz) => (
                    <line
                      key={`hg_${gz}`}
                      x1={-6.5}
                      y1={gz}
                      x2={6.5}
                      y2={gz}
                      stroke={Number.isInteger(gz) ? '#1e293b' : '#0f172a'}
                      strokeWidth={Number.isInteger(gz) ? 0.04 : 0.02}
                    />
                  ))}

                  {/* Room Floor Slab */}
                  <rect
                    x={-draftWidth * 0.5}
                    y={-draftDepth * 0.5}
                    width={draftWidth}
                    height={draftDepth}
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth={0.08}
                  />

                  {/* Clickable NavGrid Cells (0.5m resolution) */}
                  {Array.from({ length: livePathingMap.rows }).map((_, r) =>
                    Array.from({ length: livePathingMap.cols }).map((__, c) => {
                      const cellCode = livePathingMap.matrix[r]?.[c] ?? 1;
                      const wx =
                        Math.round((-draftWidth * 0.5 - 0.5 + (c + 0.5) * 0.5) * 100) / 100;
                      const wz =
                        Math.round((-draftDepth * 0.5 - 0.5 + (r + 0.5) * 0.5) * 100) / 100;
                      const insideRoom =
                        Math.abs(wx) <= draftWidth * 0.5 && Math.abs(wz) <= draftDepth * 0.5;
                      if (!insideRoom && cellCode !== 2) return null;

                      let fill = 'transparent';
                      if (showPathingOverlay) {
                        if (cellCode === 0) fill = 'rgba(239, 68, 68, 0.34)'; // Blocked by wall/asset
                        else if (cellCode === 2) fill = 'rgba(56, 189, 248, 0.55)'; // Doorway Portal
                        else if (cellCode === 3) fill = 'rgba(16, 185, 129, 0.55)'; // Verified A* Path
                        else fill = 'rgba(16, 185, 129, 0.12)'; // Walkable floor
                      }

                      return (
                        <rect
                          key={`cell_${r}_${c}`}
                          x={wx - 0.24}
                          y={wz - 0.24}
                          width={0.48}
                          height={0.48}
                          fill={fill}
                          stroke="rgba(255,255,255,0.03)"
                          strokeWidth={0.015}
                          className="cursor-crosshair hover:stroke-indigo-400"
                          onClick={() => handleBlankGridCellClick(wx, wz)}
                        />
                      );
                    })
                  )}

                  {/* A* Waypoint Polylines from Every Doorway Socket to Every Furnished Asset */}
                  {showPathingOverlay &&
                    draftVariantView === 'FURNISHED' &&
                    livePathingMap.entryToFixturePaths.map((pathItem, pIdx) => {
                      if (pathItem.waypoints.length === 0) return null;
                      const sock = normalizedSockets.find((s) => s.id === pathItem.socketId);
                      const startPt = sock
                        ? sock.localThresholdPos
                        : { x: pathItem.waypoints[0].x, z: pathItem.waypoints[0].z };
                      const pts = [
                        `${startPt.x},${startPt.z}`,
                        ...pathItem.waypoints.map((w) => `${w.x},${w.z}`),
                      ].join(' ');
                      return (
                        <g key={`apath_${pIdx}`} className="pointer-events-none">
                          <polyline
                            points={pts}
                            fill="none"
                            stroke="#34d399"
                            strokeWidth={0.11}
                            strokeDasharray="0.22 0.14"
                          />
                          <circle
                            cx={pathItem.interactionPoint.x}
                            cy={pathItem.interactionPoint.z}
                            r={0.18}
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth={0.04}
                          />
                        </g>
                      );
                    })}

                  {/* Furnished SmartObjects Footprints */}
                  {activeDraftObjects.map((obj) => {
                    const box = getSmartObjectCollisionBox(obj);
                    const w = Math.max(0.9, box.halfW * 2);
                    const d = Math.max(0.9, box.halfD * 2);
                    return (
                      <g
                        key={obj.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (toolMode === 'SLEDGEHAMMER') {
                            setDraftObjects((prev) => prev.filter((o) => o.id !== obj.id));
                            setStatusBanner(`Removed "${obj.name}" from room.`);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <rect
                          x={obj.gridPos.x - w * 0.5}
                          y={obj.gridPos.z - d * 0.5}
                          width={w}
                          height={d}
                          rx={0.12}
                          fill="#4f46e5"
                          fillOpacity={0.85}
                          stroke="#e0e7ff"
                          strokeWidth={0.06}
                        />
                        <text
                          x={obj.gridPos.x}
                          y={obj.gridPos.z + 0.08}
                          textAnchor="middle"
                          fontSize="0.34"
                          fontWeight="bold"
                          fill="#ffffff"
                        >
                          {obj.name.split(' ').slice(-1)[0]}
                        </text>
                      </g>
                    );
                  })}

                  {/* Doorway Sockets along Perimeter Walls */}
                  {normalizedSockets.map((sock) => {
                    const isHoriz = sock.wall === 'NORTH' || sock.wall === 'SOUTH';
                    const w = isHoriz ? sock.widthMeters : 0.36;
                    const d = isHoriz ? 0.36 : sock.widthMeters;
                    return (
                      <g key={sock.id} className="pointer-events-none">
                        <rect
                          x={sock.localThresholdPos.x - w * 0.5}
                          y={sock.localThresholdPos.z - d * 0.5}
                          width={w}
                          height={d}
                          rx={0.08}
                          fill="#0ea5e9"
                          stroke="#e0f2fe"
                          strokeWidth={0.05}
                        />
                        <text
                          x={sock.localThresholdPos.x}
                          y={sock.localThresholdPos.z + 0.08}
                          textAnchor="middle"
                          fontSize="0.28"
                          fontWeight="bold"
                          fill="#ffffff"
                        >
                          DOOR ({sock.wall[0]})
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Legend Overlay */}
                <div className="absolute bottom-2 left-3 right-3 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] text-slate-300">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70 inline-block" /> A* Walkable Path
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" /> Doorway Socket
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" /> Furnished Asset
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-500/60 inline-block" /> Obstacle Collider
                    </span>
                  </div>
                  <span className="font-mono text-slate-400">
                    Click any grid cell to place {selectedPart?.name || 'selected item'}
                  </span>
                </div>
              </div>

              {/* Action Footer: Save to Pre-Made Database OR Stamp Directly into 3D House */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  data-testid="save-custom-room-db-btn"
                  onClick={handleSaveDraftToDatabase}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>Save Empty + Furnished Room to Database</span>
                </button>

                <div className="flex items-center gap-2">
                  {onLaunch3DBlankGridRoomBuilder && (
                    <button
                      type="button"
                      onClick={() => {
                        const compiled = buildCompiledTemplateFromDraft();
                        onLaunch3DBlankGridRoomBuilder(compiled, draftVariantView);
                      }}
                      className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Open on 3D Blank Lot Grid</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const compiled = buildCompiledTemplateFromDraft();
                      onStampRoomIntoHouse(compiled, draftVariantView, { x: 0, y: 0, z: 0 });
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                  >
                    <Home className="w-4 h-4" />
                    <span>Stamp {draftVariantView} Room into House</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: PRE-MADE ROOMS DATABASE & DOORWAY CONNECTION SOLVER */
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT PANE (5 cols): Filterable Catalog of Pre-Made Rooms */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex flex-wrap gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFilterRoomType('ALL')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    filterRoomType === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({allRooms.length})
                </button>
                {ROOM_TYPES.map((rt) => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setFilterRoomType(rt)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      filterRoomType === rt
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {rt}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredDatabaseRooms.map((room) => {
                  const isSel = selectedDatabaseRoom.id === room.id;
                  return (
                    <div
                      key={room.id}
                      data-testid={`premade-room-card-${room.id}`}
                      onClick={() => {
                        setSelectedDatabaseRoomId(room.id);
                        if (room.doorwaySockets[0]) {
                          setAnchorSocketId(room.doorwaySockets[0].id);
                        }
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                        isSel
                          ? 'bg-indigo-950/90 border-indigo-400 ring-1 ring-indigo-400'
                          : 'bg-slate-900/90 hover:bg-slate-800/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-white">{room.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-700">
                          {room.shape} • {room.widthMeters}×{room.depthMeters}m
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2">{room.summary}</p>
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                        <span className="text-sky-300 font-semibold">
                          {room.doorwaySockets.length} Doorway Sockets (
                          {room.doorwaySockets.map((s) => s.wall[0]).join('/')})
                        </span>
                        <span className="text-emerald-300 font-mono font-bold">
                          Empty §{room.costEmpty} • Furnished §{room.costFurnished}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT PANE (7 cols): Selected Pre-Made Room Inspector (Empty vs Furnished + Mapped Pathing + Connection Solver) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      {selectedDatabaseRoom.name}
                    </h3>
                    <div className="text-[11px] text-slate-400">
                      {selectedDatabaseRoom.roomType} • Shape: {selectedDatabaseRoom.shape} •{' '}
                      {selectedDatabaseRoom.widthMeters}×{selectedDatabaseRoom.depthMeters}m (
                      {selectedDatabaseRoom.areaSqMeters} m²)
                    </div>
                  </div>

                  {/* Empty vs Furnished Variant Switcher */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      data-testid="preview-empty-variant-btn"
                      onClick={() => setPreviewVariant('EMPTY')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        previewVariant === 'EMPTY'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Empty Room (§{selectedDatabaseRoom.costEmpty})
                    </button>
                    <button
                      type="button"
                      data-testid="preview-furnished-variant-btn"
                      onClick={() => setPreviewVariant('FURNISHED')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        previewVariant === 'FURNISHED'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Furnished + Pathing (§{selectedDatabaseRoom.costFurnished})
                    </button>
                  </div>
                </div>

                {/* Variant Details & Mapped Pathing Matrix Stats */}
                {(() => {
                  const activeVar =
                    previewVariant === 'FURNISHED'
                      ? selectedDatabaseRoom.furnishedVariant
                      : selectedDatabaseRoom.emptyVariant;
                  const pm = activeVar.mappedPathing;
                  const rmW = selectedDatabaseRoom.widthMeters;
                  const rmD = selectedDatabaseRoom.depthMeters;
                  return (
                    <div className="space-y-3">
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
                        <span>{activeVar.description}</span>
                        <span className="font-mono text-[11px] font-bold text-emerald-400">
                          Walkable Ratio: {Math.round(pm.walkableRatio * 100)}% • Reachability:{' '}
                          {pm.reachabilityScore100}%
                        </span>
                      </div>

                      {/* 2D Blueprint + Pre-Mapped A* Pathing Canvas Preview */}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center">
                        <svg
                          data-testid="premade-room-pathing-preview-svg"
                          viewBox="-6.2 -5.2 12.4 10.4"
                          className="w-full h-44 select-none"
                        >
                          {/* Room Slab */}
                          <rect
                            x={-rmW * 0.5}
                            y={-rmD * 0.5}
                            width={rmW}
                            height={rmD}
                            fill="#1e293b"
                            stroke="#64748b"
                            strokeWidth={0.08}
                          />

                          {/* NavGrid Cells */}
                          {Array.from({ length: pm.rows }).map((_, r) =>
                            Array.from({ length: pm.cols }).map((__, c) => {
                              const cellCode = pm.matrix[r]?.[c] ?? 1;
                              const wx = Math.round((-rmW * 0.5 - 0.5 + (c + 0.5) * 0.5) * 100) / 100;
                              const wz = Math.round((-rmD * 0.5 - 0.5 + (r + 0.5) * 0.5) * 100) / 100;
                              const inside = Math.abs(wx) <= rmW * 0.5 && Math.abs(wz) <= rmD * 0.5;
                              if (!inside && cellCode !== 2) return null;
                              const fill =
                                cellCode === 0
                                  ? 'rgba(239, 68, 68, 0.34)'
                                  : cellCode === 2
                                  ? 'rgba(56, 189, 248, 0.6)'
                                  : cellCode === 3
                                  ? 'rgba(16, 185, 129, 0.58)'
                                  : 'rgba(16, 185, 129, 0.14)';
                              return (
                                <rect
                                  key={`db_c_${r}_${c}`}
                                  x={wx - 0.24}
                                  y={wz - 0.24}
                                  width={0.48}
                                  height={0.48}
                                  fill={fill}
                                />
                              );
                            })
                          )}

                          {/* Traced A* Polylines (Furnished Variant) */}
                          {previewVariant === 'FURNISHED' &&
                            pm.entryToFixturePaths.map((pItem, idx) => {
                              if (pItem.waypoints.length === 0) return null;
                              const sock = selectedDatabaseRoom.doorwaySockets.find(
                                (s) => s.id === pItem.socketId
                              );
                              const sPt = sock
                                ? sock.localThresholdPos
                                : { x: pItem.waypoints[0].x, z: pItem.waypoints[0].z };
                              const pts = [
                                `${sPt.x},${sPt.z}`,
                                ...pItem.waypoints.map((w) => `${w.x},${w.z}`),
                              ].join(' ');
                              return (
                                <polyline
                                  key={`db_path_${idx}`}
                                  points={pts}
                                  fill="none"
                                  stroke="#34d399"
                                  strokeWidth={0.1}
                                  strokeDasharray="0.2 0.12"
                                />
                              );
                            })}

                          {/* Furniture Footprints (Furnished Variant) */}
                          {activeVar.smartObjects.map((obj) => {
                            const box = getSmartObjectCollisionBox(obj);
                            const w = Math.max(0.85, box.halfW * 2);
                            const d = Math.max(0.85, box.halfD * 2);
                            return (
                              <g key={obj.id}>
                                <rect
                                  x={obj.gridPos.x - w * 0.5}
                                  y={obj.gridPos.z - d * 0.5}
                                  width={w}
                                  height={d}
                                  rx={0.1}
                                  fill="#4f46e5"
                                  stroke="#e0e7ff"
                                  strokeWidth={0.05}
                                />
                                <text
                                  x={obj.gridPos.x}
                                  y={obj.gridPos.z + 0.08}
                                  textAnchor="middle"
                                  fontSize="0.32"
                                  fontWeight="bold"
                                  fill="#ffffff"
                                >
                                  {obj.name.split(' ').slice(-1)[0]}
                                </text>
                              </g>
                            );
                          })}

                          {/* Doorway Sockets */}
                          {selectedDatabaseRoom.doorwaySockets.map((sock) => {
                            const isH = sock.wall === 'NORTH' || sock.wall === 'SOUTH';
                            const w = isH ? sock.widthMeters : 0.36;
                            const d = isH ? 0.36 : sock.widthMeters;
                            return (
                              <g key={sock.id}>
                                <rect
                                  x={sock.localThresholdPos.x - w * 0.5}
                                  y={sock.localThresholdPos.z - d * 0.5}
                                  width={w}
                                  height={d}
                                  rx={0.06}
                                  fill="#0ea5e9"
                                  stroke="#ffffff"
                                  strokeWidth={0.04}
                                />
                                <text
                                  x={sock.localThresholdPos.x}
                                  y={sock.localThresholdPos.z + 0.08}
                                  textAnchor="middle"
                                  fontSize="0.26"
                                  fontWeight="bold"
                                  fill="#ffffff"
                                >
                                  {sock.wall[0]} DOOR
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Mapped Entry-to-Fixture Pathing Table (for Furnished Variant) */}
                      {previewVariant === 'FURNISHED' && pm.entryToFixturePaths.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            Pre-Mapped A* Doorway-to-Fixture Paths ({pm.entryToFixturePaths.length}{' '}
                            Verified Routes)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                            {pm.entryToFixturePaths.map((route, idx) => (
                              <div
                                key={`${route.socketId}_${route.objectId}_${idx}`}
                                className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-[10px] flex items-center justify-between"
                              >
                                <span className="truncate text-slate-200">
                                  <strong>{route.socketLabel.split(' ')[0]}</strong> →{' '}
                                  {route.objectName}
                                </span>
                                <span className="font-mono text-emerald-400 shrink-0 ml-2">
                                  {route.distanceMeters}m ({route.waypoints.length} wp)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Doorways & Connection Conditions */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5" />
                          Doorway Connection Conditions &amp; Socket Compatibility Tester
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {selectedDatabaseRoom.connectionConditions.connectionNotes}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          <div>
                            <label className="block text-[9px] text-slate-400 font-bold mb-0.5">
                              Source Doorway Socket
                            </label>
                            <select
                              value={anchorSocketId}
                              onChange={(e) => setAnchorSocketId(e.target.value)}
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-white"
                            >
                              {selectedDatabaseRoom.doorwaySockets.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.wall}: {s.label} ({s.widthMeters}m)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] text-slate-400 font-bold mb-0.5">
                              Connect To Room
                            </label>
                            <select
                              value={connectTargetRoom.id}
                              onChange={(e) => {
                                setConnectTargetRoomId(e.target.value);
                                const nextRm = allRooms.find((r) => r.id === e.target.value);
                                if (nextRm?.doorwaySockets[0]) {
                                  setTargetSocketId(nextRm.doorwaySockets[0].id);
                                }
                              }}
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-white"
                            >
                              {allRooms.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({r.roomType})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] text-slate-400 font-bold mb-0.5">
                              Target Doorway Socket
                            </label>
                            <select
                              value={targetSocketId}
                              onChange={(e) => setTargetSocketId(e.target.value)}
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-white"
                            >
                              {connectTargetRoom.doorwaySockets.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.wall}: {s.label} ({s.widthMeters}m)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div
                          className={`p-2 rounded-lg border text-[10px] ${
                            connectionEval.compatible
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                              : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                          }`}
                        >
                          {connectionEval.reasons.map((r, i) => (
                            <div key={i}>• {r}</div>
                          ))}
                        </div>
                      </div>

                      {/* Stamp Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-testid="stamp-empty-premade-btn"
                            onClick={() =>
                              onStampRoomIntoHouse(selectedDatabaseRoom, 'EMPTY', {
                                x: 0,
                                y: 0,
                                z: 0,
                              })
                            }
                            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer transition"
                          >
                            + Stamp Empty Room (§{selectedDatabaseRoom.costEmpty})
                          </button>
                          <button
                            type="button"
                            data-testid="stamp-furnished-premade-btn"
                            onClick={() =>
                              onStampRoomIntoHouse(selectedDatabaseRoom, 'FURNISHED', {
                                x: 0,
                                y: 0,
                                z: 0,
                              })
                            }
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition shadow-lg"
                          >
                            + Stamp Furnished Room (§{selectedDatabaseRoom.costFurnished})
                          </button>
                        </div>

                        {connectionEval.compatible && (
                          <button
                            type="button"
                            onClick={() => {
                              onStampRoomIntoHouse(selectedDatabaseRoom, previewVariant, {
                                x: 0,
                                y: 0,
                                z: 0,
                              });
                              onStampRoomIntoHouse(connectTargetRoom, previewVariant, {
                                x: connectionEval.snapWorldPos.x,
                                y: 0,
                                z: connectionEval.snapWorldPos.z,
                              });
                            }}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer transition"
                          >
                            Stamp Connected Pair ({selectedDatabaseRoom.roomType} ↔{' '}
                            {connectTargetRoom.roomType})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
