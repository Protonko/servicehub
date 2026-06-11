# ServiceHub

Production-style backend for field service operations.

## Stack

```text
TypeScript
NestJS
TypeORM
PostgreSQL
Redis
BullMQ
Jest
Supertest
Docker Compose
```

## Documentation

Start here:

```text
docs/REQUIREMENTS.md
docs/STACK.md
docs/ARCHITECTURE.md
docs/IMPLEMENTATION_PLAN.md
docs/design/
docs/engineering-notes/
```

## Local Infrastructure

```bash
docker compose up -d postgres redis
```

## Environment

```bash
cp .env.example .env
```

## Commands

```bash
npm run start:dev
npm run start:worker:dev
npm run build
npm test
npm run test:e2e
```

## Health Check

```text
GET /health
```
