import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";

import { appRelations } from "@/db/relations";
import { assertValue } from "@/lib/assert-value";

assertValue(process.env.DATABASE_URL, "DATABASE_URL is not set");

// `relations` is what builds db.query.*; drizzle v1 no longer exposes a
// `schema` option for the relational query builder.
export const db = drizzle(process.env.DATABASE_URL, { relations: appRelations });

export type Database = typeof db;
