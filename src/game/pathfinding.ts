/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Character,
  SmartObject,
  STATIC_HOUSE_FIXTURE_COLLIDERS,
  getSmartObjectCollisionBox,
  getObjectCollisionProfile,
  getInteractionApproachPoint,
  resolveFurnitureCollision,
} from './simulation';

export interface WorldPoint3D {
  x: number;
  y: number;
  z: number;
}

export interface NavGridBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cellSize: number;
  floorY: number;
}

export interface DoorwayPortal {
  id: string;
  x: number;
  z: number;
  y: number;
  width: number;
  axis: 'X' | 'Z';
  connectsRooms: [string, string];
}

/**
 * Curated walkable doorway & archway portals in the default multi-wing house
 * so the NavGrid always carves passable channels through walls at every door/arch.
 */
export const DEFAULT_HOUSE_DOORWAY_PORTALS: DoorwayPortal[] = [
  // Exterior doors
  { id: 'portal_front_entry', x: 0.5, z: 8.2, y: 0, width: 1.5, axis: 'X', connectsRooms: ['Foyer', 'Yard'] },
  { id: 'portal_back_patio', x: 0.5, z: -7.5, y: 0, width: 1.5, axis: 'X', connectsRooms: ['Kitchen', 'Yard'] },
  // Interior doorways & open arches
  { id: 'portal_kitchen_foyer_arch', x: -1.15, z: -2.6, y: 0, width: 2.0, axis: 'Z', connectsRooms: ['Kitchen', 'Foyer'] },
  { id: 'portal_living_foyer_arch', x: 2.0, z: -2.2, y: 0, width: 2.2, axis: 'Z', connectsRooms: ['LivingRoom', 'Foyer'] },
  { id: 'portal_bedroom_door', x: 2.0, z: 2.8, y: 0, width: 1.35, axis: 'Z', connectsRooms: ['Bedroom', 'Foyer'] },
  { id: 'portal_kitchen_study_arch', x: -7.5, z: 0.5, y: 0, width: 1.65, axis: 'X', connectsRooms: ['Kitchen', 'Study'] },
  { id: 'portal_bathroom_privacy_door', x: -3.45, z: 5.5, y: 0, width: 1.25, axis: 'X', connectsRooms: ['Bathroom', 'Hallway'] },
  { id: 'portal_study_hall_arch', x: -4.5, z: 6.85, y: 0, width: 1.5, axis: 'Z', connectsRooms: ['Study', 'Hallway'] },
];

export interface NavGridCell {
  col: number;
  row: number;
  worldX: number;
  worldZ: number;
  walkable: boolean;
  isDoorwayPortal: boolean;
  blockedBy?: 'WALL' | 'FURNITURE' | 'FIXTURE' | 'OUT_OF_BOUNDS';
  obstacleId?: string;
  penaltyCost: number; // 1.0 normal, >1 near walls/furniture for smoother clearance
}

export interface NavGrid {
  bounds: NavGridBounds;
  cols: number;
  rows: number;
  cells: NavGridCell[][]; // [row][col]
  walkableCount: number;
  blockedCount: number;
  walkableRatio: number;
}

export interface CustomPartCollider {
  id: string;
  partType: string;
  gridPos: { x: number; y: number; z: number };
  width: number;
  depth: number;
  height?: number;
  rotationY?: number;
}

export interface WorldBlueprintNavInput {
  isEmptyGridMode?: boolean;
  placedParts?: CustomPartCollider[];
}

/**
 * Returns true ONLY for furniture where a character's final interaction pose sits/lies/swims
 * inside the object's footprint (`sofa`, `armchair`, `bed`, `bathtub`, `shower`, `pool`).
 * All other SmartObjects (stoves, fridges, tables, easels, bookshelves, arcade cabinets, TVs,
 * and recently placed smart objects) are solid obstacles that characters must route AROUND.
 */
export function isWalkInInteractiveObject(objectId?: string): boolean {
  if (!objectId) return false;
  const id = objectId.toLowerCase();
  return (
    id.includes('sofa') ||
    id.includes('armchair') ||
    id.includes('bed') ||
    id.includes('bathtub') ||
    id.includes('shower') ||
    id.includes('pool')
  );
}

/**
 * Computes a fast deterministic signature for the current `smartObjects` and `worldBlueprint`
 * obstacles so cached A* paths immediately invalidate whenever an object is placed, moved, or removed.
 */
export function computeObstacleSignature(
  smartObjects: SmartObject[],
  customParts: CustomPartCollider[] = [],
  includeDefaultHouseWalls: boolean = true
): string {
  let hash = includeDefaultHouseWalls ? 2166136261 : 16777619;
  for (let i = 0; i < smartObjects.length; i++) {
    const o = smartObjects[i];
    const qx = Math.round((o.gridPos.x || 0) * 10);
    const qy = Math.round((o.gridPos.y || 0) * 4);
    const qz = Math.round((o.gridPos.z || 0) * 10);
    hash ^= o.id.length + (qx << 8) + (qy << 4) + qz;
    hash = Math.imul(hash, 16777619);
  }
  for (let i = 0; i < customParts.length; i++) {
    const p = customParts[i];
    const qx = Math.round((p.gridPos.x || 0) * 10);
    const qz = Math.round((p.gridPos.z || 0) * 10);
    const qr = Math.round((p.rotationY || 0) * 10);
    hash ^= p.id.length + (qx << 8) + (qz << 2) + qr;
    hash = Math.imul(hash, 16777619);
  }
  return `${smartObjects.length}:${customParts.length}:${includeDefaultHouseWalls ? 1 : 0}:${hash >>> 0}`;
}

/**
 * Converts world (x, z) to grid (col, row) indices clamped within the NavGrid.
 */
