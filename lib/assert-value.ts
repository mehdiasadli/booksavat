export const ASSERT_VALUE_DEFAULT_ERROR_MESSAGE = "Value is undefined or null";

export function assertValue<T>(
	v: T | undefined | null,
	errorMessage = ASSERT_VALUE_DEFAULT_ERROR_MESSAGE,
): asserts v is T {
	if (v === undefined || v === null) {
		throw new Error(errorMessage);
	}
}
