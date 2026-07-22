// Starter food + exercise library so the app is useful on first launch.
// Nutrition values are per 100g, sourced from USDA FoodData Central averages.
// The full searchable USDA/Open Food Facts import comes later; custom foods
// can be added in-app any time.

import type { Exercise, Food, Routine } from './types'

const f = (
  name: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  servings: { label: string; grams: number }[] = [],
): Omit<Food, 'id'> => ({
  name,
  per100g: { kcal, protein, carbs, fat },
  servings: [{ label: '100 g', grams: 100 }, ...servings],
  source: 'usda',
})

export const SEED_FOODS: Omit<Food, 'id'>[] = [
  // Proteins
  f('Chicken breast, cooked', 165, 31, 0, 3.6, [{ label: '1 breast (172g)', grams: 172 }]),
  f('Chicken thigh, cooked', 209, 26, 0, 10.9, [{ label: '1 thigh (111g)', grams: 111 }]),
  f('Ground beef 90/10, cooked', 217, 27, 0, 11.8, [{ label: '4 oz (113g)', grams: 113 }]),
  f('Ground beef 80/20, cooked', 254, 26, 0, 16, [{ label: '4 oz (113g)', grams: 113 }]),
  f('Ribeye steak, cooked', 291, 24, 0, 21, [{ label: '8 oz (227g)', grams: 227 }]),
  f('Salmon, cooked', 206, 22, 0, 12, [{ label: '1 fillet (178g)', grams: 178 }]),
  f('Tuna, canned in water', 116, 26, 0, 0.8, [{ label: '1 can (142g)', grams: 142 }]),
  f('Shrimp, cooked', 99, 24, 0.2, 0.3, [{ label: '6 large (42g)', grams: 42 }]),
  f('Egg, whole', 143, 12.6, 0.7, 9.5, [{ label: '1 large (50g)', grams: 50 }]),
  f('Egg whites', 52, 10.9, 0.7, 0.2, [{ label: '1 large white (33g)', grams: 33 }]),
  f('Greek yogurt, nonfat', 59, 10.2, 3.6, 0.4, [{ label: '1 cup (245g)', grams: 245 }]),
  f('Cottage cheese, 2%', 84, 11, 4.3, 2.3, [{ label: '1 cup (226g)', grams: 226 }]),
  f('Whey protein powder', 400, 80, 8, 5, [{ label: '1 scoop (31g)', grams: 31 }]),
  f('Tofu, firm', 78, 9, 2.3, 4.2, [{ label: '1/2 block (150g)', grams: 150 }]),
  f('Pork chop, cooked', 231, 25.7, 0, 13.6, [{ label: '1 chop (145g)', grams: 145 }]),
  f('Turkey breast, cooked', 147, 30, 0, 2.1, [{ label: '4 oz (113g)', grams: 113 }]),

  // Carbs
  f('White rice, cooked', 130, 2.7, 28.2, 0.3, [{ label: '1 cup (158g)', grams: 158 }]),
  f('Brown rice, cooked', 122, 2.7, 25.6, 1, [{ label: '1 cup (195g)', grams: 195 }]),
  f('Oats, dry', 379, 13.2, 67.7, 6.5, [{ label: '1/2 cup (40g)', grams: 40 }]),
  f('Pasta, cooked', 158, 5.8, 30.9, 0.9, [{ label: '1 cup (140g)', grams: 140 }]),
  f('Bread, whole wheat', 247, 13, 41, 3.4, [{ label: '1 slice (32g)', grams: 32 }]),
  f('Bread, white', 266, 8.9, 49, 3.3, [{ label: '1 slice (28g)', grams: 28 }]),
  f('Bagel, plain', 257, 10.1, 50.5, 1.5, [{ label: '1 bagel (105g)', grams: 105 }]),
  f('Tortilla, flour', 297, 8, 49.5, 7.4, [{ label: '1 large (49g)', grams: 49 }]),
  f('Potato, baked', 93, 2.5, 21.2, 0.1, [{ label: '1 medium (173g)', grams: 173 }]),
  f('Sweet potato, baked', 90, 2, 20.7, 0.2, [{ label: '1 medium (151g)', grams: 151 }]),
  f('Quinoa, cooked', 120, 4.4, 21.3, 1.9, [{ label: '1 cup (185g)', grams: 185 }]),
  f('Banana', 89, 1.1, 22.8, 0.3, [{ label: '1 medium (118g)', grams: 118 }]),
  f('Apple', 52, 0.3, 13.8, 0.2, [{ label: '1 medium (182g)', grams: 182 }]),
  f('Blueberries', 57, 0.7, 14.5, 0.3, [{ label: '1 cup (148g)', grams: 148 }]),
  f('Strawberries', 32, 0.7, 7.7, 0.3, [{ label: '1 cup (152g)', grams: 152 }]),
  f('Orange', 47, 0.9, 11.8, 0.1, [{ label: '1 medium (131g)', grams: 131 }]),

  // Fats
  f('Olive oil', 884, 0, 0, 100, [{ label: '1 tbsp (14g)', grams: 14 }]),
  f('Butter', 717, 0.9, 0.1, 81, [{ label: '1 tbsp (14g)', grams: 14 }]),
  f('Peanut butter', 588, 25, 20, 50, [{ label: '2 tbsp (32g)', grams: 32 }]),
  f('Almonds', 579, 21.2, 21.6, 49.9, [{ label: '1 oz (28g)', grams: 28 }]),
  f('Avocado', 160, 2, 8.5, 14.7, [{ label: '1/2 avocado (100g)', grams: 100 }]),
  f('Cheddar cheese', 403, 22.9, 3.1, 33.3, [{ label: '1 slice (28g)', grams: 28 }]),
  f('Mozzarella, part-skim', 254, 24.3, 3.1, 15.9, [{ label: '1 oz (28g)', grams: 28 }]),

  // Veg + misc
  f('Broccoli, cooked', 35, 2.4, 7.2, 0.4, [{ label: '1 cup (156g)', grams: 156 }]),
  f('Spinach, raw', 23, 2.9, 3.6, 0.4, [{ label: '2 cups (60g)', grams: 60 }]),
  f('Mixed greens salad', 17, 1.5, 3.3, 0.2, [{ label: '2 cups (85g)', grams: 85 }]),
  f('Green beans, cooked', 35, 1.9, 7.9, 0.3, [{ label: '1 cup (125g)', grams: 125 }]),
  f('Milk, 2%', 50, 3.3, 4.8, 2, [{ label: '1 cup (244g)', grams: 244 }]),
  f('Milk, whole', 61, 3.2, 4.8, 3.3, [{ label: '1 cup (244g)', grams: 244 }]),
]

