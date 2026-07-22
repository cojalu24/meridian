import { useState } from 'react'
import type { AppData, CheckIn } from '../types'
import { CHECKIN_QUESTIONS } from '../types'
import type { Updater } from '../App'
import { todayISO } from '../storage'

// The Whoop-style morning journal: a few 1–5 questions, sleep hours, and a
// free-text note. Trends over these live in the Trends tab.

export default function CheckInScreen({ data, update }: { data: AppData; update: Updater }) {
  const today = todayISO()
  const existing = data.checkIns.find((c) => c.date === today)
  const [draft, setDraft] = useState<CheckIn>(
    existing ?? {
      date: today,
      sleepQuality: 3,
      sleepHours: 8,
      energy: 3,
      soreness: 3,
      mood: 3,
      stress: 3,
      notes: '',
    },
  )
  const [saved, setSaved] = useState(!!existing)

  const set = (patch: Partial<CheckIn>) => {
    setDraft({ ...draft, ...patch })
    setSaved(false)
  }

  const save = () => {
    update((d) => ({
      ...d,
      checkIns: [...d.checkIns.filter((c) => c.date !== today), draft],
    }))
    setSaved(true)
  }

  const recent = [...data.checkIns]
    .filter((c) => c.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Morning check-in</h1>
        <p className="dim">{formatToday()}</p>
      </header>

      <section className="card">
        <div className="checkin-q">
          <label>How many hours did you sleep?</label>
          <div className="row-gap">
            <input
              type="number"
              step="0.5"
              min="0"
              max="16"
              value={draft.sleepHours}
              onChange={(e) => set({ sleepHours: parseFloat(e.target.value) || 0 })}
            />
            <span className="dim">hours</span>
          </div>
        </div>

        {CHECKIN_QUESTIONS.map((q) => (
          <div className="checkin-q" key={q.key}>
            <label>{q.label}</label>
            <div className="scale">
              <span className="scale-end dim">{q.low}</span>
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  className={`scale-btn ${draft[q.key] === v ? 'scale-on' : ''}`}
                  onClick={() => set({ [q.key]: v } as Partial<CheckIn>)}
                >
                  {v}
                </button>
              ))}
              <span className="scale-end dim">{q.high}</span>
            </div>
          </div>
        ))}

        <div className="checkin-q">
          <label>Anything worth noting?</label>
          <textarea
            rows={2}
            placeholder="Late dinner, traveling, felt a tweak in my knee…"
            value={draft.notes ?? ''}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>

        <button className="btn" onClick={save}>
          {saved ? 'Saved ✓' : existing ? 'Update check-in' : 'Save check-in'}
        </button>
      </section>

      {recent.length > 0 && (
        <section className="card">
          <h2>Past week</h2>
          <div className="checkin-history-head dim">
            <span>Date</span>
            <span>Sleep</span>
            <span>Energy</span>
            <span>Soreness</span>
            <span>Mood</span>
            <span>Stress</span>
          </div>
          {recent.map((c) => (
            <div className="checkin-history-row" key={c.date}>
              <span>{c.date.slice(5)}</span>
              <span>{c.sleepHours}h · {c.sleepQuality}/5</span>
              <span>{c.energy}/5</span>
              <span>{c.soreness}/5</span>
              <span>{c.mood}/5</span>
              <span>{c.stress}/5</span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}
