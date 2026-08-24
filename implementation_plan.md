# Implementation Plan

## [Overview]

Build **SmartyMe-style Agentic Speaking Practice App**: a zero-backend React SPA hosted on GitHub Pages where users practice real-world conversations against an LLM roleplay counterpart, receive structured communication coaching, track progress locally in IndexedDB, and export session logs as Markdown for external LLM workflows.

**Key architectural decisions (confirmed with user):**
1. **Fully offline LLM intelligence** — Simulator and Evaluator agents run a small local model in-browser via **WebLLM (`@mlc-ai/web-llm`)** on WebGPU; weights cache after first download.
2. **TTS enabled** — agent replies spoken via browser `speechSynthesis` with configurable voice/rate.
3. Speech input uses Web Speech API STT (existing hook).

**Scope:** Scaffold the full Vite + React + TS app around the existing loose drafts (repo currently has no `package.json`, no `src/`, no git history), fix known draft bugs, and implement the orchestrator state machine, agent clients, scenario catalog, TTS, speech metrics, and all UI screens. Out of scope: cloud sync, accounts, curriculum-generation agent (v2), non-Chromium browser STT fallbacks.

**Platform priority (confirmed with user):** Desktop-first. The default 3B WebLLM model targets desktop-class hardware; mobile usage (smaller model auto-selection, iOS Safari quirks) is explicitly deferred as a future enhancement — the text-input fallback keeps the app usable on unsupported devices without dedicated tuning.

**Feature decisions (round 2, confirmed with user):**
1. **Repo/deploy:** GitHub user `estin68`; remote `https://github.com/estin68/smart_speaking.git`; `vite.config.ts` `base: '/smart_speaking/'`.
2. **Daily 5–10 min habit:** one scenario ≈ 6 turns ≈ 5–10 minutes. Home screen shows a "Today's Mission" quick-start card.
3. **Gamification:** XP points, levels, daily-streak tracking, and missions ("Complete 3 sessions this week", "Score 80+ clarity", "Try 3 different tracks") persisted locally; results screen shows points earned.
4. **UK English target (Asia accent → British style):** STT `lang='en-GB'`, TTS defaults to an `en-GB` voice, Simulator personas use British workplace English, Evaluator flags Americanisms and suggests British phrasing alternatives.
5. **No authentication (decision):** data is device-local IndexedDB, so auth adds backend complexity with no benefit for v1. Instead: a lightweight local profile (display name) + JSON export/import for backup/device migration. Revisit only if cross-device sync or leaderboards are wanted later.
6. **Core loop UX:** Dashboard (XP/streak/missions) → choose lesson from track list → guided session → results screen (scores + XP awarded + lesson marked ✅) → back to Dashboard.
7. **Lesson catalog size:** 12 lessons in 3 themed tracks of 4 (Workplace Communication / High-Stakes Conversations / Everyday Confidence) — see `src/data/scenarios.ts`.

## [Types]

All runtime-validated types live in `src/types/index.ts` using **Zod** (mirrors `schemas.py`, which stays as a reference-only spec):

- `TurnSchema` → `{ speaker: 'user'|'agent', text: string, timestamp: number /*epoch ms*/, wpm?: number, fillerWordCount?: number }`
- `ScenarioSchema` → `{ id, title, userGoal, agentPersona, difficulty: 'beginner'|'intermediate'|'advanced', maxSteps }`
- `SimulatorOutputSchema` → `{ updatedInternalEmotion: string, spokenResponse: string, isConcluded: boolean }` — validates WebLLM JSON per-turn
- `EvaluationSchema` → `{ overallScore (1–100), metrics { clarityScore, assertivenessScore, tactEmpathyScore (1–10), pacingRating: 'Too Fast'|'Optimal'|'Too Slow', fillerFrequency: 'Low'|'Moderate'|'High' }, keyStrengths: string[], improvementAreas: string[], suggestedAlternativePhrase: string, actionableTip: string }`

Derived TS types via `z.infer`: `Turn`, `Scenario`, `SimulatorOutput`, `DetailedEvaluation`.

Session orchestration types in `src/hooks/useSpeakingSession.ts`:

```typescript
type SessionPhase = 'idle' | 'initializing-model' | 'ready' | 'listening'
                  | 'agent-thinking' | 'agent-speaking' | 'evaluating' | 'complete' | 'error';

interface SessionState {
  phase: SessionPhase;
  sessionId?: number;        // Dexie auto-increment id
  turns: Turn[];
  agentEmotion: string;
  currentStep: number;
  maxSteps: number;
  evaluation?: DetailedEvaluation;
  error?: string;
}
```

