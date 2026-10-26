/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Character,
  SmartObject,
  ToonKnowledgebase,
  LifeExperienceTrackerState,
  ingestNewspaperAndBookKnowledge,
  evaluateKnowledgeDrivenDecisionBonus,
  evaluateDailyAspirationDecisionBonus,
  evaluateUrgentBasicNeedInterrupt,
  getPersonalBedForToon,
  getCharacterTiredAwakenessStatus,
  createInitialSkillTree,
  inferSkillDomainFromObject,
} from './simulation';
import { COMPLETE_FURNISHINGS_CATALOG } from './furnishingsCatalog';
import { validateHouseRoomsCompliance } from './worldBuilder';

export interface HouseEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'breakdown' | 'inspiration' | 'visitor' | 'weather' | 'windfall' | 'mystery';
  targetCharId?: string;
  affectedObjectId?: string;
}

export interface BuildActionResult {
  type: 'EXPAND_FLOOR' | 'BUILD_UPSTAIRS' | 'BUILD_BASEMENT' | 'AUTO_BUY' | 'EVENT_TRIGGERED' | 'NONE';
  builtStory?: 'UPSTAIRS' | 'BASEMENT';
  spawnedStoryObjects?: SmartObject[];
  description?: string;
  purchasedObject?: SmartObject;
  event?: HouseEvent;
}

export const UPSTAIRS_BUILD_COST = 2400;
export const BASEMENT_BUILD_COST = 2200;

/**
 * Returns the starter SmartObject furnishings that materialize when a toon or player
 * constructs the Upstairs Second-Floor Loft (`UPSTAIRS`) or Subterranean Basement (`BASEMENT`).
 */
export function getStarterObjectsForStory(
  story: 'UPSTAIRS' | 'BASEMENT',
  currentObjects: SmartObject[] = []
): SmartObject[] {
  const existingIds = new Set(currentObjects.map((o) => o.id));
  const targetRoom = story === 'UPSTAIRS' ? 'SecondFloor' : 'Basement';
  return COMPLETE_FURNISHINGS_CATALOG.filter(
    (item) =>
      item.room === targetRoom &&
      item.maturity === 'ALL' &&
      !existingIds.has(item.id)
  ).map((item) => ({
    id: item.id,
    name: item.name,
    room: item.room,
    category: item.category,
    gridPos: { ...item.gridPos },
    state: item.state,
    maturity: item.maturity,
    effects: { ...item.effects },
    actionLabel: item.actionLabel,
    durationSeconds: Math.max(3600, item.durationSeconds),
  }));
}

/**
 * Pure helper that executes a Toon building an Upstairs Second-Floor Loft or Subterranean Basement.
 * Moves the builder toon onto the newly constructed story, spawns starter furnishings for that floor,
 * and sets a 2-hour construction/inspection task.
 */
export function executeToonBuildStory(
  char: Character,
  story: 'UPSTAIRS' | 'BASEMENT',
  currentObjects: SmartObject[],
  funds: number
): {
  story: 'UPSTAIRS' | 'BASEMENT';
  updatedChar: Character;
  spawnedObjects: SmartObject[];
  newFunds: number;
  logMessage: string;
} {
  const cost = story === 'UPSTAIRS' ? UPSTAIRS_BUILD_COST : BASEMENT_BUILD_COST;
  const newFunds = Math.max(0, funds - cost);
  const spawnedObjects = getStarterObjectsForStory(story, currentObjects);
  const firstObj =
    spawnedObjects[0] ||
    currentObjects.find((o) => o.room === (story === 'UPSTAIRS' ? 'SecondFloor' : 'Basement'));

  const targetPos =
    story === 'UPSTAIRS'
      ? firstObj
        ? { x: firstObj.gridPos.x, y: 2.95, z: firstObj.gridPos.z + 1.2 }
        : { x: -4.5, y: 2.95, z: -2.0 }
      : firstObj
      ? { x: firstObj.gridPos.x, y: -3.2, z: firstObj.gridPos.z + 1.2 }
      : { x: -5.0, y: -3.2, z: 1.5 };

  const actionLabel =
    story === 'UPSTAIRS'
      ? 'Constructing & Framing Upstairs Second-Floor Loft'
      : 'Excavating & Framing Subterranean Basement';

  const selfTalk =
    story === 'UPSTAIRS'
      ? 'Framing the upstairs timber loft and staircase—having a second story changes the whole view!'
      : 'Excavating the subterranean basement rec room and cellar beneath the main foundations!';

  const logMessage =
    story === 'UPSTAIRS'
      ? `${char.name} constructed the Upstairs Second-Floor Loft (Y = +2.95m) with staircase and ${spawnedObjects.length} upper-level furnishings!`
      : `${char.name} excavated and built the Subterranean Basement Level (Y = -3.2m) with descending stairs and ${spawnedObjects.length} basement furnishings!`;

  const updatedChar: Character = {
    ...char,
    onGrid: true,
    isAtWork: false,
    room: story === 'UPSTAIRS' ? 'SecondFloor' : 'Basement',
    activeObjectId: firstObj?.id,
    pos: targetPos,
    lookAtPos: firstObj
      ? { ...firstObj.gridPos }
      : { x: 0, y: targetPos.y, z: 0 },
    currentAction: actionLabel,
    actionTimer: 7200, // 2 hours real-life construction & inspection flow
    selfTalk,
    privateMemory: [...char.privateMemory.slice(-20), `[ARCHITECTURE] ${logMessage}`],
  };

  return {
    story,
    updatedChar,
    spawnedObjects,
    newFunds,
    logMessage,
  };
}

/**
 * 15-Minute Real-World Cooldown Registry (900,000 ms)
 * Guarantees a toon NEVER repeats the same line within 15 minutes of real-world time.
 */
