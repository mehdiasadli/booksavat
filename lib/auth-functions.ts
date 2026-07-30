import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function isAuthenticated() {
	const session = await auth.api.getSession();

	return !!session;
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
