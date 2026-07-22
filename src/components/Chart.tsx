// Minimal dependency-free SVG line chart used across Trends.

interface Series {
  label: string
  color: string
  points: { x: number; y: number }[] // x = day index, y = value
  dots?: boolean
}

interface Props {
  series: Series[]
  height?: number
  yLabel?: string
  xLabels?: { x: number; label: string }[]
}

export default function Chart({ series, height = 220, yLabel, xLabels }: Props) {
  const all = series.flatMap((s) => s.points)
  if (all.length === 0) {
    return <div className="chart-empty">No data yet</div>
  }

  const pad = { top: 16, right: 12, bottom: 26, left: 44 }
  const width = 640
  const xs = all.map((p) => p.x)
  const ys = all.map((p) => p.y)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  let yMin = Math.min(...ys)
  let yMax = Math.max(...ys)
  if (yMin === yMax) {
    yMin -= 1
    yMax += 1
  }
  const yPad = (yMax - yMin) * 0.1
  yMin -= yPad
  yMax += yPad

  const sx = (x: number) =>
    pad.left + ((x - xMin) / Math.max(1e-9, xMax - xMin)) * (width - pad.left - pad.right)
  const sy = (y: number) =>
    pad.top + (1 - (y - yMin) / (yMax - yMin)) * (height - pad.top - pad.bottom)

  // ~4 horizontal gridlines at round-ish values
  const gridYs: number[] = []
  const step = niceStep((yMax - yMin) / 4)
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) gridYs.push(v)

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart">
        {gridYs.map((v) => (
          <g key={v}>
            <line x1={pad.left} x2={width - pad.right} y1={sy(v)} y2={sy(v)} className="chart-grid" />
            <text x={pad.left - 6} y={sy(v) + 4} textAnchor="end" className="chart-tick">
              {formatTick(v)}
            </text>
          </g>
        ))}
        {xLabels?.map(({ x, label }) => (
          <text key={x} x={sx(x)} y={height - 8} textAnchor="middle" className="chart-tick">
            {label}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.label}>
            {s.points.length > 1 && (
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
              />
            )}
            {(s.dots || s.points.length === 1) &&
              s.points.map((p, i) => (
                <circle
                  key={i}
                  cx={sx(p.x)}
                  cy={sy(p.y)}
                  r={3}
                  fill="var(--panel)"
                  stroke={s.color}
                  strokeWidth={1.8}
                />
              ))}
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        {yLabel && <span className="chart-ylabel">{yLabel}</span>}
        {series.map((s) => (
          <span key={s.label} className="chart-legend-item">
            <span className="chart-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function niceStep(rough: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1e-9, rough))))
  const n = rough / pow
  const nice = n >= 5 ? 5 : n >= 2 ? 2 : 1
  return nice * pow
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 100) / 10}k`
  return `${Math.round(v * 10) / 10}`
}
