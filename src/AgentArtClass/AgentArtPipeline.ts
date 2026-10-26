/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { SmartObject, Motives } from '../game/simulation';

export interface AgentArtItemSpec {
  name: string;
  room: 'Kitchen' | 'LivingRoom' | 'Bedroom' | 'Bathroom' | 'Study' | 'Yard' | 'Basement';
  materialFinish: 'Wood' | 'Marble' | 'Steel' | 'Fabric' | 'Glass' | 'Stone';
  styleTheme: 'Modern' | 'Victorian' | 'Rustic' | 'Gothic' | 'Retro';
  cost: number;
  actionLabel: string;
  maturity?: 'ALL' | 'DARK_ONLY';
  skillTrained?: 'none' | 'cooking' | 'handiness' | 'painting' | 'fitness' | 'logic' | 'charisma';
}

export interface MeshyGenerationStatus {
  taskId: string;
  provider: 'meshy-v2' | 'imagen-procedural';
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FALLBACK_READY';
  progress: number;
  conceptPreviewDataUrl?: string;
  glbUrl?: string;
  environmentRating1To10: number;
}

export interface WallpaperStyle {
  id: string;
  name: string;
  category: 'Paint & Plaster' | 'Brick & Stone' | 'Wood Paneling' | 'Patterned Wallpaper';
  baseColorHex: string;
  accentColorHex: string;
  patternType: 'wainscot' | 'brick' | 'stripes' | 'damask' | 'wood_slats' | 'concrete' | 'stucco' | 'velvet';
  cost: number;
  environmentRating: number; // 1 to 10
  moodEffect: 'Calming' | 'Inspiring' | 'Luxurious' | 'Cozy' | 'Eerie';
}

export interface CarpetStyle {
  id: string;
  name: string;
  category: 'Hardwood' | 'Plush Carpet' | 'Woven Rugs' | 'Stone & Tile';
  baseColorHex: string;
  secondaryColorHex: string;
  patternType: 'oak_plank' | 'persian_rug' | 'checker_marble' | 'berber_carpet' | 'herringbone' | 'slate_tile' | 'emerald_plush' | 'terracotta';
  roughness: number;
  cost: number;
  comfortRating: number; // 1 to 10
}

export interface HomeLayoutPreset {
  id: string;
  name: string;
  description: string;
  expansionLevel: number;
  openConceptKitchen: boolean;
  openConceptLiving: boolean;
  roomWallpapers: Record<string, string>;
  roomCarpets: Record<string, string>;
}

/**
 * Curated Catalog of Wallpapers & Wall Treatments
 */
export const WALLPAPER_CATALOG: WallpaperStyle[] = [
  {
    id: 'wp_classic_wainscot',
    name: 'Gallery Cream & Oak Wainscoting',
    category: 'Wood Paneling',
    baseColorHex: '#f5f5f4',
    accentColorHex: '#d6d3d1',
    patternType: 'wainscot',
    cost: 150,
    environmentRating: 8,
    moodEffect: 'Calming',
  },
  {
    id: 'wp_exposed_brick',
    name: 'Artisan Loft Exposed Red Brick',
    category: 'Brick & Stone',
    baseColorHex: '#9a3412',
    accentColorHex: '#7c2d12',
    patternType: 'brick',
    cost: 240,
    environmentRating: 9,
    moodEffect: 'Inspiring',
  },
  {
    id: 'wp_botanical_sage',
    name: 'Botanical Sage Regency Stripe',
    category: 'Patterned Wallpaper',
    baseColorHex: '#d1fae5',
    accentColorHex: '#6ee7b7',
    patternType: 'stripes',
    cost: 200,
    environmentRating: 8,
    moodEffect: 'Calming',
  },
  {
    id: 'wp_victorian_damask',
    name: 'Gilded Royal Indigo Damask',
    category: 'Patterned Wallpaper',
    baseColorHex: '#312e81',
    accentColorHex: '#f59e0b',
    patternType: 'damask',
    cost: 320,
    environmentRating: 10,
    moodEffect: 'Luxurious',
  },
  {
    id: 'wp_midcentury_teak',
    name: 'Mid-Century Acoustic Teak Slats',
    category: 'Wood Paneling',
    baseColorHex: '#78350f',
    accentColorHex: '#451a03',
    patternType: 'wood_slats',
    cost: 280,
    environmentRating: 9,
    moodEffect: 'Cozy',
  },
  {
    id: 'wp_architectural_concrete',
    name: 'Brutalist Board-Formed Concrete',
    category: 'Brick & Stone',
    baseColorHex: '#64748b',
    accentColorHex: '#475569',
    patternType: 'concrete',
    cost: 180,
    environmentRating: 7,
    moodEffect: 'Calming',
  },
  {
    id: 'wp_terracotta_venetian',
    name: 'Warm Venetian Terracotta Plaster',
    category: 'Paint & Plaster',
    baseColorHex: '#fed7aa',
    accentColorHex: '#fdba74',
    patternType: 'stucco',
    cost: 190,
    environmentRating: 8,
    moodEffect: 'Cozy',
  },
  {
    id: 'wp_noir_crimson',
    name: 'Gothic Crimson Velvet Brocade',
    category: 'Patterned Wallpaper',
    baseColorHex: '#450a0a',
    accentColorHex: '#991b1b',
    patternType: 'velvet',
    cost: 350,
    environmentRating: 9,
    moodEffect: 'Eerie',
  },
];

