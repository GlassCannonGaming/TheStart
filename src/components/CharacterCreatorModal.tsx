/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, User, Palette, Award, Scissors, Sliders, Smile } from 'lucide-react';
import { Character, BoneScale } from '../game/simulation';

interface CharacterCreatorModalProps {
  onClose: () => void;
  onSaveCharacter: (character: Character) => void;
  isDarkMode: boolean;
}

const TRAIT_OPTIONS = [
  'Builder',
  'Ambitious',
  'Neat',
  'Lazy',
  'Creative',
  'Artistic',
  'Snob',
  'Bookworm',
  'Foodie',
  'Outgoing',
  'Clumsy',
  'Workaholic',
  'Free Spirit',
  'Secretive',
  'Paranoid',
  'NightOwl',
  'Guilt-Ridden',
];

const HAIR_OPTIONS = [
  'Cropped Bob',
  'Shoulder Wavy',
  'Messy Bun',
  'Disheveled Bedhead',
  'Neat Side Part',
  'Faux Hawk',
  'Long Braids',
  'Afro Taper',
  'Curly Shag',
];

const BEARD_OPTIONS = [
  'None',
  '5-O-Clock Stubble',
  'Full Boxed Beard',
  'Goatee & Mustache',
  'Handlebar Mustache',
  'Overgrown Beard',
];

const SKIN_OPTIONS = ['Fair', 'Olive', 'Tan', 'Rich Umber', 'Deep Espresso'];
const ACCESSORY_OPTIONS = ['None', 'Tool Belt', 'Glasses', 'Beanie', 'Fedora'];
const TOP_OPTIONS = ['Everyday Tee', 'Cardigan', 'Hoodie', 'Formal Shirt'];
const BOTTOM_OPTIONS = ['Denim Jeans', 'Lounge Shorts', 'Chino Trousers'];

const COLOR_SWATCHES = [
  '#4f46e5',
  '#059669',
  '#dc2626',
  '#d97706',
  '#9333ea',
  '#2563eb',
  '#db2777',
  '#0d9488',
];

