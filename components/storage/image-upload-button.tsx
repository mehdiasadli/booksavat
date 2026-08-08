"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { ImageCropDialog } from "@/components/storage/image-crop-dialog";
import { Button } from "@/components/ui/button";
import type { ImageMimeType, ImageUploadPurpose } from "@/lib/storage/constants";
import { MAX_AVATAR_BYTES, MAX_CLUB_COVER_BYTES } from "@/lib/storage/constants";
import { ACCEPTED_IMAGE_INPUT, mimeTypeFromFile } from "@/lib/storage/crop.client";

interface ImageUploadButtonProps {
	label: string;
	purpose: ImageUploadPurpose;
	aspect: number;
	title: string;
	description: string;
	slug?: string;
	maxBytes?: number;
	disabled?: boolean;
	onUploaded: (result: { key: string; publicUrl: string }) => Promise<void>;
}

function maxBytesForPurpose(purpose: ImageUploadPurpose, override?: number): number {
	if (override) {
		return override;
	}

	return purpose === "club_cover" ? MAX_CLUB_COVER_BYTES : MAX_AVATAR_BYTES;
}

export function ImageUploadButton({
	label,
	purpose,
	aspect,
	title,
	description,
	slug,
	maxBytes,
	disabled = false,
	onUploaded,
}: ImageUploadButtonProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				accept={ACCEPTED_IMAGE_INPUT}
				className="sr-only"
				onChange={(event) => {
					const file = event.target.files?.[0];
					event.target.value = "";

					if (!file) {
						return;
					}

					const mimeType = mimeTypeFromFile(file);
					if (!mimeType) {
						toast.error("Use a PNG, JPG, or WebP image");
						return;
					}

					const limit = maxBytesForPurpose(purpose, maxBytes);
					if (file.size > limit) {
						toast.error(`Image must be ${Math.round(limit / (1024 * 1024))} MB or smaller`);
						return;
					}

					setSelectedFile(file);
					setDialogOpen(true);
				}}
			/>

			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={disabled}
				onClick={() => inputRef.current?.click()}
			>
				{label}
			</Button>

			<ImageCropDialog
				open={dialogOpen}
				onOpenChange={(open) => {
					setDialogOpen(open);
					if (!open) {
						setSelectedFile(null);
					}
				}}
				file={selectedFile}
				aspect={aspect}
				title={title}
				description={description}
				onConfirm={async (blob, contentType: ImageMimeType) => {
					const limit = maxBytesForPurpose(purpose, maxBytes);
					if (blob.size > limit) {
						throw new Error(
							`Cropped image must be ${Math.round(limit / (1024 * 1024))} MB or smaller`,
						);
					}

					const { uploadPublicImage } = await import("@/lib/storage/upload.client");
					const uploaded = await uploadPublicImage({
						purpose,
						blob,
						contentType,
						slug,
					});
					await onUploaded(uploaded);
				}}
			/>
		</>
	);
}
