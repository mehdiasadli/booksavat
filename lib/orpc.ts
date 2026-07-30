import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { inferRPCMethodFromContractRouter } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { AppRouterClient } from "@/server";
import { contract } from "@/server/contracts";

declare global {
	var $client: AppRouterClient | undefined;
}

const link = new RPCLink({
	url: () => {
		if (typeof window === "undefined") {
			throw new Error(
				"RPCLink is browser-only; the server uses the client from lib/orpc.server.ts.",
			);
		}

		return `${window.location.origin}/rpc`;
	},
	// Reads declared as GET in the contract go out as GET, so they can be cached.
	method: inferRPCMethodFromContractRouter(contract),
});

/**
 * One client for both environments. During SSR `globalThis.$client` is the
 * in-process client set by `lib/orpc.server.ts`, which skips an HTTP round trip to
 * ourselves; in the browser it falls back to the RPC link. Only the type of the
 * router is imported here, so no server code reaches the client bundle.
 */
export const client: AppRouterClient = globalThis.$client ?? createORPCClient(link);

/** TanStack Query bindings: `orpc.user.list.queryOptions({ input })` and friends. */
export const orpc = createTanstackQueryUtils(client);
