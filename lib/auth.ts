import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy, openAPI, testUtils } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { assertValue } from "@/lib/assert-value";
import { CURRENT_URL, PRODUCTION_URL, TRUSTED_ORIGINS } from "@/lib/constants";
import { ensureSystemShelves } from "@/lib/shelves/system.server";
import { resolveUsernameForCreate, resolveUsernameForUpdate } from "@/lib/users/username";

assertValue(process.env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID is not set");
assertValue(process.env.GOOGLE_CLIENT_SECRET, "GOOGLE_CLIENT_SECRET is not set");
assertValue(process.env.BETTER_AUTH_URL, "BETTER_AUTH_URL is not set");
assertValue(process.env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET is not set");

const isDev = process.env.NODE_ENV === "development";
const useOAuthProxy = process.env.VERCEL_ENV === "preview";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL,
	secret: process.env.BETTER_AUTH_SECRET,

	// The schema must be passed explicitly: drizzle v1 dropped `db._.fullSchema`,
	// which is the adapter's only other way to find the tables.
	database: drizzleAdapter(db, { provider: "pg", schema }),

	emailAndPassword: { enabled: false },
	socialProviders: {
		google: {
			enabled: true,
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		},
	},

	user: {
		additionalFields: {
			role: {
				type: "string",
				defaultValue: "user",
				required: true,
				input: false,
				returned: true,
			},
			username: {
				type: "string",
				unique: true,
				// Not required at parse time: Google OAuth never sends a username.
				// `databaseHooks.user.create.before` always derives one before insert.
				required: false,
				input: true,
				returned: true,
			},
		},
	},

	advanced: {
		cookiePrefix: "bksvt",
		useSecureCookies: !isDev,

		database: {
			generateId: "uuid",
		},
	},

	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const username = await resolveUsernameForCreate(user);

					if (!username) {
						throw new Error("Unable to derive a username for the new user");
					}

					return { data: { ...user, username } };
				},
				after: async (user) => {
					await ensureSystemShelves(db, user.id);
				},
			},
			update: {
				before: async (user, context) => {
					if (typeof user.username !== "string") {
						return;
					}

					const username = await resolveUsernameForUpdate(
						user.username,
						context?.context?.session?.user?.id ?? ("id" in user ? String(user.id) : undefined),
					);

					return { data: { ...user, username } };
				},
			},
		},
	},

	trustedOrigins: TRUSTED_ORIGINS,

	plugins: [
		openAPI(),
		...(useOAuthProxy
			? [oAuthProxy({ productionURL: PRODUCTION_URL, currentURL: CURRENT_URL })]
			: []),
		...(isDev ? [testUtils()] : []),
	],
});
