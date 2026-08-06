"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
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
import { absoluteUrl } from "@/lib/seo";

interface ClubShareSheetProps {
	clubName: string;
	inviteCode: string;
}

export function ClubShareSheet({ clubName, inviteCode }: ClubShareSheetProps) {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const joinUrl = absoluteUrl(`/join/${inviteCode}`);
	const shareText = `Join ${clubName} on BookSavat: ${joinUrl}`;

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(joinUrl);
			setCopied(true);
			toast.success("Invite link copied");
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			toast.error("Could not copy link");
		}
	}

	async function systemShare() {
		if (typeof navigator !== "undefined" && navigator.share) {
			try {
				await navigator.share({ title: clubName, text: shareText, url: joinUrl });
				return;
			} catch {
				// user cancelled or unsupported — fall through
			}
		}
		await copyLink();
	}

	const encodedText = encodeURIComponent(shareText);
	const encodedUrl = encodeURIComponent(joinUrl);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button size="sm" variant="outline">
						<Share2 className="size-4" />
						Invite link
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Share invite</DialogTitle>
					<DialogDescription>
						Anyone with this link can join {clubName}, even if the club is invite-only or private.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-2">
					<code className="break-all rounded-md bg-muted px-3 py-2 text-xs">{joinUrl}</code>
					<div className="grid gap-2 sm:grid-cols-2">
						<Button variant="outline" onClick={() => void copyLink()}>
							{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
							Copy link
						</Button>
						<Button variant="outline" onClick={() => void systemShare()}>
							<Share2 className="size-4" />
							System share
						</Button>
						<Button
							variant="outline"
							nativeButton={false}
							render={
								<a href={`https://wa.me/?text=${encodedText}`} target="_blank" rel="noreferrer">
									WhatsApp
								</a>
							}
						/>
						<Button
							variant="outline"
							nativeButton={false}
							render={
								<a
									href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(`Join ${clubName} on BookSavat`)}`}
									target="_blank"
									rel="noreferrer"
								>
									Telegram
								</a>
							}
						/>
						<Button
							variant="outline"
							className="sm:col-span-2"
							onClick={() => {
								void copyLink();
								toast.message("Paste the link into Discord");
							}}
						>
							Discord (copy link)
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