DB interfaces in `src/db/db.ts` change from the draft: `TranscriptTurn.timestamp` becomes `number` (epoch ms — sortable and reliably storable; IndexedDB `Date` handling is inconsistent), and `SessionMetrics` drops its surrogate `id?` field in favor of `'&sessionId'` as primary key. Two additional tables join schema v1 (no upgrade path needed pre-release): `xpEvents` (`++id, createdAt, sessionId, reason`) and `missions` (`id` string primary key — seeded definitions store live progress). `Session` gains optional `lessonId` and `trackId` fields linking to the catalog.

Gamification types in `src/types/index.ts` + logic in `src/lib/gamification.ts`:

```typescript
XpEventSchema   // { amount:number, reason:'session_complete'|'high_score'|'new_lesson'|'streak'|'mission', sessionId?:number, createdAt:number }
MissionSchema   // { id:string, title:string, description:string,
                //    type:'count'|'streak'|'score'|'variety', target:number,
                //    progress:number, completed:boolean, rewardXp:number }
UserProfile     // localStorage 'smarty.profile': { displayName:string, totalXp:number,
                //    level:number, streakDays:number, lastSessionDate:string|null }
```
Level curve: `level = floor(sqrt(totalXp / 50)) + 1` (simple, tunable).

## [Files]

**Project scaffold (new):** `package.json`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.gitignore`, `README.md`, and `vite.config.ts` (replaces root `vite.config.js`; `base: '/smart_speaking/'`, remote `https://github.com/estin68/smart_speaking.git`).

**New application files:**
- `src/main.tsx`, `src/App.tsx` — entry + lightweight hash-based view switching (Dashboard / LessonSelect / Session / Results / History / Settings); no router dependency needed
- `src/types/index.ts` — Zod schemas above
- `src/lib/webllmClient.ts` — WebLLM engine singleton: lazy init, default model `Llama-3.2-3B-Instruct-q4f16_1-MLC` (small/fast first load; user-selectable), download-progress callback, and `chatJSON(systemPrompt, userPayload, zodSchema)` that passes the schema as WebLLM's `response_format` constraint and returns parsed+validated output
- `src/lib/prompts.ts` — migrated + interpolated prompt templates from `simulator_agent.prompt` / `evaluator_agent.prompt`, extended with British-English directives (persona speaks British workplace English; evaluator flags Americanisms and suggests UK phrasing)
- `src/lib/agents/simulatorAgent.ts` — per-turn context builder → validated `SimulatorOutput`
- `src/lib/agents/evaluatorAgent.ts` — transcript payload → validated `DetailedEvaluation`
- `src/lib/gamification.ts` — pure functions: XP rules, level curve, streak calculation (calendar-day based, local timezone), mission progress evaluation against recent sessions; seeded mission definitions
- `src/hooks/useWebLLM.ts` — engine status/init/download-progress for UI
- `src/hooks/useSpeechSynthesis.ts` — speak/cancel, voice list, persisted `{voiceURI, rate, pitch}` settings (defaults to an `en-GB` voice when available)
- `src/utils/speechMetrics.ts` — `countFillerWords(text)` (um, uh, like, you know, basically, actually, sort of…), `computeWpm(text, durationMs)`
- `src/utils/yamlEscape.ts` — frontmatter escaping helper
- `src/utils/profileStorage.ts` — local profile + JSON export/import (auth replacement)
- `src/data/scenarios.ts` — 12 lessons in 3 tracks of 4: **Workplace Communication** (push back on deadline, disagree with manager, delegate a task, critical peer feedback), **High-Stakes Conversations** (salary negotiation, angry customer/billing dispute, project-failure apology, vendor pushback), **Everyday Confidence** (UK networking small talk, phone call with UK landlord/doctor reception, present an idea in a meeting, flatmate conflict). Each lesson: `{ id, trackId, title, titleUk?, userGoal, agentPersona, difficulty, maxSteps }`
- `src/components/`: `ScenarioCard`, `MicButton`, `LiveTranscript`, `ChatBubble`, `ModelStatusBanner`, `ScoreRadar` (hand-rolled SVG), `HistoryList`, `SettingsPanel`, `TodayMissionCard`, `XpBar`, `StreakBadge`, `MissionCard`, `LessonTrackSection`, `ProfilePanel`
- `src/styles.css` — plain CSS

