/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  type Character,
  calculateGameTime,
  formatGameTime,
  simulateOfflineHistory,
  canPerceiveEvent,
  PRESET_SCENARIOS,
} from './simulation';

test('calculateGameTime enforces 3x real-time scale', () => {
  // 20 real minutes = 1200 real seconds = 3600 in-game seconds = 1 hour
  assert.equal(calculateGameTime(1200, 3.0), 3600);
  assert.equal(calculateGameTime(1, 3.0), 3);
});

test('formatGameTime correctly formats day and AM/PM time', () => {
  // 8:00 AM on Day 1
  const morning = formatGameTime(8 * 3600);
  assert.equal(morning.day, 1);
  assert.equal(morning.timeStr, '8:00 AM');
  assert.equal(morning.isNight, false);

  // 11:30 PM on Day 2
  const lateNight = formatGameTime(86400 + 23 * 3600 + 30 * 60);
  assert.equal(lateNight.day, 2);
  assert.equal(lateNight.timeStr, '11:30 PM');
  assert.equal(lateNight.isNight, true);
});

test('simulateOfflineHistory catches up motives and records log', () => {
  const chars = PRESET_SCENARIOS[0].characters.map((c) => ({
    ...c,
    actionTimer: 0,
    currentAction: 'Idle',
    selfTalk: '',
  }));

  // 4 real hours = 12 in-game hours
  const result = simulateOfflineHistory(4 * 3600, chars, 'FAMILY_FRIENDLY');
  assert.equal(result.hoursPassed, 12);
  assert.ok(result.logs.length > 0);
  // Energy replenished because > 6 hours passed
  assert.ok(result.updatedCharacters[0].motives.energy >= 80);
});

test('canPerceiveEvent enforces epistemic isolation', () => {
  const charInKitchen = {
    ...PRESET_SCENARIOS[0].characters[0],
    actionTimer: 0,
    currentAction: 'Idle',
    selfTalk: '',
  };

  // Same room: Kitchen
  assert.equal(canPerceiveEvent(charInKitchen, 'Kitchen', { x: -6, y: 0, z: -4 }), true);

  // Different room far away: Basement
  assert.equal(canPerceiveEvent(charInKitchen, 'Basement', { x: 0, y: -4, z: 0 }), false);

  // Off-grid character perceives nothing
  const charOffGrid = { ...charInKitchen, onGrid: false };
  assert.equal(canPerceiveEvent(charOffGrid, 'Kitchen', { x: -6, y: 0, z: -4 }), false);
});

test('evaluateBuilderAutonomousActions triggers expansion or shopping when traits and funds match', async () => {
  const { evaluateBuilderAutonomousActions } = await import('./builderAgent.ts');
  const builderChar = {
    ...PRESET_SCENARIOS[0].characters[0],
    traits: ['Builder', 'Ambitious'],
    actionTimer: 0,
    currentAction: 'Idle',
    selfTalk: '',
  };

  // With insufficient funds (< §800), action should be NONE
  const lowFunds = evaluateBuilderAutonomousActions(builderChar, [], 1, '10:00 AM', 200);
  assert.equal(lowFunds.action.type, 'NONE');
  assert.equal(lowFunds.newFunds, 200);

  // With healthy funds (e.g. §5,000), action can expand floor or auto-buy
  let didAction = false;
  for (let i = 0; i < 20; i++) {
    const res = evaluateBuilderAutonomousActions(builderChar, [], 1, '10:00 AM', 5000);
    if (res.action.type === 'EXPAND_FLOOR' || res.action.type === 'AUTO_BUY') {
      didAction = true;
      assert.ok(res.newFunds < 5000);
      break;
    }
  }
  assert.ok(didAction, 'Expected Builder character to occasionally trigger expansion or auto-buy');
});

test('getDiverseContextualSelfTalk produces non-repetitive dialogue matching urgency and traits', async () => {
  const { getDiverseContextualSelfTalk, clearUtteranceHistoryForTests } = await import('./builderAgent.ts');
  clearUtteranceHistoryForTests();
  const hungryChar = {
    ...PRESET_SCENARIOS[0].characters[0],
    motives: { ...PRESET_SCENARIOS[0].characters[0].motives, hunger: 15 },
    actionTimer: 0,
    currentAction: 'Eating',
    selfTalk: '',
  };
  const dummyObj = {
    id: 'obj_fridge',
    name: 'Refrigerator',
    room: 'Kitchen',
    category: 'kitchen' as const,
    gridPos: { x: 0, y: 0, z: 0 },
    state: 'Clean' as const,
    maturity: 'ALL' as const,
    effects: {},
    actionLabel: 'Eating',
    durationSeconds: 5,
  };

  const line = getDiverseContextualSelfTalk(hungryChar, dummyObj, false);
  assert.ok(line.length > 10);
});

test('PRESET_SCENARIOS includes expanded narrative scenarios with distinct boneScales', () => {
  assert.ok(PRESET_SCENARIOS.length >= 7, 'Expected at least 7 rich scenarios');
  const madScientist = PRESET_SCENARIOS.find((s) => s.id === 'mad_scientist_lab');
  assert.ok(madScientist, 'Expected mad_scientist_lab scenario');
  assert.equal(madScientist.maturity, 'DARK_MODE');

  const artistsLoft = PRESET_SCENARIOS.find((s) => s.id === 'bohemian_artists_loft');
  assert.ok(artistsLoft, 'Expected bohemian_artists_loft scenario');
  assert.equal(artistsLoft.maturity, 'FAMILY_FRIENDLY');

  // Verify boneScale properties exist and are valid positive multipliers
  madScientist.characters.forEach((c) => {
    if (c.boneScale) {
      assert.ok(c.boneScale.height >= 0.8 && c.boneScale.height <= 1.4);
      assert.ok(c.boneScale.shoulderWidth >= 0.7 && c.boneScale.shoulderWidth <= 1.5);
      assert.ok(c.boneScale.chestDepth >= 0.7 && c.boneScale.chestDepth <= 1.5);
    }
  });
});

test('SoundSynthesizer supports Peanuts trombone vocalization and speech toggle', async () => {
  const { sound } = await import('./soundSynth.ts');
  assert.equal(typeof sound.playPeanutsWahWah, 'function');
  assert.equal(typeof sound.vocalizeThought, 'function');
  assert.equal(typeof sound.toggleAlwaysSpeakOutLoud, 'function');

  const initial = sound.isAlwaysSpeakOutLoud();
  const toggled = sound.toggleAlwaysSpeakOutLoud();
  assert.equal(toggled, !initial);
  sound.setAlwaysSpeakOutLoud(initial); // restore
  assert.equal(sound.isAlwaysSpeakOutLoud(), initial);
});

test('Deterministic 1 to 10 mechanics scaling and clamping bounds', () => {
  const toTenScale = (val: number): number => {
    return Math.max(1, Math.min(10, Math.round((val / 10) * 10) / 10));
  };

  assert.equal(toTenScale(0), 1);
  assert.equal(toTenScale(10), 1);
  assert.equal(toTenScale(50), 5);
  assert.equal(toTenScale(75), 7.5);
  assert.equal(toTenScale(100), 10);
  assert.equal(toTenScale(120), 10);

  // Test Height_Scale, Shoulder_Width, Chest_Depth normalized 1-10 ratings
  const toHeightRating = (scale: number) => 1 + ((scale - 0.85) / 0.4) * 9;
  assert.ok(Math.abs(toHeightRating(0.85) - 1.0) < 0.01);
  assert.ok(Math.abs(toHeightRating(1.25) - 10.0) < 0.01);
});

test('Cloud save payload serialization preserves characters and mechanicsData', () => {
  const dummyChar = {
    ...PRESET_SCENARIOS[0].characters[0],
    actionTimer: 0,
    currentAction: 'Relaxing',
    selfTalk: 'All systems running smoothly.',
  };
  const mechanics = { funds: 4500, expansionLevel: 2, gameSeconds: 36000 };

  const serializedChars = JSON.stringify([dummyChar]);
  const serializedMechanics = JSON.stringify(mechanics);

  const restoredChars = JSON.parse(serializedChars);
  const restoredMechanics = JSON.parse(serializedMechanics);

  assert.equal(restoredChars.length, 1);
  assert.equal(restoredChars[0].name, dummyChar.name);
  assert.equal(restoredMechanics.funds, 4500);
  assert.equal(restoredMechanics.expansionLevel, 2);
});

test('AgentArtClass pipeline synthesizes Imagen & Meshy descriptors and 1-10 motive deltas', async () => {
  const { AgentArtClass, WALLPAPER_CATALOG, CARPET_CATALOG } = await import('../AgentArtClass/AgentArtPipeline.ts');
  const desc = AgentArtClass.buildAssetDescriptor({
    name: 'Emerald Velvet Chaise',
    category: 'FURNITURE',
    targetRoom: 'LivingRoom',
    styleTheme: 'Victorian',
    materialFinish: 'Fabric',
    cost: 1400,
    actionLabel: 'Lounging in luxury',
    motiveRatings1To10: {
      energy: 8,
      fun: 7,
      sanity: 9,
      environmentalInfluence: 9,
    },
  });

  assert.ok(desc.imagenSpec.prompt.includes('Emerald Velvet Chaise'));
  assert.equal(desc.meshySpec.aiModel, 'meshy-4');
  assert.ok(AgentArtClass.scoreToMotiveDelta(8) > 0);
  assert.ok(AgentArtClass.scoreToMotiveDelta(2) < 0);
  assert.ok(WALLPAPER_CATALOG.length >= 8);
  assert.ok(CARPET_CATALOG.length >= 8);
});

test('evaluateSurroundingsInfluence and in-game newspaper object work as expected', async () => {
  const { DEFAULT_SMART_OBJECTS, evaluateSurroundingsInfluence } = await import('./simulation.ts');
  const newspaperObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_newspaper');
  assert.ok(newspaperObj, 'Expected obj_newspaper in DEFAULT_SMART_OBJECTS');

  const charInLivingRoom = {
    ...PRESET_SCENARIOS[0].characters[0],
    room: 'LivingRoom',
    actionTimer: 0,
    currentAction: 'Idle',
    selfTalk: '',
  };

  const clearEval = evaluateSurroundingsInfluence(charInLivingRoom, DEFAULT_SMART_OBJECTS, 'CLEAR');
  assert.equal(typeof clearEval.sanityDelta, 'number');
  assert.equal(typeof clearEval.funDelta, 'number');

  // Outdoor yard in storm should penalize sanity
  const charInYard = { ...charInLivingRoom, room: 'Yard' };
  const stormEval = evaluateSurroundingsInfluence(charInYard, DEFAULT_SMART_OBJECTS, 'STORM');
  assert.ok(stormEval.sanityDelta < 0);
});

test('15-minute real-world dialogue cooldown prevents a toon from repeating the same line', async () => {
  const {
    UTTERANCE_COOLDOWN_MS,
    canSayLineNow,
    recordSpokenLine,
    clearUtteranceHistoryForTests,
    getDiverseContextualSelfTalk,
  } = await import('./builderAgent.ts');
  const { DEFAULT_SMART_OBJECTS } = await import('./simulation.ts');

  assert.equal(UTTERANCE_COOLDOWN_MS, 15 * 60 * 1000);
  clearUtteranceHistoryForTests();

  const t0 = 1_000_000;
  assert.equal(canSayLineNow('char_elena', 'Testing line one.', t0), true);
  recordSpokenLine('char_elena', 'Testing line one.', t0);

  // Immediately and 14 minutes later: blocked for char_elena
  assert.equal(canSayLineNow('char_elena', 'Testing line one.', t0 + 1000), false);
  assert.equal(canSayLineNow('char_elena', 'Testing line one.', t0 + 14 * 60 * 1000), false);

  // After 15 minutes + 1ms: allowed again for char_elena
  assert.equal(canSayLineNow('char_elena', 'Testing line one.', t0 + 15 * 60 * 1000 + 1), true);

  // Verify 12 consecutive calls to getDiverseContextualSelfTalk for the same character never repeat
  const char = {
    ...PRESET_SCENARIOS[0].characters[0],
    actionTimer: 0,
    currentAction: 'Reading',
    selfTalk: '',
  };
  const tvObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_tv')!;
  const seen = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const line = getDiverseContextualSelfTalk(char, tvObj, false, t0 + i * 1000);
    assert.equal(seen.has(line), false, `Duplicate line produced within 15 mins: ${line}`);
    seen.add(line);
  }
});

test('Furniture collision avoidance and TV approach point keep toons off the TV stand and stools', async () => {
  const {
    DEFAULT_SMART_OBJECTS,
    getInteractionApproachPoint,
    resolveFurnitureCollision,
    getSmartObjectCollisionRadius,
  } = await import('./simulation.ts');

  const tvObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_tv')!;
  // TV is at (7, 0, -7). Watching TV must place the toon near the sofa/rug (z >= -4.2), NOT on the TV stand (z = -7)
  const tvApproach = getInteractionApproachPoint(tvObj, 0);
  assert.ok(tvApproach.pos.z > -4.5, `Expected TV watcher to stand/sit at sofa (z > -4.5), got z=${tvApproach.pos.z}`);
  assert.equal(tvApproach.lookAtPos.z, tvObj.gridPos.z);

  // Attempting to stand right in the center of the TV stand (7, 0, -7) when not interacting with a walk-on rug is pushed out
  const collided = resolveFurnitureCollision({ x: 7.0, y: 0, z: -7.0 }, DEFAULT_SMART_OBJECTS);
  const distFromTvStand = Math.hypot(collided.x - tvObj.gridPos.x, collided.z - tvObj.gridPos.z);
  assert.ok(
    distFromTvStand >= getSmartObjectCollisionRadius(tvObj) - 0.05,
    `Expected collision resolver to push toon outside TV stand radius, got dist=${distFromTvStand}`
  );
});

test('selectVariedAutonomousObject enforces anti-looping task variety and media objects expand conversation pool', async () => {
  const {
    selectVariedAutonomousObject,
    learnFromMediaObject,
    generateMultiToonConversation,
  } = await import('./builderAgent.ts');
  const { DEFAULT_SMART_OBJECTS } = await import('./simulation.ts');

  const char = {
    ...PRESET_SCENARIOS[0].characters[0],
    motives: { hunger: 85, energy: 85, bladder: 85, hygiene: 85, social: 80, fun: 80, sanity: 90 },
    recentObjectIds: ['obj_tv', 'obj_sofa', 'obj_guitar'],
    learnedTopics: [],
    actionTimer: 0,
    currentAction: 'Idle',
    selfTalk: '',
  };

  for (let i = 0; i < 10; i++) {
    const picked = selectVariedAutonomousObject(char, DEFAULT_SMART_OBJECTS, 'CLEAR');
    assert.ok(picked);
    assert.equal(
      char.recentObjectIds.includes(picked.id),
      false,
      `Expected selector not to pick recent object ${picked.id}`
    );
  }

  const tvObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_tv')!;
  const bookObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_bookshelf')!;
  const tvLearn = learnFromMediaObject(char, tvObj);
  const bookLearn = learnFromMediaObject(char, bookObj);
  assert.ok(tvLearn.updatedTopics.length > 0);
  assert.ok(bookLearn.updatedTopics.length > 0);

  const partner = {
    ...PRESET_SCENARIOS[0].characters[1],
    learnedTopics: [...tvLearn.updatedTopics, ...bookLearn.updatedTopics],
    actionTimer: 0,
    currentAction: 'Idle',
    selfTalk: '',
  };
  const conv = generateMultiToonConversation(char, partner, false);
  assert.ok(conv.speakerLine.length > 10);
  assert.ok(conv.listenerReply.length > 10);
  assert.notEqual(conv.speakerLine, conv.listenerReply);
});

test('Sims World Builder supports Empty Grid initialization, grid snapping, part placement, bulldozing, and AI Prompt Scenario generation', async () => {
  const {
    WORLD_BUILDER_CATALOG,
    createEmptyGridBlueprint,
    snapToLotGrid,
    placeBuildingPartOnGrid,
    removeBuildingPartAtPosition,
    generateProceduralBlueprintFromPrompt,
  } = await import('./worldBuilder.ts');

  assert.ok(WORLD_BUILDER_CATALOG.length >= 20, 'Expected comprehensive Sims build/buy part catalog');

  // 1. Empty Grid Initialization
  const emptyBp = createEmptyGridBlueprint('Test Empty Lot');
  assert.equal(emptyBp.isEmptyGridMode, true);
  assert.equal(emptyBp.placedParts.length, 0);

  // 2. Grid Snapping & Bounds Clamping
  const snapped = snapToLotGrid(25.4, -19.2, 1.0);
  assert.equal(snapped.x, 16);
  assert.equal(snapped.z, -16);

  // 3. Placing a Room Module & Furnishing Part on the Empty Grid
  const roomPart = WORLD_BUILDER_CATALOG.find((p) => p.partType === 'ROOM_BLOCK')!;
  const placedRoomRes = placeBuildingPartOnGrid(emptyBp, roomPart, { x: 0, z: 0 }, 0);
  assert.equal(placedRoomRes.updatedBlueprint.placedParts.length, 1);
  assert.equal(placedRoomRes.cost, roomPart.cost);

  const furnishPart = WORLD_BUILDER_CATALOG.find((p) => p.id === 'wb_furn_sofa')!;
  const placedFurnRes = placeBuildingPartOnGrid(
    placedRoomRes.updatedBlueprint,
    furnishPart,
    { x: 2, z: 2 },
    0
  );
  assert.ok(placedFurnRes.spawnedSmartObject, 'Expected furnishing part to spawn an interactive SmartObject');

  // 4. Sledgehammer / Bulldoze removal
  const bulldozed = removeBuildingPartAtPosition(
    placedRoomRes.updatedBlueprint,
    [placedFurnRes.spawnedSmartObject!],
    { x: 0, z: 0 },
    2.6
  );
  assert.ok(bulldozed.removedName);
  assert.equal(bulldozed.updatedBlueprint.placedParts.length, 0);
  assert.ok(bulldozed.refund > 0);

  // 5. Prompt-driven Procedural World Blueprint Generation
  const promptResult = generateProceduralBlueprintFromPrompt(
    'Build a cozy Cyberpunk Neon Hacker Loft with an outdoor pool and patio',
    'FAMILY_FRIENDLY'
  );
  assert.equal(promptResult.blueprint.isEmptyGridMode, true);
  assert.ok(promptResult.blueprint.placedParts.length >= 8, 'Expected AI prompt builder to populate architectural parts');
  assert.ok(promptResult.smartObjects.length >= 8, 'Expected AI prompt builder to populate room furnishings');
  assert.ok(promptResult.characters.length >= 3, 'Expected AI prompt builder to generate scenario characters');
});

