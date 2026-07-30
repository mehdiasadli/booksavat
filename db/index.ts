import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";

import { assertValue } from "@/lib/assert-value";

assertValue(process.env.DATABASE_URL, "DATABASE_URL is not set");

export const db = drizzle(process.env.DATABASE_URL);
