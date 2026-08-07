import type { z } from "zod";

import { OpenLibraryError } from "./errors";

export interface OpenLibraryClientOptions {
	/** Base URL for JSON APIs. Defaults to https://openlibrary.org */
	baseUrl?: string;
	/**
	 * Application name used in the User-Agent.
	 * Open Library asks identified clients to send app name + contact.
	 */
	userAgent: string;
	/** Contact email (or phone) included in the User-Agent for rate-limit identification. */
	contact: string;
	/** Optional fetch implementation (useful for tests). Defaults to global fetch. */
	fetch?: typeof fetch;
	/**
	 * Request timeout in milliseconds. Defaults to 6_000.
	 * Kept under undici's default connect timeout so callers fail fast.
	 */
	timeoutMs?: number;
	/**
	 * Extra attempts after a NETWORK_ERROR (timeout / connect failure).
	 * Defaults to 0. Does not retry HTTP / validation errors.
	 */
	retries?: number;
	/** Extra headers merged into every request. */
	headers?: HeadersInit;
}

export interface RequestOptions {
	path: string;
	query?: Record<string, string | number | boolean | undefined | null>;
	signal?: AbortSignal;
	/** When true, treat HTTP 404 as `NOT_FOUND` instead of a generic HTTP error. Default true. */
	notFoundAsError?: boolean;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenLibraryHttpClient {
	readonly baseUrl: string;
	readonly userAgent: string;
	readonly contact: string;
	private readonly fetchImpl: typeof fetch;
	private readonly timeoutMs: number;
	private readonly retries: number;
	private readonly defaultHeaders: Headers;

	constructor(options: OpenLibraryClientOptions) {
		this.baseUrl = (options.baseUrl ?? "https://openlibrary.org").replace(/\/+$/, "");
		this.userAgent = options.userAgent.trim();
		this.contact = options.contact.trim();
		this.fetchImpl = options.fetch ?? fetch;
		this.timeoutMs = options.timeoutMs ?? 6_000;
		this.retries = Math.max(0, options.retries ?? 0);
		this.defaultHeaders = new Headers(options.headers);
		this.defaultHeaders.set("Accept", "application/json");
		this.defaultHeaders.set("User-Agent", `${this.userAgent} (${this.contact})`);
	}

	async getJson<T>(schema: z.ZodType<T>, options: RequestOptions): Promise<T> {
		const url = this.buildUrl(options.path, options.query);
		const response = await this.request(url, options.signal);
		const notFoundAsError = options.notFoundAsError ?? true;

		if (response.status === 404 && notFoundAsError) {
			throw new OpenLibraryError("NOT_FOUND", `Resource not found: ${options.path}`, {
				status: 404,
				path: options.path,
			});
		}

		if (response.status === 403 || response.status === 429) {
			throw new OpenLibraryError(
				"RATE_LIMITED",
				`Open Library rate limited the request (${response.status})`,
				{
					status: response.status,
					path: options.path,
				},
			);
		}

		if (!response.ok) {
			throw new OpenLibraryError(
				"HTTP_ERROR",
				`Open Library request failed with ${response.status}`,
				{
					status: response.status,
					path: options.path,
				},
			);
		}

		let json: unknown;

		try {
			json = await response.json();
		} catch (cause) {
			throw new OpenLibraryError("INVALID_RESPONSE", "Failed to parse Open Library JSON response", {
				status: response.status,
				path: options.path,
				cause,
			});
		}

		const parsed = schema.safeParse(json);

		if (!parsed.success) {
			throw new OpenLibraryError(
				"INVALID_RESPONSE",
				"Open Library response failed schema validation",
				{
					status: response.status,
					path: options.path,
					issues: parsed.error.issues,
				},
			);
		}

		return parsed.data;
	}

	private buildUrl(
		path: string,
		query?: Record<string, string | number | boolean | undefined | null>,
	): string {
		const normalizedPath = path.startsWith("/") ? path : `/${path}`;
		const url = new URL(`${this.baseUrl}${normalizedPath}`);

		if (query) {
			for (const [key, value] of Object.entries(query)) {
				if (value === undefined || value === null) {
					continue;
				}

				url.searchParams.set(key, String(value));
			}
		}

		return url.toString();
	}

	private async request(url: string, externalSignal?: AbortSignal): Promise<Response> {
		const attempts = 1 + this.retries;
		let lastError: unknown;

		for (let attempt = 0; attempt < attempts; attempt++) {
			try {
				return await this.requestOnce(url, externalSignal);
			} catch (error) {
				lastError = error;

				const canRetry =
					isNetworkError(error) && attempt < attempts - 1 && !externalSignal?.aborted;

				if (!canRetry) {
					throw error;
				}

				await sleep(250 * (attempt + 1));
			}
		}

		throw lastError;
	}

	private async requestOnce(url: string, externalSignal?: AbortSignal): Promise<Response> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

		const onAbort = () => controller.abort();
		externalSignal?.addEventListener("abort", onAbort);

		try {
			return await this.fetchImpl(url, {
				method: "GET",
				headers: this.defaultHeaders,
				signal: controller.signal,
				redirect: "follow",
			});
		} catch (cause) {
			if (cause instanceof Error && cause.name === "AbortError") {
				throw new OpenLibraryError(
					"NETWORK_ERROR",
					"Open Library request timed out or was aborted",
					{
						cause,
						path: url,
					},
				);
			}

			throw new OpenLibraryError("NETWORK_ERROR", "Failed to reach Open Library", {
				cause,
				path: url,
			});
		} finally {
			clearTimeout(timeout);
			externalSignal?.removeEventListener("abort", onAbort);
		}
	}
}

function isNetworkError(error: unknown): error is OpenLibraryError {
	return error instanceof OpenLibraryError && error.code === "NETWORK_ERROR";
}
