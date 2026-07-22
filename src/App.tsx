import { useEffect, useMemo, useState } from 'react'
import type { AppData } from './types'
import { loadData, newId, saveData } from './storage'
import { enrichFoods, loadFoodDb } from './foodDb'
import { SEED_EXERCISES } from './seed'
import Today from './screens/Today'
import Workouts from './screens/Workouts'
import CheckInScreen from './screens/CheckIn'
import Trends from './screens/Trends'
import SettingsScreen from './screens/Settings'
import './App.css'

export type Updater = (fn: (d: AppData) => AppData) => void

const TABS = [
  { id: 'today', label: 'Today', icon: '🍽' },
  { id: 'workouts', label: 'Workouts', icon: '🏋️' },
  { id: 'checkin', label: 'Check-in', icon: '☀️' },
  { id: 'trends', label: 'Trends', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const [data, setData] = useState<AppData>(() => {
    const d = loadData()
    // First launch: seed the exercise library. (Foods come from the bundled
    // USDA database now — no seed foods needed.)
    if (d.exercises.length === 0) {
      d.exercises = SEED_EXERCISES.map((e) => ({ ...e, id: newId() }))
    }
    // Migration: drop old starter foods that were never logged — they lack
    // micronutrient data and shadow the richer USDA entries in search.
    const logged = new Set(d.foodLog.map((e) => e.foodId))
    d.foods = d.foods.filter(
      (f) => f.source === 'custom' || f.id.startsWith('usda-') || logged.has(f.id),
    )
    return d
  })
  const [tab, setTab] = useState<TabId>('today')

  useEffect(() => {
    saveData(data)
  }, [data])

  // Once the food database loads, back-fill nutrient data onto any library
  // foods saved before micronutrients existed.
  useEffect(() => {
    loadFoodDb().then(() => {
      setData((d) => {
        const enriched = enrichFoods(d.foods)
        return enriched ? { ...d, foods: enriched } : d
      })
    })
  }, [])

  const update: Updater = useMemo(() => (fn) => setData((d) => fn(d)), [])

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">
          <span className="logo-mark">●</span> Meridian
        </div>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-icon">{t.icon}</span> {t.label}
          </button>
        ))}
        <div className="sidebar-foot">Your data, on your machine.</div>
      </nav>
      <main className="content">
        {tab === 'today' && <Today data={data} update={update} />}
        {tab === 'workouts' && <Workouts data={data} update={update} />}
        {tab === 'checkin' && <CheckInScreen data={data} update={update} />}
        {tab === 'trends' && <Trends data={data} />}
        {tab === 'settings' && <SettingsScreen data={data} update={update} setData={setData} />}
      </main>
    </div>
  )
}
