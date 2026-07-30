# Contributing

Start with [docs/SETUP.md](docs/SETUP.md) to get the app running, and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit together.

## Workflow

Branch from `main`, work, open a PR, merge. There is nothing more to it.

```bash
git switch main && git pull
git switch -c feat/book-search
# work
bun run verify
git push -u origin feat/book-search
```

PRs are squash-merged, so the PR title becomes the commit on `main` — which means the title
is what ends up in the changelog. Make it a conventional commit:

```
feat(server): add book search procedure
fix(auth): pass headers when reading the session
docs: explain the migration workflow
```

Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `style`.
Optional scopes: `db`, `auth`, `server`, `ui`, `ci`, `deps`, `docs`, `test`, `config`,
`release`. Individual commits on your branch are linted too, but they disappear on squash,
so the title is the one that matters.

Delete the branch after merging. Long-lived branches are how migration conflicts happen.

## Before pushing

```bash
bun run verify   # biome ci + typecheck + tests
```

Git hooks (lefthook) run some of this for you:

- **commit-msg** — commitlint on the message
- **pre-commit** — Biome with fixes on staged files, plus tests related to them
- **pre-push** — Biome, typecheck, the full test suite, and `db:check`

`git commit --no-verify` exists, but CI runs the same checks, so it only defers the
failure.

## Schema changes

Generate a migration and commit it with the schema edit. CI fails if a schema change
arrives without one, and `drizzle-kit push` is not used in this project at all — see
[docs/DATABASE.md](docs/DATABASE.md).

```bash
bun run db:generate   # then read the SQL
bun run db:migrate
```

## Tests

Vitest, colocated with what they test. Procedures can be tested without a database or an
auth instance by injecting context — see `server/test-support.ts` and
`server/routes/health.route.test.ts`.

```bash
bun run test           # once
bun run test:watch     # while working
bun run test:coverage  # with coverage
```

## Code style

Biome handles formatting and linting; there is no separate Prettier or ESLint config, and
both are disabled for this workspace so nothing fights over the same file. Tabs, not
spaces — the editor config enforces it.

Comments should explain a constraint or a decision that the code cannot show on its own.
Comments that narrate what the next line does are noise.

## What CI checks

Every PR runs lint and format, typecheck, tests with coverage, a Postgres job that applies
migrations to an empty database and rejects ungenerated schema changes, a production build
with placeholder environment variables, and a PR title check. The single `CI` check
aggregates all of them, so that is the one to require in branch protection.

## Reviews

Small PRs get reviewed quickly; a `size:xl` label is a hint that something should have been
split. Say what you verified in the PR description — the reviewer cannot run your branch in
their head.
