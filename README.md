# On Deck

Discover and submit open mics, jam sessions, comedy nights, poetry slams, and other creative performance events in your city.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo, Expo Router |
| API | Node.js, Express, Zod |
| Database | PostgreSQL, Prisma ORM |
| Auth | Clerk |
| Monorepo | pnpm workspaces |

## Project Structure

```
apps/
  api/        Express REST API (port 3000)
  mobile/     Expo mobile app (port 8081)
  scraper/    AI-powered event scraper (run manually or on a schedule)
packages/
  shared/     TypeScript types shared between API and mobile
prisma/       Database schema and migrations
```

## Event Scraper

The scraper uses Claude (with web search) to find real open mic and jam session listings, validate them, and insert them into the database. It runs as a standalone script — nothing in the API or mobile app triggers it automatically.

```bash
# Scrape all 14 supported cities
pnpm --filter @on-deck/scraper scrape

# Scrape a single city
pnpm --filter @on-deck/scraper scrape -- --city "Austin"
pnpm --filter @on-deck/scraper scrape -- --city "New York"
```

Requires `ANTHROPIC_API_KEY` in `.env`.

**What it does on each run:**
1. Deletes past events that the scraper previously inserted (keeps the DB clean)
2. Skips any city scraped within the last 20 hours (cooldown prevents redundant API calls)
3. Asks Claude to search the web for upcoming events in each city
4. Rejects events that are in the past, more than 90 days out, or in the wrong city
5. Upserts venues and inserts deduplicated events into the database
6. Records each run in `ScraperRun` for cooldown tracking

**If something goes wrong:**
- A failed city is logged and skipped — other cities in the run continue
- Events that fail validation are logged and skipped individually
- Past events that slip through the search results are caught at ingest time and rejected
- User-submitted events (`submittedBy != null`) are never touched by the age-off step
- Re-running the scraper is always safe — duplicates are detected by venue + title + date

**Verifying a run:**
```bash
# See what's in the database
pnpm db:studio

# Or query directly
psql ondeck -c "SELECT city, COUNT(*) FROM \"Event\" GROUP BY city ORDER BY city;"
psql ondeck -c "SELECT city, state, \"ranAt\", inserted, skipped FROM \"ScraperRun\" ORDER BY \"ranAt\" DESC LIMIT 20;"
```

## Prerequisites

- Node.js ≥ 18.18
- pnpm (`npm install -g pnpm`)
- PostgreSQL running locally
- A [Clerk](https://clerk.com) account (free tier works)

## Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables and fill in values
cp .env.example .env

# Apply database migrations
pnpm db:migrate
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | e.g. `postgresql://localhost/ondeck` |
| `CLERK_SECRET_KEY` | From Clerk Dashboard → API Keys |
| `CLERK_PUBLISHABLE_KEY` | Same page |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Same key — bundled into the mobile app by Expo |
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000` for simulator, your LAN IP for a real device |
| `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com) — required for the scraper |

## Running

```bash
pnpm dev
```

Starts both the API and Expo dev server in parallel. Press `i` for iOS Simulator or `a` for Android Emulator.

```bash
pnpm --filter @on-deck/api dev      # API only
pnpm --filter @on-deck/mobile dev   # Mobile only
```

## Database

```bash
pnpm db:migrate    # Apply migrations
pnpm db:generate   # Regenerate Prisma client after schema changes
pnpm db:studio     # Open visual database browser at localhost:5555
pnpm db:reset      # Wipe and re-migrate (destructive)
```

## Infrastructure

**Local development** uses a plain PostgreSQL database — no Docker required. Create the database once with `createdb ondeck`, set `DATABASE_URL` in `.env`, and run `pnpm db:migrate`.

**Docker** is available for running Postgres and the API together via `docker compose up`. The compose topology mirrors production so local behavior stays consistent.

**Kubernetes** manifests live in `k8s/`. The API is deployed as a `Deployment` with 2 replicas behind a `ClusterIP` service. Health check endpoints (`/health`) are wired to Kubernetes readiness and liveness probes, so the cluster only routes traffic to instances that are fully up. All secrets (`DATABASE_URL`, `CLERK_SECRET_KEY`) are pulled from a Kubernetes `Secret` — no hardcoded credentials anywhere in the manifests.

Migrating from local Postgres to a managed database (e.g. RDS, Cloud SQL) requires changing a single value: `database-url` in the Kubernetes secret.

## Scalability

The API is stateless by design — no in-memory sessions, no local file state. Every request is independently authenticated via JWT. This means:

- **Horizontal scaling** is trivial: add more replicas to the Kubernetes `Deployment`, all instances are interchangeable.
- **Zero-downtime deploys**: the readiness probe prevents traffic from hitting a new pod until it's ready.
- **Database** is the single source of truth. All state lives in Postgres, so scaling the API layer never requires data migration or coordination between instances.

## Design Decisions

**Monorepo with shared types** — `@on-deck/shared` exports TypeScript interfaces consumed by both the API and mobile app. A shape mismatch between what the API returns and what the mobile app expects is a compile-time error, not a runtime one.

**Clerk user ID as primary key** — `User.id` is set directly from Clerk's user ID. No mapping table, no sync issues between auth and data identity.

**Stateless API** — no server-side sessions. Every request is authenticated via JWT. Any number of API instances can run behind a load balancer without coordination.

**Offline resilience** — if the API is unreachable, the mobile app shows an error banner rather than crashing.

**Scraper safety** — the scraper never modifies user-submitted events. Age-off, deduplication, and city validation all operate only on auto-scraped records.

