# DentiPrep AI: demo

AI mock exam platform for the dental ORE Part 2 (Cosmident-style). Zero dependencies: just Node.js 18+.

## Run

```bash
npm start          # http://localhost:3000
# or with auto-reload
npm run dev
```

Open in **Chrome or Edge** (needed for microphone input and voice).

## What's inside

```
server.js            API + static file server (plain Node http)
engine/stations.js   Exam content: OSCE station, ME viva, DTP long case, hidden facts, rubrics
engine/patient.js    AI patient with gated knowledge
engine/grader.js     Evidence-based marking (every mark quotes the candidate)
public/              Single-page frontend (index.html, styles.css, app.js)
data/attempts.json   Saved results (created on first attempt)
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | /api/stations | List mocks (no rubrics, no hidden facts) |
| GET | /api/stations/:id | One mock |
| POST | /api/sessions | Start an exam `{ stationId }` |
| POST | /api/sessions/:id/message | Candidate speaks/types `{ text, via }` → persona reply |
| POST | /api/sessions/:id/finish | Mark the exam `{ answers? }` → attempt + marksheet |
| GET | /api/attempts | Result history |
| GET | /api/attempts/:id | Full marksheet + transcript |
| POST | /api/attempts/:id/contest | Send verdict to mentor review `{ reason }` |
| DELETE | /api/account | One-click delete of all data |

See **DEMO_GUIDE.md** for the client walkthrough script and the Next.js + NestJS production plan.
