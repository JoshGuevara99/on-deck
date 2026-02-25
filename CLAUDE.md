# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Setup
```bash
pnpm install
cp .env.example .env       # then fill in values
pnpm db:generate           # generate Prisma client
```

### Local Postgres (no Docker required)
```bash
createdb ondeck            # one-time: create the local database
# Set DATABASE_URL=postgresql://localhost/ondeck in .env
pnpm db:migrate            # apply migrations
```

### Development
```bash
pnpm dev                            # both apps in parallel
pnpm --filter @on-deck/api dev      # API only  (tsx watch, port 3000)
pnpm --filter @on-deck/mobile dev   # Expo only (port 8081)
```

### Database (always run from repo root)
```bash
pnpm db:generate   # regenerate Prisma client after schema changes
pnpm db:migrate    # create + apply a new migration
pnpm db:push       # sync schema without migration history (prototype only)
pnpm db:studio     # open Prisma Studio GUI
pnpm db:reset      # reset DB and re-run all migrations (destructive)
```

### Build & type-check
```bash
pnpm build        # build packages then apps
pnpm typecheck    # type-check all workspaces
```

### Docker (when Docker is installed)
```bash
docker compose up             # start Postgres + API
docker compose up postgres    # Postgres only
docker compose down -v        # stop + remove volumes
```

## Architecture

### Monorepo layout
| Path | Package | Purpose |
|------|---------|---------|
| `apps/api` | `@on-deck/api` | Express REST API |
| `apps/mobile` | `@on-deck/mobile` | Expo + Expo Router app (iOS/Android/web) |
| `packages/shared` | `@on-deck/shared` | TypeScript types only — no runtime code |
| `prisma/` | — | Single schema + migrations at repo root |
| `k8s/` | — | Stubbed Kubernetes manifests |

### Key constraints
- **`User.id`** maps directly to Clerk's user ID — no `@default(cuid())` on `User`.
- **No hardcoded config** — every URL, secret, and port comes from environment variables.
- **Stateless API** — all state lives in Postgres; API instances are interchangeable.
- **pnpm + `.npmrc`** uses `node-linker=hoisted` for Expo/Metro compatibility.

### Shared types
`packages/shared/src/` exports TypeScript interfaces only. Both apps import from `@on-deck/shared`. The package points its `types` and `main` fields directly at TS source — no build step needed.

### Prisma
Schema lives at `prisma/schema.prisma` (repo root). The Prisma CLI is a root dev dependency; run all `db:*` scripts from the repo root. Before using Prisma in any route, add a singleton client at `apps/api/src/lib/prisma.ts`:

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### API conventions
| Layer | Location |
|-------|----------|
| Route handlers | `apps/api/src/routes/` |
| Middleware (auth, validation, errors) | `apps/api/src/middleware/` |
| Business logic / DB queries | `apps/api/src/services/` |
| Singletons (Prisma, etc.) | `apps/api/src/lib/` |

Mount all routers in `apps/api/src/app.ts`.

### Mobile routing
Expo Router uses file-based routing from `apps/mobile/app/`. Layouts are `_layout.tsx` files; screens are co-located siblings. `expo-env.d.ts` is auto-generated on first `expo start` — do not edit it.

### Scaling / Kubernetes path
- `apps/api/Dockerfile` is multi-stage (`deps → builder → runner`), runs as a non-root user, and produces a minimal image.
- `docker-compose.yml` mirrors the Kubernetes service topology so local behaviour matches production.
- `k8s/` manifests pull sensitive values from Kubernetes Secrets. When migrating Postgres to Kubernetes, only `DATABASE_URL` in the secret needs to change.