test('computeCharacterBonePose generates distinct articulated skeletal bone angles and held props across tasks', async () => {
  const { computeCharacterBonePose } = await import('./worldBuilder.ts');

  const walkPose = computeCharacterBonePose('Walking', true, 1.25, false);
  assert.equal(walkPose.activeProp, 'NONE');
  assert.notEqual(walkPose.thighL.x, 0);
  assert.notEqual(walkPose.upperArmL.x, 0);

  const sitPose = computeCharacterBonePose('Watching TV', false, 2.0, false);
  assert.ok(sitPose.pelvisYOffset < -0.1, 'Expected pelvis to lower when sitting');
  assert.ok(sitPose.thighL.x < -1.0, 'Expected thighs bent forward (~90 deg) when sitting');
  assert.ok(sitPose.shinL.x > 1.0, 'Expected shins bent down when sitting');

  const readPose = computeCharacterBonePose('Reading The Suburban Chronicle', false, 1.5, true);
  assert.equal(readPose.activeProp, 'BOOK_NEWSPAPER');
  assert.ok(readPose.jawOpen > 0, 'Expected jaw bone to animate while speaking');

  const cookPose = computeCharacterBonePose('Brewing Espresso', false, 1.8, false);
  assert.equal(cookPose.activeProp, 'CUP_UTENSIL');

  const paintPose = computeCharacterBonePose('Painting on Easel', false, 2.1, false);
  assert.equal(paintPose.activeProp, 'BRUSH_TOOL');

  const sleepPose = computeCharacterBonePose('Sleeping deeply', false, 3.0, false);
  assert.ok(sleepPose.pelvisYOffset < -0.2);
  assert.equal(typeof sleepPose.browRaise, 'number');
  assert.equal(typeof sleepPose.fingerCurlL, 'number');
  assert.equal(typeof sleepPose.thumbSpreadL, 'number');
});

test('resolveFurnitureCollision separates toons even from identical coordinates and enforces AABB asset collision', async () => {
  const { DEFAULT_SMART_OBJECTS, resolveFurnitureCollision } = await import('./simulation.ts');

  const otherToon = {
    ...PRESET_SCENARIOS[0].characters[0],
    id: 'char_other',
    onGrid: true,
    pos: { x: 2.0, y: 0, z: 2.0 },
    actionTimer: 0,
    currentAction: 'Idle',
    selfTalk: '',
  };

  // 1. Two toons at identical coordinates (dist === 0) must be pushed apart by >= 1.35m
  const separated = resolveFurnitureCollision(
    { x: 2.0, y: 0, z: 2.0 },
    DEFAULT_SMART_OBJECTS,
    undefined,
    [otherToon],
    'char_self'
  );
  const distBetweenToons = Math.hypot(separated.x - 2.0, separated.z - 2.0);
  assert.ok(
    distBetweenToons >= 1.30,
    `Expected identical-coordinate toons to separate by >= 1.30m, got ${distBetweenToons}`
  );

  // 2. Attempting to stand inside the built-in Kitchen Island (-5.5, -3.5) is pushed outside its AABB
  const outsideIsland = resolveFurnitureCollision(
    { x: -5.5, y: 0, z: -3.5 },
    DEFAULT_SMART_OBJECTS,
    undefined,
    [],
    'char_self'
  );
  const movedFromIslandCenter = Math.hypot(outsideIsland.x - -5.5, outsideIsland.z - -3.5);
  assert.ok(
    movedFromIslandCenter > 0.8,
    `Expected toon inside Kitchen Island to be pushed outside AABB, moved=${movedFromIslandCenter}`
  );
});

test('layoutNonOverlappingBubbles guarantees zero overlapping speech bubbles', async () => {
  const { layoutNonOverlappingBubbles } = await import('./simulation.ts');

  const bubbles = layoutNonOverlappingBubbles([
    { id: 'c1', rawLeftPct: 50, rawTopPct: 50, priority: 10 },
    { id: 'c2', rawLeftPct: 51, rawTopPct: 50, priority: 50 },
    { id: 'c3', rawLeftPct: 50.5, rawTopPct: 50.2, priority: 100 },
  ]);

  assert.equal(bubbles.length, 3);
  // Highest priority c3 must anchor first at its desired top position
  assert.equal(bubbles[0].id, 'c3');

  // Verify no pair overlaps in 2D screen space
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const a = bubbles[i];
      const b = bubbles[j];
      const horizSeparated = Math.abs(a.leftPct - b.leftPct) >= 22;
      const vertSeparated = Math.abs(a.topPct - b.topPct) >= 13;
      assert.ok(
        horizSeparated || vertSeparated,
        `Bubbles ${a.id} and ${b.id} overlapped: left=(${a.leftPct}, ${b.leftPct}), top=(${a.topPct}, ${b.topPct})`
      );
    }
  }
});

test('AgentArtClass.buildToonRigGenerationSpec includes articulated facial and hand phalange bones', async () => {
  const { AgentArtClass } = await import('../AgentArtClass/AgentArtPipeline.ts');
  const spec = AgentArtClass.buildToonRigGenerationSpec({
    name: 'Elena Vance',
    genderFrame: 'Feminine',
    hairStyle: 'Shoulder Waves',
    facialHair: 'None',
    clothingTop: 'Tailored Blazer',
    clothingBottom: 'Pleated Trousers',
    skinTone: '#f3d2c1',
  });

  assert.ok(spec.imagenTurnaroundSpec.prompt.includes('zygomatic cheekbones'));
  assert.ok(spec.imagenTurnaroundSpec.prompt.includes('articulated hands'));
  assert.ok(spec.meshyRigSpec.skeletalHierarchy.includes('JawBone'));
  assert.ok(spec.meshyRigSpec.skeletalHierarchy.includes('BrowLBone'));
  assert.ok(spec.meshyRigSpec.skeletalHierarchy.includes('FingersLBone'));
  assert.ok(spec.meshyRigSpec.skeletalHierarchy.includes('ThumbLBone'));
  assert.ok(spec.meshyRigSpec.facialExpressionChannels.length >= 6);
});

test('The House Agent maintains cross-world memory across Normal and Gore games and scales event choices as it learns', async () => {
  const {
    createInitialHouseMemory,
    recordWorldInHouseMemory,
    recordHouseEventChoice,
    generateEvolvingHouseEvent,
  } = await import('./houseAgent.ts');
  const { DEFAULT_SMART_OBJECTS } = await import('./simulation.ts');

  let mem = createInitialHouseMemory();
  assert.equal(mem.worldsPlayedCount, 1);
  assert.equal(mem.personality.omniscienceTier, 1);

  const testChars = PRESET_SCENARIOS[0].characters.map((c) => ({
    ...c,
    actionTimer: 0,
    currentAction: 'Idle',
    selfTalk: '',
  }));

  // Tier 1 event starts with 2 choices
  const tier1Res = generateEvolvingHouseEvent(
    mem,
    testChars,
    DEFAULT_SMART_OBJECTS,
    'FAMILY_FRIENDLY',
    '09:00 AM'
  );
  assert.equal(tier1Res.event.choices.length, 2);

  // Record both Normal and Gore worlds played with the same House Agent
  mem = recordWorldInHouseMemory(mem, {
    worldId: 'gore_world_1',
    title: 'Gore Basement Mystery',
    maturity: 'DARK_MODE',
    residentNames: ['Elena', 'Marcus'],
    timeStr: '11:00 PM',
  });
  mem = recordWorldInHouseMemory(mem, {
    worldId: 'normal_world_2',
    title: 'Suburban Family Morning',
    maturity: 'FAMILY_FRIENDLY',
    residentNames: ['Elena', 'Marcus', 'Arthur'],
    timeStr: '08:00 AM',
  });

  assert.equal(mem.worldsPlayedCount, 3);
  assert.ok(mem.normalSessionsCount >= 2);
  assert.ok(mem.goreSessionsCount >= 1);
  assert.ok(
    mem.personality.omniscienceTier >= 2,
    'Expected House omniscienceTier to increase as worlds are played'
  );

  // Higher tier event unlocks 3+ branching choices and works in DARK_MODE (Gore)
  const goreRes = generateEvolvingHouseEvent(
    mem,
    testChars,
    DEFAULT_SMART_OBJECTS,
    'DARK_MODE',
    '11:45 PM'
  );
  assert.equal(goreRes.event.maturityMode, 'DARK_MODE');
  assert.ok(
    goreRes.event.choices.length >= 3,
    `Expected >= 3 choices at Tier ${mem.personality.omniscienceTier}, got ${goreRes.event.choices.length}`
  );

  // Recording a player choice evolves personality and stores choice history
  const updatedMem = recordHouseEventChoice(
    goreRes.updatedMemory,
    goreRes.event,
    goreRes.event.choices[0]
  );
  assert.equal(updatedMem.totalChoicesMade, 1);
  assert.ok(updatedMem.learnedInsights.length >= 2);
});

test('Godot 4 PencilOutline.shader file and 1-pixel Sobel edge-detection evaluator work accurately', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { PENCIL_OUTLINE_SHADER_PATH, evaluateSobel3x3, SobelPencilShader } = await import('./sobelPencilPass.ts');

  const shaderFullPath = path.resolve(process.cwd(), PENCIL_OUTLINE_SHADER_PATH);
  assert.ok(fs.existsSync(shaderFullPath), `Expected ${PENCIL_OUTLINE_SHADER_PATH} to exist on disk`);

  const shaderContent = fs.readFileSync(shaderFullPath, 'utf8');
  assert.ok(shaderContent.includes('shader_type canvas_item;'), 'Expected Godot 4 canvas_item shader_type');
  assert.ok(shaderContent.includes('hint_screen_texture'), 'Expected Godot 4 hint_screen_texture uniform');
  assert.ok(shaderContent.includes('SCREEN_PIXEL_SIZE'), 'Expected 1-pixel SCREEN_PIXEL_SIZE sampling');
  assert.ok(shaderContent.includes('outline_thickness : hint_range(0.5, 2.0) = 1.0'), 'Expected 1-pixel outline thickness default');

  // Verify pure 3x3 Sobel convolution helper
  const flatKernel: [number, number, number, number, number, number, number, number, number] = [
    0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
  ];
  assert.equal(evaluateSobel3x3(flatKernel).magnitude, 0);

  const verticalStepKernel: [number, number, number, number, number, number, number, number, number] = [
    0, 0, 1, 0, 0, 1, 0, 0, 1,
  ];
  const stepEval = evaluateSobel3x3(verticalStepKernel);
  assert.ok(stepEval.gx > 3.5, `Expected strong horizontal gradient gx > 3.5, got ${stepEval.gx}`);
  assert.ok(stepEval.magnitude > 3.5);

  assert.equal(SobelPencilShader.uniforms.outlineThickness.value, 1.0);
});

test('Real-life multi-hour task durations and formatTaskDuration enforce hours-long pacing across all tasks', async () => {
  const { DEFAULT_SMART_OBJECTS, formatTaskDuration } = await import('./simulation.ts');

  assert.equal(formatTaskDuration(7200), '2h 0m');
  assert.equal(formatTaskDuration(9000), '2h 30m');
  assert.equal(formatTaskDuration(2700), '45m');
  assert.equal(formatTaskDuration(45), '45s');

  // Every smart object task takes hours rather than minutes (>= 3600s / 1 hour)
  for (const obj of DEFAULT_SMART_OBJECTS) {
    assert.ok(
      obj.durationSeconds >= 3600,
      `Expected ${obj.id} (${obj.name}) to take at least 1 hour (3600s), got ${obj.durationSeconds}s`
    );
  }

  const tvObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_tv');
  assert.ok(tvObj && tvObj.durationSeconds >= 10800, 'Expected watching TV on the couch to last 3 hours (10800s)');
  assert.ok(tvObj.actionLabel.toLowerCase().includes('couch watching tv'));

  const bedObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_bed');
  assert.ok(bedObj && bedObj.durationSeconds >= 28800, 'Expected sleeping in bed to take 8 hours (28800s)');

  const stoveObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_stove');
  assert.ok(stoveObj && stoveObj.durationSeconds >= 7200, 'Expected cooking at stove to take 2 hours (7200s)');
});

test('Display mode lifecycle transitions SCREENSAVER -> WAKE_PC -> DESKTOP_BACKGROUND -> GAMEPLAY with accurate capabilities', async () => {
  const { getDisplayModeCapabilities, resolveDisplayModeTransition } = await import('./simulation.ts');

  // 1. GAMEPLAY mode: UI visible, user controls world camera, sound and voices active
  const gameplayCaps = getDisplayModeCapabilities('GAMEPLAY', false);
  assert.equal(gameplayCaps.showUI, true);
  assert.equal(gameplayCaps.cameraFollowsToons, false);
  assert.equal(gameplayCaps.worldUserControlled, true);
  assert.equal(gameplayCaps.enableSoundAndVoices, true);

  // 2. Activating SCREENSAVER mode hides all UI, mutes sound/voices, and sets camera to follow toons
  const modeAfterScreensaver = resolveDisplayModeTransition('GAMEPLAY', 'ACTIVATE_SCREENSAVER');
  assert.equal(modeAfterScreensaver, 'SCREENSAVER');
  const screensaverCaps = getDisplayModeCapabilities(modeAfterScreensaver, false);
  assert.equal(screensaverCaps.showUI, false);
  assert.equal(screensaverCaps.cameraFollowsToons, true);
  assert.equal(screensaverCaps.worldUserControlled, false);
  assert.equal(screensaverCaps.enableSoundAndVoices, false);

  // 3. Waking up PC while in SCREENSAVER automatically switches to DESKTOP_BACKGROUND mode
  const modeAfterWake = resolveDisplayModeTransition(modeAfterScreensaver, 'WAKE_PC');
  assert.equal(modeAfterWake, 'DESKTOP_BACKGROUND');

  // DESKTOP_BACKGROUND mode performs the exact same way as when screensaver is on:
  // no sound, no UI, and the camera following toons
  const desktopBgCaps = getDisplayModeCapabilities(modeAfterWake, false);
  assert.equal(desktopBgCaps.showUI, false);
  assert.equal(desktopBgCaps.cameraFollowsToons, true);
  assert.equal(desktopBgCaps.worldUserControlled, false);
  assert.equal(desktopBgCaps.enableSoundAndVoices, false);

  // Subsequent WAKE_PC events while in DESKTOP_BACKGROUND remain in DESKTOP_BACKGROUND
  assert.equal(resolveDisplayModeTransition('DESKTOP_BACKGROUND', 'WAKE_PC'), 'DESKTOP_BACKGROUND');

  // 4. Switching to GAMEPLAY mode restores UI, user world controls, and sounds/voices
  const modeBackToGameplay = resolveDisplayModeTransition(modeAfterWake, 'SWITCH_TO_GAMEPLAY');
  assert.equal(modeBackToGameplay, 'GAMEPLAY');
  const restoredCaps = getDisplayModeCapabilities(modeBackToGameplay, false);
  assert.equal(restoredCaps.showUI, true);
  assert.equal(restoredCaps.cameraFollowsToons, false);
  assert.equal(restoredCaps.worldUserControlled, true);
  assert.equal(restoredCaps.enableSoundAndVoices, true);
});

test('Life Flow Queue builds non-repeating upcoming smart object interactions and supports player queuing, promotion, removal, and dequeuing', async () => {
  const {
    DEFAULT_SMART_OBJECTS,
    buildAutonomousLifeFlowQueue,
    enqueueSmartObjectInteraction,
    promoteScheduledInteraction,
    removeScheduledInteraction,
    dequeueNextScheduledInteraction,
  } = await import('./simulation.ts');

  const char = {
    ...PRESET_SCENARIOS[0].characters[0],
    activeObjectId: 'obj_stove',
    currentAction: 'Cooking a warm meal',
    actionTimer: 7200,
    selfTalk: 'Simmering sauce.',
  };

  // 1. Build 3 upcoming autonomous scheduled interactions
  const initialQueue = buildAutonomousLifeFlowQueue(char, DEFAULT_SMART_OBJECTS, 3, false);
  assert.equal(initialQueue.length, 3);
  for (let i = 0; i < initialQueue.length; i++) {
    assert.ok(initialQueue[i].durationSeconds >= 3600);
    assert.notEqual(initialQueue[i].objectId, 'obj_stove', 'Should not immediately repeat active object');
    if (i > 0) {
      assert.notEqual(
        initialQueue[i].objectId,
        initialQueue[i - 1].objectId,
        'Consecutive scheduled items should not repeat the same object'
      );
    }
  }

  // 2. Player queues a specific smart object (e.g. Bookshelf) — prioritized at index 0
  const bookshelf = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_bookshelf')!;
  const afterPlayerEnqueue = enqueueSmartObjectInteraction(initialQueue, bookshelf, 'PLAYER_QUEUED');
  assert.equal(afterPlayerEnqueue[0].objectId, 'obj_bookshelf');
  assert.equal(afterPlayerEnqueue[0].source, 'PLAYER_QUEUED');

  // 3. Promote item at index 2 to index 0 ("Up Next")
  const itemAt2 = afterPlayerEnqueue[2];
  const promoted = promoteScheduledInteraction(afterPlayerEnqueue, itemAt2.id);
  assert.equal(promoted[0].id, itemAt2.id);
  assert.equal(promoted[0].source, 'PLAYER_QUEUED');

  // 4. Remove the first item
  const afterRemove = removeScheduledInteraction(promoted, itemAt2.id);
  assert.equal(afterRemove.some((x) => x.id === itemAt2.id), false);

  // 5. Dequeue next scheduled interaction when task completes
  const dequeued = dequeueNextScheduledInteraction(afterRemove, DEFAULT_SMART_OBJECTS);
  assert.ok(dequeued.nextItem);
  assert.ok(dequeued.nextObject);
  assert.equal(dequeued.nextObject.id, afterRemove[0].objectId);
  assert.equal(dequeued.remainingQueue.length, afterRemove.length - 1);
});