export const UTTERANCE_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes in real-world milliseconds
const characterUtteranceHistory = new Map<string, number>();
const globalRecentUtterances = new Map<string, number>();

export function canSayLineNow(charId: string, line: string, nowMs: number = Date.now()): boolean {
  const norm = line.trim().toLowerCase();
  const charKey = `${charId}::${norm}`;
  const lastCharSpoken = characterUtteranceHistory.get(charKey);
  if (lastCharSpoken !== undefined && nowMs - lastCharSpoken < UTTERANCE_COOLDOWN_MS) {
    return false;
  }
  // Also prevent another toon from repeating the exact same line within 5 minutes
  const lastGlobalSpoken = globalRecentUtterances.get(norm);
  if (lastGlobalSpoken !== undefined && nowMs - lastGlobalSpoken < 5 * 60 * 1000) {
    return false;
  }
  return true;
}

export function recordSpokenLine(charId: string, line: string, nowMs: number = Date.now()): void {
  const norm = line.trim().toLowerCase();
  characterUtteranceHistory.set(`${charId}::${norm}`, nowMs);
  globalRecentUtterances.set(norm, nowMs);
}

export function clearUtteranceHistoryForTests(): void {
  characterUtteranceHistory.clear();
  globalRecentUtterances.clear();
}

/**
 * Deep pool of TV programs and Books that expand a toon's conversational repertoire (`learnedTopics`)
 */
export const TV_PROGRAMS_POOL = [
  {
    show: 'Architectural Marvels: Timber & Glass',
    topic: 'Did you catch that episode of Architectural Marvels? They cantilevered an entire second-story loft over a courtyard!',
    thought: 'Watching Architectural Marvels on TV—those cantilevered timber beams are giving me serious renovation ideas.',
  },
  {
    show: 'Midnight Culinary Showdown',
    topic: 'I saw a chef on Midnight Culinary Showdown glaze roasted carrots with espresso reduction—we have to try that in the kitchen!',
    thought: 'This chef on Midnight Culinary Showdown is pulling off a five-course meal in twenty minutes flat.',
  },
  {
    show: 'Quantum Horizons Science Special',
    topic: 'I watched Quantum Horizons earlier; apparently time dilation is measurable even between ground level and a second-floor loft!',
    thought: 'Quantum Horizons is fascinating—the way light refracts through atmospheric rain particles is pure physics.',
  },
  {
    show: 'Vintage Sitcom: The Suburbanites',
    topic: 'That classic episode of The Suburbanites where the neighbors argued over a lawn flamingo still makes me laugh.',
    thought: 'Nothing beats unwinding with a classic episode of The Suburbanites on the living room console.',
  },
  {
    show: 'Acoustic Sessions Live from Austin',
    topic: 'The acoustic guitarist on Live from Austin used an open D tuning that filled the whole room with warmth.',
    thought: 'Listening to the chord progressions on Acoustic Sessions Live—the bass resonance is spot on.',
  },
  {
    show: 'Botanical Sanctuaries of the World',
    topic: 'I learned on Botanical Sanctuaries that indoor Monstera plants actually boost creative focus by twenty percent.',
    thought: 'Botanical Sanctuaries on TV is making me want to add even more greenery around the veranda.',
  },
  {
    show: 'Great Mysteries of the 19th Century',
    topic: 'That documentary on Victorian estates showed how builders used to hide secret ledgers behind wainscoting panels.',
    thought: 'Watching Great Mysteries—every old house has a story tucked beneath its floorboards.',
  },
  {
    show: 'Indie Cinema Showcase: Golden Hour',
    topic: 'The cinematography in Golden Hour used warm tungsten lamps against twilight blue shadows—pure visual poetry.',
    thought: 'The lighting composition in this Indie Cinema film is a masterclass in mood.',
  },
];

export const BOOKS_KNOWLEDGE_POOL = [
  {
    book: 'The Poetics of Domestic Space',
    topic: 'I was reading The Poetics of Domestic Space in the study—it argues that open-concept rooms make people much more talkative.',
    thought: 'Reading The Poetics of Domestic Space... every doorway and window frames how we experience the day.',
  },
  {
    book: 'The Veranda Cipher',
    topic: 'In the mystery novel I’m reading, The Veranda Cipher, the detective solved the case by noticing fresh footprints by the flowerbed!',
    thought: 'Page 140 of The Veranda Cipher—I definitely did not see that plot twist coming.',
  },
  {
    book: 'Artisanal Roasting & Espresso Alchemy',
    topic: 'According to Artisanal Roasting & Espresso Alchemy, water temperature at 93 degrees is the secret to sweet crema.',
    thought: 'Flipping through Espresso Alchemy from the mahogany bookshelf—our morning coffee routine is about to level up.',
  },
  {
    book: 'Color Theory & Emotional Resonance',
    topic: 'I read in Color Theory today that sage green and warm oak wainscot actively calm the nervous system.',
    thought: 'Studying Color Theory & Emotional Resonance—the interplay of ultramarine and burnt sienna is timeless.',
  },
  {
    book: 'Meditations for Busy Minds',
    topic: 'A chapter in Meditations for Busy Minds reminded me that stepping outside for fresh air resets your whole perspective.',
    thought: 'Reading a quiet chapter of Meditations in the study... pacing yourself is an art form.',
  },
  {
    book: 'Chronicles of the Old Valley',
    topic: 'I read in Chronicles of the Old Valley that this entire neighborhood used to be an orchard a hundred years ago.',
    thought: 'Chronicles of the Old Valley has such vivid descriptions of the old timber homesteads.',
  },
  {
    book: 'The Craftsman’s Joinery Handbook',
    topic: 'The Joinery Handbook explains how dovetail stair treads stay solid for centuries without a single squeak.',
    thought: 'Reviewing The Craftsman’s Joinery Handbook—good carpentry is half engineering, half sculpture.',
  },
  {
    book: 'Modern Jazz Harmony & Counterpoint',
    topic: 'I just read about modal jazz voicings in the study—stacking fourths creates that unmistakable late-night lounge vibe.',
    thought: 'Reading Modern Jazz Harmony... I can practically hear those warm brass voicings in my head.',
  },
];

