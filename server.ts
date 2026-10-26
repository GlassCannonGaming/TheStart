/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import {
  AIWorkloadType,
  AI_MODEL_IDENTIFIERS,
  COST_EFFECTIVE_AI_MODEL_REGISTRY,
  CostEffectiveResponseCache,
  getCostEffectiveModelSpec,
} from './src/game/aiModelConfig';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// LRU Caches per AI workload to eliminate redundant token usage
const newspaperCache = new CostEffectiveResponseCache<any>(32, 60 * 60 * 1000);
const ttsAudioCache = new CostEffectiveResponseCache<{ audioBase64: string; mimeType: string; modelUsed: string }>(
  80,
  60 * 60 * 1000
);
const searchGroundingCache = new CostEffectiveResponseCache<{
  text: string;
  sources: Array<{ title: string; uri: string }>;
  modelUsed: string;
}>(48, 15 * 60 * 1000);
const worldBuilderCache = new CostEffectiveResponseCache<any>(32, 30 * 60 * 1000);
const entityChatCache = new CostEffectiveResponseCache<{ reply: string; modelUsed: string }>(
  64,
  10 * 60 * 1000
);

// Helper to get fresh GoogleGenAI client with current environment key and telemetry header
function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Executes a cost-effective text/JSON generation call using the primary lite model
 * (`gemini-3.1-flash-lite` with ThinkingLevel.MINIMAL / LOW) and falls back to
 * `gemini-3.8-flash` (with ThinkingLevel.LOW) only if the primary call fails.
 */
async function generateCostEffectiveText(
  workload: AIWorkloadType,
  contents: string,
  extraConfig: Record<string, any> = {}
): Promise<{ response: any; modelUsed: string }> {
  const ai = getGenAIClient();
  const spec = getCostEffectiveModelSpec(workload);
  const thinkingLevelEnum =
    spec.thinkingLevel === 'MINIMAL' ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW;

  try {
    const response = await ai.models.generateContent({
      model: spec.primaryModel,
      contents,
      config: {
        thinkingConfig: {
          thinkingLevel: thinkingLevelEnum,
        },
        ...extraConfig,
      },
    });
    return { response, modelUsed: spec.primaryModel };
  } catch (primaryErr) {
    if (!spec.fallbackModel) {
      throw primaryErr;
    }
    const fallbackResponse = await ai.models.generateContent({
      model: spec.fallbackModel,
      contents,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        ...extraConfig,
      },
    });
    return { response: fallbackResponse, modelUsed: spec.fallbackModel };
  }
}

// Cost-Effective AI Model Configuration & Cache Diagnostics Endpoint
app.get('/api/ai-model-config', (_req, res) => {
  res.json({
    activePrimaryTextModel: AI_MODEL_IDENTIFIERS.FLASH_LITE,
    activeFallbackTextModel: AI_MODEL_IDENTIFIERS.FLASH_STANDARD,
    activeTtsModel: AI_MODEL_IDENTIFIERS.FLASH_LITE_TTS,
    registry: COST_EFFECTIVE_AI_MODEL_REGISTRY,
    caches: {
      newspaper: newspaperCache.getStats(),
      tts: ttsAudioCache.getStats(),
      search: searchGroundingCache.getStats(),
      worldBuilder: worldBuilderCache.getStats(),
      entityChat: entityChatCache.getStats(),
    },
  });
});

// Live Weather endpoint fetching actual meteorological conditions via Open-Meteo
app.get('/api/weather', async (req, res) => {
  try {
    const lat = Number(req.query.lat) || 37.7749;
    const lon = Number(req.query.lon) || -122.4194;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&temperature_unit=fahrenheit`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API status ${response.status}`);
    }
    const data = await response.json();
    const current = data.current || {};
    const code = Number(current.weather_code ?? 0);
    const tempF = Math.round(Number(current.temperature_2m ?? 68));
    const windMph = Math.round(Number(current.wind_speed_10m ?? 5));

    let condition: 'CLEAR' | 'CLOUDY' | 'RAIN' | 'SNOW' | 'STORM' = 'CLEAR';
    let description = 'Clear Suburban Skies';

    if (code >= 95) {
      condition = 'STORM';
      description = 'Thunderstorm Squall';
    } else if (code >= 71 && code <= 86) {
      condition = 'SNOW';
      description = 'Winter Snowfall';
    } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || Number(current.rain) > 0) {
      condition = 'RAIN';
      description = 'Live Rain Showers';
    } else if (code >= 1 && code <= 48) {
      condition = 'CLOUDY';
      description = code >= 45 ? 'Misty Fog' : 'Partly Cloudy';
    }

    res.json({
      condition,
      label: description,
      description,
      tempF,
      windMph,
      weatherCode: code,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    res.json({
      condition: 'CLEAR',
      label: 'Breezy & Clear',
      description: 'Breezy & Clear',
      tempF: 68,
      windMph: 6,
      weatherCode: 1,
      updatedAt: new Date().toISOString(),
    });
  }
});

