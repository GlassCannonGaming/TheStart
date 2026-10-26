/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SmartObject,
  getInteractionApproachPoint,
  declipAllSmartObjects,
} from './simulation';
import {
  PlacedBuildingPart,
  WorldBlueprint,
} from './worldBuilder';
import {
  NavGrid,
  DoorwayPortal,
  WorldPoint3D,
  buildNavGridForBounds,
  findPathWaypoints,
} from './pathfinding';

export type PremadeRoomType =
  | 'Kitchen'
  | 'LivingRoom'
  | 'Bedroom'
  | 'Bathroom'
  | 'Study'
  | 'Hallway'
  | 'Patio';

export type PremadeRoomShape =
  | 'RECTANGLE'
  | 'L_SHAPE'
  | 'BAY_ALCOVE'
  | 'CORNER_SUITE'
  | 'COMPACT';

export type CardinalWall = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

export interface RoomDoorwaySocket {
  id: string;
  label: string;
  wall: CardinalWall;
  /** Offset along the wall relative to room center (meters) */
  offsetMeters: number;
  widthMeters: number;
  doorStyle: 'HINGED_DOOR' | 'OPEN_ARCH' | 'PRIVACY_DOOR' | 'FRENCH_PATIO_DOOR';
  /** Local coordinates (x, z) of the doorway threshold relative to room origin (0,0) */
  localThresholdPos: { x: number; z: number };
  /** Allowed room types that can connect to this socket */
  allowedAdjacentRoomTypes: PremadeRoomType[];
  /** Whether this socket can serve as an exterior yard entrance */
  allowsExteriorExit: boolean;
}

export interface RoomConnectionConditions {
  requiresDoorwayAlignment: boolean;
  minSharedWallLengthMeters: number;
  mustMaintainExteriorWindowWalls: CardinalWall[];
  requiresPrivacyDoor: boolean;
  forbiddenDirectConnections: PremadeRoomType[];
  maxStoryLevel: number;
  connectionNotes: string;
}

export interface MappedFixturePath {
  socketId: string;
  socketLabel: string;
  objectId: string;
  objectName: string;
  interactionPoint: WorldPoint3D;
  waypoints: WorldPoint3D[];
  distanceMeters: number;
  reachable: boolean;
}

export interface RoomPathingMap {
  cellSize: number;
  cols: number;
  rows: number;
  walkableCells: number;
  blockedCells: number;
  walkableRatio: number;
  /** Compact 2D matrix: 0 = blocked (furniture/wall), 1 = walkable floor, 2 = doorway portal, 3 = mapped A* path */
  matrix: number[][];
  entryToFixturePaths: MappedFixturePath[];
  reachabilityScore100: number;
  isFullyNavigable: boolean;
}

export interface PremadeRoomVariantDesign {
  variantType: 'EMPTY' | 'FURNISHED';
  description: string;
  placedParts: PlacedBuildingPart[];
  smartObjects: SmartObject[];
  wallpaperId: string;
  floorPatternId: string;
  mappedPathing: RoomPathingMap;
}

export interface PremadeRoomTemplate {
  id: string;
  name: string;
  roomType: PremadeRoomType;
  shape: PremadeRoomShape;
  widthMeters: number;
  depthMeters: number;
  areaSqMeters: number;
  costEmpty: number;
  costFurnished: number;
  summary: string;
  doorwaySockets: RoomDoorwaySocket[];
  connectionConditions: RoomConnectionConditions;
  emptyVariant: PremadeRoomVariantDesign;
  furnishedVariant: PremadeRoomVariantDesign;
  isCustomUserRoom?: boolean;
  createdAt?: string;
}

const OPPOSITE_WALL: Record<CardinalWall, CardinalWall> = {
  NORTH: 'SOUTH',
  SOUTH: 'NORTH',
  EAST: 'WEST',
  WEST: 'EAST',
};

/**
 * Generates the architectural shell (`PlacedBuildingPart[]`) for a room template
 * given its shape, width, depth, doorway sockets, and window walls.
 */
export function buildRoomShellParts(params: {
  roomPrefix: string;
  roomType: PremadeRoomType;
  shape: PremadeRoomShape;
  width: number;
  depth: number;
  doorwaySockets: RoomDoorwaySocket[];
  windowWalls: CardinalWall[];
  wallColorHex: string;
  floorColorHex: string;
}): PlacedBuildingPart[] {
  const {
    roomPrefix,
    roomType,
    shape,
    width,
    depth,
    doorwaySockets,
    windowWalls,
    wallColorHex,
    floorColorHex,
  } = params;

  const parts: PlacedBuildingPart[] = [];
  const halfW = width * 0.5;
  const halfD = depth * 0.5;

  // 1. Primary Floor Slab(s) based on shape
  parts.push({
    id: `${roomPrefix}_slab_main`,
    partId: `room_slab_${roomType.toLowerCase()}`,
    name: `${roomType} Floor Foundation`,
    category: 'rooms_walls',
    partType: 'ROOM_BLOCK',
    roomTag: roomType,
    gridPos: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    width,
    depth,
    height: 0.16,
    colorHex: floorColorHex,
  });

  if (shape === 'L_SHAPE') {
    parts.push({
      id: `${roomPrefix}_slab_wing`,
      partId: `room_slab_${roomType.toLowerCase()}_wing`,
      name: `${roomType} L-Wing Extension`,
      category: 'rooms_walls',
      partType: 'ROOM_BLOCK',
      roomTag: roomType,
      gridPos: { x: halfW * 0.35, y: 0, z: halfD * 0.35 },
      rotationY: 0,
      width: Math.round(width * 0.55 * 10) / 10,
      depth: Math.round(depth * 0.55 * 10) / 10,
      height: 0.16,
      colorHex: floorColorHex,
    });
  } else if (shape === 'BAY_ALCOVE') {
    parts.push({
      id: `${roomPrefix}_slab_bay`,
      partId: `room_slab_${roomType.toLowerCase()}_bay`,
      name: `${roomType} Sunlit Bay Alcove`,
      category: 'rooms_walls',
      partType: 'ROOM_BLOCK',
      roomTag: roomType,
      gridPos: { x: 0, y: 0, z: -halfD - 0.6 },
      rotationY: 0,
      width: Math.max(2.4, Math.round(width * 0.5 * 10) / 10),
      depth: 1.4,
      height: 0.16,
      colorHex: floorColorHex,
    });
  }

  // 2. Perimeter Walls with Doorway Cutouts
  const buildWallSegmentsWithSockets = (
    wall: CardinalWall,
    fixedCoord: number,
    spanLen: number
  ) => {
    const isHorizontal = wall === 'NORTH' || wall === 'SOUTH';
    const rotY = isHorizontal ? 0 : Math.PI / 2;
    const socketsOnWall = doorwaySockets
      .filter((s) => s.wall === wall)
      .sort((a, b) => a.offsetMeters - b.offsetMeters);

    const minC = -spanLen * 0.5;
    const maxC = spanLen * 0.5;
    let cursor = minC;
    let segIdx = 0;

    for (const sock of socketsOnWall) {
      const openStart = Math.max(minC + 0.3, sock.offsetMeters - sock.widthMeters * 0.5);
      const openEnd = Math.min(maxC - 0.3, sock.offsetMeters + sock.widthMeters * 0.5);

      if (openStart > cursor + 0.25) {
        const segLen = Math.round((openStart - cursor) * 100) / 100;
        const mid = Math.round((cursor + segLen * 0.5) * 100) / 100;
        parts.push({
          id: `${roomPrefix}_wall_${wall.toLowerCase()}_${segIdx++}`,
          partId: 'wall_interior_partition',
          name: `${wall} Wall Segment`,
          category: 'rooms_walls',
          partType: 'WALL_SEGMENT',
          roomTag: roomType,
          gridPos: isHorizontal
            ? { x: mid, y: 0, z: fixedCoord }
            : { x: fixedCoord, y: 0, z: mid },
          rotationY: rotY,
          width: segLen,
          depth: 0.26,
          height: 2.8,
          colorHex: wallColorHex,
        });
      }

      // Place the Door or Open Archway part at the socket
      parts.push({
        id: `${roomPrefix}_door_${sock.id}`,
        partId: sock.doorStyle === 'PRIVACY_DOOR' ? 'door_bathroom_privacy' : 'door_craftsman_oak',
        name: sock.label,
        category: 'doors_windows',
        partType: sock.doorStyle === 'OPEN_ARCH' ? 'ARCHWAY' : 'DOOR',
        roomTag: roomType,
        gridPos: isHorizontal
          ? { x: sock.offsetMeters, y: 0, z: fixedCoord }
          : { x: fixedCoord, y: 0, z: sock.offsetMeters },
        rotationY: rotY,
        width: sock.widthMeters,
        depth: 0.28,
        height: 2.35,
        colorHex: sock.doorStyle === 'PRIVACY_DOOR' ? '#f8fafc' : '#582f0e',
      });

      cursor = openEnd;
    }

    if (maxC > cursor + 0.25) {
      const segLen = Math.round((maxC - cursor) * 100) / 100;
      const mid = Math.round((cursor + segLen * 0.5) * 100) / 100;
      parts.push({
        id: `${roomPrefix}_wall_${wall.toLowerCase()}_${segIdx++}`,
        partId: 'wall_interior_partition',
        name: `${wall} Wall Segment`,
        category: 'rooms_walls',
        partType: 'WALL_SEGMENT',
        roomTag: roomType,
        gridPos: isHorizontal
          ? { x: mid, y: 0, z: fixedCoord }
          : { x: fixedCoord, y: 0, z: mid },
        rotationY: rotY,
        width: segLen,
        depth: 0.26,
        height: 2.8,
        colorHex: wallColorHex,
      });
    }
  };

  buildWallSegmentsWithSockets('NORTH', -halfD, width);
  buildWallSegmentsWithSockets('SOUTH', halfD, width);
  buildWallSegmentsWithSockets('WEST', -halfW, depth);
  buildWallSegmentsWithSockets('EAST', halfW, depth);

  // 3. Corner Timber/Stone Pillars (Quoins) for clean corner joins
  const corners: Array<[number, number, string]> = [
    [-halfW, -halfD, 'nw'],
    [halfW, -halfD, 'ne'],
    [-halfW, halfD, 'sw'],
    [halfW, halfD, 'se'],
  ];
  for (const [cx, cz, tag] of corners) {
    parts.push({
      id: `${roomPrefix}_pillar_${tag}`,
      partId: 'pillar_corner_quoin',
      name: 'Corner Quoin Pillar',
      category: 'foundations_decks',
      partType: 'PILLAR',
      roomTag: roomType,
      gridPos: { x: cx, y: 0, z: cz },
      rotationY: 0,
      width: 0.34,
      depth: 0.34,
      height: 2.86,
      colorHex: '#4a3525',
    });
  }

  // 4. Exterior Windows on designated window walls (offset from any doorway socket on that wall)
  for (const winWall of windowWalls) {
    const isHorizontal = winWall === 'NORTH' || winWall === 'SOUTH';
    const fixedCoord =
      winWall === 'NORTH'
        ? -halfD
        : winWall === 'SOUTH'
        ? halfD
        : winWall === 'WEST'
        ? -halfW
        : halfW;
    const socketsOnWall = doorwaySockets.filter((s) => s.wall === winWall);
    // Pick a clear offset along the wall for the window
    let winOffset = 0;
    if (socketsOnWall.some((s) => Math.abs(s.offsetMeters - winOffset) < 1.6)) {
      winOffset = (isHorizontal ? width : depth) * 0.26;
    }
    parts.push({
      id: `${roomPrefix}_win_${winWall.toLowerCase()}`,
      partId: 'win_bay_panoramic',
      name: `${roomType} ${winWall} Window`,
      category: 'doors_windows',
      partType: 'WINDOW',
      roomTag: roomType,
      gridPos: isHorizontal
        ? { x: Math.round(winOffset * 100) / 100, y: 0.9, z: fixedCoord }
        : { x: fixedCoord, y: 0.9, z: Math.round(winOffset * 100) / 100 },
      rotationY: isHorizontal ? 0 : Math.PI / 2,
      width: 1.8,
      depth: 0.28,
      height: 1.45,
      colorHex: '#38bdf8',
    });
  }

  return parts;
}

