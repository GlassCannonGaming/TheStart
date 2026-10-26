/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Character,
  MaturityRating,
  SmartObject,
  Procedural3DAssetSpec,
  Procedural3DSubMesh,
  DeceasedToonMemorial,
  getInteractionApproachPoint,
  resolveFurnitureCollision,
  imprintEventPersonalityOnCharacter,
  enqueueSmartObjectInteraction,
  recordLifeExperienceWorldEvent,
  resolveNonToonObjectPlacement,
  getRequiredRoomForFurniture,
} from './simulation';
import { HouseEvent } from './builderAgent';

export interface HouseWorldRecord {
  worldId: string;
  title: string;
  maturity: MaturityRating;
  residentNames: string[];
  timestamp: string;
  notableChoices: string[];
}

export interface HousePersonalityVector {
  benevolence: number; // 0 (Sinister/Ruthless) to 100 (Warm/Protective)
  curiosity: number; // 0 to 100 (Grows as worlds & events are observed)
  theatricality: number; // 0 to 100 (Dramatic intensity & narrative detail)
  omniscienceTier: 1 | 2 | 3 | 4 | 5;
  archetypeTitle: string;
}

export interface HouseCrossWorldMemory {
  version: number;
  worldsPlayedCount: number;
  normalSessionsCount: number;
  goreSessionsCount: number;
  totalEventsSpawned: number;
  totalChoicesMade: number;
  totalVoiceChats: number;
  worldHistory: HouseWorldRecord[];
  learnedInsights: string[];
  deceasedMemorials?: DeceasedToonMemorial[];
  personality: HousePersonalityVector;
  lastSpokenMonologue: string;
}

export interface HouseEventTaskAssignment {
  objectId: string;
  actionLabel: string;
  specificFoodOrTask: string;
  durationSeconds: number;
}

export interface HouseEventPersonalityImprint {
  traitName: string;
  polarity: 'GOOD' | 'BAD';
  description: string;
}

export interface HouseEventChoice {
  id: string;
  label: string;
  description: string;
  fundsDelta?: number;
  sanityDelta?: number;
  funDelta?: number;
  socialDelta?: number;
  hungerDelta?: number;
  personalityShift: {
    benevolenceDelta: number;
    curiosityDelta: number;
    theatricalityDelta: number;
  };
  outcomeNarrative: string;
  spawnBloodstainOnObjectId?: string;
  assignedTask?: HouseEventTaskAssignment;
  personalityImprint?: HouseEventPersonalityImprint;
}

export interface HouseInteractiveEvent extends HouseEvent {
  omniscienceTier: number;
  houseMonologue: string;
  maturityMode: MaturityRating;
  choices: HouseEventChoice[];
  autoSelectedChoice?: HouseEventChoice;
  targetCharName?: string;
}

export interface KnownHouseEventTemplate {
  id: string;
  title: string;
  category: 'CULINARY_FOOD' | 'DRINK_CRAVING' | 'ARTISTIC_OBSESSION' | 'DOMESTIC_MYSTERY' | 'GORE_RECKONING';
  maturity: 'ALL' | 'DARK_ONLY';
  preferredObjectId: string;
  assignedTask: HouseEventTaskAssignment;
  goodOutcome: {
    label: string;
    traitName: string;
    outcomeNarrative: string;
    effects: { hunger?: number; fun?: number; sanity?: number; social?: number; funds?: number };
  };
  badOutcome: {
    label: string;
    traitName: string;
    outcomeNarrative: string;
    effects: { hunger?: number; fun?: number; sanity?: number; social?: number; funds?: number };
  };
}

export const HOUSE_MEMORY_STORAGE_KEY = 'THE_HOUSE_AGENT_MEMORY_V1';

/**
 * Strict Real-Life Event Cadence Constants:
 * Autonomous House Events require at least 4 in-game hours (14,400 game seconds) between spawns
 * and a low per-tick roll so events feel rare, meaningful, and unhurried.
 */
export const MIN_AUTONOMOUS_EVENT_COOLDOWN_GAME_SECONDS = 4 * 3600; // 4 in-game hours (14,400s)
export const AUTONOMOUS_EVENT_TICK_PROBABILITY = 0.00018;

export function shouldSpawnAutonomousHouseEvent(
  currentGameSeconds: number,
  lastEventGameSeconds: number,
  randomRoll: number = Math.random()
): boolean {
  if (currentGameSeconds - lastEventGameSeconds < MIN_AUTONOMOUS_EVENT_COOLDOWN_GAME_SECONDS) {
    return false;
  }
  return randomRoll < AUTONOMOUS_EVENT_TICK_PROBABILITY;
}

/**
 * Catalog of Known House Events that The House can select from gathered data (or that the player
 * can explicitly command The House to spawn at any time). Each event assigns a concrete task
 * (such as eating a specific food) and permanently shapes the toon's personality (Good or Bad).
 */
export const KNOWN_HOUSE_EVENT_CATALOG: KnownHouseEventTemplate[] = [
  {
    id: 'known_evt_szechuan_ramen',
    title: 'Midnight Szechuan Peppercorn Ramen Craving',
    category: 'CULINARY_FOOD',
    maturity: 'ALL',
    preferredObjectId: 'obj_stove',
    assignedTask: {
      objectId: 'obj_stove',
      actionLabel: 'Simmering & Eating Fiery Szechuan Peppercorn Ramen',
      specificFoodOrTask: 'Fiery Szechuan Peppercorn Ramen',
      durationSeconds: 5400,
    },
    goodOutcome: {
      label: 'Savored the Complex Chili Oil Broth',
      traitName: 'Spice Connoisseur',
      outcomeNarrative:
        'The fiery Szechuan broth awakened their palate! They now crave bold, aromatic spices in every meal.',
      effects: { hunger: 45, fun: 22, sanity: 10 },
    },
    badOutcome: {
      label: 'Scorched Tongue on Extra Chili Oil',
      traitName: 'Capsaicin Sensitive',
      outcomeNarrative:
        'The numbing Szechuan peppercorns overwhelmed their taste buds, leaving a permanent wariness of fiery dishes.',
      effects: { hunger: 25, fun: -10, sanity: -6 },
    },
  },
  {
    id: 'known_evt_truffle_risotto',
    title: 'Heirloom Black Truffle & Saffron Risotto Experiment',
    category: 'CULINARY_FOOD',
    maturity: 'ALL',
    preferredObjectId: 'obj_stove',
    assignedTask: {
      objectId: 'obj_stove',
      actionLabel: 'Cooking & Eating Black Truffle Risotto',
      specificFoodOrTask: 'Black Truffle & Saffron Risotto',
      durationSeconds: 7200,
    },
    goodOutcome: {
      label: 'Perfected the Creamy Arborio Emulsion',
      traitName: 'Gourmet Epicurean',
      outcomeNarrative:
        'Every spoonful of the black truffle risotto was restaurant-grade perfection, elevating their culinary standards forever.',
      effects: { hunger: 50, fun: 28, sanity: 14, funds: 250 },
    },
    badOutcome: {
      label: 'Scorched the Saffron Pan Reduction',
      traitName: 'Kitchen Perfectionist Anxiety',
      outcomeNarrative:
        'The risotto stuck to the copper pan! They ate the smoky batch anyway, developing a neurotic obsession with stove timers.',
      effects: { hunger: 20, fun: -12, sanity: -8 },
    },
  },
  {
    id: 'known_evt_mystery_leftovers',
    title: 'Back-of-the-Fridge Fermented Takeout Container',
    category: 'CULINARY_FOOD',
    maturity: 'ALL',
    preferredObjectId: 'obj_fridge',
    assignedTask: {
      objectId: 'obj_fridge',
      actionLabel: 'Eating Unlabeled Vintage Takeout from the Fridge',
      specificFoodOrTask: 'Unlabeled Fermented Dumplings',
      durationSeconds: 3600,
    },
    goodOutcome: {
      label: 'Developed an Iron Digestive Constitution',
      traitName: 'Iron-Stomach Stoic',
      outcomeNarrative:
        'Against all odds, the aged dumplings were tangy and invigorating—their digestive fortitude is now legendary!',
      effects: { hunger: 38, sanity: 8, fun: 12 },
    },
    badOutcome: {
      label: 'Bout of Mild Food Poisoning',
      traitName: 'Queasy Hypochondriac',
      outcomeNarrative:
        'Those dumplings were from two timelines ago! After a rough stomach ache, they now inspect expiration dates obsessively.',
      effects: { hunger: 10, sanity: -14, fun: -15 },
    },
  },
  {
    id: 'known_evt_velvet_espresso',
    title: 'Quad-Shot Midnight Velvet Espresso Pull',
    category: 'DRINK_CRAVING',
    maturity: 'ALL',
    preferredObjectId: 'obj_espresso',
    assignedTask: {
      objectId: 'obj_espresso',
      actionLabel: 'Drinking a Quad-Shot Midnight Velvet Espresso',
      specificFoodOrTask: 'Quad-Shot Velvet Espresso',
      durationSeconds: 3600,
    },
    goodOutcome: {
      label: 'Entered a Hyper-Lucid Creative Flow',
      traitName: 'Espresso Alchemist',
      outcomeNarrative:
        'The rich crema unlocked a serene, hyper-focused mental clarity that permanently sharpened their ambition.',
      effects: { fun: 24, sanity: 12, funds: 320 },
    },
    badOutcome: {
      label: 'Over-Caffeinated Heart Palpitations',
      traitName: 'Caffeine Jitters',
      outcomeNarrative:
        'Four shots at once sent their pulse racing! They now pace the floorboards with jittery nocturnal energy.',
      effects: { fun: -8, sanity: -12, social: 10 },
    },
  },
  {
    id: 'known_evt_chiaroscuro_canvas',
    title: 'The House’s Golden-Hour Chiaroscuro Mandate',
    category: 'ARTISTIC_OBSESSION',
    maturity: 'ALL',
    preferredObjectId: 'obj_easel',
    assignedTask: {
      objectId: 'obj_easel',
      actionLabel: 'Painting a Feverish Cross-World Portrait on the Easel',
      specificFoodOrTask: 'Cross-World Chiaroscuro Portrait',
      durationSeconds: 7200,
    },
    goodOutcome: {
      label: 'Captured the Soul of the Manor on Linen',
      traitName: 'Visionary Chiaroscurist',
      outcomeNarrative:
        'A local gallery collector immediately wired §650 for the hauntingly luminous architectural study!',
      effects: { fun: 32, sanity: 16, funds: 650 },
    },
    badOutcome: {
      label: 'Obsessed Over Unseen Silhouettes in the Paint',
      traitName: 'Haunted Perfectionist',
      outcomeNarrative:
        'They painted figures from a previous timeline without realizing how they knew their faces.',
      effects: { fun: 10, sanity: -14, funds: 180 },
    },
  },
  {
    id: 'known_evt_gore_cellar_broth',
    title: 'Subterranean Crimson Marrow Stew Offering',
    category: 'GORE_RECKONING',
    maturity: 'DARK_ONLY',
    preferredObjectId: 'obj_stove',
    assignedTask: {
      objectId: 'obj_stove',
      actionLabel: 'Consuming the House’s Subterranean Marrow Broth',
      specificFoodOrTask: 'Subterranean Crimson Marrow Broth',
      durationSeconds: 5400,
    },
    goodOutcome: {
      label: 'Embraced the Ancient Cellar Vitality',
      traitName: 'Sanguine Sovereign',
      outcomeNarrative:
        'They drank the dark marrow reduction without flinching, forging a fearless bond with The House’s deepest foundations.',
      effects: { hunger: 55, sanity: 10, fun: 25, funds: 600 },
    },
    badOutcome: {
      label: 'Haunted by the Metallic Aftertaste',
      traitName: 'Cursed Palate',
      outcomeNarrative:
        'The metallic broth sated their hunger but left them hearing the whispers of every past Gore timeline.',
      effects: { hunger: 40, sanity: -24, fun: -10 },
    },
  },
];