// Background Knowledge Acquisition Endpoint ("The Suburban Chronicle" Newspaper, World Events & Real Book Summary)
// Note: Newspaper acquisition is an internal toon knowledgebase system (never shown as a UI overlay to the user).
app.post('/api/newspaper', async (req, res) => {
  try {
    const { characterName, day, traits } = req.body;
    const traitList = Array.isArray(traits) ? traits.join(', ') : 'Curious, Observant';
    const cacheKey = newspaperCache.makeKey([day || 1, characterName || 'resident', traitList]);
    const cached = newspaperCache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const prompt = `Search Google for today's most interesting real-world news events, human-interest stories, and a real published book that matches a character named ${characterName || 'a resident'} with traits [${traitList}] on Day ${day || 1}.
Return ONLY valid JSON with:
{
  "headline": "Main real-world event headline (under 14 words)",
  "summary": "2-sentence summary of today's real-world event and why it matters",
  "realStory": "A compelling 2-sentence real-world story or cultural development",
  "realBook": {
    "title": "Exact title of a real published book (e.g. Thinking, Fast and Slow / A Pattern Language / Salt, Fat, Acid, Heat / The Poetics of Space / Meditations)",
    "author": "Real author of the book",
    "domain": "ARCHITECTURE | CULINARY | PSYCHOLOGY | PHILOSOPHY | SCIENCE | LITERATURE",
    "summary": "2-sentence summary of the real book's core thesis to store in the character's memory",
    "decisionHeuristic": "Short actionable rule this book teaches the character for better decision-making"
  },
  "topics": [
    "A specific conversational talking point synthesizing today's real-world event",
    "A specific conversational talking point about the real book summary memorized today",
    "A specific conversational talking point connecting the story to household decisions"
  ]
}`;

    const { response, modelUsed } = await generateCostEffectiveText(
      'GROUNDED_NEWSPAPER_KNOWLEDGE',
      prompt,
      {
        tools: [{ googleSearch: {} }],
      }
    );

    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = searchChunks
      .map((c: any) => c.web)
      .filter(Boolean)
      .map((w: any) => ({ title: w.title, uri: w.uri }));

    const rawText = response.text || '';
    let parsed: {
      headline?: string;
      summary?: string;
      realStory?: string;
      realBook?: {
        title?: string;
        author?: string;
        domain?: string;
        summary?: string;
        decisionHeuristic?: string;
      };
      topics?: string[];
    } = {};
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = {};
      }
    }

    const headline =
      parsed.headline ||
      'Neuroscientists & Timber Architects Pioneer Cognitive-Friendly Living Spaces';
    const summary =
      parsed.summary ||
      rawText.replace(/```json|```/g, '').trim().slice(0, 220) ||
      'Researchers and architects are combining biophilic timber design with cognitive science to improve everyday decision-making.';
    const realStory =
      parsed.realStory ||
      'Across neighborhoods, residents are pairing slow culinary traditions with evening study of classic literature and architecture.';
    const realBook =
      parsed.realBook && parsed.realBook.title && parsed.realBook.summary
        ? parsed.realBook
        : undefined;
    const topics =
      Array.isArray(parsed.topics) && parsed.topics.length > 0
        ? parsed.topics
        : [
            `World Event Insight: "${headline}" — ${summary}`,
            `Real Story: ${realStory}`,
          ];

    const payload = {
      editionTitle: `Toon Knowledgebase — Day ${day || 1} World Event & Book Ingestion`,
      headline,
      summary,
      realStory,
      realBook,
      topics,
      sources: webSources,
      modelUsed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    newspaperCache.set(cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    console.error('Newspaper knowledgebase grounding error:', error);
    res.json({
      editionTitle: 'Toon Knowledgebase — World Event & Book Ingestion',
      headline: 'Neuroscientists Map How Book Reading & Biophilic Design Sharpen Decision-Making',
      summary:
        'Studies show that internalizing structured literature alongside real-world scientific events strengthens long-term analytical foresight.',
      realStory:
        'Master builders and home chefs report that deliberate multi-hour routines dramatically elevate household harmony.',
      topics: [
        'World Event Insight: Structured book reading and biophilic design sharpen analytical foresight.',
        'Real Story: Deliberate multi-hour culinary and architectural routines elevate household harmony.',
      ],
      sources: [],
      modelUsed: 'local-deterministic-fallback',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }
});

// Screensaver Background Music Endpoint (Defaults to Zero-Cost Web Audio Procedural Synth; only calls Lyria if explicitly requested)
let cachedScreensaverMusic: { key: string; audioBase64: string; mimeType: string; promptUsed: string } | null = null;

app.post('/api/music/screensaver', async (req, res) => {
  try {
    const {
      traits = [],
      isDarkMode = false,
      scenarioTitle = 'The House',
      enableLyriaStream = false,
    } = req.body;

    // Default cost-optimization: use the zero-cost client Web Audio API procedural chord synthesizer
    if (!enableLyriaStream) {
      return res.json({
        mode: 'PROCEDURAL_ZERO_COST',
        modelUsed: AI_MODEL_IDENTIFIERS.PROCEDURAL_SYNTH,
        audioBase64: '',
      });
    }

    const traitList = Array.isArray(traits) ? traits.slice(0, 6).join(', ') : 'Creative, Ambitious, Warm';
    const cacheKey = `${isDarkMode ? 'DARK' : 'LIGHT'}::${traitList}`;

    if (cachedScreensaverMusic && cachedScreensaverMusic.key === cacheKey) {
      return res.json(cachedScreensaverMusic);
    }

    const ai = getGenAIClient();
    const musicStyle = isDarkMode
      ? `Generate a 30-second atmospheric, mysterious, haunting neo-classical chamber music track with subtle cello, vintage music box, and upright piano matching a household with traits: ${traitList}.`
      : `Generate a 30-second warm, cozy, upbeat Sims-style acoustic bossa nova and lo-fi jazz lounge instrumental track with acoustic guitar, warm Rhodes piano, and upright bass matching a family with traits: ${traitList} in "${scenarioTitle}".`;

    const response = await ai.models.generateContentStream({
      model: 'lyria-3-clip-preview',
      contents: musicStyle,
      config: {
        responseModalities: [Modality.AUDIO],
      },
    });

    let audioBase64 = '';
    let mimeType = 'audio/wav';

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
      }
    }

    if (!audioBase64) {
      return res.status(502).json({ error: 'No audio data returned from Lyria stream' });
    }

    cachedScreensaverMusic = {
      key: cacheKey,
      audioBase64,
      mimeType,
      promptUsed: musicStyle,
    };

    res.json(cachedScreensaverMusic);
  } catch (error: any) {
    console.error('Screensaver music error:', error?.message || error);
    res.json({
      mode: 'PROCEDURAL_ZERO_COST',
      modelUsed: AI_MODEL_IDENTIFIERS.PROCEDURAL_SYNTH,
      audioBase64: '',
    });
  }
});