test('Multi-Story Homes: Toons can build an Upstairs Loft (Y=+2.95m) or Subterranean Basement (Y=-3.2m) with starter furnishings', async () => {
  const { DEFAULT_SMART_OBJECTS } = await import('./simulation.ts');
  const {
    executeToonBuildStory,
    getStarterObjectsForStory,
    evaluateBuilderAutonomousActions,
  } = await import('./builderAgent.ts');

  const builderChar = {
    ...PRESET_SCENARIOS[0].characters[1], // Marcus Chen (Builder trait)
    traits: ['Builder', 'Ambitious'],
    actionTimer: 0,
    currentAction: 'Idle',
    selfTalk: '',
  };

  // 1. Toon builds Upstairs Second-Floor Loft
  const upstairsRes = executeToonBuildStory(
    builderChar,
    'UPSTAIRS',
    DEFAULT_SMART_OBJECTS,
    5000
  );
  assert.equal(upstairsRes.story, 'UPSTAIRS');
  assert.ok(upstairsRes.spawnedObjects.length >= 2, 'Expected starter SecondFloor objects to spawn');
  for (const obj of upstairsRes.spawnedObjects) {
    assert.equal(obj.room, 'SecondFloor');
    assert.ok(
      Math.abs(obj.gridPos.y - 2.95) < 0.05,
      `Expected Upstairs object ${obj.id} at Y=2.95, got ${obj.gridPos.y}`
    );
    assert.ok(obj.durationSeconds >= 3600);
  }
  assert.equal(upstairsRes.newFunds, 5000 - 2400);

  // 2. Toon builds Subterranean Basement Level
  const basementRes = executeToonBuildStory(
    builderChar,
    'BASEMENT',
    DEFAULT_SMART_OBJECTS,
    5000
  );
  assert.equal(basementRes.story, 'BASEMENT');
  assert.ok(basementRes.spawnedObjects.length >= 2, 'Expected starter Basement objects to spawn');
  for (const obj of basementRes.spawnedObjects) {
    assert.equal(obj.room, 'Basement');
    assert.ok(
      Math.abs(obj.gridPos.y - -3.2) < 0.05,
      `Expected Basement object ${obj.id} at Y=-3.2, got ${obj.gridPos.y}`
    );
    assert.ok(obj.durationSeconds >= 3600);
  }
  assert.equal(basementRes.newFunds, 5000 - 2200);

  // 3. Autonomous builder evaluation triggers Basement construction when Upstairs is already built
  const autoBasement = evaluateBuilderAutonomousActions(
    builderChar,
    [...DEFAULT_SMART_OBJECTS, ...getStarterObjectsForStory('UPSTAIRS', DEFAULT_SMART_OBJECTS)],
    2, // expansionLevel = 2 (Upstairs built)
    '02:00 PM',
    4500,
    false // hasBasement = false
  );
  assert.equal(autoBasement.action.type, 'EXPAND_FLOOR');
  assert.equal(autoBasement.action.builtStory, 'BASEMENT');
  assert.ok((autoBasement.action.spawnedStoryObjects || []).length >= 2);
});

test('Non-Toon Object Collision Type System prevents furniture and architectural objects from clipping into each other, walls, or stairwells', async () => {
  const {
    DEFAULT_SMART_OBJECTS,
    getObjectCollisionProfile,
    checkNonToonObjectOverlap,
    resolveNonToonObjectPlacement,
    declipAllSmartObjects,
  } = await import('./simulation.ts');

  // 1. Verify collision types are assigned accurately across categories
  const sofaProfile = getObjectCollisionProfile({ id: 'obj_sofa', name: 'Plush Sofa' });
  assert.equal(sofaProfile.collisionType, 'SOLID_FURNITURE');
  assert.equal(sofaProfile.blocksFurniturePlacement, true);

  const wallProfile = getObjectCollisionProfile({
    id: 'wall_1',
    partType: 'WALL_SEGMENT',
    width: 4.0,
    depth: 0.3,
  });
  assert.equal(wallProfile.collisionType, 'ARCHITECTURAL_WALL');

  const stairsProfile = getObjectCollisionProfile({
    id: 'stairs_1',
    partType: 'STAIRS',
    width: 1.5,
    depth: 3.8,
  });
  assert.equal(stairsProfile.collisionType, 'STAIRWELL_KEEP_CLEAR');

  const rugProfile = getObjectCollisionProfile({
    id: 'deck_1',
    partType: 'DECK_PATIO',
    width: 4,
    depth: 4,
  });
  assert.equal(rugProfile.collisionType, 'SURFACE_WALKABLE');
  assert.equal(rugProfile.blocksToons, false);

  // 2. Placing a new sofa on top of an existing sofa (4.5, 0, -2.2) detects collision & resolves to a non-clipping coordinate
  const existingSofa = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_sofa')!;
  const initialOverlap = checkNonToonObjectOverlap(
    {
      x: existingSofa.gridPos.x,
      y: existingSofa.gridPos.y,
      z: existingSofa.gridPos.z,
      halfW: sofaProfile.halfW,
      halfD: sofaProfile.halfD,
      margin: sofaProfile.margin,
      collisionType: sofaProfile.collisionType,
    },
    DEFAULT_SMART_OBJECTS,
    [],
    true,
    'obj_new_sofa'
  );
  assert.equal(initialOverlap.colliding, true);
  assert.equal(initialOverlap.collidingWithId, 'obj_sofa');

  const resolvedPlacement = resolveNonToonObjectPlacement(
    { ...existingSofa.gridPos },
    {
      id: 'obj_new_sofa',
      name: 'Second Sofa',
      room: 'LivingRoom',
    },
    DEFAULT_SMART_OBJECTS,
    [],
    true
  );
  assert.equal(resolvedPlacement.wasAdjusted, true);

  const verifyAfterResolve = checkNonToonObjectOverlap(
    {
      x: resolvedPlacement.safePos.x,
      y: resolvedPlacement.safePos.y,
      z: resolvedPlacement.safePos.z,
      halfW: sofaProfile.halfW,
      halfD: sofaProfile.halfD,
      margin: sofaProfile.margin,
      collisionType: sofaProfile.collisionType,
    },
    DEFAULT_SMART_OBJECTS,
    [],
    true,
    'obj_new_sofa'
  );
  assert.equal(
    verifyAfterResolve.colliding,
    false,
    `Expected resolved furniture position (${resolvedPlacement.safePos.x}, ${resolvedPlacement.safePos.z}) to have zero clipping, collided with: ${verifyAfterResolve.collidingWithId}`
  );

  // 3. Placing an object inside the Basement Stairwell Keep-Clear zone (-1.8, 0, 1.7) pushes it out of the stairwell
  const stairwellAttempt = resolveNonToonObjectPlacement(
    { x: -1.8, y: 0, z: 1.7 },
    {
      id: 'obj_hall_plant',
      name: 'Hallway Planter',
      room: 'LivingRoom',
    },
    DEFAULT_SMART_OBJECTS,
    [],
    true
  );
  assert.equal(stairwellAttempt.wasAdjusted, true);
  const plantProf = getObjectCollisionProfile({ id: 'obj_hall_plant', name: 'Hallway Planter' });
  const verifyStairwellClear = checkNonToonObjectOverlap(
    {
      x: stairwellAttempt.safePos.x,
      y: stairwellAttempt.safePos.y,
      z: stairwellAttempt.safePos.z,
      halfW: plantProf.halfW,
      halfD: plantProf.halfD,
      margin: plantProf.margin,
      collisionType: plantProf.collisionType,
    },
    DEFAULT_SMART_OBJECTS,
    [],
    true,
    'obj_hall_plant'
  );
  assert.equal(verifyStairwellClear.colliding, false);

  // 4. declipAllSmartObjects separates intentionally stacked duplicate objects
  const stackedObjects = [
    ...DEFAULT_SMART_OBJECTS,
    {
      ...existingSofa,
      id: 'obj_duplicate_clipping_sofa',
      gridPos: { ...existingSofa.gridPos },
    },
  ];
  const declipped = declipAllSmartObjects(stackedObjects, [], true);
  const dup = declipped.find((o) => o.id === 'obj_duplicate_clipping_sofa')!;
  const distBetweenSofas = Math.hypot(
    dup.gridPos.x - existingSofa.gridPos.x,
    dup.gridPos.z - existingSofa.gridPos.z
  );
  assert.ok(
    distBetweenSofas > 1.2,
    `Expected declipAllSmartObjects to separate stacked sofas by > 1.2m, got ${distBetweenSofas.toFixed(2)}m`
  );
});

test('Autonomous House Events: enforces multi-hour cooldown, executes without user prompt, assigns specific food/task, and permanently imprints Good or Bad personality traits (plus Known & Custom Prompted events)', async () => {
  const { DEFAULT_SMART_OBJECTS } = await import('./simulation.ts');
  const {
    createInitialHouseMemory,
    MIN_AUTONOMOUS_EVENT_COOLDOWN_GAME_SECONDS,
    shouldSpawnAutonomousHouseEvent,
    executeAutonomousHouseEvent,
    KNOWN_HOUSE_EVENT_CATALOG,
  } = await import('./houseAgent.ts');

  // 1. Events cannot spawn before the 4-hour (14,400s) cooldown has elapsed, even with a 0.0 random roll
  assert.equal(MIN_AUTONOMOUS_EVENT_COOLDOWN_GAME_SECONDS, 14400);
  assert.equal(shouldSpawnAutonomousHouseEvent(10000, 8000, 0.0), false);
  assert.equal(shouldSpawnAutonomousHouseEvent(8000 + 14400, 8000, 0.00005), true);

  const mem = createInitialHouseMemory();
  const baseChars = PRESET_SCENARIOS[0].characters.map((c) => ({
    ...c,
    actionTimer: 3600,
    currentAction: 'Idle',
    selfTalk: '',
  }));

  // 2. Autonomous event executes immediately without waiting for user choice, assigns food task, and imprints Good trait (roll = 0.2)
  const goodRes = executeAutonomousHouseEvent(
    mem,
    baseChars,
    DEFAULT_SMART_OBJECTS,
    'FAMILY_FRIENDLY',
    '12:30 PM',
    {
      knownEventId: 'known_evt_szechuan_ramen',
      targetCharId: 'char_elena',
      randomRoll: 0.2,
    }
  );
  const elenaGood = goodRes.updatedCharacters.find((c) => c.id === 'char_elena')!;
  assert.ok(elenaGood.currentAction.includes('Szechuan Peppercorn Ramen'));
  assert.ok(elenaGood.traits.includes('Spice Connoisseur'));
  assert.equal(elenaGood.acquiredQuirks?.[0]?.polarity, 'GOOD');
  assert.equal(elenaGood.acquiredQuirks?.[0]?.traitName, 'Spice Connoisseur');

  // 3. Bad outcome roll (roll = 0.95) imprints Bad personality trait on character
  const badRes = executeAutonomousHouseEvent(
    goodRes.updatedMemory,
    baseChars,
    DEFAULT_SMART_OBJECTS,
    'FAMILY_FRIENDLY',
    '06:00 PM',
    {
      knownEventId: 'known_evt_mystery_leftovers',
      targetCharId: 'char_marcus',
      randomRoll: 0.95,
    }
  );
  const marcusBad = badRes.updatedCharacters.find((c) => c.id === 'char_marcus')!;
  assert.ok(marcusBad.traits.includes('Queasy Hypochondriac'));
  assert.equal(marcusBad.acquiredQuirks?.[0]?.polarity, 'BAD');

  // 4. Custom user-prompted event ("Eat Ghost Pepper Tacos") generates task and imprints personality trait
  const customRes = executeAutonomousHouseEvent(
    badRes.updatedMemory,
    baseChars,
    DEFAULT_SMART_OBJECTS,
    'FAMILY_FRIENDLY',
    '08:15 PM',
    {
      customPrompt: 'Eat Ghost Pepper Tacos',
      targetCharId: 'char_sophia',
      randomRoll: 0.15,
    }
  );
  const sophiaCustom = customRes.updatedCharacters.find((c) => c.id === 'char_sophia')!;
  assert.ok(sophiaCustom.currentAction.toLowerCase().includes('ghost pepper tacos'));
  assert.ok((sophiaCustom.acquiredQuirks || []).length >= 1);
  assert.ok(KNOWN_HOUSE_EVENT_CATALOG.length >= 6);
});

test('Autonomous World Life & Mortality Cycle progresses toons through Young Adult -> Adult -> Elder -> Passing and spawns successor generations without user intervention', async () => {
  const {
    DEFAULT_SMART_OBJECTS,
    advanceWorldLifeAndMortalityCycle,
  } = await import('./simulation.ts');

  const youngChar = {
    ...PRESET_SCENARIOS[0].characters[1], // Marcus Cole (Young Adult)
    ageStage: 'Young Adult' as const,
    daysLived: 6.5,
    lineageGeneration: 1,
    actionTimer: 3600,
    currentAction: 'Painting',
    selfTalk: '',
  };

  // 1. Advancing 1 in-game day (86,400s) matures Young Adult (6.5 -> 7.5d) into Adult
  const stepAdult = advanceWorldLifeAndMortalityCycle(
    [youngChar],
    86400,
    false,
    DEFAULT_SMART_OBJECTS,
    '09:00 AM'
  );
  assert.equal(stepAdult.updatedCharacters[0].ageStage, 'Adult');

  // 2. Advancing 9 more days (7.5 -> 16.5d) matures Adult into Elder
  const stepElder = advanceWorldLifeAndMortalityCycle(
    stepAdult.updatedCharacters,
    9 * 86400,
    false,
    DEFAULT_SMART_OBJECTS,
    '09:00 AM'
  );
  assert.equal(stepElder.updatedCharacters[0].ageStage, 'Elder');

  // 3. Advancing 10 more days (16.5 -> 26.5d) triggers peaceful Old Age passing and spawns a Gen 2 Young Adult successor
  const stepPassing = advanceWorldLifeAndMortalityCycle(
    stepElder.updatedCharacters,
    10 * 86400,
    false,
    DEFAULT_SMART_OBJECTS,
    '09:00 AM'
  );
  assert.equal(stepPassing.memorials.length, 1);
  assert.equal(stepPassing.memorials[0].name, youngChar.name);
  assert.equal(stepPassing.updatedCharacters.length, 1);
  assert.notEqual(stepPassing.updatedCharacters[0].id, youngChar.id);
  assert.equal(stepPassing.updatedCharacters[0].ageStage, 'Young Adult');
  assert.equal(stepPassing.updatedCharacters[0].lineageGeneration, 2);
});

test('Toon Knowledgebase System acquires real-world events, stories, and real book summaries into toon memory to increase intelligence and drive decision-making', async () => {
  const {
    DEFAULT_SMART_OBJECTS,
    REAL_WORLD_BOOKS_LIBRARY,
    createInitialToonKnowledgebase,
    ingestNewspaperAndBookKnowledge,
    evaluateKnowledgeDrivenDecisionBonus,
    getIntelligenceEfficiencyMultiplier,
  } = await import('./simulation.ts');
  const { learnFromMediaObject } = await import('./builderAgent.ts');

  assert.ok(REAL_WORLD_BOOKS_LIBRARY.length >= 8, 'Expected at least 8 real published books in library');

  const baseChar = {
    ...PRESET_SCENARIOS[0].characters[2], // Sophia Reed (Outgoing, Foodie, Bookworm)
    actionTimer: 3600,
    currentAction: 'Idle',
    selfTalk: '',
  };

  // 1. Initial knowledgebase seeds baseline IQ and starter real book summary
  const initKb = createInitialToonKnowledgebase(baseChar);
  assert.ok(initKb.intelligenceScore >= 100);
  assert.equal(initKb.booksRead.length, 1);

  // 2. Background Newspaper/Book Ingestion implants a real book summary and world event into privateMemory & knowledgebase
  const ingested1 = ingestNewspaperAndBookKnowledge(
    { ...baseChar, knowledgebase: initKb, intelligenceScore: initKb.intelligenceScore },
    {
      headline: 'Breakthrough Synaptic Brain Mapping Completed by Researchers',
      realStory: 'Scientists mapped 130,000 neurons showing how reading consolidates decision-making.',
    },
    '08:30 AM'
  );

  const charAfter1 = ingested1.updatedChar;
  assert.ok(
    (charAfter1.intelligenceScore || 0) > initKb.intelligenceScore,
    'Expected toon intelligenceScore to increase after processing world event and real book summary'
  );
  assert.equal(charAfter1.knowledgebase?.booksRead.length, 2);
  assert.equal(charAfter1.knowledgebase?.worldEvents.length, 1);
  assert.ok(
    charAfter1.privateMemory.some((m) => m.includes('[BOOK MEMORY •') && m.includes(ingested1.acquiredBook.title)),
    'Expected a summary of a real book to be stored in toon privateMemory'
  );
  assert.ok(
    charAfter1.privateMemory.some((m) => m.includes('[WORLD EVENT & STORY]')),
    'Expected real-world event & story to be stored in toon privateMemory'
  );

  // 3. Decision-making bonus & cognitive efficiency scale up with acquired books and intelligence
  const stoveObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_stove')!;
  const bonusEval = evaluateKnowledgeDrivenDecisionBonus(charAfter1, stoveObj, {
    ...charAfter1.motives,
    hunger: 35,
  });
  assert.ok(bonusEval.bonusScore > 0, 'Expected positive decision-making bonus from knowledgebase & IQ foresight');
  assert.ok(getIntelligenceEfficiencyMultiplier(charAfter1) > 1.0);

  // 4. Interacting with obj_newspaper or obj_bookshelf via learnFromMediaObject updates knowledgebase & memory
  const newspaperObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_newspaper')!;
  const mediaRes = learnFromMediaObject(charAfter1, newspaperObj, [
    'Sustainable Timber Architecture Expands Across Cities',
  ]);
  assert.ok(mediaRes.updatedKnowledgebase);
  assert.ok((mediaRes.updatedIntelligenceScore || 0) > (charAfter1.intelligenceScore || 0));
  assert.ok((mediaRes.updatedKnowledgebase?.booksRead.length || 0) >= 3);
});