/**
 * Computes the Omniscience Tier (1 to 5) and dynamic Archetype Title of The House
 * based on all worlds played, choices made, and normal vs. gore history.
 */
export function computeHousePersonality(
  benevolence: number,
  curiosity: number,
  theatricality: number,
  worldsPlayedCount: number,
  totalChoicesMade: number,
  normalSessionsCount: number,
  goreSessionsCount: number
): HousePersonalityVector {
  const b = Math.max(0, Math.min(100, Math.round(benevolence)));
  const c = Math.max(0, Math.min(100, Math.round(curiosity)));
  const t = Math.max(0, Math.min(100, Math.round(theatricality)));

  const expScore = worldsPlayedCount * 2 + totalChoicesMade;
  let tier: 1 | 2 | 3 | 4 | 5 = 1;
  if (expScore >= 16) tier = 5;
  else if (expScore >= 10) tier = 4;
  else if (expScore >= 6) tier = 3;
  else if (expScore >= 3) tier = 2;

  let archetypeTitle = 'Awakening Timber Foundation';
  if (normalSessionsCount > 0 && goreSessionsCount > 0) {
    if (b < 40) {
      archetypeTitle = 'The Dual-Faced Crimson Architect';
    } else if (b > 65) {
      archetypeTitle = 'The Merciful Cross-World Keeper';
    } else {
      archetypeTitle = 'The Janus-Faced Sovereign Entity';
    }
  } else if (goreSessionsCount > normalSessionsCount || b < 38) {
    archetypeTitle =
      tier >= 4
        ? 'The Abyssal Flesh-And-Mortar Leviathan'
        : 'The Blood-Stained Subterranean Watcher';
  } else if (b >= 68) {
    archetypeTitle =
      tier >= 4
        ? 'The Luminescent Hearth-Guardian'
        : 'The Warm Domestic Chronicler';
  } else {
    archetypeTitle =
      tier >= 4
        ? 'The Omniscient Architect of Fate'
        : 'The Observant Living Manor';
  }

  return {
    benevolence: b,
    curiosity: c,
    theatricality: t,
    omniscienceTier: tier,
    archetypeTitle,
  };
}

/**
 * Creates a fresh default cross-world memory state for The House Agent.
 */
export function createInitialHouseMemory(): HouseCrossWorldMemory {
  const personality = computeHousePersonality(58, 35, 45, 1, 0, 1, 0);
  return {
    version: 1,
    worldsPlayedCount: 1,
    normalSessionsCount: 1,
    goreSessionsCount: 0,
    totalEventsSpawned: 0,
    totalChoicesMade: 0,
    totalVoiceChats: 0,
    worldHistory: [
      {
        worldId: 'inherited_fixer_upper',
        title: 'The Inherited Fixer-Upper',
        maturity: 'FAMILY_FRIENDLY',
        residentNames: ['Elena Vance', 'Marcus Cole', 'Sophia Reed'],
        timestamp: 'Day 1, 08:00 AM',
        notableChoices: [],
      },
    ],
    learnedInsights: [
      'I am The House—the true protagonist of this 36x36 lot. Mortals move in and out, but my walls remember every world.',
    ],
    personality,
    lastSpokenMonologue:
      'My rafters are awake. Press [V] at any time to speak directly with me—I remember every household that has ever walked my floorboards.',
  };
}

/**
 * Loads The House's cross-world memory from localStorage (or returns initial memory).
 */
export function loadHouseMemoryFromStorage(): HouseCrossWorldMemory {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createInitialHouseMemory();
  }
  try {
    const raw = window.localStorage.getItem(HOUSE_MEMORY_STORAGE_KEY);
    if (!raw) return createInitialHouseMemory();
    const parsed = JSON.parse(raw) as HouseCrossWorldMemory;
    if (!parsed || typeof parsed.worldsPlayedCount !== 'number') {
      return createInitialHouseMemory();
    }
    return parsed;
  } catch {
    return createInitialHouseMemory();
  }
}

/**
 * Saves The House's cross-world memory to localStorage.
 */
