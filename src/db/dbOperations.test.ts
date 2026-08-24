// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addTranscriptTurn,
  completeSession,
  createSession,
  getCompletedSessions,
  getFullSessionData,
} from './dbOperations';
import { db } from './db';
import { DetailedEvaluationSchema } from '../types';

const evaluation = DetailedEvaluationSchema.parse({
  overallScore: 85,
  metrics: {
    clarityScore: 8,
    assertivenessScore: 9,
    tactEmpathyScore: 7,
    pacingRating: 'Optimal',
    fillerFrequency: 'Low',
  },
  keyStrengths: ['Clear structure'],
  improvementAreas: ['Slow down'],
  suggestedAlternativePhrase: 'Instead of X, say Y',
  actionableTip: 'Use BLUF',
});

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('dbOperations', () => {
  it('creates a session and adds turns', async () => {
    const id = await createSession({
      id: 'wp-deadline-pushback',
      trackId: 'workplace',
      title: 'Push Back on an Unrealistic Deadline',
      userGoal: 'Negotiate',
      agentPersona: 'Sarah',
      difficulty: 'beginner',
    });
    expect(id).toBeGreaterThan(0);

    const t1 = await addTranscriptTurn(id, 'agent', 'Right, let us crack on.');
    const t2 = await addTranscriptTurn(id, 'user', 'I need two more weeks.', 120, 1);
    expect(t1).toBeGreaterThan(0);
    expect(t2).toBeGreaterThan(0);

    const { transcript } = await getFullSessionData(id);
    expect(transcript).toHaveLength(2);
    expect(transcript[0].speaker).toBe('agent');
    expect(transcript[1].wpm).toBe(120);
  });

  it('marks sessions complete with metrics (idempotent re-evaluation)', async () => {
    const id = await createSession({
      id: 'hs-salary-negotiation',
      trackId: 'high-stakes',
      title: 'Negotiate Your Salary',
      userGoal: 'Get 8%',
      agentPersona: 'Margaret',
      difficulty: 'advanced',
    });

    await completeSession(id, evaluation);
    // Re-evaluating the same session must NOT throw (unique-constraint fix).
    await completeSession(id, { ...evaluation, overallScore: 90 });

    const { session, metrics } = await getFullSessionData(id);
    expect(session.status).toBe('completed');
    expect(session.overallScore).toBe(90);
    expect(metrics?.clarityScore).toBe(8);
  });

  it('lists completed sessions newest-first', async () => {
    const idA = await createSession({
      id: 'a', trackId: 'workplace', title: 'A', userGoal: '', agentPersona: '', difficulty: 'beginner',
    });
    // Session ordering uses the creation timestamp — space them out.
    await new Promise((r) => setTimeout(r, 10));
    const idB = await createSession({
      id: 'b', trackId: 'everyday', title: 'B', userGoal: '', agentPersona: '', difficulty: 'beginner',
    });
    await completeSession(idA, evaluation);
    await completeSession(idB, evaluation);

    const done = await getCompletedSessions();
    expect(done.map((s) => s.scenarioTitle)).toEqual(['B', 'A']);
  });
});
