/**
 * Evaluator Agent — executive communication coach scoring the transcript.
 * Returns a validated DetailedEvaluation.
 */
import { DetailedEvaluation, DetailedEvaluationSchema, Scenario, Turn } from '../../types';
import { chatJSON } from '../webllmClient';
import { buildEvaluatorMessages } from '../prompts';

export async function evaluateTranscript(params: {
  scenario: Scenario;
  turns: Turn[];
}): Promise<DetailedEvaluation> {
  return await chatJSON(
    buildEvaluatorMessages(
      params.scenario.userGoal,
      params.turns.map((t) => ({ speaker: t.speaker, text: t.text }))
    ),
    DetailedEvaluationSchema,
    { temperature: 0.3, maxTokens: 900 }
  );
}