/**
 * Computes a complete `RoomPathingMap` for any room shell + furniture layout,
 * verifying A* paths from every `doorwaySocket` to every `SmartObject` interaction point
 * (and between doorways for circulation corridors).
 */
export function computeRoomPathingMap(params: {
  width: number;
  depth: number;
  doorwaySockets: RoomDoorwaySocket[];
  placedParts: PlacedBuildingPart[];
  smartObjects: SmartObject[];
  cellSize?: number;
}): RoomPathingMap {
  const {
    width,
    depth,
    doorwaySockets,
    placedParts,
    smartObjects,
    cellSize = 0.5,
  } = params;

  const halfW = width * 0.5;
  const halfD = depth * 0.5;

  const doorwayPortals: DoorwayPortal[] = doorwaySockets.map((s) => ({
    id: `portal_${s.id}`,
    x: s.localThresholdPos.x,
    z: s.localThresholdPos.z,
    y: 0,
    width: s.widthMeters,
    axis: s.wall === 'NORTH' || s.wall === 'SOUTH' ? 'X' : 'Z',
    connectsRooms: ['Interior', 'Adjacent'],
  }));

  const bounds = {
    minX: -halfW - 0.5,
    maxX: halfW + 0.5,
    minZ: -halfD - 0.5,
    maxZ: halfD + 0.5,
    cellSize,
    floorY: 0,
  };

  const navGrid: NavGrid = buildNavGridForBounds({
    bounds,
    smartObjects,
    customParts: placedParts,
    includeDefaultHouseWalls: false,
    doorwayPortals,
    toonClearanceRadius: 0.28,
  });

  // Initialize compact matrix: 0 = blocked, 1 = walkable, 2 = doorway portal, 3 = mapped path
  const matrix: number[][] = navGrid.cells.map((row) =>
    row.map((cell) => {
      if (cell.isDoorwayPortal) return 2;
      return cell.walkable ? 1 : 0;
    })
  );

  const markWaypointsInMatrix = (waypoints: WorldPoint3D[]) => {
    for (const wp of waypoints) {
      const c = Math.max(
        0,
        Math.min(navGrid.cols - 1, Math.floor((wp.x - bounds.minX) / cellSize))
      );
      const r = Math.max(
        0,
        Math.min(navGrid.rows - 1, Math.floor((wp.z - bounds.minZ) / cellSize))
      );
      if (matrix[r][c] === 1) {
        matrix[r][c] = 3;
      }
    }
  };

  const entryToFixturePaths: MappedFixturePath[] = [];
  let totalChecks = 0;
  let reachableChecks = 0;

  for (let sIdx = 0; sIdx < doorwaySockets.length; sIdx++) {
    const sock = doorwaySockets[sIdx];
    // Step slightly inside the room from the doorway threshold
    const inwardX =
      sock.wall === 'WEST'
        ? sock.localThresholdPos.x + 0.55
        : sock.wall === 'EAST'
        ? sock.localThresholdPos.x - 0.55
        : sock.localThresholdPos.x;
    const inwardZ =
      sock.wall === 'NORTH'
        ? sock.localThresholdPos.z + 0.55
        : sock.wall === 'SOUTH'
        ? sock.localThresholdPos.z - 0.55
        : sock.localThresholdPos.z;

    // Also trace doorway-to-doorway (or doorway-to-room-center) circulation corridors
    const nextSock = doorwaySockets[(sIdx + 1) % doorwaySockets.length];
    const targetCorridorGoal: WorldPoint3D =
      nextSock && nextSock.id !== sock.id
        ? {
            x:
              nextSock.wall === 'WEST'
                ? nextSock.localThresholdPos.x + 0.55
                : nextSock.wall === 'EAST'
                ? nextSock.localThresholdPos.x - 0.55
                : nextSock.localThresholdPos.x,
            y: 0,
            z:
              nextSock.wall === 'NORTH'
                ? nextSock.localThresholdPos.z + 0.55
                : nextSock.wall === 'SOUTH'
                ? nextSock.localThresholdPos.z - 0.55
                : nextSock.localThresholdPos.z,
          }
        : { x: 0, y: 0, z: 0 };

    const corridorPath = findPathWaypoints({
      startPos: { x: inwardX, y: 0, z: inwardZ },
      goalPos: targetCorridorGoal,
      smartObjects,
      customParts: placedParts,
      includeDefaultHouseWalls: false,
      doorwayPortals,
      bounds,
    });
    markWaypointsInMatrix(corridorPath.waypoints);

    for (const obj of smartObjects) {
      totalChecks++;
      const approach = getInteractionApproachPoint(obj, 0);
      // Clamp interaction point inside room interior so pathing targets inside the room
      const clampedGoal: WorldPoint3D = {
        x: Math.max(-halfW + 0.55, Math.min(halfW - 0.55, approach.pos.x)),
        y: 0,
        z: Math.max(-halfD + 0.55, Math.min(halfD - 0.55, approach.pos.z)),
      };

      const pathRes = findPathWaypoints({
        startPos: { x: inwardX, y: 0, z: inwardZ },
        goalPos: clampedGoal,
        smartObjects,
        activeObjectId: obj.id,
        customParts: placedParts,
        includeDefaultHouseWalls: false,
        doorwayPortals,
        bounds,
      });

      const isReachable = pathRes.waypoints.length > 0;
      if (isReachable) reachableChecks++;
      markWaypointsInMatrix(pathRes.waypoints);

      entryToFixturePaths.push({
        socketId: sock.id,
        socketLabel: sock.label,
        objectId: obj.id,
        objectName: obj.name,
        interactionPoint: clampedGoal,
        waypoints: pathRes.waypoints,
        distanceMeters: pathRes.totalPathDistance,
        reachable: isReachable,
      });
    }
  }

  const reachabilityScore100 =
    totalChecks === 0 ? 100 : Math.round((reachableChecks / totalChecks) * 100);

  return {
    cellSize,
    cols: navGrid.cols,
    rows: navGrid.rows,
    walkableCells: navGrid.walkableCount,
    blockedCells: navGrid.blockedCount,
    walkableRatio: navGrid.walkableRatio,
    matrix,
    entryToFixturePaths,
    reachabilityScore100,
    isFullyNavigable: reachabilityScore100 === 100 && navGrid.walkableRatio >= 0.25,
  };
}

