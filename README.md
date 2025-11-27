# LaunchReady — Development Setup

This repository contains the LaunchReady Streamline MVP (frontend + server). This README describes how to get a local development environment running.

**Quick summary:** install Node, create a `.env` with required variables, install dependencies, run migrations (if needed), then start the app with `npm run dev`.

**Prerequisites**
- **Node:** v18+ (use `node -v` to check).
- **Package manager:** `npm` (bundled with Node). `pnpm` or `yarn` may work but examples below use `npm`.
- **Database:** PostgreSQL compatible database (Supabase or Neon are commonly used here). Provide `DATABASE_URL` in `.env`.
- **Recommended:** `git`, basic familiarity with environment variables.

**Key repo layout**
- `client/` — frontend source (Vite / React).
- `server/` — server code (Express + TypeScript entry at `server/index.ts`).
- `shared/` — shared types and utilities.
- `migrations/` and `db/` — database migration files and Drizzle config.

Environment and secrets
Create a `.env` file at the repo root. Add the following variables (replace values with your own):

```
DATABASE_URL=postgres://user:pass@host:5432/dbname
SUPABASE_URL=https://your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=service-role-key
KIE_API_KEY=your-kie-api-key
OPENAI_API_KEY=your-openai-key
STRIPE_SECRET_KEY=sk_...
RESEND_API_KEY=...
```

Notes:
- The codebase references Supabase-related helpers; if you use Supabase, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required for server-side operations.
- If you store different variable names or have an example `.env.example` file, match those keys.

Install dependencies

```bash
cd <repo-root>
npm install
```

Build / Dev / Start
- Start in development (server + dev tooling):

```bash
npm run dev
```

- Build production artifacts (client build + server bundle):

```bash
npm run build
```

- Start the production bundle (after `npm run build`):

```bash
npm run start
```

Important scripts (from `package.json`)
- `dev` — Run the server entry in development: `NODE_ENV=development tsx server/index.ts`.
- `build` — Build client with Vite and bundle the server with esbuild.
- `start` — Run production `dist/index.js`.
- `check` — Run TypeScript type checker: `tsc`.
- `db:push` — Push schema changes using `drizzle-kit`.
- `migrate:uuid` — Run UUID migration script: `tsx scripts/apply-uuid-migration.ts`.
- `backfill:media-urls` — Backfill media URLs: `tsx scripts/backfill-media-urls.ts`.

Database / Migrations
- This project uses Drizzle DB tooling. Migration files live under `migrations/` (or `db/migrations/`).
- To apply schema changes (push), run:

```bash
npm run db:push
```

- If you use a hosted Postgres (Supabase/Neon), ensure `DATABASE_URL` points to that DB and that migrations are run against it.

Type checking, formatting & linting
- Type check: `npm run check`
- Formatting and linting commands are not included in `package.json` by default. Add your preferred tools if desired.

Troubleshooting
- Port conflicts: If `dev` fails because a port is in use, identify the process and kill it, or change the port in the server config.
- Missing env vars: Most runtime errors during startup are due to missing env vars. Double-check `.env` keys and restart.
- Database connection errors: verify `DATABASE_URL` and network rules for your DB provider (e.g., allow your IP in Supabase settings).

Useful tips
- If you need to run a single script: `npx tsx scripts/your-script.ts`.
- To iterate on frontend code only, you can run a Vite dev server manually from `client` if needed (not required for most setups):

```bash
cd client
npm install
npm run dev
```

Contributing
- Follow standard Git workflow. Branch from `main`, push a branch and open a PR.

If you want, I can also:
- Add a `.env.example` file with placeholder keys.
- Add a `Makefile` or scripts to simplify common tasks.

---
If you'd like changes (more detail for Docker, local Postgres setup, or CI/deploy steps), tell me which platform you prefer and I will expand this README accordingly.
