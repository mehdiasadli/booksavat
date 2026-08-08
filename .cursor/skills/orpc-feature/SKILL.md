---
name: orpc-feature
description: >-
  Adds or extends a BookSavat oRPC API surface end-to-end (contract, service,
  route, client usage). Use when creating a new procedure, endpoint, router
  method, or when the user mentions oRPC, contracts, server routes, or API
  handlers.
---

# oRPC feature checklist

Follow [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) and `.cursor/rules/orpc-stack.mdc`.

## Steps

1. **Contract** — Add schemas + procedure to the right `server/contracts/*.contract.ts` using `base` (shared errors). Export types via `z.infer` when useful.
2. **Register contract** — Attach on `contract` in `server/contracts/index.ts` and re-export if other modules import the schema.
3. **Service** — Implement in `lib/<domain>/*.server.ts` with `import "server-only"`. Prefer existing `ok`/`fail` or throw patterns used in that domain.
4. **Route** — Handler on `publicProcedure` / `protectedProcedure` / role procedure in `server/routes/*.route.ts`. Map service failures to contract errors (`NOT_FOUND`, `FORBIDDEN`, …).
5. **Register router** — Add to `server/routes/index.ts` under the same key as the contract.
6. **UI / callers** — Use `orpc.*.queryOptions` / `mutationOptions` or `client.*` from `@/lib/orpc`. Invalidate with `orpc.<ns>.key()` or specific query keys.
7. **Tests** — Colocate Vitest next to the code; use `server/test-support.ts` when testing procedures without a live DB.

## Done when

- Types compile (`bun run typecheck`).
- No DB or handlers leaked into contracts.
- Client can call the new procedure through existing oRPC helpers.
