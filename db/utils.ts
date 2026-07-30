import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

export const id = uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey();
export const createdAt = timestamp("created_at").defaultNow().notNull();
export const updatedAt = timestamp("updated_at")
	.$onUpdate(() => new Date())
	.notNull();
