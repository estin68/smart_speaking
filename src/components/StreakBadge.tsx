export function StreakBadge({ streakDays }: { streakDays: number }) {
  return (
    <div className={`streak-badge ${streakDays > 0 ? 'active' : ''}`}>
      <span className="streak-flame">{streakDays > 0 ? '🔥' : '💤'}</span>
      <span>{streakDays}-day streak</span>
    </div>
  );
}
