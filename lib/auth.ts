import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI, testUtils } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { assertValue } from "@/lib/assert-value";

assertValue(process.env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID is not set");
assertValue(process.env.GOOGLE_CLIENT_SECRET, "GOOGLE_CLIENT_SECRET is not set");

const isDev = process.env.NODE_ENV === "development";

export const auth = betterAuth({
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

	experimental: {
		joins: true,
	},

	plugins: [openAPI(), ...(isDev ? [testUtils()] : [])],
});
