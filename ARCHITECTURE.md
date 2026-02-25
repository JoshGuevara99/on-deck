# On Deck — Architecture

> **For Claude agents:** This file exists so agents working in a single subdirectory (`apps/api` or `apps/mobile`) understand the full system. Read this before making decisions that cross boundaries.

---

## System overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Monorepo root                        │
│  pnpm workspaces · packages/shared (types) · prisma/        │
└───────────────────┬─────────────────────────────────────────┘
                    │ @on-deck/shared (TypeScript types only)
          ┌─────────┴──────────┐
          ▼                    ▼
  ┌───────────────┐    ┌──────────────────┐
  │  apps/mobile  │    │    apps/api       │
  │  Expo Router  │───▶│  Express + Prisma │
  │  iOS/Android/ │    │  REST API         │
  │  Web          │    │  Port 3000        │
  └───────────────┘    └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │    PostgreSQL     │
                       │  (local or Docker)│
                       └──────────────────┘
```

**Auth:** Clerk handles identity on both sides. The mobile app uses `@clerk/clerk-expo`; the API validates Clerk JWTs on protected routes.

---

## Packages

### `packages/shared` — `@on-deck/shared`
- **TypeScript types only.** No runtime code, no dependencies.
- Both apps import from here. Never put logic here — only `interface` and `type` definitions.
- Source is consumed directly (no build step): `"types": "./src/index.ts"`.
- **When you add a new model or field, update shared types first**, then the API, then the mobile app.

### `apps/api` — `@on-deck/api`
- Express REST API, TypeScript, CommonJS output.
- Stateless by design — no in-memory state, all persistence via Prisma.
- Internal structure:
  ```
  src/
  ├── index.ts          # process entry — binds port, loads env
  ├── app.ts            # Express app — middleware + router mounting
  ├── routes/           # One file per resource (health.ts, events.ts, …)
  ├── middleware/        # Auth verification, error handling, validation
  ├── services/          # Business logic + all Prisma queries
  └── lib/
      └── prisma.ts     # Singleton PrismaClient — import from here everywhere
  ```
- Mount new routers in `app.ts`. Keep handlers thin — delegate to `services/`.

### `apps/mobile` — `@on-deck/mobile`
- Expo SDK 51, Expo Router (file-based routing), TypeScript.
- Targets iOS, Android, and web from a single codebase.
- Internal structure:
  ```
  app/
  ├── _layout.tsx       # Root layout (navigation shell, auth provider)
  ├── index.tsx         # Home / discovery screen
  ├── (auth)/           # Auth screens (sign-in, sign-up)
  └── (tabs)/           # Bottom-tab group once authenticated
  ```
- All API calls go through a central client (to be added at `lib/api.ts`). Never fetch directly from screens.
- `EXPO_PUBLIC_*` env vars are the only ones accessible client-side.

---

## Data model

```
User           (id = Clerk user ID, never auto-generated)
  └── hosts many → Event

Venue          (id = cuid)
  └── hosts many → Event

Event          (id = cuid)
  ├── type: OPEN_MIC | JAM_SESSION
  ├── belongs to → Venue
  └── belongs to → User (host)
```

Schema: `prisma/schema.prisma` (repo root). Prisma CLI runs from the repo root via `pnpm db:*` scripts.

---

## API conventions

| Concern | Convention |
|---------|-----------|
| Base URL (local) | `http://localhost:3000` |
| Base URL (env var) | `EXPO_PUBLIC_API_URL` in mobile |
| Auth header | `Authorization: Bearer <clerk_jwt>` |
| Success envelope | Raw JSON object or array — no wrapper |
| Error envelope | `{ error: string }` with appropriate HTTP status |
| ID format | `cuid` for app entities; Clerk ID for `User.id` |
| Dates | ISO 8601 strings over the wire |

### Current routes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check → `{ status: "ok" }` |

---

## Environment variables

### API (`apps/api/.env` or process env)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `PORT` | Port to listen on (default `3000`) |
| `CLERK_SECRET_KEY` | Clerk backend secret (never expose to client) |

### Mobile (`apps/mobile` — must be prefixed `EXPO_PUBLIC_` for client access)
| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `EXPO_PUBLIC_API_URL` | API base URL (e.g. `http://localhost:3000`) |

---

## Cross-cutting rules

1. **`User.id` is always the Clerk user ID.** Never call `cuid()` or any generator on it.
2. **No hardcoded URLs or secrets** anywhere in source. Use env vars.
3. **All shared types live in `packages/shared`.** If both apps need a shape, it goes there.
4. **Services own all Prisma calls.** Route handlers must not query the DB directly.
5. **The API is the source of truth.** Mobile never writes to the DB directly.
