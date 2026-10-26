/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Cloud,
  Folder,
  FolderPlus,
  Save,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  Download,
  Upload,
  HardDrive,
  Home,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  UserFolderSave,
  WorldMechanicsSnapshot,
  deserializeWorldSave,
  exportWorldSaveToJson,
  importWorldSaveFromJson,
  saveLocalWorldSave,
  signInWithGoogle,
  signOutUser,
  saveGameToCloud,
  listUserSaves,
  deleteUserSave,
  saveUserProfileConfig,
  loadUserProfileConfig,
} from '../game/cloudSaveSystem';
import {
  Character,
  SmartObject,
  MaturityRating,
  HouseholdLegacyMilestone,
} from '../game/simulation';
import { WorldBlueprint } from '../game/worldBuilder';
import { FloorLevel } from '../game/houseAgent';

interface CloudSavesModalProps {
  onClose: () => void;
  currentUser: User | null;
  characters: Character[];
  smartObjects: SmartObject[];
  gameSeconds: number;
  timeScale: number;
  funds: number;
  expansionLevel: number;
  hasBasement?: boolean;
  activeFloor?: FloorLevel;
  maturity?: MaturityRating;
  roomWallpapers?: Record<string, string>;
  roomCarpets?: Record<string, string>;
  openConceptKitchen?: boolean;
  openConceptLiving?: boolean;
  worldBlueprint: WorldBlueprint;
  householdMilestones?: HouseholdLegacyMilestone[];
  onLoadSave: (save: UserFolderSave) => void;
  autoSaveInterval: number;
  onSetAutoSaveInterval: (intervalSeconds: number) => void;
  isDarkMode: boolean;
}

