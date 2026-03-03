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
packages/
  shared/     TypeScript types shared between API and mobile
prisma/       Database schema and migrations
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

## Design Decisions

**Monorepo with shared types** — `@on-deck/shared` exports TypeScript interfaces consumed by both the API and mobile app. A shape mismatch between what the API returns and what the mobile app expects is a compile-time error, not a runtime one.

**Clerk user ID as primary key** — `User.id` is set directly from Clerk's user ID. No mapping table, no sync issues between auth and data identity.

**Stateless API** — no server-side sessions. Every request is authenticated via JWT. Any number of API instances can run behind a load balancer without coordination.

**Offline resilience** — if the API is unreachable, the mobile app falls back to local mock data and shows a banner rather than crashing.
