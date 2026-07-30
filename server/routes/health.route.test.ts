import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";

import { ping } from "@/server/routes/health.route";
import { createTestContext } from "@/server/test-support";

describe("health.ping", () => {
	it("answers without a session", async () => {
		const result = await call(ping, undefined, { context: createTestContext() });

		expect(result.status).toBe("ok");
		expect(result.timestamp).toBeInstanceOf(Date);
	});
});
