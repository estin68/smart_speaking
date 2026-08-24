/**
 * Runtime-validated domain types (Zod).
 * Mirrors schemas.py — the Python file remains a design reference only.
 */
import { z } from 'zod';

// ---------- Core session types ----------

export const TurnSchema = z.object({
  speaker: z.enum(['user', 'agent']),
  text: z.string().min(1),
  /** Epoch milliseconds. */
  timestamp: z.number(),
  wpm: z.number().optional(),
  fillerWordCount: z.number().optional(),
});
export type Turn = z.infer<typeof TurnSchema>;

export const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const ScenarioSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  title: z.string(),
  userGoal: z.string(),
  agentPersona: z.string(),
  difficulty: DifficultySchema,
  maxSteps: z.number().int().min(2).max(12).default(6),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

// ---------- Agent output contracts ----------

export const SimulatorOutputSchema = z.object({
  updatedInternalEmotion: z.string().min(1),
  spokenResponse: z.string().min(1),
  isConcluded: z.boolean(),
});
export type SimulatorOutput = z.infer<typeof SimulatorOutputSchema>;

export const PacingRatingSchema = z.enum(['Too Fast', 'Optimal', 'Too Slow']);
export const FillerFrequencySchema = z.enum(['Low', 'Moderate', 'High']);

export const QuantitativeMetricsSchema = z.object({
  clarityScore: z.number().int().min(1).max(10),
  assertivenessScore: z.number().int().min(1).max(10),
  tactEmpathyScore: z.number().int().min(1).max(10),
  pacingRating: PacingRatingSchema,
  fillerFrequency: FillerFrequencySchema,
});

export const DetailedEvaluationSchema = z.object({
  overallScore: z.number().int().min(1).max(100),
  metrics: QuantitativeMetricsSchema,
  keyStrengths: z.array(z.string()).min(1),
  improvementAreas: z.array(z.string()).min(1),
  suggestedAlternativePhrase: z.string().min(1),
  actionableTip: z.string().min(1),
});
export type DetailedEvaluation = z.infer<typeof DetailedEvaluationSchema>;
export type QuantitativeMetrics = z.infer<typeof QuantitativeMetricsSchema>;

// ---------- Gamification types ----------

export const XpReasonSchema = z.enum([
  'session_complete',
  'high_score',
  'new_lesson',
  'streak_milestone',
  'mission_complete',
]);
export type XpReason = z.infer<typeof XpReasonSchema>;

export const XpEventSchema = z.object({
  amount: z.number().int().positive(),
  reason: XpReasonSchema,
  sessionId: z.number().optional(),
  createdAt: z.number(), // epoch ms
});
export type XpEvent = z.infer<typeof XpEventSchema>;

export const MissionTypeSchema = z.enum(['count', 'streak', 'score', 'variety']);

export const MissionDefSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: MissionTypeSchema,
  target: z.number().int().positive(),
  rewardXp: z.number().int().positive(),
});
export type MissionDef = z.infer<typeof MissionDefSchema>;

/** A mission definition joined with live progress, persisted in the missions table. */
export interface MissionProgress extends MissionDef {
  progress: number;
  completed: boolean;
}

export interface UserProfile {
  displayName: string;
  totalXp: number;
  level: number;
  streakDays: number;
  lastSessionDate: string | null; // YYYY-MM-DD in local time
}

export interface SessionOutcome {
  xpEarned: number;
  xpBreakdown: Array<{ reason: XpReason; amount: number }>;
  streakDays: number;
  newLevel?: number;
  completedMissions: MissionProgress[];
}
