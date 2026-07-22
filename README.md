# Meridian

A private, free, open-source wellness tracker. One app for the things you'd
otherwise spread across MacroFactor, MacroFactor Workouts, and Whoop:

- **Food & macros** — log meals against a built-in food library (or your own
  custom foods), with calorie and macro targets that **adapt to your real
  data**: the app compares what you eat with how your weight trend actually
  moves and learns your true maintenance calories, no formulas or guesswork.
- **Workouts** — log sets, reps, and weight; sets pre-fill from your last
  session; strength progress is charted as estimated one-rep max so it shows
  through rep-range changes.
- **Morning check-in** — Whoop-style daily questions (sleep, energy, soreness,
  mood, stress) so you can spot trends in how you feel over time.
- **Trends** — smoothed weight trend vs. scale weight, calories, check-in
  metrics, and strength, all charted.

**Your data never leaves your machine.** No account, no server, no analytics.
Back up or move your data any time with one-click JSON export/import in
Settings.

## Run it

Desktop app (Mac, Apple Silicon):

```bash
cd desktop && ./build.sh
```

…then open `desktop/build/Meridian-darwin-arm64/Meridian.app`.

Or run it in a browser for development:

```bash
npm install
npm run dev
```

## Stack

React + TypeScript + Vite, wrapped in Electron for desktop. No backend.
An iOS version is planned.

## License

MIT