/**
 * Curated Catalog of Carpets, Rugs & Flooring
 */
export const CARPET_CATALOG: CarpetStyle[] = [
  {
    id: 'fl_honey_oak',
    name: 'Warm Honey Oak Wide-Plank Wood',
    category: 'Hardwood',
    baseColorHex: '#92400e',
    secondaryColorHex: '#78350f',
    patternType: 'oak_plank',
    roughness: 0.45,
    cost: 220,
    comfortRating: 8,
  },
  {
    id: 'fl_persian_crimson',
    name: 'Royal Kashan Crimson Woven Carpet',
    category: 'Woven Rugs',
    baseColorHex: '#881337',
    secondaryColorHex: '#fbbf24',
    patternType: 'persian_rug',
    roughness: 0.85,
    cost: 360,
    comfortRating: 10,
  },
  {
    id: 'fl_checker_marble',
    name: 'Carrara Black & White Checker Marble',
    category: 'Stone & Tile',
    baseColorHex: '#f8fafc',
    secondaryColorHex: '#1e293b',
    patternType: 'checker_marble',
    roughness: 0.25,
    cost: 310,
    comfortRating: 7,
  },
  {
    id: 'fl_plush_berber',
    name: 'Cloud-Soft Ivory Berber Carpet',
    category: 'Plush Carpet',
    baseColorHex: '#e7e5e4',
    secondaryColorHex: '#d6d3d1',
    patternType: 'berber_carpet',
    roughness: 0.92,
    cost: 250,
    comfortRating: 9,
  },
  {
    id: 'fl_mahogany_herringbone',
    name: 'Estate Mahogany Herringbone Parquet',
    category: 'Hardwood',
    baseColorHex: '#5c2d16',
    secondaryColorHex: '#3e1d0d',
    patternType: 'herringbone',
    roughness: 0.4,
    cost: 340,
    comfortRating: 9,
  },
  {
    id: 'fl_slate_flagstone',
    name: 'Nordic Charcoal Slate Flagstone',
    category: 'Stone & Tile',
    baseColorHex: '#334155',
    secondaryColorHex: '#1e293b',
    patternType: 'slate_tile',
    roughness: 0.65,
    cost: 200,
    comfortRating: 7,
  },
  {
    id: 'fl_emerald_velvet',
    name: 'Parlor Emerald Tufted Carpet',
    category: 'Plush Carpet',
    baseColorHex: '#065f46',
    secondaryColorHex: '#047857',
    patternType: 'emerald_plush',
    roughness: 0.88,
    cost: 290,
    comfortRating: 9,
  },
  {
    id: 'fl_terracotta_tile',
    name: 'Tuscan Sunbaked Terracotta Tile',
    category: 'Stone & Tile',
    baseColorHex: '#c2410c',
    secondaryColorHex: '#9a3412',
    patternType: 'terracotta',
    roughness: 0.55,
    cost: 230,
    comfortRating: 8,
  },
];

/**
 * Curated Architectural Home Layout Presets
 */
