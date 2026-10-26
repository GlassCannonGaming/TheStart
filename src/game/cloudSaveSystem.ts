/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  db,
  auth,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  Character,
  SmartObject,
  MaturityRating,
  HouseholdLegacyMilestone,
} from './simulation';
import { WorldBlueprint } from './worldBuilder';
import { FloorLevel } from './houseAgent';

export const LOCAL_WORLD_SAVES_STORAGE_KEY = 'the_house_world_saves_v1';

export interface WorldMechanicsSnapshot {
  funds: number;
  expansionLevel: number;
  hasBasement?: boolean;
  activeFloor?: FloorLevel;
  maturity?: MaturityRating;
  gameSeconds: number;
  timeScale: number;
  roomWallpapers?: Record<string, string>;
  roomCarpets?: Record<string, string>;
  openConceptKitchen?: boolean;
  openConceptLiving?: boolean;
  worldBlueprint?: WorldBlueprint;
  householdMilestones?: HouseholdLegacyMilestone[];
}

export interface UserFolderSave {
  saveId: string;
  userId: string;
  slotName: string;
  folder: string;
  isAutoSave: boolean;
  timestamp: string;
  simHour: number;
  simDay: number;
  characterCount: number;
  characters: string; // JSON stringified characters
  objects: string; // JSON stringified smart objects
  mechanicsData: string; // JSON stringified WorldMechanicsSnapshot
  createdAt?: string;
  updatedAt?: string;
  storageSource?: 'local' | 'cloud' | 'synced';
}

export interface ParsedWorldSaveState {
  saveId: string;
  slotName: string;
  folder: string;
  characters: Character[];
  smartObjects: SmartObject[];
  mechanics: WorldMechanicsSnapshot;
}

