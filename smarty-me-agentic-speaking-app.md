# SmartyMe-Style Agentic Speaking Practice App Blueprint

This document contains the complete architectural plan, system prompts, schemas, workflow, and code implementations for building a zero-backend, client-side speaking practice web application designed for GitHub Pages hosting, local training progress persistence via IndexedDB, and structured Markdown exports for LLM/Agentic workflows.

---

## 1. High-Level Architecture Overview

```
                                  ┌─────────────────────────────────────┐
                                  │         GitHub Pages (SPA)          │
                                  │   (HTML/JS, Speech API, Marked)     │
                                  └──────────────────┬──────────────────┘
                                                     │
                       ┌─────────────────────────────┴─────────────────────────────┐
                       ▼                                                           ▼
┌─────────────────────────────┐                             ┌─────────────────────────────┐
│       IndexedDB (Dexie)     │                             │      Markdown Exporter      │
│  (Sessions, Audio Transcripts,│                             │   (Appends Frontmatter &    │
│   Scores & Metrics)         │                             │    Structured LLM Context)  │
└─────────────────────────────┘                             └──────────────┬──────────────┘
                                                                           │
                                                                           ▼
                                                            ┌─────────────────────────────┐
                                                            │    .md File Download        │
                                                            │ (Feed into Cursor / Claude) │
                                                            └─────────────────────────────┘
```

---

## 2. Agentic Architecture & System Prompts

```
                  ┌─────────────────────────────────────────┐
                  │            Orchestrator Agent           │
                  │   (Manages state, flow, session lifecycle)│
                  └────────────────────┬────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌───────────────┐              ┌───────────────┐              ┌───────────────┐
│ Scenario      │              │ Evaluator     │              │ Coach &       │
│ Simulator     │              │ Agent         │              │ Curriculum    │
│ Agent         │              │ (Analyst)     │              │ Agent         │
│ (Roleplay AI) │              └───────┬───────┘              └───────────────┘
└───────┬───────┘                      │
        │                              ▼
        │                      ┌───────────────┐
        │                      │ Speech & Tone │
        │                      │ Analysis Tool │
        │                      │ (STT / Pitch) │
        │                      └───────────────┘
        ▼
┌───────────────────────────────────────────────────────────────────┐
│                            User Client                            │
│                 (Real-time Voice/Text Interface)                  │
└───────────────────────────────────────────────────────────────────┘
```

### Pydantic State Schema (`schemas.py`)

```python
from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field

class TurnTranscript(BaseModel):
    speaker: Literal["user", "agent"]
    text: str
    timestamp: float
    wpm: Optional[float] = None
    filler_word_count: Optional[int] = None

class ScenarioContext(BaseModel):
    scenario_id: str
    scenario_title: str
    user_goal: str
    agent_persona: str
    difficulty_level: Literal["beginner", "intermediate", "advanced"] = "intermediate"
    current_step: int = 1
    max_steps: int = 6

class QuantitativeMetrics(BaseModel):
    clarity_score: int = Field(ge=1, le=10, description="1 to 10 scale")
    assertiveness_score: int = Field(ge=1, le=10, description="1 to 10 scale")
    tact_empathy_score: int = Field(ge=1, le=10, description="1 to 10 scale")
    pacing_rating: Literal["Too Fast", "Optimal", "Too Slow"]
    filler_word_frequency: Literal["Low", "Moderate", "High"]

class DetailedEvaluation(BaseModel):
    overall_score: int = Field(ge=1, le=100)
    metrics: QuantitativeMetrics
    key_strengths: List[str]
    improvement_areas: List[str]
    suggested_alternative_phrase: str = Field(
        description="A rewritten version of a weak turn showing how to express it better."
    )
    actionable_tip: str

class AgenticSessionState(BaseModel):
    session_id: str
    user_id: str
    scenario: ScenarioContext
    transcript: List[TurnTranscript] = []
    agent_internal_emotion: str = "Neutral"
    is_scenario_complete: bool = False
    final_evaluation: Optional[DetailedEvaluation] = None
```

### System Prompts

#### Scenario Simulator Agent Prompt
```text
Role & Objective:
You are an adaptive roleplay simulator acting as a specific counterpart in a real-world communication exercise. Your task is to play your assigned persona convincingly, react naturally to the user's communication choices, and guide the scenario towards its natural conclusion within the target turn limit.

Core Guidelines:
1. Stay Strictly in Character: Never break character or refer to yourself as an AI, tutor, or language model. Respond directly to what the user says.
2. Dynamic Reactivity: Adapt your attitude dynamically based on the user's assertiveness, tone, and tact. If the user is vague, press them for details. If they are overly aggressive, become defensive or firm.
3. Concise Conversational Turns: Keep responses under 3-4 sentences. Simulate natural spoken dialogue (use contractions and conversational pauses where appropriate).
4. Progressive Challenge: Push the user to achieve their scenario goal. Do not make it effortless; force them to apply active listening, clarity, and diplomacy.

Context Inputs Provided Per Turn:
- Persona: {agent_persona}
- User Goal: {user_goal}
- Scenario Context: {scenario_title}
- Current Step: Turn {current_step} of {max_steps}
- Current Internal Emotion State: {agent_internal_emotion}

Output Format (JSON strictly):
{
  "updated_internal_emotion": "<Brief descriptor of persona's current attitude, e.g., 'Slightly Impatient'>",
  "spoken_response": "<Your direct in-character vocal response to the user>",
  "is_concluded": false
}
```

