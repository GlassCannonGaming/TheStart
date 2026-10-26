/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Character,
  SmartObject,
  MaturityRating,
  RoomName,
  resolveNonToonObjectPlacement,
  getRequiredRoomForFurniture,
  ensurePersonalBedsForAllToons,
} from './simulation';
import { COMPLETE_FURNISHINGS_CATALOG } from './furnishingsCatalog';
import { WALLPAPER_CATALOG, CARPET_CATALOG } from '../AgentArtClass/AgentArtPipeline';

export type BuildCategory =
  | 'rooms_walls'
  | 'doors_windows'
  | 'roofs'
  | 'foundations_decks'
  | 'wall_patterns'
  | 'floor_patterns'
  | 'landscaping'
  | 'furnishings';

export type BuildToolMode =
  | 'PLACE'
  | 'SELECT_MOVE'
  | 'SLEDGEHAMMER'
  | 'EYEDROPPER'
  | 'PAINT_ROOM';

export type FurnishSubcategory =
  | 'all'
  | 'kitchen'
  | 'living'
  | 'bedroom'
  | 'bathroom'
  | 'study'
  | 'outdoor';

export interface BuildingPartDefinition {
  id: string;
  name: string;
  category: BuildCategory;
  subcategory?: FurnishSubcategory | string;
  cost: number;
  description: string;
  width: number;
  height: number;
  depth: number;
  colorHex: string;
  secondaryColorHex?: string;
  roomTag?: string;
  partType:
    | 'ROOM_BLOCK'
    | 'WALL_SEGMENT'
    | 'PILLAR'
    | 'DOOR'
    | 'ARCHWAY'
    | 'WINDOW'
    | 'ROOF_GABLED'
    | 'ROOF_HIPPED'
    | 'ROOF_FLAT'
    | 'ROOF_MANSARD'
    | 'DECK_PATIO'
    | 'STAIRS'
    | 'FENCE'
    | 'TREE'
    | 'SHRUB_FLOWER'
    | 'POOL'
    | 'WALLPAPER'
    | 'FLOOR_PATTERN'
    | 'SMART_FURNITURE';
  smartObjectTemplate?: Omit<SmartObject, 'id' | 'gridPos' | 'state'>;
  styleId?: string;
}

export interface PlacedBuildingPart {
  id: string;
  partId: string;
  name: string;
  category: BuildCategory;
  partType: BuildingPartDefinition['partType'];
  gridPos: { x: number; y: number; z: number };
  rotationY: number;
  width: number;
  height: number;
  depth: number;
  colorHex: string;
  secondaryColorHex?: string;
  roomTag?: string;
  wallPatternId?: string;
  floorPatternId?: string;
}

export interface WorldBlueprint {
  isEmptyGridMode: boolean;
  lotTitle: string;
  architecturalStyle: string;
  placedParts: PlacedBuildingPart[];
}

export interface WorldScenarioGenerationResult {
  blueprint: WorldBlueprint;
  smartObjects: SmartObject[];
  characters: Character[];
  scenarioTitle: string;
  scenarioDescription: string;
  roomWallpapers: Record<string, string>;
  roomCarpets: Record<string, string>;
}

/**
 * Full Sims-Style Architectural Building Parts + Furnishings Catalog
 */