export const CharacterCreatorModal: React.FC<CharacterCreatorModalProps> = ({
  onClose,
  onSaveCharacter,
  isDarkMode,
}) => {
  const [name, setName] = useState('');
  const [ageStage, setAgeStage] = useState<'Young Adult' | 'Adult' | 'Elder'>('Adult');
  const [genderFrame, setGenderFrame] = useState<'Masculine' | 'Feminine' | 'Unisex'>('Unisex');
  const [hairStyle, setHairStyle] = useState('Cropped Bob');
  const [skinTone, setSkinTone] = useState('Fair');
  const [accessories, setAccessories] = useState('None');
  const [facialHair, setFacialHair] = useState('None');
  const [clothingTop, setClothingTop] = useState('Everyday Tee');
  const [clothingBottom, setClothingBottom] = useState('Denim Jeans');
  const [selectedTraits, setSelectedTraits] = useState<string[]>(['Creative', 'Builder']);
  const [lifeGoal, setLifeGoal] = useState('Master Architect & Renovation Icon');
  const [color, setColor] = useState('#4f46e5');

  // Bone-Scale Sliders State
  const [heightScale, setHeightScale] = useState<number>(1.0);
  const [shoulderWidthScale, setShoulderWidthScale] = useState<number>(1.0);
  const [chestDepthScale, setChestDepthScale] = useState<number>(1.0);

  const applyBonePreset = (h: number, s: number, d: number) => {
    setHeightScale(h);
    setShoulderWidthScale(s);
    setChestDepthScale(d);
  };

  const toggleTrait = (trait: string) => {
    if (selectedTraits.includes(trait)) {
      setSelectedTraits(selectedTraits.filter((t) => t !== trait));
    } else {
      if (selectedTraits.length < 3) {
        setSelectedTraits([...selectedTraits, trait]);
      }
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newChar: Character = {
      id: `char_custom_${Date.now()}`,
      name: name.trim(),
      ageStage,
      traits: selectedTraits,
      lifeGoal,
      room: 'LivingRoom',
      pos: { x: (Math.random() - 0.5) * 8, y: 0, z: (Math.random() - 0.5) * 6 },
      onGrid: true,
      currentAction: 'Just moved in',
      actionTimer: 0,
      selfTalk: `Fresh start in The House. Time to make this place our own.`,
      motives: {
        hunger: 80,
        energy: 85,
        bladder: 85,
        hygiene: 90,
        social: 75,
        fun: 70,
        sanity: 95,
      },
      privateMemory: [`Moved into The House as ${ageStage} with the aspiration of ${lifeGoal}.`],
      color,
      genderFrame,
      hairStyle,
      facialHair,
      clothingTop,
      clothingBottom,
      skinTone,
      accessories,
      boneScale: {
        height: heightScale,
        shoulderWidth: shoulderWidthScale,
        chestDepth: chestDepthScale,
      },
      skills: {
        handiness: selectedTraits.includes('Builder') ? 3 : 1,
        cooking: selectedTraits.includes('Foodie') ? 3 : 1,
        painting: selectedTraits.includes('Artistic') || selectedTraits.includes('Creative') ? 3 : 1,
      },
    };

    onSaveCharacter(newChar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl p-6 overflow-hidden max-h-[92vh] flex flex-col ${
          isDarkMode
            ? 'bg-gray-950 text-gray-100 border-purple-900/80'
            : 'bg-white text-gray-900 border-gray-200'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Create-A-Sim: Character Architect</h2>
              <p className="text-xs text-gray-500">
                Bone-scale morphs, modular hair/facial hair sockets, traits & aspirations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleCreate} className="overflow-y-auto pr-1 flex-1 py-4 space-y-5">
          {/* Top Row: Basic Identity & Live Silhouette Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  Character Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Julian Hayes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Age Stage
                  </label>
                  <select
                    value={ageStage}
                    onChange={(e) => setAgeStage(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                  >
                    <option value="Young Adult">Young Adult</option>
                    <option value="Adult">Adult</option>
                    <option value="Elder">Elder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Body Frame
                  </label>
                  <select
                    value={genderFrame}
                    onChange={(e) => setGenderFrame(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                  >
                    <option value="Masculine">Masculine Frame</option>
                    <option value="Feminine">Feminine Frame</option>
                    <option value="Unisex">Unisex Frame</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  Life Aspiration / Goal
                </label>
                <input
                  type="text"
                  value={lifeGoal}
                  onChange={(e) => setLifeGoal(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                />
              </div>
            </div>

            {/* Live 2D Silhouette Proportions Preview */}
            <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Silhouette Morph Preview
              </span>
              <div
                className="relative flex flex-col items-center justify-end h-32 w-28 p-2 rounded-lg bg-gray-200 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700"
                style={{
                  transform: `scale(${0.75 + heightScale * 0.25})`,
                  transformOrigin: 'bottom center',
                }}
              >
                {/* Plumbob */}
                <div
                  className="w-3 h-3 bg-emerald-500 rotate-45 mb-1 shadow-sm animate-bounce"
                  style={{ animationDuration: '2s' }}
                />
                {/* Head */}
                <div
                  className="w-7 h-7 rounded-full shadow-xs mb-0.5"
                  style={{
                    backgroundColor:
                      skinTone === 'Fair'
                        ? '#fce7f3'
                        : skinTone === 'Olive'
                        ? '#f2cca4'
                        : skinTone === 'Tan'
                        ? '#d49b6a'
                        : skinTone === 'Rich Umber'
                        ? '#8c5332'
                        : '#4a2a18',
                  }}
                />
                {/* Torso */}
                <div
                  className="rounded-sm shadow-xs transition-all duration-150 mb-0.5"
                  style={{
                    width: `${24 * shoulderWidthScale}px`,
                    height: `${28 * heightScale}px`,
                    backgroundColor: color,
                    transform: `scaleX(${chestDepthScale})`,
                  }}
                />
                {/* Legs */}
                <div className="flex gap-1">
                  <div
                    className="w-2 rounded-xs bg-blue-900 transition-all duration-150"
                    style={{ height: `${22 * heightScale}px` }}
                  />
                  <div
                    className="w-2 rounded-xs bg-blue-900 transition-all duration-150"
                    style={{ height: `${22 * heightScale}px` }}
                  />
                </div>
              </div>
              <div className="mt-2 text-[10px] text-gray-500 font-mono">
                H: {heightScale.toFixed(2)}x | W: {shoulderWidthScale.toFixed(2)}x | D: {chestDepthScale.toFixed(2)}x
              </div>
            </div>
          </div>

          {/* Section: Bone-Scale Proportions (Height_Scale, Shoulder_Width, Chest_Depth) */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Sliders className="w-4 h-4" />
                <span>Bone-Scale Sliders: Height_Scale, Shoulder_Width, Chest_Depth</span>
              </div>

              {/* Quick Proportion Presets */}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => applyBonePreset(1.0, 1.0, 1.0)}
                  className="px-2 py-0.5 text-[10px] rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Default (5/10)
                </button>
                <button
                  type="button"
                  onClick={() => applyBonePreset(1.12, 1.25, 1.2)}
                  className="px-2 py-0.5 text-[10px] rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Broad/Athletic (8/10)
                </button>
                <button
                  type="button"
                  onClick={() => applyBonePreset(1.22, 0.9, 0.88)}
                  className="px-2 py-0.5 text-[10px] rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Tall/Lean (9/10)
                </button>
                <button
                  type="button"
                  onClick={() => applyBonePreset(0.88, 0.92, 0.9)}
                  className="px-2 py-0.5 text-[10px] rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Petite (2/10)
                </button>
                <button
                  type="button"
                  onClick={() => applyBonePreset(0.96, 1.3, 1.3)}
                  className="px-2 py-0.5 text-[10px] rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Stocky Build (9/10)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Height_Scale Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">
                    Height_Scale
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-bold">
                      {(1 + ((heightScale - 0.85) / 0.4) * 9).toFixed(1)}/10
                    </span>
                    <span className="font-mono text-xs text-indigo-400 font-bold">
                      {heightScale.toFixed(2)}x
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.25"
                  step="0.01"
                  value={heightScale}
                  onChange={(e) => setHeightScale(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span>0.85x (1/10)</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setHeightScale((prev) => Math.max(0.85, parseFloat((prev - 0.04).toFixed(2))))}
                      className="px-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 font-bold"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeightScale((prev) => Math.min(1.25, parseFloat((prev + 0.04).toFixed(2))))}
                      className="px-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span>1.25x (10/10)</span>
                </div>
              </div>

              {/* Shoulder_Width Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">
                    Shoulder_Width
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-bold">
                      {(1 + ((shoulderWidthScale - 0.80) / 0.55) * 9).toFixed(1)}/10
                    </span>
                    <span className="font-mono text-xs text-indigo-400 font-bold">
                      {shoulderWidthScale.toFixed(2)}x
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="1.35"
                  step="0.01"
                  value={shoulderWidthScale}
                  onChange={(e) => setShoulderWidthScale(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span>0.80x (1/10)</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShoulderWidthScale((prev) => Math.max(0.80, parseFloat((prev - 0.05).toFixed(2))))}
                      className="px-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 font-bold"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setShoulderWidthScale((prev) => Math.min(1.35, parseFloat((prev + 0.05).toFixed(2))))}
                      className="px-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span>1.35x (10/10)</span>
                </div>
              </div>

              {/* Chest_Depth Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">
                    Chest_Depth
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-bold">
                      {(1 + ((chestDepthScale - 0.80) / 0.55) * 9).toFixed(1)}/10
                    </span>
                    <span className="font-mono text-xs text-indigo-400 font-bold">
                      {chestDepthScale.toFixed(2)}x
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="1.35"
                  step="0.01"
                  value={chestDepthScale}
                  onChange={(e) => setChestDepthScale(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span>0.80x (1/10)</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setChestDepthScale((prev) => Math.max(0.80, parseFloat((prev - 0.05).toFixed(2))))}
                      className="px-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 font-bold"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setChestDepthScale((prev) => Math.min(1.35, parseFloat((prev + 0.05).toFixed(2))))}
                      className="px-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span>1.35x (10/10)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Modular Hair & Facial Hair Sockets */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Scissors className="w-4 h-4" />
                <span>Modular Sockets Configuration</span>
              </div>
              <span className="text-[10px] font-mono text-gray-400">
                Sockets: Head_Top [0, 0.45, 0] | Mandible [0, -0.22, 0.26]
              </span>
            </div>

            {/* Socket 1: Head_Top_Socket (Hair) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>Head_Top_Socket (Hair Mesh Socket)</span>
                </label>
                <span className="text-[10px] font-mono text-indigo-400">
                  Active: {hairStyle}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[...HAIR_OPTIONS, 'Bald'].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setHairStyle(style)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                      hairStyle === style
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Socket 2: Mandible_FacialHair_Socket (Beard / Mustache) */}
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Mandible_FacialHair_Socket (Facial Hair Socket)</span>
                </label>
                <span className="text-[10px] font-mono text-emerald-400">
                  Active: {facialHair}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BEARD_OPTIONS.map((beard) => (
                  <button
                    key={beard}
                    type="button"
                    onClick={() => setFacialHair(beard)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                      facialHair === beard
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {beard}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Skin Tone & Signature Accessory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Skin Tone Swatch
              </label>
              <select
                value={skinTone}
                onChange={(e) => setSkinTone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                {SKIN_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Signature Accessory
              </label>
              <select
                value={accessories}
                onChange={(e) => setAccessories(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                {ACCESSORY_OPTIONS.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Wardrobe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Top Outfit
              </label>
              <select
                value={clothingTop}
                onChange={(e) => setClothingTop(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                {TOP_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Bottom Outfit
              </label>
              <select
                value={clothingBottom}
                onChange={(e) => setClothingBottom(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                {BOTTOM_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Color Swatch & Plumbob Accent */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Favorite Wardrobe & Plumbob Aura Color
            </label>
            <div className="flex gap-2">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === swatch ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>

          {/* Traits Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Personality Traits (Pick Up to 3)
              </label>
              <span className="text-xs text-indigo-500 font-semibold">{selectedTraits.length}/3 selected</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {TRAIT_OPTIONS.map((trait) => {
                const isSelected = selectedTraits.includes(trait);
                return (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => toggleTrait(trait)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {trait}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
            >
              Move In to The House
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