/**
 * Assigns a default career and salary to any character based on their traits/persona
 * so toons can leave the house for work shifts and earn money for home improvements.
 */
export function getCharacterCareerInfo(char: Character): { careerTitle: string; dailySalary: number } {
  if (char.careerTitle && char.dailySalary) {
    return { careerTitle: char.careerTitle, dailySalary: char.dailySalary };
  }
  if (char.traits.includes('Builder') || char.traits.includes('Ambitious') || char.name.includes('Elena')) {
    return { careerTitle: 'Architectural Designer', dailySalary: 560 };
  }
  if (char.traits.includes('Artistic') || char.traits.includes('Creative') || char.name.includes('Marcus')) {
    return { careerTitle: 'Studio Concept Illustrator', dailySalary: 480 };
  }
  if (char.traits.includes('Foodie') || char.traits.includes('Bookworm') || char.name.includes('Sophia')) {
    return { careerTitle: 'Culinary Columnist & Pastry Chef', dailySalary: 520 };
  }
  if (char.traits.includes('Genius') || char.traits.includes('Workaholic')) {
    return { careerTitle: 'Lead Systems Research Fellow', dailySalary: 620 };
  }
  if (char.traits.includes('Music Lover')) {
    return { careerTitle: 'Session Acoustic Producer', dailySalary: 490 };
  }
  return { careerTitle: 'Downtown Consultant', dailySalary: 460 };
}

/**
 * Enriches a character's `learnedTopics`, `knowledgebase`, `privateMemory` (including real book summaries
 * and real-world events), and `intelligenceScore` when they watch TV, read a book, or read the newspaper.
 */
export function learnFromMediaObject(
  char: Character,
  actionObject: SmartObject,
  newspaperTopics: string[] = []
): {
  updatedTopics: string[];
  mediaThought?: string;
  updatedKnowledgebase?: ToonKnowledgebase;
  updatedPrivateMemory?: string[];
  updatedIntelligenceScore?: number;
  updatedLifeExperience?: LifeExperienceTrackerState;
  updatedTraits?: string[];
} {
  const existing = char.learnedTopics ? [...char.learnedTopics] : [];
  const id = actionObject.id.toLowerCase();

  if (id.includes('tv')) {
    const unwatched = TV_PROGRAMS_POOL.filter((p) => !existing.includes(p.topic));
    const pick = (unwatched.length > 0 ? unwatched : TV_PROGRAMS_POOL)[
      Math.floor(Math.random() * (unwatched.length > 0 ? unwatched.length : TV_PROGRAMS_POOL.length))
    ];
    if (!existing.includes(pick.topic)) existing.push(pick.topic);
    if (existing.length > 12) existing.shift();
    return { updatedTopics: existing, mediaThought: pick.thought };
  }

  if (id.includes('bookshelf') || id.includes('newspaper') || id.includes('laptop')) {
    const ingested = ingestNewspaperAndBookKnowledge(char, {
      headline: newspaperTopics[0],
      topics: newspaperTopics,
    });
    const mergedTopics = [...ingested.updatedChar.learnedTopics!];
    if (id.includes('bookshelf')) {
      const unread = BOOKS_KNOWLEDGE_POOL.filter((b) => !mergedTopics.includes(b.topic));
      const pick = (unread.length > 0 ? unread : BOOKS_KNOWLEDGE_POOL)[
        Math.floor(Math.random() * (unread.length > 0 ? unread.length : BOOKS_KNOWLEDGE_POOL.length))
      ];
      if (!mergedTopics.includes(pick.topic)) mergedTopics.push(pick.topic);
    }
    return {
      updatedTopics: mergedTopics.slice(-14),
      mediaThought: `Memorized real book "${ingested.acquiredBook.title}" by ${ingested.acquiredBook.author} & world event "${ingested.acquiredEvent.headline}" (IQ ${ingested.updatedChar.intelligenceScore}).`,
      updatedKnowledgebase: ingested.updatedChar.knowledgebase,
      updatedPrivateMemory: ingested.updatedChar.privateMemory,
      updatedIntelligenceScore: ingested.updatedChar.intelligenceScore,
      updatedLifeExperience: ingested.updatedChar.lifeExperience,
      updatedTraits: ingested.updatedChar.traits,
    };
  }

  return { updatedTopics: existing };
}

/**
 * Generates a natural 2-way conversation exchange between two characters on the lot,
 * drawing from their learned media topics (Newspaper, TV, Books), career work shifts, and traits,
 * while strictly enforcing the 15-minute real-world non-repetition rule.
 */