test('Life Experience Tracker dynamically updates a toon trait list based on frequent autonomous activities and major world events, enabling gradual personality shifts and opposing trait replacement', async () => {
  const {
    DEFAULT_SMART_OBJECTS,
    createInitialLifeExperienceTracker,
    classifyObjectToExperienceDomain,
    recordLifeExperienceActivity,
    recordLifeExperienceWorldEvent,
  } = await import('./simulation.ts');

  // 1. Classify smart objects into distinct experience domains
  const stoveObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_stove')!;
  const bookshelfObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_bookshelf')!;
  const laptopObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_laptop_desk')!;
  assert.equal(classifyObjectToExperienceDomain(stoveObj), 'CULINARY');
  assert.equal(classifyObjectToExperienceDomain(bookshelfObj), 'INTELLECTUAL');
  assert.equal(classifyObjectToExperienceDomain(laptopObj), 'ARCHITECTURAL');

  // 2. Test opposing trait gradual replacement: Marcus starts with ['Creative', 'Artistic', 'Lazy']
  // Repeated architectural/ambitious activities & world events gradually shift 'Lazy' -> 'Builder'
  let marcus = {
    ...PRESET_SCENARIOS[0].characters[1], // Marcus Cole (Creative, Artistic, Lazy)
    actionTimer: 7200,
    currentAction: 'Idle',
    selfTalk: '',
  };
  marcus.lifeExperience = createInitialLifeExperienceTracker(marcus);
  assert.equal(marcus.lifeExperience.domains.ARCHITECTURAL.opposingTrait, 'Lazy');
  assert.equal(marcus.lifeExperience.domains.ARCHITECTURAL.emergentTrait, 'Builder');

  // Perform 2 architectural activities + 1 major architecture world event to cross the 100 XP threshold
  const step1 = recordLifeExperienceActivity(marcus, {
    object: laptopObj,
    durationSeconds: 7200,
    timeStr: '10:00 AM',
  });
  marcus = step1.updatedChar;
  assert.equal(step1.shiftedTrait, undefined);

  const step2 = recordLifeExperienceActivity(marcus, {
    object: laptopObj,
    durationSeconds: 7200,
    timeStr: '01:00 PM',
  });
  marcus = step2.updatedChar;

  const step3 = recordLifeExperienceWorldEvent(marcus, {
    headline: 'Cross-Laminated Timber Lofts Set New Benchmark for Multi-Story Architecture',
    bookDomain: 'ARCHITECTURE',
    bookTitle: 'A Pattern Language',
    timeStr: '04:00 PM',
  });
  marcus = step3.updatedChar;

  assert.ok(step3.shiftedTrait, 'Expected Marcus to cross 100 XP threshold and trigger a personality shift');
  assert.equal(step3.shiftedTrait?.replacedTrait, 'Lazy');
  assert.equal(step3.shiftedTrait?.addedTrait, 'Builder');
  assert.ok(!marcus.traits.includes('Lazy'), 'Expected opposing trait "Lazy" to be replaced');
  assert.ok(marcus.traits.includes('Builder'), 'Expected new evolved trait "Builder" in traits list');
  assert.equal(marcus.lifeExperience?.traitShiftHistory.length, 1);

  // 3. Test Tier-2 mastery trait evolution when character already has Tier-1 trait:
  // Sophia starts with ['Outgoing', 'Foodie', 'Bookworm'] -> frequent culinary activities evolve 'Master Chef'
  let sophia = {
    ...PRESET_SCENARIOS[0].characters[2],
    actionTimer: 7200,
    currentAction: 'Idle',
    selfTalk: '',
  };
  sophia.lifeExperience = createInitialLifeExperienceTracker(sophia);
  assert.equal(sophia.lifeExperience.domains.CULINARY.emergentTrait, 'Master Chef');

  const c1 = recordLifeExperienceActivity(sophia, {
    object: stoveObj,
    durationSeconds: 7200,
    timeStr: '11:00 AM',
  });
  const c2 = recordLifeExperienceWorldEvent(c1.updatedChar, {
    headline: 'Artisanal Fermentation & Slow Simmering Revival Sweeps Home Kitchens',
    bookDomain: 'CULINARY',
    bookTitle: 'Salt, Fat, Acid, Heat',
    timeStr: '02:00 PM',
  });
  assert.ok(c2.shiftedTrait, 'Expected Sophia to evolve Tier-2 culinary trait "Master Chef"');
  assert.equal(c2.shiftedTrait?.addedTrait, 'Master Chef');
  assert.ok(c2.updatedChar.traits.includes('Master Chef'));
  assert.ok(c2.updatedChar.lifeExperience?.evolvedTraits.includes('Master Chef'));
});

test('Personality Evolution Radar: maps 7 standardized personality trait axes and tracks multi-temporal snapshots over time (Live vs Day 1 Baseline and evolutionary shifts)', async () => {
  const {
    DEFAULT_SMART_OBJECTS,
    ALL_PERSONALITY_AXES,
    PERSONALITY_AXES_CONFIG,
    computePersonalityTraitScores,
    getCharacterPersonalitySnapshots,
    createInitialLifeExperienceTracker,
    recordLifeExperienceActivity,
    recordLifeExperienceWorldEvent,
  } = await import('./simulation.ts');

  // 1. Verify 7 axes configuration
  assert.equal(ALL_PERSONALITY_AXES.length, 7);
  for (const axis of ALL_PERSONALITY_AXES) {
    const cfg = PERSONALITY_AXES_CONFIG[axis];
    assert.ok(cfg.label);
    assert.ok(cfg.color);
    assert.ok(cfg.positiveTraits.length > 0);
  }

  // 2. Initial traits mapping for Marcus (Creative, Artistic, Lazy)
  let marcus = {
    ...PRESET_SCENARIOS[0].characters[1], // Marcus Cole
    traits: ['Creative', 'Artistic', 'Lazy'],
    actionTimer: 7200,
    currentAction: 'Idle',
    selfTalk: '',
  };
  marcus.lifeExperience = createInitialLifeExperienceTracker(marcus);

  const baselineScores = computePersonalityTraitScores(marcus);
  assert.ok(
    baselineScores.creative >= 55,
    `Expected high creative score for Marcus, got ${baselineScores.creative}`
  );
  assert.ok(
    baselineScores.lazy >= 65,
    `Expected high lazy score for Marcus, got ${baselineScores.lazy}`
  );
  assert.ok(
    baselineScores.ambitious <= 35,
    `Expected lower ambitious score for Lazy Marcus, got ${baselineScores.ambitious}`
  );

  // 3. Verify temporal snapshot generator returns Day 1 Baseline and Live snapshot
  const initialSnapshots = getCharacterPersonalitySnapshots(marcus, 1);
  assert.ok(initialSnapshots.length >= 2);
  assert.equal(initialSnapshots[0].label, 'Day 1 Genesis Baseline');
  assert.equal(initialSnapshots[initialSnapshots.length - 1].label, 'Current Live State');

  // 4. Simulate Marcus performing architectural tasks & world events to trigger Lazy -> Builder shift
  const laptopObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_laptop_desk')!;
  const s1 = recordLifeExperienceActivity(marcus, { object: laptopObj, durationSeconds: 7200 });
  const s2 = recordLifeExperienceActivity(s1.updatedChar, { object: laptopObj, durationSeconds: 7200 });
  const s3 = recordLifeExperienceWorldEvent(s2.updatedChar, {
    headline: 'Cross-Laminated Timber Lofts Set New Benchmark',
    bookDomain: 'ARCHITECTURE',
    bookTitle: 'A Pattern Language',
  });
  marcus = s3.updatedChar;

  // Marcus shifted: Lazy -> Builder!
  assert.ok(marcus.traits.includes('Builder'));
  assert.ok(!marcus.traits.includes('Lazy'));

  // 5. Evaluate scores after personality evolution
  const evolvedScores = computePersonalityTraitScores(marcus);
  assert.ok(
    evolvedScores.lazy < baselineScores.lazy - 30,
    `Expected lazy score to drop significantly after Lazy -> Builder evolution, went from ${baselineScores.lazy} to ${evolvedScores.lazy}`
  );
  assert.ok(
    evolvedScores.ambitious > baselineScores.ambitious + 25,
    `Expected ambitious score to surge after becoming Builder, went from ${baselineScores.ambitious} to ${evolvedScores.ambitious}`
  );

  // 6. Verify multi-temporal snapshot history records the milestone shift
  const evolvedSnapshots = getCharacterPersonalitySnapshots(marcus, 2);
  assert.ok(
    evolvedSnapshots.length >= 3,
    `Expected at least 3 snapshots (Baseline, Shift Milestone, Live), got ${evolvedSnapshots.length}`
  );
  const milestoneSnap = evolvedSnapshots.find((s) => s.label.includes('Lazy → Builder'));
  assert.ok(milestoneSnap, 'Expected milestone snapshot recording Lazy → Builder shift');
  assert.ok(milestoneSnap.traitScores.ambitious > baselineScores.ambitious);

  // 7. Verify all axis scores stay within [5, 100] bounds
  for (const axis of ALL_PERSONALITY_AXES) {
    assert.ok(evolvedScores[axis] >= 5 && evolvedScores[axis] <= 100);
  }
});

test('Daily Aspirations System: generates specific daily life goals per toon, prioritizes them autonomously, grants immediate & multi-hour temporary motive boosts upon completion, and rolls new goals on a new in-game day', async () => {
  const {
    DEFAULT_SMART_OBJECTS,
    DAILY_ASPIRATION_TEMPLATES,
    createInitialDailyAspirationsState,
    evaluateDailyAspirationDecisionBonus,
    evaluateDailyAspirationProgress,
    tickDailyAspirationsAndBoosts,
    doesActivityMatchDailyAspiration,
  } = await import('./simulation.ts');

  assert.ok(DAILY_ASPIRATION_TEMPLATES.length >= 8);

  // 1. Initialize Daily Aspirations for Elena on Day 1
  let elena = {
    ...PRESET_SCENARIOS[0].characters[0], // Elena Vance (Ambitious, Neat, Perfectionist)
    motives: {
      hunger: 55,
      energy: 50,
      bladder: 70,
      hygiene: 55,
      social: 50,
      fun: 45,
      sanity: 60,
    },
    actionTimer: 7200,
    currentAction: 'Idle',
    selfTalk: '',
  };
  elena.dailyAspirations = createInitialDailyAspirationsState(
    elena,
    1,
    DEFAULT_SMART_OBJECTS,
    () => 0.42
  );

  assert.equal(elena.dailyAspirations.currentDay, 1);
  assert.equal(elena.dailyAspirations.aspirations.length, 3);
  assert.equal(elena.dailyAspirations.activeMotiveBoosts.length, 0);

  // Ensure all 3 generated aspirations are distinct
  const templateIds = new Set(elena.dailyAspirations.aspirations.map((a) => a.templateId));
  assert.equal(templateIds.size, 3);

  // 2. Verify autonomous decision bonus prioritizes objects matching an uncompleted Daily Aspiration
  const firstAsp = elena.dailyAspirations.aspirations[0];
  const matchingObj = DEFAULT_SMART_OBJECTS.find(
    (o) =>
      o.id === firstAsp.preferredObjectId ||
      doesActivityMatchDailyAspiration(firstAsp, { object: o })
  )!;
  assert.ok(matchingObj, 'Expected a matching SmartObject for the daily aspiration');

  const bonusBefore = evaluateDailyAspirationDecisionBonus(elena, matchingObj);
  assert.equal(bonusBefore.bonusScore, 28);
  assert.equal(bonusBefore.matchedAspiration?.id, firstAsp.id);

  // 3. Complete the first Daily Aspiration by interacting with the matching object
  const beforeMotives = { ...elena.motives };
  const progressStep = evaluateDailyAspirationProgress(elena, {
    object: matchingObj,
    activityLabel: matchingObj.actionLabel,
    timeStr: '11:30 AM',
    gameDay: 1,
  });

  elena = progressStep.updatedChar;
  assert.ok(progressStep.newlyCompleted.some((a) => a.id === firstAsp.id));
  assert.ok((elena.dailyAspirations?.activeMotiveBoosts.length || 0) >= 1);
  assert.ok((elena.dailyAspirations?.totalCompletedAllTime || 0) >= 1);

  // Verify immediate motive boost reward was applied
  const rewardedStat = Object.keys(firstAsp.motiveBoostReward)[0] as keyof typeof beforeMotives;
  assert.ok(
    elena.motives[rewardedStat] > beforeMotives[rewardedStat],
    `Expected motive ${rewardedStat} to increase from ${beforeMotives[rewardedStat]} after completing Daily Aspiration, got ${elena.motives[rewardedStat]}`
  );

  // Once completed, that aspiration no longer triggers an uncompleted bonus
  const updatedFirstAsp = elena.dailyAspirations!.aspirations.find((a) => a.id === firstAsp.id)!;
  assert.equal(updatedFirstAsp.completed, true);

  // 4. Advance time by 2 hours on Day 1: active temporary motive boost decrements timer and buoys motives
  const tickSameDay = tickDailyAspirationsAndBoosts(
    elena,
    7200,
    1,
    DEFAULT_SMART_OBJECTS,
    '01:30 PM'
  );
  assert.equal(tickSameDay.rolledNewDay, false);
  assert.ok(
    tickSameDay.updatedChar.dailyAspirations!.activeMotiveBoosts[0].remainingGameSeconds <
      firstAsp.boostDurationSeconds
  );

  // 5. Advance to Day 2 (24 hours elapsed): expired temporary motive boosts clear and 3 fresh Daily Aspirations roll for Day 2
  const tickNextDay = tickDailyAspirationsAndBoosts(
    tickSameDay.updatedChar,
    86400,
    2,
    DEFAULT_SMART_OBJECTS,
    '08:00 AM',
    () => 0.85
  );
  assert.equal(tickNextDay.rolledNewDay, true);
  assert.equal(tickNextDay.updatedChar.dailyAspirations?.currentDay, 2);
  assert.equal(tickNextDay.updatedChar.dailyAspirations?.aspirations.length, 3);
  assert.ok(
    tickNextDay.updatedChar.dailyAspirations?.aspirations.every((a) => !a.completed && a.assignedDay === 2),
    'Expected fresh uncompleted Daily Aspirations assigned to Day 2'
  );
  assert.equal(tickNextDay.updatedChar.dailyAspirations?.activeMotiveBoosts.length, 0);
});

