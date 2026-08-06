import * as z from "zod";

/**
 * Errors shared by every procedure. Declaring them on the contract is what lets
 * the client narrow them with `isDefinedError` instead of guessing at strings.
 *
 * Never put anything sensitive in `data` — it is serialized to the client.
 */
export const commonErrors = {
	UNAUTHORIZED: {
		message: "You must be signed in to do this.",
	},
	FORBIDDEN: {
		message: "You are not allowed to do this.",
	},
	NOT_FOUND: {
		message: "The resource does not exist.",
	},
	CONFLICT: {
		message: "The resource already exists.",
	},
	BAD_REQUEST: {
		message: "The request is invalid.",
	},
	RATE_LIMITED: {
		message: "Too many requests.",
		data: z.object({ retryAfterSeconds: z.number().int().positive() }),
	},
};
