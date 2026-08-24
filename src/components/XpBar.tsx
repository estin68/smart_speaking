interface Props {
  totalXp: number;
  level: number;
  nextLevelXp: number;
}

export function XpBar({ totalXp, level, nextLevelXp }: Props) {
  const currentLevelStart = 50 * (level - 1) * (level - 1);
  const pct =
    nextLevelXp > currentLevelStart
      ? Math.min(
          100,
          Math.round(((totalXp - currentLevelStart) / (nextLevelXp - currentLevelStart)) * 100)
        )
      : 100;
  return (
    <div className="xp-bar">
      <div className="xp-bar-header">
        <span className="level-badge">Lv {level}</span>
        <span>{totalXp} XP</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <small>
        {Math.max(0, nextLevelXp - totalXp)} XP to level {level + 1}
      </small>
    </div>
  );
}
