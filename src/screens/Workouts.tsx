import { useMemo, useState } from 'react'
import type { AppData, Routine, Workout, WorkoutSet } from '../types'
import type { Updater } from '../App'
import { newId, todayISO } from '../storage'
import { exerciseHistory, kgToLb, lbToKg } from '../engine'
import { SEED_ROUTINES } from '../seed'

/** Most recent logged set for an exercise, used to pre-fill new sets. */
function lastSetFor(data: AppData, exerciseId: string): WorkoutSet | undefined {
  const sorted = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date))
  for (const w of sorted) {
    const set = [...w.sets].reverse().find((s) => s.exerciseId === exerciseId)
    if (set) return set
  }
  return undefined
}

/** Starting weight when an exercise has no history: a clean 45 lb or 20 kg bar. */
function defaultKg(data: AppData): number {
  return data.settings.units === 'imperial' ? lbToKg(45) : 20
}

function workoutFromRoutine(data: AppData, routine: Routine): Workout {
  const sets: WorkoutSet[] = []
  for (const item of routine.exercises) {
    const ex = data.exercises.find((e) => e.name === item.name)
    if (!ex) continue
    const prev = lastSetFor(data, ex.id)
    for (let i = 0; i < item.sets; i++) {
      sets.push({ exerciseId: ex.id, reps: prev?.reps ?? 8, kg: prev?.kg ?? defaultKg(data) })
    }
  }
  return { id: newId(), date: todayISO(), name: routine.name, sets }
}

export default function Workouts({ data, update }: { data: AppData; update: Updater }) {
  const [active, setActive] = useState<Workout | null>(null)
  const [choosing, setChoosing] = useState(false)

  if (active) {
    return (
      <ActiveWorkout
        data={data}
        workout={active}
        onChange={setActive}
        onFinish={(w) => {
          if (w.sets.length > 0) {
            update((d) => ({ ...d, workouts: [...d.workouts.filter((x) => x.id !== w.id), w] }))
          }
          setActive(null)
        }}
        onDiscard={() => setActive(null)}
      />
    )
  }

  const past = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="screen">
      <header className="screen-head row-between">
        <h1>Workouts</h1>
        <button className="btn" onClick={() => setChoosing(!choosing)}>
          + Start workout
        </button>
      </header>

      {choosing && (
        <section className="card">
          <h2>Pick a routine</h2>
          <div className="routine-grid">
            {SEED_ROUTINES.map((r) => (
              <button
                key={r.name}
                className="routine-btn"
                onClick={() => {
                  setActive(workoutFromRoutine(data, r))
                  setChoosing(false)
                }}
              >
                <span className="routine-name">{r.name}</span>
                <span className="dim">{r.exercises.map((e) => e.name).join(' · ')}</span>
              </button>
            ))}
            <button
              className="routine-btn"
              onClick={() => {
                setActive({ id: newId(), date: todayISO(), name: 'Workout', sets: [] })
                setChoosing(false)
              }}
            >
              <span className="routine-name">Empty workout</span>
              <span className="dim">Start from scratch and add exercises as you go</span>
            </button>
          </div>
        </section>
      )}

      {past.length === 0 && !choosing && (
        <div className="card empty-hint">No workouts yet. Start one and log your sets as you go.</div>
      )}

      {past.map((w) => (
        <section className="card" key={w.id}>
          <div className="row-between">
            <div>
              <h2>{w.name}</h2>
              <div className="dim">{w.date} · {w.sets.length} sets</div>
            </div>
            <div className="row-gap">
              <button
                className="btn-small"
                onClick={() =>
                  setActive({
                    id: newId(),
                    date: todayISO(),
                    name: w.name,
                    sets: w.sets.map((s) => ({ ...s })),
                  })
                }
              >
                Repeat today
              </button>
              <button className="btn-small" onClick={() => setActive(w)}>
                Edit
              </button>
              <button
                className="x"
                title="Delete workout"
                onClick={() => update((d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== w.id) }))}
              >
                ×
              </button>
            </div>
          </div>
          <WorkoutSummary data={data} workout={w} />
        </section>
      ))}
    </div>
  )
}

function WorkoutSummary({ data, workout }: { data: AppData; workout: Workout }) {
  const groups = new Map<string, WorkoutSet[]>()
  for (const s of workout.sets) {
    groups.set(s.exerciseId, [...(groups.get(s.exerciseId) ?? []), s])
  }
  const imperial = data.settings.units === 'imperial'
  return (
    <div className="workout-summary">
      {[...groups.entries()].map(([exId, sets]) => {
        const ex = data.exercises.find((e) => e.id === exId)
        return (
          <div key={exId} className="dim">
            {ex?.name ?? 'Exercise'}:{' '}
            {sets
              .map((s) => `${s.reps}×${displayWeight(s.kg, imperial)}`)
              .join(', ')}
          </div>
        )
      })}
    </div>
  )
}

