// Storage layer. For now everything persists to localStorage as one JSON blob;
// when we wrap this in Electron we'll swap `backend` for real file storage
// without touching any UI code. Export/import lets the user back up their data.

import type { AppData } from './types'
import { DEFAULT_SETTINGS } from './types'

const KEY = 'wellness-data-v1'

export function emptyData(): AppData {
  return {
    foods: [],
    foodLog: [],
    weights: [],
    exercises: [],
    workouts: [],
    checkIns: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    // Merge over empty so new fields added in later versions get defaults.
    const base = emptyData()
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
    }
  } catch {
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

export function importJson(raw: string): AppData {
  const parsed = JSON.parse(raw) as Partial<AppData>
  const base = emptyData()
  return { ...base, ...parsed, settings: { ...base.settings, ...parsed.settings } }
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Today as a local ISO date ("2026-07-22"). */
export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + delta)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