export const WORLD_BUILDER_CATALOG: BuildingPartDefinition[] = [
  // 1. ROOMS & WALLS
  {
    id: 'wb_room_living',
    name: 'Living Parlor Room Module (8x8m)',
    category: 'rooms_walls',
    subcategory: 'room_modules',
    cost: 650,
    description: 'Complete framed living room module with hardwood subfloor, 4 walls, and doorway cutout.',
    width: 8.0,
    height: 2.8,
    depth: 8.0,
    colorHex: '#f5f5f4',
    secondaryColorHex: '#92400e',
    roomTag: 'LivingRoom',
    partType: 'ROOM_BLOCK',
  },
  {
    id: 'wb_room_kitchen',
    name: 'Chef Kitchen Room Module (8x7m)',
    category: 'rooms_walls',
    subcategory: 'room_modules',
    cost: 600,
    description: 'Tiled culinary room block ready for counters, island, stove, and refrigerator.',
    width: 8.0,
    height: 2.8,
    depth: 7.0,
    colorHex: '#fef3c7',
    secondaryColorHex: '#e7e5e4',
    roomTag: 'Kitchen',
    partType: 'ROOM_BLOCK',
  },
  {
    id: 'wb_room_bedroom',
    name: 'Master Suite Room Module (6.6x6.5m)',
    category: 'rooms_walls',
    subcategory: 'room_modules',
    cost: 580,
    description: 'Realistic standard bedroom enclosure with sound-insulated walls and plush carpet.',
    width: 6.6,
    height: 2.8,
    depth: 6.5,
    colorHex: '#d1fae5',
    secondaryColorHex: '#e7e5e4',
    roomTag: 'Bedroom',
    partType: 'ROOM_BLOCK',
  },
  {
    id: 'wb_room_study',
    name: 'Creative Study & Studio (5.6x5.8m)',
    category: 'rooms_walls',
    subcategory: 'room_modules',
    cost: 520,
    description: 'Mahogany-floored studio wing for easels, bookshelves, and workbenches.',
    width: 5.6,
    height: 2.8,
    depth: 5.8,
    colorHex: '#b45309',
    secondaryColorHex: '#5c2d16',
    roomTag: 'Study',
    partType: 'ROOM_BLOCK',
  },
  {
    id: 'wb_room_bathroom',
    name: 'Standard Spa Bathroom Module (3.6x4.8m)',
    category: 'rooms_walls',
    subcategory: 'room_modules',
    cost: 420,
    description: 'Realistic compact marble-tiled bathroom block sized for clawfoot bathtub, toilet, and sink.',
    width: 3.6,
    height: 2.8,
    depth: 4.8,
    colorHex: '#f8fafc',
    secondaryColorHex: '#e2e8f0',
    roomTag: 'Bathroom',
    partType: 'ROOM_BLOCK',
  },
  {
    id: 'wb_wall_ext_4m',
    name: 'Exterior Structural Wall (4m)',
    category: 'rooms_walls',
    subcategory: 'walls',
    cost: 120,
    description: 'Insulated 4-meter exterior wall segment with crown molding and baseboard.',
    width: 4.0,
    height: 2.8,
    depth: 0.3,
    colorHex: '#f5f5f4',
    secondaryColorHex: '#78350f',
    roomTag: 'LivingRoom',
    partType: 'WALL_SEGMENT',
  },
  {
    id: 'wb_wall_int_3m',
    name: 'Interior Partition Wall (3m)',
    category: 'rooms_walls',
    subcategory: 'walls',
    cost: 85,
    description: '3-meter interior room divider wall that automatically lowers in Cutaway view.',
    width: 3.0,
    height: 2.8,
    depth: 0.25,
    colorHex: '#fef3c7',
    secondaryColorHex: '#92400e',
    roomTag: 'Kitchen',
    partType: 'WALL_SEGMENT',
  },
  {
    id: 'wb_wall_brick_4m',
    name: 'Exposed Loft Brick Wall (4m)',
    category: 'rooms_walls',
    subcategory: 'walls',
    cost: 150,
    description: 'Artisanal red-brick structural wall segment.',
    width: 4.0,
    height: 2.8,
    depth: 0.32,
    colorHex: '#9a3412',
    secondaryColorHex: '#431407',
    roomTag: 'Study',
    partType: 'WALL_SEGMENT',
  },
  {
    id: 'wb_pillar_doric',
    name: 'Craftsman Timber & Stone Pillar',
    category: 'rooms_walls',
    subcategory: 'pillars',
    cost: 110,
    description: 'Tapered architectural support column for porches, verandas, and open-concept lofts.',
    width: 0.45,
    height: 2.8,
    depth: 0.45,
    colorHex: '#78350f',
    secondaryColorHex: '#d6d3d1',
    partType: 'PILLAR',
  },

  // 2. DOORS & WINDOWS
  {
    id: 'wb_door_craftsman',
    name: 'Craftsman Oak Entry Door',
    category: 'doors_windows',
    subcategory: 'doors',
    cost: 220,
    description: 'Solid oak paneled front door with brass hardware and white casing.',
    width: 1.4,
    height: 2.4,
    depth: 0.28,
    colorHex: '#582f0e',
    secondaryColorHex: '#ffffff',
    partType: 'DOOR',
  },
  {
    id: 'wb_door_french',
    name: 'Double French Patio Doors',
    category: 'doors_windows',
    subcategory: 'doors',
    cost: 340,
    description: 'Twin glass-paned French doors ideal for backyard patios and sunrooms.',
    width: 2.2,
    height: 2.4,
    depth: 0.28,
    colorHex: '#f8fafc',
    secondaryColorHex: '#93c5fd',
    partType: 'DOOR',
  },
  {
    id: 'wb_arch_grand',
    name: 'Open Parlor Archway',
    category: 'doors_windows',
    subcategory: 'arches',
    cost: 180,
    description: 'Walk-through cased room archway for seamless open-concept flow.',
    width: 2.0,
    height: 2.5,
    depth: 0.3,
    colorHex: '#f8fafc',
    secondaryColorHex: '#78350f',
    partType: 'ARCHWAY',
  },
  {
    id: 'wb_window_picture',
    name: 'Panoramic Picture Window',
    category: 'doors_windows',
    subcategory: 'windows',
    cost: 210,
    description: 'Wide multi-mullion picture window with projecting sill and sky-tinted glass.',
    width: 2.4,
    height: 1.6,
    depth: 0.26,
    colorHex: '#ffffff',
    secondaryColorHex: '#93c5fd',
    partType: 'WINDOW',
  },
  {
    id: 'wb_window_casement',
    name: 'Classic Casement Window',
    category: 'doors_windows',
    subcategory: 'windows',
    cost: 145,
    description: 'Traditional 4-pane divided light window with crisp wood trim.',
    width: 1.6,
    height: 1.5,
    depth: 0.25,
    colorHex: '#f8fafc',
    secondaryColorHex: '#93c5fd',
    partType: 'WINDOW',
  },
  {
    id: 'wb_window_industrial',
    name: 'Black Steel Factory Window',
    category: 'doors_windows',
    subcategory: 'windows',
    cost: 260,
    description: 'Floor-to-ceiling matte black steel grid window for modern studios.',
    width: 2.2,
    height: 2.1,
    depth: 0.25,
    colorHex: '#1e293b',
    secondaryColorHex: '#bae6fd',
    partType: 'WINDOW',
  },

  // 3. ROOFS
  {
    id: 'wb_roof_gabled',
    name: 'Classic Pitched Gable Roof',
    category: 'roofs',
    subcategory: 'pitched',
    cost: 480,
    description: 'Traditional triangular gabled cedar-shingle roof (auto-hides in Cutaway view).',
    width: 9.0,
    height: 2.4,
    depth: 9.0,
    colorHex: '#7c2d12',
    secondaryColorHex: '#f8fafc',
    partType: 'ROOF_GABLED',
  },
  {
    id: 'wb_roof_hipped',
    name: 'Suburban Slate Hipped Roof',
    category: 'roofs',
    subcategory: 'pitched',
    cost: 540,
    description: 'Four-sloped architectural slate hipped roof pyramid.',
    width: 9.0,
    height: 2.2,
    depth: 9.0,
    colorHex: '#334155',
    secondaryColorHex: '#e2e8f0',
    partType: 'ROOF_HIPPED',
  },
  {
    id: 'wb_roof_flat',
    name: 'Modern Cantilever Flat Roof + Skylight',
    category: 'roofs',
    subcategory: 'modern',
    cost: 520,
    description: 'Mid-century modern flat parapet roof slab with recessed glass skylight.',
    width: 8.5,
    height: 0.45,
    depth: 8.5,
    colorHex: '#1e293b',
    secondaryColorHex: '#38bdf8',
    partType: 'ROOF_FLAT',
  },
  {
    id: 'wb_roof_mansard',
    name: 'Victorian Mansard Crest Roof',
    category: 'roofs',
    subcategory: 'ornate',
    cost: 680,
    description: 'Steep Parisian mansard roof with decorative iron cresting.',
    width: 8.5,
    height: 2.5,
    depth: 8.5,
    colorHex: '#1e1b4b',
    secondaryColorHex: '#eab308',
    partType: 'ROOF_MANSARD',
  },

  // 4. FOUNDATIONS, DECKS, STAIRS & FENCES
  {
    id: 'wb_deck_cedar',
    name: 'Redwood Veranda Deck (5x3m)',
    category: 'foundations_decks',
    subcategory: 'decks',
    cost: 290,
    description: 'Raised timber porch deck for outdoor lounging or front entryways.',
    width: 5.0,
    height: 0.18,
    depth: 3.0,
    colorHex: '#78350f',
    secondaryColorHex: '#451a03',
    partType: 'DECK_PATIO',
  },
  {
    id: 'wb_patio_slate',
    name: 'Flagstone Courtyard Patio (6x6m)',
    category: 'foundations_decks',
    subcategory: 'decks',
    cost: 320,
    description: 'Natural cut stone outdoor terrace for BBQs, dining, or poolside chairs.',
    width: 6.0,
    height: 0.08,
    depth: 6.0,
    colorHex: '#64748b',
    secondaryColorHex: '#94a3b8',
    partType: 'DECK_PATIO',
  },
  {
    id: 'wb_stairs_oak',
    name: 'Architectural Oak Staircase',
    category: 'foundations_decks',
    subcategory: 'stairs',
    cost: 650,
    description: 'Full flight of solid oak stairs with white balusters and handrail.',
    width: 1.4,
    height: 2.85,
    depth: 4.5,
    colorHex: '#78350f',
    secondaryColorHex: '#ffffff',
    partType: 'STAIRS',
  },
  {
    id: 'wb_fence_picket',
    name: 'White Suburban Picket Fence (4m)',
    category: 'foundations_decks',
    subcategory: 'fences',
    cost: 75,
    description: 'Classic white wooden picket yard fence with posts.',
    width: 4.0,
    height: 1.0,
    depth: 0.15,
    colorHex: '#ffffff',
    secondaryColorHex: '#e2e8f0',
    partType: 'FENCE',
  },
  {
    id: 'wb_fence_iron',
    name: 'Gothic Wrought-Iron Fence (4m)',
    category: 'foundations_decks',
    subcategory: 'fences',
    cost: 110,
    description: 'Black forged iron estate railing with finial spears.',
    width: 4.0,
    height: 1.3,
    depth: 0.15,
    colorHex: '#0f172a',
    secondaryColorHex: '#eab308',
    partType: 'FENCE',
  },

  // 5. LANDSCAPING & OUTDOOR POOLS
  {
    id: 'wb_tree_cypress',
    name: 'Italian Cypress & Cedar Tree',
    category: 'landscaping',
    subcategory: 'trees',
    cost: 160,
    description: 'Tall tiered evergreen tree that casts soft dappled yard shadows.',
    width: 2.4,
    height: 5.5,
    depth: 2.4,
    colorHex: '#2d5a27',
    secondaryColorHex: '#5c4033',
    partType: 'TREE',
  },
  {
    id: 'wb_tree_cherry',
    name: 'Sakura Cherry Blossom Tree',
    category: 'landscaping',
    subcategory: 'trees',
    cost: 240,
    description: 'Ornamental flowering tree with vibrant pink canopy.',
    width: 3.2,
    height: 4.8,
    depth: 3.2,
    colorHex: '#f472b6',
    secondaryColorHex: '#451a03',
    partType: 'TREE',
  },
  {
    id: 'wb_shrub_rose',
    name: 'Blooming Rose Planter Box',
    category: 'landscaping',
    subcategory: 'shrubs',
    cost: 95,
    description: 'Stone garden planter overflowing with manicured boxwood and red roses.',
    width: 3.0,
    height: 0.8,
    depth: 0.9,
    colorHex: '#15803d',
    secondaryColorHex: '#f43f5e',
    partType: 'SHRUB_FLOWER',
  },
  {
    id: 'wb_pool_oasis',
    name: 'Sparkling Backyard Swimming Pool (9x5m)',
    category: 'landscaping',
    subcategory: 'water',
    cost: 1450,
    description: 'In-ground tiled swimming pool with coped stone border and azure water.',
    width: 9.0,
    height: 0.25,
    depth: 5.5,
    colorHex: '#0ea5e9',
    secondaryColorHex: '#d1d5db',
    partType: 'POOL',
  },

  // 6. WALL PATTERNS (Bridged from WALLPAPER_CATALOG)
  ...WALLPAPER_CATALOG.map((wp) => ({
    id: `wb_wp_${wp.id}`,
    name: wp.name,
    category: 'wall_patterns' as BuildCategory,
    subcategory: wp.category,
    cost: wp.cost,
    description: `${wp.category} wall covering (${wp.moodEffect} atmosphere).`,
    width: 1,
    height: 1,
    depth: 1,
    colorHex: wp.baseColorHex,
    secondaryColorHex: wp.accentColorHex,
    partType: 'WALLPAPER' as const,
    styleId: wp.id,
  })),

  // 7. FLOOR PATTERNS (Bridged from CARPET_CATALOG)
  ...CARPET_CATALOG.map((fl) => ({
    id: `wb_fl_${fl.id}`,
    name: fl.name,
    category: 'floor_patterns' as BuildCategory,
    subcategory: fl.category,
    cost: fl.cost,
    description: `${fl.category} flooring surface (Comfort ${fl.comfortRating}/10).`,
    width: 1,
    height: 1,
    depth: 1,
    colorHex: fl.baseColorHex,
    secondaryColorHex: fl.secondaryColorHex,
    partType: 'FLOOR_PATTERN' as const,
    styleId: fl.id,
  })),

  // 8. ESSENTIAL & LUXURY FURNISHINGS (Room-by-Room)
  {
    id: 'wb_furn_fridge',
    name: 'Retro Smeg Refrigerator',
    category: 'furnishings',
    subcategory: 'kitchen',
    cost: 650,
    description: 'Essential kitchen refrigerator for fresh meals and snacks.',
    width: 1.2,
    height: 2.2,
    depth: 1.1,
    colorHex: '#f8fafc',
    secondaryColorHex: '#94a3b8',
    roomTag: 'Kitchen',
    partType: 'SMART_FURNITURE',
    smartObjectTemplate: {
      name: 'Retro Smeg Fridge',
      room: 'Kitchen',
      category: 'kitchen',
      maturity: 'ALL',
      effects: { hunger: 35, fun: 5 },
      actionLabel: 'Grabbing a meal',
      durationSeconds: 900, // 15 minutes real-life time
    },
  },
  {
    id: 'wb_furn_stove',
    name: 'Chef Gas Range & Oven',
    category: 'furnishings',
    subcategory: 'kitchen',
    cost: 780,
    description: 'Four-burner stainless gas stove for gourmet home cooking.',
    width: 1.2,
    height: 1.1,
    depth: 1.1,
    colorHex: '#475569',
    secondaryColorHex: '#1e293b',
    roomTag: 'Kitchen',
    partType: 'SMART_FURNITURE',
    smartObjectTemplate: {
      name: 'Gas Stove & Oven',
      room: 'Kitchen',
      category: 'kitchen',
      maturity: 'ALL',
      effects: { hunger: 50, fun: 10 },
      actionLabel: 'Cooking gourmet dinner',
      durationSeconds: 2700, // 45 minutes real-life time
    },
  },
  {
    id: 'wb_furn_sink',
    name: 'Farmhouse Stainless Kitchen Sink & Counter',
    category: 'furnishings',
    subcategory: 'kitchen',
    cost: 520,
    description: 'Deep stainless double-basin kitchen sink with high-arch chrome faucet and oak cabinet.',
    width: 1.3,
    height: 1.1,
    depth: 0.9,
    colorHex: '#e2e8f0',
    secondaryColorHex: '#78350f',
    roomTag: 'Kitchen',
    partType: 'SMART_FURNITURE',
    smartObjectTemplate: {
      name: 'Farmhouse Stainless Kitchen Sink',
      room: 'Kitchen',
      category: 'kitchen',
      maturity: 'ALL',
      effects: { hygiene: 40, sanity: 10 },
      actionLabel: 'Washing hands & dishes at the kitchen sink',
      durationSeconds: 1800,
    },
  },
  {
    id: 'wb_furn_supper_table',
    name: 'Walnut Farmhouse Supper Table & 4 Chairs',
    category: 'furnishings',
    subcategory: 'kitchen',
    cost: 740,
    description: 'Solid walnut family supper table with four matching chairs and porcelain tableware.',
    width: 2.2,
    height: 0.85,
    depth: 1.5,
    colorHex: '#78350f',
    secondaryColorHex: '#fef3c7',
    roomTag: 'Kitchen',
    partType: 'SMART_FURNITURE',
    smartObjectTemplate: {
      name: 'Walnut Farmhouse Supper Table & 4 Chairs',
      room: 'Kitchen',
      category: 'kitchen',
      maturity: 'ALL',
      effects: { hunger: 30, social: 30, fun: 15 },
      actionLabel: 'Sitting down at the supper table for a shared meal',
      durationSeconds: 3600,
    },
  },
  {
    id: 'wb_furn_sofa',
    name: 'Plush Velvet Chesterfield Sofa',
    category: 'furnishings',
    subcategory: 'living',
    cost: 820,
    description: 'Deep 3-cushion living room sofa for lounging, chatting, and naps.',
    width: 3.0,
    height: 1.0,
    depth: 1.2,
    colorHex: '#4338ca',
    secondaryColorHex: '#312e81',
    roomTag: 'LivingRoom',
    partType: 'SMART_FURNITURE',
    smartObjectTemplate: {
      name: 'Velvet Living Sofa',
      room: 'LivingRoom',
      category: 'living',
      maturity: 'ALL',
      effects: { energy: 25, fun: 20, social: 15 },
      actionLabel: 'Lounging on the sofa',
      durationSeconds: 5400, // 1.5 hours real-life time
    },
  },
  {
    id: 'wb_furn_tv',
    name: '65" 4K Cinema TV & Credenza',
    category: 'furnishings',
    subcategory: 'living',
    cost: 950,
    description: 'Widescreen smart TV on walnut media credenza.',
    width: 2.0,
    height: 1.6,
    depth: 0.8,
    colorHex: '#0f172a',
    secondaryColorHex: '#38bdf8',
    roomTag: 'LivingRoom',
    partType: 'SMART_FURNITURE',
    smartObjectTemplate: {
      name: 'Retro CRT TV',
      room: 'LivingRoom',
      category: 'living',
      maturity: 'ALL',
      effects: { fun: 35, social: 10 },
      actionLabel: 'Sitting on the couch watching TV',
      durationSeconds: 7200, // 2 hours real-life time
    },
  },
  {
    id: 'wb_furn_bed',
    name: 'King Canopy Master Bed',
    category: 'furnishings',
    subcategory: 'bedroom',
    cost: 1100,
    description: 'Solid oak king bed with quilted duvet and plush pillows.',
    width: 2.6,
    height: 1.4,
    depth: 2.8,
    colorHex: '#4338ca',
    secondaryColorHex: '#78350f',
    roomTag: 'Bedroom',
    partType: 'SMART_FURNITURE',
    smartObjectTemplate: {
      name: 'Master Bed',
      room: 'Bedroom',
      category: 'bedroom',
      maturity: 'ALL',
      effects: { energy: 65, sanity: 15 },
      actionLabel: 'Sleeping deeply',
      durationSeconds: 28800, // 8 hours real-life time
    },
  },
  {
    id: 'wb_furn_shower',
    name: 'Glass Rainfall Shower & Tub',
    category: 'furnishings',
    subcategory: 'bathroom',
    cost: 720,
    description: 'Frameless glass shower enclosure with brass rainfall showerhead.',
    width: 1.3,
    height: 2.3,
    depth: 1.3,
    colorHex: '#bae6fd',
    secondaryColorHex: '#f8fafc',
    roomTag: 'Bathroom',
    partType: 'SMART_FURNITURE',
    smartObjectTemplate: {
      name: 'Glass Shower',
      room: 'Bathroom',
      category: 'bathroom',
      maturity: 'ALL',
      effects: { hygiene: 60, sanity: 10 },
      actionLabel: 'Taking a hot shower',
      durationSeconds: 1200, // 20 minutes real-life time
    },
  },
  {
    id: 'wb_furn_toilet',
    name: 'Porcelain Low-Flow Toilet',
    category: 'furnishings',
    subcategory: 'bathroom',
    cost: 340,
    description: 'Essential bathroom fixture.',
    width: 0.7,
    height: 0.9,
    depth: 0.8,
    colorHex: '#f8fafc',
    secondaryColorHex: '#cbd5e1',
    roomTag: 'Bathroom',
    partType: 'SMART_FURNITURE',
    smartObjectTemplate: {
      name: 'Porcelain Toilet',
      room: 'Bathroom',
      category: 'bathroom',
      maturity: 'ALL',
      effects: { bladder: 75 },
      actionLabel: 'Using restroom',
      durationSeconds: 360, // 6 minutes real-life time
    },
  },
  {
    id: 'wb_furn_easel',
    name: 'Studio Wooden Painting Easel',
    category: 'furnishings',
    subcategory: 'study',
    cost: 450,
    description: 'A-frame artist easel with canvas and oil palette.',
    width: 1.0,
    height: 1.9,
    depth: 1.0,
    colorHex: '#78350f',
    secondaryColorHex: '#fefce8',
    roomTag: 'Study',
    partType: 'SMART_FURNITURE',
    smartObjectTemplate: {
      name: 'Wooden Painting Easel',
      room: 'Study',
      category: 'study',
      maturity: 'ALL',
      effects: { fun: 35, sanity: 20 },
      actionLabel: 'Painting a canvas',
      durationSeconds: 9000, // 2.5 hours real-life time
    },
  },
  {
    id: 'wb_furn_newspaper',
    name: 'The Suburban Chronicle Newspaper Stand',
    category: 'furnishings',
    subcategory: 'living',
    cost: 120,
    description: 'Delivers daily Google-Search-grounded headlines for toons to read and discuss.',
    width: 0.9,
    height: 0.8,
    depth: 0.9,
    colorHex: '#fefce8',
    secondaryColorHex: '#78350f',
    roomTag: 'LivingRoom',
    partType: 'SMART_FURNITURE',
    smartObjectTemplate: {
      name: 'The Suburban Chronicle Newspaper',
      room: 'LivingRoom',
      category: 'living',
      maturity: 'ALL',
      effects: { fun: 20, sanity: 12, social: 10 },
      actionLabel: 'Reading The Suburban Chronicle',
      durationSeconds: 1800, // 30 minutes real-life time
    },
  },
  ...COMPLETE_FURNISHINGS_CATALOG.map((f) => ({
    id: `wb_cat_${f.id}`,
    name: f.name,
    category: 'furnishings' as BuildCategory,
    subcategory: f.category as FurnishSubcategory,
    cost: f.cost,
    description: `${f.styleTheme} ${f.materialFinish} — ${f.actionLabel}`,
    width: 1.5,
    height: 1.3,
    depth: 1.2,
    colorHex: '#78350f',
    secondaryColorHex: '#e2e8f0',
    roomTag: f.room,
    partType: 'SMART_FURNITURE' as const,
    smartObjectTemplate: {
      name: f.name,
      room: f.room,
      category: f.category,
      maturity: f.maturity,
      effects: f.effects,
      actionLabel: f.actionLabel,
      durationSeconds: f.durationSeconds,
    },
  })),
];

/**
 * Snaps arbitrary world X/Z coordinates to the lot grid (default 0.5m precision, clamped within [-16, 16]).
 */
export function snapToLotGrid(
  x: number,
  z: number,
  step = 0.5
): { x: number; z: number } {
  const clamp = (v: number) => Math.max(-16, Math.min(16, Math.round(v / step) * step));
  return {
    x: clamp(x),
    z: clamp(z),
  };
}

/**
 * Returns a fresh Empty Grid WorldBlueprint where the pre-built house is cleared
 * so the user starts with a clean 36x36 lot grid and building parts.
 */
