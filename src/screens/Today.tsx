import { useEffect, useMemo, useState } from 'react'
import type { AppData, Food, FoodEntry } from '../types'
import type { Updater } from '../App'
import { addDays, newId, todayISO } from '../storage'
import { dayTargets, kgToLb, lbToKg, macrosForDay, scaleMacros } from '../engine'
import { loadFoodDb, searchFoods } from '../foodDb'

export default function Today({ data, update }: { data: AppData; update: Updater }) {
  const [date, setDate] = useState(todayISO())
  const [adding, setAdding] = useState(false)

  const targets = useMemo(() => dayTargets(data), [data])
  const eaten = useMemo(() => macrosForDay(data, date), [data, date])
  const imperial = data.settings.units === 'imperial'

  const todaysWeight = data.weights.find((w) => w.date === date)
  const entries = data.foodLog.filter((e) => e.date === date)

  const removeEntry = (id: string) =>
    update((d) => ({ ...d, foodLog: d.foodLog.filter((e) => e.id !== id) }))

  const setWeight = (display: number) => {
    if (!display || display <= 0) return
    const kg = imperial ? lbToKg(display) : display
    update((d) => ({
      ...d,
      weights: [...d.weights.filter((w) => w.date !== date), { date, kg }],
    }))
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="date-nav">
          <button onClick={() => setDate(addDays(date, -1))}>‹</button>
          <h1>{formatDate(date)}</h1>
          <button onClick={() => setDate(addDays(date, 1))} disabled={date >= todayISO()}>
            ›
          </button>
          {date !== todayISO() && (
            <button className="link" onClick={() => setDate(todayISO())}>
              Today
            </button>
          )}
        </div>
      </header>

      <section className="card targets-card">
        <div className="targets-row">
          <MacroRing label="Calories" value={eaten.kcal} target={targets.kcal} unit="" big />
          <MacroBar label="Protein" value={eaten.protein} target={targets.protein} color="var(--protein)" />
          <MacroBar label="Fat" value={eaten.fat} target={targets.fat} color="var(--fat)" />
          <MacroBar label="Carbs" value={eaten.carbs} target={targets.carbs} color="var(--carbs)" />
        </div>
        <div className="tdee-note">
          {data.settings.targetMode === 'manual'
            ? `Using your custom targets · maintenance estimate: ${targets.tdee} kcal/day`
            : targets.calibrated
              ? `Maintenance estimate: ${targets.tdee} kcal/day, learned from your own data`
              : `Maintenance estimate: ${targets.tdee} kcal/day (starting guess — logging food + weight for ~2 weeks lets the app learn your true number)`}
        </div>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Weight</h2>
          <WeightInput
            key={date + (todaysWeight?.kg ?? '')}
            initial={todaysWeight ? round1(imperial ? kgToLb(todaysWeight.kg) : todaysWeight.kg) : ''}
            unit={imperial ? 'lb' : 'kg'}
            onSave={setWeight}
          />
        </div>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Food</h2>
          <button className="btn-small" onClick={() => setAdding(!adding)}>
            {adding ? 'Close' : '+ Add food'}
          </button>
        </div>
        {adding && (
          <FoodPicker
            data={data}
            onPick={(food, grams) => {
              const entry: FoodEntry = {
                id: newId(),
                date,
                foodId: food.id,
                foodName: food.brand ? `${food.name} (${food.brand})` : food.name,
                grams,
                macros: scaleMacros(food.per100g, grams),
              }
              update((d) => ({
                ...d,
                foodLog: [...d.foodLog, entry],
                // Database foods join the personal library on first log, so
                // they show up instantly as "recents" next time.
                foods: d.foods.some((f) => f.id === food.id) ? d.foods : [...d.foods, food],
              }))
              setAdding(false)
            }}
            onCreateCustom={(food) => {
              update((d) => ({ ...d, foods: [...d.foods, food] }))
            }}
          />
        )}
        {entries.length === 0 && !adding && <div className="empty-hint">Nothing logged yet</div>}
        {entries.map((e) => (
          <div className="food-row" key={e.id}>
            <div>
              <div className="food-name">{e.foodName}</div>
              <div className="food-sub">
                {e.macros.kcal} 🔥&ensp;{Math.round(e.macros.protein)}P&ensp;
                {Math.round(e.macros.fat)}F&ensp;{Math.round(e.macros.carbs)}C&ensp;·&ensp;
                {Math.round(e.grams)} g
              </div>
            </div>
            <div className="food-macros">
              <button className="x" onClick={() => removeEntry(e.id)} title="Remove">
                ×
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

// ---- pieces ----

function MacroRing({ label, value, target }: { label: string; value: number; target: number; unit?: string; big?: boolean }) {
  const pct = Math.min(1, target > 0 ? value / target : 0)
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="ring-wrap">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} className="ring-bg" />
        <circle
          cx="44"
          cy="44"
          r={r}
          className="ring-fg"
          strokeDasharray={`${c * pct} ${c}`}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="41" textAnchor="middle" className="ring-num">
          {Math.round(value)}
        </text>
        <text x="44" y="56" textAnchor="middle" className="ring-sub">
          / {Math.round(target)}
        </text>
      </svg>
      <div className="ring-label">{label}</div>
    </div>
  )
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min(100, target > 0 ? (value / target) * 100 : 0)
  return (
    <div className="macro-bar">
      <div className="macro-bar-head">
        <span>{label}</span>
        <span className="dim">
          {Math.round(value)} / {Math.round(target)} g
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function WeightInput({ initial, unit, onSave }: { initial: number | ''; unit: string; onSave: (v: number) => void }) {
  const [val, setVal] = useState(String(initial))
  const [saved, setSaved] = useState(false)
  return (
    <div className="weight-input">
      <input
        type="number"
        inputMode="decimal"
        placeholder={`Weight (${unit})`}
        value={val}
        onChange={(e) => {
          setVal(e.target.value)
          setSaved(false)
        }}
      />
      <span className="dim">{unit}</span>
      <button
        className="btn-small"
        onClick={() => {
          onSave(parseFloat(val))
          setSaved(true)
        }}
        disabled={!val || parseFloat(val) <= 0}
      >
        {saved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  )
}

function FoodPicker({
  data,
  onPick,
  onCreateCustom,
}: {
  data: AppData
  onPick: (food: Food, grams: number) => void
  onCreateCustom: (food: Food) => void
}) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState(100)
  const [showCustom, setShowCustom] = useState(false)
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    loadFoodDb().then(() => setDbReady(true))
  }, [])

  const results = useMemo(
    () => searchFoods(data.foods, q, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dbReady re-runs the search once the database arrives
    [q, data.foods, dbReady],
  )

  if (showCustom) {
    return (
      <CustomFoodForm
        onCancel={() => setShowCustom(false)}
        onSave={(food) => {
          onCreateCustom(food)
          setShowCustom(false)
          setSelected(food)
        }}
      />
    )
  }

  if (selected) {
    const macros = scaleMacros(selected.per100g, grams)
    return (
      <div className="picker">
        <div className="picker-selected">
          <strong>{selected.name}</strong>
          <button className="link" onClick={() => setSelected(null)}>
            change
          </button>
        </div>
        <div className="serving-btns">
          {selected.servings.map((s) => (
            <button
              key={s.label}
              className={`chip ${grams === s.grams ? 'chip-on' : ''}`}
              onClick={() => setGrams(s.grams)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="picker-amount">
          <input type="number" value={grams} min={1} onChange={(e) => setGrams(Math.max(1, Number(e.target.value)))} />
          <span className="dim">grams</span>
          <span className="picker-preview">
            {macros.kcal} 🔥&ensp;{Math.round(macros.protein)}P&ensp;{Math.round(macros.fat)}F&ensp;
            {Math.round(macros.carbs)}C
          </span>
          <button className="btn" onClick={() => onPick(selected, grams)}>
            Log it
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="picker">
      <input
        autoFocus
        className="search"
        placeholder="Search foods…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="picker-results">
        {results.map((f) => (
          <button key={f.id} className="picker-row" onClick={() => {
            setSelected(f)
            setGrams(f.servings[1]?.grams ?? 100)
          }}>
            <span>{f.name}</span>
            <span className="dim">{f.per100g.kcal} kcal / 100g</span>
          </button>
        ))}
        {results.length === 0 && <div className="empty-hint">No matches</div>}
        <button className="link picker-custom" onClick={() => setShowCustom(true)}>
          + Create a custom food
        </button>
      </div>
    </div>
  )
}

function CustomFoodForm({ onSave, onCancel }: { onSave: (f: Food) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [per, setPer] = useState({ kcal: '', protein: '', carbs: '', fat: '' })
  const valid = name.trim() && per.kcal !== ''
  return (
    <div className="picker custom-form">
      <input placeholder="Food name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div className="custom-macros">
        {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
          <label key={k}>
            <span className="dim">{k === 'kcal' ? 'Calories' : k[0].toUpperCase() + k.slice(1) + ' (g)'} per 100g</span>
            <input
              type="number"
              value={per[k]}
              onChange={(e) => setPer({ ...per, [k]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <div className="row-gap">
        <button
          className="btn"
          disabled={!valid}
          onClick={() =>
            onSave({
              id: newId(),
              name: name.trim(),
              per100g: {
                kcal: Number(per.kcal) || 0,
                protein: Number(per.protein) || 0,
                carbs: Number(per.carbs) || 0,
                fat: Number(per.fat) || 0,
              },
              servings: [{ label: '100 g', grams: 100 }],
              source: 'custom',
            })
          }
        >
          Save food
        </button>
        <button className="link" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (iso === todayISO()) return 'Today'
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

const round1 = (n: number) => Math.round(n * 10) / 10
