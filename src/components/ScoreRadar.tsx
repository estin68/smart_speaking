import { QuantitativeMetrics } from '../types';

interface Props {
  metrics: QuantitativeMetrics;
}

/** Hand-rolled SVG radar chart for the three 1–10 communication axes. */
export function ScoreRadar({ metrics }: Props) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = 80;

  // Three axes: clarity (top), assertiveness (bottom-right), tact (bottom-left).
  const angles = [-90, 30, 150].map((deg) => (deg * Math.PI) / 180);
  const values = [
    metrics.clarityScore,
    metrics.assertivenessScore,
    metrics.tactEmpathyScore,
  ];

  const point = (angle: number, value: number) => {
    const r = (value / 10) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const dataPoints = angles.map((a, i) => point(a, values[i]).join(','));
  const polygon = dataPoints.join(' ');

  const gridPolygon = angles.map((a) => point(a, 10).join(',')).join(' ');
  const midPolygons = [3, 5, 8]
    .map(
      (v) => `<polygon points="${angles.map((a) => point(a, v).join(',')).join(' ')}"
        fill="none" stroke="#e2e8f0" stroke-width="1" />`
    )
    .join('');

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <polygon points="${gridPolygon}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
      ${midPolygons}
      <line x1="${cx}" y1="${cy}" x2="${angles[0] && cx + radius * Math.cos(angles[0])}" y2="${
        cy + radius * Math.sin(angles[0])
      }" stroke="#e2e8f0" />
      <polygon points="${polygon}" fill="rgba(59,130,246,0.35)" stroke="#2563eb" stroke-width="2" />
      ${dataPoints
        .map((p) => {
        const [x, y] = p.split(',');
          return `<circle cx="${x}" cy="${y}" r="4" fill="#2563eb" />`;
        })
        .join('')}
      <text x="${cx}" y="${cy - radius - 12}" text-anchor="middle" font-size="11" fill="#475569">Clarity</text>
      <text x="${cx + radius + 6}" y="${cy + radius * Math.sin(angles[1]) + 18}" font-size="11" fill="#475569">Assertive</text>
      <text x="${cx - radius - 46}" y="${cy + radius * Math.sin(angles[2]) + 18}" font-size="11" fill="#475569">Tact</text>
    </svg>`;

  return (
    <div className="score-radar" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