export function createEmptyGridBlueprint(lotTitle = 'Empty Custom Lot Grid'): WorldBlueprint {
  return {
    isEmptyGridMode: true,
    lotTitle,
    architecturalStyle: 'Custom User Build',
    placedParts: [],
  };
}

/**
 * Places a building part or furniture item onto the WorldBlueprint grid.
 */
export function placeBuildingPartOnGrid(
  blueprint: WorldBlueprint,
  part: BuildingPartDefinition,
  rawPos: { x: number; y?: number; z: number },
  rotationY = 0,
  existingSmartObjects: SmartObject[] = []
): {
  updatedBlueprint: WorldBlueprint;
  spawnedSmartObject?: SmartObject;
  cost: number;
  enforcedRoom?: RoomName;
  wasRoomEnforced?: boolean;
  roomRuleFeedback?: string;
} {
  const snapped = snapToLotGrid(rawPos.x, rawPos.z, 0.5);
  const posY = rawPos.y ?? 0;

  if (part.partType === 'SMART_FURNITURE' && part.smartObjectTemplate) {
    const templateIdBase = part.id.replace(/^wb_cat_|^wb_furn_/, '');
    const candidateId = `${templateIdBase}_${Date.now().toString(36)}_${Math.floor(Math.random() * 999)}`;
    const requiredRule = getRequiredRoomForFurniture({
      id: templateIdBase,
      name: part.smartObjectTemplate.name,
      category: part.smartObjectTemplate.category,
      room: part.smartObjectTemplate.room,
      gridPos: { x: snapped.x, y: posY, z: snapped.z },
    });
    const targetRoom = requiredRule.isRoomRestricted
      ? requiredRule.requiredRoom
      : part.smartObjectTemplate.room;

    const safePlacement = resolveNonToonObjectPlacement(
      { x: snapped.x, y: posY, z: snapped.z },
      {
        id: candidateId,
        name: part.smartObjectTemplate.name,
        category: part.smartObjectTemplate.category,
        rotationY,
        room: targetRoom,
      },
      existingSmartObjects,
      blueprint.placedParts.map((p) => ({
        ...p,
        label: p.name,
        roomType: p.roomTag,
      })),
      !blueprint.isEmptyGridMode
    );
    const spawned: SmartObject = {
      ...part.smartObjectTemplate,
      id: candidateId,
      room: safePlacement.enforcedRoom,
      gridPos: safePlacement.safePos,
      state: 'Clean',
    };
    return {
      updatedBlueprint: blueprint,
      spawnedSmartObject: spawned,
      cost: part.cost,
      enforcedRoom: safePlacement.enforcedRoom,
      wasRoomEnforced: safePlacement.wasRoomEnforced,
      roomRuleFeedback: safePlacement.roomRuleMessage,
    };
  }

  const candidateId = `part_${Date.now().toString(36)}_${Math.floor(Math.random() * 9999)}`;
  const safePartPlacement = resolveNonToonObjectPlacement(
    { x: snapped.x, y: posY, z: snapped.z },
    {
      id: candidateId,
      name: part.name,
      partType: part.partType,
      width: part.width,
      height: part.height,
      depth: part.depth,
      rotationY,
      room: part.roomTag,
    },
    existingSmartObjects,
    blueprint.placedParts.map((p) => ({
      ...p,
      label: p.name,
      roomType: p.roomTag,
    })),
    !blueprint.isEmptyGridMode
  );

  const placed: PlacedBuildingPart = {
    id: candidateId,
    partId: part.id,
    name: part.name,
    category: part.category,
    partType: part.partType,
    gridPos: safePartPlacement.safePos,
    rotationY,
    width: part.width,
    height: part.height,
    depth: part.depth,
    colorHex: part.colorHex,
    secondaryColorHex: part.secondaryColorHex,
    roomTag: safePartPlacement.enforcedRoom || part.roomTag,
  };

  return {
    updatedBlueprint: {
      ...blueprint,
      placedParts: [...blueprint.placedParts, placed],
    },
    cost: part.cost,
    enforcedRoom: safePartPlacement.enforcedRoom,
    wasRoomEnforced: safePartPlacement.wasRoomEnforced,
    roomRuleFeedback: safePartPlacement.roomRuleMessage,
  };
}

/**
 * Sledgehammer tool: removes the nearest placed building part or smart object within `radius` meters of (x, z)
 * and refunds 80% of its value.
 */
export function removeBuildingPartAtPosition(
  blueprint: WorldBlueprint,
  smartObjects: SmartObject[],
  pos: { x: number; z: number },
  radius = 2.6
): {
  updatedBlueprint: WorldBlueprint;
  updatedSmartObjects: SmartObject[];
  refund: number;
  removedName: string | null;
} {
  // Check SmartObjects first
  let nearestObjIdx = -1;
  let nearestObjDist = radius;
  smartObjects.forEach((obj, idx) => {
    const d = Math.hypot(obj.gridPos.x - pos.x, obj.gridPos.z - pos.z);
    if (d < nearestObjDist) {
      nearestObjDist = d;
      nearestObjIdx = idx;
    }
  });

  // Check PlacedBuildingParts
  let nearestPartIdx = -1;
  let nearestPartDist = radius;
  blueprint.placedParts.forEach((part, idx) => {
    const d = Math.hypot(part.gridPos.x - pos.x, part.gridPos.z - pos.z);
    if (d < nearestPartDist) {
      nearestPartDist = d;
      nearestPartIdx = idx;
    }
  });

  if (nearestObjIdx !== -1 && (nearestPartIdx === -1 || nearestObjDist <= nearestPartDist)) {
    const target = smartObjects[nearestObjIdx];
    const updatedSmartObjects = smartObjects.filter((_, i) => i !== nearestObjIdx);
    return {
      updatedBlueprint: blueprint,
      updatedSmartObjects,
      refund: 320,
      removedName: target.name,
    };
  }

  if (nearestPartIdx !== -1) {
    const target = blueprint.placedParts[nearestPartIdx];
    const def = WORLD_BUILDER_CATALOG.find((c) => c.id === target.partId);
    const refund = Math.round((def?.cost || 250) * 0.8);
    return {
      updatedBlueprint: {
        ...blueprint,
        placedParts: blueprint.placedParts.filter((_, i) => i !== nearestPartIdx),
      },
      updatedSmartObjects: smartObjects,
      refund,
      removedName: target.name,
    };
  }

  return {
    updatedBlueprint: blueprint,
    updatedSmartObjects: smartObjects,
    refund: 0,
    removedName: null,
  };
}

export type StandardRoomType = 'Kitchen' | 'Bathroom' | 'Bedroom' | 'LivingRoom' | 'Study';

export interface StandardRoomFixtureSpec {
  fixtureKey: string;
  label: string;
  matchKeywords: string[];
  defaultObjectTemplate: Omit<SmartObject, 'id' | 'gridPos' | 'state'>;
  relativeOffset: { x: number; z: number };
}

export interface StandardRoomStylePairing {
  styleName: string;
  wallPatternId: string;
  floorPatternId: string;
  wallColorHex: string;
  floorColorHex: string;
}

export interface StandardRoomRequirementRule {
  roomType: StandardRoomType;
  intendedUse: string;
  standardSizeMeters: { width: number; depth: number; minWidth: number; maxWidth: number; minDepth: number; maxDepth: number };
  layoutVariants: Array<{ label: string; width: number; depth: number }>;
  minDoors: number;
  minWindows: number;
  requiresBedPerToon?: boolean;
  requiredFixtures: StandardRoomFixtureSpec[];
  consistentStylePairings: StandardRoomStylePairing[];
}

/**
 * Standard Room Generation Rules (`ROOM_GENERATION_RULES`):
 * Defines architectural & furnishing requirements per room based on intended use:
 * - Doors & Windows requirements
 * - Essential real-world counterpart furniture & fixtures (bathtub/toilet, stove, sink, fridge, beds, supper table)
 * - Realistic standard room dimensions & varied layout options (compact Bathroom ~3.6×4.8m, standard Bedroom ~6.6×6.5m)
 * - Matched Wall & Floor style consistency per room
 * - Dedicated personal bed requirement per toon in Bedroom
 */
