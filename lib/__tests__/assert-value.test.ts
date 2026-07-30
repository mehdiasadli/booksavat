import { describe, expect, it } from "vitest";

import { ASSERT_VALUE_DEFAULT_ERROR_MESSAGE, assertValue } from "../assert-value";

describe("assertValue", () => {
	it("should throw an error if the value is undefined", () => {
		expect(() => assertValue(undefined)).toThrow(ASSERT_VALUE_DEFAULT_ERROR_MESSAGE);
	});

	it("should not throw an error if the value is defined", () => {
		expect(() => assertValue("test")).not.toThrow();
	});

	it("should throw an error with the custom error message", () => {
		const errorMessage = "Custom error message";

		expect(() => assertValue(undefined, errorMessage)).toThrow(errorMessage);
	});
});
