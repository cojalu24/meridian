import { useRef } from 'react'
import type { AppData, Goal, Settings } from '../types'
import type { Updater } from '../App'
import { exportJson, importJson } from '../storage'

export default function SettingsScreen({
  data,
  update,
  setData,
}: {
  data: AppData
  update: Updater
  setData: (d: AppData) => void
}) {
  const s = data.settings
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (patch: Partial<Settings>) =>
    update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))

  const setGoal = (goal: Goal) => {
    // Sensible default rates per goal; user can fine-tune below.
    const rate = goal === 'lose' ? -0.35 : goal === 'gain' ? 0.2 : 0
    set({ goal, rateKgPerWeek: rate })
  }

  const download = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meridian-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const rateLbPerWeek = Math.round(s.rateKgPerWeek * 2.2046 * 100) / 100

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Settings</h1>
      </header>

      <section className="card">
        <h2>Targets</h2>
        <div className="serving-btns">
          <button
            className={`chip ${s.targetMode === 'adaptive' ? 'chip-on' : ''}`}
            onClick={() => set({ targetMode: 'adaptive' })}
          >
            Adaptive (recommended)
          </button>
          <button
            className={`chip ${s.targetMode === 'manual' ? 'chip-on' : ''}`}
            onClick={() => set({ targetMode: 'manual' })}
          >
            Set my own
          </button>
        </div>
        {s.targetMode === 'adaptive' ? (
          <p className="dim">
            Targets follow your goal below and adjust as the app learns your true maintenance
            calories from your own logs.
          </p>
        ) : (
          <>
            <label className="setting-row">
              <span>Calories (kcal/day)</span>
              <input
                type="number"
                step="25"
                value={s.manualTargets.kcal}
                onChange={(e) =>
                  set({ manualTargets: { ...s.manualTargets, kcal: parseInt(e.target.value) || 0 } })
                }
              />
            </label>
            <label className="setting-row">
              <span>Protein (g)</span>
              <input
                type="number"
                value={s.manualTargets.protein}
                onChange={(e) =>
                  set({ manualTargets: { ...s.manualTargets, protein: parseInt(e.target.value) || 0 } })
                }
              />
            </label>
            <label className="setting-row">
              <span>Carbs (g)</span>
              <input
                type="number"
                value={s.manualTargets.carbs}
                onChange={(e) =>
                  set({ manualTargets: { ...s.manualTargets, carbs: parseInt(e.target.value) || 0 } })
                }
              />
            </label>
            <label className="setting-row">
              <span>Fat (g)</span>
              <input
                type="number"
                value={s.manualTargets.fat}
                onChange={(e) =>
                  set({ manualTargets: { ...s.manualTargets, fat: parseInt(e.target.value) || 0 } })
                }
              />
            </label>
            <p className="dim">
              Tip: those four should roughly agree — protein and carbs are 4 kcal per gram, fat is
              9. The app uses your numbers exactly as entered.
            </p>
          </>
        )}
      </section>

      {s.targetMode === 'adaptive' && (
      <>
      <section className="card">
        <h2>Goal</h2>
        <div className="serving-btns">
          {(['lose', 'maintain', 'gain'] as Goal[]).map((g) => (
            <button key={g} className={`chip ${s.goal === g ? 'chip-on' : ''}`} onClick={() => setGoal(g)}>
              {g === 'lose' ? 'Lose weight' : g === 'maintain' ? 'Maintain' : 'Build muscle'}
            </button>
          ))}
        </div>
        {s.goal !== 'maintain' && (
          <label className="setting-row">
            <span>
              Target rate ({s.units === 'imperial' ? 'lb' : 'kg'} per week)
            </span>
            <input
              type="number"
              step="0.05"
              value={s.units === 'imperial' ? rateLbPerWeek : s.rateKgPerWeek}
              onChange={(e) => {
                const v = parseFloat(e.target.value) || 0
                set({ rateKgPerWeek: s.units === 'imperial' ? v / 2.2046 : v })
              }}
            />
          </label>
        )}
        <label className="setting-row">
          <span>Starting maintenance guess (kcal/day)</span>
          <input
            type="number"
            step="50"
            value={s.startingTdee}
            onChange={(e) => set({ startingTdee: parseInt(e.target.value) || 2400 })}
          />
        </label>
        <p className="dim">
          The app refines this automatically from your food log and weigh-ins — after about two
          weeks the guess stops mattering.
        </p>
      </section>

      <section className="card">
        <h2>Macros</h2>
        <label className="setting-row">
          <span>Protein (grams per kg of bodyweight)</span>
          <input
            type="number"
            step="0.1"
            value={s.proteinGPerKg}
            onChange={(e) => set({ proteinGPerKg: parseFloat(e.target.value) || 1.8 })}
          />
        </label>
        <label className="setting-row">
          <span>Fat (% of calories)</span>
          <input
            type="number"
            step="1"
            value={s.fatPercentOfCalories}
            onChange={(e) => set({ fatPercentOfCalories: parseInt(e.target.value) || 27 })}
          />
        </label>
        <p className="dim">Carbs fill whatever calories remain after protein and fat.</p>
      </section>
      </>
      )}

      <section className="card">
        <h2>Units</h2>
        <div className="serving-btns">
          <button
            className={`chip ${s.units === 'imperial' ? 'chip-on' : ''}`}
            onClick={() => set({ units: 'imperial' })}
          >
            Pounds (lb)
          </button>
          <button
            className={`chip ${s.units === 'metric' ? 'chip-on' : ''}`}
            onClick={() => set({ units: 'metric' })}
          >
            Kilograms (kg)
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p className="dim">
          Everything lives on this machine — nothing is sent anywhere. Back up to a file, or restore
          from one.
        </p>
        <div className="row-gap">
          <button className="btn-small" onClick={download}>
            Export backup
          </button>
          <button className="btn-small" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                setData(importJson(await file.text()))
              } catch {
                alert('That file could not be read as a Meridian backup.')
              }
              e.target.value = ''
            }}
          />
        </div>
      </section>
    </div>
  )
}