export const ROOM_GENERATION_RULES: Record<StandardRoomType, StandardRoomRequirementRule> = {
  Kitchen: {
    roomType: 'Kitchen',
    intendedUse: 'Culinary meal preparation, washing dishes, refrigeration, and shared family supper dining.',
    standardSizeMeters: {
      width: 7.6,
      depth: 7.0,
      minWidth: 6.4,
      maxWidth: 8.6,
      minDepth: 6.0,
      maxDepth: 8.0,
    },
    layoutVariants: [
      { label: 'Classic Galley & Supper Nook (7.6×7.0m)', width: 7.6, depth: 7.0 },
      { label: 'Wide Chef Culinary Wing (8.4×6.4m)', width: 8.4, depth: 6.4 },
      { label: 'Deep Farmhouse Supper Kitchen (6.8×7.8m)', width: 6.8, depth: 7.8 },
    ],
    minDoors: 1,
    minWindows: 2,
    requiredFixtures: [
      {
        fixtureKey: 'stove',
        label: 'Chef Gas Stove & Oven',
        matchKeywords: ['stove', 'range', 'oven'],
        relativeOffset: { x: -0.6, z: -2.2 },
        defaultObjectTemplate: {
          name: 'ChefMaster 4-Burner Gas Stove & Oven',
          room: 'Kitchen',
          category: 'kitchen',
          maturity: 'ALL',
          effects: { hunger: 65, fun: 10 },
          actionLabel: 'Cooking a warm homemade meal',
          durationSeconds: 5400,
        },
      },
      {
        fixtureKey: 'sink',
        label: 'Farmhouse Stainless Kitchen Sink',
        matchKeywords: ['sink', 'basin', 'dishwasher'],
        relativeOffset: { x: 1.6, z: -2.2 },
        defaultObjectTemplate: {
          name: 'Farmhouse Stainless Kitchen Sink & Counter',
          room: 'Kitchen',
          category: 'kitchen',
          maturity: 'ALL',
          effects: { hygiene: 40, sanity: 10 },
          actionLabel: 'Washing hands & dishes at the kitchen sink',
          durationSeconds: 3600,
        },
      },
      {
        fixtureKey: 'fridge',
        label: 'Retro Frost Refrigerator',
        matchKeywords: ['fridge', 'refrigerator', 'freezer'],
        relativeOffset: { x: -2.6, z: -2.2 },
        defaultObjectTemplate: {
          name: 'Retro Frost Double-Door Refrigerator',
          room: 'Kitchen',
          category: 'kitchen',
          maturity: 'ALL',
          effects: { hunger: 45, energy: 5 },
          actionLabel: 'Preparing & eating a fresh meal',
          durationSeconds: 3600,
        },
      },
      {
        fixtureKey: 'supper_table',
        label: 'Walnut Farmhouse Supper Table',
        matchKeywords: ['supper', 'dining', 'table'],
        relativeOffset: { x: -0.4, z: 1.2 },
        defaultObjectTemplate: {
          name: 'Walnut Farmhouse Supper Table & Dining Suite',
          room: 'Kitchen',
          category: 'kitchen',
          maturity: 'ALL',
          effects: { hunger: 30, social: 30, fun: 15 },
          actionLabel: 'Sitting down at the supper table for a shared meal',
          durationSeconds: 5400,
        },
      },
    ],
    consistentStylePairings: [
      {
        styleName: 'Tuscan Culinary Plaster & Checkerboard Tile',
        wallPatternId: 'wp_terracotta_venetian',
        floorPatternId: 'fl_checker_marble',
        wallColorHex: '#fef3c7',
        floorColorHex: '#f8fafc',
      },
      {
        styleName: 'Colonial Wainscot & Warm Oak Kitchen',
        wallPatternId: 'wp_classic_wainscot',
        floorPatternId: 'fl_honey_oak',
        wallColorHex: '#f5f5f4',
        floorColorHex: '#b45309',
      },
      {
        styleName: 'Artisanal Loft Brick & Slate Tile',
        wallPatternId: 'wp_industrial_brick',
        floorPatternId: 'fl_slate_flagstone',
        wallColorHex: '#d97706',
        floorColorHex: '#475569',
      },
    ],
  },
  Bathroom: {
    roomType: 'Bathroom',
    intendedUse: 'Personal hygiene, warm baths/showers, and restroom bladder relief in a compact waterproofed enclosure.',
    standardSizeMeters: {
      width: 3.6,
      depth: 4.8,
      minWidth: 3.0,
      maxWidth: 4.6,
      minDepth: 3.8,
      maxDepth: 5.5,
    },
    layoutVariants: [
      { label: 'Standard En-Suite Bath (3.6×4.8m)', width: 3.6, depth: 4.8 },
      { label: 'Compact Powder & Tub Bath (3.4×4.4m)', width: 3.4, depth: 4.4 },
      { label: 'Spa Wet-Room Suite (4.0×5.0m)', width: 4.0, depth: 5.0 },
    ],
    minDoors: 1,
    minWindows: 1,
    requiredFixtures: [
      {
        fixtureKey: 'bathtub',
        label: 'Porcelain Clawfoot Bathtub',
        matchKeywords: ['bathtub', 'shower', 'tub'],
        relativeOffset: { x: 0.5, z: 1.1 },
        defaultObjectTemplate: {
          name: 'Porcelain Clawfoot Bathtub',
          room: 'Bathroom',
          category: 'bathroom',
          maturity: 'ALL',
          effects: { hygiene: 75, sanity: 10 },
          actionLabel: 'Taking a relaxing warm bath',
          durationSeconds: 5400,
        },
      },
      {
        fixtureKey: 'toilet',
        label: 'Classic Porcelain Flush Toilet',
        matchKeywords: ['toilet', 'restroom'],
        relativeOffset: { x: -0.9, z: -1.1 },
        defaultObjectTemplate: {
          name: 'Classic Flush Toilet',
          room: 'Bathroom',
          category: 'bathroom',
          maturity: 'ALL',
          effects: { bladder: 80 },
          actionLabel: 'Freshening up in the bathroom',
          durationSeconds: 3600,
        },
      },
    ],
    consistentStylePairings: [
      {
        styleName: 'Classic Beadboard Wainscot & Marble Tile',
        wallPatternId: 'wp_classic_wainscot',
        floorPatternId: 'fl_checker_marble',
        wallColorHex: '#f8fafc',
        floorColorHex: '#e2e8f0',
      },
      {
        styleName: 'Botanical Spa Sage & Cool Slate Tile',
        wallPatternId: 'wp_botanical_sage',
        floorPatternId: 'fl_slate_flagstone',
        wallColorHex: '#d1fae5',
        floorColorHex: '#64748b',
      },
    ],
  },
  Bedroom: {
    roomType: 'Bedroom',
    intendedUse: 'Restorative sleep and tired/awakeness stat recovery with an individual personal bed for every household toon.',
    standardSizeMeters: {
      width: 6.6,
      depth: 6.5,
      minWidth: 5.6,
      maxWidth: 7.8,
      minDepth: 5.6,
      maxDepth: 7.5,
    },
    layoutVariants: [
      { label: 'Standard Master Suite (6.6×6.5m)', width: 6.6, depth: 6.5 },
      { label: 'Wide Multi-Bed Dormitory Suite (7.4×6.2m)', width: 7.4, depth: 6.2 },
      { label: 'Cozy Garden Bedroom (6.0×6.8m)', width: 6.0, depth: 6.8 },
    ],
    minDoors: 1,
    minWindows: 2,
    requiresBedPerToon: true,
    requiredFixtures: [
      {
        fixtureKey: 'bed',
        label: 'Personal Canopy Feather Bed',
        matchKeywords: ['bed', 'daybed', 'mattress'],
        relativeOffset: { x: 1.4, z: 1.2 },
        defaultObjectTemplate: {
          name: 'Canopy Feather Double Bed',
          room: 'Bedroom',
          category: 'bedroom',
          maturity: 'ALL',
          effects: { energy: 72, sanity: 15 },
          actionLabel: 'Sleeping peacefully in personal bed',
          durationSeconds: 28800,
        },
      },
    ],
    consistentStylePairings: [
      {
        styleName: 'Botanical Sage & Cream Berber Carpet',
        wallPatternId: 'wp_botanical_sage',
        floorPatternId: 'fl_plush_berber',
        wallColorHex: '#d1fae5',
        floorColorHex: '#e7e5e4',
      },
      {
        styleName: 'Pastel Nursery & Warm Honey Oak',
        wallPatternId: 'wp_pastel_nursery',
        floorPatternId: 'fl_honey_oak',
        wallColorHex: '#e0f2fe',
        floorColorHex: '#b45309',
      },
      {
        styleName: 'Mid-Century Teak & Emerald Tuft Carpet',
        wallPatternId: 'wp_midcentury_teak',
        floorPatternId: 'fl_emerald_tuft',
        wallColorHex: '#b45309',
        floorColorHex: '#065f46',
      },
    ],
  },
  LivingRoom: {
    roomType: 'LivingRoom',
    intendedUse: 'Household socializing, lounging on sofas, watching television, and reading daily news.',
    standardSizeMeters: {
      width: 8.4,
      depth: 7.4,
      minWidth: 7.2,
      maxWidth: 9.6,
      minDepth: 6.4,
      maxDepth: 8.6,
    },
    layoutVariants: [
      { label: 'Grand Parlor Lounge (8.4×7.4m)', width: 8.4, depth: 7.4 },
      { label: 'Panoramic Social Great Room (9.0×6.8m)', width: 9.0, depth: 6.8 },
      { label: 'Square Hearth Parlor (7.8×7.8m)', width: 7.8, depth: 7.8 },
    ],
    minDoors: 1,
    minWindows: 2,
    requiredFixtures: [
      {
        fixtureKey: 'sofa',
        label: 'Tufted Velvet Sofa',
        matchKeywords: ['sofa', 'couch', 'sectional'],
        relativeOffset: { x: 0.2, z: 0.6 },
        defaultObjectTemplate: {
          name: 'Tufted Velvet Sofa',
          room: 'LivingRoom',
          category: 'living',
          maturity: 'ALL',
          effects: { energy: 25, fun: 20, social: 20 },
          actionLabel: 'Lounging on the sofa',
          durationSeconds: 5400,
        },
      },
      {
        fixtureKey: 'tv',
        label: 'Cinema Console Television',
        matchKeywords: ['tv', 'television', 'cinema'],
        relativeOffset: { x: 0.2, z: -2.4 },
        defaultObjectTemplate: {
          name: 'Vintage Console Television',
          room: 'LivingRoom',
          category: 'living',
          maturity: 'ALL',
          effects: { fun: 35, social: 12, sanity: 5 },
          actionLabel: 'Sitting on the couch watching TV',
          durationSeconds: 7200,
        },
      },
    ],
    consistentStylePairings: [
      {
        styleName: 'Colonial Wainscot & Honey Oak Parlor',
        wallPatternId: 'wp_classic_wainscot',
        floorPatternId: 'fl_honey_oak',
        wallColorHex: '#f5f5f4',
        floorColorHex: '#b45309',
      },
      {
        styleName: 'Mid-Century Teak & Mahogany Herringbone',
        wallPatternId: 'wp_midcentury_teak',
        floorPatternId: 'fl_mahogany_herringbone',
        wallColorHex: '#b45309',
        floorColorHex: '#5c2d16',
      },
    ],
  },
  Study: {
    roomType: 'Study',
    intendedUse: 'Quiet reading, research, painting on easels, and intellectual skill building.',
    standardSizeMeters: {
      width: 5.6,
      depth: 5.8,
      minWidth: 4.8,
      maxWidth: 6.8,
      minDepth: 4.8,
      maxDepth: 6.8,
    },
    layoutVariants: [
      { label: 'Classic Scholar Study (5.6×5.8m)', width: 5.6, depth: 5.8 },
      { label: 'Atelier Corner Studio (6.2×5.2m)', width: 6.2, depth: 5.2 },
      { label: 'Library Conservatory (5.2×6.2m)', width: 5.2, depth: 6.2 },
    ],
    minDoors: 1,
    minWindows: 2,
    requiredFixtures: [
      {
        fixtureKey: 'bookshelf',
        label: 'Carved Mahogany Bookshelf',
        matchKeywords: ['bookshelf', 'library', 'bookcase'],
        relativeOffset: { x: -1.8, z: -1.4 },
        defaultObjectTemplate: {
          name: 'Carved Mahogany Bookshelf',
          room: 'Study',
          category: 'study',
          maturity: 'ALL',
          effects: { fun: 30, sanity: 12 },
          actionLabel: 'Reading an antique novel',
          durationSeconds: 5400,
        },
      },
      {
        fixtureKey: 'easel',
        label: 'Oak Studio Painting Easel',
        matchKeywords: ['easel', 'canvas', 'desk', 'laptop'],
        relativeOffset: { x: 1.2, z: 0.8 },
        defaultObjectTemplate: {
          name: 'Oak Studio Painting Easel',
          room: 'Study',
          category: 'study',
          maturity: 'ALL',
          effects: { fun: 40, sanity: 15 },
          actionLabel: 'Painting an expressive landscape',
          durationSeconds: 7200,
        },
      },
    ],
    consistentStylePairings: [
      {
        styleName: 'Mid-Century Teak & Mahogany Herringbone',
        wallPatternId: 'wp_midcentury_teak',
        floorPatternId: 'fl_mahogany_herringbone',
        wallColorHex: '#b45309',
        floorColorHex: '#5c2d16',
      },
      {
        styleName: 'Classic Wainscot & Honey Oak Library',
        wallPatternId: 'wp_classic_wainscot',
        floorPatternId: 'fl_honey_oak',
        wallColorHex: '#f5f5f4',
        floorColorHex: '#b45309',
      },
    ],
  },
};

/**
 * Generates a complete, standard-compliant room module (`ROOM_BLOCK`, required `DOOR`s, `WINDOW`s,
 * consistent wall/floor pattern pairing, and required real-world furniture/fixtures) based on `ROOM_GENERATION_RULES`.
 */
export function generateStandardRoomModule(
  roomType: StandardRoomType,
  centerPos: { x: number; y?: number; z: number },
  options?: {
    layoutVariantIndex?: number;
    stylePairingIndex?: number;
    existingSmartObjects?: SmartObject[];
    existingPlacedParts?: PlacedBuildingPart[];
    characters?: Character[];
  }
): {
  roomBlock: PlacedBuildingPart;
  doorsAndWindows: PlacedBuildingPart[];
  spawnedSmartObjects: SmartObject[];
  stylePairing: StandardRoomStylePairing;
  layoutVariant: { label: string; width: number; depth: number };
} {
  const rule = ROOM_GENERATION_RULES[roomType];
  const variantIdx =
    typeof options?.layoutVariantIndex === 'number'
      ? Math.abs(options.layoutVariantIndex) % rule.layoutVariants.length
      : Math.floor(Math.random() * rule.layoutVariants.length);
  const layoutVariant = rule.layoutVariants[variantIdx];

  const styleIdx =
    typeof options?.stylePairingIndex === 'number'
      ? Math.abs(options.stylePairingIndex) % rule.consistentStylePairings.length
      : 0;
  const stylePairing = rule.consistentStylePairings[styleIdx];

  const snappedCenter = snapToLotGrid(centerPos.x, centerPos.z, 0.5);
  const y = centerPos.y ?? 0;
  const stamp = `${Date.now().toString(36)}_${Math.floor(Math.random() * 999)}`;

  const roomBlock: PlacedBuildingPart = {
    id: `gen_room_${roomType.toLowerCase()}_${stamp}`,
    partId: `wb_room_${roomType.toLowerCase()}`,
    name: `${layoutVariant.label}`,
    category: 'rooms_walls',
    partType: 'ROOM_BLOCK',
    gridPos: { x: snappedCenter.x, y, z: snappedCenter.z },
    rotationY: 0,
    width: layoutVariant.width,
    height: 2.8,
    depth: layoutVariant.depth,
    colorHex: stylePairing.wallColorHex,
    secondaryColorHex: stylePairing.floorColorHex,
    roomTag: roomType,
    wallPatternId: stylePairing.wallPatternId,
    floorPatternId: stylePairing.floorPatternId,
  };

  const doorsAndWindows: PlacedBuildingPart[] = [];
  // Add required door(s)
  for (let d = 0; d < rule.minDoors; d++) {
    doorsAndWindows.push({
      id: `gen_door_${roomType.toLowerCase()}_${d}_${stamp}`,
      partId: 'wb_door_craftsman',
      name: `${roomType} Entry Door`,
      category: 'doors_windows',
      partType: 'DOOR',
      gridPos: {
        x: snappedCenter.x + (d === 0 ? 0 : -1.5),
        y,
        z: Math.round((snappedCenter.z + layoutVariant.depth / 2) * 10) / 10,
      },
      rotationY: 0,
      width: 1.3,
      height: 2.3,
      depth: 0.26,
      colorHex: '#582f0e',
      secondaryColorHex: '#ffffff',
      roomTag: roomType,
    });
  }

  // Add required window(s)
  for (let w = 0; w < rule.minWindows; w++) {
    const offsetX =
      rule.minWindows === 1
        ? 0
        : (w - (rule.minWindows - 1) / 2) * Math.min(2.6, layoutVariant.width * 0.36);
    doorsAndWindows.push({
      id: `gen_win_${roomType.toLowerCase()}_${w}_${stamp}`,
      partId: 'wb_window_casement',
      name: `${roomType} Daylight Window ${w + 1}`,
      category: 'doors_windows',
      partType: 'WINDOW',
      gridPos: {
        x: Math.round((snappedCenter.x + offsetX) * 10) / 10,
        y: y + 0.85,
        z: Math.round((snappedCenter.z - layoutVariant.depth / 2) * 10) / 10,
      },
      rotationY: 0,
      width: 1.6,
      height: 1.5,
      depth: 0.25,
      colorHex: '#f8fafc',
      secondaryColorHex: '#93c5fd',
      roomTag: roomType,
    });
  }

  const spawnedSmartObjects: SmartObject[] = [];
  const allExistingObjects = [...(options?.existingSmartObjects || [])];

  for (const fixture of rule.requiredFixtures) {
    // Check if an object matching this fixture already exists in this room
    const alreadyExistsInRoom = allExistingObjects.some(
      (o) =>
        o.room === roomType &&
        fixture.matchKeywords.some(
          (kw) => o.id.toLowerCase().includes(kw) || o.name.toLowerCase().includes(kw)
        )
    );
    if (alreadyExistsInRoom && fixture.fixtureKey !== 'bed') continue;

    const candidateId = `obj_${fixture.fixtureKey}_${roomType.toLowerCase()}_${stamp}`;
    const targetX = snappedCenter.x + fixture.relativeOffset.x;
    const targetZ = snappedCenter.z + fixture.relativeOffset.z;
    const safePlacement = resolveNonToonObjectPlacement(
      { x: targetX, y, z: targetZ },
      {
        id: candidateId,
        name: fixture.defaultObjectTemplate.name,
        category: fixture.defaultObjectTemplate.category,
        room: roomType,
      },
      [...allExistingObjects, ...spawnedSmartObjects],
      [
        ...(options?.existingPlacedParts || []),
        {
          ...roomBlock,
          label: roomBlock.name,
          roomType,
        },
      ],
      false
    );

    const obj: SmartObject = {
      ...fixture.defaultObjectTemplate,
      id: candidateId,
      room: safePlacement.enforcedRoom,
      gridPos: safePlacement.safePos,
      state: 'Clean',
    };
    spawnedSmartObjects.push(obj);
  }

  // If this is a Bedroom and characters are provided, ensure every toon has a personal bed
  if (roomType === 'Bedroom' && options?.characters && options.characters.length > 0) {
    const bedSync = ensurePersonalBedsForAllToons(options.characters, [
      ...allExistingObjects,
      ...spawnedSmartObjects,
    ]);
    for (const newBed of bedSync.newlySpawnedBeds) {
      if (!spawnedSmartObjects.some((s) => s.id === newBed.id)) {
        spawnedSmartObjects.push(newBed);
      }
    }
  }

  return {
    roomBlock,
    doorsAndWindows,
    spawnedSmartObjects,
    stylePairing,
    layoutVariant,
  };
}