test('1-10 Basic Needs System (Hungry, Hygiene, Sleep, Use the Bathroom): values range 1-10, slowly deplete over time, require specific actions to increase, and trigger autonomous emergency interrupts when <= 3.0', async () => {
  const {
    DEFAULT_SMART_OBJECTS,
    BASIC_NEEDS_CONFIG,
    getCharacterBasicNeeds1To10,
    depleteBasicNeeds1To10,
    fulfillBasicNeedWithAction,
    evaluateUrgentBasicNeedInterrupt,
    getRequiredObjectForBasicNeed,
  } = await import('./simulation.ts');
  const { selectVariedAutonomousObject } = await import('./builderAgent.ts');

  // 1. Verify all 4 basic needs exist in BASIC_NEEDS_CONFIG with 1-10 scale settings
  for (const key of ['hungry', 'hygiene', 'sleep', 'bathroom'] as const) {
    assert.ok(BASIC_NEEDS_CONFIG[key], `Expected config for basic need ${key}`);
    assert.ok(BASIC_NEEDS_CONFIG[key].depletionPerHour > 0);
    assert.equal(BASIC_NEEDS_CONFIG[key].criticalThreshold, 3.0);
    assert.ok(BASIC_NEEDS_CONFIG[key].replenishAmount1To10 >= 4.0);
  }

  let char = {
    ...PRESET_SCENARIOS[0].characters[0], // Elena Vance
    basicNeeds: {
      hungry: 8.0,
      hygiene: 8.0,
      sleep: 8.0,
      bathroom: 8.0,
    },
    actionTimer: 3600,
    currentAction: 'Idle',
    selfTalk: '',
  };

  // 2. Slowly deplete needs over 4 in-game hours (14,400 seconds)
  const afterDepletion = depleteBasicNeeds1To10(char, 4 * 3600, 1.0);
  const depletedNeeds = getCharacterBasicNeeds1To10(afterDepletion);
  assert.ok(
    depletedNeeds.hungry < 8.0 && depletedNeeds.hungry >= 1.0,
    `Expected hungry to deplete below 8.0, got ${depletedNeeds.hungry}`
  );
  assert.ok(
    depletedNeeds.hygiene < 8.0 && depletedNeeds.hygiene >= 1.0,
    `Expected hygiene to deplete below 8.0, got ${depletedNeeds.hygiene}`
  );
  assert.ok(
    depletedNeeds.sleep < 8.0 && depletedNeeds.sleep >= 1.0,
    `Expected sleep to deplete below 8.0, got ${depletedNeeds.sleep}`
  );
  assert.ok(
    depletedNeeds.bathroom < 8.0 && depletedNeeds.bathroom >= 1.0,
    `Expected bathroom to deplete below 8.0, got ${depletedNeeds.bathroom}`
  );

  // Extreme depletion clamps cleanly at 1.0 minimum
  const extremeDepleted = depleteBasicNeeds1To10(char, 100 * 3600, 1.0);
  const minNeeds = getCharacterBasicNeeds1To10(extremeDepleted);
  assert.equal(minNeeds.hungry, 1.0);
  assert.equal(minNeeds.hygiene, 1.0);
  assert.equal(minNeeds.sleep, 1.0);
  assert.equal(minNeeds.bathroom, 1.0);

  // 3. Specific actions must be taken to increase each 1-10 need:
  let lowNeedChar = {
    ...char,
    basicNeeds: {
      hungry: 2.2,
      hygiene: 2.4,
      sleep: 2.1,
      bathroom: 1.8,
    },
  };

  // 3a. Bathroom need increased by using the Toilet (obj_toilet)
  const toiletObj = getRequiredObjectForBasicNeed('bathroom', DEFAULT_SMART_OBJECTS)!;
  assert.ok(toiletObj.id.includes('toilet'));
  const afterToilet = fulfillBasicNeedWithAction(lowNeedChar, {
    object: toiletObj,
    timeStr: '09:00 AM',
  });
  assert.ok(
    afterToilet.updatedChar.basicNeeds!.bathroom > 8.0,
    `Expected using Toilet to increase bathroom need from 1.8 to > 8.0, got ${afterToilet.updatedChar.basicNeeds!.bathroom}`
  );

  // 3b. Hungry need increased by cooking/eating at Stove (obj_stove)
  const stoveObj = getRequiredObjectForBasicNeed('hungry', DEFAULT_SMART_OBJECTS)!;
  const afterCook = fulfillBasicNeedWithAction(afterToilet.updatedChar, {
    object: stoveObj,
    timeStr: '10:00 AM',
  });
  assert.ok(
    afterCook.updatedChar.basicNeeds!.hungry > 7.0,
    `Expected cooking at Stove to increase hungry need from 2.2 to > 7.0, got ${afterCook.updatedChar.basicNeeds!.hungry}`
  );

  // 3c. Hygiene need increased by bathing in Bathtub (obj_bathtub)
  const bathtubObj = getRequiredObjectForBasicNeed('hygiene', DEFAULT_SMART_OBJECTS)!;
  const afterBath = fulfillBasicNeedWithAction(afterCook.updatedChar, {
    object: bathtubObj,
    timeStr: '11:30 AM',
  });
  assert.ok(
    afterBath.updatedChar.basicNeeds!.hygiene > 8.0,
    `Expected taking a bath to increase hygiene need from 2.4 to > 8.0, got ${afterBath.updatedChar.basicNeeds!.hygiene}`
  );

  // 3d. Sleep need increased by sleeping in Bed (obj_bed)
  const bedObj = getRequiredObjectForBasicNeed('sleep', DEFAULT_SMART_OBJECTS)!;
  const afterSleep = fulfillBasicNeedWithAction(afterBath.updatedChar, {
    object: bedObj,
    timeStr: '10:00 PM',
  });
  assert.ok(
    afterSleep.updatedChar.basicNeeds!.sleep > 8.0,
    `Expected sleeping in Bed to increase sleep need from 2.1 to > 8.0, got ${afterSleep.updatedChar.basicNeeds!.sleep}`
  );

  // 4. Option 1 Emergency Autonomous Interrupt: when bathroom need is 2.0/10, autonomous selector immediately chooses the Toilet
  const desperateChar = {
    ...char,
    basicNeeds: {
      hungry: 7.5,
      hygiene: 7.5,
      sleep: 7.5,
      bathroom: 2.0,
    },
  };
  const interruptEval = evaluateUrgentBasicNeedInterrupt(desperateChar, DEFAULT_SMART_OBJECTS);
  assert.equal(interruptEval.urgentNeed, 'bathroom');
  assert.equal(interruptEval.targetObject?.id, 'obj_toilet');

  const autoChosen = selectVariedAutonomousObject(desperateChar, DEFAULT_SMART_OBJECTS, 'CLEAR');
  assert.equal(autoChosen?.id, 'obj_toilet');
});

test('Options 2, 3, 4 & 5 Progression Systems: 1-10 Social Affinity Matrix, 1-10 Skill Mastery Trees & Royalties, Dynamic Moodlets & Emotions, and Household Legacy Milestones', async () => {
  const {
    DEFAULT_SMART_OBJECTS,
    updateRelationshipBetweenToons,
    createInitialSkillTree,
    advanceCharacterSkillFromAction,
    evaluateCharacterMoodletsAndEmotion,
    createInitialHouseholdLegacyMilestones,
    evaluateHouseholdLegacyMilestones,
  } = await import('./simulation.ts');

  const elena: Character = {
    ...PRESET_SCENARIOS[0].characters[0],
    basicNeeds: { hungry: 8.5, hygiene: 8.5, sleep: 8.5, bathroom: 8.5 },
    actionTimer: 3600,
    currentAction: 'Idle',
    selfTalk: '',
  };
  const marcus: Character = {
    ...PRESET_SCENARIOS[0].characters[1],
    basicNeeds: { hungry: 2.4, hygiene: 8.0, sleep: 8.0, bathroom: 8.0 },
    actionTimer: 3600,
    currentAction: 'Idle',
    selfTalk: '',
  };

  // Option 2: Social Affinity Matrix (1-10 scale) updates on conversations
  let spk: Character = elena;
  let lst: Character = marcus;
  for (let i = 0; i < 4; i++) {
    const relRes = updateRelationshipBetweenToons(spk, lst, '02:00 PM');
    spk = relRes.updatedSpeaker;
    lst = relRes.updatedListener;
  }
  const elenaToMarcus = spk.relationships![marcus.id];
  assert.ok(
    elenaToMarcus.affinity1To10 > 6.5 && elenaToMarcus.affinity1To10 <= 10.0,
    `Expected 1-10 affinity to grow above 6.5 after conversations, got ${elenaToMarcus.affinity1To10}`
  );
  assert.equal(elenaToMarcus.sharedConversationsCount, 5);

  // Option 3: 1-10 Skill Mastery Tree & Masterwork Royalties
  let painter: Character = { ...marcus, skillTree: createInitialSkillTree(marcus) };
  const easelObj = DEFAULT_SMART_OBJECTS.find((o) => o.id === 'obj_easel')!;
  const beforePaintLvl = painter.skillTree!.painting.level1To10;
  const skillStep = advanceCharacterSkillFromAction(painter, easelObj, '03:00 PM');
  painter = skillStep.updatedChar;
  assert.ok(
    painter.skillTree!.painting.level1To10 > beforePaintLvl,
    `Expected painting skill level to increase from ${beforePaintLvl} to ${painter.skillTree!.painting.level1To10}`
  );
  assert.ok(skillStep.royaltyEarned > 0, 'Expected masterwork royalty Simoleons from skilled painting');

  // Option 4: Dynamic Moodlets & Emotional State Engine
  const elenaMood = evaluateCharacterMoodletsAndEmotion(spk, DEFAULT_SMART_OBJECTS, 'CLEAR');
  assert.ok(
    ['Content', 'Energized', 'Inspired', 'Focused'].includes(elenaMood.emotionalState),
    `Expected positive emotional state for well-cared-for Elena, got ${elenaMood.emotionalState}`
  );
  const marcusRavenousMood = evaluateCharacterMoodletsAndEmotion(marcus, DEFAULT_SMART_OBJECTS, 'CLEAR');
  assert.equal(marcusRavenousMood.emotionalState, 'Ravenous');
  assert.ok(marcusRavenousMood.activeMoodlets.some((m) => m.id === 'mood_ravenous'));

  // Option 5: Household Legacy Milestones unlock and grant Simoleon bonuses
  const initMilestones = createInitialHouseholdLegacyMilestones();
  const milestoneEval = evaluateHouseholdLegacyMilestones({
    characters: [spk, painter],
    smartObjects: DEFAULT_SMART_OBJECTS,
    funds: 4200,
    hasUpstairs: true,
    hasBasement: false,
    existingMilestones: initMilestones,
    timeStr: '05:00 PM',
  });
  assert.ok(
    milestoneEval.newlyUnlocked.length >= 2,
    `Expected at least 2 legacy milestones to unlock (Balanced Needs, Multi-Story Estate, etc.), got ${milestoneEval.newlyUnlocked.length}`
  );
  assert.ok(milestoneEval.totalBonusSimoleons >= 1000);
});

test('Social Web Graph & Baby Reproduction: builds affinity-weighted edges and allows unrelated strong male/female bonds to have a baby while blocking related or same-sex pairs', async () => {
  const {
    createInitialRelationshipsForCharacter,
    updateRelationshipBetweenToons,
    buildSocialWebGraph,
    areCharactersRelated,
    canHaveBabyTogether,
    haveBabyBetweenToons,
    BABY_AFFINITY_THRESHOLD,
  } = await import('./simulation.ts');

  let elena: Character = {
    ...PRESET_SCENARIOS[0].characters[0], // Feminine
    id: 'char_elena',
    name: 'Elena Vance',
    genderFrame: 'Feminine',
    basicNeeds: { hungry: 8.5, hygiene: 8.5, sleep: 8.5, bathroom: 8.5 },
    actionTimer: 3600,
    currentAction: 'Idle',
    selfTalk: '',
  };
  let marcus: Character = {
    ...PRESET_SCENARIOS[0].characters[1], // Masculine
    id: 'char_marcus',
    name: 'Marcus Vance',
    genderFrame: 'Masculine',
    basicNeeds: { hungry: 8.0, hygiene: 8.0, sleep: 8.0, bathroom: 8.0 },
    actionTimer: 3600,
    currentAction: 'Idle',
    selfTalk: '',
  };
  let sophia: Character = {
    ...PRESET_SCENARIOS[0].characters[2], // Feminine
    id: 'char_sophia',
    name: 'Sophia Chen',
    genderFrame: 'Feminine',
    basicNeeds: { hungry: 8.0, hygiene: 8.0, sleep: 8.0, bathroom: 8.0 },
    actionTimer: 3600,
    currentAction: 'Idle',
    selfTalk: '',
  };

  const baseHousehold = [elena, marcus, sophia];
  elena.relationships = createInitialRelationshipsForCharacter(elena, baseHousehold);
  marcus.relationships = createInitialRelationshipsForCharacter(marcus, baseHousehold);
  sophia.relationships = createInitialRelationshipsForCharacter(sophia, baseHousehold);

  // 1. Initially affinity is ~5.6 (< 8.5 threshold), so Elena & Marcus cannot have a baby yet
  const initialBabyCheck = canHaveBabyTogether(elena, marcus, [elena, marcus, sophia]);
  assert.equal(initialBabyCheck.eligible, false);
  assert.ok(initialBabyCheck.reason.includes(BABY_AFFINITY_THRESHOLD.toFixed(1)));

  // 2. Build initial Social Web graph and verify nodes and edges exist with valid coordinates & stroke widths
  const initialWeb = buildSocialWebGraph(elena, [elena, marcus, sophia]);
  assert.equal(initialWeb.nodes.length, 3);
  assert.equal(initialWeb.edges.length, 3); // 3 pairs among 3 characters
  for (const edge of initialWeb.edges) {
    assert.ok(edge.strokeWidth >= 1.5 && edge.strokeWidth <= 6.5);
    assert.ok(edge.strokeColor.startsWith('#'));
  }

  // 3. Strengthen bond between unrelated Feminine (Elena) and Masculine (Marcus) above 8.5/10
  for (let i = 0; i < 4; i++) {
    const step = updateRelationshipBetweenToons(
      elena,
      marcus,
      '06:00 PM',
      'Deepening our bond together',
      1.25
    );
    elena = step.updatedSpeaker;
    marcus = step.updatedListener;
  }
  assert.ok(
    elena.relationships![marcus.id].affinity1To10 >= BABY_AFFINITY_THRESHOLD,
    `Expected Elena-Marcus affinity >= ${BABY_AFFINITY_THRESHOLD}, got ${elena.relationships![marcus.id].affinity1To10}`
  );
  assert.equal(elena.relationships![marcus.id].status, 'Soulmate');
  assert.equal(elena.relationships![marcus.id].canHaveBaby, true);

  // 4. Same-sex pair (Elena & Sophia) even at 9.8 affinity cannot have a baby
  const sameSexBoost = updateRelationshipBetweenToons(
    elena,
    sophia,
    '06:30 PM',
    'Best friends forever',
    4.5
  );
  elena = sameSexBoost.updatedSpeaker;
  sophia = sameSexBoost.updatedListener;
  const sameSexCheck = canHaveBabyTogether(elena, sophia, [elena, marcus, sophia]);
  assert.equal(sameSexCheck.eligible, false);

  // 5. Unrelated opposite-sex pair (Elena & Marcus) with >= 8.5 affinity CAN have a baby
  const readyCheck = canHaveBabyTogether(elena, marcus, [elena, marcus, sophia]);
  assert.equal(readyCheck.eligible, true);

  const { DEFAULT_SMART_OBJECTS } = await import('./simulation.ts');
  const birthResult = haveBabyBetweenToons(
    elena,
    marcus,
    [elena, marcus, sophia],
    DEFAULT_SMART_OBJECTS,
    '07:00 PM'
  );
  assert.equal(birthResult.success, true);
  assert.ok(birthResult.baby, 'Expected baby character to be born');
  assert.equal(birthResult.updatedCharacters.length, 4);
  const baby = birthResult.baby!;
  assert.equal(baby.isBabyOrChild, true);
  assert.ok(baby.parentIds?.includes(elena.id));
  assert.ok(baby.parentIds?.includes(marcus.id));

  // 6. Verify relatedness: baby is related to both parents, and family bonds prevent reproduction
  const updatedElena = birthResult.updatedCharacters.find((c) => c.id === elena.id)!;
  const updatedMarcus = birthResult.updatedCharacters.find((c) => c.id === marcus.id)!;
  assert.equal(areCharactersRelated(baby, updatedElena), true);
  assert.equal(areCharactersRelated(baby, updatedMarcus), true);
  assert.equal(updatedElena.relationships![baby.id].status, 'Family Bond');
  assert.equal(updatedElena.relationships![baby.id].isRelated, true);
  assert.equal(updatedElena.relationships![baby.id].canHaveBaby, false);

  const postBirthWeb = buildSocialWebGraph(updatedElena, birthResult.updatedCharacters);
  assert.equal(postBirthWeb.nodes.length, 4);
  assert.equal(postBirthWeb.edges.length, 6); // 4 * 3 / 2 = 6 edges
});

test('Entity Persuasion & Sims-Style Multi-Level Floor Switcher: steps floor levels cleanly and ensures Entity only spawns/modifies house items while refusing direct toon control', async () => {
  const {
    stepFloorLevel,
    getFloorCameraTargetY,
    FLOOR_LEVELS_ORDER,
    createInitialHouseMemory,
    evaluateEntityPersuasionRequest,
  } = await import('./houseAgent.ts');
  const { DEFAULT_SMART_OBJECTS, PRESET_SCENARIOS } = await import('./simulation.ts');

  // 1. Sims-style floor stack order & stepping
  assert.deepEqual(FLOOR_LEVELS_ORDER, ['UPSTAIRS', 'MAIN', 'BASEMENT']);
  assert.equal(stepFloorLevel('MAIN', 'UP'), 'UPSTAIRS');
  assert.equal(stepFloorLevel('UPSTAIRS', 'UP'), 'UPSTAIRS'); // clamped at top
  assert.equal(stepFloorLevel('MAIN', 'DOWN'), 'BASEMENT');
  assert.equal(stepFloorLevel('BASEMENT', 'DOWN'), 'BASEMENT'); // clamped at bottom
  assert.ok(getFloorCameraTargetY('UPSTAIRS') > getFloorCameraTargetY('MAIN'));
  assert.ok(getFloorCameraTargetY('MAIN') > getFloorCameraTargetY('BASEMENT'));

  const memory = createInitialHouseMemory();
  const chars: Character[] = PRESET_SCENARIOS[0].characters.map((c) => ({
    ...c,
    actionTimer: 3600,
    currentAction: 'Idle',
    selfTalk: '',
  }));

  // 2. Refuses direct character control when user attempts to force/command a toon
  const directControlAttempt = evaluateEntityPersuasionRequest(
    'Force Elena to go to sleep right now and command Marcus to talk to her!',
    memory,
    DEFAULT_SMART_OBJECTS,
    chars,
    'FAMILY_FRIENDLY',
    '08:15 AM'
  );
  assert.equal(directControlAttempt.convinced, false);
  assert.equal(directControlAttempt.actionType, 'REFUSE_DIRECT_CONTROL');
  assert.equal(directControlAttempt.updatedSmartObjects.length, DEFAULT_SMART_OBJECTS.length);

  // 3. Unconvincing short demand requires more persuasion
  const weakAttempt = evaluateEntityPersuasionRequest(
    'give item',
    memory,
    DEFAULT_SMART_OBJECTS,
    chars,
    'FAMILY_FRIENDLY',
    '08:20 AM'
  );
  assert.equal(weakAttempt.convinced, false);
  assert.equal(weakAttempt.actionType, 'NEEDS_MORE_PERSUASION');

  // 4. Convincing argument persuades the Entity to SPAWN a new non-clipping item in the house
  const spawnConvince = evaluateEntityPersuasionRequest(
    'Dear Entity, I respectfully appeal to your architectural wisdom because the household is exhausted and hungry; please manifest a gourmet banquet table in the kitchen so they may choose to dine.',
    memory,
    DEFAULT_SMART_OBJECTS,
    chars,
    'FAMILY_FRIENDLY',
    '08:25 AM'
  );
  assert.equal(spawnConvince.convinced, true);
  assert.equal(spawnConvince.actionType, 'SPAWN_ITEM');
  assert.ok(spawnConvince.spawnedObject, 'Expected a spawned SmartObject');
  assert.equal(
    spawnConvince.updatedSmartObjects.length,
    DEFAULT_SMART_OBJECTS.length + 1
  );

  // 5. Convincing argument to upgrade/modify an existing house item
  const modifyConvince = evaluateEntityPersuasionRequest(
    'O Architect Entity, please upgrade and modify the stove in the kitchen because the residents would benefit from a finely tuned culinary appliance.',
    spawnConvince.updatedMemory,
    spawnConvince.updatedSmartObjects,
    chars,
    'FAMILY_FRIENDLY',
    '08:30 AM'
  );
  assert.equal(modifyConvince.convinced, true);
  assert.equal(modifyConvince.actionType, 'MODIFY_ITEM');
  assert.ok(
    modifyConvince.modifiedObjectPatch?.name?.startsWith('Entity-Tuned'),
    `Expected modified item name to start with Entity-Tuned, got ${modifyConvince.modifiedObjectPatch?.name}`
  );
});

