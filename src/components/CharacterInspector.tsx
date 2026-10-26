/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Character,
  SmartObject,
  ScheduledInteraction,
  BasicNeedKey,
  HouseholdLegacyMilestone,
  BASIC_NEEDS_CONFIG,
  getCharacterBasicNeeds1To10,
  getRequiredObjectForBasicNeed,
  createInitialSkillTree,
  createInitialRelationshipsForCharacter,
  evaluateCharacterMoodletsAndEmotion,
  createInitialHouseholdLegacyMilestones,
  formatTaskDuration,
  buildAutonomousLifeFlowQueue,
  createInitialToonKnowledgebase,
  getIntelligenceEfficiencyMultiplier,
  createInitialLifeExperienceTracker,
  EXPERIENCE_DOMAIN_CONFIG,
  createInitialDailyAspirationsState,
  doesActivityMatchDailyAspiration,
  getCharacterTiredAwakenessStatus,
  evaluateUnifiedToonProgressionSnapshot,
} from '../game/simulation';
import { sound } from '../game/soundSynth';
import {
  X,
  Volume2,
  Brain,
  Sparkles,
  MapPin,
  Heart,
  Zap,
  Smile,
  ShieldAlert,
  Compass,
  Eye,
  Newspaper,
  Clock,
  ListOrdered,
  Plus,
  ArrowUp,
  Trash2,
  FastForward,
  Hammer,
  Layers,
  Radar,
  Target,
  CheckCircle2,
  RefreshCw,
  Award,
  Users,
} from 'lucide-react';
import { PersonalityRadarChart } from './PersonalityRadarChart';
import { SocialWebGraph } from './SocialWebGraph';

interface CharacterInspectorProps {
  character: Character;
  allCharacters?: Character[];
  householdMilestones?: HouseholdLegacyMilestone[];
  onClose: () => void;
  smartObjects: SmartObject[];
  onCommandAction: (charId: string, objectId: string) => void;
  onFulfillBasicNeed?: (charId: string, needKey: BasicNeedKey) => void;
  onBoostRelationship?: (charAId: string, charBId: string) => void;
  onHaveBaby?: (charAId: string, charBId: string) => void;
  onSelectCharacter?: (charId: string) => void;
  onTriggerSocialInteraction?: (
    charAId: string,
    charBId: string,
    interactionType: 'FRIENDLY' | 'ROMANTIC' | 'RIVALRY'
  ) => void;
  onQueueAction?: (charId: string, objectId: string) => void;
  onRemoveQueuedAction?: (charId: string, queueItemId: string) => void;
  onPromoteQueuedAction?: (charId: string, queueItemId: string) => void;
  onSkipToNextQueuedAction?: (charId: string) => void;
  onToonBuildStory?: (charId: string, story: 'UPSTAIRS' | 'BASEMENT') => void;
  hasUpstairs?: boolean;
  hasBasement?: boolean;
  funds?: number;
  onSendOffGrid: (charId: string) => void;
  onToggleFirstPerson: (charId: string) => void;
  isFirstPersonActive: boolean;
  onReadNewspaper?: (charId: string) => void;
  onPursueDailyAspiration?: (charId: string, aspirationId: string) => void;
  onRerollDailyAspirations?: (charId: string) => void;
  isDarkMode: boolean;
}

