/**
 * Top-level view components: Dashboard, LessonSelect, Session, Results.
 */
import { useEffect, useRef, useState } from 'react';
import { MissionProgress, Scenario, UserProfile } from './types';
import { SCENARIOS, TRACKS, getScenariosByTrack } from './data/scenarios';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import type { SpeakingSessionState } from './hooks/useSpeakingSession';
import { XpBar } from './components/XpBar';
import { StreakBadge } from './components/StreakBadge';
import { MissionCard } from './components/MissionCard';
import { ScenarioCard } from './components/ScenarioCard';
import { TranscriptView } from './components/TranscriptView';
import { ScoreRadar } from './components/ScoreRadar';

// ---------- Dashboard ----------

export function DashboardView(props: {
  profile: UserProfile;
  data: {
    totalXp: number;
    level: number;
    nextLevelXp: number;
    completedSessions: number;
    missions: MissionProgress[];
    completedLessonIds: Set<string>;
  };
  onStartLesson: (s: Scenario) => void;
  onBrowse: () => void;
}) {
  const { profile, data } = props;

  // "Today's Mission" — first uncompleted lesson, else a random one.
  const nextLesson =
    SCENARIOS.find((s) => !data.completedLessonIds.has(s.id)) ??
    SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];

  return (
    <div className="dashboard">
      <section className="hero-card">
        <h2>Welcome back, {profile.displayName}</h2>
        <p className="muted">5–10 minutes today keeps your British English sharp.</p>
        <div className="dashboard-stats">
          <XpBar totalXp={data.totalXp} level={data.level} nextLevelXp={data.nextLevelXp} />
          <StreakBadge streakDays={profile.streakDays} />
          <div className="stat-chip">
            <strong>{data.completedSessions}</strong> sessions
          </div>
        </div>
        {nextLesson && (
          <div className="today-mission">
            <small>TODAY'S MISSION</small>
            <h3>{nextLesson.title}</h3>
            <button
              className="btn btn-primary btn-large"
              onClick={() => props.onStartLesson(nextLesson)}
            >
              🎙️ Start speaking
            </button>
            <button className="btn" onClick={props.onBrowse}>
              Browse all lessons
            </button>
          </div>
        )}
      </section>

      <section>
        <h3>Missions</h3>
        <div className="mission-grid">
          {data.missions.map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------- Lessons ----------

export function LessonsView(props: {
  completedLessonIds: Set<string>;
  onStartLesson: (s: Scenario) => void;
}) {
  return (
    <div className="lessons-view">
      <h2>Lessons</h2>
      {TRACKS.map((track) => (
        <section key={track.id} className="track-section">
          <h3>
            {track.emoji} {track.title}
          </h3>
          <p className="muted">{track.description}</p>
          <div className="scenario-grid">
            {getScenariosByTrack(track.id).map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                completed={props.completedLessonIds.has(scenario.id)}
                onStart={props.onStartLesson}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------- Session ----------

export function SessionView(props: {
  scenario: Scenario;
  state: SpeakingSessionState;
  onStart: () => void;
  onSubmitTurn: (text: string, startedAtMs?: number) => void;
  onEndEarly: () => void;
  onAbort: () => void;
}) {
  const { scenario, state } = props;
  const [sttBlocked, setSttBlocked] = useState(false);
  const recognition = useSpeechRecognition({
    lang: 'en-GB',
    onError: (err) => {
      // Chrome's SpeechRecognition streams audio to Google servers —
      // "network"/"service-not-allowed" mean the service is unreachable
      // (common outside supported regions). Fall back to typing.
      if (err === 'network' || err === 'service-not-allowed') {
        setSttBlocked(true);
      }
    },
  });
  const [textFallback, setTextFallback] = useState('');
  const startedAtRef = useRef<number | undefined>(undefined);

  const stopAndSubmit = () => {
    recognition.stopListening();
    const text = recognition.finalTranscript || recognition.transcript;
    if (text.trim()) {
      props.onSubmitTurn(text, startedAtRef.current);
      recognition.resetTranscript();
    }
    startedAtRef.current = undefined;
  };

  const useMic = recognition.isSupported && !sttBlocked;

  const busy =
    state.phase === 'agent-thinking' ||
    state.phase === 'initializing-model' ||
    state.phase === 'evaluating';

  return (
    <div className="session-view">
      <header className="session-header">
        <div>
          <h2>{scenario.title}</h2>
          <p className="muted">{scenario.userGoal}</p>
        </div>
        <div className="session-meta">
          <span className="badge">
            Turn {Math.max(1, state.currentStep)}/{scenario.maxSteps}
          </span>
          {state.agentEmotion !== 'Neutral' && (
            <span className="badge badge-emotion">🙂 {state.agentEmotion}</span>
          )}
          <button className="btn btn-small" onClick={props.onAbort}>✕ Quit</button>
        </div>
      </header>

      {state.phase === 'idle' && (
        <div className="session-start">
          <button className="btn btn-primary btn-large" onClick={props.onStart}>
            Begin roleplay
          </button>
        </div>
      )}

      {state.phase === 'initializing-model' && (
        <p className="muted">
          Warming up the local AI model… (first run downloads it once, then it's cached)
        </p>
      )}
      {state.phase === 'agent-thinking' && (
        <p className="muted">Your counterpart is responding…</p>
      )}
      {state.phase === 'evaluating' && (
        <p className="muted">Your coach is reviewing the conversation…</p>
      )}
      {state.phase === 'error' && (
        <div className="banner banner-error">
          ⚠️ {state.error}{' '}
          <button className="btn" onClick={props.onAbort}>Back to dashboard</button>
        </div>
      )}

      <TranscriptView turns={state.turns} />

      {state.phase === 'listening' && recognition.isListening && (
        <div className="live-transcript" aria-live="polite">
          <span className="live-label">🔴 Listening</span>
          {recognition.transcript ? (
            <>
              <span className="live-final">{recognition.finalTranscript}</span>
              <span className="live-interim">{recognition.interimTranscript}</span>
            </>
          ) : (
            <span className="muted">Start talking — your words appear here…</span>
          )}
        </div>
      )}

      {state.phase === 'listening' && (
        <footer className="session-controls">
          {sttBlocked && (
            <div className="banner banner-info" style={{ width: '100%', marginBottom: 0 }}>
              🎙️ Speech recognition isn't reachable from your network (Chrome sends mic audio to
              Google's servers). <strong>Type your replies below</strong> for now — or try the
              Microsoft Edge browser, whose speech service works in more regions. Speaking practice
              still counts: read your reply aloud before sending!
            </div>
          )}
          {useMic ? (
            <>
              <button
                className={`mic-btn ${recognition.isListening ? 'recording' : ''}`}
                onClick={() => {
                  if (recognition.isListening) {
                    stopAndSubmit();
                  } else {
                    startedAtRef.current = Date.now();
                    recognition.startListening();
                  }
                }}
                title={recognition.isListening ? 'Stop & send' : 'Start speaking'}
              >
                {recognition.isListening ? '⏹ Send' : '🎤 Speak'}
              </button>
              <small className="muted">
                {recognition.isListening
                  ? 'Listening… click again when you finish your turn.'
                  : 'Click the mic, make your point, then click again to send.'}
              </small>
              {recognition.error && recognition.error !== 'network' && (
                <small className="error-text">Mic error: {recognition.error}</small>
              )}
            </>
          ) : (
            <form
              className="text-fallback"
              onSubmit={(e) => {
                e.preventDefault();
                if (textFallback.trim()) {
                  props.onSubmitTurn(textFallback, Date.now() - 30000);
                  setTextFallback('');
                }
              }}
            >
              <input
                value={textFallback}
                onChange={(e) => setTextFallback(e.target.value)}
                placeholder={
                  sttBlocked || !recognition.isSupported
                    ? 'Type what you would say aloud…'
                    : 'Speech recognition unavailable — type your reply…'
                }
              />
              <button className="btn btn-primary" type="submit">Send</button>
            </form>
          )}

          <button
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => {
              recognition.stopListening();
              props.onEndEarly();
            }}
          >
            End & get feedback
          </button>
        </footer>
      )}
    </div>
  );
}

// ---------- Results ----------

export function ResultsView(props: {
  scenario: Scenario;
  state: SpeakingSessionState;
  onDone: () => void;
}) {
  const { evaluation, outcome } = props.state;
  if (!evaluation) return null;
  const m = evaluation.metrics;

  return (
    <div className="results-view">
      <h2>Session Complete 🎉</h2>

      {outcome && outcome.xpEarned > 0 && (
        <div className="xp-celebration">
          <span className="xp-big">+{outcome.xpEarned} XP</span>
          {outcome.newLevel && (
            <span className="badge badge-complete">Level up! Lv {outcome.newLevel}</span>
          )}
          <ul className="xp-breakdown">
            {outcome.xpBreakdown.map((r, i) => (
              <li key={i}>
                {r.reason.replace(/_/g, ' ')}: +{r.amount}
              </li>
            ))}
            {outcome.completedMissions.map((mi) => (
              <li key={mi.id}>
                🏆 Mission complete — {mi.title}: +{mi.rewardXp}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="results-grid">
        <div className="results-scorecard">
          <div className="overall-score">
            <strong>{evaluation.overallScore}</strong>/100
          </div>
          <ScoreRadar metrics={m} />
          <ul className="metric-list">
            <li>Clarity & Structure: <strong>{m.clarityScore}/10</strong></li>
            <li>Assertiveness: <strong>{m.assertivenessScore}/10</strong></li>
            <li>Tact & Empathy: <strong>{m.tactEmpathyScore}/10</strong></li>
            <li>Pacing: <strong>{m.pacingRating}</strong></li>
            <li>Filler words: <strong>{m.fillerFrequency}</strong></li>
          </ul>
        </div>

        <div className="results-feedback">
          <h4>💪 Key strengths</h4>
          <ul>{evaluation.keyStrengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <h4>🎯 Improvement areas</h4>
          <ul>{evaluation.improvementAreas.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <h4>✍️ Try this instead</h4>
          <blockquote>{evaluation.suggestedAlternativePhrase}</blockquote>
          <h4>💡 Actionable tip</h4>
          <p><strong>{evaluation.actionableTip}</strong></p>
        </div>
      </div>

      <button className="btn btn-primary btn-large" onClick={props.onDone}>
        Back to dashboard
      </button>
    </div>
  );
}