export function worldToGridCell(
  grid: NavGrid,
  x: number,
  z: number
): { col: number; row: number } {
  const col = Math.max(
    0,
    Math.min(grid.cols - 1, Math.floor((x - grid.bounds.minX) / grid.bounds.cellSize))
  );
  const row = Math.max(
    0,
    Math.min(grid.rows - 1, Math.floor((z - grid.bounds.minZ) / grid.bounds.cellSize))
  );
  return { col, row };
}

/**
 * Builds a 2D walkability NavGrid for any lot or room bounds, accounting for:
 * - SmartObject furniture AABBs (with character clearance padding matching resolveFurnitureCollision)
 * - Default house interior/exterior wall segments & static fixtures
 * - WorldBlueprint (`PlacedBuildingPart[]`) custom walls, room blocks, pillars, fences, and doors
 * - Walkable Doorway Portals (which carve open passable corridors through walls)
 */
export function buildNavGridForBounds(params: {
  bounds?: Partial<NavGridBounds>;
  smartObjects?: SmartObject[];
  customParts?: CustomPartCollider[];
  worldBlueprint?: WorldBlueprintNavInput;
  includeDefaultHouseWalls?: boolean;
  doorwayPortals?: DoorwayPortal[];
  ignoreObjectIds?: string[];
  toonClearanceRadius?: number;
}): NavGrid {
  const bounds: NavGridBounds = {
    minX: params.bounds?.minX ?? -15.5,
    maxX: params.bounds?.maxX ?? 15.5,
    minZ: params.bounds?.minZ ?? -15.5,
    maxZ: params.bounds?.maxZ ?? 15.5,
    cellSize: params.bounds?.cellSize ?? 0.5,
    floorY: params.bounds?.floorY ?? 0,
  };

  const cols = Math.max(4, Math.ceil((bounds.maxX - bounds.minX) / bounds.cellSize));
  const rows = Math.max(4, Math.ceil((bounds.maxZ - bounds.minZ) / bounds.cellSize));
  const smartObjects = params.smartObjects ?? [];
  const customParts = params.worldBlueprint?.placedParts ?? params.customParts ?? [];
  const includeDefault =
    params.includeDefaultHouseWalls ??
    (params.worldBlueprint !== undefined
      ? !params.worldBlueprint.isEmptyGridMode
      : customParts.length === 0);
  const ignoreSet = new Set(params.ignoreObjectIds ?? []);
  const clearance = params.toonClearanceRadius ?? 0.08;

  // Collect all doorway portals (default house portals + custom PlacedBuildingPart doors & ROOM_BLOCK south doors)
  const portals: DoorwayPortal[] = [
    ...(includeDefault ? DEFAULT_HOUSE_DOORWAY_PORTALS : []),
    ...(params.doorwayPortals ?? []),
  ];

  for (const part of customParts) {
    const pt = (part.partType || '').toUpperCase();
    const rot = Math.abs(part.rotationY || 0) % Math.PI;
    const isZAxis = rot > Math.PI * 0.25 && rot < Math.PI * 0.75;

    if (pt === 'DOOR' || pt === 'ARCHWAY' || part.id.toLowerCase().includes('door')) {
      portals.push({
        id: `portal_${part.id}`,
        x: part.gridPos.x,
        z: part.gridPos.z,
        y: part.gridPos.y || 0,
        width: Math.max(1.25, part.width || 1.3),
        axis: isZAxis ? 'Z' : 'X',
        connectsRooms: ['RoomA', 'RoomB'],
      });
    } else if (pt === 'ROOM_BLOCK') {
      const rawW = part.width || 6.0;
      const rawD = part.depth || 6.0;
      const effD = isZAxis ? rawW : rawD;
      portals.push({
        id: `portal_roomblock_${part.id}`,
        x: part.gridPos.x,
        z: part.gridPos.z + effD * 0.5,
        y: part.gridPos.y || 0,
        width: 1.5,
        axis: 'X',
        connectsRooms: [part.id, 'Exterior'],
      });
    }
  }

  // Initialize cells
  const cells: NavGridCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowArr: NavGridCell[] = [];
    const worldZ = bounds.minZ + (r + 0.5) * bounds.cellSize;
    for (let c = 0; c < cols; c++) {
      const worldX = bounds.minX + (c + 0.5) * bounds.cellSize;
      rowArr.push({
        col: c,
        row: r,
        worldX: Math.round(worldX * 100) / 100,
        worldZ: Math.round(worldZ * 100) / 100,
        walkable: true,
        isDoorwayPortal: false,
        penaltyCost: 1.0,
      });
    }
    cells.push(rowArr);
  }

  // Helper to mark an AABB region as blocked
  const markAABBBlocked = (
    cx: number,
    cz: number,
    halfW: number,
    halfD: number,
    pad: number,
    blockedBy: 'WALL' | 'FURNITURE' | 'FIXTURE',
    obstacleId: string
  ) => {
    const minX = cx - (halfW + pad);
    const maxX = cx + (halfW + pad);
    const minZ = cz - (halfD + pad);
    const maxZ = cz + (halfD + pad);

    const startCol = Math.max(0, Math.floor((minX - bounds.minX) / bounds.cellSize));
    const endCol = Math.min(cols - 1, Math.floor((maxX - bounds.minX) / bounds.cellSize));
    const startRow = Math.max(0, Math.floor((minZ - bounds.minZ) / bounds.cellSize));
    const endRow = Math.min(rows - 1, Math.floor((maxZ - bounds.minZ) / bounds.cellSize));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = cells[r][c];
        cell.walkable = false;
        cell.blockedBy = blockedBy;
        cell.obstacleId = obstacleId;
      }
    }

    // Add a soft 1-cell proximity cost halo around obstacles so A* prefers center corridors
    // and string-pulling never cuts across the 0.42m character collision margin
    const haloStartCol = Math.max(0, startCol - 1);
    const haloEndCol = Math.min(cols - 1, endCol + 1);
    const haloStartRow = Math.max(0, startRow - 1);
    const haloEndRow = Math.min(rows - 1, endRow + 1);
    for (let r = haloStartRow; r <= haloEndRow; r++) {
      for (let c = haloStartCol; c <= haloEndCol; c++) {
        if (cells[r][c].walkable) {
          cells[r][c].penaltyCost = Math.max(cells[r][c].penaltyCost, 1.35);
        }
      }
    }
  };

  // 1. Mark default house architectural walls & static fixtures on the same floor
  if (includeDefault) {
    for (const fix of STATIC_HOUSE_FIXTURE_COLLIDERS) {
      if (ignoreSet.has(fix.id)) continue;
      if (Math.abs(fix.y - bounds.floorY) > 1.8) continue;
      if (fix.collisionType === 'STAIRWELL_KEEP_CLEAR') continue;

      if (fix.collisionType === 'ARCHITECTURAL_WALL') {
        markAABBBlocked(fix.x, fix.z, fix.halfW, fix.halfD, 0.06, 'WALL', fix.id);
      } else if (fix.blocksToons) {
        markAABBBlocked(fix.x, fix.z, fix.halfW, fix.halfD, clearance, 'FIXTURE', fix.id);
      }
    }

    // Also mark the interior partition wall segments that divide Kitchen, LivingRoom, Bedroom, Study, and Bathroom
    if (Math.abs(bounds.floorY) < 1.5) {
      // Kitchen East partition (X = -1.15, Z: -7.5 to -1.0)
      markAABBBlocked(-1.15, -4.25, 0.14, 3.25, 0.05, 'WALL', 'part_kitchen_east');
      // Living Room West partition (X = 2.0, Z: -6.2 to 0.5)
      markAABBBlocked(2.0, -2.85, 0.14, 3.35, 0.05, 'WALL', 'part_living_west');
      // Bedroom West partition (X = 2.0, Z: 0.5 to 8.2)
      markAABBBlocked(2.0, 4.35, 0.14, 3.85, 0.05, 'WALL', 'part_bedroom_west');
      // Bathroom East & South partitions
      markAABBBlocked(-2.45, 3.0, 0.14, 2.5, 0.05, 'WALL', 'part_bath_east');
      markAABBBlocked(-3.47, 5.5, 0.98, 0.14, 0.05, 'WALL', 'part_bath_south');
    }
  }

  // 2. Mark custom WorldBlueprint building parts (ROOM_BLOCK walls, WALL_SEGMENT, PILLAR, FENCE, etc.)
  for (const part of customParts) {
    if (ignoreSet.has(part.id)) continue;
    if (Math.abs((part.gridPos.y || 0) - bounds.floorY) > 1.8) continue;
    const pt = (part.partType || '').toUpperCase();
    if (
      pt === 'DOOR' ||
      pt === 'ARCHWAY' ||
      pt === 'DECK_PATIO' ||
      pt === 'FLOOR_PATTERN' ||
      pt === 'WALLPAPER' ||
      pt === 'ROOF_GABLE' ||
      pt === 'ROOF_HIP'
    ) {
      continue;
    }

    const rot = Math.abs(part.rotationY || 0) % Math.PI;
    const isRotated90 = rot > Math.PI * 0.25 && rot < Math.PI * 0.75;
    const rawW = part.width || 1.0;
    const rawD = part.depth || 1.0;
    const effW = isRotated90 ? rawD : rawW;
    const effD = isRotated90 ? rawW : rawD;

    if (pt === 'ROOM_BLOCK') {
      const halfW = effW * 0.5;
      const halfD = effD * 0.5;
      const wallHalf = 0.14;
      const gx = part.gridPos.x;
      const gz = part.gridPos.z;
      // North, South, West, and East perimeter walls (doorway portals are carved in step 4)
      markAABBBlocked(gx, gz - halfD, halfW, wallHalf, 0.05, 'WALL', `${part.id}_north`);
      markAABBBlocked(gx, gz + halfD, halfW, wallHalf, 0.05, 'WALL', `${part.id}_south`);
      markAABBBlocked(gx - halfW, gz, wallHalf, halfD, 0.05, 'WALL', `${part.id}_west`);
      markAABBBlocked(gx + halfW, gz, wallHalf, halfD, 0.05, 'WALL', `${part.id}_east`);
      continue;
    }

    const isWallLike = pt === 'WALL' || pt === 'WALL_SEGMENT' || pt === 'WINDOW' || pt === 'FENCE';
    const prof = getObjectCollisionProfile(part);
    if (!prof.blocksToons && !isWallLike) continue;
    const blockedType = isWallLike ? 'WALL' : 'FIXTURE';
    const halfW = isRotated90 ? prof.halfD : prof.halfW;
    const halfD = isRotated90 ? prof.halfW : prof.halfD;

    markAABBBlocked(
      part.gridPos.x,
      part.gridPos.z,
      halfW,
      halfD,
      blockedType === 'WALL' ? 0.06 : clearance,
      blockedType,
      part.id
    );
  }

  // 3. Mark SmartObject furniture AABBs on the same vertical story
  for (const obj of smartObjects) {
    if (ignoreSet.has(obj.id)) continue;
    if (Math.abs((obj.gridPos.y || 0) - bounds.floorY) > 1.8) continue;
    const box = getSmartObjectCollisionBox(obj);
    if (box.halfW <= 0.01 || box.halfD <= 0.01) continue;
    markAABBBlocked(
      obj.gridPos.x,
      obj.gridPos.z,
      box.halfW,
      box.halfD,
      clearance,
      'FURNITURE',
      obj.id
    );
  }

  // 4. Carve out walkable doorway & archway portals through walls so rooms are always connected!
  for (const portal of portals) {
    if (Math.abs(portal.y - bounds.floorY) > 1.8) continue;
    const halfSpan = Math.max(0.65, portal.width * 0.55);
    const halfDepth = 0.85; // Carve 1.7m deep across the wall threshold
    const minX = portal.axis === 'X' ? portal.x - halfSpan : portal.x - halfDepth;
    const maxX = portal.axis === 'X' ? portal.x + halfSpan : portal.x + halfDepth;
    const minZ = portal.axis === 'Z' ? portal.z - halfSpan : portal.z - halfDepth;
    const maxZ = portal.axis === 'Z' ? portal.z + halfSpan : portal.z + halfDepth;

    const startCol = Math.max(0, Math.floor((minX - bounds.minX) / bounds.cellSize));
    const endCol = Math.min(cols - 1, Math.floor((maxX - bounds.minX) / bounds.cellSize));
    const startRow = Math.max(0, Math.floor((minZ - bounds.minZ) / bounds.cellSize));
    const endRow = Math.min(rows - 1, Math.floor((maxZ - bounds.minZ) / bounds.cellSize));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        cells[r][c].walkable = true;
        cells[r][c].isDoorwayPortal = true;
        cells[r][c].blockedBy = undefined;
        cells[r][c].obstacleId = undefined;
        cells[r][c].penaltyCost = 0.95; // Slight preference for walking cleanly through doorways
      }
    }
  }

  let walkableCount = 0;
  let blockedCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c].walkable) walkableCount++;
      else blockedCount++;
    }
  }

  const total = Math.max(1, walkableCount + blockedCount);
  return {
    bounds,
    cols,
    rows,
    cells,
    walkableCount,
    blockedCount,
    walkableRatio: Math.round((walkableCount / total) * 1000) / 1000,
  };
}