function ActiveWorkout({
  data,
  workout,
  onChange,
  onFinish,
  onDiscard,
}: {
  data: AppData
  workout: Workout
  onChange: (w: Workout) => void
  onFinish: (w: Workout) => void
  onDiscard: () => void
}) {
  const [pickerOpen, setPickerOpen] = useState(workout.sets.length === 0)
  const imperial = data.settings.units === 'imperial'

  // Exercises currently in this workout, in order of first appearance.
  const exerciseIds = [...new Set(workout.sets.map((s) => s.exerciseId))]

  const addSet = (exerciseId: string) => {
    const prev =
      [...workout.sets].reverse().find((s) => s.exerciseId === exerciseId) ??
      lastSetFor(data, exerciseId)
    onChange({
      ...workout,
      sets: [...workout.sets, { exerciseId, reps: prev?.reps ?? 8, kg: prev?.kg ?? defaultKg(data) }],
    })
  }

  return (
    <div className="screen">
      <header className="screen-head row-between">
        <input
          className="title-input"
          value={workout.name}
          onChange={(e) => onChange({ ...workout, name: e.target.value })}
        />
        <div className="row-gap">
          <button className="link" onClick={onDiscard}>
            Close without saving
          </button>
          <button className="btn" onClick={() => onFinish(workout)}>
            Finish & save
          </button>
        </div>
      </header>
      <div className="dim workout-date">
        <label>
          Date:{' '}
          <input
            type="date"
            value={workout.date}
            max={todayISO()}
            onChange={(e) => onChange({ ...workout, date: e.target.value })}
          />
        </label>
      </div>

      {exerciseIds.map((exId) => {
        const ex = data.exercises.find((e) => e.id === exId)
        const sets = workout.sets.filter((s) => s.exerciseId === exId)
        const history = exerciseHistory(data, exId).filter((h) => h.date !== workout.date)
        const best = history.at(-1)
        return (
          <section className="card" key={exId}>
            <div className="row-between">
              <h2>{ex?.name ?? 'Exercise'}</h2>
              {best && (
                <span className="dim">
                  Last: {displayWeight(best.topKg, imperial)} top set
                </span>
              )}
            </div>
            <div className="set-head dim">
              <span>Set</span>
              <span>Weight ({imperial ? 'lb' : 'kg'})</span>
              <span>Reps</span>
              <span />
            </div>
            {sets.map((s, i) => {
              const globalIdx = workout.sets.indexOf(s)
              return (
                <div className="set-row" key={globalIdx}>
                  <span className="set-num">{i + 1}</span>
                  <input
                    type="number"
                    value={round1(imperial ? kgToLb(s.kg) : s.kg)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0
                      const kg = imperial ? lbToKg(v) : v
                      const sets2 = [...workout.sets]
                      sets2[globalIdx] = { ...s, kg }
                      onChange({ ...workout, sets: sets2 })
                    }}
                  />
                  <input
                    type="number"
                    value={s.reps}
                    onChange={(e) => {
                      const sets2 = [...workout.sets]
                      sets2[globalIdx] = { ...s, reps: parseInt(e.target.value) || 0 }
                      onChange({ ...workout, sets: sets2 })
                    }}
                  />
                  <button
                    className="x"
                    onClick={() =>
                      onChange({ ...workout, sets: workout.sets.filter((_, idx) => idx !== globalIdx) })
                    }
                  >
                    ×
                  </button>
                </div>
              )
            })}
            <button className="btn-small" onClick={() => addSet(exId)}>
              + Add set
            </button>
          </section>
        )
      })}

      <section className="card">
        {pickerOpen ? (
          <ExercisePicker
            data={data}
            onPick={(exId) => {
              addSet(exId)
              setPickerOpen(false)
            }}
          />
        ) : (
          <button className="btn-small" onClick={() => setPickerOpen(true)}>
            + Add exercise
          </button>
        )}
      </section>
    </div>
  )
}

function ExercisePicker({ data, onPick }: { data: AppData; onPick: (id: string) => void }) {
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = needle
      ? data.exercises.filter((e) => e.name.toLowerCase().includes(needle))
      : data.exercises
    return list.slice(0, 12)
  }, [q, data.exercises])

  return (
    <div className="picker">
      <input autoFocus className="search" placeholder="Search exercises…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="picker-results">
        {results.map((e) => (
          <button key={e.id} className="picker-row" onClick={() => onPick(e.id)}>
            <span>{e.name}</span>
            <span className="dim">{e.muscleGroup}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function displayWeight(kg: number, imperial: boolean): string {
  return imperial ? `${round1(kgToLb(kg))} lb` : `${round1(kg)} kg`
}

const round1 = (n: number) => Math.round(n * 10) / 10
