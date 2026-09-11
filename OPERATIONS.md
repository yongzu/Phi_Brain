# Operations Guide

This is the practical guide for running Phi Brain yourself: local development, getting real API keys wired
up, and (later) deploying it so you can use it from anywhere.

## 1. Local development

### One-time setup

```bash
npm install                              # installs all 3 workspaces (root, apps/server, apps/web, packages/shared)
npm run build -w packages/shared         # compiles the shared types package (server imports its dist/ output)

cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env

cd apps/server
npx prisma migrate dev                   # creates apps/server/prisma/dev.db and applies the schema
npm run seed                             # inserts the 12 default courses + "general"
cd ../..
```

`apps/server/.env` defaults to `LLM_PROVIDER=mock`, which needs **no API key** — it does simple deterministic
fragmentation so you can exercise the whole app (analyze → correct → save → archive) before you have real keys.

### Running it

```bash
npm run dev
```

This runs the server (`http://localhost:4000`) and the web app (`http://localhost:5173`, or the next free port
if that's taken) together. Open the web URL in a browser.

### Switching to a real LLM

1. Get an API key:
   - Anthropic: https://console.anthropic.com/settings/keys
   - OpenAI: https://platform.openai.com/api-keys
2. Paste it into `apps/server/.env` as `ANTHROPIC_API_KEY=` and/or `OPENAI_API_KEY=`.
3. Set `LLM_PROVIDER=anthropic` (or `openai`).
4. Optional: set `LLM_FALLBACK_PROVIDER=openai` (or `anthropic`) — if the primary call hits a rate limit,
   quota error, or a 5xx, the server automatically retries once with the fallback provider instead of failing
   the request. Leave it blank to disable fallback.
5. Restart the server (`npm run dev` again, or just save `.env` if you're using a file-watcher setup — this
   project doesn't hot-reload env vars, so restart `tsx watch` if it doesn't pick it up).

You never need both keys — a single provider with no fallback is a completely valid setup. `LLM_PROVIDER=mock`
also still works even with real keys present; it's controlled purely by that one env var.

### Cost / rate-limit notes

- One "analyze" call = one LLM request over your whole day's journal text. At typical journal lengths this is
  a small number of tokens — realistically pennies a day even on paid models, but check current pricing:
  - Anthropic: https://www.anthropic.com/pricing
  - OpenAI: https://openai.com/api/pricing/
- The fallback provider exists specifically so a single provider's outage or a hit rate limit doesn't block
  your daily journaling — not to double your spend. It only fires on retryable errors, never on every call.

## 2. Database

SQLite file at `apps/server/prisma/dev.db` (gitignored — it's your personal data, never committed).

- Change the schema: edit `apps/server/prisma/schema.prisma`, then `npx prisma migrate dev --name <what changed>`.
- Back up: just copy `dev.db` somewhere safe. It's a single file.
- Inspect/browse data: `npx prisma studio` (opens a local GUI at `http://localhost:5555`).

## 3. Deploying (when you're ready to use this from more than one device)

You asked for guidance here specifically — read this before you deploy anything, because the SQLite choice
has a real gotcha on most free hosts.

### The gotcha: SQLite + Render's free tier = data loss risk

Render's free **Web Service** has an **ephemeral filesystem** — anything written to disk (including a SQLite
file) is wiped on every redeploy and on periodic restarts. If you deploy the backend as-is with
`DATABASE_URL="file:./prisma/dev.db"`, your journal data can disappear without warning.

Two ways to avoid this, pick one when you actually deploy:

**Option A — switch to a free hosted Postgres (recommended)**
1. Create a free Postgres database at [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the connection string they give you.
3. In `apps/server/prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
4. Set `DATABASE_URL` on Render to that Postgres connection string (and locally in `.env` if you want dev to
   match prod — or keep local dev on SQLite and only prod on Postgres, both work with this one schema line).
5. Run `npx prisma migrate deploy` once against the new database (Render's start command does this
   automatically, see below).

This is a one-line datasource change — no application code changes needed, because everything goes through
Prisma.

**Option B — pay for a Render persistent disk**
Attach a persistent disk to the Render web service and point `DATABASE_URL` at a file path on that disk.
Simpler to reason about, but costs a few dollars a month and ties your data to one host.

If you never deploy the backend (just keep running it on your own machine), none of this matters — local
SQLite is fine indefinitely.

### Backend → Render Web Service

- Root directory: `apps/server`
- Build command: `npm install && npx prisma generate && npm run build`
- Start command: `npx prisma migrate deploy && npm start`
- Environment variables: everything in `apps/server/.env.example`, with real values (`DATABASE_URL` per the
  gotcha above, your LLM key(s), `LLM_PROVIDER`).

### Frontend → Render Static Site

- Root directory: `apps/web`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_URL` = your backend's Render URL (e.g. `https://phi-brain-api.onrender.com`)

Render's free static sites and web services both work for personal, low-traffic use like this. Free web
services also spin down after inactivity and take ~30-60s to wake up on the next request — expect that delay
on the first "analyze" call after a while away.

## 4. What to do if something breaks

- **"LLM_PROVIDER=... 가 설정되었지만 해당 API 키가 없습니다"** — you set `LLM_PROVIDER` to `anthropic`/`openai`
  without setting the matching `*_API_KEY`. Add the key or switch back to `mock`.
- **Analyze returns a 502 with a schema-mismatch message** — the model's response didn't match the expected
  JSON shape. This is logged with the raw model output attached; it's not silently saved, so no bad data
  reaches your archive. Usually resolves itself on retry; if persistent, it may indicate the model/prompt needs
  adjustment for that provider.
- **Journal seems to have vanished after a deploy** — see the SQLite-on-Render gotcha above.