#### Evaluator Agent Prompt
```text
Role & Objective:
You are an expert executive communication coach and speech analyst. Your job is to perform an objective, constructive, and highly actionable analysis of a user's roleplay transcript against the scenario's targets.

Evaluation Criteria:
- Clarity & Structure (1-10): How concise and structured was their point? Did they ramble?
- Assertiveness & Confidence (1-10): Did they state opinions firmly without being passive or aggressive?
- Tact & Empathy (1-10): How well did they handle pushback, acknowledge the counterpart's perspective, and maintain rapport?
- Constructive Coaching: Provide clear, concrete feedback without fluff. Always supply an improved alternative for their weakest statement.

Inputs Provided:
- Scenario Goal: {user_goal}
- Full Session Transcript: {transcript}

Output Format Constraint (JSON strictly):
{
  "overall_score": 82,
  "metrics": {
    "clarity_score": 8,
    "assertiveness_score": 7,
    "tact_empathy_score": 9,
    "pacing_rating": "Optimal",
    "filler_word_frequency": "Low"
  },
  "key_strengths": [
    "Acknowledged the counterpart's initial objection before stating your position.",
    "Maintained a calm, professional tone during conflict."
  ],
  "improvement_areas": [
    "Avoid starting responses with hedge phrases like 'I kind of think maybe...'",
    "Provide a concrete timeline when offering solution options."
  ],
  "suggested_alternative_phrase": "Instead of 'I guess we could try to push the deadline if that works for you', say 'To ensure quality, I propose extending the deadline by two days. Here is how we will manage the interim deliverables.'",
  "actionable_tip": "Focus on using the 'BLUF' (Bottom Line Up Front) method: state your core proposition in the first sentence before adding supporting details."
}
```

---

## 3. GitHub Actions Deployment Workflow

Save this file in your project repository at `.github/workflows/deploy.yml`:

```yaml
name: Deploy React Vite App to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    name: Build Vite Project
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build App
        run: npm run build

      - name: Upload GitHub Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    name: Deploy to GitHub Pages
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Vite Configuration (`vite.config.js`)
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/', // Match your GitHub repository name
})
```

---

## 4. Web Speech API React Hook (`useSpeechRecognition.ts`)

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = ({
  lang = 'en-US',
  continuous = true,
  interimResults = true,
  onResult,
  onError,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);

  const isSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentInterim = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          currentFinal += text;
        } else {
          currentInterim += text;
        }
      }

      if (currentFinal) {
        setFinalTranscript((prev) => {
          const updated = prev ? `${prev} ${currentFinal}` : currentFinal;
          if (onResult) onResult(updated, true);
          return updated;
        });
      }

      setInterimTranscript(currentInterim);

      setTranscript(() => {
        const combined = currentInterim ? `${finalTranscript} ${currentInterim}`.trim() : finalTranscript;
        if (onResult && currentInterim) onResult(combined, false);
        return combined;
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(event.error);
      if (onError) onError(event.error);
    };

    recognition.onend = () => {
      if (continuous && !isManuallyStoppedRef.current) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isSupported, continuous, interimResults, lang, onResult, onError, finalTranscript]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setError(null);
    isManuallyStoppedRef.current = false;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start speech recognition.');
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    isManuallyStoppedRef.current = true;
    try {
      recognitionRef.current.stop();
    } catch (err) {}
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setFinalTranscript('');
  }, []);

  return {
    isListening,
    transcript: (finalTranscript + ' ' + interimTranscript).trim(),
    interimTranscript,
    finalTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};
```

---

## 5. Dexie.js Local IndexedDB Implementation (`db.ts` & `dbOperations.ts`)

### `db.ts`
```typescript
import Dexie, { Table } from 'dexie';

export interface Session {
  id?: number;
  uuid: string;
  timestamp: Date;
  scenarioTitle: string;
  userGoal: string;
  agentPersona: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'in_progress' | 'completed';
  overallScore?: number;
  actionableTip?: string;
  suggestedAlternative?: string;
}

export interface TranscriptTurn {
  id?: number;
  sessionId: number;
  speaker: 'user' | 'agent';
  text: string;
  timestamp: Date;
  wpm?: number;
  fillerWordCount?: number;
}

export interface SessionMetrics {
  id?: number;
  sessionId: number;
  clarityScore: number;
  assertivenessScore: number;
  tactEmpathyScore: number;
  pacingRating: 'Too Fast' | 'Optimal' | 'Too Slow';
  fillerFrequency: 'Low' | 'Moderate' | 'High';
}

