/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Character,
  PersonalityAxisKey,
  PersonalityTraitSnapshot,
  PERSONALITY_AXES_CONFIG,
  ALL_PERSONALITY_AXES,
  computePersonalityTraitScores,
  getCharacterPersonalitySnapshots,
} from '../game/simulation';
import { Sparkles, TrendingUp, TrendingDown, History, CheckCircle2, Info } from 'lucide-react';

interface PersonalityRadarChartProps {
  character: Character;
  isDarkMode?: boolean;
}

export const PersonalityRadarChart: React.FC<PersonalityRadarChartProps> = ({
  character,
  isDarkMode = false,
}) => {
  const currentDay = character.daysLived || 1;
  const snapshots: PersonalityTraitSnapshot[] = getCharacterPersonalitySnapshots(
    character,
    currentDay
  );

  const baselineSnapshot = snapshots[0];
  const liveSnapshot = snapshots[snapshots.length - 1];

  // Selected snapshot for comparison (defaults to baseline for direct over-time comparison)
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(
    baselineSnapshot?.id || ''
  );
  const [focusedAxis, setFocusedAxis] = useState<PersonalityAxisKey | null>(null);

  const comparedSnapshot =
    snapshots.find((s) => s.id === selectedSnapshotId) || baselineSnapshot;

  const currentScores = liveSnapshot.traitScores;
  const comparedScores = comparedSnapshot.traitScores;

  // SVG Geometry Settings
  const width = 330;
  const height = 290;
  const cx = width / 2;
  const cy = height / 2 - 4;
  const maxRadius = 90;
  const ringLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Helper to calculate coordinates for a given axis index and score (0-100)
  const getCoordinates = (index: number, score: number, radius = maxRadius) => {
    // 7 axes: angle = 2 * PI * index / 7 - PI / 2 (starts pointing up)
    const angle = (2 * Math.PI * index) / ALL_PERSONALITY_AXES.length - Math.PI / 2;
    const r = (Math.max(5, Math.min(100, score)) / 100) * radius;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    return { x, y, angle };
  };

  // Build SVG polygon points string
  const buildPolygonPoints = (scores: Record<PersonalityAxisKey, number>) => {
    return ALL_PERSONALITY_AXES.map((axis, i) => {
      const { x, y } = getCoordinates(i, scores[axis]);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  const livePoints = buildPolygonPoints(currentScores);
  const comparedPoints = buildPolygonPoints(comparedScores);

  return (
    <div
      data-testid="personality-radar-chart-container"
      className="p-3 rounded-xl bg-white/90 dark:bg-gray-900/90 border border-indigo-200/90 dark:border-indigo-800/80 shadow-sm"
    >
      {/* Header & Subtitle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-indigo-500/10 dark:bg-indigo-400/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight">
              Personality Evolution Radar
            </h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Multi-axial personality shifts over time (Autonomous Acts & Events)
            </p>
          </div>
        </div>
      </div>

      {/* Snapshot Temporal Timeline / Milestone Switcher */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
          <span className="flex items-center gap-1">
            <History className="w-3 h-3 text-indigo-500" />
            Comparison Milestone:
          </span>
          <span className="text-[9px] text-gray-400 font-mono">
            {comparedSnapshot.timestamp}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {snapshots.map((snap, idx) => {
            const isSelected = snap.id === selectedSnapshotId;
            const isLive = snap.id === liveSnapshot.id;
            const isBase = idx === 0;

            return (
              <button
                key={snap.id}
                type="button"
                data-testid={`radar-snapshot-btn-${snap.id}`}
                onClick={() => setSelectedSnapshotId(snap.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : isLive
                    ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900'
                    : isBase
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {isBase ? '🌱 Day 1 (Baseline)' : isLive ? '⚡ Live Now' : snap.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Radar Legend */}
      <div className="flex items-center justify-center gap-4 py-1 px-2 rounded-md bg-gray-50 dark:bg-gray-800/60 text-[10px] mb-2 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1.5 font-medium text-indigo-700 dark:text-indigo-300">
          <span className="w-3 h-1 rounded-sm bg-indigo-500 inline-block" />
          <span>Current Live Traits</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
          <span className="w-3 h-1 border-t-2 border-dashed border-amber-500 inline-block" />
          <span>{comparedSnapshot.label}</span>
        </div>
      </div>

      {/* Interactive SVG Radar Chart */}
      <div className="relative flex justify-center items-center overflow-visible select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[340px] h-auto overflow-visible"
          role="img"
          aria-label="Personality Radar Chart"
        >
          <defs>
            {/* Gradient for Current Live Polygon */}
            <radialGradient id="radarLiveFill" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.12" />
            </radialGradient>
            {/* Gradient for Compared/Baseline Polygon */}
            <radialGradient id="radarComparedFill" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
            </radialGradient>
          </defs>

          {/* Concentric Polygon Grid Rings */}
          {ringLevels.map((lvl) => {
            const ringPoints = ALL_PERSONALITY_AXES.map((_, i) => {
              const { x, y } = getCoordinates(i, 100, maxRadius * lvl);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ');

            return (
              <polygon
                key={`ring-${lvl}`}
                points={ringPoints}
                fill="none"
                stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                strokeWidth={lvl === 1.0 ? 1.5 : 0.8}
                strokeDasharray={lvl < 1.0 ? '2 2' : undefined}
              />
            );
          })}

          {/* Radial Spokes connecting Center to Vertices */}
          {ALL_PERSONALITY_AXES.map((axis, i) => {
            const { x, y } = getCoordinates(i, 100, maxRadius);
            const isFocused = focusedAxis === axis;
            return (
              <line
                key={`spoke-${axis}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={isFocused ? PERSONALITY_AXES_CONFIG[axis].color : isDarkMode ? '#4b5563' : '#d1d5db'}
                strokeWidth={isFocused ? 1.8 : 0.9}
                opacity={isFocused ? 1 : 0.6}
              />
            );
          })}

          {/* Compared / Milestone / Baseline Polygon */}
          {selectedSnapshotId !== liveSnapshot.id && (
            <polygon
              data-testid="radar-polygon-baseline"
              points={comparedPoints}
              fill="url(#radarComparedFill)"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Live Personality Polygon */}
          <polygon
            data-testid="radar-polygon-live"
            points={livePoints}
            fill="url(#radarLiveFill)"
            stroke="#6366f1"
            strokeWidth={2.4}
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Live Data Point Nodes */}
          {ALL_PERSONALITY_AXES.map((axis, i) => {
            const liveCoord = getCoordinates(i, currentScores[axis]);
            const isFocused = focusedAxis === axis;
            const axisCfg = PERSONALITY_AXES_CONFIG[axis];

            return (
              <g
                key={`node-live-${axis}`}
                className="cursor-pointer"
                onClick={() => setFocusedAxis(focusedAxis === axis ? null : axis)}
                onMouseEnter={() => setFocusedAxis(axis)}
              >
                <circle
                  cx={liveCoord.x}
                  cy={liveCoord.y}
                  r={isFocused ? 6 : 4}
                  fill={axisCfg.color}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}

          {/* Compared / Baseline Data Point Nodes (if different snapshot) */}
          {selectedSnapshotId !== liveSnapshot.id &&
            ALL_PERSONALITY_AXES.map((axis, i) => {
              const compCoord = getCoordinates(i, comparedScores[axis]);
              return (
                <circle
                  key={`node-comp-${axis}`}
                  cx={compCoord.x}
                  cy={compCoord.y}
                  r={3}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth={1}
                />
              );
            })}

          {/* Radial Labels around perimeter */}
          {ALL_PERSONALITY_AXES.map((axis, i) => {
            const angle = (2 * Math.PI * i) / ALL_PERSONALITY_AXES.length - Math.PI / 2;
            const labelR = maxRadius + 22;
            const lx = cx + Math.cos(angle) * labelR;
            const ly = cy + Math.sin(angle) * labelR;
            const axisCfg = PERSONALITY_AXES_CONFIG[axis];
            const isFocused = focusedAxis === axis;
            const liveVal = currentScores[axis];
            const compVal = comparedScores[axis];
            const delta = liveVal - compVal;

            let textAnchor: 'middle' | 'start' | 'end' = 'middle';
            if (Math.cos(angle) > 0.3) textAnchor = 'start';
            else if (Math.cos(angle) < -0.3) textAnchor = 'end';

            return (
              <g
                key={`label-${axis}`}
                className="cursor-pointer"
                onClick={() => setFocusedAxis(focusedAxis === axis ? null : axis)}
                onMouseEnter={() => setFocusedAxis(axis)}
              >
                <text
                  x={lx}
                  y={ly - 2}
                  textAnchor={textAnchor}
                  fill={isFocused ? axisCfg.color : isDarkMode ? '#e5e7eb' : '#1f2937'}
                  fontSize={10.5}
                  fontWeight={isFocused ? 800 : 600}
                  className="transition-colors font-sans"
                >
                  {axisCfg.label}
                </text>
                <text
                  x={lx}
                  y={ly + 10}
                  textAnchor={textAnchor}
                  fill={isDarkMode ? '#9ca3af' : '#6b7280'}
                  fontSize={8.5}
                  fontFamily="monospace"
                  fontWeight={600}
                >
                  {liveVal}%{' '}
                  {selectedSnapshotId !== liveSnapshot.id && delta !== 0 && (
                    <tspan
                      fill={delta > 0 ? '#10b981' : '#ef4444'}
                      fontWeight="bold"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </tspan>
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Focused Axis Detail Insight Card */}
      {focusedAxis ? (
        <div
          data-testid="radar-axis-detail-card"
          className="mt-2 p-2 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[10px]"
        >
          <div className="flex items-center justify-between font-bold mb-1">
            <span
              className="flex items-center gap-1"
              style={{ color: PERSONALITY_AXES_CONFIG[focusedAxis].color }}
            >
              <Info className="w-3 h-3" />
              {PERSONALITY_AXES_CONFIG[focusedAxis].label} Axis Breakdown
            </span>
            <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
              Live: {currentScores[focusedAxis]}% vs Baseline: {comparedScores[focusedAxis]}% (
              <strong
                className={
                  currentScores[focusedAxis] >= comparedScores[focusedAxis]
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {currentScores[focusedAxis] - comparedScores[focusedAxis] >= 0 ? '+' : ''}
                {currentScores[focusedAxis] - comparedScores[focusedAxis]}%
              </strong>
              )
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-1.5">
            {PERSONALITY_AXES_CONFIG[focusedAxis].description}
          </p>
          <div className="flex items-center justify-between text-[9px] text-gray-500 dark:text-gray-400 pt-1 border-t border-indigo-100 dark:border-indigo-900">
            <span>
              Positive Traits:{' '}
              <strong className="text-gray-800 dark:text-gray-200">
                {PERSONALITY_AXES_CONFIG[focusedAxis].positiveTraits.join(', ')}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setFocusedAxis(null)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-center text-[9px] text-gray-400 dark:text-gray-500 italic">
          Click or hover any axis spoke above for detailed trait synergy & evolution factors
        </div>
      )}

      {/* 7-Axis Personality Evolution Delta Cards */}
      <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
          <span>Trait Evolution Summary</span>
          <span className="text-[9px] font-normal text-gray-400">
            Compared to {comparedSnapshot.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_PERSONALITY_AXES.map((axis) => {
            const axisCfg = PERSONALITY_AXES_CONFIG[axis];
            const liveVal = currentScores[axis];
            const baseVal = comparedScores[axis];
            const delta = liveVal - baseVal;

            return (
              <div
                key={`delta-card-${axis}`}
                data-testid={`radar-delta-${axis}`}
                onClick={() => setFocusedAxis(axis)}
                className={`p-1.5 rounded-md border text-[10px] cursor-pointer transition-colors ${
                  focusedAxis === axis
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: axisCfg.color }}
                    />
                    {axisCfg.label}
                  </span>
                  <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                    {liveVal}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5 text-[9px]">
                  <span className="text-gray-500 dark:text-gray-400">
                    Base: {baseVal}%
                  </span>
                  {delta !== 0 ? (
                    <span
                      className={`font-semibold font-mono flex items-center gap-0.5 ${
                        delta > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {delta > 0 ? (
                        <TrendingUp className="w-2.5 h-2.5 inline" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5 inline" />
                      )}
                      {delta > 0 ? `+${delta}%` : `${delta}%`}
                    </span>
                  ) : (
                    <span className="text-gray-400 font-mono">0%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