**Migrated (moved into `src/`) with modifications:** `useSpeechRecognition.ts` → `src/hooks/`; `db.ts`, `dbOperations.ts` → `src/db/`; `exportMarkdown.ts` → `src/utils/`. Original root-level drafts deleted after migration. `schemas.py`, `*.prompt`, and the blueprint `.md` remain untouched as design references. `.github/workflows/deploy.yml` kept as-is (already correct for Vite).

## [Functions]

**Rewritten — `useSpeechRecognition` (`src/hooks/useSpeechRecognition.ts`).** Fixes the draft's effect-churn bug: the recognition instance is created **once** on mount; `lang/continuous/interimResults/onResult/onError` are held in refs refreshed by a separate lightweight effect; final results accumulate in a ref instead of being a state dependency. Public API unchanged (`isListening`, `transcript`, `interimTranscript`, `finalTranscript`, `isSupported`, `error`, `startListening`, `stopListening`, `resetTranscript`). This removes the current behavior where the recognizer is destroyed/recreated after every utterance and the stale-closure read of `finalTranscript` inside `setTranscript`.

**New — `useSpeechSynthesis(options?)` (`src/hooks/useSpeechSynthesis.ts`).** `{ speak(text): void, cancel(): void, speaking: boolean, voices: SpeechSynthesisVoice[], settings, updateSettings }`.

**New — `useWebLLM()` (`src/hooks/useWebLLM.ts`).** `{ status: 'uninitialized'|'loading'|'ready'|'error', progressPct: number, init(modelId?): Promise<void>, error }`. Backed by the singleton in `webllmClient.ts` so remounts never re-download.

**New — Orchestrator hook `useSpeakingSession(scenario)` (`src/hooks/useSpeakingSession.ts`).**
- `startSession()` — persists session row via `createSession`, ensures WebLLM ready (phase `initializing-model`), requests the Simulator Agent's opening line, speaks it, → `listening`
- `finalizeUserTurn(text, startedAt)` — computes wpm/filler metrics, persists user `Turn`, calls Simulator Agent with transcript + emotion + step context, persists agent `Turn`, updates `agentEmotion`, speaks reply; advances `currentStep` or concludes on `isConcluded`
- `endAndEvaluate()` → `evaluating` → calls Evaluator Agent → persists via `completeSession` → phase `complete`
- `abort()` — stops mic/TTS, leaves DB row as `in_progress`

**Modified — `completeSession(sessionId, evaluation)` (`src/db/dbOperations.ts`).** With `metrics` keyed on `&sessionId` primary key, `put` becomes idempotent (re-evaluation overwrites rather than throwing a unique-constraint error).

**Modified — `generateSessionMarkdown(sessionId)` (`src/utils/exportMarkdown.ts`).** Escape all frontmatter interpolations via `yamlEscape`; include per-turn wpm/filler stats when present.

**New — gamification functions (`src/lib/gamification.ts`).**
- `recordSessionOutcome(sessionId, evaluation, lesson)` — writes `XpEvent`s per rule table (base completion 20 XP; overall ≥80 bonus 30; first-time lesson bonus 15; streak milestone 10×day), updates missions progress, returns `{ xpEarned, newBadges, levelUp? }` for the results screen
- `updateStreak(profile, today)` — increments or resets daily streak by calendar date
- `getDashboardData()` — aggregates profile + recent xpEvents + missions + completed-lesson set from DB for the Dashboard view

**New — `useSpeakingSession` integration.** After `endAndEvaluate()` completes, the orchestrator calls `recordSessionOutcome(...)` so the Results screen renders scores and XP together.

**Removed —** nothing beyond root-level duplicates of migrated files.

## [Classes]

- **`SpeakingAppDatabase extends Dexie` (`src/db/db.ts`, modified).** Schema v1 changes: `metrics: '&sessionId'` as primary key (unique by construction); all other indexes unchanged. Since there are no deployed users yet, no upgrade path needed — ship correct schema at version 1.
- **`WebLLMClient` (new singleton module, `src/lib/webllmClient.ts`).** Not a React class; module-level lazy `MLCEngine` with `init`, `chatJSON(systemPrompt, payload, zodSchema)`. Zod schemas converted to JSON Schema via `.zodToJsonSchema()` for WebLLM structured output.
- **Agent modules** (`simulatorAgent.ts`, `evaluatorAgent.ts`) — pure functions over the client, one exported function each: `runSimulatorTurn(state, userText)` and `evaluateTranscript(scenario, turns)`.
- No classes removed.

