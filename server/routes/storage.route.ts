import { and, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { club, clubMembership } from "@/db/schema";
import { resolveBooklistPdfUploadContext } from "@/lib/clubs/booklist-pdfs.server";
import { canManageSettings } from "@/lib/clubs/visibility";
import { isImageMimeType, MAX_DEV_PING_BYTES } from "@/lib/storage/constants";
import { createPublicImageUploadUrl } from "@/lib/storage/images.server";
import { buildDevUploadKey, isDevUploadKeyForUser } from "@/lib/storage/keys";
import { createPrivatePdfUploadUrl } from "@/lib/storage/pdfs.server";
import {
	headObject,
	isR2DevPingEnabled,
	presignPutObject,
	publicUrlForKey,
} from "@/lib/storage/r2.server";
import { protectedProcedure } from "@/server/procedures";

const DEV_UPLOAD_EXPIRES_SECONDS = 60 * 5;

function requireDevPingEnabled(errors: {
	FORBIDDEN: (payload: { message: string }) => Error;
}): void {
	if (!isR2DevPingEnabled()) {
		throw errors.FORBIDDEN({
			message: "R2 storage dev ping is disabled. Set R2_DEV_PING_ENABLED=true to use it.",
		});
	}
}

async function resolveClubIdForImageUpload(
	db: Database,
	slug: string,
	viewerUserId: string,
	errors: {
		NOT_FOUND: (payload: { message: string }) => Error;
		FORBIDDEN: (payload: { message: string }) => Error;
	},
): Promise<string> {
	const [row] = await db.select({ id: club.id }).from(club).where(eq(club.slug, slug)).limit(1);
	if (!row) {
		throw errors.NOT_FOUND({ message: "Club not found" });
	}

	const [membership] = await db
		.select({ role: clubMembership.role, status: clubMembership.status })
		.from(clubMembership)
		.where(and(eq(clubMembership.clubId, row.id), eq(clubMembership.userId, viewerUserId)))
		.limit(1);

	if (
		!canManageSettings(
			membership?.status === "active" ? { role: membership.role, status: membership.status } : null,
		)
	) {
		throw errors.FORBIDDEN({ message: "Only the club admin can upload club images" });
	}

	return row.id;
}

export const createDevUploadUrl = protectedProcedure.storage.createDevUploadUrl.handler(
	async ({ input, context, errors }) => {
		requireDevPingEnabled(errors);

		if (!isImageMimeType(input.contentType)) {
			throw errors.BAD_REQUEST({ message: "Unsupported image type" });
		}

		if (input.contentLength > MAX_DEV_PING_BYTES) {
			throw errors.BAD_REQUEST({ message: "File exceeds the 2 MB dev upload limit" });
		}

		const key = buildDevUploadKey(context.viewer.user.id, input.contentType, crypto.randomUUID());
		const result = await presignPutObject({
			key,
			contentType: input.contentType,
			contentLength: input.contentLength,
			expiresIn: DEV_UPLOAD_EXPIRES_SECONDS,
		});

		if (!result.publicUrl) {
			throw errors.BAD_REQUEST({ message: "Dev uploads must use a public/ key" });
		}

		return {
			uploadUrl: result.uploadUrl,
			key: result.key,
			publicUrl: result.publicUrl,
			expiresInSeconds: DEV_UPLOAD_EXPIRES_SECONDS,
		};
	},
);

export const verifyDevObject = protectedProcedure.storage.verifyDevObject.handler(
	async ({ input, context, errors }) => {
		requireDevPingEnabled(errors);

		if (!isDevUploadKeyForUser(input.key, context.viewer.user.id)) {
			throw errors.FORBIDDEN({ message: "You can only verify your own dev upload keys" });
		}

		try {
			const head = await headObject(input.key);
			return {
				ok: true as const,
				key: input.key,
				contentType: head.contentType,
				contentLength: head.contentLength,
				publicUrl: publicUrlForKey(input.key),
			};
		} catch {
			throw errors.NOT_FOUND({ message: "Object not found in R2" });
		}
	},
);

export const createPublicImageUploadUrlRoute =
	protectedProcedure.storage.createPublicImageUploadUrl.handler(
		async ({ input, context, errors }) => {
			if (!isImageMimeType(input.contentType)) {
				throw errors.BAD_REQUEST({ message: "Unsupported image type" });
			}

			let clubId: string | undefined;
			if (input.purpose === "club_avatar" || input.purpose === "club_cover") {
				if (!input.slug) {
					throw errors.BAD_REQUEST({ message: "Club slug is required" });
				}
				clubId = await resolveClubIdForImageUpload(
					context.db,
					input.slug,
					context.viewer.user.id,
					errors,
				);
			}

			try {
				return await createPublicImageUploadUrl({
					purpose: input.purpose,
					userId: context.viewer.user.id,
					clubId,
					contentType: input.contentType,
					contentLength: input.contentLength,
				});
			} catch (error) {
				throw errors.BAD_REQUEST({
					message: error instanceof Error ? error.message : "Could not create upload URL",
				});
			}
		},
	);

export const createPrivatePdfUploadUrlRoute =
	protectedProcedure.storage.createPrivatePdfUploadUrl.handler(
		async ({ input, context, errors }) => {
			const ctx = await resolveBooklistPdfUploadContext(
				context.db,
				context.viewer.user.id,
				input.slug,
				input.workId,
			);
			if (!ctx.ok) {
				if (ctx.code === "not_found") {
					throw errors.NOT_FOUND({ message: ctx.message });
				}
				if (ctx.code === "forbidden") {
					throw errors.FORBIDDEN({ message: ctx.message });
				}
				if (ctx.code === "conflict") {
					throw errors.CONFLICT({ message: ctx.message });
				}
				throw errors.BAD_REQUEST({ message: ctx.message });
			}

			try {
				return await createPrivatePdfUploadUrl({
					clubId: ctx.data.clubId,
					workId: ctx.data.workId,
					contentLength: input.contentLength,
				});
			} catch (error) {
				throw errors.BAD_REQUEST({
					message: error instanceof Error ? error.message : "Could not create upload URL",
				});
			}
		},
	);

export const storageRouter = {
	createDevUploadUrl,
	verifyDevObject,
	createPublicImageUploadUrl: createPublicImageUploadUrlRoute,
	createPrivatePdfUploadUrl: createPrivatePdfUploadUrlRoute,
};
