import posthog from "posthog-js";

let initialized = false;

function getPostHogCredentials() {
	return {
		token: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
		host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
	};
}

/**
 * PostHog is production-only. Preview and local development stay dark even if
 * the public token/host are present in the environment.
 */
export function isPostHogEnabled(): boolean {
	const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
	const { token, host } = getPostHogCredentials();

	return vercelEnv === "production" && Boolean(token) && Boolean(host);
}

export function initPostHog(): typeof posthog | null {
	const { token, host } = getPostHogCredentials();

	if (typeof window === "undefined" || !isPostHogEnabled() || !token || !host) {
		return null;
	}

	if (initialized) {
		return posthog;
	}

	posthog.init(token, {
		api_host: host,
		defaults: "2026-05-30",
		person_profiles: "identified_only",
		capture_pageview: "history_change",
		capture_pageleave: true,
		// Session replay is controlled primarily in PostHog project settings;
		// keep it enabled here whenever the SDK is running.
		disable_session_recording: false,
	});

	initialized = true;
	return posthog;
}

export { posthog };