export const CharacterInspector: React.FC<CharacterInspectorProps> = ({
  character,
  allCharacters = [],
  householdMilestones,
  onClose,
  smartObjects,
  onCommandAction,
  onFulfillBasicNeed,
  onBoostRelationship,
  onHaveBaby,
  onSelectCharacter,
  onTriggerSocialInteraction,
  onQueueAction,
  onRemoveQueuedAction,
  onPromoteQueuedAction,
  onSkipToNextQueuedAction,
  onToonBuildStory,
  hasUpstairs = false,
  hasBasement = false,
  funds = 3600,
  onSendOffGrid,
  onToggleFirstPerson,
  isFirstPersonActive,
  onReadNewspaper,
  onPursueDailyAspiration,
  onRerollDailyAspirations,
  isDarkMode,
}) => {
  const availableObjects = smartObjects.filter(
    (o) => o.maturity === 'ALL' || (o.maturity === 'DARK_ONLY' && isDarkMode)
  );
  const [showRadarChart, setShowRadarChart] = useState<boolean>(false);
  const [showSocialWeb, setShowSocialWeb] = useState<boolean>(true);

  // 1-10 Basic Needs (Hungry, Hygiene, Sleep, Use the Bathroom) + Personal Bed & Tired/Awakeness Stat
  const basicNeeds1To10 = getCharacterBasicNeeds1To10(character);
  const tiredAwakeStatus = getCharacterTiredAwakenessStatus(character, availableObjects);
  const moodletState = evaluateCharacterMoodletsAndEmotion(
    character,
    availableObjects
  );
  const skillTree = createInitialSkillTree(character);
  const relationshipMap = createInitialRelationshipsForCharacter(
    character,
    allCharacters.length > 0 ? allCharacters : [character]
  );
  const relationshipList = Object.values(relationshipMap);
  const legacyMilestones =
    householdMilestones || createInitialHouseholdLegacyMilestones();
  const unlockedMilestonesCount = legacyMilestones.filter((m) => m.unlocked).length;

  // Ensure the character always has an upcoming Life Flow queue to inspect
  const lifeFlowQueue: ScheduledInteraction[] =
    character.interactionQueue && character.interactionQueue.length > 0
      ? character.interactionQueue
      : buildAutonomousLifeFlowQueue(character, smartObjects, 3, isDarkMode);

  const totalQueuedSeconds = lifeFlowQueue.reduce(
    (sum, item) => sum + (item.durationSeconds || 3600),
    0
  );

  const knowledgebase =
    character.knowledgebase || createInitialToonKnowledgebase(character);
  const iqScore =
    character.intelligenceScore ?? knowledgebase.intelligenceScore ?? 100;
  const iqEfficiencyPct = Math.round(
    (getIntelligenceEfficiencyMultiplier(character) - 1) * 100
  );
  const latestBook =
    knowledgebase.booksRead.length > 0
      ? knowledgebase.booksRead[knowledgebase.booksRead.length - 1]
      : null;
  const latestWorldEvent =
    knowledgebase.worldEvents.length > 0
      ? knowledgebase.worldEvents[knowledgebase.worldEvents.length - 1]
      : null;

  const lifeExperience =
    character.lifeExperience || createInitialLifeExperienceTracker(character);
  const topExperienceDomains = Object.values(lifeExperience.domains)
    .sort(
      (a, b) =>
        b.experiencePoints +
        b.activityCount * 12 +
        b.worldEventCount * 15 -
        (a.experiencePoints + a.activityCount * 12 + a.worldEventCount * 15)
    )
    .slice(0, 4);

  const dailyAspirationsState =
    character.dailyAspirations ||
    createInitialDailyAspirationsState(
      character,
      Math.max(1, Math.floor(character.daysLived || 1)),
      availableObjects
    );
  const completedAspirationsCount = dailyAspirationsState.aspirations.filter(
    (a) => a.completed
  ).length;

  const getSanityStatus = (val: number) => {
    if (val >= 75) return { label: 'Sound Mind', color: 'text-emerald-500' };
    if (val >= 45) return { label: 'Neurotic Tension', color: 'text-amber-500' };
    if (val >= 20) return { label: 'Delusional Paranoia', color: 'text-purple-400' };
    return { label: 'Psychotic Break', color: 'text-red-500' };
  };

  const sanityInfo = getSanityStatus(character.motives.sanity);

  const progressionSnapshot = evaluateUnifiedToonProgressionSnapshot(
    character,
    allCharacters.length > 0 ? allCharacters : [character],
    availableObjects
  );

  const handleSpeak = () => {
    if (character.selfTalk) {
      sound.speakEnglish(
        character.selfTalk,
        character.genderFrame === 'Feminine' ? 1.2 : 0.9,
        1.02,
        character.id
      );
    }
  };

  const tvObj = smartObjects.find((o) => o.id.includes('tv'));
  const bookshelfObj = smartObjects.find((o) => o.id.includes('bookshelf'));

  return (
    <div
      data-testid="character-inspector"
      className={`fixed top-16 right-4 z-40 w-80 sm:w-88 rounded-2xl border shadow-2xl p-4 transition-all duration-200 backdrop-blur-none max-h-[calc(100vh-5rem)] overflow-y-auto ${
        isDarkMode
          ? 'bg-gray-950/95 text-gray-100 border-purple-900/80'
          : 'bg-white/95 text-gray-900 border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-inner"
            style={{ backgroundColor: character.color }}
          >
            {character.name.charAt(0)}
          </div>
          <div>
            <h2 className="font-bold text-base leading-tight">{character.name}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span>{character.careerTitle || character.ageStage}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-indigo-500" />
                {character.onGrid ? character.room : 'At Work / Off-Grid'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close Character Inspector [ESC]"
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Prominent Visual Relationship Mapping Panel right below Header */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            Relationship Mapping Graph (Friends • Rivals • Romance)
          </span>
          <button
            type="button"
            data-testid="toggle-social-web-btn"
            onClick={() => setShowSocialWeb((prev) => !prev)}
            className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold text-[9px] transition cursor-pointer"
          >
            {showSocialWeb ? 'Collapse Graph' : 'Expand Graph'}
          </button>
        </div>

        {showSocialWeb && (
          <SocialWebGraph
            selectedCharacter={character}
            allCharacters={allCharacters.length > 0 ? allCharacters : [character]}
            onSelectCharacter={onSelectCharacter}
            onTriggerRomanceTalk={onBoostRelationship}
            onTriggerTryForBaby={onHaveBaby}
            onTriggerSocialInteraction={onTriggerSocialInteraction}
          />
        )}
      </div>

      {/* Real-Life Activity Duration Banner */}
      <div
        data-testid="inspector-current-activity"
        className="mt-2.5 px-3 py-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 flex items-center justify-between text-xs"
      >
        <div className="truncate pr-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Current Real-Time Task
          </span>
          <span className="font-semibold text-gray-800 dark:text-gray-100 truncate block">
            {character.currentAction}
          </span>
        </div>
        <span
          data-testid="inspector-task-remaining"
          className="shrink-0 px-2 py-1 rounded-lg bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 font-mono font-bold text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1"
        >
          <Clock className="w-3 h-3" />
          {formatTaskDuration(character.actionTimer)}
        </span>
      </div>

      {/* Autonomous AI Sovereignty Notice & Unified Progression Index */}
      <div
        data-testid="inspector-autonomous-ai-badge"
        className="mt-2.5 px-3 py-2 rounded-xl bg-purple-950/20 dark:bg-purple-950/60 border border-purple-500/40 text-[10px] text-purple-900 dark:text-purple-200 leading-snug space-y-1.5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
            {progressionSnapshot.progressionRankTitle}
          </span>
          <span
            data-testid="inspector-progression-index"
            className="px-1.5 py-0.5 rounded bg-purple-600 text-white font-mono font-bold text-[10px]"
          >
            Progression {progressionSnapshot.overallProgressionIndex}/100
          </span>
        </div>
        <div>
          <strong className="font-bold uppercase tracking-wider">Autonomous AI Life List:</strong>{' '}
          {character.name.split(' ')[0]} makes all decisions independently (Top Skill:{' '}
          <strong>
            {progressionSnapshot.topSkill.label} Lv {progressionSnapshot.topSkill.level1To10.toFixed(1)}
          </strong>
          ). Converse with the <strong>Entity [V]</strong> to modify or spawn house items.
        </div>
      </div>

      {/* Visual Life Flow Queue (Read-Only Autonomous Schedule) */}
      <div
        data-testid="inspector-life-flow-queue"
        className="mt-2.5 p-3 rounded-xl bg-slate-50/95 dark:bg-gray-900/90 border border-slate-200 dark:border-gray-800"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
              Autonomous Life Flow
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              data-testid="inspector-queue-count"
              className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px]"
            >
              {lifeFlowQueue.length} Up Next · {formatTaskDuration(totalQueuedSeconds)}
            </span>
          </div>
        </div>

        {/* Visual Timeline of Scheduled Smart Object Interactions */}
        <div className="space-y-1.5 relative">
          {lifeFlowQueue.map((item, idx) => {
            const isNext = idx === 0;
            const isPlayerQueued = item.source === 'PLAYER_QUEUED';
            return (
              <div
                key={item.id}
                data-testid={`inspector-queue-item-${idx}`}
                className={`group relative rounded-lg p-2 border transition-all text-xs flex items-start justify-between gap-2 ${
                  isNext
                    ? 'bg-white dark:bg-gray-950 border-indigo-300 dark:border-indigo-700/80 shadow-xs'
                    : 'bg-white/75 dark:bg-gray-950/60 border-gray-200/80 dark:border-gray-800/80'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div
                    className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-tight ${
                      isNext
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {isNext ? 'NEXT' : `#${idx + 1}`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        data-testid={`inspector-queue-action-${idx}`}
                        className="font-semibold text-gray-800 dark:text-gray-100 truncate text-[11px]"
                      >
                        {item.actionLabel}
                      </span>
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      <span className="font-medium text-indigo-600 dark:text-indigo-400 truncate">
                        {item.objectName}
                      </span>
                      <span>•</span>
                      <span>{item.room}</span>
                      <span>•</span>
                      <span
                        className={
                          isPlayerQueued
                            ? 'text-amber-600 dark:text-amber-400 font-semibold'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {item.reason}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duration Display (Read-Only) */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    data-testid={`inspector-queue-duration-${idx}`}
                    className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 font-mono text-[10px] font-bold text-gray-700 dark:text-gray-300"
                  >
                    {formatTaskDuration(item.durationSeconds)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* First-Person Viewpoint ("Along for the Ride") Button */}
      <div className="mt-3">
        <button
          onClick={() => onToggleFirstPerson(character.id)}
          disabled={!character.onGrid}
          className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border shadow-sm transition-all cursor-pointer ${
            isFirstPersonActive
              ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 disabled:opacity-40'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>
            {isFirstPersonActive
              ? 'Exit First-Person Viewpoint'
              : `First-Person View (Ride Along with ${character.name.split(' ')[0]})`}
          </span>
        </button>
        <p className="text-[10px] text-center text-gray-400 mt-1">
          See through {character.name.split(' ')[0]}'s eyes — camera controls locked while riding along.
        </p>
      </div>

      {/* Spontaneous Self-Talk Bubble */}
      <div className="mt-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60">
        <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Vocalized Self-Talk (15m Non-Repeat Lock)
          </span>
          <button
            onClick={handleSpeak}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-gray-900 text-indigo-600 hover:bg-indigo-100 transition-colors text-[10px] cursor-pointer"
          >
            <Volume2 className="w-3 h-3" />
            Listen
          </button>
        </div>
        <p className="text-xs italic text-gray-700 dark:text-gray-300 leading-relaxed">
          "{character.selfTalk || 'Just taking in the day...'}"
        </p>
      </div>

      {/* Sanity Bar */}
      <div className="mt-3.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-purple-500" />
            Sanity & Surroundings
          </span>
          <span className={`font-mono text-xs font-bold ${sanityInfo.color}`}>
            {Math.round(character.motives.sanity)}% ({sanityInfo.label})
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              character.motives.sanity < 30
                ? 'bg-purple-600'
                : character.motives.sanity < 60
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${character.motives.sanity}%` }}
          />
        </div>
      </div>

      {/* Option 1: Basic Needs Requirements (1-10 Scale: Hungry, Hygiene, Sleep, Use the Bathroom) */}
      <div
        data-testid="inspector-basic-needs-1to10"
        className="mt-3.5 p-3 rounded-xl bg-slate-50/95 dark:bg-gray-900/95 border border-slate-200 dark:border-gray-800"
      >
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            Basic Needs (1–10 Scale)
          </h3>
          <span
            data-testid="inspector-emotional-state-badge"
            className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] border ${
              moodletState.emotionalState === 'Desperate' ||
              moodletState.emotionalState === 'Ravenous' ||
              moodletState.emotionalState === 'Exhausted' ||
              moodletState.emotionalState === 'Uncomfortable'
                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
            }`}
          >
            Mood: {moodletState.emotionalState}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 leading-snug">
          Each need slowly depletes from 10 to 1. Toons autonomously seek out house objects to replenish them.
        </p>

        {/* Dedicated Personal Bed & Tired / Awakeness Stat Banner */}
        <div
          data-testid="inspector-personal-bed-card"
          className="mb-2.5 p-2.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block border border-white/60 shadow-2xs"
                style={{ backgroundColor: character.color }}
              />
              Personal Bed &amp; Tired / Awakeness
            </span>
            <span
              data-testid="inspector-tired-awake-status"
              className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700 font-mono font-bold text-[10px] text-indigo-700 dark:text-indigo-300"
            >
              Awake {tiredAwakeStatus.awakeness1To10.toFixed(1)}/10 · Tired {tiredAwakeStatus.tiredness1To10.toFixed(1)}/10
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-800 dark:text-gray-100">
            <span data-testid="inspector-assigned-bed-name" className="truncate">
              {tiredAwakeStatus.assignedBedName || `${character.name.split(' ')[0]}'s Personal Bed`}
            </span>
            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
              {tiredAwakeStatus.assignedBedRoom || 'Bedroom'}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            State: <strong className="text-gray-700 dark:text-gray-200">{tiredAwakeStatus.statusLabel}</strong>
          </div>
        </div>

        <div className="space-y-2">
          {(
            [
              {
                key: 'hungry' as BasicNeedKey,
                val: basicNeeds1To10.hungry,
                barColor: 'bg-orange-500',
              },
              {
                key: 'hygiene' as BasicNeedKey,
                val: basicNeeds1To10.hygiene,
                barColor: 'bg-teal-500',
              },
              {
                key: 'sleep' as BasicNeedKey,
                val: basicNeeds1To10.sleep,
                barColor: 'bg-blue-500',
              },
              {
                key: 'bathroom' as BasicNeedKey,
                val: basicNeeds1To10.bathroom,
                barColor: 'bg-cyan-500',
              },
            ] as const
          ).map(({ key, val, barColor }) => {
            const cfg = BASIC_NEEDS_CONFIG[key];
            const isCritical = val <= cfg.criticalThreshold;
            const filledSegments = Math.max(1, Math.min(10, Math.round(val)));
            const targetObj = getRequiredObjectForBasicNeed(key, availableObjects, character);

            return (
              <div
                key={key}
                data-testid={`basic-need-card-${key}`}
                className={`p-2 rounded-lg border transition-all ${
                  isCritical
                    ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                    : 'bg-white dark:bg-gray-950 border-gray-200/80 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-xs text-gray-800 dark:text-gray-100 truncate">
                      {cfg.label}
                    </span>
                    {isCritical && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono text-[9px] font-bold uppercase">
                        Urgent (AI Seeking)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      data-testid={`basic-need-value-${key}`}
                      className={`font-mono text-xs font-extrabold ${
                        isCritical
                          ? 'text-rose-600 dark:text-rose-400'
                          : val < 5.5
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {val.toFixed(1)} / 10
                    </span>
                  </div>
                </div>

                {/* 1 to 10 Segmented Bar */}
                <div className="grid grid-cols-10 gap-0.5 h-2 rounded overflow-hidden bg-gray-200 dark:bg-gray-800 p-0.5">
                  {Array.from({ length: 10 }, (_, i) => {
                    const segIndex = i + 1;
                    const active = segIndex <= filledSegments;
                    return (
                      <div
                        key={segIndex}
                        className={`h-full rounded-xs transition-all ${
                          !active
                            ? 'bg-gray-200 dark:bg-gray-800'
                            : isCritical
                            ? 'bg-rose-500'
                            : val < 5.0
                            ? 'bg-amber-500'
                            : barColor
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[9px] text-gray-500 dark:text-gray-400 mt-1">
                  <span className="truncate">
                    Action: {targetObj ? `${targetObj.name} (${targetObj.room})` : cfg.actionButtonLabel}
                  </span>
                  <span className="font-mono shrink-0">
                    +{cfg.replenishAmount1To10.toFixed(1)} / act
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Option 4: Active Moodlets Derived from 1-10 Basic Needs & Surroundings */}
        {moodletState.activeMoodlets.length > 0 && (
          <div
            data-testid="inspector-active-moodlets"
            className="mt-2.5 pt-2 border-t border-gray-200/80 dark:border-gray-800 space-y-1"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Active Moodlets &amp; Emotional Drivers ({moodletState.activeMoodlets.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {moodletState.activeMoodlets.map((m) => (
                <span
                  key={m.id}
                  data-testid={`moodlet-badge-${m.id}`}
                  title={`${m.description} (${m.sourceNeedOrActivity})`}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                    m.polarity === 'POSITIVE'
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                  }`}
                >
                  {m.polarity === 'POSITIVE' ? '✦' : '⚠'} {m.title} ({m.emotion})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Secondary Motives (Social & Fun) */}
      <div className="mt-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: 'Social', val: character.motives.social, icon: Smile, color: 'bg-pink-500' },
            { label: 'Fun', val: character.motives.fun, icon: Sparkles, color: 'bg-yellow-500' },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
                <span className="font-mono text-[10px] font-bold">{Math.round(val)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    val < 30 ? 'bg-red-500' : val < 60 ? 'bg-amber-500' : color
                  }`}
                  style={{ width: `${val}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Options 2, 3 & 5: Skill Mastery (1-10), Social Affinity Matrix (1-10) & Legacy Milestones */}
      <div
        data-testid="inspector-progression-options-panel"
        className="mt-3.5 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2.5"
      >
        {/* Option 3: 1-10 Skill Mastery Trees & Royalties */}
        <div data-testid="inspector-skill-tree-section">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
              <Award className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              Skill Mastery Trees (1–10)
            </span>
            <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              Royalties: +§{character.totalRoyaltiesEarned || 0}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.values(skillTree).map((skill) => (
              <div
                key={skill.key}
                data-testid={`skill-entry-${skill.key}`}
                className="p-1.5 rounded bg-white/90 dark:bg-gray-900/90 border border-indigo-100 dark:border-indigo-900/60 text-[10px]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {skill.label}
                  </span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                    {skill.level1To10.toFixed(1)}/10
                  </span>
                </div>
                <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {skill.unlockedPerk}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Option 2: Household Social Web & Social Affinity Matrix (1-10 Scale) */}
        {relationshipList.length > 0 && (
          <div
            data-testid="inspector-relationships-section"
            className="pt-2 border-t border-indigo-200/70 dark:border-indigo-800/60 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                <Users className="w-3 h-3 text-pink-600 dark:text-pink-400" />
                Social Affinity Ledger (1–10 Scale)
              </span>
            </div>

            <div className="space-y-1">
              {relationshipList.map((rel) => (
                <div
                  key={rel.targetCharId}
                  data-testid={`relationship-entry-${rel.targetCharId}`}
                  className="p-1.5 rounded bg-white/90 dark:bg-gray-900/90 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-2 text-[10px]"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-gray-800 dark:text-gray-100">
                      {rel.targetName}
                    </span>
                    <span className="ml-1.5 px-1.5 py-0.2 rounded bg-pink-100 dark:bg-pink-950/80 text-pink-800 dark:text-pink-300 font-semibold text-[9px]">
                      {rel.status}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-pink-600 dark:text-pink-400 shrink-0">
                    {rel.affinity1To10.toFixed(1)} / 10
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Option 5: Autonomous Household Legacy Milestones */}
        <div
          data-testid="inspector-legacy-milestones-section"
          className="pt-2 border-t border-indigo-200/70 dark:border-indigo-800/60"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
              Household Legacy Milestones
            </span>
            <span
              data-testid="inspector-legacy-milestones-count"
              className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300"
            >
              {unlockedMilestonesCount}/{legacyMilestones.length} Unlocked
            </span>
          </div>
          <div className="space-y-1">
            {legacyMilestones.map((ms) => (
              <div
                key={ms.id}
                data-testid={`legacy-milestone-${ms.id}`}
                className={`p-1.5 rounded border text-[9px] flex items-center justify-between gap-1.5 ${
                  ms.unlocked
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-white/75 dark:bg-gray-900/70 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <span className="font-semibold truncate">
                  {ms.unlocked ? '✓' : '○'} {ms.title}
                </span>
                <span className="font-mono font-bold shrink-0">
                  +§{ms.rewardSimoleons}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Career, Lifecycle, Traits & Event-Imprinted Personality Quirks */}
      <div className="mt-3.5 pt-3 border-t border-gray-200 dark:border-gray-800">
        <div
          data-testid="inspector-lifecycle-summary"
          className="text-[11px] mb-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/35 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-between"
        >
          <span className="font-semibold text-indigo-900 dark:text-indigo-200">
            Gen {character.lineageGeneration || 1} · {character.ageStage}
          </span>
          <span className="font-mono text-[10px] text-indigo-700 dark:text-indigo-300">
            Lived {(character.daysLived ?? 1).toFixed(1)}d / 26d Lifespan
          </span>
        </div>
        <div className="text-xs mb-1 text-gray-500 flex items-center justify-between">
          <span>
            <span className="font-bold text-gray-700 dark:text-gray-300">Career: </span>
            {character.careerTitle || 'Architectural Consultant'}
          </span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            +§{character.dailySalary || 520}/shift
          </span>
        </div>
        <div className="text-xs mb-1 text-gray-500">
          <span className="font-bold text-gray-700 dark:text-gray-300">Life Goal: </span>
          {character.lifeGoal}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2" data-testid="inspector-traits-list">
          {character.traits.map((t) => {
            const matchingQuirk = (character.acquiredQuirks || []).find(
              (q) => q.traitName === t
            );
            const isEvolved = (lifeExperience.evolvedTraits || []).includes(t);
            return (
              <span
                key={t}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  matchingQuirk
                    ? matchingQuirk.polarity === 'GOOD'
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-400 dark:border-emerald-700'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-400 dark:border-rose-700'
                    : isEvolved
                    ? 'bg-indigo-100 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-200 border-indigo-400 dark:border-indigo-600'
                    : t === 'Builder' || t === 'Ambitious'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                }`}
              >
                {matchingQuirk
                  ? `${matchingQuirk.polarity === 'GOOD' ? '✦' : '⚠'} ${t}`
                  : isEvolved
                  ? `🌱 ${t}`
                  : t === 'Builder'
                  ? '🔨 Builder Persona'
                  : t}
              </span>
            );
          })}
        </div>

        {/* Toggle Personality Evolution Radar Chart */}
        <div className="mt-2.5">
          <button
            type="button"
            data-testid="toggle-personality-radar-btn"
            onClick={() => setShowRadarChart((prev) => !prev)}
            className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all border shadow-xs ${
              showRadarChart
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/20'
                : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            <span>
              {showRadarChart
                ? 'Hide Personality Evolution Radar'
                : 'View Personality Evolution Radar'}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                showRadarChart
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-200/80 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-200'
              }`}
            >
              7-Axis Over Time
            </span>
          </button>
        </div>

        {/* Personality Evolution Radar Chart View */}
        {showRadarChart && (
          <div className="mt-2.5">
            <PersonalityRadarChart
              character={character}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {/* Daily Aspirations System (Randomly Generated In-Game Day Goals for Temporary Motive Boosts) */}
        <div
          data-testid="inspector-daily-aspirations-section"
          className="mt-2.5 p-2.5 rounded-lg bg-amber-50/85 dark:bg-amber-950/35 border border-amber-200/90 dark:border-amber-800/60"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1">
              <Target className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              Daily Aspirations (Day {dailyAspirationsState.currentDay})
            </span>
            <div className="flex items-center gap-1.5">
              <span
                data-testid="inspector-daily-aspirations-progress"
                className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300"
              >
                {completedAspirationsCount}/{dailyAspirationsState.aspirations.length} Done
              </span>
            </div>
          </div>

          <div className="text-[9px] text-gray-600 dark:text-gray-400 mb-2">
            Toons autonomously pursue these daily goals for multi-hour temporary motive boosts.
          </div>

          {/* Active Temporary Motive Boosts Banner */}
          {dailyAspirationsState.activeMotiveBoosts.length > 0 && (
            <div
              data-testid="active-motive-boosts-banner"
              className="mb-2 p-2 rounded-md bg-emerald-500/15 dark:bg-emerald-950/70 border border-emerald-400/70 dark:border-emerald-700/70 space-y-1"
            >
              <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Active Temporary Motive Boosts ({dailyAspirationsState.activeMotiveBoosts.length})
              </div>
              {dailyAspirationsState.activeMotiveBoosts.map((boost) => {
                const bonusText = Object.entries(boost.motiveBonuses)
                  .map(
                    ([stat, val]) =>
                      `+${val} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`
                  )
                  .join(', ');
                return (
                  <div
                    key={boost.id}
                    data-testid="active-motive-boost-item"
                    className="flex items-center justify-between gap-1 text-[10px] text-emerald-900 dark:text-emerald-200"
                  >
                    <span className="font-semibold truncate">
                      ✦ {boost.aspirationTitle} ({bonusText})
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-200/70 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 shrink-0">
                      {formatTaskDuration(boost.remainingGameSeconds)} left
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Daily Aspiration Goal Cards */}
          <div className="space-y-1.5">
            {dailyAspirationsState.aspirations.map((asp) => {
              const pct = Math.min(
                100,
                Math.round((asp.currentProgress / Math.max(1, asp.targetCount)) * 100)
              );
              const rewardLabels = Object.entries(asp.motiveBoostReward)
                .map(
                  ([stat, val]) =>
                    `+${val} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`
                )
                .join(', ');
              const boostHours = Math.round(asp.boostDurationSeconds / 3600);
              const matchingObj =
                availableObjects.find((o) => o.id === asp.preferredObjectId) ||
                availableObjects.find((o) =>
                  doesActivityMatchDailyAspiration(asp, { object: o })
                );

              return (
                <div
                  key={asp.id}
                  data-testid="daily-aspiration-card"
                  className={`p-2 rounded-md border text-[10px] transition-all ${
                    asp.completed
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80'
                      : 'bg-white/95 dark:bg-gray-900/95 border-amber-200/80 dark:border-amber-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1">
                        {asp.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                        )}
                        <span className="truncate">{asp.title}</span>
                      </div>
                      <p className="text-[9px] text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">
                        {asp.description}
                      </p>
                    </div>

                    {!asp.completed ? (
                      <span
                        data-testid={`autonomous-aspiration-badge-${asp.templateId}`}
                        className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-semibold text-[9px] shrink-0"
                      >
                        AI Pursuing
                      </span>
                    ) : (
                      <span
                        data-testid={`completed-aspiration-badge-${asp.templateId}`}
                        className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 font-bold text-[9px] shrink-0"
                      >
                        ✓ Achieved
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-1.5 text-[9px]">
                    <span className="text-amber-800 dark:text-amber-300 font-semibold truncate">
                      Boost: {rewardLabels} ({boostHours}h)
                    </span>
                    <span className="font-mono font-bold text-gray-600 dark:text-gray-400 shrink-0">
                      {asp.currentProgress}/{asp.targetCount}
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-300 ${
                        asp.completed
                          ? 'bg-emerald-500'
                          : 'bg-amber-500 dark:bg-amber-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Life Experience Tracker (Dynamic Trait Evolution from Autonomous Activities & World Events) */}
        <div
          data-testid="inspector-life-experience-tracker"
          className="mt-2.5 p-2.5 rounded-lg bg-indigo-50/75 dark:bg-indigo-950/35 border border-indigo-200/80 dark:border-indigo-800/60"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
              <Compass className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              Life Experience Tracker
            </span>
            <span
              data-testid="inspector-life-experience-summary"
              className="text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-300"
            >
              {lifeExperience.totalActivitiesCompleted} Acts · {lifeExperience.totalWorldEventsExperienced} Evts
            </span>
          </div>
          <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-2">
            Dominant Focus:{' '}
            <strong className="text-gray-800 dark:text-gray-200">
              {EXPERIENCE_DOMAIN_CONFIG[lifeExperience.dominantDomain]?.label || 'Architecture & Ambition'}
            </strong>
          </div>

          <div className="space-y-1.5">
            {topExperienceDomains.map((dom) => {
              const tierFloor = dom.evolutionTier * 100;
              const pctWithinTier = Math.max(
                0,
                Math.min(100, Math.round(dom.experiencePoints - tierFloor))
              );
              return (
                <div
                  key={dom.domain}
                  data-testid={`experience-domain-${dom.domain.toLowerCase()}`}
                  className="p-1.5 rounded bg-white/90 dark:bg-gray-900/90 border border-indigo-100 dark:border-indigo-900/60 text-[10px]"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {dom.label}
                    </span>
                    <span className="font-mono text-[9px] text-gray-500 dark:text-gray-400 shrink-0">
                      {dom.activityCount} act · {dom.worldEventCount} evt · {dom.totalHoursSpent}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5 mb-1 text-[9px]">
                    <span className="text-indigo-700 dark:text-indigo-300 font-medium truncate">
                      {dom.opposingTrait
                        ? `Shifts "${dom.opposingTrait}" → "${dom.emergentTrait}"`
                        : `Next Shift → "${dom.emergentTrait}"`}
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {pctWithinTier}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"
                      style={{ width: `${pctWithinTier}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {lifeExperience.traitShiftHistory.length > 0 && (
            <div
              data-testid="inspector-trait-shift-history"
              className="mt-2 pt-1.5 border-t border-indigo-200/70 dark:border-indigo-800/60 space-y-1"
            >
              <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                Gradual Personality Shifts ({lifeExperience.traitShiftHistory.length})
              </div>
              {lifeExperience.traitShiftHistory.slice(-3).map((shift) => (
                <div
                  key={shift.id}
                  className="text-[10px] text-gray-700 dark:text-gray-200 leading-snug"
                >
                  <strong className="text-indigo-700 dark:text-indigo-300">
                    {shift.replacedTrait
                      ? `${shift.replacedTrait} → ${shift.addedTrait}:`
                      : `+ ${shift.addedTrait}:`}
                  </strong>{' '}
                  {shift.reason}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event-Imprinted Personality Quirks (Good or Bad from House Events / Specific Foods) */}
        {character.acquiredQuirks && character.acquiredQuirks.length > 0 && (
          <div
            data-testid="inspector-acquired-quirks"
            className="mt-2.5 p-2 rounded-lg bg-purple-50/75 dark:bg-purple-950/35 border border-purple-200/80 dark:border-purple-800/60"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 mb-1">
              Event-Shaped Personality Imprints ({character.acquiredQuirks.length})
            </div>
            <div className="space-y-1">
              {character.acquiredQuirks.slice(-3).map((q) => (
                <div
                  key={q.id}
                  className="text-[10px] flex items-center justify-between gap-1.5 text-gray-700 dark:text-gray-200"
                >
                  <span className="truncate">
                    <strong
                      className={
                        q.polarity === 'GOOD'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      [{q.polarity}] {q.traitName}:
                    </strong>{' '}
                    {q.assignedTaskLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Topics Learned from Newspaper, TV & Books */}
        {character.learnedTopics && character.learnedTopics.length > 0 && (
          <div className="mt-2.5 p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">
              Conversation Topics (TV / Books / Daily News)
            </div>
            <div className="text-[10px] text-gray-700 dark:text-gray-300 space-y-0.5">
              {character.learnedTopics.slice(-3).map((topic, idx) => (
                <div key={idx} className="truncate">
                  • {topic}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Toon Knowledgebase & Intelligence (Real Book Summaries & World Event Processing) */}
        <div
          data-testid="inspector-knowledgebase"
          className="mt-2.5 p-2.5 rounded-lg bg-emerald-50/75 dark:bg-emerald-950/35 border border-emerald-200/80 dark:border-emerald-800/60"
        >
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1 truncate">
              <Brain className="w-3 h-3 shrink-0" />
              Knowledgebase & Decision IQ
            </span>
            <span
              data-testid="inspector-intelligence-score"
              className="shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold text-[10px]"
            >
              IQ {iqScore} · {knowledgebase.decisionTier}
            </span>
          </div>
          <div className="text-[10px] text-gray-600 dark:text-gray-300 flex items-center justify-between mb-1.5">
            <span>
              Data Processed: <strong>{knowledgebase.totalDataPointsProcessed} pts</strong> · Books:{' '}
              <strong>{knowledgebase.booksRead.length}</strong> · Events:{' '}
              <strong>{knowledgebase.worldEvents.length}</strong>
            </span>
            <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
              +{iqEfficiencyPct}% Decision Eff.
            </span>
          </div>

          {latestBook && (
            <div
              data-testid="inspector-book-memory-summary"
              className="p-2 rounded bg-white/90 dark:bg-gray-900/90 border border-emerald-200 dark:border-emerald-800/70 text-[10px] mb-1.5"
            >
              <div className="font-bold text-emerald-900 dark:text-emerald-200">
                📖 Book in Memory: "{latestBook.title}" — {latestBook.author}
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-snug mt-0.5">
                {latestBook.summary}
              </p>
              <div className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                Decision Heuristic: {latestBook.decisionHeuristic}
              </div>
            </div>
          )}

          {latestWorldEvent && (
            <div
              data-testid="inspector-world-event-memory"
              className="p-1.5 rounded bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[10px]"
            >
              <div className="font-bold text-amber-900 dark:text-amber-300 truncate">
                🌐 World Event: {latestWorldEvent.headline}
              </div>
              <div className="text-gray-700 dark:text-gray-300 leading-snug">
                {latestWorldEvent.storySummary}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Epistemically Isolated Memory Stream */}
      <div className="mt-3.5 pt-3 border-t border-gray-200 dark:border-gray-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
          Private Knowledge Stream (Books & World Events)
        </h3>
        <div
          data-testid="inspector-private-memory-stream"
          className="space-y-1.5 max-h-28 overflow-y-auto font-mono text-[10px] text-gray-700 dark:text-gray-300"
        >
          {character.privateMemory.slice(-5).map((mem, i) => (
            <div key={i} className="p-1.5 rounded bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/60 leading-tight">
              • {mem}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

