---
name: drizzle-migration
description: >-
  Runs the BookSavat Drizzle schema-change workflow (generate, review SQL,
  migrate, commit schema with drizzle/). Use when editing db/schemas, adding
  tables/columns, changing enums, or when the user mentions migrations,
  drizzle-kit, or schema changes. Never use drizzle-kit push.
---

# Drizzle migration checklist

Follow [docs/DATABASE.md](../../../docs/DATABASE.md) and `.cursor/rules/db-migrations.mdc`.

## Steps

1. Edit `db/schemas/*.schema.ts` (and `db/relations` / re-exports in `db/schema.ts` if needed).
2. Run `bun run db:generate`.
3. Open the new `drizzle/<timestamp>_*/migration.sql` and verify intent:
   - Prefer `RENAME` over drop+add when renaming.
   - Flag destructive changes to the user before migrating.
4. Run `bun run db:migrate` against the target `DATABASE_URL`.
5. Run `bun run db:check`.
6. Commit **schema files + entire new `drizzle/` folder** together.

## Never

- `drizzle-kit push`
- Hand-editing old applied migrations
- Leaving generated migrations uncommitted

## Done when

- App boots against the migrated DB.
- CI would not fail the “generate must be clean” check.
