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
  /** Micronutrients per 100g, keyed by NUTRIENTS keys. */
  nutrients?: Record<string, number>
  servings: Serving[]
  source: 'usda' | 'openfoodfacts' | 'custom'
  barcode?: string
}

/**
 * Micronutrient definitions: display metadata + generic adult daily targets
 * (US RDA/AI where one exists, recommended limits where marked). Amounts per
 * 100g live in Food.nutrients under these keys.
 */
export interface NutrientDef {
  key: string
  label: string
  unit: 'g' | 'mg' | 'µg'
  /** Daily target; for `limit` nutrients this is a ceiling, not a goal. */
  target: number
  limit?: boolean
  group: 'General' | 'Minerals' | 'Vitamins'
}

export const NUTRIENTS: NutrientDef[] = [
  { key: 'fib', label: 'Fiber', unit: 'g', target: 30, group: 'General' },
  { key: 'sug', label: 'Sugars', unit: 'g', target: 50, limit: true, group: 'General' },
  { key: 'sat', label: 'Saturated fat', unit: 'g', target: 22, limit: true, group: 'General' },
  { key: 'tra', label: 'Trans fat', unit: 'g', target: 2, limit: true, group: 'General' },
  { key: 'chol', label: 'Cholesterol', unit: 'mg', target: 300, limit: true, group: 'General' },
  { key: 'na', label: 'Sodium', unit: 'mg', target: 2300, limit: true, group: 'General' },
  { key: 'k', label: 'Potassium', unit: 'mg', target: 3400, group: 'Minerals' },
  { key: 'ca', label: 'Calcium', unit: 'mg', target: 1000, group: 'Minerals' },
  { key: 'fe', label: 'Iron', unit: 'mg', target: 8, group: 'Minerals' },
  { key: 'mg', label: 'Magnesium', unit: 'mg', target: 420, group: 'Minerals' },
  { key: 'p', label: 'Phosphorus', unit: 'mg', target: 700, group: 'Minerals' },
  { key: 'zn', label: 'Zinc', unit: 'mg', target: 11, group: 'Minerals' },
  { key: 'va', label: 'Vitamin A', unit: 'µg', target: 900, group: 'Vitamins' },
  { key: 'vc', label: 'Vitamin C', unit: 'mg', target: 90, group: 'Vitamins' },
  { key: 'vd', label: 'Vitamin D', unit: 'µg', target: 20, group: 'Vitamins' },
  { key: 've', label: 'Vitamin E', unit: 'mg', target: 15, group: 'Vitamins' },
  { key: 'vk', label: 'Vitamin K', unit: 'µg', target: 120, group: 'Vitamins' },
  { key: 'fol', label: 'Folate', unit: 'µg', target: 400, group: 'Vitamins' },
  { key: 'b1', label: 'Thiamin (B1)', unit: 'mg', target: 1.2, group: 'Vitamins' },
  { key: 'b2', label: 'Riboflavin (B2)', unit: 'mg', target: 1.3, group: 'Vitamins' },
  { key: 'b3', label: 'Niacin (B3)', unit: 'mg', target: 16, group: 'Vitamins' },
  { key: 'b6', label: 'Vitamin B6', unit: 'mg', target: 1.7, group: 'Vitamins' },
  { key: 'b12', label: 'Vitamin B12', unit: 'µg', target: 2.4, group: 'Vitamins' },
]

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
