import { APIError } from "@better-auth/core/error";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { isValidSlug, slugify } from "@/lib/slugify";

const USERNAME_MAX_LENGTH = 30;
const MAX_USERNAME_ATTEMPTS = 100;

function normalizeUsernameSeed(text: string): string {
	const normalized = slugify(text).replace(/_+/g, "_").replace(/^_|_$/g, "");

	return normalized.slice(0, USERNAME_MAX_LENGTH) || "user";
}

export function generateUsernameSeedFromEmail(email: string): string {
	const localPart = email.split("@")[0] ?? email;

	return normalizeUsernameSeed(localPart);
}

async function usernameExists(username: string, excludeUserId?: string): Promise<boolean> {
	const where = excludeUserId
		? and(eq(userTable.username, username), ne(userTable.id, excludeUserId))
		: eq(userTable.username, username);

	const existing = await db.select({ id: userTable.id }).from(userTable).where(where).limit(1);

	return existing.length > 0;
}

export async function resolveUniqueUsername(seed: string): Promise<string> {
	const base = normalizeUsernameSeed(seed);

	if (!(await usernameExists(base))) {
		return base;
	}

	for (let attempt = 1; attempt <= MAX_USERNAME_ATTEMPTS; attempt++) {
		const candidate = `${base}_${attempt}`;

		if (!(await usernameExists(candidate))) {
			return candidate;
		}
	}

	throw new Error(
		`Failed to generate unique username after ${MAX_USERNAME_ATTEMPTS} attempts for seed: ${seed}`,
	);
}

export async function resolveUsernameForCreate(user: {
	username?: unknown;
	email?: unknown;
}): Promise<string | null> {
	if (typeof user.username === "string" && user.username.length > 0) {
		return resolveUniqueUsername(user.username);
	}

	if (typeof user.email === "string" && user.email.length > 0) {
		return resolveUniqueUsername(generateUsernameSeedFromEmail(user.email));
	}

	return null;
}

export async function resolveUsernameForUpdate(
	username: string,
	currentUserId?: string,
): Promise<string> {
	const normalized = normalizeUsernameSeed(username);

	if (!isValidSlug(normalized)) {
		throw APIError.fromStatus("BAD_REQUEST", {
			message: "Username must use lowercase letters, numbers, and underscores only.",
		});
	}

	if (await usernameExists(normalized, currentUserId)) {
		throw APIError.fromStatus("BAD_REQUEST", {
			message: "That username is already taken.",
		});
	}

	return normalized;
}
