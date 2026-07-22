// The bundled USDA food database (public/usda-foods.json, ~8k foods).
// Loaded lazily on first search, then kept in memory. User foods (custom +
// previously logged) always rank ahead of database results.

import type { Food } from './types'

type CompactFood = {
  n: string
  k: number
  p: number
  c: number
  f: number
  s: [string, number][]
  x?: Record<string, number>
}

let db: Food[] = []
let loadPromise: Promise<void> | null = null

export function loadFoodDb(): Promise<void> {
  loadPromise ??= fetch(`${import.meta.env.BASE_URL}usda-foods.json`)
    .then((r) => r.json())
    .then((rows: CompactFood[]) => {
      db = rows.map((r, i) => ({
        id: `usda-${i}`,
        name: r.n,
        per100g: { kcal: r.k, protein: r.p, carbs: r.c, fat: r.f },
        nutrients: r.x,
        servings: [{ label: '100 g', grams: 100 }, ...r.s.map(([label, grams]) => ({ label, grams }))],
        source: 'usda' as const,
      }))
    })
    .catch(() => {
      // Offline from a dev server without the file, or a corrupted bundle:
      // search still works over the user's own foods.
      db = []
    })
  return loadPromise
}

/**
 * Back-fill nutrient data onto library foods saved before the database carried
 * micronutrients, matching by name. Returns null when nothing needed updating.
 */
export function enrichFoods(foods: Food[]): Food[] | null {
  if (db.length === 0) return null
  let changed = false
  const byName = new Map(db.map((f) => [f.name.toLowerCase(), f]))
  const out = foods.map((f) => {
    if (f.nutrients || f.source === 'custom') return f
    const match = byName.get(f.name.toLowerCase())
    if (!match?.nutrients) return f
    changed = true
    return { ...f, nutrients: match.nutrients }
  })
  return changed ? out : null
}

/**
 * Search the user's foods plus the USDA database. Every word of the query must
 * appear in the name; the user's own foods come first, then database matches,
 * shortest names first (so "chicken breast" surfaces the plain food before
 * twenty prepared variations of it).
 */
export function searchFoods(userFoods: Food[], q: string, limit = 10): Food[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return userFoods.slice(0, limit)
  const matches = (f: Food) => {
    const hay = `${f.name} ${f.brand ?? ''}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  }

  const out = userFoods.filter(matches)
  const seen = new Set(out.map((f) => f.name.toLowerCase()))
  const dbHits = db.filter(matches).sort((a, b) => a.name.length - b.name.length)
  for (const f of dbHits) {
    if (out.length >= limit) break
    if (seen.has(f.name.toLowerCase())) continue
    out.push(f)
  }
  return out.slice(0, limit)
}
