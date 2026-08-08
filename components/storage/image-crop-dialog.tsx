"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { ImageMimeType } from "@/lib/storage/constants";
import { cropImageToBlob, mimeTypeFromFile } from "@/lib/storage/crop.client";

interface ImageCropDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	file: File | null;
	aspect: number;
	title: string;
	description: string;
	onConfirm: (blob: Blob, contentType: ImageMimeType) => Promise<void>;
}

function createDefaultCrop(imageWidth: number, imageHeight: number, aspect: number): Crop {
	return centerCrop(
		makeAspectCrop(
			{
				unit: "%",
				width: 90,
			},
			aspect,
			imageWidth,
			imageHeight,
		),
		imageWidth,
		imageHeight,
	);
}

export function ImageCropDialog({
	open,
	onOpenChange,
	file,
	aspect,
	title,
	description,
	onConfirm,
}: ImageCropDialogProps) {
	const imageRef = useRef<HTMLImageElement>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [contentType, setContentType] = useState<ImageMimeType | null>(null);
	const [crop, setCrop] = useState<Crop>();
	const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open || !file) {
			setPreviewUrl(null);
			setContentType(null);
			setCrop(undefined);
			setCompletedCrop(undefined);
			setError(null);
			return;
		}

		const mimeType = mimeTypeFromFile(file);
		if (!mimeType) {
			setError("Use a PNG, JPG, or WebP image");
			return;
		}

		const objectUrl = URL.createObjectURL(file);
		setPreviewUrl(objectUrl);
		setContentType(mimeType);

		return () => {
			URL.revokeObjectURL(objectUrl);
		};
	}, [file, open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="grid gap-3">
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					{previewUrl ? (
						<div className="max-h-[min(60vh,28rem)] overflow-auto rounded-md border bg-muted/20 p-2">
							<ReactCrop
								crop={crop}
								onChange={(_, percentCrop) => setCrop(percentCrop)}
								onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
								aspect={aspect}
								className="mx-auto max-w-full"
							>
								{/** biome-ignore lint/performance/noImgElement: react-image-crop needs a native img element */}
								<img
									ref={imageRef}
									src={previewUrl}
									alt="Crop preview"
									className="mx-auto max-h-[min(55vh,24rem)] max-w-full object-contain"
									onLoad={(event) => {
										const target = event.currentTarget;
										setCrop(createDefaultCrop(target.width, target.height, aspect));
									}}
								/>
							</ReactCrop>
						</div>
					) : (
						<div className="flex min-h-40 items-center justify-center rounded-md border border-dashed">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						</div>
					)}
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={!previewUrl || !completedCrop || !contentType || isSubmitting}
						onClick={() => {
							const image = imageRef.current;
							if (!image || !completedCrop || !contentType) {
								return;
							}

							setIsSubmitting(true);
							setError(null);

							void (async () => {
								try {
									const blob = await cropImageToBlob(image, completedCrop, contentType);
									await onConfirm(blob, contentType);
									onOpenChange(false);
								} catch (submitError) {
									setError(
										submitError instanceof Error ? submitError.message : "Could not save image",
									);
								} finally {
									setIsSubmitting(false);
								}
							})();
						}}
					>
						{isSubmitting ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Uploading…
							</>
						) : (
							"Save image"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
