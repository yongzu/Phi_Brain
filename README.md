# Phi Brain

Phase 1 (Journal Organizer) of the **Phi Second Brain** project — see [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md)
for the full product spec (source of truth for scope/decisions).

Write one integrated daily journal (4F: Fact / Feeling / Finding / Future Item) the way you always have. An LLM
splits it into meaning-sized fragments, classifies each by course and by 4F type, and extracts insights and
action items — all editable before saving. Over time this turns one daily journal into 12 evolving,
per-course archives.

## Structure

```
apps/
  server/   Node + Express + Prisma (SQLite locally) — the API + LLM integration
  web/      Vite + React — the UI
packages/
  shared/   Shared types + the "AI Output Contract" zod schema
```

## Quick start

See [`OPERATIONS.md`](./OPERATIONS.md) for the full guide (env vars, local dev, deploying to Render, DB
migration path, cost notes). Short version:

```bash
npm install
npm run build -w packages/shared
cp apps/server/.env.example apps/server/.env   # LLM_PROVIDER=mock works with no API keys
cp apps/web/.env.example apps/web/.env
npm run -w apps/server prisma:migrate
npm run -w apps/server seed
npm run dev
```

Backend on http://localhost:4000, frontend on http://localhost:5173 (or the next free port).

## MVP scope

Journal input → AI analysis (fragment + course + 4F classification, with user correction) → save → per-course
archive → cross-course Future Items dashboard → course management. Course Agents (Phase 2) and the
cross-course Meta Agent / "Phi Brain" (Phase 3) are intentionally **not** built yet — see `PROJECT_CONTEXT.md`
§14 and §6.
