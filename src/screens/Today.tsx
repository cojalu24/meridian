import { useEffect, useMemo, useState } from 'react'
import type { AppData, Food, FoodEntry, Serving } from '../types'
import { NUTRIENTS } from '../types'
import type { Updater } from '../App'
import { addDays, newId, todayISO } from '../storage'
import { dayTargets, kgToLb, lbToKg, macrosForDay, nutrientsForDay, scaleMacros } from '../engine'
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

      <NutritionCard data={data} date={date} />
    </div>
  )
}

// ---- daily nutrient breakdown ----

function NutritionCard({ data, date }: { data: AppData; date: string }) {
  const [expanded, setExpanded] = useState(false)
  const totals = useMemo(() => nutrientsForDay(data, date), [data, date])
  const groups = expanded ? ['General', 'Minerals', 'Vitamins'] : ['General']

  return (
    <section className="card">
      <div className="row-between">
        <h2>Nutrition</h2>
        <button className="btn-small" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : 'All nutrients'}
        </button>
      </div>
      {groups.map((group) => (
        <div key={group}>
          {expanded && <div className="nutrient-group">{group}</div>}
          {NUTRIENTS.filter((n) => n.group === group).map((n) => {
            const value = totals[n.key] ?? 0
            const pct = Math.min(100, (value / n.target) * 100)
            const over = n.limit && value > n.target
            return (
              <div className="nutrient-row" key={n.key}>
                <span className="nutrient-label">{n.label}</span>
                <div className="bar-track nutrient-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: over ? '#d05252' : n.limit ? 'var(--text-dim)' : 'var(--carbs)',
                    }}
                  />
                </div>
                <span className="nutrient-amount">
                  {formatAmount(value, n.unit)} <span className="dim">/ {formatAmount(n.target, n.unit)}</span>
                </span>
              </div>
            )
          })}
        </div>
      ))}
      <p className="dim nutrient-foot">
        Daily totals vs. typical adult targets; limits (sugar, sodium…) turn red when exceeded.
      </p>
    </section>
  )
}

function formatAmount(v: number, unit: string): string {
  const rounded = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10
  return `${rounded} ${unit}`
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

/** Units always available for any food, alongside its own servings. */
const WEIGHT_UNITS: Serving[] = [
  { label: 'g', grams: 1 },
  { label: 'oz', grams: 28.35 },
  { label: 'lb', grams: 453.59 },
]

/** Food-specific servings (skipping the plain "100 g" one) plus g/oz/lb. */
function unitsFor(food: Food): Serving[] {
  return [...food.servings.filter((s) => s.label !== '100 g'), ...WEIGHT_UNITS]
}

/** The serving to use for one-tap logging: the food's first real serving, else 100 g. */
function defaultServing(food: Food): { label: string; grams: number } {
  return food.servings.find((s) => s.label !== '100 g') ?? { label: '100 g', grams: 100 }
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
  const [qty, setQty] = useState(1)
  const [unitIdx, setUnitIdx] = useState(0)
  const [showCustom, setShowCustom] = useState(false)
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    loadFoodDb().then(() => setDbReady(true))
  }, [])

  // Most recently logged foods, newest first — the "Recent" list.
  const recents = useMemo(() => {
    const seen = new Set<string>()
    const out: Food[] = []
    for (let i = data.foodLog.length - 1; i >= 0 && out.length < 8; i--) {
      const id = data.foodLog[i].foodId
      if (seen.has(id)) continue
      seen.add(id)
      const food = data.foods.find((f) => f.id === id)
      if (food) out.push(food)
    }
    return out
  }, [data.foodLog, data.foods])

  const results = useMemo(
    () => (q.trim() ? searchFoods(data.foods, q, 10) : recents),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dbReady re-runs the search once the database arrives
    [q, data.foods, recents, dbReady],
  )

  const select = (food: Food) => {
    setSelected(food)
    const units = unitsFor(food)
    const hasServing = units[0].label !== 'g'
    setUnitIdx(0)
    setQty(hasServing ? 1 : 100)
  }

  if (showCustom) {
    return (
      <CustomFoodForm
        onCancel={() => setShowCustom(false)}
        onSave={(food) => {
          onCreateCustom(food)
          setShowCustom(false)
          select(food)
        }}
      />
    )
  }

  if (selected) {
    const units = unitsFor(selected)
    const unit = units[Math.min(unitIdx, units.length - 1)]
    const grams = Math.max(1, Math.round(qty * unit.grams * 10) / 10)
    const macros = scaleMacros(selected.per100g, grams)
    return (
      <div className="picker">
        <div className="picker-selected">
          <strong>{selected.name}</strong>
          <button className="link" onClick={() => setSelected(null)}>
            change
          </button>
        </div>
        <div className="picker-amount">
          <input
            className="qty-input"
            type="number"
            step="0.25"
            min="0"
            value={qty}
            onChange={(e) => setQty(Math.max(0, parseFloat(e.target.value) || 0))}
          />
          <select
            className="unit-select"
            value={unitIdx}
            onChange={(e) => {
              const idx = Number(e.target.value)
              const next = units[idx]
              // Keep the amount sensible when switching between unit scales.
              if (next.label === 'g' && unit.label !== 'g') setQty(Math.round(qty * unit.grams))
              else if (unit.label === 'g' && next.label !== 'g') setQty(1)
              setUnitIdx(idx)
            }}
          >
            {units.map((u, i) => (
              <option key={u.label + i} value={i}>
                {u.label}
              </option>
            ))}
          </select>
          <span className="dim">= {Math.round(grams)} g</span>
          <span className="picker-preview">
            {macros.kcal} 🔥&ensp;{Math.round(macros.protein)}P&ensp;{Math.round(macros.fat)}F&ensp;
            {Math.round(macros.carbs)}C
          </span>
          <button className="btn" onClick={() => onPick(selected, grams)} disabled={grams <= 0}>
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
        placeholder="Search 8,000+ foods…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {!q.trim() && recents.length > 0 && <div className="picker-section">Recent</div>}
      <div className="picker-results">
        {results.map((f) => (
          <div key={f.id} className="picker-row-wrap">
            <button className="picker-row" onClick={() => select(f)}>
              <span>
                <span className="picker-row-name">{f.name}</span>
                <span className="picker-row-sub">
                  {f.per100g.kcal} 🔥&ensp;{Math.round(f.per100g.protein)}P&ensp;
                  {Math.round(f.per100g.fat)}F&ensp;{Math.round(f.per100g.carbs)}C&ensp;·&ensp;100 g
                </span>
              </span>
            </button>
            <button
              className="plus"
              title={`Log ${defaultServing(f).label}`}
              onClick={() => onPick(f, defaultServing(f).grams)}
            >
              +
            </button>
          </div>
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