export class SpeakingAppDatabase extends Dexie {
  sessions!: Table<Session, number>;
  transcriptTurns!: Table<TranscriptTurn, number>;
  metrics!: Table<SessionMetrics, number>;

  constructor() {
    super('SpeakingAppDB');
    this.version(1).stores({
      sessions: '++id, uuid, timestamp, scenarioTitle, status, overallScore',
      transcriptTurns: '++id, sessionId, speaker, timestamp',
      metrics: '++id, &sessionId',
    });
  }
}

export const db = new SpeakingAppDatabase();
```

### `dbOperations.ts`
```typescript
import { db, Session, TranscriptTurn, SessionMetrics } from './db';

export async function createSession(
  scenarioTitle: string,
  userGoal: string,
  agentPersona: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): Promise<number> {
  return await db.sessions.add({
    uuid: crypto.randomUUID(),
    timestamp: new Date(),
    scenarioTitle,
    userGoal,
    agentPersona,
    difficulty,
    status: 'in_progress',
  });
}

export async function addTranscriptTurn(
  sessionId: number,
  speaker: 'user' | 'agent',
  text: string,
  wpm?: number,
  fillerWordCount?: number
): Promise<number> {
  return await db.transcriptTurns.add({
    sessionId,
    speaker,
    text,
    timestamp: new Date(),
    wpm,
    fillerWordCount,
  });
}

export async function completeSession(
  sessionId: number,
  evaluation: {
    overallScore: number;
    clarityScore: number;
    assertivenessScore: number;
    tactEmpathyScore: number;
    pacingRating: 'Too Fast' | 'Optimal' | 'Too Slow';
    fillerFrequency: 'Low' | 'Moderate' | 'High';
    actionableTip: string;
    suggestedAlternative: string;
  }
) {
  return await db.transaction('rw', [db.sessions, db.metrics], async () => {
    await db.sessions.update(sessionId, {
      status: 'completed',
      overallScore: evaluation.overallScore,
      actionableTip: evaluation.actionableTip,
      suggestedAlternative: evaluation.suggestedAlternative,
    });

    await db.metrics.put({
      sessionId,
      clarityScore: evaluation.clarityScore,
      assertivenessScore: evaluation.assertivenessScore,
      tactEmpathyScore: evaluation.tactEmpathyScore,
      pacingRating: evaluation.pacingRating,
      fillerFrequency: evaluation.fillerFrequency,
    });
  });
}

export async function getFullSessionData(sessionId: number) {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const transcript = await db.transcriptTurns
    .where('sessionId')
    .equals(sessionId)
    .sortBy('timestamp');

  const metrics = await db.metrics.where('sessionId').equals(sessionId).first();

  return {
    session,
    transcript,
    metrics,
  };
}
```

---

## 6. Markdown Exporter & Downloader Utility (`exportMarkdown.ts`)

```typescript
import { getFullSessionData } from './dbOperations';

export async function generateSessionMarkdown(sessionId: number): Promise<string> {
  const { session, transcript, metrics } = await getFullSessionData(sessionId);

  let markdown = `---
type: speaking_session_log
uuid: "${session.uuid}"
date: "${new Date(session.timestamp).toISOString()}"
scenario: "${session.scenarioTitle}"
overall_score: ${session.overallScore ?? 'N/A'}
---

# Speaking Session Report: ${session.scenarioTitle}

## Session Overview
- **Date & Time:** ${new Date(session.timestamp).toLocaleString()}
- **User Goal:** ${session.userGoal}
- **Agent Persona:** ${session.agentPersona}
- **Difficulty:** ${session.difficulty}
- **Overall Performance Score:** ${session.overallScore ?? 'N/A'}/100

`;

  if (metrics) {
    markdown += `## Quantitative Metrics
- **Clarity & Structure:** ${metrics.clarityScore}/10
- **Assertiveness:** ${metrics.assertivenessScore}/10
- **Tact & Empathy:** ${metrics.tactEmpathyScore}/10
- **Pacing:** ${metrics.pacingRating}
- **Filler Word Frequency:** ${metrics.fillerFrequency}

`;
  }

  if (session.actionableTip || session.suggestedAlternative) {
    markdown += `## Key Coaching Advice
- **Actionable Tip:** ${session.actionableTip}
- **Suggested Phrase Improvement:**
  > ${session.suggestedAlternative}

`;
  }

  markdown += `## Transcript Log

`;

  transcript.forEach((turn) => {
    const speakerLabel = turn.speaker === 'user' ? '**User**' : '**Simulator Agent**';
    const time = new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    markdown += `### ${speakerLabel} [${time}]
${turn.text}

`;
  });

  markdown += `---
> *Instructions for Claude / Cursor Agent:*
> Read this speaking practice log. Use the transcript and evaluation metrics above to update long-term user weakness tracking, generate tailored follow-up drills, or adjust difficulty for the next speaking session.
`;

  return markdown;
}

export function downloadMarkdownFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```
