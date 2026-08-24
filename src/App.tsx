import { useCallback, useEffect, useState } from 'react';
import { Scenario, UserProfile } from './types';
import { loadProfile } from './utils/profileStorage';
import { getDashboardData } from './lib/gamification';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useWebLLM } from './hooks/useWebLLM';
import { useSpeakingSession } from './hooks/useSpeakingSession';
import { ModelStatusBanner } from './components/ModelStatusBanner';
import { HistoryList } from './components/HistoryList';
import { SettingsPanel } from './components/SettingsPanel';
import {
  DashboardView,
  LessonsView,
  ResultsView,
  SessionView,
} from './views';

type View = 'dashboard' | 'lessons' | 'session' | 'results' | 'history' | 'settings';

interface DashboardData {
  totalXp: number;
  level: number;
  nextLevelXp: number;
  completedSessions: number;
  completedLessonIds: Set<string>;
  missions: import('./types').MissionProgress[];
}

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);

  const speech = useSpeechSynthesis();
  const webllm = useWebLLM();
  const session = useSpeakingSession(speech.speak);

  const refreshDashboard = useCallback(async () => {
    setProfile(loadProfile());
    const data = await getDashboardData();
    setDashboard(data as DashboardData);
  }, []);

  useEffect(() => {
    if (view === 'dashboard') refreshDashboard();
  }, [view, refreshDashboard]);

  // When a session completes, switch to the results screen.
  useEffect(() => {
    if (session.state.phase === 'complete') setView('results');
  }, [session.state.phase]);

  const startLesson = useCallback(
    (scenario: Scenario) => {
      setActiveScenario(scenario);
      setView('session');
      webllm
        .init()
        .catch(() => undefined) // banner shows the error; session start will retry
        .finally(() => session.startSession(scenario));
    },
    [webllm, session]
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => setView('dashboard')} role="button">
          🇬🇧 Smart Speaking
        </h1>
        <nav>
          <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            Dashboard
          </button>
          <button className={`nav-btn ${view === 'lessons' ? 'active' : ''}`} onClick={() => setView('lessons')}>
            Lessons
          </button>
          <button className={`nav-btn ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
            History
          </button>
          <button className={`nav-btn ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
            ⚙️
          </button>
        </nav>
      </header>

      <main className="app-main">
        {(view === 'session' || view === 'results') && webllm.status !== 'ready' && (
          <ModelStatusBanner
            status={webllm.status}
            progressPct={webllm.progressPct}
            progressText={webllm.progressText}
            error={webllm.error}
            onInit={() => webllm.init()}
          />
        )}

        {view === 'dashboard' &&
          (dashboard ? (
            <DashboardView
              profile={profile}
              data={dashboard}
              onStartLesson={startLesson}
              onBrowse={() => setView('lessons')}
            />
          ) : (
            <p className="muted">Loading…</p>
          ))}

        {view === 'lessons' && (
          <LessonsView
            completedLessonIds={dashboard?.completedLessonIds ?? new Set()}
            onStartLesson={startLesson}
          />
        )}

        {view === 'session' && activeScenario && (
          <SessionView
            scenario={activeScenario}
            state={session.state}
            onStart={() => session.startSession(activeScenario)}
            onSubmitTurn={(text, startedAt) =>
              session.finalizeUserTurn(activeScenario, text, startedAt)
            }
            onEndEarly={() => session.endAndEvaluate(activeScenario)}
            onAbort={async () => {
              speech.cancel();
              await session.abort();
              setView('dashboard');
            }}
          />
        )}

        {view === 'results' && activeScenario && session.state.evaluation && (
          <ResultsView
            scenario={activeScenario}
            state={session.state}
            onDone={async () => {
              await refreshDashboard();
              setView('dashboard');
            }}
          />
        )}

        {view === 'history' && <HistoryList />}

        {view === 'settings' && (
          <SettingsPanel profile={profile} onProfileChange={setProfile} speech={speech} />
        )}
      </main>
    </div>
  );
}