export function generateMultiToonConversation(
  speaker: Character,
  listener: Character,
  isDarkMode: boolean,
  nowMs: number = Date.now()
): { speakerLine: string; listenerReply: string } {
  const speakerFirst = speaker.name.split(' ')[0];
  const listenerFirst = listener.name.split(' ')[0];

  const speakerCandidates: string[] = [];

  // 1. Draw from speaker's learned topics (Newspaper, TV, Books)
  if (speaker.learnedTopics && speaker.learnedTopics.length > 0) {
    speaker.learnedTopics.forEach((topic) => {
      speakerCandidates.push(`Hey ${listenerFirst}, ${topic.charAt(0).toLowerCase() + topic.slice(1)}`);
      speakerCandidates.push(`${listenerFirst}, listen to this—${topic}`);
    });
  }

  // 2. Career & Home Improvement conversation options
  const career = getCharacterCareerInfo(speaker);
  speakerCandidates.push(
    `Hey ${listenerFirst}, my shift as ${career.careerTitle} went great—we're saving up nicely for the house renovations!`,
    `${listenerFirst}, what do you think we should upgrade next in the house once the next paycheck lands?`,
    `I was just telling myself how much better the layout feels with the new wallpaper and flooring, ${listenerFirst}.`,
    `Have you had a chance to check out today's edition of The Suburban Chronicle yet, ${listenerFirst}?`,
    `${listenerFirst}, between work and keeping this place running, a good conversation in the ${speaker.room} is exactly what I needed.`,
    `I caught a great documentary on the living room TV earlier, ${listenerFirst}—it made me rethink our whole color palette.`,
    `You know ${listenerFirst}, borrowing a book from the study shelf really helped me unwind this afternoon.`,
    `Hey ${listenerFirst}, should we fire up the espresso machine or head out to the backyard patio later?`
  );

  if (isDarkMode) {
    speakerCandidates.push(
      `${listenerFirst}, keep your voice down... did you hear that metallic echo coming from beneath the floorboards?`,
      `I don't want to alarm you, ${listenerFirst}, but someone moved the study ledger while we were out.`
    );
  }

  const validSpeakerLines = speakerCandidates.filter((l) => canSayLineNow(speaker.id, l, nowMs));
  const chosenSpeakerLine =
    validSpeakerLines.length > 0
      ? validSpeakerLines[Math.floor(Math.random() * validSpeakerLines.length)]
      : `Hey ${listenerFirst}, I was just reflecting on what I read earlier today (${Math.floor((nowMs / 1000) % 999)}).`;

  recordSpokenLine(speaker.id, chosenSpeakerLine, nowMs);

  // Listener replies contextually, also drawing from their own learned topics or traits
  const replyCandidates: string[] = [];
  if (listener.learnedTopics && listener.learnedTopics.length > 0) {
    listener.learnedTopics.forEach((topic) => {
      replyCandidates.push(`That's wild, ${speakerFirst}! It reminds me of something I picked up: ${topic}`);
    });
  }

  replyCandidates.push(
    `I completely agree, ${speakerFirst}! Once we pool our work paychecks, this lot is going to look incredible.`,
    `Oh, I heard about that, ${speakerFirst}! Reading the morning paper and catching up with you always brightens the day.`,
    `Haha, classic ${speakerFirst}! Honestly, the atmosphere in the ${listener.room} has been so inspiring lately.`,
    `You always bring up the most interesting points, ${speakerFirst}. Let's definitely make time for that later today!`,
    `That makes total sense, ${speakerFirst}. Between the books in the study and the shows on TV, there's never a dull moment here.`,
    `Count me in, ${speakerFirst}! Working hard and improving our home together is really paying off.`
  );

  const validReplies = replyCandidates.filter((l) => canSayLineNow(listener.id, l, nowMs + 10));
  const chosenReply =
    validReplies.length > 0
      ? validReplies[Math.floor(Math.random() * validReplies.length)]
      : `Good point, ${speakerFirst}—I was thinking the exact same thing just now (${Math.floor((nowMs / 1000) % 999)}).`;

  recordSpokenLine(listener.id, chosenReply, nowMs + 10);

  return { speakerLine: chosenSpeakerLine, listenerReply: chosenReply };
}

/**
 * Generates rich, diverse, non-repetitive contextual self-talk with a strict
 * 15-minute real-world cooldown per line so a toon NEVER repeats themselves.
 */