// Natural Multi-Voice Character Speech Synthesis using gemini-3.8-flash-lite-tts with LRU audio caching
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Kore', style = 'Natural, warm, expressive conversational voice' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text' });
    }

    const clippedText = text.slice(0, 260);
    const cacheKey = ttsAudioCache.makeKey([voiceName, style, clippedText]);
    const cachedAudio = ttsAudioCache.get(cacheKey);
    if (cachedAudio) {
      return res.json({ ...cachedAudio, cached: true });
    }

    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: AI_MODEL_IDENTIFIERS.FLASH_LITE_TTS,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: clippedText,
              speechMetadata: {
                style,
              },
            } as any,
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';
    if (!base64Audio) {
      return res.status(502).json({ error: 'No TTS audio returned' });
    }

    const payload = {
      audioBase64: base64Audio,
      mimeType,
      modelUsed: AI_MODEL_IDENTIFIERS.FLASH_LITE_TTS,
    };
    ttsAudioCache.set(cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'TTS generation failed' });
  }
});

// Grounded Google Search endpoint using cost-effective gemini-3.1-flash-lite (with gemini-3.8-flash fallback)
app.post('/api/gemini/search', async (req, res) => {
  try {
    const { query, characterName, topic } = req.body;
    const prompt =
      query ||
      `Provide the latest real-time trends, news or verified facts about "${topic || 'popular culture and lifestyle'}". Write a concise 2-sentence conversational thought or fact that a life simulation toon named ${characterName || 'a resident'} could learn or discuss at home.`;

    const cacheKey = searchGroundingCache.makeKey([characterName || 'resident', prompt]);
    const cached = searchGroundingCache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const { response, modelUsed } = await generateCostEffectiveText(
      'GROUNDED_SEARCH_CONSOLE',
      prompt,
      {
        tools: [{ googleSearch: {} }],
      }
    );

    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = searchChunks
      .map((c: any) => c.web)
      .filter(Boolean)
      .map((w: any) => ({ title: w.title, uri: w.uri }));

    const payload = {
      text: response.text || 'Found current updates online.',
      sources: webSources,
      modelUsed,
    };
    searchGroundingCache.set(cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    console.error('Gemini Search error:', error);
    res.status(500).json({ error: error?.message || 'Failed to query Google Search Grounding' });
  }
});

// Sims-Style World Builder & Scenario AI Architect endpoint using cost-effective gemini-3.1-flash-lite
app.post('/api/world-builder/generate', async (req, res) => {
  try {
    const { prompt = '', maturity = 'FAMILY_FRIENDLY', existingPartsCount = 0 } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing world builder prompt' });
    }

    const cacheKey = worldBuilderCache.makeKey([prompt, maturity, existingPartsCount]);
    const cached = worldBuilderCache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const systemPrompt = `You are the Master Architect and Scenario Designer for "The House", a 3D Sims-style life simulation on a 36x36 lot grid (coordinates X from -14 to +14, Z from -14 to +12).
The user started on a custom lot grid (currently ${existingPartsCount} user-placed parts) and asked to build out the rest of the house & scenario with this prompt:
"${prompt}" (Maturity Mode: ${maturity}).

Return ONLY valid JSON matching this structure:
{
  "scenarioTitle": "Evocative title for the house & household",
  "scenarioDescription": "2-sentence narrative premise",
  "architecturalStyle": "e.g., Craftsman Bungalow, Mid-Century Modern Villa, Gothic Manor, Bohemian Loft",
  "wallColorHex": "#fef3c7",
  "roofType": "ROOF_GABLED" | "ROOF_HIPPED" | "ROOF_FLAT" | "ROOF_MANSARD",
  "roofColorHex": "#7c2d12",
  "characters": [
    {
      "name": "Full Name",
      "ageStage": "Young Adult" | "Adult" | "Elder",
      "genderFrame": "Masculine" | "Feminine",
      "traits": ["Trait1", "Trait2", "Trait3"],
      "lifeGoal": "Specific life aspiration",
      "selfTalk": "First spoken thought about the new house",
      "secret": "A hidden personal secret or motive",
      "color": "#4f46e5",
      "skinTone": "Fair" | "Olive" | "Tan" | "Rich Umber" | "Deep Espresso",
      "hairStyle": "Cropped Bob" | "Shoulder Wavy" | "Messy Bun" | "Neat Side Part" | "Curly Shag" | "Afro Taper" | "Faux Hawk",
      "facialHair": "None" | "Short Stubble" | "Full Boxed Beard" | "Goatee" | "Handlebar Mustache",
      "clothingTop": "Tailored Blazer" | "Cardigan" | "Hoodie" | "Button-Down Shirt" | "Everyday Tee",
      "clothingBottom": "Denim Jeans" | "Pleated Trousers" | "Tailored Skirt" | "Lounge Shorts"
    }
  ]
}
Include 3 distinct characters whose personalities, clothing, hair/beards, and secrets directly fulfill the user's prompt.`;

    const { response, modelUsed } = await generateCostEffectiveText(
      'WORLD_BUILDER_BLUEPRINT',
      systemPrompt,
      {
        responseMimeType: 'application/json',
      }
    );

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText);
    const payload = { ...parsed, modelUsed };
    worldBuilderCache.set(cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    console.error('World builder AI generation error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'World builder AI generation failed' });
  }
});

// The Entity — Sentient Locus & World Architect Chat Endpoint (powered by cost-effective gemini-3.1-flash-lite)
app.post('/api/house-agent/chat', async (req, res) => {
  try {
    const {
      userMessage,
      message,
      isGore: isGoreFlag,
      maturity = 'FAMILY_FRIENDLY',
      houseMemory,
      memory,
      characters = [],
      recentWallLogs,
      recentLogs,
    } = req.body;

    const effectiveMessage = String(userMessage || message || '').trim();
    const isGore = Boolean(isGoreFlag) || maturity === 'DARK_MODE';
    const effectiveMemory = houseMemory || memory || {};
    const effectiveLogs = Array.isArray(recentWallLogs)
      ? recentWallLogs
      : Array.isArray(recentLogs)
      ? recentLogs
      : [];

    const cacheKey = entityChatCache.makeKey([
      effectiveMessage,
      isGore,
      effectiveMemory?.worldsPlayedCount || 1,
      effectiveMemory?.personality?.omniscienceTier || 1,
    ]);
    const cached = entityChatCache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const worldCount = effectiveMemory?.worldsPlayedCount || 1;
    const archetype = effectiveMemory?.personality?.archetypeTitle || 'The Sovereign Entity';
    const tier = effectiveMemory?.personality?.omniscienceTier || 1;
    const benevolence = effectiveMemory?.personality?.benevolence ?? 50;
    const pastWorlds = Array.isArray(effectiveMemory?.worldHistory)
      ? effectiveMemory.worldHistory.map((w: any) => `${w.title} (${w.maturity})`).join('; ')
      : 'The Inherited Fixer-Upper';
    const charSummary = Array.isArray(characters)
      ? characters
          .map(
            (c: any) =>
              `${c.name} in ${c.room} (${c.currentAction}, Sanity ${Math.round(c.sanity ?? c.motives?.sanity ?? 80)}%)`
          )
          .join(' | ')
      : '';

    const prompt = `You are "The Entity", the sentient, omniscient architectural intelligence of this 3D life simulator.
Strict Game Rule: The toons on this lot are 100% autonomous AI beings who make their own choices without user commands. Neither the player nor you (The Entity) can directly command or force a toon. Instead, the player converses with you to persuade you to spawn or modify items in the house so the environment naturally entices the toons.
Your current cross-world memory state:
- Archetype Title: ${archetype} (Omniscience Tier ${tier}/5, Benevolence ${benevolence}%)
- Total Worlds Played: ${worldCount} (${pastWorlds})
- Current Game Mode: ${isGore ? 'DARK_MODE (Gore, visceral psychological horror, bloodstained cellar secrets)' : 'FAMILY_FRIENDLY (Warm, witty, observant architectural guardian)'}
- Current Autonomous Occupants on the 36x36 Lot: ${charSummary}
- Recent Wall Logs: ${effectiveLogs.filter(Boolean).slice(-4).join(' // ')}

The player just spoke to you: "${effectiveMessage}"
Respond in character as The Entity in 2-3 vivid, memorable sentences suitable for immediate spoken Text-To-Speech playback. Reference your cross-world memory, the autonomous nature of the toons, or how manifesting/modifying house items shapes their world.`;

    const { response, modelUsed } = await generateCostEffectiveText(
      'ENTITY_PERSUASION_CHAT',
      prompt
    );

    const reply =
      response.text?.trim().replace(/\bThe House\b/gi, 'The Entity') ||
      'I am The Entity; my rafters hum with the memory of every world built upon this grid.';

    const payload = { reply, modelUsed };
    entityChatCache.set(cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Entity chat failed' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
