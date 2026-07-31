import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy, openAPI, testUtils } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { assertValue } from "@/lib/assert-value";
import { CURRENT_URL, DEVELOPMENT_URL, PRODUCTION_URL } from "@/lib/constants";

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
		},
	},

	advanced: {
		cookiePrefix: "bksvt",
		useSecureCookies: !isDev,

		database: {
			generateId: "uuid",
		},
	},

	trustedOrigins: [PRODUCTION_URL, DEVELOPMENT_URL],

	plugins: [
		openAPI(),
		...(useOAuthProxy
			? [oAuthProxy({ productionURL: PRODUCTION_URL, currentURL: CURRENT_URL })]
			: []),
		...(isDev ? [testUtils()] : []),
	],
});
