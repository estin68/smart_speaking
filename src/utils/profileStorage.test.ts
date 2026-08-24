// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  defaultProfile,
  exportProfileJson,
  importProfileJson,
  loadProfile,
  saveProfile,
} from './profileStorage';

describe('profileStorage', () => {
  it('returns a default profile when nothing is stored', () => {
    localStorage.clear();
    const profile = loadProfile();
    expect(profile).toEqual(defaultProfile());
    expect(profile.level).toBe(1);
  });

  it('persists and reloads a profile', () => {
    const profile = { ...defaultProfile(), displayName: 'Chia', totalXp: 210, level: 3, streakDays: 4 };
    saveProfile(profile);
    expect(loadProfile()).toMatchObject({ displayName: 'Chia', totalXp: 210, streakDays: 4 });
  });

  it('round-trips through export/import', () => {
    const profile = { ...defaultProfile(), displayName: 'Estin', totalXp: 55, streakDays: 2 };
    const json = exportProfileJson(profile);
    const imported = importProfileJson(json);
    expect(imported).toEqual(profile);
  });

  it('rejects foreign JSON on import', () => {
    expect(() => importProfileJson(JSON.stringify({ hello: 'world' }))).toThrow();
    expect(() => importProfileJson('not json')).toThrow();
  });
});
