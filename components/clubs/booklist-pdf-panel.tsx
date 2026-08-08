"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import {
	BOOK_PDF_LANGUAGE_OPTIONS,
	type BookPdfLanguageCode,
	bookPdfLanguageLabel,
} from "@/lib/languages/iso6391";
import { client, orpc } from "@/lib/orpc";
import { MAX_BOOKLIST_PDFS_PER_ITEM, MAX_PDF_BYTES } from "@/lib/storage/constants";
import { uploadPrivateBooklistPdf } from "@/lib/storage/upload.client";
import type { Outputs } from "@/server/contracts";

type BooklistDocument = Outputs["club"]["listBooklist"]["items"][number]["documents"][number];

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface BooklistPdfPanelProps {
	slug: string;
	workId: string;
	title: string;
	documents: BooklistDocument[];
	canUpload: boolean;
}

export function BooklistPdfPanel({
	slug,
	workId,
	title,
	documents,
	canUpload,
}: BooklistPdfPanelProps) {
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const pageCountId = useId();

	const [open, setOpen] = useState(false);
	const [pageCount, setPageCount] = useState("");
	const [language, setLanguage] = useState<BookPdfLanguageCode>("en");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	const canAddMore = canUpload && documents.length < MAX_BOOKLIST_PDFS_PER_ITEM;
	const viewerId = session?.user?.id;
	const showPanel = documents.length > 0 || canUpload;

	function invalidate() {
		void queryClient.invalidateQueries({ queryKey: orpc.club.key() });
	}

	function resetUploadForm() {
		setSelectedFile(null);
		setPageCount("");
		setLanguage("en");
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	const download = useMutation({
		mutationFn: async (documentId: string) => {
			const result = await client.club.createBooklistPdfDownloadUrl({ slug, documentId });
			window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
		},
		onError: (error) =>
			toast.error(error instanceof Error ? error.message : "Could not download PDF"),
	});

	const remove = useMutation({
		mutationFn: (documentId: string) => client.club.removeBooklistPdf({ slug, documentId }),
		onSuccess: () => {
			toast.success("PDF removed");
			invalidate();
		},
		onError: (error) =>
			toast.error(error instanceof Error ? error.message : "Could not remove PDF"),
	});

	const upload = useMutation({
		mutationFn: async () => {
			if (!selectedFile) {
				throw new Error("Choose a PDF file");
			}
			if (selectedFile.type !== "application/pdf") {
				throw new Error("Only PDF files are supported");
			}
			if (selectedFile.size > MAX_PDF_BYTES) {
				throw new Error("PDF must be 100 MB or smaller");
			}

			const parsedPageCount = Number.parseInt(pageCount, 10);
			if (!Number.isInteger(parsedPageCount) || parsedPageCount < 1) {
				throw new Error("Enter a valid page count");
			}

			const uploaded = await uploadPrivateBooklistPdf({ slug, workId, file: selectedFile });
			await client.club.registerBooklistPdf({
				slug,
				workId,
				key: uploaded.key,
				fileName: selectedFile.name,
				pageCount: parsedPageCount,
				language,
			});
		},
		onSuccess: () => {
			toast.success("PDF uploaded");
			resetUploadForm();
			invalidate();
		},
		onError: (error) =>
			toast.error(error instanceof Error ? error.message : "Could not upload PDF"),
	});

	const busy = download.isPending || remove.isPending || upload.isPending;

	if (!showPanel) {
		return null;
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) {
					resetUploadForm();
				}
			}}
		>
			<DialogTrigger
				render={
					<Button size="sm" variant="outline">
						<FileText className="size-3.5" />
						View Docs
						{documents.length ? ` (${documents.length})` : ""}
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Documents</DialogTitle>
					<DialogDescription>{title} — members-only PDFs for this booklist item.</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-1">
					{documents.length ? (
						<ul className="divide-y divide-border rounded-lg ring-1 ring-foreground/10">
							{documents.map((doc) => {
								const canDelete = canUpload || doc.uploadedBy.id === viewerId;
								return (
									<li key={doc.id} className="flex items-start gap-3 px-3 py-3">
										<FileText
											className="mt-0.5 size-4 shrink-0 text-muted-foreground"
											aria-hidden
										/>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">{doc.fileName}</p>
											<p className="text-xs text-muted-foreground">
												{doc.pageCount} pages · {bookPdfLanguageLabel(doc.language)} ·{" "}
												{formatBytes(doc.sizeBytes)}
											</p>
											<p className="mt-0.5 text-xs text-muted-foreground">
												Uploaded by @{doc.uploadedBy.username}
											</p>
										</div>
										<div className="flex shrink-0 gap-1">
											<Button
												size="sm"
												variant="ghost"
												disabled={busy}
												onClick={() => download.mutate(doc.id)}
											>
												<Download className="size-3.5" />
												Download
											</Button>
											{canDelete ? (
												<Button
													size="sm"
													variant="ghost"
													disabled={busy}
													onClick={() => {
														if (window.confirm(`Remove “${doc.fileName}”?`)) {
															remove.mutate(doc.id);
														}
													}}
												>
													<Trash2 className="size-3.5" />
													Remove
												</Button>
											) : null}
										</div>
									</li>
								);
							})}
						</ul>
					) : (
						<p className="text-sm text-muted-foreground">No PDFs uploaded yet.</p>
					)}

					{canAddMore ? (
						<section className="grid gap-3 border-t border-border pt-4">
							<div className="grid gap-1">
								<h3 className="text-sm font-medium">Upload PDF</h3>
								<p className="text-xs text-muted-foreground">
									Up to {MAX_BOOKLIST_PDFS_PER_ITEM} files per book, 100 MB each.
								</p>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="booklist-pdf-file">PDF file</Label>
								<Input
									id="booklist-pdf-file"
									ref={fileInputRef}
									type="file"
									accept="application/pdf,.pdf"
									onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
								/>
							</div>

							<div className="grid gap-2 sm:grid-cols-2">
								<div className="grid gap-2">
									<Label htmlFor={pageCountId}>Page count</Label>
									<Input
										id={pageCountId}
										inputMode="numeric"
										value={pageCount}
										onChange={(event) => setPageCount(event.target.value)}
										placeholder="e.g. 320"
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="booklist-pdf-language">Language</Label>
									<Select
										items={BOOK_PDF_LANGUAGE_OPTIONS.map((option) => ({
											value: option.code,
											label: option.label,
										}))}
										value={language}
										onValueChange={(value) => {
											if (value) {
												setLanguage(value as BookPdfLanguageCode);
											}
										}}
									>
										<SelectTrigger
											id="booklist-pdf-language"
											className="w-full"
											aria-label="PDF language"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{BOOK_PDF_LANGUAGE_OPTIONS.map((option) => (
												<SelectItem key={option.code} value={option.code}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<Button
								className="w-fit"
								disabled={busy || !selectedFile}
								onClick={() => upload.mutate()}
							>
								{upload.isPending ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Uploading…
									</>
								) : (
									"Upload PDF"
								)}
							</Button>
						</section>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
