# Setup

## Prerequisites

- [Bun](https://bun.sh) 1.3 or newer — the package manager and script runner
- A Postgres 17 database — [Neon](https://neon.tech) is what the hosted environments use;
  Docker or a local install works fine for development
- A Google Cloud project for OAuth credentials

## 1. Install

```bash
bun install
```

This also installs the git hooks through `lefthook` (via the `prepare` script). If hooks
misbehave later, `bunx lefthook install` re-creates them.

## 2. Environment

```bash
cp .env.example .env
```

Every variable is asserted at import time, so a missing one fails loudly on boot rather
than at some later request.

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Neon connection string, or `postgres://postgres:postgres@localhost:5432/booksavat` locally |
| `BETTER_AUTH_SECRET` | Generate one: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | The app's own origin — `http://localhost:3456` in development |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console credentials |

### A local database with Docker

```bash
docker run --name booksavat-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=booksavat -p 5432:5432 -d postgres:17
```

### Google OAuth

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth 2.0 Client ID of type *Web application*.
3. Add an authorised redirect URI of `http://localhost:3456/api/auth/callback/google`.
   Each deployed origin needs its own entry, for example
   `https://booksavat.vercel.app/api/auth/callback/google`.
4. Copy the client ID and secret into `.env`.

Email and password sign-in is deliberately disabled; Google is the only provider.

## 3. Create the schema

```bash
bun run db:migrate
```

This applies the committed migrations in `drizzle/`. Never create tables by hand or with
`drizzle-kit push` — see [DATABASE.md](DATABASE.md) for why.

## 4. Run it

```bash
bun run dev
```

The app is served at http://localhost:3456. Signing in requires the Google credentials
above; without them the sign-in route will fail while the rest of the app still renders.

## 5. Confirm the toolchain

```bash
bun run verify
```

Lint, typecheck and tests — the same things CI checks. If this passes, your environment
is set up correctly.

## Editor

Install the recommended extensions when VS Code or Cursor offers them
(`.vscode/extensions.json`). Biome is the only formatter; Prettier and ESLint are
explicitly disabled for this workspace so they cannot fight over the same files.
