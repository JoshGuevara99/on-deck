# On Deck

Discover and submit creative events in your city — open mics, jam sessions, comedy nights, poetry slams, workshops, and more.

## Stack

- **Mobile** — React Native (Expo SDK 51, Expo Router)
- **API** — Node.js, Express, Zod
- **Database** — PostgreSQL via Prisma ORM v6
- **Shared** — `@on-deck/shared` types package
- **Package manager** — pnpm workspaces

## Prerequisites

- Node.js ≥ 18.18
- pnpm (`npm install -g pnpm`)
- PostgreSQL running locally

## Setup

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ondeck"
```

## Database

```bash
# Apply migrations (creates tables)
pnpm db:migrate

# Generate Prisma client (run after any schema change)
pnpm db:generate

# Seed with sample Austin venues and events
pnpm db:seed

# Open Prisma Studio (visual DB browser)
pnpm db:studio

# Reset database (wipe + re-migrate + re-seed prompt)
pnpm db:reset
```

## Running the app

You need **two terminals** — the API and the mobile app are separate processes.

**Terminal 1 — API (port 3000):**
```bash
pnpm --filter @on-deck/api dev
```

**Terminal 2 — Mobile (Expo, port 8081):**
```bash
pnpm --filter @on-deck/mobile dev
```

Then in the Expo terminal press `i` (iOS Simulator) or `a` (Android Emulator).

### Connecting mobile to the API

Set `EXPO_PUBLIC_API_URL` in your `.env` (or as a shell variable before starting Expo):

| Target | URL |
|---|---|
| iOS Simulator | `http://localhost:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| Real device | `http://<your-LAN-ip>:3000` |

If the API is unreachable, the app falls back to built-in mock data and shows an offline banner.

## Is data persistent?

**Yes.** PostgreSQL stores data on disk. Stopping and restarting the API server does not affect the database — submitted events and venues stay. To wipe everything and start fresh, run `pnpm db:reset`.

## Viewing and managing the database

| Tool | How to use |
|---|---|
| **Prisma Studio** | `pnpm db:studio` — opens a browser UI at `http://localhost:5555` to browse/edit every table |
| **TablePlus / pgAdmin / DBeaver** | Connect with your `DATABASE_URL` credentials for a full GUI client |
| **psql** | `psql $DATABASE_URL` for raw SQL |
| **API** | `http://localhost:3000/events` and `http://localhost:3000/venues` |

Prisma Studio is the quickest way to inspect what a form submission wrote to the database.

## Other commands

```bash
# Run all tests
pnpm --filter @on-deck/mobile test

# Typecheck entire monorepo
pnpm typecheck
```