const ex = (name: string, muscleGroup: string, kind: Exercise['kind'] = 'weighted'): Omit<Exercise, 'id'> => ({
  name,
  muscleGroup,
  kind,
})

export const SEED_EXERCISES: Omit<Exercise, 'id'>[] = [
  ex('Squat', 'Legs'),
  ex('Front Squat', 'Legs'),
  ex('Leg Press', 'Legs'),
  ex('Romanian Deadlift', 'Legs'),
  ex('Leg Curl', 'Legs'),
  ex('Leg Extension', 'Legs'),
  ex('Calf Raise', 'Legs'),
  ex('Deadlift', 'Back'),
  ex('Barbell Row', 'Back'),
  ex('Lat Pulldown', 'Back'),
  ex('Pull-Up', 'Back', 'bodyweight'),
  ex('Seated Cable Row', 'Back'),
  ex('Bench Press', 'Chest'),
  ex('Incline Dumbbell Press', 'Chest'),
  ex('Dumbbell Fly', 'Chest'),
  ex('Push-Up', 'Chest', 'bodyweight'),
  ex('Overhead Press', 'Shoulders'),
  ex('Lateral Raise', 'Shoulders'),
  ex('Rear Delt Fly', 'Shoulders'),
  ex('Barbell Curl', 'Arms'),
  ex('Dumbbell Curl', 'Arms'),
  ex('Hammer Curl', 'Arms'),
  ex('Triceps Pushdown', 'Arms'),
  ex('Skull Crusher', 'Arms'),
  ex('Dip', 'Arms', 'bodyweight'),
  ex('Plank', 'Core', 'bodyweight'),
  ex('Cable Crunch', 'Core'),
  ex('Hanging Leg Raise', 'Core', 'bodyweight'),
  ex('Running', 'Cardio', 'cardio'),
  ex('Cycling', 'Cardio', 'cardio'),
  ex('Rowing Machine', 'Cardio', 'cardio'),
  ex('Incline Walk', 'Cardio', 'cardio'),
]

// Pre-set routines, in the spirit of MacroFactor Workouts' built-in programs.
// Exercise names must match SEED_EXERCISES; sets = working sets to pre-fill.
export const SEED_ROUTINES: Routine[] = [
  {
    name: 'Push Day',
    exercises: [
      { name: 'Bench Press', sets: 4 },
      { name: 'Overhead Press', sets: 3 },
      { name: 'Incline Dumbbell Press', sets: 3 },
      { name: 'Lateral Raise', sets: 3 },
      { name: 'Triceps Pushdown', sets: 3 },
    ],
  },
  {
    name: 'Pull Day',
    exercises: [
      { name: 'Deadlift', sets: 3 },
      { name: 'Lat Pulldown', sets: 3 },
      { name: 'Barbell Row', sets: 3 },
      { name: 'Rear Delt Fly', sets: 3 },
      { name: 'Barbell Curl', sets: 3 },
    ],
  },
  {
    name: 'Leg Day',
    exercises: [
      { name: 'Squat', sets: 4 },
      { name: 'Romanian Deadlift', sets: 3 },
      { name: 'Leg Press', sets: 3 },
      { name: 'Leg Curl', sets: 3 },
      { name: 'Calf Raise', sets: 4 },
    ],
  },
  {
    name: 'Upper Body',
    exercises: [
      { name: 'Bench Press', sets: 3 },
      { name: 'Barbell Row', sets: 3 },
      { name: 'Overhead Press', sets: 3 },
      { name: 'Lat Pulldown', sets: 3 },
      { name: 'Dumbbell Curl', sets: 2 },
      { name: 'Triceps Pushdown', sets: 2 },
    ],
  },
  {
    name: 'Lower Body',
    exercises: [
      { name: 'Squat', sets: 3 },
      { name: 'Romanian Deadlift', sets: 3 },
      { name: 'Leg Extension', sets: 3 },
      { name: 'Leg Curl', sets: 3 },
      { name: 'Calf Raise', sets: 3 },
    ],
  },
  {
    name: 'Full Body',
    exercises: [
      { name: 'Squat', sets: 3 },
      { name: 'Bench Press', sets: 3 },
      { name: 'Barbell Row', sets: 3 },
      { name: 'Overhead Press', sets: 2 },
      { name: 'Barbell Curl', sets: 2 },
    ],
  },
]
