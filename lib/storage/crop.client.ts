import type { PixelCrop } from "react-image-crop";

import {
	IMAGE_EXTENSION_BY_MIME,
	IMAGE_MIME_TYPES,
	type ImageMimeType,
} from "@/lib/storage/constants";

export const ACCEPTED_IMAGE_INPUT = IMAGE_MIME_TYPES.map(
	(mime) => `.${IMAGE_EXTENSION_BY_MIME[mime]}`,
).join(",");

export function mimeTypeFromFile(file: File): ImageMimeType | null {
	if ((IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
		return file.type as ImageMimeType;
	}

	const extension = file.name.split(".").pop()?.toLowerCase();
	if (!extension) {
		return null;
	}

	for (const mime of IMAGE_MIME_TYPES) {
		if (IMAGE_EXTENSION_BY_MIME[mime] === extension) {
			return mime;
		}
	}

	return null;
}

export async function cropImageToBlob(
	image: HTMLImageElement,
	crop: PixelCrop,
	mimeType: ImageMimeType,
): Promise<Blob> {
	const scaleX = image.naturalWidth / image.width;
	const scaleY = image.naturalHeight / image.height;
	const pixelCrop = {
		x: crop.x * scaleX,
		y: crop.y * scaleY,
		width: crop.width * scaleX,
		height: crop.height * scaleY,
	};

	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(pixelCrop.width));
	canvas.height = Math.max(1, Math.round(pixelCrop.height));

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Could not prepare image canvas");
	}

	context.drawImage(
		image,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		canvas.width,
		canvas.height,
	);

	const quality = mimeType === "image/png" ? undefined : 0.92;
	const blob = await new Promise<Blob | null>((resolve) => {
		canvas.toBlob(resolve, mimeType, quality);
	});

	if (!blob) {
		throw new Error("Could not export cropped image");
	}

	return blob;
}
