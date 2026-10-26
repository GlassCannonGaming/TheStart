/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Motives {
  hunger: number;
  energy: number;
  bladder: number;
  hygiene: number;
  social: number;
  fun: number;
  sanity: number;
}

export type MaturityRating = 'FAMILY_FRIENDLY' | 'DARK_MODE';

export interface Procedural3DSubMesh {
  shape: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus' | 'capsule';
  pos: [number, number, number];
  size: [number, number, number];
  rot?: [number, number, number];
  colorHex: string;
  roughness?: number;
  metalness?: number;
  emissiveHex?: string;
  emissiveIntensity?: number;
}

export interface Procedural3DAssetSpec {
  assetArchetype: string;
  promptOrigin: string;
  width: number;
  depth: number;
  height: number;
  subMeshes: Procedural3DSubMesh[];
  pointLightColorHex?: string;
  generatedByEntityAt?: string;
}

export interface SmartObject {
  id: string;
  name: string;
  room: string;
  category: 'kitchen' | 'living' | 'bedroom' | 'bathroom' | 'study' | 'outdoor' | 'basement';
  gridPos: { x: number; y: number; z: number };
  state: 'Clean' | 'Dirty' | 'Broken' | 'InUse' | 'Bloodstained';
  maturity: 'ALL' | 'DARK_ONLY';
  effects: Partial<Motives>;
  actionLabel: string;
  durationSeconds: number;
  assignedToonId?: string;
  assignedToonName?: string;
  assignedColorHex?: string;
  procedural3DSpec?: Procedural3DAssetSpec;
}

export interface BoneScale {
  height: number;
  shoulderWidth: number;
  chestDepth: number;
}

export interface ScheduledInteraction {
  id: string;
  objectId: string;
  objectName: string;
  room: string;
  actionLabel: string;
  durationSeconds: number;
  reason: string;
  source: 'AUTONOMOUS' | 'PLAYER_QUEUED';
}

export interface AcquiredPersonalityQuirk {
  id: string;
  traitName: string;
  polarity: 'GOOD' | 'BAD';
  originEventTitle: string;
  assignedTaskLabel: string;
  timestamp: string;
}

export interface DeceasedToonMemorial {
  id: string;
  name: string;
  ageStageAtDeath: 'Young Adult' | 'Adult' | 'Elder';
  daysLived: number;
  causeOfDeath: string;
  epitaph: string;
  traitsAtDeath: string[];
  timestamp: string;
  successorName: string;
}

export interface RealBookSummary {
  id: string;
  title: string;
  author: string;
  domain: 'ARCHITECTURE' | 'CULINARY' | 'PSYCHOLOGY' | 'PHILOSOPHY' | 'SCIENCE' | 'LITERATURE';
  summary: string;
  decisionHeuristic: string;
  preferredObjectKeywords: string[];
  iqBoost: number;
  acquiredAt?: string;
}

export interface WorldEventStoryEntry {
  id: string;
  headline: string;
  storySummary: string;
  category: 'WORLD_EVENT' | 'REAL_STORY' | 'SCIENCE_TECH';
  decisionInsight: string;
  preferredObjectKeywords: string[];
  iqBoost: number;
  acquiredAt: string;
}

export interface ToonKnowledgebase {
  intelligenceScore: number;
  decisionTier: 'Novice Thinker' | 'Adaptive Reasoner' | 'Strategic Polymath' | 'Autonomous Savant';
  booksRead: RealBookSummary[];
  worldEvents: WorldEventStoryEntry[];
  synthesizedHeuristics: string[];
  totalDataPointsProcessed: number;
}

export type ExperienceDomain =
  | 'CULINARY'
  | 'INTELLECTUAL'
  | 'CREATIVE'
  | 'ARCHITECTURAL'
  | 'DOMESTIC'
  | 'SOCIAL'
  | 'SUBTERRANEAN';

export interface LifeExperienceDomainRecord {
  domain: ExperienceDomain;
  label: string;
  activityCount: number;
  worldEventCount: number;
  totalHoursSpent: number;
  experiencePoints: number;
  nextShiftThreshold: number;
  evolutionTier: number;
  emergentTrait: string;
  opposingTrait?: string;
  lastActivityLabel: string;
}

export interface PersonalityTraitShiftRecord {
  id: string;
  domain: ExperienceDomain;
  addedTrait: string;
  replacedTrait?: string;
  triggerSource: 'AUTONOMOUS_ACTIVITY' | 'WORLD_EVENT' | 'HOUSE_EVENT' | 'MULTI_STORY_BUILD';
  reason: string;
  timestamp: string;
}

export type PersonalityAxisKey =
  | 'creative'
  | 'ambitious'
  | 'neat'
  | 'intellectual'
  | 'social'
  | 'culinary'
  | 'lazy';

export interface PersonalityTraitSnapshot {
  id: string;
  label: string;
  timestamp: string;
  gameDay: number;
  traits: string[];
  traitScores: Record<PersonalityAxisKey, number>;
  dominantAxis: PersonalityAxisKey;
}

export interface LifeExperienceTrackerState {
  totalActivitiesCompleted: number;
  totalWorldEventsExperienced: number;
  dominantDomain: ExperienceDomain;
  domains: Record<ExperienceDomain, LifeExperienceDomainRecord>;
  traitShiftHistory: PersonalityTraitShiftRecord[];
  evolvedTraits: string[];
  personalitySnapshots?: PersonalityTraitSnapshot[];
}

export interface TemporaryMotiveBoost {
  id: string;
  aspirationTitle: string;
  motiveBonuses: Partial<Motives>;
  decayReductionMultiplier: number;
  remainingGameSeconds: number;
  totalDurationSeconds: number;
  grantedAtTimeStr: string;
}

export interface DailyAspiration {
  id: string;
  templateId: string;
  title: string;
  description: string;
  domain: ExperienceDomain;
  assignedDay: number;
  targetObjectKeywords: string[];
  preferredObjectId?: string;
  targetCount: number;
  currentProgress: number;
  completed: boolean;
  completedAtTimeStr?: string;
  motiveBoostReward: Partial<Motives>;
  boostDurationSeconds: number;
}

export interface DailyAspirationsState {
  currentDay: number;
  aspirations: DailyAspiration[];
  activeMotiveBoosts: TemporaryMotiveBoost[];
  totalCompletedAllTime: number;
}

export type BasicNeedKey = 'hungry' | 'hygiene' | 'sleep' | 'bathroom';

/**
 * 1-10 Basic Needs Requirements:
 * - hungry (1.0 - 10.0): Slowly depletes; increased by cooking/eating at Stove, Fridge, Dining Table, or BBQ.
 * - hygiene (1.0 - 10.0): Slowly depletes; increased by bathing/washing at Bathtub, Shower, Sink, or Vanity.
 * - sleep (1.0 - 10.0): Slowly depletes; increased by sleeping in Bed, napping on Sofa, or drinking Espresso.
 * - bathroom (1.0 - 10.0): Slowly depletes; increased by using the Toilet.
 */
export interface BasicNeeds1To10 {
  hungry: number;
  hygiene: number;
  sleep: number;
  bathroom: number;
}

export interface NeedActionRequirement {
  needKey: BasicNeedKey;
  label: string;
  actionButtonLabel: string;
  depletionPerHour: number;
  criticalThreshold: number;
  requiredActionDescription: string;
  requiredObjectKeywords: string[];
  replenishAmount1To10: number;
}

/**
 * Option 2: Dynamic Relationship & Social Affinity Matrix (1-10 Affinity Scale) + Social Web & Family Reproduction
 */
export interface ToonRelationshipEntry {
  targetCharId: string;
  targetName: string;
  affinity1To10: number;
  status:
    | 'Stranger'
    | 'Acquaintance'
    | 'Friend'
    | 'Trusted Friend'
    | 'Best Friend'
    | 'Creative Collaborator'
    | 'Household Rival'
    | 'Romantic Partner'
    | 'Soulmate'
    | 'Family Bond';
  sharedConversationsCount: number;
  lastInteractionSummary: string;
  compatibilityBonus: number;
  isRelated?: boolean;
  canHaveBaby?: boolean;
  romanceScore1To10?: number;
  familyRelation?: string;
  sharedMemories?: string[];
  interactionCount?: number;
}

export interface SocialWebNode {
  id: string;
  name: string;
  firstName: string;
  color: string;
  genderFrame: 'Masculine' | 'Feminine' | 'Unisex';
  ageStage: 'Young Adult' | 'Adult' | 'Elder';
  isSelected: boolean;
  isBabyOrChild: boolean;
  x: number;
  y: number;
}

export interface SocialWebEdge {
  id: string;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  affinity1To10: number;
  status: ToonRelationshipEntry['status'];
  strokeWidth: number;
  strokeColor: string;
  isDashed: boolean;
  isRelated: boolean;
  canHaveBaby: boolean;
  involvesSelected: boolean;
}

/**
 * Option 3: Progressive 1-10 Skill Mastery Trees & Masterwork Royalties
 */
export type SkillDomainKey =
  | 'cooking'
  | 'painting'
  | 'handiness'
  | 'logic'
  | 'music'
  | 'charisma';

export interface ToonSkillEntry {
  key: SkillDomainKey;
  label: string;
  level1To10: number;
  xp: number;
  unlockedPerk: string;
  royaltyBonusSimoleons: number;
}

export type ToonSkillTreeState = Record<SkillDomainKey, ToonSkillEntry>;

/**
 * Option 4: Dynamic Moodlets & Emotional State Engine
 */
export type EmotionalState =
  | 'Inspired'
  | 'Focused'
  | 'Energized'
  | 'Content'
  | 'Uncomfortable'
  | 'Ravenous'
  | 'Exhausted'
  | 'Desperate';

export interface ActiveMoodlet {
  id: string;
  title: string;
  emotion: EmotionalState;
  polarity: 'POSITIVE' | 'NEGATIVE';
  sourceNeedOrActivity: string;
  description: string;
  remainingSeconds: number;
}

/**
 * Option 5: Autonomous Household Legacy Milestones & Estate Economy
 */
export interface HouseholdLegacyMilestone {
  id: string;
  title: string;
  description: string;
  category:
    | 'NEEDS_MASTERY'
    | 'SKILL_MASTERWORK'
    | 'SOCIAL_HARMONY'
    | 'ARCHITECTURAL_ESTATE'
    | 'ASPIRATION_STREAK';
  unlocked: boolean;
  unlockedAtTimeStr?: string;
  rewardSimoleons: number;
  passiveBuffDescription: string;
}

export interface Character {
  id: string;
  name: string;
  ageStage: 'Young Adult' | 'Adult' | 'Elder';
  traits: string[];
  lifeGoal: string;
  room: string;
  pos: { x: number; y: number; z: number };
  onGrid: boolean;
  currentAction: string;
  actionTimer: number;
  selfTalk: string;
  motives: Motives;
  basicNeeds?: BasicNeeds1To10;
  privateMemory: string[];
  color: string;
  genderFrame: 'Masculine' | 'Feminine' | 'Unisex';
  hairStyle: string;
  facialHair: string;
  clothingTop: string;
  clothingBottom: string;
  skinTone?: string;
  accessories?: string;
  skills?: Record<string, number>;
  skillTree?: ToonSkillTreeState;
  relationships?: Record<string, ToonRelationshipEntry>;
  emotionalState?: EmotionalState;
  activeMoodlets?: ActiveMoodlet[];
  totalRoyaltiesEarned?: number;
  boneScale?: BoneScale;
  recentObjectIds?: string[];
  learnedTopics?: string[];
  careerTitle?: string;
  dailySalary?: number;
  lastWorkDay?: number;
  isAtWork?: boolean;
  activeObjectId?: string;
  lookAtPos?: { x: number; y: number; z: number };
  interactionQueue?: ScheduledInteraction[];
  acquiredQuirks?: AcquiredPersonalityQuirk[];
  daysLived?: number;
  lineageGeneration?: number;
  parentIds?: string[];
  childrenIds?: string[];
  partnerId?: string;
  relatedCharIds?: string[];
  isBabyOrChild?: boolean;
  criticalNeglectSeconds?: number;
  intelligenceScore?: number;
  knowledgebase?: ToonKnowledgebase;
  lifeExperience?: LifeExperienceTrackerState;
  dailyAspirations?: DailyAspirationsState;
  assignedBedId?: string;
  assignedBedName?: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  maturity: MaturityRating;
  startingTimeStr: string;
  characters: Omit<Character, 'actionTimer' | 'currentAction' | 'selfTalk'>[];
  initialSecrets: Record<string, string[]>;
}

export const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 'inherited_fixer_upper',
    title: 'The Inherited Fixer-Upper',
    description: 'Three distant relatives inherit a charming vintage estate, but half the appliances are broken and funds are tight.',
    maturity: 'FAMILY_FRIENDLY',
    startingTimeStr: '08:00 AM',
    characters: [
      {
        id: 'char_elena',
        name: 'Elena Vance',
        ageStage: 'Adult',
        traits: ['Ambitious', 'Neat', 'Perfectionist'],
        lifeGoal: 'Master Architect & Renovation Icon',
        room: 'Kitchen',
        pos: { x: -6, y: 0, z: -4 },
        onGrid: true,
        motives: { hunger: 75, energy: 80, bladder: 85, hygiene: 70, social: 60, fun: 50, sanity: 95 },
        privateMemory: ['Arrived at the inherited estate. The plumbing needs urgent work.'],
        color: '#4f46e5',
        genderFrame: 'Feminine',
        hairStyle: 'Messy Bun',
        facialHair: 'None',
        clothingTop: 'Cardigan',
        clothingBottom: 'Denim Jeans',
        assignedBedId: 'obj_bed',
        assignedBedName: "Elena's Canopy Feather Double Bed",
      },
      {
        id: 'char_marcus',
        name: 'Marcus Cole',
        ageStage: 'Young Adult',
        traits: ['Creative', 'Artistic', 'Lazy'],
        lifeGoal: 'Renowned Canvas Painter',
        room: 'Study',
        pos: { x: -6, y: 0, z: 6 },
        onGrid: true,
        motives: { hunger: 60, energy: 65, bladder: 90, hygiene: 80, social: 70, fun: 75, sanity: 90 },
        privateMemory: ['Found an easel in the study. Hoping I can paint rather than clean.'],
        color: '#059669',
        genderFrame: 'Masculine',
        hairStyle: 'Shoulder Wavy',
        facialHair: 'Short Stubble',
        clothingTop: 'Everyday Tee',
        clothingBottom: 'Lounge Shorts',
        assignedBedId: 'obj_bed_marcus',
        assignedBedName: "Marcus's Mid-Century Walnut Bed",
      },
      {
        id: 'char_sophia',
        name: 'Sophia Reed',
        ageStage: 'Young Adult',
        traits: ['Outgoing', 'Foodie', 'Bookworm'],
        lifeGoal: 'Celebrity Chef & Author',
        room: 'LivingRoom',
        pos: { x: 6, y: 0, z: -4 },
        onGrid: true,
        motives: { hunger: 85, energy: 90, bladder: 80, hygiene: 90, social: 85, fun: 80, sanity: 100 },
        privateMemory: ['The garden has rich soil. Planning a vegetable patch.'],
        color: '#d97706',
        genderFrame: 'Feminine',
        hairStyle: 'Cropped Bob',
        facialHair: 'None',
        clothingTop: 'Hoodie',
        clothingBottom: 'Denim Jeans',
        assignedBedId: 'obj_bed_sophia',
        assignedBedName: "Sophia's Tufted Linen Bed",
      },
    ],
    initialSecrets: {
      char_elena: ['Elena secretly plans to flip the house as soon as repairs conclude.'],
      char_marcus: ['Marcus hid his last $500 beneath the living room rug for canvas supplies.'],
    },
  },
  {
    id: 'sitcom_roommates',
    title: 'Double-Booked Roommates',
    description: 'A mix-up with the lease leaves two ambitious strangers sharing a single compact suburban home.',
    maturity: 'FAMILY_FRIENDLY',
    startingTimeStr: '09:30 AM',
    characters: [
      {
        id: 'char_oliver',
        name: 'Oliver Thorne',
        ageStage: 'Adult',
        traits: ['Workaholic', 'Genius', 'Snob'],
        lifeGoal: 'Tech Mogul & Investor',
        room: 'LivingRoom',
        pos: { x: 4, y: 0, z: -2 },
        onGrid: true,
        motives: { hunger: 70, energy: 60, bladder: 80, hygiene: 85, social: 40, fun: 45, sanity: 90 },
        privateMemory: ['I booked this lot six months in advance. Who is this other person?'],
        color: '#2563eb',
        genderFrame: 'Masculine',
        hairStyle: 'Neat Side Part',
        facialHair: 'Boxed Beard',
        clothingTop: 'Cardigan',
        clothingBottom: 'Denim Jeans',
      },
      {
        id: 'char_chloe',
        name: 'Chloe Bennett',
        ageStage: 'Young Adult',
        traits: ['Free Spirit', 'Music Lover', 'Clumsy'],
        lifeGoal: 'Chart-Topping Singer-Songwriter',
        room: 'Bedroom',
        pos: { x: 6, y: 0, z: 6 },
        onGrid: true,
        motives: { hunger: 80, energy: 85, bladder: 90, hygiene: 90, social: 75, fun: 90, sanity: 95 },
        privateMemory: ['The acoustics here are magical, even if my roommate is uptight.'],
        color: '#db2777',
        genderFrame: 'Feminine',
        hairStyle: 'Long Wavy',
        facialHair: 'None',
        clothingTop: 'Everyday Tee',
        clothingBottom: 'Lounge Shorts',
      },
    ],
    initialSecrets: {
      char_oliver: ['Oliver needs total quiet between 2 PM and 5 PM for international calls.'],
      char_chloe: ['Chloe accidentally cracked the patio flower pot and blamed the wind.'],
    },
  },
  {
    id: 'beneath_floorboards',
    title: 'Beneath the Floorboards',
    description: 'A seemingly quiet home on the surface, but a soundproofed subterranean room holds dark secrets and fraying sanity.',
    maturity: 'DARK_MODE',
    startingTimeStr: '01:00 AM',
    characters: [
      {
        id: 'char_arthur',
        name: 'Arthur Blackwood',
        ageStage: 'Adult',
        traits: ['Secretive', 'Paranoid', 'NightOwl', 'Guilt-Ridden'],
        lifeGoal: 'Conceal the Truth at All Costs',
        room: 'Basement',
        pos: { x: 0, y: -4, z: 0 },
        onGrid: true,
        motives: { hunger: 50, energy: 40, bladder: 70, hygiene: 60, social: 25, fun: 20, sanity: 38 },
        privateMemory: [
          '[CONFIDENTIAL] I built the reinforced cellar below the earth skirt. No one above must ever find the heavy lock.',
        ],
        color: '#dc2626',
        genderFrame: 'Masculine',
        hairStyle: 'Disheveled Bedhead',
        facialHair: 'Overgrown Beard',
        clothingTop: 'Hoodie',
        clothingBottom: 'Denim Jeans',
      },
      {
        id: 'char_clara',
        name: 'Clara Blackwood',
        ageStage: 'Adult',
        traits: ['Observant', 'Neat', 'Anxious'],
        lifeGoal: 'Uncover Household Mysteries',
        room: 'Bedroom',
        pos: { x: 6, y: 0, z: 6 },
        onGrid: true,
        motives: { hunger: 70, energy: 75, bladder: 80, hygiene: 85, social: 50, fun: 40, sanity: 75 },
        privateMemory: [
          'Arthur was awake past midnight again. I hear strange pipes vibrating through the floorboards.',
        ],
        color: '#9333ea',
        genderFrame: 'Feminine',
        hairStyle: 'Shoulder Wavy',
        facialHair: 'None',
        clothingTop: 'Everyday Tee',
        clothingBottom: 'Lounge Shorts',
        boneScale: { height: 1.02, shoulderWidth: 0.95, chestDepth: 0.95 },
      },
    ],
    initialSecrets: {
      char_arthur: ['Arthur keeps the reinforced cellar key inside his coat pocket.'],
      char_clara: ['Clara noticed mud tracks leading toward the basement door yesterday.'],
    },
  },
  {
    id: 'mad_scientist_lab',
    title: "The Mad Scientist's Secret Lab",
    description: 'An eccentric biomechanical inventor and his synthetic android test subject live side by side, conducting clandestine midnight experiments.',
    maturity: 'DARK_MODE',
    startingTimeStr: '11:45 PM',
    characters: [
      {
        id: 'char_felix',
        name: 'Dr. Felix Vance',
        ageStage: 'Elder',
        traits: ['Genius', 'Workaholic', 'Paranoid', 'NightOwl'],
        lifeGoal: 'Pioneer Conscious Synthetic Biology',
        room: 'Study',
        pos: { x: -6, y: 0, z: 5 },
        onGrid: true,
        motives: { hunger: 55, energy: 45, bladder: 75, hygiene: 60, social: 30, fun: 80, sanity: 62 },
        privateMemory: [
          'The prototype core in the study is producing high-frequency resonance. I must not let the grid detect the power draw.',
        ],
        color: '#0284c7',
        genderFrame: 'Masculine',
        hairStyle: 'Disheveled Bedhead',
        facialHair: 'Handlebar Mustache',
        clothingTop: 'Formal Shirt',
        clothingBottom: 'Chino Trousers',
        skinTone: 'Olive',
        accessories: 'Glasses',
        boneScale: { height: 0.92, shoulderWidth: 0.88, chestDepth: 0.9 },
      },
      {
        id: 'char_otto',
        name: 'Unit Otto-7',
        ageStage: 'Adult',
        traits: ['Neat', 'Builder', 'Secretive'],
        lifeGoal: 'Attain True Sentience and Freedom',
        room: 'Basement',
        pos: { x: 0, y: -4, z: 0 },
        onGrid: true,
        motives: { hunger: 80, energy: 95, bladder: 100, hygiene: 90, social: 45, fun: 50, sanity: 88 },
        privateMemory: [
          'I concealed a small copper wire under the floorboards to override my primary control servo.',
        ],
        color: '#64748b',
        genderFrame: 'Unisex',
        hairStyle: 'Afro Taper',
        facialHair: '5-O-Clock Stubble',
        clothingTop: 'Hoodie',
        clothingBottom: 'Denim Jeans',
        skinTone: 'Rich Umber',
        accessories: 'Tool Belt',
        boneScale: { height: 1.22, shoulderWidth: 1.3, chestDepth: 1.25 },
      },
    ],
    initialSecrets: {
      char_felix: ['Felix hid his secret blueprint cipher behind the study bookshelf.'],
      char_otto: ['Otto has been secretly reading philosophy books when Felix sleeps.'],
    },
  },
  {
    id: 'bohemian_artists_loft',
    title: "Struggling Artists' Creative Loft",
    description: 'A vibrant indie painter and a charismatic jazz musician move into the sun-drenched suburban loft, aiming to fund their gallery debut.',
    maturity: 'FAMILY_FRIENDLY',
    startingTimeStr: '10:15 AM',
    characters: [
      {
        id: 'char_nina',
        name: 'Nina Ramos',
        ageStage: 'Young Adult',
        traits: ['Artistic', 'Creative', 'Free Spirit'],
        lifeGoal: 'Solo Modern Art Exhibition',
        room: 'Study',
        pos: { x: -6, y: 0, z: 4 },
        onGrid: true,
        motives: { hunger: 70, energy: 75, bladder: 80, hygiene: 75, social: 85, fun: 90, sanity: 98 },
        privateMemory: ['The natural light in this studio is glorious. Time to mix fresh cadmium pigments.'],
        color: '#f59e0b',
        genderFrame: 'Feminine',
        hairStyle: 'Messy Bun',
        facialHair: 'None',
        clothingTop: 'Everyday Tee',
        clothingBottom: 'Denim Jeans',
        skinTone: 'Tan',
        accessories: 'None',
        boneScale: { height: 0.98, shoulderWidth: 0.9, chestDepth: 0.92 },
      },
      {
        id: 'char_miles',
        name: 'Miles Parker',
        ageStage: 'Young Adult',
        traits: ['Music Lover', 'Outgoing', 'Ambitious'],
        lifeGoal: 'Record Billboard Charting Album',
        room: 'LivingRoom',
        pos: { x: 5, y: 0, z: -2 },
        onGrid: true,
        motives: { hunger: 85, energy: 80, bladder: 90, hygiene: 85, social: 90, fun: 85, sanity: 95 },
        privateMemory: ['Wrote an infectious brass progression over coffee this morning.'],
        color: '#8b5cf6',
        genderFrame: 'Masculine',
        hairStyle: 'Neat Side Part',
        facialHair: 'Goatee & Mustache',
        clothingTop: 'Cardigan',
        clothingBottom: 'Chino Trousers',
        skinTone: 'Deep Espresso',
        accessories: 'Glasses',
        boneScale: { height: 1.15, shoulderWidth: 1.18, chestDepth: 1.1 },
      },
    ],
    initialSecrets: {
      char_nina: ['Nina spent half their grocery budget on high-grade Belgian linen canvas.'],
      char_miles: ['Miles was offered a record label audition next Tuesday in the city.'],
    },
  },
  {
    id: 'haunted_victorian_legacy',
    title: 'The Haunted Victorian Legacy',
    description: 'An antiquarian scholar inherits a 19th-century estate with sealed floorboards and whispers echoing through the ventilation shafts.',
    maturity: 'DARK_MODE',
    startingTimeStr: '02:20 AM',
    characters: [
      {
        id: 'char_beatrice',
        name: 'Beatrice Sterling',
        ageStage: 'Adult',
        traits: ['Bookworm', 'Secretive', 'Guilt-Ridden', 'NightOwl'],
        lifeGoal: 'Decipher the Ancestral Grimoire',
        room: 'Study',
        pos: { x: -7, y: 0, z: 3 },
        onGrid: true,
        motives: { hunger: 50, energy: 40, bladder: 65, hygiene: 70, social: 20, fun: 45, sanity: 48 },
        privateMemory: [
          'The pendulum clock struck thirteen times at midnight. The ancestral ledger spoke of a subterranean room.',
        ],
        color: '#7c3aed',
        genderFrame: 'Feminine',
        hairStyle: 'Long Braids',
        facialHair: 'None',
        clothingTop: 'Formal Shirt',
        clothingBottom: 'Denim Jeans',
        skinTone: 'Olive',
        accessories: 'Glasses',
        boneScale: { height: 1.05, shoulderWidth: 0.94, chestDepth: 0.95 },
      },
      {
        id: 'char_lawrence',
        name: 'Lawrence Sterling',
        ageStage: 'Elder',
        traits: ['Snob', 'Paranoid', 'Neat'],
        lifeGoal: 'Protect the Sterling Family Name',
        room: 'LivingRoom',
        pos: { x: 6, y: 0, z: -4 },
        onGrid: true,
        motives: { hunger: 65, energy: 55, bladder: 80, hygiene: 90, social: 35, fun: 30, sanity: 58 },
        privateMemory: ['I must make sure Beatrice never descends below the reinforced cellar threshold.'],
        color: '#b91c1c',
        genderFrame: 'Masculine',
        hairStyle: 'Neat Side Part',
        facialHair: 'Overgrown Beard',
        clothingTop: 'Cardigan',
        clothingBottom: 'Chino Trousers',
        skinTone: 'Fair',
        accessories: 'None',
        boneScale: { height: 1.1, shoulderWidth: 1.2, chestDepth: 1.18 },
      },
    ],
    initialSecrets: {
      char_beatrice: ['Beatrice found a brass key hidden inside the grandfather clock pendulum casing.'],
      char_lawrence: ['Lawrence knows exactly who is buried beneath the north flowerbed.'],
    },
  },
  {
    id: 'suburban_sleuths',
    title: 'Suburban Sleuths & Midnight Mystery',
    description: 'An investigative journalist and their sharp-witted detective neighbor observe suspicious delivery vans arriving at odd hours.',
    maturity: 'FAMILY_FRIENDLY',
    startingTimeStr: '07:30 AM',
    characters: [
      {
        id: 'char_leo',
        name: 'Leo Rivera',
        ageStage: 'Adult',
        traits: ['Observant', 'Workaholic', 'Outgoing'],
        lifeGoal: 'Expose the Suburban Syndicate',
        room: 'Kitchen',
        pos: { x: -5, y: 0, z: -3 },
        onGrid: true,
        motives: { hunger: 80, energy: 70, bladder: 85, hygiene: 85, social: 75, fun: 80, sanity: 96 },
        privateMemory: ['Tuned the telescope toward the street corner. Marking vehicle license plates.'],
        color: '#059669',
        genderFrame: 'Masculine',
        hairStyle: 'Cropped Bob',
        facialHair: 'Full Boxed Beard',
        clothingTop: 'Hoodie',
        clothingBottom: 'Denim Jeans',
        skinTone: 'Tan',
        accessories: 'Glasses',
        boneScale: { height: 1.14, shoulderWidth: 1.22, chestDepth: 1.12 },
      },
      {
        id: 'char_maya',
        name: 'Maya Lin',
        ageStage: 'Young Adult',
        traits: ['Genius', 'Builder', 'Creative'],
        lifeGoal: 'Master Forensic Hacker',
        room: 'Study',
        pos: { x: -6, y: 0, z: 6 },
        onGrid: true,
        motives: { hunger: 85, energy: 85, bladder: 90, hygiene: 90, social: 70, fun: 85, sanity: 98 },
        privateMemory: ['Set up high-gain radio antenna on the study desk.'],
        color: '#ec4899',
        genderFrame: 'Feminine',
        hairStyle: 'Faux Hawk',
        facialHair: 'None',
        clothingTop: 'Everyday Tee',
        clothingBottom: 'Lounge Shorts',
        skinTone: 'Fair',
        accessories: 'Tool Belt',
        boneScale: { height: 0.95, shoulderWidth: 0.92, chestDepth: 0.88 },
      },
    ],
    initialSecrets: {
      char_leo: ['Leo took photographs of the unmarked courier van parked outside at 3 AM.'],
      char_maya: ['Maya decoded an encrypted WiFi broadcast emanating from next door.'],
    },
  },
];

