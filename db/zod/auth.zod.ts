import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod";

import * as schema from "@/db/schemas/auth.schema";

export const userRoleSchema = z.enum(schema.userRoleEnum.enumValues);

export const userInsertSchema = createInsertSchema(schema.user);
export const userSelectSchema = createSelectSchema(schema.user);
export const userUpdateSchema = createUpdateSchema(schema.user);

export const sessionInsertSchema = createInsertSchema(schema.session);
export const sessionSelectSchema = createSelectSchema(schema.session);
export const sessionUpdateSchema = createUpdateSchema(schema.session);

export const accountInsertSchema = createInsertSchema(schema.account);
export const accountSelectSchema = createSelectSchema(schema.account);
export const accountUpdateSchema = createUpdateSchema(schema.account);

export const verificationInsertSchema = createInsertSchema(schema.verification);
export const verificationSelectSchema = createSelectSchema(schema.verification);
export const verificationUpdateSchema = createUpdateSchema(schema.verification);
