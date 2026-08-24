/**
 * Scenario Simulator Agent — plays the roleplay counterpart.
 * Returns validated SimulatorOutput per turn.
 */
import { Scenario, SimulatorOutput, Turn, SimulatorOutputSchema } from '../../types';
import { chatJSON } from '../webllmClient';
import { buildSimulatorMessages, SimulatorContext } from '../prompts';

export async function runSimulatorTurn(params: {
  scenario: Scenario;
  currentStep: number;
  agentInternalEmotion: string;
  turns: Turn[];
  /** true when the session is starting — the agent opens the scene. */
  opening?: boolean;
}): Promise<SimulatorOutput> {
  const ctx: SimulatorContext = {
    agentPersona: params.scenario.agentPersona,
    userGoal: params.scenario.userGoal,
    scenarioTitle: params.scenario.title,
    currentStep: params.currentStep,
    maxSteps: params.scenario.maxSteps,
    agentInternalEmotion: params.agentInternalEmotion,
  };

  return await chatJSON(
    buildSimulatorMessages(
      ctx,
      params.turns.map((t) => ({ speaker: t.speaker, text: t.text })),
      params.opening ?? false
    ),
    SimulatorOutputSchema,
    { temperature: 0.8 }
  );
}
