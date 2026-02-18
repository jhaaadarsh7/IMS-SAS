# Inventory Management System (IMS) Monorepo

Production-grade IMS starter using npm workspaces:

- Next.js (TypeScript) web app
- Fastify (TypeScript) API
- BullMQ worker
- Prisma + PostgreSQL
- Redis queues
- Shared packages for algorithms, RBAC, types, UI, config

## Getting Started

1. Start infra:

```bash
docker compose -f infra/docker-compose.yml up -d
```

2. Install dependencies:

```bash
npm install
```

3. Copy env files:

```bash
copy .env.example .env
copy apps\api\.env.example apps\api\.env
copy apps\worker\.env.example apps\worker\.env
```

4. Generate Prisma client + migrate:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Start dev servers:

```bash
npm run dev
```

See docs:
- `docs/FOLDERS.md`
- `docs/DOMAIN.md`