export const CloudSavesModal: React.FC<CloudSavesModalProps> = ({
  onClose,
  currentUser,
  characters,
  smartObjects,
  gameSeconds,
  timeScale,
  funds,
  expansionLevel,
  hasBasement = true,
  activeFloor = 'MAIN',
  maturity = 'FAMILY_FRIENDLY',
  roomWallpapers,
  roomCarpets,
  openConceptKitchen = false,
  openConceptLiving = false,
  worldBlueprint,
  householdMilestones,
  onLoadSave,
  autoSaveInterval,
  onSetAutoSaveInterval,
  isDarkMode,
}) => {
  const [saves, setSaves] = useState<UserFolderSave[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingDeleteSaveId, setPendingDeleteSaveId] = useState<string | null>(null);

  // Folder navigation
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [customFolders, setCustomFolders] = useState<string[]>([
    'My Worlds',
    'Custom Builds',
    'Autosaves',
    'Scenarios',
    'Backups',
  ]);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showNewFolderInput, setShowNewFolderInput] = useState<boolean>(false);

  // New Save Slot Input
  const [slotNameInput, setSlotNameInput] = useState<string>('');

  // Import JSON Drawer
  const [showImportDrawer, setShowImportDrawer] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load local + cloud saves on mount or when user changes
  useEffect(() => {
    loadSavesList();
    if (currentUser) {
      loadUserProfile();
    }
  }, [currentUser]);

  const buildCurrentMechanicsSnapshot = (): WorldMechanicsSnapshot => ({
    funds,
    expansionLevel,
    hasBasement,
    activeFloor,
    maturity,
    gameSeconds,
    timeScale,
    roomWallpapers,
    roomCarpets,
    openConceptKitchen,
    openConceptLiving,
    worldBlueprint,
    householdMilestones,
  });

  const loadSavesList = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await listUserSaves(currentUser?.uid);
      setSaves(data);

      const folderSet = new Set(customFolders);
      data.forEach((s) => {
        if (s.folder) folderSet.add(s.folder);
      });
      setCustomFolders(Array.from(folderSet));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Loaded local world saves (cloud offline).');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    if (!currentUser) return;
    const config = await loadUserProfileConfig(currentUser.uid);
    if (config && typeof config.autoSaveIntervalSeconds === 'number') {
      onSetAutoSaveInterval(config.autoSaveIntervalSeconds);
    }
  };

  const handleSignIn = async () => {
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      setStatusMsg('Signed in with Google! Local and Cloud worlds are now synced.');
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Google Sign-In was cancelled. You can continue saving worlds locally!'
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      await loadSavesList();
      setStatusMsg('Signed out of Cloud. Local worlds remain available.');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Sign-out failed.');
    }
  };

  const handleCreateOrOverwriteSave = async (options?: {
    folderToUse?: string;
    explicitSaveId?: string;
    explicitSlotName?: string;
    isAutoSave?: boolean;
  }) => {
    const folder =
      options?.folderToUse || (selectedFolder === 'All' ? 'My Worlds' : selectedFolder);
    const defaultSlotTitle =
      worldBlueprint.lotTitle && worldBlueprint.lotTitle !== 'Starter Bungalow Lot'
        ? `${worldBlueprint.lotTitle} (Day ${Math.floor(gameSeconds / 86400) + 1})`
        : `World Slot ${saves.length + 1}`;
    const slotName =
      options?.explicitSlotName || slotNameInput.trim() || defaultSlotTitle;

    const simHour = (gameSeconds % 86400) / 3600;
    const simDay = Math.floor(gameSeconds / 86400) + 1;

    setLoading(true);
    setErrorMsg(null);
    try {
      const savedSlot = await saveGameToCloud(
        currentUser?.uid,
        slotName,
        folder,
        Boolean(options?.isAutoSave),
        simHour,
        simDay,
        characters,
        smartObjects,
        buildCurrentMechanicsSnapshot(),
        options?.explicitSaveId
      );
      setSlotNameInput('');
      setStatusMsg(
        options?.explicitSaveId
          ? `Updated world "${savedSlot.slotName}" (${
              currentUser ? 'Synced to Local + Cloud' : 'Saved to Local Storage'
            })!`
          : `Saved world "${savedSlot.slotName}" to "${folder}" (${
              currentUser ? 'Synced to Local + Cloud' : 'Saved to Local Storage'
            })!`
      );
      setTimeout(() => setStatusMsg(null), 3500);
      await loadSavesList();
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'Saved world to local browser storage (Cloud sync unavailable).'
      );
      await loadSavesList();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSave = async (saveId: string, name: string) => {
    setLoading(true);
    setPendingDeleteSaveId(null);
    try {
      await deleteUserSave(currentUser?.uid, saveId);
      setStatusMsg(`Deleted world "${name}".`);
      setTimeout(() => setStatusMsg(null), 2500);
      await loadSavesList();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete world slot.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportWorldFile = (save: UserFolderSave) => {
    const jsonStr = exportWorldSaveToJson(save);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeFile = save.slotName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'world';
    a.href = url;
    a.download = `${safeFile}.thehouse.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMsg(`Exported world "${save.slotName}" as JSON file.`);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleImportWorldJson = async (rawJson: string) => {
    const imported = importWorldSaveFromJson(rawJson, currentUser?.uid);
    if (!imported) {
      setErrorMsg('Invalid world JSON file. Please provide a valid The House world export.');
      return;
    }
    saveLocalWorldSave(imported);
    if (currentUser) {
      const decoded = deserializeWorldSave(imported);
      if (decoded) {
        try {
          await saveGameToCloud(
            currentUser.uid,
            imported.slotName,
            imported.folder,
            false,
            imported.simHour,
            imported.simDay,
            decoded.characters,
            decoded.smartObjects,
            decoded.mechanics,
            imported.saveId
          );
        } catch {
          // Local save already succeeded
        }
      }
    }
    setImportJsonText('');
    setShowImportDrawer(false);
    await loadSavesList();
    setStatusMsg(`Imported world "${imported.slotName}"! Click Load World to enter it.`);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleImportWorldJson(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    if (!customFolders.includes(trimmed)) {
      setCustomFolders([...customFolders, trimmed]);
      setSelectedFolder(trimmed);
    }
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const handleIntervalChange = async (seconds: number) => {
    onSetAutoSaveInterval(seconds);
    if (currentUser) {
      await saveUserProfileConfig(currentUser.uid, {
        autoSaveEnabled: seconds > 0,
        autoSaveIntervalSeconds: seconds,
      });
    }
  };

  // Filter saves by folder
  const displayedSaves = saves.filter((s) => {
    if (selectedFolder === 'All') return true;
    return s.folder === selectedFolder;
  });

  return (
    <div
      data-testid="world-saves-modal"
      role="dialog"
      aria-label="Save and Load Worlds Manager"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
    >
      <div
        className={`w-full max-w-5xl rounded-2xl border shadow-2xl p-6 overflow-hidden max-h-[92vh] flex flex-col ${
          isDarkMode
            ? 'bg-gray-950 text-gray-100 border-indigo-900/80'
            : 'bg-white text-gray-900 border-gray-200'
        }`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-600 text-white shadow-md">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">
                  Save &amp; Load Worlds Manager
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  <span>Local Storage Active</span>
                </span>
                {currentUser && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                    <Cloud className="w-3 h-3" />
                    <span>Cloud Synced</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Save and restore complete 3D house blueprints, room styles, furniture layouts, and autonomous residents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Import JSON File Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              data-testid="toggle-import-world-btn"
              onClick={() => setShowImportDrawer(!showImportDrawer)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition cursor-pointer"
              title="Import a World Save from JSON file or text"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import World</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
                <span className="text-xs font-medium max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={handleSignOut}
                  title="Sign Out of Cloud Sync"
                  className="p-1 hover:text-red-400 text-gray-400 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
                title="Optional: Sign in with Google to sync worlds to Firebase Cloud"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Cloud Sync Sign-In</span>
              </button>
            )}

            <button
              type="button"
              data-testid="close-world-saves-modal-btn"
              onClick={onClose}
              aria-label="Close Save and Load Worlds Manager"
              className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications / Alerts */}
        {statusMsg && (
          <div
            data-testid="world-save-status-banner"
            className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div
            data-testid="world-save-error-banner"
            className="mt-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 dark:text-red-400 text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Optional Import JSON Drawer */}
        {showImportDrawer && (
          <div
            data-testid="import-world-drawer"
            className="mt-3 p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-indigo-500/50 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300">
                Import World JSON File or Paste World Data
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  Choose .json File
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportDrawer(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-0.5 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                data-testid="import-world-json-input"
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='Paste exported world JSON string here...'
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono"
              />
              <button
                type="button"
                data-testid="confirm-import-world-btn"
                disabled={!importJsonText.trim()}
                onClick={() => handleImportWorldJson(importJsonText)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
              >
                Import &amp; Add Slot
              </button>
            </div>
          </div>
        )}

        {/* Body Grid: Left Folders Sidebar + Right Saves Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-4 gap-4 py-4 min-h-0">
          {/* Folders & Auto-Save Control Sidebar */}
          <div className="md:col-span-1 border-r border-gray-200 dark:border-gray-800 pr-3 space-y-4 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  World Folders
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                  className="text-indigo-500 hover:text-indigo-400 text-xs p-1 rounded cursor-pointer"
                  title="Add Folder"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>

              {showNewFolderInput && (
                <div className="space-y-1.5 p-2 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <input
                    type="text"
                    placeholder="Folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setShowNewFolderInput(false)}
                      className="px-2 py-0.5 text-[10px] text-gray-400 hover:text-gray-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddFolder}
                      className="px-2 py-0.5 text-[10px] rounded bg-indigo-600 text-white font-medium cursor-pointer"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}

              {/* Folders List */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedFolder('All')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedFolder === 'All'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5" />
                    <span>All Worlds</span>
                  </div>
                  <span className="text-[10px] opacity-75 font-mono">{saves.length}</span>
                </button>

                {customFolders.map((f) => {
                  const count = saves.filter((s) => s.folder === f).length;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedFolder(f)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        selectedFolder === f
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                      <span className="text-[10px] opacity-75 font-mono">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto-Save Interval Settings */}
            <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Auto-Save World
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    autoSaveInterval > 0
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-gray-500/10 text-gray-400'
                  }`}
                >
                  {autoSaveInterval > 0 ? `Every ${autoSaveInterval}s` : 'Off'}
                </span>
              </div>
              <p className="text-[10px] text-gray-500">
                Automatically saves your active world, blueprint, and residents.
              </p>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {[30, 45, 120, 0].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleIntervalChange(sec)}
                    className={`px-2 py-1 text-[10px] rounded border font-medium cursor-pointer ${
                      autoSaveInterval === sec
                        ? sec === 0
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    {sec === 0 ? 'Disabled' : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Main Panel: Active World Summary, Save Creation & Saved Worlds List */}
          <div className="md:col-span-3 flex flex-col space-y-3 overflow-hidden">
            {/* Active World Summary + Save Current World Card */}
            <div className="p-3.5 rounded-xl bg-indigo-950/10 dark:bg-gray-900/90 border border-indigo-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="font-extrabold">
                    Current Active World:{' '}
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {worldBlueprint.lotTitle || 'Starter Bungalow Lot'}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-200">
                    {worldBlueprint.isEmptyGridMode ? 'Custom Grid Build' : 'Multi-Wing Estate'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  <span>🧱 {worldBlueprint.placedParts.length} Parts</span>
                  <span>🛋️ {smartObjects.length} Objects</span>
                  <span>👥 {characters.length} Toons</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    §{funds.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <input
                  type="text"
                  data-testid="world-save-name-input"
                  aria-label="World Save Slot Name"
                  placeholder={`Enter World Name (e.g., ${
                    worldBlueprint.lotTitle || 'My Custom Estate'
                  })...`}
                  value={slotNameInput}
                  onChange={(e) => setSlotNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateOrOverwriteSave();
                    }
                  }}
                  className="flex-1 w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    data-testid="save-world-submit-btn"
                    onClick={() => handleCreateOrOverwriteSave()}
                    disabled={loading}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save World</span>
                  </button>
                  <button
                    type="button"
                    data-testid="quick-save-world-btn"
                    onClick={() =>
                      handleCreateOrOverwriteSave({
                        folderToUse: 'Autosaves',
                        explicitSaveId: 'quicksave_slot_main',
                        explicitSlotName: `Quick Save — ${worldBlueprint.lotTitle || 'Active World'}`,
                        isAutoSave: true,
                      })
                    }
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer"
                    title="Instant Quick-Save Slot"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Quick Save</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Saves Listing Header */}
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>
                Showing <strong>{displayedSaves.length}</strong> saved{' '}
                {displayedSaves.length === 1 ? 'world' : 'worlds'} in{' '}
                <strong className="text-indigo-500">{selectedFolder}</strong>
              </span>
              <button
                type="button"
                onClick={loadSavesList}
                className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Worlds</span>
              </button>
            </div>

            {/* Saves Grid/List */}
            <div
              data-testid="saved-worlds-list"
              className="flex-1 overflow-y-auto space-y-2.5 pr-1"
            >
              {loading && saves.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-400">
                  Loading saved worlds...
                </div>
              ) : displayedSaves.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-gray-300 dark:border-gray-800 p-6 space-y-2">
                  <Layers className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-xs text-gray-400">
                    No saved worlds in folder &ldquo;{selectedFolder}&rdquo; yet. Enter a name above and click{' '}
                    <strong>Save World</strong> to store your current 3D house blueprint, furniture, and residents!
                  </p>
                </div>
              ) : (
                displayedSaves.map((save) => {
                  const decoded = deserializeWorldSave(save);
                  const parsedChars = decoded?.characters || [];
                  const parsedObjects = decoded?.smartObjects || [];
                  const savedBp = decoded?.mechanics.worldBlueprint;
                  const savedFunds = decoded?.mechanics.funds ?? 3600;
                  const lotLabel = savedBp?.lotTitle || 'Starter Bungalow Lot';
                  const archStyle = savedBp?.architecturalStyle || 'Suburban Bungalow';
                  const partCount = savedBp?.placedParts?.length ?? 0;

                  return (
                    <div
                      key={save.saveId}
                      data-testid={`world-save-card-${save.saveId}`}
                      className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 hover:border-indigo-500/60 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-sm truncate">
                            {save.slotName}
                          </span>
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            {save.folder || 'My Worlds'}
                          </span>
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {save.storageSource === 'synced'
                              ? 'Local + Cloud'
                              : save.storageSource === 'cloud'
                              ? 'Cloud'
                              : 'Local'}
                          </span>
                          {save.isAutoSave && (
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              Autosave
                            </span>
                          )}
                        </div>

                        {/* World Architecture & Metadata row */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            🏠 {lotLabel} ({archStyle})
                          </span>
                          <span>🧱 {partCount} Parts</span>
                          <span>🛋️ {parsedObjects.length} Objects</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            §{savedFunds.toLocaleString()}
                          </span>
                          <span>
                            📅 Day {save.simDay} · {save.simHour.toFixed(1)}h
                          </span>
                          <span>🕒 {save.timestamp}</span>
                        </div>

                        {/* Character avatars preview */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {parsedChars.slice(0, 6).map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-medium"
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: c.color }}
                              />
                              <span className="truncate max-w-[90px]">
                                {c.name.split(' ')[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          data-testid={`load-world-btn-${save.saveId}`}
                          onClick={() => {
                            onLoadSave(save);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                          title={`Load world "${save.slotName}"`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Load World</span>
                        </button>

                        <button
                          type="button"
                          data-testid={`overwrite-world-btn-${save.saveId}`}
                          onClick={() =>
                            handleCreateOrOverwriteSave({
                              folderToUse: save.folder,
                              explicitSaveId: save.saveId,
                              explicitSlotName: save.slotName,
                              isAutoSave: save.isAutoSave,
                            })
                          }
                          className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600/15 hover:bg-indigo-600 text-indigo-500 hover:text-white border border-indigo-500/30 transition cursor-pointer"
                          title={`Overwrite "${save.slotName}" with current active world`}
                        >
                          Overwrite
                        </button>

                        <button
                          type="button"
                          data-testid={`export-world-btn-${save.saveId}`}
                          onClick={() => handleExportWorldFile(save)}
                          className="p-1.5 rounded-xl text-gray-500 hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                          title="Export World as .json file"
                          aria-label={`Export ${save.slotName}`}
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {pendingDeleteSaveId === save.saveId ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              data-testid={`confirm-delete-world-btn-${save.saveId}`}
                              onClick={() => handleDeleteSave(save.saveId, save.slotName)}
                              className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteSaveId(null)}
                              className="px-1.5 py-1 rounded-lg bg-gray-200 dark:bg-gray-800 text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            data-testid={`delete-world-btn-${save.saveId}`}
                            onClick={() => setPendingDeleteSaveId(save.saveId)}
                            className="p-1.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                            title="Delete world save"
                            aria-label={`Delete ${save.slotName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
