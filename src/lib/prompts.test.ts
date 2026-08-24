import { describe, expect, it } from 'vitest';
import { buildEvaluatorMessages, buildSimulatorMessages, buildSimulatorSystemPrompt } from './prompts';
import { SimulatorOutputSchema, DetailedEvaluationSchema } from '../types';
import { SCENARIOS } from '../data/scenarios';

const scenario = SCENARIOS[0];

describe('simulator prompt', () => {
  it('interpolates all placeholders', () => {
    const prompt = buildSimulatorSystemPrompt({
      agentPersona: scenario.agentPersona,
      userGoal: scenario.userGoal,
      scenarioTitle: scenario.title,
      currentStep: 2,
      maxSteps: scenario.maxSteps,
      agentInternalEmotion: 'Slightly Impatient',
    });
    expect(prompt).not.toMatch(/\{[a-z_]+\}/); // no unfilled placeholders
    expect(prompt).toContain(scenario.agentPersona);
    expect(prompt).toContain('Turn 2');
    expect(prompt).toContain('Slightly Impatient');
  });

  it('includes the British-English directive', () => {
    const prompt = buildSimulatorSystemPrompt({
      agentPersona: 'x',
      userGoal: 'y',
      scenarioTitle: 'z',
      currentStep: 1,
      maxSteps: 5,
      agentInternalEmotion: 'Neutral',
    });
    expect(prompt).toMatch(/British English/i);
  });

  it('builds an opening message when opening=true', () => {
    const messages = buildSimulatorMessages(
      {
        agentPersona: 'p',
        userGoal: 'g',
        scenarioTitle: 't',
        currentStep: 1,
        maxSteps: 6,
        agentInternalEmotion: 'Neutral',
      },
      [],
      true
    );
    expect(messages[0].role).toBe('system');
    expect(messages[messages.length - 1].content).toMatch(/beginning|opening/i);
  });

  it('maps transcript to alternating chat turns', () => {
    const turns = [
      { speaker: 'agent' as const, text: 'Hello there.' },
      { speaker: 'user' as const, text: 'Hi, I want to discuss the deadline.' },
    ];
    const messages = buildSimulatorMessages(
      {
        agentPersona: 'p',
        userGoal: 'g',
        scenarioTitle: 't',
        currentStep: 2,
        maxSteps: 6,
        agentInternalEmotion: 'Neutral',
      },
      turns,
      false
    );
    // system + agent->assistant + user->user
    expect(messages).toHaveLength(3);
    expect(messages[1]).toEqual({ role: 'assistant', content: 'Hello there.' });
    expect(messages[2]).toEqual({
      role: 'user',
      content: 'Hi, I want to discuss the deadline.',
    });
  });
});

describe('evaluator prompt', () => {
  it('embeds the goal and full transcript', () => {
    const [system] = buildEvaluatorMessages('Get more time', [
      { speaker: 'user', text: 'I need two weeks.' },
      { speaker: 'agent', text: 'That is not ideal.' },
    ]);
    expect(system.content).toContain('Get more time');
    expect(system.content).toContain('USER: I need two weeks.');
    expect(system.content).toContain('AGENT: That is not ideal.');
  });
});

describe('agent output schemas accept reference outputs', () => {
  it('validates a simulator response', () => {
    const parsed = SimulatorOutputSchema.parse({
      updatedInternalEmotion: 'Slightly Impatient',
      spokenResponse: 'Go on then, convince me.',
      isConcluded: false,
    });
    expect(parsed.spokenResponse).toContain('convince');
  });

  it('rejects malformed simulator output', () => {
    expect(() =>
      SimulatorOutputSchema.parse({ emotion: 'x', reply: 'y' })
    ).toThrow();
  });

  it('validates a full evaluator response', () => {
    const parsed = DetailedEvaluationSchema.parse({
      overallScore: 82,
      metrics: {
        clarityScore: 8,
        assertivenessScore: 7,
        tactEmpathyScore: 9,
        pacingRating: 'Optimal',
        fillerFrequency: 'Low',
      },
      keyStrengths: ['a'],
      improvementAreas: ['b'],
      suggestedAlternativePhrase: 'c',
      actionableTip: 'd',
    });
    expect(parsed.overallScore).toBe(82);
  });
});
