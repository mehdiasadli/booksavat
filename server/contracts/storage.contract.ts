import * as z from "zod";

import {
	IMAGE_MIME_TYPES,
	imageUploadPurposeSchema,
	MAX_AVATAR_BYTES,
	MAX_CLUB_COVER_BYTES,
	MAX_DEV_PING_BYTES,
} from "@/lib/storage/constants";
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

export const createPublicImageUploadUrlContract = base
	.route({
		method: "POST",
		path: "/storage/images/upload-url",
		tags: ["storage"],
		summary: "Presign a short-lived R2 PUT for a public image upload",
	})
	.input(
		z
			.object({
				purpose: z.enum(imageUploadPurposeSchema),
				contentType: z.enum(IMAGE_MIME_TYPES),
				contentLength: z.number().int().positive(),
				slug: z.string().trim().min(1).max(64).optional(),
			})
			.superRefine((value, ctx) => {
				const maxBytes = value.purpose === "club_cover" ? MAX_CLUB_COVER_BYTES : MAX_AVATAR_BYTES;
				if (value.contentLength > maxBytes) {
					ctx.addIssue({
						code: "custom",
						message: "File exceeds the size limit for this upload type",
						path: ["contentLength"],
					});
				}
				if ((value.purpose === "club_avatar" || value.purpose === "club_cover") && !value.slug) {
					ctx.addIssue({
						code: "custom",
						message: "Club slug is required for club image uploads",
						path: ["slug"],
					});
				}
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

export const storageContract = {
	createDevUploadUrl: createDevUploadUrlContract,
	verifyDevObject: verifyDevObjectContract,
	createPublicImageUploadUrl: createPublicImageUploadUrlContract,
};
