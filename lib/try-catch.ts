export type TryCatchResult<T, E extends Error = Error> =
	| { result: T; error: null }
	| { result: null; error: E };

export async function tryCatchAsync<T, E extends Error = Error>(
	fn: () => Promise<T>,
): Promise<TryCatchResult<T, E>> {
	try {
		return { result: await fn(), error: null };
	} catch (error) {
		const normalizedError = error instanceof Error ? error : new Error(String(error));

		return {
			result: null,
			error: normalizedError as E,
		};
	}
}
