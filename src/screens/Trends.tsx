import { useMemo, useState } from 'react'
import type { AppData, CheckIn } from '../types'
import Chart from '../components/Chart'
import { estimateTdee, exerciseHistory, kgToLb, weightTrend } from '../engine'

// All history in one place: weight trend, calories, how you've been feeling,
// and strength progress per exercise.

export default function Trends({ data }: { data: AppData }) {
  const imperial = data.settings.units === 'imperial'

  // Shared x-axis: days since the earliest data point.
  const dayIndex = useMemo(() => makeDayIndex(data), [data])

  const trend = weightTrend(data.weights)
  const weightSeries = trend.map((t) => ({
    x: dayIndex(t.date),
    scale: imperial ? kgToLb(t.scaleKg) : t.scaleKg,
    trend: imperial ? kgToLb(t.trendKg) : t.trendKg,
  }))

  const kcalByDate = new Map<string, number>()
  for (const e of data.foodLog) kcalByDate.set(e.date, (kcalByDate.get(e.date) ?? 0) + e.macros.kcal)
  const kcalPoints = [...kcalByDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([d, kcal]) => ({ x: dayIndex(d), y: kcal }))

  const tdee = estimateTdee(data)

  const checkIns = [...data.checkIns].sort((a, b) => a.date.localeCompare(b.date))
  const [metric, setMetric] = useState<keyof CheckIn>('energy')
  const metricPoints = checkIns.map((c) => ({ x: dayIndex(c.date), y: Number(c[metric]) || 0 }))

  const [exerciseId, setExerciseId] = useState('')
  const exercisesWithData = data.exercises.filter((e) => exerciseHistory(data, e.id).length > 0)
  const chosenExercise = exerciseId || exercisesWithData[0]?.id || ''
  const strengthPoints = chosenExercise
    ? exerciseHistory(data, chosenExercise).map((h) => ({
        x: dayIndex(h.date),
        y: imperial ? kgToLb(h.e1rm) : h.e1rm,
      }))
    : []

  const unit = imperial ? 'lb' : 'kg'

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Trends</h1>
      </header>

      <section className="card">
        <h2>Weight</h2>
        <Chart
          yLabel={unit}
          series={[
            {
              label: `Scale weight (${unit})`,
              color: 'var(--muted-line)',
              points: weightSeries.map((p) => ({ x: p.x, y: p.scale })),
              dots: true,
            },
            {
              label: `Trend (${unit})`,
              color: 'var(--accent)',
              points: weightSeries.map((p) => ({ x: p.x, y: p.trend })),
            },
          ]}
        />
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Calories</h2>
          <span className="dim">
            Maintenance estimate: {tdee.tdee} kcal
            {tdee.calibrated ? '' : ` (still learning — ${tdee.daysOfData} days of paired data so far)`}
          </span>
        </div>
        <Chart
          yLabel="kcal"
          series={[{ label: 'Calories eaten', color: 'var(--carbs)', points: kcalPoints, dots: true }]}
        />
      </section>

      <section className="card">
        <div className="row-between">
          <h2>How you've felt</h2>
          <select value={metric} onChange={(e) => setMetric(e.target.value as keyof CheckIn)}>
            <option value="energy">Energy</option>
            <option value="mood">Mood</option>
            <option value="sleepQuality">Sleep quality</option>
            <option value="sleepHours">Sleep hours</option>
            <option value="soreness">Soreness</option>
            <option value="stress">Stress</option>
          </select>
        </div>
        <Chart
          yLabel={metric === 'sleepHours' ? 'hours' : '1–5'}
          series={[{ label: labelFor(metric), color: 'var(--protein)', points: metricPoints, dots: true }]}
        />
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Strength</h2>
          <select value={chosenExercise} onChange={(e) => setExerciseId(e.target.value)}>
            {exercisesWithData.length === 0 && <option value="">No workout data yet</option>}
            {exercisesWithData.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <Chart
          yLabel={`est. 1RM (${unit})`}
          series={[{ label: 'Estimated one-rep max', color: 'var(--fat)', points: strengthPoints, dots: true }]}
        />
        <p className="dim">
          Estimated one-rep max blends weight and reps into one number, so progress shows even when
          you change rep ranges.
        </p>
      </section>
    </div>
  )
}

function makeDayIndex(data: AppData): (date: string) => number {
  const dates = [
    ...data.weights.map((w) => w.date),
    ...data.foodLog.map((e) => e.date),
    ...data.checkIns.map((c) => c.date),
    ...data.workouts.map((w) => w.date),
  ].sort()
  const origin = dates[0] ?? '2026-01-01'
  const originMs = Date.parse(origin)
  return (date: string) => Math.round((Date.parse(date) - originMs) / 86_400_000)
}

function labelFor(k: keyof CheckIn): string {
  const map: Partial<Record<keyof CheckIn, string>> = {
    energy: 'Energy',
    mood: 'Mood',
    sleepQuality: 'Sleep quality',
    sleepHours: 'Sleep hours',
    soreness: 'Soreness',
    stress: 'Stress',
  }
  return map[k] ?? String(k)
}
