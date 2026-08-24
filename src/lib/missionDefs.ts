import { MissionDef } from '../types';

/**
 * Starter mission definitions. Progress is recomputed deterministically from
 * session history on every `recordSessionOutcome` / dashboard refresh.
 */
export const MISSION_DEFS: MissionDef[] = [
  {
    id: 'first-session',
    title: 'First Words',
    description: 'Complete your first speaking session',
    type: 'count',
    target: 1,
    rewardXp: 50,
  },
  {
    id: 'three-sessions',
    title: 'Getting Into It',
    description: 'Complete 3 speaking sessions',
    type: 'count',
    target: 3,
    rewardXp: 60,
  },
  {
    id: 'ten-sessions',
    title: 'Daily Habit',
    description: 'Complete 10 speaking sessions',
    type: 'count',
    target: 10,
    rewardXp: 150,
  },
  {
    id: 'streak-3',
    title: 'Hat-Trick',
    description: 'Practise 3 days in a row',
    type: 'streak',
    target: 3,
    rewardXp: 80,
  },
  {
    id: 'streak-7',
    title: 'Week Warrior',
    description: 'Practise 7 days in a row',
    type: 'streak',
    target: 7,
    rewardXp: 200,
  },
  {
    id: 'score-80',
    title: 'High Performer',
    description: 'Score 80 or above in any session',
    type: 'score',
    target: 80,
    rewardXp: 40,
  },
  {
    id: 'variety-3',
    title: 'Well-Rounded',
    description: 'Try lessons from all 3 tracks',
    type: 'variety',
    target: 3,
    rewardXp: 70,
  },
];
