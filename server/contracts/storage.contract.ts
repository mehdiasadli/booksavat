import * as z from "zod";

import { IMAGE_MIME_TYPES, MAX_DEV_PING_BYTES } from "@/lib/storage/constants";
import { base } from "@/server/contracts/base.contract";

export const createDevUploadUrlContract = base
	.route({
		method: "POST",
		path: "/storage/dev/upload-url",
		tags: ["storage"],
		summary: "Presign a short-lived R2 PUT for storage smoke tests (dev ping)",
	})
	.input(
		z.object({
			contentType: z.enum(IMAGE_MIME_TYPES),
			contentLength: z.number().int().positive().max(MAX_DEV_PING_BYTES),
		}),
	)
	.output(
		z.object({
			uploadUrl: z.string().url(),
			key: z.string().min(1),
			publicUrl: z.string().url(),
			expiresInSeconds: z.number().int().positive(),
		}),
	);

export const verifyDevObjectContract = base
	.route({
		method: "POST",
		path: "/storage/dev/verify",
		tags: ["storage"],
		summary: "HEAD an R2 object uploaded via the storage dev ping",
	})
	.input(
		z.object({
			key: z.string().trim().min(1).max(512),
		}),
	)
	.output(
		z.object({
			ok: z.literal(true),
			key: z.string(),
			contentType: z.string().nullable(),
			contentLength: z.number().int().nullable(),
			publicUrl: z.string().url(),
		}),
	);

export const storageContract = {
	createDevUploadUrl: createDevUploadUrlContract,
	verifyDevObject: verifyDevObjectContract,
};