export interface UserProfileConfig {
  userId: string;
  displayName: string;
  email?: string;
  autoSaveEnabled: boolean;
  autoSaveIntervalSeconds: number;
  lastSavedSlot?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Pure helper to construct a validated UserFolderSave from simulation & world state.
 * Enforces volumetric boundaries from firebase-blueprint.json & firestore.rules.
 */
export function serializeWorldSave(params: {
  saveId?: string;
  userId?: string;
  slotName: string;
  folder: string;
  isAutoSave: boolean;
  simHour: number;
  simDay: number;
  characters: Character[];
  objects: SmartObject[];
  mechanics: WorldMechanicsSnapshot;
  timestamp?: string;
  updatedAt?: string;
}): UserFolderSave {
  const cleanSlotName = (params.slotName.trim() || (params.isAutoSave ? 'Auto-Save World' : 'Saved World')).slice(0, 120);
  const cleanFolder = (params.folder.trim() || (params.isAutoSave ? 'Autosaves' : 'My Worlds')).slice(0, 60);
  const sanitizedSlug = cleanSlotName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase().slice(0, 64) || 'world';
  const rawSaveId =
    params.saveId ||
    (params.isAutoSave ? `autosave_${sanitizedSlug}` : `world_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const validSaveId = rawSaveId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);

  let charsJson = JSON.stringify(params.characters);
  if (charsJson.length > 65000) {
    // Trim excessive privateMemory logs if payload approaches 64KB Firestore limit
    const compactChars = params.characters.map((c) => ({
      ...c,
      privateMemory: (c.privateMemory || []).slice(-12),
    }));
    charsJson = JSON.stringify(compactChars);
  }

  const objectsJson = JSON.stringify(params.objects);
  let mechanicsJson = JSON.stringify(params.mechanics);
  if (mechanicsJson.length > 32000) {
    const compactMechanics: WorldMechanicsSnapshot = {
      ...params.mechanics,
      householdMilestones: (params.mechanics.householdMilestones || []).slice(0, 15),
    };
    mechanicsJson = JSON.stringify(compactMechanics);
  }

  return {
    saveId: validSaveId,
    userId: (params.userId || 'local_architect').slice(0, 120),
    slotName: cleanSlotName,
    folder: cleanFolder,
    isAutoSave: Boolean(params.isAutoSave),
    timestamp: (params.timestamp || new Date().toLocaleString()).slice(0, 60),
    simHour: Math.round(params.simHour * 10) / 10,
    simDay: Math.max(1, Math.floor(params.simDay)),
    characterCount: params.characters.length,
    characters: charsJson,
    objects: objectsJson,
    mechanicsData: mechanicsJson,
    updatedAt: (params.updatedAt || new Date().toISOString()).slice(0, 60),
  };
}

/**
 * Pure helper to parse and validate a UserFolderSave back into full live world state.
 */
export function deserializeWorldSave(save: UserFolderSave): ParsedWorldSaveState | null {
  try {
    const parsedChars = JSON.parse(save.characters);
    const parsedObjs = JSON.parse(save.objects);
    const parsedMech = save.mechanicsData ? JSON.parse(save.mechanicsData) : {};

    if (!Array.isArray(parsedChars) || !Array.isArray(parsedObjs)) {
      return null;
    }

    const mechanics: WorldMechanicsSnapshot = {
      funds: typeof parsedMech.funds === 'number' ? parsedMech.funds : 3600,
      expansionLevel: typeof parsedMech.expansionLevel === 'number' ? parsedMech.expansionLevel : 2,
      hasBasement: typeof parsedMech.hasBasement === 'boolean' ? parsedMech.hasBasement : true,
      activeFloor: parsedMech.activeFloor || 'MAIN',
      maturity: parsedMech.maturity || 'FAMILY_FRIENDLY',
      gameSeconds: typeof parsedMech.gameSeconds === 'number' ? parsedMech.gameSeconds : 8 * 3600,
      timeScale: typeof parsedMech.timeScale === 'number' ? parsedMech.timeScale : 1.0,
      roomWallpapers: parsedMech.roomWallpapers,
      roomCarpets: parsedMech.roomCarpets,
      openConceptKitchen: parsedMech.openConceptKitchen,
      openConceptLiving: parsedMech.openConceptLiving,
      worldBlueprint: parsedMech.worldBlueprint,
      householdMilestones: Array.isArray(parsedMech.householdMilestones)
        ? parsedMech.householdMilestones
        : undefined,
    };

    return {
      saveId: save.saveId,
      slotName: save.slotName,
      folder: save.folder || 'My Worlds',
      characters: parsedChars,
      smartObjects: parsedObjs,
      mechanics,
    };
  } catch {
    return null;
  }
}

/**
 * Export a world save slot as a formatted JSON string for file download/sharing.
 */
export function exportWorldSaveToJson(save: UserFolderSave): string {
  return JSON.stringify(
    {
      format: 'THE_HOUSE_WORLD_SAVE_V1',
      exportedAt: new Date().toISOString(),
      save,
    },
    null,
    2
  );
}

/**
 * Import and validate a world save slot from a JSON string.
 */
export function importWorldSaveFromJson(jsonString: string, currentUserId?: string): UserFolderSave | null {
  try {
    const raw = JSON.parse(jsonString);
    const candidate: UserFolderSave = raw?.save && raw?.format === 'THE_HOUSE_WORLD_SAVE_V1' ? raw.save : raw;
    if (!candidate || typeof candidate.slotName !== 'string' || typeof candidate.characters !== 'string' || typeof candidate.objects !== 'string') {
      return null;
    }
    const check = deserializeWorldSave(candidate);
    if (!check) return null;

    return serializeWorldSave({
      saveId: `imported_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      userId: currentUserId || candidate.userId || 'local_architect',
      slotName: candidate.slotName,
      folder: candidate.folder || 'My Worlds',
      isAutoSave: false,
      simHour: candidate.simHour || 8,
      simDay: candidate.simDay || 1,
      characters: check.characters,
      objects: check.smartObjects,
      mechanics: check.mechanics,
    });
  } catch {
    return null;
  }
}

/**
 * Load all locally saved worlds from localStorage.
 */
export function loadLocalWorldSaves(): UserFolderSave[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_WORLD_SAVES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s.saveId === 'string' && typeof s.slotName === 'string')
      .map((s) => ({ ...s, storageSource: s.storageSource || 'local' }))
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  } catch {
    return [];
  }
}

/**
 * Save or update a world slot in localStorage.
 */
export function saveLocalWorldSave(save: UserFolderSave): UserFolderSave[] {
  const existing = loadLocalWorldSaves();
  const withSource: UserFolderSave = { ...save, storageSource: save.storageSource || 'local' };
  const filtered = existing.filter((s) => s.saveId !== save.saveId);
  const next = [withSource, ...filtered].sort((a, b) =>
    (b.updatedAt || '').localeCompare(a.updatedAt || '')
  );
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_WORLD_SAVES_STORAGE_KEY, JSON.stringify(next.slice(0, 40)));
    } catch {
      // Ignore storage quota warnings
    }
  }
  return next;
}

/**
 * Delete a world slot from localStorage.
 */
export function deleteLocalWorldSave(saveId: string): UserFolderSave[] {
  const existing = loadLocalWorldSaves();
  const next = existing.filter((s) => s.saveId !== saveId);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_WORLD_SAVES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }
  return next;
}

