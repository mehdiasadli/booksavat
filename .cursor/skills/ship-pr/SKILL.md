---
name: ship-pr
description: >-
  Finishes a BookSavat feature branch: verify, commit (split if asked), push,
  and open a GitHub PR with gh. Use when the user asks to push, open a PR,
  create a pull request, ship the branch, or finish the feature for review.
---

# Ship PR checklist

Follow [CONTRIBUTING.md](../../../CONTRIBUTING.md). Repo: `mehdiasadli/booksavat`.

## Steps

1. **Inspect** (parallel):
   - `git status -sb`
   - `git diff` / `git diff --stat`
   - `git log --oneline origin/main..HEAD` (or `main..HEAD`)
   - Confirm branch tracks remote / needs push
2. **Commit** only if the user asked:
   - Follow repo commitlint / conventional commits.
   - Split commits when the user asked for split commits (API vs UI, etc.).
   - Use HEREDOC for messages; never `--no-verify` unless explicitly requested.
3. **Verify** if not just-run: `bun run verify` (hooks also run on push).
4. **Push**: `git push -u origin HEAD` (request needed permissions).
5. **PR** with `gh pr create`:
   - Title: conventional commit style (becomes squash changelog entry).
   - Body HEREDOC with `## Summary` (1–3 bullets) and `## Test plan` (checkboxes).
6. If `gh` is unauthenticated, report that and give the compare URL; do not fake a PR.

## Done when

- Branch is on `origin`.
- PR URL is returned to the user.
