// The adaptive engine — the heart of the MacroFactor-style approach.
//
// Idea in plain terms:
// 1. Daily scale weight is noisy (water, food in transit). We smooth it into a
//    trend line so one salty dinner doesn't look like fat gain.
// 2. Energy balance: if you log your food honestly, the gap between calories
//    eaten and how your trend weight actually moved tells us your true
//    maintenance calories (TDEE) — no formulas or guessing needed.
// 3. Your calorie target = estimated TDEE + the surplus/deficit needed for
//    your chosen rate of weight change.

import type { AppData, ISODate, Macros, WeightEntry } from './types'

const KCAL_PER_KG = 7700 // energy in ~1 kg of body tissue change

// ---- Weight trend (exponential smoothing) ----

export interface TrendPoint {
  date: ISODate
  scaleKg: number
  trendKg: number
}

/**
 * Exponentially-smoothed weight trend, same family of technique as
 * MacroFactor/Hacker's Diet. alpha=0.1 means each new weigh-in nudges the
 * trend 10% toward it.
 */
export function weightTrend(weights: WeightEntry[], alpha = 0.1): TrendPoint[] {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const out: TrendPoint[] = []
  let trend: number | null = null
  for (const w of sorted) {
    trend = trend === null ? w.kg : trend + alpha * (w.kg - trend)
    out.push({ date: w.date, scaleKg: w.kg, trendKg: trend })
  }
  return out
}

// ---- Adaptive TDEE ----

export interface TdeeEstimate {
  tdee: number
  /** How many complete days of food+weight data backed this estimate. */
  daysOfData: number
  /** True once there's enough data to trust the estimate over the starting guess. */
  calibrated: boolean
}

/**
 * Estimate true maintenance calories from logged intake vs. trend-weight change
 * over the most recent window of complete days.
 *
 * TDEE = average intake − (trend weight change in kg × 7700 / days)
 * If you ate 2500/day and trend rose, you were eating above maintenance; the
 * formula recovers where maintenance actually is.
 */
export function estimateTdee(data: AppData, windowDays = 21): TdeeEstimate {
  const trend = weightTrend(data.weights)
  // Daily calorie totals for days that have any food logged.
  const kcalByDate = new Map<ISODate, number>()
  for (const e of data.foodLog) {
    kcalByDate.set(e.date, (kcalByDate.get(e.date) ?? 0) + e.macros.kcal)
  }

  // Use only days inside the window that have BOTH a weigh-in and food logged;
  // half-logged days poison the estimate.
  const usable = trend.filter((t) => kcalByDate.has(t.date)).slice(-windowDays)

  if (usable.length < 7) {
    return { tdee: data.settings.startingTdee, daysOfData: usable.length, calibrated: false }
  }

  const first = usable[0]
  const last = usable[usable.length - 1]
  const days = usable.length - 1 || 1
  const avgIntake = usable.reduce((s, t) => s + (kcalByDate.get(t.date) ?? 0), 0) / usable.length
  const kgChangePerDay = (last.trendKg - first.trendKg) / days
  const tdee = avgIntake - kgChangePerDay * KCAL_PER_KG

  // Blend toward the starting guess while data is thin (7–14 days).
  const weight = Math.min(1, (usable.length - 7) / 7)
  const blended = data.settings.startingTdee * (1 - weight) + tdee * weight

  return { tdee: Math.round(blended), daysOfData: usable.length, calibrated: usable.length >= 14 }
}

// ---- Targets ----

export interface DayTargets extends Macros {
  tdee: number
  calibrated: boolean
}

/** Calorie + macro targets from current TDEE estimate, goal rate, and settings. */
export function dayTargets(data: AppData): DayTargets {
  const { settings } = data
  const est = estimateTdee(data)

  // Manual mode: the user's own numbers, verbatim. The TDEE estimate still
  // rides along so the UI can show what the app has learned.
  if (settings.targetMode === 'manual') {
    return { ...settings.manualTargets, tdee: est.tdee, calibrated: est.calibrated }
  }

  const dailyAdjustment = (settings.rateKgPerWeek * KCAL_PER_KG) / 7
  const kcal = Math.max(1200, Math.round(est.tdee + dailyAdjustment))

  const latestTrend = weightTrend(data.weights).at(-1)
  const bodyKg = latestTrend?.trendKg ?? 80

  const protein = Math.round(settings.proteinGPerKg * bodyKg)
  const fat = Math.round((kcal * (settings.fatPercentOfCalories / 100)) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))

  return { kcal, protein, carbs, fat, tdee: est.tdee, calibrated: est.calibrated }
}

// ---- Day + workout summaries ----

export function macrosForDay(data: AppData, date: ISODate): Macros {
  const zero: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  return data.foodLog
    .filter((e) => e.date === date)
    .reduce(
      (acc, e) => ({
        kcal: acc.kcal + e.macros.kcal,
        protein: acc.protein + e.macros.protein,
        carbs: acc.carbs + e.macros.carbs,
        fat: acc.fat + e.macros.fat,
      }),
      zero,
    )
}

export function scaleMacros(per100g: Macros, grams: number): Macros {
  const f = grams / 100
  return {
    kcal: Math.round(per100g.kcal * f),
    protein: Math.round(per100g.protein * f * 10) / 10,
    carbs: Math.round(per100g.carbs * f * 10) / 10,
    fat: Math.round(per100g.fat * f * 10) / 10,
  }
}

/** Best set (highest estimated 1-rep max) per date for an exercise — powers PR charts. */
export function exerciseHistory(data: AppData, exerciseId: string): { date: ISODate; e1rm: number; topKg: number }[] {
  const byDate = new Map<ISODate, { e1rm: number; topKg: number }>()
  for (const w of data.workouts) {
    for (const s of w.sets) {
      if (s.exerciseId !== exerciseId || s.reps <= 0) continue
      const e1rm = s.kg * (1 + s.reps / 30) // Epley formula
      const cur = byDate.get(w.date)
      if (!cur || e1rm > cur.e1rm) byDate.set(w.date, { e1rm: Math.round(e1rm * 10) / 10, topKg: s.kg })
    }
  }
  return [...byDate.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ---- Unit helpers ----

export const kgToLb = (kg: number) => kg * 2.2046226
export const lbToKg = (lb: number) => lb / 2.2046226
