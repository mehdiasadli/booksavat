# Booksavat

A book reading platform.

Built with Next.js 16 (App Router), oRPC, Drizzle ORM on Postgres, better-auth, TanStack Query,
Tailwind CSS and Biome. Runs on Bun.

## Quick start

```bash
bun install
cp .env.example .env   # then fill it in
bun run db:migrate
bun run dev
```

Full instructions, including database and Google OAuth setup, are in [docs/SETUP.md](docs/SETUP.md).

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/SETUP.md](docs/SETUP.md) | Prerequisites, environment variables, first run |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the layers fit together: oRPC, database, auth |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema changes, migrations, the no-push rule |
| [docs/STORAGE.md](docs/STORAGE.md) | Cloudflare R2 setup, env vars, key layout |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel setup, environment variables, releases |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branch and PR flow, commit format, scripts, hooks |
| [SECURITY.md](SECURITY.md) | Reporting a vulnerability |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Expected behaviour |
| [CHANGELOG.md](CHANGELOG.md) | Released changes (generated) |

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run dev` | Development server on port 3456 |
| `bun run build` | Production build |
| `bun run verify` | Lint, typecheck and test — what CI runs |
| `bun run check` | Biome lint and format, with fixes |
| `bun run test` / `test:watch` / `test:coverage` | Vitest |
| `bun run db:generate` | Turn schema edits into a SQL migration |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:check` | Validate migration files |
| `bun run db:studio` | Drizzle Studio |

## License

[MIT](LICENSE)
