import * as z from "zod";

import { base } from "@/server/contracts/base.contract";

export const pingContract = base
	.route({
		method: "GET",
		path: "/health/ping",
		tags: ["health"],
		summary: "Liveness probe",
	})
	.output(
		z.object({
			status: z.literal("ok"),
			// Stays a real Date over the wire: the RPC protocol serializes native types.
			timestamp: z.date(),
		}),
	);

export const healthContract = {
	ping: pingContract,
};
