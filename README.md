# Caltrain Planner

A mobile-friendly Caltrain commute planner. Full official timetable
(effective Jan 31, 2026) embedded directly in the app — no API calls.

## Run locally

```
npm install
npm run dev
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → Import the repo.
3. Vercel auto-detects Vite. Leave build settings as default
   (`npm run build`, output dir `dist`). Deploy.
4. You'll get a URL like `your-app.vercel.app`.

## Add to iPhone home screen

1. Open the deployed URL in Safari on your iPhone.
2. Tap the Share icon → "Add to Home Screen".
3. It now opens full-screen like a native app.

## Updating the schedule

Caltrain publishes a new timetable a few times a year. When that
happens, the train data in `src/App.jsx` (the `NB_RAW` / `SB_RAW`
objects) needs to be re-synced from caltrain.com/schedules/pdfs.
