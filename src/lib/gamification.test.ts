import { describe, expect, it } from 'vitest';
import {
  computeMissionProgress,
  computeXpBreakdown,
  levelForXp,
  todayLocalDateString,
  updateStreak,
  xpForNextLevel,
} from './gamification';
import { UserProfile } from '../types';

function makeEval(overallScore: number) {
  return {
    overallScore,
    metrics: {
      clarityScore: 8,
      assertivenessScore: 8,
      tactEmpathyScore: 8,
      pacingRating: 'Optimal' as const,
      fillerFrequency: 'Low' as const,
    },
    keyStrengths: ['s'],
    improvementAreas: ['i'],
    suggestedAlternativePhrase: 'x',
    actionableTip: 't',
  };
}

describe('level curve', () => {
  it('starts at level 1', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(49)).toBe(1);
  });

  it('advances at 50 * (level-1)^2 XP', () => {
    expect(levelForXp(50)).toBe(2);
    expect(levelForXp(199)).toBe(2);
    expect(levelForXp(200)).toBe(3);
  });

  it('xpForNextLevel inverts levelForXp', () => {
    for (const xp of [0, 10, 60, 210]) {
      expect(levelForXp(xpForNextLevel(xp))).toBe(levelForXp(xp) + 1);
    }
  });
});

describe('streaks', () => {
  const baseProfile = (): UserProfile => ({
    displayName: 'Test',
    totalXp: 0,
    level: 1,
    streakDays: 0,
    lastSessionDate: null,
  });

  const now = new Date('2026-08-24T10:00:00');

  it('starts a streak of 1', () => {
    const r = updateStreak(baseProfile(), now);
    expect(r).toEqual({ streakDays: 1, changed: true });
  });

  it('continues a streak from yesterday', () => {
    const profile = { ...baseProfile(), streakDays: 4, lastSessionDate: '2026-08-23' };
    expect(updateStreak(profile, now)).toEqual({ streakDays: 5, changed: true });
  });

  it('does not double-count same-day sessions', () => {
    const profile = { ...baseProfile(), streakDays: 3, lastSessionDate: '2026-08-24' };
    expect(updateStreak(profile, now)).toEqual({ streakDays: 3, changed: false });
  });

  it('resets after a gap', () => {
    const profile = { ...baseProfile(), streakDays: 9, lastSessionDate: '2026-08-01' };
    expect(updateStreak(profile, now)).toEqual({ streakDays: 1, changed: true });
  });

  it('formats local date as YYYY-MM-DD', () => {
    expect(todayLocalDateString(new Date(2026, 7, 4))).toBe('2026-08-04');
  });
});

describe('XP rules', () => {
  it('always awards base completion', () => {
    const breakdown = computeXpBreakdown({
      evaluation: makeEval(50),
      isFirstTimeLesson: false,
    });
    expect(breakdown).toEqual([{ reason: 'session_complete', amount: 20 }]);
  });

  it('awards high-score bonus at >=80', () => {
    const breakdown = computeXpBreakdown({
      evaluation: makeEval(80),
      isFirstTimeLesson: true,
    });
    expect(breakdown.map((b) => b.reason)).toEqual([
      'session_complete',
      'high_score',
      'new_lesson',
    ]);
    expect(breakdown.reduce((s, b) => s + b.amount, 0)).toBe(65);
  });
});

describe('mission progress', () => {
  it('computes count/streak/score/variety progress', () => {
    const missions = computeMissionProgress({
      completedSessionCount: 2,
      bestOverallScore: 70,
      distinctTrackCount: 1,
      streakDays: 3,
    });

    const byId = Object.fromEntries(missions.map((m) => [m.id, m]));
    expect(byId['first-session'].completed).toBe(true);
    expect(byId['three-sessions']).toMatchObject({ progress: 2, completed: false });
    expect(byId['streak-3']).toMatchObject({ progress: 3, completed: true });
    expect(byId['score-80']).toMatchObject({ progress: 0, completed: false });
    expect(byId['variety-3']).toMatchObject({ progress: 1, completed: false });
  });
});
