import "dotenv/config";

import { defineConfig } from "drizzle-kit";

import { assertValue } from "@/lib/assert-value";

assertValue(process.env.DATABASE_URL, "DATABASE_URL is not set");

export default defineConfig({
	out: "./drizzle",
	schema: "./db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
});
