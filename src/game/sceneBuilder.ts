/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { SmartObject, Character, resolveFurnitureCollision } from './simulation';
import {
  WALLPAPER_CATALOG,
  CARPET_CATALOG,
  createWallpaperTexture,
  createCarpetTexture,
} from '../AgentArtClass/AgentArtPipeline';
import {
  WorldBlueprint,
  PlacedBuildingPart,
  BuildingPartDefinition,
  BuildToolMode,
  computeCharacterBonePose,
} from './worldBuilder';
import { advanceToonAlongPath, ToonPathAgentState } from './pathfinding';

export type WallCutawayMode = 'CUTAWAY' | 'WALLS_UP' | 'WALLS_DOWN';
export type WeatherCondition = 'CLEAR' | 'CLOUDY' | 'RAIN' | 'SNOW' | 'STORM';

export interface SceneHandles {
  scene: THREE.Scene;
  lotGroup: THREE.Group;
  wallsGroup: THREE.Group;
  objectsGroup: THREE.Group;
  charactersGroup: THREE.Group;
  customWorldGroup: THREE.Group;
  gridHelper: THREE.GridHelper;
  characterMeshes: Map<string, THREE.Group>;
  plumbobMeshes: Map<string, THREE.Mesh>;
  updateCutaways: (mode: WallCutawayMode, cameraPos: THREE.Vector3) => void;
  updateCharacters: (
    characters: Character[],
    delta: number,
    smartObjects?: SmartObject[],
    activeSpeakerId?: string | null
  ) => void;
  updateWeather: (condition: WeatherCondition, delta: number) => void;
  applyHomeStyling: (
    roomWallpapers: Record<string, string>,
    roomCarpets: Record<string, string>,
    openConceptKitchen?: boolean,
    openConceptLiving?: boolean
  ) => void;
  applyWorldBlueprint: (blueprint: WorldBlueprint) => void;
  syncSmartObjects: (smartObjects: SmartObject[]) => void;
  syncCharacters: (characters: Character[]) => void;
  updateBuildCursor: (
    worldPos: { x: number; y: number; z: number } | null,
    part: BuildingPartDefinition | null,
    rotationY: number,
    toolMode: BuildToolMode,
    isActive: boolean
  ) => void;
  toggleGrid: (visible: boolean) => void;
  poolWaterMaterial: THREE.MeshStandardMaterial;
  setExpansionLevel: (level: number) => void;
  setMultiStoryState: (state: { hasUpstairs: boolean; hasBasement: boolean }) => void;
}

/**
 * Creates procedural pencil-grain canvas texture for sketch/graphite shading
 */
function createPencilTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f5f4ef';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle graphite noise / cross-hatching
  ctx.strokeStyle = 'rgba(70, 70, 75, 0.08)';
  ctx.lineWidth = 1;
  for (let i = -512; i < 1024; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 512, 512);
    ctx.stroke();
  }
  for (let i = -512; i < 1024; i += 12) {
    ctx.beginPath();
    ctx.moveTo(i + 512, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
  }

  // Faint speckles
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(40,40,45,0.06)' : 'rgba(255,255,255,0.4)';
    ctx.fillRect(x, y, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates an architectural door with jambs, casing, paneled door slab, and brass handle
 */
function createDoorMesh(
  width = 1.3,
  height = 2.4,
  depth = 0.25,
  isOpen = false,
  doorColor = 0x6b4226,
  frameColor = 0xf8fafc
): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.7 });
  const doorMat = new THREE.MeshStandardMaterial({ color: doorColor, roughness: 0.55 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.85, roughness: 0.2 });

  const jambThick = 0.08;
  // Left jamb
  const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(jambThick, height, depth), frameMat);
  leftJamb.position.set(-width / 2 + jambThick / 2, height / 2, 0);
  group.add(leftJamb);

  // Right jamb
  const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(jambThick, height, depth), frameMat);
  rightJamb.position.set(width / 2 - jambThick / 2, height / 2, 0);
  group.add(rightJamb);

  // Top header
  const topHeader = new THREE.Mesh(new THREE.BoxGeometry(width, jambThick, depth), frameMat);
  topHeader.position.set(0, height - jambThick / 2, 0);
  group.add(topHeader);

  // Door slab
  const doorW = width - jambThick * 2;
  const doorH = height - jambThick;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), doorMat);
  slab.position.set(0, doorH / 2, 0);
  slab.castShadow = true;
  group.add(slab);

  // Decorative panel inserts on door slab
  const panelMat = new THREE.MeshStandardMaterial({ color: doorColor, roughness: 0.4 });
  const pUpper = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.7, doorH * 0.36, 0.08), panelMat);
  pUpper.position.set(0, doorH * 0.68, 0);
  group.add(pUpper);

  const pLower = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.7, doorH * 0.36, 0.08), panelMat);
  pLower.position.set(0, doorH * 0.26, 0);
  group.add(pLower);

  // Brass knob on front & back
  const knobF = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), brassMat);
  knobF.position.set(doorW * 0.36, doorH * 0.48, 0.06);
  group.add(knobF);

  const knobB = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), brassMat);
  knobB.position.set(doorW * 0.36, doorH * 0.48, -0.06);
  group.add(knobB);

  return group;
}

/**
 * Creates an architectural window with wood casing, sill, translucent glass, and mullions
 */
function createWindowMesh(
  width = 1.6,
  height = 1.5,
  depth = 0.25,
  frameColor = 0xf8fafc
): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.45,
  });

  const borderThick = 0.08;

  // Window Sill (bottom projecting)
  const sill = new THREE.Mesh(new THREE.BoxGeometry(width + 0.15, 0.08, depth + 0.1), frameMat);
  sill.position.set(0, 0.04, 0);
  group.add(sill);

  // Left & Right Stiles
  const stileL = new THREE.Mesh(new THREE.BoxGeometry(borderThick, height, depth), frameMat);
  stileL.position.set(-width / 2 + borderThick / 2, height / 2, 0);
  group.add(stileL);

  const stileR = new THREE.Mesh(new THREE.BoxGeometry(borderThick, height, depth), frameMat);
  stileR.position.set(width / 2 - borderThick / 2, height / 2, 0);
  group.add(stileR);

  // Top Rail
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(width, borderThick, depth), frameMat);
  railTop.position.set(0, height - borderThick / 2, 0);
  group.add(railTop);

  // Glass Pane
  const glass = new THREE.Mesh(new THREE.BoxGeometry(width - borderThick * 2, height - borderThick * 2, 0.02), glassMat);
  glass.position.set(0, height / 2, 0);
  group.add(glass);

  // Mullion Grid: vertical and horizontal dividers
  const vertMullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, height - borderThick * 2, 0.04), frameMat);
  vertMullion.position.set(0, height / 2, 0);
  group.add(vertMullion);

  const horizMullion = new THREE.Mesh(new THREE.BoxGeometry(width - borderThick * 2, 0.04, 0.04), frameMat);
  horizMullion.position.set(0, height / 2, 0);
  group.add(horizMullion);

  return group;
}

/**
 * Builds the buildable Second Floor Loft (L-shaped floorboards with open stairwell cutout,
 * wooden staircase, safety railings, and cutaway-aware dormer wall & floor slabs)
 */
function buildSecondFloorLoft(pencilTex: THREE.Texture, _isDarkMode: boolean): {
  loftGroup: THREE.Group;
  loftFloorSlabs: THREE.Mesh[];
  loftTimberMat: THREE.MeshStandardMaterial;
  loftDormerWall: THREE.Mesh;
  loftUpperWindow: THREE.Group;
  loftRailings: THREE.Object3D[];
} {
  const loftGroup = new THREE.Group();
  loftGroup.name = 'SecondFloorLoft';

  const timberMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.5,
    metalness: 0.05,
    map: pencilTex,
    transparent: true,
    opacity: 1.0,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.6,
    transparent: true,
    opacity: 1.0,
  });
  const balusterMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.7,
    transparent: true,
    opacity: 1.0,
  });

  // 1. Second Floor L-Shaped Floorboards at Y = 2.9 with an OPEN stairwell cutout
  // Staircase treads run from Z = 4.5 to Z = -0.8 (with tread half-depth reaching Z = -1.01) along X = 0.34 to 1.56.
  // We split the 2nd floor into:
  // - loftMainSlab (West wing: X = -10.5 to +0.25, Z = -7.5 to +4.5)
  // - loftLandingSlab (North landing at top of stairs: X = +0.25 to +1.6, Z = -7.5 to -1.05)
  // This leaves the entire stairwell box (X = +0.25 to +1.6, Z = -1.05 to +4.5) 100% open at the top of the stairs!
  const loftMainSlab = new THREE.Mesh(new THREE.BoxGeometry(10.75, 0.15, 12.0), timberMat);
  loftMainSlab.position.set(-5.125, 2.9, -1.5); // X: -10.5 to +0.25, Z: -7.5 to +4.5
  loftMainSlab.receiveShadow = true;
  loftGroup.add(loftMainSlab);

  const loftLandingSlab = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.15, 6.45), timberMat);
  loftLandingSlab.position.set(0.925, 2.9, -4.275); // X: +0.25 to +1.6, Z: -7.5 to -1.05 (Top stair landing, clear of top step)
  loftLandingSlab.receiveShadow = true;
  loftGroup.add(loftLandingSlab);

  // 2. Open Wooden Staircase ascending from ground (Y=0, Z=4.5) to Loft Landing (Y=2.88, Z=-0.85) along X = 0.95
  const stepsCount = 13;
  const startZ = 4.5;
  const endZ = -0.85;
  const startY = 0;
  const endY = 2.88;

  for (let s = 0; s <= stepsCount; s++) {
    const fraction = s / stepsCount;
    const sy = startY + fraction * endY;
    const sz = startZ + fraction * (endZ - startZ);

    // Stringer & Tread
    const tread = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.07, 0.4), railMat);
    tread.position.set(0.95, sy + 0.035, sz);
    tread.receiveShadow = true;
    tread.castShadow = true;
    loftGroup.add(tread);

    // Baluster on right open side
    const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), balusterMat);
    baluster.position.set(1.52, sy + 0.45, sz);
    loftGroup.add(baluster);
  }

  // Stair Handrail
  const railLength = Math.hypot(endZ - startZ, endY - startY);
  const handrail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, railLength), railMat);
  handrail.position.set(1.52, (startY + endY) / 2 + 0.85, (startZ + endZ) / 2);
  handrail.rotation.x = Math.atan2(endY - startY, -(endZ - startZ)) - Math.PI / 2;
  loftGroup.add(handrail);

  // 3. Mezzanine Balustrade Safety Railing around the open edge & stairwell cutout
  const loftRailings: THREE.Object3D[] = [];

  // North landing east edge railing (Z = -7.5 to -1.05 at X = 1.55)
  const landingEastRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 6.45), railMat);
  landingEastRail.position.set(1.55, 3.8, -4.275);
  loftGroup.add(landingEastRail);
  loftRailings.push(landingEastRail);

  for (let bz = -7.2; bz <= -1.2; bz += 0.8) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85), balusterMat);
    post.position.set(1.55, 3.4, bz);
    loftGroup.add(post);
    loftRailings.push(post);
  }

  // Inner stairwell cutout safety railing (along X = 0.25 from Z = -1.05 to 4.5)
  const stairwellInnerRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 5.55), railMat);
  stairwellInnerRail.position.set(0.25, 3.8, 1.725);
  loftGroup.add(stairwellInnerRail);
  loftRailings.push(stairwellInnerRail);

  for (let bz = -0.9; bz <= 4.3; bz += 0.85) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85), balusterMat);
    post.position.set(0.25, 3.4, bz);
    loftGroup.add(post);
    loftRailings.push(post);
  }

  // 4. Loft Dormer Wall & Upper Window (registered with cutaway system)
  const dormerWall = new THREE.Mesh(
    new THREE.BoxGeometry(12.0, 2.2, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xf3f4f6, map: pencilTex })
  );
  dormerWall.position.set(-4.5, 4.0, -7.5);
  loftGroup.add(dormerWall);

  const upperWindow = createWindowMesh(2.0, 1.4, 0.2);
  upperWindow.position.set(-4.5, 3.8, -7.35);
  loftGroup.add(upperWindow);

  return {
    loftGroup,
    loftFloorSlabs: [loftMainSlab, loftLandingSlab],
    loftTimberMat: timberMat,
    loftDormerWall: dormerWall,
    loftUpperWindow: upperWindow,
    loftRailings,
  };
}

/**
 * Builds the buildable Subterranean Basement Level (Y = -3.2m) with descending timber/stone
 * staircase, masonry foundation walls, warm subterranean lighting, and open front cutaway view.
 */
function buildSubterraneanBasement(pencilTex: THREE.Texture, isDarkMode: boolean): {
  basementGroup: THREE.Group;
  basementFloorSlab: THREE.Mesh;
} {
  const basementGroup = new THREE.Group();
  basementGroup.name = 'SubterraneanBasement';

  const floorMat = new THREE.MeshStandardMaterial({
    color: isDarkMode ? 0x1e293b : 0x334155,
    roughness: 0.65,
    map: pencilTex,
  });
  const stoneWallMat = new THREE.MeshStandardMaterial({
    color: isDarkMode ? 0x111827 : 0x475569,
    roughness: 0.85,
    map: pencilTex,
  });
  const stairMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.6,
    map: pencilTex,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.4,
    roughness: 0.4,
  });

  // 1. Subterranean Basement Floor Slab at Y = -3.2 (X = -10.5 to +2.0, Z = -6.0 to +8.5)
  const basementFloorSlab = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.16, 14.5), floorMat);
  basementFloorSlab.position.set(-4.25, -3.28, 1.25);
  basementFloorSlab.receiveShadow = true;
  basementGroup.add(basementFloorSlab);

  // Decorative Basement Rec-Room Rug (Neutral warm slate/taupe — no red blocks)
  const rugMat = new THREE.MeshStandardMaterial({
    color: isDarkMode ? 0x334155 : 0x64748b,
    roughness: 0.85,
    map: pencilTex,
  });
  const basementRug = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.02, 3.8), rugMat);
  basementRug.position.set(-5.5, -3.19, 2.2);
  basementGroup.add(basementRug);

  // 2. Subterranean Foundation Walls (North & East walls, leaving West & South open cutaway showcase)
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(12.5, 3.1, 0.35), stoneWallMat);
  northWall.position.set(-4.25, -1.65, -6.0);
  basementGroup.add(northWall);

  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.1, 14.5), stoneWallMat);
  eastWall.position.set(2.0, -1.65, 1.25);
  basementGroup.add(eastWall);

  // Support Timber Columns inside Basement
  for (const [cx, cz] of [
    [-9.8, -5.2],
    [-9.8, 7.8],
    [1.4, 7.8],
  ]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.15, 0.32), stairMat);
    col.position.set(cx, -1.62, cz);
    basementGroup.add(col);
  }

  // 3. Descending Basement Staircase (From Ground Floor X = -1.8, Y = 0, Z = -0.8 down to Y = -3.2, Z = 4.2)
  const stepsCount = 12;
  const startZ = -0.8;
  const endZ = 4.2;
  const startY = 0.0;
  const endY = -3.18;

  for (let s = 0; s <= stepsCount; s++) {
    const frac = s / stepsCount;
    const sy = startY + frac * (endY - startY);
    const sz = startZ + frac * (endZ - startZ);
    const tread = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.38), stairMat);
    tread.position.set(-1.8, sy, sz);
    tread.castShadow = true;
    tread.receiveShadow = true;
    basementGroup.add(tread);
  }

  const railLen = Math.hypot(endZ - startZ, endY - startY);
  const handrail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, railLen), railMat);
  handrail.position.set(-2.35, (startY + endY) / 2 + 0.75, (startZ + endZ) / 2);
  handrail.rotation.x = Math.atan2(endY - startY, -(endZ - startZ)) - Math.PI / 2;
  basementGroup.add(handrail);

  // 4. Warm Subterranean Point Lights so the Basement glows clearly in the cutaway cross-section
  const bLight1 = new THREE.PointLight(0xffedd5, 0.95, 14);
  bLight1.position.set(-5.5, -0.8, 1.5);
  basementGroup.add(bLight1);

  const bLight2 = new THREE.PointLight(0x38bdf8, 0.55, 10);
  bLight2.position.set(-8.0, -1.2, -2.0);
  basementGroup.add(bLight2);

  return {
    basementGroup,
    basementFloorSlab,
  };
}

/**
 * Builds the complete 3D environment: floating lot diorama, rooms, furniture, and character rigs
 */