test('Standard Room Generation Rules, Varied Room Sizes/Layouts, Consistent Wall/Floor Styles & Individual Bed Per Toon Tired/Awakeness Management', async () => {
  const {
    ROOM_GENERATION_RULES,
    generateStandardRoomModule,
    validateHouseRoomsCompliance,
    generateProceduralBlueprintFromPrompt,
  } = await import('./worldBuilder.ts');
  const {
    DEFAULT_SMART_OBJECTS,
    PRESET_SCENARIOS,
    getPersonalBedForToon,
    getCharacterTiredAwakenessStatus,
    ensurePersonalBedsForAllToons,
    getRequiredObjectForBasicNeed,
    evaluateUrgentBasicNeedInterrupt,
  } = await import('./simulation.ts');

  // 1. Verify ROOM_GENERATION_RULES covers Kitchen, Bathroom, Bedroom, LivingRoom, Study with doors, windows, furniture & matched wall/floor styles
  for (const roomType of ['Kitchen', 'Bathroom', 'Bedroom', 'LivingRoom', 'Study'] as const) {
    const rule = ROOM_GENERATION_RULES[roomType];
    assert.ok(rule, `Expected ROOM_GENERATION_RULES entry for ${roomType}`);
    assert.ok(rule.minDoors >= 1, `Expected at least 1 door required for ${roomType}`);
    assert.ok(rule.minWindows >= 1, `Expected at least 1 window required for ${roomType}`);
    assert.ok(rule.layoutVariants.length >= 2, `Expected multiple layout/size variants for ${roomType}`);
    assert.ok(
      rule.consistentStylePairings.length >= 2,
      `Expected matched wall/floor style pairings for ${roomType}`
    );
  }

  // Verify specific required fixtures per intended room use
  const kitchenFixtures = ROOM_GENERATION_RULES.Kitchen.requiredFixtures.map((f) => f.fixtureKey);
  assert.deepEqual(kitchenFixtures.sort(), ['fridge', 'sink', 'stove', 'supper_table'].sort());

  const bathroomFixtures = ROOM_GENERATION_RULES.Bathroom.requiredFixtures.map((f) => f.fixtureKey);
  assert.deepEqual(bathroomFixtures.sort(), ['bathtub', 'toilet'].sort());

  const bedroomFixtures = ROOM_GENERATION_RULES.Bedroom.requiredFixtures.map((f) => f.fixtureKey);
  assert.ok(bedroomFixtures.includes('bed'));
  assert.equal(ROOM_GENERATION_RULES.Bedroom.requiresBedPerToon, true);

  // Verify realistic standard room proportions: Bathroom is compact relative to Bedroom & Kitchen
  const bathArea =
    ROOM_GENERATION_RULES.Bathroom.standardSizeMeters.width *
    ROOM_GENERATION_RULES.Bathroom.standardSizeMeters.depth;
  const bedArea =
    ROOM_GENERATION_RULES.Bedroom.standardSizeMeters.width *
    ROOM_GENERATION_RULES.Bedroom.standardSizeMeters.depth;
  assert.ok(
    bathArea < bedArea * 0.55,
    `Expected Bathroom standard area (${bathArea.toFixed(1)}m²) to be realistically smaller than Bedroom (${bedArea.toFixed(1)}m²)`
  );

  // 2. Verify generateStandardRoomModule produces different sizes/layouts across variants and consistent wall/floor pairings
  const kitchenVar0 = generateStandardRoomModule('Kitchen', { x: -4.8, y: 0, z: -3.2 }, { layoutVariantIndex: 0 });
  const kitchenVar1 = generateStandardRoomModule('Kitchen', { x: -4.8, y: 0, z: -3.2 }, { layoutVariantIndex: 1 });
  assert.notDeepEqual(
    { w: kitchenVar0.roomBlock.width, d: kitchenVar0.roomBlock.depth },
    { w: kitchenVar1.roomBlock.width, d: kitchenVar1.roomBlock.depth },
    'Expected room layout variants to produce different room dimensions'
  );
  assert.ok(kitchenVar0.stylePairing.wallPatternId.startsWith('wp_'));
  assert.ok(kitchenVar0.stylePairing.floorPatternId.startsWith('fl_'));
  assert.equal(kitchenVar0.spawnedSmartObjects.length, 4); // stove, sink, fridge, supper_table

  // 3. Verify starter house (DEFAULT_SMART_OBJECTS + PRESET_SCENARIOS[0]) complies with all room & 1-bed-per-toon rules
  const starterChars = PRESET_SCENARIOS[0].characters.map((c) => ({
    ...c,
    actionTimer: 3600,
    currentAction: 'Idle',
    selfTalk: '',
  }));
  const defaultWallpapers = {
    LivingRoom: 'wp_classic_wainscot',
    Kitchen: 'wp_terracotta_venetian',
    Bedroom: 'wp_botanical_sage',
    Bathroom: 'wp_classic_wainscot',
    Study: 'wp_midcentury_teak',
  };
  const defaultCarpets = {
    LivingRoom: 'fl_honey_oak',
    Kitchen: 'fl_checker_marble',
    Bedroom: 'fl_plush_berber',
    Bathroom: 'fl_checker_marble',
    Study: 'fl_mahogany_herringbone',
  };
  const starterCompliance = validateHouseRoomsCompliance(
    [],
    DEFAULT_SMART_OBJECTS,
    starterChars,
    defaultWallpapers,
    defaultCarpets
  );
  assert.equal(
    starterCompliance.allCompliant,
    true,
    `Expected starter house to pass room compliance`
  );
  assert.ok(starterCompliance.reports.Bedroom.bedCountForToons.actual >= starterChars.length);

  // 4. Verify each toon in the household has their own dedicated personal bed and tired/awakeness status
  const assignedBedIds = new Set<string>();
  for (const toon of starterChars) {
    const personalBed = getPersonalBedForToon(toon, DEFAULT_SMART_OBJECTS);
    assert.ok(personalBed, `Expected ${toon.name} to have a personal bed`);
    assert.equal(
      personalBed.assignedToonId,
      toon.id,
      `Expected ${toon.name}'s bed (${personalBed.id}) to be assigned to ${toon.id}`
    );
    assignedBedIds.add(personalBed.id);

    const status = getCharacterTiredAwakenessStatus(toon, DEFAULT_SMART_OBJECTS);
    assert.ok(status.awakeness1To10 >= 1 && status.awakeness1To10 <= 10);
    assert.ok(status.tiredness1To10 >= 0 && status.tiredness1To10 <= 9);
    assert.equal(status.assignedBedId, personalBed.id);
  }
  assert.equal(
    assignedBedIds.size,
    starterChars.length,
    'Expected every toon to have a distinct personal bed ID'
  );

  // 5. Verify autonomous tired/sleep need routing sends each toon to their OWN assigned bed
  const tiredMarcus = {
    ...starterChars[1], // Marcus Cole (assignedBedId: 'obj_bed_marcus')
    basicNeeds: {
      hungry: 8.0,
      hygiene: 8.0,
      sleep: 2.1, // Exhausted!
      bathroom: 8.0,
    },
  };
  const marcusSleepObj = getRequiredObjectForBasicNeed('sleep', DEFAULT_SMART_OBJECTS, tiredMarcus);
  assert.equal(marcusSleepObj?.id, 'obj_bed_marcus');

  const marcusInterrupt = evaluateUrgentBasicNeedInterrupt(tiredMarcus, DEFAULT_SMART_OBJECTS);
  assert.equal(marcusInterrupt.urgentNeed, 'sleep');
  assert.equal(marcusInterrupt.targetObject?.id, 'obj_bed_marcus');

  // 6. Verify ensurePersonalBedsForAllToons spawns a new dedicated bed when a 4th toon joins the household
  const fourthToon = {
    ...starterChars[0],
    id: 'char_newcomer_4',
    name: 'Leo Vance',
    assignedBedId: undefined,
    assignedBedName: undefined,
  };
  const ensured = ensurePersonalBedsForAllToons(
    [...starterChars, fourthToon],
    DEFAULT_SMART_OBJECTS
  );
  assert.equal(ensured.updatedCharacters.length, 4);
  const leoAfter = ensured.updatedCharacters.find((c) => c.id === 'char_newcomer_4')!;
  assert.ok(leoAfter.assignedBedId, 'Expected newcomer Leo to be assigned a dedicated personal bed');
  const leoBed = ensured.updatedObjects.find((o) => o.id === leoAfter.assignedBedId);
  assert.ok(leoBed, 'Expected Leo’s personal bed to exist in updatedObjects');
  assert.equal(leoBed?.assignedToonId, 'char_newcomer_4');

  // 7. Verify procedural house generator creates compliant rooms & 1 personal bed per toon
  const procHouse = generateProceduralBlueprintFromPrompt(
    'Modern craftsman family home with cozy bedrooms',
    'FAMILY_FRIENDLY'
  );
  const procCompliance = validateHouseRoomsCompliance(
    procHouse.blueprint.placedParts,
    procHouse.smartObjects,
    procHouse.characters,
    procHouse.roomWallpapers,
    procHouse.roomCarpets
  );
  assert.equal(
    procCompliance.allCompliant,
    true,
    `Expected procedurally generated house to satisfy all room & bed rules`
  );
});

test('Cost-Effective AI Model Registry, Unified Toon Progression Snapshot, Personal Bed Sanctuary Bonus, and Entity Persuasion work end-to-end', async () => {
  const {
    AI_MODEL_IDENTIFIERS,
    COST_EFFECTIVE_AI_MODEL_REGISTRY,
    getCostEffectiveModelSpec,
    CostEffectiveResponseCache,
  } = await import('./aiModelConfig.ts');
  const {
    DEFAULT_SMART_OBJECTS,
    PRESET_SCENARIOS,
    ensurePersonalBedsForAllToons,
    fulfillBasicNeedWithAction,
    evaluateUnifiedToonProgressionSnapshot,
    createInitialToonKnowledgebase,
    createInitialSkillTree,
    createInitialLifeExperienceTracker,
    createInitialDailyAspirationsState,
    createInitialRelationshipsForCharacter,
    motivesToBasicNeeds1To10,
  } = await import('./simulation.ts');
  const { selectVariedAutonomousObject } = await import('./builderAgent.ts');
  const {
    createInitialHouseMemory,
    evaluateEntityPersuasionRequest,
  } = await import('./houseAgent.ts');

  // 1. Verify cost-effective AI model registry uses gemini-3.1-flash-lite and procedural Web Audio synth
  assert.equal(AI_MODEL_IDENTIFIERS.FLASH_LITE, 'gemini-3.1-flash-lite');
  assert.equal(
    getCostEffectiveModelSpec('ENTITY_PERSUASION_CHAT').primaryModel,
    'gemini-3.1-flash-lite'
  );
  assert.equal(
    getCostEffectiveModelSpec('WORLD_BUILDER_BLUEPRINT').primaryModel,
    'gemini-3.1-flash-lite'
  );
  assert.equal(
    getCostEffectiveModelSpec('SCREENSAVER_AMBIENT_MUSIC').primaryModel,
    'web-audio-procedural-synth'
  );
  assert.ok(Object.keys(COST_EFFECTIVE_AI_MODEL_REGISTRY).length >= 6);

  // Verify LRU response cache eviction and TTL
  const cache = new CostEffectiveResponseCache<string>(2, 60000);
  cache.set('k1', 'val1');
  cache.set('k2', 'val2');
  assert.equal(cache.get('k1'), 'val1');
  cache.set('k3', 'val3'); // Evicts k2 since k1 was just touched
  assert.equal(cache.get('k2'), undefined);
  assert.equal(cache.get('k1'), 'val1');
  assert.equal(cache.get('k3'), 'val3');

  // 2. Verify Personal Bed Sanctuary Bonus (+8.2 sleep gain in own bed vs +6.8 in generic bed)
  const synced = ensurePersonalBedsForAllToons(
    PRESET_SCENARIOS[0].characters.map((c) => ({
      ...c,
      basicNeeds: motivesToBasicNeeds1To10(c.motives),
      actionTimer: 0,
      currentAction: 'Idle',
      selfTalk: '',
    })),
    DEFAULT_SMART_OBJECTS
  );
  const elena = {
    ...synced.updatedCharacters[0],
    basicNeeds: { hungry: 7.0, hygiene: 7.0, sleep: 1.5, bathroom: 7.0 },
  };
  const elenaOwnBed = synced.updatedObjects.find((o) => o.id === elena.assignedBedId)!;
  const marcusBed = synced.updatedObjects.find(
    (o) => o.id === synced.updatedCharacters[1].assignedBedId
  )!;

  const sleepInOwnBed = fulfillBasicNeedWithAction(elena, { object: elenaOwnBed });
  const sleepInOtherBed = fulfillBasicNeedWithAction(elena, { object: marcusBed });
  assert.ok(
    sleepInOwnBed.updatedChar.basicNeeds!.sleep > sleepInOtherBed.updatedChar.basicNeeds!.sleep,
    `Expected sleeping in own personal bed (${sleepInOwnBed.updatedChar.basicNeeds!.sleep}) to restore more sleep than another bed (${sleepInOtherBed.updatedChar.basicNeeds!.sleep})`
  );
  assert.ok(
    (sleepInOwnBed.logMessage || '').includes('Personal Bed Sanctuary Bonus'),
    `Expected logMessage to note Personal Bed Sanctuary Bonus, got: ${sleepInOwnBed.logMessage}`
  );

  // 3. Verify selectVariedAutonomousObject prioritizes own personal bed when tired and avoids other toons' beds
  const tiredElena = {
    ...elena,
    motives: { ...elena.motives, energy: 22 },
    basicNeeds: { hungry: 8.5, hygiene: 8.5, sleep: 2.2, bathroom: 8.5 },
    recentObjectIds: [],
  };
  const chosenForTiredElena = selectVariedAutonomousObject(
    tiredElena,
    synced.updatedObjects,
    'CLEAR'
  );
  assert.equal(
    chosenForTiredElena?.id,
    elena.assignedBedId,
    `Expected tired Elena to autonomously pick her own personal bed (${elena.assignedBedId}), got ${chosenForTiredElena?.id}`
  );

  // 4. Verify evaluateUnifiedToonProgressionSnapshot aggregates all latest progression systems
  const fullElena = {
    ...elena,
    knowledgebase: createInitialToonKnowledgebase(elena),
    skillTree: createInitialSkillTree(elena),
    lifeExperience: createInitialLifeExperienceTracker(elena),
    dailyAspirations: createInitialDailyAspirationsState(elena, 1, synced.updatedObjects),
    relationships: createInitialRelationshipsForCharacter(elena, synced.updatedCharacters),
  };
  const snapshot = evaluateUnifiedToonProgressionSnapshot(
    fullElena,
    synced.updatedCharacters,
    synced.updatedObjects
  );
  assert.ok(snapshot.overallProgressionIndex >= 10 && snapshot.overallProgressionIndex <= 100);
  assert.ok(snapshot.progressionRankTitle.length > 3);
  assert.equal(snapshot.tiredAwakenessStatus.assignedBedId, elenaOwnBed.id);
  assert.equal(snapshot.tiredAwakenessStatus.assignedBedName, elenaOwnBed.name);
  assert.ok(snapshot.topSkill.level1To10 >= 1);
  assert.ok(snapshot.knowledgeIq >= 100);

  // 5. Verify Entity persuasion spawns SmartObjects with valid `effects` and `logMessage`
  const mem = createInitialHouseMemory();
  const persuadeSpawn = evaluateEntityPersuasionRequest(
    'Oh great Entity, please spawn a gourmet pizza on the supper table because the toons are starving',
    mem,
    synced.updatedObjects,
    synced.updatedCharacters,
    'FAMILY_FRIENDLY',
    '06:30 PM'
  );
  assert.equal(persuadeSpawn.convinced, true);
  assert.ok(persuadeSpawn.spawnedObject, 'Expected Entity to spawn a SmartObject');
  assert.ok(
    persuadeSpawn.spawnedObject!.effects &&
      typeof persuadeSpawn.spawnedObject!.effects === 'object',
    'Expected Entity-spawned SmartObject to have a valid effects dictionary'
  );
  assert.ok((persuadeSpawn.logMessage || '').length > 5);
});

