export type OpenLibraryErrorCode =
	| "NETWORK_ERROR"
	| "HTTP_ERROR"
	| "NOT_FOUND"
	| "INVALID_INPUT"
	| "INVALID_RESPONSE"
	| "RATE_LIMITED";

export class OpenLibraryError extends Error {
	readonly code: OpenLibraryErrorCode;
	readonly status?: number;
	readonly path?: string;
	readonly cause?: unknown;
	readonly issues?: unknown;

	constructor(
		code: OpenLibraryErrorCode,
		message: string,
		options: {
			status?: number;
			path?: string;
			cause?: unknown;
			issues?: unknown;
		} = {},
	) {
		super(message);
		this.name = "OpenLibraryError";
		this.code = code;
		this.status = options.status;
		this.path = options.path;
		this.cause = options.cause;
		this.issues = options.issues;
	}
}

export function isOpenLibraryError(error: unknown): error is OpenLibraryError {
	return error instanceof OpenLibraryError;
}
