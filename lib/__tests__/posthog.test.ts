import { afterEach, describe, expect, it } from "vitest";

import { isPostHogEnabled } from "@/lib/posthog";

describe("isPostHogEnabled", () => {
	const original = {
		token: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
		host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		publicVercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
		vercelEnv: process.env.VERCEL_ENV,
	};

	afterEach(() => {
		setEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", original.token);
		setEnv("NEXT_PUBLIC_POSTHOG_HOST", original.host);
		setEnv("NEXT_PUBLIC_VERCEL_ENV", original.publicVercelEnv);
		setEnv("VERCEL_ENV", original.vercelEnv);
	});

	function setEnv(key: string, value: string | undefined) {
		if (value === undefined) {
			delete process.env[key];
			return;
		}

		process.env[key] = value;
	}

	it("is disabled outside production even with credentials", () => {
		process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
		process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
		process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
		delete process.env.VERCEL_ENV;

		expect(isPostHogEnabled()).toBe(false);
	});

	it("is disabled in development", () => {
		process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
		process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
		delete process.env.NEXT_PUBLIC_VERCEL_ENV;
		delete process.env.VERCEL_ENV;

		expect(isPostHogEnabled()).toBe(false);
	});

	it("is enabled only in production with credentials", () => {
		process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
		process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
		process.env.NEXT_PUBLIC_VERCEL_ENV = "production";

		expect(isPostHogEnabled()).toBe(true);
	});
});