test('Hybrid House Builder generates non-square multi-wing houses with zero room overlap, bathroom doors, and exterior windows', async () => {
  const {
    HOUSE_FOOTPRINT_PRESETS,
    generateProceduralBlueprintFromPrompt,
  } = await import('./worldBuilder.ts');

  assert.equal(HOUSE_FOOTPRINT_PRESETS.length, 4);

  for (const preset of HOUSE_FOOTPRINT_PRESETS) {
    const generated = generateProceduralBlueprintFromPrompt(preset.promptHint, 'FAMILY_FRIENDLY');
    const parts = generated.blueprint.placedParts;

    // Must have non-square multi-wing rooms (LivingRoom, Kitchen, Bedroom, Bathroom, Study)
    const roomBlocks = parts.filter((p) => p.partType === 'ROOM_BLOCK');
    assert.ok(roomBlocks.length >= 5, `Preset ${preset.id} should have at least 5 room wings`);

    // Verify room blocks do not have identical square centers or overlap
    for (let i = 0; i < roomBlocks.length; i++) {
      for (let j = i + 1; j < roomBlocks.length; j++) {
        const a = roomBlocks[i];
        const b = roomBlocks[j];
        const overlapX = Math.abs(a.gridPos.x - b.gridPos.x) < (a.width + b.width) / 2 - 0.05;
        const overlapZ = Math.abs(a.gridPos.z - b.gridPos.z) < (a.depth + b.depth) / 2 - 0.05;
        assert.equal(
          overlapX && overlapZ,
          false,
          `Room wings ${a.name} and ${b.name} overlapped in preset ${preset.id}`
        );
      }
    }

    // Must include Bathroom door, Bedroom door, Front door, and at least 5 windows
    const doors = parts.filter((p) => p.partType === 'DOOR');
    const windows = parts.filter((p) => p.partType === 'WINDOW');
    assert.ok(doors.length >= 4, `Preset ${preset.id} must include >= 4 doors including Bathroom door`);
    assert.ok(
      doors.some((d) => d.id.includes('bath')),
      `Preset ${preset.id} must explicitly place a Bathroom door`
    );
    assert.ok(windows.length >= 5, `Preset ${preset.id} must include >= 5 exterior windows`);
  }
});

test('Entity 3D Asset Forge synthesizes multi-primitive 3D assets from prompts and places them collision-free', async () => {
  const {
    generateEntity3DAssetFromPrompt,
    evaluateAutonomousEntityAssetNeed,
  } = await import('./houseAgent.ts');
  const {
    DEFAULT_SMART_OBJECTS,
    PRESET_SCENARIOS,
  } = await import('./simulation.ts');

  const testChars = PRESET_SCENARIOS[0].characters.map((c) => ({
    ...c,
    actionTimer: 0,
    currentAction: 'Idle',
    selfTalk: '',
  }));

  // 1. Prompt-driven 3D asset synthesis & placement
  const alchemyRes = generateEntity3DAssetFromPrompt(
    'Crystal Alchemy Table with glowing orbs in the Study',
    'Study',
    DEFAULT_SMART_OBJECTS,
    [],
    testChars,
    '02:15 PM'
  );
  assert.ok(alchemyRes.smartObject.procedural3DSpec, 'Expected procedural3DSpec on generated SmartObject');
  assert.ok(
    alchemyRes.smartObject.procedural3DSpec!.subMeshes.length >= 5,
    'Expected multi-primitive 3D composition (>= 5 subMeshes)'
  );
  assert.equal(alchemyRes.smartObject.room, 'Study');

  // 2. Custom freeform prompt synthesis
  const customSculpture = generateEntity3DAssetFromPrompt(
    'Golden Celestial Astrolabe Pedestal',
    'LivingRoom',
    [...DEFAULT_SMART_OBJECTS, alchemyRes.smartObject],
    [],
    testChars,
    '02:20 PM'
  );
  assert.ok(customSculpture.smartObject.procedural3DSpec);
  assert.ok(customSculpture.smartObject.procedural3DSpec!.subMeshes.length >= 5);

  // 3. Autonomous Entity 3D asset generation when a toon lacks a bed or has low motives
  const unbeddedChars = [
    ...testChars,
    {
      ...testChars[0],
      id: 'char_new_guest',
      name: 'Vera Sterling',
      assignedBedId: undefined,
    },
  ];
  const autoBed = evaluateAutonomousEntityAssetNeed(
    unbeddedChars,
    DEFAULT_SMART_OBJECTS.filter((o) => !o.id.startsWith('obj_bed_guest')),
    [],
    '03:00 PM'
  );
  assert.equal(autoBed.needed, true, 'Expected Entity to autonomously synthesize a 3D bed when a resident lacks one');
  assert.ok(autoBed.generated?.smartObject.procedural3DSpec);
});

test('Starter house furniture and static colliders keep the Basement Stairwell 100% unobstructed', async () => {
  const { DEFAULT_SMART_OBJECTS } = await import('./simulation.ts');

  // Open ground-floor stairwell cutout spans X: [-2.45, -1.15], Z: [-1.0, 4.4]
  for (const obj of DEFAULT_SMART_OBJECTS) {
    if (Math.abs(obj.gridPos.y || 0) > 0.5) continue;
    const inStairwellX = obj.gridPos.x >= -2.55 && obj.gridPos.x <= -1.05;
    const inStairwellZ = obj.gridPos.z >= -1.1 && obj.gridPos.z <= 4.5;
    assert.equal(
      inStairwellX && inStairwellZ,
      false,
      `Ground-floor object ${obj.id} (${obj.name}) at (${obj.gridPos.x}, ${obj.gridPos.z}) blocks the Basement Stairwell cutout!`
    );
  }
});

test('validateHouseRoomsCompliance supports both canonical and 2-arg signatures and evaluateBuilderAutonomousActions AUTO_BUY branch executes without TypeError', async () => {
  const { validateHouseRoomsCompliance } = await import('./worldBuilder.ts');
  const { evaluateBuilderAutonomousActions } = await import('./builderAgent.ts');
  const { DEFAULT_SMART_OBJECTS, PRESET_SCENARIOS } = await import('./simulation.ts');

  // 1. 2-argument call (smartObjects, characterCount) returns missingRequirements array without throwing
  const twoArgReport = validateHouseRoomsCompliance(DEFAULT_SMART_OBJECTS, 3);
  assert.equal(typeof twoArgReport.allCompliant, 'boolean');
  assert.ok(Array.isArray(twoArgReport.missingRequirements));

  // 2. Partial object list identifies missing fixtures in missingRequirements
  const partialReport = validateHouseRoomsCompliance(
    DEFAULT_SMART_OBJECTS.filter((o) => !o.id.includes('stove')),
    3
  );
  assert.equal(partialReport.allCompliant, false);
  assert.ok(partialReport.missingRequirements.some((r) => r.includes('stove')));

  // 3. When both Upstairs (expansionLevel=2) and Basement (hasBasement=true) exist, evaluateBuilderAutonomousActions runs AUTO_BUY cleanly
  const builderChar = {
    ...PRESET_SCENARIOS[0].characters[0],
    traits: ['Builder', 'Creative'],
    actionTimer: 0,
    currentAction: 'Idle',
    selfTalk: '',
  };
  for (let i = 0; i < 30; i++) {
    const res = evaluateBuilderAutonomousActions(
      builderChar,
      DEFAULT_SMART_OBJECTS.slice(0, 5),
      2,
      '12:00 PM',
      3600,
      { hasUpstairs: true, hasBasement: true }
    );
    assert.ok(['NONE', 'AUTO_BUY', 'EXPAND_FLOOR'].includes(res.action.type));
  }
});

test('evaluateEscapeKeyAction: single ESC closes UI overlays and double ESC immediately enters Background Mode', async () => {
  const { evaluateEscapeKeyAction } = await import('./simulation.ts');

  // 1. First ESC press closes overlays and records timestamp
  const firstPress = evaluateEscapeKeyAction({
    lastEscTimestampMs: 0,
    nowTimestampMs: 1000,
    hasOpenOverlays: true,
    doublePressThresholdMs: 650,
  });
  assert.equal(firstPress.action, 'CLOSE_OVERLAYS');
  assert.equal(firstPress.nextLastEscTimestampMs, 1000);

  // 2. Second ESC press within 650ms triggers ENTER_BACKGROUND_MODE
  const secondPress = evaluateEscapeKeyAction({
    lastEscTimestampMs: firstPress.nextLastEscTimestampMs,
    nowTimestampMs: 1350,
    hasOpenOverlays: false,
    doublePressThresholdMs: 650,
  });
  assert.equal(secondPress.action, 'ENTER_BACKGROUND_MODE');
  assert.equal(secondPress.nextLastEscTimestampMs, 0);

  // 3. Delayed ESC press (> 650ms later) acts as a single ESC press
  const delayedPress = evaluateEscapeKeyAction({
    lastEscTimestampMs: 1000,
    nowTimestampMs: 2500,
    hasOpenOverlays: true,
    doublePressThresholdMs: 650,
  });
  assert.equal(delayedPress.action, 'CLOSE_OVERLAYS');
  assert.equal(delayedPress.nextLastEscTimestampMs, 2500);
});

test('buildHouseholdRelationshipGraph categorizes links between all active toons into Friendships, Rivalries, and Romantic links', async () => {
  const {
    PRESET_SCENARIOS,
    buildHouseholdRelationshipGraph,
    updateRelationshipBetweenToons,
  } = await import('./simulation.ts');

  const baseChars = PRESET_SCENARIOS[0].characters.map((c) => ({
    ...c,
    actionTimer: 3600,
    currentAction: 'Idle',
    selfTalk: '',
  }));

  // Boost Elena & Marcus into Romantic link, and push Marcus & Sophia into Rivalry
  const romStep = updateRelationshipBetweenToons(
    baseChars[0],
    baseChars[1],
    '08:30 PM',
    'Romantic candlelight confession',
    4.5
  );
  const rivStep = updateRelationshipBetweenToons(
    romStep.updatedListener,
    baseChars[2],
    '08:45 PM',
    'Fierce rivalry argument',
    -3.5
  );

  const chars = [romStep.updatedSpeaker, rivStep.updatedSpeaker, rivStep.updatedListener];
  const graph = buildHouseholdRelationshipGraph(chars);

  assert.equal(graph.counts.total, 3, 'Expected 3 unique connections among 3 active toons');
  assert.ok(
    graph.edges.some((e) => e.category === 'ROMANTIC' || e.category === 'FRIENDSHIP'),
    'Expected friendship or romantic edges in relationship graph'
  );
  assert.ok(
    graph.edges.some((e) => e.category === 'RIVALRY'),
    'Expected rivalry edge when affinity drops below 4.5'
  );
});

test('A* NavGrid Pathfinding & Anti-Stuck Toon Stepper route around furniture assets and through doorway portals', async () => {
  const {
    buildNavGridForBounds,
    findPathWaypoints,
    advanceToonAlongPath,
  } = await import('./pathfinding.ts');
  const { DEFAULT_SMART_OBJECTS, PRESET_SCENARIOS } = await import('./simulation.ts');

  // 1. Build NavGrid for the default house
  const grid = buildNavGridForBounds({
    smartObjects: DEFAULT_SMART_OBJECTS,
    includeDefaultHouseWalls: true,
  });
  assert.ok(grid.walkableCount > 200, 'Expected ample walkable cells across the house');
  assert.ok(grid.blockedCount > 20, 'Expected furniture and walls to mark blocked cells');

  // 2. Compute A* path from Kitchen (-6, 0, -4) through doorways into LivingRoom (5, 0, -2)
  const pathRes = findPathWaypoints({
    startPos: { x: -6, y: 0, z: -4 },
    goalPos: { x: 5, y: 0, z: -2 },
    smartObjects: DEFAULT_SMART_OBJECTS,
    includeDefaultHouseWalls: true,
  });
  assert.ok(pathRes.waypoints.length >= 1, 'Expected non-empty A* waypoint route');
  assert.ok(pathRes.totalPathDistance >= 10, 'Expected realistic travel distance across wings');

  // 3. Verify advanceToonAlongPath steps a toon cleanly and unsticks if blocked
  const agentMap = new Map();
  const char = {
    ...PRESET_SCENARIOS[0].characters[0],
    pos: { x: 5, y: 0, z: -2 },
    actionTimer: 3600,
    currentAction: 'Walking to sofa',
    selfTalk: '',
  };

  let curRig = { x: -6, y: 0, z: -4 };
  for (let frame = 0; frame < 15; frame++) {
    const step = advanceToonAlongPath({
      char,
      currentRigPos: curRig,
      resolvedGoal: { x: 5, y: 0, z: -2 },
      delta: 0.1,
      smartObjects: DEFAULT_SMART_OBJECTS,
      liveResolvedChars: [char],
      agentStateMap: agentMap,
    });
    curRig = step.nextPos;
    assert.equal(step.isMoving, true);
  }
  assert.ok(
    Math.hypot(curRig.x - -6, curRig.z - -4) > 0.5,
    'Expected toon to make continuous forward progress along A* path without getting stuck'
  );
});

test('Pre-Made Rooms Database provides Empty & Furnished variants with 100% mapped A* pathing and doorway connection rules', async () => {
  const {
    PREMADE_ROOMS_DATABASE,
    evaluateRoomConnectionCompatibility,
    stampPremadeRoomIntoWorld,
  } = await import('./premadeRoomsDatabase.ts');
  const { createEmptyGridBlueprint } = await import('./worldBuilder.ts');

  assert.equal(
    PREMADE_ROOMS_DATABASE.length,
    13,
    'Expected 13 pre-made rooms across Kitchen, LivingRoom, Bedroom, Bathroom, Study, Hallway, and Patio'
  );

  // Every pre-made room must have Empty & Furnished variants, doorway sockets, and mapped pathing
  for (const room of PREMADE_ROOMS_DATABASE) {
    assert.ok(room.doorwaySockets.length >= 1, `Room ${room.id} must have >= 1 doorway socket`);
    assert.equal(room.emptyVariant.variantType, 'EMPTY');
    assert.equal(room.emptyVariant.smartObjects.length, 0);
    assert.equal(room.furnishedVariant.variantType, 'FURNISHED');
    assert.ok(
      room.furnishedVariant.smartObjects.length >= 1,
      `Furnished variant of ${room.id} must contain furniture`
    );
    assert.equal(
      room.furnishedVariant.mappedPathing.reachabilityScore100,
      100,
      `Furnished room ${room.id} must have 100% verified doorway-to-fixture A* pathing`
    );
  }

  // Test doorway connection compatibility between Chef's Kitchen (EAST socket) and Sunlit Parlor Living Room (WEST socket)
  const kitchen = PREMADE_ROOMS_DATABASE.find((r) => r.id === 'premade_kitchen_chef_lshape')!;
  const living = PREMADE_ROOMS_DATABASE.find((r) => r.id === 'premade_living_bay_parlor')!;
  const compat = evaluateRoomConnectionCompatibility({
    anchorRoom: kitchen,
    anchorSocketId: 'sock_kitchen_east_arch',
    anchorWorldPos: { x: 0, z: 0 },
    candidateRoom: living,
    candidateSocketId: 'sock_living_west_arch',
  });
  assert.equal(compat.compatible, true, `Expected Kitchen EAST arch to connect to LivingRoom WEST arch: ${compat.reasons.join('; ')}`);

  // Test stamping a Furnished room onto an Empty Grid Blueprint
  const emptyBp = createEmptyGridBlueprint();
  const stamped = stampPremadeRoomIntoWorld({
    template: kitchen,
    variant: 'FURNISHED',
    worldPos: { x: 0, y: 0, z: 0 },
    currentBlueprint: emptyBp,
    currentSmartObjects: [],
  });
  assert.ok(stamped.updatedBlueprint.placedParts.length >= 6);
  assert.equal(stamped.updatedSmartObjects.length, kitchen.furnishedVariant.smartObjects.length);
});

