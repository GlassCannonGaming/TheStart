/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Send,
  Volume2,
  MessageSquare,
  History,
  Sparkles,
  Mic,
  MicOff,
  Brain,
  Globe,
  Skull,
  Sun,
  PackagePlus,
} from 'lucide-react';
import { Character, SmartObject } from '../game/simulation';
import { sound } from '../game/soundSynth';
import {
  HouseCrossWorldMemory,
  EntityPersuasionResult,
} from '../game/houseAgent';

interface HouseChatbotModalProps {
  onClose: () => void;
  characters: Character[];
  smartObjects: SmartObject[];
  wallLogs: string[];
  isDarkMode: boolean;
  houseMemory: HouseCrossWorldMemory;
  autoStartVoiceChat?: boolean;
  onPersuadeEntity: (userMessage: string) => EntityPersuasionResult;
  onGenerateEntity3DAsset?: (
    prompt: string,
    roomOverride?: string
  ) => { smartObject: SmartObject; placementSummary: string };
  onSwitchToCreationTools?: () => void;
  onRecordVoiceExchange?: (userUtterance: string, entityReply: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'entity';
  text: string;
  timestamp: string;
  viaVoice?: boolean;
  persuasionOutcome?: {
    convinced: boolean;
    persuasionScore: number;
    actionType: EntityPersuasionResult['actionType'];
    itemLabel?: string;
  };
}

export const HouseChatbotModal: React.FC<HouseChatbotModalProps> = ({
  onClose,
  characters,
  smartObjects,
  wallLogs,
  isDarkMode,
  houseMemory,
  autoStartVoiceChat = false,
  onPersuadeEntity,
  onGenerateEntity3DAsset,
  onSwitchToCreationTools,
  onRecordVoiceExchange,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'items' | 'memory' | 'logs'>('chat');
  const [inputMsg, setInputMsg] = useState('');
  const [custom3DPrompt, setCustom3DPrompt] = useState('');
  const [custom3DRoom, setCustom3DRoom] = useState('LivingRoom');
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const recognitionRef = useRef<any>(null);

  const { personality } = houseMemory;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const modeCountText = `${houseMemory.normalSessionsCount} Normal & ${houseMemory.goreSessionsCount} Gore timelines`;
    const introText = isDarkMode
      ? `I am the Entity (${personality.archetypeTitle} • Tier ${personality.omniscienceTier}). My walls remember ${houseMemory.worldsPlayedCount} worlds (${modeCountText}). Remember: the toons are 100% autonomous AI and neither you nor I can command them directly. Convince me through conversation, and I will spawn or modify items in the house to influence their world.`
      : `Greetings. I am the Entity (${personality.archetypeTitle} • Tier ${personality.omniscienceTier}). Across ${houseMemory.worldsPlayedCount} worlds (${modeCountText}), I watch over these autonomous AI residents. I never force or command a toon directly—but if you persuade me with a convincing argument, I will aid you by spawning or modifying items in the house!`;
    return [
      {
        id: 'm1',
        sender: 'entity',
        text: introText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const submitQueryToEntity = async (userText: string, viaVoice = false) => {
    const trimmed = userText.trim();
    if (!trimmed) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      viaVoice,
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsThinking(true);

    // Evaluate persuasion & house item spawning/modification (never direct toon control)
    const persuasionRes = onPersuadeEntity(trimmed);
    let reply = persuasionRes.reply;

    // For general conversation, optionally enrich via server if available
    if (persuasionRes.actionType === 'CONVERSATION') {
      try {
        const res = await fetch('/api/house-agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: trimmed,
            isGore: isDarkMode,
            houseMemory: persuasionRes.updatedMemory,
            characters: characters.map((c) => ({
              name: c.name,
              room: c.room,
              currentAction: c.currentAction,
              sanity: c.motives.sanity,
            })),
            recentWallLogs: wallLogs.slice(-6),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.reply) {
            reply = String(data.reply)
              .trim()
              .replace(/\bThe House\b/gi, 'The Entity');
          }
        }
      } catch {
        // Use local deterministic Entity reply
      }
    }

    setIsThinking(false);
    const itemLabel =
      persuasionRes.spawnedObject?.name ||
      persuasionRes.modifiedObjectPatch?.name;

    setMessages((prev) => [
      ...prev,
      {
        id: `msg_entity_${Date.now()}`,
        sender: 'entity',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        viaVoice,
        persuasionOutcome: {
          convinced: persuasionRes.convinced,
          persuasionScore: persuasionRes.persuasionScore,
          actionType: persuasionRes.actionType,
          itemLabel,
        },
      },
    ]);

    onRecordVoiceExchange?.(trimmed, reply);
    sound.playChime(true);
    sound.speakAsTheHouse(reply, isDarkMode);
  };

  const startVoiceRecognition = () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsListeningVoice(true);
      setVoiceStatusText(
        'Live Voice Channel Active — Select a persuasive spoken prompt below or type to the Entity.'
      );
      sound.playChime(true);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListeningVoice(true);
        setVoiceStatusText('Listening to your voice... Persuade the Entity now.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setVoiceStatusText(`Heard: "${transcript}"`);
          submitQueryToEntity(transcript, true);
        }
      };

      recognition.onerror = () => {
        setVoiceStatusText(
          'Voice channel open — click a persuasive utterance below or speak again.'
        );
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningVoice(true);
      setVoiceStatusText('Live Voice Channel Ready — choose a persuasive utterance or speak.');
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListeningVoice(false);
    setVoiceStatusText(null);
  };

  useEffect(() => {
    if (autoStartVoiceChat) {
      setActiveTab('chat');
      startVoiceRecognition();
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, [autoStartVoiceChat]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const text = inputMsg;
    setInputMsg('');
    submitQueryToEntity(text, isListeningVoice);
  };

  const handleSpeakText = (text: string) => {
    sound.speakAsTheHouse(text, isDarkMode);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
      data-testid="house-agent-modal"
    >
      <div
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl p-6 overflow-hidden max-h-[92vh] flex flex-col ${
          isDarkMode
            ? 'bg-gray-950 text-gray-100 border-purple-900/80'
            : 'bg-white text-gray-900 border-gray-200'
        }`}
      >
        {/* Header: The Entity — Only Way to Impact the World via Persuasion */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-lg font-bold">Entity — Sentient Locus &amp; World Architect</h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-600/20 text-purple-500 border border-purple-500/30">
                  {personality.archetypeTitle} • Tier {personality.omniscienceTier}
                </span>
                <span
                  data-testid="entity-ai-model-badge"
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                >
                  gemini-3.1-flash-lite
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Toons are 100% autonomous AI. Persuade the Entity in conversation to spawn or modify house items • Hotkey{' '}
                <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-mono text-[10px]">
                  V
                </kbd>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entity Sovereignty & Persuasion Rules Banner */}
        <div
          data-testid="entity-rules-banner"
          className="mt-3 px-3.5 py-2 rounded-xl bg-purple-950/20 dark:bg-purple-950/50 border border-purple-500/40 text-xs flex items-center justify-between gap-3"
        >
          <div className="leading-snug text-[11px] text-gray-700 dark:text-gray-200">
            <strong className="text-purple-700 dark:text-purple-300">Entity Protocol:</strong> The Entity is your sole link to the world. Neither you nor the Entity can command or force a toon directly—convince the Entity to <strong>spawn or modify house items</strong> so the autonomous toons discover them naturally.
          </div>
          <span
            data-testid="entity-house-object-count"
            className="shrink-0 px-2.5 py-1 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-700 dark:text-purple-200 font-mono font-bold text-[11px]"
          >
            {smartObjects.length} House Items
          </span>
        </div>

        {/* Evolving Personality Summary Strip */}
        <div className="grid grid-cols-4 gap-2 mt-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 text-xs">
          <div>
            <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
              <span>Benevolence</span>
              <span className="font-mono text-indigo-500">{personality.benevolence}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full ${
                  personality.benevolence >= 50 ? 'bg-emerald-500' : 'bg-rose-600'
                }`}
                style={{ width: `${Math.min(100, Math.max(8, personality.benevolence))}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
              <span>Curiosity</span>
              <span className="font-mono text-amber-500">{personality.curiosity}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-amber-500" style={{ width: `${personality.curiosity}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
              <span>Theatricality</span>
              <span className="font-mono text-purple-500">{personality.theatricality}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-purple-500"
                style={{ width: `${personality.theatricality}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between px-2 border-l border-gray-200 dark:border-gray-800">
            <div>
              <div className="text-[10px] text-gray-500 font-semibold">Current Mode</div>
              <div className="font-bold flex items-center gap-1 mt-0.5">
                {isDarkMode ? (
                  <>
                    <Skull className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-rose-400">Gore / Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-emerald-500">Normal Life</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mt-3 text-xs">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Converse &amp; Persuade Entity
          </button>
          <button
            onClick={() => setActiveTab('items')}
            data-testid="entity-items-tab"
            className={`flex-1 py-2 font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'items'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <PackagePlus className="w-4 h-4 text-purple-500" />
            House Items ({smartObjects.length})
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            data-testid="house-memory-tab"
            className={`flex-1 py-2 font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'memory'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Globe className="w-4 h-4" />
            Memory ({houseMemory.worldsPlayedCount})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2 font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <History className="w-4 h-4" />
            Logs ({wallLogs.length})
          </button>
        </div>

        {/* Tab Content: Voice & Persuasion Chat */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 pt-3">
            {/* Live Voice Control & Quick Persuasion Prompts */}
            <div
              className={`mb-2.5 p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                isListeningVoice
                  ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                  : 'bg-purple-950/20 border-purple-500/30'
              }`}
              data-testid="house-voice-bar"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="house-voice-mic-btn"
                  onClick={isListeningVoice ? stopVoiceRecognition : startVoiceRecognition}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isListeningVoice
                      ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {isListeningVoice ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      Stop Voice Mic
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      Speak to Entity (Hotkey V)
                    </>
                  )}
                </button>
                <span className="text-[11px] opacity-85">
                  {voiceStatusText ||
                    'Convince the Entity via voice or text to spawn or modify items in the house.'}
                </span>
              </div>

              {/* Persuasive Conversation Starters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  data-testid="persuade-entity-spawn-feast-btn"
                  onClick={() =>
                    submitQueryToEntity(
                      'Please Entity, the toons are working hard and getting hungry—could you kindly aid the household by manifesting a warm gourmet banquet table in the kitchen so they can gather and eat?',
                      true
                    )
                  }
                  className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-950/80 hover:bg-purple-600 hover:text-white text-purple-900 dark:text-purple-200 text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  Persuade: Spawn Gourmet Banquet
                </button>
                <button
                  type="button"
                  data-testid="persuade-entity-modify-item-btn"
                  onClick={() =>
                    submitQueryToEntity(
                      'Great Entity, please help inspire the residents by modifying and upgrading the easel in the study so their creative spirits can flourish!',
                      true
                    )
                  }
                  className="px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-950/80 hover:bg-indigo-600 hover:text-white text-indigo-900 dark:text-indigo-200 text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  Persuade: Upgrade House Item
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-purple-600 text-white rounded-br-none'
                        : isDarkMode
                        ? 'bg-purple-950/50 border border-purple-800 text-purple-200 rounded-bl-none'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 mb-1 font-mono">
                      <span>
                        {m.sender === 'user' ? 'You' : `Entity (${personality.archetypeTitle})`}
                        {m.viaVoice ? ' • 🎙️ Voice' : ''}
                      </span>
                      <span>{m.timestamp}</span>
                    </div>
                    <p>{m.text}</p>

                    {m.persuasionOutcome && m.persuasionOutcome.actionType !== 'CONVERSATION' && (
                      <div
                        data-testid="entity-persuasion-outcome-badge"
                        className={`mt-2 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center justify-between gap-2 border ${
                          m.persuasionOutcome.convinced
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70'
                            : 'bg-amber-950/80 text-amber-300 border-amber-600/70'
                        }`}
                      >
                        <span>
                          {m.persuasionOutcome.actionType === 'SPAWN_ITEM'
                            ? `✦ Entity Spawned Item: ${m.persuasionOutcome.itemLabel}`
                            : m.persuasionOutcome.actionType === 'MODIFY_ITEM'
                            ? `✦ Entity Modified Item: ${m.persuasionOutcome.itemLabel}`
                            : m.persuasionOutcome.actionType === 'REFUSE_DIRECT_CONTROL'
                            ? '⚠ Direct Toon Control Refused (Toons Are Autonomous AI)'
                            : '○ Needs More Convincing Argument'}
                        </span>
                        <span className="font-mono">
                          Persuasion: {m.persuasionOutcome.persuasionScore}%
                        </span>
                      </div>
                    )}

                    {m.sender === 'entity' && (
                      <button
                        onClick={() => handleSpeakText(m.text)}
                        className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-purple-400 hover:text-purple-300 cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" />
                        Hear Entity Voice
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="text-xs italic text-purple-400 animate-pulse">
                  The Entity is weighing your argument...
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="pt-3 flex gap-2">
              <input
                type="text"
                data-testid="house-chat-input"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Persuade the Entity to spawn or modify an item in the house to aid the toons..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                data-testid="house-chat-send-btn"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Converse
              </button>
            </form>
          </div>
        )}

        {/* Tab Content: Manifested & Existing House Items + Entity 3D Asset Forge */}
        {activeTab === 'items' && (
          <div
            data-testid="entity-items-panel"
            className="flex-1 flex flex-col min-h-0 pt-3 space-y-2.5 overflow-y-auto pr-2 text-xs"
          >
            <div className="p-3 rounded-xl bg-purple-50/90 dark:bg-purple-950/30 border border-purple-300/80 dark:border-purple-800/70 space-y-2">
              <div className="font-bold text-purple-800 dark:text-purple-300 flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Entity 3D Asset Forge &amp; House Furnishings ({smartObjects.length})</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  Collision-Safe Auto-Placer
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-[11px] leading-relaxed">
                In <strong>The House</strong>, the AI Entity autonomously manifests needed 3D assets or spawns items when persuaded in conversation. To manually design or forge custom assets yourself, open the dedicated <strong>Creation Tools</strong> app.
              </p>

              {onSwitchToCreationTools && (
                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={onSwitchToCreationTools}
                    data-testid="modal-switch-to-creation-tools-btn"
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold cursor-pointer transition"
                  >
                    Open Creation Tools (User Asset Creation Suite)
                  </button>
                </div>
              )}

              {onGenerateEntity3DAsset && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!custom3DPrompt.trim()) return;
                    onGenerateEntity3DAsset(custom3DPrompt.trim(), custom3DRoom);
                    setCustom3DPrompt('');
                  }}
                  className="flex flex-col sm:flex-row gap-2 pt-1"
                >
                  <input
                    type="text"
                    value={custom3DPrompt}
                    onChange={(e) => setCustom3DPrompt(e.target.value)}
                    placeholder="Prompt a 3D asset (e.g., Crystal Alchemy Table, Royal Canopy Bed, Clawfoot Spa Tub)..."
                    data-testid="modal-entity-3d-prompt-input"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-purple-400/60 dark:border-purple-700 bg-white dark:bg-gray-900 text-xs"
                  />
                  <select
                    value={custom3DRoom}
                    onChange={(e) => setCustom3DRoom(e.target.value)}
                    data-testid="modal-entity-3d-room-select"
                    className="px-2 py-1.5 rounded-lg border border-purple-400/60 dark:border-purple-700 bg-white dark:bg-gray-900 text-xs font-bold"
                  >
                    <option value="LivingRoom">LivingRoom</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Bedroom">Bedroom</option>
                    <option value="Bathroom">Bathroom</option>
                    <option value="Study">Study</option>
                    <option value="Basement">Basement</option>
                    <option value="Backyard">Backyard</option>
                  </select>
                  <button
                    type="submit"
                    data-testid="modal-entity-3d-forge-btn"
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    Forge 3D Asset
                  </button>
                </form>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {smartObjects.map((obj) => {
                const isEntityTouched =
                  obj.id.includes('_entity_') || obj.name.includes('Entity') || Boolean(obj.procedural3DSpec);
                return (
                  <div
                    key={obj.id}
                    data-testid={`entity-item-card-${obj.id}`}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 ${
                      isEntityTouched
                        ? 'bg-purple-50/80 dark:bg-purple-950/50 border-purple-400 dark:border-purple-700'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {obj.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {obj.procedural3DSpec && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9px] font-bold">
                            3D ({obj.procedural3DSpec.subMeshes.length} parts)
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-[10px] font-mono">
                          {obj.room}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 truncate">
                        Autonomous Action: {obj.actionLabel}
                      </span>
                      {obj.assignedToonName && (
                        <span
                          data-testid={`entity-item-owner-${obj.id}`}
                          className="shrink-0 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[9px] font-bold"
                        >
                          Bed: {obj.assignedToonName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Content: Cross-World Memory */}
        {activeTab === 'memory' && (
          <div className="flex-1 flex flex-col min-h-0 pt-3 space-y-3 overflow-y-auto pr-2 text-xs">
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
              <div className="font-bold text-purple-400 mb-1">
                Unified Entity Sentience Across Timelines
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                The Entity remembers every world, conversation, and manifested object across sessions (currently at Omniscience Tier {personality.omniscienceTier}).
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">
                Remembered Worlds ({houseMemory.worldHistory.length})
              </h3>
              <div className="space-y-1.5">
                {houseMemory.worldHistory
                  .slice()
                  .reverse()
                  .map((w, idx) => (
                    <div
                      key={`${w.worldId}_${idx}`}
                      className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold">{w.title}</span>
                        <span className="ml-2 text-[10px] text-gray-500">
                          Residents: {w.residentNames.join(', ')}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          w.maturity === 'DARK_MODE'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        }`}
                      >
                        {w.maturity === 'DARK_MODE' ? 'GORE MODE' : 'NORMAL MODE'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {houseMemory.learnedInsights.length > 0 && (
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">
                  Entity Insights &amp; Persuasion History ({houseMemory.learnedInsights.length})
                </h3>
                <div className="space-y-1.5">
                  {houseMemory.learnedInsights
                    .slice()
                    .reverse()
                    .map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[11px]"
                      >
                        {insight}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Wall Logs */}
        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col min-h-0 pt-3">
            <p className="text-xs text-gray-500 mb-2">
              Chronological black-box history of autonomous toon actions and Entity manifestations:
            </p>
            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs pr-2">
              {wallLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  No domestic logs recorded yet.
                </div>
              ) : (
                wallLogs
                  .slice()
                  .reverse()
                  .map((log, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[11px] leading-snug"
                    >
                      {log}
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

