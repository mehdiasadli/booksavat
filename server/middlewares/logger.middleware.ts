import { os } from "@orpc/server";

const isTest = process.env.NODE_ENV === "test";

/** Times every call and reports the procedure path. Cheap enough to run everywhere. */
export const loggerMiddleware = os.middleware(async ({ next, path }) => {
	const startedAt = performance.now();

	try {
		return await next();
	} finally {
		if (!isTest) {
			const duration = (performance.now() - startedAt).toFixed(1);
			console.info(`[orpc] ${path.join(".")} ${duration}ms`);
		}
	}
});