export function getDiverseContextualSelfTalk(
  char: Character,
  actionObject: SmartObject,
  isDarkMode: boolean,
  nowMs: number = Date.now(),
  mediaThoughtHint?: string
): string {
  const candidates: string[] = [];

  if (mediaThoughtHint) {
    candidates.push(mediaThoughtHint);
  }

  // 1. Extreme Sanity / Dark Mode Hallucinations
  if (isDarkMode && char.motives.sanity < 35) {
    candidates.push(
      `The whispers in the floorboards... they know what happened down there.`,
      `I can feel someone staring through the wall trim right now.`,
      `Did that painting just blink at me, or am I finally cracking?`,
      `I need to lock the basement door before anyone notices the rust marks.`,
      `Tick, tick, tick... the pendulum clock sounds louder than my own heartbeat.`,
      `The walls are breathing. I swear they expand when I close my eyes.`,
      `Footsteps above me... even when nobody is on the upper floor.`,
      `Why did the shadows in the hallway shift when the lamp didn't flicker?`,
      `There is a cold draft seeping up from the subterranean stone.`
    );
  }

  // 2. Urgent Needs (Multiple varied lines per need so even urgent states never repeat)
  if (char.motives.bladder < 25) {
    candidates.push(
      `Can't focus on anything else—need to head to the bathroom right this second!`,
      `That double espresso caught up with me fast; bathroom break is top priority.`,
      `Excuse me everyone, making a beeline for the restroom before I do anything else.`,
      `Note to self: don't wait until the last minute to visit the washroom.`
    );
  }
  if (char.motives.energy < 25) {
    candidates.push(
      `My eyelids feel like lead weights... I desperately need a real rest.`,
      `Running on fumes right now; a power nap or a strong espresso is calling my name.`,
      `After a full day on my feet, that soft mattress in the bedroom looks heavenly.`,
      `One more yawn and I'm going to fall asleep standing up.`
    );
  }
  if (char.motives.hunger < 30) {
    candidates.push(
      `My stomach is growling so loudly the whole household can probably hear it.`,
      `Time to raid the refrigerator or whip up something warm on the stove.`,
      `A balanced meal in the kitchen is the only thing on my mind right now.`,
      `I can't think straight on an empty stomach—let's see what ingredients we have.`
    );
  }

  // 3. Object & Activity Specific Pool (Expanded with 8-12 options per category)
  const id = actionObject.id.toLowerCase();

  if (id.includes('newspaper')) {
    candidates.push(
      `Flipping through today's delivered issue of The Suburban Chronicle—lots to talk about with the others!`,
      `There's nothing quite like reading the morning headlines in The Suburban Chronicle over coffee.`,
      `The culture section in today's Chronicle has some great talking points for dinner conversation.`,
      `Catching up on world events in The Suburban Chronicle so I have fresh stories to share.`,
      `Today's front page in The Suburban Chronicle is genuinely eye-opening.`
    );
  } else if (id.includes('tv')) {
    TV_PROGRAMS_POOL.forEach((p) => candidates.push(p.thought));
    candidates.push(
      `Sitting back on the living room rug to watch a new broadcast—great way to pick up conversation topics.`,
      `Channel surfing on the console TV; the picture quality from across the living room is crystal clear.`
    );
  } else if (id.includes('bookshelf')) {
    BOOKS_KNOWLEDGE_POOL.forEach((b) => candidates.push(b.thought));
    candidates.push(
      `Browsing the mahogany bookshelf for a fresh chapter—every book opens a new conversation.`,
      `The quiet atmosphere of the study makes it so easy to get lost in a good book.`
    );
  } else if (id.includes('stove') || id.includes('fridge') || id.includes('island') || id.includes('dining')) {
    candidates.push(
      `A pinch of smoked paprika and fresh basil transforms any basic recipe.`,
      `There is something deeply grounding about the aroma of homemade food in the kitchen.`,
      `I really should host a proper weekend dinner once our kitchen is fully outfitted.`,
      `Comfort food always sets the right tone for the rest of the day.`,
      `Prepping fresh ingredients—cooking is easily the most delicious art form.`,
      `Searing at high heat locks in all the flavor; this meal is turning out great.`,
      `Grabbing a well-deserved bite at the kitchen counter before my next project.`,
      `The checkered kitchen tile really gives this room a classic bistro energy.`
    );
  } else if (id.includes('espresso')) {
    candidates.push(
      `Listening to the espresso machine hiss—that rich crema aroma fills the whole kitchen.`,
      `A freshly pulled double shot of espresso is pure liquid motivation.`,
      `Dialing in the burr grinder for the morning roast; barista skills paying off!`,
      `Nothing kickstarts an ambitious afternoon quite like a warm café crema.`
    );
  } else if (id.includes('easel')) {
    candidates.push(
      `The contrast between warm ochre and cool cobalt creates genuine depth on the canvas.`,
      `Every brushstroke feels like taking a deep, restorative breath.`,
      `This new painting captures the exact light streaming through the study window.`,
      `Art isn't about rigid perfection; it's about evoking genuine emotion.`,
      `Layering impasto highlights with a palette knife gives the landscape real texture.`,
      `Once this canvas dries, it might even fetch a nice sum from a local collector.`
    );
  } else if (id.includes('guitar') || id.includes('stereo') || id.includes('turntable')) {
    candidates.push(
      `The acoustic resonance in this room is surprisingly warm and balanced!`,
      `Nothing cuts the day's tension quite like a rich, syncopated melody.`,
      `Practicing a new fingerstyle progression—my chord transitions are getting much cleaner.`,
      `Dropping the needle on a vintage vinyl record instantly changes the whole mood of the house.`
    );
  } else if (id.includes('pool') || id.includes('bbq')) {
    candidates.push(
      `The cool azure water feels incredible out here in the yard.`,
      `Swimming laps always clears my head better than anything else.`,
      `We really lucked out having this backyard oasis to unwind in after work.`,
      `Firing up the outdoor patio grill—the smoky aroma is drifting across the whole lawn.`,
      `Fresh air and sunshine out in the yard make all our hard work worthwhile.`
    );
  } else if (id.includes('bathtub') || id.includes('toilet') || id.includes('vanity')) {
    candidates.push(
      `A warm soak washes away all the lingering stress of the work shift.`,
      `Freshly polished porcelain and warm water make everything feel renewed.`,
      `Taking a few minutes to freshen up so I can take on the rest of the day with confidence!`,
      `Self-care in a clean, quiet bathroom is underrated.`
    );
  } else if (id.includes('arcade') || id.includes('laptop') || id.includes('clock')) {
    candidates.push(
      `One more level on the retro arcade cabinet—I am so close to beating the household high score!`,
      `Checking neighborhood listings and researching new ideas at the study desk.`,
      `The steady chime of the grandfather clock in the foyer keeps the whole house in rhythm.`,
      `Focusing on a new problem set—my logic and technical skills are sharpening every day.`
    );
  } else if (id.includes('sofa') || id.includes('armchair') || id.includes('coffee_table') || id.includes('plant')) {
    candidates.push(
      `Sinking into the plush cushions for a moment to recharge my batteries.`,
      `Flipping through a design magazine by the coffee table—so many ideas for our rooms.`,
      `Misting the tropical monstera leaves; healthy plants make the living room feel alive.`,
      `Taking a breather in the lounge and enjoying what we've built together.`
    );
  }

  // 4. Trait & Learned Topic Reflections
  if (char.learnedTopics && char.learnedTopics.length > 0) {
    char.learnedTopics.forEach((t) => {
      candidates.push(`Still thinking about what I learned earlier—${t}`);
    });
  }

  if (char.traits.includes('Builder') || char.traits.includes('Ambitious')) {
    candidates.push(
      `If we open up the interior partition, the natural light across the foyer will be stunning.`,
      `Our work shifts are building up the household fund—soon we can afford even more upgrades.`,
      `A proper craftsman respects both the grain of the wood and the flow of the floorplan.`,
      `Every room in this house is coming together piece by piece.`
    );
  }
  if (char.traits.includes('Neat')) {
    candidates.push(
      `Clean baseboards, tidy walkways, and orderly shelves bring real inner peace.`,
      `Keeping the house spotless makes coming home from work a joy.`
    );
  }
  if (char.traits.includes('Creative') || char.traits.includes('Artistic')) {
    candidates.push(
      `Inspiration is everywhere in this house if you pay attention to the color and light.`,
      `Surrounding ourselves with books, music, and art makes every conversation richer.`
    );
  }

  // Fallback general pool
  candidates.push(
    `Enjoying the steady, comfortable rhythm of life in the ${char.room}.`,
    `Each day in this house brings a new project or a great conversation.`,
    `Feeling grateful for a cozy roof over our heads and good company.`,
    `Wonder what my housemates are up to right now—maybe I'll go chat with them next.`
  );

  // Filter strictly by the 15-minute real-world cooldown
  const available = candidates.filter((line) => canSayLineNow(char.id, line, nowMs));
  const chosen =
    available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : `${candidates[0]} (${new Date(nowMs).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })})`;

  recordSpokenLine(char.id, chosen, nowMs);
  return chosen;
}