/**
 * Finds the nearest walkable cell in `grid` to a given `(col, row)` using a fast spiral ring search.
 */
export function findNearestWalkableCell(
  grid: NavGrid,
  startCol: number,
  startRow: number,
  maxRadiusCells: number = 12
): NavGridCell {
  const clampedCol = Math.max(0, Math.min(grid.cols - 1, startCol));
  const clampedRow = Math.max(0, Math.min(grid.rows - 1, startRow));
  if (grid.cells[clampedRow][clampedCol].walkable) {
    return grid.cells[clampedRow][clampedCol];
  }

  let bestCell = grid.cells[clampedRow][clampedCol];
  let bestDistSq = Infinity;

  for (let rad = 1; rad <= maxRadiusCells; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
        const nr = clampedRow + dr;
        const nc = clampedCol + dc;
        if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;
        const cand = grid.cells[nr][nc];
        if (cand.walkable) {
          const dSq = dr * dr + dc * dc;
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestCell = cand;
          }
        }
      }
    }
    if (bestDistSq < Infinity) {
      return bestCell;
    }
  }

  return bestCell;
}

/**
 * Checks whether a straight 2D line segment on `grid` is completely free of blocked cells
 * and avoids cutting across obstacle proximity halos (`penaltyCost > 1.1`).
 */
