import { client } from "@/lib/orpc";
import type { ImageMimeType, ImageUploadPurpose } from "@/lib/storage/constants";

export async function uploadPublicImage(options: {
	purpose: ImageUploadPurpose;
	blob: Blob;
	contentType: ImageMimeType;
	slug?: string;
}): Promise<{ key: string; publicUrl: string }> {
	const presigned = await client.storage.createPublicImageUploadUrl({
		purpose: options.purpose,
		contentType: options.contentType,
		contentLength: options.blob.size,
		slug: options.slug,
	});

	const response = await fetch(presigned.uploadUrl, {
		method: "PUT",
		headers: {
			"Content-Type": options.contentType,
			"Content-Length": String(options.blob.size),
		},
		body: options.blob,
	});

	if (!response.ok) {
		throw new Error("Upload to storage failed");
	}

	return {
		key: presigned.key,
		publicUrl: presigned.publicUrl,
	};
}
