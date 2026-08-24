/**
 * The Orchestrator — session state machine wiring DB, agents, STT metrics,
 * TTS and gamification into one lifecycle.
 */
import { useCallback, useRef, useState } from 'react';
import { DetailedEvaluation, Scenario, SessionOutcome, Turn } from '../types';
import {
  abandonSession,
  addTranscriptTurn,
  completeSession,
  createSession,
} from '../db/dbOperations';
import { runSimulatorTurn } from '../lib/agents/simulatorAgent';
import { evaluateTranscript } from '../lib/agents/evaluatorAgent';
import { recordSessionOutcome } from '../lib/gamification';
import { computeWpm, countFillerWords } from '../utils/speechMetrics';
import { loadProfile, saveProfile } from '../utils/profileStorage';
import { ensureEngine } from '../lib/webllmClient';

export type SessionPhase =
  | 'idle'
  | 'initializing-model'
  | 'agent-thinking'
  | 'listening'
  | 'evaluating'
  | 'complete'
  | 'error';

export interface SpeakingSessionState {
  phase: SessionPhase;
  sessionId?: number;
  turns: Turn[];
  agentEmotion: string;
  currentStep: number;
  maxSteps: number;
  scenarioEnded: boolean;
  evaluation?: DetailedEvaluation;
  outcome?: SessionOutcome;
  error?: string;
}

const INITIAL_STATE: SpeakingSessionState = {
  phase: 'idle',
  turns: [],
  agentEmotion: 'Neutral',
  currentStep: 0,
  maxSteps: 6,
  scenarioEnded: false,
};

function todayString(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function useSpeakingSession(onSpeak?: (text: string) => void) {
  const [state, setState] = useState<SpeakingSessionState>(INITIAL_STATE);

  // Ref mirror for imperative reads inside async callbacks.
  const stateRef = useRef(state);
  stateRef.current = state;

  const speakRef = useRef(onSpeak);
  speakRef.current = onSpeak;
  const busyRef = useRef(false);

  /** Runs one agent turn (opening or reply), persists it, speaks it. */
  const runAgentTurn = useCallback(
    async (
      scenario: Scenario,
      sessionId: number,
      turnsSoFar: Turn[],
      step: number,
      emotion: string,
      opening: boolean
    ) => {
      const output = await runSimulatorTurn({
        scenario,
        currentStep: step,
        agentInternalEmotion: emotion,
        turns: turnsSoFar,
        opening,
      });

      await addTranscriptTurn(sessionId, 'agent', output.spokenResponse);

      const agentTurn: Turn = {
        speaker: 'agent',
        text: output.spokenResponse,
        timestamp: Date.now(),
      };
      speakRef.current?.(output.spokenResponse);
      return { output, turns: [...turnsSoFar, agentTurn] };
    },
    []
  );

  /** Starts a new practice session for the given scenario. */
  const startSession = useCallback(
    async (scenario: Scenario) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setState({
        ...INITIAL_STATE,
        phase: 'initializing-model',
        maxSteps: scenario.maxSteps,
      });
      try {
        // Ensure the local model is warm before creating the session row.
        await ensureEngine();

        const sessionId = await createSession(scenario);
        setState((s) => ({ ...s, sessionId }));

        setState((s) => ({ ...s, phase: 'agent-thinking' }));
        const { output, turns } = await runAgentTurn(
          scenario,
          sessionId,
          [],
          1,
          'Neutral',
          true
        );

        setState((s) => ({
          ...s,
          phase: 'listening',
          turns,
          agentEmotion: output.updatedInternalEmotion,
          currentStep: 1,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          phase: 'error',
          error: err instanceof Error ? err.message : String(err),
        }));
      } finally {
        busyRef.current = false;
      }
    },
    [runAgentTurn]
  );

  /** Submits the user's spoken turn and gets the counterpart's response. */
  const finalizeUserTurn = useCallback(
    async (scenario: Scenario, text: string, startedAtMs?: number) => {
      if (busyRef.current || !text.trim()) return;
      busyRef.current = true;

      const { sessionId, turns: turnsSoFar, agentEmotion, currentStep } =
        stateRef.current;

      try {
        if (!sessionId) throw new Error('No active session');
        setState((s) => ({ ...s, phase: 'agent-thinking' }));

        const durationMs = startedAtMs ? Date.now() - startedAtMs : 0;
        const userTurn: Turn = {
          speaker: 'user',
          text: text.trim(),
          timestamp: Date.now(),
          wpm: computeWpm(text, durationMs),
          fillerWordCount: countFillerWords(text),
        };
        await addTranscriptTurn(
          sessionId,
          'user',
          userTurn.text,
          userTurn.wpm,
          userTurn.fillerWordCount
        );
        const withUser = [...turnsSoFar, userTurn];
        setState((s) => ({ ...s, turns: withUser, phase: 'agent-thinking' }));

        const nextStep = currentStep + 1;
        const stepsExhausted = nextStep >= scenario.maxSteps;

        const { output, turns } = await runAgentTurn(
          scenario,
          sessionId,
          withUser,
          Math.min(nextStep, scenario.maxSteps),
          agentEmotion,
          false
        );

        const ended = output.isConcluded || stepsExhausted;
        setState((s) => ({
          ...s,
          phase: ended ? 'evaluating' : 'listening',
          turns,
          agentEmotion: output.updatedInternalEmotion,
          currentStep: Math.min(nextStep, scenario.maxSteps),
          scenarioEnded: ended,
        }));

        if (ended) {
          busyRef.current = false;
          await endAndEvaluate(scenario);
          return;
        }
      } catch (err) {
        setState((s) => ({
          ...s,
          phase: 'error',
          error: err instanceof Error ? err.message : String(err),
        }));
      } finally {
        busyRef.current = false;
      }
    },
    [runAgentTurn]
  );

  /** Ends the roleplay, runs the Evaluator Agent and gamification. */
  const endAndEvaluate = useCallback(async (scenario: Scenario) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const { sessionId, turns } = stateRef.current;
      if (!sessionId) throw new Error('No active session');
      setState((s) => ({ ...s, phase: 'evaluating' }));

      const evaluation = await evaluateTranscript({ scenario, turns });
      await completeSession(sessionId, evaluation);

      const profile = loadProfile();
      const outcome = await recordSessionOutcome({
        sessionId,
        lessonId: scenario.id,
        trackId: scenario.trackId,
        evaluation,
        profile,
      });

      saveProfile({
        ...profile,
        totalXp: profile.totalXp + outcome.xpEarned,
        level: outcome.newLevel ?? profile.level,
        streakDays: outcome.streakDays,
        lastSessionDate: todayString(),
      });

      setState((s) => ({ ...s, phase: 'complete', evaluation, outcome }));
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'error',
        error: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      busyRef.current = false;
    }
  }, []);

  /** Aborts the session without evaluation. */
  const abort = useCallback(async () => {
    const { sessionId } = stateRef.current;
    if (sessionId) {
      try {
        await abandonSession(sessionId);
      } catch {
        /* ignore */
      }
    }
    window.speechSynthesis?.cancel();
    setState(INITIAL_STATE);
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, startSession, finalizeUserTurn, endAndEvaluate, abort, reset };
}
