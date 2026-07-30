import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

/**
 * better-auth reads the session cookie from the request headers, so they have to be
 * passed explicitly. `cache` collapses the lookup to once per render, which matters
 * because layouts, pages and the oRPC context all ask for it.
 */
export const getCurrentSession = cache(async () =>
	auth.api.getSession({ headers: await headers() }),
);

export async function isAuthenticated() {
	return (await getCurrentSession()) !== null;
}

export async function redirectIfAuthenticated(redirectTo: string = "/") {
	if (await isAuthenticated()) {
		redirect(redirectTo);
	}
}

export async function redirectIfNotAuthenticated(redirectTo: string = "/login") {
	if (!(await isAuthenticated())) {
		redirect(redirectTo);
	}
}
