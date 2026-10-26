/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized Cost-Effective Gemini AI Model Configuration & Tier Registry.
 *
 * Follows official @google/genai guidelines:
 * - Uses `gemini-3.1-flash-lite` (with ThinkingLevel.MINIMAL / LOW) as the primary ultra-cost-effective
 *   model for high-frequency autonomous agent dialogue, Entity persuasion chat, and fast structured JSON.
 * - Uses `gemini-3.8-flash` (with ThinkingLevel.LOW) as the secondary high-precision fallback for complex
 *   grounded search or multi-character scenario blueprints.
 * - Uses `gemini-3.8-flash-lite-tts` for natural multi-voice speech synthesis with server-side LRU caching.
 * - Avoids paid-key-gated models (`gemini-4-argon`, `gemini-3-pro-image`, `lyria-*`) by default so the game
 *   runs at minimal cost with zero API-key interruptions.
 */

export type AIWorkloadType =
  | 'ENTITY_PERSUASION_CHAT'
  | 'WORLD_BUILDER_BLUEPRINT'
  | 'GROUNDED_NEWSPAPER_KNOWLEDGE'
  | 'GROUNDED_SEARCH_CONSOLE'
  | 'CHARACTER_VOICE_TTS'
  | 'SCREENSAVER_AMBIENT_MUSIC';

export interface CostEffectiveModelSpec {
  workload: AIWorkloadType;
  primaryModel: string;
  fallbackModel?: string;
  thinkingLevel?: 'MINIMAL' | 'LOW';
  requiresPaidKey: boolean;
  cacheTtlMs: number;
  maxCacheEntries: number;
  costTierLabel: 'ZERO_COST_PROCEDURAL' | 'ULTRA_LOW_COST_LITE' | 'LOW_COST_FLASH';
  description: string;
}

export const AI_MODEL_IDENTIFIERS = {
  FLASH_LITE: 'gemini-3.1-flash-lite',
  FLASH_STANDARD: 'gemini-3.8-flash',
  FLASH_LITE_TTS: 'gemini-3.8-flash-lite-tts',
  PROCEDURAL_SYNTH: 'web-audio-procedural-synth',
} as const;

export const COST_EFFECTIVE_AI_MODEL_REGISTRY: Record<AIWorkloadType, CostEffectiveModelSpec> = {
  ENTITY_PERSUASION_CHAT: {
    workload: 'ENTITY_PERSUASION_CHAT',
    primaryModel: AI_MODEL_IDENTIFIERS.FLASH_LITE,
    fallbackModel: AI_MODEL_IDENTIFIERS.FLASH_STANDARD,
    thinkingLevel: 'MINIMAL',
    requiresPaidKey: false,
    cacheTtlMs: 10 * 60 * 1000, // 10 minutes
    maxCacheEntries: 64,
    costTierLabel: 'ULTRA_LOW_COST_LITE',
    description:
      'Ultra-fast, cost-effective Entity conversation & persuasion responses with minimal thinking overhead.',
  },
  WORLD_BUILDER_BLUEPRINT: {
    workload: 'WORLD_BUILDER_BLUEPRINT',
    primaryModel: AI_MODEL_IDENTIFIERS.FLASH_LITE,
    fallbackModel: AI_MODEL_IDENTIFIERS.FLASH_STANDARD,
    thinkingLevel: 'LOW',
    requiresPaidKey: false,
    cacheTtlMs: 30 * 60 * 1000, // 30 minutes
    maxCacheEntries: 32,
    costTierLabel: 'ULTRA_LOW_COST_LITE',
    description:
      'Structured JSON scenario & household generation using gemini-3.1-flash-lite with low thinking budget.',
  },
  GROUNDED_NEWSPAPER_KNOWLEDGE: {
    workload: 'GROUNDED_NEWSPAPER_KNOWLEDGE',
    primaryModel: AI_MODEL_IDENTIFIERS.FLASH_LITE,
    fallbackModel: AI_MODEL_IDENTIFIERS.FLASH_STANDARD,
    thinkingLevel: 'LOW',
    requiresPaidKey: false,
    cacheTtlMs: 60 * 60 * 1000, // 60 minutes per in-game day
    maxCacheEntries: 32,
    costTierLabel: 'ULTRA_LOW_COST_LITE',
    description:
      'Daily real-world event & real book summary ingestion for Toon Knowledgebase with Google Search grounding.',
  },
  GROUNDED_SEARCH_CONSOLE: {
    workload: 'GROUNDED_SEARCH_CONSOLE',
    primaryModel: AI_MODEL_IDENTIFIERS.FLASH_LITE,
    fallbackModel: AI_MODEL_IDENTIFIERS.FLASH_STANDARD,
    thinkingLevel: 'LOW',
    requiresPaidKey: false,
    cacheTtlMs: 15 * 60 * 1000, // 15 minutes
    maxCacheEntries: 48,
    costTierLabel: 'ULTRA_LOW_COST_LITE',
    description:
      'Grounded Google Search insights for in-game resident topics using gemini-3.1-flash-lite.',
  },
  CHARACTER_VOICE_TTS: {
    workload: 'CHARACTER_VOICE_TTS',
    primaryModel: AI_MODEL_IDENTIFIERS.FLASH_LITE_TTS,
    requiresPaidKey: false,
    cacheTtlMs: 60 * 60 * 1000, // 60 minutes audio memoization
    maxCacheEntries: 80,
    costTierLabel: 'ULTRA_LOW_COST_LITE',
    description:
      'Multi-voice expressive speech synthesis via gemini-3.8-flash-lite-tts with audio base64 caching.',
  },
  SCREENSAVER_AMBIENT_MUSIC: {
    workload: 'SCREENSAVER_AMBIENT_MUSIC',
    primaryModel: AI_MODEL_IDENTIFIERS.PROCEDURAL_SYNTH,
    requiresPaidKey: false,
    cacheTtlMs: 120 * 60 * 1000,
    maxCacheEntries: 8,
    costTierLabel: 'ZERO_COST_PROCEDURAL',
    description:
      'Zero-cost Web Audio API procedural bossa-nova / chamber music synthesizer (avoids paid Lyria streaming calls).',
  },
};

export function getCostEffectiveModelSpec(workload: AIWorkloadType): CostEffectiveModelSpec {
  return COST_EFFECTIVE_AI_MODEL_REGISTRY[workload];
}

/**
 * Lightweight deterministic LRU Cache for deduplicating AI API responses and minimizing token spend.
 */
export class CostEffectiveResponseCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(maxEntries = 64, defaultTtlMs = 15 * 60 * 1000) {
    this.maxEntries = Math.max(1, maxEntries);
    this.defaultTtlMs = Math.max(1000, defaultTtlMs);
  }

  public makeKey(parts: Array<string | number | boolean | undefined | null>): string {
    return parts
      .map((p) =>
        String(p ?? '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ')
      )
      .join('::');
  }

  public get(key: string, nowMs = Date.now()): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (nowMs > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry.value;
  }

  public set(key: string, value: T, ttlMs = this.defaultTtlMs, nowMs = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value, expiresAt: nowMs + ttlMs });
  }

  public getStats(): { size: number; hits: number; misses: number; maxEntries: number } {
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      maxEntries: this.maxEntries,
    };
  }

  public clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
