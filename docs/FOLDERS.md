# FOLDERS.md

Yeh file clear karta hai ki monorepo ke har folder ka role kya hai, taki team mein confusion na ho.

## Root Level

- `apps/`: user-facing runtime apps (web, api, worker)
- `packages/`: reusable shared logic jo multiple apps use karein
- `infra/`: local infra setup (Postgres + Redis via Docker)
- `docs/`: domain + engineering docs

## apps/

### `apps/web`
- Next.js UI for Admin + Branch operations
- Dashboard, optimizer form, branch operations screens yahin banenge
- Business-critical logic yahan hardcode mat karo; packages se import karo

### `apps/api`
- Fastify REST API
- Auth, validation, DB orchestration, queue enqueue ka orchestration layer
- Heavy algorithms ko direct yahin rewrite mat karo; `packages/algorithms` use karo

### `apps/worker`
- BullMQ workers for async jobs (forecasting, abc, optimization)
- Long-running aur scheduled jobs yahan
- HTTP endpoints yahan create mat karo

## packages/

### `packages/algorithms`
- ABC analysis, knapsack optimization, forecasting (SES)
- Pure functions prefer karo; side effects avoid karo

### `packages/db`
- Prisma schema, migrations, Prisma client export
- Domain entities ka source of truth

### `packages/rbac`
- Roles, permissions, `can()` authorization helper
- Branch scope policy yahin centralize karo

### `packages/types`
- Shared TS types + Zod schemas
- API request/response contracts ko consistent rakhta hai

### `packages/ui`
- Reusable UI atoms + chart wrappers
- App-specific pages/components yahan mat daalo

### `packages/config`
- Shared linting, tsconfig, prettier settings
- Engineering consistency ke liye

## Kya avoid karna chahiye

- `apps/web` mein DB access direct mat karo
- `apps/worker` mein API routing mat add karo
- `packages/*` mein app-specific env assumptions mat hardcode karo
- Duplicate types/permissions/algo logic different apps mein copy-paste mat karo