/**
 * Hard-Coded Variety & Anti-Looping Autonomous Object Selector:
 * Ensures a toon NEVER repeats the same task over and over by excluding their
 * recentObjectIds history and balancing physiological needs, media learning
 * (Newspaper, TV, Books), and skill/passion variety.
 */
export function selectVariedAutonomousObject(
  char: Character,
  availableObjects: SmartObject[],
  weatherCondition: string = 'CLEAR'
): SmartObject | null {
  if (availableObjects.length === 0) return null;

  const recent = new Set((char.recentObjectIds || []).slice(-4));
  const lastId = char.recentObjectIds?.[char.recentObjectIds.length - 1];

  // Filter out outdoor objects during rain or storm
  const weatherSafe =
    weatherCondition === 'RAIN' || weatherCondition === 'STORM'
      ? availableObjects.filter((o) => o.room !== 'Yard')
      : availableObjects;

  const pool = weatherSafe.length > 0 ? weatherSafe : availableObjects;

  // 1. Critical 1-10 Basic Needs Autonomous Interrupt (hungry <= 3, hygiene <= 3, sleep <= 3, bathroom <= 3)
  const urgentEval = evaluateUrgentBasicNeedInterrupt(char, pool);
  if (urgentEval.urgentNeed && urgentEval.targetObject) {
    // If urgent need is sleep, always prefer the toon's dedicated 1-to-1 personal bed first
    if (urgentEval.urgentNeed === 'sleep') {
      const ownBed = getPersonalBedForToon(char, pool);
      if (ownBed) return ownBed;
    }
    return urgentEval.targetObject;
  }

  // 1B. Tired / Awakeness Personal Bed Check: when drowsy/tired (awakeness <= 4.2 or energy < 32), prefer own personal bed
  const tiredStatus = getCharacterTiredAwakenessStatus(char, pool);
  if (tiredStatus.awakeness1To10 <= 4.2 || char.motives.energy < 32) {
    const ownBed = getPersonalBedForToon(char, pool);
    if (ownBed && ownBed.id !== lastId) {
      return ownBed;
    }
  }

  // Fallback check on 0-100 motives if basicNeeds was not explicitly set
  if (char.motives.bladder < 25) {
    const toilet = pool.find((o) => o.id.includes('toilet'));
    if (toilet) return toilet;
  }
  if (char.motives.energy < 24) {
    const ownBed = getPersonalBedForToon(char, pool);
    if (ownBed && ownBed.id !== lastId) return ownBed;
    const sleepOrCoffee = pool.filter(
      (o) =>
        (o.id.includes('bed') || o.id.includes('espresso') || o.id.includes('sofa')) &&
        (!o.assignedToonId || o.assignedToonId === char.id) &&
        o.id !== lastId
    );
    if (sleepOrCoffee.length > 0) return sleepOrCoffee[Math.floor(Math.random() * sleepOrCoffee.length)];
  }
  if (char.motives.hunger < 30) {
    const foodObjs = pool.filter(
      (o) =>
        (o.id.includes('fridge') || o.id.includes('stove') || o.id.includes('dining') || o.id.includes('bbq')) &&
        o.id !== lastId
    );
    if (foodObjs.length > 0) return foodObjs[Math.floor(Math.random() * foodObjs.length)];
  }
  if (char.motives.hygiene < 26) {
    const bathObjs = pool.filter((o) => (o.id.includes('bathtub') || o.id.includes('vanity') || o.id.includes('sink')) && o.id !== lastId);
    if (bathObjs.length > 0) return bathObjs[Math.floor(Math.random() * bathObjs.length)];
  }

  // 2. Hard-Coded Anti-Looping Filter: Exclude all objects in the last 4 actions (`recent`) and other toons' personal beds
  let freshCandidates = pool.filter(
    (o) =>
      !recent.has(o.id) &&
      !o.id.includes('toilet') &&
      (!o.assignedToonId || o.assignedToonId === char.id)
  );
  if (freshCandidates.length === 0) {
    freshCandidates = pool.filter(
      (o) =>
        o.id !== lastId &&
        !o.id.includes('toilet') &&
        (!o.assignedToonId || o.assignedToonId === char.id)
    );
  }
  if (freshCandidates.length === 0) {
    freshCandidates = pool;
  }

  const skillTree = createInitialSkillTree(char);

  // 3. Score candidates using Knowledgebase Intelligence, Personal Bed Ownership, Skill Mastery Trees & Daily Aspirations
  const scored = freshCandidates.map((obj) => {
    let score = 10 + Math.random() * 8;
    const id = obj.id.toLowerCase();

    // Respect 1-to-1 Personal Bed Ownership
    if (obj.assignedToonId) {
      if (obj.assignedToonId === char.id) {
        if (tiredStatus.awakeness1To10 <= 6.2) {
          score += 22;
        }
      } else {
        score -= 40;
      }
    }

    // Boost Newspaper, TV, Bookshelf & Laptop so toons continuously acquire real-world events & book summaries into their knowledgebase
    if (id.includes('newspaper') || id.includes('tv') || id.includes('bookshelf') || id.includes('laptop')) {
      score += 12;
    }

    // Apply Knowledgebase & Intelligence Decision-Making Bonus (from Real Book Summaries & World Event Insights)
    const kbEval = evaluateKnowledgeDrivenDecisionBonus(char, obj, char.motives);
    score += kbEval.bonusScore;

    // Apply Daily Aspiration Autonomous Goal Priority Bonus so toons actively attempt their daily life goals
    const aspEval = evaluateDailyAspirationDecisionBonus(char, obj);
    score += aspEval.bonusScore;

    // Apply 1-10 Skill Mastery Tree & Masterwork Royalty Synergy Bonus
    const skillDomain = inferSkillDomainFromObject(obj);
    const skillEntry = skillTree[skillDomain];
    if (skillEntry) {
      if (skillEntry.level1To10 >= 3.0) {
        score += 6; // Capable of earning Masterwork Royalties for the household
      } else if (skillEntry.level1To10 < 2.5) {
        score += 4; // Round out underdeveloped skills
      }
    }

    // Boost objects in a different room than current room to encourage natural movement around the house
    if (obj.room !== char.room) {
      score += 5;
    }

    // Trait synergies
    if ((char.traits.includes('Bookworm') || char.traits.includes('Genius')) && (id.includes('bookshelf') || id.includes('newspaper') || id.includes('laptop'))) {
      score += 8;
    }
    if ((char.traits.includes('Creative') || char.traits.includes('Artistic')) && (id.includes('easel') || id.includes('plant') || id.includes('guitar'))) {
      score += 8;
    }
    if (char.traits.includes('Foodie') && (id.includes('espresso') || id.includes('stove') || id.includes('bbq') || id.includes('dining'))) {
      score += 8;
    }

    return { obj, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].obj;
}

/**
 * Autonomous Builder Agent Logic:
 * Checks if a character with the Builder/Ambitious trait OR elevated Knowledgebase Intelligence
 * (from reading architectural/scientific books and processing world events) has accumulated
 * sufficient savings and desire to either:
 * 1. Expand the home with a second-floor loft or subterranean basement
 * 2. Auto-purchase new furnishings from the catalog matching their personality & knowledgebase
 */
export function evaluateBuilderAutonomousActions(
  char: Character,
  currentObjects: SmartObject[],
  currentExpansionLevel: number,
  _timeStr: string,
  funds: number,
  multiStoryState?: boolean | { hasUpstairs: boolean; hasBasement: boolean }
): { action: BuildActionResult; newFunds: number } {
  const charIq = char.knowledgebase?.intelligenceScore ?? char.intelligenceScore ?? 100;
  const hasArchitecturalBookKnowledge = (char.knowledgebase?.booksRead || []).some(
    (b) => b.domain === 'ARCHITECTURE' || b.domain === 'SCIENCE'
  );
  const isBuilder =
    char.traits.includes('Builder') ||
    char.traits.includes('Ambitious') ||
    char.traits.includes('Creative') ||
    char.traits.includes('Genius') ||
    charIq >= 115 ||
    hasArchitecturalBookKnowledge;

  const hasUpstairs =
    typeof multiStoryState === 'object' && multiStoryState !== null
      ? multiStoryState.hasUpstairs
      : currentExpansionLevel >= 2;
  const hasBasement =
    typeof multiStoryState === 'boolean'
      ? multiStoryState
      : typeof multiStoryState === 'object' && multiStoryState !== null
      ? multiStoryState.hasBasement
      : currentExpansionLevel >= 3;

  // 1. Toons can autonomously build an Upstairs Loft OR a Subterranean Basement when funds allow
  const shouldBuildStory = funds >= 3500 || Math.random() < 0.22;
  if (isBuilder && (!hasUpstairs || !hasBasement) && funds >= BASEMENT_BUILD_COST && shouldBuildStory) {
    // Choose which unbuilt story to construct
    const canBuildUpstairs = !hasUpstairs && funds >= UPSTAIRS_BUILD_COST;
    const canBuildBasement = !hasBasement && funds >= BASEMENT_BUILD_COST;

    let storyToBuild: 'UPSTAIRS' | 'BASEMENT' | null = null;
    if (canBuildUpstairs && canBuildBasement) {
      storyToBuild = char.traits.includes('Builder') ? 'UPSTAIRS' : 'BASEMENT';
    } else if (canBuildUpstairs) {
      storyToBuild = 'UPSTAIRS';
    } else if (canBuildBasement) {
      storyToBuild = 'BASEMENT';
    }

    if (storyToBuild === 'UPSTAIRS') {
      const spawned = getStarterObjectsForStory('UPSTAIRS', currentObjects);
      return {
        action: {
          type: 'EXPAND_FLOOR',
          builtStory: 'UPSTAIRS',
          spawnedStoryObjects: spawned,
          description: `${char.name} drew up architectural blueprints and invested §${UPSTAIRS_BUILD_COST} to build an Upstairs Second-Floor Loft!`,
        },
        newFunds: funds - UPSTAIRS_BUILD_COST,
      };
    }

    if (storyToBuild === 'BASEMENT') {
      const spawned = getStarterObjectsForStory('BASEMENT', currentObjects);
      return {
        action: {
          type: 'EXPAND_FLOOR',
          builtStory: 'BASEMENT',
          spawnedStoryObjects: spawned,
          description: `${char.name} excavated the foundations and invested §${BASEMENT_BUILD_COST} to build a Subterranean Basement Level!`,
        },
        newFunds: funds - BASEMENT_BUILD_COST,
      };
    }
  }

  const safeObjects = Array.isArray(currentObjects) ? currentObjects : [];

  if (funds >= 800 && Math.random() < 0.22) {
    const existingIds = new Set(safeObjects.map((o) => o.id));
    const availableToBuy = COMPLETE_FURNISHINGS_CATALOG.filter((item) => {
      if (existingIds.has(item.id) || item.cost > funds) return false;
      if (item.room === 'SecondFloor' && !hasUpstairs) return false;
      if (item.room === 'Basement' && !hasBasement) return false;
      return true;
    });

    if (availableToBuy.length > 0) {
      let chosen = availableToBuy[0];

      // First check if any room in the house is missing a standard required fixture (e.g. supper_table, sink, stove, fridge, bathtub, toilet, bed)
      const roomCompliance = validateHouseRoomsCompliance([], safeObjects, [char]);
      if (!roomCompliance.allCompliant && roomCompliance.missingRequirements.length > 0) {
        const missingText = roomCompliance.missingRequirements.join(' ').toLowerCase();
        const complianceMatch = availableToBuy.find((i) => {
          const idAndName = `${i.id} ${i.name}`.toLowerCase();
          if (missingText.includes('supper_table') && (idAndName.includes('dining') || idAndName.includes('supper') || idAndName.includes('table'))) return true;
          if (missingText.includes('sink') && (idAndName.includes('sink') || idAndName.includes('vanity'))) return true;
          if (missingText.includes('stove') && idAndName.includes('stove')) return true;
          if (missingText.includes('fridge') && idAndName.includes('fridge')) return true;
          if (missingText.includes('bathtub') && idAndName.includes('bathtub')) return true;
          if (missingText.includes('toilet') && idAndName.includes('toilet')) return true;
          if (missingText.includes('bed') && idAndName.includes('bed')) return true;
          return false;
        });
        if (complianceMatch) {
          chosen = complianceMatch;
        }
      } else if (char.traits.includes('Creative') || char.traits.includes('Artistic')) {
        chosen = availableToBuy.find((i) => i.id.includes('guitar') || i.id.includes('easel') || i.id.includes('jukebox')) || chosen;
      } else if (char.traits.includes('Foodie')) {
        chosen = availableToBuy.find((i) => i.id.includes('espresso') || i.id.includes('bbq') || i.id.includes('island')) || chosen;
      } else if (char.traits.includes('Builder') || char.traits.includes('Ambitious')) {
        chosen = availableToBuy.find((i) => i.id.includes('workbench') || i.id.includes('telescope') || i.id.includes('billiards')) || chosen;
      } else if (char.traits.includes('Bookworm') || char.traits.includes('Genius')) {
        chosen = availableToBuy.find((i) => i.id.includes('chess') || i.id.includes('bookshelf') || i.id.includes('billiards')) || chosen;
      }

      return {
        action: {
          type: 'AUTO_BUY',
          description: `${char.name} used their work savings to purchase the '${chosen.name}' for §${chosen.cost}!`,
          purchasedObject: chosen,
        },
        newFunds: funds - chosen.cost,
      };
    }
  }

  return { action: { type: 'NONE' }, newFunds: funds };
}

export function rollSpontaneousHouseEvent(
  timeStr: string,
  _characters: Character[],
  isDarkMode: boolean
): HouseEvent | null {
  if (Math.random() > 0.05) return null;

  const eventPool: Omit<HouseEvent, 'id' | 'timestamp'>[] = [
    {
      title: 'Sudden Plumbing Leak',
      description: 'The bathroom pipe began spraying water! Toons with Handiness can inspect and repair it for skill gains.',
      type: 'breakdown',
      affectedObjectId: 'obj_bathtub',
    },
    {
      title: 'Creative Epiphany Surge',
      description: 'Golden light illuminated the studio! Inspires any artist on the lot with doubled painting flow.',
      type: 'inspiration',
    },
    {
      title: 'Friendly Neighbor with Pastries',
      description: 'A cheerful neighbor rang the front doorbell delivering warm pastries, raising household Social!',
      type: 'visitor',
    },
    {
      title: 'Unexpected Career Bonus',
      description: 'A glowing performance evaluation arrived in the mailbox with an unexpected §650 bonus!',
      type: 'windfall',
    },
    {
      title: 'Passing Seasonal Squall',
      description: 'A brisk breeze swept across the veranda, making the warm interior rooms feel extra cozy.',
      type: 'weather',
    },
  ];

  if (isDarkMode) {
    eventPool.push({
      title: 'Unexplained Subterranean Clatter',
      description: 'A heavy metal chain echoed from the reinforced basement foundations... testing everyone’s Sanity.',
      type: 'mystery',
    });
  }

  const chosen = eventPool[Math.floor(Math.random() * eventPool.length)];
  return {
    ...chosen,
    id: `event_${Date.now()}`,
    timestamp: timeStr,
  };
}
