import { randomUUID } from "node:crypto";

import { isImageMimeType, MAX_DEV_PING_BYTES } from "@/lib/storage/constants";
import { buildDevUploadKey, isDevUploadKeyForUser } from "@/lib/storage/keys";
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

export const createDevUploadUrl = protectedProcedure.storage.createDevUploadUrl.handler(
	async ({ input, context, errors }) => {
		requireDevPingEnabled(errors);

		if (!isImageMimeType(input.contentType)) {
			throw errors.BAD_REQUEST({ message: "Unsupported image type" });
		}

		if (input.contentLength > MAX_DEV_PING_BYTES) {
			throw errors.BAD_REQUEST({ message: "File exceeds the 2 MB dev upload limit" });
		}

		const key = buildDevUploadKey(context.viewer.user.id, input.contentType, randomUUID());
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

export const storageRouter = {
	createDevUploadUrl,
	verifyDevObject,
};