export function hasLineOfSightOnNavGrid(
  grid: NavGrid,
  x0: number,
  z0: number,
  x1: number,
  z1: number
): boolean {
  const dist = Math.hypot(x1 - x0, z1 - z0);
  if (dist < grid.bounds.cellSize * 0.5) return true;

  const sampleStep = grid.bounds.cellSize * 0.45;
  const steps = Math.ceil(dist / sampleStep);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sx = x0 + (x1 - x0) * t;
    const sz = z0 + (z1 - z0) * t;
    const { col, row } = worldToGridCell(grid, sx, sz);
    const cell = grid.cells[row][col];
    if (!cell.walkable || cell.penaltyCost > 1.1) {
      return false;
    }
  }
  return true;
}

/**
 * Computes a collision-free A* path of 3D waypoints from `startPos` to `goalPos`,
 * routing around all furniture assets, interior/exterior walls, `worldBlueprint` building parts,
 * and through doorways/stairwells.
 */
export function findPathWaypoints(params: {
  startPos: WorldPoint3D;
  goalPos: WorldPoint3D;
  smartObjects: SmartObject[];
  activeObjectId?: string;
  customParts?: CustomPartCollider[];
  worldBlueprint?: WorldBlueprintNavInput;
  includeDefaultHouseWalls?: boolean;
  doorwayPortals?: DoorwayPortal[];
  bounds?: Partial<NavGridBounds>;
}): {
  waypoints: WorldPoint3D[];
  foundExactPath: boolean;
  totalPathDistance: number;
  navGrid: NavGrid;
} {
  const { startPos, goalPos, smartObjects, activeObjectId } = params;

  // Handle multi-story transitions via stairwell portals first
  if (Math.abs(startPos.y - goalPos.y) > 1.2) {
    const stairwellGround =
      goalPos.y > 1.2 || startPos.y > 1.2
        ? { x: 0.95, y: 0, z: 1.8 } // Upstairs staircase foot
        : { x: -1.8, y: 0, z: 1.7 }; // Basement stairwell entry

    const firstLeg = findPathWaypoints({
      ...params,
      goalPos: { x: stairwellGround.x, y: startPos.y, z: stairwellGround.z },
    });
    const secondLeg = findPathWaypoints({
      ...params,
      startPos: { x: stairwellGround.x, y: goalPos.y, z: stairwellGround.z },
      goalPos,
    });

    const combined = [
      ...firstLeg.waypoints,
      { x: stairwellGround.x, y: goalPos.y, z: stairwellGround.z },
      ...secondLeg.waypoints,
    ];
    let dist = 0;
    for (let i = 1; i < combined.length; i++) {
      dist += Math.hypot(
        combined[i].x - combined[i - 1].x,
        combined[i].y - combined[i - 1].y,
        combined[i].z - combined[i - 1].z
      );
    }
    return {
      waypoints: combined,
      foundExactPath: firstLeg.foundExactPath && secondLeg.foundExactPath,
      totalPathDistance: Math.round(dist * 100) / 100,
      navGrid: secondLeg.navGrid,
    };
  }

  // Only allow ignoring activeObjectId when it is a sit/lie/swim surface AND the goal is inside its footprint.
  // For all solid smart objects (or when routing around a sofa/bed to its front), keep its AABB blocked so A* routes around it!
  const ignoreIds: string[] = [];
  if (activeObjectId && isWalkInInteractiveObject(activeObjectId)) {
    const activeObj = smartObjects.find((o) => o.id === activeObjectId);
    if (activeObj) {
      const box = getSmartObjectCollisionBox(activeObj);
      const goalInside =
        Math.abs(goalPos.x - activeObj.gridPos.x) <= box.halfW + 0.45 &&
        Math.abs(goalPos.z - activeObj.gridPos.z) <= box.halfD + 0.45;
      if (goalInside) {
        ignoreIds.push(activeObjectId);
      }
    }
  }

  const navGrid = buildNavGridForBounds({
    bounds: {
      ...params.bounds,
      floorY: goalPos.y,
    },
    smartObjects,
    customParts: params.customParts,
    worldBlueprint: params.worldBlueprint,
    includeDefaultHouseWalls: params.includeDefaultHouseWalls,
    doorwayPortals: params.doorwayPortals,
    ignoreObjectIds: ignoreIds,
  });

  const rawStart = worldToGridCell(navGrid, startPos.x, startPos.z);
  const rawGoal = worldToGridCell(navGrid, goalPos.x, goalPos.z);

  const startCell = findNearestWalkableCell(navGrid, rawStart.col, rawStart.row, 12);
  const goalCell = findNearestWalkableCell(navGrid, rawGoal.col, rawGoal.row, 12);

  if (startCell.col === goalCell.col && startCell.row === goalCell.row) {
    return {
      waypoints: [{ x: goalPos.x, y: goalPos.y, z: goalPos.z }],
      foundExactPath: true,
      totalPathDistance: Math.hypot(goalPos.x - startPos.x, goalPos.z - startPos.z),
      navGrid,
    };
  }

  // Fast check: if straight line-of-sight is clear on the NavGrid, only 1 waypoint needed!
  if (hasLineOfSightOnNavGrid(navGrid, startPos.x, startPos.z, goalCell.worldX, goalCell.worldZ)) {
    const dist = Math.hypot(goalPos.x - startPos.x, goalPos.z - startPos.z);
    return {
      waypoints: [{ x: goalCell.worldX, y: goalPos.y, z: goalCell.worldZ }],
      foundExactPath: true,
      totalPathDistance: Math.round(dist * 100) / 100,
      navGrid,
    };
  }

  // 8-directional A* Search on `navGrid`
  const totalCells = navGrid.cols * navGrid.rows;
  const gScore = new Float32Array(totalCells).fill(Infinity);
  const fScore = new Float32Array(totalCells).fill(Infinity);
  const cameFrom = new Int32Array(totalCells).fill(-1);
  const closed = new Uint8Array(totalCells);

  const idxOf = (c: number, r: number) => r * navGrid.cols + c;
  const startIdx = idxOf(startCell.col, startCell.row);
  const goalIdx = idxOf(goalCell.col, goalCell.row);

  const octileHeuristic = (c: number, r: number) => {
    const dx = Math.abs(c - goalCell.col);
    const dy = Math.abs(r - goalCell.row);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
  };

  gScore[startIdx] = 0;
  fScore[startIdx] = octileHeuristic(startCell.col, startCell.row);

  const openList: number[] = [startIdx];
  const dirs: Array<[number, number, number]> = [
    [1, 0, 1.0],
    [-1, 0, 1.0],
    [0, 1, 1.0],
    [0, -1, 1.0],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ];

  let foundGoal = false;
  let closestIdx = startIdx;
  let closestHeuristic = fScore[startIdx];

  while (openList.length > 0) {
    // Pop node with lowest fScore
    let bestPos = 0;
    let bestF = fScore[openList[0]];
    for (let i = 1; i < openList.length; i++) {
      const f = fScore[openList[i]];
      if (f < bestF) {
        bestF = f;
        bestPos = i;
      }
    }
    const currentIdx = openList[bestPos];
    openList[bestPos] = openList[openList.length - 1];
    openList.pop();

    if (currentIdx === goalIdx) {
      foundGoal = true;
      break;
    }

    if (closed[currentIdx]) continue;
    closed[currentIdx] = 1;

    const curRow = Math.floor(currentIdx / navGrid.cols);
    const curCol = currentIdx % navGrid.cols;

    const hCur = octileHeuristic(curCol, curRow);
    if (hCur < closestHeuristic) {
      closestHeuristic = hCur;
      closestIdx = currentIdx;
    }

    for (const [dc, dr, stepCost] of dirs) {
      const nc = curCol + dc;
      const nr = curRow + dr;
      if (nc < 0 || nc >= navGrid.cols || nr < 0 || nr >= navGrid.rows) continue;

      const neighborCell = navGrid.cells[nr][nc];
      if (!neighborCell.walkable) continue;

      // Prevent diagonal corner-cutting across blocked furniture/walls
      if (dc !== 0 && dr !== 0) {
        if (!navGrid.cells[curRow][nc].walkable || !navGrid.cells[nr][curCol].walkable) {
          continue;
        }
      }

      const nIdx = idxOf(nc, nr);
      if (closed[nIdx]) continue;

      const tentativeG = gScore[currentIdx] + stepCost * neighborCell.penaltyCost;
      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = currentIdx;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + octileHeuristic(nc, nr);
        if (!openList.includes(nIdx)) {
          openList.push(nIdx);
        }
      }
    }
  }

  // Reconstruct raw grid path
  const targetIdx = foundGoal ? goalIdx : closestIdx;
  const rawPoints: WorldPoint3D[] = [];
  let trace = targetIdx;
  let safety = 0;
  while (trace !== -1 && safety < totalCells) {
    safety++;
    const r = Math.floor(trace / navGrid.cols);
    const c = trace % navGrid.cols;
    const cell = navGrid.cells[r][c];
    rawPoints.push({ x: cell.worldX, y: goalPos.y, z: cell.worldZ });
    if (trace === startIdx) break;
    trace = cameFrom[trace];
  }
  rawPoints.reverse();

  // Ensure exact goal coordinate is at the tail if walkable
  if (foundGoal) {
    rawPoints.push({ x: goalCell.worldX, y: goalPos.y, z: goalCell.worldZ });
  }

  // String-pulling path smoothing via Line-of-Sight checks so toons walk natural smooth arcs
  const smoothed: WorldPoint3D[] = [];
  if (rawPoints.length > 0) {
    let anchor = { x: startPos.x, y: goalPos.y, z: startPos.z };
    let idx = 0;
    while (idx < rawPoints.length) {
      let furthestVisible = idx;
      for (let probe = rawPoints.length - 1; probe > idx; probe--) {
        if (
          hasLineOfSightOnNavGrid(
            navGrid,
            anchor.x,
            anchor.z,
            rawPoints[probe].x,
            rawPoints[probe].z
          )
        ) {
          furthestVisible = probe;
          break;
        }
      }
      const chosen = rawPoints[furthestVisible];
      smoothed.push(chosen);
      anchor = chosen;
      idx = furthestVisible + 1;
    }
  } else {
    smoothed.push({ x: goalCell.worldX, y: goalPos.y, z: goalCell.worldZ });
  }

  let totalPathDistance = 0;
  let prev = startPos;
  for (const wp of smoothed) {
    totalPathDistance += Math.hypot(wp.x - prev.x, wp.z - prev.z);
    prev = wp;
  }

  return {
    waypoints: smoothed,
    foundExactPath: foundGoal,
    totalPathDistance: Math.round(totalPathDistance * 100) / 100,
    navGrid,
  };
}