export function buildHouseEnvironment(
  smartObjects: SmartObject[],
  characters: Character[],
  isDarkMode: boolean,
  initialExpansionLevel: number = 1
): SceneHandles {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(isDarkMode ? 0x0f1117 : 0xe0e7ff);
  scene.fog = new THREE.Fog(isDarkMode ? 0x0f1117 : 0xe0e7ff, 45, 110);

  const pencilTex = createPencilTexture();

  // Root Groups
  const lotGroup = new THREE.Group();
  const defaultHouseFloorsGroup = new THREE.Group();
  defaultHouseFloorsGroup.name = 'DefaultHouseFloorsGroup';
  lotGroup.add(defaultHouseFloorsGroup);

  const wallsGroup = new THREE.Group();
  const customWorldGroup = new THREE.Group();
  customWorldGroup.name = 'CustomWorldGroup';
  const objectsGroup = new THREE.Group();
  const charactersGroup = new THREE.Group();
  const loftParts = buildSecondFloorLoft(pencilTex, isDarkMode);
  const secondFloorGroup = loftParts.loftGroup;
  let currentHasUpstairs = initialExpansionLevel >= 2;
  let currentHasBasement = initialExpansionLevel >= 3 || isDarkMode;
  secondFloorGroup.visible = currentHasUpstairs;

  const basementParts = buildSubterraneanBasement(pencilTex, isDarkMode);
  const basementGroup = basementParts.basementGroup;
  basementGroup.visible = currentHasBasement;

  // 3D Grid Placement Ghost Cursor for World Builder Mode
  const buildCursorGroup = new THREE.Group();
  buildCursorGroup.name = 'BuildCursorGroup';
  buildCursorGroup.visible = false;
  const cursorBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cursorBoxMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const cursorBoxMesh = new THREE.Mesh(cursorBoxGeo, cursorBoxMat);
  const cursorWireMesh = new THREE.LineSegments(
    new THREE.EdgesGeometry(cursorBoxGeo),
    new THREE.LineBasicMaterial({ color: 0x4ade80 })
  );
  cursorBoxMesh.add(cursorWireMesh);
  buildCursorGroup.add(cursorBoxMesh);

  scene.add(lotGroup);
  scene.add(wallsGroup);
  scene.add(customWorldGroup);
  scene.add(objectsGroup);
  scene.add(charactersGroup);
  scene.add(secondFloorGroup);
  scene.add(basementGroup);
  scene.add(buildCursorGroup);

  let isEmptyGridActive = false;

  // ----------------------------------------------------
  // 1. FLOATING LOT DIORAMA & EARTH CROSS-SECTION SKIRT
  // ----------------------------------------------------
  // Top Yard Grass (36 x 36m lot) — Always present on Empty Grid
  const grassMat = new THREE.MeshStandardMaterial({
    color: isDarkMode ? 0x223826 : 0x5a8c3e,
    roughness: 0.85,
    metalness: 0.05,
    map: pencilTex,
  });
  const grassMesh = new THREE.Mesh(new THREE.BoxGeometry(36, 0.6, 36), grassMat);
  grassMesh.position.y = -0.3;
  grassMesh.receiveShadow = true;
  grassMesh.name = 'LotGroundGrass';
  lotGroup.add(grassMesh);

  // Earth / Bedrock Skirt underneath (Solid when no basement; Excavated cutaway chamber when Basement is built)
  const earthMat = new THREE.MeshStandardMaterial({
    color: isDarkMode ? 0x201a18 : 0x4a3b32,
    roughness: 0.95,
    metalness: 0.05,
  });
  const earthSkirt = new THREE.Mesh(new THREE.BoxGeometry(36, 6.0, 36), earthMat);
  earthSkirt.position.y = -3.6;
  earthSkirt.visible = !currentHasBasement;
  lotGroup.add(earthSkirt);

  // Excavated Earth Foundation Skirt with Subterranean Cutaway Recess for Basement
  const excavatedEarthGroup = new THREE.Group();
  excavatedEarthGroup.visible = currentHasBasement;
  // Lower bedrock base below Y = -3.35
  const lowerBedrock = new THREE.Mesh(new THREE.BoxGeometry(36, 3.3, 36), earthMat);
  lowerBedrock.position.set(0, -5.0, 0);
  excavatedEarthGroup.add(lowerBedrock);
  // East side earth block (X = +2.2 to +18.0)
  const eastEarth = new THREE.Mesh(new THREE.BoxGeometry(15.8, 2.75, 36), earthMat);
  eastEarth.position.set(10.1, -1.975, 0);
  excavatedEarthGroup.add(eastEarth);
  // North side earth block behind basement (X = -18.0 to +2.2, Z = -18.0 to -6.2)
  const northEarth = new THREE.Mesh(new THREE.BoxGeometry(20.2, 2.75, 11.8), earthMat);
  northEarth.position.set(-7.9, -1.975, -12.1);
  excavatedEarthGroup.add(northEarth);
  lotGroup.add(excavatedEarthGroup);

  // 36x36 Grid Overlay over the yard
  const gridHelper = new THREE.GridHelper(36, 36, 0xffffff, 0xffffff);
  gridHelper.position.y = 0.03;
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.28;
  gridHelper.userData.defaultOpacity = 0.28;
  lotGroup.add(gridHelper);

  // Front Sidewalk & Driveway leading to Grid Boundary Portal
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    roughness: 0.7,
    map: pencilTex,
  });
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(36, 0.04, 3.5), concreteMat);
  sidewalk.position.set(0, 0.02, 16.0);
  sidewalk.receiveShadow = true;
  lotGroup.add(sidewalk);

  // Sidewalk Grid Boundary Pillars (Visual portal marker at lot edge)
  const portalPostMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
  const postLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.8), portalPostMat);
  postLeft.position.set(-17.5, 0.9, 16.0);
  lotGroup.add(postLeft);

  const postRight = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.8), portalPostMat);
  postRight.position.set(17.5, 0.9, 16.0);
  lotGroup.add(postRight);

  // Swimming Pool in Yard (North lawn - part of DefaultHouseFloorsGroup so Bulldoze clears it)
  const poolBorderMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.5 });
  const poolBorder = new THREE.Mesh(new THREE.BoxGeometry(11, 0.2, 7), poolBorderMat);
  poolBorder.position.set(0, 0.05, -14.5);
  defaultHouseFloorsGroup.add(poolBorder);

  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.75,
  });
  const poolWater = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.1, 5.6), poolWaterMat);
  poolWater.position.set(0, 0.08, -14.5);
  defaultHouseFloorsGroup.add(poolWater);

  // Trees in Yard
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.9 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const treePositions = [
    [-14, 0, -14],
    [-14, 0, -8],
    [-14, 0, -2],
    [14, 0, -14],
    [14, 0, -8],
    [14, 0, -2],
    [-13, 0, 10],
    [13, 0, 10],
  ];

  treePositions.forEach(([tx, ty, tz]) => {
    const treeGroup = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.5), trunkMat);
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    for (let c = 0; c < 3; c++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1.4 - c * 0.3, 2.0 - c * 0.3, 8),
        foliageMat
      );
      cone.position.y = 2.6 + c * 1.2;
      cone.castShadow = true;
      treeGroup.add(cone);
    }
    treeGroup.position.set(tx, ty, tz);
    defaultHouseFloorsGroup.add(treeGroup);
  });

  // ----------------------------------------------------
  // 1B. FRONT PORCH VERANDA, STEPPING STONES & FLOWERBEDS
  // ----------------------------------------------------
  const porchDeckMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65, map: pencilTex });
  const porchDeck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.14, 2.2), porchDeckMat);
  porchDeck.position.set(0.5, 0.07, 10.1);
  porchDeck.receiveShadow = true;
  defaultHouseFloorsGroup.add(porchDeck);

  const stonePathMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75, map: pencilTex });
  for (let sz = 11.6; sz <= 14.8; sz += 1.05) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.7), stonePathMat);
    stone.position.set(0.5, 0.025, sz);
    stone.receiveShadow = true;
    defaultHouseFloorsGroup.add(stone);
  }

  const planterBoxMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.85 });
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
  const blossomMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.6 });
  for (const fx of [-6.0, 6.2]) {
    const planter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 0.9), planterBoxMat);
    planter.position.set(fx, 0.175, 9.65);
    defaultHouseFloorsGroup.add(planter);
    for (let bx = -1.4; bx <= 1.4; bx += 0.9) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), bushMat);
      bush.position.set(fx + bx, 0.45, 9.65);
      defaultHouseFloorsGroup.add(bush);
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), blossomMat);
      flower.position.set(fx + bx + 0.1, 0.72, 9.75);
      defaultHouseFloorsGroup.add(flower);
    }
  }

  // Warm interior ceiling point lights for inviting room glow
  const roomLightCoords: [number, number, number][] = [
    [6.25, 2.5, -3.5],  // Living Room
    [-5.75, 2.5, -3.5], // Kitchen
    [6.25, 2.5, 4.75],  // Bedroom
    [-7.5, 2.5, 4.75],  // Study
  ];
  roomLightCoords.forEach(([lx, ly, lz]) => {
    const pt = new THREE.PointLight(0xffedd5, isDarkMode ? 0.5 : 0.65, 11);
    pt.position.set(lx, ly, lz);
    scene.add(pt);
  });

  // ----------------------------------------------------
  // 2. HOUSE INTERIOR FLOOR TILES & CARPETS (Consistent Matched Room Styles)
  // ----------------------------------------------------
  const findCarpet = (id: string, fallbackIdx: number) =>
    CARPET_CATALOG.find((c) => c.id === id) || CARPET_CATALOG[fallbackIdx] || CARPET_CATALOG[0];
  const findWallpaper = (id: string, fallbackIdx: number) =>
    WALLPAPER_CATALOG.find((w) => w.id === id) || WALLPAPER_CATALOG[fallbackIdx] || WALLPAPER_CATALOG[0];

  const roomFloorMaterials: Record<string, THREE.MeshStandardMaterial> = {
    Hallway: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      map: createCarpetTexture(findCarpet('fl_slate_flagstone', 5)),
    }),
    LivingRoom: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      map: createCarpetTexture(findCarpet('fl_honey_oak', 0)),
    }),
    Kitchen: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      map: createCarpetTexture(findCarpet('fl_checker_marble', 2)),
    }),
    Bedroom: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.88,
      map: createCarpetTexture(findCarpet('fl_plush_berber', 3)),
    }),
    Study: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.32,
      map: createCarpetTexture(findCarpet('fl_mahogany_herringbone', 4)),
    }),
    Bathroom: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      map: createCarpetTexture(findCarpet('fl_checker_marble', 2)),
    }),
  };

  // ---------------------------------------------------------------------------
  // NON-SQUARE MULTI-WING FLOOR SLABS + OPEN BASEMENT STAIRWELL CUTOUT
  // (Basement stairs run at X: -2.45 to -1.15, Z: -1.0 to +4.4 — kept 100% open!)
  // ---------------------------------------------------------------------------

  // Central Foyer & Hallway (X: -1.15 to +2.0, split around open stairwell)
  const hallwayNorthFloor = new THREE.Mesh(
    new THREE.BoxGeometry(3.15, 0.04, 6.5),
    roomFloorMaterials.Hallway
  );
  hallwayNorthFloor.position.set(0.425, 0.035, -4.25);
  hallwayNorthFloor.receiveShadow = true;
  defaultHouseFloorsGroup.add(hallwayNorthFloor);

  const hallwayEastCorridorFloor = new THREE.Mesh(
    new THREE.BoxGeometry(3.15, 0.04, 9.2),
    roomFloorMaterials.Hallway
  );
  hallwayEastCorridorFloor.position.set(0.425, 0.035, 3.6);
  hallwayEastCorridorFloor.receiveShadow = true;
  defaultHouseFloorsGroup.add(hallwayEastCorridorFloor);

  // Living Room Wing (Stepped North-East Great Room: X: +2.0 to +10.5, Z: -6.2 to +0.5)
  const livingFloor = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 0.04, 6.7),
    roomFloorMaterials.LivingRoom
  );
  livingFloor.position.set(6.25, 0.03, -2.85);
  livingFloor.receiveShadow = true;
  defaultHouseFloorsGroup.add(livingFloor);

  // Decorative Woven Cream Berber Area Rug under Living Room Coffee Table
  const parlorRugMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    map: createCarpetTexture(findCarpet('fl_plush_berber', 3)),
  });
  const parlorRug = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.015, 3.0), parlorRugMat);
  parlorRug.position.set(6.0, 0.055, -2.8);
  parlorRug.receiveShadow = true;
  defaultHouseFloorsGroup.add(parlorRug);

  // Projecting North-West Culinary Kitchen Wing (X: -10.5 to -1.15, Z: -7.5 to -1.0, plus West Side -10.5 to -2.45, Z: -1.0 to +0.5)
  // Leaves X: -2.45 to -1.15, Z: -1.0 to +0.5 completely OPEN for the Basement Stairwell head!
  const kitchenNorthFloor = new THREE.Mesh(
    new THREE.BoxGeometry(9.35, 0.04, 6.5),
    roomFloorMaterials.Kitchen
  );
  kitchenNorthFloor.position.set(-5.825, 0.03, -4.25);
  kitchenNorthFloor.receiveShadow = true;
  defaultHouseFloorsGroup.add(kitchenNorthFloor);

  const kitchenSouthWestFloor = new THREE.Mesh(
    new THREE.BoxGeometry(8.05, 0.04, 1.5),
    roomFloorMaterials.Kitchen
  );
  kitchenSouthWestFloor.position.set(-6.475, 0.03, -0.25);
  kitchenSouthWestFloor.receiveShadow = true;
  defaultHouseFloorsGroup.add(kitchenSouthWestFloor);

  // Projecting South-East Master Bedroom Wing (Asymmetric L-Wing: X: +2.0 to +11.5, Z: +0.5 to +9.8)
  const bedroomFloor = new THREE.Mesh(
    new THREE.BoxGeometry(9.5, 0.04, 9.3),
    roomFloorMaterials.Bedroom
  );
  bedroomFloor.position.set(6.75, 0.03, 5.15);
  bedroomFloor.receiveShadow = true;
  defaultHouseFloorsGroup.add(bedroomFloor);

  // Recessed South-West Atelier Study Wing (X: -10.5 to -4.5, Z: +0.5 to +8.2)
  const studyFloor = new THREE.Mesh(
    new THREE.BoxGeometry(6.0, 0.04, 7.7),
    roomFloorMaterials.Study
  );
  studyFloor.position.set(-7.5, 0.03, 4.35);
  studyFloor.receiveShadow = true;
  defaultHouseFloorsGroup.add(studyFloor);

  // South Gallery Alcove connecting Study, Bathroom Door, and Foyer (X: -4.5 to -1.15, Z: +5.5 to +8.2)
  const studyReadingNookFloor = new THREE.Mesh(
    new THREE.BoxGeometry(3.35, 0.04, 2.7),
    roomFloorMaterials.Study
  );
  studyReadingNookFloor.position.set(-2.825, 0.03, 6.85);
  studyReadingNookFloor.receiveShadow = true;
  defaultHouseFloorsGroup.add(studyReadingNookFloor);

  // En-Suite Bathroom Floor (X: -4.5 to -2.45, Z: +0.5 to +5.5 — West of the Open Basement Stairwell Cutout!)
  const bathFloor = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.04, 5.0),
    roomFloorMaterials.Bathroom
  );
  bathFloor.position.set(-3.475, 0.03, 3.0);
  bathFloor.receiveShadow = true;
  defaultHouseFloorsGroup.add(bathFloor);

  // South-West Landscaped Front Courtyard Flagstone Veranda (Fills the non-square L-notch at X: -10.5 to +2.0, Z: +8.2 to +10.2)
  const courtyardVerandaMat = new THREE.MeshStandardMaterial({
    color: 0xd6d1c4,
    roughness: 0.78,
    map: createCarpetTexture(findCarpet('fl_slate_flagstone', 5)),
  });
  const courtyardVeranda = new THREE.Mesh(
    new THREE.BoxGeometry(12.5, 0.08, 2.0),
    courtyardVerandaMat
  );
  courtyardVeranda.position.set(-4.25, 0.02, 9.2);
  courtyardVeranda.receiveShadow = true;
  defaultHouseFloorsGroup.add(courtyardVeranda);

  // Ground-Floor Open Basement Stairwell Cutout Coping & Safety Balustrade (X: -2.45 to -1.15, Z: -1.0 to +4.4)
  const stairCutoutWalnutMat = new THREE.MeshStandardMaterial({
    color: 0x4a2f1d,
    roughness: 0.55,
    map: pencilTex,
  });
  const stairEastRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.92, 5.4),
    stairCutoutWalnutMat
  );
  stairEastRail.position.set(-1.15, 0.46, 1.7);
  defaultHouseFloorsGroup.add(stairEastRail);

  const stairSouthRail = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.92, 0.08),
    stairCutoutWalnutMat
  );
  stairSouthRail.position.set(-1.8, 0.46, 4.4);
  defaultHouseFloorsGroup.add(stairSouthRail);

  // Subterranean Basement / Dungeon Floor (Underground at Y = -4)
  if (isDarkMode) {
    const dungeonFloorMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95 });
    const dungeonFloor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.04, 12), dungeonFloorMat);
    dungeonFloor.position.set(0, -3.98, 0);
    dungeonFloor.receiveShadow = true;
    defaultHouseFloorsGroup.add(dungeonFloor);

    const dungeonWallMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const dNorth = new THREE.Mesh(new THREE.BoxGeometry(12, 3.5, 0.4), dungeonWallMat);
    dNorth.position.set(0, -2.2, -6);
    defaultHouseFloorsGroup.add(dNorth);
    const dSouth = new THREE.Mesh(new THREE.BoxGeometry(12, 3.5, 0.4), dungeonWallMat);
    dSouth.position.set(0, -2.2, 6);
    defaultHouseFloorsGroup.add(dSouth);
  }

  // ---------------------------------------------------------------------------
  // 3. APERTURE-CARVED WALLS, CORNER PILLARS, DOORS & 3D WINDOWS
  //    (Inspired by Tiny Glade & Paralives: true carved openings + corner quoins)
  // ---------------------------------------------------------------------------
  type WallZone = 'SOUTH' | 'NORTH' | 'EAST' | 'WEST' | 'INTERIOR';

  const roomWallMaterials: Record<string, THREE.MeshStandardMaterial> = {
    LivingRoom: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      map: createWallpaperTexture(findWallpaper('wp_classic_wainscot', 0)),
    }),
    Kitchen: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.68,
      map: createWallpaperTexture(findWallpaper('wp_terracotta_venetian', 4)),
    }),
    Bedroom: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75,
      map: createWallpaperTexture(findWallpaper('wp_botanical_sage', 1)),
    }),
    Study: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      map: createWallpaperTexture(findWallpaper('wp_midcentury_teak', 2)),
    }),
    Bathroom: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      map: createWallpaperTexture(findWallpaper('wp_classic_wainscot', 0)),
    }),
  };

  interface TrackedWallItem {
    mesh: THREE.Object3D;
    originalHeight: number;
    originalPosY: number;
    zone: WallZone;
    isAttachment: boolean;
    partitionGroup?: 'kitchen' | 'living' | 'fixed';
  }

  const wallMeshes: TrackedWallItem[] = [];
  const customWallMeshes: TrackedWallItem[] = [];
  const customRoofMeshes: THREE.Object3D[] = [];
  let isOpenKitchen = false;
  let isOpenLiving = false;

  interface WallApertureSpec {
    type: 'DOOR' | 'WINDOW' | 'OPEN_ARCH';
    center: number; // coordinate along the wall's axis (X for horizontal walls, Z for vertical walls)
    width: number;
    sillY?: number; // 0 for doors, e.g. 0.85 for windows
    height: number; // e.g. 2.35 for doors, 1.5 for windows
    doorColorHex?: number;
    frameColorHex?: number;
  }

  const addWallSegmentMesh = (
    sx: number,
    sy: number,
    sz: number,
    px: number,
    py: number,
    pz: number,
    mat: THREE.Material,
    zone: WallZone,
    isAttachment: boolean = false,
    partitionGroup?: 'kitchen' | 'living' | 'fixed'
  ) => {
    if (sx <= 0.04 || sy <= 0.04 || sz <= 0.04) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    mesh.position.set(px, py, pz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wallsGroup.add(mesh);
    wallMeshes.push({
      mesh,
      originalHeight: sy,
      originalPosY: py,
      zone,
      isAttachment,
      partitionGroup,
    });
  };

  /**
   * Builds a wall along X or Z with true 3D apertures carved out for doors and windows,
   * automatically adding top lintel headers, bottom window sill walls, and 3D door/window frames.
   */
  const buildCarvedWallSpan = (opts: {
    axis: 'X' | 'Z';
    fixedCoord: number; // Z if axis === 'X', X if axis === 'Z'
    start: number;
    end: number;
    wallH?: number;
    thick?: number;
    zone: WallZone;
    roomTag: string;
    partitionGroup?: 'kitchen' | 'living' | 'fixed';
    apertures?: WallApertureSpec[];
  }) => {
    const wallH = opts.wallH ?? 2.8;
    const thick = opts.thick ?? 0.28;
    const mat = roomWallMaterials[opts.roomTag] || roomWallMaterials.LivingRoom;
    // Trim 0.14m off each end where corner pillars sit so orthogonal walls never overlap or Z-fight
    const minC = Math.min(opts.start, opts.end) + 0.14;
    const maxC = Math.max(opts.start, opts.end) - 0.14;
    if (maxC <= minC) return;

    const sorted = [...(opts.apertures || [])].sort((a, b) => a.center - b.center);
    let cursor = minC;

    for (const ap of sorted) {
      const apStart = Math.max(minC, ap.center - ap.width * 0.5);
      const apEnd = Math.min(maxC, ap.center + ap.width * 0.5);

      // Solid full-height wall segment before this aperture
      if (apStart > cursor + 0.06) {
        const segLen = apStart - cursor;
        const segMid = cursor + segLen * 0.5;
        if (opts.axis === 'X') {
          addWallSegmentMesh(segLen, wallH, thick, segMid, wallH * 0.5, opts.fixedCoord, mat, opts.zone, false, opts.partitionGroup);
        } else {
          addWallSegmentMesh(thick, wallH, segLen, opts.fixedCoord, wallH * 0.5, segMid, mat, opts.zone, false, opts.partitionGroup);
        }
      }

      const openLen = apEnd - apStart;
      const openMid = (apStart + apEnd) * 0.5;
      const sillY = ap.type === 'WINDOW' ? (ap.sillY ?? 0.85) : 0;
      const topY = Math.min(wallH, sillY + ap.height);
      const headerH = wallH - topY;

      // Bottom sill wall under window
      if (sillY > 0.05) {
        if (opts.axis === 'X') {
          addWallSegmentMesh(openLen, sillY, thick, openMid, sillY * 0.5, opts.fixedCoord, mat, opts.zone, false, opts.partitionGroup);
        } else {
          addWallSegmentMesh(thick, sillY, openLen, opts.fixedCoord, sillY * 0.5, openMid, mat, opts.zone, false, opts.partitionGroup);
        }
      }

      // Top lintel header above door/window
      if (headerH > 0.05) {
        if (opts.axis === 'X') {
          addWallSegmentMesh(openLen, headerH, thick, openMid, topY + headerH * 0.5, opts.fixedCoord, mat, opts.zone, true, opts.partitionGroup);
        } else {
          addWallSegmentMesh(thick, headerH, openLen, opts.fixedCoord, topY + headerH * 0.5, openMid, mat, opts.zone, true, opts.partitionGroup);
        }
      }

      // Place actual 3D Door or Window assembly inside the carved opening
      if (ap.type === 'DOOR') {
        const doorMesh = createDoorMesh(
          ap.width,
          ap.height,
          thick * 0.95,
          false,
          ap.doorColorHex ?? 0x582f0e,
          ap.frameColorHex ?? 0xf8fafc
        );
        if (opts.axis === 'X') {
          doorMesh.position.set(openMid, 0, opts.fixedCoord);
        } else {
          doorMesh.rotation.y = Math.PI / 2;
          doorMesh.position.set(opts.fixedCoord, 0, openMid);
        }
        wallsGroup.add(doorMesh);
        wallMeshes.push({
          mesh: doorMesh,
          originalHeight: ap.height,
          originalPosY: 0,
          zone: opts.zone,
          isAttachment: true,
          partitionGroup: opts.partitionGroup,
        });
      } else if (ap.type === 'WINDOW') {
        const winMesh = createWindowMesh(
          ap.width,
          ap.height,
          thick * 0.96,
          ap.frameColorHex ?? 0xffffff
        );
        if (opts.axis === 'X') {
          winMesh.position.set(openMid, sillY, opts.fixedCoord);
        } else {
          winMesh.rotation.y = Math.PI / 2;
          winMesh.position.set(opts.fixedCoord, sillY, openMid);
        }
        wallsGroup.add(winMesh);
        wallMeshes.push({
          mesh: winMesh,
          originalHeight: ap.height,
          originalPosY: sillY,
          zone: opts.zone,
          isAttachment: true,
          partitionGroup: opts.partitionGroup,
        });
      }

      cursor = apEnd;
    }

    // Remaining solid wall segment after last aperture
    if (maxC > cursor + 0.06) {
      const segLen = maxC - cursor;
      const segMid = cursor + segLen * 0.5;
      if (opts.axis === 'X') {
        addWallSegmentMesh(segLen, wallH, thick, segMid, wallH * 0.5, opts.fixedCoord, mat, opts.zone, false, opts.partitionGroup);
      } else {
        addWallSegmentMesh(thick, wallH, segLen, opts.fixedCoord, wallH * 0.5, segMid, mat, opts.zone, false, opts.partitionGroup);
      }
    }
  };

  // Tiny Glade-style Corner Pillars / Timber-and-Stone Quoins at wall junctions (eliminates corner gaps & Z-fighting)
  const quoinTimberMat = new THREE.MeshStandardMaterial({
    color: 0x4a3525,
    roughness: 0.65,
    map: pencilTex,
  });
  const quoinCapMat = new THREE.MeshStandardMaterial({
    color: 0xd6d1c4,
    roughness: 0.75,
  });
  const addCornerPillarQuoin = (x: number, z: number, zone: WallZone, height: number = 2.86) => {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, height * 0.5, z);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.34, height, 0.34), quoinTimberMat);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    pGroup.add(shaft);
    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.4), quoinCapMat);
    basePlinth.position.y = -height * 0.5 + 0.11;
    pGroup.add(basePlinth);
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.38), quoinCapMat);
    topCap.position.y = height * 0.5 - 0.06;
    pGroup.add(topCap);
    wallsGroup.add(pGroup);
    wallMeshes.push({
      mesh: pGroup,
      originalHeight: height,
      originalPosY: height * 0.5,
      zone,
      isAttachment: false,
    });
  };

  // --- 1. NORTH EXTERIOR MULTI-WING WALLS ---
  // North-West Culinary Kitchen Wing (X: -10.5 to +2.0 at Z = -7.5, with Kitchen Window + Back Patio Door)
  buildCarvedWallSpan({
    axis: 'X',
    fixedCoord: -7.5,
    start: -10.5,
    end: 2.0,
    zone: 'NORTH',
    roomTag: 'Kitchen',
    apertures: [
      { type: 'WINDOW', center: -5.8, width: 2.2, sillY: 0.95, height: 1.45, frameColorHex: 0xffffff },
      { type: 'DOOR', center: 0.5, width: 1.4, height: 2.4, doorColorHex: 0x475569, frameColorHex: 0xffffff },
    ],
  });
  // Step-back jog from Z = -7.5 to Z = -6.2 at X = 2.0
  buildCarvedWallSpan({
    axis: 'Z',
    fixedCoord: 2.0,
    start: -7.5,
    end: -6.2,
    zone: 'NORTH',
    roomTag: 'LivingRoom',
  });
  // Stepped North-East Great Room Wing (X: +2.0 to +10.5 at Z = -6.2, with Panoramic Picture Window)
  buildCarvedWallSpan({
    axis: 'X',
    fixedCoord: -6.2,
    start: 2.0,
    end: 10.5,
    zone: 'NORTH',
    roomTag: 'LivingRoom',
    apertures: [
      { type: 'WINDOW', center: 6.25, width: 2.6, sillY: 0.85, height: 1.55, frameColorHex: 0xffffff },
    ],
  });

  // --- 2. WEST EXTERIOR WALL (X = -10.5, Z: -7.5 to +8.2, with Kitchen West Window + Study Atelier Window) ---
  buildCarvedWallSpan({
    axis: 'Z',
    fixedCoord: -10.5,
    start: -7.5,
    end: 8.2,
    zone: 'WEST',
    roomTag: 'Kitchen',
    apertures: [
      { type: 'WINDOW', center: -3.5, width: 1.8, sillY: 1.0, height: 1.4, frameColorHex: 0xffffff },
      { type: 'WINDOW', center: 4.35, width: 2.0, sillY: 0.9, height: 1.5, frameColorHex: 0xffffff },
    ],
  });

  // --- 3. EAST EXTERIOR MULTI-WING WALLS ---
  // North-East Living Room East Wall (X = +10.5, Z: -6.2 to +0.5, with Parlor Window)
  buildCarvedWallSpan({
    axis: 'Z',
    fixedCoord: 10.5,
    start: -6.2,
    end: 0.5,
    zone: 'EAST',
    roomTag: 'LivingRoom',
    apertures: [
      { type: 'WINDOW', center: -2.8, width: 1.8, sillY: 0.95, height: 1.45, frameColorHex: 0xffffff },
    ],
  });
  // Projecting East Master Wing Step-Out (X: +10.5 to +11.5 at Z = +0.5)
  buildCarvedWallSpan({
    axis: 'X',
    fixedCoord: 0.5,
    start: 10.5,
    end: 11.5,
    zone: 'EAST',
    roomTag: 'Bedroom',
  });
  // Projecting East Master Wing Outer Wall (X = +11.5, Z: +0.5 to +9.8, with Twin Master Windows)
  buildCarvedWallSpan({
    axis: 'Z',
    fixedCoord: 11.5,
    start: 0.5,
    end: 9.8,
    zone: 'EAST',
    roomTag: 'Bedroom',
    apertures: [
      { type: 'WINDOW', center: 3.2, width: 1.8, sillY: 0.95, height: 1.45, frameColorHex: 0xffffff },
      { type: 'WINDOW', center: 7.0, width: 1.8, sillY: 0.95, height: 1.45, frameColorHex: 0xffffff },
    ],
  });

  // --- 4. SOUTH EXTERIOR MULTI-WING WALLS (L-Shaped Courtyard & Projecting Master Wing) ---
  // South-West Study & Foyer Wall (Z = +8.2, X: -10.5 to +2.0, with Study Window + Main Entry Craftsman Door)
  buildCarvedWallSpan({
    axis: 'X',
    fixedCoord: 8.2,
    start: -10.5,
    end: 2.0,
    zone: 'SOUTH',
    roomTag: 'Study',
    apertures: [
      { type: 'WINDOW', center: -7.5, width: 2.2, sillY: 0.9, height: 1.5, frameColorHex: 0xffffff },
      { type: 'WINDOW', center: -2.8, width: 1.5, sillY: 0.95, height: 1.4, frameColorHex: 0xffffff },
      { type: 'DOOR', center: 0.5, width: 1.4, height: 2.4, doorColorHex: 0x582f0e, frameColorHex: 0xffffff },
    ],
  });
  // L-Wing Step-Out from Z = +8.2 to Z = +9.8 at X = +2.0
  buildCarvedWallSpan({
    axis: 'Z',
    fixedCoord: 2.0,
    start: 8.2,
    end: 9.8,
    zone: 'SOUTH',
    roomTag: 'Bedroom',
  });
  // Projecting South-East Master Suite South Wall (Z = +9.8, X: +2.0 to +11.5, with Grand Master Bay Window)
  buildCarvedWallSpan({
    axis: 'X',
    fixedCoord: 9.8,
    start: 2.0,
    end: 11.5,
    zone: 'SOUTH',
    roomTag: 'Bedroom',
    apertures: [
      { type: 'WINDOW', center: 6.75, width: 2.6, sillY: 0.85, height: 1.55, frameColorHex: 0xffffff },
    ],
  });

  // --- 5. INTERIOR PARTITION WALLS WITH CARVED WALK-THROUGH DOORS ---
  // Kitchen East Partition (X = -1.15, Z: -7.5 to -1.0, with Open Archway into Central Foyer)
  buildCarvedWallSpan({
    axis: 'Z',
    fixedCoord: -1.15,
    start: -7.5,
    end: -1.0,
    zone: 'INTERIOR',
    roomTag: 'Kitchen',
    partitionGroup: 'kitchen',
    apertures: [
      { type: 'OPEN_ARCH', center: -2.6, width: 2.0, height: 2.35 },
    ],
  });

  // Living Room West Partition (X = +2.0, Z: -6.2 to +0.5, with Wide Parlor Archway)
  buildCarvedWallSpan({
    axis: 'Z',
    fixedCoord: 2.0,
    start: -6.2,
    end: 0.5,
    zone: 'INTERIOR',
    roomTag: 'LivingRoom',
    partitionGroup: 'living',
    apertures: [
      { type: 'OPEN_ARCH', center: -2.2, width: 2.2, height: 2.4 },
    ],
  });

  // Master Bedroom West Partition (X = +2.0, Z: +0.5 to +8.2, with Carved Bedroom Door at Z = 2.8!)
  buildCarvedWallSpan({
    axis: 'Z',
    fixedCoord: 2.0,
    start: 0.5,
    end: 8.2,
    zone: 'INTERIOR',
    roomTag: 'Bedroom',
    partitionGroup: 'fixed',
    apertures: [
      { type: 'DOOR', center: 2.8, width: 1.25, height: 2.3, doorColorHex: 0x78350f, frameColorHex: 0xf8fafc },
    ],
  });

  // East Horizontal Divider between Living Room and Master Bedroom (Z = +0.5, X: +2.0 to +10.5)
  buildCarvedWallSpan({
    axis: 'X',
    fixedCoord: 0.5,
    start: 2.0,
    end: 10.5,
    zone: 'INTERIOR',
    roomTag: 'LivingRoom',
    partitionGroup: 'fixed',
  });

  // West Horizontal Divider between Kitchen and Study/Bathroom (Z = +0.5, X: -10.5 to -2.45, with Kitchen-to-Study Doorway at X = -7.5)
  buildCarvedWallSpan({
    axis: 'X',
    fixedCoord: 0.5,
    start: -10.5,
    end: -2.45,
    zone: 'INTERIOR',
    roomTag: 'Kitchen',
    partitionGroup: 'fixed',
    apertures: [
      { type: 'OPEN_ARCH', center: -7.5, width: 1.6, height: 2.35 },
    ],
  });

  // Bathroom East Wall separating Bathroom from the Open Basement Stairwell (X = -2.45, Z: +0.5 to +5.5, with Frosted Interior Transom Window)
  buildCarvedWallSpan({
    axis: 'Z',
    fixedCoord: -2.45,
    start: 0.5,
    end: 5.5,
    zone: 'INTERIOR',
    roomTag: 'Bathroom',
    partitionGroup: 'fixed',
    apertures: [
      { type: 'WINDOW', center: 3.0, width: 1.2, sillY: 1.35, height: 0.95, frameColorHex: 0xffffff },
    ],
  });

  // Bathroom South Wall (Z = +5.5, X: -4.5 to -2.45, with CARVED BATHROOM PRIVACY DOOR at X = -3.45!)
  buildCarvedWallSpan({
    axis: 'X',
    fixedCoord: 5.5,
    start: -4.5,
    end: -2.45,
    zone: 'INTERIOR',
    roomTag: 'Bathroom',
    partitionGroup: 'fixed',
    apertures: [
      { type: 'DOOR', center: -3.45, width: 1.15, height: 2.3, doorColorHex: 0xffffff, frameColorHex: 0xf1f5f9 },
    ],
  });

  // Bathroom & Study Divider Wall (X = -4.5, Z: +0.5 to +8.2, with Carved Study Doorway at Z = +6.85)
  buildCarvedWallSpan({
    axis: 'Z',
    fixedCoord: -4.5,
    start: 0.5,
    end: 8.2,
    zone: 'INTERIOR',
    roomTag: 'Study',
    partitionGroup: 'fixed',
    apertures: [
      { type: 'OPEN_ARCH', center: 6.85, width: 1.45, height: 2.35 },
    ],
  });

  // Place Corner Pillars / Quoins at all exterior & interior wing corners
  addCornerPillarQuoin(-10.5, -7.5, 'NORTH');
  addCornerPillarQuoin(2.0, -7.5, 'NORTH');
  addCornerPillarQuoin(2.0, -6.2, 'NORTH');
  addCornerPillarQuoin(10.5, -6.2, 'NORTH');
  addCornerPillarQuoin(10.5, 0.5, 'EAST');
  addCornerPillarQuoin(11.5, 0.5, 'EAST');
  addCornerPillarQuoin(11.5, 9.8, 'SOUTH');
  addCornerPillarQuoin(2.0, 9.8, 'SOUTH');
  addCornerPillarQuoin(2.0, 8.2, 'SOUTH');
  addCornerPillarQuoin(-10.5, 8.2, 'SOUTH');
  addCornerPillarQuoin(-10.5, 0.5, 'WEST');
  addCornerPillarQuoin(-4.5, 0.5, 'INTERIOR');
  addCornerPillarQuoin(-2.45, 0.5, 'INTERIOR');
  addCornerPillarQuoin(-2.45, 5.5, 'INTERIOR');
  addCornerPillarQuoin(-4.5, 5.5, 'INTERIOR');
  addCornerPillarQuoin(2.0, 0.5, 'INTERIOR');

  const applyWallCutawayLogic = (
    list: TrackedWallItem[],
    mode: WallCutawayMode,
    cameraPos: THREE.Vector3
  ) => {
    list.forEach(({ mesh, originalHeight, originalPosY, zone, isAttachment, partitionGroup }) => {
      if (
        (partitionGroup === 'kitchen' && isOpenKitchen) ||
        (partitionGroup === 'living' && isOpenLiving)
      ) {
        mesh.visible = false;
        return;
      }

      let shouldCutDown = false;
      if (mode === 'WALLS_DOWN') {
        shouldCutDown = true;
      } else if (mode === 'CUTAWAY') {
        if (zone === 'INTERIOR') shouldCutDown = true;
        else if (zone === 'SOUTH' && cameraPos.z >= -4) shouldCutDown = true;
        else if (zone === 'NORTH' && cameraPos.z < -4) shouldCutDown = true;
        else if (zone === 'EAST' && cameraPos.x >= 4) shouldCutDown = true;
        else if (zone === 'WEST' && cameraPos.x <= -4) shouldCutDown = true;
      }

      if (shouldCutDown) {
        if (isAttachment) {
          mesh.visible = false;
        } else {
          mesh.visible = true;
          const trimScale = 0.035;
          mesh.scale.y = trimScale;
          mesh.position.y = (originalHeight * trimScale) / 2;
        }
      } else {
        mesh.visible = true;
        mesh.scale.y = 1.0;
        mesh.position.y = originalPosY;
      }
    });
  };

  const updateCutaways = (mode: WallCutawayMode, cameraPos: THREE.Vector3) => {
    if (!isEmptyGridActive) {
      applyWallCutawayLogic(wallMeshes, mode, cameraPos);

      if (mode === 'WALLS_DOWN') {
        loftParts.loftFloorSlabs.forEach((slab) => {
          slab.visible = false;
        });
        loftParts.loftDormerWall.visible = false;
        loftParts.loftUpperWindow.visible = false;
        loftParts.loftRailings.forEach((r) => {
          r.visible = false;
        });
      } else if (mode === 'CUTAWAY') {
        loftParts.loftFloorSlabs.forEach((slab) => {
          slab.visible = true;
        });
        loftParts.loftTimberMat.opacity = 0.16;
        loftParts.loftTimberMat.depthWrite = false;
        loftParts.loftDormerWall.scale.y = 0.05;
        loftParts.loftDormerWall.position.y = 2.98;
        loftParts.loftUpperWindow.visible = false;
        loftParts.loftRailings.forEach((r) => {
          r.visible = true;
        });
      } else {
        loftParts.loftFloorSlabs.forEach((slab) => {
          slab.visible = true;
        });
        loftParts.loftTimberMat.opacity = 1.0;
        loftParts.loftTimberMat.depthWrite = true;
        loftParts.loftDormerWall.visible = true;
        loftParts.loftDormerWall.scale.y = 1.0;
        loftParts.loftDormerWall.position.y = 4.0;
        loftParts.loftUpperWindow.visible = true;
        loftParts.loftRailings.forEach((r) => {
          r.visible = true;
        });
      }
    }

    // Apply cutaway rules to custom user-placed / AI-built walls & roofs
    applyWallCutawayLogic(customWallMeshes, mode, cameraPos);
    customRoofMeshes.forEach((roof) => {
      roof.visible = mode === 'WALLS_UP';
    });
  };

  // Apply custom wallpapers, carpets, and open-concept layout toggles
  const applyHomeStyling = (
    roomWallpapers: Record<string, string>,
    roomCarpets: Record<string, string>,
    openConceptKitchen?: boolean,
    openConceptLiving?: boolean
  ) => {
    if (openConceptKitchen !== undefined) isOpenKitchen = openConceptKitchen;
    if (openConceptLiving !== undefined) isOpenLiving = openConceptLiving;

    Object.entries(roomWallpapers || {}).forEach(([roomName, wpId]) => {
      const style = WALLPAPER_CATALOG.find((w) => w.id === wpId);
      const mat = roomWallMaterials[roomName];
      if (style && mat) {
        mat.color.setHex(0xffffff);
        mat.map = createWallpaperTexture(style);
        mat.needsUpdate = true;
      }
    });

    Object.entries(roomCarpets || {}).forEach(([roomName, flId]) => {
      const style = CARPET_CATALOG.find((c) => c.id === flId);
      const mat = roomFloorMaterials[roomName];
      if (style && mat) {
        mat.color.setHex(0xffffff);
        mat.roughness = style.roughness;
        mat.map = createCarpetTexture(style);
        mat.needsUpdate = true;
      }
    });
  };

  // ----------------------------------------------------
  // 3A. DYNAMIC WORLD BUILDER RENDERER (Empty Grid + Custom Building Parts)
  // ----------------------------------------------------
  let currentBlueprintParts: PlacedBuildingPart[] = [];
  const applyWorldBlueprint = (blueprint: WorldBlueprint) => {
    isEmptyGridActive = Boolean(blueprint.isEmptyGridMode);
    currentBlueprintParts = blueprint.placedParts || [];
    defaultHouseFloorsGroup.visible = !isEmptyGridActive;
    wallsGroup.visible = !isEmptyGridActive;
    secondFloorGroup.visible = !isEmptyGridActive && currentHasUpstairs;
    basementGroup.visible = !isEmptyGridActive && currentHasBasement;
    earthSkirt.visible = isEmptyGridActive || !currentHasBasement;
    excavatedEarthGroup.visible = !isEmptyGridActive && currentHasBasement;

    // Clear previous custom world parts
    while (customWorldGroup.children.length > 0) {
      customWorldGroup.remove(customWorldGroup.children[0]);
    }
    customWallMeshes.length = 0;
    customRoofMeshes.length = 0;

    blueprint.placedParts.forEach((part) => {
      const group = createCustomBuildingPartMesh(
        part,
        pencilTex,
        roomWallMaterials,
        roomFloorMaterials,
        customWallMeshes,
        customRoofMeshes
      );
      group.position.set(part.gridPos.x, part.gridPos.y, part.gridPos.z);
      group.rotation.y = part.rotationY || 0;
      customWorldGroup.add(group);
    });
  };

  const updateBuildCursor = (
    worldPos: { x: number; y: number; z: number } | null,
    part: BuildingPartDefinition | null,
    rotationY: number,
    toolMode: BuildToolMode,
    isActive: boolean
  ) => {
    if (!isActive || !worldPos) {
      buildCursorGroup.visible = false;
      return;
    }
    buildCursorGroup.visible = true;
    const w = part ? Math.max(0.5, part.width) : 1.4;
    const h = part ? Math.max(0.2, part.height) : 1.2;
    const d = part ? Math.max(0.5, part.depth) : 1.4;

    cursorBoxMesh.scale.set(w, h, d);
    cursorBoxMesh.position.set(0, h / 2, 0);
    buildCursorGroup.position.set(worldPos.x, worldPos.y, worldPos.z);
    buildCursorGroup.rotation.y = rotationY;

    if (toolMode === 'SLEDGEHAMMER') {
      cursorBoxMat.color.setHex(0xef4444);
    } else if (toolMode === 'EYEDROPPER') {
      cursorBoxMat.color.setHex(0x38bdf8);
    } else {
      cursorBoxMat.color.setHex(0x22c55e);
    }
  };

  // ----------------------------------------------------
  // 3B. REAL-TIME 3D WEATHER PARTICLE SYSTEM (Rain, Snow, Storm)
  // ----------------------------------------------------
  const weatherGroup = new THREE.Group();
  scene.add(weatherGroup);

  const rainCount = 900;
  const rainPositions = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    const rx = (Math.random() - 0.5) * 44;
    const ry = Math.random() * 24;
    const rz = (Math.random() - 0.5) * 44;
    rainPositions[i * 6] = rx;
    rainPositions[i * 6 + 1] = ry;
    rainPositions[i * 6 + 2] = rz;
    rainPositions[i * 6 + 3] = rx - 0.15;
    rainPositions[i * 6 + 4] = ry - 0.85;
    rainPositions[i * 6 + 5] = rz;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.55 });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.visible = false;
  weatherGroup.add(rainLines);

  const snowCount = 700;
  const snowPositions = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    snowPositions[i * 3] = (Math.random() - 0.5) * 44;
    snowPositions[i * 3 + 1] = Math.random() * 24;
    snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 44;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.85 });
  const snowPoints = new THREE.Points(snowGeo, snowMat);
  snowPoints.visible = false;
  weatherGroup.add(snowPoints);

  const updateWeather = (condition: WeatherCondition, delta: number) => {
    const isRaining = condition === 'RAIN' || condition === 'STORM';
    const isSnowing = condition === 'SNOW';
    rainLines.visible = isRaining;
    snowPoints.visible = isSnowing;

    grassMat.roughness = isRaining ? 0.35 : 0.85;

    if (isRaining) {
      const posAttr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const fallSpeed = condition === 'STORM' ? 26 * delta : 18 * delta;
      for (let i = 0; i < rainCount; i++) {
        arr[i * 6 + 1] -= fallSpeed;
        arr[i * 6 + 4] -= fallSpeed;
        if (arr[i * 6 + 1] < 0) {
          const resetY = 22 + Math.random() * 4;
          arr[i * 6 + 1] = resetY;
          arr[i * 6 + 4] = resetY - 0.85;
        }
      }
      posAttr.needsUpdate = true;
    } else if (isSnowing) {
      const posAttr = snowGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < snowCount; i++) {
        arr[i * 3 + 1] -= 2.8 * delta;
        arr[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.02;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 22;
        }
      }
      posAttr.needsUpdate = true;
    }
  };

  // ----------------------------------------------------
  // 4. SMART OBJECTS (Composite 3-12 Part Procedural Models)
  // ----------------------------------------------------
  let renderedSmartObjectsSignature = '';
  const syncSmartObjects = (nextObjects: SmartObject[]) => {
    const sig = nextObjects
      .map((o) => `${o.id}:${o.gridPos.x},${o.gridPos.y},${o.gridPos.z}:${o.assignedColorHex || ''}`)
      .join('|');
    if (sig === renderedSmartObjectsSignature) return;
    renderedSmartObjectsSignature = sig;

    while (objectsGroup.children.length > 0) {
      objectsGroup.remove(objectsGroup.children[0]);
    }
    nextObjects.forEach((obj) => {
      if (obj.maturity === 'DARK_ONLY' && !isDarkMode) return;
      const group = createSmartObjectMesh(obj, pencilTex);
      group.position.set(obj.gridPos.x, obj.gridPos.y, obj.gridPos.z);
      objectsGroup.add(group);
    });
  };
  syncSmartObjects(smartObjects);

  // ----------------------------------------------------
  // 5. CHARACTERS & ARTICULATED SKELETAL BONE RIGS
  // ----------------------------------------------------
  const characterMeshes = new Map<string, THREE.Group>();
  const plumbobMeshes = new Map<string, THREE.Mesh>();

  const syncCharacters = (nextChars: Character[]) => {
    const nextIds = new Set(nextChars.map((c) => c.id));
    for (const [id, mesh] of characterMeshes.entries()) {
      if (!nextIds.has(id)) {
        charactersGroup.remove(mesh);
        characterMeshes.delete(id);
        plumbobMeshes.delete(id);
      }
    }
    nextChars.forEach((char) => {
      if (!characterMeshes.has(char.id)) {
        const rig = createCharacterRig(char);
        rig.position.set(char.pos.x, char.pos.y, char.pos.z);
        charactersGroup.add(rig);
        characterMeshes.set(char.id, rig);
        const plumbob = rig.getObjectByName('Plumbob') as THREE.Mesh;
        if (plumbob) {
          plumbobMeshes.set(char.id, plumbob);
        }
      }
    });
  };
  syncCharacters(characters);

  let animElapsedSec = 0;
  const pathAgentStates = new Map<string, ToonPathAgentState>();

  const updateCharacters = (
    updatedChars: Character[],
    delta: number,
    currentSmartObjects: SmartObject[] = smartObjects,
    activeSpeakerId: string | null = null
  ) => {
    animElapsedSec += delta;
    syncCharacters(updatedChars);

    // Track live 3D rig positions so characters respect each other's actual current position on the floor
    const liveResolvedChars: Character[] = updatedChars.map((c) => {
      const m = characterMeshes.get(c.id);
      return {
        ...c,
        pos: m ? { x: m.position.x, y: m.position.y, z: m.position.z } : { ...c.pos },
      };
    });

    updatedChars.forEach((char, idx) => {
      const rig = characterMeshes.get(char.id);
      if (!rig) return;

      rig.visible = char.onGrid;
      if (!char.onGrid) return;

      // 1. First resolve the character's target destination against all assets, architectural fixtures, and other toons
      const resolvedGoal = resolveFurnitureCollision(
        { x: char.pos.x, y: char.pos.y, z: char.pos.z },
        currentSmartObjects,
        char.activeObjectId,
        liveResolvedChars,
        char.id,
        currentBlueprintParts,
        !isEmptyGridActive
      );

      // 2. Step the toon along its A* waypoint path around furniture & through doorways with anti-stuck recovery
      const stepResult = advanceToonAlongPath({
        char,
        currentRigPos: {
          x: rig.position.x,
          y: rig.position.y,
          z: rig.position.z,
        },
        resolvedGoal,
        delta,
        smartObjects: currentSmartObjects,
        liveResolvedChars,
        customParts: currentBlueprintParts,
        worldBlueprint: {
          isEmptyGridMode: isEmptyGridActive,
          placedParts: currentBlueprintParts,
        },
        includeDefaultHouseWalls: !isEmptyGridActive,
        agentStateMap: pathAgentStates,
        walkSpeed: 2.35,
      });

      rig.position.set(stepResult.nextPos.x, stepResult.nextPos.y, stepResult.nextPos.z);
      liveResolvedChars[idx].pos = { ...stepResult.nextPos };
      const isMoving = stepResult.isMoving;

      // Animated Plumbob rotation and calm pulse
      const plumbob = plumbobMeshes.get(char.id);
      if (plumbob) {
        plumbob.rotation.y += delta * 0.9;
        plumbob.position.y = 2.45 + Math.sin(animElapsedSec * 1.4 + idx) * 0.05;

        const mat = plumbob.material as THREE.MeshStandardMaterial;
        if (char.motives.sanity < 30) {
          mat.color.setHex(0x7e22ce);
          mat.emissive.setHex(0x3b0764);
        } else if (char.motives.hunger < 25 || char.motives.energy < 25) {
          mat.color.setHex(0xef4444);
          mat.emissive.setHex(0x991b1b);
        } else if (char.motives.fun > 60) {
          mat.color.setHex(0x22c55e);
          mat.emissive.setHex(0x15803d);
        } else {
          mat.color.setHex(0xeab308);
          mat.emissive.setHex(0x854d0e);
        }
      }

      if (isMoving) {
        rig.lookAt(stepResult.lookTarget.x, rig.position.y, stepResult.lookTarget.z);
      } else if (char.lookAtPos) {
        rig.lookAt(char.lookAtPos.x, rig.position.y, char.lookAtPos.z);
      }

      // Compute full hierarchical skeletal pose — ONLY the single active speaker animates continuous speech jaw/brows
      const isSpeaking = activeSpeakerId === char.id;
      const pose = computeCharacterBonePose(
        char.currentAction,
        isMoving,
        animElapsedSec + idx * 0.85,
        isSpeaking
      );

      // Apply bone rotations smoothly across the articulated skeleton
      const lerpFactor = Math.min(1.0, delta * 5.5);
      const pelvisBone = rig.getObjectByName('PelvisBone');
      if (pelvisBone) {
        const basePelvisY = pelvisBone.userData.baseY ?? 0.82;
        pelvisBone.position.y = THREE.MathUtils.lerp(
          pelvisBone.position.y,
          basePelvisY + pose.pelvisYOffset,
          lerpFactor
        );
      }

      const applyJoint = (name: string, target: { x: number; y: number; z: number }) => {
        const bone = rig.getObjectByName(name);
        if (!bone) return;
        bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, target.x, lerpFactor);
        bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, target.y, lerpFactor);
        bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, target.z, lerpFactor);
      };

      applyJoint('TorsoBone', { x: pose.torsoPitch, y: pose.torsoYaw, z: pose.torsoRoll });
      applyJoint('HeadBone', { x: pose.headPitch, y: pose.headYaw, z: 0 });
      applyJoint('JawBone', { x: pose.jawOpen, y: 0, z: 0 });
      applyJoint('UpperArmLBone', pose.upperArmL);
      applyJoint('ForearmLBone', pose.forearmL);
      applyJoint('HandLBone', pose.handL);
      applyJoint('UpperArmRBone', pose.upperArmR);
      applyJoint('ForearmRBone', pose.forearmR);
      applyJoint('HandRBone', pose.handR);
      applyJoint('ThighLBone', pose.thighL);
      applyJoint('ShinLBone', pose.shinL);
      applyJoint('FootLBone', pose.footL);
      applyJoint('ThighRBone', pose.thighR);
      applyJoint('ShinRBone', pose.shinR);
      applyJoint('FootRBone', pose.footR);

      // Articulated Finger Phalange Curl & Opposable Thumb Spread
      applyJoint('FingersLBone', { x: 0, y: 0, z: pose.fingerCurlL });
      applyJoint('FingersRBone', { x: 0, y: 0, z: -pose.fingerCurlR });
      applyJoint('ThumbLBone', { x: 0.45 + pose.thumbSpreadL * 0.3, y: 0, z: -pose.thumbSpreadL });
      applyJoint('ThumbRBone', { x: 0.45 + pose.thumbSpreadR * 0.3, y: 0, z: pose.thumbSpreadR });

      // Expressive Rigged Eyebrow Bones & Eye Saccade Gaze
      const browL = rig.getObjectByName('BrowLBone');
      const browR = rig.getObjectByName('BrowRBone');
      if (browL && browR) {
        const baseY = browL.userData.baseY ?? 0.093;
        browL.position.y = THREE.MathUtils.lerp(browL.position.y, baseY + pose.browRaise, lerpFactor);
        browR.position.y = THREE.MathUtils.lerp(browR.position.y, baseY + pose.browRaise, lerpFactor);
        browL.rotation.z = THREE.MathUtils.lerp(browL.rotation.z, 0.08 + pose.browTilt, lerpFactor);
        browR.rotation.z = THREE.MathUtils.lerp(browR.rotation.z, -0.08 - pose.browTilt, lerpFactor);
      }

      const eyeL = rig.getObjectByName('EyeLGroup');
      const eyeR = rig.getObjectByName('EyeRGroup');
      if (eyeL && eyeR) {
        const baseLX = eyeL.userData.baseX ?? -0.082;
        const baseRX = eyeR.userData.baseX ?? 0.082;
        eyeL.position.x = baseLX + pose.eyeGazeYaw;
        eyeR.position.x = baseRX + pose.eyeGazeYaw;
      }

      // Blinking eyelids
      const eyelidL = rig.getObjectByName('EyelidL');
      const eyelidR = rig.getObjectByName('EyelidR');
      if (eyelidL && eyelidR) {
        eyelidL.scale.y = pose.eyelidScaleY;
        eyelidR.scale.y = pose.eyelidScaleY;
      }

      // Held task props visibility (Book/Newspaper, Espresso/Cooking Cup, Paintbrush/Tool)
      const propBook = rig.getObjectByName('PropBookNewspaper');
      const propCup = rig.getObjectByName('PropCupUtensil');
      const propBrush = rig.getObjectByName('PropBrushTool');
      if (propBook) propBook.visible = pose.activeProp === 'BOOK_NEWSPAPER';
      if (propCup) propCup.visible = pose.activeProp === 'CUP_UTENSIL';
      if (propBrush) propBrush.visible = pose.activeProp === 'BRUSH_TOOL';
    });
  };

  const toggleGrid = (visible: boolean) => {
    gridHelper.visible = visible;
  };

  return {
    scene,
    lotGroup,
    wallsGroup,
    objectsGroup,
    charactersGroup,
    customWorldGroup,
    gridHelper,
    characterMeshes,
    plumbobMeshes,
    updateCutaways,
    updateCharacters,
    updateWeather,
    applyHomeStyling,
    applyWorldBlueprint,
    syncSmartObjects,
    syncCharacters,
    updateBuildCursor,
    toggleGrid,
    poolWaterMaterial: poolWaterMat,
    setExpansionLevel: (level: number) => {
      currentHasUpstairs = level >= 2;
      currentHasBasement = level >= 3 || isDarkMode;
      if (!isEmptyGridActive) {
        secondFloorGroup.visible = currentHasUpstairs;
        basementGroup.visible = currentHasBasement;
        earthSkirt.visible = !currentHasBasement;
        excavatedEarthGroup.visible = currentHasBasement;
      }
    },
    setMultiStoryState: ({ hasUpstairs, hasBasement }) => {
      currentHasUpstairs = hasUpstairs;
      currentHasBasement = hasBasement || isDarkMode;
      if (!isEmptyGridActive) {
        secondFloorGroup.visible = currentHasUpstairs;
        basementGroup.visible = currentHasBasement;
        earthSkirt.visible = !currentHasBasement;
        excavatedEarthGroup.visible = currentHasBasement;
        // Make ground-floor west slabs subtly translucent when Basement is built so players can view the basement from above too
        ['Kitchen', 'Study', 'Bathroom'].forEach((rm) => {
          const mat = roomFloorMaterials[rm];
          if (mat) {
            mat.transparent = currentHasBasement;
            mat.opacity = currentHasBasement ? 0.78 : 1.0;
            mat.needsUpdate = true;
          }
        });
      }
    },
  };
}

