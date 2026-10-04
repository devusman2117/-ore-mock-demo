# DentiPrep AI: demo

AI mock exam platform for the dental ORE Part 2 (Cosmident-style). Zero dependencies: just Node.js 18+.

## Run locally

```bash
npm start          # http://localhost:3000
# or with auto-reload
npm run dev
```

Open in **Chrome or Edge** (needed for microphone input and voice).

## Deploy to Vercel

Import the GitHub repo at vercel.com/new. No settings to change: `vercel.json` serves `public/` as static files and routes `/api/*` to the `api/index.js` function. Every push to `main` redeploys.

## What's inside

```
dev-server.js        Local dev server (static files + API)
api/index.js         Vercel serverless entry for the same API
lib/handler.js       Stateless API routes shared by both
engine/stations.js   Exam content: OSCE station, ME viva, DTP long case, hidden facts, rubrics
engine/patient.js    AI patient with gated knowledge
engine/grader.js     Evidence-based marking (every mark quotes the candidate)
public/              Single-page frontend (index.html, styles.css, app.js)
vercel.json          Vercel config
```

The API keeps no state. The browser holds the live exam (transcript, revealed facts) and saves results in `localStorage`. In the production build that state moves to NestJS + Postgres.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | /api/stations | List mocks (no rubrics, no hidden facts) |
| GET | /api/stations/:id | One mock |
| POST | /api/sessions | Start an exam `{ stationId }` |
| POST | /api/sessions/:id/message | Candidate speaks/types `{ stationId, text, revealed }` → persona reply |
| POST | /api/sessions/:id/finish | Mark the exam `{ stationId, transcript?, answers?, startedAt }` → attempt + marksheet |

See **DEMO_GUIDE.md** for the client walkthrough script and the Next.js + NestJS production plan.