/**
 * Selects the best walkable, A*-reachable interaction approach point around `obj` from `startPos`.
 * If a recently placed SmartObject or custom wall obstructs the default interaction side of `obj`,
 * this automatically evaluates candidate approach points around `obj`'s perimeter on the `worldBlueprint`
 * NavGrid and picks the nearest reachable, collision-free side so toons never get trapped behind it!
 */
export function resolveReachableApproachPoint(params: {
  obj: SmartObject;
  startPos: WorldPoint3D;
  smartObjects: SmartObject[];
  worldBlueprint?: WorldBlueprintNavInput;
  customParts?: CustomPartCollider[];
  includeDefaultHouseWalls?: boolean;
  slotIndex?: number;
}): {
  pos: WorldPoint3D;
  lookAtPos: WorldPoint3D;
  waypoints: WorldPoint3D[];
  foundExactPath: boolean;
} {
  const {
    obj,
    startPos,
    smartObjects,
    worldBlueprint,
    customParts,
    includeDefaultHouseWalls,
    slotIndex = 0,
  } = params;

  const defaultApproach = getInteractionApproachPoint(obj, slotIndex);
  const box = getSmartObjectCollisionBox(obj);
  const gx = obj.gridPos.x;
  const gy = obj.gridPos.y;
  const gz = obj.gridPos.z;
  const standW = box.halfW + 0.78;
  const standD = box.halfD + 0.78;

  // Candidate approach points ordered by preference: default side first, then cardinal sides & diagonals
  const candidates: WorldPoint3D[] = [
    defaultApproach.pos,
    { x: gx, y: gy, z: gz + standD }, // South (+Z)
    { x: gx, y: gy, z: gz - standD }, // North (-Z)
    { x: gx + standW, y: gy, z: gz }, // East (+X)
    { x: gx - standW, y: gy, z: gz }, // West (-X)
    { x: gx + standW * 0.85, y: gy, z: gz + standD * 0.85 }, // SE
    { x: gx - standW * 0.85, y: gy, z: gz + standD * 0.85 }, // SW
    { x: gx + standW * 0.85, y: gy, z: gz - standD * 0.85 }, // NE
    { x: gx - standW * 0.85, y: gy, z: gz - standD * 0.85 }, // NW
  ];

  // Build NavGrid once for the target floor to evaluate candidate walkability and A* reachability
  const navGrid = buildNavGridForBounds({
    bounds: { floorY: gy },
    smartObjects,
    customParts,
    worldBlueprint,
    includeDefaultHouseWalls,
    ignoreObjectIds: isWalkInInteractiveObject(obj.id) ? [obj.id] : [],
  });

  let bestCandidate = defaultApproach.pos;
  let bestWaypoints: WorldPoint3D[] = [defaultApproach.pos];
  let bestFoundExact = false;
  let bestScore = Infinity;

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const cellCoord = worldToGridCell(navGrid, cand.x, cand.z);
    const cell = navGrid.cells[cellCoord.row][cellCoord.col];

    // If the candidate cell itself is blocked on the NavGrid (e.g. by a recently placed smart object),
    // skip it unless it's the only fallback
    if (!cell.walkable && i > 0) continue;

    const pathRes = findPathWaypoints({
      startPos,
      goalPos: cand,
      smartObjects,
      activeObjectId: obj.id,
      customParts,
      worldBlueprint,
      includeDefaultHouseWalls,
    });

    const preferencePenalty = i === 0 ? 0 : 0.8 + i * 0.15;
    const score =
      (pathRes.foundExactPath ? 0 : 500) +
      (cell.walkable ? 0 : 120) +
      pathRes.totalPathDistance +
      preferencePenalty;

    if (score < bestScore) {
      bestScore = score;
      bestCandidate = cell.walkable
        ? { x: cand.x, y: gy, z: cand.z }
        : { x: cell.worldX, y: gy, z: cell.worldZ };
      bestWaypoints = pathRes.waypoints;
      bestFoundExact = pathRes.foundExactPath;
      // If the default approach point is walkable and has a direct/exact A* path, accept immediately
      if (i === 0 && cell.walkable && pathRes.foundExactPath) {
        break;
      }
    }
  }

  return {
    pos: bestCandidate,
    lookAtPos: defaultApproach.lookAtPos,
    waypoints: bestWaypoints,
    foundExactPath: bestFoundExact,
  };
}

