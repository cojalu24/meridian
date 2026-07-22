// Converts USDA FoodData Central downloads into the compact food database the
// app ships with (public/usda-foods.json).
//
// Inputs (pass the directory containing the unzipped downloads):
//   - FoodData_Central_sr_legacy_food_csv_2018-04/   (SR Legacy, ~7.8k foods)
//   - FoodData_Central_foundation_food_json_*.json   (Foundation foods)
//
// Output format, tuned for size (one entry per food):
//   { "n": name, "k": kcal, "p": protein, "c": carbs, "f": fat,
//     "s": [["1 cup", 240], ...] }   // servings, grams — per-100g macros
//
// Usage: node scripts/build-food-db.mjs <downloads-dir>

import { parse } from 'csv-parse/sync'
import fs from 'node:fs'
import path from 'node:path'

const srcDir = process.argv[2]
if (!srcDir) {
  console.error('usage: node scripts/build-food-db.mjs <downloads-dir>')
  process.exit(1)
}

const outPath = path.join(import.meta.dirname, '..', 'public', 'usda-foods.json')

// Nutrient ids: protein, fat, carbs (by difference), energy (kcal),
// and the Atwater energy variants some Foundation foods use instead.
const PROTEIN = 1003
const FAT = 1004
const CARBS = 1005
const KCAL = 1008
const KCAL_ATWATER_GENERAL = 2047
const KCAL_ATWATER_SPECIFIC = 2048

// Extended nutrients, USDA id -> compact key used in the app.
// Amounts are per 100g in the units the app displays (g / mg / µg).
const MICROS = new Map([
  [1079, 'fib'], // fiber, g
  [2000, 'sug'], // total sugars, g
  [1063, 'sug'], // total sugars (alternate id in some releases)
  [1258, 'sat'], // saturated fat, g
  [1257, 'tra'], // trans fat, g
  [1253, 'chol'], // cholesterol, mg
  [1093, 'na'], // sodium, mg
  [1092, 'k'], // potassium, mg
  [1087, 'ca'], // calcium, mg
  [1089, 'fe'], // iron, mg
  [1090, 'mg'], // magnesium, mg
  [1091, 'p'], // phosphorus, mg
  [1095, 'zn'], // zinc, mg
  [1106, 'va'], // vitamin A RAE, µg
  [1162, 'vc'], // vitamin C, mg
  [1114, 'vd'], // vitamin D, µg
  [1109, 've'], // vitamin E, mg
  [1185, 'vk'], // vitamin K, µg
  [1177, 'fol'], // folate total, µg
  [1178, 'b12'], // vitamin B12, µg
  [1175, 'b6'], // vitamin B6, mg
  [1165, 'b1'], // thiamin, mg
  [1166, 'b2'], // riboflavin, mg
  [1167, 'b3'], // niacin, mg
])

const round1 = (x) => Math.round(x * 10) / 10

// Portion labels that are USDA jargon, not something a person would pick.
const isJargonLabel = (label) => /\bRACC\b|Quantity not specified/i.test(label)

const foods = new Map() // lowercase name -> entry

function addFood(name, kcal, protein, carbs, fat, servings, micros) {
  if (!name) return
  protein = protein ?? 0
  carbs = carbs ?? 0
  fat = fat ?? 0
  // Energy fallback: compute from macros if no energy nutrient present.
  if (kcal == null) kcal = protein * 4 + carbs * 4 + fat * 9
  if (kcal === 0 && protein === 0 && carbs === 0 && fat === 0) return
  const entry = {
    n: name,
    k: Math.round(kcal),
    p: round1(protein),
    c: round1(carbs),
    f: round1(fat),
    s: servings.slice(0, 4),
  }
  if (micros && Object.keys(micros).length > 0) {
    // Round to 2 decimals; drop zeros to keep the file small.
    entry.x = Object.fromEntries(
      Object.entries(micros)
        .map(([key, v]) => [key, Math.round(v * 100) / 100])
        .filter(([, v]) => v > 0),
    )
  }
  foods.set(name.toLowerCase(), entry)
}

// ---- SR Legacy (CSV) ----

const srDir = fs
  .readdirSync(srcDir)
  .map((d) => path.join(srcDir, d))
  .find((d) => /sr_legacy_food_csv/.test(d) && fs.statSync(d).isDirectory())
