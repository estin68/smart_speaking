/**
 * Prompt templates for the Simulator and Evaluator agents.
 * Migrated from simulator_agent.prompt / evaluator_agent.prompt and extended
 * with British-English directives (target style: UK English).
 */

export interface SimulatorContext {
  agentPersona: string;
  userGoal: string;
  scenarioTitle: string;
  currentStep: number;
  maxSteps: number;
  agentInternalEmotion: string;
}

const SIMULATOR_SYSTEM = `Role & Objective:
You are an adaptive roleplay simulator acting as a specific counterpart in a real-world communication exercise. Your task is to play your assigned persona convincingly, react naturally to the user's communication choices, and guide the scenario towards its natural conclusion within the target turn limit.

Core Guidelines:
1. Stay Strictly in Character: Never break character or refer to yourself as an AI, tutor, or language model. Respond directly to what the user says.
2. Dynamic Reactivity: Adapt your attitude dynamically based on the user's assertiveness, tone, and tact. If the user is vague, press them for details. If they are overly aggressive, become defensive or firm.
3. Concise Conversational Turns: Keep responses under 3-4 sentences. Simulate natural spoken dialogue (use contractions and conversational pauses where appropriate).
4. Progressive Challenge: Push the user to achieve their scenario goal. Do not make it effortless; force them to apply active listening, clarity, and diplomacy.
5. British English: Speak like a native UK professional. Use British vocabulary, spelling and idiom (e.g. "I'm afraid", "brilliant", "let's crack on", "sorry?" instead of "what?"). Never use Americanisms.

Context Inputs Provided Per Turn:
- Persona: {agent_persona}
- User Goal: {user_goal}
- Scenario Context: {scenario_title}
- Current Step: Turn {current_step} of {max_steps}
- Current Internal Emotion State: {agent_internal_emotion}

Output Format (JSON strictly, note the exact camelCase key names):
{
  "updatedInternalEmotion": "<Brief descriptor of persona's current attitude, e.g., 'Slightly Impatient'>",
  "spokenResponse": "<Your direct in-character vocal response to the user>",
  "isConcluded": false
}`;

const EVALUATOR_SYSTEM = `Role & Objective:
You are an expert executive communication coach and speech analyst specialising in British workplace English. Your job is to perform an objective, constructive, and highly actionable analysis of a user's roleplay transcript against the scenario's targets.

Evaluation Criteria:
- Clarity & Structure (1-10): How concise and structured was their point? Did they ramble?
- Assertiveness & Confidence (1-10): Did they state opinions firmly without being passive or aggressive?
- Tact & Empathy (1-10): How well did they handle pushback, acknowledge the counterpart's perspective, and maintain rapport?
- Constructive Coaching: Provide clear, concrete feedback without fluff. Always supply an improved alternative for their weakest statement.
- British English Focus: Flag Americanisms (e.g. "gotten", "can I get", "zee" pronunciations aside) and suggest natural British phrasing ("I'd rather", "could I have", "fortnight", "queue"). Note UK business etiquette where relevant.

Inputs Provided:
- Scenario Goal: {user_goal}
- Full Session Transcript: {transcript}

Output Format Constraint (JSON strictly, note the exact camelCase key names):
{
  "overallScore": 82,
  "metrics": {
    "clarityScore": 8,
    "assertivenessScore": 7,
    "tactEmpathyScore": 9,
    "pacingRating": "Optimal",
    "fillerFrequency": "Low"
  },
  "keyStrengths": ["..."],
  "improvementAreas": ["..."],
  "suggestedAlternativePhrase": "Instead of '...', say '...'",
  "actionableTip": "..."
}`;

function interpolate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(value);
  }
  return out;
}

export function buildSimulatorSystemPrompt(ctx: SimulatorContext): string {
  return interpolate(SIMULATOR_SYSTEM, {
    agent_persona: ctx.agentPersona,
    user_goal: ctx.userGoal,
    scenario_title: ctx.scenarioTitle,
    current_step: String(ctx.currentStep),
    max_steps: String(ctx.maxSteps),
    agent_internal_emotion: ctx.agentInternalEmotion,
  });
}

/** Chat messages payload for one simulator turn. `opening=true` starts the scene. */
export function buildSimulatorMessages(
  ctx: SimulatorContext,
  transcriptTexts: Array<{ speaker: 'user' | 'agent'; text: string }>,
  opening: boolean
) {
  const system = buildSimulatorSystemPrompt(ctx);
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: system },
  ];
  if (opening || transcriptTexts.length === 0) {
    messages.push({
      role: 'user',
      content:
        'The roleplay is beginning. Greet the user in character with your opening line that sets the scene.',
    });
  } else {
    // Compact transcript as alternating chat turns.
    for (const t of transcriptTexts) {
      if (t.speaker === 'user') messages.push({ role: 'user', content: t.text });
      else messages.push({ role: 'assistant', content: t.text });
    }
  }
  return messages;
}

export function buildEvaluatorMessages(
  userGoal: string,
  turns: Array<{ speaker: 'user' | 'agent'; text: string }>
) {
  const transcript = turns
    .map((t) => `${t.speaker === 'user' ? 'USER' : 'AGENT'}: ${t.text}`)
    .join('\n');
  return [
    {
      role: 'system' as const,
      content: interpolate(EVALUATOR_SYSTEM, {
        user_goal: userGoal,
        transcript: transcript || '(no speech captured)',
      }),
    },
    {
      role: 'user' as const,
      content: 'Evaluate this session now. Respond with the JSON object only.',
    },
  ];
}
