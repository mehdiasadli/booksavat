# Database

Postgres, accessed through [Drizzle ORM](https://orm.drizzle.team) v1. Schema lives in
`db/schemas/`, shared column helpers in `db/utils.ts`, and `db/schema.ts` re-exports
everything as the single entry point that drizzle-kit and the app both read.

## The one rule: generate and migrate, never push

`drizzle-kit push` diffs your schema straight against a live database and mutates it.
It leaves no artifact, so two branches that both pushed cannot be reconciled, and no
environment can be rebuilt from scratch. This project uses migration files only:

```bash
# 1. Edit a schema file under db/schemas/
# 2. Turn the change into SQL
bun run db:generate

# 3. Read the generated SQL — this is the step that catches destructive changes
# 4. Apply it
bun run db:migrate

# 5. Commit the schema change together with the drizzle/ folder
```

CI enforces this: it runs `db:generate` and fails if that produces anything new, which
means a schema edit without a committed migration cannot be merged.

## Commands

| Command | What it does |
| --- | --- |
| `bun run db:generate` | Writes a new `drizzle/<timestamp>_<name>/` folder with `migration.sql` and a snapshot |
| `bun run db:migrate` | Applies every migration the target database has not recorded yet |
| `bun run db:check` | Validates migration files and their journal for collisions |
| `bun run db:studio` | Opens Drizzle Studio against `DATABASE_URL` |

Applying migrations twice is a no-op: drizzle records each one in
`drizzle.__drizzle_migrations` and skips what is already there.

## Reviewing generated SQL

Read it before applying. Drizzle infers intent from the diff, and some inferences are
lossy — a renamed column can come out as a drop plus an add, which silently discards
data. When that happens, edit the generated SQL by hand (an `ALTER TABLE ... RENAME`)
and keep the snapshot as generated.

## Relations

Drizzle v1 builds `db.query.*` from a `relations` object rather than from the table
definitions, and it is passed when the client is created in `db/index.ts`. A new table
needs its relations added to `db/schemas/*.schema.ts` and included there, otherwise the
relational query builder will not know about it.

## Migrations against Neon

Hosted environments run on Neon, and `drizzle.config.ts` reads a single `DATABASE_URL`.
Preview deployments currently share the production database. A migration that lands in a
preview therefore reaches production data before the PR is merged; if that becomes a
problem, give previews their own Neon branch.

## better-auth tables

`user`, `session`, `account` and `verification` are consumed by better-auth, which
expects those exact table and column names. `db/schemas/auth.schema.ts` is derived from
better-auth's own generator, so treat renames there as breaking and check
`lib/auth.ts` before changing anything. The `role` column is a local addition, declared
to better-auth through `user.additionalFields` and mirrored in the oRPC contract as
`userRoleSchema`.