export interface ToonPathAgentState {
  charId: string;
  goalKey: string;
  waypoints: WorldPoint3D[];
  currentWaypointIndex: number;
  stuckTimeSeconds: number;
  lastPos: WorldPoint3D;
  repathCount: number;
}

/**
 * Advances a character 3D rig along its A* waypoint path for one frame (`delta` seconds),
 * with automatic obstacle-avoidance tangent sliding and anti-stuck recovery across the `worldBlueprint`
 * grid so toons NEVER get stuck behind recently placed smart objects!
 */
export function advanceToonAlongPath(params: {
  char: Character;
  currentRigPos: WorldPoint3D;
  resolvedGoal: WorldPoint3D;
  delta: number;
  smartObjects: SmartObject[];
  liveResolvedChars: Character[];
  customParts?: CustomPartCollider[];
  worldBlueprint?: WorldBlueprintNavInput;
  includeDefaultHouseWalls?: boolean;
  agentStateMap: Map<string, ToonPathAgentState>;
  walkSpeed?: number;
}): {
  nextPos: WorldPoint3D;
  lookTarget: WorldPoint3D;
  isMoving: boolean;
  wasUnstuck: boolean;
  activeWaypoints: WorldPoint3D[];
} {
  const {
    char,
    currentRigPos,
    resolvedGoal,
    delta,
    smartObjects,
    liveResolvedChars,
    worldBlueprint,
    agentStateMap,
    walkSpeed = 2.35,
  } = params;

  const customParts = worldBlueprint?.placedParts ?? params.customParts ?? [];
  const includeDefaultHouseWalls =
    params.includeDefaultHouseWalls ??
    (worldBlueprint !== undefined ? !worldBlueprint.isEmptyGridMode : customParts.length === 0);

  // If the character's current rig position is inside an asset AABB (e.g. a SmartObject was just placed on top of them),
  // immediately eject outside the AABB
  const unclippedStart = resolveFurnitureCollision(
    currentRigPos,
    smartObjects,
    char.activeObjectId,
    [],
    char.id,
    customParts,
    includeDefaultHouseWalls
  );
  const startDrift = Math.hypot(
    unclippedStart.x - currentRigPos.x,
    unclippedStart.z - currentRigPos.z
  );
  const effectiveRigPos = startDrift > 0.04 ? unclippedStart : currentRigPos;

  // Also ensure the goal itself is not inside a recently placed SmartObject
  const safeGoal = resolveFurnitureCollision(
    resolvedGoal,
    smartObjects,
    char.activeObjectId,
    [],
    char.id,
    customParts,
    includeDefaultHouseWalls
  );

  const distToFinalGoal = Math.hypot(
    safeGoal.x - effectiveRigPos.x,
    safeGoal.y - effectiveRigPos.y,
    safeGoal.z - effectiveRigPos.z
  );

  const maxStep = Math.max(0.015, walkSpeed * Math.min(0.15, delta));

  // Encode obstacle positions in goalKey so placing or moving any SmartObject or WorldBlueprint part
  // immediately invalidates the cached path and triggers a fresh A* search!
  const obstacleSig = computeObstacleSignature(
    smartObjects,
    customParts,
    includeDefaultHouseWalls
  );
  const goalKey = `${Math.round(safeGoal.x * 4) / 4}:${Math.round(safeGoal.y * 2) / 2}:${Math.round(safeGoal.z * 4) / 4}:${char.activeObjectId || ''}:${obstacleSig}`;
  let state = agentStateMap.get(char.id);

  // Already arrived at destination (and no obstacle between effectiveRigPos and safeGoal)!
  if (distToFinalGoal <= 0.14 || distToFinalGoal <= maxStep) {
    agentStateMap.delete(char.id);
    return {
      nextPos: { ...safeGoal },
      lookTarget: char.lookAtPos || safeGoal,
      isMoving: false,
      wasUnstuck: startDrift > 0.04,
      activeWaypoints: [],
    };
  }

  // Compute or refresh A* path when destination or any SmartObject / WorldBlueprint obstacle changes
  if (!state || state.goalKey !== goalKey || state.currentWaypointIndex >= state.waypoints.length) {
    const pathResult = findPathWaypoints({
      startPos: effectiveRigPos,
      goalPos: safeGoal,
      smartObjects,
      activeObjectId: char.activeObjectId,
      customParts,
      worldBlueprint,
      includeDefaultHouseWalls,
    });
    state = {
      charId: char.id,
      goalKey,
      waypoints: pathResult.waypoints,
      currentWaypointIndex: 0,
      stuckTimeSeconds: 0,
      lastPos: { ...effectiveRigPos },
      repathCount: state ? state.repathCount : 0,
    };
    agentStateMap.set(char.id, state);
  }

  // Advance waypoint index if close enough to intermediate waypoint
  while (state.currentWaypointIndex < state.waypoints.length - 1) {
    const wp = state.waypoints[state.currentWaypointIndex];
    const dWp = Math.hypot(wp.x - effectiveRigPos.x, wp.z - effectiveRigPos.z);
    if (dWp <= 0.42) {
      state.currentWaypointIndex++;
    } else {
      break;
    }
  }

  const targetWp = state.waypoints[state.currentWaypointIndex] || safeGoal;

  const dx = targetWp.x - effectiveRigPos.x;
  const dy = targetWp.y - effectiveRigPos.y;
  const dz = targetWp.z - effectiveRigPos.z;
  const distToWp = Math.max(0.0001, Math.hypot(dx, dy, dz));

  const stepLen = Math.min(maxStep, distToWp);
  const dirX = dx / distToWp;
  const dirY = dy / distToWp;
  const dirZ = dz / distToWp;

  const desiredStep = {
    x: effectiveRigPos.x + dirX * stepLen,
    y: effectiveRigPos.y + dirY * stepLen,
    z: effectiveRigPos.z + dirZ * stepLen,
  };

  let safeStep = resolveFurnitureCollision(
    desiredStep,
    smartObjects,
    char.activeObjectId,
    liveResolvedChars,
    char.id,
    customParts,
    includeDefaultHouseWalls
  );

  let actualMoved = Math.hypot(
    safeStep.x - currentRigPos.x,
    safeStep.y - currentRigPos.y,
    safeStep.z - currentRigPos.z
  );
  const progressTowardWp =
    distToWp - Math.hypot(targetWp.x - safeStep.x, targetWp.z - safeStep.z);

  let wasUnstuck = startDrift > 0.04;

  // Dynamic tangent sliding if primary step is blocked or slowed by a furniture edge/corner or another toon
  if ((actualMoved < stepLen * 0.65 || progressTowardWp < stepLen * 0.4) && distToFinalGoal > 0.22) {
    const slideAngles = [
      Math.PI / 6,
      -Math.PI / 6,
      Math.PI / 3,
      -Math.PI / 3,
      Math.PI / 2,
      -Math.PI / 2,
      (2 * Math.PI) / 3,
      -(2 * Math.PI) / 3,
    ];
    let bestSlideStep = safeStep;
    let bestSlideProgress = progressTowardWp;
    for (const ang of slideAngles) {
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const rotDirX = dirX * cosA - dirZ * sinA;
      const rotDirZ = dirX * sinA + dirZ * cosA;
      const candStep = {
        x: effectiveRigPos.x + rotDirX * stepLen,
        y: effectiveRigPos.y + dirY * stepLen,
        z: effectiveRigPos.z + rotDirZ * stepLen,
      };
      const resolvedCand = resolveFurnitureCollision(
        candStep,
        smartObjects,
        char.activeObjectId,
        [], // Allow sliding past other toons in tight hallways
        char.id,
        customParts,
        includeDefaultHouseWalls
      );
      const movedCand = Math.hypot(
        resolvedCand.x - effectiveRigPos.x,
        resolvedCand.z - effectiveRigPos.z
      );
      const candProgress =
        distToWp - Math.hypot(targetWp.x - resolvedCand.x, targetWp.z - resolvedCand.z);
      if (movedCand > stepLen * 0.45 && candProgress > bestSlideProgress) {
        bestSlideProgress = candProgress;
        bestSlideStep = resolvedCand;
        actualMoved = movedCand;
      }
    }
    safeStep = bestSlideStep;
  }

  // Track stuck timer & trigger automatic A* unstick + repath if toon fails to make forward progress
  const distFromLastPos = Math.hypot(
    safeStep.x - state.lastPos.x,
    safeStep.z - state.lastPos.z
  );
  if (actualMoved < 0.004 || distFromLastPos < stepLen * 0.15) {
    state.stuckTimeSeconds += delta;
  } else {
    state.stuckTimeSeconds = Math.max(0, state.stuckTimeSeconds - delta * 2);
  }

  if (state.stuckTimeSeconds >= 0.25) {
    // Immediate anti-stuck recovery: build a slightly finer NavGrid with extra clearance,
    // snap to the nearest walkable cell, recompute A* path, and step directly toward the detour waypoint!
    wasUnstuck = true;
    state.stuckTimeSeconds = 0;
    state.repathCount++;

    const finePath = findPathWaypoints({
      startPos: effectiveRigPos,
      goalPos: safeGoal,
      smartObjects,
      activeObjectId: char.activeObjectId,
      customParts,
      worldBlueprint,
      includeDefaultHouseWalls,
      bounds: {
        cellSize: 0.4,
        floorY: safeGoal.y,
      },
    });
    const rawStartCell = worldToGridCell(
      finePath.navGrid,
      effectiveRigPos.x,
      effectiveRigPos.z
    );
    const openStartCell = findNearestWalkableCell(
      finePath.navGrid,
      rawStartCell.col,
      rawStartCell.row,
      14
    );

    state.waypoints = finePath.waypoints;
    const nextIdx =
      finePath.waypoints.length > 1 &&
      Math.hypot(
        finePath.waypoints[0].x - effectiveRigPos.x,
        finePath.waypoints[0].z - effectiveRigPos.z
      ) < 0.45
        ? 1
        : 0;
    state.currentWaypointIndex = nextIdx;

    const emergencyWp =
      finePath.waypoints[nextIdx] || {
        x: openStartCell.worldX,
        y: safeGoal.y,
        z: openStartCell.worldZ,
      };
    const eDx = emergencyWp.x - effectiveRigPos.x;
    const eDz = emergencyWp.z - effectiveRigPos.z;
    const eDist = Math.max(0.001, Math.hypot(eDx, eDz));
    const nudgeDist = Math.min(Math.max(stepLen * 1.35, 0.35), eDist);
    safeStep = resolveFurnitureCollision(
      {
        x: effectiveRigPos.x + (eDx / eDist) * nudgeDist,
        y: emergencyWp.y,
        z: effectiveRigPos.z + (eDz / eDist) * nudgeDist,
      },
      smartObjects,
      char.activeObjectId,
      [],
      char.id,
      customParts,
      includeDefaultHouseWalls
    );
  }

  state.lastPos = { ...safeStep };

  const remainingToGoal = Math.hypot(
    safeGoal.x - safeStep.x,
    safeGoal.y - safeStep.y,
    safeGoal.z - safeStep.z
  );

  return {
    nextPos: safeStep,
    lookTarget: targetWp,
    isMoving: remainingToGoal > 0.12,
    wasUnstuck,
    activeWaypoints: state.waypoints.slice(state.currentWaypointIndex),
  };
}
