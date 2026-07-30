# Architecture

Next.js 16 App Router on Bun, with a contract-first oRPC API in front of Drizzle and
Postgres, and better-auth for sessions.

## Layout

```
app/                  Routes. (auth) and (site) groups, /rpc handler, /api/auth handler
components/           UI and providers
db/                   Drizzle schemas, relations, client
docs/                 These documents
drizzle/              Generated migrations — committed, never edited after applying
lib/                  Auth, oRPC clients, query clients, small helpers
server/               The API: contracts, middlewares, procedures, routes
```

## The API, layer by layer

The API is contract-first: the shape is declared once, then implemented separately. A
handler that returns the wrong thing fails to compile, and the client infers inputs,
outputs and errors from the same declaration.

**`server/contracts/`** — inputs, outputs, errors and OpenAPI-style route metadata, built
on `oc` from `@orpc/contract`. `base.contract.ts` attaches the shared error catalogue from
`errors.ts` so every procedure can throw `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT` and `RATE_LIMITED` in a way the client can narrow with `isDefinedError`.
Contracts hold schemas and metadata only — no handlers, no database — which is what makes
them safe to import into client bundles.

**`server/context.ts`** — the initial context an adapter must provide. `headers` is
required; `db` and `session` are optional injection seams. Middleware fills them when
absent, so a caller that already has them (a nested call, the SSR client, a test) can pass
them in and skip the work.

**`server/middlewares/`** — `dbProviderMiddleware` reuses an existing `db` or lazily
imports one. `sessionProviderMiddleware` resolves the better-auth session once, treating
an explicit `null` as "known signed out" rather than a cache miss.
`requireViewerMiddleware` turns the optional session into a guaranteed `context.viewer`.
`requireRoleMiddleware(...roles)` is a factory, so role gates are built per call site.
`loggerMiddleware` times each call. Both providers import their dependencies lazily, which
is why tests can run procedures without a database or an auth instance.

**`server/procedures/`** — composed bases: `publicProcedure` (logger, db, session), then
`protectedProcedure`, `moderatorProcedure` and `adminProcedure` layered on top. Order is
deliberate: oRPC only deduplicates middleware that appears as a leading, same-order
subset, so shared middleware is appended rather than inserted.

**`server/routes/`** — handlers attached to their contract, e.g.
`protectedProcedure.user.me.handler(...)`. `server/routes/index.ts` assembles them through
`implementer.router()`, which enforces the contract across the whole tree.

## Request flow

**From the browser.** `lib/orpc.ts` exposes an `RPCLink` pointed at `/rpc`, handled by
`app/rpc/[[...rest]]/route.ts` via `RPCHandler`, which supplies `{ headers }` as the
initial context. Reads declared as `GET` in the contract go out as `GET` — that is what
`inferRPCMethodFromContractRouter` is for — so they can be cached.

**During SSR.** `lib/orpc.server.ts` publishes an in-process client on `globalThis.$client`
built with `createRouterClient`, so server rendering calls procedures directly instead of
issuing an HTTP request to itself. `lib/orpc.ts` prefers that client when it exists and
falls back to the link in the browser. It is imported from both `instrumentation.ts` and
the root layout so it is installed before anything renders. Only the router's *type*
crosses into `lib/orpc.ts`, so no server code reaches the client bundle.

The SSR context also passes the session resolved by `getCurrentSession()` in
`lib/auth-functions.ts`, which is wrapped in React's `cache`. A guarded layout and the
procedures rendered under it therefore share a single session lookup.

## TanStack Query

`lib/orpc.ts` also exports `orpc`, the query bindings from `createTanstackQueryUtils`:

```tsx
const { data } = useSuspenseQuery(orpc.user.list.queryOptions({ input: { limit: 20 } }));
const mutation = useMutation(orpc.user.updateRole.mutationOptions());

queryClient.invalidateQueries({ queryKey: orpc.user.key() });
```

`components/query-provider.tsx` creates one client per server render and a singleton in the
browser. For prefetching inside a server component, use `getServerQueryClient()` from
`lib/query-client.server.ts` and hand the dehydrated cache to a `HydrationBoundary`.

## Auth

better-auth is configured in `lib/auth.ts` with the Drizzle adapter, Google as the only
provider, UUID ids and a `role` additional field. `app/api/auth/[...all]/route.ts` mounts
its handlers.

Server-side guards live in `lib/auth-functions.ts` (`redirectIfNotAuthenticated`,
`redirectIfAuthenticated`) and are called from the `(site)` and `(auth)` layouts. Inside
the API, guarding is the middlewares' job instead. `lib/auth-client.ts` is the browser
client.

## Adding a procedure

1. Declare it in `server/contracts/<area>.contract.ts` and add it to that area's export.
2. Include the area in the `contract` object in `server/contracts/index.ts`.
3. Implement it in `server/routes/<area>.route.ts` on the right base — `publicProcedure`,
   `protectedProcedure` or `adminProcedure`.
4. Register it in the area's router, which `server/routes/index.ts` already assembles.
5. Call it: `client.<area>.<name>()` on the server, or `orpc.<area>.<name>.queryOptions()`
   in a component.

Typed errors come from the contract, so throw `errors.NOT_FOUND()` from a handler rather
than a bare `Error`, and the client can narrow it.

## Testing

Vitest with jsdom. `server/test-support.ts` provides a fake database and session fixtures;
because context is injectable, procedures can be exercised end to end — middleware,
validation, guards — with no Postgres and no auth instance. See
`server/routes/health.route.test.ts`.