export const HOME_LAYOUT_PRESETS: HomeLayoutPreset[] = [
  {
    id: 'layout_classic_manor',
    name: 'Classic Suburban Estate (Standard)',
    description: 'Defined traditional rooms with central slate hallway, framed doorways, and cozy separation.',
    expansionLevel: 1,
    openConceptKitchen: false,
    openConceptLiving: false,
    roomWallpapers: {
      LivingRoom: 'wp_classic_wainscot',
      Kitchen: 'wp_terracotta_venetian',
      Bedroom: 'wp_botanical_sage',
      Study: 'wp_midcentury_teak',
      Bathroom: 'wp_classic_wainscot',
    },
    roomCarpets: {
      LivingRoom: 'fl_honey_oak',
      Kitchen: 'fl_checker_marble',
      Bedroom: 'fl_plush_berber',
      Study: 'fl_mahogany_herringbone',
      Bathroom: 'fl_checker_marble',
      Hallway: 'fl_slate_flagstone',
    },
  },
  {
    id: 'layout_open_artist_loft',
    name: 'Open-Concept Creative Double Loft',
    description: 'Removes interior hallway partitions for an expansive open kitchen/living floorplan plus second-floor mezzanine loft.',
    expansionLevel: 2,
    openConceptKitchen: true,
    openConceptLiving: true,
    roomWallpapers: {
      LivingRoom: 'wp_exposed_brick',
      Kitchen: 'wp_exposed_brick',
      Bedroom: 'wp_midcentury_teak',
      Study: 'wp_architectural_concrete',
      Bathroom: 'wp_architectural_concrete',
    },
    roomCarpets: {
      LivingRoom: 'fl_mahogany_herringbone',
      Kitchen: 'fl_slate_flagstone',
      Bedroom: 'fl_persian_crimson',
      Study: 'fl_honey_oak',
      Bathroom: 'fl_slate_flagstone',
      Hallway: 'fl_mahogany_herringbone',
    },
  },
  {
    id: 'layout_royal_victorian',
    name: 'Grand Victorian Parlor & Mezzanine',
    description: 'Opulent gilded damask walls, Persian crimson carpets, and full two-story architectural framing.',
    expansionLevel: 2,
    openConceptKitchen: false,
    openConceptLiving: true,
    roomWallpapers: {
      LivingRoom: 'wp_victorian_damask',
      Kitchen: 'wp_classic_wainscot',
      Bedroom: 'wp_noir_crimson',
      Study: 'wp_victorian_damask',
      Bathroom: 'wp_botanical_sage',
    },
    roomCarpets: {
      LivingRoom: 'fl_persian_crimson',
      Kitchen: 'fl_checker_marble',
      Bedroom: 'fl_emerald_velvet',
      Study: 'fl_persian_crimson',
      Bathroom: 'fl_checker_marble',
      Hallway: 'fl_checker_marble',
    },
  },
];

/**
 * Generates a procedural Three.js CanvasTexture for any WallpaperStyle
 */
