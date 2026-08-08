---
name: code-review
description: >-
  Reviews BookSavat code changes without editing files. Finds bugs, authz/authn
  gaps, convention drift, security issues, and risky migrations. Use when the
  user asks for a review, code review, PR review, or audit of local/branch
  changes.
---

# Code review (read-only)

Do **not** modify code unless the user explicitly asks for fixes after the review.

## Scope

1. Gather diff: `git diff` / `git diff origin/main...HEAD` / status as appropriate.
2. Read surrounding code for context; prefer the real files over the index alone.

## Checklist

- **Correctness** — edge cases, error mapping, idempotency, racey UI mutations.
- **Auth** — `protectedProcedure` / role gates; owner checks; private club/shelf visibility; no data leaks in public procedures.
- **API shape** — contracts stay free of DB/handlers; errors use shared catalogue; client invalidation looks right.
- **DB** — migrations present for schema edits; no `push`; destructive SQL called out.
- **UI** — client boundaries; loading/error/empty; owner-only controls; OL/search retry behavior when relevant.
- **Security** — secrets, XSS via rich text, IDOR on slug/id params, mass assignment.
- **Conventions** — matches nearby patterns; sitemap rule if new public routes; tests when logic is non-trivial.

## Output format

Write a short review for humans:

1. **Verdict** — one sentence (ship / ship with nits / needs changes).
2. **Findings** — bulleted, severity-tagged (`blocker` / `warning` / `nit`), with file paths.
3. **Questions** — only if behavior is ambiguous.

No drive-by refactors in the review doc itself.