## [Dependencies]

New `package.json` (npm):

| Package | Purpose |
|---|---|
| `react`, `react-dom` (^18) | UI framework |
| `typescript`, `vite`, `@vitejs/plugin-react` | build toolchain |
| `dexie` (^4) | IndexedDB wrapper |
| `zod` (^3) + `zod-to-json-schema` | runtime validation of LLM output; JSON Schema for WebLLM structured output |
| `@mlc-ai/web-llm` | in-browser LLM engine (WebGPU) |

Dev: `vitest`, `@testing-library/react`, `jsdom`, `fake-indexeddb`. No CSS framework, no router, no chart lib.

**Runtime constraints to document in README:** WebGPU required for the agents (Chrome/Edge 113+); Web Speech API STT is Chromium-only — Firefox/Safari users get a text-input fallback and an explicit unsupported banner. First-run model download is ~0.7–2GB depending on selected model.

## [Testing]

- **Unit (`*.test.ts` via vitest):**
  - `src/utils/speechMetrics.test.ts` — filler-word counting edge cases (substring traps like "likely", multi-word fillers), WPM math
  - `src/utils/yamlEscape.test.ts` / exporter test — quotes/newlines/colons in titles produce parseable frontmatter
  - `src/db/dbOperations.test.ts` — with `fake-indexeddb`: create → add turns → complete twice (idempotency fix) → `getFullSessionData`
  - `src/lib/gamification.test.ts` — XP rule table, level curve boundaries, streak increment/reset across day boundaries, mission completion triggers
  - `src/utils/profileStorage.test.ts` — profile persistence + JSON export/import round-trip
  - `src/lib/prompts.test.ts` — template interpolation fills all `{placeholders}`
  - Zod schema tests — valid sample JSON from the `.prompt` files passes; malformed LLM output rejected
- **Component smoke tests:** App view switching, MicButton disabled states.
- **Manual validation checklist (README):** `npm run dev` on Chrome; simulate full session with a small model; confirm TTS speaks, IndexedDB rows persist across reload, Markdown export downloads and parses as valid YAML frontmatter.

## [Implementation Order]

1. **Scaffold:** git init + remote `https://github.com/estin68/smart_speaking.git`; `package.json`, tsconfigs, `index.html`, `vite.config.ts` (`base: '/smart_speaking/'`), `.gitignore`; install deps; verify `npm run dev`.
2. **Types & data:** `src/types/index.ts` (Zod: turn/scenario/simulator/evaluation/XP/mission), `src/data/scenarios.ts` (12 lessons, 3 tracks), `src/lib/gamification.ts` (pure logic) with unit tests.
3. **Persistence layer:** migrate + fix `src/db/db.ts` (add `xpEvents`, `missions`, `lessonId/trackId`) & `src/db/dbOperations.ts`; db unit tests.
4. **Utilities:** `speechMetrics.ts`, `yamlEscape.ts`, migrated+fixed `exportMarkdown.ts`, `profileStorage.ts`; unit tests.
5. **Speech hooks:** rewritten `useSpeechRecognition.ts` (`en-GB` default), new `useSpeechSynthesis.ts` (prefer `en-GB` voice).
6. **LLM layer:** `webllmClient.ts`, `useWebLLM.ts`, `prompts.ts` (with British-English directives), both agent modules; prompt interpolation + schema validation tests (mock engine).
7. **Orchestrator:** `useSpeakingSession.ts` wiring DB + agents + speech hooks + `recordSessionOutcome` into the state machine.
8. **UI:** components + styles; views in order — Dashboard (`TodayMissionCard`, `XpBar`, `StreakBadge`, `MissionCard`) → LessonSelect (`LessonTrackSection`) → Session → Results (scores + XP earned) → History → Settings (`SettingsPanel`, `ProfilePanel`).
9. **Cleanup & docs:** delete root-level draft duplicates; README (browser support, first-run model download note, UK-English focus, deploy instructions, export/import backup guide).
10. **Verify & ship:** full vitest pass; manual end-to-end session on Chrome; commit + push to `estin68/smart_speaking`; confirm GitHub Pages build passes and app loads at `https://estin68.github.io/smart_speaking/`.