/**
 * Procedural composite Smart Object meshes (3-12 parts)
 */
function createSmartObjectMesh(obj: SmartObject, pencilTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  group.name = obj.id;
  const key = `${obj.id} ${obj.name}`.toLowerCase();

  // If this SmartObject was procedurally synthesized by The Entity with a custom multi-part 3D spec, render its sub-primitives!
  if (obj.procedural3DSpec && obj.procedural3DSpec.subMeshes.length > 0) {
    for (const sm of obj.procedural3DSpec.subMeshes) {
      let geom: THREE.BufferGeometry;
      if (sm.shape === 'cylinder') {
        geom = new THREE.CylinderGeometry(sm.size[0], sm.size[2] || sm.size[0], sm.size[1], 16);
      } else if (sm.shape === 'sphere') {
        geom = new THREE.SphereGeometry(sm.size[0], 16, 14);
      } else if (sm.shape === 'cone') {
        geom = new THREE.ConeGeometry(sm.size[0], sm.size[1], 14);
      } else if (sm.shape === 'torus') {
        geom = new THREE.TorusGeometry(sm.size[0], sm.size[1], 12, 24);
      } else if (sm.shape === 'capsule') {
        geom = new THREE.CapsuleGeometry(sm.size[0], sm.size[1], 8, 14);
      } else {
        geom = new THREE.BoxGeometry(sm.size[0], sm.size[1], sm.size[2]);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(sm.colorHex || '#6e4e37'),
        roughness: sm.roughness ?? 0.55,
        metalness: sm.metalness ?? 0.12,
        emissive: sm.emissiveHex ? new THREE.Color(sm.emissiveHex) : new THREE.Color(0x000000),
        emissiveIntensity: sm.emissiveIntensity ?? 0,
        map: pencilTex,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(sm.pos[0], sm.pos[1], sm.pos[2]);
      if (sm.rot) {
        mesh.rotation.set(sm.rot[0], sm.rot[1], sm.rot[2]);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    if (obj.procedural3DSpec.pointLightColorHex) {
      const auraDisc = new THREE.Mesh(
        new THREE.CircleGeometry(Math.max(0.65, obj.procedural3DSpec.width * 0.48), 24),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(obj.procedural3DSpec.pointLightColorHex),
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        })
      );
      auraDisc.rotation.x = -Math.PI / 2;
      auraDisc.position.y = 0.02;
      group.add(auraDisc);
    }

    return group;
  }

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.55, map: pencilTex });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5, map: pencilTex });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.82, roughness: 0.22 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.14 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.24 });
  const fabricMat = new THREE.MeshStandardMaterial({ color: 0x4338ca, roughness: 0.82, map: pencilTex });

  if (key.includes('fridge') || key.includes('refrigerator')) {
    // Realistic Double-Door Stainless & Porcelain Refrigerator with Ice Dispenser
    const carcass = new THREE.Mesh(new THREE.BoxGeometry(1.18, 2.12, 0.96), whiteMat);
    carcass.position.y = 1.06;
    carcass.castShadow = true;
    group.add(carcass);

    // Upper French doors & lower freezer drawer
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.45, roughness: 0.25 });
    const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.32, 0.06), doorMat);
    leftDoor.position.set(-0.29, 1.42, 0.5);
    group.add(leftDoor);

    const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.32, 0.06), doorMat);
    rightDoor.position.set(0.29, 1.42, 0.5);
    group.add(rightDoor);

    const freezerDrawer = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.68, 0.06), doorMat);
    freezerDrawer.position.set(0, 0.38, 0.5);
    group.add(freezerDrawer);

    // Recessed ice/water dispenser on left door
    const dispenser = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.3, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })
    );
    dispenser.position.set(-0.29, 1.38, 0.53);
    group.add(dispenser);

    // Brushed chrome handles
    for (const hx of [-0.06, 0.06]) {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.58), chromeMat);
      handle.position.set(hx, 1.42, 0.56);
      group.add(handle);
    }
    const freezerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.88), chromeMat);
    freezerHandle.rotation.z = Math.PI / 2;
    freezerHandle.position.set(0, 0.62, 0.56);
    group.add(freezerHandle);
  } else if (key.includes('stove') || key.includes('range') || key.includes('oven')) {
    // Realistic Chef 4-Burner Gas Range, Oven Window, Control Knobs, Simmering Pot & Range Hood
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.92, 0.96), metalMat);
    body.position.y = 0.46;
    body.castShadow = true;
    group.add(body);

    const cooktop = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.04, 0.96),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
    );
    cooktop.position.y = 0.94;
    group.add(cooktop);

    // Backguard splash & clock display
    const backguard = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.24, 0.1), metalMat);
    backguard.position.set(0, 1.06, -0.43);
    group.add(backguard);

    // Glass Oven Window & Handle
    const ovenWindow = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.46, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.15 })
    );
    ovenWindow.position.set(0, 0.42, 0.48);
    group.add(ovenWindow);

    const ovenHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.92), chromeMat);
    ovenHandle.rotation.z = Math.PI / 2;
    ovenHandle.position.set(0, 0.72, 0.52);
    group.add(ovenHandle);

    // 5 Front Control Knobs
    for (let kx = -0.42; kx <= 0.42; kx += 0.21) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.04, 12), chromeMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(kx, 0.84, 0.49);
      group.add(knob);
    }

    // 4 Cast-Iron Burner Grates + Simmering Copper Stockpot
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    for (const bx of [-0.3, 0.3]) {
      for (const bz of [-0.2, 0.22]) {
        const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 16), grateMat);
        burner.position.set(bx, 0.97, bz);
        group.add(burner);
      }
    }
    const copperPot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.18, 16), brassMat);
    copperPot.position.set(-0.3, 1.07, 0.22);
    group.add(copperPot);
    const potLid = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.02, 16), chromeMat);
    potLid.position.set(-0.3, 1.17, 0.22);
    group.add(potLid);
  } else if (key.includes('sink') && !key.includes('vanity')) {
    // Realistic Farmhouse Stainless Kitchen Sink, Oak Cabinet, Stone Countertop, Gooseneck Faucet & Dish Rack
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.86, 0.86), woodMat);
    cabinet.position.y = 0.43;
    cabinet.castShadow = true;
    group.add(cabinet);

    const stoneTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.06, 0.92),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25 })
    );
    stoneTop.position.y = 0.89;
    group.add(stoneTop);

    // Double Stainless Basin + Apron Front
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.22, 0.06), chromeMat);
    apron.position.set(0, 0.78, 0.44);
    group.add(apron);

    for (const sx of [-0.22, 0.22]) {
      const basin = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.04, 0.56),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 })
      );
      basin.position.set(sx, 0.915, 0.02);
      group.add(basin);
    }

    // High-arch Chrome Gooseneck Faucet & Handles
    const faucetStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.28, 12), chromeMat);
    faucetStem.position.set(0, 1.05, -0.28);
    group.add(faucetStem);

    const faucetArch = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 16, Math.PI), chromeMat);
    faucetArch.rotation.y = Math.PI / 2;
    faucetArch.position.set(0, 1.18, -0.18);
    group.add(faucetArch);

    // Dish drying rack with plates on side counter
    for (let p = 0; p < 3; p++) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 14), whiteMat);
      plate.rotation.z = Math.PI / 2.3;
      plate.position.set(0.48 + p * 0.05, 1.02, 0.05);
      group.add(plate);
    }
  } else if (key.includes('bed') || key.includes('daybed')) {
    // Realistic Multi-Part Bed (Solid Wood Frame, Tall Headboard, Quilted White Mattress, 2 Pillows, Custom Duvet, Nightstand + Lamp)
    const bedColorHex = obj.assignedColorHex || '#4338ca';
    const duvetMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(bedColorHex),
      roughness: 0.78,
      map: pencilTex,
    });
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });

    // 1. Timber Bed Frame & 4 Corner Posts
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.28, 2.16), woodMat);
    frame.position.y = 0.22;
    frame.castShadow = true;
    group.add(frame);

    for (const px of [-0.84, 0.84]) {
      for (const pz of [-1.04, 1.04]) {
        const postH = pz < 0 ? 1.28 : 0.62;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, postH, 12), darkWoodMat);
        post.position.set(px, postH / 2, pz);
        post.castShadow = true;
        group.add(post);
      }
    }

    // 2. Sculpted Panel Headboard & Footboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.88, 0.12), woodMat);
    headboard.position.set(0, 0.78, -1.02);
    headboard.castShadow = true;
    group.add(headboard);

    const footboard = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.36, 0.1), woodMat);
    footboard.position.set(0, 0.38, 1.03);
    group.add(footboard);

    // 3. Plush White Mattress
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.26, 1.98), sheetMat);
    mattress.position.set(0, 0.48, 0);
    mattress.castShadow = true;
    group.add(mattress);

    // 4. Tailored Duvet Comforter Blanket (in the assigned toon's signature color)
    const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.24, 1.38), duvetMat);
    duvet.position.set(0, 0.51, 0.28);
    duvet.castShadow = true;
    group.add(duvet);

    // Folded white top sheet cuff
    const sheetFold = new THREE.Mesh(new THREE.BoxGeometry(1.67, 0.06, 0.22), sheetMat);
    sheetFold.position.set(0, 0.61, -0.32);
    group.add(sheetFold);

    // 5. Two Plump Sleeping Pillows
    for (const px of [-0.42, 0.42]) {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.38), sheetMat);
      pillow.position.set(px, 0.66, -0.68);
      pillow.rotation.x = 0.18;
      group.add(pillow);
    }

    // 6. Bedside Nightstand & Warm Reading Lamp
    const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.46), woodMat);
    nightstand.position.set(1.18, 0.28, -0.78);
    nightstand.castShadow = true;
    group.add(nightstand);

    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.18, 12), brassMat);
    lampBase.position.set(1.18, 0.65, -0.78);
    group.add(lampBase);

    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.22, 14, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 0.35, side: THREE.DoubleSide })
    );
    lampShade.position.set(1.18, 0.82, -0.78);
    group.add(lampShade);
  } else if (key.includes('bathtub') || key.includes('shower') || key.includes('tub')) {
    // Realistic Porcelain Clawfoot Bathtub with Brass Clawfeet, Warm Aqua Bathwater & Chrome Shower Mixer
    const outerTub = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.64, 0.88), whiteMat);
    outerTub.position.y = 0.42;
    outerTub.castShadow = true;
    group.add(outerTub);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.08, 0.96), whiteMat);
    rim.position.y = 0.74;
    group.add(rim);

    const waterBasin = new THREE.Mesh(
      new THREE.BoxGeometry(1.56, 0.05, 0.68),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.82 })
    );
    waterBasin.position.y = 0.75;
    group.add(waterBasin);

    // 4 Ornate Brass Clawfeet
    for (const fx of [-0.74, 0.74]) {
      for (const fz of [-0.36, 0.36]) {
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), brassMat);
        foot.position.set(fx, 0.08, fz);
        group.add(foot);
      }
    }

    // Chrome Standpipe, Shower Riser & Rainfall Head
    const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.35, 12), chromeMat);
    riser.position.set(-0.82, 1.38, 0);
    group.add(riser);

    const showerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 10), chromeMat);
    showerArm.rotation.z = Math.PI / 2;
    showerArm.position.set(-0.62, 2.02, 0);
    group.add(showerArm);

    const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.06, 0.06, 16), chromeMat);
    showerHead.position.set(-0.42, 1.98, 0);
    group.add(showerHead);
  } else if (key.includes('toilet') || key.includes('restroom')) {
    // Realistic 2-Piece Porcelain Flush Toilet with Pedestal, Oval Bowl, Seat, Cistern Tank & Chrome Lever
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.38, 16), whiteMat);
    pedestal.position.set(0, 0.19, 0.08);
    pedestal.castShadow = true;
    group.add(pedestal);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.18, 18), whiteMat);
    bowl.scale.set(1.0, 1.0, 1.28);
    bowl.position.set(0, 0.42, 0.12);
    bowl.castShadow = true;
    group.add(bowl);

    const waterSeal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.18, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.1 })
    );
    waterSeal.scale.set(1.0, 1.0, 1.2);
    waterSeal.position.set(0, 0.515, 0.14);
    group.add(waterSeal);

    // Raised Seat Cover Lid
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.035, 18), whiteMat);
    lid.scale.set(1.0, 1.0, 1.25);
    lid.rotation.x = Math.PI / 2.15;
    lid.position.set(0, 0.76, -0.12);
    group.add(lid);

    // Rear Cistern Tank & Lid
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.46, 0.24), whiteMat);
    tank.position.set(0, 0.72, -0.24);
    tank.castShadow = true;
    group.add(tank);

    const tankLid = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.27), whiteMat);
    tankLid.position.set(0, 0.97, -0.24);
    group.add(tankLid);

    // Chrome Flush Handle
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), chromeMat);
    lever.rotation.z = Math.PI / 2;
    lever.position.set(-0.22, 0.88, -0.11);
    group.add(lever);
  } else if (key.includes('sofa') || key.includes('couch') || key.includes('sectional')) {
    // Realistic 3-Cushion Tufted Velvet Sofa with Rolled Armrests, Wooden Legs & Throw Pillows
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x3730a3, roughness: 0.75, map: pencilTex });
    const pillowAccentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 });

    // 4 Tapered Timber Legs
    for (const lx of [-1.22, 1.22]) {
      for (const lz of [-0.42, 0.42]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.025, 0.18, 10), darkWoodMat);
        leg.position.set(lx, 0.09, lz);
        group.add(leg);
      }
    }

    // Upholstered Base Deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.22, 1.02), sofaMat);
    deck.position.y = 0.26;
    deck.castShadow = true;
    group.add(deck);

    // 3 Individual Plush Seat Cushions
    for (const cx of [-0.78, 0, 0.78]) {
      const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.86), sofaMat);
      seatCushion.position.set(cx, 0.44, 0.06);
      seatCushion.castShadow = true;
      group.add(seatCushion);

      const backCushion = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.52, 0.22), sofaMat);
      backCushion.position.set(cx, 0.72, -0.36);
      backCushion.rotation.x = -0.1;
      backCushion.castShadow = true;
      group.add(backCushion);
    }

    // Left & Right Rolled Armrests
    for (const ax of [-1.24, 1.24]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.46, 1.02), sofaMat);
      arm.position.set(ax, 0.52, 0);
      arm.castShadow = true;
      group.add(arm);
    }

    // 2 Accent Throw Pillows
    for (const px of [-0.95, 0.95]) {
      const throwPillow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.12), pillowAccentMat);
      throwPillow.position.set(px, 0.62, -0.12);
      throwPillow.rotation.z = px < 0 ? 0.25 : -0.25;
      group.add(throwPillow);
    }
  } else if (key.includes('easel') || key.includes('canvas')) {
    // Realistic A-Frame Timber Studio Easel with Stretched Landscape Canvas & Artist Palette
    for (const lx of [-0.36, 0.36]) {
      const frontLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.85, 0.06), woodMat);
      frontLeg.position.set(lx, 0.9, 0.15);
      frontLeg.rotation.z = lx < 0 ? -0.12 : 0.12;
      frontLeg.rotation.x = -0.12;
      frontLeg.castShadow = true;
      group.add(frontLeg);
    }
    const backSupport = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.85, 0.06), woodMat);
    backSupport.position.set(0, 0.88, -0.32);
    backSupport.rotation.x = 0.28;
    group.add(backSupport);

    // Canvas Ledge Shelf
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.14), darkWoodMat);
    shelf.position.set(0, 0.86, 0.22);
    group.add(shelf);

    // Stretched Linen Canvas with Painted Landscape Artwork
    const canvasBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.72, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.8 })
    );
    canvasBoard.position.set(0, 1.25, 0.18);
    canvasBoard.rotation.x = -0.12;
    canvasBoard.castShadow = true;
    group.add(canvasBoard);

    const skyArt = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.36, 0.015),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.6 })
    );
    skyArt.position.set(0, 1.35, 0.205);
    skyArt.rotation.x = -0.12;
    group.add(skyArt);

    const hillsArt = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.26, 0.018),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 })
    );
    hillsArt.position.set(0, 1.08, 0.22);
    hillsArt.rotation.x = -0.12;
    group.add(hillsArt);

    const sunArt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.02, 14),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    );
    sunArt.rotation.x = Math.PI / 2 - 0.12;
    sunArt.position.set(0.18, 1.4, 0.21);
    group.add(sunArt);
  } else if (key.includes('pool')) {
    // Poolside Chrome Ladder & Teak Sun Lounger (Replaces wooden fallback box in the pool)
    for (const rx of [-0.28, 0.28]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 12), chromeMat);
      rail.position.set(rx, 0.45, 2.2);
      group.add(rail);
    }
    for (let sy = 0.18; sy <= 0.68; sy += 0.25) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.03, 0.12), chromeMat);
      rung.position.set(0, sy, 2.2);
      group.add(rung);
    }
    // Poolside Teak Sun Lounger with Striped Cushion
    const loungerBase = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.24, 1.85), woodMat);
    loungerBase.position.set(3.2, 0.14, 2.5);
    group.add(loungerBase);
    const loungerPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.08, 1.78),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 })
    );
    loungerPad.position.set(3.2, 0.29, 2.5);
    group.add(loungerPad);
  } else if (key.includes('tv') || key.includes('television') || key.includes('cinema')) {
    // 1. Credenza stand
    const stand = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.8), woodMat);
    stand.position.y = 0.3;
    group.add(stand);
    // 2. TV Screen Box
    const screenBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.2), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 }));
    screenBox.position.set(0, 1.15, 0);
    group.add(screenBox);
    // 3. Screen Bezel & Glass
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    glass.position.set(0, 1.15, 0.11);
    group.add(glass);
  } else if (obj.id.includes('island')) {
    // Kitchen Island with Granite Countertop and Barstools
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.2), woodMat);
    base.position.y = 0.45;
    group.add(base);

    const graniteMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.1 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.4), graniteMat);
    top.position.y = 0.94;
    group.add(top);

    // 2 Barstools
    for (let bx of [-0.6, 0.6]) {
      const stoolLegs = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.65), metalMat);
      stoolLegs.position.set(bx, 0.32, 0.85);
      group.add(stoolLegs);

      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08), fabricMat);
      cushion.position.set(bx, 0.68, 0.85);
      group.add(cushion);
    }
  } else if (obj.id.includes('espresso')) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), metalMat);
    base.position.y = 0.25;
    group.add(base);

    const portafilter = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2), metalMat);
    portafilter.rotation.z = Math.PI / 2;
    portafilter.position.set(0.15, 0.35, 0.25);
    group.add(portafilter);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.1), whiteMat);
    cup.position.set(0, 0.3, 0.2);
    group.add(cup);
  } else if (obj.id.includes('fireplace')) {
    // Stone Fireplace with Glowing Hearth
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, map: pencilTex });
    const surround = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.6), stoneMat);
    surround.position.y = 1.2;
    group.add(surround);

    const mantel = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.8), woodMat);
    mantel.position.set(0, 2.4, 0.1);
    group.add(mantel);

    // Dark firebox cavity
    const firebox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 }));
    firebox.position.set(0, 0.65, 0.15);
    group.add(firebox);

    // Glowing ember coals
    const coals = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25), new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      roughness: 0.4,
    }));
    coals.position.set(0, 0.25, 0.15);
    group.add(coals);
  } else if (obj.id.includes('turntable')) {
    // Hi-Fi Vinyl Console with Speakers
    const consoleTable = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.6), woodMat);
    consoleTable.position.y = 0.35;
    group.add(consoleTable);

    // Turntable player & LP
    const player = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.5), metalMat);
    player.position.set(-0.35, 0.74, 0);
    group.add(player);

    const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02), new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2 }));
    vinyl.position.set(-0.35, 0.79, 0);
    group.add(vinyl);

    // Speaker grilles
    const speakerL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.04), fabricMat);
    speakerL.position.set(0.45, 0.4, 0.3);
    group.add(speakerL);
  } else if (obj.id.includes('guitar')) {
    // Acoustic Guitar on floor stand
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2), metalMat);
    stand.position.set(0, 0.6, 0);
    group.add(stand);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 }));
    body.position.set(0, 0.55, 0.1);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.04), woodMat);
    neck.position.set(0, 0.95, 0.1);
    group.add(neck);
  } else if (obj.id.includes('workbench')) {
    // Craftsman Workbench with Tools and Vise
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.9), woodMat);
    benchTop.position.y = 0.85;
    group.add(benchTop);

    // 4 Heavy Legs
    for (let lx of [-0.9, 0.9]) {
      for (let lz of [-0.35, 0.35]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), woodMat);
        leg.position.set(lx, 0.42, lz);
        group.add(leg);
      }
    }

    // Pegboard back with hanging tools
    const pegboard = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 0.05), new THREE.MeshStandardMaterial({ color: 0xd4d4d8 }));
    pegboard.position.set(0, 1.35, -0.42);
    group.add(pegboard);

    // Vise clamp on edge
    const vise = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.25), metalMat);
    vise.position.set(-0.85, 0.98, 0.35);
    group.add(vise);
  } else if (obj.id.includes('telescope')) {
    // Brass Observation Telescope on Tripod
    const tripodCenter = new THREE.Mesh(new THREE.SphereGeometry(0.1), metalMat);
    tripodCenter.position.y = 1.3;
    group.add(tripodCenter);

    for (let a = 0; a < 3; a++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4), woodMat);
      const angle = (a * Math.PI * 2) / 3;
      leg.position.set(Math.cos(angle) * 0.35, 0.65, Math.sin(angle) * 0.35);
      leg.rotation.z = Math.cos(angle) * 0.25;
      leg.rotation.x = Math.sin(angle) * 0.25;
      group.add(leg);
    }

    const brassScopeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.6), brassScopeMat);
    tube.position.set(0, 1.55, 0);
    tube.rotation.x = -Math.PI / 4;
    group.add(tube);
  } else if (obj.id.includes('bookshelf')) {
    // Rich Oak Bookshelf with Multi-colored book spines
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.5), woodMat);
    frame.position.y = 1.2;
    group.add(frame);

    // 3 shelves of books
    const bookColors = [0x991b1b, 0x1e3a8a, 0x166534, 0xb45309, 0x581c87];
    for (let s = 0; s < 3; s++) {
      const shelfY = 0.5 + s * 0.7;
      for (let b = 0; b < 6; b++) {
        const bookMat = new THREE.MeshStandardMaterial({ color: bookColors[b % bookColors.length] });
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.32), bookMat);
        book.position.set(-0.55 + b * 0.2, shelfY + 0.2, 0.05);
        group.add(book);
      }
    }
  } else if (obj.id.includes('chess')) {
    // Chess table and chairs
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.15, 0.75), woodMat);
    table.position.y = 0.38;
    group.add(table);

    const boardMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.65), boardMat);
    board.position.y = 0.77;
    group.add(board);

    for (let cz of [-0.65, 0.65]) {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.75, 0.4), woodMat);
      chair.position.set(0, 0.38, cz);
      group.add(chair);
    }
  } else if (key.includes('dining') || key.includes('supper') || key.includes('banquet')) {
    // Walnut Farmhouse Supper Table with 4 Chairs, Linen Runner, 4 Dinner Plates & Centerpiece
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.4), woodMat);
    tableTop.position.y = 0.78;
    tableTop.castShadow = true;
    group.add(tableTop);

    // Woven Linen Table Runner
    const runner = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.015, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 })
    );
    runner.position.y = 0.825;
    group.add(runner);

    // 4 Porcelain Dinner Plates
    for (const [px, pz] of [
      [-0.6, 0.45],
      [0.6, 0.45],
      [-0.6, -0.45],
      [0.6, -0.45],
    ]) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.018, 16), whiteMat);
      plate.position.set(px, 0.83, pz);
      group.add(plate);
    }

    // 4 Turned Legs
    for (const lx of [-1.05, 1.05]) {
      for (const lz of [-0.55, 0.55]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.78), woodMat);
        leg.position.set(lx, 0.39, lz);
        leg.castShadow = true;
        group.add(leg);
      }
    }

    // 4 Dining Chairs
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const chairPositions = [
      { x: -0.6, z: 0.85, rot: 0 },
      { x: 0.6, z: 0.85, rot: 0 },
      { x: -0.6, z: -0.85, rot: Math.PI },
      { x: 0.6, z: -0.85, rot: Math.PI },
    ];
    chairPositions.forEach((cp) => {
      const chairGroup = new THREE.Group();
      chairGroup.position.set(cp.x, 0, cp.z);
      chairGroup.rotation.y = cp.rot;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.44), chairMat);
      seat.position.y = 0.45;
      chairGroup.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.04), woodMat);
      back.position.set(0, 0.68, 0.2);
      chairGroup.add(back);

      for (const cx of [-0.18, 0.18]) {
        for (const cz of [-0.18, 0.18]) {
          const cl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45), woodMat);
          cl.position.set(cx, 0.225, cz);
          chairGroup.add(cl);
        }
      }
      group.add(chairGroup);
    });

    // Centerpiece Bowl & Fruit
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.1, 0.08), whiteMat);
    bowl.position.set(0, 0.86, 0);
    group.add(bowl);
    const fruit = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    );
    fruit.position.set(0, 0.92, 0);
    group.add(fruit);
  } else if (obj.id.includes('espresso')) {
    // Professional Italian Chrome Espresso Machine
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.5), metalMat);
    base.position.y = 0.28;
    group.add(base);

    // Chrome Top rail
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.46), metalMat);
    topRail.position.set(0, 0.57, 0);
    group.add(topRail);

    // Portafilter & Handle
    const filterHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1), metalMat);
    filterHead.position.set(-0.12, 0.28, 0.22);
    group.add(filterHead);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22), woodMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(-0.12, 0.28, 0.35);
    group.add(handle);

    // White Demitasse Cup
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.06), whiteMat);
    cup.position.set(-0.12, 0.12, 0.22);
    group.add(cup);

    // Steam wand
    const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18), metalMat);
    wand.rotation.z = -0.3;
    wand.position.set(0.18, 0.26, 0.2);
    group.add(wand);
  } else if (obj.id.includes('coffee_table')) {
    // Brass & Glass Coffee Table with Magazines
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.9), metalMat);
    frame.position.y = 0.38;
    group.add(frame);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.65,
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.02, 0.82), glassMat);
    glass.position.y = 0.41;
    group.add(glass);

    for (const lx of [-0.75, 0.75]) {
      for (const lz of [-0.4, 0.4]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4), metalMat);
        leg.position.set(lx, 0.2, lz);
        group.add(leg);
      }
    }

    // Magazine stacks on table
    const mag1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.02, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xef4444 })
    );
    mag1.position.set(-0.3, 0.43, 0);
    group.add(mag1);

    const mag2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.02, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6 })
    );
    mag2.position.set(-0.28, 0.45, 0.02);
    mag2.rotation.y = 0.15;
    group.add(mag2);
  } else if (obj.id.includes('armchairs')) {
    // Pair of Tufted Velvet Armchairs flanking a small table
    const velvetMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.7 });

    for (const side of [-1.1, 1.1]) {
      const chair = new THREE.Group();
      chair.position.set(side, 0, 0);
      chair.rotation.y = side < 0 ? 0.35 : -0.35;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.85), velvetMat);
      seat.position.y = 0.35;
      chair.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 0.2), velvetMat);
      back.position.set(0, 0.7, -0.35);
      chair.add(back);

      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.85), velvetMat);
      armL.position.set(-0.45, 0.5, 0);
      chair.add(armL);

      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.85), velvetMat);
      armR.position.set(0.45, 0.5, 0);
      chair.add(armR);

      group.add(chair);
    }
  } else if (obj.id.includes('grandfather_clock')) {
    // Antique Grandfather Clock with swinging pendulum
    const clockMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.85, roughness: 0.25 });

    // Base pedestal
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.45), clockMat);
    base.position.y = 0.25;
    group.add(base);

    // Mid trunk with glass window
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.25, 0.38), clockMat);
    trunk.position.y = 1.12;
    group.add(trunk);

    const glassPane = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.95, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.5, metalness: 0.9 })
    );
    glassPane.position.set(0, 1.12, 0.19);
    group.add(glassPane);

    // Brass pendulum inside
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7), brassMat);
    rod.position.set(0, 1.15, 0.08);
    group.add(rod);

    const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), brassMat);
    bob.rotation.x = Math.PI / 2;
    bob.position.set(0, 0.82, 0.08);
    group.add(bob);

    // Top hood & clock face
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.65, 0.48), clockMat);
    hood.position.y = 2.05;
    group.add(hood);

    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16), whiteMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0, 2.05, 0.24);
    group.add(dial);
  } else if (obj.id.includes('arcade')) {
    // 80s Retro Arcade Machine with glowing CRT screen
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const neonCyan = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });

    // Lower cabinet
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.8), cabinetMat);
    lower.position.y = 0.42;
    group.add(lower);

    // Control panel angled
    const controlPanel = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.35), cabinetMat);
    controlPanel.position.set(0, 0.9, 0.28);
    controlPanel.rotation.x = 0.2;
    group.add(controlPanel);

    // Two joysticks (Red and Blue)
    for (const jx of [-0.18, 0.18]) {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12), metalMat);
      stick.position.set(jx, 1.0, 0.28);
      group.add(stick);

      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 8, 8),
        new THREE.MeshStandardMaterial({ color: jx < 0 ? 0xef4444 : 0x3b82f6 })
      );
      ball.position.set(jx, 1.06, 0.28);
      group.add(ball);
    }

    // Angled CRT Screen
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.02), screenMat);
    screen.position.set(0, 1.35, 0.05);
    screen.rotation.x = -0.3;
    group.add(screen);

    // Lit Marquee Header
    const marquee = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.24, 0.4), neonCyan);
    marquee.position.set(0, 1.85, 0.15);
    group.add(marquee);
  } else if (obj.id.includes('plant_monstera')) {
    // Potted Tropical Monstera Deliciosa Plant
    const potMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });

    // Terracotta pot
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.65, 12), potMat);
    pot.position.y = 0.325;
    group.add(pot);

    // Dark potting soil
    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 })
    );
    soil.position.y = 0.64;
    group.add(soil);

    // 5 Broad Monstera Leaves
    const angles = [0, 1.25, 2.5, 3.75, 5.0];
    angles.forEach((ang, idx) => {
      const stem = new THREE.Group();
      stem.position.set(0, 0.65, 0);
      stem.rotation.y = ang;

      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.5), leafMat);
      leaf.position.set(0, 0.35 + idx * 0.06, 0.3);
      leaf.rotation.x = 0.6;
      stem.add(leaf);
      group.add(stem);
    });
  } else if (obj.id.includes('laptop_desk')) {
    // Solid Oak Desk & Laptop
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.9), woodMat);
    top.position.y = 0.78;
    group.add(top);

    // Drawer pedestals
    for (const px of [-0.7, 0.7]) {
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.74, 0.85), woodMat);
      pedestal.position.set(px, 0.37, 0);
      group.add(pedestal);
    }

    // Open Laptop
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const lapBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.28), baseMat);
    lapBase.position.set(0, 0.83, 0.05);
    group.add(lapBase);

    const lapScreen = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.02), baseMat);
    lapScreen.position.set(0, 0.96, -0.08);
    lapScreen.rotation.x = -0.2;
    group.add(lapScreen);

    const screenLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.24, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    screenLight.position.set(0, 0.96, -0.07);
    screenLight.rotation.x = -0.2;
    group.add(screenLight);
  } else if (obj.id.includes('bbq')) {
    // Stainless Outdoor BBQ Grill
    const grillCart = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.78, 0.75), metalMat);
    grillCart.position.y = 0.45;
    group.add(grillCart);

    const hood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 1.1, 14, 1, false, 0, Math.PI),
      metalMat
    );
    hood.rotation.z = Math.PI / 2;
    hood.position.set(0, 0.98, 0);
    group.add(hood);

    // Handle
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9), whiteMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.95, 0.38);
    group.add(bar);
  } else if (obj.id.includes('vanity')) {
    // Bathroom Sink Vanity & Mirror
    const vanityBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 0.7), whiteMat);
    vanityBase.position.y = 0.42;
    group.add(vanityBase);

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.15), whiteMat);
    basin.position.set(0, 0.88, 0);
    group.add(basin);

    const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2), metalMat);
    faucet.position.set(0, 1.0, -0.22);
    group.add(faucet);

    // Beveled Wall Mirror
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.2, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        roughness: 0.05,
        metalness: 0.9,
      })
    );
    mirror.position.set(0, 1.7, -0.32);
    group.add(mirror);
  } else if (obj.id.includes('loft_desk')) {
    // 2nd Floor Study Desk & Laptop
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.8), woodMat);
    deskTop.position.y = 0.8;
    group.add(deskTop);

    const laptop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.3), metalMat);
    laptop.position.set(0, 0.85, 0);
    group.add(laptop);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.02), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    screen.position.set(0, 0.98, -0.14);
    group.add(screen);
  } else if (obj.id.includes('loft_daybed')) {
    // 2nd Floor Daybed
    const daybedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 1.2), woodMat);
    daybedFrame.position.y = 0.25;
    group.add(daybedFrame);

    const daybedCushion = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 1.0), fabricMat);
    daybedCushion.position.y = 0.5;
    group.add(daybedCushion);
  } else if (obj.id.includes('newspaper')) {
    // The Suburban Chronicle Newspaper on a Mid-Century Side Table Pedestal
    const standTop = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 16), woodMat);
    standTop.position.y = 0.68;
    group.add(standTop);

    const standPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.65, 10), woodMat);
    standPost.position.y = 0.34;
    group.add(standPost);

    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.05, 14), woodMat);
    standBase.position.y = 0.025;
    group.add(standBase);

    // Folded Broadsheet Newspaper Stack
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.9 });
    const inkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

    const paperBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.34), paperMat);
    paperBase.position.set(0, 0.73, 0);
    paperBase.rotation.y = 0.22;
    group.add(paperBase);

    // Masthead banner & printed column lines
    const masthead = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.008, 0.05), inkMat);
    masthead.position.set(0, 0.753, -0.1);
    masthead.rotation.y = 0.22;
    group.add(masthead);

    for (const colX of [-0.11, 0.0, 0.11]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.006, 0.18), inkMat);
      col.position.set(colX, 0.753, 0.04);
      col.rotation.y = 0.22;
      group.add(col);
    }
  } else if (obj.id.includes('billiards')) {
    // Subterranean Rec-Room Billiard Pool Table (Composite 8-part model)
    const feltMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 1.35), woodMat);
    tableTop.position.y = 0.78;
    group.add(tableTop);

    const felt = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.04, 1.14), feltMat);
    felt.position.y = 0.86;
    group.add(felt);

    for (const lx of [-0.95, 0.95]) {
      for (const lz of [-0.5, 0.5]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.76, 10), woodMat);
        leg.position.set(lx, 0.38, lz);
        group.add(leg);
      }
    }

    const ballColors = [0xfacc15, 0xef4444, 0x2563eb, 0xffffff];
    ballColors.forEach((c, idx) => {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.2 })
      );
      ball.position.set(-0.35 + idx * 0.22, 0.91, (idx % 2 === 0 ? 1 : -1) * 0.14);
      group.add(ball);
    });
  } else if (obj.id.includes('jukebox')) {
    // Retro Neon Wurlitzer Basement Jukebox
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, 0.6), woodMat);
    cabinet.position.y = 0.675;
    group.add(cabinet);

    const archTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.475, 0.475, 0.6, 16, 1, false, 0, Math.PI),
      woodMat
    );
    archTop.rotation.x = Math.PI / 2;
    archTop.position.set(0, 1.35, 0);
    group.add(archTop);

    const neonMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      roughness: 0.2,
    });
    const neonArch = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 16, Math.PI), neonMat);
    neonArch.position.set(0, 1.35, 0.31);
    group.add(neonArch);

    const grille = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.65, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, roughness: 0.3 })
    );
    grille.position.set(0, 0.65, 0.3);
    group.add(grille);
  } else {
    // Default furniture box
    const def = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), woodMat);
    def.position.y = 0.45;
    group.add(def);
  }

  return group;
}

