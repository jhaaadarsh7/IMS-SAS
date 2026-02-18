# Getting Started

## 1) Infra up karo

```bash
docker compose -f infra/docker-compose.yml up -d
```

## 2) Dependencies install karo

```bash
npm install
```

## 3) Env files copy karo

```bash
copy .env.example .env
copy apps\api\.env.example apps\api\.env
copy apps\worker\.env.example apps\worker\.env
```

## 4) Prisma generate + migrate

```bash
npm run prisma:generate
npm run prisma:migrate
```

## 5) Dev mode start karo

```bash
npm run dev
```

Services:
- Web: http://localhost:3000
- API: http://localhost:4000