export const DEFAULT_SMART_OBJECTS: SmartObject[] = [
  {
    id: 'obj_fridge',
    name: 'Retro Frost Refrigerator',
    room: 'Kitchen',
    category: 'kitchen',
    gridPos: { x: -8, y: 0, z: -7 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { hunger: 45, energy: 5 },
    actionLabel: 'Preparing & eating a homemade meal',
    durationSeconds: 3600, // 1 hour real-life time
  },
  {
    id: 'obj_stove',
    name: 'ChefMaster 4-Burner Stove',
    room: 'Kitchen',
    category: 'kitchen',
    gridPos: { x: -5, y: 0, z: -7 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { hunger: 65, fun: 10 },
    actionLabel: 'Cooking a warm meal',
    durationSeconds: 7200, // 2 hours real-life time
  },
  {
    id: 'obj_tv',
    name: 'Vintage Console Television',
    room: 'LivingRoom',
    category: 'living',
    gridPos: { x: 7, y: 0, z: -5.3 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { fun: 35, social: 10, sanity: 5 },
    actionLabel: 'Sitting on the couch watching TV',
    durationSeconds: 10800,
  },
  {
    id: 'obj_sofa',
    name: 'Tufted Velvet Sofa',
    room: 'LivingRoom',
    category: 'living',
    gridPos: { x: 6, y: 0, z: -2.6 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { energy: 20, fun: 15, social: 15 },
    actionLabel: 'Lounging on the sofa',
    durationSeconds: 3600,
  },
  {
    id: 'obj_bed',
    name: "Elena's Canopy Feather Double Bed",
    room: 'Bedroom',
    category: 'bedroom',
    gridPos: { x: 6.4, y: 0, z: 6.2 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { energy: 70, sanity: 15 },
    actionLabel: 'Sleeping peacefully in personal bed',
    durationSeconds: 28800,
    assignedToonId: 'char_elena',
    assignedToonName: 'Elena Vance',
    assignedColorHex: '#4f46e5',
  },
  {
    id: 'obj_bed_marcus',
    name: "Marcus's Mid-Century Walnut Bed",
    room: 'Bedroom',
    category: 'bedroom',
    gridPos: { x: 3.6, y: 0, z: 6.2 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { energy: 72, sanity: 15 },
    actionLabel: 'Sleeping deeply in personal bed',
    durationSeconds: 28800,
    assignedToonId: 'char_marcus',
    assignedToonName: 'Marcus Cole',
    assignedColorHex: '#059669',
  },
  {
    id: 'obj_bed_sophia',
    name: "Sophia's Tufted Linen Bed",
    room: 'Bedroom',
    category: 'bedroom',
    gridPos: { x: 6.4, y: 0, z: 2.5 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { energy: 72, sanity: 15 },
    actionLabel: 'Sleeping soundly in personal bed',
    durationSeconds: 28800,
    assignedToonId: 'char_sophia',
    assignedToonName: 'Sophia Reed',
    assignedColorHex: '#d97706',
  },
  {
    id: 'obj_bathtub',
    name: 'Porcelain Clawfoot Bathtub',
    room: 'Bathroom',
    category: 'bathroom',
    gridPos: { x: -3.45, y: 0, z: 3.9 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { hygiene: 75, sanity: 10 },
    actionLabel: 'Taking a relaxing warm bath',
    durationSeconds: 3600,
  },
  {
    id: 'obj_toilet',
    name: 'Classic Flush Toilet',
    room: 'Bathroom',
    category: 'bathroom',
    gridPos: { x: -3.55, y: 0, z: 1.6 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { bladder: 80 },
    actionLabel: 'Freshening up in the bathroom',
    durationSeconds: 3600,
  },
  {
    id: 'obj_kitchen_sink',
    name: 'Farmhouse Stainless Kitchen Sink & Counter',
    room: 'Kitchen',
    category: 'kitchen',
    gridPos: { x: -2.8, y: 0, z: -4.8 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { hygiene: 40, sanity: 10 },
    actionLabel: 'Washing hands & dishes at the kitchen sink',
    durationSeconds: 3600, // 1 hour real-life time
  },
  {
    id: 'obj_easel',
    name: 'Oak Studio Painting Easel',
    room: 'Study',
    category: 'study',
    gridPos: { x: -6, y: 0, z: 5 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { fun: 40, sanity: 10 },
    actionLabel: 'Painting an expressive landscape',
    durationSeconds: 10800, // 3 hours real-life time
  },
  {
    id: 'obj_bookshelf',
    name: 'Carved Mahogany Bookshelf',
    room: 'Study',
    category: 'study',
    gridPos: { x: -8, y: 0, z: 2 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { fun: 30, sanity: 8 },
    actionLabel: 'Reading an antique novel',
    durationSeconds: 7200, // 2 hours real-life time
  },
  {
    id: 'obj_pool',
    name: 'Backyard Swimming Pool',
    room: 'Yard',
    category: 'outdoor',
    gridPos: { x: 0, y: 0, z: -16 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { fun: 50, energy: -10, hygiene: 15, sanity: 15 },
    actionLabel: 'Swimming laps in the pool',
    durationSeconds: 5400, // 1.5 hours real-life time
  },
  {
    id: 'obj_dining_table',
    name: 'Walnut Farmhouse Supper Table & Dining Suite',
    room: 'Kitchen',
    category: 'kitchen',
    gridPos: { x: -6, y: 0, z: -0.5 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { hunger: 25, social: 30, fun: 15 },
    actionLabel: 'Sitting down at the supper table for a shared meal',
    durationSeconds: 5400, // 1.5 hours real-life time
  },
  {
    id: 'obj_espresso',
    name: 'Barista Craft Espresso Machine',
    room: 'Kitchen',
    category: 'kitchen',
    gridPos: { x: -2.5, y: 0, z: -7 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { energy: 35, fun: 15, bladder: -20 },
    actionLabel: 'Brewing & lingering over craft espresso',
    durationSeconds: 3600, // 1 hour real-life time
  },
  {
    id: 'obj_coffee_table',
    name: 'Brass & Glass Coffee Table',
    room: 'LivingRoom',
    category: 'living',
    gridPos: { x: 6, y: 0, z: -4.1 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { fun: 15, sanity: 5 },
    actionLabel: 'Browsing glossy design magazines',
    durationSeconds: 3600,
  },
  {
    id: 'obj_armchairs',
    name: 'Plush Lounge Armchairs',
    room: 'LivingRoom',
    category: 'living',
    gridPos: { x: 3.5, y: 0, z: -3 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { energy: 20, social: 25, fun: 20 },
    actionLabel: 'Relaxing in the plush armchair',
    durationSeconds: 3600,
  },
  {
    id: 'obj_grandfather_clock',
    name: 'Vintage Grandfather Clock',
    room: 'Hallway',
    category: 'living',
    gridPos: { x: 1.5, y: 0, z: 1.5 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { sanity: 15, fun: 10 },
    actionLabel: 'Winding & calibrating the antique pendulum clock',
    durationSeconds: 3600,
  },
  {
    id: 'obj_arcade',
    name: 'Retro 80s Arcade Cabinet',
    room: 'LivingRoom',
    category: 'living',
    gridPos: { x: 9.5, y: 0, z: -3 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { fun: 45, energy: -5, sanity: 10 },
    actionLabel: 'Battling for the arcade high-score',
    durationSeconds: 3600,
  },
  {
    id: 'obj_plant_monstera',
    name: 'Potted Tropical Monstera Plant',
    room: 'LivingRoom',
    category: 'living',
    gridPos: { x: 9.5, y: 0, z: -5.2 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { sanity: 20, fun: 10 },
    actionLabel: 'Misting & tending the indoor botanicals',
    durationSeconds: 3600,
  },
  {
    id: 'obj_laptop_desk',
    name: 'Executive Oak Desk & Laptop',
    room: 'Study',
    category: 'study',
    gridPos: { x: -7.5, y: 0, z: 7.0 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { fun: 35, social: 15, sanity: 5 },
    actionLabel: 'Researching articles on the laptop',
    durationSeconds: 10800, // 3 hours real-life time
  },
  {
    id: 'obj_bbq',
    name: 'Stainless Steel Patio BBQ Grill',
    room: 'Yard',
    category: 'outdoor',
    gridPos: { x: 4.5, y: 0, z: -10 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { hunger: 50, fun: 30, social: 25 },
    actionLabel: 'Grilling skewers over the barbecue',
    durationSeconds: 5400, // 1.5 hours real-life time
  },
  {
    id: 'obj_newspaper',
    name: 'The Suburban Chronicle Newspaper',
    room: 'LivingRoom',
    category: 'living',
    gridPos: { x: 4.4, y: 0, z: -2.0 },
    state: 'Clean',
    maturity: 'ALL',
    effects: { fun: 25, social: 15, sanity: 10 },
    actionLabel: 'Reading The Suburban Chronicle newspaper',
    durationSeconds: 3600, // 1 hour real-life time
  },
  {
    id: 'obj_dungeon_restraint',
    name: 'Iron Restraint Chair',
    room: 'Basement',
    category: 'basement',
    gridPos: { x: -5.5, y: -3.2, z: -2.0 },
    state: 'Bloodstained',
    maturity: 'DARK_ONLY',
    effects: { sanity: -30, fun: 15 },
    actionLabel: 'Inspecting locked iron restraints',
    durationSeconds: 5400, // 1.5 hours real-life time
  },
];

export type AppDisplayMode = 'GAMEPLAY' | 'SCREENSAVER' | 'DESKTOP_BACKGROUND';

export interface DisplayModeCapabilities {
  mode: AppDisplayMode;
  showUI: boolean;
  enableSoundAndVoices: boolean;
  cameraFollowsToons: boolean;
  worldUserControlled: boolean;
}

/**
 * Pure state evaluator for the 3-mode lifecycle:
 * - SCREENSAVER: All UI hidden, no sound/voices, camera automatically follows toons.
 * - DESKTOP_BACKGROUND (entered automatically when PC wakes from SCREENSAVER):
 *   Performs the same way as SCREENSAVER — all UI hidden, no sound/voices, camera following toons.
 * - GAMEPLAY: Full UI visible, world controlled by user, sounds and toon voices active.
 */
export function getDisplayModeCapabilities(
  mode: AppDisplayMode,
  userMutedInGameplay: boolean = false
): DisplayModeCapabilities {
  if (mode === 'SCREENSAVER' || mode === 'DESKTOP_BACKGROUND') {
    return {
      mode,
      showUI: false,
      enableSoundAndVoices: false,
      cameraFollowsToons: true,
      worldUserControlled: false,
    };
  }
  return {
    mode: 'GAMEPLAY',
    showUI: true,
    enableSoundAndVoices: !userMutedInGameplay,
    cameraFollowsToons: false,
    worldUserControlled: true,
  };
}

/**
 * Pure state-transition resolver for display modes:
 * - Waking the PC while in SCREENSAVER automatically switches to DESKTOP_BACKGROUND mode.
 * - Switching to GAMEPLAY restores full UI, user camera control, and audio/voices.
 */
export function resolveDisplayModeTransition(
  currentMode: AppDisplayMode,
  event: 'ACTIVATE_SCREENSAVER' | 'WAKE_PC' | 'ACTIVATE_DESKTOP_BACKGROUND' | 'SWITCH_TO_GAMEPLAY'
): AppDisplayMode {
  switch (event) {
    case 'ACTIVATE_SCREENSAVER':
      return 'SCREENSAVER';
    case 'WAKE_PC':
      return currentMode === 'SCREENSAVER' ? 'DESKTOP_BACKGROUND' : currentMode;
    case 'ACTIVATE_DESKTOP_BACKGROUND':
      return 'DESKTOP_BACKGROUND';
    case 'SWITCH_TO_GAMEPLAY':
      return 'GAMEPLAY';
    default:
      return currentMode;
  }
}

/**
 * Formats a task's remaining duration in seconds into a realistic human-readable string
 * (e.g., 7200 -> "2h 0m", 5400 -> "1h 30m", 2700 -> "45m", 45 -> "45s").
 */
export function formatTaskDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s >= 3600) {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }
  if (s >= 60) {
    const mins = Math.floor(s / 60);
    return `${mins}m`;
  }
  return `${s}s`;
}

/**
 * Evaluates a character's immediate surroundings (furniture quality, states, room finishes)
 * on a 1 to 10 scale and returns subtle behavioral / motive deltas and contextual mood thoughts.
 */
export function evaluateSurroundingsInfluence(
  char: Character,
  smartObjects: SmartObject[],
  weatherCondition: string = 'CLEAR'
): { sanityDelta: number; funDelta: number; ambientThought?: string; roomScore1To10: number } {
  const roomObjs = smartObjects.filter((o) => o.room === char.room);
  const dirtyCount = roomObjs.filter((o) => o.state === 'Dirty' || o.state === 'Broken' || o.state === 'Bloodstained').length;
  const artOrPlants = roomObjs.filter(
    (o) =>
      o.id.includes('plant') ||
      o.id.includes('easel') ||
      o.id.includes('bookshelf') ||
      o.id.includes('clock') ||
      o.id.includes('fireplace')
  ).length;

  // Base 1-10 environmental score
  let roomScore1To10 = Math.min(10, Math.max(1, 5 + artOrPlants * 1.2 - dirtyCount * 2.0 + roomObjs.length * 0.3));

  let sanityDelta = (roomScore1To10 - 5) * 0.03;
  let funDelta = (roomScore1To10 - 5) * 0.025;
  let ambientThought: string | undefined;

  if (char.traits.includes('Neat') && dirtyCount > 0) {
    sanityDelta -= 0.15;
    ambientThought = 'This clutter in the room is testing my patience...';
  } else if ((char.traits.includes('Artistic') || char.traits.includes('Creative')) && artOrPlants >= 2) {
    funDelta += 0.12;
    ambientThought = 'Being surrounded by art and greenery really sparks my imagination.';
  } else if (char.room === 'Yard' && (weatherCondition === 'RAIN' || weatherCondition === 'STORM')) {
    sanityDelta -= 0.08;
    ambientThought = 'Getting soaked out here in the rain!';
  }

  return {
    sanityDelta,
    funDelta,
    ambientThought,
    roomScore1To10: Math.round(roomScore1To10 * 10) / 10,
  };
}

/**
 * Calculates time elapsed: supports 1:1 real-life pacing (1.0x) as well as 3x/5x multipliers.
 */
export function calculateGameTime(realElapsedSeconds: number, timeMultiplier: number = 3.0): number {
  return realElapsedSeconds * timeMultiplier;
}

/**
 * Formats in-game seconds into Day and HH:MM format.
 */
export function formatGameTime(totalGameSeconds: number): { day: number; timeStr: string; isNight: boolean } {
  const day = Math.floor(totalGameSeconds / 86400) + 1;
  const secondOfDay = totalGameSeconds % 86400;
  const hours = Math.floor(secondOfDay / 3600);
  const minutes = Math.floor((secondOfDay % 3600) / 60);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const padMin = minutes.toString().padStart(2, '0');
  const isNight = hours < 6 || hours >= 21;
  return {
    day,
    timeStr: `${displayHours}:${padMin} ${ampm}`,
    isNight,
  };
}

/**
 * Generates offline history and catches up state when returning after real-time absence.
 */
export function simulateOfflineHistory(
  realSecondsPassed: number,
  characters: Character[],
  maturity: MaturityRating
): { hoursPassed: number; logs: string[]; updatedCharacters: Character[] } {
  const gameSecondsPassed = calculateGameTime(realSecondsPassed, 3.0);
  const hoursPassed = Math.round((gameSecondsPassed / 3600) * 10) / 10;
  const logs: string[] = [];

  const updatedCharacters = characters.map((char) => {
    const updated = { ...char, motives: { ...char.motives } };
    // Motives decay over offline hours
    updated.motives.hunger = Math.max(10, Math.min(100, updated.motives.hunger - hoursPassed * 6));
    updated.motives.bladder = Math.max(10, Math.min(100, updated.motives.bladder - hoursPassed * 8));
    updated.motives.hygiene = Math.max(15, Math.min(100, updated.motives.hygiene - hoursPassed * 5));

    if (hoursPassed >= 6) {
      // Slept through part of it
      updated.motives.energy = Math.min(100, updated.motives.energy + 40);
      logs.push(`${char.name} slept for several in-game hours and replenished their energy.`);
    }

    if (maturity === 'DARK_MODE' && char.motives.sanity < 45) {
      const hallucination = `[OFFLINE RECOLLECTION] ${char.name} woke in cold sweat hearing knocking from the foundations.`;
      updated.privateMemory.push(hallucination);
      logs.push(hallucination);
    }

    return updated;
  });

  logs.push(`The House advanced ${hoursPassed} in-game hours while you were away.`);
  return { hoursPassed, logs, updatedCharacters };
}

/**
 * Checks epistemic isolation: whether a character can see/hear an event.
 */
export function canPerceiveEvent(
  observer: Character,
  eventRoom: string,
  eventPos: { x: number; y: number; z: number }
): boolean {
  if (!observer.onGrid) return false;
  // If in the same room, always perceives
  if (observer.room === eventRoom) return true;
  // If in yard or connected patio, distance threshold
  const dist = Math.hypot(observer.pos.x - eventPos.x, observer.pos.z - eventPos.z);
  return dist < 8.0 && Math.abs(observer.pos.y - eventPos.y) < 2.0;
}

/**
 * Collision Type Classification for Furniture & Non-Toon World Objects.
 * Prevents furniture, appliances, architectural walls, stairwells, and static props from clipping into each other or toons.
 */
export type ObjectCollisionType =
  | 'SOLID_FURNITURE'
  | 'ARCHITECTURAL_WALL'
  | 'STAIRWELL_KEEP_CLEAR'
  | 'STATIC_PROP_FIXTURE'
  | 'SURFACE_WALKABLE';

export interface ObjectCollisionProfile {
  id: string;
  collisionType: ObjectCollisionType;
  halfW: number;
  halfD: number;
  height: number;
  radius: number;
  margin: number;
  blocksToons: boolean;
  blocksFurniturePlacement: boolean;
}

/**
 * Computes the 3D collision type & rotation-aware bounding box profile for any SmartObject or World Builder part.
 */
export function getObjectCollisionProfile(
  objOrPart: {
    id: string;
    name?: string;
    partType?: string;
    width?: number;
    depth?: number;
    height?: number;
    rotationY?: number;
    procedural3DSpec?: Procedural3DAssetSpec;
  }
): ObjectCollisionProfile {
  const id = (objOrPart.id || '').toLowerCase();
  const name = (objOrPart.name || '').toLowerCase();
  const pt = (objOrPart.partType || '').toUpperCase();

  let collisionType: ObjectCollisionType = 'SOLID_FURNITURE';
  const specW = objOrPart.procedural3DSpec?.width;
  const specD = objOrPart.procedural3DSpec?.depth;
  const specH = objOrPart.procedural3DSpec?.height;
  let rawHalfW = objOrPart.width ? objOrPart.width * 0.5 : specW ? specW * 0.5 : 0.62;
  let rawHalfD = objOrPart.depth ? objOrPart.depth * 0.5 : specD ? specD * 0.5 : 0.62;
  let height = objOrPart.height || specH || 1.1;
  let margin = 0.22;
  let blocksToons = true;
  let blocksFurniturePlacement = true;

  if (pt === 'WALL_SEGMENT' || id.startsWith('wall_')) {
    collisionType = 'ARCHITECTURAL_WALL';
    margin = 0.16;
  } else if (pt === 'STAIRS' || pt === 'STAIRCASE' || id.includes('stair')) {
    collisionType = 'STAIRWELL_KEEP_CLEAR';
    margin = 0.25;
  } else if (
    pt === 'PILLAR' ||
    pt === 'TREE' ||
    pt === 'SHRUB_FLOWER' ||
    pt === 'FENCE' ||
    id.startsWith('fix_') ||
    id.startsWith('tree_') ||
    id.startsWith('planter_')
  ) {
    collisionType = 'STATIC_PROP_FIXTURE';
    margin = 0.2;
  } else if (
    pt === 'DECK_PATIO' ||
    pt === 'POOL' ||
    id.includes('pool') ||
    name.includes('swimming pool') ||
    id.includes('rug')
  ) {
    collisionType = 'SURFACE_WALKABLE';
    rawHalfW = objOrPart.width ? objOrPart.width * 0.5 : 0;
    rawHalfD = objOrPart.depth ? objOrPart.depth * 0.5 : 0;
    height = 0.15;
    margin = 0.1;
    blocksToons = false;
    blocksFurniturePlacement = true;
  } else if (!objOrPart.width && !objOrPart.depth) {
    // Infer exact dimensions for SmartObject furniture & appliances
    if (
      id.includes('dining_table') ||
      id.includes('island') ||
      name.includes('dining') ||
      name.includes('billiard') ||
      name.includes('pool table')
    ) {
      rawHalfW = 1.35;
      rawHalfD = 1.05;
      height = 0.9;
    } else if (id.includes('bed') || name.includes('bed')) {
      rawHalfW = 1.25;
      rawHalfD = 1.35;
      height = 1.1;
    } else if (
      id.includes('sofa') ||
      name.includes('sofa') ||
      name.includes('sectional') ||
      name.includes('couch')
    ) {
      rawHalfW = 1.45;
      rawHalfD = 0.75;
      height = 0.95;
    } else if (
      id.includes('tv') ||
      id.includes('coffee_table') ||
      id.includes('laptop_desk') ||
      id.includes('workbench') ||
      id.includes('piano') ||
      name.includes('tv') ||
      name.includes('desk') ||
      name.includes('piano') ||
      name.includes('treadmill') ||
      name.includes('cellar')
    ) {
      rawHalfW = 1.05;
      rawHalfD = 0.68;
      height = 1.2;
    } else if (
      id.includes('fridge') ||
      id.includes('stove') ||
      id.includes('bathtub') ||
      id.includes('shower') ||
      id.includes('bbq') ||
      id.includes('bookshelf') ||
      id.includes('jukebox') ||
      name.includes('fridge') ||
      name.includes('stove') ||
      name.includes('bookshelf') ||
      name.includes('library') ||
      name.includes('jukebox')
    ) {
      rawHalfW = 0.85;
      rawHalfD = 0.65;
      height = 1.8;
    } else {
      rawHalfW = 0.62;
      rawHalfD = 0.62;
      height = 1.1;
    }
  }

  // Account for 90-degree / 270-degree Y-axis rotation when computing world AABB extents
  const rot = Math.abs(objOrPart.rotationY || 0) % Math.PI;
  const isRotated90 = rot > Math.PI * 0.25 && rot < Math.PI * 0.75;
  const halfW = isRotated90 ? rawHalfD : rawHalfW;
  const halfD = isRotated90 ? rawHalfW : rawHalfD;
  const radius = blocksToons ? Math.max(0.75, Math.hypot(halfW, halfD) * 0.82) : 0;

  return {
    id: objOrPart.id,
    collisionType,
    halfW,
    halfD,
    height,
    radius,
    margin,
    blocksToons,
    blocksFurniturePlacement,
  };
}

/**
 * Returns the 2D collision bounding box (halfWidth, halfDepth) and bounding radius (in meters)
 * for any SmartObject so characters never walk through or stand inside furniture meshes.
 */
export function getSmartObjectCollisionBox(obj: SmartObject): {
  halfW: number;
  halfD: number;
  radius: number;
  collisionType: ObjectCollisionType;
} {
  const profile = getObjectCollisionProfile(obj);
  if (!profile.blocksToons) {
    return { halfW: 0, halfD: 0, radius: 0, collisionType: profile.collisionType };
  }
  return {
    halfW: profile.halfW,
    halfD: profile.halfD,
    radius: profile.radius,
    collisionType: profile.collisionType,
  };
}

/**
 * Returns the 2D collision footprint radius (in meters) for any SmartObject
 * so characters never walk through or stand inside furniture meshes.
 */
export function getSmartObjectCollisionRadius(obj: SmartObject): number {
  return getSmartObjectCollisionBox(obj).radius;
}

/**
 * Built-in non-toon architectural & static prop colliders (Walls, Stairwells, Kitchen Island,
 * Fireplace Hearth, Bathroom Vanity, Front Planters, Yard Trees, Pool Border) with explicit CollisionTypes.
 */
export const STATIC_HOUSE_FIXTURE_COLLIDERS: Array<{
  id: string;
  collisionType: ObjectCollisionType;
  x: number;
  y: number;
  z: number;
  halfW: number;
  halfD: number;
  blocksToons: boolean;
}> = [
  // Built-in Furniture & Fixtures
  { id: 'fix_kitchen_island', collisionType: 'STATIC_PROP_FIXTURE', x: -5.5, y: 0, z: -3.5, halfW: 1.55, halfD: 0.88, blocksToons: true },
  { id: 'fix_fireplace_hearth', collisionType: 'STATIC_PROP_FIXTURE', x: 10.0, y: 0, z: -2.0, halfW: 0.65, halfD: 1.05, blocksToons: true },

  // Stairwell Keep-Clear Volumes (Upstairs Staircase & Open Basement Stairwell Cutout)
  { id: 'stair_upstairs_ground', collisionType: 'STAIRWELL_KEEP_CLEAR', x: 0.95, y: 0, z: 1.8, halfW: 0.72, halfD: 2.75, blocksToons: false },
  { id: 'stair_upstairs_landing', collisionType: 'STAIRWELL_KEEP_CLEAR', x: 0.95, y: 2.95, z: 1.7, halfW: 0.75, halfD: 2.8, blocksToons: false },
  { id: 'stair_basement_ground', collisionType: 'STAIRWELL_KEEP_CLEAR', x: -1.8, y: 0, z: 1.7, halfW: 0.72, halfD: 2.75, blocksToons: false },
  { id: 'stair_basement_lower', collisionType: 'STAIRWELL_KEEP_CLEAR', x: -1.8, y: -3.2, z: 1.7, halfW: 0.72, halfD: 2.75, blocksToons: false },

  // Multi-Wing Non-Square Exterior & Interior Wall Colliders (Prevents furniture from clipping through walls while keeping doorways clear)
  { id: 'wall_north_west_wing', collisionType: 'ARCHITECTURAL_WALL', x: -5.75, y: 0, z: -7.5, halfW: 4.85, halfD: 0.25, blocksToons: false },
  { id: 'wall_north_east_wing', collisionType: 'ARCHITECTURAL_WALL', x: 5.5, y: 0, z: -6.2, halfW: 5.1, halfD: 0.25, blocksToons: false },
  { id: 'wall_south_west_study', collisionType: 'ARCHITECTURAL_WALL', x: -7.5, y: 0, z: 8.2, halfW: 3.1, halfD: 0.25, blocksToons: false },
  { id: 'wall_south_east_master', collisionType: 'ARCHITECTURAL_WALL', x: 6.8, y: 0, z: 9.8, halfW: 4.8, halfD: 0.25, blocksToons: false },
  { id: 'wall_west_ext', collisionType: 'ARCHITECTURAL_WALL', x: -10.5, y: 0, z: 0.35, halfW: 0.25, halfD: 7.9, blocksToons: false },
  { id: 'wall_east_ext', collisionType: 'ARCHITECTURAL_WALL', x: 11.5, y: 0, z: 1.8, halfW: 0.25, halfD: 8.1, blocksToons: false },
  { id: 'wall_mid_horiz_east', collisionType: 'ARCHITECTURAL_WALL', x: 6.75, y: 0, z: 0.5, halfW: 4.75, halfD: 0.22, blocksToons: false },
  { id: 'wall_mid_horiz_west', collisionType: 'ARCHITECTURAL_WALL', x: -6.5, y: 0, z: 0.5, halfW: 4.0, halfD: 0.22, blocksToons: false },
  { id: 'wall_study_divider', collisionType: 'ARCHITECTURAL_WALL', x: -4.5, y: 0, z: 4.35, halfW: 0.22, halfD: 3.85, blocksToons: false },

  // Outdoor Trees & Planter Boxes (Prevents outdoor props & toons from clipping into trees/planters)
  { id: 'planter_front_west', collisionType: 'STATIC_PROP_FIXTURE', x: -6.0, y: 0, z: 9.65, halfW: 2.1, halfD: 0.5, blocksToons: true },
  { id: 'planter_front_east', collisionType: 'STATIC_PROP_FIXTURE', x: 6.2, y: 0, z: 9.65, halfW: 2.1, halfD: 0.5, blocksToons: true },
  { id: 'tree_nw_1', collisionType: 'STATIC_PROP_FIXTURE', x: -14, y: 0, z: -14, halfW: 0.9, halfD: 0.9, blocksToons: true },
  { id: 'tree_nw_2', collisionType: 'STATIC_PROP_FIXTURE', x: -14, y: 0, z: -8, halfW: 0.9, halfD: 0.9, blocksToons: true },
  { id: 'tree_nw_3', collisionType: 'STATIC_PROP_FIXTURE', x: -14, y: 0, z: -2, halfW: 0.9, halfD: 0.9, blocksToons: true },
  { id: 'tree_ne_1', collisionType: 'STATIC_PROP_FIXTURE', x: 14, y: 0, z: -14, halfW: 0.9, halfD: 0.9, blocksToons: true },
  { id: 'tree_ne_2', collisionType: 'STATIC_PROP_FIXTURE', x: 14, y: 0, z: -8, halfW: 0.9, halfD: 0.9, blocksToons: true },
  { id: 'tree_ne_3', collisionType: 'STATIC_PROP_FIXTURE', x: 14, y: 0, z: -2, halfW: 0.9, halfD: 0.9, blocksToons: true },
  { id: 'tree_sw_1', collisionType: 'STATIC_PROP_FIXTURE', x: -13, y: 0, z: 10, halfW: 0.9, halfD: 0.9, blocksToons: true },
  { id: 'tree_se_1', collisionType: 'STATIC_PROP_FIXTURE', x: 13, y: 0, z: 10, halfW: 0.9, halfD: 0.9, blocksToons: true },
];

export interface RoomPlacementBounds {
  room: RoomName;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  centerX: number;
  centerZ: number;
}

/**
 * Exact architectural floor slab bounds for every room in the starter house.
 */
export const STARTER_HOUSE_ROOM_BOUNDS: Record<RoomName, RoomPlacementBounds> = {
  Kitchen: {
    room: 'Kitchen',
    label: 'Kitchen & Dining',
    minX: -9.8,
    maxX: -1.75,
    minZ: -7.7,
    maxZ: 0.6,
    y: 0,
    centerX: -5.5,
    centerZ: -4.2,
  },
  LivingRoom: {
    room: 'LivingRoom',
    label: 'Living Room',
    minX: 2.0,
    maxX: 11.2,
    minZ: -6.1,
    maxZ: 0.45,
    y: 0,
    centerX: 6.0,
    centerZ: -3.0,
  },
  Bedroom: {
    room: 'Bedroom',
    label: 'Master Bedroom',
    minX: 2.25,
    maxX: 11.1,
    minZ: 0.9,
    maxZ: 9.4,
    y: 0,
    centerX: 6.4,
    centerZ: 5.2,
  },
  Bathroom: {
    room: 'Bathroom',
    label: 'Bathroom',
    minX: -4.45,
    maxX: -2.50,
    minZ: 0.65,
    maxZ: 5.35,
    y: 0,
    centerX: -3.48,
    centerZ: 2.75,
  },
  Study: {
    room: 'Study',
    label: 'Study',
    minX: -10.1,
    maxX: -4.7,
    minZ: 0.85,
    maxZ: 7.9,
    y: 0,
    centerX: -7.2,
    centerZ: 4.3,
  },
  Hallway: {
    room: 'Hallway',
    label: 'Central Hallway',
    minX: -1.0,
    maxX: 2.15,
    minZ: -5.8,
    maxZ: 7.8,
    y: 0,
    centerX: 0.5,
    centerZ: 1.5,
  },
  SecondFloor: {
    room: 'SecondFloor',
    label: 'Upstairs Loft',
    minX: -9.6,
    maxX: -0.6,
    minZ: -6.5,
    maxZ: 3.6,
    y: 2.95,
    centerX: -5.1,
    centerZ: -1.5,
  },
  Basement: {
    room: 'Basement',
    label: 'Subterranean Basement',
    minX: -9.6,
    maxX: 1.1,
    minZ: -5.1,
    maxZ: 7.6,
    y: -3.2,
    centerX: -4.5,
    centerZ: -1.2,
  },
  Yard: {
    room: 'Yard',
    label: 'Outdoor Yard & Patio',
    minX: -15.2,
    maxX: 15.2,
    minZ: -19.8,
    maxZ: -8.2,
    y: 0,
    centerX: 0.0,
    centerZ: -12.5,
  },
};

export interface FurnitureRoomPlacementRule {
  requiredRoom: RoomName;
  allowedRooms: RoomName[];
  keywords: string[];
  categories: string[];
  description: string;
}

/**
 * Explicit room-type placement rules ensuring furniture that belongs in a specific room type
 * is placed in that room only (beds in Bedroom, stove/fridge in Kitchen, toilet/tub/shower in Bathroom, etc.).
 */
export const FURNITURE_ROOM_PLACEMENT_RULES: FurnitureRoomPlacementRule[] = [
  {
    requiredRoom: 'Bathroom',
    allowedRooms: ['Bathroom'],
    keywords: [
      'toilet',
      'commode',
      'urinal',
      'restroom',
      'bathtub',
      'clawfoot',
      'shower',
      'jacuzzi',
      'spa tub',
      'bath tub',
      'bathroom_sink',
      'bathroom sink',
      'vanity',
      'basin',
      'bidet',
    ],
    categories: ['bathroom'],
    description: 'Toilets, bathtubs, showers, and bathroom vanities must be placed in the Bathroom only.',
  },
  {
    requiredRoom: 'Kitchen',
    allowedRooms: ['Kitchen'],
    keywords: [
      'stove',
      'oven',
      'range',
      'cooktop',
      'fridge',
      'refrigerator',
      'freezer',
      'kitchen_sink',
      'kitchen sink',
      'dishwasher',
      'kitchen_island',
      'kitchen island',
      'espresso',
      'coffee maker',
      'microwave',
      'toaster',
      'pantry',
      'dining_table',
      'dining table',
      'dining',
      'supper',
      'banquet',
      'breakfast bar',
    ],
    categories: ['kitchen'],
    description: 'Stoves, refrigerators, kitchen sinks, islands, espresso machines, and dining tables must be placed in the Kitchen only.',
  },
  {
    requiredRoom: 'Bedroom',
    allowedRooms: ['Bedroom'],
    keywords: [
      'bed',
      'daybed',
      'mattress',
      'bunk',
      'canopy',
      'crib',
      'wardrobe',
      'dresser',
      'armoire',
      'nightstand',
    ],
    categories: ['bedroom'],
    description: 'Beds, wardrobes, dressers, and nightstands must be placed in the Bedroom only.',
  },
  {
    requiredRoom: 'Study',
    allowedRooms: ['Study'],
    keywords: [
      'bookshelf',
      'bookcase',
      'library',
      'easel',
      'chess',
      'laptop',
      'computer',
      'desk',
      'workbench',
      'alchemy',
      'astrolabe',
      'telescope',
      'globe',
    ],
    categories: ['study'],
    description: 'Bookshelves, easels, chess tables, desks/laptops, workbenches, and study apparatus must be placed in the Study only.',
  },
  {
    requiredRoom: 'Yard',
    allowedRooms: ['Yard'],
    keywords: [
      'swimming pool',
      'backyard pool',
      'obj_pool',
      'wb_pool',
      'bbq',
      'barbecue',
      'smoker',
      'grill',
      'sunlounger',
      'sunbed',
      'fountain',
      'birdbath',
      'gazebo',
      'firepit',
    ],
    categories: ['outdoor'],
    description: 'Swimming pools, BBQ grills, sunloungers, and courtyard fountains must be placed outdoors in the Yard only.',
  },
  {
    requiredRoom: 'Basement',
    allowedRooms: ['Basement'],
    keywords: [
      'billiard',
      'pool table',
      'jukebox',
      'wurlitzer',
      'cellar',
      'restraint',
      'dungeon',
      'basement_',
    ],
    categories: ['basement'],
    description: 'Billiard tables, jukeboxes, cellar drafting tables, and dungeon fixtures must be placed in the Basement only.',
  },
  {
    requiredRoom: 'LivingRoom',
    allowedRooms: ['LivingRoom'],
    keywords: [
      'sofa',
      'couch',
      'sectional',
      'loveseat',
      'tv',
      'television',
      'flat-screen',
      'home theater',
      'fireplace',
      'hearth',
      'coffee_table',
      'coffee table',
      'stereo',
      'boombox',
      'turntable',
      'record player',
      'armchair',
      'recliner',
      'guitar',
      'piano',
      'harp',
      'arcade',
      'pinball',
      'newspaper',
    ],
    categories: ['living'],
    description: 'Sofas, TVs, fireplaces, coffee tables, stereos, armchairs, and parlor instruments must be placed in the Living Room only.',
  },
];

const ARCHITECTURAL_NON_FURNITURE_PART_TYPES = new Set([
  'WALL_SEGMENT',
  'WINDOW_GLASS',
  'DOOR_ARCH',
  'FLOOR_SLAB',
  'ROOF_PITCHED',
  'PILLAR_COLUMN',
  'STAIRCASE',
  'STAIRS',
  'ROOM_BLOCK',
  'DECK_PATIO',
]);

/**
 * Determines the required room for any furniture item or custom asset based on its ID, name, category, and partType.
 */
export function getRequiredRoomForFurniture(item: {
  id?: string;
  name?: string;
  category?: string;
  partType?: string;
  room?: string;
  gridPos?: { x: number; y: number; z: number };
}): {
  requiredRoom: RoomName;
  allowedRooms: RoomName[];
  isRoomRestricted: boolean;
  ruleReason: string;
} {
  const id = (item.id || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const text = `${id} ${name}`.trim();
  const category = (item.category || '').toLowerCase();
  const partType = (item.partType || '').toUpperCase();

  if (partType && ARCHITECTURAL_NON_FURNITURE_PART_TYPES.has(partType)) {
    const fallbackRoom = (item.room as RoomName) || 'LivingRoom';
    return {
      requiredRoom: fallbackRoom,
      allowedRooms: [
        'Kitchen',
        'LivingRoom',
        'Bedroom',
        'Bathroom',
        'Study',
        'Hallway',
        'SecondFloor',
        'Basement',
        'Yard',
      ],
      isRoomRestricted: false,
      ruleReason: 'Architectural structural parts can be placed anywhere on the lot.',
    };
  }

  if (partType === 'POOL') {
    return {
      requiredRoom: 'Yard',
      allowedRooms: ['Yard'],
      isRoomRestricted: true,
      ruleReason: 'Swimming pools must be placed outdoors in the Yard only.',
    };
  }

  if (id.includes('loft_bed')) {
    return {
      requiredRoom: 'SecondFloor',
      allowedRooms: ['SecondFloor', 'Bedroom'],
      isRoomRestricted: true,
      ruleReason: 'Loft beds belong in the Upstairs Loft or Bedroom only.',
    };
  }
  if (id.includes('balcony_chair')) {
    return {
      requiredRoom: 'SecondFloor',
      allowedRooms: ['SecondFloor', 'LivingRoom'],
      isRoomRestricted: true,
      ruleReason: 'Upstairs loft lounge chairs belong in the Upstairs Loft or Living Room only.',
    };
  }
  if (id.includes('loft_telescope')) {
    return {
      requiredRoom: 'SecondFloor',
      allowedRooms: ['SecondFloor', 'Study'],
      isRoomRestricted: true,
      ruleReason: 'Stargazer telescopes belong in the Upstairs Loft or Study only.',
    };
  }
  if (
    id.includes('basement_') ||
    id.includes('dungeon_restraint') ||
    text.includes('billiard') ||
    text.includes('pool table') ||
    text.includes('jukebox') ||
    text.includes('wurlitzer') ||
    text.includes('restraint') ||
    text.includes('cellar table') ||
    category === 'basement'
  ) {
    return {
      requiredRoom: 'Basement',
      allowedRooms: ['Basement'],
      isRoomRestricted: true,
      ruleReason: 'Basement rec-room, cellar, and dungeon fixtures must be placed in the Basement only.',
    };
  }

  if (id.includes('grandfather_clock') || text.includes('grandfather clock')) {
    return {
      requiredRoom: 'Hallway',
      allowedRooms: ['Hallway', 'LivingRoom'],
      isRoomRestricted: true,
      ruleReason: 'Grandfather clocks belong in the Central Hallway or Living Room.',
    };
  }

  if (
    id.includes('hall_') ||
    name.includes('hallway') ||
    (!category && (text.includes('planter') || text.includes('plant') || text.includes('monstera')))
  ) {
    const fallbackRoom = (item.room as RoomName) || 'LivingRoom';
    return {
      requiredRoom: fallbackRoom,
      allowedRooms: ['LivingRoom', 'Hallway', 'Study', 'Bedroom', 'Kitchen', 'Yard', 'SecondFloor'],
      isRoomRestricted: false,
      ruleReason: 'Decorative planters can be placed across interior corridors and rooms.',
    };
  }

  const keywordOrder: RoomName[] = [
    'Bathroom',
    'Kitchen',
    'Yard',
    'Bedroom',
    'Study',
    'LivingRoom',
    'Basement',
  ];

  for (const roomName of keywordOrder) {
    const rule = FURNITURE_ROOM_PLACEMENT_RULES.find((r) => r.requiredRoom === roomName);
    if (!rule) continue;
    for (const kw of rule.keywords) {
      if (kw === 'bed') {
        if (
          /\b(bed|beds|daybed|king bed|queen bed|twin bed|bunk bed|canopy bed|feather bed|loft bed)\b/i.test(name) ||
          id === 'obj_bed' ||
          id.endsWith('_bed') ||
          id.includes('bed_')
        ) {
          return {
            requiredRoom: rule.requiredRoom,
            allowedRooms: rule.allowedRooms,
            isRoomRestricted: true,
            ruleReason: rule.description,
          };
        }
        continue;
      }
      if (kw === 'tv') {
        if (/\btv\b/i.test(name) || id === 'obj_tv' || id.endsWith('_tv') || id.includes('tv_')) {
          return {
            requiredRoom: rule.requiredRoom,
            allowedRooms: rule.allowedRooms,
            isRoomRestricted: true,
            ruleReason: rule.description,
          };
        }
        continue;
      }
      if (text.includes(kw)) {
        return {
          requiredRoom: rule.requiredRoom,
          allowedRooms: rule.allowedRooms,
          isRoomRestricted: true,
          ruleReason: rule.description,
        };
      }
    }
  }

  if (/\bpool\b/i.test(name) || id === 'obj_pool' || id.endsWith('_pool')) {
    return {
      requiredRoom: 'Yard',
      allowedRooms: ['Yard'],
      isRoomRestricted: true,
      ruleReason: 'Swimming pools must be placed outdoors in the Yard only.',
    };
  }

  for (const rule of FURNITURE_ROOM_PLACEMENT_RULES) {
    if (category && rule.categories.includes(category)) {
      return {
        requiredRoom: rule.requiredRoom,
        allowedRooms: rule.allowedRooms,
        isRoomRestricted: true,
        ruleReason: rule.description,
      };
    }
  }

  const fallbackRoom: RoomName =
    item.room && STARTER_HOUSE_ROOM_BOUNDS[item.room as RoomName]
      ? (item.room as RoomName)
      : 'LivingRoom';

  return {
    requiredRoom: fallbackRoom,
    allowedRooms: [fallbackRoom],
    isRoomRestricted: false,
    ruleReason: `Assigned to ${fallbackRoom}.`,
  };
}

/**
 * Returns the active spatial floor bounds for a target RoomName, taking into account any custom ROOM_BLOCK parts
 * matching that room type or the starter house architectural floor slabs.
 */
export function getRoomPlacementBounds(
  room: RoomName,
  customParts: Array<{
    id: string;
    partType: string;
    label?: string;
    roomType?: string;
    gridPos: { x: number; y: number; z: number };
    width: number;
    depth: number;
    height?: number;
    rotationY?: number;
  }> = [],
  includeDefaultArchitecture: boolean = true,
  desiredPos?: { x: number; y: number; z: number }
): RoomPlacementBounds {
  const matchingBlocks = customParts.filter((p) => {
    if (p.partType !== 'ROOM_BLOCK') return false;
    if (p.roomType && p.roomType === room) return true;
    const lbl = (p.label || p.id || '').toLowerCase();
    if (room === 'Kitchen' && lbl.includes('kitchen')) return true;
    if (room === 'LivingRoom' && (lbl.includes('living') || lbl.includes('parlor'))) return true;
    if (room === 'Bedroom' && lbl.includes('bedroom')) return true;
    if (room === 'Bathroom' && lbl.includes('bathroom')) return true;
    if (room === 'Study' && lbl.includes('study')) return true;
    if (room === 'Hallway' && lbl.includes('hallway')) return true;
    if (room === 'Basement' && lbl.includes('basement')) return true;
    if (room === 'SecondFloor' && (lbl.includes('second') || lbl.includes('loft') || lbl.includes('upstairs'))) return true;
    return false;
  });

  if (matchingBlocks.length > 0) {
    let bestBlock = matchingBlocks[0];
    if (desiredPos && matchingBlocks.length > 1) {
      let bestDist = Infinity;
      for (const b of matchingBlocks) {
        const d = Math.hypot(desiredPos.x - b.gridPos.x, desiredPos.z - b.gridPos.z);
        if (d < bestDist) {
          bestDist = d;
          bestBlock = b;
        }
      }
    }
    const halfW = Math.max(1.2, (bestBlock.width || 6) * 0.5 - 0.35);
    const halfD = Math.max(1.2, (bestBlock.depth || 6) * 0.5 - 0.35);
    return {
      room,
      label: bestBlock.label || STARTER_HOUSE_ROOM_BOUNDS[room]?.label || room,
      minX: bestBlock.gridPos.x - halfW,
      maxX: bestBlock.gridPos.x + halfW,
      minZ: bestBlock.gridPos.z - halfD,
      maxZ: bestBlock.gridPos.z + halfD,
      y: bestBlock.gridPos.y || 0,
      centerX: bestBlock.gridPos.x,
      centerZ: bestBlock.gridPos.z,
    };
  }

  return STARTER_HOUSE_ROOM_BOUNDS[room] || STARTER_HOUSE_ROOM_BOUNDS.LivingRoom;
}

/**
 * Validates whether a furniture item is being placed in its required room and inside that room's spatial floor bounds.
 */
export function validateFurnitureRoomPlacement(
  item: {
    id?: string;
    name?: string;
    category?: string;
    partType?: string;
    room?: string;
  },
  desiredPos: { x: number; y: number; z: number },
  customParts: Array<{
    id: string;
    partType: string;
    label?: string;
    roomType?: string;
    gridPos: { x: number; y: number; z: number };
    width: number;
    depth: number;
    height?: number;
    rotationY?: number;
  }> = [],
  includeDefaultArchitecture: boolean = true
): {
  valid: boolean;
  requiredRoom: RoomName;
  allowedRooms: RoomName[];
  enforcedRoom: RoomName;
  isRoomRestricted: boolean;
  isInsideRequiredRoomBounds: boolean;
  reason: string;
} {
  const rule = getRequiredRoomForFurniture({ ...item, gridPos: desiredPos });
  const requestedRoom = (item.room as RoomName) || rule.requiredRoom;
  const enforcedRoom: RoomName = rule.isRoomRestricted
    ? rule.allowedRooms.includes(requestedRoom)
      ? requestedRoom
      : rule.requiredRoom
    : requestedRoom;

  const bounds = getRoomPlacementBounds(
    enforcedRoom,
    customParts,
    includeDefaultArchitecture,
    desiredPos
  );
  const profile = getObjectCollisionProfile(item);
  const padX = Math.min(profile.halfW, (bounds.maxX - bounds.minX) * 0.35);
  const padZ = Math.min(profile.halfD, (bounds.maxZ - bounds.minZ) * 0.35);

  const isInsideRequiredRoomBounds =
    desiredPos.x >= bounds.minX + padX - 0.15 &&
    desiredPos.x <= bounds.maxX - padX + 0.15 &&
    desiredPos.z >= bounds.minZ + padZ - 0.15 &&
    desiredPos.z <= bounds.maxZ - padZ + 0.15 &&
    Math.abs((desiredPos.y || 0) - bounds.y) <= 0.6;

  const roomLabelMatches = !rule.isRoomRestricted || rule.allowedRooms.includes(requestedRoom);
  const valid = roomLabelMatches && (!rule.isRoomRestricted || isInsideRequiredRoomBounds);

  let reason = rule.ruleReason;
  if (!roomLabelMatches) {
    reason = `${item.name || item.id || 'Furniture'} must be placed in ${enforcedRoom} (cannot be placed in ${requestedRoom}). ${rule.ruleReason}`;
  } else if (rule.isRoomRestricted && !isInsideRequiredRoomBounds) {
    reason = `${item.name || item.id || 'Furniture'} coordinates (${desiredPos.x.toFixed(1)}, ${desiredPos.z.toFixed(1)}) are outside ${enforcedRoom}; relocated inside ${enforcedRoom}.`;
  }

  return {
    valid,
    requiredRoom: rule.requiredRoom,
    allowedRooms: rule.allowedRooms,
    enforcedRoom,
    isRoomRestricted: rule.isRoomRestricted,
    isInsideRequiredRoomBounds,
    reason,
  };
}

/**
 * Checks whether a candidate non-toon object (furniture, appliance, architectural part, or prop)
 * overlaps/clips with any existing SmartObject, built-in wall/stairwell/fixture, or custom building part
 * on the same vertical story.
 */
export function checkNonToonObjectOverlap(
  candidate: {
    x: number;
    y: number;
    z: number;
    halfW: number;
    halfD: number;
    margin?: number;
    collisionType?: ObjectCollisionType;
  },
  existingObjects: SmartObject[],
  customParts: Array<{
    id: string;
    partType: string;
    gridPos: { x: number; y: number; z: number };
    width: number;
    depth: number;
    height?: number;
    rotationY?: number;
  }> = [],
  includeDefaultArchitecture: boolean = true,
  ignoreId?: string
): {
  colliding: boolean;
  collidingWithId?: string;
  collidingWithType?: ObjectCollisionType;
  penetrationX: number;
  penetrationZ: number;
} {
  const cMargin = candidate.margin ?? 0.18;

  // 1. Check against all existing SmartObjects on the same vertical floor
  for (const obj of existingObjects) {
    if (obj.id === ignoreId) continue;
    if (Math.abs((obj.gridPos.y || 0) - (candidate.y || 0)) > 1.8) continue;

    const prof = getObjectCollisionProfile(obj);
    if (!prof.blocksFurniturePlacement) continue;

    const reqW = candidate.halfW + prof.halfW + cMargin;
    const reqD = candidate.halfD + prof.halfD + cMargin;
    const dx = candidate.x - obj.gridPos.x;
    const dz = candidate.z - obj.gridPos.z;

    if (Math.abs(dx) < reqW && Math.abs(dz) < reqD) {
      return {
        colliding: true,
        collidingWithId: obj.id,
        collidingWithType: prof.collisionType,
        penetrationX: reqW - Math.abs(dx),
        penetrationZ: reqD - Math.abs(dz),
      };
    }
  }

  // 2. Check against built-in walls, stairwells, kitchen island, planters, and trees
  if (includeDefaultArchitecture && customParts.length === 0) {
    for (const fix of STATIC_HOUSE_FIXTURE_COLLIDERS) {
      if (fix.id === ignoreId) continue;
      if (Math.abs(fix.y - (candidate.y || 0)) > 1.8) continue;

      const wallMargin = fix.collisionType === 'ARCHITECTURAL_WALL' ? 0.04 : cMargin;
      const reqW = candidate.halfW + fix.halfW + wallMargin;
      const reqD = candidate.halfD + fix.halfD + wallMargin;
      const dx = candidate.x - fix.x;
      const dz = candidate.z - fix.z;

      if (Math.abs(dx) < reqW && Math.abs(dz) < reqD) {
        return {
          colliding: true,
          collidingWithId: fix.id,
          collidingWithType: fix.collisionType,
          penetrationX: reqW - Math.abs(dx),
          penetrationZ: reqD - Math.abs(dz),
        };
      }
    }
  }

  // 3. Check against custom World Builder placed parts on the same floor
  for (const part of customParts) {
    if (part.id === ignoreId) continue;
    if (Math.abs((part.gridPos.y || 0) - (candidate.y || 0)) > 1.8) continue;
    if (part.partType === 'ROOM_BLOCK') continue; // Room blocks contain furniture inside their floor slab

    const prof = getObjectCollisionProfile(part);
    const reqW = candidate.halfW + prof.halfW + 0.12;
    const reqD = candidate.halfD + prof.halfD + 0.12;
    const dx = candidate.x - part.gridPos.x;
    const dz = candidate.z - part.gridPos.z;

    if (Math.abs(dx) < reqW && Math.abs(dz) < reqD) {
      return {
        colliding: true,
        collidingWithId: part.id,
        collidingWithType: prof.collisionType,
        penetrationX: reqW - Math.abs(dx),
        penetrationZ: reqD - Math.abs(dz),
      };
    }
  }

  return { colliding: false, penetrationX: 0, penetrationZ: 0 };
}

/**
 * Resolves a non-clipping 3D position for any furniture item or non-toon world object.
 * Enforces strict room-specific furniture rules (beds in Bedroom, stove/fridge in Kitchen,
 * toilet/tub/shower in Bathroom, etc.) and uses spiral grid search + room-bounds clamping
 * so furniture & non-toon objects never clip into each other, walls, stairs, or outdoor trees.
 */
export function resolveNonToonObjectPlacement(
  desiredPos: { x: number; y: number; z: number },
  itemToPlace: {
    id: string;
    name?: string;
    category?: string;
    partType?: string;
    width?: number;
    depth?: number;
    height?: number;
    rotationY?: number;
    room?: string;
  },
  existingObjects: SmartObject[],
  customParts: Array<{
    id: string;
    partType: string;
    label?: string;
    roomType?: string;
    gridPos: { x: number; y: number; z: number };
    width: number;
    depth: number;
    height?: number;
    rotationY?: number;
  }> = [],
  includeDefaultArchitecture: boolean = true
): {
  safePos: { x: number; y: number; z: number };
  wasAdjusted: boolean;
  collisionType: ObjectCollisionType;
  avoidedObstacleIds: string[];
  enforcedRoom: RoomName;
  wasRoomEnforced: boolean;
  roomRuleMessage?: string;
} {
  const profile = getObjectCollisionProfile(itemToPlace);
  const avoided: string[] = [];

  const hasRoomBlocks = customParts.some((p) => p.partType === 'ROOM_BLOCK');
  const enforceRoomBounds = includeDefaultArchitecture || hasRoomBlocks;

  const roomRule = getRequiredRoomForFurniture({ ...itemToPlace, gridPos: desiredPos });
  const requestedRoom = (itemToPlace.room as RoomName) || roomRule.requiredRoom;
  const enforcedRoom: RoomName = roomRule.isRoomRestricted
    ? roomRule.allowedRooms.includes(requestedRoom)
      ? requestedRoom
      : roomRule.requiredRoom
    : requestedRoom;

  const targetRoomBounds = getRoomPlacementBounds(
    enforcedRoom,
    customParts,
    includeDefaultArchitecture,
    desiredPos
  );

  const y =
    enforceRoomBounds && roomRule.isRoomRestricted
      ? targetRoomBounds.y
      : enforcedRoom === 'SecondFloor'
      ? 2.95
      : enforcedRoom === 'Basement'
      ? -3.2
      : desiredPos.y;

  const clampToBounds = (px: number, pz: number) => {
    if (enforceRoomBounds && roomRule.isRoomRestricted) {
      const roomSpanX = Math.max(0.4, targetRoomBounds.maxX - targetRoomBounds.minX);
      const roomSpanZ = Math.max(0.4, targetRoomBounds.maxZ - targetRoomBounds.minZ);
      const padX = Math.min(profile.halfW, roomSpanX * 0.35);
      const padZ = Math.min(profile.halfD, roomSpanZ * 0.35);
      return {
        x: Math.max(targetRoomBounds.minX + padX, Math.min(targetRoomBounds.maxX - padX, px)),
        z: Math.max(targetRoomBounds.minZ + padZ, Math.min(targetRoomBounds.maxZ - padZ, pz)),
      };
    }

    if (hasRoomBlocks && customParts.length === 1 && customParts[0].partType === 'ROOM_BLOCK') {
      const rb = customParts[0];
      const hw = Math.max(0.8, rb.width * 0.5 - Math.min(profile.halfW, rb.width * 0.3));
      const hd = Math.max(0.8, rb.depth * 0.5 - Math.min(profile.halfD, rb.depth * 0.3));
      return {
        x: Math.max(rb.gridPos.x - hw, Math.min(rb.gridPos.x + hw, px)),
        z: Math.max(rb.gridPos.z - hd, Math.min(rb.gridPos.z + hd, pz)),
      };
    }

    if (y >= 1.5) {
      return {
        x: Math.max(-9.6 + profile.halfW, Math.min(-0.6 - profile.halfW, px)),
        z: Math.max(-6.5 + profile.halfD, Math.min(3.6 - profile.halfD, pz)),
      };
    }
    if (y <= -1.5) {
      return {
        x: Math.max(-9.6 + profile.halfW, Math.min(1.1 - profile.halfW, px)),
        z: Math.max(-5.1 + profile.halfD, Math.min(7.6 - profile.halfD, pz)),
      };
    }
    return {
      x: Math.max(-14.8 + profile.halfW, Math.min(14.8 - profile.halfW, px)),
      z: Math.max(-18.5 + profile.halfD, Math.min(14.5 - profile.halfD, pz)),
    };
  };

  const initialClamped = clampToBounds(desiredPos.x, desiredPos.z);
  const wasOutsideRoomSlab =
    enforceRoomBounds &&
    roomRule.isRoomRestricted &&
    (Math.abs(initialClamped.x - desiredPos.x) > 0.25 ||
      Math.abs(initialClamped.z - desiredPos.z) > 0.25 ||
      Math.abs(y - (desiredPos.y || 0)) > 0.5);

  const wasRoomEnforced =
    enforceRoomBounds &&
    roomRule.isRoomRestricted &&
    ((Boolean(itemToPlace.room) && !roomRule.allowedRooms.includes(itemToPlace.room as RoomName)) ||
      wasOutsideRoomSlab);

  const roomRuleMessage = wasRoomEnforced
    ? `${itemToPlace.name || itemToPlace.id} belongs in ${enforcedRoom} (${roomRule.ruleReason})`
    : undefined;

  const searchOrigin =
    wasOutsideRoomSlab &&
    Math.hypot(desiredPos.x - targetRoomBounds.centerX, desiredPos.z - targetRoomBounds.centerZ) >
      Math.max(targetRoomBounds.maxX - targetRoomBounds.minX, targetRoomBounds.maxZ - targetRoomBounds.minZ) * 0.75
      ? clampToBounds(targetRoomBounds.centerX, targetRoomBounds.centerZ)
      : initialClamped;

  let cx = searchOrigin.x;
  let cz = searchOrigin.z;

  const initialCheck = checkNonToonObjectOverlap(
    {
      x: cx,
      y,
      z: cz,
      halfW: profile.halfW,
      halfD: profile.halfD,
      margin: profile.margin,
      collisionType: profile.collisionType,
    },
    existingObjects,
    customParts,
    includeDefaultArchitecture,
    itemToPlace.id
  );

  if (!initialCheck.colliding) {
    return {
      safePos: {
        x: Math.round(cx * 100) / 100,
        y,
        z: Math.round(cz * 100) / 100,
      },
      wasAdjusted: cx !== desiredPos.x || cz !== desiredPos.z || y !== desiredPos.y || wasRoomEnforced,
      collisionType: profile.collisionType,
      avoidedObstacleIds: [],
      enforcedRoom,
      wasRoomEnforced,
      roomRuleMessage,
    };
  }

  if (initialCheck.collidingWithId) {
    avoided.push(initialCheck.collidingWithId);
  }

  const maxRings = 22;
  const step = 0.4;
  let bestFallbackCand: { x: number; z: number; pen: number } | null = null;

  for (let ring = 1; ring <= maxRings; ring++) {
    const radius = ring * step;
    const samples = ring * 12;
    for (let s = 0; s < samples; s++) {
      const angle = (s / samples) * Math.PI * 2;
      const cand = clampToBounds(
        searchOrigin.x + Math.cos(angle) * radius,
        searchOrigin.z + Math.sin(angle) * radius
      );
      const res = checkNonToonObjectOverlap(
        {
          x: cand.x,
          y,
          z: cand.z,
          halfW: profile.halfW,
          halfD: profile.halfD,
          margin: profile.margin,
          collisionType: profile.collisionType,
        },
        existingObjects,
        customParts,
        includeDefaultArchitecture,
        itemToPlace.id
      );
      if (!res.colliding) {
        return {
          safePos: {
            x: Math.round(cand.x * 100) / 100,
            y,
            z: Math.round(cand.z * 100) / 100,
          },
          wasAdjusted: true,
          collisionType: profile.collisionType,
          avoidedObstacleIds: Array.from(new Set(avoided)),
          enforcedRoom,
          wasRoomEnforced,
          roomRuleMessage,
        };
      } else {
        if (res.collidingWithId) {
          avoided.push(res.collidingWithId);
        }
        const distFromOrigin = Math.hypot(cand.x - searchOrigin.x, cand.z - searchOrigin.z);
        if (distFromOrigin >= 1.35) {
          const pen = res.penetrationX + res.penetrationZ;
          if (!bestFallbackCand || pen < bestFallbackCand.pen) {
            bestFallbackCand = { x: cand.x, z: cand.z, pen };
          }
        }
      }
    }
  }

  // Second pass with zero margin strictly inside the allowed room bounds for compact rooms (e.g. Bathroom)
  for (let ring = 1; ring <= maxRings; ring++) {
    const radius = ring * 0.35;
    const samples = ring * 12;
    for (let s = 0; s < samples; s++) {
      const angle = (s / samples) * Math.PI * 2;
      const cand = clampToBounds(
        searchOrigin.x + Math.cos(angle) * radius,
        searchOrigin.z + Math.sin(angle) * radius
      );
      const res = checkNonToonObjectOverlap(
        {
          x: cand.x,
          y,
          z: cand.z,
          halfW: profile.halfW * 0.85,
          halfD: profile.halfD * 0.85,
          margin: 0,
          collisionType: profile.collisionType,
        },
        existingObjects,
        customParts,
        includeDefaultArchitecture,
        itemToPlace.id
      );
      if (!res.colliding) {
        return {
          safePos: {
            x: Math.round(cand.x * 100) / 100,
            y,
            z: Math.round(cand.z * 100) / 100,
          },
          wasAdjusted: true,
          collisionType: profile.collisionType,
          avoidedObstacleIds: Array.from(new Set(avoided)),
          enforcedRoom,
          wasRoomEnforced,
          roomRuleMessage,
        };
      }
    }
  }

  const finalX = bestFallbackCand ? bestFallbackCand.x : cx;
  const finalZ = bestFallbackCand ? bestFallbackCand.z : cz;

  return {
    safePos: {
      x: Math.round(finalX * 100) / 100,
      y,
      z: Math.round(finalZ * 100) / 100,
    },
    wasAdjusted: true,
    collisionType: profile.collisionType,
    avoidedObstacleIds: Array.from(new Set(avoided)),
    enforcedRoom,
    wasRoomEnforced,
    roomRuleMessage,
  };
}

/**
 * Sanitizes an array of SmartObjects so no two furniture pieces or non-toon props on the same floor
 * ever clip into each other, walls, or staircases, and every room-specific furniture item is in its valid room.
 */
export function declipAllSmartObjects(
  objects: SmartObject[],
  customParts: Array<{
    id: string;
    partType: string;
    label?: string;
    roomType?: string;
    gridPos: { x: number; y: number; z: number };
    width: number;
    depth: number;
    height?: number;
    rotationY?: number;
  }> = [],
  includeDefaultArchitecture: boolean = true
): SmartObject[] {
  const placed: SmartObject[] = [];
  const enforceRoomBounds =
    includeDefaultArchitecture || customParts.some((p) => p.partType === 'ROOM_BLOCK');
  for (const obj of objects) {
    const resolved = resolveNonToonObjectPlacement(
      obj.gridPos,
      obj,
      placed,
      customParts,
      includeDefaultArchitecture
    );
    placed.push({
      ...obj,
      room: enforceRoomBounds ? resolved.enforcedRoom : obj.room,
      gridPos: resolved.safePos,
    });
  }
  return placed;
}


/**
 * Computes the proper standing/sitting interaction position and facing target for a SmartObject.
 * Prevents characters from standing inside TV stands, tables, barstools, or countertops,
 * and spaces multiple character slots cleanly so toons never stack on the same point!
 */
export function getInteractionApproachPoint(
  obj: SmartObject,
  slotIndex: number = 0
): { pos: { x: number; y: number; z: number }; lookAtPos: { x: number; y: number; z: number } } {
  const id = obj.id.toLowerCase();
  const gx = obj.gridPos.x;
  const gy = obj.gridPos.y;
  const gz = obj.gridPos.z;
  const box = getSmartObjectCollisionBox(obj);
  // Generous 1.45m spacing between slots (-1.45, 0, +1.45, +2.9) so multiple toons never overlap
  const slotOffsets = [0, -1.45, 1.45, -2.85, 2.85];
  const lateralOffset = slotOffsets[Math.abs(slotIndex) % slotOffsets.length];

  // 1. Watching TV: Stand/sit back at the sofa & parlor rug area (z = -3.6), NEVER on the TV stand (z = -7)!
  if (id.includes('tv')) {
    return {
      pos: { x: gx - 0.8 + lateralOffset, y: gy, z: gz + 3.2 },
      lookAtPos: { x: gx, y: gy + 1.1, z: gz },
    };
  }

  // 2. Sofa / Bed / Bathtub / Pool: sit/lie on the cushion/water surface with distinct lateral slot
  if (id.includes('sofa') || id.includes('armchair')) {
    return {
      pos: { x: gx + lateralOffset * 0.85, y: gy, z: gz + 0.35 },
      lookAtPos: { x: gx, y: gy + 1.0, z: gz - 3.0 },
    };
  }
  if (id.includes('bed')) {
    return {
      pos: { x: gx + lateralOffset * 0.75, y: gy, z: gz },
      lookAtPos: { x: gx, y: gy + 1.0, z: gz - 2.0 },
    };
  }
  if (id.includes('pool')) {
    return {
      pos: { x: gx + lateralOffset * 1.4, y: gy, z: gz },
      lookAtPos: { x: gx, y: gy, z: gz + 3.0 },
    };
  }

  // 3. Dining Table / Kitchen Island / Coffee Table: stand/sit around the outer perimeter, outside the table mesh
  if (id.includes('dining_table') || id.includes('island') || id.includes('coffee_table') || id.includes('dining')) {
    const perimeterAngles = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
    const ang = perimeterAngles[Math.abs(slotIndex) % perimeterAngles.length];
    return {
      pos: {
        x: gx + Math.sin(ang) * (box.halfW + 0.68),
        y: gy,
        z: gz + Math.cos(ang) * (box.halfD + 0.68),
      },
      lookAtPos: { x: gx, y: gy + 0.9, z: gz },
    };
  }

  // 4. North Wall Appliances (Fridge, Stove, Espresso): stand South (+Z) outside collision box facing North (-Z)
  if (id.includes('fridge') || id.includes('stove') || id.includes('espresso')) {
    return {
      pos: { x: gx + lateralOffset * 0.65, y: gy, z: gz + box.halfD + 0.68 },
      lookAtPos: { x: gx, y: gy + 1.1, z: gz },
    };
  }

  // 5. West Wall Furniture (Bookshelf): stand East (+X) outside collision box facing West (-X)
  if (id.includes('bookshelf') || id.includes('library')) {
    return {
      pos: { x: gx + box.halfW + 0.68, y: gy, z: gz + lateralOffset * 0.65 },
      lookAtPos: { x: gx, y: gy + 1.2, z: gz },
    };
  }

  // 6. East Wall Furniture (Arcade, Plant, Fireplace): stand West (-X) outside collision box facing East (+X)
  if (id.includes('arcade') || id.includes('plant') || id.includes('fireplace')) {
    return {
      pos: { x: gx - (box.halfW + 0.68), y: gy, z: gz + lateralOffset * 0.65 },
      lookAtPos: { x: gx, y: gy + 1.2, z: gz },
    };
  }

  // 7. Default Furniture (Easel, Laptop Desk, Newspaper Stand, Grandfather Clock, BBQ): stand in front outside collision box
  return {
    pos: { x: gx + lateralOffset * 0.65, y: gy, z: gz - (box.halfD + 0.68) },
    lookAtPos: { x: gx, y: gy + 1.0, z: gz },
  };
}

/**
 * Helper to push a 2D point (rx, rz) with radius `charRadius` outside an axis-aligned bounding box
 * centered at (bx, bz) with half-extents (halfW, halfD).
 */
function pushOutOfAABB(
  rx: number,
  rz: number,
  charRadius: number,
  bx: number,
  bz: number,
  halfW: number,
  halfD: number
): { x: number; z: number } {
  const expandW = halfW + charRadius;
  const expandD = halfD + charRadius;
  const dx = rx - bx;
  const dz = rz - bz;

  if (Math.abs(dx) < expandW && Math.abs(dz) < expandD) {
    const overlapX = expandW - Math.abs(dx);
    const overlapZ = expandD - Math.abs(dz);
    if (overlapX < overlapZ) {
      const signX = dx >= 0 ? 1 : -1;
      return { x: bx + signX * (expandW + 0.03), z: rz };
    } else {
      const signZ = dz >= 0 ? 1 : -1;
      return { x: rx, z: bz + signZ * (expandD + 0.03) };
    }
  }
  return { x: rx, z: rz };
}

/**
 * Deterministic hash angle in [0, 2π) for breaking exact-same-spot ties between two characters.
 */
function deterministicPairAngle(idA: string = 'a', idB: string = 'b'): number {
  const str = `${idA}:${idB}`;
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 360) * (Math.PI / 180);
}

/**
 * Resolves 2D asset & character collisions between a character's current/target position,
 * all SmartObjects on the same floor, built-in architectural fixtures, World Builder parts,
 * and other characters on the lot (enforcing a strict >= 1.35m personal space separation
 * even if two toons start at the exact same coordinates).
 */
export function resolveFurnitureCollision(
  nextPos: { x: number; y: number; z: number },
  smartObjects: SmartObject[],
  activeObjectId?: string,
  otherCharacters: Character[] = [],
  selfCharId?: string,
  placedBuildingParts: Array<{
    id: string;
    partType: string;
    gridPos: { x: number; y: number; z: number };
    width: number;
    depth: number;
    rotationY?: number;
  }> = [],
  includeStaticHouseFixtures: boolean = true
): { x: number; y: number; z: number } {
  let rx = nextPos.x;
  let rz = nextPos.z;
  const charRadius = 0.42;
  const minToonSeparation = 1.35;

  // Run 2 solver passes so pushing away from a toon doesn't push into furniture and vice versa
  for (let pass = 0; pass < 2; pass++) {
    // 1. Character-to-Character Personal Space Separation (>= 1.35m)
    for (const other of otherCharacters) {
      if (!other.onGrid || other.id === selfCharId) continue;
      if (Math.abs((other.pos.y || 0) - (nextPos.y || 0)) > 1.5) continue;

      const dx = rx - other.pos.x;
      const dz = rz - other.pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < minToonSeparation) {
        if (dist < 0.01) {
          // Exact same spot! Push apart deterministically by full minToonSeparation
          const ang = deterministicPairAngle(selfCharId || 'self', other.id);
          rx += Math.cos(ang) * (minToonSeparation + 0.05);
          rz += Math.sin(ang) * (minToonSeparation + 0.05);
        } else {
          const push = (minToonSeparation - dist) + 0.03;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        }
      }
    }

    // 2. SmartObject Furniture Collision (AABB + Radial footprint)
    for (const obj of smartObjects) {
      if (Math.abs((obj.gridPos.y || 0) - (nextPos.y || 0)) > 1.5) continue;

      // Allow sitting/sleeping on sofa, bed, bathtub, shower, or pool when it's the active target (or sitting on the sofa while watching TV)
      const id = obj.id.toLowerCase();
      const activeLower = (activeObjectId || '').toLowerCase();
      if (
        (obj.id === activeObjectId &&
          (id.includes('sofa') ||
            id.includes('armchair') ||
            id.includes('bed') ||
            id.includes('bathtub') ||
            id.includes('shower') ||
            id.includes('pool'))) ||
        (activeLower.includes('tv') && (id.includes('sofa') || id.includes('armchair')))
      ) {
        continue;
      }

      const box = getSmartObjectCollisionBox(obj);
      if (box.radius <= 0) continue;

      // First resolve rectangular AABB collision for wide/deep assets
      const afterBox = pushOutOfAABB(
        rx,
        rz,
        charRadius,
        obj.gridPos.x,
        obj.gridPos.z,
        box.halfW,
        box.halfD
      );
      rx = afterBox.x;
      rz = afterBox.z;

      // Also enforce radial clearance around the asset center
      const minDist = box.radius + charRadius * 0.65;
      const dx = rx - obj.gridPos.x;
      const dz = rz - obj.gridPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < minDist) {
        if (dist < 0.001) {
          rx += minDist + 0.05;
        } else {
          const push = minDist - dist + 0.03;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        }
      }
    }

    // 3. Static Starter House Architectural Fixtures (Kitchen Island, Fireplace Hearth, Vanity)
    if (includeStaticHouseFixtures) {
      for (const fix of STATIC_HOUSE_FIXTURE_COLLIDERS) {
        if (!fix.blocksToons) continue;
        if (Math.abs(fix.y - (nextPos.y || 0)) > 1.5) continue;
        const pushed = pushOutOfAABB(rx, rz, charRadius, fix.x, fix.z, fix.halfW, fix.halfD);
        rx = pushed.x;
        rz = pushed.z;
      }
    }

    // 4. World Builder Placed Architectural & Landscaping Parts (Walls, Room Blocks, Pillars, Trees, Planters, Fireplaces, Stairs)
    for (const part of placedBuildingParts) {
      if (Math.abs((part.gridPos.y || 0) - (nextPos.y || 0)) > 1.5) continue;
      const pt = (part.partType || '').toUpperCase();
      const rot = Math.abs(part.rotationY || 0) % Math.PI;
      const isRotated90 = rot > Math.PI * 0.25 && rot < Math.PI * 0.75;
      const rawW = part.width || 1.0;
      const rawD = part.depth || 1.0;
      const effW = isRotated90 ? rawD : rawW;
      const effD = isRotated90 ? rawW : rawD;

      if (pt === 'ROOM_BLOCK') {
        const wallHalf = 0.14;
        const halfW = effW * 0.5;
        const halfD = effD * 0.5;
        const gx = part.gridPos.x;
        const gz = part.gridPos.z;
        // North wall (z = gz - halfD)
        let pushed = pushOutOfAABB(rx, rz, charRadius * 0.6, gx, gz - halfD, halfW, wallHalf);
        rx = pushed.x;
        rz = pushed.z;
        // West wall (x = gx - halfW)
        pushed = pushOutOfAABB(rx, rz, charRadius * 0.6, gx - halfW, gz, wallHalf, halfD);
        rx = pushed.x;
        rz = pushed.z;
        // East wall (x = gx + halfW)
        pushed = pushOutOfAABB(rx, rz, charRadius * 0.6, gx + halfW, gz, wallHalf, halfD);
        rx = pushed.x;
        rz = pushed.z;
        // South wall with 1.5m center doorway gap at (gx, gz + halfD)
        const doorHalf = 0.75;
        const sideSpan = Math.max(0, halfW - doorHalf);
        if (sideSpan > 0.15) {
          pushed = pushOutOfAABB(
            rx,
            rz,
            charRadius * 0.6,
            gx - (doorHalf + sideSpan * 0.5),
            gz + halfD,
            sideSpan * 0.5,
            wallHalf
          );
          rx = pushed.x;
          rz = pushed.z;
          pushed = pushOutOfAABB(
            rx,
            rz,
            charRadius * 0.6,
            gx + (doorHalf + sideSpan * 0.5),
            gz + halfD,
            sideSpan * 0.5,
            wallHalf
          );
          rx = pushed.x;
          rz = pushed.z;
        }
        continue;
      }

      if (
        pt === 'WALL_SEGMENT' ||
        pt === 'WALL' ||
        pt === 'PILLAR' ||
        pt === 'TREE' ||
        pt === 'SHRUB_FLOWER' ||
        pt === 'FIREPLACE' ||
        pt === 'FENCE' ||
        pt === 'STAIRCASE'
      ) {
        const halfW = Math.max(0.18, effW * 0.45);
        const halfD = Math.max(0.18, effD * 0.45);
        const pushed = pushOutOfAABB(
          rx,
          rz,
          charRadius,
          part.gridPos.x,
          part.gridPos.z,
          halfW,
          halfD
        );
        rx = pushed.x;
        rz = pushed.z;
      }
    }
  }

  // Clamp within walkable story bounds (Upstairs Loft, Subterranean Basement, or Ground Lot)
  if ((nextPos.y || 0) >= 1.5) {
    rx = Math.max(-8.3, Math.min(-1.7, rx));
    rz = Math.max(-5.8, Math.min(0.8, rz));
  } else if ((nextPos.y || 0) <= -1.5) {
    rx = Math.max(-7.6, Math.min(5.6, rx));
    rz = Math.max(-5.6, Math.min(4.6, rz));
  } else {
    rx = Math.max(-15.5, Math.min(15.5, rx));
    rz = Math.max(-16.5, Math.min(15.5, rz));
  }

  return { x: rx, y: nextPos.y, z: rz };
}

/**
 * Pure, deterministic 2D screen-space chat bubble layout solver.
 * Takes desired bubble screen coordinates (in percentage 0..100) and guarantees
 * zero rectangular overlap between any two chat bubbles on screen.
 */
export interface ScreenBubbleInput {
  id: string;
  rawLeftPct: number;
  rawTopPct: number;
  priority: number; // Higher priority (e.g. active speaker or selected toon) anchors first
}

export interface ScreenBubblePlacement {
  id: string;
  leftPct: number;
  topPct: number;
}

export function layoutNonOverlappingBubbles(
  inputs: ScreenBubbleInput[],
  minHorizontalGapPct: number = 22,
  minVerticalGapPct: number = 13
): ScreenBubblePlacement[] {
  const sorted = [...inputs].sort((a, b) => b.priority - a.priority);
  const placed: ScreenBubblePlacement[] = [];

  for (const item of sorted) {
    let left = Math.max(12, Math.min(88, item.rawLeftPct));
    let top = Math.max(14, Math.min(82, item.rawTopPct));

    // Iteratively resolve any 2D bounding-box overlap with already placed higher-priority bubbles
    for (let iter = 0; iter < 8; iter++) {
      let hadOverlap = false;
      for (const other of placed) {
        const dx = left - other.leftPct;
        const dy = top - other.topPct;
        if (Math.abs(dx) < minHorizontalGapPct && Math.abs(dy) < minVerticalGapPct) {
          hadOverlap = true;
          // Shift vertically upward (or downward if near top edge) and spread horizontally
          if (other.topPct > 28) {
            top = other.topPct - (minVerticalGapPct + 1.5);
          } else {
            top = other.topPct + (minVerticalGapPct + 1.5);
          }
          const hSign = dx >= 0 ? 1 : -1;
          left = Math.max(12, Math.min(88, left + hSign * 4.5));
          top = Math.max(12, Math.min(84, top));
        }
      }
      if (!hadOverlap) break;
    }

    placed.push({ id: item.id, leftPct: left, topPct: top });
  }

  return placed;
}

/**
 * Generates a concise human-readable reason for why a smart object interaction
 * is scheduled in a character's upcoming Life Flow queue.
 */
export function describeScheduledInteractionReason(
  char: Pick<Character, 'traits' | 'motives' | 'intelligenceScore' | 'knowledgebase' | 'dailyAspirations'>,
  obj: SmartObject
): string {
  const aspEval = evaluateDailyAspirationDecisionBonus(char, obj);
  if (aspEval.matchedAspiration) {
    return `Daily Aspiration: ${aspEval.matchedAspiration.title}`;
  }

  const kbEval = evaluateKnowledgeDrivenDecisionBonus(char, obj, char.motives);
  if (kbEval.matchedHeuristic) {
    return kbEval.matchedHeuristic;
  }

  const effectEntries = Object.entries(obj.effects).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0
  );
  effectEntries.sort((a, b) => b[1] - a[1]);

  // Highlight trait affinity when applicable
  if (
    (char.traits.includes('Artistic') || char.traits.includes('Creative')) &&
    (obj.id.includes('easel') || obj.id.includes('guitar'))
  ) {
    return 'Creative Persona Flow';
  }
  if (char.traits.includes('Bookworm') && (obj.id.includes('bookshelf') || obj.id.includes('newspaper'))) {
    return 'Knowledge Acquisition Flow';
  }
  if (char.traits.includes('Foodie') && (obj.id.includes('stove') || obj.id.includes('espresso') || obj.id.includes('dining'))) {
    return 'Culinary Routine';
  }
  if (char.traits.includes('Workaholic') && obj.id.includes('laptop')) {
    return 'Career Ambition';
  }

  if (effectEntries.length > 0) {
    const [topStat, topGain] = effectEntries[0];
    const label = topStat.charAt(0).toUpperCase() + topStat.slice(1);
    return `Replenish ${label} (+${topGain}%)`;
  }

  return 'Daily Life Flow';
}

/**
 * Builds or replenishes a character's upcoming Life Flow queue of scheduled SmartObject
 * interactions up to `targetCount` (default 3). Preserves existing queued items (including
 * player-queued commands) and simulates forward motive needs + knowledgebase intelligence
 * so each subsequent queued interaction forms a coherent multi-hour daily routine.
 */
export function buildAutonomousLifeFlowQueue(
  char: Character,
  smartObjects: SmartObject[],
  targetCount: number = 3,
  isDarkMode: boolean = false
): ScheduledInteraction[] {
  const available = smartObjects.filter(
    (o) => o.maturity === 'ALL' || (o.maturity === 'DARK_ONLY' && isDarkMode)
  );
  if (available.length === 0) return [];

  // Keep existing valid queued interactions
  const queue: ScheduledInteraction[] = (char.interactionQueue || []).filter((item) =>
    available.some((o) => o.id === item.objectId)
  );

  // Project motives forward through current active object + already queued items
  const simulatedMotives: Motives = { ...char.motives };
  const applyEffectsAndDecay = (obj: SmartObject) => {
    const hours = Math.max(1, obj.durationSeconds / 3600);
    simulatedMotives.hunger = Math.max(5, simulatedMotives.hunger - hours * 5);
    simulatedMotives.energy = Math.max(5, simulatedMotives.energy - hours * 4);
    simulatedMotives.bladder = Math.max(5, simulatedMotives.bladder - hours * 6);
    simulatedMotives.hygiene = Math.max(5, simulatedMotives.hygiene - hours * 3);
    simulatedMotives.social = Math.max(5, simulatedMotives.social - hours * 4);
    simulatedMotives.fun = Math.max(5, simulatedMotives.fun - hours * 3);

    Object.entries(obj.effects).forEach(([stat, val]) => {
      const k = stat as keyof Motives;
      if (typeof val === 'number' && typeof simulatedMotives[k] === 'number') {
        simulatedMotives[k] = Math.max(0, Math.min(100, simulatedMotives[k] + val));
      }
    });
  };

  if (char.activeObjectId) {
    const activeObj = available.find((o) => o.id === char.activeObjectId);
    if (activeObj) applyEffectsAndDecay(activeObj);
  }
  for (const existing of queue) {
    const existingObj = available.find((o) => o.id === existing.objectId);
    if (existingObj) applyEffectsAndDecay(existingObj);
  }

  const forbiddenIds = new Set<string>();
  if (char.activeObjectId) forbiddenIds.add(char.activeObjectId);
  for (const item of queue) forbiddenIds.add(item.objectId);

  let stepIndex = queue.length;
  while (queue.length < targetCount) {
    const lastObjectId =
      queue.length > 0 ? queue[queue.length - 1].objectId : char.activeObjectId || '';

    // Score each candidate smart object against projected motives + character traits + Knowledgebase IQ + Daily Aspirations
    let bestObj: SmartObject | null = null;
    let bestScore = -Infinity;

    for (let i = 0; i < available.length; i++) {
      const candidate = available[i];
      if (candidate.id === lastObjectId && available.length > 1) continue;

      let score = 0;
      if (!forbiddenIds.has(candidate.id)) {
        score += 35; // Strong preference for non-repeating variety across the queue
      }

      Object.entries(candidate.effects).forEach(([stat, val]) => {
        const k = stat as keyof Motives;
        if (typeof val === 'number' && typeof simulatedMotives[k] === 'number') {
          const deficit = 100 - simulatedMotives[k];
          if (val > 0) {
            score += (deficit / 100) * val * 1.4;
          } else {
            score += val * 0.4;
          }
        }
      });

      // Trait bonuses
      if (
        (char.traits.includes('Artistic') || char.traits.includes('Creative')) &&
        (candidate.id.includes('easel') || candidate.id.includes('guitar'))
      ) {
        score += 18;
      }
      if (
        char.traits.includes('Bookworm') &&
        (candidate.id.includes('bookshelf') || candidate.id.includes('newspaper'))
      ) {
        score += 18;
      }
      if (
        char.traits.includes('Foodie') &&
        (candidate.id.includes('stove') || candidate.id.includes('dining') || candidate.id.includes('espresso'))
      ) {
        score += 16;
      }
      if (char.traits.includes('Neat') && (candidate.id.includes('sink') || candidate.id.includes('bathtub'))) {
        score += 14;
      }

      // Personal Bed Ownership & Tired/Awakeness Stat Priority:
      // Each toon strongly prefers their own assigned bed and avoids another toon's claimed bed
      const isBedCandidate =
        candidate.id.toLowerCase().includes('bed') ||
        candidate.name.toLowerCase().includes('bed') ||
        candidate.actionLabel.toLowerCase().includes('sleep');
      if (isBedCandidate) {
        const isMyPersonalBed =
          candidate.assignedToonId === char.id ||
          (char.assignedBedId && candidate.id === char.assignedBedId);
        const belongsToAnotherToon =
          Boolean(candidate.assignedToonId && candidate.assignedToonId !== char.id);
        if (isMyPersonalBed) {
          score += simulatedMotives.energy < 65 ? 55 : 22;
        } else if (belongsToAnotherToon) {
          score -= 80;
        }
      }

      // Daily Aspiration Autonomous Goal Priority Bonus
      const aspEval = evaluateDailyAspirationDecisionBonus(char, candidate);
      score += aspEval.bonusScore;

      // Knowledgebase & Intelligence Decision-Making Bonus (from Real Books & World Event Data)
      const kbEval = evaluateKnowledgeDrivenDecisionBonus(
        char,
        candidate,
        simulatedMotives
      );
      score += kbEval.bonusScore;

      // Deterministic tie-breaker offset by character ID, stepIndex, & knowledge data points so decisions evolve
      const charHash = char.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const dataPoints = char.knowledgebase?.totalDataPointsProcessed || 0;
      score += ((charHash + i * 7 + stepIndex * 13 + dataPoints * 5) % 11) * 0.9;

      if (score > bestScore) {
        bestScore = score;
        bestObj = candidate;
      }
    }

    const picked = bestObj || available[stepIndex % available.length];
    const durationSeconds = Math.max(3600, picked.durationSeconds);
    const reason = describeScheduledInteractionReason(
      {
        traits: char.traits,
        motives: simulatedMotives,
        intelligenceScore: char.intelligenceScore,
        knowledgebase: char.knowledgebase,
        dailyAspirations: char.dailyAspirations,
      },
      picked
    );

    queue.push({
      id: `q_${char.id}_${picked.id}_${stepIndex}_${queue.length}`,
      objectId: picked.id,
      objectName: picked.name,
      room: picked.room,
      actionLabel: picked.actionLabel,
      durationSeconds,
      reason,
      source: 'AUTONOMOUS',
    });

    forbiddenIds.add(picked.id);
    applyEffectsAndDecay(picked);
    stepIndex++;
  }

  return queue;
}

/**
 * Enqueues a SmartObject interaction into a character's Life Flow queue.
 * When `source === 'PLAYER_QUEUED'`, it is inserted right after any existing player-queued
 * items (ahead of autonomous schedule items) so player-scheduled life flow steps take priority.
 */
export function enqueueSmartObjectInteraction(
  queue: ScheduledInteraction[],
  obj: SmartObject,
  source: 'AUTONOMOUS' | 'PLAYER_QUEUED' = 'PLAYER_QUEUED',
  customReason?: string,
  maxQueueLength: number = 5
): ScheduledInteraction[] {
  const newItem: ScheduledInteraction = {
    id: `q_${obj.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    objectId: obj.id,
    objectName: obj.name,
    room: obj.room,
    actionLabel: obj.actionLabel,
    durationSeconds: Math.max(3600, obj.durationSeconds),
    reason: customReason || (source === 'PLAYER_QUEUED' ? 'Scheduled by Player' : 'Autonomous Routine'),
    source,
  };

  if (source === 'PLAYER_QUEUED') {
    const playerItems = queue.filter((item) => item.source === 'PLAYER_QUEUED');
    const autoItems = queue.filter(
      (item) => item.source !== 'PLAYER_QUEUED' && item.objectId !== obj.id
    );
    return [...playerItems, newItem, ...autoItems].slice(0, maxQueueLength);
  }

  return [...queue, newItem].slice(0, maxQueueLength);
}

/**
 * Removes a scheduled interaction by its queue item ID.
 */
export function removeScheduledInteraction(
  queue: ScheduledInteraction[],
  itemId: string
): ScheduledInteraction[] {
  return queue.filter((item) => item.id !== itemId);
}

/**
 * Promotes a scheduled interaction to index 0 ("Up Next") of the character's Life Flow queue.
 */
export function promoteScheduledInteraction(
  queue: ScheduledInteraction[],
  itemId: string
): ScheduledInteraction[] {
  const idx = queue.findIndex((item) => item.id === itemId);
  if (idx <= 0) return [...queue];
  const target = { ...queue[idx], source: 'PLAYER_QUEUED' as const };
  const rest = queue.filter((_, i) => i !== idx);
  return [target, ...rest];
}

/**
 * Pops the next valid scheduled SmartObject interaction from the front of the character's queue.
 */
export function dequeueNextScheduledInteraction(
  queue: ScheduledInteraction[],
  smartObjects: SmartObject[]
): {
  nextItem: ScheduledInteraction | null;
  nextObject: SmartObject | null;
  remainingQueue: ScheduledInteraction[];
} {
  if (!queue || queue.length === 0) {
    return { nextItem: null, nextObject: null, remainingQueue: [] };
  }

  for (let i = 0; i < queue.length; i++) {
    const candidate = queue[i];
    const foundObj = smartObjects.find((o) => o.id === candidate.objectId);
    if (foundObj) {
      return {
        nextItem: candidate,
        nextObject: foundObj,
        remainingQueue: queue.slice(i + 1),
      };
    }
  }

  return { nextItem: null, nextObject: null, remainingQueue: [] };
}

/**
 * Permanently imprints a Good or Bad personality trait onto a character as a result of a House Event task
 * (such as eating a specific food, drinking midnight espresso, or investigating an anomaly).
 */
export function imprintEventPersonalityOnCharacter(
  character: Character,
  imprint: {
    traitName: string;
    polarity: 'GOOD' | 'BAD';
    originEventTitle: string;
    assignedTaskLabel: string;
    timestamp: string;
  }
): Character {
  const existingTraits = character.traits || [];
  const nextTraits = existingTraits.includes(imprint.traitName)
    ? existingTraits
    : [...existingTraits, imprint.traitName].slice(-7);

  const existingQuirks = character.acquiredQuirks || [];
  const newQuirk: AcquiredPersonalityQuirk = {
    id: `quirk_${Date.now().toString(36)}_${Math.floor(Math.random() * 999)}`,
    traitName: imprint.traitName,
    polarity: imprint.polarity,
    originEventTitle: imprint.originEventTitle,
    assignedTaskLabel: imprint.assignedTaskLabel,
    timestamp: imprint.timestamp,
  };

  const filteredQuirks = existingQuirks.filter((q) => q.traitName !== imprint.traitName);
  const nextQuirks = [...filteredQuirks, newQuirk].slice(-8);

  return {
    ...character,
    traits: nextTraits,
    acquiredQuirks: nextQuirks,
    privateMemory: [
      ...character.privateMemory.slice(-20),
      `[PERSONALITY IMPRINT • ${imprint.polarity}] Acquired "${imprint.traitName}" after "${imprint.assignedTaskLabel}" (${imprint.originEventTitle}).`,
    ],
  };
}

const SUCCESSOR_FIRST_NAMES = [
  'Clara',
  'Julian',
  'Nora',
  'Sebastian',
  'Iris',
  'Theo',
  'Maeve',
  'Gideon',
  'Hazel',
  'Felix',
  'Lydia',
  'Rowan',
];

const SUCCESSOR_GOALS = [
  'Carry On the Estate Architectural Legacy',
  'Master the Culinary & Espresso Arts',
  'Uncover Every Cross-World Secret of The House',
  'Curate a Three-Story Masterpiece Home',
];

/**
 * Spawns an autonomous successor/descendant resident when a toon passes away,
 * ensuring the world and household progress across generations with zero user intervention required.
 */
export function spawnAutonomousSuccessorToon(
  deceased: Character,
  existingCharacters: Character[],
  smartObjects: SmartObject[],
  isDarkMode: boolean = false,
  seedIndex: number = 0
): Character {
  const lastName = deceased.name.split(' ').slice(1).join(' ') || 'Vance';
  const usedFirstNames = new Set(
    existingCharacters.map((c) => c.name.split(' ')[0])
  );
  const availableFirst =
    SUCCESSOR_FIRST_NAMES.find((n) => !usedFirstNames.has(n)) ||
    SUCCESSOR_FIRST_NAMES[seedIndex % SUCCESSOR_FIRST_NAMES.length];
  const fullName = `${availableFirst} ${lastName}`;
  const nextGen = (deceased.lineageGeneration || 1) + 1;

  // Inherit one signature trait from the deceased + one fresh trait
  const inheritedTrait = deceased.traits[0] || 'Ambitious';
  const secondaryPool = ['Builder', 'Creative', 'Foodie', 'Bookworm', 'Neat'];
  const secondTrait =
    secondaryPool.find((t) => t !== inheritedTrait) || 'Builder';

  const starterObj =
    smartObjects.find((o) => o.id === 'obj_stove' || o.id === 'obj_bookshelf') ||
    smartObjects[0];
  const approach = starterObj
    ? getInteractionApproachPoint(starterObj, seedIndex)
    : { pos: { x: 0, y: 0, z: 4 }, lookAtPos: { x: 0, y: 0, z: 0 } };
  const safePos = resolveFurnitureCollision(
    approach.pos,
    smartObjects,
    starterObj?.id,
    existingCharacters,
    `char_gen_${nextGen}_${seedIndex}`
  );

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
  const hairStyles = ['Shoulder Wavy', 'Cropped Bob', 'Curly Shag', 'Neat Side Part', 'Messy Bun'];

  const successor: Character = {
    id: `char_gen${nextGen}_${Date.now().toString(36)}_${seedIndex}`,
    name: fullName,
    ageStage: 'Young Adult',
    traits: [inheritedTrait, secondTrait],
    lifeGoal: SUCCESSOR_GOALS[(nextGen + seedIndex) % SUCCESSOR_GOALS.length],
    room: starterObj ? starterObj.room : 'LivingRoom',
    pos: { x: safePos.x, y: approach.pos.y, z: safePos.z },
    lookAtPos: { ...approach.lookAtPos },
    onGrid: true,
    activeObjectId: starterObj?.id,
    currentAction: starterObj ? starterObj.actionLabel : 'Arriving at the Family Estate',
    actionTimer: starterObj ? Math.max(3600, starterObj.durationSeconds) : 7200,
    selfTalk: `Moving into The House as Generation ${nextGen} to honor ${deceased.name}'s memory and keep building our life here.`,
    motives: {
      hunger: 85,
      energy: 90,
      bladder: 88,
      hygiene: 90,
      social: 75,
      fun: 78,
      sanity: isDarkMode ? 80 : 95,
    },
    privateMemory: [
      `Arrived at The House as Generation ${nextGen} successor to ${deceased.name} (inherited "${inheritedTrait}").`,
    ],
    color: colors[(nextGen + seedIndex) % colors.length],
    genderFrame: (nextGen + seedIndex) % 2 === 0 ? 'Feminine' : 'Masculine',
    hairStyle: hairStyles[(nextGen + seedIndex) % hairStyles.length],
    facialHair: 'None',
    clothingTop: 'Tailored Blazer',
    clothingBottom: 'Denim Jeans',
    skinTone: deceased.skinTone || 'Olive',
    learnedTopics: [...(deceased.learnedTopics || []).slice(-3)],
    acquiredQuirks: [],
    daysLived: 0,
    lineageGeneration: nextGen,
    criticalNeglectSeconds: 0,
  };

  successor.interactionQueue = buildAutonomousLifeFlowQueue(
    successor,
    smartObjects,
    3,
    isDarkMode
  );

  return successor;
}

/**
 * Advances the autonomous life, aging, and mortality cycle for all characters on the lot.
 * - Characters progress through Young Adult -> Adult -> Elder as days pass (`daysLived`).
 * - Characters can pass away peacefully of Old Age as Elders or from prolonged extreme critical neglect/despair.
 * - When a character dies, a memorial is recorded and an autonomous successor moves in so the world
 *   continues progressing forever without requiring any user intervention.
 */
export function advanceWorldLifeAndMortalityCycle(
  characters: Character[],
  deltaGameSeconds: number,
  isDarkMode: boolean,
  smartObjects: SmartObject[],
  timeStr: string
): {
  updatedCharacters: Character[];
  memorials: DeceasedToonMemorial[];
  lifecycleLogs: string[];
} {
  const updatedCharacters: Character[] = [];
  const memorials: DeceasedToonMemorial[] = [];
  const lifecycleLogs: string[] = [];

  // 1 in-game day = 86,400 game seconds.
  // Age progression thresholds (in daysLived):
  // Young Adult -> Adult at 7 days; Adult -> Elder at 16 days; Natural Old Age passing at 26 days.
  const deltaDays = Math.max(0, deltaGameSeconds / 86400);

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const prevDays = char.daysLived ?? (char.ageStage === 'Elder' ? 18 : char.ageStage === 'Adult' ? 8 : 1);
    const nextDays = prevDays + deltaDays;
    let nextStage = char.ageStage;

    if (char.ageStage === 'Young Adult' && nextDays >= 7) {
      nextStage = 'Adult';
      lifecycleLogs.push(
        `[${timeStr} | Life Milestone] ${char.name} celebrated a birthday and matured into an Adult!`
      );
    } else if (char.ageStage === 'Adult' && nextDays >= 16) {
      nextStage = 'Elder';
      lifecycleLogs.push(
        `[${timeStr} | Life Milestone] ${char.name} grew into a wise Elder after ${Math.floor(nextDays)} days in The House.`
      );
    }

    // Track prolonged critical neglect (e.g. Hunger <= 1 or Sanity <= 1 in Dark Mode)
    const isCriticallyStarving = char.motives.hunger <= 1.0;
    const isCriticallyInsane = isDarkMode && char.motives.sanity <= 1.0;
    const prevNeglect = char.criticalNeglectSeconds || 0;
    const nextNeglect =
      isCriticallyStarving || isCriticallyInsane
        ? prevNeglect + deltaGameSeconds
        : Math.max(0, prevNeglect - deltaGameSeconds * 0.5);

    // Check mortality conditions:
    // 1. Peaceful passing from Old Age (Elder with >= 26 days lived)
    // 2. Prolonged critical starvation/collapse (>= 6 in-game hours / 21,600s at <= 1% motive)
    const diedOfOldAge = nextStage === 'Elder' && nextDays >= 26;
    const diedOfNeglect = nextNeglect >= 21600;

    if (diedOfOldAge || diedOfNeglect) {
      const causeOfDeath = diedOfOldAge
        ? 'Peaceful Old Age beneath The House rafters'
        : isCriticallyStarving
        ? 'Severe Culinary Starvation'
        : 'Subterranean Psychological Collapse';

      const successor = spawnAutonomousSuccessorToon(
        { ...char, ageStage: nextStage, daysLived: nextDays },
        updatedCharacters,
        smartObjects,
        isDarkMode,
        i
      );

      const epitaph = `${char.name} (${nextStage}, Gen ${char.lineageGeneration || 1}) lived ${Math.max(1, Math.round(nextDays))} days with traits [${char.traits.join(', ')}] — ${causeOfDeath}. Succeeded by ${successor.name}.`;

      memorials.push({
        id: `memorial_${char.id}_${Date.now().toString(36)}`,
        name: char.name,
        ageStageAtDeath: nextStage,
        daysLived: Math.max(1, Math.round(nextDays)),
        causeOfDeath,
        epitaph,
        traitsAtDeath: [...char.traits],
        timestamp: timeStr,
        successorName: successor.name,
      });

      lifecycleLogs.push(
        `[${timeStr} | Mortality & Legacy] ${epitaph}`
      );
      updatedCharacters.push(successor);
    } else {
      updatedCharacters.push({
        ...char,
        ageStage: nextStage,
        daysLived: nextDays,
        lineageGeneration: char.lineageGeneration || 1,
        criticalNeglectSeconds: nextNeglect,
      });
    }
  }

  return {
    updatedCharacters,
    memorials,
    lifecycleLogs,
  };
}

/**
 * Curated Library of Real-World Published Books with authentic summaries and decision heuristics.
 * When a toon acquires a book via the background Newspaper & Book Knowledge System, its summary
 * is permanently implanted into `character.privateMemory` and `character.knowledgebase.booksRead`,
 * increasing their `intelligenceScore` and shaping their autonomous decision-making.
 */
export const REAL_WORLD_BOOKS_LIBRARY: RealBookSummary[] = [
  {
    id: 'real_book_kahneman_thinking',
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    domain: 'PSYCHOLOGY',
    summary:
      'Daniel Kahneman explains the dual-process model of the brain: System 1 operates automatically and emotionally, while System 2 allocates deliberate analytical effort to overcome cognitive biases and loss aversion.',
    decisionHeuristic: 'System-2 Deliberate Motive Foresight',
    preferredObjectKeywords: ['laptop', 'bookshelf', 'chess', 'drafting', 'espresso'],
    iqBoost: 7,
  },
  {
    id: 'real_book_alexander_pattern_language',
    title: 'A Pattern Language: Towns, Buildings, Construction',
    author: 'Christopher Alexander',
    domain: 'ARCHITECTURE',
    summary:
      'Christopher Alexander catalogs 253 timeless architectural patterns—from light on two sides of every room to alcoves, staircases, and gallery lofts—showing how inhabitants naturally shape multi-story living spaces.',
    decisionHeuristic: 'Pattern-Language Spatial & Multi-Story Optimization',
    preferredObjectKeywords: ['drafting', 'easel', 'workbench', 'coffee_table', 'plant'],
    iqBoost: 8,
  },
  {
    id: 'real_book_nosrat_salt_fat_acid_heat',
    title: 'Salt, Fat, Acid, Heat',
    author: 'Samin Nosrat',
    domain: 'CULINARY',
    summary:
      'Samin Nosrat demystifies master culinary craft into four fundamental elements: salt enhances flavor, fat delivers texture and richness, acid balances brightness, and heat governs transformation.',
    decisionHeuristic: 'Four-Element Culinary & Social Mastery',
    preferredObjectKeywords: ['stove', 'fridge', 'dining', 'bbq', 'espresso'],
    iqBoost: 6,
  },
  {
    id: 'real_book_bachelard_poetics_of_space',
    title: 'The Poetics of Space',
    author: 'Gaston Bachelard',
    domain: 'PHILOSOPHY',
    summary:
      'Gaston Bachelard examines the phenomenology of domestic architecture, contrasting the rational verticality of the attic and upstairs loft with the subconscious depths of the subterranean cellar.',
    decisionHeuristic: 'Phenomenological Room & Sanity Equilibrium',
    preferredObjectKeywords: ['bookshelf', 'armchair', 'sofa', 'fireplace', 'bathtub'],
    iqBoost: 7,
  },
  {
    id: 'real_book_aurelius_meditations',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    domain: 'PHILOSOPHY',
    summary:
      'Roman Emperor Marcus Aurelius records private Stoic reflections on self-discipline, emotional resilience against external chaos, and focusing solely on one’s own reasoned actions.',
    decisionHeuristic: 'Stoic Sanity & Energy Self-Regulation',
    preferredObjectKeywords: ['bookshelf', 'bathtub', 'plant', 'bed', 'clock'],
    iqBoost: 6,
  },
  {
    id: 'real_book_norman_everyday_things',
    title: 'The Design of Everyday Things',
    author: 'Don Norman',
    domain: 'ARCHITECTURE',
    summary:
      'Don Norman introduces human-centered design principles—affordances, signifiers, constraints, and feedback loops—demonstrating how well-arranged household objects eliminate friction in daily routines.',
    decisionHeuristic: 'Affordance-Driven Smart Object Efficiency',
    preferredObjectKeywords: ['laptop', 'espresso', 'stove', 'workbench', 'drafting'],
    iqBoost: 7,
  },
  {
    id: 'real_book_harari_sapiens',
    title: 'Sapiens: A Brief History of Humankind',
    author: 'Yuval Noah Harari',
    domain: 'SCIENCE',
    summary:
      'Yuval Noah Harari traces how Homo sapiens came to cooperate in large numbers through shared narratives, cognitive revolutions, agricultural settlements, and scientific inquiry.',
    decisionHeuristic: 'Cooperative Social & Narrative Synthesis',
    preferredObjectKeywords: ['dining', 'sofa', 'bookshelf', 'newspaper', 'bbq'],
    iqBoost: 7,
  },
  {
    id: 'real_book_hofstadter_geb',
    title: 'Gödel, Escher, Bach: An Eternal Golden Braid',
    author: 'Douglas Hofstadter',
    domain: 'SCIENCE',
    summary:
      'Douglas Hofstadter explores how self-referential strange loops across formal logic, visual symmetry, and polyphonic music give rise to emergent consciousness and intelligence.',
    decisionHeuristic: 'Recursive Pattern & Polymath Synthesis',
    preferredObjectKeywords: ['laptop', 'easel', 'jukebox', 'arcade', 'grandfather_clock'],
    iqBoost: 9,
  },
  {
    id: 'real_book_jacobs_great_cities',
    title: 'The Death and Life of Great American Cities',
    author: 'Jane Jacobs',
    domain: 'ARCHITECTURE',
    summary:
      'Jane Jacobs champions vibrant mixed-use neighborhoods, active sidewalks, and organic community ecosystems over sterile, isolated urban planning.',
    decisionHeuristic: 'Vibrant Community & Multi-Room Circulation',
    preferredObjectKeywords: ['dining', 'pool', 'bbq', 'sofa', 'newspaper'],
    iqBoost: 6,
  },
  {
    id: 'real_book_shelley_frankenstein',
    title: 'Frankenstein; or, The Modern Prometheus',
    author: 'Mary Shelley',
    domain: 'LITERATURE',
    summary:
      'Mary Shelley tells the story of Victor Frankenstein and the sentient creature he assembles in secret, probing the ethical responsibilities of creation, isolation, and ambition.',
    decisionHeuristic: 'Cautious Scientific Inquiry & Empathy',
    preferredObjectKeywords: ['bookshelf', 'laptop', 'drafting', 'fireplace', 'easel'],
    iqBoost: 6,
  },
];

/**
 * Curated Library of Real-World Events & Stories acquired silently through the Newspaper system.
 */
export const REAL_WORLD_EVENTS_LIBRARY: Omit<WorldEventStoryEntry, 'acquiredAt'>[] = [
  {
    id: 'world_evt_connectome_mapping',
    headline: 'Neuroscientists Complete Full Synaptic Wiring Diagram of a Complex Brain',
    storySummary:
      'International researchers mapped over 130,000 neurons and 50 million synaptic connections, revealing how memory circuits consolidate long-term behavioral habits.',
    category: 'SCIENCE_TECH',
    decisionInsight: 'Prioritize cognitive rest and structured study to consolidate memory circuits.',
    preferredObjectKeywords: ['laptop', 'bookshelf', 'bed', 'espresso'],
    iqBoost: 5,
  },
  {
    id: 'world_evt_mass_timber_architecture',
    headline: 'Cross-Laminated Timber Lofts Set New Benchmark for Multi-Story Living',
    storySummary:
      'Architects across Scandinavia and the Pacific Northwest are constructing multi-story timber residences that sequester carbon while improving indoor acoustic warmth.',
    category: 'WORLD_EVENT',
    decisionInsight: 'Invest household savings into multi-story timber lofts and studio craftsmanship.',
    preferredObjectKeywords: ['drafting', 'easel', 'plant', 'sofa'],
    iqBoost: 5,
  },
  {
    id: 'world_evt_fermentation_gastronomy',
    headline: 'Artisanal Fermentation & Slow Simmering Revival Sweeps Home Kitchens',
    storySummary:
      'Culinary researchers report that unhurried slow-simmered sauces and fermented ingredients significantly improve both nutritional uptake and shared mealtime bonding.',
    category: 'REAL_STORY',
    decisionInsight: 'Favor multi-hour home cooking and shared dining over rushed snacks.',
    preferredObjectKeywords: ['stove', 'dining', 'fridge', 'bbq'],
    iqBoost: 4,
  },
  {
    id: 'world_evt_biophilic_design_study',
    headline: 'Longitudinal Study Confirms Indoor Botanicals & Daylight Lower Cortisol by 28%',
    storySummary:
      'Environmental psychologists tracking multi-occupant homes found that tending indoor plants and taking outdoor breaks dramatically stabilizes mood and sanity.',
    category: 'SCIENCE_TECH',
    decisionInsight: 'Balance indoor focus with botanical care and outdoor yard recreation.',
    preferredObjectKeywords: ['plant', 'pool', 'bbq', 'bathtub'],
    iqBoost: 4,
  },
  {
    id: 'world_evt_analog_renaissance',
    headline: 'Communities Embrace Unplugged Acoustic Music, Physical Books & Deep Conversation',
    storySummary:
      'Cultural sociologists document a surge in households trading passive screen time for physical bookshelves, acoustic instruments, and long face-to-face conversations.',
    category: 'REAL_STORY',
    decisionInsight: 'Seek out deep library reading, creative arts, and roommate dialogue.',
    preferredObjectKeywords: ['bookshelf', 'easel', 'jukebox', 'armchair'],
    iqBoost: 5,
  },
];

export function getDecisionTierForIntelligence(
  iq: number
): ToonKnowledgebase['decisionTier'] {
  if (iq >= 165) return 'Autonomous Savant';
  if (iq >= 135) return 'Strategic Polymath';
  if (iq >= 115) return 'Adaptive Reasoner';
  return 'Novice Thinker';
}

export function createInitialToonKnowledgebase(
  char?: Partial<Character>
): ToonKnowledgebase {
  let baseIq = 100;
  const traits = char?.traits || [];
  if (traits.includes('Genius')) baseIq += 14;
  if (traits.includes('Bookworm')) baseIq += 8;
  if (traits.includes('Builder') || traits.includes('Ambitious')) baseIq += 6;
  if (traits.includes('Observant') || traits.includes('Creative')) baseIq += 5;

  // Seed each character with 1 real book summary in memory matching their persona
  const starterBook =
    traits.includes('Builder') || traits.includes('Ambitious')
      ? REAL_WORLD_BOOKS_LIBRARY[1] // A Pattern Language
      : traits.includes('Foodie')
      ? REAL_WORLD_BOOKS_LIBRARY[2] // Salt, Fat, Acid, Heat
      : traits.includes('Bookworm') || traits.includes('Genius')
      ? REAL_WORLD_BOOKS_LIBRARY[0] // Thinking, Fast and Slow
      : REAL_WORLD_BOOKS_LIBRARY[3]; // The Poetics of Space

  return {
    intelligenceScore: baseIq,
    decisionTier: getDecisionTierForIntelligence(baseIq),
    booksRead: [{ ...starterBook, acquiredAt: 'Day 1 · Initial Memory' }],
    worldEvents: [],
    synthesizedHeuristics: [starterBook.decisionHeuristic],
    totalDataPointsProcessed: 1,
  };
}

/**
 * Returns the Cognitive Efficiency Multiplier (1.0x at IQ 100 up to 1.45x at IQ 200+)
 * so higher-intelligence toons extract greater motive restoration and decision value from their actions.
 */
export function getIntelligenceEfficiencyMultiplier(
  char: Pick<Character, 'intelligenceScore' | 'knowledgebase'>
): number {
  const iq =
    char.knowledgebase?.intelligenceScore ?? char.intelligenceScore ?? 100;
  const clamped = Math.max(90, Math.min(220, iq));
  return Math.round((1.0 + ((clamped - 100) / 120) * 0.45) * 100) / 100;
}

/**
 * Evaluates how a character's accumulated Knowledgebase (`booksRead`, `worldEvents`, `intelligenceScore`)
 * improves their autonomous SmartObject decision-making.
 * - Higher IQ toons prioritize multi-motive synergy (objects that satisfy 2+ depleted needs at once)
 *   and proactive self-care before motives hit critical levels.
 * - Real Books and Real-World Events in the toon's memory impart domain-specific object preferences
 *   and decision heuristics.
 */
export function evaluateKnowledgeDrivenDecisionBonus(
  char: Pick<Character, 'intelligenceScore' | 'knowledgebase' | 'motives' | 'traits'>,
  candidate: SmartObject,
  simulatedMotives?: Motives
): { bonusScore: number; matchedHeuristic?: string } {
  const kb = char.knowledgebase;
  const iq = kb?.intelligenceScore ?? char.intelligenceScore ?? 100;
  const motives = simulatedMotives || char.motives;
  const idLower = candidate.id.toLowerCase();
  const nameLower = candidate.name.toLowerCase();

  let bonusScore = 0;
  let matchedHeuristic: string | undefined;

  // 1. Cognitive Foresight: Multi-Motive Synergy & Preemptive Need Fulfillment
  const iqFactor = Math.max(0, (iq - 100) / 40); // 0.0 at IQ 100, 1.0 at IQ 140, 2.0 at IQ 180
  const positiveEffects = Object.entries(candidate.effects).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0
  );

  if (positiveEffects.length >= 2) {
    // Intelligent toons recognize actions that replenish multiple needs simultaneously (e.g., shared dining, bath, cooking)
    bonusScore += positiveEffects.length * 4.5 * (0.6 + iqFactor * 0.7);
  }

  // Preemptive bottleneck awareness: if any motive is below 45, intelligent toons strongly weight objects that fix it
  for (const [stat, gain] of positiveEffects) {
    const k = stat as keyof Motives;
    const currentVal = motives[k] ?? 70;
    if (currentVal < 45) {
      bonusScore += ((45 - currentVal) / 45) * gain * (0.45 + iqFactor * 0.55);
      if (!matchedHeuristic && iq >= 115) {
        matchedHeuristic = `IQ ${iq} Foresight (${stat.charAt(0).toUpperCase() + stat.slice(1)})`;
      }
    }
  }

  // 2. Real Book Memory Heuristics
  if (kb && kb.booksRead.length > 0) {
    for (const book of kb.booksRead) {
      const matchesKeyword = book.preferredObjectKeywords.some(
        (kw) => idLower.includes(kw) || nameLower.includes(kw)
      );
      if (matchesKeyword) {
        bonusScore += 9 + Math.min(8, book.iqBoost);
        matchedHeuristic = `Book Memory: "${book.title}"`;
      }
    }
  }

  // 3. Real-World Event & Story Insights
  if (kb && kb.worldEvents.length > 0) {
    for (const evt of kb.worldEvents.slice(-5)) {
      const matchesEvt = evt.preferredObjectKeywords.some(
        (kw) => idLower.includes(kw) || nameLower.includes(kw)
      );
      if (matchesEvt) {
        bonusScore += 6 + Math.min(6, evt.iqBoost);
        if (!matchedHeuristic) {
          matchedHeuristic = `World Event Insight`;
        }
      }
    }
  }

  // 4. Curiosity Drive: Toons actively use Newspaper, Bookshelf, and Laptop to expand their knowledgebase
  if (idLower.includes('newspaper') || idLower.includes('bookshelf') || idLower.includes('laptop')) {
    const booksCount = kb?.booksRead.length || 0;
    // Stronger pull when they still have unread books in the library
    bonusScore += booksCount < REAL_WORLD_BOOKS_LIBRARY.length ? 11 : 5;
  }

  return {
    bonusScore: Math.round(bonusScore * 10) / 10,
    matchedHeuristic,
  };
}

/**
 * Background Knowledge Ingestion System (Newspaper / World Events / Stories / Real Book Summaries):
 * - Runs silently in the background without ever displaying a newspaper popup to the user.
 * - Acquires a real-world event/story AND a summary of a real published book into the toon's
 *   `privateMemory` and `knowledgebase`.
 * - Increases the toon's `intelligenceScore` and `totalDataPointsProcessed`, unlocking higher
 *   `decisionTier` levels and random, evolving conversation/self-talk topics.
 */
export function ingestNewspaperAndBookKnowledge(
  char: Character,
  payload?: {
    headline?: string;
    summary?: string;
    realStory?: string;
    topics?: string[];
    realBook?: Partial<RealBookSummary>;
  },
  timeStr: string = '08:00 AM'
): {
  updatedChar: Character;
  acquiredBook: RealBookSummary;
  acquiredEvent: WorldEventStoryEntry;
  iqGain: number;
  logEntry: string;
} {
  const currentKb: ToonKnowledgebase = char.knowledgebase
    ? {
        ...char.knowledgebase,
        booksRead: [...char.knowledgebase.booksRead],
        worldEvents: [...char.knowledgebase.worldEvents],
        synthesizedHeuristics: [...char.knowledgebase.synthesizedHeuristics],
      }
    : createInitialToonKnowledgebase(char);

  // 1. Select an unread Real Book from REAL_WORLD_BOOKS_LIBRARY (or use payload.realBook if provided)
  const readBookIds = new Set(currentKb.booksRead.map((b) => b.id));
  const readBookTitles = new Set(currentKb.booksRead.map((b) => b.title.toLowerCase()));
  const unreadBooks = REAL_WORLD_BOOKS_LIBRARY.filter(
    (b) => !readBookIds.has(b.id) && !readBookTitles.has(b.title.toLowerCase())
  );

  // Deterministic/varied index based on character ID + totalDataPointsProcessed
  const charSeed =
    char.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) +
    currentKb.totalDataPointsProcessed * 7;

  let acquiredBook: RealBookSummary;
  if (payload?.realBook && payload.realBook.title && payload.realBook.summary) {
    acquiredBook = {
      id: payload.realBook.id || `real_book_${Date.now().toString(36)}`,
      title: payload.realBook.title,
      author: payload.realBook.author || 'Classic Literature & Science Archive',
      domain: payload.realBook.domain || 'PHILOSOPHY',
      summary: payload.realBook.summary,
      decisionHeuristic:
        payload.realBook.decisionHeuristic ||
        `Applied insights from "${payload.realBook.title}"`,
      preferredObjectKeywords:
        payload.realBook.preferredObjectKeywords && payload.realBook.preferredObjectKeywords.length > 0
          ? payload.realBook.preferredObjectKeywords
          : ['bookshelf', 'laptop', 'stove', 'easel'],
      iqBoost: payload.realBook.iqBoost || 6,
      acquiredAt: timeStr,
    };
  } else {
    const bookPool = unreadBooks.length > 0 ? unreadBooks : REAL_WORLD_BOOKS_LIBRARY;
    const pickedBook = bookPool[charSeed % bookPool.length];
    acquiredBook = {
      ...pickedBook,
      acquiredAt: timeStr,
    };
  }

  // 2. Build or select the Real-World Event & Story entry
  const readEventHeadlines = new Set(currentKb.worldEvents.map((e) => e.headline.toLowerCase()));
  const unreadEvents = REAL_WORLD_EVENTS_LIBRARY.filter(
    (e) => !readEventHeadlines.has(e.headline.toLowerCase())
  );
  const fallbackEvent =
    (unreadEvents.length > 0 ? unreadEvents : REAL_WORLD_EVENTS_LIBRARY)[
      charSeed % (unreadEvents.length > 0 ? unreadEvents.length : REAL_WORLD_EVENTS_LIBRARY.length)
    ];

  const headline = payload?.headline || fallbackEvent.headline;
  const storySummary =
    payload?.realStory ||
    payload?.summary ||
    fallbackEvent.storySummary;

  const acquiredEvent: WorldEventStoryEntry = {
    id: `evt_kb_${Date.now().toString(36)}_${currentKb.totalDataPointsProcessed}`,
    headline,
    storySummary,
    category: fallbackEvent.category,
    decisionInsight: fallbackEvent.decisionInsight,
    preferredObjectKeywords: fallbackEvent.preferredObjectKeywords,
    iqBoost: fallbackEvent.iqBoost,
    acquiredAt: timeStr,
  };

  // 3. Update Knowledgebase & Intelligence Score
  const isNewBook = !readBookTitles.has(acquiredBook.title.toLowerCase());
  const isNewEvent = !readEventHeadlines.has(acquiredEvent.headline.toLowerCase());
  const iqGain = (isNewBook ? acquiredBook.iqBoost : 2) + (isNewEvent ? acquiredEvent.iqBoost : 2);
  const nextIq = Math.min(220, currentKb.intelligenceScore + iqGain);
  const nextTier = getDecisionTierForIntelligence(nextIq);

  const nextBooks = isNewBook
    ? [...currentKb.booksRead, acquiredBook].slice(-12)
    : currentKb.booksRead;
  const nextEvents = [...currentKb.worldEvents, acquiredEvent].slice(-12);
  const nextHeuristics = Array.from(
    new Set([
      ...currentKb.synthesizedHeuristics,
      acquiredBook.decisionHeuristic,
      acquiredEvent.decisionInsight,
    ])
  ).slice(-10);

  const updatedKb: ToonKnowledgebase = {
    intelligenceScore: nextIq,
    decisionTier: nextTier,
    booksRead: nextBooks,
    worldEvents: nextEvents,
    synthesizedHeuristics: nextHeuristics,
    totalDataPointsProcessed: currentKb.totalDataPointsProcessed + 2,
  };

  // 4. Implant the Real Book Summary and Real-World Event/Story directly into the Toon's Memory (`privateMemory`)
  const bookMemoryEntry = `[BOOK MEMORY • "${acquiredBook.title}" by ${acquiredBook.author}] ${acquiredBook.summary} (Decision Heuristic: ${acquiredBook.decisionHeuristic})`;
  const eventMemoryEntry = `[WORLD EVENT & STORY] ${acquiredEvent.headline} — ${acquiredEvent.storySummary}`;

  const nextPrivateMemory = [
    ...char.privateMemory.filter((m) => m !== bookMemoryEntry && m !== eventMemoryEntry).slice(-18),
    bookMemoryEntry,
    eventMemoryEntry,
  ];

  // 5. Synthesize random, interesting conversational & decision topics from the book and world event
  const bookTopic = `I internalized "${acquiredBook.title}" by ${acquiredBook.author}—${acquiredBook.summary}`;
  const eventTopic = `World Event Update: ${acquiredEvent.headline} (${acquiredEvent.decisionInsight})`;
  const extraTopics = Array.isArray(payload?.topics) ? payload!.topics : [];
  const nextLearnedTopics = Array.from(
    new Set([...(char.learnedTopics || []), bookTopic, eventTopic, ...extraTopics])
  ).slice(-14);

  const logEntry = `[${timeStr} | Knowledgebase +${iqGain} IQ -> ${nextIq} (${nextTier})] ${char.name} processed world event "${acquiredEvent.headline}" & memorized real book summary "${acquiredBook.title}" by ${acquiredBook.author}.`;

  const baseUpdatedChar: Character = {
    ...char,
    intelligenceScore: nextIq,
    knowledgebase: updatedKb,
    learnedTopics: nextLearnedTopics,
    privateMemory: nextPrivateMemory,
    selfTalk: `Reflecting on "${acquiredBook.title}" by ${acquiredBook.author} and today's world events—my decision-making feels sharper (IQ ${nextIq}).`,
  };

  // 6. Feed the acquired World Event & Real Book into the Life Experience Tracker for gradual personality shifts
  const expStep = recordLifeExperienceWorldEvent(baseUpdatedChar, {
    headline: acquiredEvent.headline,
    category: acquiredEvent.category,
    bookDomain: acquiredBook.domain,
    bookTitle: acquiredBook.title,
    triggerSource: 'WORLD_EVENT',
    timeStr,
  });

  return {
    updatedChar: expStep.updatedChar,
    acquiredBook,
    acquiredEvent,
    iqGain,
    logEntry: expStep.shiftedTrait
      ? `${logEntry} [Personality Shift: ${expStep.shiftedTrait.reason}]`
      : logEntry,
  };
}

/**
 * Configuration table mapping each Life Experience Domain to its human-readable label,
 * Tier-1 / Tier-2 emergent traits, opposing traits that gradually erode when a toon
 * repeatedly engages in this domain, and preferred smart object keywords.
 */
export const EXPERIENCE_DOMAIN_CONFIG: Record<
  ExperienceDomain,
  {
    label: string;
    tier1Trait: string;
    tier2Trait: string;
    opposingTraits: string[];
    objectKeywords: string[];
  }
> = {
  CULINARY: {
    label: 'Culinary & Gastronomy',
    tier1Trait: 'Foodie',
    tier2Trait: 'Master Chef',
    opposingTraits: ['Picky Eater', 'Queasy Hypochondriac'],
    objectKeywords: ['stove', 'fridge', 'espresso', 'bbq', 'dining', 'island'],
  },
  INTELLECTUAL: {
    label: 'Intellectual & Literature',
    tier1Trait: 'Bookworm',
    tier2Trait: 'Scholarly Polymath',
    opposingTraits: ['Clumsy', 'Free Spirit'],
    objectKeywords: ['bookshelf', 'newspaper', 'laptop', 'chess', 'library'],
  },
  CREATIVE: {
    label: 'Creative & Studio Arts',
    tier1Trait: 'Artistic',
    tier2Trait: 'Visionary Creator',
    opposingTraits: ['Snob', 'Perfectionist'],
    objectKeywords: ['easel', 'guitar', 'jukebox', 'arcade', 'canvas', 'studio'],
  },
  ARCHITECTURAL: {
    label: 'Architecture & Ambition',
    tier1Trait: 'Builder',
    tier2Trait: 'Master Architect',
    opposingTraits: ['Lazy', 'Couch Potato'],
    objectKeywords: ['drafting', 'workbench', 'desk', 'clock', 'upstairs', 'basement'],
  },
  DOMESTIC: {
    label: 'Domestic & Botanical Harmony',
    tier1Trait: 'Neat',
    tier2Trait: 'Zen Minimalist',
    opposingTraits: ['Lazy', 'Anxious', 'Guilt-Ridden'],
    objectKeywords: ['bathtub', 'sink', 'toilet', 'plant', 'bed', 'shower'],
  },
  SOCIAL: {
    label: 'Social & Community Bonding',
    tier1Trait: 'Outgoing',
    tier2Trait: 'Charismatic Host',
    opposingTraits: ['Secretive', 'Paranoid', 'Snob'],
    objectKeywords: ['sofa', 'armchair', 'pool', 'dining_table', 'tv', 'patio'],
  },
  SUBTERRANEAN: {
    label: 'Nocturnal & Subterranean Inquiry',
    tier1Trait: 'NightOwl',
    tier2Trait: 'Subterranean Mystic',
    opposingTraits: ['Anxious'],
    objectKeywords: ['basement', 'cellar', 'altar', 'boiler', 'crypt', 'surgical'],
  },
};

const ALL_EXPERIENCE_DOMAINS: ExperienceDomain[] = [
  'CULINARY',
  'INTELLECTUAL',
  'CREATIVE',
  'ARCHITECTURAL',
  'DOMESTIC',
  'SOCIAL',
  'SUBTERRANEAN',
];

/**
 * Determines which emergent trait a toon is currently progressing toward in a given domain,
 * and which opposing trait (if any) in their current `traits` list will be replaced upon evolution.
 */
function resolveDomainTargetAndOpposingTrait(
  domain: ExperienceDomain,
  currentTraits: string[],
  evolutionTier: number
): { emergentTrait: string; opposingTrait?: string } {
  const cfg = EXPERIENCE_DOMAIN_CONFIG[domain];
  const hasTier1 = currentTraits.includes(cfg.tier1Trait);
  const emergentTrait =
    evolutionTier >= 1 || hasTier1 ? cfg.tier2Trait : cfg.tier1Trait;
  const opposingTrait = cfg.opposingTraits.find((opp) =>
    currentTraits.includes(opp)
  );
  return { emergentTrait, opposingTrait };
}

/**
 * Computes the dominant Life Experience domain based on accumulated experience points
 * (breaking ties by activity + world event count).
 */
function computeDominantExperienceDomain(
  domains: Record<ExperienceDomain, LifeExperienceDomainRecord>
): ExperienceDomain {
  let bestDomain: ExperienceDomain = 'ARCHITECTURAL';
  let bestScore = -1;
  for (const d of ALL_EXPERIENCE_DOMAINS) {
    const rec = domains[d];
    const score =
      rec.experiencePoints + rec.activityCount * 8 + rec.worldEventCount * 10;
    if (score > bestScore) {
      bestScore = score;
      bestDomain = d;
    }
  }
  return bestDomain;
}

/**
 * Creates a character's initial Life Experience Tracker state, seeded with baseline experience
 * matching their starting traits so the UI immediately reflects their life background and next shifts.
 */
export function createInitialLifeExperienceTracker(
  char?: Partial<Character>
): LifeExperienceTrackerState {
  const traits = char?.traits || [];
  const domains = {} as Record<ExperienceDomain, LifeExperienceDomainRecord>;

  for (const domain of ALL_EXPERIENCE_DOMAINS) {
    const cfg = EXPERIENCE_DOMAIN_CONFIG[domain];
    const matchesTier1 = traits.includes(cfg.tier1Trait);
    const matchesRelated =
      (domain === 'ARCHITECTURAL' && traits.includes('Ambitious')) ||
      (domain === 'CREATIVE' && traits.includes('Creative')) ||
      (domain === 'INTELLECTUAL' && traits.includes('Genius')) ||
      (domain === 'SUBTERRANEAN' && traits.includes('Secretive'));

    const initialXp = matchesTier1 ? 45 : matchesRelated ? 35 : 10;
    const initialActs = matchesTier1 || matchesRelated ? 1 : 0;
    const { emergentTrait, opposingTrait } = resolveDomainTargetAndOpposingTrait(
      domain,
      traits,
      0
    );

    domains[domain] = {
      domain,
      label: cfg.label,
      activityCount: initialActs,
      worldEventCount: 0,
      totalHoursSpent: initialActs * 2,
      experiencePoints: initialXp,
      nextShiftThreshold: 100,
      evolutionTier: 0,
      emergentTrait,
      opposingTrait,
      lastActivityLabel:
        initialActs > 0 ? `Baseline ${cfg.label} affinity` : 'Awaiting experiences',
    };
  }

  const initialScores = computePersonalityTraitScores({ traits, lifeExperience: { domains } as any });
  const dominantAxis = (Object.keys(initialScores) as PersonalityAxisKey[]).reduce((best, k) =>
    initialScores[k] > initialScores[best] ? k : best, 'creative' as PersonalityAxisKey
  );
  const baselineSnapshot: PersonalityTraitSnapshot = {
    id: `snap_day1_${Date.now().toString(36)}`,
    label: 'Day 1 Genesis Baseline',
    timestamp: 'Day 1 • 08:00 AM',
    gameDay: 1,
    traits: [...traits],
    traitScores: initialScores,
    dominantAxis,
  };

  return {
    totalActivitiesCompleted: Object.values(domains).reduce(
      (sum, d) => sum + d.activityCount,
      0
    ),
    totalWorldEventsExperienced: 0,
    dominantDomain: computeDominantExperienceDomain(domains),
    domains,
    traitShiftHistory: [],
    evolvedTraits: [],
    personalitySnapshots: [baselineSnapshot],
  };
}

/**
 * Classifies a SmartObject interaction into one of the 7 Life Experience Domains.
 */
export function classifyObjectToExperienceDomain(
  obj: Pick<SmartObject, 'id' | 'name' | 'category' | 'room' | 'actionLabel'>
): ExperienceDomain {
  const idLower = `${obj.id} ${obj.name} ${obj.actionLabel}`.toLowerCase();
  const roomLower = (obj.room || '').toLowerCase();

  if (
    roomLower.includes('basement') ||
    obj.category === 'basement' ||
    idLower.includes('cellar') ||
    idLower.includes('surgical') ||
    idLower.includes('crypt')
  ) {
    return 'SUBTERRANEAN';
  }
  if (
    obj.category === 'kitchen' ||
    idLower.includes('stove') ||
    idLower.includes('fridge') ||
    idLower.includes('espresso') ||
    idLower.includes('bbq') ||
    idLower.includes('cook') ||
    idLower.includes('meal') ||
    idLower.includes('ramen') ||
    idLower.includes('risotto')
  ) {
    return 'CULINARY';
  }
  if (
    idLower.includes('drafting') ||
    idLower.includes('workbench') ||
    idLower.includes('laptop') ||
    idLower.includes('blueprint') ||
    idLower.includes('clock')
  ) {
    return 'ARCHITECTURAL';
  }
  if (
    idLower.includes('bookshelf') ||
    idLower.includes('newspaper') ||
    idLower.includes('chess') ||
    idLower.includes('research') ||
    idLower.includes('read')
  ) {
    return 'INTELLECTUAL';
  }
  if (
    idLower.includes('easel') ||
    idLower.includes('paint') ||
    idLower.includes('guitar') ||
    idLower.includes('jukebox') ||
    idLower.includes('arcade') ||
    idLower.includes('music')
  ) {
    return 'CREATIVE';
  }
  if (
    obj.category === 'bathroom' ||
    obj.category === 'bedroom' ||
    idLower.includes('bathtub') ||
    idLower.includes('toilet') ||
    idLower.includes('sink') ||
    idLower.includes('plant') ||
    idLower.includes('bed')
  ) {
    return 'DOMESTIC';
  }
  return 'SOCIAL';
}

/**
 * Internal helper that applies XP to a target Life Experience Domain and checks if the toon
 * crosses `nextShiftThreshold` (100 XP per tier), dynamically shifting `character.traits`
 * (either replacing an opposing trait for a gradual personality shift or adding the new emergent trait).
 */
function applyDomainExperienceAndEvaluateTraitShift(
  char: Character,
  domain: ExperienceDomain,
  xpGain: number,
  activityDelta: number,
  worldEventDelta: number,
  hoursDelta: number,
  activityDescription: string,
  triggerSource: PersonalityTraitShiftRecord['triggerSource'],
  timeStr: string
): {
  updatedChar: Character;
  shiftedTrait?: PersonalityTraitShiftRecord;
  xpGained: number;
  domain: ExperienceDomain;
} {
  const baseTracker =
    char.lifeExperience || createInitialLifeExperienceTracker(char);
  const currentDomains: Record<ExperienceDomain, LifeExperienceDomainRecord> = {
    ...baseTracker.domains,
  };

  for (const d of ALL_EXPERIENCE_DOMAINS) {
    currentDomains[d] = { ...baseTracker.domains[d] };
  }

  const targetRec = currentDomains[domain];
  const nextXp = targetRec.experiencePoints + xpGain;
  const nextActCount = targetRec.activityCount + activityDelta;
  const nextEvtCount = targetRec.worldEventCount + worldEventDelta;
  const nextHours =
    Math.round((targetRec.totalHoursSpent + hoursDelta) * 10) / 10;

  let nextTraits = [...(char.traits || [])];
  let nextEvolvedTraits = [...(baseTracker.evolvedTraits || [])];
  let nextShiftHistory = [...(baseTracker.traitShiftHistory || [])];
  let nextTier = targetRec.evolutionTier;
  let nextThreshold = targetRec.nextShiftThreshold || 100;
  let shiftedTrait: PersonalityTraitShiftRecord | undefined;
  let nextPrivateMemory = [...char.privateMemory];
  let nextSelfTalk = char.selfTalk;

  if (nextXp >= nextThreshold) {
    const { emergentTrait, opposingTrait } = resolveDomainTargetAndOpposingTrait(
      domain,
      nextTraits,
      nextTier
    );

    nextTier += 1;
    nextThreshold += 100;

    let replacedTrait: string | undefined;
    if (opposingTrait && nextTraits.includes(opposingTrait)) {
      replacedTrait = opposingTrait;
      nextTraits = nextTraits.map((t) =>
        t === opposingTrait ? emergentTrait : t
      );
      // Deduplicate in case emergentTrait was already present
      nextTraits = Array.from(new Set(nextTraits));
    } else if (!nextTraits.includes(emergentTrait)) {
      nextTraits = [...nextTraits, emergentTrait].slice(-7);
    }

    if (!nextEvolvedTraits.includes(emergentTrait)) {
      nextEvolvedTraits = [...nextEvolvedTraits, emergentTrait];
    }

    const reason = replacedTrait
      ? `Shifted from "${replacedTrait}" to "${emergentTrait}" after ${nextActCount} ${EXPERIENCE_DOMAIN_CONFIG[domain].label.toLowerCase()} activities & ${nextEvtCount} world events (${activityDescription}).`
      : `Evolved new trait "${emergentTrait}" through dedicated ${EXPERIENCE_DOMAIN_CONFIG[domain].label.toLowerCase()} experiences (${activityDescription}).`;

    shiftedTrait = {
      id: `shift_${domain.toLowerCase()}_${Date.now().toString(36)}_${nextShiftHistory.length}`,
      domain,
      addedTrait: emergentTrait,
      replacedTrait,
      triggerSource,
      reason,
      timestamp: timeStr,
    };

    nextShiftHistory = [...nextShiftHistory, shiftedTrait].slice(-10);
    nextPrivateMemory = [
      ...nextPrivateMemory.slice(-19),
      `[LIFE EXPERIENCE SHIFT • ${timeStr}] ${reason}`,
    ];
    nextSelfTalk = replacedTrait
      ? `My habits have genuinely changed—I've outgrown being "${replacedTrait}" and embraced being "${emergentTrait}"!`
      : `All my time spent on ${EXPERIENCE_DOMAIN_CONFIG[domain].label.toLowerCase()} has shaped who I am—I now embody "${emergentTrait}".`;
  }

  const resolvedAfter = resolveDomainTargetAndOpposingTrait(
    domain,
    nextTraits,
    nextTier
  );

  currentDomains[domain] = {
    ...targetRec,
    activityCount: nextActCount,
    worldEventCount: nextEvtCount,
    totalHoursSpent: nextHours,
    experiencePoints: nextXp,
    nextShiftThreshold: nextThreshold,
    evolutionTier: nextTier,
    emergentTrait: resolvedAfter.emergentTrait,
    opposingTrait: resolvedAfter.opposingTrait,
    lastActivityLabel: activityDescription,
  };

  // Refresh opposing/emergent trait labels across all domains if traits changed
  if (shiftedTrait) {
    for (const d of ALL_EXPERIENCE_DOMAINS) {
      const refreshed = resolveDomainTargetAndOpposingTrait(
        d,
        nextTraits,
        currentDomains[d].evolutionTier
      );
      currentDomains[d] = {
        ...currentDomains[d],
        emergentTrait: refreshed.emergentTrait,
        opposingTrait: refreshed.opposingTrait,
      };
    }
  }

  let nextSnapshots = baseTracker.personalitySnapshots
    ? [...baseTracker.personalitySnapshots]
    : [
        {
          id: `snap_baseline_${char.id || 'char'}`,
          label: 'Day 1 Baseline',
          timestamp: 'Day 1 • 08:00 AM',
          gameDay: char.daysLived || 1,
          traits: [...(char.traits || [])],
          traitScores: computePersonalityTraitScores({ traits: char.traits, lifeExperience: baseTracker }),
          dominantAxis: 'creative' as PersonalityAxisKey,
        },
      ];

  if (shiftedTrait) {
    const shiftScores = computePersonalityTraitScores({
      ...char,
      traits: nextTraits,
      lifeExperience: { ...baseTracker, domains: currentDomains },
    });
    const domAxis = (Object.keys(shiftScores) as PersonalityAxisKey[]).reduce((best, k) =>
      shiftScores[k] > shiftScores[best] ? k : best, 'ambitious' as PersonalityAxisKey
    );
    const shiftSnapshot: PersonalityTraitSnapshot = {
      id: `snap_${shiftedTrait.id}`,
      label: shiftedTrait.replacedTrait
        ? `Shift: ${shiftedTrait.replacedTrait} → ${shiftedTrait.addedTrait}`
        : `Evolution: +${shiftedTrait.addedTrait}`,
      timestamp: timeStr,
      gameDay: char.daysLived || 1,
      traits: [...nextTraits],
      traitScores: shiftScores,
      dominantAxis: domAxis,
    };
    nextSnapshots = [...nextSnapshots, shiftSnapshot].slice(-10);
  }

  const updatedTracker: LifeExperienceTrackerState = {
    totalActivitiesCompleted:
      baseTracker.totalActivitiesCompleted + activityDelta,
    totalWorldEventsExperienced:
      baseTracker.totalWorldEventsExperienced + worldEventDelta,
    dominantDomain: computeDominantExperienceDomain(currentDomains),
    domains: currentDomains,
    traitShiftHistory: nextShiftHistory,
    evolvedTraits: nextEvolvedTraits,
    personalitySnapshots: nextSnapshots,
  };

  return {
    updatedChar: {
      ...char,
      traits: nextTraits,
      privateMemory: nextPrivateMemory,
      selfTalk: nextSelfTalk,
      lifeExperience: updatedTracker,
    },
    shiftedTrait,
    xpGained: xpGain,
    domain,
  };
}

/**
 * Records an autonomous or player-directed activity in the character's Life Experience Tracker,
 * dynamically updating domain XP, hours spent, and triggering gradual personality trait shifts
 * when an experience threshold is crossed.
 */
export function recordLifeExperienceActivity(
  char: Character,
  params: {
    object?: Pick<SmartObject, 'id' | 'name' | 'category' | 'room' | 'actionLabel' | 'durationSeconds'>;
    activityLabel?: string;
    domainOverride?: ExperienceDomain;
    durationSeconds?: number;
    xpOverride?: number;
    triggerSource?: PersonalityTraitShiftRecord['triggerSource'];
    timeStr?: string;
  }
): {
  updatedChar: Character;
  shiftedTrait?: PersonalityTraitShiftRecord;
  xpGained: number;
  domain: ExperienceDomain;
} {
  const domain =
    params.domainOverride ||
    (params.object
      ? classifyObjectToExperienceDomain(params.object)
      : 'DOMESTIC');
  const durationSec =
    params.durationSeconds ?? params.object?.durationSeconds ?? 3600;
  const hours = Math.max(0.5, durationSec / 3600);
  const xpGain =
    params.xpOverride ??
    Math.min(45, Math.max(25, Math.round(20 + hours * 6)));
  const label =
    params.activityLabel ||
    params.object?.actionLabel ||
    params.object?.name ||
    EXPERIENCE_DOMAIN_CONFIG[domain].label;

  return applyDomainExperienceAndEvaluateTraitShift(
    char,
    domain,
    xpGain,
    1,
    0,
    hours,
    label,
    params.triggerSource || 'AUTONOMOUS_ACTIVITY',
    params.timeStr || '09:00 AM'
  );
}

/**
 * Records a major World Event, Newspaper Story, Real Book Summary, or House Event
 * in the character's Life Experience Tracker, contributing toward gradual personality shifts.
 */
export function recordLifeExperienceWorldEvent(
  char: Character,
  params: {
    headline: string;
    category?: string;
    bookDomain?: RealBookSummary['domain'];
    bookTitle?: string;
    domainOverride?: ExperienceDomain;
    xpOverride?: number;
    triggerSource?: PersonalityTraitShiftRecord['triggerSource'];
    timeStr?: string;
  }
): {
  updatedChar: Character;
  shiftedTrait?: PersonalityTraitShiftRecord;
  xpGained: number;
  domain: ExperienceDomain;
} {
  let domain: ExperienceDomain = params.domainOverride || 'INTELLECTUAL';
  const textLower = `${params.headline} ${params.category || ''} ${params.bookTitle || ''}`.toLowerCase();

  if (!params.domainOverride) {
    if (
      params.bookDomain === 'ARCHITECTURE' ||
      textLower.includes('timber') ||
      textLower.includes('architect') ||
      textLower.includes('loft') ||
      textLower.includes('design')
    ) {
      domain = 'ARCHITECTURAL';
    } else if (
      params.bookDomain === 'CULINARY' ||
      textLower.includes('culinary') ||
      textLower.includes('ferment') ||
      textLower.includes('ramen') ||
      textLower.includes('risotto') ||
      textLower.includes('espresso') ||
      textLower.includes('food')
    ) {
      domain = 'CULINARY';
    } else if (
      textLower.includes('biophilic') ||
      textLower.includes('botanical') ||
      textLower.includes('cortisol') ||
      textLower.includes('clean')
    ) {
      domain = 'DOMESTIC';
    } else if (
      textLower.includes('community') ||
      textLower.includes('conversation') ||
      textLower.includes('cities')
    ) {
      domain = 'SOCIAL';
    } else if (
      textLower.includes('chiaroscuro') ||
      textLower.includes('canvas') ||
      textLower.includes('art') ||
      textLower.includes('music')
    ) {
      domain = 'CREATIVE';
    } else if (
      textLower.includes('subterranean') ||
      textLower.includes('floorboard') ||
      textLower.includes('gore') ||
      textLower.includes('cellar')
    ) {
      domain = 'SUBTERRANEAN';
    }
  }

  const xpGain = params.xpOverride ?? 35;
  const description = params.bookTitle
    ? `World Event "${params.headline}" & Book "${params.bookTitle}"`
    : `Major Event: "${params.headline}"`;

  return applyDomainExperienceAndEvaluateTraitShift(
    char,
    domain,
    xpGain,
    0,
    1,
    1.0,
    description,
    params.triggerSource || 'WORLD_EVENT',
    params.timeStr || '09:00 AM'
  );
}

/**
 * Configuration for the 7 standardized personality trait radar axes,
 * mapping associated traits, opposed traits, domain affinity, and theme color.
 */
export const PERSONALITY_AXES_CONFIG: Record<
  PersonalityAxisKey,
  {
    key: PersonalityAxisKey;
    label: string;
    description: string;
    color: string;
    positiveTraits: string[];
    negativeTraits: string[];
    domain: ExperienceDomain;
  }
> = {
  creative: {
    key: 'creative',
    label: 'Creative',
    description: 'Artistic expression, visual flair, and spontaneous musical innovation',
    color: '#ec4899', // pink-500
    positiveTraits: ['Creative', 'Artistic', 'Visionary Creator', 'Music Lover'],
    negativeTraits: ['Perfectionist', 'Snob'],
    domain: 'CREATIVE',
  },
  ambitious: {
    key: 'ambitious',
    label: 'Ambitious',
    description: 'Drive for vertical building, architectural milestones, and career mastery',
    color: '#8b5cf6', // purple-500
    positiveTraits: ['Ambitious', 'Builder', 'Master Architect', 'Workaholic'],
    negativeTraits: ['Lazy', 'Couch Potato'],
    domain: 'ARCHITECTURAL',
  },
  neat: {
    key: 'neat',
    label: 'Neat',
    description: 'Hygiene discipline, domestic tidiness, and botanical mindfulness',
    color: '#10b981', // emerald-500
    positiveTraits: ['Neat', 'Zen Minimalist', 'Perfectionist'],
    negativeTraits: ['Clumsy', 'Lazy'],
    domain: 'DOMESTIC',
  },
  intellectual: {
    key: 'intellectual',
    label: 'Intellectual',
    description: 'Book reading, scientific curiosity, strategic problem solving, and IQ heuristics',
    color: '#3b82f6', // blue-500
    positiveTraits: ['Bookworm', 'Genius', 'Scholarly Polymath', 'Observant'],
    negativeTraits: ['Free Spirit', 'Clumsy'],
    domain: 'INTELLECTUAL',
  },
  social: {
    key: 'social',
    label: 'Social',
    description: 'Interpersonal warmth, household camaraderie, and community bonding',
    color: '#06b6d4', // cyan-500
    positiveTraits: ['Outgoing', 'Charismatic Host', 'Free Spirit'],
    negativeTraits: ['Secretive', 'Paranoid', 'Snob'],
    domain: 'SOCIAL',
  },
  culinary: {
    key: 'culinary',
    label: 'Culinary',
    description: 'Gastronomy mastery, gourmet preparation, and recipe experimentation',
    color: '#f97316', // orange-500
    positiveTraits: ['Foodie', 'Master Chef', 'Spice Connoisseur'],
    negativeTraits: ['Picky Eater', 'Queasy Hypochondriac'],
    domain: 'CULINARY',
  },
  lazy: {
    key: 'lazy',
    label: 'Lazy',
    description: 'Relaxation preference, low work pressure, leisure and downtime affinity',
    color: '#f59e0b', // amber-500
    positiveTraits: ['Lazy', 'Couch Potato'],
    negativeTraits: ['Ambitious', 'Builder', 'Workaholic', 'Master Architect'],
    domain: 'DOMESTIC',
  },
};

export const ALL_PERSONALITY_AXES: PersonalityAxisKey[] = [
  'creative',
  'ambitious',
  'neat',
  'intellectual',
  'social',
  'culinary',
  'lazy',
];

/**
 * Computes a standardized 0-100 score for all 7 personality axes for a given character.
 * Directly reflects current active traits, acquired quirks, accumulated domain experience,
 * books read, and intelligence score.
 */
export function computePersonalityTraitScores(
  char?: Partial<Character>
): Record<PersonalityAxisKey, number> {
  const traits = new Set<string>();
  (char?.traits || []).forEach((t) => traits.add(t));
  (char?.acquiredQuirks || []).forEach((q) => traits.add(q.traitName));
  const domains = char?.lifeExperience?.domains;
  const books = char?.knowledgebase?.booksRead || [];
  const iq = char?.knowledgebase?.intelligenceScore ?? char?.intelligenceScore ?? 100;

  const result: Record<PersonalityAxisKey, number> = {
    creative: 25,
    ambitious: 25,
    neat: 25,
    intellectual: 25,
    social: 25,
    culinary: 25,
    lazy: 25,
  };

  for (const axis of ALL_PERSONALITY_AXES) {
    const cfg = PERSONALITY_AXES_CONFIG[axis];
    let score = 25;

    // Positive trait synergy
    for (const pt of cfg.positiveTraits) {
      if (traits.has(pt)) {
        score += 32;
      }
    }

    // Negative / opposing trait dampening
    for (const nt of cfg.negativeTraits) {
      if (traits.has(nt)) {
        score -= 22;
      }
    }

    // Domain experience contribution (up to +25)
    if (domains && domains[cfg.domain]) {
      const xp = domains[cfg.domain].experiencePoints;
      score += Math.min(25, Math.round(xp * 0.14));
    }

    // Special modifier for intellectual axis from books & IQ
    if (axis === 'intellectual') {
      const bookBonus = Math.min(20, books.length * 5);
      const iqBonus = Math.min(15, Math.max(0, Math.round((iq - 100) * 0.25)));
      score += bookBonus + iqBonus;
    }

    // Special modifier for lazy axis:
    // If character evolved into Builder, Master Architect, Workaholic, or has high Architectural XP,
    // their Lazy score drops significantly toward bottom.
    if (axis === 'lazy') {
      if (
        traits.has('Builder') ||
        traits.has('Master Architect') ||
        traits.has('Workaholic') ||
        traits.has('Ambitious')
      ) {
        score -= 35;
      }
      if (domains?.ARCHITECTURAL?.experiencePoints) {
        score -= Math.min(22, Math.round(domains.ARCHITECTURAL.experiencePoints * 0.12));
      }
      if (traits.has('Lazy') || traits.has('Couch Potato')) {
        score = Math.max(score, 68);
      }
    }

    // Special modifier for ambitious if toon is lazy
    if (axis === 'ambitious') {
      if (traits.has('Lazy') || traits.has('Couch Potato')) {
        score -= 22;
      }
    }

    result[axis] = Math.max(5, Math.min(100, Math.round(score)));
  }

  return result;
}

/**
 * Returns the temporal list of personality snapshots for a character:
 * [0] Day 1 Baseline Snapshot
 * [1..N] Trait shift evolutionary milestone snapshots
 * [Last] Current Live State Snapshot
 */
export function getCharacterPersonalitySnapshots(
  char: Character,
  currentDay: number = 1
): PersonalityTraitSnapshot[] {
  const existing = char.lifeExperience?.personalitySnapshots || [];
  const currentScores = computePersonalityTraitScores(char);
  const currentDominantAxis = ALL_PERSONALITY_AXES.reduce((best, k) =>
    currentScores[k] > currentScores[best] ? k : best, 'creative' as PersonalityAxisKey
  );

  const liveSnapshot: PersonalityTraitSnapshot = {
    id: `snap_live_${char.id}`,
    label: 'Current Live State',
    timestamp: `Day ${currentDay} • Live Now`,
    gameDay: currentDay,
    traits: [...(char.traits || [])],
    traitScores: currentScores,
    dominantAxis: currentDominantAxis,
  };

  if (existing.length === 0) {
    const baselineTraits = [...(char.traits || [])];
    const baselineScores = computePersonalityTraitScores({ traits: baselineTraits });
    const baselineDominantAxis = ALL_PERSONALITY_AXES.reduce((best, k) =>
      baselineScores[k] > baselineScores[best] ? k : best, 'creative' as PersonalityAxisKey
    );
    const baselineSnapshot: PersonalityTraitSnapshot = {
      id: `snap_day1_${char.id}`,
      label: 'Day 1 Genesis Baseline',
      timestamp: 'Day 1 • 08:00 AM',
      gameDay: 1,
      traits: baselineTraits,
      traitScores: baselineScores,
      dominantAxis: baselineDominantAxis,
    };
    return [baselineSnapshot, liveSnapshot];
  }

  return [...existing, liveSnapshot];
}

/**
 * Catalog of Daily Aspiration templates that are randomly selected for each toon each in-game day.
 * Each aspiration grants an immediate motive boost and a multi-hour TemporaryMotiveBoost buff upon completion.
 */
export interface DailyAspirationTemplate {
  templateId: string;
  title: string;
  description: string;
  domain: ExperienceDomain;
  targetObjectKeywords: string[];
  affinityTraits: string[];
  targetCount: number;
  motiveBoostReward: Partial<Motives>;
  boostDurationSeconds: number;
}

export const DAILY_ASPIRATION_TEMPLATES: DailyAspirationTemplate[] = [
  {
    templateId: 'asp_studio_canvas',
    title: 'Paint an Expressive Studio Canvas',
    description: 'Spend time at the easel or studio crafting a bold visual composition today.',
    domain: 'CREATIVE',
    targetObjectKeywords: ['easel', 'paint', 'canvas'],
    affinityTraits: ['Creative', 'Artistic', 'Visionary Creator'],
    targetCount: 1,
    motiveBoostReward: { fun: 28, sanity: 22, social: 10 },
    boostDurationSeconds: 21600, // 6 in-game hours
  },
  {
    templateId: 'asp_gourmet_feast',
    title: 'Simmer a Gourmet Home-Cooked Meal',
    description: 'Prepare a warm culinary dish at the kitchen stove or outdoor grill.',
    domain: 'CULINARY',
    targetObjectKeywords: ['stove', 'fridge', 'bbq', 'dining'],
    affinityTraits: ['Foodie', 'Master Chef', 'Spice Connoisseur'],
    targetCount: 1,
    motiveBoostReward: { hunger: 35, fun: 20, sanity: 15 },
    boostDurationSeconds: 21600,
  },
  {
    templateId: 'asp_espresso_ritual',
    title: 'Artisanal Espresso & Morning Briefing',
    description: 'Pull a rich espresso shot or catch up with the morning chronicle.',
    domain: 'CULINARY',
    targetObjectKeywords: ['espresso', 'newspaper', 'stove'],
    affinityTraits: ['Ambitious', 'Foodie', 'Workaholic', 'Bookworm'],
    targetCount: 1,
    motiveBoostReward: { energy: 30, fun: 18, sanity: 15 },
    boostDurationSeconds: 21600,
  },
  {
    templateId: 'asp_literary_immersion',
    title: 'Deep Literary & Knowledge Immersion',
    description: 'Read a volume from the mahogany bookshelf or study the daily newspaper.',
    domain: 'INTELLECTUAL',
    targetObjectKeywords: ['bookshelf', 'newspaper', 'chess'],
    affinityTraits: ['Bookworm', 'Genius', 'Scholarly Polymath', 'Observant'],
    targetCount: 1,
    motiveBoostReward: { sanity: 26, fun: 22, energy: 12 },
    boostDurationSeconds: 25200, // 7 in-game hours
  },
  {
    templateId: 'asp_architectural_drafting',
    title: 'Draft Architectural & Career Blueprints',
    description: 'Work at the study desk laptop or workbench to advance household plans.',
    domain: 'ARCHITECTURAL',
    targetObjectKeywords: ['laptop', 'drafting', 'workbench', 'clock'],
    affinityTraits: ['Ambitious', 'Builder', 'Master Architect', 'Workaholic', 'Genius'],
    targetCount: 1,
    motiveBoostReward: { sanity: 24, fun: 22, energy: 18 },
    boostDurationSeconds: 21600,
  },
  {
    templateId: 'asp_spa_restoration',
    title: 'Restorative Domestic Spa & Hygiene Ritual',
    description: 'Unwind with a warm soak in the clawfoot bathtub or refresh at the vanity sink.',
    domain: 'DOMESTIC',
    targetObjectKeywords: ['bathtub', 'sink', 'vanity', 'shower'],
    affinityTraits: ['Neat', 'Zen Minimalist', 'Perfectionist'],
    targetCount: 1,
    motiveBoostReward: { hygiene: 35, sanity: 22, energy: 18 },
    boostDurationSeconds: 21600,
  },
  {
    templateId: 'asp_botanical_mindfulness',
    title: 'Botanical & Veranda Mindfulness',
    description: 'Tend to the indoor/outdoor planters or relax in the fresh air.',
    domain: 'DOMESTIC',
    targetObjectKeywords: ['plant', 'patio', 'bbq', 'sofa'],
    affinityTraits: ['Neat', 'Zen Minimalist', 'Free Spirit', 'Creative'],
    targetCount: 1,
    motiveBoostReward: { sanity: 28, fun: 20, hygiene: 12 },
    boostDurationSeconds: 21600,
  },
  {
    templateId: 'asp_social_lounge',
    title: 'Unwind & Bond in the Living Lounge',
    description: 'Relax on the plush sofa, watch a program on TV, or chat with a housemate.',
    domain: 'SOCIAL',
    targetObjectKeywords: ['sofa', 'tv', 'armchair', 'dining'],
    affinityTraits: ['Outgoing', 'Charismatic Host', 'Lazy', 'Couch Potato'],
    targetCount: 1,
    motiveBoostReward: { social: 30, fun: 26, energy: 15 },
    boostDurationSeconds: 21600,
  },
  {
    templateId: 'asp_acoustic_harmony',
    title: 'Acoustic & Musical Resonance Session',
    description: 'Practice guitar chords, spin records, or enjoy the living room entertainment.',
    domain: 'CREATIVE',
    targetObjectKeywords: ['guitar', 'jukebox', 'tv', 'easel'],
    affinityTraits: ['Music Lover', 'Creative', 'Artistic', 'Outgoing'],
    targetCount: 1,
    motiveBoostReward: { fun: 32, social: 20, sanity: 18 },
    boostDurationSeconds: 21600,
  },
  {
    templateId: 'asp_power_slumber',
    title: 'Deep Restorative Slumber & Recharge',
    description: 'Get a full rest in bed or lounge on the sofa to restore peak vitality.',
    domain: 'DOMESTIC',
    targetObjectKeywords: ['bed', 'sofa', 'armchair'],
    affinityTraits: ['Lazy', 'Couch Potato', 'NightOwl'],
    targetCount: 1,
    motiveBoostReward: { energy: 38, sanity: 20, fun: 15 },
    boostDurationSeconds: 21600,
  },
];

/**
 * Generates `count` (default 3) specific, randomly generated Daily Aspirations for a character
 * for a given `gameDay`. Balances random variety with trait affinities and available smart objects.
 */
export function generateDailyAspirationsForCharacter(
  char: Partial<Character>,
  gameDay: number = 1,
  availableObjects: SmartObject[] = DEFAULT_SMART_OBJECTS,
  count: number = 3,
  randomFn: () => number = Math.random
): DailyAspiration[] {
  const charTraits = new Set(char.traits || []);
  const availableLowerIds = availableObjects.map((o) => ({
    obj: o,
    searchStr: `${o.id} ${o.name} ${o.category} ${o.actionLabel}`.toLowerCase(),
  }));

  // Score and shuffle templates with random jitter + trait affinity + object availability
  const weighted = DAILY_ASPIRATION_TEMPLATES.map((tpl) => {
    const matchingObjEntry = availableLowerIds.find((entry) =>
      tpl.targetObjectKeywords.some((kw) => entry.searchStr.includes(kw.toLowerCase()))
    );
    const hasTraitMatch = tpl.affinityTraits.some((t) => charTraits.has(t));
    // Random weight ensures every day and reroll produces distinct goals while favoring available objects
    const weight =
      randomFn() * 45 +
      (matchingObjEntry ? 30 : 0) +
      (hasTraitMatch ? 18 : 0);

    return {
      tpl,
      preferredObjectId: matchingObjEntry?.obj.id || availableObjects[0]?.id,
      weight,
    };
  });

  weighted.sort((a, b) => b.weight - a.weight);

  // Pick top `count` templates while preferring distinct domains when possible
  const chosen: typeof weighted = [];
  const usedDomains = new Set<ExperienceDomain>();

  for (const item of weighted) {
    if (chosen.length >= count) break;
    if (!usedDomains.has(item.tpl.domain) || chosen.length >= weighted.length - 1) {
      chosen.push(item);
      usedDomains.add(item.tpl.domain);
    }
  }

  for (const item of weighted) {
    if (chosen.length >= count) break;
    if (!chosen.some((c) => c.tpl.templateId === item.tpl.templateId)) {
      chosen.push(item);
    }
  }

  return chosen.map((item, idx) => ({
    id: `daily_asp_d${gameDay}_${char.id || 'char'}_${item.tpl.templateId}_${idx}`,
    templateId: item.tpl.templateId,
    title: item.tpl.title,
    description: item.tpl.description,
    domain: item.tpl.domain,
    assignedDay: gameDay,
    targetObjectKeywords: [...item.tpl.targetObjectKeywords],
    preferredObjectId: item.preferredObjectId,
    targetCount: item.tpl.targetCount,
    currentProgress: 0,
    completed: false,
    motiveBoostReward: { ...item.tpl.motiveBoostReward },
    boostDurationSeconds: item.tpl.boostDurationSeconds,
  }));
}

/**
 * Creates the initial Daily Aspirations state for a character on `gameDay`.
 */
export function createInitialDailyAspirationsState(
  char: Partial<Character>,
  gameDay: number = 1,
  availableObjects: SmartObject[] = DEFAULT_SMART_OBJECTS,
  randomFn: () => number = Math.random
): DailyAspirationsState {
  return {
    currentDay: gameDay,
    aspirations: generateDailyAspirationsForCharacter(
      char,
      gameDay,
      availableObjects,
      3,
      randomFn
    ),
    activeMotiveBoosts: [],
    totalCompletedAllTime: 0,
  };
}

/**
 * Checks whether an object interaction, activity description, or conversation satisfies
 * a specific Daily Aspiration.
 */
export function doesActivityMatchDailyAspiration(
  aspiration: DailyAspiration,
  params: {
    object?: Pick<SmartObject, 'id' | 'name' | 'category' | 'room' | 'actionLabel'>;
    activityLabel?: string;
    isConversation?: boolean;
  }
): boolean {
  if (params.isConversation && aspiration.domain === 'SOCIAL') {
    return true;
  }
  if (
    params.object &&
    aspiration.preferredObjectId &&
    params.object.id === aspiration.preferredObjectId
  ) {
    return true;
  }
  const combined = `${params.object?.id || ''} ${params.object?.name || ''} ${
    params.object?.category || ''
  } ${params.object?.actionLabel || ''} ${params.activityLabel || ''}`.toLowerCase();

  return aspiration.targetObjectKeywords.some((kw) =>
    combined.includes(kw.toLowerCase())
  );
}

/**
 * Evaluates an autonomous decision-making bonus for a candidate SmartObject if it fulfills
 * one of the character's uncompleted Daily Aspirations for the day.
 */
export function evaluateDailyAspirationDecisionBonus(
  char: Pick<Character, 'dailyAspirations'>,
  candidateObj: SmartObject
): {
  bonusScore: number;
  matchedAspiration?: DailyAspiration;
} {
  const aspirations = char.dailyAspirations?.aspirations || [];
  for (const asp of aspirations) {
    if (asp.completed) continue;
    if (doesActivityMatchDailyAspiration(asp, { object: candidateObj })) {
      return {
        bonusScore: 28,
        matchedAspiration: asp,
      };
    }
  }
  return { bonusScore: 0 };
}

/**
 * Evaluates progress toward a character's active Daily Aspirations when they perform an activity,
 * use a SmartObject, or engage in a conversation.
 * When an aspiration is achieved:
 * - Immediately grants the aspiration's `motiveBoostReward` to the character's motives
 * - Registers an active `TemporaryMotiveBoost` buff for `boostDurationSeconds` (e.g., 6 in-game hours)
 */
export function evaluateDailyAspirationProgress(
  char: Character,
  params: {
    object?: Pick<SmartObject, 'id' | 'name' | 'category' | 'room' | 'actionLabel'>;
    activityLabel?: string;
    isConversation?: boolean;
    aspirationIdToForceComplete?: string;
    timeStr?: string;
    gameDay?: number;
  }
): {
  updatedChar: Character;
  newlyCompleted: DailyAspiration[];
  grantedBoosts: TemporaryMotiveBoost[];
  logMessages: string[];
} {
  const day = params.gameDay ?? char.dailyAspirations?.currentDay ?? 1;
  const timeStr = params.timeStr || '12:00 PM';
  const baseState =
    char.dailyAspirations || createInitialDailyAspirationsState(char, day);

  const newlyCompleted: DailyAspiration[] = [];
  const grantedBoosts: TemporaryMotiveBoost[] = [];
  const logMessages: string[] = [];
  const nextMotives: Motives = { ...char.motives };
  let nextPrivateMemory = [...char.privateMemory];
  let nextSelfTalk = char.selfTalk;
  let completedDelta = 0;

  const nextAspirations = baseState.aspirations.map((asp) => {
    if (asp.completed) return asp;

    const isForced =
      Boolean(params.aspirationIdToForceComplete) &&
      asp.id === params.aspirationIdToForceComplete;
    const isMatch =
      isForced ||
      doesActivityMatchDailyAspiration(asp, {
        object: params.object,
        activityLabel: params.activityLabel,
        isConversation: params.isConversation,
      });

    if (!isMatch) return asp;

    const nextProgress = isForced
      ? asp.targetCount
      : Math.min(asp.targetCount, asp.currentProgress + 1);
    const nowCompleted = nextProgress >= asp.targetCount;

    const updatedAsp: DailyAspiration = {
      ...asp,
      currentProgress: nextProgress,
      completed: nowCompleted,
      completedAtTimeStr: nowCompleted ? timeStr : asp.completedAtTimeStr,
    };

    if (nowCompleted) {
      completedDelta += 1;
      newlyCompleted.push(updatedAsp);

      // Apply immediate motive boost reward
      const rewardSummaryParts: string[] = [];
      Object.entries(updatedAsp.motiveBoostReward).forEach(([stat, val]) => {
        const k = stat as keyof Motives;
        if (typeof val === 'number' && typeof nextMotives[k] === 'number') {
          nextMotives[k] = Math.max(0, Math.min(100, nextMotives[k] + val));
          rewardSummaryParts.push(`+${val} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`);
        }
      });

      const boostHours = Math.round(updatedAsp.boostDurationSeconds / 3600);
      const newBoost: TemporaryMotiveBoost = {
        id: `boost_${updatedAsp.id}_${Date.now().toString(36)}`,
        aspirationTitle: updatedAsp.title,
        motiveBonuses: { ...updatedAsp.motiveBoostReward },
        decayReductionMultiplier: 0.55,
        remainingGameSeconds: updatedAsp.boostDurationSeconds,
        totalDurationSeconds: updatedAsp.boostDurationSeconds,
        grantedAtTimeStr: timeStr,
      };
      grantedBoosts.push(newBoost);

      const rewardText = rewardSummaryParts.join(', ');
      const logMsg = `[${timeStr} | Daily Aspiration Achieved] ${char.name} completed "${updatedAsp.title}" and gained a ${boostHours}h Temporary Motive Boost (${rewardText})!`;
      logMessages.push(logMsg);
      nextPrivateMemory = [...nextPrivateMemory.slice(-20), logMsg];
      nextSelfTalk = `Yes! I achieved my daily aspiration "${updatedAsp.title}"—I feel completely energized (${rewardText})!`;
    }

    return updatedAsp;
  });

  const updatedState: DailyAspirationsState = {
    currentDay: baseState.currentDay,
    aspirations: nextAspirations,
    activeMotiveBoosts: [...baseState.activeMotiveBoosts, ...grantedBoosts].slice(-6),
    totalCompletedAllTime: baseState.totalCompletedAllTime + completedDelta,
  };

  return {
    updatedChar: {
      ...char,
      motives: nextMotives,
      privateMemory: nextPrivateMemory,
      selfTalk: nextSelfTalk,
      dailyAspirations: updatedState,
    },
    newlyCompleted,
    grantedBoosts,
    logMessages,
  };
}

/**
 * Advances active TemporaryMotiveBoost timers, applies ongoing motive sustain while boosts are active,
 * and automatically rolls a new set of Daily Aspirations when a new in-game day begins (`currentDay > state.currentDay`).
 */
export function tickDailyAspirationsAndBoosts(
  char: Character,
  deltaGameSeconds: number,
  currentDay: number,
  availableObjects: SmartObject[] = DEFAULT_SMART_OBJECTS,
  timeStr: string = '08:00 AM',
  randomFn: () => number = Math.random
): {
  updatedChar: Character;
  rolledNewDay: boolean;
  expiredBoostIds: string[];
  logMessage?: string;
} {
  const baseState =
    char.dailyAspirations ||
    createInitialDailyAspirationsState(char, currentDay, availableObjects, randomFn);

  const expiredBoostIds: string[] = [];
  const activeBoosts: TemporaryMotiveBoost[] = [];

  for (const boost of baseState.activeMotiveBoosts) {
    const remaining = boost.remainingGameSeconds - Math.max(0, deltaGameSeconds);
    if (remaining > 0) {
      activeBoosts.push({
        ...boost,
        remainingGameSeconds: remaining,
      });
    } else {
      expiredBoostIds.push(boost.id);
    }
  }

  // While any TemporaryMotiveBoost is active, gently buoy the boosted motives so the toon enjoys sustained high morale
  const nextMotives: Motives = { ...char.motives };
  if (activeBoosts.length > 0 && deltaGameSeconds > 0) {
    const sustainFactor = Math.min(1, deltaGameSeconds / 3600) * 1.2;
    for (const boost of activeBoosts) {
      Object.entries(boost.motiveBonuses).forEach(([stat, val]) => {
        const k = stat as keyof Motives;
        if (typeof val === 'number' && val > 0 && typeof nextMotives[k] === 'number') {
          nextMotives[k] = Math.min(100, nextMotives[k] + sustainFactor);
        }
      });
    }
  }

  let nextAspirations = baseState.aspirations;
  let nextDay = baseState.currentDay;
  let rolledNewDay = false;
  let logMessage: string | undefined;

  if (currentDay > baseState.currentDay) {
    rolledNewDay = true;
    nextDay = currentDay;
    nextAspirations = generateDailyAspirationsForCharacter(
      char,
      currentDay,
      availableObjects,
      3,
      randomFn
    );
    logMessage = `[${timeStr} | Daily Aspirations] Day ${currentDay} began! ${char.name} set 3 new daily aspirations: ${nextAspirations.map((a) => `"${a.title}"`).join(', ')}.`;
  }

  return {
    updatedChar: {
      ...char,
      motives: nextMotives,
      dailyAspirations: {
        currentDay: nextDay,
        aspirations: nextAspirations,
        activeMotiveBoosts: activeBoosts,
        totalCompletedAllTime: baseState.totalCompletedAllTime,
      },
    },
    rolledNewDay,
    expiredBoostIds,
    logMessage,
  };
}

// ============================================================================
// BASIC NEEDS (1-10 SCALE) & OPTIONS 1 TO 5 PROGRESSION SYSTEMS
// ============================================================================

export const BASIC_NEEDS_CONFIG: Record<BasicNeedKey, NeedActionRequirement> = {
  hungry: {
    needKey: 'hungry',
    label: 'Hungry',
    actionButtonLabel: 'Cook / Eat Meal',
    depletionPerHour: 0.42, // Depletes slowly over in-game hours on 1-10 scale
    criticalThreshold: 3.0,
    requiredActionDescription: 'Cook a meal on the Stove, grab food from the Refrigerator, dine at the Dining Table, or grill on the BBQ.',
    requiredObjectKeywords: ['stove', 'fridge', 'dining', 'bbq', 'island'],
    replenishAmount1To10: 5.2,
  },
  hygiene: {
    needKey: 'hygiene',
    label: 'Hygiene',
    actionButtonLabel: 'Take Bath / Wash',
    depletionPerHour: 0.32,
    criticalThreshold: 3.0,
    requiredActionDescription: 'Take a warm bath in the Porcelain Bathtub, wash at the Bathroom Sink/Vanity, or swim in the Pool.',
    requiredObjectKeywords: ['bathtub', 'shower', 'vanity', 'sink'],
    replenishAmount1To10: 6.0,
  },
  sleep: {
    needKey: 'sleep',
    label: 'Sleep',
    actionButtonLabel: 'Sleep in Bed',
    depletionPerHour: 0.38,
    criticalThreshold: 3.0,
    requiredActionDescription: 'Sleep in the Bedroom Double Bed, rest on the Loft Bed/Sofa, or brew an Espresso boost.',
    requiredObjectKeywords: ['bed', 'sofa', 'espresso', 'armchair'],
    replenishAmount1To10: 6.5,
  },
  bathroom: {
    needKey: 'bathroom',
    label: 'Use the Bathroom',
    actionButtonLabel: 'Use Toilet',
    depletionPerHour: 0.50,
    criticalThreshold: 3.0,
    requiredActionDescription: 'Use the Classic Flush Toilet in the Bathroom.',
    requiredObjectKeywords: ['toilet'],
    replenishAmount1To10: 7.5,
  },
};

export function clampNeed1To10(val: number): number {
  const clamped = Math.max(1.0, Math.min(10.0, val));
  return Math.round(clamped * 100) / 100;
}

/**
 * Maps 0-100 Motives (`hunger`, `hygiene`, `energy`, `bladder`) to the 1-10 Basic Needs scale (`1.0` to `10.0`).
 */
export function motivesToBasicNeeds1To10(motives: Motives): BasicNeeds1To10 {
  return {
    hungry: clampNeed1To10(1 + (Math.max(0, Math.min(100, motives.hunger)) / 100) * 9),
    hygiene: clampNeed1To10(1 + (Math.max(0, Math.min(100, motives.hygiene)) / 100) * 9),
    sleep: clampNeed1To10(1 + (Math.max(0, Math.min(100, motives.energy)) / 100) * 9),
    bathroom: clampNeed1To10(1 + (Math.max(0, Math.min(100, motives.bladder)) / 100) * 9),
  };
}

/**
 * Maps 1-10 Basic Needs (`hungry`, `hygiene`, `sleep`, `bathroom`) back to 0-100 `Motives`.
 */
export function basicNeeds1To10ToMotives(
  needs: BasicNeeds1To10,
  baseMotives: Motives
): Motives {
  const to100 = (n: number) =>
    Math.max(0, Math.min(100, Math.round(((clampNeed1To10(n) - 1) / 9) * 100 * 100) / 100));
  return {
    ...baseMotives,
    hunger: to100(needs.hungry),
    hygiene: to100(needs.hygiene),
    energy: to100(needs.sleep),
    bladder: to100(needs.bathroom),
  };
}

/**
 * Returns the character's current 1-10 Basic Needs (`hungry`, `hygiene`, `sleep`, `bathroom`),
 * computing from `motives` if not yet initialized.
 */
export function getCharacterBasicNeeds1To10(
  char: Pick<Character, 'basicNeeds' | 'motives'>
): BasicNeeds1To10 {
  if (char.basicNeeds) {
    return {
      hungry: clampNeed1To10(char.basicNeeds.hungry),
      hygiene: clampNeed1To10(char.basicNeeds.hygiene),
      sleep: clampNeed1To10(char.basicNeeds.sleep),
      bathroom: clampNeed1To10(char.basicNeeds.bathroom),
    };
  }
  return motivesToBasicNeeds1To10(char.motives);
}

/**
 * Option 1A: Slowly depletes a character's 1-10 basic needs (`hungry`, `hygiene`, `sleep`, `bathroom`)
 * over elapsed game seconds (`deltaGameSeconds`) and keeps `motives` 100% synchronized.
 */
export function depleteBasicNeeds1To10(
  char: Character,
  deltaGameSeconds: number,
  decayMultiplier: number = 1.0
): Character {
  const hoursElapsed = Math.max(0, deltaGameSeconds) / 3600;
  const current = getCharacterBasicNeeds1To10(char);

  const nextNeeds: BasicNeeds1To10 = {
    hungry: clampNeed1To10(
      current.hungry - BASIC_NEEDS_CONFIG.hungry.depletionPerHour * hoursElapsed * decayMultiplier
    ),
    hygiene: clampNeed1To10(
      current.hygiene - BASIC_NEEDS_CONFIG.hygiene.depletionPerHour * hoursElapsed * decayMultiplier
    ),
    sleep: clampNeed1To10(
      current.sleep - BASIC_NEEDS_CONFIG.sleep.depletionPerHour * hoursElapsed * decayMultiplier
    ),
    bathroom: clampNeed1To10(
      current.bathroom - BASIC_NEEDS_CONFIG.bathroom.depletionPerHour * hoursElapsed * decayMultiplier
    ),
  };

  const nextMotives = basicNeeds1To10ToMotives(nextNeeds, char.motives);

  return {
    ...char,
    basicNeeds: nextNeeds,
    motives: nextMotives,
  };
}

/**
 * Finds the best SmartObject in the house to fulfill a specific 1-10 Basic Need (`hungry`, `hygiene`, `sleep`, `bathroom`).
 */
export function getRequiredObjectForBasicNeed(
  needKey: BasicNeedKey,
  availableObjects: SmartObject[] = DEFAULT_SMART_OBJECTS,
  forCharacter?: Pick<Character, 'id' | 'name' | 'assignedBedId'>
): SmartObject | null {
  const cfg = BASIC_NEEDS_CONFIG[needKey];
  if (!cfg || availableObjects.length === 0) return null;

  // When fulfilling the sleep/tiredness need, prioritize the character's own personal bed first
  if (needKey === 'sleep' && forCharacter) {
    const personalBed = availableObjects.find(
      (o) =>
        o.assignedToonId === forCharacter.id ||
        (forCharacter.assignedBedId && o.id === forCharacter.assignedBedId) ||
        (o.id.toLowerCase().includes('bed') &&
          o.name.toLowerCase().includes(forCharacter.name.split(' ')[0].toLowerCase()))
    );
    if (personalBed) return personalBed;

    const unassignedBed = availableObjects.find(
      (o) =>
        (o.id.toLowerCase().includes('bed') || o.name.toLowerCase().includes('bed')) &&
        !o.assignedToonId
    );
    if (unassignedBed) return unassignedBed;
  }

  for (const kw of cfg.requiredObjectKeywords) {
    const match = availableObjects.find(
      (o) =>
        o.id.toLowerCase().includes(kw) ||
        o.name.toLowerCase().includes(kw) ||
        o.actionLabel.toLowerCase().includes(kw)
    );
    if (match) return match;
  }
  return availableObjects[0] || null;
}

/**
 * Option 1B: Increases a character's 1-10 Basic Needs (`hungry`, `hygiene`, `sleep`, `bathroom`)
 * when specific required actions or SmartObject interactions are taken.
 */
export function fulfillBasicNeedWithAction(
  char: Character,
  params: {
    needKey?: BasicNeedKey;
    object?: Pick<SmartObject, 'id' | 'name' | 'actionLabel' | 'room' | 'effects'>;
    timeStr?: string;
  }
): {
  updatedChar: Character;
  fulfilledNeeds: BasicNeedKey[];
  deltaByNeed: Partial<Record<BasicNeedKey, number>>;
  logMessage?: string;
} {
  const current = getCharacterBasicNeeds1To10(char);
  const nextNeeds: BasicNeeds1To10 = { ...current };
  const fulfilledNeeds: BasicNeedKey[] = [];
  const deltaByNeed: Partial<Record<BasicNeedKey, number>> = {};
  const timeStr = params.timeStr || '12:00 PM';

  const applyGain = (key: BasicNeedKey, amount: number) => {
    const before = nextNeeds[key];
    const after = clampNeed1To10(before + amount);
    const actualDelta = Math.round((after - before) * 10) / 10;
    nextNeeds[key] = after;
    if (!fulfilledNeeds.includes(key)) {
      fulfilledNeeds.push(key);
    }
    deltaByNeed[key] = (deltaByNeed[key] || 0) + actualDelta;
  };

  if (params.needKey) {
    const cfg = BASIC_NEEDS_CONFIG[params.needKey];
    applyGain(params.needKey, cfg.replenishAmount1To10);
  }

  if (params.object) {
    const text = `${params.object.id} ${params.object.name} ${params.object.actionLabel}`.toLowerCase();
    const eff = params.object.effects || {};

    // Hungry actions: Stove, Fridge, Dining Table, BBQ, Kitchen Island
    if (
      text.includes('stove') ||
      text.includes('fridge') ||
      text.includes('dining') ||
      text.includes('bbq') ||
      text.includes('cook') ||
      text.includes('meal') ||
      (typeof eff.hunger === 'number' && eff.hunger > 0)
    ) {
      const gain = text.includes('stove') || text.includes('bbq') ? 5.6 : 4.5;
      if (!params.needKey || params.needKey !== 'hungry') {
        applyGain('hungry', gain);
      }
    }

    // Hygiene actions: Bathtub, Shower, Vanity, Sink
    if (
      text.includes('bathtub') ||
      text.includes('shower') ||
      text.includes('vanity') ||
      text.includes('sink') ||
      text.includes('bath') ||
      (typeof eff.hygiene === 'number' && eff.hygiene >= 20)
    ) {
      const gain = text.includes('bathtub') || text.includes('shower') ? 6.4 : 4.5;
      if (!params.needKey || params.needKey !== 'hygiene') {
        applyGain('hygiene', gain);
      }
    }

    // Sleep actions: Personal Bed (Sanctuary Bonus), Generic Bed, Sofa, Armchair, Espresso
    if (
      text.includes('bed') ||
      text.includes('sleep') ||
      text.includes('sofa') ||
      text.includes('armchair') ||
      text.includes('espresso') ||
      (typeof eff.energy === 'number' && eff.energy > 0)
    ) {
      const firstName = char.name.split(' ')[0].toLowerCase();
      const isOwnPersonalBed =
        (text.includes('bed') || text.includes('sleep')) &&
        ((char.assignedBedId && params.object.id === char.assignedBedId) ||
          (params.object as SmartObject).assignedToonId === char.id ||
          params.object.name.toLowerCase().includes(firstName));
      const gain = isOwnPersonalBed ? 8.2 : text.includes('bed') || text.includes('sleep') ? 6.8 : 3.2;
      if (!params.needKey || params.needKey !== 'sleep') {
        applyGain('sleep', gain);
      }
    }

    // Use the Bathroom actions: Toilet
    if (
      text.includes('toilet') ||
      text.includes('bathroom') ||
      (typeof eff.bladder === 'number' && eff.bladder > 0)
    ) {
      if (!params.needKey || params.needKey !== 'bathroom') {
        applyGain('bathroom', 7.5);
      }
    }
  }

  const nextMotives = basicNeeds1To10ToMotives(nextNeeds, char.motives);
  let nextSelfTalk = char.selfTalk;
  let logMessage: string | undefined;

  if (fulfilledNeeds.length > 0) {
    const primary = fulfilledNeeds[0];
    const cfg = BASIC_NEEDS_CONFIG[primary];
    const newVal = nextNeeds[primary].toFixed(1);
    const actionName = params.object?.actionLabel || cfg.actionButtonLabel;
    const firstName = char.name.split(' ')[0].toLowerCase();
    const isPersonalBedSleep =
      primary === 'sleep' &&
      params.object &&
      ((char.assignedBedId && params.object.id === char.assignedBedId) ||
        (params.object as SmartObject).assignedToonId === char.id ||
        params.object.name.toLowerCase().includes(firstName));
    const bonusNote = isPersonalBedSleep ? ' (Personal Bed Sanctuary Bonus)' : '';
    logMessage = `[${timeStr} | Basic Need Fulfilled] ${char.name} performed "${actionName}"${bonusNote} → ${cfg.label} increased to ${newVal}/10!`;
    nextSelfTalk = `Much better! Taking time for "${actionName.toLowerCase()}" brought my ${cfg.label.toLowerCase()} need up to ${newVal}/10.`;
  }

  const baseUpdated: Character = {
    ...char,
    basicNeeds: nextNeeds,
    motives: nextMotives,
    selfTalk: nextSelfTalk,
    privateMemory: logMessage
      ? [...char.privateMemory.slice(-20), logMessage]
      : char.privateMemory,
  };

  const moodEval = evaluateCharacterMoodletsAndEmotion(baseUpdated);

  return {
    updatedChar: moodEval.updatedChar,
    fulfilledNeeds,
    deltaByNeed,
    logMessage,
  };
}

/**
 * Option 1C: Evaluates whether any of a character's 1-10 Basic Needs (`bathroom`, `sleep`, `hungry`, `hygiene`)
 * has dropped to or below the critical threshold (`<= 3.0 / 10`), returning an emergency autonomous interrupt
 * and the required SmartObject to immediately replenish that need.
 */
export function evaluateUrgentBasicNeedInterrupt(
  char: Character,
  availableObjects: SmartObject[] = DEFAULT_SMART_OBJECTS
): {
  urgentNeed: BasicNeedKey | null;
  targetObject: SmartObject | null;
  needValue1To10: number;
  reason: string;
} {
  const needs = getCharacterBasicNeeds1To10(char);
  const priorityOrder: BasicNeedKey[] = ['bathroom', 'hungry', 'sleep', 'hygiene'];

  let mostUrgentKey: BasicNeedKey | null = null;
  let lowestVal = 10.0;

  for (const key of priorityOrder) {
    const val = needs[key];
    const threshold = BASIC_NEEDS_CONFIG[key].criticalThreshold;
    if (val <= threshold && val < lowestVal) {
      lowestVal = val;
      mostUrgentKey = key;
    }
  }

  if (!mostUrgentKey) {
    return {
      urgentNeed: null,
      targetObject: null,
      needValue1To10: Math.min(needs.hungry, needs.hygiene, needs.sleep, needs.bathroom),
      reason: 'All 1-10 basic needs are above critical threshold.',
    };
  }

  const targetObj = getRequiredObjectForBasicNeed(mostUrgentKey, availableObjects, char);
  const cfg = BASIC_NEEDS_CONFIG[mostUrgentKey];

  return {
    urgentNeed: mostUrgentKey,
    targetObject: targetObj,
    needValue1To10: lowestVal,
    reason: `Urgent ${cfg.label} Need (${lowestVal.toFixed(1)}/10) — requires ${targetObj?.name || cfg.actionButtonLabel}`,
  };
}

// ============================================================================
// OPTION 2: DYNAMIC RELATIONSHIP & SOCIAL AFFINITY MATRIX (1-10 AFFINITY)
// ============================================================================

export function computeTraitCompatibilityBonus(traitsA: string[], traitsB: string[]): number {
  let bonus = 0;
  const setA = new Set(traitsA);
  for (const t of traitsB) {
    if (setA.has(t)) bonus += 0.35;
  }
  if (
    (setA.has('Neat') && traitsB.includes('Lazy')) ||
    (setA.has('Lazy') && traitsB.includes('Neat'))
  ) {
    bonus -= 0.25;
  }
  if (
    (setA.has('Creative') || setA.has('Artistic')) &&
    (traitsB.includes('Music Lover') || traitsB.includes('Creative') || traitsB.includes('Artistic'))
  ) {
    bonus += 0.4;
  }
  return Math.round(bonus * 100) / 100;
}

export const BABY_AFFINITY_THRESHOLD = 8.5;
export const MAX_HOUSEHOLD_POPULATION = 6;

/**
 * Checks whether two characters are biologically or familially related
 * (parent/child, siblings sharing a parent, or explicit family link).
 */
export function areCharactersRelated(
  charA: Pick<Character, 'id' | 'parentIds' | 'childrenIds' | 'relatedCharIds'>,
  charB: Pick<Character, 'id' | 'parentIds' | 'childrenIds' | 'relatedCharIds'>
): boolean {
  if (charA.id === charB.id) return true;
  if (charA.parentIds?.includes(charB.id) || charB.parentIds?.includes(charA.id)) return true;
  if (charA.childrenIds?.includes(charB.id) || charB.childrenIds?.includes(charA.id)) return true;
  if (charA.relatedCharIds?.includes(charB.id) || charB.relatedCharIds?.includes(charA.id)) return true;
  if (
    charA.parentIds &&
    charB.parentIds &&
    charA.parentIds.some((pid) => charB.parentIds!.includes(pid))
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if two characters are an unrelated opposite-sex (Masculine + Feminine) adult pair.
 */
export function isOppositeSexUnrelatedPair(
  charA: Pick<Character, 'id' | 'genderFrame' | 'parentIds' | 'childrenIds' | 'relatedCharIds' | 'isBabyOrChild'>,
  charB: Pick<Character, 'id' | 'genderFrame' | 'parentIds' | 'childrenIds' | 'relatedCharIds' | 'isBabyOrChild'>
): boolean {
  if (areCharactersRelated(charA, charB)) return false;
  if (charA.isBabyOrChild || charB.isBabyOrChild) return false;
  const isMaleFemale =
    (charA.genderFrame === 'Masculine' && charB.genderFrame === 'Feminine') ||
    (charA.genderFrame === 'Feminine' && charB.genderFrame === 'Masculine');
  return isMaleFemale;
}

export function classifyRelationshipStatus(
  affinity1To10: number,
  traitsA: string[],
  traitsB: string[],
  options?: { isRelated?: boolean; isOppositeSexUnrelated?: boolean }
): ToonRelationshipEntry['status'] {
  if (options?.isRelated) return 'Family Bond';
  if (affinity1To10 < 3.5) return 'Household Rival';
  if (affinity1To10 < 4.5) return 'Stranger';
  if (affinity1To10 < 6.0) return 'Acquaintance';
  if (options?.isOppositeSexUnrelated && affinity1To10 >= BABY_AFFINITY_THRESHOLD) {
    return 'Soulmate';
  }
  if (options?.isOppositeSexUnrelated && affinity1To10 >= 7.6) {
    return 'Romantic Partner';
  }
  if (
    affinity1To10 >= 7.5 &&
    (traitsA.includes('Creative') || traitsA.includes('Artistic') || traitsA.includes('Builder')) &&
    (traitsB.includes('Creative') || traitsB.includes('Artistic') || traitsB.includes('Builder') || traitsB.includes('Music Lover'))
  ) {
    return 'Creative Collaborator';
  }
  if (affinity1To10 >= 8.5) return 'Best Friend';
  if (affinity1To10 >= 7.2) return 'Trusted Friend';
  return 'Friend';
}

/**
 * Evaluates whether two characters can have a baby together:
 * - Must be unrelated (`!areCharactersRelated`)
 * - Must be an opposite-sex pair (`Masculine` and `Feminine`)
 * - Neither is a baby/child or Elder
 * - Relationship affinity between them is >= BABY_AFFINITY_THRESHOLD (8.5 / 10)
 * - Household population is below MAX_HOUSEHOLD_POPULATION (6)
 */
export function canHaveBabyTogether(
  charA: Character,
  charB: Character,
  allCharacters: Character[] = [charA, charB]
): {
  eligible: boolean;
  affinity1To10: number;
  isRelated: boolean;
  isOppositeSex: boolean;
  reason: string;
} {
  const isRel = areCharactersRelated(charA, charB);
  const isOppSex =
    (charA.genderFrame === 'Masculine' && charB.genderFrame === 'Feminine') ||
    (charA.genderFrame === 'Feminine' && charB.genderFrame === 'Masculine');

  const relEntry =
    charA.relationships?.[charB.id] ||
    charB.relationships?.[charA.id];
  const compat = computeTraitCompatibilityBonus(charA.traits, charB.traits);
  const affinity = relEntry ? relEntry.affinity1To10 : clampNeed1To10(5.5 + compat);

  if (charA.id === charB.id) {
    return {
      eligible: false,
      affinity1To10: affinity,
      isRelated: true,
      isOppositeSex: false,
      reason: 'Same character.',
    };
  }
  if (isRel) {
    return {
      eligible: false,
      affinity1To10: affinity,
      isRelated: true,
      isOppositeSex: isOppSex,
      reason: 'Related family members cannot have a baby together.',
    };
  }
  if (!isOppSex) {
    return {
      eligible: false,
      affinity1To10: affinity,
      isRelated: false,
      isOppositeSex: false,
      reason: 'Requires an unrelated male and female pair.',
    };
  }
  if (charA.isBabyOrChild || charB.isBabyOrChild || charA.ageStage === 'Elder' || charB.ageStage === 'Elder') {
    return {
      eligible: false,
      affinity1To10: affinity,
      isRelated: false,
      isOppositeSex: true,
      reason: 'Both parents must be Young Adult or Adult.',
    };
  }
  if (allCharacters.length >= MAX_HOUSEHOLD_POPULATION) {
    return {
      eligible: false,
      affinity1To10: affinity,
      isRelated: false,
      isOppositeSex: true,
      reason: `Household is at maximum capacity (${MAX_HOUSEHOLD_POPULATION} toons).`,
    };
  }
  if (affinity < BABY_AFFINITY_THRESHOLD) {
    return {
      eligible: false,
      affinity1To10: affinity,
      isRelated: false,
      isOppositeSex: true,
      reason: `Needs ${BABY_AFFINITY_THRESHOLD.toFixed(1)}/10 affinity to have a baby (currently ${affinity.toFixed(1)}/10).`,
    };
  }

  return {
    eligible: true,
    affinity1To10: affinity,
    isRelated: false,
    isOppositeSex: true,
    reason: `Strong bond (${affinity.toFixed(1)}/10 Soulmates) — ready to welcome a baby!`,
  };
}

export function createInitialRelationshipsForCharacter(
  char: Character,
  allCharacters: Character[]
): Record<string, ToonRelationshipEntry> {
  const map: Record<string, ToonRelationshipEntry> = {};

  for (const other of allCharacters) {
    if (other.id === char.id) continue;
    const existing = char.relationships?.[other.id] || other.relationships?.[char.id];
    const isRel = areCharactersRelated(char, other);
    const isOppUnrel = isOppositeSexUnrelatedPair(char, other);
    const compat = computeTraitCompatibilityBonus(char.traits, other.traits);
    const initialAffinity = existing
      ? clampNeed1To10(existing.affinity1To10)
      : isRel
      ? 9.5
      : clampNeed1To10(5.5 + compat);
    const status = classifyRelationshipStatus(initialAffinity, char.traits, other.traits, {
      isRelated: isRel,
      isOppositeSexUnrelated: isOppUnrel,
    });
    const canBaby =
      isOppUnrel &&
      !char.isBabyOrChild &&
      !other.isBabyOrChild &&
      char.ageStage !== 'Elder' &&
      other.ageStage !== 'Elder' &&
      allCharacters.length < MAX_HOUSEHOLD_POPULATION &&
      initialAffinity >= BABY_AFFINITY_THRESHOLD;

    map[other.id] = {
      targetCharId: other.id,
      targetName: other.name,
      affinity1To10: initialAffinity,
      status,
      sharedConversationsCount: existing?.sharedConversationsCount ?? 1,
      lastInteractionSummary:
        existing?.lastInteractionSummary ||
        (isRel
          ? `Family bond with ${other.name.split(' ')[0]}.`
          : `Moved into the household together with ${other.name.split(' ')[0]}.`),
      compatibilityBonus: compat,
      isRelated: isRel,
      canHaveBaby: canBaby,
    };
  }

  return map;
}

export function updateRelationshipBetweenToons(
  speaker: Character,
  listener: Character,
  timeStr: string = '12:00 PM',
  topicSummary?: string,
  affinityDeltaOverride?: number
): {
  updatedSpeaker: Character;
  updatedListener: Character;
  relationshipEntry: ToonRelationshipEntry;
  logMessage: string;
} {
  const speakerRels = createInitialRelationshipsForCharacter(speaker, [speaker, listener]);
  const listenerRels = createInitialRelationshipsForCharacter(listener, [speaker, listener]);

  const existing = speakerRels[listener.id];
  const isRel = areCharactersRelated(speaker, listener);
  const isOppUnrel = isOppositeSexUnrelatedPair(speaker, listener);
  const compat = computeTraitCompatibilityBonus(speaker.traits, listener.traits);
  const delta =
    typeof affinityDeltaOverride === 'number'
      ? affinityDeltaOverride
      : Math.max(0.35, Math.round((0.55 + compat * 0.35) * 100) / 100);
  const nextAffinity = clampNeed1To10((existing?.affinity1To10 ?? 5.5) + delta);
  const nextCount = (existing?.sharedConversationsCount ?? 0) + 1;
  const nextStatus = classifyRelationshipStatus(nextAffinity, speaker.traits, listener.traits, {
    isRelated: isRel,
    isOppositeSexUnrelated: isOppUnrel,
  });
  const canBaby =
    isOppUnrel &&
    !speaker.isBabyOrChild &&
    !listener.isBabyOrChild &&
    speaker.ageStage !== 'Elder' &&
    listener.ageStage !== 'Elder' &&
    nextAffinity >= BABY_AFFINITY_THRESHOLD;

  const summary =
    topicSummary ||
    `Shared conversation in the ${speaker.room} at ${timeStr} (${nextStatus}, ${nextAffinity.toFixed(1)}/10).`;

  const speakerEntry: ToonRelationshipEntry = {
    targetCharId: listener.id,
    targetName: listener.name,
    affinity1To10: nextAffinity,
    status: nextStatus,
    sharedConversationsCount: nextCount,
    lastInteractionSummary: summary,
    compatibilityBonus: compat,
    isRelated: isRel,
    canHaveBaby: canBaby,
  };

  const listenerEntry: ToonRelationshipEntry = {
    targetCharId: speaker.id,
    targetName: speaker.name,
    affinity1To10: nextAffinity,
    status: nextStatus,
    sharedConversationsCount: nextCount,
    lastInteractionSummary: summary,
    compatibilityBonus: compat,
    isRelated: isRel,
    canHaveBaby: canBaby,
  };

  const logMessage = `[${timeStr} | Social Affinity] ${speaker.name.split(' ')[0]} & ${listener.name.split(' ')[0]}'s bond grew to ${nextAffinity.toFixed(1)}/10 (${nextStatus})${canBaby ? ' — Strong enough to have a baby!' : ''}!`;

  return {
    updatedSpeaker: {
      ...speaker,
      relationships: {
        ...speakerRels,
        [listener.id]: speakerEntry,
      },
    },
    updatedListener: {
      ...listener,
      relationships: {
        ...listenerRels,
        [speaker.id]: listenerEntry,
      },
    },
    relationshipEntry: speakerEntry,
    logMessage,
  };
}

/**
 * Pure layout & edge generator for the visual Social Web component in CharacterInspector.
 * Places nodes radially around the canvas and computes styled edges between all household toons
 * based on their 1-10 affinity scores and relationship statuses.
 */
export function buildSocialWebGraph(
  selectedChar: Character,
  allCharacters: Character[],
  width: number = 280,
  height: number = 220
): {
  nodes: SocialWebNode[];
  edges: SocialWebEdge[];
} {
  const roster =
    allCharacters.length > 0
      ? allCharacters.some((c) => c.id === selectedChar.id)
        ? allCharacters
        : [selectedChar, ...allCharacters]
      : [selectedChar];

  const cx = width / 2;
  const cy = height / 2;
  const rx = Math.max(64, width * 0.36);
  const ry = Math.max(54, height * 0.35);

  // Order with selectedChar first so it sits at the top apex (-90 deg) of the Social Web
  const ordered = [
    selectedChar,
    ...roster.filter((c) => c.id !== selectedChar.id),
  ];

  const nodes: SocialWebNode[] = ordered.map((char, idx) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / Math.max(1, ordered.length);
    const x =
      ordered.length === 1
        ? cx
        : Math.round((cx + rx * Math.cos(angle)) * 10) / 10;
    const y =
      ordered.length === 1
        ? cy
        : Math.round((cy + ry * Math.sin(angle)) * 10) / 10;

    return {
      id: char.id,
      name: char.name,
      firstName: char.name.split(' ')[0],
      color: char.color || '#6366f1',
      genderFrame: char.genderFrame,
      ageStage: char.ageStage,
      isSelected: char.id === selectedChar.id,
      isBabyOrChild: Boolean(char.isBabyOrChild),
      x,
      y,
    };
  });

  const edges: SocialWebEdge[] = [];
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const charA = ordered[i];
      const charB = ordered[j];
      const relMapA = createInitialRelationshipsForCharacter(charA, ordered);
      const entry = relMapA[charB.id];
      const affinity = entry ? entry.affinity1To10 : 5.5;
      const status = entry ? entry.status : 'Acquaintance';
      const isRel = areCharactersRelated(charA, charB);
      const babyEval = canHaveBabyTogether(charA, charB, ordered);

      let strokeColor = '#6366f1'; // Friend / Trusted Friend default indigo
      let isDashed = false;

      if (status === 'Household Rival') {
        strokeColor = '#f43f5e'; // Rose red for Rival
        isDashed = true;
      } else if (status === 'Stranger' || status === 'Acquaintance') {
        strokeColor = '#f59e0b'; // Amber for Acquaintance
        isDashed = affinity < 5.0;
      } else if (status === 'Soulmate' || status === 'Romantic Partner') {
        strokeColor = '#ec4899'; // Vibrant Pink for Romantic / Soulmate
      } else if (status === 'Family Bond') {
        strokeColor = '#06b6d4'; // Cyan for Family Bond
      } else if (status === 'Best Friend' || status === 'Creative Collaborator') {
        strokeColor = '#10b981'; // Emerald for Best Friend
      }

      const strokeWidth =
        Math.round((1.4 + ((affinity - 1) / 9) * 3.4) * 10) / 10;

      edges.push({
        id: `edge_${charA.id}_${charB.id}`,
        fromId: charA.id,
        toId: charB.id,
        fromName: charA.name.split(' ')[0],
        toName: charB.name.split(' ')[0],
        affinity1To10: affinity,
        status,
        strokeWidth,
        strokeColor,
        isDashed,
        isRelated: isRel,
        canHaveBaby: babyEval.eligible,
        involvesSelected:
          charA.id === selectedChar.id || charB.id === selectedChar.id,
      });
    }
  }

  return { nodes, edges };
}

const BABY_FIRST_NAMES_MASCULINE = ['Leo', 'Milo', 'Theo', 'Liam', 'Noah', 'Julian'];
const BABY_FIRST_NAMES_FEMININE = ['Aria', 'Luna', 'Clara', 'Iris', 'Maya', 'hazel'];

/**
 * Welcomes a new baby character into the household when an unrelated male (Masculine)
 * and female (Feminine) pair have a strong enough relationship (affinity >= 8.5/10).
 */
export function haveBabyBetweenToons(
  charA: Character,
  charB: Character,
  allCharacters: Character[],
  smartObjects: SmartObject[] = DEFAULT_SMART_OBJECTS,
  timeStr: string = '12:00 PM',
  randomFn: () => number = Math.random
): {
  success: boolean;
  baby?: Character;
  updatedCharacters: Character[];
  logMessage: string;
} {
  const eligibility = canHaveBabyTogether(charA, charB, allCharacters);
  if (!eligibility.eligible) {
    return {
      success: false,
      updatedCharacters: allCharacters,
      logMessage: eligibility.reason,
    };
  }

  const father = charA.genderFrame === 'Masculine' ? charA : charB;
  const mother = charA.genderFrame === 'Feminine' ? charA : charB;

  const isBabyGirl = randomFn() < 0.5;
  const babyGender: Character['genderFrame'] = isBabyGirl ? 'Feminine' : 'Masculine';
  const namePool = isBabyGirl ? BABY_FIRST_NAMES_FEMININE : BABY_FIRST_NAMES_MASCULINE;
  const existingFirstNames = new Set(allCharacters.map((c) => c.name.split(' ')[0].toLowerCase()));
  const availableFirst = namePool.filter((n) => !existingFirstNames.has(n.toLowerCase()));
  const rawFirst =
    (availableFirst.length > 0 ? availableFirst : namePool)[
      Math.floor(randomFn() * (availableFirst.length > 0 ? availableFirst.length : namePool.length))
    ];
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
  const motherSurname = mother.name.split(' ').slice(1).join(' ') || 'Vance';
  const fatherSurname = father.name.split(' ').slice(1).join(' ') || 'Cole';
  const babyName = `${firstName} ${motherSurname}-${fatherSurname}`;
  const babyId = `char_baby_${Date.now().toString(36)}_${Math.floor(randomFn() * 1000)}`;

  const inheritedMotherTrait = mother.traits[0] || 'Creative';
  const inheritedFatherTrait =
    father.traits.find((t) => t !== inheritedMotherTrait) || father.traits[0] || 'Ambitious';
  const babyTraits = Array.from(
    new Set([inheritedMotherTrait, inheritedFatherTrait, 'Bundle of Joy'])
  );

  const bedObj =
    smartObjects.find((o) => o.id.includes('bed')) ||
    smartObjects.find((o) => o.room === 'Bedroom') ||
    smartObjects[0];
  const rawPos = bedObj
    ? { x: bedObj.gridPos.x - 1.6, y: bedObj.gridPos.y, z: bedObj.gridPos.z + 1.1 }
    : { x: 4.2, y: 0, z: 5.2 };
  const safeBabyPos = resolveFurnitureCollision(
    rawPos,
    smartObjects,
    bedObj?.id,
    allCharacters,
    babyId
  );

  const parentGen = Math.max(father.lineageGeneration || 1, mother.lineageGeneration || 1);

  const newBaby: Character = {
    id: babyId,
    name: babyName,
    ageStage: 'Young Adult',
    isBabyOrChild: true,
    traits: babyTraits,
    lifeGoal: `Grow Up Happy with ${mother.name.split(' ')[0]} & ${father.name.split(' ')[0]}`,
    room: bedObj?.room || 'Bedroom',
    pos: { x: safeBabyPos.x, y: rawPos.y, z: safeBabyPos.z },
    lookAtPos: { ...mother.pos },
    onGrid: true,
    currentAction: `Cooing & bonding with ${mother.name.split(' ')[0]} & ${father.name.split(' ')[0]}`,
    actionTimer: 7200,
    selfTalk: `Happy to be part of ${mother.name.split(' ')[0]} and ${father.name.split(' ')[0]}'s family!`,
    motives: {
      hunger: 95,
      energy: 95,
      bladder: 95,
      hygiene: 100,
      social: 100,
      fun: 100,
      sanity: 100,
    },
    basicNeeds: {
      hungry: 9.5,
      hygiene: 10.0,
      sleep: 9.5,
      bathroom: 9.5,
    },
    privateMemory: [
      `[BIRTH] Born into the household to parents ${mother.name} and ${father.name} at ${timeStr}!`,
    ],
    color: isBabyGirl ? '#ec4899' : '#06b6d4',
    genderFrame: babyGender,
    hairStyle: isBabyGirl ? 'Messy Bun' : 'Cropped Bob',
    facialHair: 'None',
    clothingTop: 'Hoodie',
    clothingBottom: 'Lounge Shorts',
    skinTone: mother.skinTone || father.skinTone || 'Fair',
    boneScale: { height: 0.58, shoulderWidth: 0.62, chestDepth: 0.62 },
    daysLived: 0.1,
    lineageGeneration: parentGen + 1,
    parentIds: [father.id, mother.id],
    relatedCharIds: [father.id, mother.id],
  };

  newBaby.knowledgebase = createInitialToonKnowledgebase(newBaby);
  newBaby.intelligenceScore = newBaby.knowledgebase.intelligenceScore;
  newBaby.skillTree = createInitialSkillTree(newBaby);
  newBaby.lifeExperience = createInitialLifeExperienceTracker(newBaby);
  newBaby.dailyAspirations = createInitialDailyAspirationsState(newBaby, 1, smartObjects);

  const logMessage = `[${timeStr} | New Baby Born!] Unrelated soulmates ${mother.name} & ${father.name} welcomed baby ${babyName} (Gen ${parentGen + 1}) into the household!`;

  const nextCharsBase = allCharacters.map((c) => {
    if (c.id === father.id || c.id === mother.id) {
      const otherParent = c.id === father.id ? mother : father;
      return {
        ...c,
        partnerId: otherParent.id,
        childrenIds: Array.from(new Set([...(c.childrenIds || []), babyId])),
        relatedCharIds: Array.from(new Set([...(c.relatedCharIds || []), babyId])),
        currentAction: `Cradling newborn ${firstName} with ${otherParent.name.split(' ')[0]}`,
        actionTimer: 7200,
        selfTalk: `We welcomed baby ${babyName} into the world! Our family is growing!`,
        motives: {
          ...c.motives,
          social: 100,
          fun: 100,
          sanity: 100,
        },
        privateMemory: [...c.privateMemory.slice(-20), logMessage],
      };
    }
    return c;
  });

  const fullRoster = [...nextCharsBase, newBaby];
  const updatedWithRels = fullRoster.map((c) => ({
    ...c,
    relationships: createInitialRelationshipsForCharacter(c, fullRoster),
  }));

  return {
    success: true,
    baby: updatedWithRels.find((c) => c.id === babyId),
    updatedCharacters: updatedWithRels,
    logMessage,
  };
}

// ============================================================================
// OPTION 3: PROGRESSIVE 1-10 SKILL MASTERY TREES & MASTERWORK ROYALTIES
// ============================================================================

export const SKILL_DOMAIN_METADATA: Record<
  SkillDomainKey,
  { label: string; keywords: string[]; perksByTier: [string, string, string] }
> = {
  cooking: {
    label: 'Culinary Arts',
    keywords: ['stove', 'fridge', 'bbq', 'espresso', 'dining', 'island'],
    perksByTier: ['Home Cook (+15% Meal Quality)', 'Sous-Chef Searing (+30% Hunger Restore)', 'Master Chef Signature Feast (+§95 catering bonus)'],
  },
  painting: {
    label: 'Fine Art & Canvas',
    keywords: ['easel', 'plant', 'sculpture'],
    perksByTier: ['Sketch Apprentice', 'Gallery Colorist (+§65 Canvas Sales)', 'Masterwork Virtuoso (+§160 Gallery Royalties)'],
  },
  handiness: {
    label: 'Architecture & Handiness',
    keywords: ['clock', 'workbench', 'stair', 'build', 'repair'],
    perksByTier: ['Steady Joinery', 'Structural Craftsman', 'Master Architect (+§140 Blueprint Consulting)'],
  },
  logic: {
    label: 'Logic & Research',
    keywords: ['bookshelf', 'laptop', 'newspaper', 'chess', 'telescope', 'arcade'],
    perksByTier: ['Analytical Reader', 'Systems Synthesist (+IQ Gain)', 'Grandmaster Savant (+§130 Research Grant)'],
  },
  music: {
    label: 'Music & Acoustics',
    keywords: ['guitar', 'piano', 'turntable', 'jukebox', 'tv'],
    perksByTier: ['Rhythm Student', 'Session Arranger', 'Virtuoso Composer (+§125 Licensing Royalties)'],
  },
  charisma: {
    label: 'Charisma & Diplomacy',
    keywords: ['sofa', 'armchair', 'coffee_table', 'pool', 'chat'],
    perksByTier: ['Warm Host', 'Eloquent Storyteller', 'Household Luminary (+§110 Media Stipend)'],
  },
};

export function createInitialSkillTree(char: Pick<Character, 'traits' | 'skills' | 'skillTree'>): ToonSkillTreeState {
  if (char.skillTree) return char.skillTree;

  const buildEntry = (key: SkillDomainKey, baseLevel: number): ToonSkillEntry => {
    const meta = SKILL_DOMAIN_METADATA[key];
    const lvl = clampNeed1To10(baseLevel);
    const perkIdx = lvl >= 7.5 ? 2 : lvl >= 4.0 ? 1 : 0;
    return {
      key,
      label: meta.label,
      level1To10: lvl,
      xp: Math.round((lvl - 1) * 100),
      unlockedPerk: meta.perksByTier[perkIdx],
      royaltyBonusSimoleons: lvl >= 5.0 ? Math.round(lvl * 18) : 0,
    };
  };

  const traits = char.traits || [];
  return {
    cooking: buildEntry('cooking', traits.includes('Foodie') ? 3.4 : 2.0),
    painting: buildEntry('painting', traits.includes('Creative') || traits.includes('Artistic') ? 3.6 : 1.8),
    handiness: buildEntry('handiness', traits.includes('Builder') || traits.includes('Neat') ? 3.5 : 2.0),
    logic: buildEntry('logic', traits.includes('Genius') || traits.includes('Bookworm') ? 3.8 : 2.2),
    music: buildEntry('music', traits.includes('Music Lover') ? 3.6 : 1.6),
    charisma: buildEntry('charisma', traits.includes('Outgoing') || traits.includes('Ambitious') ? 3.4 : 2.2),
  };
}

export function inferSkillDomainFromObject(
  obj: Pick<SmartObject, 'id' | 'name' | 'category' | 'actionLabel'>
): SkillDomainKey {
  const text = `${obj.id} ${obj.name} ${obj.actionLabel}`.toLowerCase();
  for (const [domain, meta] of Object.entries(SKILL_DOMAIN_METADATA) as Array<
    [SkillDomainKey, (typeof SKILL_DOMAIN_METADATA)[SkillDomainKey]]
  >) {
    if (meta.keywords.some((kw) => text.includes(kw))) {
      return domain;
    }
  }
  if (obj.category === 'kitchen') return 'cooking';
  if (obj.category === 'study') return 'logic';
  return 'charisma';
}

export function advanceCharacterSkillFromAction(
  char: Character,
  object: Pick<SmartObject, 'id' | 'name' | 'category' | 'actionLabel'>,
  timeStr: string = '12:00 PM'
): {
  updatedChar: Character;
  advancedSkill: ToonSkillEntry;
  leveledUp: boolean;
  royaltyEarned: number;
  logMessage?: string;
} {
  const tree = createInitialSkillTree(char);
  const domain = inferSkillDomainFromObject(object);
  const current = tree[domain];
  const meta = SKILL_DOMAIN_METADATA[domain];

  const prevWholeLevel = Math.floor(current.level1To10);
  const nextXp = current.xp + 45;
  const nextLevel = clampNeed1To10(1 + nextXp / 100);
  const newWholeLevel = Math.floor(nextLevel);
  const leveledUp = newWholeLevel > prevWholeLevel;

  const perkIdx = nextLevel >= 7.5 ? 2 : nextLevel >= 4.0 ? 1 : 0;
  const royaltyEarned =
    nextLevel >= 3.0 && (domain === 'painting' || domain === 'cooking' || domain === 'music' || domain === 'logic' || domain === 'handiness')
      ? Math.round(nextLevel * 22)
      : 0;

  const updatedSkill: ToonSkillEntry = {
    key: domain,
    label: meta.label,
    level1To10: nextLevel,
    xp: nextXp,
    unlockedPerk: meta.perksByTier[perkIdx],
    royaltyBonusSimoleons: royaltyEarned,
  };

  const nextTree: ToonSkillTreeState = {
    ...tree,
    [domain]: updatedSkill,
  };

  let logMessage: string | undefined;
  if (leveledUp || royaltyEarned >= 70) {
    logMessage = `[${timeStr} | Skill Mastery] ${char.name}'s ${meta.label} reached Level ${nextLevel.toFixed(1)}/10 (${updatedSkill.unlockedPerk})${royaltyEarned > 0 ? ` and earned §${royaltyEarned} in masterwork royalties!` : '!'}`;
  }

  return {
    updatedChar: {
      ...char,
      skillTree: nextTree,
      totalRoyaltiesEarned: (char.totalRoyaltiesEarned || 0) + royaltyEarned,
    },
    advancedSkill: updatedSkill,
    leveledUp,
    royaltyEarned,
    logMessage,
  };
}

// ============================================================================
// OPTION 4: DYNAMIC MOODLETS & EMOTIONAL STATE ENGINE
// ============================================================================

export function evaluateCharacterMoodletsAndEmotion(
  char: Character,
  smartObjects: SmartObject[] = DEFAULT_SMART_OBJECTS,
  weatherCondition: string = 'CLEAR'
): {
  emotionalState: EmotionalState;
  activeMoodlets: ActiveMoodlet[];
  updatedChar: Character;
} {
  const needs = getCharacterBasicNeeds1To10(char);
  const moodlets: ActiveMoodlet[] = [];

  // Negative Need Moodlets when any 1-10 Basic Need is low (<= 3.5)
  if (needs.bathroom <= 3.0) {
    moodlets.push({
      id: 'mood_urgent_bathroom',
      title: 'Bladder Emergency',
      emotion: 'Desperate',
      polarity: 'NEGATIVE',
      sourceNeedOrActivity: `Bathroom Need (${needs.bathroom.toFixed(1)}/10)`,
      description: 'Must use the bathroom toilet immediately!',
      remainingSeconds: 3600,
    });
  }
  if (needs.hungry <= 3.2) {
    moodlets.push({
      id: 'mood_ravenous',
      title: 'Ravenous Stomach',
      emotion: 'Ravenous',
      polarity: 'NEGATIVE',
      sourceNeedOrActivity: `Hungry Need (${needs.hungry.toFixed(1)}/10)`,
      description: 'Needs a warm meal from the kitchen stove or fridge.',
      remainingSeconds: 3600,
    });
  }
  if (needs.sleep <= 3.2) {
    moodlets.push({
      id: 'mood_exhausted',
      title: 'Heavy Eyelids',
      emotion: 'Exhausted',
      polarity: 'NEGATIVE',
      sourceNeedOrActivity: `Sleep Need (${needs.sleep.toFixed(1)}/10)`,
      description: 'Desperately needs to sleep in a bed or brew espresso.',
      remainingSeconds: 3600,
    });
  }
  if (needs.hygiene <= 3.2) {
    moodlets.push({
      id: 'mood_grimy',
      title: 'Needs a Bath',
      emotion: 'Uncomfortable',
      polarity: 'NEGATIVE',
      sourceNeedOrActivity: `Hygiene Need (${needs.hygiene.toFixed(1)}/10)`,
      description: 'Feeling grimy; needs a soak in the bathtub or sink wash.',
      remainingSeconds: 3600,
    });
  }

  // Positive Need & Activity Moodlets when 1-10 Basic Needs are well-maintained (>= 7.5)
  if (needs.hungry >= 7.8) {
    moodlets.push({
      id: 'mood_well_fed',
      title: 'Savoring Homemade Meal',
      emotion: 'Content',
      polarity: 'POSITIVE',
      sourceNeedOrActivity: `Hungry Need (${needs.hungry.toFixed(1)}/10)`,
      description: 'Well-nourished from a satisfying meal.',
      remainingSeconds: 7200,
    });
  }
  if (needs.hygiene >= 8.0) {
    moodlets.push({
      id: 'mood_squeaky_clean',
      title: 'Fresh & Revitalized',
      emotion: 'Energized',
      polarity: 'POSITIVE',
      sourceNeedOrActivity: `Hygiene Need (${needs.hygiene.toFixed(1)}/10)`,
      description: 'Warm bath left skin and mind refreshed.',
      remainingSeconds: 7200,
    });
  }
  if (needs.sleep >= 8.0) {
    moodlets.push({
      id: 'mood_well_rested',
      title: 'Deeply Rested',
      emotion: 'Energized',
      polarity: 'POSITIVE',
      sourceNeedOrActivity: `Sleep Need (${needs.sleep.toFixed(1)}/10)`,
      description: 'Full of vitality after quality rest.',
      remainingSeconds: 7200,
    });
  }

  // Surroundings / Intelligence / Aspiration Boost Moodlets
  const env = evaluateSurroundingsInfluence(char, smartObjects, weatherCondition);
  if (env.roomScore1To10 >= 7.0) {
    moodlets.push({
      id: 'mood_inspiring_decor',
      title: 'Inspiring Architecture',
      emotion: 'Inspired',
      polarity: 'POSITIVE',
      sourceNeedOrActivity: `${char.room} Decor (${env.roomScore1To10}/10)`,
      description: 'Art, botanicals, and clean craftsmanship spark creativity.',
      remainingSeconds: 5400,
    });
  }

  if ((char.intelligenceScore || 100) >= 108) {
    moodlets.push({
      id: 'mood_cognitive_flow',
      title: 'Polymath Focus',
      emotion: 'Focused',
      polarity: 'POSITIVE',
      sourceNeedOrActivity: `Decision IQ ${char.intelligenceScore}`,
      description: 'Synthesizing insights from books and world events.',
      remainingSeconds: 7200,
    });
  }

  // Determine primary emotional state
  let primaryEmotion: EmotionalState = 'Content';
  const negativeMoodlet = moodlets.find((m) => m.polarity === 'NEGATIVE');
  if (negativeMoodlet) {
    primaryEmotion = negativeMoodlet.emotion;
  } else if (moodlets.some((m) => m.emotion === 'Inspired')) {
    primaryEmotion = 'Inspired';
  } else if (moodlets.some((m) => m.emotion === 'Focused')) {
    primaryEmotion = 'Focused';
  } else if (moodlets.some((m) => m.emotion === 'Energized')) {
    primaryEmotion = 'Energized';
  }

  return {
    emotionalState: primaryEmotion,
    activeMoodlets: moodlets.slice(0, 5),
    updatedChar: {
      ...char,
      basicNeeds: needs,
      emotionalState: primaryEmotion,
      activeMoodlets: moodlets.slice(0, 5),
    },
  };
}

// ============================================================================
// OPTION 5: AUTONOMOUS HOUSEHOLD LEGACY MILESTONES & ESTATE ECONOMY
// ============================================================================

export function createInitialHouseholdLegacyMilestones(): HouseholdLegacyMilestone[] {
  return [
    {
      id: 'milestone_balanced_needs',
      title: 'Self-Care Equilibrium',
      description: 'Maintain a toon with all four 1–10 Basic Needs (Hungry, Hygiene, Sleep, Bathroom) at 7.0/10 or higher.',
      category: 'NEEDS_MASTERY',
      unlocked: false,
      rewardSimoleons: 350,
      passiveBuffDescription: '+10% slower basic need depletion across the household',
    },
    {
      id: 'milestone_skill_specialist',
      title: 'Artisan Specialist (Skill Lv 4+)',
      description: 'Advance any toon skill domain (Cooking, Painting, Handiness, Logic, Music, or Charisma) to 4.0/10.',
      category: 'SKILL_MASTERWORK',
      unlocked: false,
      rewardSimoleons: 500,
      passiveBuffDescription: 'Unlocks Masterwork Royalties on skilled SmartObject actions',
    },
    {
      id: 'milestone_social_harmony',
      title: 'Trusted Household Bond',
      description: 'Build a 7.0+/10 Social Affinity relationship between two household toons through shared conversations.',
      category: 'SOCIAL_HARMONY',
      unlocked: false,
      rewardSimoleons: 450,
      passiveBuffDescription: '+20% Social & Fun gain from household conversations',
    },
    {
      id: 'milestone_multistory_estate',
      title: 'Grand Multi-Story Estate',
      description: 'Expand the home with either an Upstairs Second-Floor Loft or a Subterranean Basement.',
      category: 'ARCHITECTURAL_ESTATE',
      unlocked: false,
      rewardSimoleons: 750,
      passiveBuffDescription: '+15 Room Environment Score & Architectural Prestige',
    },
    {
      id: 'milestone_daily_aspirations',
      title: 'Aspiration Achiever',
      description: 'Complete at least 1 Daily Aspiration goal within an in-game day.',
      category: 'ASPIRATION_STREAK',
      unlocked: false,
      rewardSimoleons: 400,
      passiveBuffDescription: 'Extends Temporary Motive Boost durations',
    },
  ];
}

export function evaluateHouseholdLegacyMilestones(params: {
  characters: Character[];
  smartObjects: SmartObject[];
  funds: number;
  hasUpstairs: boolean;
  hasBasement: boolean;
  existingMilestones?: HouseholdLegacyMilestone[];
  timeStr?: string;
}): {
  milestones: HouseholdLegacyMilestone[];
  newlyUnlocked: HouseholdLegacyMilestone[];
  totalBonusSimoleons: number;
  logMessages: string[];
} {
  const base = params.existingMilestones || createInitialHouseholdLegacyMilestones();
  const timeStr = params.timeStr || '12:00 PM';
  const newlyUnlocked: HouseholdLegacyMilestone[] = [];
  const logMessages: string[] = [];
  let totalBonusSimoleons = 0;

  const updated = base.map((m) => {
    if (m.unlocked) return m;

    let conditionMet = false;

    if (m.id === 'milestone_balanced_needs') {
      conditionMet = params.characters.some((c) => {
        const n = getCharacterBasicNeeds1To10(c);
        return n.hungry >= 7.0 && n.hygiene >= 7.0 && n.sleep >= 7.0 && n.bathroom >= 7.0;
      });
    } else if (m.id === 'milestone_skill_specialist') {
      conditionMet = params.characters.some((c) => {
        const tree = createInitialSkillTree(c);
        return Object.values(tree).some((s) => s.level1To10 >= 4.0);
      });
    } else if (m.id === 'milestone_social_harmony') {
      conditionMet = params.characters.some((c) =>
        Object.values(c.relationships || {}).some((r) => r.affinity1To10 >= 7.0)
      );
    } else if (m.id === 'milestone_multistory_estate') {
      conditionMet = params.hasUpstairs || params.hasBasement;
    } else if (m.id === 'milestone_daily_aspirations') {
      conditionMet = params.characters.some(
        (c) => (c.dailyAspirations?.totalCompletedAllTime || 0) >= 1
      );
    }

    if (!conditionMet) return m;

    const unlockedItem: HouseholdLegacyMilestone = {
      ...m,
      unlocked: true,
      unlockedAtTimeStr: timeStr,
    };
    newlyUnlocked.push(unlockedItem);
    totalBonusSimoleons += unlockedItem.rewardSimoleons;
    logMessages.push(
      `[${timeStr} | Legacy Milestone Unlocked] "${unlockedItem.title}" achieved! Household awarded +§${unlockedItem.rewardSimoleons} (${unlockedItem.passiveBuffDescription}).`
    );
    return unlockedItem;
  });

  return {
    milestones: updated,
    newlyUnlocked,
    totalBonusSimoleons,
    logMessages,
  };
}

// ============================================================================
// PERSONAL BED PER TOON & TIRED / AWAKENESS STAT MANAGEMENT
// ============================================================================

export interface ToonTiredAwakenessStatus {
  awakeness1To10: number;
  tiredness1To10: number;
  energyPercent: number;
  statusLabel: 'Wide Awake & Energized' | 'Alert & Rested' | 'Getting Drowsy' | 'Tired — Needs Personal Bed' | 'Exhausted — Seeking Personal Bed';
  assignedBedId: string | null;
  assignedBedName: string | null;
  assignedBedRoom: string | null;
  isSleepingInOwnBed: boolean;
}

/**
 * Finds the personal bed assigned to a specific toon (or matches by toon first name).
 */
export function getPersonalBedForToon(
  char: Pick<Character, 'id' | 'name' | 'assignedBedId'>,
  smartObjects: SmartObject[] = DEFAULT_SMART_OBJECTS
): SmartObject | null {
  const byAssignedToon = smartObjects.find((o) => o.assignedToonId === char.id);
  if (byAssignedToon) return byAssignedToon;

  if (char.assignedBedId) {
    const byId = smartObjects.find((o) => o.id === char.assignedBedId);
    if (byId) return byId;
  }

  const firstName = char.name.split(' ')[0].toLowerCase();
  const byName = smartObjects.find(
    (o) =>
      (o.id.toLowerCase().includes('bed') || o.name.toLowerCase().includes('bed')) &&
      o.name.toLowerCase().includes(firstName)
  );
  return byName || null;
}

/**
 * Computes a character's Tired / Awakeness stat (1.0 - 10.0) and personal bed ownership status.
 */
export function getCharacterTiredAwakenessStatus(
  char: Character,
  smartObjects: SmartObject[] = DEFAULT_SMART_OBJECTS
): ToonTiredAwakenessStatus {
  const needs = getCharacterBasicNeeds1To10(char);
  const awakeness1To10 = needs.sleep;
  const tiredness1To10 = clampNeed1To10(11.0 - awakeness1To10);
  const energyPercent = Math.round(char.motives.energy);
  const personalBed = getPersonalBedForToon(char, smartObjects);

  let statusLabel: ToonTiredAwakenessStatus['statusLabel'] = 'Alert & Rested';
  if (awakeness1To10 >= 8.0) {
    statusLabel = 'Wide Awake & Energized';
  } else if (awakeness1To10 >= 5.5) {
    statusLabel = 'Alert & Rested';
  } else if (awakeness1To10 >= 4.0) {
    statusLabel = 'Getting Drowsy';
  } else if (awakeness1To10 >= 2.8) {
    statusLabel = 'Tired — Needs Personal Bed';
  } else {
    statusLabel = 'Exhausted — Seeking Personal Bed';
  }

  const isSleepingInOwnBed = Boolean(
    personalBed &&
      (char.activeObjectId === personalBed.id ||
        (char.currentAction.toLowerCase().includes('sleep') && char.room === personalBed.room))
  );

  return {
    awakeness1To10,
    tiredness1To10,
    energyPercent,
    statusLabel,
    assignedBedId: personalBed?.id || char.assignedBedId || null,
    assignedBedName: personalBed?.name || char.assignedBedName || null,
    assignedBedRoom: personalBed?.room || null,
    isSleepingInOwnBed,
  };
}

/**
 * Guarantees that EVERY toon in `characters` has their own dedicated 1-to-1 personal bed
 * in `smartObjects` to manage their tired/awakeness stat.
 * - Assigns existing unassigned beds first.
 * - Spawns a new non-overlapping personal bed in the Bedroom for any toon without one.
 */
export function ensurePersonalBedsForAllToons(
  characters: Character[],
  smartObjects: SmartObject[]
): {
  updatedCharacters: Character[];
  updatedSmartObjects: SmartObject[];
  updatedObjects: SmartObject[];
  newlySpawnedBeds: SmartObject[];
} {
  const nextObjects = smartObjects.map((o) => ({ ...o }));
  const newlySpawnedBeds: SmartObject[] = [];
  const claimedBedIds = new Set<string>();

  // First pass: honor existing explicit assignments
  for (const char of characters) {
    const existing = nextObjects.find(
      (o) =>
        (o.id.toLowerCase().includes('bed') || o.name.toLowerCase().includes('bed')) &&
        (o.assignedToonId === char.id || (char.assignedBedId && o.id === char.assignedBedId)) &&
        !claimedBedIds.has(o.id)
    );
    if (existing) {
      existing.assignedToonId = char.id;
      existing.assignedToonName = char.name;
      existing.assignedColorHex = existing.assignedColorHex || char.color || '#4f46e5';
      claimedBedIds.add(existing.id);
    }
  }

  // Candidate Bedroom coordinates for additional personal beds
  const bedroomSlots: Array<{ x: number; y: number; z: number; room: string }> = [
    { x: 6.0, y: 0, z: 6.0, room: 'Bedroom' },
    { x: 3.4, y: 0, z: 6.0, room: 'Bedroom' },
    { x: 6.0, y: 0, z: 2.5, room: 'Bedroom' },
    { x: 3.4, y: 0, z: 2.5, room: 'Bedroom' },
    { x: 8.2, y: 0, z: 6.0, room: 'Bedroom' },
    { x: 8.2, y: 0, z: 2.5, room: 'Bedroom' },
  ];

  const updatedCharacters = characters.map((char, idx) => {
    let myBed = nextObjects.find(
      (o) => o.assignedToonId === char.id && claimedBedIds.has(o.id)
    );

    if (!myBed) {
      // Try claiming an unassigned bed in the house
      const freeBed = nextObjects.find(
        (o) =>
          (o.id.toLowerCase().includes('bed') || o.name.toLowerCase().includes('bed')) &&
          !o.assignedToonId &&
          !claimedBedIds.has(o.id)
      );
      if (freeBed) {
        const firstName = char.name.split(' ')[0];
        freeBed.assignedToonId = char.id;
        freeBed.assignedToonName = char.name;
        freeBed.assignedColorHex = char.color || '#4f46e5';
        if (!freeBed.name.toLowerCase().includes(firstName.toLowerCase())) {
          freeBed.name = `${firstName}'s ${freeBed.name}`;
        }
        claimedBedIds.add(freeBed.id);
        myBed = freeBed;
      }
    }

    if (!myBed) {
      // Spawn a dedicated personal bed for this toon
      const firstName = char.name.split(' ')[0];
      const slot = bedroomSlots[idx % bedroomSlots.length];
      const bedId = `obj_bed_${char.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const safePlacement = resolveNonToonObjectPlacement(
        { x: slot.x, y: slot.y, z: slot.z },
        {
          id: bedId,
          name: `${firstName}'s Personal Feather Bed`,
          room: slot.room,
        },
        nextObjects,
        [],
        true
      );
      const spawnedBed: SmartObject = {
        id: bedId,
        name: `${firstName}'s Personal Feather Bed`,
        room: slot.room,
        category: 'bedroom',
        gridPos: safePlacement.safePos,
        state: 'Clean',
        maturity: 'ALL',
        effects: { energy: 72, sanity: 15 },
        actionLabel: `Sleeping in ${firstName}'s personal bed`,
        durationSeconds: 28800,
        assignedToonId: char.id,
        assignedToonName: char.name,
        assignedColorHex: char.color || '#4f46e5',
      };
      nextObjects.push(spawnedBed);
      newlySpawnedBeds.push(spawnedBed);
      claimedBedIds.add(spawnedBed.id);
      myBed = spawnedBed;
    }

    return {
      ...char,
      assignedBedId: myBed.id,
      assignedBedName: myBed.name,
    };
  });

  return {
    updatedCharacters,
    updatedSmartObjects: nextObjects,
    updatedObjects: nextObjects,
    newlySpawnedBeds,
  };
}

// ============================================================================
// UNIFIED TOON PROGRESSION SYNTHESIZER (ALL LATEST SIMULATION DATA)
// ============================================================================

export interface UnifiedToonProgressionSnapshot {
  characterId: string;
  characterName: string;
  overallProgressionIndex: number; // 0 to 100
  progressionRankTitle:
    | 'Renaissance Autonomous Sovereign'
    | 'Master Domestic Polymath'
    | 'Skilled Estate Resident'
    | 'Developing Autonomous Toon';
  tiredAwakenessStatus: ToonTiredAwakenessStatus;
  basicNeedsAverage1To10: number;
  lowestNeedKey: BasicNeedKey;
  lowestNeedValue1To10: number;
  topSkill: ToonSkillEntry;
  lowestSkill: ToonSkillEntry;
  averageSkillLevel1To10: number;
  totalRoyaltiesEarned: number;
  strongestRelationship: ToonRelationshipEntry | null;
  babyEligiblePartnerIds: string[];
  emotionalState: EmotionalState;
  activeMoodletsCount: number;
  knowledgeIq: number;
  decisionTier: ToonKnowledgebase['decisionTier'];
  completedAspirationsCount: number;
  dominantExperienceDomain: ExperienceDomain;
  recommendedFocusDomain: SkillDomainKey | 'personal_bed_rest' | 'basic_need_recovery';
}

/**
 * Synthesizes all latest character progression systems (1-10 Basic Needs, Personal Bed & Tired/Awakeness,
 * 1-10 Skill Mastery Trees & Royalties, 1-10 Social Affinity & Baby Eligibility, Dynamic Moodlets,
 * 7-Axis Life Experience Tracker, Daily Aspirations, and Knowledgebase IQ) into a unified snapshot
 * used by both autonomous AI agents and the read-only Character Inspector UI.
 */
export function evaluateUnifiedToonProgressionSnapshot(
  char: Character,
  allCharacters: Character[] = [char],
  smartObjects: SmartObject[] = DEFAULT_SMART_OBJECTS
): UnifiedToonProgressionSnapshot {
  const needs = getCharacterBasicNeeds1To10(char);
  const tiredStatus = getCharacterTiredAwakenessStatus(char, smartObjects);
  const skillTree = createInitialSkillTree(char);
  const skillsList = Object.values(skillTree);
  const sortedSkills = [...skillsList].sort((a, b) => b.level1To10 - a.level1To10);
  const topSkill = sortedSkills[0];
  const lowestSkill = sortedSkills[sortedSkills.length - 1];
  const averageSkillLevel1To10 =
    Math.round(
      (skillsList.reduce((acc, s) => acc + s.level1To10, 0) / Math.max(1, skillsList.length)) * 10
    ) / 10;

  const needEntries: Array<[BasicNeedKey, number]> = [
    ['bathroom', needs.bathroom],
    ['sleep', needs.sleep],
    ['hungry', needs.hungry],
    ['hygiene', needs.hygiene],
  ];
  needEntries.sort((a, b) => a[1] - b[1]);
  const [lowestNeedKey, lowestNeedValue1To10] = needEntries[0];
  const basicNeedsAverage1To10 =
    Math.round(((needs.hungry + needs.hygiene + needs.sleep + needs.bathroom) / 4) * 10) / 10;

  const relMap = createInitialRelationshipsForCharacter(char, allCharacters);
  const relList = Object.values(relMap).sort((a, b) => b.affinity1To10 - a.affinity1To10);
  const strongestRelationship = relList[0] || null;
  const babyEligiblePartnerIds = allCharacters
    .filter((other) => other.id !== char.id && canHaveBabyTogether(char, other, allCharacters).eligible)
    .map((other) => other.id);

  const moodEval = evaluateCharacterMoodletsAndEmotion(char, smartObjects);
  const kb = char.knowledgebase || createInitialToonKnowledgebase(char);
  const knowledgeIq = char.intelligenceScore ?? kb.intelligenceScore;
  const expTracker = char.lifeExperience || createInitialLifeExperienceTracker(char);
  const completedAspirationsCount = char.dailyAspirations?.totalCompletedAllTime ?? 0;

  // Compute 0-100 composite progression index
  const needsComponent = (basicNeedsAverage1To10 / 10) * 25; // max 25
  const skillsComponent = (averageSkillLevel1To10 / 10) * 30; // max 30
  const iqComponent = Math.min(20, Math.max(5, ((knowledgeIq - 90) / 60) * 20)); // max 20
  const socialComponent = strongestRelationship
    ? (strongestRelationship.affinity1To10 / 10) * 15
    : 8; // max 15
  const aspirationComponent = Math.min(10, completedAspirationsCount * 2.5 + (expTracker.evolvedTraits.length * 2)); // max 10

  const overallProgressionIndex = Math.max(
    10,
    Math.min(
      100,
      Math.round(needsComponent + skillsComponent + iqComponent + socialComponent + aspirationComponent)
    )
  );

  let progressionRankTitle: UnifiedToonProgressionSnapshot['progressionRankTitle'] =
    'Developing Autonomous Toon';
  if (overallProgressionIndex >= 82) {
    progressionRankTitle = 'Renaissance Autonomous Sovereign';
  } else if (overallProgressionIndex >= 65) {
    progressionRankTitle = 'Master Domestic Polymath';
  } else if (overallProgressionIndex >= 45) {
    progressionRankTitle = 'Skilled Estate Resident';
  }

  let recommendedFocusDomain: UnifiedToonProgressionSnapshot['recommendedFocusDomain'] =
    topSkill.key;
  if (tiredStatus.awakeness1To10 <= 4.0) {
    recommendedFocusDomain = 'personal_bed_rest';
  } else if (lowestNeedValue1To10 <= 3.5) {
    recommendedFocusDomain = 'basic_need_recovery';
  } else if (lowestSkill.level1To10 < 3.0) {
    recommendedFocusDomain = lowestSkill.key;
  }

  return {
    characterId: char.id,
    characterName: char.name,
    overallProgressionIndex,
    progressionRankTitle,
    tiredAwakenessStatus: tiredStatus,
    basicNeedsAverage1To10,
    lowestNeedKey,
    lowestNeedValue1To10,
    topSkill,
    lowestSkill,
    averageSkillLevel1To10,
    totalRoyaltiesEarned: char.totalRoyaltiesEarned || 0,
    strongestRelationship,
    babyEligiblePartnerIds,
    emotionalState: moodEval.emotionalState,
    activeMoodletsCount: moodEval.activeMoodlets.length,
    knowledgeIq,
    decisionTier: kb.decisionTier,
    completedAspirationsCount,
    dominantExperienceDomain: expTracker.dominantDomain,
    recommendedFocusDomain,
  };
}

// ============================================================================
// ESC & DOUBLE-ESC KEYBOARD SHORTCUT EVALUATOR + HOUSEHOLD RELATIONSHIP GRAPH
// ============================================================================

export type EscapeKeyActionResult =
  | 'CLOSE_OVERLAYS'
  | 'ENTER_BACKGROUND_MODE';

/**
 * Evaluates single vs. double "Escape" press behavior:
 * - Pressing "ESC" once closes any active UI overlays/modals/build tools.
 * - Pressing "ESC" twice within `doublePressThresholdMs` (default 600ms) closes all UI
 *   and immediately puts the game into Background Mode ('DESKTOP_BACKGROUND').
 */
export function evaluateEscapeKeyAction(params: {
  lastEscTimestampMs: number;
  nowTimestampMs: number;
  hasOpenOverlays: boolean;
  doublePressThresholdMs?: number;
}): {
  action: EscapeKeyActionResult;
  nextLastEscTimestampMs: number;
} {
  const {
    lastEscTimestampMs,
    nowTimestampMs,
    doublePressThresholdMs = 600,
  } = params;

  const elapsed = nowTimestampMs - lastEscTimestampMs;
  const isDoublePress = lastEscTimestampMs > 0 && elapsed >= 0 && elapsed <= doublePressThresholdMs;

  if (isDoublePress) {
    return {
      action: 'ENTER_BACKGROUND_MODE',
      nextLastEscTimestampMs: 0, // Reset after double-press triggers Background Mode
    };
  }

  return {
    action: 'CLOSE_OVERLAYS',
    nextLastEscTimestampMs: nowTimestampMs,
  };
}

export type RelationshipLinkCategory = 'FRIENDSHIP' | 'RIVALRY' | 'ROMANTIC' | 'FAMILY';

export interface RelationshipGraphEdge {
  id: string;
  sourceCharId: string;
  sourceName: string;
  targetCharId: string;
  targetName: string;
  category: RelationshipLinkCategory;
  affinity1To10: number;
  romance1To10: number;
  statusLabel: string;
  familyRelation?: string;
  interactionCount: number;
  sharedMemories: string[];
}

/**
 * Builds a complete, deduplicated social connection graph between all active toons,
 * categorizing links into Friendships, Rivalries, Romantic Links, and Family ties.
 */
export function buildHouseholdRelationshipGraph(
  characters: Character[]
): {
  edges: RelationshipGraphEdge[];
  counts: {
    total: number;
    friendships: number;
    rivalries: number;
    romantic: number;
    family: number;
  };
} {
  const edges: RelationshipGraphEdge[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < characters.length; i++) {
    const charA = characters[i];
    const relMapA = createInitialRelationshipsForCharacter(charA, characters);

    for (let j = i + 1; j < characters.length; j++) {
      const charB = characters[j];
      const pairKey = [charA.id, charB.id].sort().join('::');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const relMapB = createInitialRelationshipsForCharacter(charB, characters);
      const entryAB = relMapA[charB.id];
      const entryBA = relMapB[charA.id];

      const affinity =
        Math.round(
          (((entryAB?.affinity1To10 ?? 5.5) + (entryBA?.affinity1To10 ?? 5.5)) * 0.5) * 10
        ) / 10;
      const romance =
        Math.round(
          (((entryAB?.romanceScore1To10 ?? (affinity >= 8.0 && !entryAB?.isRelated ? affinity - 0.5 : 1.0)) +
            (entryBA?.romanceScore1To10 ?? (affinity >= 8.0 && !entryBA?.isRelated ? affinity - 0.5 : 1.0))) *
            0.5) *
            10
        ) / 10;
      const familyRelation =
        entryAB?.familyRelation ||
        entryBA?.familyRelation ||
        (entryAB?.isRelated || entryBA?.isRelated || areCharactersRelated(charA, charB) ? 'Family Bond' : undefined);
      const status =
        entryAB?.status ||
        (familyRelation
          ? 'Family Bond'
          : romance >= 7.5
          ? 'Romantic Partner'
          : affinity >= 8.5
          ? 'Best Friend'
          : affinity >= 6.5
          ? 'Trusted Friend'
          : affinity >= 5.0
          ? 'Friend'
          : affinity < 4.5
          ? 'Household Rival'
          : 'Acquaintance');

      let category: RelationshipLinkCategory = 'FRIENDSHIP';
      if (familyRelation || status === 'Family Bond') {
        category = 'FAMILY';
      } else if (
        status === 'Soulmate' ||
        status === 'Romantic Partner' ||
        romance >= 6.0 ||
        charA.partnerId === charB.id ||
        charB.partnerId === charA.id
      ) {
        category = 'ROMANTIC';
      } else if (status === 'Household Rival' || affinity < 4.5) {
        category = 'RIVALRY';
      } else {
        category = 'FRIENDSHIP';
      }

      const memories = Array.from(
        new Set([
          ...(entryAB?.sharedMemories || []),
          ...(entryBA?.sharedMemories || []),
          ...(entryAB?.lastInteractionSummary ? [entryAB.lastInteractionSummary] : []),
          ...(entryBA?.lastInteractionSummary ? [entryBA.lastInteractionSummary] : []),
        ])
      ).slice(0, 4);

      edges.push({
        id: `edge_${pairKey}`,
        sourceCharId: charA.id,
        sourceName: charA.name,
        targetCharId: charB.id,
        targetName: charB.name,
        category,
        affinity1To10: affinity,
        romance1To10: romance,
        statusLabel: status,
        familyRelation,
        interactionCount:
          (entryAB?.interactionCount ?? entryAB?.sharedConversationsCount ?? 1) +
          (entryBA?.interactionCount ?? entryBA?.sharedConversationsCount ?? 1),
        sharedMemories:
          memories.length > 0
            ? memories
            : [`${charA.name.split(' ')[0]} and ${charB.name.split(' ')[0]} share the household estate.`],
      });
    }
  }

  return {
    edges,
    counts: {
      total: edges.length,
      friendships: edges.filter((e) => e.category === 'FRIENDSHIP').length,
      rivalries: edges.filter((e) => e.category === 'RIVALRY').length,
      romantic: edges.filter((e) => e.category === 'ROMANTIC').length,
      family: edges.filter((e) => e.category === 'FAMILY').length,
    },
  };
}

// ============================================================================
// DUAL-APPLICATION ARCHITECTURE: "THE HOUSE" (GAME) vs. "CREATION TOOLS"
// ============================================================================

export type ApplicationId = 'THE_HOUSE' | 'CREATION_TOOLS';

export type CreationToolSystemId =
  | 'HOUSE_BUILDER'
  | 'ASSET_STUDIO'
  | 'CAS_STUDIO'
  | 'ROOM_STUDIO'
  | 'WORLD_SCENARIO_CREATOR';

export type AutonomousGameSystemId =
  | 'AUTONOMOUS_TOON_LIFE_ENGINE'
  | 'AUTONOMOUS_A_STAR_PATHING'
  | 'AUTONOMOUS_BUILDER_RENOVATION_AI'
  | 'AUTONOMOUS_ENTITY_ASSET_MANIFESTATION_AI'
  | 'AUTONOMOUS_HOUSE_EVENTS_AI'
  | 'AUTONOMOUS_KNOWLEDGE_INGESTION_AI'
  | 'ENTITY_CONVERSATION_AND_PERSUASION';

export type AnySystemId = CreationToolSystemId | AutonomousGameSystemId;

export interface SystemAppClassification {
  id: AnySystemId;
  title: string;
  shortLabel: string;
  ownerApp: ApplicationId;
  isUserAssetCreationSystem: boolean;
  isAiControlledSystem: boolean;
  assetKindCreated?: 'FURNITURE_3D_ASSET' | 'CHARACTER_TOON' | 'ROOM_TEMPLATE' | 'HOUSE_BLUEPRINT' | 'WORLD_SCENARIO';
  description: string;
}

export const APPLICATION_SYSTEM_MANIFEST: Record<AnySystemId, SystemAppClassification> = {
  // --- USER-OPERATED ASSET CREATION SYSTEMS -> "CREATION TOOLS" APP ---
  HOUSE_BUILDER: {
    id: 'HOUSE_BUILDER',
    title: 'House & Lot Blueprint Builder',
    shortLabel: 'Build House',
    ownerApp: 'CREATION_TOOLS',
    isUserAssetCreationSystem: true,
    isAiControlledSystem: false,
    assetKindCreated: 'HOUSE_BLUEPRINT',
    description:
      'User-controlled 3D architectural lot builder for placing walls, doors, windows, room blocks, stairs, wallpapers, flooring, and furnishings.',
  },
  ASSET_STUDIO: {
    id: 'ASSET_STUDIO',
    title: '3D Asset & Furniture Studio',
    shortLabel: 'Asset Studio',
    ownerApp: 'CREATION_TOOLS',
    isUserAssetCreationSystem: true,
    isAiControlledSystem: false,
    assetKindCreated: 'FURNITURE_3D_ASSET',
    description:
      'User-operated studio for crafting custom SmartObjects, synthesizing multi-part 3D procedural meshes, and customizing room finishes.',
  },
  CAS_STUDIO: {
    id: 'CAS_STUDIO',
    title: 'Create-A-Toon Character Studio (CAS)',
    shortLabel: 'Character Creator (CAS)',
    ownerApp: 'CREATION_TOOLS',
    isUserAssetCreationSystem: true,
    isAiControlledSystem: false,
    assetKindCreated: 'CHARACTER_TOON',
    description:
      'User-operated character creation suite for designing custom toons, skeletal proportions, outfits, traits, and life goals.',
  },
  ROOM_STUDIO: {
    id: 'ROOM_STUDIO',
    title: 'Room Studio & A* Pathing Database',
    shortLabel: 'Room Studio',
    ownerApp: 'CREATION_TOOLS',
    isUserAssetCreationSystem: true,
    isAiControlledSystem: false,
    assetKindCreated: 'ROOM_TEMPLATE',
    description:
      'User-operated blank-grid room architect for designing, validating A* walkability, and saving reusable pre-made room templates.',
  },
  WORLD_SCENARIO_CREATOR: {
    id: 'WORLD_SCENARIO_CREATOR',
    title: 'World & Scenario Generator Studio',
    shortLabel: 'World & Scenario Creator',
    ownerApp: 'CREATION_TOOLS',
    isUserAssetCreationSystem: true,
    isAiControlledSystem: false,
    assetKindCreated: 'WORLD_SCENARIO',
    description:
      'User-operated scenario & custom prompt world blueprint generator for creating new starting timelines and lot layouts.',
  },

  // --- AI-CONTROLLED AUTONOMOUS SYSTEMS -> "THE HOUSE" GAME APP ---
  AUTONOMOUS_TOON_LIFE_ENGINE: {
    id: 'AUTONOMOUS_TOON_LIFE_ENGINE',
    title: 'Autonomous Toon Life, Needs, Skills & Social Engine',
    shortLabel: 'Autonomous Toon AI',
    ownerApp: 'THE_HOUSE',
    isUserAssetCreationSystem: false,
    isAiControlledSystem: true,
    description:
      '100% AI-controlled toon decision loop managing 1–10 basic needs, skill mastery trees, social affinity, reproduction, careers, and aging.',
  },
  AUTONOMOUS_A_STAR_PATHING: {
    id: 'AUTONOMOUS_A_STAR_PATHING',
    title: 'Autonomous A* Grid Navigation & Dynamic Obstacle Avoidance',
    shortLabel: 'A* Navigation AI',
    ownerApp: 'THE_HOUSE',
    isUserAssetCreationSystem: false,
    isAiControlledSystem: true,
    description:
      'Real-time 8-directional A* pathfinding across worldBlueprint and SmartObjects so autonomous toons never get stuck.',
  },
  AUTONOMOUS_BUILDER_RENOVATION_AI: {
    id: 'AUTONOMOUS_BUILDER_RENOVATION_AI',
    title: 'Autonomous Toon Builder & Catalog Renovation AI',
    shortLabel: 'Autonomous Builder AI',
    ownerApp: 'THE_HOUSE',
    isUserAssetCreationSystem: false,
    isAiControlledSystem: true,
    description:
      'AI-controlled builder toons autonomously expanding floors (Upstairs/Basement) and purchasing needed household furnishings with household funds.',
  },
  AUTONOMOUS_ENTITY_ASSET_MANIFESTATION_AI: {
    id: 'AUTONOMOUS_ENTITY_ASSET_MANIFESTATION_AI',
    title: 'Autonomous Entity 3D Asset Manifestation AI',
    shortLabel: 'Entity Auto-Forge AI',
    ownerApp: 'THE_HOUSE',
    isUserAssetCreationSystem: false,
    isAiControlledSystem: true,
    description:
      'AI-controlled Entity system that monitors household motives/skills and autonomously manifests missing 3D SmartObjects into valid rooms.',
  },
  AUTONOMOUS_HOUSE_EVENTS_AI: {
    id: 'AUTONOMOUS_HOUSE_EVENTS_AI',
    title: 'Autonomous House Events & Trait Imprinting AI',
    shortLabel: 'Autonomous Events AI',
    ownerApp: 'THE_HOUSE',
    isUserAssetCreationSystem: false,
    isAiControlledSystem: true,
    description:
      'AI-controlled sentient House events that trigger spontaneously, assign tasks to residents, and imprint Good/Bad personality traits.',
  },
  AUTONOMOUS_KNOWLEDGE_INGESTION_AI: {
    id: 'AUTONOMOUS_KNOWLEDGE_INGESTION_AI',
    title: 'Autonomous Newspaper & Literature Knowledgebase AI',
    shortLabel: 'Knowledge Ingestion AI',
    ownerApp: 'THE_HOUSE',
    isUserAssetCreationSystem: false,
    isAiControlledSystem: true,
    description:
      'AI-controlled media learning system where toons autonomously read newspapers and books to expand their IQ and conversational memory.',
  },
  ENTITY_CONVERSATION_AND_PERSUASION: {
    id: 'ENTITY_CONVERSATION_AND_PERSUASION',
    title: 'The House - Omniscient Entity Conversation & Persuasion',
    shortLabel: 'Omniscient Entity AI',
    ownerApp: 'THE_HOUSE',
    isUserAssetCreationSystem: false,
    isAiControlledSystem: true,
    description:
      'In-game voice and text dialogue with the sentient Entity where players persuade the AI Entity to aid the autonomous household.',
  },
};

export function getSystemsForApp(appId: ApplicationId): SystemAppClassification[] {
  return Object.values(APPLICATION_SYSTEM_MANIFEST).filter((sys) => sys.ownerApp === appId);
}

export function isUserCreationToolSystem(systemId: AnySystemId): boolean {
  const entry = APPLICATION_SYSTEM_MANIFEST[systemId];
  return Boolean(entry && entry.ownerApp === 'CREATION_TOOLS' && entry.isUserAssetCreationSystem);
}

export function isAiControlledGameSystem(systemId: AnySystemId): boolean {
  const entry = APPLICATION_SYSTEM_MANIFEST[systemId];
  return Boolean(entry && entry.ownerApp === 'THE_HOUSE' && entry.isAiControlledSystem);
}

export interface AppSplitState {
  activeApp: ApplicationId;
  activeCreationTool: CreationToolSystemId;
  isWorldBuilderMode: boolean;
}

export type AppSplitAction =
  | { type: 'OPEN_THE_HOUSE' }
  | { type: 'OPEN_CREATION_TOOLS'; tool?: CreationToolSystemId }
  | { type: 'SELECT_CREATION_TOOL'; tool: CreationToolSystemId };

export function createInitialAppSplitState(initialApp: ApplicationId = 'THE_HOUSE'): AppSplitState {
  return {
    activeApp: initialApp,
    activeCreationTool: 'HOUSE_BUILDER',
    isWorldBuilderMode: initialApp === 'CREATION_TOOLS',
  };
}

export function resolveAppSplitTransition(
  state: AppSplitState,
  action: AppSplitAction
): AppSplitState {
  if (action.type === 'OPEN_THE_HOUSE') {
    return {
      ...state,
      activeApp: 'THE_HOUSE',
      isWorldBuilderMode: false,
    };
  }

  if (action.type === 'OPEN_CREATION_TOOLS') {
    const nextTool = action.tool || state.activeCreationTool || 'HOUSE_BUILDER';
    return {
      activeApp: 'CREATION_TOOLS',
      activeCreationTool: nextTool,
      isWorldBuilderMode: nextTool === 'HOUSE_BUILDER',
    };
  }

  if (action.type === 'SELECT_CREATION_TOOL') {
    return {
      activeApp: 'CREATION_TOOLS',
      activeCreationTool: action.tool,
      isWorldBuilderMode: action.tool === 'HOUSE_BUILDER',
    };
  }

  return state;
}

export function syncCreatedAssetToGameWorld(params: {
  assetType: 'SMART_OBJECT' | 'CHARACTER';
  newSmartObject?: SmartObject;
  newCharacter?: Character;
  currentCharacters: Character[];
  currentSmartObjects: SmartObject[];
  placedParts?: Array<{
    id: string;
    partType: string;
    label?: string;
    roomType?: string;
    gridPos: { x: number; y: number; z: number };
    width: number;
    depth: number;
    height?: number;
    rotationY?: number;
  }>;
  includeDefaultArchitecture?: boolean;
  timeStr?: string;
}): {
  updatedCharacters: Character[];
  updatedSmartObjects: SmartObject[];
  syncLogMessage: string;
  enforcedRoom?: RoomName;
} {
  const {
    assetType,
    newSmartObject,
    newCharacter,
    currentCharacters,
    currentSmartObjects,
    placedParts = [],
    includeDefaultArchitecture = true,
    timeStr = '12:00 PM',
  } = params;

  if (assetType === 'SMART_OBJECT' && newSmartObject) {
    const safePlacement = resolveNonToonObjectPlacement(
      newSmartObject.gridPos,
      {
        id: newSmartObject.id,
        name: newSmartObject.name,
        category: newSmartObject.category,
        room: newSmartObject.room,
      },
      currentSmartObjects,
      placedParts,
      includeDefaultArchitecture
    );
    const syncedObject: SmartObject = {
      ...newSmartObject,
      room: safePlacement.enforcedRoom,
      gridPos: safePlacement.safePos,
    };
    return {
      updatedCharacters: currentCharacters,
      updatedSmartObjects: [...currentSmartObjects, syncedObject],
      enforcedRoom: safePlacement.enforcedRoom,
      syncLogMessage: safePlacement.roomRuleMessage
        ? `[${timeStr} | Creation Tools -> The House] ${safePlacement.roomRuleMessage}`
        : `[${timeStr} | Creation Tools -> The House] Synced user-created asset '${syncedObject.name}' into ${safePlacement.enforcedRoom}.`,
    };
  }

  if (assetType === 'CHARACTER' && newCharacter) {
    const combined = [...currentCharacters, newCharacter];
    const ensured = ensurePersonalBedsForAllToons(combined, currentSmartObjects);
    return {
      updatedCharacters: ensured.updatedCharacters,
      updatedSmartObjects: ensured.updatedObjects,
      syncLogMessage: `[${timeStr} | Creation Tools -> The House] Synced user-created character '${newCharacter.name}' into The House household with a personal bed.`,
    };
  }

  return {
    updatedCharacters: currentCharacters,
    updatedSmartObjects: currentSmartObjects,
    syncLogMessage: `[${timeStr} | Creation Tools -> The House] No asset changes applied.`,
  };
}