/**
 * Creates a detailed, articulated hierarchical skeletal bone rig for a Toon character:
 * - Hierarchical Bones: PelvisBone -> TorsoBone -> HeadBone (with JawBone, EyelidL/R)
 * - Articulated Upper/Lower Arms & Sculpted Hands (UpperArm -> Forearm -> Hand with Palm, Thumb & 4 Fingers)
 * - Articulated Upper/Lower Legs & Detailed Shoes (Thigh -> Shin -> Foot with Sole, Upper, Toe Cap & Laces)
 * - Multi-layered tailored clothing (Collars, Lapels, Cardigans/Jackets, Plackets, Belts & Buckles, Cuffs)
 * - Detailed facial anatomy (Nose bridge, Ears, Sclera/Iris/Pupil Eyes, Eyebrows, Articulated Jaw/Lips)
 * - Multi-part sculpted Hairstyles & 3D Facial Hair (Beards, Mustaches, Goatees, Stubble)
 * - Held Task Props (Book/Newspaper, Espresso Cup, Paintbrush)
 */
function createCharacterRig(char: Character): THREE.Group {
  const rig = new THREE.Group();
  rig.name = char.id;

  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'BodyGroup';
  rig.add(bodyGroup);

  // Bone Scaling Proportions
  const scale = char.boneScale || { height: 1.0, shoulderWidth: 1.0, chestDepth: 1.0 };
  const hScale = Math.max(0.85, Math.min(1.3, scale.height));
  const wScale = Math.max(0.8, Math.min(1.35, scale.shoulderWidth));
  const dScale = Math.max(0.8, Math.min(1.35, scale.chestDepth));

  // Realistic skin tone palette
  const skinMap: Record<string, number> = {
    Fair: 0xfbe5d8,
    Olive: 0xeac096,
    Tan: 0xcf9463,
    'Rich Umber': 0x8d5534,
    'Deep Espresso': 0x4e2d1b,
  };
  const skinColor = skinMap[char.skinTone || 'Fair'] || 0xfbe5d8;

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.65,
    metalness: 0.02,
  });

  // Primary & Layered Clothing Materials
  const primaryClothesColor = new THREE.Color(char.color || '#4f46e5');
  const jacketMat = new THREE.MeshStandardMaterial({
    color: primaryClothesColor,
    roughness: 0.78,
  });

  // Contrasting inner shirt / blouse material
  const innerShirtMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.7,
  });

  // Trim / Collar / Cuff accent material
  const accentColor = primaryClothesColor.clone().multiplyScalar(0.72);
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.8,
  });

  // Pants / Skirt material based on clothingBottom
  const bottomType = (char.clothingBottom || 'Denim Jeans').toLowerCase();
  const pantsColor = bottomType.includes('trouser')
    ? 0x334155
    : bottomType.includes('short')
    ? 0xb45309
    : bottomType.includes('skirt')
    ? 0x312e81
    : 0x1e3a8a;
  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsColor,
    roughness: 0.85,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x3f2314,
    roughness: 0.45,
    metalness: 0.1,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.8,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.85,
    roughness: 0.2,
  });

  const hairColorMap: Record<string, number> = {
    'Cropped Bob': 0x3f2e21,
    'Shoulder Wavy': 0xb45309,
    'Messy Bun': 0x1c1917,
    'Disheveled Bedhead': 0x78350f,
    'Neat Side Part': 0x1e293b,
    'Faux Hawk': 0xd97706,
    'Long Braids': 0x09090b,
    'Afro Taper': 0x18181b,
    'Curly Shag': 0x573014,
  };
  const hairColor = hairColorMap[char.hairStyle] || 0x573014;
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.82,
  });

  // Key vertical dimensions
  const thighLen = 0.4 * hScale;
  const shinLen = 0.38 * hScale;
  const footHeight = 0.08;
  const pelvisY = thighLen + shinLen + footHeight; // ~0.86m at hScale=1
  const torsoHeight = 0.68 * hScale;

  // ====================================================
  // 1. ROOT PELVIS BONE (Hips, Belt & Buckle)
  // ====================================================
  const pelvisBone = new THREE.Group();
  pelvisBone.name = 'PelvisBone';
  pelvisBone.position.set(0, pelvisY, 0);
  pelvisBone.userData.baseY = pelvisY;
  bodyGroup.add(pelvisBone);

  // Tailored Pelvis / Hip block
  const pelvisMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.56 * wScale, 0.18, 0.34 * dScale),
    pantsMat
  );
  pelvisMesh.position.set(0, -0.02, 0);
  pelvisMesh.castShadow = true;
  pelvisBone.add(pelvisMesh);

  // Leather Waist Belt & Metallic Buckle
  const beltMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.59 * wScale, 0.065, 0.36 * dScale),
    leatherMat
  );
  beltMesh.position.set(0, 0.06, 0);
  pelvisBone.add(beltMesh);

  const buckleMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.075, 0.03),
    brassMat
  );
  buckleMesh.position.set(0, 0.06, 0.185 * dScale);
  pelvisBone.add(buckleMesh);

  // ====================================================
  // 2. ARTICULATED LEGS (ThighBone -> ShinBone -> FootBone + Detailed Shoes)
  // ====================================================
  const hipOffsetX = 0.15 * wScale;
  const isShorts = bottomType.includes('short');
  const isSkirt = bottomType.includes('skirt');

  if (isSkirt) {
    const skirtPleat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27 * wScale, 0.36 * wScale, 0.36, 12),
      pantsMat
    );
    skirtPleat.position.set(0, -0.16, 0);
    skirtPleat.castShadow = true;
    pelvisBone.add(skirtPleat);
  }

  const buildLegChain = (side: 'L' | 'R') => {
    const sign = side === 'L' ? -1 : 1;
    const thighBone = new THREE.Group();
    thighBone.name = `Thigh${side}Bone`;
    thighBone.position.set(sign * hipOffsetX, -0.05, 0);
    pelvisBone.add(thighBone);

    // Upper Leg / Thigh Mesh
    const thighGeo = new THREE.CylinderGeometry(0.105 * wScale, 0.088 * wScale, thighLen, 10);
    const thighMesh = new THREE.Mesh(thighGeo, pantsMat);
    thighMesh.position.set(0, -thighLen / 2, 0);
    thighMesh.castShadow = true;
    thighBone.add(thighMesh);

    // Side trouser seam strip
    const seam = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, thighLen * 0.92, 0.02),
      trimMat
    );
    seam.position.set(sign * 0.095 * wScale, -thighLen / 2, 0);
    thighBone.add(seam);

    // Sculpted Knee Joint Sphere
    const kneeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.084 * wScale, 8, 8),
      isShorts || isSkirt ? skinMat : pantsMat
    );
    kneeSphere.position.set(0, -thighLen, 0);
    thighBone.add(kneeSphere);

    // Shin Bone (Pivots at Knee)
    const shinBone = new THREE.Group();
    shinBone.name = `Shin${side}Bone`;
    shinBone.position.set(0, -thighLen, 0);
    thighBone.add(shinBone);

    const shinMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082 * wScale, 0.066 * wScale, shinLen, 10),
      isShorts || isSkirt ? skinMat : pantsMat
    );
    shinMesh.position.set(0, -shinLen / 2, 0);
    shinMesh.castShadow = true;
    shinBone.add(shinMesh);

    // Rolled Pant Cuff above ankle (when wearing jeans/trousers)
    if (!isShorts && !isSkirt) {
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.078 * wScale, 0.078 * wScale, 0.06, 10),
        trimMat
      );
      cuff.position.set(0, -shinLen + 0.04, 0);
      shinBone.add(cuff);
    }

    // Foot / Ankle Bone (Pivots at Ankle)
    const footBone = new THREE.Group();
    footBone.name = `Foot${side}Bone`;
    footBone.position.set(0, -shinLen, 0);
    shinBone.add(footBone);

    // Detailed Multi-Part Shoe: Rubber Sole + Leather Upper + Rounded Toe Cap + Laces
    const shoeSole = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.035, 0.28),
      soleMat
    );
    shoeSole.position.set(0, -0.045, 0.045);
    footBone.add(shoeSole);

    const shoeUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.065, 0.22),
      leatherMat
    );
    shoeUpper.position.set(0, -0.01, 0.025);
    shoeUpper.castShadow = true;
    footBone.add(shoeUpper);

    const toeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      leatherMat
    );
    toeCap.scale.set(1.0, 0.65, 1.15);
    toeCap.position.set(0, -0.018, 0.13);
    footBone.add(toeCap);

    // White shoe laces detail across tongue
    for (const lz of [0.04, 0.08]) {
      const lace = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.012, 0.015),
        soleMat
      );
      lace.position.set(0, 0.025, lz);
      footBone.add(lace);
    }
  };

  buildLegChain('L');
  buildLegChain('R');

  // ====================================================
  // 3. ARTICULATED TORSO BONE & LAYERED CLOTHING
  // ====================================================
  const torsoBone = new THREE.Group();
  torsoBone.name = 'TorsoBone';
  torsoBone.position.set(0, 0.08, 0);
  pelvisBone.add(torsoBone);

  // Inner Shirt / Blouse Torso Core
  const innerTorso = new THREE.Mesh(
    new THREE.BoxGeometry(0.54 * wScale, torsoHeight, 0.31 * dScale),
    innerShirtMat
  );
  innerTorso.position.set(0, torsoHeight / 2, 0);
  innerTorso.castShadow = true;
  torsoBone.add(innerTorso);

  // Outer Jacket / Cardigan / Tailored Top Panels (Left & Right Front + Back)
  const backPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.58 * wScale, torsoHeight + 0.02, 0.18 * dScale),
    jacketMat
  );
  backPanel.position.set(0, torsoHeight / 2, -0.08 * dScale);
  backPanel.castShadow = true;
  torsoBone.add(backPanel);

  // Left & Right Layered Front Panels (leaves center shirt/placket visible!)
  for (const sideSign of [-1, 1]) {
    const frontSidePanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.21 * wScale, torsoHeight + 0.01, 0.2 * dScale),
      jacketMat
    );
    frontSidePanel.position.set(sideSign * 0.185 * wScale, torsoHeight / 2, 0.075 * dScale);
    frontSidePanel.castShadow = true;
    torsoBone.add(frontSidePanel);

    // Tailored Angled Lapel on chest
    const lapel = new THREE.Mesh(
      new THREE.BoxGeometry(0.08 * wScale, torsoHeight * 0.52, 0.03),
      trimMat
    );
    lapel.position.set(sideSign * 0.085 * wScale, torsoHeight * 0.68, 0.175 * dScale);
    lapel.rotation.z = sideSign * 0.18;
    torsoBone.add(lapel);

    // Front Pocket detail
    const pocket = new THREE.Mesh(
      new THREE.BoxGeometry(0.11 * wScale, 0.09, 0.02),
      trimMat
    );
    pocket.position.set(sideSign * 0.19 * wScale, torsoHeight * 0.24, 0.178 * dScale);
    torsoBone.add(pocket);
  }

  // Shirt Buttons down the center placket
  for (let b = 0; b < 3; b++) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 8), brassMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0, torsoHeight * (0.25 + b * 0.22), 0.16 * dScale);
    torsoBone.add(btn);
  }

  // Folded Neck Collar
  const collarRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15 * wScale, 0.17 * wScale, 0.07, 12, 1, true, 0.5, Math.PI * 2 - 1.0),
    trimMat
  );
  collarRing.position.set(0, torsoHeight + 0.02, 0);
  collarRing.rotation.y = Math.PI;
  torsoBone.add(collarRing);

  // Builder Tool Belt & Hammer Accessory
  if (char.traits.includes('Builder') || char.accessories === 'Tool Belt') {
    const hammerHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xb45309 })
    );
    hammerHandle.position.set(0.32 * wScale, -0.05, 0.08);
    pelvisBone.add(hammerHandle);

    const hammerHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
    );
    hammerHead.position.set(0.32 * wScale, 0.09, 0.08);
    pelvisBone.add(hammerHead);
  }

  // ====================================================
  // 4. ARTICULATED ARMS, ELBOWS, WRISTS & SCULPTED HANDS WITH FINGERS
  // ====================================================
  const shoulderY = torsoHeight - 0.07;
  const shoulderOffsetX = 0.34 * wScale;
  const upperArmLen = 0.31 * hScale;
  const forearmLen = 0.29 * hScale;

  const buildArmChain = (side: 'L' | 'R') => {
    const sign = side === 'L' ? -1 : 1;

    // Upper Arm Bone (Pivots at Shoulder Socket)
    const upperArmBone = new THREE.Group();
    upperArmBone.name = `UpperArm${side}Bone`;
    upperArmBone.position.set(sign * shoulderOffsetX, shoulderY, 0);
    torsoBone.add(upperArmBone);

    // Shoulder Deltoid Cap
    const shoulderCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.092 * wScale, 10, 10),
      jacketMat
    );
    upperArmBone.add(shoulderCap);

    // Tailored Sleeve Upper Arm
    const upperArmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082 * wScale, 0.07 * wScale, upperArmLen, 10),
      jacketMat
    );
    upperArmMesh.position.set(0, -upperArmLen / 2, 0);
    upperArmMesh.castShadow = true;
    upperArmBone.add(upperArmMesh);

    // Rolled Sleeve Cuff at Elbow
    const sleeveCuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.076 * wScale, 0.076 * wScale, 0.05, 10),
      trimMat
    );
    sleeveCuff.position.set(0, -upperArmLen + 0.02, 0);
    upperArmBone.add(sleeveCuff);

    // Forearm Bone (Pivots at Elbow Joint)
    const forearmBone = new THREE.Group();
    forearmBone.name = `Forearm${side}Bone`;
    forearmBone.position.set(0, -upperArmLen, 0);
    upperArmBone.add(forearmBone);

    // Elbow sphere
    const elbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.064 * wScale, 8, 8),
      skinMat
    );
    forearmBone.add(elbowJoint);

    // Sculpted Forearm (Skin)
    const forearmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.064 * wScale, 0.052 * wScale, forearmLen, 10),
      skinMat
    );
    forearmMesh.position.set(0, -forearmLen / 2, 0);
    forearmMesh.castShadow = true;
    forearmBone.add(forearmMesh);

    // Wristwatch on Left Wrist
    if (side === 'L') {
      const watchBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056 * wScale, 0.056 * wScale, 0.03, 10),
        leatherMat
      );
      watchBand.position.set(0, -forearmLen + 0.04, 0);
      forearmBone.add(watchBand);
      const watchDial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.015, 10),
        brassMat
      );
      watchDial.rotation.z = Math.PI / 2;
      watchDial.position.set(-0.055 * wScale, -forearmLen + 0.04, 0);
      forearmBone.add(watchDial);
    }

    // Hand Bone (Pivots at Wrist)
    const handBone = new THREE.Group();
    handBone.name = `Hand${side}Bone`;
    handBone.position.set(0, -forearmLen, 0);
    forearmBone.add(handBone);

    // Wrist Joint Sphere & Buttoned Shirt Cuff
    const wristSphere = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), skinMat);
    handBone.add(wristSphere);

    const wristCuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052 * wScale, 0.048 * wScale, 0.028, 10),
      innerShirtMat
    );
    wristCuff.position.set(0, 0.015, 0);
    handBone.add(wristCuff);

    // Sculpted Metacarpal Palm with Tapered Thenar Muscle
    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.042, 0.082, 0.082),
      skinMat
    );
    palm.position.set(0, -0.042, 0);
    palm.castShadow = true;
    handBone.add(palm);

    const thenarPad = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), skinMat);
    thenarPad.scale.set(0.85, 1.2, 1.0);
    thenarPad.position.set(-sign * 0.012, -0.038, 0.025);
    handBone.add(thenarPad);

    // Articulated 2-Segment Opposable Thumb Bone (ThumbProximal + ThumbDistal + Nail)
    const thumbBone = new THREE.Group();
    thumbBone.name = `Thumb${side}Bone`;
    thumbBone.position.set(-sign * 0.014, -0.032, 0.036);
    thumbBone.rotation.x = 0.52;
    thumbBone.rotation.z = sign * 0.32;
    handBone.add(thumbBone);

    const thumbProximal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.011, 0.034, 8),
      skinMat
    );
    thumbProximal.position.set(0, -0.017, 0);
    thumbBone.add(thumbProximal);

    const thumbKnuckle = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), skinMat);
    thumbKnuckle.position.set(0, -0.034, 0);
    thumbBone.add(thumbKnuckle);

    const thumbDistal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.009, 0.026, 8),
      skinMat
    );
    thumbDistal.position.set(-sign * 0.004, -0.046, 0.004);
    thumbDistal.rotation.z = -sign * 0.25;
    thumbBone.add(thumbDistal);

    // Articulated 4-Finger Phalange Rig (FingersLBone / FingersRBone pivots at Knuckle Ridge)
    const fingersBone = new THREE.Group();
    fingersBone.name = `Fingers${side}Bone`;
    fingersBone.position.set(0, -0.082, 0);
    handBone.add(fingersBone);

    const nailMat = new THREE.MeshStandardMaterial({ color: 0xfde8e8, roughness: 0.35 });
    const fingerZOffsets = [0.028, 0.0095, -0.0095, -0.028];
    const proxLengths = [0.036, 0.04, 0.036, 0.029];
    const distLengths = [0.028, 0.031, 0.028, 0.023];

    fingerZOffsets.forEach((fz, fIdx) => {
      const pLen = proxLengths[fIdx];
      const dLen = distLengths[fIdx];

      // Dorsal Metacarpal Knuckle Joint Sphere
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), skinMat);
      knuckle.position.set(0, 0, fz);
      fingersBone.add(knuckle);

      // Proximal Phalanx
      const proxMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0105, 0.0092, pLen, 8),
        skinMat
      );
      proxMesh.position.set(0, -pLen / 2, fz);
      fingersBone.add(proxMesh);

      // Middle Interphalangeal Joint Sphere
      const midJoint = new THREE.Mesh(new THREE.SphereGeometry(0.0092, 6, 6), skinMat);
      midJoint.position.set(0, -pLen, fz);
      fingersBone.add(midJoint);

      // Distal Phalanx (angled slightly inward for natural anatomical curvature)
      const distGroup = new THREE.Group();
      distGroup.position.set(0, -pLen, fz);
      distGroup.rotation.z = -sign * 0.28;
      fingersBone.add(distGroup);

      const distMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.0075, dLen, 8),
        skinMat
      );
      distMesh.position.set(0, -dLen / 2, 0);
      distGroup.add(distMesh);

      // Sculpted Fingernail Tip
      const nail = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.011, 0.009), nailMat);
      nail.position.set(sign * 0.006, -dLen + 0.006, 0);
      distGroup.add(nail);
    });

    // Attach Held Action Props to Right Hand (and Newspaper across hands)
    if (side === 'R') {
      // 1. Held Book / Newspaper Prop
      const bookProp = new THREE.Group();
      bookProp.name = 'PropBookNewspaper';
      bookProp.visible = false;
      const coverMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.85 });
      const printMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
      const pageLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.018), coverMat);
      pageLeft.position.set(-0.1, 0, 0);
      pageLeft.rotation.y = 0.25;
      bookProp.add(pageLeft);
      const pageRight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.018), coverMat);
      pageRight.position.set(0.1, 0, 0);
      pageRight.rotation.y = -0.25;
      bookProp.add(pageRight);
      const headlineStrip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.022), printMat);
      headlineStrip.position.set(0.1, 0.08, 0.01);
      headlineStrip.rotation.y = -0.25;
      bookProp.add(headlineStrip);
      bookProp.position.set(-0.16, -0.08, 0.12);
      bookProp.rotation.x = Math.PI / 2;
      handBone.add(bookProp);

      // 2. Held Espresso Cup / Cooking Utensil Prop
      const cupProp = new THREE.Group();
      cupProp.name = 'PropCupUtensil';
      cupProp.visible = false;
      const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.038, 0.09, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })
      );
      cupProp.add(mug);
      const coffeeTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.01, 10),
        new THREE.MeshStandardMaterial({ color: 0x3f2314 })
      );
      coffeeTop.position.y = 0.042;
      cupProp.add(coffeeTop);
      cupProp.position.set(-0.04, -0.09, 0.05);
      cupProp.rotation.x = Math.PI / 2;
      handBone.add(cupProp);

      // 3. Held Paintbrush / Studio Tool Prop
      const brushProp = new THREE.Group();
      brushProp.name = 'PropBrushTool';
      brushProp.visible = false;
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.008, 0.26, 8),
        new THREE.MeshStandardMaterial({ color: 0x92400e })
      );
      brushProp.add(handle);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.018, 0.05, 8),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      tip.position.y = 0.15;
      brushProp.add(tip);
      brushProp.position.set(0, -0.09, 0.08);
      brushProp.rotation.x = Math.PI / 2;
      handBone.add(brushProp);
    }
  };

  buildArmChain('L');
  buildArmChain('R');

  // ====================================================
  // 5. NECK & ARTICULATED HEAD BONE (Cheekbones, Eyes, Nose/Nostrils, Philtrum, Rigged Brows, Jaw/Teeth/Tongue, Hair & Beard)
  // ====================================================
  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.095, 0.12, 10),
    skinMat
  );
  neckMesh.position.set(0, torsoHeight + 0.05, 0);
  torsoBone.add(neckMesh);

  const headBone = new THREE.Group();
  headBone.name = 'HeadBone';
  headBone.position.set(0, torsoHeight + 0.28, 0);
  torsoBone.add(headBone);

  // Cranium & Contoured Zygomatic Cheek Structure
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.235, 18, 18), skinMat);
  cranium.scale.set(0.96, 1.06, 0.98);
  cranium.castShadow = true;
  headBone.add(cranium);

  // Sculpted Zygomatic Cheekbones & Subtle Blush/Contour Volume
  for (const cheekSign of [-1, 1]) {
    const cheekbone = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), skinMat);
    cheekbone.scale.set(1.15, 0.78, 0.95);
    cheekbone.position.set(cheekSign * 0.135, -0.022, 0.168);
    headBone.add(cheekbone);
  }

  // Supraorbital Brow Ridge
  const browRidge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.032, 0.065), skinMat);
  browRidge.position.set(0, 0.078, 0.195);
  headBone.add(browRidge);

  // Sculpted Multi-Part Left & Right Ears (Helix Rim + Earlobe)
  for (const earSign of [-1, 1]) {
    const earGroup = new THREE.Group();
    earGroup.position.set(earSign * 0.225, -0.01, -0.01);
    const earHelix = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), skinMat);
    earHelix.scale.set(0.45, 1.15, 0.78);
    earGroup.add(earHelix);
    const earLobe = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), skinMat);
    earLobe.position.set(0, -0.042, 0.008);
    earGroup.add(earLobe);
    headBone.add(earGroup);
  }

  // Sculpted 3D Nose Bridge, Rounded Tip, Nostril Wings & Philtrum Groove
  const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.078, 0.052), skinMat);
  noseBridge.position.set(0, 0.002, 0.225);
  noseBridge.rotation.x = -0.18;
  headBone.add(noseBridge);

  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.027, 10, 10), skinMat);
  noseTip.position.set(0, -0.032, 0.25);
  headBone.add(noseTip);

  for (const nSign of [-1, 1]) {
    const nostrilWing = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), skinMat);
    nostrilWing.scale.set(1.1, 0.8, 0.9);
    nostrilWing.position.set(nSign * 0.022, -0.038, 0.236);
    headBone.add(nostrilWing);
  }

  const philtrum = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.028, 0.015), skinMat);
  philtrum.position.set(0, -0.062, 0.228);
  headBone.add(philtrum);

  // Expressive Eyes (Sclera + Colored Iris + Pupil + Corneal Catchlight Glint + Blinking Eyelids + Rigged Eyebrow Bones)
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18 });
  const irisColors = [0x2563eb, 0x059669, 0x78350f, 0x4f46e5];
  const irisMat = new THREE.MeshStandardMaterial({
    color: irisColors[char.name.length % irisColors.length],
    roughness: 0.22,
  });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const browMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });

  for (const eyeSide of ['L', 'R'] as const) {
    const sign = eyeSide === 'L' ? -1 : 1;
    const ex = sign * 0.082;
    const ey = 0.035;
    const ez = 0.205;

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), scleraMat);
    sclera.scale.set(1.12, 0.96, 0.62);
    sclera.position.set(ex, ey, ez);
    headBone.add(sclera);

    // Gaze-tracking Iris + Pupil + Specular Catchlight Group
    const eyeGroup = new THREE.Group();
    eyeGroup.name = `Eye${eyeSide}Group`;
    eyeGroup.position.set(ex, ey, ez);
    eyeGroup.userData.baseX = ex;
    headBone.add(eyeGroup);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), irisMat);
    iris.scale.set(1.0, 1.0, 0.5);
    iris.position.set(0, 0, 0.017);
    eyeGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0115, 8, 8), pupilMat);
    pupil.scale.set(1.0, 1.0, 0.5);
    pupil.position.set(0, 0, 0.024);
    eyeGroup.add(pupil);

    // Corneal Specular Catchlight Glint (brings life to the toon's gaze)
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 6, 6), glintMat);
    glint.position.set(0.006, 0.006, 0.028);
    eyeGroup.add(glint);

    // Blinking Upper Eyelid
    const eyelid = new THREE.Mesh(
      new THREE.BoxGeometry(0.082, 0.07, 0.046),
      skinMat
    );
    eyelid.name = `Eyelid${eyeSide}`;
    eyelid.position.set(ex, ey + 0.012, ez + 0.008);
    eyelid.scale.y = 0.12;
    headBone.add(eyelid);

    // Rigged 2-Part Sculpted Eyebrow Bone (BrowLBone / BrowRBone)
    const browBone = new THREE.Group();
    browBone.name = `Brow${eyeSide}Bone`;
    browBone.position.set(ex, ey + 0.058, ez + 0.014);
    browBone.userData.baseY = ey + 0.058;
    browBone.rotation.z = -sign * 0.08;
    headBone.add(browBone);

    const browInner = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.021, 0.03), browMat);
    browInner.position.set(-sign * 0.015, 0, 0);
    browBone.add(browInner);

    const browOuter = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.018, 0.028), browMat);
    browOuter.position.set(sign * 0.026, -0.004, -0.004);
    browOuter.rotation.z = -sign * 0.22;
    browBone.add(browOuter);
  }

  // Articulated Jaw Bone, Cupid's Bow Lips, Oral Cavity, Teeth & Tongue
  const lipMat = new THREE.MeshStandardMaterial({ color: 0xc26d68, roughness: 0.5 });
  const upperLip = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.019, 0.034), lipMat);
  upperLip.position.set(0, -0.084, 0.218);
  headBone.add(upperLip);

  // Upper Dental Arch (Teeth visible when mouth opens)
  const teethMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
  const upperTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.014, 0.022), teethMat);
  upperTeeth.position.set(0, -0.095, 0.208);
  headBone.add(upperTeeth);

  const jawBone = new THREE.Group();
  jawBone.name = 'JawBone';
  jawBone.position.set(0, -0.09, 0.08);
  headBone.add(jawBone);

  const lowerChin = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.11, 0.22),
    skinMat
  );
  lowerChin.position.set(0, -0.055, 0.04);
  jawBone.add(lowerChin);

  // Inner Oral Cavity, Lower Teeth & Expressive Pink Tongue rigged to JawBone
  const mouthCavity = new THREE.Mesh(
    new THREE.BoxGeometry(0.082, 0.022, 0.045),
    new THREE.MeshBasicMaterial({ color: 0x3b0a0a })
  );
  mouthCavity.position.set(0, -0.008, 0.118);
  jawBone.add(mouthCavity);

  const tongueMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.6 })
  );
  tongueMesh.scale.set(1.1, 0.45, 1.2);
  tongueMesh.position.set(0, -0.01, 0.122);
  jawBone.add(tongueMesh);

  const lowerTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.012, 0.02), teethMat);
  lowerTeeth.position.set(0, -0.006, 0.132);
  jawBone.add(lowerTeeth);

  const lowerLip = new THREE.Mesh(
    new THREE.BoxGeometry(0.092, 0.021, 0.036),
    new THREE.MeshStandardMaterial({ color: 0xb85d58, roughness: 0.52 })
  );
  lowerLip.position.set(0, -0.018, 0.138);
  jawBone.add(lowerLip);

  // ====================================================
  // 6. DETAILED MULTI-PART HAIRSTYLES (Attached to HeadBone)
  // ====================================================
  const hairGroup = new THREE.Group();
  hairGroup.name = 'HairGroup';

  // Base scalp cap & back hair volume shared across styles
  const scalpCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.248, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  scalpCap.position.set(0, 0.02, -0.015);
  hairGroup.add(scalpCap);

  // Sideburn temples framing face
  for (const sx of [-0.215, 0.215]) {
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.12), hairMat);
    temple.position.set(sx, 0.02, 0.05);
    hairGroup.add(temple);
  }

  if (char.hairStyle.includes('Bun')) {
    // Swept front bangs + High Sculpted Bun + Ribbon Band
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.1), hairMat);
    fringe.position.set(0, 0.18, 0.18);
    fringe.rotation.x = 0.25;
    hairGroup.add(fringe);

    const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 12), hairMat);
    topBun.position.set(0, 0.31, -0.08);
    hairGroup.add(topBun);

    const scrunchie = new THREE.Mesh(
      new THREE.TorusGeometry(0.095, 0.02, 8, 16),
      jacketMat
    );
    scrunchie.rotation.x = Math.PI / 2;
    scrunchie.position.set(0, 0.24, -0.07);
    hairGroup.add(scrunchie);
  } else if (char.hairStyle.includes('Afro')) {
    const afroMain = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), hairMat);
    afroMain.position.set(0, 0.11, -0.02);
    hairGroup.add(afroMain);
  } else if (char.hairStyle.includes('Braids') || char.hairStyle.includes('Wavy')) {
    // Parted front waves + Cascading shoulder locks
    for (const side of [-1, 1]) {
      const waveFront = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.14), hairMat);
      waveFront.position.set(side * 0.09, 0.19, 0.16);
      waveFront.rotation.z = -side * 0.22;
      hairGroup.add(waveFront);

      for (let seg = 0; seg < 3; seg++) {
        const lock = new THREE.Mesh(
          new THREE.SphereGeometry(0.078 - seg * 0.008, 10, 10),
          hairMat
        );
        lock.scale.set(0.9, 1.6, 0.9);
        lock.position.set(side * 0.22, -0.04 - seg * 0.14, 0.02 - seg * 0.02);
        hairGroup.add(lock);
      }
    }
  } else if (char.hairStyle.includes('Hawk') || char.hairStyle.includes('Curly')) {
    // Textured volume ridges across crown
    for (let r = -2; r <= 2; r++) {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), hairMat);
      curl.position.set(r * 0.04, 0.24, 0.05 - Math.abs(r) * 0.04);
      hairGroup.add(curl);
    }
  } else {
    // Tailored Side Part / Classic Bob with sculpted fringe
    const sweptFringe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.085, 0.14), hairMat);
    sweptFringe.position.set(0.03, 0.19, 0.17);
    sweptFringe.rotation.z = -0.12;
    hairGroup.add(sweptFringe);

    const backBob = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.26, 0.22), hairMat);
    backBob.position.set(0, -0.02, -0.12);
    hairGroup.add(backBob);
  }
  headBone.add(hairGroup);

  // ====================================================
  // 7. DETAILED 3D FACIAL HAIR (Attached to HeadBone & JawBone)
  // ====================================================
  if (char.facialHair && char.facialHair !== 'None') {
    const beardMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });

    if (char.facialHair.includes('Stubble')) {
      const stubble = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.115, 0.23),
        new THREE.MeshStandardMaterial({
          color: hairColor,
          roughness: 0.95,
          transparent: true,
          opacity: 0.72,
        })
      );
      stubble.position.set(0, -0.055, 0.045);
      jawBone.add(stubble);
    } else if (char.facialHair.includes('Boxed') || char.facialHair.includes('Full') || char.facialHair.includes('Overgrown')) {
      const isHeavy = char.facialHair.includes('Overgrown');
      // Upper Mustache
      const stacheL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.038, 0.055), beardMat);
      stacheL.position.set(-0.048, -0.068, 0.228);
      stacheL.rotation.z = 0.18;
      headBone.add(stacheL);

      const stacheR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.038, 0.055), beardMat);
      stacheR.position.set(0.048, -0.068, 0.228);
      stacheR.rotation.z = -0.18;
      headBone.add(stacheR);

      // Cheek Sideburn Connectors
      for (const bx of [-0.19, 0.19]) {
        const cheekBeard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.18), beardMat);
        cheekBeard.position.set(bx, -0.06, 0.06);
        headBone.add(cheekBeard);
      }

      // Sculpted Chin & Jaw Beard (Moves with JawBone when talking!)
      const jawBeard = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, isHeavy ? 0.22 : 0.15, 0.24),
        beardMat
      );
      jawBeard.position.set(0, isHeavy ? -0.09 : -0.06, 0.06);
      jawBone.add(jawBeard);
    } else if (char.facialHair.includes('Goatee')) {
      const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.034, 0.05), beardMat);
      mustache.position.set(0, -0.068, 0.228);
      headBone.add(mustache);

      const chinTuft = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.1), beardMat);
      chinTuft.position.set(0, -0.07, 0.13);
      jawBone.add(chinTuft);
    } else if (char.facialHair.includes('Handlebar')) {
      const center = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.05), beardMat);
      center.position.set(0, -0.066, 0.228);
      headBone.add(center);

      for (const hx of [-0.09, 0.09]) {
        const curlWing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 6, 12, Math.PI), beardMat);
        curlWing.position.set(hx * 1.15, -0.055, 0.225);
        curlWing.rotation.z = hx < 0 ? Math.PI : 0;
        headBone.add(curlWing);
      }
    }
  }

  // Eyeglasses Accessory
  if (char.accessories === 'Glasses' || char.traits.includes('Bookworm') || char.traits.includes('Genius')) {
    const glassFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.2 });
    for (const gx of [-0.082, 0.082]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.009, 8, 16), glassFrameMat);
      rim.position.set(gx, 0.035, 0.232);
      headBone.add(rim);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.009, 0.01), glassFrameMat);
    bridge.position.set(0, 0.042, 0.232);
    headBone.add(bridge);
  }

  // ====================================================
  // 8. ICONIC SIMS PLUMBOB DIAMOND (Floating above head)
  // ====================================================
  const plumbobGeo = new THREE.OctahedronGeometry(0.18, 0);
  plumbobGeo.scale(0.8, 1.8, 0.8);
  const plumbobMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    roughness: 0.2,
    metalness: 0.1,
  });
  const plumbob = new THREE.Mesh(plumbobGeo, plumbobMat);
  plumbob.name = 'Plumbob';
  plumbob.position.y = pelvisY + torsoHeight + 0.92;
  rig.add(plumbob);

  return rig;
}

