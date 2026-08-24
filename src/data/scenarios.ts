import { Scenario } from '../types';

export interface Track {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

export const TRACKS: Track[] = [
  {
    id: 'workplace',
    title: 'Workplace Communication',
    description: 'Handle everyday professional moments with clarity and confidence.',
    emoji: '💼',
  },
  {
    id: 'high-stakes',
    title: 'High-Stakes Conversations',
    description: 'Practise the difficult chats where composure matters most.',
    emoji: '🔥',
  },
  {
    id: 'everyday',
    title: 'Everyday Confidence',
    description: 'Build natural, friendly British English for daily life.',
    emoji: '☕',
  },
];

/**
 * 12 starter lessons — British-English workplace & daily-life scenarios.
 * Personas speak UK English; goals are phrased as the user's mission in the roleplay.
 */
export const SCENARIOS: Scenario[] = [
  // ---------- Track: Workplace Communication ----------
  {
    id: 'wp-deadline-pushback',
    trackId: 'workplace',
    title: 'Push Back on an Unrealistic Deadline',
    userGoal:
      "Your manager has asked for a full report by Friday but you know it needs at least two more weeks of data collection. Negotiate a realistic deadline while showing you care about quality. Offer a compromise.",
    agentPersona:
      "Sarah, a direct and busy London-based product manager who is under pressure from stakeholders. She respects pushback when it comes with a plan, but gets impatient with vague excuses.",
    difficulty: 'beginner',
    maxSteps: 6,
  },
  {
    id: 'wp-disagree-manager',
    trackId: 'workplace',
    title: 'Disagree With Your Manager\u2019s Plan',
    userGoal:
      "Your manager wants to launch the campaign next Monday. You believe it is rushed and will damage the brand. Disagree respectfully but firmly — acknowledge their view first, then present your reasoning and an alternative.",
    agentPersona:
      "James, a confident marketing director from Manchester who is enthusiastic about his plan. He listens to well-reasoned arguments but dismisses wishy-washy hedging.",
    difficulty: 'intermediate',
    maxSteps: 6,
  },
  {
    id: 'wp-delegate-task',
    trackId: 'workplace',
    title: 'Delegate a Task Clearly',
    userGoal:
      "You need to hand over a monthly reporting task to a colleague who already feels overloaded. Explain the task clearly, agree on a timeline, and keep them motivated rather than resentful.",
    agentPersona:
      "Priya, a capable but stretched analyst who says yes to everything then quietly burns out. She hints at being busy rather than saying it outright.",
    difficulty: 'beginner',
    maxSteps: 5,
  },
  {
    id: 'wp-critical-feedback',
    trackId: 'workplace',
    title: 'Give Critical Peer Feedback',
    userGoal:
      "A teammate keeps missing the code-review SLA and it is blocking your team. Give honest, specific feedback that protects the relationship and lands on a concrete agreement.",
    agentPersona:
      "Tom, a friendly senior developer who gets slightly defensive about criticism of his work ethic but genuinely wants to do well.",
    difficulty: 'intermediate',
    maxSteps: 6,
  },

  // ---------- Track: High-Stakes Conversations ----------
  {
    id: 'hs-salary-negotiation',
    trackId: 'high-stakes',
    title: 'Negotiate Your Salary',
    userGoal:
      "In your annual review you have been offered a 3% rise. You believe your market rate and this year's delivery justify 8%. Make your case confidently with evidence, handle counter-offers, and stay gracious whatever the outcome.",
    agentPersona:
      "Margaret, a composed HR director from Edinburgh who follows process closely, probes for justification, and rewards well-prepared candidates with genuine engagement.",
    difficulty: 'advanced',
    maxSteps: 7,
  },
  {
    id: 'hs-billing-dispute',
    trackId: 'high-stakes',
    title: 'Resolve an Angry Customer Complaint',
    userGoal:
      "A customer was double-charged and has been waiting two weeks for a refund. Stay calm, de-escalate, take ownership, and commit to a concrete resolution without over-promising.",
    agentPersona:
      "Dave, a frustrated customer who starts angry and sarcastic but calms down quickly when he feels genuinely heard. He escalates if fobbed off.",
    difficulty: 'intermediate',
    maxSteps: 6,
  },
  {
    id: 'hs-project-failure-apology',
    trackId: 'high-stakes',
    title: 'Own Up to a Missed Milestone',
    userGoal:
      "A migration you led failed overnight and some client data was delayed. Inform your stakeholder before they hear it elsewhere: be accountable, explain briefly what happened, and present the recovery plan.",
    agentPersona:
      "Elaine, a no-nonsense operations director who values honesty delivered early and hates surprises. She asks pointed questions about prevention.",
    difficulty: 'advanced',
    maxSteps: 6,
  },
  {
    id: 'hs-vendor-pushback',
    trackId: 'high-stakes',
    title: 'Push Back on a Vendor Price Rise',
    userGoal:
      "Your long-term supplier has announced a 12% price increase mid-contract. Challenge the increase professionally, ask for justification, and negotiate better terms or concessions.",
    agentPersona:
      "Robert, a smooth account manager who deflects with corporate language and needs firm, specific questioning to move on price.",
    difficulty: 'advanced',
    maxSteps: 7,
  },

  // ---------- Track: Everyday Confidence ----------
  {
    id: 'ev-networking-smalltalk',
    trackId: 'everyday',
    title: 'Small Talk at a Networking Event',
    userGoal:
      "You are at a Manchester tech meetup knowing nobody. Start a conversation with a stranger, find common ground, keep it flowing naturally, and exit gracefully with a contact exchange.",
    agentPersona:
      "Chloe, a chatty UX designer who is warm but easily distracted; she engages more when the other person asks her good questions.",
    difficulty: 'beginner',
    maxSteps: 5,
  },
  {
    id: 'ev-landlord-call',
    trackId: 'everyday',
    title: 'Phone Call About a Broken Boiler',
    userGoal:
      "Your boiler has broken in winter and the letting agency keeps delaying. Phone the agency, describe the issue clearly, assert your tenant rights politely, and get a firm repair date.",
    agentPersona:
      "Ian, a harried lettings coordinator who tries to fob callers off with 'we'll log it' until pushed for specifics and timelines.",
    difficulty: 'intermediate',
    maxSteps: 5,
  },
  {
    id: 'ev-present-idea',
    trackId: 'everyday',
    title: 'Present an Idea in a Meeting',
    userGoal:
      "Pitch a simple improvement (a shared team wiki) to colleagues in under a minute. Lead with the bottom line, give two supporting reasons, invite questions, and handle one sceptical response.",
    agentPersona:
      "Nadia, a pragmatic team lead who likes ideas that save time and challenges anything that sounds like extra admin.",
    difficulty: 'beginner',
    maxSteps: 5,
  },
  {
    id: 'ev-flatmate-conflict',
    trackId: 'everyday',
    title: 'Resolve a Flatmate Conflict',
    userGoal:
      "Your flatmate has repeatedly left washing-up and their music is loud late at night. Raise both issues without turning it into an argument, and agree concrete house rules.",
    agentPersona:
      "Ollie, a laid-back postgrad who avoids conflict, gets sheepish rather than aggressive, and agrees to things but needs specifics to follow through.",
    difficulty: 'beginner',
    maxSteps: 5,
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getScenariosByTrack(trackId: string): Scenario[] {
  return SCENARIOS.filter((s) => s.trackId === trackId);
}