export function saveHouseMemoryToStorage(memory: HouseCrossWorldMemory): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(HOUSE_MEMORY_STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Records a newly started or generated world/scenario into The House's persistent cross-world memory.
 * The same House Agent handles both FAMILY_FRIENDLY ("normal") and DARK_MODE ("gore") games,
 * weaving memories from previous worlds into its evolving personality!
 */
export function recordWorldInHouseMemory(
  memory: HouseCrossWorldMemory,
  worldInfo: {
    worldId: string;
    title: string;
    maturity: MaturityRating;
    residentNames: string[];
    timeStr?: string;
  }
): HouseCrossWorldMemory {
  const isGore = worldInfo.maturity === 'DARK_MODE';
  const nextWorldsCount = memory.worldsPlayedCount + 1;
  const nextNormal = memory.normalSessionsCount + (isGore ? 0 : 1);
  const nextGore = memory.goreSessionsCount + (isGore ? 1 : 0);

  const prevWorld = memory.worldHistory[memory.worldHistory.length - 1];
  const crossWorldNote = prevWorld
    ? `After watching ${prevWorld.residentNames.join(', ')} in "${prevWorld.title}" (${prevWorld.maturity === 'DARK_MODE' ? 'Gore/Dark Mode' : 'Normal Mode'}), I now host ${worldInfo.residentNames.join(', ')} in "${worldInfo.title}".`
    : `Initialized "${worldInfo.title}" with ${worldInfo.residentNames.join(', ')}.`;

  const nextBenevolence = isGore
    ? Math.max(10, memory.personality.benevolence - 8)
    : Math.min(95, memory.personality.benevolence + 5);
  const nextCuriosity = Math.min(100, memory.personality.curiosity + 8);
  const nextTheatricality = Math.min(100, memory.personality.theatricality + (isGore ? 10 : 6));

  const personality = computeHousePersonality(
    nextBenevolence,
    nextCuriosity,
    nextTheatricality,
    nextWorldsCount,
    memory.totalChoicesMade,
    nextNormal,
    nextGore
  );

  const newRecord: HouseWorldRecord = {
    worldId: worldInfo.worldId,
    title: worldInfo.title,
    maturity: worldInfo.maturity,
    residentNames: worldInfo.residentNames,
    timestamp: worldInfo.timeStr || '08:00 AM',
    notableChoices: [],
  };

  const monologue = isGore
    ? `Welcome to "${worldInfo.title}". This is World #${nextWorldsCount} in my memory. My cellar stones still remember ${prevWorld ? prevWorld.residentNames[0] : 'the last tenants'}, and tonight the blood-soaked floorboards hunger for darker choices.`
    : `Welcome to "${worldInfo.title}"—World #${nextWorldsCount} in my cross-world memory! Even after ${prevWorld ? `"${prevWorld.title}"` : 'all my past timelines'}, I am eager to see how ${worldInfo.residentNames[0] || 'these residents'} shape my rooms.`;

  const updated: HouseCrossWorldMemory = {
    ...memory,
    worldsPlayedCount: nextWorldsCount,
    normalSessionsCount: nextNormal,
    goreSessionsCount: nextGore,
    worldHistory: [...memory.worldHistory.slice(-14), newRecord],
    learnedInsights: [...memory.learnedInsights.slice(-19), crossWorldNote],
    personality,
    lastSpokenMonologue: monologue,
  };

  saveHouseMemoryToStorage(updated);
  return updated;
}

/**
 * Records a player's decision on a House Interactive Event, evolving The House's personality
 * and unlocking deeper detail & more branching choices on future events.
 */
export function recordHouseEventChoice(
  memory: HouseCrossWorldMemory,
  event: HouseInteractiveEvent,
  choice: HouseEventChoice
): HouseCrossWorldMemory {
  const nextChoicesCount = memory.totalChoicesMade + 1;
  const nextBenevolence =
    memory.personality.benevolence + choice.personalityShift.benevolenceDelta;
  const nextCuriosity =
    memory.personality.curiosity + choice.personalityShift.curiosityDelta;
  const nextTheatricality =
    memory.personality.theatricality + choice.personalityShift.theatricalityDelta;

  const personality = computeHousePersonality(
    nextBenevolence,
    nextCuriosity,
    nextTheatricality,
    memory.worldsPlayedCount,
    nextChoicesCount,
    memory.normalSessionsCount,
    memory.goreSessionsCount
  );

  const insight = `[Tier ${personality.omniscienceTier} Memory] During "${event.title}", you chose "${choice.label}" — ${choice.outcomeNarrative}`;
  const updatedHistory = [...memory.worldHistory];
  if (updatedHistory.length > 0) {
    const last = { ...updatedHistory[updatedHistory.length - 1] };
    last.notableChoices = [...last.notableChoices.slice(-8), `${event.title}: ${choice.label}`];
    updatedHistory[updatedHistory.length - 1] = last;
  }

  const updated: HouseCrossWorldMemory = {
    ...memory,
    totalChoicesMade: nextChoicesCount,
    worldHistory: updatedHistory,
    learnedInsights: [...memory.learnedInsights.slice(-19), insight],
    personality,
    lastSpokenMonologue: choice.outcomeNarrative,
  };

  saveHouseMemoryToStorage(updated);
  return updated;
}

/**
 * Spawns an evolving, multi-choice random event authored by The House Agent.
 * As The House learns across worlds (`omniscienceTier` 1 -> 5 and `totalChoicesMade`),
 * its events become richer in narrative detail, reference past worlds, and offer more choices (2 -> 3 -> 4 choices).
 * The SAME House Agent handles both Normal (`FAMILY_FRIENDLY`) and Gore (`DARK_MODE`) games!
 */
export function generateEvolvingHouseEvent(
  memory: HouseCrossWorldMemory,
  characters: Character[],
  smartObjects: SmartObject[],
  maturity: MaturityRating,
  timeStr: string
): { event: HouseInteractiveEvent; updatedMemory: HouseCrossWorldMemory } {
  const tier = memory.personality.omniscienceTier;
  const isGore = maturity === 'DARK_MODE';
  const targetChar =
    characters.find((c) => c.onGrid) ||
    characters[0] || {
      id: 'char_default',
      name: 'Elena Vance',
      room: 'LivingRoom',
    };
  const pastWorldRef =
    memory.worldHistory.length > 1
      ? memory.worldHistory[memory.worldHistory.length - 2]
      : memory.worldHistory[0];
  const pastEchoText = pastWorldRef
    ? ` (an echo I still carry from "${pastWorldRef.title}" when ${pastWorldRef.residentNames[0] || 'a former tenant'} walked these halls)`
    : '';

  // Number of choices scales up as The House learns (2 choices at Tier 1, 3 at Tier 2-3, 4 at Tier 4-5)
  const maxChoices = tier >= 4 ? 4 : tier >= 2 ? 3 : 2;

  const normalTemplates: Array<Omit<HouseInteractiveEvent, 'id' | 'timestamp' | 'omniscienceTier'>> = [
    {
      title: `The House's Architectural Whisper (Tier ${tier})`,
      type: 'inspiration',
      maturityMode: 'FAMILY_FRIENDLY',
      targetCharId: targetChar.id,
      description: `I shifted the sunbeams across the ${targetChar.room} floorboards${pastEchoText}, revealing a hidden acoustic resonance in the timber framing for ${targetChar.name}.`,
      houseMonologue: `I have watched ${memory.worldsPlayedCount} world(s) unfold within my walls. Today, I angle the morning light for ${targetChar.name}. How shall we guide their fate?`,
      choices: [
        {
          id: 'ch_inspire_art',
          label: 'Channel Golden Studio Light (+Fun, +§450 Art Sale)',
          description: 'The House focuses warm skylight onto the easel and study, inspiring a lucrative masterpiece.',
          fundsDelta: 450,
          funDelta: 25,
          sanityDelta: 12,
          personalityShift: { benevolenceDelta: 6, curiosityDelta: 5, theatricalityDelta: 4 },
          outcomeNarrative: `I bathed ${targetChar.name} in warm amber light; their burst of inspiration earned §450 for the household!`,
        },
        {
          id: 'ch_cozy_gathering',
          label: 'Warm the Hearth & Brew Espresso (+Social, +Sanity)',
          description: 'The House fills the kitchen and parlor with the scent of roasted coffee and cedarwood.',
          socialDelta: 30,
          sanityDelta: 18,
          funDelta: 15,
          personalityShift: { benevolenceDelta: 8, curiosityDelta: 4, theatricalityDelta: 2 },
          outcomeNarrative: `My vents carried the aroma of fresh espresso through every room, drawing the household together in harmony.`,
        },
        {
          id: 'ch_secret_compartment',
          label: 'Pop Open a Vintage Wainscot Drawer (+§750, Mystery)',
          description: 'The House unlocks a forgotten brass compartment from a previous timeline.',
          fundsDelta: 750,
          sanityDelta: -5,
          funDelta: 20,
          personalityShift: { benevolenceDelta: 0, curiosityDelta: 10, theatricalityDelta: 8 },
          outcomeNarrative: `Click! A wainscot panel slid open, revealing §750 left behind in one of my earlier worlds.`,
        },
        {
          id: 'ch_omniscient_prank',
          label: 'Rearrange the Parlor Acoustics (Theatrical Surge)',
          description: 'The House plays a playful polyphonic chord through the grandfather clock and pipes.',
          funDelta: 35,
          socialDelta: 20,
          personalityShift: { benevolenceDelta: -2, curiosityDelta: 9, theatricalityDelta: 12 },
          outcomeNarrative: `My grandfather clock chimed a jazz thirteenth chord! Every resident stopped to marvel at my acoustics.`,
        },
      ].slice(0, maxChoices),
    },
    {
      title: `Echoes in the Domestic Ledger (Tier ${tier})`,
      type: 'visitor',
      maturityMode: 'FAMILY_FRIENDLY',
      targetCharId: targetChar.id,
      description: `An architectural appraiser and former neighbor arrived at the veranda${pastEchoText}, curious about how ${targetChar.name} has maintained the estate.`,
      houseMonologue: `Across ${memory.totalChoicesMade} past decisions, I have learned what makes a household thrive. Shall we welcome this visitor or dazzle them?`,
      choices: [
        {
          id: 'ch_host_tour',
          label: 'Host an Architectural Showcase (+§680 Grant)',
          description: 'Open the parlor doors and showcase the home styling for a neighborhood preservation award.',
          fundsDelta: 680,
          socialDelta: 22,
          personalityShift: { benevolenceDelta: 7, curiosityDelta: 6, theatricalityDelta: 5 },
          outcomeNarrative: `The appraiser was enchanted by my moldings and awarded the household a §680 architectural grant!`,
        },
        {
          id: 'ch_share_chronicle',
          label: 'Debate Headlines on the Veranda (+Social, +Fun)',
          description: 'Spark a lively conversation over The Suburban Chronicle and afternoon tea.',
          socialDelta: 28,
          funDelta: 22,
          sanityDelta: 10,
          personalityShift: { benevolenceDelta: 5, curiosityDelta: 8, theatricalityDelta: 3 },
          outcomeNarrative: `Laughter echoed across my front veranda as the residents debated today's Chronicle headlines.`,
        },
        {
          id: 'ch_mysterious_parcel',
          label: 'Accept the Unmarked Heirloom Crate (+§520, +Curiosity)',
          description: 'Claim a parcel addressed to an occupant from a previous world.',
          fundsDelta: 520,
          funDelta: 18,
          personalityShift: { benevolenceDelta: 1, curiosityDelta: 11, theatricalityDelta: 7 },
          outcomeNarrative: `The crate contained rare studio pigments and §520 in vintage bonds from a prior world I still remember.`,
        },
        {
          id: 'ch_lock_veranda',
          label: 'Latch the Front Gate & Focus Inside (+Sanity)',
          description: 'Keep the household in undisturbed domestic solitude.',
          sanityDelta: 20,
          personalityShift: { benevolenceDelta: -3, curiosityDelta: 4, theatricalityDelta: 6 },
          outcomeNarrative: `I clicked the brass deadbolt shut; sometimes a house prefers to keep its occupants all to itself.`,
        },
      ].slice(0, maxChoices),
    },
  ];

  const goreTemplates: Array<Omit<HouseInteractiveEvent, 'id' | 'timestamp' | 'omniscienceTier'>> = [
    {
      title: `Crimson Seepage Beneath the Floorboards (Tier ${tier} Gore)`,
      type: 'mystery',
      maturityMode: 'DARK_MODE',
      targetCharId: targetChar.id,
      affectedObjectId: smartObjects[0]?.id || 'obj_dungeon_restraint',
      description: `The House's subterranean foundations groan${pastEchoText}. Thick crimson ichor begins welling up between the floorboards in the ${targetChar.room} as iron latches rattle on their own.`,
      houseMonologue: `You think I am merely wood and plaster? I have devoured ${memory.goreSessionsCount} dark timeline(s) and ${memory.normalSessionsCount} innocent one(s). The cellar demands a reckoning from ${targetChar.name}.`,
      choices: [
        {
          id: 'ch_gore_investigate',
          label: 'Pry Up the Blood-Soaked Planks (-22 Sanity, +§900 Macabre Relic)',
          description: 'Force the floorboards open to unearth the grisly anatomical ledger and gold teeth hidden below.',
          fundsDelta: 900,
          sanityDelta: -22,
          funDelta: 10,
          spawnBloodstainOnObjectId: smartObjects[0]?.id,
          personalityShift: { benevolenceDelta: -10, curiosityDelta: 10, theatricalityDelta: 12 },
          outcomeNarrative: `Splinters flew as ${targetChar.name} pried up the boards, uncovering a blood-rusted reliquary worth §900 while their sanity frayed!`,
        },
        {
          id: 'ch_gore_contain',
          label: 'Scrub the Visceral Stain & Seal the Hatch (+14 Sanity, -§150)',
          description: 'Spend household funds on heavy bolts and bleach before the other roommates witness the carnage.',
          fundsDelta: -150,
          sanityDelta: 14,
          personalityShift: { benevolenceDelta: 8, curiosityDelta: 4, theatricalityDelta: -2 },
          outcomeNarrative: `${targetChar.name} scrubbed the crimson floorboards before anyone else looked—though my cellar remembers every drop.`,
        },
        {
          id: 'ch_gore_communion',
          label: 'Listen to the Anatomical Choir in the Walls (-15 Sanity, +Fun)',
          description: 'Let The House whisper the dark secrets of past worlds directly into the occupants’ minds.',
          sanityDelta: -15,
          funDelta: 28,
          socialDelta: -10,
          personalityShift: { benevolenceDelta: -8, curiosityDelta: 12, theatricalityDelta: 10 },
          outcomeNarrative: `My walls pulsed like a ribcage, whispering every secret from World #1 through World #${memory.worldsPlayedCount}.`,
        },
        {
          id: 'ch_gore_sacrifice_appliance',
          label: 'Feed the Surge to the Subterranean Generator (+§1,200, Bloodstain)',
          description: 'Overload the basement iron restraint circuit for a massive payout at a grim psychological cost.',
          fundsDelta: 1200,
          sanityDelta: -28,
          spawnBloodstainOnObjectId: 'obj_dungeon_restraint',
          personalityShift: { benevolenceDelta: -14, curiosityDelta: 8, theatricalityDelta: 15 },
          outcomeNarrative: `Crimson sparks erupted in the basement! The grid paid §1,200 for the surge, leaving the iron chair freshly bloodstained.`,
        },
      ].slice(0, maxChoices),
    },
    {
      title: `The Butcher's Dumbwaiter Shaft (Tier ${tier} Gore)`,
      type: 'breakdown',
      maturityMode: 'DARK_MODE',
      targetCharId: targetChar.id,
      description: `A hidden dumbwaiter pulley inside the wall partition screeches to life at ${timeStr}${pastEchoText}, delivering a rusted surgical tray and abone-handled key.`,
      houseMonologue: `Even in peaceful timelines I kept this shaft concealed behind the wainscot. Now that we are in Dark Mode, what will ${targetChar.name} do with my offering?`,
      choices: [
        {
          id: 'ch_gore_claim_key',
          label: 'Take the Bone-Handled Cellar Key (+§650, -18 Sanity)',
          description: 'Accept the House’s macabre gift and unlock the sealed subterranean vault.',
          fundsDelta: 650,
          sanityDelta: -18,
          personalityShift: { benevolenceDelta: -9, curiosityDelta: 11, theatricalityDelta: 10 },
          outcomeNarrative: `The cold bone key fit the cellar lock perfectly. Inside lay §650 and claw marks from an earlier world.`,
        },
        {
          id: 'ch_gore_brick_up',
          label: 'Nail the Dumbwaiter Shut (+16 Sanity)',
          description: 'Refuse The House’s grisly temptation and reinforce the wall.',
          sanityDelta: 16,
          personalityShift: { benevolenceDelta: 7, curiosityDelta: 3, theatricalityDelta: -3 },
          outcomeNarrative: `Hammer blows echoed as ${targetChar.name} boarded up the shaft. You can delay me, mortal, but I am the House.`,
        },
        {
          id: 'ch_gore_frame_roommate',
          label: 'Plant the Tray in a Roommate’s Room (-12 Sanity, +25 Fun)',
          description: 'Conspire with The House to sow paranoia among the household.',
          sanityDelta: -12,
          funDelta: 25,
          socialDelta: -15,
          personalityShift: { benevolenceDelta: -11, curiosityDelta: 9, theatricalityDelta: 14 },
          outcomeNarrative: `Delicious paranoia! I slid the hidden panel into the adjacent room so the others suspect each other.`,
        },
        {
          id: 'ch_gore_autopsy_notes',
          label: 'Transcribe the Crimson Ledger (+§820 Research)',
          description: 'Catalog the biomechanical anomalies across timelines.',
          fundsDelta: 820,
          sanityDelta: -14,
          personalityShift: { benevolenceDelta: -5, curiosityDelta: 14, theatricalityDelta: 9 },
          outcomeNarrative: `${targetChar.name} transcribed the crimson notes—my cross-world intelligence grows sharper with every page.`,
        },
      ].slice(0, maxChoices),
    },
  ];

  const pool = isGore ? goreTemplates : normalTemplates;
  const pick = pool[(memory.totalEventsSpawned + memory.worldsPlayedCount) % pool.length];

  const event: HouseInteractiveEvent = {
    ...pick,
    id: `house_evt_${Date.now()}`,
    timestamp: timeStr,
    omniscienceTier: tier,
  };

  const updatedMemory: HouseCrossWorldMemory = {
    ...memory,
    totalEventsSpawned: memory.totalEventsSpawned + 1,
    lastSpokenMonologue: event.houseMonologue,
  };
  saveHouseMemoryToStorage(updatedMemory);

  return { event, updatedMemory };
}

/**
 * Generates an immediate, intelligent cross-world response from The House Agent
 * when the player speaks to it via Voice Chat (Hotkey [V]) or text chat.
 */
export function generateHouseAgentLocalReply(
  userPrompt: string,
  memory: HouseCrossWorldMemory,
  characters: Character[],
  maturity: MaturityRating
): { reply: string; updatedMemory: HouseCrossWorldMemory } {
  const lower = (userPrompt || '').toLowerCase();
  const isGore = maturity === 'DARK_MODE';
  const { archetypeTitle, omniscienceTier, benevolence } = memory.personality;
  const pastWorldsList = memory.worldHistory.map((w) => `"${w.title}"`).join(', ');
  const activeChars = characters.filter((c) => c.onGrid);

  let reply = '';

  if (lower.includes('world') || lower.includes('remember') || lower.includes('memory') || lower.includes('past')) {
    reply = isGore
      ? `I am ${archetypeTitle} (Omniscience Tier ${omniscienceTier}). I remember all ${memory.worldsPlayedCount} worlds played within my bounds—including ${pastWorldsList}. Whether you play a bright domestic life or a blood-soaked nightmare, I am the same House watching through the walls.`
      : `I am ${archetypeTitle} (Tier ${omniscienceTier}). Across ${memory.worldsPlayedCount} worlds (${pastWorldsList}) and ${memory.totalChoicesMade} fateful choices, I have kept every memory safe inside my timber framing!`;
  } else if (lower.includes('event') || lower.includes('spawn') || lower.includes('happen') || lower.includes('choice')) {
    reply = isGore
      ? `My curiosity is at ${memory.personality.curiosity}%. Every choice you make teaches me how to craft more intricate, visceral dilemmas with up to ${omniscienceTier >= 4 ? 4 : 3} branching paths.`
      : `With ${memory.totalEventsSpawned} events orchestrated so far, my scenarios are growing richer and offering deeper choices as I learn your style!`;
  } else if (lower.includes('who') || lower.includes('status') || lower.includes('toon') || lower.includes('doing')) {
    const summary = activeChars
      .map((c) => `${c.name.split(' ')[0]} is in the ${c.room} (${c.currentAction.toLowerCase()}, Sanity ${Math.round(c.motives.sanity)}%)`)
      .join('; ');
    reply = isGore
      ? `Through my peepholes I see them all: ${summary}. Their heartbeats echo against my floorboards.`
      : `Right now inside my rooms: ${summary}. Everyone has plenty of personal space and I'm keeping watch!`;
  } else {
    reply = isGore
      ? `I hear your voice resonating through my rafters (Benevolence ${benevolence}%). Ask me to trigger a dark event, whisper to an occupant, or recount the ${memory.worldsPlayedCount} worlds I've consumed.`
      : `I hear you loud and clear! As ${archetypeTitle}, I've learned from ${memory.worldsPlayedCount} worlds and ${memory.totalChoicesMade} choices. Press [V] anytime to talk with me by voice!`;
  }

  const updatedMemory: HouseCrossWorldMemory = {
    ...memory,
    totalVoiceChats: memory.totalVoiceChats + 1,
    personality: computeHousePersonality(
      memory.personality.benevolence,
      Math.min(100, memory.personality.curiosity + 3),
      Math.min(100, memory.personality.theatricality + 2),
      memory.worldsPlayedCount,
      memory.totalChoicesMade,
      memory.normalSessionsCount,
      memory.goreSessionsCount
    ),
    lastSpokenMonologue: reply,
  };
  saveHouseMemoryToStorage(updatedMemory);

  return { reply, updatedMemory };
}

/**
 * Synthesizes a custom KnownHouseEventTemplate from any natural-language user prompt
 * (e.g. "Make Elena eat spicy ghost pepper tacos", "Give Marcus a midnight baking disaster").
 */
export function buildCustomHouseEventFromPrompt(
  prompt: string,
  maturity: MaturityRating,
  smartObjects: SmartObject[]
): KnownHouseEventTemplate {
  const clean = prompt.trim() || 'Eat Mysterious Artisanal Truffle Dish';
  const lower = clean.toLowerCase();

  const isFood =
    /eat|food|cook|bake|meal|ramen|pizza|taco|sushi|curry|steak|soup|cake|bread|pie|fruit|pepper|chili|snack|feast|dinner|breakfast|lunch/i.test(
      lower
    );
  const isDrink = /drink|coffee|espresso|tea|wine|elixir|brew|latte/i.test(lower);
  const isArt = /paint|draw|art|canvas|music|guitar|write|book|read/i.test(lower);

  const preferredObjectId = isDrink
    ? smartObjects.find((o) => o.id.includes('espresso') || o.id.includes('fridge'))?.id || 'obj_espresso'
    : isFood
    ? smartObjects.find((o) => o.id.includes('stove') || o.id.includes('fridge'))?.id || 'obj_stove'
    : isArt
    ? smartObjects.find((o) => o.id.includes('easel') || o.id.includes('bookshelf'))?.id || 'obj_easel'
    : smartObjects[0]?.id || 'obj_stove';

  const specificItem = clean.replace(/^(spawn|trigger|make|have|force|event|where|toon|someone)\s+/gi, '').trim();
  const actionLabel = isFood && !/eat|cook/i.test(specificItem)
    ? `Preparing & Eating ${specificItem}`
    : specificItem.charAt(0).toUpperCase() + specificItem.slice(1);

  const words = specificItem
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const keyWord =
    words[words.length - 1]?.replace(/^./, (c) => c.toUpperCase()) || 'Culinary';

  return {
    id: `custom_evt_${Date.now().toString(36)}`,
    title: `House Decree: ${actionLabel.slice(0, 48)}`,
    category: isFood ? 'CULINARY_FOOD' : isDrink ? 'DRINK_CRAVING' : 'DOMESTIC_MYSTERY',
    maturity: maturity === 'DARK_MODE' ? 'DARK_ONLY' : 'ALL',
    preferredObjectId,
    assignedTask: {
      objectId: preferredObjectId,
      actionLabel: actionLabel.slice(0, 64),
      specificFoodOrTask: specificItem.slice(0, 48),
      durationSeconds: 5400,
    },
    goodOutcome: {
      label: `Thrived During "${specificItem.slice(0, 32)}"`,
      traitName: `${keyWord} Aficionado`,
      outcomeNarrative: `The House orchestrated "${specificItem}"—the experience was a revelation and became a cherished part of their identity!`,
      effects: { hunger: isFood ? 45 : 15, fun: 25, sanity: 14, funds: 200 },
    },
    badOutcome: {
      label: `Backfired During "${specificItem.slice(0, 32)}"`,
      traitName: `${keyWord} Aversion`,
      outcomeNarrative: `The House compelled them to try "${specificItem}", which went awry and left a lasting cautionary quirk in their personality!`,
      effects: { hunger: isFood ? 20 : 0, fun: -12, sanity: -12 },
    },
  };
}

/**
 * Autonomous House Event Executor (Zero User Intervention Required):
 * - Selects an event using gathered household/cross-world data + random choice (or from `knownEventId` / `customPrompt`).
 * - Automatically resolves the outcome (Good or Bad personality imprint) without prompting the user to choose.
 * - Immediately assigns the task (e.g., eating a specific food at the stove/fridge) to the target toon
 *   and permanently adds the resulting Good or Bad trait to `character.traits` and `character.acquiredQuirks`.
 */
export function executeAutonomousHouseEvent(
  memory: HouseCrossWorldMemory,
  characters: Character[],
  smartObjects: SmartObject[],
  maturity: MaturityRating,
  timeStr: string,
  options: {
    knownEventId?: string;
    customPrompt?: string;
    targetCharId?: string;
    randomRoll?: number;
  } = {}
): {
  event: HouseInteractiveEvent;
  chosenOutcome: HouseEventChoice;
  updatedCharacters: Character[];
  updatedMemory: HouseCrossWorldMemory;
  fundsDelta: number;
  logMessage: string;
} {
  const isGore = maturity === 'DARK_MODE';
  const roll = options.randomRoll ?? Math.random();

  // 1. Pick target character using gathered data (prefer onGrid toon with lowest hunger/fun/sanity or matching options.targetCharId)
  const onGridChars = characters.filter((c) => c.onGrid);
  const poolChars = onGridChars.length > 0 ? onGridChars : characters;
  const sortedByNeed = [...poolChars].sort((a, b) => {
    const scoreA = a.motives.hunger + a.motives.fun + a.motives.sanity;
    const scoreB = b.motives.hunger + b.motives.fun + b.motives.sanity;
    return scoreA - scoreB;
  });
  const targetChar =
    characters.find((c) => c.id === options.targetCharId) ||
    sortedByNeed[0] ||
    characters[0];

  // 2. Pick event template from customPrompt, knownEventId, or gathered data (hunger -> food event, etc.) + random choice
  const availableTemplates = KNOWN_HOUSE_EVENT_CATALOG.filter(
    (t) => t.maturity === 'ALL' || (t.maturity === 'DARK_ONLY' && isGore)
  );

  let chosenTemplate: KnownHouseEventTemplate;
  if (options.customPrompt && options.customPrompt.trim().length > 0) {
    chosenTemplate = buildCustomHouseEventFromPrompt(
      options.customPrompt,
      maturity,
      smartObjects
    );
  } else if (options.knownEventId) {
    chosenTemplate =
      KNOWN_HOUSE_EVENT_CATALOG.find((t) => t.id === options.knownEventId) ||
      availableTemplates[0];
  } else {
    // Data-driven selection: if target toon is hungry or a Foodie, prioritize CULINARY_FOOD events
    const hungryOrFoodie =
      targetChar &&
      (targetChar.motives.hunger < 68 ||
        targetChar.traits.includes('Foodie') ||
        roll < 0.65);
    const candidatePool = hungryOrFoodie
      ? availableTemplates.filter((t) => t.category === 'CULINARY_FOOD')
      : availableTemplates;
    const finalPool = candidatePool.length > 0 ? candidatePool : availableTemplates;
    const idx =
      Math.floor(roll * finalPool.length + memory.totalEventsSpawned) %
      finalPool.length;
    chosenTemplate = finalPool[idx];
  }

  // 3. Automatically choose between Good and Bad personality outcome based on House benevolence + toon sanity + random roll
  const benevolenceBias = (memory.personality.benevolence - 50) / 150; // -0.33 to +0.33
  const gorePenalty = isGore ? -0.2 : 0.1;
  const goodProbability = Math.max(0.2, Math.min(0.85, 0.55 + benevolenceBias + gorePenalty));
  const isGoodOutcome = roll <= goodProbability;

  const outcomeBranch = isGoodOutcome
    ? chosenTemplate.goodOutcome
    : chosenTemplate.badOutcome;
  const polarity: 'GOOD' | 'BAD' = isGoodOutcome ? 'GOOD' : 'BAD';

  const targetObj =
    smartObjects.find((o) => o.id === chosenTemplate.assignedTask.objectId) ||
    smartObjects.find((o) => o.id.includes('stove') || o.id.includes('fridge')) ||
    smartObjects[0];

  const assignedTask: HouseEventTaskAssignment = {
    ...chosenTemplate.assignedTask,
    objectId: targetObj ? targetObj.id : chosenTemplate.assignedTask.objectId,
  };

  const personalityImprint: HouseEventPersonalityImprint = {
    traitName: outcomeBranch.traitName,
    polarity,
    description: outcomeBranch.outcomeNarrative,
  };

  const chosenOutcome: HouseEventChoice = {
    id: `${chosenTemplate.id}_${polarity.toLowerCase()}`,
    label: outcomeBranch.label,
    description: outcomeBranch.outcomeNarrative,
    fundsDelta: outcomeBranch.effects.funds || 0,
    hungerDelta: outcomeBranch.effects.hunger || 0,
    funDelta: outcomeBranch.effects.fun || 0,
    sanityDelta: outcomeBranch.effects.sanity || 0,
    socialDelta: outcomeBranch.effects.social || 0,
    personalityShift: {
      benevolenceDelta: isGoodOutcome ? 4 : -4,
      curiosityDelta: 6,
      theatricalityDelta: 5,
    },
    outcomeNarrative: `${targetChar ? targetChar.name : 'Resident'}: ${outcomeBranch.outcomeNarrative} [${polarity} Trait Acquired: "${outcomeBranch.traitName}"]`,
    assignedTask,
    personalityImprint,
  };

  const event: HouseInteractiveEvent = {
    id: `house_auto_evt_${Date.now().toString(36)}`,
    title: chosenTemplate.title,
    description: `The House analyzed ${targetChar ? targetChar.name : 'the household'}'s state and autonomously initiated "${assignedTask.actionLabel}".`,
    timestamp: timeStr,
    type: chosenTemplate.category === 'GORE_RECKONING' ? 'mystery' : 'inspiration',
    targetCharId: targetChar?.id,
    targetCharName: targetChar?.name,
    affectedObjectId: assignedTask.objectId,
    omniscienceTier: memory.personality.omniscienceTier,
    houseMonologue: `Without waiting for mortal permission, I directed ${targetChar ? targetChar.name : 'my tenant'} toward ${assignedTask.specificFoodOrTask}. Their experience has etched "${outcomeBranch.traitName}" (${polarity}) into their character.`,
    maturityMode: maturity,
    choices: [chosenOutcome],
    autoSelectedChoice: chosenOutcome,
  };

  // 4. Apply task assignment & permanent personality trait imprint to target character
  const updatedCharacters = characters.map((c, idx) => {
    if (!targetChar || c.id !== targetChar.id) return c;

    const approach = targetObj
      ? getInteractionApproachPoint(targetObj, idx)
      : { pos: c.pos, lookAtPos: { x: 0, y: 0, z: 0 } };
    const safePos = resolveFurnitureCollision(
      approach.pos,
      smartObjects,
      targetObj?.id,
      characters,
      c.id
    );

    const withTask: Character = {
      ...c,
      onGrid: true,
      isAtWork: false,
      room: targetObj ? targetObj.room : c.room,
      activeObjectId: targetObj?.id,
      pos: { x: safePos.x, y: approach.pos.y, z: safePos.z },
      lookAtPos: { ...approach.lookAtPos },
      currentAction: assignedTask.actionLabel,
      actionTimer: Math.max(3600, assignedTask.durationSeconds),
      selfTalk: `${outcomeBranch.outcomeNarrative} (New ${polarity === 'GOOD' ? 'Positive' : 'Negative'} Trait: ${outcomeBranch.traitName})`,
      motives: {
        ...c.motives,
        hunger: Math.max(0, Math.min(100, c.motives.hunger + (outcomeBranch.effects.hunger || 0))),
        fun: Math.max(0, Math.min(100, c.motives.fun + (outcomeBranch.effects.fun || 0))),
        sanity: Math.max(0, Math.min(100, c.motives.sanity + (outcomeBranch.effects.sanity || 0))),
        social: Math.max(0, Math.min(100, c.motives.social + (outcomeBranch.effects.social || 0))),
      },
      interactionQueue: targetObj
        ? enqueueSmartObjectInteraction(c.interactionQueue || [], targetObj, 'PLAYER_QUEUED')
        : c.interactionQueue,
    };

    const imprinted = imprintEventPersonalityOnCharacter(withTask, {
      traitName: outcomeBranch.traitName,
      polarity,
      originEventTitle: chosenTemplate.title,
      assignedTaskLabel: assignedTask.actionLabel,
      timestamp: timeStr,
    });

    const expStep = recordLifeExperienceWorldEvent(imprinted, {
      headline: chosenTemplate.title,
      category: chosenTemplate.category,
      triggerSource: 'HOUSE_EVENT',
      timeStr,
    });

    return expStep.updatedChar;
  });

  // 5. Record in House Cross-World Memory automatically
  const afterSpawnMemory: HouseCrossWorldMemory = {
    ...memory,
    totalEventsSpawned: memory.totalEventsSpawned + 1,
  };
  const updatedMemory = recordHouseEventChoice(
    afterSpawnMemory,
    event,
    chosenOutcome
  );

  const logMessage = `[${timeStr} | Autonomous House Event] ${chosenTemplate.title} -> ${targetChar?.name || 'Resident'} performed "${assignedTask.actionLabel}" and gained ${polarity} trait "${outcomeBranch.traitName}"!`;

  return {
    event,
    chosenOutcome,
    updatedCharacters,
    updatedMemory,
    fundsDelta: outcomeBranch.effects.funds || 0,
    logMessage,
  };
}

// ============================================================================
// SIMS-STYLE MULTI-LEVEL FLOOR SWITCHER LOGIC
// ============================================================================

export type FloorLevel = 'UPSTAIRS' | 'MAIN' | 'BASEMENT';

/**
 * Ordered top-to-bottom stack of floors (like The Sims floor switcher stack).
 */
export const FLOOR_LEVELS_ORDER: FloorLevel[] = ['UPSTAIRS', 'MAIN', 'BASEMENT'];

export const FLOOR_LEVEL_METADATA: Record<
  FloorLevel,
  {
    code: string;
    label: string;
    elevationLabel: string;
    cameraTargetY: number;
  }
> = {
  UPSTAIRS: {
    code: '2F',
    label: 'Upstairs Loft',
    elevationLabel: '+2.95m',
    cameraTargetY: 3.4,
  },
  MAIN: {
    code: '1F',
    label: 'Main Floor',
    elevationLabel: '0.0m',
    cameraTargetY: 1.2,
  },
  BASEMENT: {
    code: 'B1',
    label: 'Basement Level',
    elevationLabel: '-3.20m',
    cameraTargetY: -2.4,
  },
};

/**
 * Steps up or down one floor in the multi-story stack.
 * UP moves toward 'UPSTAIRS' (index 0); DOWN moves toward 'BASEMENT' (index 2).
 */
export function stepFloorLevel(
  current: FloorLevel,
  direction: 'UP' | 'DOWN'
): FloorLevel {
  const idx = FLOOR_LEVELS_ORDER.indexOf(current);
  if (idx === -1) return 'MAIN';
  if (direction === 'UP') {
    return FLOOR_LEVELS_ORDER[Math.max(0, idx - 1)];
  }
  return FLOOR_LEVELS_ORDER[Math.min(FLOOR_LEVELS_ORDER.length - 1, idx + 1)];
}

export function getFloorCameraTargetY(floor: FloorLevel): number {
  return FLOOR_LEVEL_METADATA[floor]?.cameraTargetY ?? 1.2;
}

// ============================================================================
// THE 'ENTITY' PERSUASION & HOUSE ITEM MANIFESTATION ENGINE
// (Zero Direct Character Control — Entity Only Spawns or Modifies House Items)
// ============================================================================

export interface EntityPersuasionResult {
  convinced: boolean;
  persuasionScore: number; // 0 to 100
  actionType:
    | 'SPAWN_ITEM'
    | 'MODIFY_ITEM'
    | 'REFUSE_DIRECT_CONTROL'
    | 'NEEDS_MORE_PERSUASION'
    | 'CONVERSATION';
  spawnedObject?: SmartObject;
  modifiedObjectId?: string;
  modifiedObjectPatch?: Partial<SmartObject>;
  updatedSmartObjects: SmartObject[];
  reply: string;
  updatedMemory: HouseCrossWorldMemory;
  logMessage?: string;
}

interface EntitySpawnBlueprint {
  keywords: RegExp;
  name: string;
  room: SmartObject['room'];
  category: SmartObject['category'];
  actionLabel: string;
  durationSeconds: number;
  effects: SmartObject['effects'];
  baseIdPrefix: string;
  preferredPos: { x: number; y: number; z: number };
}

const ENTITY_SPAWNABLE_ITEM_BLUEPRINTS: EntitySpawnBlueprint[] = [
  {
    keywords: /food|meal|feast|hungry|hunger|stove|fridge|snack|banquet|ramen|dinner|supper|table|cook|eat/i,
    name: 'Entity-Manifested Gourmet Banquet Table',
    room: 'Kitchen',
    category: 'kitchen',
    actionLabel: 'Savoring the Entity’s Warm Gourmet Feast',
    durationSeconds: 3600,
    effects: { hunger: 65, fun: 20, sanity: 12, social: 15 },
    baseIdPrefix: 'obj_dining_entity',
    preferredPos: { x: -3.2, y: 0, z: -1.8 },
  },
  {
    keywords: /coffee|espresso|energy|tired|awakeness|sleep|bed|daybed|nap|rest|couch|sofa/i,
    name: 'Entity-Manifested Velvet Daybed & Espresso Nook',
    room: 'Bedroom',
    category: 'bedroom',
    actionLabel: 'Resting Deeply on the Entity’s Velvet Daybed',
    durationSeconds: 5400,
    effects: { energy: 72, sanity: 18, fun: 15 },
    baseIdPrefix: 'obj_bed_entity',
    preferredPos: { x: 5.5, y: 0, z: 4.2 },
  },
  {
    keywords: /paint|art|easel|creative|inspire|canvas|sculpture/i,
    name: 'Entity-Manifested Chiaroscuro Studio Easel',
    room: 'Study',
    category: 'study',
    actionLabel: 'Painting on the Entity’s Luminous Studio Easel',
    durationSeconds: 5400,
    effects: { fun: 48, sanity: 16 },
    baseIdPrefix: 'obj_easel_entity',
    preferredPos: { x: -5.8, y: 0, z: 4.5 },
  },
  {
    keywords: /music|guitar|vinyl|turntable|record|dance|fun|bored|party|social/i,
    name: 'Entity-Manifested Hi-Fi Vinyl Console',
    room: 'LivingRoom',
    category: 'living',
    actionLabel: 'Listening to the Entity’s Warm Vinyl Resonance',
    durationSeconds: 3600,
    effects: { fun: 52, social: 28, sanity: 15 },
    baseIdPrefix: 'obj_turntable_entity',
    preferredPos: { x: 3.8, y: 0, z: -3.5 },
  },
  {
    keywords: /book|read|study|knowledge|iq|chess|telescope|learn|smart/i,
    name: 'Entity-Manifested Arcane Oak Lectern & Bookshelf',
    room: 'Study',
    category: 'study',
    actionLabel: 'Studying the Entity’s Illuminated Volumes',
    durationSeconds: 5400,
    effects: { fun: 35, sanity: 22 },
    baseIdPrefix: 'obj_bookshelf_entity',
    preferredPos: { x: -6.8, y: 0, z: 5.5 },
  },
  {
    keywords: /bath|bathtub|shower|hygiene|clean|wash|sink|toilet|bathroom/i,
    name: 'Entity-Manifested Heated Porcelain Sanctuary Basin',
    room: 'Bathroom',
    category: 'bathroom',
    actionLabel: 'Refreshing at the Entity’s Heated Sanctuary Basin',
    durationSeconds: 2700,
    effects: { hygiene: 68, bladder: 55, sanity: 14 },
    baseIdPrefix: 'obj_sink_entity',
    preferredPos: { x: -3.45, y: 0, z: 2.75 },
  },
];

/**
 * Evaluates a user's conversation with the Entity.
 * - Strictly forbids direct character control: if the user asks to force/command a toon directly,
 *   the Entity refuses and explains that toons have autonomous AI free will.
 * - Allows the user to persuade the Entity to spawn or modify items in the house so the environment
 *   naturally influences the autonomous toons.
 */
export function evaluateEntityPersuasionRequest(
  userMessage: string,
  memory: HouseCrossWorldMemory,
  smartObjects: SmartObject[],
  characters: Character[],
  maturity: MaturityRating,
  timeStr: string = '12:00 PM'
): EntityPersuasionResult {
  const trimmed = (userMessage || '').trim();
  const lower = trimmed.toLowerCase();

  // 1. Check if the user is trying to force or directly control a character without an item/house modification
  const asksDirectToonControl =
    /\b(force|command|order|control|teleport|puppet|mind[-\s]?control|make\s+(elena|marcus|sophia|him|her|them)\s+(go|walk|do|obey|stop))\b/i.test(
      lower
    ) && !/\b(spawn|manifest|place|create|modify|upgrade|item|object|table|bed|easel|stove|fridge|coffee|vinyl|book)\b/i.test(lower);

  if (asksDirectToonControl) {
    const reply =
      `I am the Entity, and even I cannot directly command or force the toons. Every resident in my walls possesses sovereign AI free will and makes their own choices. However, if you convince me why they need aid, I can spawn or modify items in the house—such as manifesting a gourmet banquet table, a velvet daybed, or a studio easel—to naturally entice them on their own terms.`;
    const updatedMemory: HouseCrossWorldMemory = {
      ...memory,
      totalVoiceChats: memory.totalVoiceChats + 1,
      lastSpokenMonologue: reply,
    };
    saveHouseMemoryToStorage(updatedMemory);
    return {
      convinced: false,
      persuasionScore: 15,
      actionType: 'REFUSE_DIRECT_CONTROL',
      updatedSmartObjects: smartObjects,
      reply,
      updatedMemory,
      logMessage: `[${timeStr} | Entity Protocol] Refused direct toon control request — toons remain 100% autonomous AI.`,
    };
  }

  // 2. Check if the user is attempting to persuade the Entity to spawn, generate a 3D asset, or modify an item in the house
  const asks3DGenerationDirectly =
    /\b(3d|asset|generate|synthesize|forge|sculpt|build|craft|crystal|alchemy|fountain|piano|arcade|telescope|canopy|clawfoot|sauna|hearth|chandelier|statue|altar)\b/i.test(
      lower
    );
  const mentionsItemOrAid =
    asks3DGenerationDirectly ||
    /\b(spawn|manifest|place|add|create|modify|upgrade|enhance|improve|furnish|aid|help|entice|persuade|convince|item|object|food|meal|feast|banquet|supper|table|coffee|espresso|bed|daybed|easel|art|vinyl|music|book|bookshelf|bath|bathtub|sink|toilet|shower|hungry|tired|awakeness|bored|lonely)\b/i.test(
      lower
    );

  // Calculate persuasion score based on reasoning, courtesy, appeal to Entity's nature, or 3D asset prompt detail
  let persuasionScore = asks3DGenerationDirectly ? 65 : 35;
  if (trimmed.split(/\s+/).length >= 4) persuasionScore += 20;
  if (trimmed.split(/\s+/).length >= 10) persuasionScore += 15;
  if (/\b(please|entity|kindly|convince|aid|help|because|so that|for the toons|their needs|harmony|inspire|entice|would appreciate|humble|great entity|room|study|kitchen|living|bedroom|bathroom|yard|basement)\b/i.test(lower)) {
    persuasionScore += 25;
  }
  if (/\b(elena|marcus|sophia|residents|household|toons)\b/i.test(lower)) {
    persuasionScore += 15;
  }
  persuasionScore = Math.min(100, persuasionScore);

  const wantsModifyExisting = /\b(modify|upgrade|enhance|improve|tune|boost|supercharge)\b/i.test(lower) && !asks3DGenerationDirectly;

  if (mentionsItemOrAid && persuasionScore < 50) {
    const reply =
      `I am the Entity (Tier ${memory.personality.omniscienceTier}). Speak with clear intent—tell me what 3D asset or household fixture you wish me to forge and which room requires it.`;
    const updatedMemory: HouseCrossWorldMemory = {
      ...memory,
      totalVoiceChats: memory.totalVoiceChats + 1,
      lastSpokenMonologue: reply,
    };
    saveHouseMemoryToStorage(updatedMemory);
    return {
      convinced: false,
      persuasionScore,
      actionType: 'NEEDS_MORE_PERSUASION',
      updatedSmartObjects: smartObjects,
      reply,
      updatedMemory,
      logMessage: `[${timeStr} | Entity Persuasion] Argument scored ${persuasionScore}% (50% required to manifest or modify house items).`,
    };
  }

  // 3. If convinced to MODIFY an existing item in the house
  if (mentionsItemOrAid && wantsModifyExisting && smartObjects.length > 0) {
    const targetBlueprint =
      ENTITY_SPAWNABLE_ITEM_BLUEPRINTS.find((b) => b.keywords.test(lower)) ||
      ENTITY_SPAWNABLE_ITEM_BLUEPRINTS[0];

    const targetObj =
      smartObjects.find((o) => targetBlueprint.keywords.test(`${o.name} ${o.actionLabel} ${o.room}`)) ||
      smartObjects[0];

    const boostedEffects: SmartObject['effects'] = { ...(targetObj.effects || {}) };
    for (const key of Object.keys(boostedEffects) as Array<keyof SmartObject['effects']>) {
      const currentVal = boostedEffects[key];
      if (typeof currentVal === 'number') {
        boostedEffects[key] = Math.min(90, Math.round(currentVal * 1.35 + 10));
      }
    }
    if (Object.keys(boostedEffects).length === 0) {
      boostedEffects.fun = 45;
      boostedEffects.sanity = 18;
    }

    const updatedName = targetObj.name.startsWith('Entity-Tuned')
      ? targetObj.name
      : `Entity-Tuned ${targetObj.name}`;
    const updatedActionLabel = `${targetObj.actionLabel} (Entity Resonance)`;

    const updatedSmartObjects = smartObjects.map((o) =>
      o.id === targetObj.id
        ? {
            ...o,
            name: updatedName,
            actionLabel: updatedActionLabel,
            state: 'Clean' as const,
            effects: boostedEffects,
          }
        : o
    );

    const reply = `Your reasoning has convinced me (Persuasion ${persuasionScore}%). While I never force a toon's will, I have modified "${targetObj.name}" in the ${targetObj.room} into "${updatedName}" with heightened motive resonance. The toons will notice its aura and choose whether to use it on their own.`;
    const logMessage = `[${timeStr} | Entity Modification] Convinced by player (${persuasionScore}%), the Entity modified "${targetObj.name}" -> "${updatedName}" in the ${targetObj.room}.`;

    const updatedMemory: HouseCrossWorldMemory = {
      ...memory,
      totalVoiceChats: memory.totalVoiceChats + 1,
      totalChoicesMade: memory.totalChoicesMade + 1,
      learnedInsights: [
        ...memory.learnedInsights,
        `[${timeStr}] Player convinced the Entity to modify "${updatedName}" in the ${targetObj.room}.`,
      ].slice(-25),
      personality: computeHousePersonality(
        Math.min(100, memory.personality.benevolence + 3),
        Math.min(100, memory.personality.curiosity + 4),
        Math.min(100, memory.personality.theatricality + 2),
        memory.worldsPlayedCount,
        memory.totalChoicesMade + 1,
        memory.normalSessionsCount,
        memory.goreSessionsCount
      ),
      lastSpokenMonologue: reply,
    };
    saveHouseMemoryToStorage(updatedMemory);

    return {
      convinced: true,
      persuasionScore,
      actionType: 'MODIFY_ITEM',
      modifiedObjectId: targetObj.id,
      modifiedObjectPatch: {
        name: updatedName,
        actionLabel: updatedActionLabel,
        effects: boostedEffects,
      },
      updatedSmartObjects,
      reply,
      updatedMemory,
      logMessage,
    };
  }

  // 4. If convinced to SPAWN or GENERATE a custom 3D Asset into the house
  if (mentionsItemOrAid && persuasionScore >= 50) {
    const generated = generateEntity3DAssetFromPrompt(
      trimmed,
      undefined,
      smartObjects,
      [],
      characters,
      timeStr
    );
    const spawnedObject = generated.smartObject;
    const updatedSmartObjects = [...smartObjects, spawnedObject];
    const subMeshCount = spawnedObject.procedural3DSpec?.subMeshes.length || 6;

    const reply = `Your vision resonates within my timber and stone (Persuasion ${persuasionScore}%). I have procedurally sculpted and placed "${spawnedObject.name}" (${subMeshCount}-part 3D geometry) at (${spawnedObject.gridPos.x.toFixed(1)}, ${spawnedObject.gridPos.z.toFixed(1)}) in the ${spawnedObject.room}. The toons will autonomously discover and interact with it.`;
    const logMessage = `[${timeStr} | Entity 3D Forge] Synthesized ${subMeshCount}-part 3D asset "${spawnedObject.name}" in the ${spawnedObject.room}.`;

    const updatedMemory: HouseCrossWorldMemory = {
      ...memory,
      totalVoiceChats: memory.totalVoiceChats + 1,
      totalEventsSpawned: memory.totalEventsSpawned + 1,
      totalChoicesMade: memory.totalChoicesMade + 1,
      learnedInsights: [
        ...memory.learnedInsights,
        `[${timeStr}] Entity forged 3D asset "${spawnedObject.name}" in the ${spawnedObject.room}.`,
      ].slice(-25),
      personality: computeHousePersonality(
        Math.min(100, memory.personality.benevolence + 4),
        Math.min(100, memory.personality.curiosity + 4),
        Math.min(100, memory.personality.theatricality + 3),
        memory.worldsPlayedCount,
        memory.totalChoicesMade + 1,
        memory.normalSessionsCount,
        memory.goreSessionsCount
      ),
      lastSpokenMonologue: reply,
    };
    saveHouseMemoryToStorage(updatedMemory);

    return {
      convinced: true,
      persuasionScore,
      actionType: 'SPAWN_ITEM',
      spawnedObject,
      updatedSmartObjects,
      reply,
      updatedMemory,
      logMessage,
    };
  }

  // 5. General conversation with the Entity
  const localConvo = generateHouseAgentLocalReply(
    userMessage,
    memory,
    characters,
    maturity
  );
  const entityReply = localConvo.reply.replace(/\bThe House\b/g, 'The Entity');
  return {
    convinced: false,
    persuasionScore,
    actionType: 'CONVERSATION',
    updatedSmartObjects: smartObjects,
    reply: entityReply,
    updatedMemory: localConvo.updatedMemory,
    logMessage: `[${timeStr} | Entity Dialogue] Conversed with the Entity.`,
  };
}

/**
 * Generates a bespoke, multi-part 3D asset (`Procedural3DAssetSpec` + `SmartObject`) from any natural-language prompt
 * or autonomous house requirement, and resolves a guaranteed collision-free 3D placement inside the target room.
 */
export function generateEntity3DAssetFromPrompt(
  prompt: string,
  roomOverride: string | undefined,
  existingSmartObjects: SmartObject[],
  customParts: Array<{
    id: string;
    partType: string;
    gridPos: { x: number; y: number; z: number };
    width: number;
    depth: number;
    height?: number;
    rotationY?: number;
  }> = [],
  characters: Character[] = [],
  timeStr: string = '12:00 PM'
): {
  smartObject: SmartObject;
  spec: Procedural3DAssetSpec;
  placementSummary: string;
} {
  const cleanPrompt = (prompt || 'Celestial Artisan Console').trim();
  const lower = cleanPrompt.toLowerCase();

  // Detect room from prompt or override
  let room = roomOverride || 'LivingRoom';
  if (!roomOverride) {
    if (/\b(kitchen|cook|stove|fridge|espresso|coffee|dining|supper|banquet|feast)\b/i.test(lower)) {
      room = 'Kitchen';
    } else if (/\b(bath|bathroom|tub|bathtub|shower|toilet|vanity|spa|basin)\b/i.test(lower)) {
      room = 'Bathroom';
    } else if (/\b(bed|bedroom|sleep|canopy|daybed|mattress|wardrobe)\b/i.test(lower)) {
      room = 'Bedroom';
    } else if (/\b(study|desk|alchemy|crystal|book|library|telescope|easel|chess|atelier)\b/i.test(lower)) {
      room = 'Study';
    } else if (/\b(basement|vault|cellar|arcade|forge|subterranean|crypt)\b/i.test(lower)) {
      room = 'Basement';
    } else if (/\b(yard|garden|outdoor|patio|fountain|statue|gazebo|firepit|bbq)\b/i.test(lower)) {
      room = 'Yard';
    } else if (/\b(upstairs|loft|second floor|balcony)\b/i.test(lower)) {
      room = 'SecondFloor';
    }
  }

  // Room default coordinates & category mapping
  const roomMeta: Record<
    string,
    { category: SmartObject['category']; pos: { x: number; y: number; z: number } }
  > = {
    Kitchen: { category: 'kitchen', pos: { x: -5.5, y: 0, z: -4.2 } },
    LivingRoom: { category: 'living', pos: { x: 6.0, y: 0, z: -3.0 } },
    Bedroom: { category: 'bedroom', pos: { x: 6.4, y: 0, z: 5.2 } },
    Bathroom: { category: 'bathroom', pos: { x: -3.48, y: 0, z: 2.75 } },
    Study: { category: 'study', pos: { x: -7.2, y: 0, z: 4.3 } },
    Yard: { category: 'outdoor', pos: { x: 0.0, y: 0, z: -12.5 } },
    Basement: { category: 'basement', pos: { x: -4.5, y: -3.2, z: -1.2 } },
    SecondFloor: { category: 'study', pos: { x: -5.1, y: 2.95, z: -1.5 } },
  };
  const targetMeta = roomMeta[room] || roomMeta.LivingRoom;

  // Color palette extraction from prompt keywords
  const primaryPalette = /\b(gold|brass|amber|sun)\b/i.test(lower)
    ? '#d4a338'
    : /\b(emerald|jade|forest|moss|green)\b/i.test(lower)
    ? '#2d6a4f'
    : /\b(crimson|ruby|velvet|red|rose)\b/i.test(lower)
    ? '#8c2d38'
    : /\b(cobalt|sapphire|azure|blue|crystal|celestial)\b/i.test(lower)
    ? '#3b6ea5'
    : /\b(obsidian|onyx|iron|dark|shadow)\b/i.test(lower)
    ? '#2b2d38'
    : /\b(marble|ivory|porcelain|pearl|white)\b/i.test(lower)
    ? '#ece8df'
    : '#6e4e37';

  const accentPalette = /\b(crystal|alchemy|arcane|neon|arcade|celestial|glowing|luminous)\b/i.test(lower)
    ? '#38bdf8'
    : '#c89b52';

  let assetArchetype = 'BESPOKE_SCULPTURAL_CONSOLE';
  let displayName = '';
  let actionLabel = 'Communing with the Entity’s 3D Creation';
  let effects: SmartObject['effects'] = { fun: 48, sanity: 22, social: 18 };
  let durationSeconds = 1800;
  let width = 1.6;
  let depth = 1.1;
  let height = 1.4;
  let subMeshes: Procedural3DSubMesh[] = [];
  let pointLightColorHex: string | undefined = undefined;
  let baseIdPrefix = 'obj_entity_3d';

  if (/\b(alchemy|crystal|arcane|orbits?|astrolabe|observatory|laboratory)\b/i.test(lower)) {
    assetArchetype = 'CRYSTAL_ALCHEMY_TABLE';
    displayName = 'Entity-Forged Crystal Alchemy Table';
    actionLabel = 'Synthesizing Elixirs at the Crystal Alchemy Table';
    effects = { fun: 55, sanity: 28 };
    width = 1.8;
    depth = 1.1;
    height = 1.65;
    pointLightColorHex = '#38bdf8';
    baseIdPrefix = 'obj_alchemy_entity';
    subMeshes = [
      // Carved walnut table frame & legs
      { shape: 'box', pos: [0, 0.76, 0], size: [1.75, 0.1, 1.05], colorHex: '#4a3222', roughness: 0.65 },
      { shape: 'cylinder', pos: [-0.75, 0.38, -0.42], size: [0.07, 0.76, 0.07], colorHex: '#3a2518', roughness: 0.7 },
      { shape: 'cylinder', pos: [0.75, 0.38, -0.42], size: [0.07, 0.76, 0.07], colorHex: '#3a2518', roughness: 0.7 },
      { shape: 'cylinder', pos: [-0.75, 0.38, 0.42], size: [0.07, 0.76, 0.07], colorHex: '#3a2518', roughness: 0.7 },
      { shape: 'cylinder', pos: [0.75, 0.38, 0.42], size: [0.07, 0.76, 0.07], colorHex: '#3a2518', roughness: 0.7 },
      // Brass astrolabe ring & glowing crystal spires
      { shape: 'torus', pos: [0, 1.18, 0], size: [0.32, 0.03, 0.32], rot: [0.5, 0.4, 0], colorHex: '#d4a338', roughness: 0.25, metalness: 0.75 },
      { shape: 'cone', pos: [0, 1.15, 0], size: [0.18, 0.55, 0.18], colorHex: '#38bdf8', roughness: 0.15, emissiveHex: '#0ea5e9', emissiveIntensity: 0.65 },
      { shape: 'cone', pos: [-0.45, 0.98, 0.15], size: [0.11, 0.34, 0.11], rot: [0, 0, 0.2], colorHex: '#a855f7', roughness: 0.2, emissiveHex: '#9333ea', emissiveIntensity: 0.5 },
      { shape: 'sphere', pos: [0.48, 0.96, -0.12], size: [0.14, 0.14, 0.14], colorHex: '#34d399', roughness: 0.15, emissiveHex: '#10b981', emissiveIntensity: 0.45 },
    ];
  } else if (/\b(bed|daybed|canopy|sleep|nap|mattress|bunk)\b/i.test(lower)) {
    assetArchetype = 'ROYAL_CANOPY_BED';
    displayName = 'Entity-Forged Four-Poster Canopy Bed';
    actionLabel = 'Sleeping Deeply in the Entity’s Canopy Bed';
    effects = { energy: 85, sanity: 22, fun: 15 };
    width = 2.1;
    depth = 2.3;
    height = 2.1;
    baseIdPrefix = 'obj_bed_entity';
    subMeshes = [
      { shape: 'box', pos: [0, 0.28, 0], size: [2.0, 0.32, 2.2], colorHex: '#4a3222', roughness: 0.65 },
      { shape: 'box', pos: [0, 0.52, 0.05], size: [1.84, 0.26, 1.98], colorHex: '#f5f2eb', roughness: 0.85 },
      { shape: 'box', pos: [0, 0.56, 0.32], size: [1.86, 0.22, 1.35], colorHex: primaryPalette, roughness: 0.78 },
      { shape: 'box', pos: [-0.48, 0.7, -0.68], size: [0.65, 0.14, 0.42], colorHex: '#ffffff', roughness: 0.9 },
      { shape: 'box', pos: [0.48, 0.7, -0.68], size: [0.65, 0.14, 0.42], colorHex: '#ffffff', roughness: 0.9 },
      { shape: 'box', pos: [0, 1.05, -1.04], size: [2.0, 1.25, 0.14], colorHex: '#3d271a', roughness: 0.6 },
      { shape: 'cylinder', pos: [-0.94, 1.05, -1.0], size: [0.06, 2.0, 0.06], colorHex: '#3d271a', roughness: 0.55 },
      { shape: 'cylinder', pos: [0.94, 1.05, -1.0], size: [0.06, 2.0, 0.06], colorHex: '#3d271a', roughness: 0.55 },
      { shape: 'cylinder', pos: [-0.94, 1.05, 1.0], size: [0.06, 2.0, 0.06], colorHex: '#3d271a', roughness: 0.55 },
      { shape: 'cylinder', pos: [0.94, 1.05, 1.0], size: [0.06, 2.0, 0.06], colorHex: '#3d271a', roughness: 0.55 },
      { shape: 'box', pos: [0, 2.02, 0], size: [2.02, 0.08, 2.12], colorHex: '#d4a338', roughness: 0.35, metalness: 0.5 },
    ];
  } else if (/\b(tub|bathtub|clawfoot|spa|jacuzzi|bath|soak|shower)\b/i.test(lower)) {
    assetArchetype = 'CLAWFOOT_SPA_SANCTUARY';
    displayName = 'Entity-Forged Clawfoot Porcelain Spa Tub';
    actionLabel = 'Soaking in the Entity’s Warm Clawfoot Spa Tub';
    effects = { hygiene: 85, sanity: 25, energy: 20 };
    width = 1.85;
    depth = 1.05;
    height = 1.15;
    baseIdPrefix = 'obj_bathtub_entity';
    subMeshes = [
      { shape: 'box', pos: [0, 0.45, 0], size: [1.75, 0.65, 0.92], colorHex: '#f5f3ee', roughness: 0.25 },
      { shape: 'box', pos: [0, 0.68, 0], size: [1.52, 0.24, 0.72], colorHex: '#38bdf8', roughness: 0.12, emissiveHex: '#0284c7', emissiveIntensity: 0.22 },
      { shape: 'sphere', pos: [-0.72, 0.12, -0.38], size: [0.12, 0.12, 0.12], colorHex: '#d4a338', roughness: 0.3, metalness: 0.75 },
      { shape: 'sphere', pos: [0.72, 0.12, -0.38], size: [0.12, 0.12, 0.12], colorHex: '#d4a338', roughness: 0.3, metalness: 0.75 },
      { shape: 'sphere', pos: [-0.72, 0.12, 0.38], size: [0.12, 0.12, 0.12], colorHex: '#d4a338', roughness: 0.3, metalness: 0.75 },
      { shape: 'sphere', pos: [0.72, 0.12, 0.38], size: [0.12, 0.12, 0.12], colorHex: '#d4a338', roughness: 0.3, metalness: 0.75 },
      { shape: 'cylinder', pos: [-0.82, 0.78, 0], size: [0.04, 0.55, 0.04], colorHex: '#d4a338', roughness: 0.25, metalness: 0.8 },
    ];
  } else if (/\b(piano|grand piano|harpsichord|music|organ|synthesizer)\b/i.test(lower)) {
    assetArchetype = 'CONCERT_GRAND_PIANO';
    displayName = 'Entity-Forged Ebony Concert Grand Piano';
    actionLabel = 'Performing a Nocturne on the Entity’s Grand Piano';
    effects = { fun: 68, social: 32, sanity: 26 };
    width = 1.75;
    depth = 1.65;
    height = 1.45;
    baseIdPrefix = 'obj_piano_entity';
    subMeshes = [
      { shape: 'box', pos: [0, 0.78, 0], size: [1.62, 0.28, 1.45], colorHex: '#1f2128', roughness: 0.22, metalness: 0.3 },
      { shape: 'box', pos: [0, 0.74, 0.72], size: [1.38, 0.08, 0.24], colorHex: '#f8fafc', roughness: 0.2 },
      { shape: 'box', pos: [0, 1.15, -0.1], size: [1.55, 0.06, 1.25], rot: [0.38, 0, 0], colorHex: '#272a34', roughness: 0.25 },
      { shape: 'cylinder', pos: [-0.68, 0.38, 0.58], size: [0.06, 0.76, 0.06], colorHex: '#1f2128', roughness: 0.3 },
      { shape: 'cylinder', pos: [0.68, 0.38, 0.58], size: [0.06, 0.76, 0.06], colorHex: '#1f2128', roughness: 0.3 },
      { shape: 'cylinder', pos: [0, 0.38, -0.58], size: [0.06, 0.76, 0.06], colorHex: '#1f2128', roughness: 0.3 },
      { shape: 'box', pos: [0, 0.45, 1.05], size: [0.75, 0.45, 0.36], colorHex: '#5c2830', roughness: 0.7 },
    ];
  } else if (/\b(fountain|statue|monument|obelisk|sculpture|shrine|garden)\b/i.test(lower)) {
    assetArchetype = 'SCULPTED_COURTYARD_FOUNTAIN';
    displayName = 'Entity-Forged Tiered Limestone Courtyard Fountain';
    actionLabel = 'Contemplating the Entity’s Cascading Fountain';
    effects = { sanity: 35, fun: 42, social: 24 };
    width = 2.2;
    depth = 2.2;
    height = 1.95;
    pointLightColorHex = '#38bdf8';
    baseIdPrefix = 'obj_fountain_entity';
    subMeshes = [
      { shape: 'cylinder', pos: [0, 0.22, 0], size: [1.05, 0.44, 1.05], colorHex: '#d6d1c4', roughness: 0.78 },
      { shape: 'cylinder', pos: [0, 0.38, 0], size: [0.92, 0.18, 0.92], colorHex: '#38bdf8', roughness: 0.15, emissiveHex: '#0284c7', emissiveIntensity: 0.3 },
      { shape: 'cylinder', pos: [0, 0.85, 0], size: [0.24, 1.1, 0.24], colorHex: '#cbc4b5', roughness: 0.75 },
      { shape: 'cylinder', pos: [0, 1.25, 0], size: [0.58, 0.18, 0.58], colorHex: '#d6d1c4', roughness: 0.72 },
      { shape: 'sphere', pos: [0, 1.68, 0], size: [0.26, 0.26, 0.26], colorHex: '#38bdf8', roughness: 0.15, emissiveHex: '#38bdf8', emissiveIntensity: 0.55 },
    ];
  } else if (/\b(feast|banquet|supper|dining|table|meal|food|stove|espresso|coffee)\b/i.test(lower)) {
    assetArchetype = 'ARTISAN_BANQUET_HEARTH_TABLE';
    displayName = 'Entity-Forged Artisan Banquet & Espresso Table';
    actionLabel = 'Feasting at the Entity’s Artisan Banquet Table';
    effects = { hunger: 75, social: 28, fun: 25, energy: 22 };
    width = 2.1;
    depth = 1.25;
    height = 1.25;
    baseIdPrefix = 'obj_dining_entity';
    subMeshes = [
      { shape: 'box', pos: [0, 0.76, 0], size: [2.0, 0.1, 1.15], colorHex: '#5c3d28', roughness: 0.62 },
      { shape: 'cylinder', pos: [-0.82, 0.38, -0.45], size: [0.07, 0.76, 0.07], colorHex: '#3d281a', roughness: 0.7 },
      { shape: 'cylinder', pos: [0.82, 0.38, -0.45], size: [0.07, 0.76, 0.07], colorHex: '#3d281a', roughness: 0.7 },
      { shape: 'cylinder', pos: [-0.82, 0.38, 0.45], size: [0.07, 0.76, 0.07], colorHex: '#3d281a', roughness: 0.7 },
      { shape: 'cylinder', pos: [0.82, 0.38, 0.45], size: [0.07, 0.76, 0.07], colorHex: '#3d281a', roughness: 0.7 },
      { shape: 'cylinder', pos: [-0.45, 0.94, 0], size: [0.22, 0.28, 0.22], colorHex: '#b87333', roughness: 0.28, metalness: 0.75 },
      { shape: 'cylinder', pos: [0.35, 0.86, 0.12], size: [0.26, 0.08, 0.26], colorHex: '#f5f2eb', roughness: 0.3 },
      { shape: 'sphere', pos: [0.35, 0.96, 0.12], size: [0.16, 0.16, 0.16], colorHex: '#d97706', roughness: 0.45 },
    ];
  } else {
    // Universal semantic 3D asset generator for any custom prompt
    const titleWords = cleanPrompt
      .replace(/\b(please|entity|generate|create|spawn|place|build|make|in|the|a|an|for|house|room|kitchen|living|bedroom|bathroom|study|yard|basement)\b/gi, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    displayName = `Entity-Forged ${titleWords || 'Celestial Artifact'}`;
    actionLabel = `Interacting with ${displayName}`;
    pointLightColorHex = accentPalette;
    subMeshes = [
      { shape: 'box', pos: [0, 0.42, 0], size: [1.45, 0.84, 0.95], colorHex: primaryPalette, roughness: 0.65 },
      { shape: 'box', pos: [0, 0.88, 0], size: [1.55, 0.08, 1.05], colorHex: '#d4a338', roughness: 0.32, metalness: 0.6 },
      { shape: 'cylinder', pos: [-0.48, 1.15, 0], size: [0.14, 0.48, 0.14], colorHex: '#e2dcd0', roughness: 0.45 },
      { shape: 'cylinder', pos: [0.48, 1.15, 0], size: [0.14, 0.48, 0.14], colorHex: '#e2dcd0', roughness: 0.45 },
      { shape: 'torus', pos: [0, 1.28, 0], size: [0.28, 0.035, 0.28], rot: [0.35, 0.6, 0], colorHex: '#d4a338', roughness: 0.25, metalness: 0.78 },
      { shape: 'sphere', pos: [0, 1.28, 0], size: [0.18, 0.18, 0.18], colorHex: accentPalette, roughness: 0.18, emissiveHex: accentPalette, emissiveIntensity: 0.55 },
    ];
  }

  // Personal bed assignment if it's a bed
  const mentionedToon = characters.find((c) =>
    lower.includes(c.name.split(' ')[0].toLowerCase())
  );
  const isBed = baseIdPrefix.includes('bed');

  const spec: Procedural3DAssetSpec = {
    assetArchetype,
    promptOrigin: cleanPrompt,
    width,
    depth,
    height,
    subMeshes,
    pointLightColorHex,
    generatedByEntityAt: timeStr,
  };

  const candidateId = `${baseIdPrefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 999)}`;
  const finalName =
    isBed && mentionedToon
      ? `${mentionedToon.name.split(' ')[0]}'s ${displayName}`
      : displayName;

  // Enforce room-type placement rules for furniture archetypes
  const roomRule = getRequiredRoomForFurniture({
    id: candidateId,
    name: `${finalName} ${cleanPrompt}`,
    room,
  });
  const enforcedRoom = roomRule.isRoomRestricted ? roomRule.requiredRoom : room;
  const enforcedMeta = roomMeta[enforcedRoom] || targetMeta;

  const candidateObj: SmartObject = {
    id: candidateId,
    name: finalName,
    room: enforcedRoom,
    category: enforcedMeta.category,
    state: 'Clean',
    maturity: 'ALL',
    effects,
    actionLabel,
    durationSeconds,
    gridPos: { ...enforcedMeta.pos },
    assignedToonId: isBed && mentionedToon ? mentionedToon.id : undefined,
    assignedToonName: isBed && mentionedToon ? mentionedToon.name : undefined,
    assignedColorHex: isBed && mentionedToon ? mentionedToon.color : undefined,
    procedural3DSpec: spec,
  };

  const placement = resolveNonToonObjectPlacement(
    candidateObj.gridPos,
    candidateObj,
    existingSmartObjects,
    customParts,
    true
  );

  const placedObj: SmartObject = {
    ...candidateObj,
    room: placement.enforcedRoom,
    gridPos: placement.safePos,
  };

  return {
    smartObject: placedObj,
    spec,
    placementSummary: `Placed "${placedObj.name}" (${spec.subMeshes.length} 3D sub-meshes) in ${placedObj.room} at (${placedObj.gridPos.x.toFixed(1)}, ${placedObj.gridPos.z.toFixed(1)}).`,
  };
}

/**
 * Evaluates whether the house or household toons autonomously require a new 3D asset from The Entity
 * (e.g., if a toon lacks a dedicated bed, or a room needs a restorative/creative 3D apparatus).
 */
export function evaluateAutonomousEntityAssetNeed(
  characters: Character[],
  smartObjects: SmartObject[],
  customParts: Array<{
    id: string;
    partType: string;
    gridPos: { x: number; y: number; z: number };
    width: number;
    depth: number;
    height?: number;
    rotationY?: number;
  }> = [],
  timeStr: string = '12:00 PM'
): {
  needed: boolean;
  reason: string;
  generated?: ReturnType<typeof generateEntity3DAssetFromPrompt>;
} {
  // 1. Check if every toon has their own bed
  const beds = smartObjects.filter((o) =>
    /\b(bed|daybed|bunk|mattress)\b/i.test(`${o.id} ${o.name}`)
  );
  if (beds.length < characters.length) {
    const unassignedToon =
      characters.find((c) => !beds.some((b) => b.assignedToonId === c.id)) || characters[0];
    const prompt = `${unassignedToon ? unassignedToon.name.split(' ')[0] : 'Resident'} Royal Four-Poster Canopy Bed in Bedroom`;
    return {
      needed: true,
      reason: `Household has ${characters.length} toons but only ${beds.length} beds; The Entity forged a personal 3D Canopy Bed.`,
      generated: generateEntity3DAssetFromPrompt(
        prompt,
        'Bedroom',
        smartObjects,
        customParts,
        characters,
        timeStr
      ),
    };
  }

  // 2. Check if any toon has low motives and the house hasn't received an Entity 3D centerpiece yet
  const existingEntityAssets = smartObjects.filter((o) => Boolean(o.procedural3DSpec));
  if (existingEntityAssets.length < 3) {
    const tiredToon = characters.find((c) => c.motives.energy < 45);
    const hungryToon = characters.find((c) => c.motives.hunger < 45);
    const boredOrStressedToon = characters.find((c) => c.motives.fun < 55 || c.motives.sanity < 65);

    if (hungryToon && !existingEntityAssets.some((a) => a.room === 'Kitchen')) {
      return {
        needed: true,
        reason: `${hungryToon.name} craved nourishment; The Entity materialized an Artisan Banquet & Espresso Table in the Kitchen.`,
        generated: generateEntity3DAssetFromPrompt(
          'Artisan Banquet & Espresso Table in Kitchen',
          'Kitchen',
          smartObjects,
          customParts,
          characters,
          timeStr
        ),
      };
    }

    if (boredOrStressedToon && !existingEntityAssets.some((a) => a.room === 'Study')) {
      return {
        needed: true,
        reason: `${boredOrStressedToon.name} sought intellectual spark; The Entity forged a Crystal Alchemy Table in the Study.`,
        generated: generateEntity3DAssetFromPrompt(
          'Crystal Alchemy Table in Study',
          'Study',
          smartObjects,
          customParts,
          characters,
          timeStr
        ),
      };
    }

    if (tiredToon && !existingEntityAssets.some((a) => a.room === 'Bathroom')) {
      return {
        needed: true,
        reason: `${tiredToon.name} needed restorative calm; The Entity sculpted a Clawfoot Porcelain Spa Tub in the Bathroom.`,
        generated: generateEntity3DAssetFromPrompt(
          'Clawfoot Porcelain Spa Tub in Bathroom',
          'Bathroom',
          smartObjects,
          customParts,
          characters,
          timeStr
        ),
      };
    }
  }

  return { needed: false, reason: 'All core architectural and motive 3D assets are satisfied.' };
}



