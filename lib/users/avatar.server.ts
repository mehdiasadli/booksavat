import "server-only";

import { eq } from "drizzle-orm";

import type { Database } from "@/db";
import { user as userTable } from "@/db/schema";
import { deleteManagedPublicObject, verifyUploadedImage } from "@/lib/storage/images.server";
import type { User } from "@/server/contracts";

type ServiceError = {
	ok: false;
	code: "bad_request";
	message: string;
};

type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

function fail(message: string): ServiceError {
	return { ok: false, code: "bad_request", message };
}

function ok<T>(data: T): ServiceOk<T> {
	return { ok: true, data };
}

export async function updateUserAvatar(
	db: Database,
	userId: string,
	key: string,
): Promise<ServiceResult<User>> {
	let verified: Awaited<ReturnType<typeof verifyUploadedImage>>;
	try {
		verified = await verifyUploadedImage({
			key,
			purpose: "user_avatar",
			userId,
		});
	} catch (error) {
		return fail(error instanceof Error ? error.message : "Invalid upload");
	}

	const [current] = await db
		.select({ image: userTable.image })
		.from(userTable)
		.where(eq(userTable.id, userId))
		.limit(1);

	if (!current) {
		return fail("User not found");
	}

	const [updated] = await db
		.update(userTable)
		.set({ image: verified.publicUrl, updatedAt: new Date() })
		.where(eq(userTable.id, userId))
		.returning({
			id: userTable.id,
			username: userTable.username,
			name: userTable.name,
			email: userTable.email,
			image: userTable.image,
			role: userTable.role,
			createdAt: userTable.createdAt,
			isPrivate: userTable.isPrivate,
		});

	if (!updated) {
		return fail("User not found");
	}

	await deleteManagedPublicObject(current.image);

	return ok(updated);
}
