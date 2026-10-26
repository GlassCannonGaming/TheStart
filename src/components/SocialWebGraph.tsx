/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Character,
  canHaveBabyTogether,
  buildHouseholdRelationshipGraph,
  RelationshipLinkCategory,
  RelationshipGraphEdge,
} from '../game/simulation';
import { Heart, Baby, Sparkles, Users, Flame, Swords, ShieldAlert, Eye } from 'lucide-react';

interface SocialWebGraphProps {
  selectedCharacter: Character;
  allCharacters: Character[];
  onSelectCharacter?: (charId: string) => void;
  onTriggerRomanceTalk?: (charAId: string, charBId: string) => void;
  onTriggerTryForBaby?: (charAId: string, charBId: string) => void;
  onTriggerSocialInteraction?: (
    charAId: string,
    charBId: string,
    interactionType: 'FRIENDLY' | 'ROMANTIC' | 'RIVALRY'
  ) => void;
}

export const SocialWebGraph: React.FC<SocialWebGraphProps> = ({
  selectedCharacter,
  allCharacters,
  onSelectCharacter,
  onTriggerRomanceTalk,
  onTriggerTryForBaby,
  onTriggerSocialInteraction,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | RelationshipLinkCategory>('ALL');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const width = 350;
  const height = 240;
  const centerX = width / 2;
  const centerY = height / 2;
  const orbitRadius = 82;

  const graphData = useMemo(
    () => buildHouseholdRelationshipGraph(allCharacters),
    [allCharacters]
  );

  const visibleEdges = useMemo(() => {
    if (activeFilter === 'ALL') return graphData.edges;
    return graphData.edges.filter((e) => e.category === activeFilter);
  }, [graphData.edges, activeFilter]);

  const activeEdge: RelationshipGraphEdge | null = useMemo(() => {
    if (selectedEdgeId) {
      const found = graphData.edges.find((e) => e.id === selectedEdgeId);
      if (found) return found;
    }
    // Default to strongest edge connected to selectedCharacter
    const myEdges = visibleEdges.filter(
      (e) => e.sourceCharId === selectedCharacter.id || e.targetCharId === selectedCharacter.id
    );
    return myEdges[0] || visibleEdges[0] || null;
  }, [selectedEdgeId, graphData.edges, visibleEdges, selectedCharacter.id]);

  // Place selectedCharacter at center, and all other household toons in a clean ring
  const others = allCharacters.filter((c) => c.id !== selectedCharacter.id);

  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; char: Character }>();
    map.set(selectedCharacter.id, { x: centerX, y: centerY, char: selectedCharacter });
    others.forEach((char, idx) => {
      const angle = (idx / Math.max(1, others.length)) * Math.PI * 2 - Math.PI / 2;
      map.set(char.id, {
        x: centerX + Math.cos(angle) * orbitRadius,
        y: centerY + Math.sin(angle) * orbitRadius,
        char,
      });
    });
    return map;
  }, [selectedCharacter, others, centerX, centerY]);

  const getEdgeStyle = (edge: RelationshipGraphEdge) => {
    if (edge.category === 'ROMANTIC') {
      return {
        stroke: '#f43f5e',
        badgeBg: 'bg-rose-950/90 text-rose-200 border-rose-500/50',
        dash: 'none',
        glow: 'rgba(244,63,94,0.45)',
        label: edge.statusLabel === 'Soulmate' ? '♥ Soulmates' : '♥ Romantic',
      };
    }
    if (edge.category === 'RIVALRY') {
      return {
        stroke: '#ef4444',
        badgeBg: 'bg-red-950/90 text-red-200 border-red-500/50',
        dash: '5 3',
        glow: 'rgba(239,68,68,0.35)',
        label: '⚔ Rivalry',
      };
    }
    if (edge.category === 'FAMILY') {
      return {
        stroke: '#38bdf8',
        badgeBg: 'bg-sky-950/90 text-sky-200 border-sky-500/50',
        dash: 'none',
        glow: 'rgba(56,189,248,0.35)',
        label: edge.familyRelation || 'Family',
      };
    }
    return {
      stroke: edge.affinity1To10 >= 7.5 ? '#10b981' : '#6366f1',
      badgeBg:
        edge.affinity1To10 >= 7.5
          ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
          : 'bg-indigo-950/90 text-indigo-200 border-indigo-500/50',
      dash: 'none',
      glow: 'rgba(99,102,241,0.3)',
      label: edge.affinity1To10 >= 7.5 ? '★ Best Friends' : 'Friend',
    };
  };

  return (
    <div
      data-testid="relationship-mapping-panel"
      className="bg-slate-950/90 border border-indigo-500/30 rounded-xl p-3 space-y-2.5 shadow-inner"
    >
      {/* Header + Summary Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-rose-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-200">
            Visual Relationship Connection Graph
          </span>
        </div>
        <span className="text-[9px] font-mono bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full text-slate-300">
          {allCharacters.length} Active Toons • {graphData.counts.total} Links
        </span>
      </div>

      {/* Category Filter Tabs (All / Friendships / Rivalries / Romantic) */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveFilter('ALL')}
          className={`px-1.5 py-1 rounded text-[9px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
            activeFilter === 'ALL'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>All ({graphData.counts.total})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('FRIENDSHIP')}
          className={`px-1.5 py-1 rounded text-[9px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
            activeFilter === 'FRIENDSHIP'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-emerald-300/80 hover:text-emerald-200'
          }`}
        >
          <span>Friends ({graphData.counts.friendships})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('RIVALRY')}
          className={`px-1.5 py-1 rounded text-[9px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
            activeFilter === 'RIVALRY'
              ? 'bg-red-600 text-white shadow'
              : 'text-red-300/80 hover:text-red-200'
          }`}
        >
          <Swords className="w-2.5 h-2.5" />
          <span>Rivals ({graphData.counts.rivalries})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('ROMANTIC')}
          className={`px-1.5 py-1 rounded text-[9px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
            activeFilter === 'ROMANTIC'
              ? 'bg-rose-600 text-white shadow'
              : 'text-rose-300/80 hover:text-rose-200'
          }`}
        >
          <Heart className="w-2.5 h-2.5" />
          <span>Romance ({graphData.counts.romantic})</span>
        </button>
      </div>

      {/* Interactive SVG Connection Graph */}
      <div className="relative flex justify-center bg-slate-900/95 rounded-lg border border-slate-800/90 overflow-hidden">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
        >
          {/* Ambient Radar Rings */}
          <circle
            cx={centerX}
            cy={centerY}
            r={orbitRadius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={orbitRadius * 0.5}
            fill="none"
            stroke="#1e293b"
            strokeWidth={0.75}
          />

          {/* Connection Edges between ALL Active Toons */}
          {visibleEdges.map((edge) => {
            const posA = nodePositions.get(edge.sourceCharId);
            const posB = nodePositions.get(edge.targetCharId);
            if (!posA || !posB) return null;

            const style = getEdgeStyle(edge);
            const isSelectedEdge = activeEdge?.id === edge.id;
            const strokeW = isSelectedEdge
              ? 3.6
              : Math.max(1.6, (edge.affinity1To10 / 10) * 3.0);

            const midX = (posA.x + posB.x) / 2;
            const midY = (posA.y + posB.y) / 2;

            return (
              <g
                key={edge.id}
                onClick={() => setSelectedEdgeId(edge.id)}
                className="cursor-pointer group"
              >
                {/* Glow Halo on Selected or Romantic/Rivalry Edge */}
                {isSelectedEdge && (
                  <line
                    x1={posA.x}
                    y1={posA.y}
                    x2={posB.x}
                    y2={posB.y}
                    stroke={style.stroke}
                    strokeWidth={strokeW + 4}
                    strokeOpacity={0.25}
                  />
                )}
                <line
                  x1={posA.x}
                  y1={posA.y}
                  x2={posB.x}
                  y2={posB.y}
                  stroke={style.stroke}
                  strokeWidth={strokeW}
                  strokeDasharray={style.dash}
                  strokeOpacity={isSelectedEdge ? 1 : 0.82}
                />

                {/* Edge Midpoint Pill Badge */}
                <rect
                  x={midX - 28}
                  y={midY - 9}
                  width={56}
                  height={17}
                  rx={5}
                  fill="#0f172a"
                  stroke={style.stroke}
                  strokeWidth={isSelectedEdge ? 1.5 : 0.9}
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  fontSize="7.5"
                  fontWeight="bold"
                  fill={
                    edge.category === 'ROMANTIC'
                      ? '#fda4af'
                      : edge.category === 'RIVALRY'
                      ? '#fca5a5'
                      : edge.category === 'FAMILY'
                      ? '#7dd3fc'
                      : '#a5b4fc'
                  }
                >
                  {edge.category === 'ROMANTIC'
                    ? `♥ ${edge.romance1To10.toFixed(1)}`
                    : edge.category === 'RIVALRY'
                    ? `⚔ ${edge.affinity1To10.toFixed(1)}`
                    : `${edge.affinity1To10.toFixed(1)}/10`}
                </text>
              </g>
            );
          })}

          {/* Outer Toon Nodes */}
          {others.map((other) => {
            const pos = nodePositions.get(other.id);
            if (!pos) return null;
            return (
              <g
                key={`node_${other.id}`}
                onClick={() => onSelectCharacter && onSelectCharacter(other.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={18}
                  fill="#1e293b"
                  stroke={other.color || '#6366f1'}
                  strokeWidth={2.5}
                />
                <text
                  x={pos.x}
                  y={pos.y + 3}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="bold"
                  fill="#f8fafc"
                >
                  {other.name.split(' ')[0].slice(0, 6)}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 28}
                  textAnchor="middle"
                  fontSize="7.5"
                  fill="#94a3b8"
                >
                  {other.room}
                </text>
              </g>
            );
          })}

          {/* Center Node (Selected Character) */}
          <g>
            <circle
              cx={centerX}
              cy={centerY}
              r={23}
              fill="#0f172a"
              stroke={selectedCharacter.color || '#818cf8'}
              strokeWidth={3}
            />
            <text
              x={centerX}
              y={centerY + 1}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="#ffffff"
            >
              {selectedCharacter.name.split(' ')[0].slice(0, 7)}
            </text>
            <text
              x={centerX}
              y={centerY + 11}
              textAnchor="middle"
              fontSize="7"
              fill="#a5b4fc"
            >
              FOCUSED
            </text>
          </g>
        </svg>
      </div>

      {/* Color Key Legend */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[9px] text-slate-400 px-1">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-1 rounded bg-emerald-400 inline-block" /> Friendship
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-1 rounded bg-red-500 inline-block" /> Rivalry (Dashed)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-1 rounded bg-rose-500 inline-block" /> Romantic Link
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-1 rounded bg-sky-400 inline-block" /> Family Bond
        </span>
      </div>

      {/* Selected Connection Detail Card */}
      {activeEdge && (
        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <span>
                {activeEdge.sourceName.split(' ')[0]} ↔ {activeEdge.targetName.split(' ')[0]}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded border ${getEdgeStyle(activeEdge).badgeBg}`}
              >
                {getEdgeStyle(activeEdge).label}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-300">
              Affinity <strong className="text-emerald-300">{activeEdge.affinity1To10.toFixed(1)}</strong> • Romance{' '}
              <strong className="text-rose-300">{activeEdge.romance1To10.toFixed(1)}</strong>
            </div>
          </div>

          {activeEdge.sharedMemories.length > 0 && (
            <div className="text-[10px] text-slate-400 italic line-clamp-2">
              "{activeEdge.sharedMemories[activeEdge.sharedMemories.length - 1]}"
            </div>
          )}

          {/* Direct Relationship Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {onTriggerSocialInteraction && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onTriggerSocialInteraction(
                      activeEdge.sourceCharId,
                      activeEdge.targetCharId,
                      'FRIENDLY'
                    )
                  }
                  className="px-2 py-1 rounded bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/30 text-[9px] font-bold transition cursor-pointer"
                >
                  + Boost Friendship
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onTriggerSocialInteraction(
                      activeEdge.sourceCharId,
                      activeEdge.targetCharId,
                      'RIVALRY'
                    )
                  }
                  className="px-2 py-1 rounded bg-red-600/25 hover:bg-red-600/40 text-red-200 border border-red-500/30 text-[9px] font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <Flame className="w-2.5 h-2.5" />
                  Spark Rivalry
                </button>
              </>
            )}
            {onTriggerRomanceTalk && (
              <button
                type="button"
                onClick={() =>
                  onTriggerRomanceTalk(activeEdge.sourceCharId, activeEdge.targetCharId)
                }
                className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-[9px] font-bold transition cursor-pointer flex items-center gap-1"
              >
                <Heart className="w-2.5 h-2.5" />
                Romantic Link
              </button>
            )}
            {onSelectCharacter && (
              <button
                type="button"
                onClick={() =>
                  onSelectCharacter(
                    activeEdge.sourceCharId === selectedCharacter.id
                      ? activeEdge.targetCharId
                      : activeEdge.sourceCharId
                  )
                }
                className="ml-auto px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-bold transition cursor-pointer flex items-center gap-1"
              >
                <Eye className="w-2.5 h-2.5" />
                Switch Toon
              </button>
            )}
          </div>
        </div>
      )}

      {/* All Active Toon Pair Cards */}
      <div className="space-y-1.5 pt-1">
        {others.map((other) => {
          const babyCheck = canHaveBabyTogether(selectedCharacter, other, allCharacters);
          const pairEdge = graphData.edges.find(
            (e) =>
              (e.sourceCharId === selectedCharacter.id && e.targetCharId === other.id) ||
              (e.sourceCharId === other.id && e.targetCharId === selectedCharacter.id)
          );

          return (
            <div
              key={`pair_row_${other.id}`}
              className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-lg bg-slate-900/75 border border-slate-800 text-[10px]"
            >
              <div>
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: other.color || '#6366f1' }}
                  />
                  <span>{other.name}</span>
                  {pairEdge && (
                    <span
                      className={`text-[8px] px-1.5 py-0.2 rounded border ${getEdgeStyle(pairEdge).badgeBg}`}
                    >
                      {getEdgeStyle(pairEdge).label}
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-slate-400">
                  Affinity {pairEdge ? pairEdge.affinity1To10.toFixed(1) : '5.5'}/10 • Romance{' '}
                  {pairEdge ? pairEdge.romance1To10.toFixed(1) : '1.0'}/10
                </div>
              </div>

              <div className="flex items-center gap-1">
                {onTriggerRomanceTalk && (
                  <button
                    type="button"
                    onClick={() => onTriggerRomanceTalk(selectedCharacter.id, other.id)}
                    className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 font-bold text-[9px] flex items-center gap-1 transition cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    Flirt
                  </button>
                )}

                {onTriggerTryForBaby && (
                  <button
                    type="button"
                    disabled={!babyCheck.eligible}
                    title={babyCheck.reason}
                    onClick={() => onTriggerTryForBaby(selectedCharacter.id, other.id)}
                    className={`px-2 py-1 rounded font-bold text-[9px] flex items-center gap-1 transition ${
                      babyCheck.eligible
                        ? 'bg-pink-600 hover:bg-pink-500 text-white shadow cursor-pointer'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                    }`}
                  >
                    <Baby className="w-2.5 h-2.5" />
                    Have Baby
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