/**
 * Builds 3D architectural meshes for user-placed or AI-generated World Builder parts
 * (Rooms, Walls, Pillars, Doors, Archways, Windows, Roofs, Decks, Stairs, Fences, Trees, Shrubs, Pools)
 */
function createCustomBuildingPartMesh(
  part: PlacedBuildingPart,
  pencilTex: THREE.Texture,
  roomWallMaterials: Record<string, THREE.MeshStandardMaterial>,
  roomFloorMaterials: Record<string, THREE.MeshStandardMaterial>,
  customWallMeshes: Array<{
    mesh: THREE.Object3D;
    originalHeight: number;
    originalPosY: number;
    zone: 'SOUTH' | 'NORTH' | 'EAST' | 'WEST' | 'INTERIOR';
    isAttachment: boolean;
  }>,
  customRoofMeshes: THREE.Object3D[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = part.id;

  const primaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(part.colorHex || '#f5f5f4'),
    roughness: 0.72,
    map: pencilTex,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(part.secondaryColorHex || '#78350f'),
    roughness: 0.6,
    map: pencilTex,
  });

  if (part.partType === 'ROOM_BLOCK') {
    const w = part.width;
    const h = part.height;
    const d = part.depth;
    const wallThick = 0.26;

    const floorMat =
      (part.roomTag && roomFloorMaterials[part.roomTag]) || secondaryMat;
    const wallMat =
      (part.roomTag && roomWallMaterials[part.roomTag]) || primaryMat;

    // 1. Room Floor Slab
    const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), floorMat);
    floorSlab.position.set(0, 0.03, 0);
    floorSlab.receiveShadow = true;
    group.add(floorSlab);

    // 2. Four Tiny-Glade-style Corner Pillars / Quoins (eliminates Z-fighting at corners)
    const quoinMat = new THREE.MeshStandardMaterial({
      color: 0x4a3525,
      roughness: 0.65,
      map: pencilTex,
    });
    for (const cx of [-w / 2, w / 2]) {
      for (const cz of [-d / 2, d / 2]) {
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, h + 0.04, 0.32),
          quoinMat
        );
        pillar.position.set(cx, h / 2, cz);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        group.add(pillar);
        customWallMeshes.push({
          mesh: pillar,
          originalHeight: h + 0.04,
          originalPosY: h / 2,
          zone: cz > 0 ? 'SOUTH' : 'NORTH',
          isAttachment: false,
        });
      }
    }

    // Helper to add a wall with a carved center window aperture (North, West, East)
    const addRoomBlockWindowedWall = (
      axis: 'X' | 'Z',
      spanLen: number,
      fixedOffset: number,
      zone: 'NORTH' | 'WEST' | 'EAST'
    ) => {
      const innerSpan = Math.max(1.6, spanLen - 0.32);
      const winW = Math.min(1.8, innerSpan * 0.42);
      const winH = 1.35;
      const sillY = 0.9;
      const headerH = Math.max(0.2, h - (sillY + winH));
      const sideLen = Math.max(0.35, (innerSpan - winW) / 2);

      for (const dir of [-1, 1]) {
        const offsetAlong = dir * (winW / 2 + sideLen / 2);
        const seg = new THREE.Mesh(
          axis === 'X'
            ? new THREE.BoxGeometry(sideLen, h, wallThick)
            : new THREE.BoxGeometry(wallThick, h, sideLen),
          wallMat
        );
        seg.position.set(
          axis === 'X' ? offsetAlong : fixedOffset,
          h / 2,
          axis === 'X' ? fixedOffset : offsetAlong
        );
        seg.castShadow = true;
        seg.receiveShadow = true;
        group.add(seg);
        customWallMeshes.push({
          mesh: seg,
          originalHeight: h,
          originalPosY: h / 2,
          zone,
          isAttachment: false,
        });
      }

      // Sill wall below window
      const sill = new THREE.Mesh(
        axis === 'X'
          ? new THREE.BoxGeometry(winW, sillY, wallThick)
          : new THREE.BoxGeometry(wallThick, sillY, winW),
        wallMat
      );
      sill.position.set(
        axis === 'X' ? 0 : fixedOffset,
        sillY / 2,
        axis === 'X' ? fixedOffset : 0
      );
      group.add(sill);
      customWallMeshes.push({
        mesh: sill,
        originalHeight: sillY,
        originalPosY: sillY / 2,
        zone,
        isAttachment: false,
      });

      // Header lintel above window
      const header = new THREE.Mesh(
        axis === 'X'
          ? new THREE.BoxGeometry(winW, headerH, wallThick)
          : new THREE.BoxGeometry(wallThick, headerH, winW),
        wallMat
      );
      header.position.set(
        axis === 'X' ? 0 : fixedOffset,
        sillY + winH + headerH / 2,
        axis === 'X' ? fixedOffset : 0
      );
      group.add(header);
      customWallMeshes.push({
        mesh: header,
        originalHeight: headerH,
        originalPosY: sillY + winH + headerH / 2,
        zone,
        isAttachment: true,
      });

      // 3D Window Assembly inside the carved opening
      const winMesh = createWindowMesh(winW, winH, wallThick * 0.95, 0xffffff);
      if (axis === 'Z') {
        winMesh.rotation.y = Math.PI / 2;
      }
      winMesh.position.set(
        axis === 'X' ? 0 : fixedOffset,
        sillY,
        axis === 'X' ? fixedOffset : 0
      );
      group.add(winMesh);
      customWallMeshes.push({
        mesh: winMesh,
        originalHeight: winH,
        originalPosY: sillY,
        zone,
        isAttachment: true,
      });
    };

    addRoomBlockWindowedWall('X', w, -d / 2, 'NORTH');
    addRoomBlockWindowedWall('Z', d, -w / 2, 'WEST');
    addRoomBlockWindowedWall('Z', d, w / 2, 'EAST');

    // 3. South wall split into left & right segments + top lintel header leaving a 1.35m doorway opening + 3D Door
    const innerSouthW = Math.max(1.8, w - 0.32);
    const doorW = 1.35;
    const doorH = 2.32;
    const sideW = Math.max(0.35, (innerSouthW - doorW) / 2);
    for (const sx of [-(doorW / 2 + sideW / 2), doorW / 2 + sideW / 2]) {
      const southSeg = new THREE.Mesh(new THREE.BoxGeometry(sideW, h, wallThick), wallMat);
      southSeg.position.set(sx, h / 2, d / 2);
      southSeg.castShadow = true;
      southSeg.receiveShadow = true;
      group.add(southSeg);
      customWallMeshes.push({
        mesh: southSeg,
        originalHeight: h,
        originalPosY: h / 2,
        zone: 'SOUTH',
        isAttachment: false,
      });
    }
    const doorHeaderH = Math.max(0.2, h - doorH);
    const doorHeader = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorHeaderH, wallThick),
      wallMat
    );
    doorHeader.position.set(0, doorH + doorHeaderH / 2, d / 2);
    group.add(doorHeader);
    customWallMeshes.push({
      mesh: doorHeader,
      originalHeight: doorHeaderH,
      originalPosY: doorH + doorHeaderH / 2,
      zone: 'SOUTH',
      isAttachment: true,
    });
  } else if (part.partType === 'WALL_SEGMENT') {
    const wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(part.width, part.height, part.depth),
      primaryMat
    );
    wallMesh.position.set(0, part.height / 2, 0);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    group.add(wallMesh);
    customWallMeshes.push({
      mesh: wallMesh,
      originalHeight: part.height,
      originalPosY: part.height / 2,
      zone: 'INTERIOR',
      isAttachment: false,
    });
  } else if (part.partType === 'PILLAR') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.7, 0.52), secondaryMat);
    base.position.y = 0.35;
    group.add(base);
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, part.height - 0.7, 12),
      primaryMat
    );
    shaft.position.y = 0.7 + (part.height - 0.7) / 2;
    shaft.castShadow = true;
    group.add(shaft);
  } else if (part.partType === 'DOOR' || part.partType === 'ARCHWAY') {
    const doorMesh = createDoorMesh(
      part.width,
      part.height,
      part.depth,
      part.partType === 'ARCHWAY',
      new THREE.Color(part.colorHex).getHex(),
      new THREE.Color(part.secondaryColorHex || '#ffffff').getHex()
    );
    group.add(doorMesh);
    customWallMeshes.push({
      mesh: doorMesh,
      originalHeight: part.height,
      originalPosY: 0,
      zone: 'SOUTH',
      isAttachment: true,
    });
  } else if (part.partType === 'WINDOW') {
    const winMesh = createWindowMesh(
      part.width,
      part.height,
      part.depth,
      new THREE.Color(part.colorHex).getHex()
    );
    winMesh.position.y = part.gridPos.y > 0 ? 0 : 0.85;
    group.add(winMesh);
    customWallMeshes.push({
      mesh: winMesh,
      originalHeight: part.height,
      originalPosY: winMesh.position.y,
      zone: 'SOUTH',
      isAttachment: true,
    });
  } else if (
    part.partType === 'ROOF_GABLED' ||
    part.partType === 'ROOF_HIPPED' ||
    part.partType === 'ROOF_FLAT' ||
    part.partType === 'ROOF_MANSARD'
  ) {
    const roofContainer = new THREE.Group();
    if (part.partType === 'ROOF_FLAT') {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(part.width, part.height, part.depth),
        primaryMat
      );
      slab.position.y = part.height / 2;
      roofContainer.add(slab);
      const skylight = new THREE.Mesh(
        new THREE.BoxGeometry(part.width * 0.45, part.height + 0.08, part.depth * 0.45),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.55,
          roughness: 0.1,
        })
      );
      skylight.position.y = part.height / 2 + 0.04;
      roofContainer.add(skylight);
    } else {
      const radius = Math.max(part.width, part.depth) * 0.68;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(radius, part.height, 4),
        primaryMat
      );
      cone.rotation.y = Math.PI / 4;
      cone.position.y = part.height / 2;
      cone.castShadow = true;
      roofContainer.add(cone);
    }
    group.add(roofContainer);
    customRoofMeshes.push(roofContainer);
  } else if (part.partType === 'DECK_PATIO') {
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(part.width, part.height, part.depth),
      primaryMat
    );
    deck.position.y = part.height / 2;
    deck.receiveShadow = true;
    group.add(deck);
  } else if (part.partType === 'STAIRS') {
    const steps = 10;
    for (let s = 0; s < steps; s++) {
      const frac = s / steps;
      const tread = new THREE.Mesh(
        new THREE.BoxGeometry(part.width, 0.08, 0.42),
        primaryMat
      );
      tread.position.set(0, frac * part.height + 0.04, (0.5 - frac) * part.depth);
      tread.castShadow = true;
      group.add(tread);
    }
  } else if (part.partType === 'FENCE') {
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(part.width, 0.06, 0.08), primaryMat);
    railTop.position.y = part.height - 0.1;
    group.add(railTop);
    const railBot = new THREE.Mesh(new THREE.BoxGeometry(part.width, 0.06, 0.08), primaryMat);
    railBot.position.y = 0.25;
    group.add(railBot);
    const pickets = Math.floor(part.width / 0.35);
    for (let p = 0; p <= pickets; p++) {
      const px = -part.width / 2 + (p / pickets) * part.width;
      const picket = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, part.height, 0.04),
        primaryMat
      );
      picket.position.set(px, part.height / 2, 0);
      picket.castShadow = true;
      group.add(picket);
    }
  } else if (part.partType === 'TREE') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.2), secondaryMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    group.add(trunk);
    for (let c = 0; c < 3; c++) {
      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(1.4 - c * 0.28, 1.9 - c * 0.25, 10),
        primaryMat
      );
      foliage.position.y = 2.4 + c * 1.1;
      foliage.castShadow = true;
      group.add(foliage);
    }
  } else if (part.partType === 'SHRUB_FLOWER') {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(part.width, 0.35, part.depth),
      new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.85 })
    );
    box.position.y = 0.175;
    group.add(box);
    for (let bx = -part.width * 0.35; bx <= part.width * 0.35; bx += 0.75) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 8), primaryMat);
      bush.position.set(bx, 0.45, 0);
      group.add(bush);
      const rose = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), secondaryMat);
      rose.position.set(bx + 0.08, 0.72, 0.08);
      group.add(rose);
    }
  } else if (part.partType === 'POOL') {
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(part.width + 0.8, 0.2, part.depth + 0.8),
      secondaryMat
    );
    border.position.y = 0.05;
    group.add(border);
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(part.width, 0.12, part.depth),
      new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        roughness: 0.15,
        metalness: 0.2,
        transparent: true,
        opacity: 0.78,
      })
    );
    water.position.y = 0.09;
    group.add(water);
  }

  return group;
}