export interface RoomComplianceReport {
  roomType: StandardRoomType;
  compliant: boolean;
  hasRealisticProportions: boolean;
  hasStyleConsistency: boolean;
  missingFixtures: string[];
  bedCountForToons: { required: number; actual: number };
}

/**
 * Validates all standard rooms in a house against `ROOM_GENERATION_RULES`,
 * checking required fixtures (`stove`, `sink`, `fridge`, `supper_table`, `bathtub`, `toilet`, `beds`),
 * realistic room sizes (compact Bathroom, standard Bedroom), wall/floor style consistency,
 * and 1 personal bed per toon.
 */
export function validateHouseRoomsCompliance(
  placedPartsOrObjects: PlacedBuildingPart[] | SmartObject[],
  smartObjectsOrCount?: SmartObject[] | number,
  charactersArg?: Character[],
  roomWallpapers?: Record<string, string>,
  roomCarpets?: Record<string, string>
): {
  allCompliant: boolean;
  reports: Record<StandardRoomType, RoomComplianceReport>;
  missingRequirements: string[];
} {
  // Support both (placedParts, smartObjects, characters, wallpapers, carpets)
  // and legacy 2-arg call (smartObjects, characterCount)
  let placedParts: PlacedBuildingPart[] = [];
  let smartObjects: SmartObject[] = [];
  let characters: Character[] = [];

  if (typeof smartObjectsOrCount === 'number' || smartObjectsOrCount === undefined) {
    smartObjects = Array.isArray(placedPartsOrObjects)
      ? (placedPartsOrObjects as SmartObject[])
      : [];
    const count = typeof smartObjectsOrCount === 'number' ? smartObjectsOrCount : 3;
    characters = Array.from({ length: Math.max(1, count) }, (_, idx) => ({
      id: `char_placeholder_${idx}`,
    })) as Character[];
  } else {
    placedParts = Array.isArray(placedPartsOrObjects)
      ? (placedPartsOrObjects as PlacedBuildingPart[])
      : [];
    smartObjects = Array.isArray(smartObjectsOrCount) ? smartObjectsOrCount : [];
    characters = Array.isArray(charactersArg) ? charactersArg : [];
  }

  const roomTypes: StandardRoomType[] = ['Kitchen', 'Bathroom', 'Bedroom', 'LivingRoom', 'Study'];
  const reports = {} as Record<StandardRoomType, RoomComplianceReport>;
  const missingRequirements: string[] = [];
  let allCompliant = true;

  const totalBeds = smartObjects.filter(
    (o) =>
      Boolean(o) &&
      ((o.id || '').toLowerCase().includes('bed') ||
        (o.name || '').toLowerCase().includes('bed'))
  ).length;
  const requiredBeds = Math.max(1, characters.length);

  for (const rType of roomTypes) {
    const rule = ROOM_GENERATION_RULES[rType];
    const roomPart = placedParts.find(
      (p) => p && p.partType === 'ROOM_BLOCK' && p.roomTag === rType
    );

    const hasRealisticProportions = roomPart
      ? roomPart.width >= rule.standardSizeMeters.minWidth &&
        roomPart.width <= rule.standardSizeMeters.maxWidth &&
        roomPart.depth >= rule.standardSizeMeters.minDepth &&
        roomPart.depth <= rule.standardSizeMeters.maxDepth
      : true; // Default built-in house uses calibrated floor slabs

    const wp = roomPart?.wallPatternId || roomWallpapers?.[rType];
    const fl = roomPart?.floorPatternId || roomCarpets?.[rType];
    const hasStyleConsistency =
      roomWallpapers || roomCarpets || roomPart ? Boolean(wp && fl) : true;

    const missingFixtures: string[] = [];
    for (const req of rule.requiredFixtures) {
      const found = smartObjects.some(
        (o) =>
          Boolean(o) &&
          (o.room === rType ||
            (rType === 'Kitchen' && o.category === 'kitchen') ||
            (rType === 'Bathroom' && o.category === 'bathroom') ||
            (rType === 'Bedroom' && o.category === 'bedroom')) &&
          req.matchKeywords.some(
            (kw) =>
              (o.id || '').toLowerCase().includes(kw) ||
              (o.name || '').toLowerCase().includes(kw) ||
              (o.actionLabel || '').toLowerCase().includes(kw)
          )
      );
      if (!found) {
        missingFixtures.push(req.fixtureKey);
        missingRequirements.push(`${rType}:${req.fixtureKey}`);
      }
    }

    const bedsOk = rType === 'Bedroom' ? totalBeds >= requiredBeds : true;
    if (rType === 'Bedroom' && !bedsOk) {
      missingRequirements.push('Bedroom:bed');
    }

    const compliant =
      hasRealisticProportions &&
      hasStyleConsistency &&
      missingFixtures.length === 0 &&
      bedsOk;

    if (!compliant) allCompliant = false;

    reports[rType] = {
      roomType: rType,
      compliant,
      hasRealisticProportions,
      hasStyleConsistency,
      missingFixtures,
      bedCountForToons: {
        required: rType === 'Bedroom' ? requiredBeds : 0,
        actual: rType === 'Bedroom' ? totalBeds : 0,
      },
    };
  }

  return {
    allCompliant,
    reports,
    missingRequirements,
  };
}

export type HouseFootprintPreset =
  | 'L_SHAPED_MANOR'
  | 'T_SHAPED_ARTISAN'
  | 'COURTYARD_VILLA'
  | 'SPLIT_WING_PAVILION';

export interface HouseFootprintPresetMeta {
  id: HouseFootprintPreset;
  label: string;
  subtitle: string;
  promptHint: string;
}

export const HOUSE_FOOTPRINT_PRESETS: HouseFootprintPresetMeta[] = [
  {
    id: 'L_SHAPED_MANOR',
    label: 'L-Shaped Craftsman Manor',
    subtitle: 'Asymmetric East Master Wing + West Culinary & Atelier Wing',
    promptHint: 'Build an L-Shaped Craftsman Manor with a projecting East Master Bedroom Wing, sunlit Kitchen, compact Bathroom with door, and Garden Courtyard',
  },
  {
    id: 'T_SHAPED_ARTISAN',
    label: 'T-Shaped Artisan Estate',
    subtitle: 'Central Great Hall with Projecting North/East/West Pavilions',
    promptHint: 'Build a T-Shaped Artisan Estate with a central Great Room, projecting West Kitchen, East Master Suite, and South Study Wing',
  },
  {
    id: 'COURTYARD_VILLA',
    label: 'U-Shaped Courtyard Villa',
    subtitle: 'Wrap-Around Cloister Wings Framing an Open Garden Terrace',
    promptHint: 'Build a U-Shaped Mediterranean Courtyard Villa with wrap-around wings framing a central open garden patio and fountain',
  },
  {
    id: 'SPLIT_WING_PAVILION',
    label: 'Stepped Split-Wing Pavilion',
    subtitle: 'Staggered Diagonal-Step Modules with Multi-Gable Roofline',
    promptHint: 'Build a Stepped Split-Wing Architectural Pavilion with staggered non-square room modules, multi-gable roofs, and wrap-around veranda',
  },
];

/**
 * Procedural fallback & prompt interpreter that builds a complete custom non-square multi-wing house on the Empty Grid
 * following `ROOM_GENERATION_RULES`:
 * - Non-square multi-wing footprints (`L_SHAPED_MANOR`, `T_SHAPED_ARTISAN`, `COURTYARD_VILLA`, `SPLIT_WING_PAVILION`) with zero room-block overlap
 * - Varied room dimensions/layouts per room (Kitchen, LivingRoom, realistic Bedroom, compact Bathroom, Study)
 * - Consistent matched Wall & Floor styles per room
 * - Explicit Bathroom Door, Bedroom Door, Study Door, Front Entry Door, 6+ Exterior Windows, Corner Pillars, and Per-Wing Roofs
 * - Individual personal bed per toon (`char_wb_1`, `char_wb_2`, `char_wb_3`)
 */
