/**
 * Gamification engine — pure functions over DB data.
 * XP rules, level curve, daily streaks, and mission progress.
 */
import {
  DetailedEvaluation,
  MissionProgress,
  SessionOutcome,
  UserProfile,
  XpReason,
} from '../types';
import { MISSION_DEFS } from './missionDefs';
import {
  getCompletedSessions,
  getTotalXp,
  loadMissions,
  recordXpEvent,
  saveMissions,
} from '../db/dbOperations';

// ---------- XP rules ----------

export interface XpRuleResult {
  reason: XpReason;
  amount: number;
}

export function computeXpBreakdown(options: {
  evaluation: DetailedEvaluation;
  isFirstTimeLesson: boolean;
}): XpRuleResult[] {
  const breakdown: XpRuleResult[] = [{ reason: 'session_complete', amount: 20 }];
  if (options.evaluation.overallScore >= 80) {
    breakdown.push({ reason: 'high_score', amount: 30 });
  }
  if (options.isFirstTimeLesson) {
    breakdown.push({ reason: 'new_lesson', amount: 15 });
  }
  return breakdown;
}

// ---------- Mission progress ----------

export interface MissionStatsInput {
  completedSessionCount: number;
  bestOverallScore: number;
  distinctTrackCount: number;
  streakDays: number;
}

export function computeMissionProgress(stats: MissionStatsInput): MissionProgress[] {
  return MISSION_DEFS.map((def) => {
    let progress = 0;
    switch (def.type) {
      case 'count':
        progress = Math.min(stats.completedSessionCount, def.target);
        break;
      case 'streak':
        progress = Math.min(stats.streakDays, def.target);
        break;
      case 'score':
        progress = stats.bestOverallScore >= def.target ? def.target : 0;
        break;
      case 'variety':
        progress = Math.min(stats.distinctTrackCount, def.target);
        break;
    }
    return { ...def, progress, completed: progress >= def.target };
  });
}


export function levelForXp(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 50)) + 1;
}

/** Total XP required to reach the next level (inverse of levelForXp). */
export function xpForNextLevel(totalXp: number): number {
  const nextLevel = levelForXp(totalXp) + 1;
  return 50 * (nextLevel - 1) * (nextLevel - 1);
}

// ---------- Streaks (calendar-day based, local timezone) ----------

export function todayLocalDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayLocalDateString(now: Date = new Date()): string {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return todayLocalDateString(yesterday);
}

export function updateStreak(
  profile: UserProfile,
  now: Date = new Date()
): { streakDays: number; changed: boolean } {
  const today = todayLocalDateString(now);
  if (profile.lastSessionDate === today) {
    return { streakDays: profile.streakDays || 1, changed: false };
  }
  if (profile.lastSessionDate === yesterdayLocalDateString(now)) {
    return { streakDays: profile.streakDays + 1, changed: true };
  }
  return { streakDays: 1, changed: true };
}

// ---------- Session outcome orchestration ----------

/**
 * Called once per finished session (after completeSession). Writes XP events,
 * refreshes mission rows, and returns everything the Results screen celebrates.
 */
export async function recordSessionOutcome(params: {
  sessionId: number;
  lessonId: string;
  trackId: string;
  evaluation: DetailedEvaluation;
  profile: UserProfile;
}): Promise<SessionOutcome> {
  const { sessionId, lessonId, trackId, evaluation, profile } = params;

  // Current session is already marked completed in DB at this point.
  const sessions = await getCompletedSessions();
  const isFirstTimeLesson = !sessions.some(
    (s) => s.lessonId === lessonId && s.id !== sessionId
  );

    const breakdown = computeXpBreakdown({ evaluation, isFirstTimeLesson });

  const streakResult = updateStreak(profile);
  if (
    streakResult.changed &&
    streakResult.streakDays > 0 &&
    streakResult.streakDays % 3 === 0
  ) {
    breakdown.push({
      reason: 'streak_milestone',
      amount: streakResult.streakDays * 10,
    });
  }

  for (const rule of breakdown) {
    await recordXpEvent({ reason: rule.reason, amount: rule.amount, sessionId });
  }

  // Missions — recomputed deterministically from full history.
  const distinctTracks = new Set(sessions.map((s) => s.trackId));
  distinctTracks.add(trackId);
  const bestScore = Math.max(
    evaluation.overallScore,
    sessions.reduce((m, s) => Math.max(m, s.overallScore ?? 0), 0)
  );

  const previousMissions = new Map((await loadMissions()).map((m) => [m.id, m]));

  const missions = computeMissionProgress({
    completedSessionCount: sessions.length,
    bestOverallScore: bestScore,
    distinctTrackCount: distinctTracks.size,
    streakDays: streakResult.streakDays,
  });

  const completedMissions: MissionProgress[] = [];
  let bonusXp = 0;
  for (const m of missions) {
    const wasCompleted = previousMissions.get(m.id)?.completed ?? false;
    if (m.completed && !wasCompleted) {
      completedMissions.push(m);
      bonusXp += m.rewardXp;
    }
  }
  await saveMissions(missions);

  if (bonusXp > 0) {
    await recordXpEvent({ reason: 'mission_complete', amount: bonusXp, sessionId });
  }

  const authoritativeXp = await getTotalXp();
  const newLevel = levelForXp(authoritativeXp);

  return {
    xpEarned: breakdown.reduce((s, r) => s + r.amount, 0) + bonusXp,
    xpBreakdown: breakdown,
    streakDays: streakResult.streakDays,
    newLevel: newLevel > profile.level ? newLevel : undefined,
    completedMissions,
  };
}

/** Aggregated data for the Dashboard view. */
export async function getDashboardData(): Promise<{
  totalXp: number;
  level: number;
  nextLevelXp: number;
  completedSessions: number;
  completedLessonIds: Set<string>;
  missions: MissionProgress[];
}> {
  const [totalXp, sessions, missions] = await Promise.all([
    getTotalXp(),
    getCompletedSessions(),
    loadMissions(),
  ]);

  const distinctTracks = new Set(sessions.map((s) => s.trackId));
  const bestScore = sessions.reduce((m, s) => Math.max(m, s.overallScore ?? 0), 0);

  // Streak input of 0 here is safe: streak-based missions are refreshed by
  // recordSessionOutcome at the end of every session; this view only re-reads.
  const computed = computeMissionProgress({
    completedSessionCount: sessions.length,
    bestOverallScore: bestScore,
    distinctTrackCount: distinctTracks.size,
    streakDays: 0,
  });

  // Prefer persisted mission rows when present (they carry streak progress).
  const missionsView =
    missions.length > 0
      ? missions.map((m) => {
          const fallback = computed.find((c) => c.id === m.id);
          return fallback && fallback.type === 'streak' ? { ...m } : { ...m };
        })
      : computed;

  return {
    totalXp,
    level: levelForXp(totalXp),
    nextLevelXp: xpForNextLevel(totalXp),
    completedSessions: sessions.length,
    completedLessonIds: new Set(sessions.map((s) => s.lessonId)),
    missions: missionsView,
  };
}


