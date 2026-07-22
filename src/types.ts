// Core data model. Everything the app stores lives here.
// Dates are always ISO date strings ("2026-07-22") in local time, never timestamps,
// because a "day" of eating is a human day, not a 24h window.

export type ISODate = string

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Serving {
  label: string // "1 cup", "1 medium", "1 scoop"
  grams: number
}

export interface Food {
  id: string
  name: string
  brand?: string
  /** Nutrition per 100g. Everything else is derived from this. */
  per100g: Macros
  servings: Serving[]
  source: 'usda' | 'openfoodfacts' | 'custom'
  barcode?: string
}

export interface FoodEntry {
  id: string
  date: ISODate
  foodId: string
  /** Snapshot of the food name so old logs stay readable if the food is edited. */
  foodName: string
  grams: number
  macros: Macros // computed at log time, stored so history never shifts
}

export interface WeightEntry {
  date: ISODate
  kg: number
}

// ---- Training ----

export interface Exercise {
  id: string
  name: string
  muscleGroup: string
  /** Weighted lifts track load; bodyweight and cardio don't. */
  kind: 'weighted' | 'bodyweight' | 'cardio'
}

export interface WorkoutSet {
  exerciseId: string
  reps: number
  kg: number
  /** Rating of perceived exertion, 1-10. Optional. */
  rpe?: number
}

export interface Workout {
  id: string
  date: ISODate
  name: string
  sets: WorkoutSet[]
  notes?: string
}

// ---- Daily check-in ----

/** The questions asked each morning. Scored 1-5 unless noted. */
export interface CheckIn {
  date: ISODate
  sleepQuality: number
  sleepHours: number
  energy: number
  soreness: number
  mood: number
  stress: number
  notes?: string
}

export const CHECKIN_QUESTIONS: {
  key: keyof CheckIn
  label: string
  low: string
  high: string
}[] = [
  { key: 'sleepQuality', label: 'How well did you sleep?', low: 'Terribly', high: 'Great' },
  { key: 'energy', label: 'How are your energy levels?', low: 'Drained', high: 'Charged' },
  { key: 'soreness', label: 'How sore are you?', low: 'Not at all', high: 'Very sore' },
  { key: 'mood', label: 'How is your mood?', low: 'Low', high: 'Good' },
  { key: 'stress', label: 'How stressed do you feel?', low: 'Calm', high: 'Stressed' },
]

// ---- Settings ----

export type Goal = 'lose' | 'maintain' | 'gain'

export interface Settings {
  units: 'metric' | 'imperial'
  goal: Goal
  /** Target rate of weight change, kg per week. Negative for loss. */
  rateKgPerWeek: number
  proteinGPerKg: number
  fatPercentOfCalories: number
  startingTdee: number
  /**
   * 'adaptive': targets follow the learned TDEE + goal rate.
   * 'manual': the user sets calorie/macro targets directly, MacroFactor-style.
   */
  targetMode: 'adaptive' | 'manual'
  manualTargets: Macros
}

export const DEFAULT_SETTINGS: Settings = {
  units: 'imperial',
  goal: 'maintain',
  rateKgPerWeek: 0,
  proteinGPerKg: 1.8,
  fatPercentOfCalories: 27,
  startingTdee: 2400,
  targetMode: 'adaptive',
  manualTargets: { kcal: 2400, protein: 160, carbs: 270, fat: 70 },
}

// ---- Routines (pre-set workouts) ----

/** A workout template: exercise names + how many working sets of each. */
export interface Routine {
  name: string
  exercises: { name: string; sets: number }[]
}

export interface AppData {
  foods: Food[]
  foodLog: FoodEntry[]
  weights: WeightEntry[]
  exercises: Exercise[]
  workouts: Workout[]
  checkIns: CheckIn[]
  settings: Settings
}