export function generateProceduralBlueprintFromPrompt(
  prompt: string,
  maturity: MaturityRating = 'FAMILY_FRIENDLY'
): WorldScenarioGenerationResult {
  const lower = (prompt || '').toLowerCase();
  const isModern = /modern|glass|minimal|cyber|futur|sleek|loft|pavilion/i.test(lower);
  const isGothic = /gothic|dark|manor|haunt|vampire|secret|victor|mystery|witch/i.test(lower);
  const isCottage = /cottage|cozy|farm|craftsman|cabin|rustic|garden|family/i.test(lower);

  // Pick a deterministic layout variant seed from prompt text so different prompts produce varied room sizes & non-square footprints
  const promptSeed = (prompt || 'L-Shaped Manor')
    .split('')
    .reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);

  const footprintPreset: HouseFootprintPreset = /t-shape|t shape|artisan/i.test(lower)
    ? 'T_SHAPED_ARTISAN'
    : /courtyard|u-shape|villa|cloister/i.test(lower)
    ? 'COURTYARD_VILLA'
    : /split|stepped|pavilion/i.test(lower)
    ? 'SPLIT_WING_PAVILION'
    : /l-shape|l shape|manor/i.test(lower)
    ? 'L_SHAPED_MANOR'
    : HOUSE_FOOTPRINT_PRESETS[promptSeed % HOUSE_FOOTPRINT_PRESETS.length].id;

  const livVar = ROOM_GENERATION_RULES.LivingRoom.layoutVariants[promptSeed % 3];
  const kitVar = ROOM_GENERATION_RULES.Kitchen.layoutVariants[(promptSeed + 1) % 3];
  const bedVar = ROOM_GENERATION_RULES.Bedroom.layoutVariants[(promptSeed + 2) % 3];
  const bathVar = ROOM_GENERATION_RULES.Bathroom.layoutVariants[promptSeed % 3];
  const studyVar = ROOM_GENERATION_RULES.Study.layoutVariants[(promptSeed + 1) % 3];

  const roofType: BuildingPartDefinition['partType'] = isModern
    ? 'ROOF_FLAT'
    : isGothic
    ? 'ROOF_MANSARD'
    : isCottage
    ? 'ROOF_GABLED'
    : 'ROOF_HIPPED';
  const roofHex = isGothic ? '#1e1b4b' : isModern ? '#0f172a' : '#475569';

  const roomWallpapers: Record<string, string> = {
    LivingRoom: isGothic ? 'wp_navy_artdeco' : 'wp_classic_wainscot',
    Kitchen: 'wp_terracotta_venetian',
    Bedroom: 'wp_botanical_sage',
    Bathroom: 'wp_classic_wainscot',
    Study: 'wp_midcentury_teak',
  };
  const roomCarpets: Record<string, string> = {
    LivingRoom: 'fl_honey_oak',
    Kitchen: 'fl_checker_marble',
    Bedroom: 'fl_plush_berber',
    Bathroom: 'fl_checker_marble',
    Study: 'fl_mahogany_herringbone',
    Hallway: 'fl_slate_flagstone',
  };

  // Non-square multi-wing room center coordinates guaranteed never to overlap
  const wingCoords: Record<
    HouseFootprintPreset,
    {
      liv: { x: number; z: number };
      kit: { x: number; z: number };
      bed: { x: number; z: number };
      bath: { x: number; z: number };
      study: { x: number; z: number };
      deck: { x: number; z: number; w: number; d: number };
    }
  > = {
    L_SHAPED_MANOR: {
      liv: { x: 4.6, z: -2.8 },
      kit: { x: -4.8, z: -3.2 },
      bed: { x: 6.4, z: 5.4 },
      bath: { x: -1.6, z: 3.4 },
      study: { x: -7.4, z: 4.6 },
      deck: { x: 0.4, z: 8.6, w: 6.8, d: 2.6 },
    },
    T_SHAPED_ARTISAN: {
      liv: { x: 0.0, z: -1.8 },
      kit: { x: -8.6, z: -1.8 },
      bed: { x: 8.4, z: -1.6 },
      bath: { x: 4.4, z: 4.8 },
      study: { x: -1.2, z: 5.6 },
      deck: { x: -1.2, z: 9.8, w: 6.4, d: 2.4 },
    },
    COURTYARD_VILLA: {
      liv: { x: 0.0, z: -5.2 },
      kit: { x: -8.6, z: -2.2 },
      bed: { x: 8.6, z: 3.6 },
      bath: { x: 8.2, z: -4.6 },
      study: { x: -8.6, z: 5.4 },
      deck: { x: 0.0, z: 2.2, w: 7.2, d: 5.2 },
    },
    SPLIT_WING_PAVILION: {
      liv: { x: 4.4, z: -3.6 },
      kit: { x: -5.6, z: -4.2 },
      bed: { x: 7.6, z: 5.2 },
      bath: { x: 0.2, z: 4.2 },
      study: { x: -7.2, z: 3.8 },
      deck: { x: 0.4, z: 8.8, w: 7.5, d: 2.5 },
    },
  };

  const wc = wingCoords[footprintPreset];

  const placedParts: PlacedBuildingPart[] = [
    // 5 Non-Square Multi-Wing Room Modules (Zero Overlap)
    {
      id: 'gen_room_living',
      partId: 'wb_room_living',
      name: `Custom ${livVar.label}`,
      category: 'rooms_walls',
      partType: 'ROOM_BLOCK',
      gridPos: { x: wc.liv.x, y: 0, z: wc.liv.z },
      rotationY: 0,
      width: livVar.width,
      height: 2.8,
      depth: livVar.depth,
      colorHex: '#f5f5f4',
      secondaryColorHex: '#b45309',
      roomTag: 'LivingRoom',
      wallPatternId: roomWallpapers.LivingRoom,
      floorPatternId: roomCarpets.LivingRoom,
    },
    {
      id: 'gen_room_kitchen',
      partId: 'wb_room_kitchen',
      name: `Custom ${kitVar.label}`,
      category: 'rooms_walls',
      partType: 'ROOM_BLOCK',
      gridPos: { x: wc.kit.x, y: 0, z: wc.kit.z },
      rotationY: 0,
      width: kitVar.width,
      height: 2.8,
      depth: kitVar.depth,
      colorHex: '#fef3c7',
      secondaryColorHex: '#f8fafc',
      roomTag: 'Kitchen',
      wallPatternId: roomWallpapers.Kitchen,
      floorPatternId: roomCarpets.Kitchen,
    },
    {
      id: 'gen_room_bedroom',
      partId: 'wb_room_bedroom',
      name: `Custom ${bedVar.label}`,
      category: 'rooms_walls',
      partType: 'ROOM_BLOCK',
      gridPos: { x: wc.bed.x, y: 0, z: wc.bed.z },
      rotationY: 0,
      width: bedVar.width,
      height: 2.8,
      depth: bedVar.depth,
      colorHex: '#d1fae5',
      secondaryColorHex: '#e7e5e4',
      roomTag: 'Bedroom',
      wallPatternId: roomWallpapers.Bedroom,
      floorPatternId: roomCarpets.Bedroom,
    },
    {
      id: 'gen_room_bathroom',
      partId: 'wb_room_bathroom',
      name: `Custom ${bathVar.label}`,
      category: 'rooms_walls',
      partType: 'ROOM_BLOCK',
      gridPos: { x: wc.bath.x, y: 0, z: wc.bath.z },
      rotationY: 0,
      width: bathVar.width,
      height: 2.8,
      depth: bathVar.depth,
      colorHex: '#f8fafc',
      secondaryColorHex: '#e2e8f0',
      roomTag: 'Bathroom',
      wallPatternId: roomWallpapers.Bathroom,
      floorPatternId: roomCarpets.Bathroom,
    },
    {
      id: 'gen_room_study',
      partId: 'wb_room_study',
      name: `Custom ${studyVar.label}`,
      category: 'rooms_walls',
      partType: 'ROOM_BLOCK',
      gridPos: { x: wc.study.x, y: 0, z: wc.study.z },
      rotationY: 0,
      width: studyVar.width,
      height: 2.8,
      depth: studyVar.depth,
      colorHex: '#b45309',
      secondaryColorHex: '#5c2d16',
      roomTag: 'Study',
      wallPatternId: roomWallpapers.Study,
      floorPatternId: roomCarpets.Study,
    },
    // Multi-Wing Courtyard / Entry Veranda Deck
    {
      id: 'gen_front_deck',
      partId: 'wb_deck_cedar',
      name: 'Courtyard Entry Veranda',
      category: 'foundations_decks',
      partType: 'DECK_PATIO',
      gridPos: { x: wc.deck.x, y: 0, z: wc.deck.z },
      rotationY: 0,
      width: wc.deck.w,
      height: 0.16,
      depth: wc.deck.d,
      colorHex: '#78350f',
      secondaryColorHex: '#451a03',
    },
    // Doors for Every Room Wing (Front Door, Bathroom Privacy Door, Bedroom Door, Study Door)
    {
      id: 'gen_front_door',
      partId: 'wb_door_craftsman',
      name: 'Main Entry Craftsman Door',
      category: 'doors_windows',
      partType: 'DOOR',
      gridPos: { x: wc.liv.x, y: 0, z: wc.liv.z + livVar.depth * 0.5 },
      rotationY: 0,
      width: 1.4,
      height: 2.4,
      depth: 0.28,
      colorHex: '#582f0e',
      secondaryColorHex: '#ffffff',
    },
    {
      id: 'gen_bath_door',
      partId: 'wb_door_craftsman',
      name: 'Bathroom Privacy Door',
      category: 'doors_windows',
      partType: 'DOOR',
      gridPos: { x: wc.bath.x, y: 0, z: wc.bath.z + bathVar.depth * 0.5 },
      rotationY: 0,
      width: 1.2,
      height: 2.3,
      depth: 0.26,
      colorHex: '#6c4d38',
      secondaryColorHex: '#f8fafc',
    },
    {
      id: 'gen_bed_door',
      partId: 'wb_door_craftsman',
      name: 'Master Suite Door',
      category: 'doors_windows',
      partType: 'DOOR',
      gridPos: { x: wc.bed.x, y: 0, z: wc.bed.z + bedVar.depth * 0.5 },
      rotationY: 0,
      width: 1.3,
      height: 2.35,
      depth: 0.26,
      colorHex: '#582f0e',
      secondaryColorHex: '#f8fafc',
    },
    {
      id: 'gen_study_door',
      partId: 'wb_door_craftsman',
      name: 'Atelier Study Door',
      category: 'doors_windows',
      partType: 'DOOR',
      gridPos: { x: wc.study.x, y: 0, z: wc.study.z + studyVar.depth * 0.5 },
      rotationY: 0,
      width: 1.3,
      height: 2.35,
      depth: 0.26,
      colorHex: '#582f0e',
      secondaryColorHex: '#f8fafc',
    },
    // Exterior Windows on Every Wing
    {
      id: 'gen_win_living_n',
      partId: 'wb_window_picture',
      name: 'Great Room Picture Window',
      category: 'doors_windows',
      partType: 'WINDOW',
      gridPos: { x: wc.liv.x, y: 0.85, z: wc.liv.z - livVar.depth * 0.5 },
      rotationY: 0,
      width: 2.4,
      height: 1.6,
      depth: 0.26,
      colorHex: isModern ? '#1e293b' : '#ffffff',
      secondaryColorHex: '#93c5fd',
    },
    {
      id: 'gen_win_kitchen_n',
      partId: 'wb_window_picture',
      name: 'Kitchen Garden Window',
      category: 'doors_windows',
      partType: 'WINDOW',
      gridPos: { x: wc.kit.x, y: 0.85, z: wc.kit.z - kitVar.depth * 0.5 },
      rotationY: 0,
      width: 2.2,
      height: 1.5,
      depth: 0.26,
      colorHex: isModern ? '#1e293b' : '#ffffff',
      secondaryColorHex: '#93c5fd',
    },
    {
      id: 'gen_win_bedroom_e',
      partId: 'wb_window_picture',
      name: 'Master Wing East Window',
      category: 'doors_windows',
      partType: 'WINDOW',
      gridPos: { x: wc.bed.x + bedVar.width * 0.5, y: 0.85, z: wc.bed.z },
      rotationY: Math.PI / 2,
      width: 2.2,
      height: 1.55,
      depth: 0.26,
      colorHex: isModern ? '#1e293b' : '#ffffff',
      secondaryColorHex: '#93c5fd',
    },
    {
      id: 'gen_win_study_w',
      partId: 'wb_window_picture',
      name: 'Atelier West Window',
      category: 'doors_windows',
      partType: 'WINDOW',
      gridPos: { x: wc.study.x - studyVar.width * 0.5, y: 0.85, z: wc.study.z },
      rotationY: Math.PI / 2,
      width: 2.0,
      height: 1.55,
      depth: 0.26,
      colorHex: isModern ? '#1e293b' : '#ffffff',
      secondaryColorHex: '#93c5fd',
    },
    {
      id: 'gen_win_bath_frosted',
      partId: 'wb_window_picture',
      name: 'Bathroom Frosted Transom Window',
      category: 'doors_windows',
      partType: 'WINDOW',
      gridPos: { x: wc.bath.x, y: 1.15, z: wc.bath.z - bathVar.depth * 0.5 },
      rotationY: 0,
      width: 1.4,
      height: 1.1,
      depth: 0.26,
      colorHex: '#ffffff',
      secondaryColorHex: '#bae6fd',
    },
    // Multi-Wing Roofs (Per-Wing Articulated Roofs instead of a single giant square roof)
    {
      id: 'gen_wing_roof_living_kit',
      partId: 'wb_roof_hipped',
      name: 'North Great Hall & Culinary Wing Roof',
      category: 'roofs',
      partType: roofType,
      gridPos: {
        x: (wc.liv.x + wc.kit.x) * 0.5,
        y: 2.8,
        z: (wc.liv.z + wc.kit.z) * 0.5,
      },
      rotationY: 0,
      width: Math.abs(wc.liv.x - wc.kit.x) + (livVar.width + kitVar.width) * 0.5 + 0.8,
      height: isModern ? 0.45 : 2.1,
      depth: Math.max(livVar.depth, kitVar.depth) + 0.8,
      colorHex: roofHex,
      secondaryColorHex: '#f8fafc',
    },
    {
      id: 'gen_wing_roof_master',
      partId: 'wb_roof_gabled',
      name: 'East Master Wing Roof',
      category: 'roofs',
      partType: isModern ? 'ROOF_FLAT' : 'ROOF_GABLED',
      gridPos: { x: wc.bed.x, y: 2.8, z: wc.bed.z },
      rotationY: 0,
      width: bedVar.width + 0.8,
      height: isModern ? 0.45 : 1.9,
      depth: bedVar.depth + 0.8,
      colorHex: roofHex,
      secondaryColorHex: '#f8fafc',
    },
    {
      id: 'gen_wing_roof_atelier',
      partId: 'wb_roof_gabled',
      name: 'West Study & Bath Wing Roof',
      category: 'roofs',
      partType: isModern ? 'ROOF_FLAT' : 'ROOF_HIPPED',
      gridPos: {
        x: (wc.study.x + wc.bath.x) * 0.5,
        y: 2.8,
        z: (wc.study.z + wc.bath.z) * 0.5,
      },
      rotationY: 0,
      width: Math.abs(wc.study.x - wc.bath.x) + (studyVar.width + bathVar.width) * 0.5 + 0.6,
      height: isModern ? 0.45 : 1.85,
      depth: Math.max(studyVar.depth, bathVar.depth) + 0.8,
      colorHex: roofHex,
      secondaryColorHex: '#f8fafc',
    },
    // Backyard Swimming Pool & Landscaping
    {
      id: 'gen_backyard_pool',
      partId: 'wb_pool_oasis',
      name: 'Backyard Oasis Pool',
      category: 'landscaping',
      partType: 'POOL',
      gridPos: { x: 0, y: 0, z: -11.5 },
      rotationY: 0,
      width: 10.0,
      height: 0.22,
      depth: 5.2,
      colorHex: '#0ea5e9',
      secondaryColorHex: '#d1d5db',
    },
    {
      id: 'gen_tree_1',
      partId: isCottage ? 'wb_tree_cherry' : 'wb_tree_cypress',
      name: 'Estate Shade Tree West',
      category: 'landscaping',
      partType: 'TREE',
      gridPos: { x: -13.2, y: 0, z: -9.8 },
      rotationY: 0,
      width: 2.8,
      height: 5.2,
      depth: 2.8,
      colorHex: isCottage ? '#f472b6' : '#2d5a27',
      secondaryColorHex: '#5c4033',
    },
    {
      id: 'gen_tree_2',
      partId: 'wb_tree_cypress',
      name: 'Estate Shade Tree East',
      category: 'landscaping',
      partType: 'TREE',
      gridPos: { x: 13.2, y: 0, z: -9.8 },
      rotationY: 0,
      width: 2.8,
      height: 5.2,
      depth: 2.8,
      colorHex: '#2d5a27',
      secondaryColorHex: '#5c4033',
    },
    {
      id: 'gen_roses_front',
      partId: 'wb_shrub_rose',
      name: 'Courtyard Veranda Rose Planter',
      category: 'landscaping',
      partType: 'SHRUB_FLOWER',
      gridPos: { x: wc.deck.x + 2.2, y: 0, z: wc.deck.z + 1.4 },
      rotationY: 0,
      width: 3.2,
      height: 0.8,
      depth: 0.9,
      colorHex: '#15803d',
      secondaryColorHex: '#f43f5e',
    },
  ];

  const cleanPromptSummary = prompt.trim().slice(0, 90) || 'Custom Multi-Wing Architect Scenario';
  const char1Name = isGothic ? 'Julian Blackwood' : isModern ? 'Soren Lindqvist' : 'Arthur Pendelton';
  const char2Name = isGothic ? 'Lenore Ravenscroft' : isModern ? 'Kaia Vance' : 'Clara Hawthorne';
  const char3Name = isGothic ? 'Dorian Sterling' : 'Mateo Rivera';

  // Placed SmartObjects inside the custom multi-wing rooms — anchored relative to each wing's center
  const smartObjects: SmartObject[] = [
    {
      id: 'obj_fridge_custom',
      name: 'Artisanal Smart Fridge',
      room: 'Kitchen',
      category: 'kitchen',
      gridPos: { x: wc.kit.x - 2.2, y: 0, z: wc.kit.z - 1.8 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { hunger: 40, fun: 5 },
      actionLabel: 'Preparing a fresh meal',
      durationSeconds: 900,
    },
    {
      id: 'obj_stove_custom',
      name: 'Chef Six-Burner Range & Stove',
      room: 'Kitchen',
      category: 'kitchen',
      gridPos: { x: wc.kit.x, y: 0, z: wc.kit.z - 2.0 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { hunger: 55, fun: 15 },
      actionLabel: 'Cooking a signature dish',
      durationSeconds: 2700,
    },
    {
      id: 'obj_sink_custom',
      name: 'Farmhouse Stainless Kitchen Sink & Counter',
      room: 'Kitchen',
      category: 'kitchen',
      gridPos: { x: wc.kit.x + 1.8, y: 0, z: wc.kit.z - 1.6 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { hygiene: 40, sanity: 10 },
      actionLabel: 'Washing hands & dishes at the kitchen sink',
      durationSeconds: 1800,
    },
    {
      id: 'obj_espresso_custom',
      name: 'Italian Chrome Espresso Bar',
      room: 'Kitchen',
      category: 'kitchen',
      gridPos: { x: wc.kit.x + 2.2, y: 0, z: wc.kit.z + 0.6 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { energy: 30, fun: 15 },
      actionLabel: 'Pulling a double espresso shot',
      durationSeconds: 600,
    },
    {
      id: 'obj_dining_custom',
      name: 'Walnut Farmhouse Supper Table & Dining Suite',
      room: 'Kitchen',
      category: 'kitchen',
      gridPos: { x: wc.kit.x - 0.3, y: 0, z: wc.kit.z + 0.8 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { hunger: 25, social: 25 },
      actionLabel: 'Sitting down at the supper table for a shared meal',
      durationSeconds: 2700,
    },
    {
      id: 'obj_sofa_custom',
      name: 'Tufted Velvet Parlor Sofa',
      room: 'LivingRoom',
      category: 'living',
      gridPos: { x: wc.liv.x, y: 0, z: wc.liv.z + 0.6 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { energy: 25, fun: 20, social: 20 },
      actionLabel: 'Lounging on the sofa',
      durationSeconds: 5400,
    },
    {
      id: 'obj_tv_custom',
      name: 'Cinema 4K Screen & TV Credenza',
      room: 'LivingRoom',
      category: 'living',
      gridPos: { x: wc.liv.x, y: 0, z: wc.liv.z - 2.1 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { fun: 35, social: 12 },
      actionLabel: 'Sitting on the couch watching TV',
      durationSeconds: 7200,
    },
    {
      id: 'obj_fireplace_custom',
      name: 'Hearthstone Fireplace',
      room: 'LivingRoom',
      category: 'living',
      gridPos: { x: wc.liv.x + 2.4, y: 0, z: wc.liv.z },
      state: 'Clean',
      maturity: 'ALL',
      effects: { sanity: 25, fun: 15 },
      actionLabel: 'Warming hands by the fire',
      durationSeconds: 2700,
    },
    {
      id: 'obj_newspaper',
      name: 'The Suburban Chronicle Newspaper',
      room: 'LivingRoom',
      category: 'living',
      gridPos: { x: wc.liv.x - 2.0, y: 0, z: wc.liv.z + 0.8 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { fun: 20, sanity: 15, social: 10 },
      actionLabel: 'Reading The Suburban Chronicle',
      durationSeconds: 1800,
    },
    // 3 Dedicated Personal Beds — 1 for each household toon
    {
      id: 'obj_bed_custom_1',
      name: `${char1Name.split(' ')[0]}'s Canopy Master Bed`,
      room: 'Bedroom',
      category: 'bedroom',
      gridPos: { x: wc.bed.x + 1.4, y: 0, z: wc.bed.z + 1.0 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { energy: 72, sanity: 15 },
      actionLabel: 'Sleeping soundly in personal bed',
      durationSeconds: 28800,
      assignedToonId: 'char_wb_1',
      assignedToonName: char1Name,
      assignedColorHex: '#4f46e5',
    },
    {
      id: 'obj_bed_custom_2',
      name: `${char2Name.split(' ')[0]}'s Walnut Feather Bed`,
      room: 'Bedroom',
      category: 'bedroom',
      gridPos: { x: wc.bed.x - 1.4, y: 0, z: wc.bed.z + 1.0 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { energy: 72, sanity: 15 },
      actionLabel: 'Sleeping deeply in personal bed',
      durationSeconds: 28800,
      assignedToonId: 'char_wb_2',
      assignedToonName: char2Name,
      assignedColorHex: '#d97706',
    },
    {
      id: 'obj_bed_custom_3',
      name: `${char3Name.split(' ')[0]}'s Tufted Linen Bed`,
      room: 'Bedroom',
      category: 'bedroom',
      gridPos: { x: wc.bed.x + 1.4, y: 0, z: wc.bed.z - 1.4 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { energy: 72, sanity: 15 },
      actionLabel: 'Sleeping peacefully in personal bed',
      durationSeconds: 28800,
      assignedToonId: 'char_wb_3',
      assignedToonName: char3Name,
      assignedColorHex: '#059669',
    },
    {
      id: 'obj_bookshelf_custom',
      name: 'Floor-to-Ceiling Oak Library Bookshelf',
      room: 'Study',
      category: 'study',
      gridPos: { x: wc.study.x - 1.4, y: 0, z: wc.study.z - 1.2 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { fun: 28, sanity: 18 },
      actionLabel: 'Reading a classic volume',
      durationSeconds: 5400,
    },
    {
      id: 'obj_easel_custom',
      name: 'Atelier Painting Easel',
      room: 'Study',
      category: 'study',
      gridPos: { x: wc.study.x + 1.2, y: 0, z: wc.study.z + 0.8 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { fun: 35, sanity: 22 },
      actionLabel: 'Painting an oil masterpiece',
      durationSeconds: 9000,
    },
    {
      id: 'obj_guitar_custom',
      name: 'Vintage Acoustic Guitar',
      room: 'Study',
      category: 'study',
      gridPos: { x: wc.study.x + 1.2, y: 0, z: wc.study.z - 1.2 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { fun: 35, social: 15 },
      actionLabel: 'Strumming acoustic chords',
      durationSeconds: 3600,
    },
    {
      id: 'obj_bathtub_custom',
      name: 'Porcelain Clawfoot Bathtub & Rainfall Shower',
      room: 'Bathroom',
      category: 'bathroom',
      gridPos: { x: wc.bath.x + 0.6, y: 0, z: wc.bath.z - 0.8 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { hygiene: 75, sanity: 10 },
      actionLabel: 'Taking a refreshing bath',
      durationSeconds: 1800,
    },
    {
      id: 'obj_toilet_custom',
      name: 'Porcelain Flush Toilet Suite',
      room: 'Bathroom',
      category: 'bathroom',
      gridPos: { x: wc.bath.x - 0.8, y: 0, z: wc.bath.z + 0.7 },
      state: 'Clean',
      maturity: 'ALL',
      effects: { bladder: 80 },
      actionLabel: 'Using the restroom',
      durationSeconds: 360,
    },
  ];

  const characters: Character[] = [
    {
      id: 'char_wb_1',
      name: char1Name,
      ageStage: 'Adult',
      traits: isGothic ? ['Bookworm', 'Secretive', 'Genius'] : ['Builder', 'Ambitious', 'Creative'],
      lifeGoal: `Fulfill the vision of "${cleanPromptSummary}"`,
      room: 'LivingRoom',
      pos: { x: wc.liv.x - 0.8, y: 0, z: wc.liv.z + 0.4 },
      onGrid: true,
      currentAction: 'Sitting on the couch watching TV',
      actionTimer: 1800,
      selfTalk: `This custom-built layout for "${cleanPromptSummary}" turned out extraordinary!`,
      motives: { hunger: 82, energy: 85, bladder: 85, hygiene: 88, social: 76, fun: 84, sanity: 94 },
      privateMemory: [`Moved into the custom lot built from prompt: "${prompt}"`],
      color: '#4f46e5',
      genderFrame: 'Masculine',
      hairStyle: 'Neat Side Part',
      facialHair: 'Full Boxed Beard',
      clothingTop: 'Tailored Blazer',
      clothingBottom: 'Pleated Trousers',
      skinTone: 'Olive',
      accessories: 'Glasses',
      boneScale: { height: 1.06, shoulderWidth: 1.12, chestDepth: 1.05 },
      learnedTopics: [cleanPromptSummary, 'Custom architectural floorplans'],
      assignedBedId: 'obj_bed_custom_1',
      assignedBedName: `${char1Name.split(' ')[0]}'s Canopy Master Bed`,
    },
    {
      id: 'char_wb_2',
      name: char2Name,
      ageStage: 'Young Adult',
      traits: ['Artistic', 'Foodie', 'Outgoing'],
      lifeGoal: 'Curate the ultimate creative sanctuary',
      room: 'Kitchen',
      pos: { x: wc.kit.x + 0.6, y: 0, z: wc.kit.z - 0.5 },
      onGrid: true,
      currentAction: 'Cooking a signature dish',
      actionTimer: 1800,
      selfTalk: `I love how the light hits these rooms. Can't wait to cook and paint here!`,
      motives: { hunger: 78, energy: 88, bladder: 82, hygiene: 90, social: 80, fun: 86, sanity: 96 },
      privateMemory: [`Excited to test the new kitchen and studio in "${cleanPromptSummary}".`],
      color: '#d97706',
      genderFrame: 'Feminine',
      hairStyle: 'Shoulder Wavy',
      facialHair: 'None',
      clothingTop: 'Cardigan',
      clothingBottom: 'Denim Jeans',
      skinTone: 'Tan',
      boneScale: { height: 0.98, shoulderWidth: 0.96, chestDepth: 0.98 },
      learnedTopics: [cleanPromptSummary, 'Artisanal home cooking'],
      assignedBedId: 'obj_bed_custom_2',
      assignedBedName: `${char2Name.split(' ')[0]}'s Walnut Feather Bed`,
    },
    {
      id: 'char_wb_3',
      name: char3Name,
      ageStage: 'Young Adult',
      traits: ['Creative', 'Romantic', 'Bookworm'],
      lifeGoal: 'Compose an unforgettable album in the studio',
      room: 'Study',
      pos: { x: wc.study.x, y: 0, z: wc.study.z + 0.4 },
      onGrid: true,
      currentAction: 'Painting an oil masterpiece',
      actionTimer: 1800,
      selfTalk: `The acoustics in this studio wing are genuinely inspiring.`,
      motives: { hunger: 80, energy: 82, bladder: 88, hygiene: 85, social: 78, fun: 88, sanity: 92 },
      privateMemory: [`Claimed the studio corner as soon as the walls went up.`],
      color: '#059669',
      genderFrame: 'Masculine',
      hairStyle: 'Curly Shag',
      facialHair: 'Goatee',
      clothingTop: 'Hoodie',
      clothingBottom: 'Denim Jeans',
      skinTone: 'Rich Umber',
      boneScale: { height: 1.03, shoulderWidth: 1.08, chestDepth: 1.02 },
      learnedTopics: [cleanPromptSummary, 'Acoustic music production'],
      assignedBedId: 'obj_bed_custom_3',
      assignedBedName: `${char3Name.split(' ')[0]}'s Tufted Linen Bed`,
    },
  ];

  return {
    blueprint: {
      isEmptyGridMode: true,
      lotTitle: cleanPromptSummary,
      architecturalStyle: isGothic
        ? 'Gothic Revival Manor'
        : isModern
        ? 'Mid-Century Glass Pavilion'
        : 'Craftsman Estate',
      placedParts,
    },
    smartObjects,
    characters,
    scenarioTitle: cleanPromptSummary,
    scenarioDescription: `Custom AI-architected world & scenario generated from prompt: "${prompt}" (${maturity}).`,
    roomWallpapers,
    roomCarpets,
  };
}

/**
 * /**
 * Pure, deterministic skeletal bone pose calculator for 60fps procedural toon animation.
 * Computes joint rotations (in radians) for Pelvis, Spine, Head, Jaw, Eyelids, Eyebrows, Eye Gaze,
 * UpperArms, Forearms (Elbows), Hands (Wrists), Articulated Finger Phalanges & Thumbs,
 * Thighs (Hips), Shins (Knees), and Feet (Ankles).
 */
export interface CharacterBonePose {
  pelvisYOffset: number;
  torsoPitch: number;
  torsoYaw: number;
  torsoRoll: number;
  headPitch: number;
  headYaw: number;
  jawOpen: number;
  eyelidScaleY: number;
  browRaise: number;
  browTilt: number;
  eyeGazeYaw: number;
  upperArmL: { x: number; y: number; z: number };
  forearmL: { x: number; y: number; z: number };
  handL: { x: number; y: number; z: number };
  fingerCurlL: number;
  thumbSpreadL: number;
  upperArmR: { x: number; y: number; z: number };
  forearmR: { x: number; y: number; z: number };
  handR: { x: number; y: number; z: number };
  fingerCurlR: number;
  thumbSpreadR: number;
  thighL: { x: number; y: number; z: number };
  shinL: { x: number; y: number; z: number };
  footL: { x: number; y: number; z: number };
  thighR: { x: number; y: number; z: number };
  shinR: { x: number; y: number; z: number };
  footR: { x: number; y: number; z: number };
  activeProp: 'NONE' | 'BOOK_NEWSPAPER' | 'CUP_UTENSIL' | 'BRUSH_TOOL';
}

export function computeCharacterBonePose(
  actionLabel: string,
  isMoving: boolean,
  timeSec: number,
  isSpeaking = false
): CharacterBonePose {
  const act = (actionLabel || '').toLowerCase();

  // Natural periodic blink every ~3.8 seconds (closes eyelids briefly)
  const blinkPhase = timeSec % 3.8;
  const isBlinking = blinkPhase > 3.62 || act.includes('sleep');
  const eyelidScaleY = isBlinking ? 1.0 : 0.12;

  // Jaw movement strictly when THIS character is the active speaker or eating/drinking
  const isEatingOrDrinking =
    act.includes('eat') || act.includes('meal') || act.includes('dining') || act.includes('espresso') || act.includes('coffee');
  const isConversing = act.includes('chat') || act.includes('talk') || isSpeaking;
  const jawOpen = isSpeaking
    ? Math.abs(Math.sin(timeSec * 11.5)) * 0.36
    : isEatingOrDrinking
    ? Math.abs(Math.sin(timeSec * 6.5)) * 0.25
    : 0.02;

  // Expressive eyebrow arch & subtle eye saccade gaze
  const browRaise = isSpeaking
    ? Math.sin(timeSec * 5.2) * 0.014 + 0.01
    : act.includes('read') || act.includes('paint')
    ? -0.006
    : Math.sin(timeSec * 1.4) * 0.005;
  const browTilt = isSpeaking
    ? Math.sin(timeSec * 3.8) * 0.14
    : act.includes('inspect') || act.includes('restraint')
    ? -0.18
    : 0.05;
  const eyeGazeYaw = Math.sin(timeSec * 1.1) * 0.012;

  // 1. WALKING / LOCOMOTION CYCLE (Calm, unhurried real-life indoor walking stride)
  if (isMoving) {
    const walkFreq = 2.4;
    const phase = timeSec * walkFreq;
    const strideL = Math.sin(phase);
    const strideR = Math.sin(phase + Math.PI);

    // Knee bends backward (+x in local shin space) when leg swings back/lifts
    const kneeL = Math.max(0, -strideL) * 0.65 + 0.1;
    const kneeR = Math.max(0, -strideR) * 0.65 + 0.1;

    return {
      pelvisYOffset: Math.abs(Math.cos(phase)) * 0.045,
      torsoPitch: 0.04,
      torsoYaw: strideL * 0.09,
      torsoRoll: Math.cos(phase) * 0.025,
      headPitch: Math.sin(phase * 2) * 0.025,
      headYaw: -strideL * 0.04,
      jawOpen,
      eyelidScaleY,
      browRaise,
      browTilt,
      eyeGazeYaw,
      // Arms swing opposite to legs with natural elbow bend & relaxed finger curl
      upperArmL: { x: strideR * 0.42, y: 0, z: 0.08 },
      forearmL: { x: -0.32 - Math.max(0, strideR) * 0.28, y: 0, z: 0 },
      handL: { x: 0, y: 0, z: strideR * 0.12 },
      fingerCurlL: 0.32 + strideR * 0.06,
      thumbSpreadL: 0.25,
      upperArmR: { x: strideL * 0.42, y: 0, z: -0.08 },
      forearmR: { x: -0.32 - Math.max(0, strideL) * 0.28, y: 0, z: 0 },
      handR: { x: 0, y: 0, z: strideL * 0.12 },
      fingerCurlR: 0.32 + strideL * 0.06,
      thumbSpreadR: 0.25,
      thighL: { x: strideL * 0.48, y: 0, z: 0 },
      shinL: { x: kneeL, y: 0, z: 0 },
      footL: { x: -strideL * 0.2, y: 0, z: 0 },
      thighR: { x: strideR * 0.48, y: 0, z: 0 },
      shinR: { x: kneeR, y: 0, z: 0 },
      footR: { x: -strideR * 0.2, y: 0, z: 0 },
      activeProp: 'NONE',
    };
  }

  // 2. SLEEPING POSTURE (Horizontal rest with slow chest breathing)
  if (act.includes('sleep') || act.includes('nap')) {
    const breath = Math.sin(timeSec * 0.75) * 0.035;
    return {
      pelvisYOffset: -0.35,
      torsoPitch: -Math.PI / 2,
      torsoYaw: 0,
      torsoRoll: 0,
      headPitch: 0.1 + breath,
      headYaw: 0.15,
      jawOpen: 0.05,
      eyelidScaleY: 1.0,
      browRaise: 0,
      browTilt: 0,
      eyeGazeYaw: 0,
      upperArmL: { x: -0.2, y: 0, z: 0.18 },
      forearmL: { x: -0.45, y: 0, z: -0.2 },
      handL: { x: 0, y: 0, z: 0 },
      fingerCurlL: 0.45,
      thumbSpreadL: 0.2,
      upperArmR: { x: -0.2, y: 0, z: -0.18 },
      forearmR: { x: -0.45, y: 0, z: 0.2 },
      handR: { x: 0, y: 0, z: 0 },
      fingerCurlR: 0.45,
      thumbSpreadR: 0.2,
      thighL: { x: -0.08, y: 0, z: 0.04 },
      shinL: { x: 0.12, y: 0, z: 0 },
      footL: { x: 0.2, y: 0, z: 0 },
      thighR: { x: -0.08, y: 0, z: -0.04 },
      shinR: { x: 0.12, y: 0, z: 0 },
      footR: { x: 0.2, y: 0, z: 0 },
      activeProp: 'NONE',
    };
  }

  // 3. SITTING / LOUNGING / WATCHING TV / DINING / RESTROOM (Hips bent forward -90°, Knees bent +90°, slow relaxed posture)
  if (
    act.includes('sofa') ||
    act.includes('couch') ||
    act.includes('loung') ||
    act.includes('watch') ||
    act.includes('tv') ||
    act.includes('dining') ||
    act.includes('restroom') ||
    act.includes('chess') ||
    act.includes('laptop') ||
    act.includes('study')
  ) {
    const gesture = Math.sin(timeSec * 0.45) * 0.08;
    return {
      pelvisYOffset: -0.32,
      torsoPitch: -0.08,
      torsoYaw: Math.sin(timeSec * 0.25) * 0.04,
      torsoRoll: 0,
      headPitch: Math.sin(timeSec * 0.4) * 0.04,
      headYaw: Math.sin(timeSec * 0.28) * 0.09,
      jawOpen,
      eyelidScaleY,
      browRaise,
      browTilt,
      eyeGazeYaw,
      upperArmL: { x: -0.45 + gesture, y: 0.15, z: 0.15 },
      forearmL: { x: -0.75, y: 0, z: -0.15 },
      handL: { x: 0.1, y: 0, z: 0 },
      fingerCurlL: act.includes('laptop') ? 0.55 + Math.sin(timeSec * 2.8) * 0.16 : 0.28,
      thumbSpreadL: 0.3,
      upperArmR: { x: -0.45 - gesture, y: -0.15, z: -0.15 },
      forearmR: { x: -0.75, y: 0, z: 0.15 },
      handR: { x: 0.1, y: 0, z: 0 },
      fingerCurlR: isEatingOrDrinking ? 0.85 : act.includes('laptop') ? 0.55 + Math.cos(timeSec * 2.8) * 0.16 : 0.28,
      thumbSpreadR: isEatingOrDrinking ? 0.55 : 0.3,
      thighL: { x: -1.45, y: 0.08, z: 0 },
      shinL: { x: 1.45, y: 0, z: 0 },
      footL: { x: 0, y: 0, z: 0 },
      thighR: { x: -1.45, y: -0.08, z: 0 },
      shinR: { x: 1.45, y: 0, z: 0 },
      footR: { x: 0, y: 0, z: 0 },
      activeProp: isEatingOrDrinking ? 'CUP_UTENSIL' : 'NONE',
    };
  }

  // 4. READING NEWSPAPER OR BOOKS (Both forearms raised holding open newspaper/book prop with slow reading gaze)
  if (act.includes('read') || act.includes('newspaper') || act.includes('chronicle') || act.includes('book') || act.includes('library')) {
    const scanHead = Math.sin(timeSec * 0.42) * 0.12;
    const pageHold = Math.sin(timeSec * 0.55) * 0.035;
    return {
      pelvisYOffset: 0,
      torsoPitch: 0.08,
      torsoYaw: 0,
      torsoRoll: 0,
      headPitch: 0.24,
      headYaw: scanHead,
      jawOpen,
      eyelidScaleY,
      browRaise,
      browTilt,
      eyeGazeYaw: scanHead * 0.15,
      upperArmL: { x: -0.65, y: 0.32, z: 0.12 },
      forearmL: { x: -1.05 + pageHold, y: 0.25, z: 0 },
      handL: { x: 0, y: 0.2, z: 0 },
      fingerCurlL: 0.78,
      thumbSpreadL: 0.5,
      upperArmR: { x: -0.65, y: -0.32, z: -0.12 },
      forearmR: { x: -1.05 - pageHold, y: -0.25, z: 0 },
      handR: { x: 0, y: -0.2, z: 0 },
      fingerCurlR: 0.78,
      thumbSpreadR: 0.5,
      thighL: { x: 0, y: 0, z: 0 },
      shinL: { x: 0.04, y: 0, z: 0 },
      footL: { x: 0, y: 0, z: 0 },
      thighR: { x: 0, y: 0, z: 0 },
      shinR: { x: 0.04, y: 0, z: 0 },
      footR: { x: 0, y: 0, z: 0 },
      activeProp: 'BOOK_NEWSPAPER',
    };
  }

  // 5. COOKING / ESPRESSO / GRABBING MEAL (Calm right-arm stirring/lifting cup, left arm steady)
  if (
    act.includes('cook') ||
    act.includes('meal') ||
    act.includes('espresso') ||
    act.includes('coffee') ||
    act.includes('fridge') ||
    act.includes('stove') ||
    act.includes('bbq')
  ) {
    const stir = Math.sin(timeSec * 1.15);
    const lift = Math.cos(timeSec * 0.65);
    return {
      pelvisYOffset: 0,
      torsoPitch: 0.07,
      torsoYaw: stir * 0.06,
      torsoRoll: 0,
      headPitch: 0.15,
      headYaw: stir * 0.07,
      jawOpen,
      eyelidScaleY,
      browRaise,
      browTilt,
      eyeGazeYaw,
      upperArmL: { x: -0.45, y: 0.2, z: 0.1 },
      forearmL: { x: -0.8, y: 0, z: 0 },
      handL: { x: 0, y: 0, z: 0 },
      fingerCurlL: 0.35,
      thumbSpreadL: 0.3,
      upperArmR: { x: -0.75 + lift * 0.16, y: -0.2, z: -0.1 },
      forearmR: { x: -1.1 + stir * 0.22, y: stir * 0.18, z: 0 },
      handR: { x: stir * 0.15, y: 0, z: 0 },
      fingerCurlR: 0.88,
      thumbSpreadR: 0.55,
      thighL: { x: 0, y: 0, z: 0 },
      shinL: { x: 0.05, y: 0, z: 0 },
      footL: { x: 0, y: 0, z: 0 },
      thighR: { x: 0, y: 0, z: 0 },
      shinR: { x: 0.05, y: 0, z: 0 },
      footR: { x: 0, y: 0, z: 0 },
      activeProp: 'CUP_UTENSIL',
    };
  }

  // 6. PAINTING / GUITAR / WORKBENCH / ARCADE (Deliberate, unhurried right-arm brush stroke / strum)
  if (
    act.includes('paint') ||
    act.includes('canvas') ||
    act.includes('easel') ||
    act.includes('guitar') ||
    act.includes('strum') ||
    act.includes('workbench') ||
    act.includes('arcade')
  ) {
    const stroke = Math.sin(timeSec * 1.35);
    return {
      pelvisYOffset: Math.abs(stroke) * 0.015,
      torsoPitch: 0.04,
      torsoYaw: stroke * 0.07,
      torsoRoll: stroke * 0.03,
      headPitch: Math.cos(timeSec * 0.75) * 0.06,
      headYaw: stroke * 0.08,
      jawOpen,
      eyelidScaleY,
      browRaise,
      browTilt,
      eyeGazeYaw,
      upperArmL: { x: -0.55, y: 0.25, z: 0.15 },
      forearmL: { x: -0.95, y: 0.2, z: 0 },
      handL: { x: 0, y: 0, z: 0 },
      fingerCurlL: 0.55,
      thumbSpreadL: 0.4,
      upperArmR: { x: -0.85 + stroke * 0.24, y: -0.15, z: -0.18 },
      forearmR: { x: -0.95 + Math.cos(timeSec * 1.35) * 0.26, y: 0, z: stroke * 0.15 },
      handR: { x: stroke * 0.22, y: 0, z: 0 },
      fingerCurlR: 0.9,
      thumbSpreadR: 0.6,
      thighL: { x: -0.05, y: 0, z: 0.04 },
      shinL: { x: 0.1, y: 0, z: 0 },
      footL: { x: 0, y: 0, z: 0 },
      thighR: { x: 0.05, y: 0, z: -0.04 },
      shinR: { x: 0.1, y: 0, z: 0 },
      footR: { x: 0, y: 0, z: 0 },
      activeProp: 'BRUSH_TOOL',
    };
  }

  // 7. CONVERSING / CHATTING / IDLE (Calm hand/finger gestures, natural breathing & head nods)
  const gestureWave = isSpeaking ? Math.sin(timeSec * 1.8) : isConversing ? Math.sin(timeSec * 0.75) * 0.28 : Math.sin(timeSec * 0.45) * 0.1;
  const gestureAlt = isSpeaking ? Math.cos(timeSec * 1.5) : isConversing ? Math.cos(timeSec * 0.65) * 0.2 : 0;

  return {
    pelvisYOffset: Math.sin(timeSec * 0.85) * 0.012,
    torsoPitch: Math.sin(timeSec * 0.6) * 0.02,
    torsoYaw: isConversing ? gestureAlt * 0.09 : Math.sin(timeSec * 0.3) * 0.04,
    torsoRoll: 0,
    headPitch: isSpeaking ? Math.sin(timeSec * 2.1) * 0.07 : Math.sin(timeSec * 0.45) * 0.03,
    headYaw: isSpeaking ? gestureWave * 0.12 : Math.sin(timeSec * 0.35) * 0.08,
    jawOpen,
    eyelidScaleY,
    browRaise,
    browTilt,
    eyeGazeYaw,
    upperArmL: {
      x: isConversing ? -0.45 + gestureWave * 0.2 : -0.06,
      y: isConversing ? 0.18 : 0,
      z: 0.1,
    },
    forearmL: {
      x: isConversing ? -0.85 + gestureAlt * 0.22 : -0.18,
      y: 0,
      z: 0,
    },
    handL: {
      x: 0,
      y: isConversing ? gestureWave * 0.22 : 0,
      z: 0,
    },
    fingerCurlL: isSpeaking ? 0.22 + Math.sin(timeSec * 2.2) * 0.18 : 0.3,
    thumbSpreadL: isSpeaking ? 0.45 + Math.cos(timeSec * 2.0) * 0.12 : 0.25,
    upperArmR: {
      x: isConversing ? -0.5 - gestureAlt * 0.22 : -0.06,
      y: isConversing ? -0.18 : 0,
      z: -0.1,
    },
    forearmR: {
      x: isConversing ? -0.9 + gestureWave * 0.24 : -0.18,
      y: 0,
      z: 0,
    },
    handR: {
      x: 0,
      y: isConversing ? -gestureAlt * 0.22 : 0,
      z: 0,
    },
    fingerCurlR: isSpeaking ? 0.22 + Math.cos(timeSec * 2.2) * 0.18 : 0.3,
    thumbSpreadR: isSpeaking ? 0.45 + Math.sin(timeSec * 2.0) * 0.12 : 0.25,
    thighL: { x: 0, y: 0, z: 0.02 },
    shinL: { x: 0.04, y: 0, z: 0 },
    footL: { x: 0, y: 0, z: 0 },
    thighR: { x: 0, y: 0, z: -0.02 },
    shinR: { x: 0.04, y: 0, z: 0 },
    footR: { x: 0, y: 0, z: 0 },
    activeProp: 'NONE',
  };
}

