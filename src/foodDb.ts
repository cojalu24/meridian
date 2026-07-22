// The bundled USDA food database (public/usda-foods.json, ~8k foods).
// Loaded lazily on first search, then kept in memory. User foods (custom +
// previously logged) always rank ahead of database results.

import type { Food, FoodEntry } from './types'

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
 * Relevance score for a food against a query. Null = no match.
 *
 * Every query word must prefix-match a word of the name ("apple" matches
 * "Apples"). Among matches, canonical foods win: the name's FIRST word
 * matching the query's first word beats a mid-name match ("Apples, raw" over
 * "Croissants, apple"), fewer comma-qualifiers beats more ("Apples, raw, with
 * skin" over "Apple juice, canned or bottled, unsweetened, with added…"),
 * raw/plain foods and foods with real serving sizes get a nudge.
 */
// Query words that USDA spells differently.
const SYNONYMS: Record<string, string[]> = {
  oatmeal: ['oats'],
  soda: ['carbonated'],
  garbanzo: ['chickpeas'],
  chickpea: ['garbanzo'],
}

function scoreFood(f: Food, query: string, qTokens: string[]): number | null {
  const name = `${f.name} ${f.brand ?? ''}`.toLowerCase()
  const tokens = name.split(/[^a-z0-9%]+/).filter(Boolean)
  for (const qt of qTokens) {
    const variants = [qt, ...(SYNONYMS[qt] ?? [])]
    if (!tokens.some((t) => variants.some((v) => t.startsWith(v)))) return null
  }
  let s = 0
  if (name === query) s += 1000
  // USDA names canonical staples as "Thing, qualifier, qualifier…" — when the
  // part before the first comma IS the query ("Milk, whole…" for "milk"),
  // that's the food itself, not a dish containing it ("Milk and cereal bar").
  const firstSegment = name.split(',')[0].trim()
  if (firstSegment === query || firstSegment === `${query}s` || firstSegment === `${query}es`)
    s += 400
  // Strong lead-word bonus only for exact or plural matches ("apple" →
  // "Apples", but not "APPLEBEE'S"); mere prefixes get a smaller nudge.
  const lead = tokens[0]
  const qLead = qTokens[0]
  if (lead === qLead || lead === `${qLead}s` || lead === `${qLead}es`) s += 300
  else if (lead?.startsWith(qLead)) s += 120
  if (qTokens.length > 1 && name.startsWith(query)) s += 150
  // Qualifiers that mark the everyday version of a staple ("Milk, whole" over
  // "Milk, sheep, fluid"; cooked white rice over raw brown) — a stand-in for
  // the popularity data we don't have.
  for (const kw of COMMON_QUALIFIERS) if (name.includes(kw)) s += 40
  // "Milk, whole" / "Rice, white" / "Yogurt, plain": when the FIRST qualifier
  // is one of these, this is the canonical everyday form of the staple.
  const segments = f.name.toLowerCase().split(',').map((x) => x.trim())
  if (segments[1] && CANONICAL_QUALIFIERS.has(segments[1])) s += 60
  if (f.servings.length > 1) s += 30
  s -= segments.length * 20
  s -= Math.min(80, f.name.length / 2)
  return s
}

const COMMON_QUALIFIERS = ['whole', 'cooked', 'white', '2%', 'raw, with skin', 'large']
const CANONICAL_QUALIFIERS = new Set(['whole', 'white', 'plain', 'raw', 'cooked', 'fresh'])

/**
 * Search the user's foods plus the USDA database. The user's own foods come
 * first, ordered by how often they've been logged (history is the strongest
 * relevance signal there is); database results follow, ranked by scoreFood.
 */
export function searchFoods(
  userFoods: Food[],
  q: string,
  limit = 10,
  log: FoodEntry[] = [],
): Food[] {
  const query = q.toLowerCase().trim()
  const qTokens = query.split(/\s+/).filter(Boolean)
  if (qTokens.length === 0) return userFoods.slice(0, limit)

  const freq = new Map<string, number>()
  for (const e of log) freq.set(e.foodId, (freq.get(e.foodId) ?? 0) + 1)

  const out = userFoods
    .filter((f) => scoreFood(f, query, qTokens) !== null)
    .sort((a, b) => (freq.get(b.id) ?? 0) - (freq.get(a.id) ?? 0))
  const seen = new Set(out.map((f) => f.name.toLowerCase()))

  const dbHits = db
    .map((f) => ({ f, s: scoreFood(f, query, qTokens) }))
    .filter((x): x is { f: Food; s: number } => x.s !== null)
    .sort((a, b) => b.s - a.s)
  for (const { f } of dbHits) {
    if (out.length >= limit) break
    if (seen.has(f.name.toLowerCase())) continue
    out.push(f)
  }
  return out.slice(0, limit)
}