/**
 * Merge local and cloud saves by saveId, preferring the latest updatedAt timestamp.
 */
export function mergeLocalAndCloudSaves(
  localSaves: UserFolderSave[],
  cloudSaves: UserFolderSave[]
): UserFolderSave[] {
  const map = new Map<string, UserFolderSave>();
  for (const l of localSaves) {
    map.set(l.saveId, { ...l, storageSource: 'local' });
  }
  for (const c of cloudSaves) {
    const existing = map.get(c.saveId);
    if (!existing) {
      map.set(c.saveId, { ...c, storageSource: 'cloud' });
    } else {
      const isCloudNewer = (c.updatedAt || '') >= (existing.updatedAt || '');
      map.set(c.saveId, {
        ...(isCloudNewer ? c : existing),
        storageSource: 'synced',
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    (b.updatedAt || '').localeCompare(a.updatedAt || '')
  );
}

/**
 * Sign in with Google using popup
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Listen to auth changes
 */
export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Save simulation & world state to LocalStorage AND (if userId is authenticated) to Firestore `/users/{userId}/saves/{saveId}`
 */
export async function saveGameToCloud(
  userId: string | null | undefined,
  slotName: string,
  folder: string,
  isAutoSave: boolean,
  simHour: number,
  simDay: number,
  characters: Character[],
  objects: SmartObject[],
  mechanics: WorldMechanicsSnapshot,
  explicitSaveId?: string
): Promise<UserFolderSave> {
  const payload = serializeWorldSave({
    saveId: explicitSaveId,
    userId: userId || 'local_architect',
    slotName,
    folder,
    isAutoSave,
    simHour,
    simDay,
    characters,
    objects,
    mechanics,
  });

  // Always save locally first for zero-latency persistence
  saveLocalWorldSave({
    ...payload,
    storageSource: userId ? 'synced' : 'local',
  });

  if (!userId) {
    return { ...payload, storageSource: 'local' };
  }

  const savePath = `users/${userId}/saves/${payload.saveId}`;
  const firestoreDoc: UserFolderSave = { ...payload };
  delete firestoreDoc.storageSource;

  try {
    const docRef = doc(db, 'users', userId, 'saves', payload.saveId);
    await setDoc(docRef, firestoreDoc, { merge: true });
    return { ...payload, storageSource: 'synced' };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, savePath);
    throw error;
  }
}

/**
 * List all saved worlds for the current user (merging local saves + cloud saves when authenticated)
 */
export async function listUserSaves(userId?: string | null): Promise<UserFolderSave[]> {
  const localSaves = loadLocalWorldSaves();
  if (!userId) {
    return localSaves;
  }

  const collectionPath = `users/${userId}/saves`;
  try {
    const savesRef = collection(db, 'users', userId, 'saves');
    const snapshot = await getDocs(savesRef);
    const cloudSaves: UserFolderSave[] = [];
    snapshot.forEach((docSnap) => {
      cloudSaves.push(docSnap.data() as UserFolderSave);
    });
    return mergeLocalAndCloudSaves(localSaves, cloudSaves);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return localSaves;
  }
}

/**
 * Delete a save slot from both LocalStorage and Cloud (if authenticated)
 */
export async function deleteUserSave(userId: string | null | undefined, saveId: string): Promise<void> {
  deleteLocalWorldSave(saveId);
  if (!userId) return;

  const savePath = `users/${userId}/saves/${saveId}`;
  try {
    const docRef = doc(db, 'users', userId, 'saves', saveId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, savePath);
    throw error;
  }
}

/**
 * Save user preferences & autosave settings
 */
export async function saveUserProfileConfig(
  userId: string,
  config: Partial<UserProfileConfig>
): Promise<void> {
  const configPath = `users/${userId}/profile/config`;
  try {
    const docRef = doc(db, 'users', userId, 'profile', 'config');
    await setDoc(
      docRef,
      {
        userId,
        displayName: auth.currentUser?.displayName || 'Simulator Resident',
        email: auth.currentUser?.email || '',
        autoSaveEnabled: config.autoSaveEnabled ?? true,
        autoSaveIntervalSeconds: config.autoSaveIntervalSeconds ?? 45,
        lastSavedSlot: config.lastSavedSlot || 'Default',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, configPath);
  }
}

/**
 * Load user preferences & autosave settings
 */
export async function loadUserProfileConfig(userId: string): Promise<UserProfileConfig | null> {
  const configPath = `users/${userId}/profile/config`;
  try {
    const docRef = doc(db, 'users', userId, 'profile', 'config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfileConfig;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, configPath);
    return null;
  }
}
