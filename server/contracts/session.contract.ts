import * as z from "zod";

import { base } from "@/server/contracts/base.contract";
import { userSchema } from "@/server/contracts/user.contract";

export const currentSessionContract = base
	.route({
		method: "GET",
		path: "/session",
		tags: ["session"],
		summary: "Current session, or null when signed out",
	})
	.output(
		z
			.object({
				user: userSchema,
				expiresAt: z.date(),
			})
			.nullable(),
	);

export const sessionContract = {
	current: currentSessionContract,
};
