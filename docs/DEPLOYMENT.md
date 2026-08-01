# Deployment

Hosted on Vercel, database on Neon. Merging to `main` deploys; every PR gets a preview.

## Build

Vercel runs the `vercel-build` script in preference to `build`:

```json
"vercel-build": "bun run db:migrate && next build"
```

Pending migrations are applied first, so the deployed schema always matches the code that
is about to run. `drizzle-kit` is a devDependency, which Vercel installs during builds, so
nothing extra is required.

If a migration fails the build fails, and the previous deployment stays live.

## Environment variables

Set these in *Project → Settings → Environment Variables* for every environment that
should work (Production, Preview, and Development if you use `vercel dev`):

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon connection string |
| `BETTER_AUTH_SECRET` | A distinct value per environment |
| `BETTER_AUTH_URL` | The deployment's own origin, e.g. `https://booksavat.com` |
| `GOOGLE_CLIENT_ID` | |
| `GOOGLE_CLIENT_SECRET` | |

Each of these is asserted at import time, so a missing one fails the build rather than
producing a half-working deployment.

`BETTER_AUTH_URL` is the awkward one for previews, since every preview gets its own
generated hostname. Either point previews at a stable alias, or accept that Google sign-in
only works on production and the alias.

## Google OAuth redirect URIs

Every origin that signs users in needs its own authorised redirect URI in the Google Cloud
console:

```
https://<your-domain>/api/auth/callback/google
```

## Database

Migrations reach the database only through the build step described above; nothing applies
them at runtime.

Previews currently share the production database, so a schema change is live as soon as a
preview builds. Neon branching is the fix when that stops being acceptable: give previews
their own branch and point their `DATABASE_URL` at it.

## Releases

`release-please` watches `main` and keeps a release PR open, accumulating the conventional
commits that have landed. Merging it bumps the version in `package.json`, writes
`CHANGELOG.md`, tags the commit and publishes a GitHub Release.

Versions are semver-shaped but read as a website's history rather than a package's API:
`feat` bumps the minor, `fix` and the other types bump the patch. While the version is
below `1.0.0`, a breaking change bumps the minor too rather than jumping to `1.0.0` — that
first major is a deliberate decision, made by setting `"release-as": "1.0.0"` once in
`release-please-config.json`.

This requires *Settings → Actions → General → Workflow permissions → Allow GitHub Actions
to create and approve pull requests*. Without it the workflow fails when it tries to open
the release PR.

Because the release PR is created with the default `GITHUB_TOKEN`, CI does not run on it.
It only ever contains a version bump and a changelog, so that is intentional — but it does
mean the checks you see are the ones from the PRs that fed into it.

## Rollback

Promote the previous deployment in the Vercel dashboard. That reverts the application code
but *not* the database: migrations do not roll back automatically, so a revert that needs
schema changes undone requires a new forward migration.
