import { Scenario } from '../types';
import { Track } from '../data/scenarios';

interface Props {
  scenario: Scenario;
  track?: Track;
  completed: boolean;
  onStart: (scenario: Scenario) => void;
}

export function ScenarioCard({ scenario, track, completed, onStart }: Props) {
  return (
    <div className={`scenario-card ${completed ? 'completed' : ''}`}>
      <div className="scenario-card-header">
        <h4>{scenario.title}</h4>
        {completed && <span className="badge badge-complete">✅ Done</span>}
      </div>
      <p className="scenario-goal">{scenario.userGoal}</p>
      <div className="scenario-footer">
        <span className={`badge difficulty-${scenario.difficulty}`}>
          {scenario.difficulty}
        </span>
        <span className="badge">{scenario.maxSteps} turns</span>
        <span className="badge">~5 min</span>
        {track && (
          <span className="badge">
            {track.emoji} {track.title}
          </span>
        )}
        <button className="btn btn-primary" onClick={() => onStart(scenario)}>
          Start
        </button>
      </div>
    </div>
  );
}
