/**
 * Lightweight local profile — replaces authentication for v1.
 * Data lives in localStorage on this device; JSON export/import is the
 * backup & device-migration path.
 */
import { UserProfile } from '../types';

// Legacy key from early builds; kept only for one-time migration.
const LEGACY_PROFILE_KEY = 'smarty.profile';
const PROFILE_KEY = 'smart-speaking.profile';

export function defaultProfile(): UserProfile {
  return {
    displayName: 'Learner',
    totalXp: 0,
    level: 1,
    streakDays: 0,
    lastSessionDate: null,
  };
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY) ?? localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    const profile = { ...defaultProfile(), ...parsed };
    // Migrate off the legacy key.
    if (localStorage.getItem(LEGACY_PROFILE_KEY)) {
      saveProfile(profile);
      localStorage.removeItem(LEGACY_PROFILE_KEY);
    }
    return profile;
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/** Serialised backup of the profile (sessions stay in IndexedDB export, v2). */
export function exportProfileJson(profile: UserProfile): string {
  return JSON.stringify({ type: 'smart_speaking_profile', version: 1, profile }, null, 2);
}

export function importProfileJson(json: string): UserProfile {
  const parsed = JSON.parse(json);
  if (parsed?.type !== 'smart_speaking_profile' || !parsed.profile) {
    throw new Error('Not a Smart Speaking profile backup file');
  }
  return { ...defaultProfile(), ...parsed.profile };
}
