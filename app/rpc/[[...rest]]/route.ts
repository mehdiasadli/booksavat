import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import { router } from "@/server";

/**
 * Exported so an SSR client can call straight into the handler if we ever want the
 * fetch-adapter flavour of SSR instead of the in-process client in `lib/orpc.server.ts`.
 */
export const handler = new RPCHandler(router, {
	interceptors: [
		onError((error) => {
			console.error("[orpc] unhandled error", error);
		}),
	],
});

async function handleRequest(request: Request) {
	const { response } = await handler.handle(request, {
		prefix: "/rpc",
		context: { headers: request.headers },
	});

	return response ?? new Response("Not found", { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
