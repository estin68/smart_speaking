import { db, Session, TranscriptTurn, SessionMetrics } from './db';
import { DetailedEvaluation, MissionProgress, XpEvent } from '../types';

// ---------- Sessions ----------

export async function createSession(scenario: {
  id: string;
  trackId: string;
  title: string;
  userGoal: string;
  agentPersona: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}): Promise<number> {
  return await db.sessions.add({
    uuid: crypto.randomUUID(),
    timestamp: new Date(),
    scenarioId: scenario.id,
    lessonId: scenario.id,
    trackId: scenario.trackId,
    scenarioTitle: scenario.title,
    userGoal: scenario.userGoal,
    agentPersona: scenario.agentPersona,
    difficulty: scenario.difficulty,
    status: 'in_progress',
  });
}

export async function addTranscriptTurn(
  sessionId: number,
  speaker: 'user' | 'agent',
  text: string,
  wpm?: number,
  fillerWordCount?: number
): Promise<number> {
  return await db.transcriptTurns.add({
    sessionId,
    speaker,
    text,
    timestamp: Date.now(),
    wpm,
    fillerWordCount,
  });
}

/**
 * Marks a session completed and stores its evaluation.
 * `metrics` uses `&sessionId` as primary key so repeated evaluations
 * overwrite rather than violating a unique constraint.
 */
export async function completeSession(
  sessionId: number,
  evaluation: DetailedEvaluation
): Promise<void> {
  await db.transaction('rw', [db.sessions, db.metrics], async () => {
    await db.sessions.update(sessionId, {
      status: 'completed',
      overallScore: evaluation.overallScore,
      actionableTip: evaluation.actionableTip,
      suggestedAlternative: evaluation.suggestedAlternativePhrase,
    });

    const m = evaluation.metrics;
    const metrics: SessionMetrics = {
      sessionId,
      clarityScore: m.clarityScore,
      assertivenessScore: m.assertivenessScore,
      tactEmpathyScore: m.tactEmpathyScore,
      pacingRating: m.pacingRating,
      fillerFrequency: m.fillerFrequency,
    };
    await db.metrics.put(metrics);
  });
}

export async function abandonSession(sessionId: number): Promise<void> {
  await db.sessions.update(sessionId, { status: 'abandoned' });
}

export async function getFullSessionData(sessionId: number) {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const transcript: TranscriptTurn[] = await db.transcriptTurns
    .where('sessionId')
    .equals(sessionId)
    .sortBy('timestamp');

  const metrics = await db.metrics.where('sessionId').equals(sessionId).first();

  return { session, transcript, metrics };
}

/** All completed sessions, newest first. */
export async function getCompletedSessions(): Promise<Session[]> {
  const all = await db.sessions.where('status').equals('completed').toArray();
  return all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// ---------- Gamification storage ----------

export async function recordXpEvent(
  event: Omit<XpEvent, 'createdAt'> & { createdAt?: number }
): Promise<number> {
  return await db.xpEvents.add({ createdAt: Date.now(), ...event } as XpEvent);
}

export async function getXpEvents(limit = 50): Promise<XpEvent[]> {
  const events = await db.xpEvents.toArray();
  return events.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export async function getTotalXp(): Promise<number> {
  const events = await db.xpEvents.toArray();
  return events.reduce((sum, e) => sum + e.amount, 0);
}

export async function saveMissions(missions: MissionProgress[]): Promise<void> {
  await db.transaction('rw', db.missions, async () => {
    await db.missions.clear();
    await db.missions.bulkAdd(missions);
  });
}

export async function loadMissions(): Promise<MissionProgress[]> {
  return await db.missions.toArray();
}
