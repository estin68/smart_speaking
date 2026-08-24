import { MissionProgress } from '../types';

export function MissionCard({ mission }: { mission: MissionProgress }) {
  const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
  return (
    <div className={`mission-card ${mission.completed ? 'completed' : ''}`}>
      <div className="mission-header">
        <strong>{mission.title}</strong>
        {mission.completed && <span className="badge badge-complete">Done</span>}
      </div>
      <p>{mission.description}</p>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <small>
        {mission.completed ? 'Completed' : `${mission.progress}/${mission.target}`} · +
        {mission.rewardXp} XP
      </small>
    </div>
  );
}