/**
 * Helper to construct a complete `PremadeRoomTemplate` with both an Empty variant
 * and a Furnished variant (with declipped objects & pre-computed A* pathing map).
 */
export function createPremadeRoomTemplate(spec: {
  id: string;
  name: string;
  roomType: PremadeRoomType;
  shape: PremadeRoomShape;
  widthMeters: number;
  depthMeters: number;
  costEmpty: number;
  costFurnished: number;
  summary: string;
  wallpaperId: string;
  floorPatternId: string;
  wallColorHex: string;
  floorColorHex: string;
  windowWalls: CardinalWall[];
  doorwaySockets: RoomDoorwaySocket[];
  connectionConditions: RoomConnectionConditions;
  furnishedObjects: SmartObject[];
  isCustomUserRoom?: boolean;
}): PremadeRoomTemplate {
  const shellParts = buildRoomShellParts({
    roomPrefix: spec.id,
    roomType: spec.roomType,
    shape: spec.shape,
    width: spec.widthMeters,
    depth: spec.depthMeters,
    doorwaySockets: spec.doorwaySockets,
    windowWalls: spec.windowWalls,
    wallColorHex: spec.wallColorHex,
    floorColorHex: spec.floorColorHex,
  });

  const emptyPathing = computeRoomPathingMap({
    width: spec.widthMeters,
    depth: spec.depthMeters,
    doorwaySockets: spec.doorwaySockets,
    placedParts: shellParts,
    smartObjects: [],
  });

  const declippedObjects = declipAllSmartObjects(spec.furnishedObjects, [], false);
  const furnishedPathing = computeRoomPathingMap({
    width: spec.widthMeters,
    depth: spec.depthMeters,
    doorwaySockets: spec.doorwaySockets,
    placedParts: shellParts,
    smartObjects: declippedObjects,
  });

  const areaSqMeters = Math.round(spec.widthMeters * spec.depthMeters * 10) / 10;

  return {
    id: spec.id,
    name: spec.name,
    roomType: spec.roomType,
    shape: spec.shape,
    widthMeters: spec.widthMeters,
    depthMeters: spec.depthMeters,
    areaSqMeters,
    costEmpty: spec.costEmpty,
    costFurnished: spec.costFurnished,
    summary: spec.summary,
    doorwaySockets: spec.doorwaySockets,
    connectionConditions: spec.connectionConditions,
    emptyVariant: {
      variantType: 'EMPTY',
      description: `Unfurnished ${spec.widthMeters}×${spec.depthMeters}m ${spec.shape} ${spec.roomType} shell with carved doorways, windows, wallpaper, and flooring.`,
      placedParts: shellParts,
      smartObjects: [],
      wallpaperId: spec.wallpaperId,
      floorPatternId: spec.floorPatternId,
      mappedPathing: emptyPathing,
    },
    furnishedVariant: {
      variantType: 'FURNISHED',
      description: `Fully furnished ${spec.widthMeters}×${spec.depthMeters}m ${spec.roomType} with ${declippedObjects.length} non-clipping fixtures and 100% verified A* doorway-to-asset pathing.`,
      placedParts: shellParts,
      smartObjects: declippedObjects,
      wallpaperId: spec.wallpaperId,
      floorPatternId: spec.floorPatternId,
      mappedPathing: furnishedPathing,
    },
    isCustomUserRoom: spec.isCustomUserRoom,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Pre-Made Rooms Database containing diverse sizes & shapes for every room type,
 * each with doorway connection conditions, an Empty variant, and a Furnished variant with mapped pathing.
 */
export const PREMADE_ROOMS_DATABASE: PremadeRoomTemplate[] = [
  // 1. KITCHEN — L-SHAPE CHEF'S CULINARY KITCHEN (9m x 7m)
  createPremadeRoomTemplate({
    id: 'premade_kitchen_chef_lshape',
    name: "Chef's L-Wing Culinary Kitchen",
    roomType: 'Kitchen',
    shape: 'L_SHAPE',
    widthMeters: 9.0,
    depthMeters: 7.0,
    costEmpty: 1450,
    costFurnished: 3400,
    summary:
      'Spacious L-shaped culinary kitchen with North patio exit, East foyer archway, South study pass-through, and wide A* walkways around the appliances.',
    wallpaperId: 'wp_terracotta_venetian',
    floorPatternId: 'fl_checkerboard_marble',
    wallColorHex: '#c86d51',
    floorColorHex: '#e2e8f0',
    windowWalls: ['NORTH', 'WEST'],
    doorwaySockets: [
      {
        id: 'sock_kitchen_east_arch',
        label: 'East Foyer Open Archway',
        wall: 'EAST',
        offsetMeters: 0.8,
        widthMeters: 1.8,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: 4.5, z: 0.8 },
        allowedAdjacentRoomTypes: ['LivingRoom', 'Hallway', 'Study'],
        allowsExteriorExit: false,
      },
      {
        id: 'sock_kitchen_south_door',
        label: 'South Study Pass-Through',
        wall: 'SOUTH',
        offsetMeters: -1.8,
        widthMeters: 1.4,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: -1.8, z: 3.5 },
        allowedAdjacentRoomTypes: ['Study', 'Hallway', 'LivingRoom'],
        allowsExteriorExit: false,
      },
      {
        id: 'sock_kitchen_north_patio',
        label: 'North Back Patio Door',
        wall: 'NORTH',
        offsetMeters: 2.2,
        widthMeters: 1.4,
        doorStyle: 'FRENCH_PATIO_DOOR',
        localThresholdPos: { x: 2.2, z: -3.5 },
        allowedAdjacentRoomTypes: ['Patio'],
        allowsExteriorExit: true,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 3.5,
      mustMaintainExteriorWindowWalls: ['WEST'],
      requiresPrivacyDoor: false,
      forbiddenDirectConnections: ['Bedroom'],
      maxStoryLevel: 1,
      connectionNotes:
        'Connects via East Open Arch to Living Room/Foyer and South Arch to Study/Hallway; North door opens to Back Patio.',
    },
    furnishedObjects: [
      {
        id: 'pm_kit_fridge',
        name: 'Retro Frost Refrigerator',
        room: 'Kitchen',
        category: 'kitchen',
        gridPos: { x: -3.1, y: 0, z: -2.4 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { hunger: 45, energy: 5 },
        actionLabel: 'Preparing & eating a homemade meal',
        durationSeconds: 3600,
      },
      {
        id: 'pm_kit_stove',
        name: 'ChefMaster 4-Burner Stove',
        room: 'Kitchen',
        category: 'kitchen',
        gridPos: { x: -0.6, y: 0, z: -2.4 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { hunger: 65, fun: 10 },
        actionLabel: 'Cooking a warm meal',
        durationSeconds: 7200,
      },
      {
        id: 'pm_kit_sink',
        name: 'Farmhouse Stainless Kitchen Sink',
        room: 'Kitchen',
        category: 'kitchen',
        gridPos: { x: 2.2, y: 0, z: -1.8 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { hygiene: 40, sanity: 10 },
        actionLabel: 'Washing hands & dishes at the kitchen sink',
        durationSeconds: 3600,
      },
      {
        id: 'pm_kit_dining',
        name: 'Oak Family Dining Table',
        room: 'Kitchen',
        category: 'kitchen',
        gridPos: { x: -1.4, y: 0, z: 1.1 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { hunger: 55, social: 25 },
        actionLabel: 'Sharing a meal at the dining table',
        durationSeconds: 3600,
      },
    ],
  }),

  // 2. KITCHEN — COMPACT BISTRO GALLEY KITCHEN (6m x 5m)
  createPremadeRoomTemplate({
    id: 'premade_kitchen_compact_galley',
    name: 'Compact Bistro Galley Kitchen',
    roomType: 'Kitchen',
    shape: 'COMPACT',
    widthMeters: 6.0,
    depthMeters: 5.0,
    costEmpty: 900,
    costFurnished: 2150,
    summary:
      'Efficient 6×5m galley kitchen with parallel prep corridor, North window, and South/East doorway sockets.',
    wallpaperId: 'wp_classic_wainscot',
    floorPatternId: 'fl_slate_terracotta',
    wallColorHex: '#f8fafc',
    floorColorHex: '#b45309',
    windowWalls: ['NORTH'],
    doorwaySockets: [
      {
        id: 'sock_galley_south',
        label: 'South Living Archway',
        wall: 'SOUTH',
        offsetMeters: 0,
        widthMeters: 1.5,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: 0, z: 2.5 },
        allowedAdjacentRoomTypes: ['LivingRoom', 'Hallway', 'Study'],
        allowsExteriorExit: false,
      },
      {
        id: 'sock_galley_east',
        label: 'East Hallway Door',
        wall: 'EAST',
        offsetMeters: 0,
        widthMeters: 1.3,
        doorStyle: 'HINGED_DOOR',
        localThresholdPos: { x: 3.0, z: 0 },
        allowedAdjacentRoomTypes: ['Hallway', 'LivingRoom', 'Patio'],
        allowsExteriorExit: true,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 3.0,
      mustMaintainExteriorWindowWalls: ['NORTH'],
      requiresPrivacyDoor: false,
      forbiddenDirectConnections: ['Bathroom'],
      maxStoryLevel: 2,
      connectionNotes: 'Ideal for compact cottages or studio apartments.',
    },
    furnishedObjects: [
      {
        id: 'pm_galley_fridge',
        name: 'Compact Retro Refrigerator',
        room: 'Kitchen',
        category: 'kitchen',
        gridPos: { x: -1.8, y: 0, z: -1.4 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { hunger: 45 },
        actionLabel: 'Grabbing a fresh meal',
        durationSeconds: 3600,
      },
      {
        id: 'pm_galley_stove',
        name: 'Bistro Gas Range',
        room: 'Kitchen',
        category: 'kitchen',
        gridPos: { x: 0.6, y: 0, z: -1.4 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { hunger: 60 },
        actionLabel: 'Simmering bistro soup',
        durationSeconds: 3600,
      },
      {
        id: 'pm_galley_espresso',
        name: 'Italian Brass Espresso Bar',
        room: 'Kitchen',
        category: 'kitchen',
        gridPos: { x: -1.8, y: 0, z: 1.1 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { energy: 35, fun: 15 },
        actionLabel: 'Pulling a double espresso shot',
        durationSeconds: 1800,
      },
    ],
  }),

  // 3. LIVING ROOM — SUNLIT BAY-ALCOVE PARLOR (9m x 7m)
  createPremadeRoomTemplate({
    id: 'premade_living_bay_parlor',
    name: 'Sunlit Bay-Alcove Parlor Living Room',
    roomType: 'LivingRoom',
    shape: 'BAY_ALCOVE',
    widthMeters: 9.0,
    depthMeters: 7.0,
    costEmpty: 1650,
    costFurnished: 3850,
    summary:
      'Architectural parlor with a projecting North sunlit bay alcove, West foyer archway, South bedroom corridor door, and clear social conversation lanes.',
    wallpaperId: 'wp_classic_wainscot',
    floorPatternId: 'fl_herringbone_oak',
    wallColorHex: '#e2e8f0',
    floorColorHex: '#9a6b41',
    windowWalls: ['NORTH', 'EAST'],
    doorwaySockets: [
      {
        id: 'sock_living_west_arch',
        label: 'West Foyer & Kitchen Archway',
        wall: 'WEST',
        offsetMeters: -0.6,
        widthMeters: 2.0,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: -4.5, z: -0.6 },
        allowedAdjacentRoomTypes: ['Kitchen', 'Hallway', 'Study'],
        allowsExteriorExit: false,
      },
      {
        id: 'sock_living_south_door',
        label: 'South Master Wing Door',
        wall: 'SOUTH',
        offsetMeters: -1.5,
        widthMeters: 1.35,
        doorStyle: 'HINGED_DOOR',
        localThresholdPos: { x: -1.5, z: 3.5 },
        allowedAdjacentRoomTypes: ['Bedroom', 'Hallway', 'Study'],
        allowsExteriorExit: true,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 4.0,
      mustMaintainExteriorWindowWalls: ['NORTH', 'EAST'],
      requiresPrivacyDoor: false,
      forbiddenDirectConnections: [],
      maxStoryLevel: 2,
      connectionNotes:
        'Connects via West Arch to Kitchen/Foyer and South Door to Master Bedroom or Courtyard.',
    },
    furnishedObjects: [
      {
        id: 'pm_liv_tv',
        name: 'Vintage Console Television',
        room: 'LivingRoom',
        category: 'living',
        gridPos: { x: 1.5, y: 0, z: -2.3 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 35, social: 10 },
        actionLabel: 'Watching classic cinema on TV',
        durationSeconds: 7200,
      },
      {
        id: 'pm_liv_sofa',
        name: 'Tufted Velvet Parlor Sofa',
        room: 'LivingRoom',
        category: 'living',
        gridPos: { x: 1.2, y: 0, z: 0.6 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { energy: 25, fun: 20, social: 20 },
        actionLabel: 'Lounging & conversing on the sofa',
        durationSeconds: 3600,
      },
      {
        id: 'pm_liv_piano',
        name: 'Concert Upright Mahogany Piano',
        room: 'LivingRoom',
        category: 'living',
        gridPos: { x: -2.6, y: 0, z: -2.1 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 45, sanity: 15 },
        actionLabel: 'Playing a nocturnal sonata on the piano',
        durationSeconds: 5400,
      },
    ],
  }),

  // 4. BEDROOM — CORNER SUITE MASTER BEDROOM (8.5m x 8.0m)
  createPremadeRoomTemplate({
    id: 'premade_bedroom_master_suite',
    name: 'Projecting Corner Master Suite',
    roomType: 'Bedroom',
    shape: 'CORNER_SUITE',
    widthMeters: 8.5,
    depthMeters: 8.0,
    costEmpty: 1550,
    costFurnished: 3950,
    summary:
      'Grand corner master suite with twin East windows, South bay window, West hallway door, and 3 personal toon beds with wide side-aisle pathing.',
    wallpaperId: 'wp_botanical_sage',
    floorPatternId: 'fl_plush_velvet_indigo',
    wallColorHex: '#84a98c',
    floorColorHex: '#312e81',
    windowWalls: ['EAST', 'SOUTH'],
    doorwaySockets: [
      {
        id: 'sock_master_west_door',
        label: 'West Hallway & Foyer Door',
        wall: 'WEST',
        offsetMeters: -1.4,
        widthMeters: 1.3,
        doorStyle: 'HINGED_DOOR',
        localThresholdPos: { x: -4.25, z: -1.4 },
        allowedAdjacentRoomTypes: ['Hallway', 'LivingRoom', 'Study', 'Bathroom'],
        allowsExteriorExit: false,
      },
      {
        id: 'sock_master_north_door',
        label: 'North Parlor / En-Suite Door',
        wall: 'NORTH',
        offsetMeters: -1.8,
        widthMeters: 1.25,
        doorStyle: 'HINGED_DOOR',
        localThresholdPos: { x: -1.8, z: -4.0 },
        allowedAdjacentRoomTypes: ['LivingRoom', 'Bathroom', 'Hallway'],
        allowsExteriorExit: false,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 3.5,
      mustMaintainExteriorWindowWalls: ['EAST', 'SOUTH'],
      requiresPrivacyDoor: true,
      forbiddenDirectConnections: ['Kitchen'],
      maxStoryLevel: 2,
      connectionNotes:
        'Requires hinged door connection to Hallway, LivingRoom, or En-Suite Bathroom.',
    },
    furnishedObjects: [
      {
        id: 'pm_bed_elena',
        name: "Elena's Canopy Feather Bed",
        room: 'Bedroom',
        category: 'bedroom',
        gridPos: { x: 1.8, y: 0, z: 1.8 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { energy: 75, sanity: 15 },
        actionLabel: 'Sleeping peacefully in personal bed',
        durationSeconds: 28800,
        assignedToonId: 'char_elena',
        assignedToonName: 'Elena Vance',
        assignedColorHex: '#4f46e5',
      },
      {
        id: 'pm_bed_marcus',
        name: "Marcus's Mid-Century Walnut Bed",
        room: 'Bedroom',
        category: 'bedroom',
        gridPos: { x: -1.6, y: 0, z: 1.8 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { energy: 75, sanity: 15 },
        actionLabel: 'Sleeping deeply in personal bed',
        durationSeconds: 28800,
        assignedToonId: 'char_marcus',
        assignedToonName: 'Marcus Cole',
        assignedColorHex: '#059669',
      },
      {
        id: 'pm_bed_sophia',
        name: "Sophia's Tufted Linen Bed",
        room: 'Bedroom',
        category: 'bedroom',
        gridPos: { x: 1.8, y: 0, z: -1.8 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { energy: 75, sanity: 15 },
        actionLabel: 'Sleeping soundly in personal bed',
        durationSeconds: 28800,
        assignedToonId: 'char_sophia',
        assignedToonName: 'Sophia Reed',
        assignedColorHex: '#d97706',
      },
    ],
  }),

  // 5. BEDROOM — COZY GUEST BEDROOM (6.0m x 5.5m)
  createPremadeRoomTemplate({
    id: 'premade_bedroom_cozy_guest',
    name: 'Cozy Craftsman Guest Bedroom',
    roomType: 'Bedroom',
    shape: 'RECTANGLE',
    widthMeters: 6.0,
    depthMeters: 5.5,
    costEmpty: 980,
    costFurnished: 2200,
    summary:
      'Comfortable rectangular guest bedroom with reading desk, double bed, South window, and North hallway door.',
    wallpaperId: 'wp_botanical_sage',
    floorPatternId: 'fl_herringbone_oak',
    wallColorHex: '#a3b18a',
    floorColorHex: '#9a6b41',
    windowWalls: ['SOUTH'],
    doorwaySockets: [
      {
        id: 'sock_guest_north',
        label: 'North Hallway Door',
        wall: 'NORTH',
        offsetMeters: 0,
        widthMeters: 1.25,
        doorStyle: 'HINGED_DOOR',
        localThresholdPos: { x: 0, z: -2.75 },
        allowedAdjacentRoomTypes: ['Hallway', 'LivingRoom', 'Study'],
        allowsExteriorExit: false,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 3.0,
      mustMaintainExteriorWindowWalls: ['SOUTH'],
      requiresPrivacyDoor: true,
      forbiddenDirectConnections: ['Kitchen'],
      maxStoryLevel: 2,
      connectionNotes: 'Connects cleanly to any Hallway or Living Room wall.',
    },
    furnishedObjects: [
      {
        id: 'pm_guest_bed',
        name: 'Craftsman Guest Feather Bed',
        room: 'Bedroom',
        category: 'bedroom',
        gridPos: { x: 1.2, y: 0, z: 0.8 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { energy: 72, sanity: 12 },
        actionLabel: 'Resting in the guest bed',
        durationSeconds: 28800,
      },
      {
        id: 'pm_guest_desk',
        name: 'Reading Writing Desk',
        room: 'Bedroom',
        category: 'study',
        gridPos: { x: -1.6, y: 0, z: 0.9 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 25, sanity: 10 },
        actionLabel: 'Journaling at the bedroom desk',
        durationSeconds: 3600,
      },
    ],
  }),

  // 6. BATHROOM — SPA EN-SUITE BATHROOM WITH PRIVACY DOOR (5.0m x 5.0m)
  createPremadeRoomTemplate({
    id: 'premade_bathroom_spa_ensuite',
    name: 'Porcelain Spa Bathroom (With Privacy Door)',
    roomType: 'Bathroom',
    shape: 'RECTANGLE',
    widthMeters: 5.0,
    depthMeters: 5.0,
    costEmpty: 880,
    costFurnished: 2100,
    summary:
      'Complete spa bathroom featuring a carved South privacy door, clawfoot bathtub, porcelain flush toilet, and unobstructed central turnaround pathing.',
    wallpaperId: 'wp_classic_wainscot',
    floorPatternId: 'fl_checkerboard_marble',
    wallColorHex: '#f1f5f9',
    floorColorHex: '#cbd5e1',
    windowWalls: ['EAST'],
    doorwaySockets: [
      {
        id: 'sock_bath_south_privacy',
        label: 'South Privacy Bathroom Door',
        wall: 'SOUTH',
        offsetMeters: 0,
        widthMeters: 1.2,
        doorStyle: 'PRIVACY_DOOR',
        localThresholdPos: { x: 0, z: 2.5 },
        allowedAdjacentRoomTypes: ['Hallway', 'Bedroom', 'Study'],
        allowsExteriorExit: false,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 2.5,
      mustMaintainExteriorWindowWalls: [],
      requiresPrivacyDoor: true,
      forbiddenDirectConnections: ['Kitchen', 'Patio'],
      maxStoryLevel: 2,
      connectionNotes:
        'Always includes a carved Privacy Door; connects to Hallway, Bedroom, or Study vestibule.',
    },
    furnishedObjects: [
      {
        id: 'pm_bath_tub',
        name: 'Porcelain Clawfoot Bathtub',
        room: 'Bathroom',
        category: 'bathroom',
        gridPos: { x: -1.1, y: 0, z: -1.0 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { hygiene: 75, sanity: 12 },
        actionLabel: 'Taking a relaxing warm bath',
        durationSeconds: 3600,
      },
      {
        id: 'pm_bath_toilet',
        name: 'Classic Flush Toilet',
        room: 'Bathroom',
        category: 'bathroom',
        gridPos: { x: 1.2, y: 0, z: -1.1 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { bladder: 85 },
        actionLabel: 'Using the bathroom',
        durationSeconds: 1800,
      },
    ],
  }),

  // 7. STUDY — L-SHAPED SCHOLAR & ARTIST ATELIER (7.5m x 7.0m)
  createPremadeRoomTemplate({
    id: 'premade_study_scholar_atelier',
    name: "Scholar's L-Shaped Atelier & Study",
    roomType: 'Study',
    shape: 'L_SHAPE',
    widthMeters: 7.5,
    depthMeters: 7.0,
    costEmpty: 1320,
    costFurnished: 3150,
    summary:
      'Sunlit West-wing study and painting studio with North kitchen arch, East hallway archway, South picture windows, and wide easel/bookshelf approach zones.',
    wallpaperId: 'wp_midcentury_teak',
    floorPatternId: 'fl_herringbone_oak',
    wallColorHex: '#78350f',
    floorColorHex: '#9a6b41',
    windowWalls: ['SOUTH', 'WEST'],
    doorwaySockets: [
      {
        id: 'sock_study_north_arch',
        label: 'North Kitchen Pass-Through Arch',
        wall: 'NORTH',
        offsetMeters: -1.2,
        widthMeters: 1.5,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: -1.2, z: -3.5 },
        allowedAdjacentRoomTypes: ['Kitchen', 'Hallway', 'LivingRoom'],
        allowsExteriorExit: false,
      },
      {
        id: 'sock_study_east_arch',
        label: 'East Foyer & Hallway Arch',
        wall: 'EAST',
        offsetMeters: 1.4,
        widthMeters: 1.5,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: 3.75, z: 1.4 },
        allowedAdjacentRoomTypes: ['Hallway', 'LivingRoom', 'Bathroom'],
        allowsExteriorExit: false,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 3.2,
      mustMaintainExteriorWindowWalls: ['WEST'],
      requiresPrivacyDoor: false,
      forbiddenDirectConnections: [],
      maxStoryLevel: 2,
      connectionNotes:
        'Connects via North Arch to Kitchen and East Arch to Central Foyer/Hallway.',
    },
    furnishedObjects: [
      {
        id: 'pm_study_easel',
        name: 'Oak Studio Painting Easel',
        room: 'Study',
        category: 'study',
        gridPos: { x: -1.8, y: 0, z: 1.2 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 42, sanity: 14 },
        actionLabel: 'Painting an expressive landscape',
        durationSeconds: 7200,
      },
      {
        id: 'pm_study_bookshelf',
        name: 'Floor-to-Ceiling Mahogany Bookshelf',
        room: 'Study',
        category: 'study',
        gridPos: { x: -2.4, y: 0, z: -1.4 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 35, sanity: 15 },
        actionLabel: 'Studying classical literature & treatises',
        durationSeconds: 5400,
      },
      {
        id: 'pm_study_desk',
        name: 'Architect Drafting & Laptop Desk',
        room: 'Study',
        category: 'study',
        gridPos: { x: 1.2, y: 0, z: -1.3 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 30, sanity: 10 },
        actionLabel: 'Drafting blueprints & researching online',
        durationSeconds: 5400,
      },
    ],
  }),

  // 8. HALLWAY / FOYER — CENTRAL CONNECTOR GALLERY FOYER (5.0m x 7.0m)
  createPremadeRoomTemplate({
    id: 'premade_hallway_central_foyer',
    name: 'Central Grand Connector Foyer',
    roomType: 'Hallway',
    shape: 'RECTANGLE',
    widthMeters: 5.0,
    depthMeters: 7.0,
    costEmpty: 760,
    costFurnished: 1480,
    summary:
      '4-way central circulation hub with North, South, East, and West doorway sockets designed to link Kitchen, Living Room, Study, Bathroom, and Bedroom wings without bottlenecks.',
    wallpaperId: 'wp_classic_wainscot',
    floorPatternId: 'fl_herringbone_oak',
    wallColorHex: '#e2e8f0',
    floorColorHex: '#b07d4f',
    windowWalls: [],
    doorwaySockets: [
      {
        id: 'sock_foyer_south_entry',
        label: 'South Main Craftsman Entrance',
        wall: 'SOUTH',
        offsetMeters: 0,
        widthMeters: 1.5,
        doorStyle: 'HINGED_DOOR',
        localThresholdPos: { x: 0, z: 3.5 },
        allowedAdjacentRoomTypes: ['Patio', 'LivingRoom', 'Study'],
        allowsExteriorExit: true,
      },
      {
        id: 'sock_foyer_north_patio',
        label: 'North Courtyard Doorway',
        wall: 'NORTH',
        offsetMeters: 0,
        widthMeters: 1.5,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: 0, z: -3.5 },
        allowedAdjacentRoomTypes: ['Kitchen', 'LivingRoom', 'Patio'],
        allowsExteriorExit: true,
      },
      {
        id: 'sock_foyer_west_wing',
        label: 'West Kitchen & Study Archway',
        wall: 'WEST',
        offsetMeters: -0.8,
        widthMeters: 1.8,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: -2.5, z: -0.8 },
        allowedAdjacentRoomTypes: ['Kitchen', 'Study', 'Bathroom'],
        allowsExteriorExit: false,
      },
      {
        id: 'sock_foyer_east_wing',
        label: 'East Parlor & Master Wing Arch',
        wall: 'EAST',
        offsetMeters: -0.8,
        widthMeters: 1.8,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: 2.5, z: -0.8 },
        allowedAdjacentRoomTypes: ['LivingRoom', 'Bedroom'],
        allowsExteriorExit: false,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 2.5,
      mustMaintainExteriorWindowWalls: [],
      requiresPrivacyDoor: false,
      forbiddenDirectConnections: [],
      maxStoryLevel: 2,
      connectionNotes:
        'Universal connector hub compatible with all room types on all 4 cardinal walls.',
    },
    furnishedObjects: [
      {
        id: 'pm_foyer_clock',
        name: 'Chime Grandfather Clock',
        room: 'Hallway',
        category: 'living',
        gridPos: { x: 1.3, y: 0, z: 1.8 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 15, sanity: 10 },
        actionLabel: 'Winding the brass grandfather clock',
        durationSeconds: 1800,
      },
    ],
  }),

  // 9. LIVING ROOM — COMPACT FIRESIDE DEN (6.5m x 5.5m RECTANGLE)
  createPremadeRoomTemplate({
    id: 'premade_living_compact_den',
    name: 'Compact Mid-Century Fireside Den',
    roomType: 'LivingRoom',
    shape: 'RECTANGLE',
    widthMeters: 6.5,
    depthMeters: 5.5,
    costEmpty: 1050,
    costFurnished: 2450,
    summary:
      'Cozy rectangular media den with West kitchen arch, North garden door, and wide central walking clearance between the sofa and console.',
    wallpaperId: 'wp_midcentury_teak',
    floorPatternId: 'fl_herringbone_oak',
    wallColorHex: '#d6d3d1',
    floorColorHex: '#9a6b41',
    windowWalls: ['EAST'],
    doorwaySockets: [
      {
        id: 'sock_den_west_arch',
        label: 'West Kitchen / Foyer Arch',
        wall: 'WEST',
        offsetMeters: 0,
        widthMeters: 1.6,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: -3.25, z: 0 },
        allowedAdjacentRoomTypes: ['Kitchen', 'Hallway', 'Study'],
        allowsExteriorExit: false,
      },
      {
        id: 'sock_den_north_patio',
        label: 'North Patio French Door',
        wall: 'NORTH',
        offsetMeters: 0,
        widthMeters: 1.4,
        doorStyle: 'FRENCH_PATIO_DOOR',
        localThresholdPos: { x: 0, z: -2.75 },
        allowedAdjacentRoomTypes: ['Patio', 'Hallway'],
        allowsExteriorExit: true,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 3.0,
      mustMaintainExteriorWindowWalls: ['EAST'],
      requiresPrivacyDoor: false,
      forbiddenDirectConnections: [],
      maxStoryLevel: 2,
      connectionNotes:
        'Connects via West Open Arch to Kitchen or Central Foyer, and North French Door to Patio.',
    },
    furnishedObjects: [
      {
        id: 'pm_den_sofa',
        name: 'Mid-Century Lounge Sofa',
        room: 'LivingRoom',
        category: 'living',
        gridPos: { x: 0.9, y: 0, z: 1.1 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { energy: 25, fun: 20, social: 20 },
        actionLabel: 'Relaxing on the fireside den sofa',
        durationSeconds: 3600,
      },
      {
        id: 'pm_den_tv',
        name: 'Hi-Fi Stereophonic Television',
        room: 'LivingRoom',
        category: 'living',
        gridPos: { x: 1.1, y: 0, z: -1.4 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 35 },
        actionLabel: 'Watching evening broadcast in the den',
        durationSeconds: 5400,
      },
    ],
  }),

  // 10. BATHROOM — COMPACT POWDER WASHROOM (4.5m x 4.5m COMPACT)
  createPremadeRoomTemplate({
    id: 'premade_bathroom_powder_compact',
    name: 'Compact Guest Powder Bathroom',
    roomType: 'Bathroom',
    shape: 'COMPACT',
    widthMeters: 4.5,
    depthMeters: 4.5,
    costEmpty: 690,
    costFurnished: 1620,
    summary:
      'Space-saving 4.5×4.5m guest powder room with East privacy door, porcelain toilet, and pedestal washbasin with verified turnaround clearance.',
    wallpaperId: 'wp_classic_wainscot',
    floorPatternId: 'fl_checkerboard_marble',
    wallColorHex: '#f8fafc',
    floorColorHex: '#cbd5e1',
    windowWalls: ['WEST'],
    doorwaySockets: [
      {
        id: 'sock_powder_east_privacy',
        label: 'East Privacy Hallway Door',
        wall: 'EAST',
        offsetMeters: 0,
        widthMeters: 1.2,
        doorStyle: 'PRIVACY_DOOR',
        localThresholdPos: { x: 2.25, z: 0 },
        allowedAdjacentRoomTypes: ['Hallway', 'Bedroom', 'Study', 'LivingRoom'],
        allowsExteriorExit: false,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 2.4,
      mustMaintainExteriorWindowWalls: [],
      requiresPrivacyDoor: true,
      forbiddenDirectConnections: ['Kitchen', 'Patio'],
      maxStoryLevel: 2,
      connectionNotes: 'Compact guest washroom that snaps onto any West wall doorway of a Hallway or Study.',
    },
    furnishedObjects: [
      {
        id: 'pm_powder_toilet',
        name: 'Porcelain Guest Flush Toilet',
        room: 'Bathroom',
        category: 'bathroom',
        gridPos: { x: -0.9, y: 0, z: -0.9 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { bladder: 85 },
        actionLabel: 'Using the guest powder room',
        durationSeconds: 1800,
      },
      {
        id: 'pm_powder_sink',
        name: 'Pedestal Porcelain Washbasin',
        room: 'Bathroom',
        category: 'bathroom',
        gridPos: { x: -0.9, y: 0, z: 0.9 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { hygiene: 45, sanity: 8 },
        actionLabel: 'Freshening up at the washbasin',
        durationSeconds: 1800,
      },
    ],
  }),

  // 11. STUDY — BAY-ALCOVE CONSERVATORY LIBRARY (6.5m x 6.0m BAY_ALCOVE)
  createPremadeRoomTemplate({
    id: 'premade_study_reading_alcove',
    name: 'Bay-Alcove Conservatory Library',
    roomType: 'Study',
    shape: 'BAY_ALCOVE',
    widthMeters: 6.5,
    depthMeters: 6.0,
    costEmpty: 1180,
    costFurnished: 2680,
    summary:
      'Quiet reading library with a North sunlit bay window alcove, South hallway door, and unobstructed A* paths to the bookshelf and chess table.',
    wallpaperId: 'wp_botanical_sage',
    floorPatternId: 'fl_herringbone_oak',
    wallColorHex: '#52796f',
    floorColorHex: '#7f5539',
    windowWalls: ['NORTH', 'WEST'],
    doorwaySockets: [
      {
        id: 'sock_lib_south_door',
        label: 'South Library Hinged Door',
        wall: 'SOUTH',
        offsetMeters: 0,
        widthMeters: 1.35,
        doorStyle: 'HINGED_DOOR',
        localThresholdPos: { x: 0, z: 3.0 },
        allowedAdjacentRoomTypes: ['Hallway', 'LivingRoom', 'Bedroom'],
        allowsExteriorExit: false,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 3.0,
      mustMaintainExteriorWindowWalls: ['NORTH'],
      requiresPrivacyDoor: false,
      forbiddenDirectConnections: [],
      maxStoryLevel: 2,
      connectionNotes: 'Connects via South Door to any North doorway of a Hallway or Living Room.',
    },
    furnishedObjects: [
      {
        id: 'pm_lib_bookshelf',
        name: 'Conservatory Rare Bookshelf',
        room: 'Study',
        category: 'study',
        gridPos: { x: -1.7, y: 0, z: -1.2 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 35, sanity: 18 },
        actionLabel: 'Reading archival volumes in the bay library',
        durationSeconds: 5400,
      },
      {
        id: 'pm_lib_chess',
        name: 'Grandmaster Inlaid Chess Table',
        room: 'Study',
        category: 'study',
        gridPos: { x: 1.4, y: 0, z: -0.9 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 38, social: 20, sanity: 12 },
        actionLabel: 'Practicing tactical chess openings',
        durationSeconds: 5400,
      },
    ],
  }),

  // 12. HALLWAY — L-SHAPED ART GALLERY CORRIDOR (6.5m x 5.5m L_SHAPE)
  createPremadeRoomTemplate({
    id: 'premade_hallway_l_gallery',
    name: 'L-Shaped Art Gallery Corridor',
    roomType: 'Hallway',
    shape: 'L_SHAPE',
    widthMeters: 6.5,
    depthMeters: 5.5,
    costEmpty: 820,
    costFurnished: 1650,
    summary:
      'L-shaped circulation gallery designed to turn corners between North/South and East/West house wings while keeping a 2m wide walkable A* lane.',
    wallpaperId: 'wp_classic_wainscot',
    floorPatternId: 'fl_checkerboard_marble',
    wallColorHex: '#e2e8f0',
    floorColorHex: '#cbd5e1',
    windowWalls: ['NORTH'],
    doorwaySockets: [
      {
        id: 'sock_lgal_west',
        label: 'West Wing Archway',
        wall: 'WEST',
        offsetMeters: 0,
        widthMeters: 1.5,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: -3.25, z: 0 },
        allowedAdjacentRoomTypes: ['Kitchen', 'Study', 'LivingRoom', 'Hallway'],
        allowsExteriorExit: false,
      },
      {
        id: 'sock_lgal_south',
        label: 'South Bedroom & Bath Doorway',
        wall: 'SOUTH',
        offsetMeters: 0.8,
        widthMeters: 1.4,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: 0.8, z: 2.75 },
        allowedAdjacentRoomTypes: ['Bedroom', 'Bathroom', 'LivingRoom', 'Study'],
        allowsExteriorExit: false,
      },
      {
        id: 'sock_lgal_east',
        label: 'East Master Suite Door',
        wall: 'EAST',
        offsetMeters: 0,
        widthMeters: 1.4,
        doorStyle: 'HINGED_DOOR',
        localThresholdPos: { x: 3.25, z: 0 },
        allowedAdjacentRoomTypes: ['Bedroom', 'LivingRoom', 'Patio'],
        allowsExteriorExit: true,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 2.5,
      mustMaintainExteriorWindowWalls: [],
      requiresPrivacyDoor: false,
      forbiddenDirectConnections: [],
      maxStoryLevel: 2,
      connectionNotes: 'Corner L-corridor connecting West, South, and East room wings.',
    },
    furnishedObjects: [
      {
        id: 'pm_lgal_guitar',
        name: 'Gallery Acoustic Guitar Stand',
        room: 'Hallway',
        category: 'living',
        gridPos: { x: -1.4, y: 0, z: -1.2 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 32, sanity: 10 },
        actionLabel: 'Strumming acoustic chords in the gallery',
        durationSeconds: 3600,
      },
    ],
  }),

  // 13. PATIO — SUNLIT COURTYARD VERANDA DECK (7.5m x 5.5m RECTANGLE)
  createPremadeRoomTemplate({
    id: 'premade_patio_courtyard_deck',
    name: 'Sunlit Timber Courtyard Patio',
    roomType: 'Patio',
    shape: 'RECTANGLE',
    widthMeters: 7.5,
    depthMeters: 5.5,
    costEmpty: 780,
    costFurnished: 1950,
    summary:
      'Outdoor timber veranda deck with South French-door connection to Kitchen or Living Room and North/East open garden exits.',
    wallpaperId: 'wp_terracotta_venetian',
    floorPatternId: 'fl_slate_terracotta',
    wallColorHex: '#d6d3d1',
    floorColorHex: '#92400e',
    windowWalls: ['WEST'],
    doorwaySockets: [
      {
        id: 'sock_patio_south_house',
        label: 'South House French Door Connection',
        wall: 'SOUTH',
        offsetMeters: 0,
        widthMeters: 1.5,
        doorStyle: 'FRENCH_PATIO_DOOR',
        localThresholdPos: { x: 0, z: 2.75 },
        allowedAdjacentRoomTypes: ['Kitchen', 'LivingRoom', 'Hallway', 'Study'],
        allowsExteriorExit: true,
      },
      {
        id: 'sock_patio_north_lawn',
        label: 'North Lawn Archway',
        wall: 'NORTH',
        offsetMeters: 0,
        widthMeters: 1.8,
        doorStyle: 'OPEN_ARCH',
        localThresholdPos: { x: 0, z: -2.75 },
        allowedAdjacentRoomTypes: ['Patio', 'Hallway'],
        allowsExteriorExit: true,
      },
    ],
    connectionConditions: {
      requiresDoorwayAlignment: true,
      minSharedWallLengthMeters: 3.0,
      mustMaintainExteriorWindowWalls: ['NORTH', 'EAST'],
      requiresPrivacyDoor: false,
      forbiddenDirectConnections: ['Bathroom'],
      maxStoryLevel: 1,
      connectionNotes:
        'Snaps onto any North exterior doorway of a Kitchen, Living Room, or Foyer.',
    },
    furnishedObjects: [
      {
        id: 'pm_patio_table',
        name: 'Veranda Alfresco Bistro Table',
        room: 'Kitchen',
        category: 'outdoor',
        gridPos: { x: -1.6, y: 0, z: 0.2 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { hunger: 45, social: 25, fun: 15 },
        actionLabel: 'Dining alfresco on the sunlit patio',
        durationSeconds: 3600,
      },
      {
        id: 'pm_patio_easel',
        name: 'Plein-Air Garden Painting Easel',
        room: 'Study',
        category: 'outdoor',
        gridPos: { x: 1.8, y: 0, z: -0.6 },
        state: 'Clean',
        maturity: 'ALL',
        effects: { fun: 42, sanity: 15 },
        actionLabel: 'Painting plein-air botanical studies on the patio',
        durationSeconds: 5400,
      },
    ],
  }),
];

/**
 * Evaluates whether two pre-made rooms (`roomA` and `roomB`) can be connected via
 * `socketAId` and `socketBId`, checking cardinal wall opposition, doorway width compatibility,
 * allowed adjacent room types, and exterior window wall constraints.
 * Also computes the exact world position offset `(snapWorldX, snapWorldZ)` for `roomB`!
 */
export function evaluateRoomConnectionCompatibility(params: {
  anchorRoom: PremadeRoomTemplate;
  anchorSocketId: string;
  anchorWorldPos?: { x: number; z: number };
  candidateRoom: PremadeRoomTemplate;
  candidateSocketId: string;
}): {
  compatible: boolean;
  reasons: string[];
  snapWorldPos: { x: number; z: number };
  sharedWallAxis: 'X' | 'Z';
  doorwayClearanceWidth: number;
} {
  const {
    anchorRoom,
    anchorSocketId,
    anchorWorldPos = { x: 0, z: 0 },
    candidateRoom,
    candidateSocketId,
  } = params;

  const reasons: string[] = [];
  const sockA = anchorRoom.doorwaySockets.find((s) => s.id === anchorSocketId);
  const sockB = candidateRoom.doorwaySockets.find((s) => s.id === candidateSocketId);

  if (!sockA || !sockB) {
    return {
      compatible: false,
      reasons: ['Selected doorway socket was not found on one of the rooms.'],
      snapWorldPos: { x: anchorWorldPos.x + 8, z: anchorWorldPos.z },
      sharedWallAxis: 'X',
      doorwayClearanceWidth: 0,
    };
  }

  // 1. Check opposite cardinal wall alignment (e.g., EAST socket connects to WEST socket)
  const expectedWallB = OPPOSITE_WALL[sockA.wall];
  if (sockB.wall !== expectedWallB) {
    reasons.push(
      `Wall mismatch: ${anchorRoom.name} (${sockA.wall} wall) requires a ${expectedWallB} wall socket on ${candidateRoom.name} (got ${sockB.wall}).`
    );
  }

  // 2. Check allowed adjacent room types
  if (!sockA.allowedAdjacentRoomTypes.includes(candidateRoom.roomType)) {
    reasons.push(
      `${anchorRoom.name}'s "${sockA.label}" only connects to [${sockA.allowedAdjacentRoomTypes.join(', ')}] (cannot connect to ${candidateRoom.roomType}).`
    );
  }
  if (!sockB.allowedAdjacentRoomTypes.includes(anchorRoom.roomType)) {
    reasons.push(
      `${candidateRoom.name}'s "${sockB.label}" does not allow direct connection to ${anchorRoom.roomType}.`
    );
  }

  // 3. Check forbidden direct connections in connectionConditions
  if (
    anchorRoom.connectionConditions.forbiddenDirectConnections.includes(
      candidateRoom.roomType
    ) ||
    candidateRoom.connectionConditions.forbiddenDirectConnections.includes(
      anchorRoom.roomType
    )
  ) {
    reasons.push(
      `Architectural rule forbids direct doorway between ${anchorRoom.roomType} and ${candidateRoom.roomType}.`
    );
  }

  // 4. Compute exact snapped world center for `candidateRoom` so `sockB` aligns flush with `sockA`
  const sockAWorldX = anchorWorldPos.x + sockA.localThresholdPos.x;
  const sockAWorldZ = anchorWorldPos.z + sockA.localThresholdPos.z;
  const snapWorldX = Math.round((sockAWorldX - sockB.localThresholdPos.x) * 100) / 100;
  const snapWorldZ = Math.round((sockAWorldZ - sockB.localThresholdPos.z) * 100) / 100;

  return {
    compatible: reasons.length === 0,
    reasons:
      reasons.length === 0
        ? [
            `Valid doorway connection: ${anchorRoom.name} (${sockA.wall}) <-> ${candidateRoom.name} (${sockB.wall}) aligned at (${snapWorldX}, ${snapWorldZ}).`,
          ]
        : reasons,
    snapWorldPos: { x: snapWorldX, z: snapWorldZ },
    sharedWallAxis: sockA.wall === 'NORTH' || sockA.wall === 'SOUTH' ? 'X' : 'Z',
    doorwayClearanceWidth: Math.min(sockA.widthMeters, sockB.widthMeters),
  };
}

/**
 * Stamps a pre-made room template (`EMPTY` or `FURNISHED` variant) into a `WorldBlueprint`
 * and existing `SmartObject[]` list at a target `(worldX, worldY, worldZ)` position.
 */
export function stampPremadeRoomIntoWorld(params: {
  template: PremadeRoomTemplate;
  variant: 'EMPTY' | 'FURNISHED';
  worldPos: { x: number; y: number; z: number };
  currentBlueprint: WorldBlueprint;
  currentSmartObjects: SmartObject[];
}): {
  updatedBlueprint: WorldBlueprint;
  updatedSmartObjects: SmartObject[];
  stampedRoomSummary: string;
} {
  const { template, variant, worldPos, currentBlueprint, currentSmartObjects } = params;
  const design = variant === 'FURNISHED' ? template.furnishedVariant : template.emptyVariant;
  const stampIdSuffix = `${Date.now().toString(36).slice(-4)}`;

  const translatedParts: PlacedBuildingPart[] = design.placedParts.map((part) => ({
    ...part,
    id: `${part.id}_${stampIdSuffix}`,
    gridPos: {
      x: Math.round((worldPos.x + part.gridPos.x) * 100) / 100,
      y: worldPos.y + (part.gridPos.y || 0),
      z: Math.round((worldPos.z + part.gridPos.z) * 100) / 100,
    },
  }));

  const translatedObjects: SmartObject[] =
    variant === 'FURNISHED'
      ? design.smartObjects.map((obj) => ({
          ...obj,
          id: `${obj.id}_${stampIdSuffix}`,
          gridPos: {
            x: Math.round((worldPos.x + obj.gridPos.x) * 100) / 100,
            y: worldPos.y + (obj.gridPos.y || 0),
            z: Math.round((worldPos.z + obj.gridPos.z) * 100) / 100,
          },
        }))
      : [];

  const nextParts = [...currentBlueprint.placedParts, ...translatedParts];
  const mergedObjects = declipAllSmartObjects(
    [...currentSmartObjects, ...translatedObjects],
    nextParts,
    !currentBlueprint.isEmptyGridMode
  );

  return {
    updatedBlueprint: {
      ...currentBlueprint,
      placedParts: nextParts,
    },
    updatedSmartObjects: mergedObjects,
    stampedRoomSummary: `Stamped ${variant} "${template.name}" (${template.widthMeters}×${template.depthMeters}m ${template.shape}) at (${worldPos.x}, ${worldPos.z}) with ${translatedObjects.length} mapped fixtures.`,
  };
}

const CUSTOM_ROOMS_STORAGE_KEY = 'the_house_custom_premade_rooms_v1';

export function loadCustomPremadeRoomsFromStorage(): PremadeRoomTemplate[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_ROOMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomPremadeRoomToStorage(room: PremadeRoomTemplate): PremadeRoomTemplate[] {
  const existing = loadCustomPremadeRoomsFromStorage().filter((r) => r.id !== room.id);
  const updated = [room, ...existing];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CUSTOM_ROOMS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
  }
  return updated;
}
