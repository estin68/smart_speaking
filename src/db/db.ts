import Dexie, { Table } from 'dexie';
import { XpEvent } from '../types';
import type { MissionProgress } from '../types';

export interface Session {
  id?: number;
  uuid: string;
  timestamp: Date;
  scenarioId: string;
  lessonId: string;
  trackId: string;
  scenarioTitle: string;
  userGoal: string;
  agentPersona: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'in_progress' | 'completed' | 'abandoned';
  overallScore?: number;
  actionableTip?: string;
  suggestedAlternative?: string;
}

export interface TranscriptTurn {
  id?: number;
  sessionId: number;
  speaker: 'user' | 'agent';
  text: string;
  /** Epoch milliseconds — sortable & reliably storable across engines. */
  timestamp: number;
  wpm?: number;
  fillerWordCount?: number;
}

export interface SessionMetrics {
  /** Primary key — one metrics row per session, idempotent upserts. */
  sessionId: number;
  clarityScore: number;
  assertivenessScore: number;
  tactEmpathyScore: number;
  pacingRating: 'Too Fast' | 'Optimal' | 'Too Slow';
  fillerFrequency: 'Low' | 'Moderate' | 'High';
}

/** Persisted mission progress row; `id` is the mission definition id (string PK). */
export interface MissionRow extends MissionProgress {}

export class SpeakingAppDatabase extends Dexie {
  sessions!: Table<Session, number>;
  transcriptTurns!: Table<TranscriptTurn, number>;
  metrics!: Table<SessionMetrics, number>;
  xpEvents!: Table<XpEvent, number>;
  missions!: Table<MissionRow, string>;

  constructor() {
    super('SpeakingAppDB');
    this.version(1).stores({
      sessions:
        '++id, uuid, timestamp, status, overallScore, lessonId, trackId',
      transcriptTurns: '++id, sessionId, timestamp',
      // Primary key IS sessionId → one metrics row per session, put() is idempotent.
      metrics: '&sessionId',
      xpEvents: '++id, createdAt, sessionId, reason',
      missions: 'id',
    });
  }
}

export const db = new SpeakingAppDatabase();