test('World Save/Load System serializes, deserializes, exports/imports JSON, and merges local + cloud worlds with full WorldBlueprint fidelity', async () => {
  const {
    serializeWorldSave,
    deserializeWorldSave,
    exportWorldSaveToJson,
    importWorldSaveFromJson,
    mergeLocalAndCloudSaves,
  } = await import('./cloudSaveSystem.ts');
  const { generateProceduralBlueprintFromPrompt } = await import('./worldBuilder.ts');

  const generatedWorld = generateProceduralBlueprintFromPrompt(
    'Cozy L-shaped Craftsman cottage with artist studio and pool',
    'FAMILY_FRIENDLY'
  );

  const savedSlot = serializeWorldSave({
    saveId: 'world_test_craftsman',
    userId: 'user_test_123',
    slotName: 'Craftsman Studio World',
    folder: 'My Worlds',
    isAutoSave: false,
    simHour: 14.5,
    simDay: 3,
    characters: generatedWorld.characters,
    objects: generatedWorld.smartObjects,
    mechanics: {
      funds: 5420,
      expansionLevel: 2,
      hasBasement: true,
      activeFloor: 'MAIN',
      maturity: 'FAMILY_FRIENDLY',
      gameSeconds: 3 * 86400 + 14.5 * 3600,
      timeScale: 1,
      roomWallpapers: generatedWorld.roomWallpapers,
      roomCarpets: generatedWorld.roomCarpets,
      worldBlueprint: generatedWorld.blueprint,
    },
    updatedAt: '2026-10-26T15:00:00.000Z',
  });

  // Verify Firestore volumetric limits are respected
  assert.ok(savedSlot.characters.length <= 65536);
  assert.ok(savedSlot.objects.length <= 65536);
  assert.ok(savedSlot.mechanicsData.length <= 32768);

  const restored = deserializeWorldSave(savedSlot);
  assert.ok(restored, 'Expected deserializeWorldSave to return valid state');
  assert.equal(restored!.slotName, 'Craftsman Studio World');
  assert.equal(restored!.mechanics.funds, 5420);
  assert.equal(
    restored!.mechanics.worldBlueprint?.placedParts.length,
    generatedWorld.blueprint.placedParts.length,
    'Expected all placed architectural building parts to round-trip accurately'
  );
  assert.equal(
    restored!.smartObjects.length,
    generatedWorld.smartObjects.length,
    'Expected all smart objects to round-trip accurately'
  );

  // Verify JSON Export / Import round-trip
  const exportedJson = exportWorldSaveToJson(savedSlot);
  const reimported = importWorldSaveFromJson(exportedJson, 'user_test_123');
  assert.ok(reimported, 'Expected exported world JSON to import cleanly');
  assert.equal(reimported!.slotName, 'Craftsman Studio World');

  // Verify local + cloud merge prefers newer updatedAt and tags synced
  const olderLocal = { ...savedSlot, updatedAt: '2026-10-26T12:00:00.000Z', funds: 1000 };
  const newerCloud = { ...savedSlot, updatedAt: '2026-10-26T16:00:00.000Z' };
  const merged = mergeLocalAndCloudSaves([olderLocal], [newerCloud]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].storageSource, 'synced');
  assert.equal(merged[0].updatedAt, '2026-10-26T16:00:00.000Z');
});

test('Furniture Room Placement Rules enforce that room-specific furniture (beds in Bedroom, stove/fridge in Kitchen, toilet/tub/shower in Bathroom, etc.) is placed in its required room only', async () => {
  const {
    DEFAULT_SMART_OBJECTS,
    STARTER_HOUSE_ROOM_BOUNDS,
    getRequiredRoomForFurniture,
    validateFurnitureRoomPlacement,
    resolveNonToonObjectPlacement,
  } = await import('./simulation.ts');
  const { COMPLETE_FURNISHINGS_CATALOG } = await import('./furnishingsCatalog.ts');
  const { WORLD_BUILDER_CATALOG, placeBuildingPartOnGrid } = await import('./worldBuilder.ts');
  const { generateEntity3DAssetFromPrompt } = await import('./houseAgent.ts');

  // 1. Verify getRequiredRoomForFurniture maps each furniture type to its strict required room
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_bed', name: 'King Royal Canopy Bed' }).requiredRoom,
    'Bedroom'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_wardrobe', name: 'Oak Wardrobe' }).requiredRoom,
    'Bedroom'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_stove', name: 'Gas Range & Stove' }).requiredRoom,
    'Kitchen'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_fridge', name: 'Smart Refrigerator' }).requiredRoom,
    'Kitchen'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_toilet', name: 'Porcelain Toilet' }).requiredRoom,
    'Bathroom'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_bathtub', name: 'Clawfoot Bathtub & Shower' }).requiredRoom,
    'Bathroom'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_sofa', name: 'Velvet Sectional Sofa' }).requiredRoom,
    'LivingRoom'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_tv', name: 'OLED Flat-Screen TV' }).requiredRoom,
    'LivingRoom'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_bookshelf', name: 'Library Bookshelf' }).requiredRoom,
    'Study'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_easel', name: 'Studio Painting Easel' }).requiredRoom,
    'Study'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_pool', name: 'Backyard Swimming Pool' }).requiredRoom,
    'Yard'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_bbq', name: 'Patio BBQ Grill' }).requiredRoom,
    'Yard'
  );
  assert.equal(
    getRequiredRoomForFurniture({ id: 'obj_basement_billiards', name: 'Billiard Table' }).requiredRoom,
    'Basement'
  );

  // 2. Attempting to place a Bed in the Kitchen (-5.5, 0, -4.2) is rejected by validateFurnitureRoomPlacement
  // and automatically relocated into the Bedroom by resolveNonToonObjectPlacement
  const bedInKitchenValidation = validateFurnitureRoomPlacement(
    { id: 'obj_bed_test', name: 'Master Feather Bed', room: 'Kitchen' },
    { x: -5.5, y: 0, z: -4.2 }
  );
  assert.equal(bedInKitchenValidation.valid, false);
  assert.equal(bedInKitchenValidation.enforcedRoom, 'Bedroom');

  const bedResolved = resolveNonToonObjectPlacement(
    { x: -5.5, y: 0, z: -4.2 },
    { id: 'obj_bed_test', name: 'Master Feather Bed', room: 'Kitchen' },
    DEFAULT_SMART_OBJECTS,
    [],
    true
  );
  assert.equal(bedResolved.enforcedRoom, 'Bedroom');
  assert.equal(bedResolved.wasRoomEnforced, true);
  assert.ok(
    bedResolved.safePos.x >= STARTER_HOUSE_ROOM_BOUNDS.Bedroom.minX &&
      bedResolved.safePos.x <= STARTER_HOUSE_ROOM_BOUNDS.Bedroom.maxX &&
      bedResolved.safePos.z >= STARTER_HOUSE_ROOM_BOUNDS.Bedroom.minZ &&
      bedResolved.safePos.z <= STARTER_HOUSE_ROOM_BOUNDS.Bedroom.maxZ,
    `Expected bed placed in Kitchen to be relocated inside Bedroom bounds, got (${bedResolved.safePos.x}, ${bedResolved.safePos.z})`
  );

  // 3. Attempting to place a Stove or Fridge in the Bedroom (6.4, 0, 5.2) relocates it inside the Kitchen
  const stoveResolved = resolveNonToonObjectPlacement(
    { x: 6.4, y: 0, z: 5.2 },
    { id: 'obj_stove_test', name: 'Chef Gas Stove', room: 'Bedroom' },
    DEFAULT_SMART_OBJECTS,
    [],
    true
  );
  assert.equal(stoveResolved.enforcedRoom, 'Kitchen');
  assert.equal(stoveResolved.wasRoomEnforced, true);
  assert.ok(
    stoveResolved.safePos.x >= STARTER_HOUSE_ROOM_BOUNDS.Kitchen.minX &&
      stoveResolved.safePos.x <= STARTER_HOUSE_ROOM_BOUNDS.Kitchen.maxX &&
      stoveResolved.safePos.z >= STARTER_HOUSE_ROOM_BOUNDS.Kitchen.minZ &&
      stoveResolved.safePos.z <= STARTER_HOUSE_ROOM_BOUNDS.Kitchen.maxZ,
    `Expected stove placed in Bedroom to be relocated inside Kitchen bounds, got (${stoveResolved.safePos.x}, ${stoveResolved.safePos.z})`
  );

  // 4. Attempting to place a Toilet or Shower in the LivingRoom (6.0, 0, -3.0) via WorldBuilder relocates it inside the Bathroom
  const toiletPart = WORLD_BUILDER_CATALOG.find((p) => p.id === 'wb_furn_toilet')!;
  const starterBp = {
    isEmptyGridMode: false,
    lotTitle: 'Starter House',
    architecturalStyle: 'Craftsman',
    placedParts: [],
  };
  const placedToilet = placeBuildingPartOnGrid(
    starterBp,
    toiletPart,
    { x: 6.0, y: 0, z: -3.0 },
    0,
    DEFAULT_SMART_OBJECTS
  );
  assert.ok(placedToilet.spawnedSmartObject);
  assert.equal(placedToilet.spawnedSmartObject!.room, 'Bathroom');
  assert.equal(placedToilet.wasRoomEnforced, true);
  assert.ok(
    placedToilet.spawnedSmartObject!.gridPos.x >= STARTER_HOUSE_ROOM_BOUNDS.Bathroom.minX &&
      placedToilet.spawnedSmartObject!.gridPos.x <= STARTER_HOUSE_ROOM_BOUNDS.Bathroom.maxX &&
      placedToilet.spawnedSmartObject!.gridPos.z >= STARTER_HOUSE_ROOM_BOUNDS.Bathroom.minZ &&
      placedToilet.spawnedSmartObject!.gridPos.z <= STARTER_HOUSE_ROOM_BOUNDS.Bathroom.maxZ,
    `Expected toilet placed in LivingRoom to be relocated inside Bathroom bounds, got (${placedToilet.spawnedSmartObject!.gridPos.x}, ${placedToilet.spawnedSmartObject!.gridPos.z})`
  );

  // 5. Entity 3D Asset Forge enforces room placement even if roomOverride is mismatched
  const entityTubInKitchen = generateEntity3DAssetFromPrompt(
    'Clawfoot Porcelain Spa Bathtub',
    'Kitchen',
    DEFAULT_SMART_OBJECTS
  );
  assert.equal(entityTubInKitchen.smartObject.room, 'Bathroom');
  assert.ok(
    entityTubInKitchen.smartObject.gridPos.x >= STARTER_HOUSE_ROOM_BOUNDS.Bathroom.minX &&
      entityTubInKitchen.smartObject.gridPos.x <= STARTER_HOUSE_ROOM_BOUNDS.Bathroom.maxX,
    `Expected Entity bathtub to be placed in Bathroom, got (${entityTubInKitchen.smartObject.gridPos.x}, ${entityTubInKitchen.smartObject.gridPos.z})`
  );

  // 6. Verify every item in COMPLETE_FURNISHINGS_CATALOG and DEFAULT_SMART_OBJECTS satisfies validateFurnitureRoomPlacement
  for (const item of COMPLETE_FURNISHINGS_CATALOG) {
    const check = validateFurnitureRoomPlacement(item, item.gridPos, [], true);
    assert.equal(
      check.valid,
      true,
      `Catalog item ${item.id} (${item.name}) in ${item.room} at (${item.gridPos.x}, ${item.gridPos.y}, ${item.gridPos.z}) failed room placement rule: ${check.reason}`
    );
  }
  for (const obj of DEFAULT_SMART_OBJECTS) {
    const check = validateFurnitureRoomPlacement(obj, obj.gridPos, [], true);
    assert.equal(
      check.valid,
      true,
      `Default SmartObject ${obj.id} (${obj.name}) in ${obj.room} at (${obj.gridPos.x}, ${obj.gridPos.y}, ${obj.gridPos.z}) failed room placement rule: ${check.reason}`
    );
  }
});

test('A* Pathfinding across worldBlueprint grid prevents characters from getting stuck behind recently placed SmartObjects', async () => {
  const {
    buildNavGridForBounds,
    findPathWaypoints,
    resolveReachableApproachPoint,
    advanceToonAlongPath,
    worldToGridCell,
  } = await import('./pathfinding.ts');
  const { DEFAULT_SMART_OBJECTS, PRESET_SCENARIOS } = await import('./simulation.ts');

  // 1. Verify worldBlueprint ROOM_BLOCK walls & South doorway portals are rasterized onto the NavGrid
  const customBlueprint = {
    isEmptyGridMode: true,
    placedParts: [
      {
        id: 'room_custom_studio',
        partType: 'ROOM_BLOCK',
        gridPos: { x: 0, y: 0, z: 0 },
        width: 8,
        depth: 8,
        rotationY: 0,
      },
    ],
  };

  const bpGrid = buildNavGridForBounds({
    worldBlueprint: customBlueprint,
    smartObjects: [],
  });

  // North wall at (0, -4) should be blocked, while South doorway at (0, +4) should be a walkable portal!
  const northWallCell = worldToGridCell(bpGrid, 0, -4.0);
  const southDoorCell = worldToGridCell(bpGrid, 0, 4.0);
  assert.equal(
    bpGrid.cells[northWallCell.row][northWallCell.col].walkable,
    false,
    'Expected ROOM_BLOCK North wall to be blocked on worldBlueprint NavGrid'
  );
  assert.equal(
    bpGrid.cells[southDoorCell.row][southDoorCell.col].walkable,
    true,
    'Expected ROOM_BLOCK South doorway portal to be carved walkable on worldBlueprint NavGrid'
  );
  assert.equal(
    bpGrid.cells[southDoorCell.row][southDoorCell.col].isDoorwayPortal,
    true,
    'Expected ROOM_BLOCK South doorway cell to be flagged as isDoorwayPortal'
  );

  // A* path from outside North of the ROOM_BLOCK (0, 0, -6.5) to inside center (0, 0, 0)
  // must route around the ROOM_BLOCK walls and enter through the South doorway (0, 0, +4)
  const roomBlockPath = findPathWaypoints({
    startPos: { x: 0, y: 0, z: -6.5 },
    goalPos: { x: 0, y: 0, z: 0 },
    smartObjects: [],
    worldBlueprint: customBlueprint,
  });
  assert.equal(roomBlockPath.foundExactPath, true, 'Expected exact A* path into custom ROOM_BLOCK');
  assert.ok(
    roomBlockPath.waypoints.length >= 3,
    'Expected multi-waypoint detour around ROOM_BLOCK North wall to South doorway'
  );

  // 2. Verify a character starting behind a recently placed solid SmartObject (even when it is activeObjectId!)
  // routes AROUND the SmartObject via A* instead of walking straight into its back and getting stuck
  const newlyPlacedIsland = {
    ...DEFAULT_SMART_OBJECTS[0],
    id: 'obj_island_newly_placed',
    name: 'Granite Chef Island',
    room: 'Kitchen' as const,
    gridPos: { x: 0, y: 0, z: 0 },
  };

  const behindStart = { x: 0, y: 0, z: -2.2 };
  const frontGoal = { x: 0, y: 0, z: 2.2 };

  const aroundObjectPath = findPathWaypoints({
    startPos: behindStart,
    goalPos: frontGoal,
    smartObjects: [newlyPlacedIsland],
    activeObjectId: newlyPlacedIsland.id,
    worldBlueprint: customBlueprint,
  });
  assert.equal(aroundObjectPath.foundExactPath, true);
  assert.ok(
    aroundObjectPath.waypoints.length >= 2,
    'Expected A* to generate lateral detour waypoints around active solid SmartObject instead of a straight line through it'
  );
  const lateralDetour = aroundObjectPath.waypoints.some((wp) => Math.abs(wp.x) > 0.8);
  assert.equal(
    lateralDetour,
    true,
    'Expected A* waypoints to detour laterally around the recently placed SmartObject footprint'
  );

  // 3. Verify advanceToonAlongPath dynamically invalidates its cached path and routes around a newly placed SmartObject mid-walk
  const agentMap = new Map();
  const baseChar = {
    ...PRESET_SCENARIOS[0].characters[0],
    id: 'char_path_tester',
    activeObjectId: newlyPlacedIsland.id,
    pos: frontGoal,
    onGrid: true,
  };

  let rigPos = { ...behindStart };
  // Step 2 frames with no obstacles first (caches straight path)
  for (let i = 0; i < 2; i++) {
    const step = advanceToonAlongPath({
      char: baseChar,
      currentRigPos: rigPos,
      resolvedGoal: frontGoal,
      delta: 0.12,
      smartObjects: [],
      liveResolvedChars: [baseChar],
      worldBlueprint: customBlueprint,
      agentStateMap: agentMap,
    });
    rigPos = step.nextPos;
  }

  // Now place `newlyPlacedIsland` directly between the toon and `frontGoal`!
  // Simulate walking for up to 45 frames and verify the toon routes around the island and reaches `frontGoal`
  let reachedGoal = false;
  for (let frame = 0; frame < 45; frame++) {
    const step = advanceToonAlongPath({
      char: baseChar,
      currentRigPos: rigPos,
      resolvedGoal: frontGoal,
      delta: 0.12,
      smartObjects: [newlyPlacedIsland],
      liveResolvedChars: [baseChar],
      worldBlueprint: customBlueprint,
      agentStateMap: agentMap,
    });
    rigPos = step.nextPos;
    if (!step.isMoving || Math.hypot(rigPos.x - frontGoal.x, rigPos.z - frontGoal.z) <= 0.35) {
      reachedGoal = true;
      break;
    }
  }
  assert.equal(
    reachedGoal,
    true,
    `Expected toon to reroute around recently placed SmartObject and reach goal (0, 2.2), ended at (${rigPos.x.toFixed(2)}, ${rigPos.z.toFixed(2)})`
  );

  // 4. Verify resolveReachableApproachPoint picks an unblocked walkable side when a newly placed SmartObject blocks the default side
  const targetEasel = {
    ...DEFAULT_SMART_OBJECTS[0],
    id: 'obj_easel_studio',
    name: 'Studio Easel',
    room: 'Study' as const,
    gridPos: { x: 0, y: 0, z: 0 },
  };
  // Place a wide cabinet right in front of the easel's default North (-Z) approach spot (0, 0, -1.2)
  const blockingCabinet = {
    ...DEFAULT_SMART_OBJECTS[0],
    id: 'obj_bookshelf_blocker',
    name: 'Heavy Oak Bookshelf',
    room: 'Study' as const,
    gridPos: { x: 0, y: 0, z: -1.25 },
  };

  const reachable = resolveReachableApproachPoint({
    obj: targetEasel,
    startPos: { x: 0, y: 0, z: -3.2 },
    smartObjects: [targetEasel, blockingCabinet],
    worldBlueprint: customBlueprint,
  });
  assert.equal(reachable.foundExactPath, true);
  // The chosen approach point must NOT be inside the blocking cabinet at (0, -1.25)
  assert.ok(
    Math.hypot(reachable.pos.x - blockingCabinet.gridPos.x, reachable.pos.z - blockingCabinet.gridPos.z) > 0.75,
    'Expected resolveReachableApproachPoint to select an unblocked perimeter side outside the recently placed blocking SmartObject'
  );
});


