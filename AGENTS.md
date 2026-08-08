# AGENTS.md — BookSavat

Instructions for coding agents working in this repository.

## What this is

**BookSavat** — a Letterboxd-for-books with personal shelves and friend reading clubs.

Stack: Next.js 16 (App Router), Bun, oRPC, Drizzle ORM + Postgres (Neon), better-auth, TanStack Query, Tailwind, Biome.

## Source of truth (read these; do not paste them wholesale into chat)

| Doc | Topic |
| --- | --- |
| [docs/SETUP.md](docs/SETUP.md) | Prerequisites, env, first run |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | oRPC layers, SSR client, auth |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema + migrations (no `push`) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel, env, releases |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branches, commits, hooks, verify |

Cursor-specific guidance: [`.cursor/rules/`](.cursor/rules/) (scoped conventions) and [`.cursor/skills/`](.cursor/skills/) (workflows).

## Agent workflow

1. Branch from up-to-date `main` (`feat/*`, `fix/*`, `chore/*`, `hotfix/*`).
2. Match existing patterns in nearby files; prefer small, focused diffs.
3. Before push: `bun run verify` (Biome CI + typecheck + tests). Lefthook also runs on commit/push.
4. PRs are **squash-merged** — the **PR title** is the changelog commit. Use conventional commits (`feat`, `fix`, `docs`, `chore`, …). Optional scopes: `db`, `auth`, `server`, `ui`, `ci`, …
5. Delete the branch after merge. Avoid long-lived branches (migration conflicts).

## Hard don’ts

- **Never** use `drizzle-kit push`. Always `bun run db:generate` → review SQL → `bun run db:migrate` → commit schema **with** `drizzle/`.
- **Never** commit secrets (`.env`, credentials, tokens).
- **Do not** invent Open Library catalog URLs in `app/sitemap.ts`. Only enumerate routes we own or can list from our DB. See `.cursor/rules/sitemap.mdc`.
- **Do not** put handlers or DB access in `server/contracts/` — schemas and metadata only.
- Prefer linking to `docs/*` over copying long architecture into always-on context.

## Scope note

If a parent or user-level `AGENTS.md` refers to other orgs, code search products, or unrelated tooling, **ignore it for this repo**. Follow this file and `docs/` instead.