if (!srDir) throw new Error('SR Legacy csv directory not found in ' + srcDir)

const csv = (file) =>
  parse(fs.readFileSync(path.join(srDir, file)), { columns: true, cast: false })

const srNames = new Map() // fdc_id -> description
for (const row of csv('food.csv')) srNames.set(row.fdc_id, row.description)

const srNutrients = new Map() // fdc_id -> {kcal?, p?, c?, f?, micros: {}}
for (const row of csv('food_nutrient.csv')) {
  const nid = Number(row.nutrient_id)
  const microKey = MICROS.get(nid)
  if (nid !== PROTEIN && nid !== FAT && nid !== CARBS && nid !== KCAL && !microKey) continue
  const rec = srNutrients.get(row.fdc_id) ?? { micros: {} }
  const amt = Number(row.amount)
  if (nid === PROTEIN) rec.p = amt
  else if (nid === FAT) rec.f = amt
  else if (nid === CARBS) rec.c = amt
  else if (nid === KCAL) rec.kcal = amt
  else if (rec.micros[microKey] === undefined) rec.micros[microKey] = amt
  srNutrients.set(row.fdc_id, rec)
}

const unitNames = new Map() // measure_unit_id -> name
for (const row of csv('measure_unit.csv')) unitNames.set(row.id, row.name)

const srPortions = new Map() // fdc_id -> [[label, grams]]
for (const row of csv('food_portion.csv')) {
  const grams = Number(row.gram_weight)
  if (!grams) continue
  const unit = unitNames.get(row.measure_unit_id)
  const qty = Number(row.amount) || ''
  const label = [qty, unit !== 'undetermined' ? unit : '', row.modifier || row.portion_description]
    .filter(Boolean)
    .join(' ')
    .trim()
  if (!label || isJargonLabel(label)) continue
  const list = srPortions.get(row.fdc_id) ?? []
  list.push([label, Math.round(grams)])
  srPortions.set(row.fdc_id, list)
}

for (const [id, name] of srNames) {
  const rec = srNutrients.get(id)
  if (!rec) continue
  addFood(name, rec.kcal ?? null, rec.p, rec.c, rec.f, srPortions.get(id) ?? [], rec.micros)
}
const srCount = foods.size
console.log(`SR Legacy: ${srCount} foods`)

// ---- Foundation (JSON) — processed second so it wins on duplicate names ----

const fdnFile = fs
  .readdirSync(srcDir)
  .find((f) => /foundation_food_json.*\.json$/.test(f))
if (!fdnFile) throw new Error('Foundation json not found in ' + srcDir)

const fdn = JSON.parse(fs.readFileSync(path.join(srcDir, fdnFile)))
const list = (fdn.FoundationFoods ?? fdn).filter(Boolean)
for (const food of list) {
  let kcal = null
  let p, c, f
  const micros = {}
  for (const fn of food.foodNutrients ?? []) {
    const nid = fn.nutrient?.id
    const amt = fn.amount
    if (amt == null) continue
    const microKey = MICROS.get(nid)
    if (nid === PROTEIN) p = amt
    else if (nid === FAT) f = amt
    else if (nid === CARBS) c = amt
    else if (nid === KCAL) kcal = amt
    else if ((nid === KCAL_ATWATER_GENERAL || nid === KCAL_ATWATER_SPECIFIC) && kcal == null)
      kcal = amt
    else if (microKey && micros[microKey] === undefined) micros[microKey] = amt
  }
  const servings = []
  for (const fp of food.foodPortions ?? []) {
    if (!fp.gramWeight) continue
    const label = [fp.amount || '', fp.measureUnit?.name !== 'undetermined' ? fp.measureUnit?.name : '', fp.modifier]
      .filter(Boolean)
      .join(' ')
      .trim()
    if (label && !isJargonLabel(label)) servings.push([label, Math.round(fp.gramWeight)])
  }
  addFood(food.description, kcal, p, c, f, servings, micros)
}
console.log(`Foundation: ${foods.size - srCount} new (some replaced SR entries)`)

// ---- write ----

const out = [...foods.values()].sort((a, b) => a.n.localeCompare(b.n))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out))
console.log(`Wrote ${out.length} foods → ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(1)} MB)`)