export function createWallpaperTexture(style: WallpaperStyle): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = style.baseColorHex;
  ctx.fillRect(0, 0, 256, 256);

  if (style.patternType === 'brick') {
    ctx.fillStyle = '#d6d3d1'; // mortar
    ctx.fillRect(0, 0, 256, 256);
    const rows = 8;
    const cols = 4;
    const bh = 256 / rows;
    const bw = 256 / cols;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (bw / 2);
      for (let c = -1; c <= cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? style.baseColorHex : style.accentColorHex;
        ctx.fillRect(c * bw + offset + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
  } else if (style.patternType === 'stripes') {
    ctx.fillStyle = style.accentColorHex;
    for (let x = 0; x < 256; x += 32) {
      ctx.fillRect(x, 0, 12, 256);
    }
  } else if (style.patternType === 'wood_slats') {
    for (let x = 0; x < 256; x += 16) {
      ctx.fillStyle = x % 32 === 0 ? style.baseColorHex : style.accentColorHex;
      ctx.fillRect(x, 0, 13, 256);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(x + 13, 0, 3, 256);
    }
  } else if (style.patternType === 'damask' || style.patternType === 'velvet') {
    ctx.strokeStyle = style.accentColorHex;
    ctx.lineWidth = 2;
    for (let y = 32; y < 256; y += 64) {
      for (let x = 32; x < 256; x += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.stroke();
      }
    }
  } else if (style.patternType === 'wainscot') {
    // Lower wooden wainscot panel
    ctx.fillStyle = style.accentColorHex;
    ctx.fillRect(0, 150, 256, 106);
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 162, 104, 80);
    ctx.strokeRect(140, 162, 104, 80);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a procedural Three.js CanvasTexture for any CarpetStyle
 */
export function createCarpetTexture(style: CarpetStyle): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = style.baseColorHex;
  ctx.fillRect(0, 0, 256, 256);

  if (style.patternType === 'checker_marble') {
    const size = 64;
    for (let y = 0; y < 256; y += size) {
      for (let x = 0; x < 256; x += size) {
        ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? style.baseColorHex : style.secondaryColorHex;
        ctx.fillRect(x, y, size, size);
      }
    }
  } else if (style.patternType === 'oak_plank' || style.patternType === 'herringbone') {
    ctx.strokeStyle = style.secondaryColorHex;
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 32) {
      ctx.fillStyle = (y / 32) % 2 === 0 ? style.baseColorHex : style.secondaryColorHex;
      ctx.fillRect(0, y, 256, 30);
      ctx.strokeRect(0, y, 256, 32);
    }
  } else if (style.patternType === 'persian_rug') {
    // Ornate border and center medallion
    ctx.strokeStyle = style.secondaryColorHex;
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, 224, 224);
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 32, 192, 192);
    ctx.fillStyle = style.secondaryColorHex;
    ctx.beginPath();
    ctx.arc(128, 128, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.baseColorHex;
    ctx.beginPath();
    ctx.arc(128, 128, 24, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Woven carpet or stone tile texture grain
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 2 === 0 ? style.secondaryColorHex : 'rgba(255,255,255,0.08)';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Multi-Agent Art Class (Imagen 2D + Meshy.ai 3D + Smart Object Calibrator)
 */
export class AgentArtClass {
  /**
   * Calibrates 1-10 motive deltas and synthesizes a new SmartObject
   */
  static synthesizeSmartObject(
    spec: AgentArtItemSpec,
    customEffects?: Partial<Motives>,
    durationSeconds: number = 8
  ): { smartObject: SmartObject; status: MeshyGenerationStatus } {
    // Determine room grid coordinates with slight jitter so items don't overlap
    const jitterX = (Math.random() - 0.5) * 2.2;
    const jitterZ = (Math.random() - 0.5) * 2.2;
    let basePos = { x: 0, y: 0, z: 0 };

    if (spec.room === 'Kitchen') basePos = { x: -4.5 + jitterX, y: 0, z: -3.5 + jitterZ };
    else if (spec.room === 'LivingRoom') basePos = { x: 5.5 + jitterX, y: 0, z: -3.0 + jitterZ };
    else if (spec.room === 'Bedroom') basePos = { x: 5.5 + jitterX, y: 0, z: 4.5 + jitterZ };
    else if (spec.room === 'Study') basePos = { x: -7.0 + jitterX, y: 0, z: 4.5 + jitterZ };
    else if (spec.room === 'Bathroom') basePos = { x: -2.5 + jitterX * 0.4, y: 0, z: 5.0 + jitterZ * 0.4 };
    else if (spec.room === 'Yard') basePos = { x: 5.0 + jitterX, y: 0, z: -12.0 + jitterZ };
    else if (spec.room === 'Basement') basePos = { x: jitterX, y: -4, z: jitterZ };

    // Calculate 1-10 environment rating based on material and cost
    const envRating = Math.min(10, Math.max(4, Math.round(spec.cost / 250)));

    const effects: Partial<Motives> = customEffects || {
      fun: Math.min(50, Math.round(envRating * 4)),
      energy: spec.materialFinish === 'Fabric' ? 30 : 10,
      sanity: spec.maturity === 'DARK_ONLY' ? -15 : envRating,
    };

    const smartObject: SmartObject = {
      id: `agent_art_${Date.now()}`,
      name: spec.name.trim(),
      room: spec.room,
      category: spec.room.toLowerCase() as SmartObject['category'],
      gridPos: basePos,
      state: 'Clean',
      maturity: spec.maturity || 'ALL',
      effects,
      actionLabel: spec.actionLabel || `Using ${spec.name}`,
      durationSeconds,
    };

    const status: MeshyGenerationStatus = {
      taskId: `meshy_${Date.now()}`,
      provider: 'imagen-procedural',
      status: 'SUCCEEDED',
      progress: 100,
      environmentRating1To10: envRating,
    };

    return { smartObject, status };
  }

  /**
   * Maps a 1-10 rating score into a motive delta (-20 to +45)
   */
  static scoreToMotiveDelta(score1To10: number): number {
    const clamped = Math.max(1, Math.min(10, score1To10));
    if (clamped < 4) return (clamped - 4) * 6;
    return Math.round((clamped - 3) * 6);
  }

  /**
   * Builds a complete Imagen + Meshy.ai asset descriptor with 1-10 motive ratings
   * and solid collision bounding footprint metadata.
   */
  static buildAssetDescriptor(input: {
    name: string;
    category: string;
    targetRoom: string;
    styleTheme: string;
    materialFinish: string;
    cost: number;
    actionLabel: string;
    motiveRatings1To10: {
      energy: number;
      fun: number;
      sanity: number;
      environmentalInfluence: number;
    };
  }) {
    return {
      id: `agent_art_${Date.now()}`,
      name: input.name,
      actionLabel: input.actionLabel,
      collisionEnabled: true,
      imagenSpec: {
        model: 'gemini-3.1-flash-lite-image',
        prompt: `High-detail isometric 3D architectural asset render of ${input.name}, ${input.styleTheme} style, ${input.materialFinish} finish, crisp bevels, physically based surface textures, studio rim lighting, clean isolated background, game-ready solid collision silhouette`,
      },
      meshySpec: {
        aiModel: 'meshy-4',
        topology: 'quad',
        targetPolycount: 12000,
        enablePbrMaps: true,
      },
      motiveRatings1To10: input.motiveRatings1To10,
    };
  }

  /**
   * Builds a high-fidelity Toon Character Model & Rigging Generation Specification
   * for Imagen 4.0 turnaround sheets + Meshy-4 quad-mesh skeletal rigging with
   * articulated facial bones, oral cavity teeth/tongue, and multi-phalange hands.
   */
  static buildToonRigGenerationSpec(char: {
    name: string;
    genderFrame?: string;
    skinTone?: string;
    hairStyle?: string;
    facialHair?: string;
    clothingTop?: string;
    clothingBottom?: string;
    accessories?: string;
  }) {
    const genderDesc = char.genderFrame || 'Stylized Humanoid';
    const skinDesc = char.skinTone || 'Fair';
    const hairDesc = char.hairStyle || 'Sculpted Side Part';
    const beardDesc =
      char.facialHair && char.facialHair !== 'None'
        ? `with volumetric 3D ${char.facialHair} rigged to mandible jaw bone`
        : 'clean-shaven contoured jawline';
    const outfitDesc = `${char.clothingTop || 'Tailored Jacket'} with stitched lapels, collar, buttons, and rolled cuffs over ${char.clothingBottom || 'Denim Jeans'} with leather belt, brass buckle, and laced leather shoes`;

    return {
      characterName: char.name,
      imagenTurnaroundSpec: {
        model: 'gemini-3.1-flash-lite-image',
        prompt: `Full-body A-pose 3D character turnaround sheet of ${char.name} (${genderDesc}, ${skinDesc} complexion), high-fidelity stylized life-sim toon anatomy, sculpted zygomatic cheekbones, supraorbital brow ridge, expressive multi-layered eyes with sclera, iris, pupil, corneal specular glint, articulated upper/lower eyelids, sculpted nasal bridge with nostril wings and philtrum groove, vermilion lips with inner oral cavity teeth and tongue, volumetric ${hairDesc} hair ${beardDesc}, wearing ${outfitDesc}, anatomically articulated hands with metacarpal palm arch, dorsal knuckle joints, opposable 2-segment thumb, and four 2-segment finger phalanges with fingernails, studio three-point lighting`,
      },
      meshyRigSpec: {
        aiModel: 'meshy-4',
        topology: 'quad',
        targetPolycount: 18500,
        poseMode: 'A-POSE_RIGGED',
        skeletalHierarchy: [
          'PelvisBone',
          'TorsoBone',
          'HeadBone',
          'JawBone',
          'BrowLBone',
          'BrowRBone',
          'EyelidL',
          'EyelidR',
          'UpperArmLBone',
          'ForearmLBone',
          'HandLBone',
          'FingersLBone',
          'ThumbLBone',
          'UpperArmRBone',
          'ForearmRBone',
          'HandRBone',
          'FingersRBone',
          'ThumbRBone',
          'ThighLBone',
          'ShinLBone',
          'FootLBone',
          'ThighRBone',
          'ShinRBone',
          'FootRBone',
        ],
        facialExpressionChannels: [
          'jawOpen',
          'browRaise',
          'browTilt',
          'eyelidBlink',
          'eyeGazeYaw',
          'innerMouthTeethTongue',
        ],
        handArticulationChannels: [
          'wristPitchYawRoll',
          'proximalDistalFingerCurl',
          'opposableThumbSpread',
          'dorsalKnuckleTopology',
        ],
      },
    };
  }
}


