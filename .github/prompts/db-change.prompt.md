---
description: "Walk through a Prisma schema change — edit schema, migrate, and update affected code"
argument-hint: "Describe the schema change (e.g. 'add level field to User')"
agent: "agent"
---

Walk through a database schema change for this project. Use the provided description (or ask for details).

## Steps

1. **Edit the schema** — Modify [prisma/schema.prisma](../../prisma/schema.prisma) with the requested change (new field, new model, enum value, etc.).

2. **Run the migration** — Execute `pnpm db:migrate` and provide a descriptive migration name when prompted (e.g. `add_level_to_user`).

3. **Update affected code** — Search for and update all files that reference the changed model:
   - **API routes** (`app/api/`) — update create/update/select queries
   - **Auth callbacks** (`lib/auth.ts`) — if the User model changed, update JWT/session mapping
   - **Components** — update props/interfaces that pass the changed fields
   - **Seed script** (`prisma/seed.ts`) — update if default data needs the new field
   - **Zod schemas** — update any validation schemas that mirror the model

4. **Verify** — Run `pnpm build` to confirm no type errors.

Reference [AGENTS.md](../../AGENTS.md) for Prisma 7 conventions (PrismaPg adapter, `defineConfig`).
