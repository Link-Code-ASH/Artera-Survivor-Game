import type { SupabaseClient } from '@supabase/supabase-js';

export type GameSaveData = {
  schemaVersion: 1;
  stats: {
    bestTime: number;
    bestLevel: number;
    totalRuns: number;
  };
  lastRun: {
    time: number;
    level: number;
    endedAt: string;
  } | null;
  profile: {
    gold: number;
    unlockedCharacters: string[];
    selectedCharacter: string;
    weapons: Record<string, unknown>;
    achievements: string[];
    settings: Record<string, unknown>;
  };
  future: Record<string, unknown>;
};

export type SyncCredentials = {
  projectId: string;
  syncId: string;
  pinCode: string;
};

export function createDefaultSaveData(): GameSaveData {
  return {
    schemaVersion: 1,
    stats: {
      bestTime: 0,
      bestLevel: 1,
      totalRuns: 0,
    },
    lastRun: null,
    profile: {
      gold: 0,
      unlockedCharacters: ['caiden'],
      selectedCharacter: 'caiden',
      weapons: {},
      achievements: [],
      settings: {},
    },
    future: {},
  };
}

export function normalizeSaveData(raw: unknown): GameSaveData {
  const fallback = createDefaultSaveData();
  if (!raw || typeof raw !== 'object') return fallback;

  const data = raw as Partial<GameSaveData>;
  return {
    ...fallback,
    ...data,
    stats: {
      ...fallback.stats,
      ...(data.stats || {}),
    },
    profile: {
      ...fallback.profile,
      ...(data.profile || {}),
      unlockedCharacters: data.profile?.unlockedCharacters?.length ? data.profile.unlockedCharacters : fallback.profile.unlockedCharacters,
    },
    future: {
      ...fallback.future,
      ...(data.future || {}),
    },
  };
}

export function recordRun(saveData: GameSaveData, run: { time: number; level: number }) {
  return normalizeSaveData({
    ...saveData,
    stats: {
      ...saveData.stats,
      bestTime: Math.max(saveData.stats.bestTime, run.time),
      bestLevel: Math.max(saveData.stats.bestLevel, run.level),
      totalRuns: saveData.stats.totalRuns + 1,
    },
    lastRun: {
      time: run.time,
      level: run.level,
      endedAt: new Date().toISOString(),
    },
  });
}

export async function verifyGameSync(client: SupabaseClient, credentials: SyncCredentials) {
  const { data, error } = await client.rpc('verify_game_sync', {
    input_project_id: credentials.projectId,
    input_sync_id: credentials.syncId,
    input_pin_code: credentials.pinCode,
  });

  if (error) throw error;
  return data === true;
}

export async function loadGameSave(client: SupabaseClient, credentials: SyncCredentials) {
  const { data, error } = await client.rpc('get_game_save', {
    input_project_id: credentials.projectId,
    input_sync_id: credentials.syncId,
    input_pin_code: credentials.pinCode,
  });

  if (error) throw error;
  return normalizeSaveData(data);
}

export async function saveGameSave(client: SupabaseClient, credentials: SyncCredentials, saveData: GameSaveData) {
  const { data, error } = await client.rpc('upsert_game_save', {
    input_project_id: credentials.projectId,
    input_sync_id: credentials.syncId,
    input_pin_code: credentials.pinCode,
    input_save_data: saveData,
  });

  if (error) throw error;
  return data === true;
}
