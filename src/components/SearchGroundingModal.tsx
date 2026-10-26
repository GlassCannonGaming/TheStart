/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Search,
  Globe,
  ExternalLink,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Utensils,
  Palette,
  Newspaper,
  Compass,
} from 'lucide-react';
import { Character } from '../game/simulation';
import { sound } from '../game/soundSynth';

interface SearchGroundingModalProps {
  onClose: () => void;
  characters: Character[];
  onBroadcastToCharacter: (charId: string, text: string, sourceTitle?: string) => void;
  isDarkMode: boolean;
}

export const SearchGroundingModal: React.FC<SearchGroundingModalProps> = ({
  onClose,
  characters,
  onBroadcastToCharacter,
  isDarkMode,
}) => {
  const [selectedCharId, setSelectedCharId] = useState<string>(characters[0]?.id || '');
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedChar = characters.find((c) => c.id === selectedCharId) || characters[0];

  const handleSearch = async (presetTopic?: string) => {
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    setResultText(null);
    setSources([]);

    try {
      const response = await fetch('/api/gemini/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: presetTopic ? undefined : query.trim(),
          topic: presetTopic,
          characterName: selectedChar?.name,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setResultText(data.text);
      setSources(data.sources || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to query grounded search.');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = () => {
    if (!resultText || !selectedChar) return;
    const topSource = sources[0]?.title;
    onBroadcastToCharacter(selectedChar.id, resultText, topSource);
    sound.playChime(true);
    setStatusMsg(`Broadcasted verified search insight to ${selectedChar.name}'s mind & speech bubble!`);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 overflow-hidden max-h-[92vh] flex flex-col ${
          isDarkMode
            ? 'bg-gray-950 text-gray-100 border-indigo-900/80'
            : 'bg-white text-gray-900 border-gray-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Google Search Grounding Console</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  gemini-3.1-flash-lite + googleSearch
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Ground in-game residents with live real-world news, culinary recipes, and web knowledge
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Character Selector */}
        <div className="pt-3 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-gray-400 shrink-0">Recipient Toon:</span>
          {characters.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCharId(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition ${
                selectedChar?.id === c.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        {/* Quick Topics */}
        <div className="pt-3 space-y-1.5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Explore Grounded World Topics
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSearch('Breaking global headlines and cultural discoveries')}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              <Newspaper className="w-3.5 h-3.5 text-blue-500" />
              <span>Live News & Culture</span>
            </button>
            <button
              type="button"
              onClick={() => handleSearch('Modern culinary trends and gourmet pantry ingredients')}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              <Utensils className="w-3.5 h-3.5 text-amber-500" />
              <span>Grounded Recipes</span>
            </button>
            <button
              type="button"
              onClick={() => handleSearch('Contemporary interior architecture and biophilic design')}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              <Palette className="w-3.5 h-3.5 text-purple-500" />
              <span>Architecture Trends</span>
            </button>
            <button
              type="button"
              onClick={() => handleSearch('Astronomy and James Webb Space Telescope discoveries')}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>Space & Science</span>
            </button>
          </div>
        </div>

        {/* Custom Query Search Bar */}
        <div className="pt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Google for real-time facts, trivia, or advice..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition disabled:opacity-50 shrink-0"
          >
            {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Search</span>
          </button>
        </div>

        {/* Status / Error Alerts */}
        {statusMsg && (
          <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
          {loading && (
            <div className="text-center py-10 space-y-2 text-xs text-gray-400">
              <Sparkles className="w-6 h-6 animate-pulse mx-auto text-indigo-500" />
              <p>Searching Google with Grounding via gemini-3.8-flash...</p>
            </div>
          )}

          {!loading && resultText && (
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Grounded Simulation Insight
                </span>
                <button
                  type="button"
                  onClick={handleBroadcast}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit to {selectedChar?.name}</span>
                </button>
              </div>

              <p className="text-sm font-medium leading-relaxed italic">
                "{resultText}"
              </p>

              {/* Verified Web Sources from Grounding */}
              {sources.length > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Verified Google Search Citations
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-indigo-500 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{s.title || s.uri}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !resultText && (
            <div className="text-center py-12 rounded-xl border border-dashed border-gray-300 dark:border-gray-800 p-6 space-y-2">
              <Globe className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs text-gray-400">
                Pick a topic or type any question above to fetch real-world data verified by Google Search Grounding.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
