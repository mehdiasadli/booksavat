"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";

import { RichTextEditor, RichTextViewer } from "@/components/rich-text/rich-text-editor";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { client, orpc } from "@/lib/orpc";
import { EMPTY_RICH_TEXT_DOCUMENT, type RichTextDocument } from "@/lib/rich-text/document";
import type {
	sessionDiscussionMessageSchema,
	sessionDiscussionStateSchema,
} from "@/server/contracts/club.contract";

type DiscussionState = z.infer<typeof sessionDiscussionStateSchema>;
type DiscussionMessage = z.infer<typeof sessionDiscussionMessageSchema>;

interface SessionDiscussionProps {
	slug: string;
	sessionId: string;
	enabled: boolean;
}

function Composer({
	disabled,
	placeholder,
	submitLabel,
	onSubmit,
	pending,
}: {
	disabled?: boolean;
	placeholder: string;
	submitLabel: string;
	onSubmit: (body: RichTextDocument) => void;
	pending: boolean;
}) {
	const [body, setBody] = useState<RichTextDocument>(EMPTY_RICH_TEXT_DOCUMENT);

	return (
		<div className="grid gap-2">
			<RichTextEditor
				value={body}
				onChange={setBody}
				placeholder={placeholder}
				disabled={disabled || pending}
				aria-label={placeholder}
			/>
			<div className="flex justify-end">
				<Button
					size="sm"
					disabled={disabled || pending}
					onClick={() => {
						onSubmit(body);
						setBody(EMPTY_RICH_TEXT_DOCUMENT);
					}}
				>
					{pending ? <Loader2 className="size-4 animate-spin" /> : null}
					{submitLabel}
				</Button>
			</div>
		</div>
	);
}

function MessageCard({
	message,
	slug,
	sessionId,
	reactionEmojis,
	canReact,
	busy,
	onReply,
	onReact,
	onDelete,
}: {
	message: DiscussionMessage;
	slug: string;
	sessionId: string;
	reactionEmojis: string[];
	canReact: boolean;
	busy: boolean;
	onReply: (parentId: string, body: RichTextDocument) => void;
	onReact: (messageId: string, emoji: string) => void;
	onDelete: (messageId: string) => void;
}) {
	const [replyOpen, setReplyOpen] = useState(false);

	return (
		<li className="grid gap-2">
			<article
				className="grid gap-2 rounded-lg border border-border p-3"
				style={{ marginLeft: message.depth > 0 ? Math.min(message.depth, 5) * 12 : 0 }}
			>
				<header className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
					<span className="font-medium text-foreground">@{message.author.username}</span>
					<span>{message.createdAt.toLocaleString()}</span>
				</header>

				<RichTextViewer value={message.body as RichTextDocument} className="border-0 p-0" />

				<div className="flex flex-wrap items-center gap-1.5">
					{reactionEmojis.map((emoji) => {
						const current = message.reactions.find((reaction) => reaction.emoji === emoji);
						const count = current?.count ?? 0;
						const active = current?.reactedByViewer ?? false;
						return (
							<Button
								key={emoji}
								type="button"
								size="sm"
								variant={active ? "default" : "outline"}
								disabled={busy || !canReact}
								aria-pressed={active}
								onClick={() => onReact(message.id, emoji)}
							>
								<span aria-hidden>{emoji}</span>
								{count > 0 ? <span className="text-xs">{count}</span> : null}
							</Button>
						);
					})}
					{message.canReply ? (
						<Button
							size="sm"
							variant="ghost"
							disabled={busy}
							onClick={() => setReplyOpen((open) => !open)}
						>
							{replyOpen ? "Cancel reply" : "Reply"}
						</Button>
					) : null}
					{message.canDelete ? (
						<AlertDialog>
							<AlertDialogTrigger render={<Button size="sm" variant="ghost" disabled={busy} />}>
								Delete
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete this message?</AlertDialogTitle>
									<AlertDialogDescription>
										This removes the message and its replies.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Keep</AlertDialogCancel>
									<AlertDialogAction variant="destructive" onClick={() => onDelete(message.id)}>
										Delete
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : null}
				</div>

				{replyOpen ? (
					<Composer
						placeholder="Write a reply…"
						submitLabel="Post reply"
						pending={busy}
						onSubmit={(body) => {
							onReply(message.id, body);
							setReplyOpen(false);
						}}
					/>
				) : null}
			</article>

			{message.replies.length > 0 ? (
				<ul className="grid gap-2">
					{message.replies.map((reply) => (
						<MessageCard
							key={reply.id}
							message={reply}
							slug={slug}
							sessionId={sessionId}
							reactionEmojis={reactionEmojis}
							canReact={canReact}
							busy={busy}
							onReply={onReply}
							onReact={onReact}
							onDelete={onDelete}
						/>
					))}
				</ul>
			) : null}
		</li>
	);
}

export function SessionDiscussion({ slug, sessionId, enabled }: SessionDiscussionProps) {
	const queryClient = useQueryClient();

	const discussion = useQuery({
		...orpc.club.getSessionDiscussion.queryOptions({
			input: { slug, sessionId },
		}),
		enabled,
	});

	function setDiscussionData(next: DiscussionState) {
		queryClient.setQueryData(
			orpc.club.getSessionDiscussion.queryKey({ input: { slug, sessionId } }),
			next,
		);
	}

	const createMessage = useMutation({
		mutationFn: (input: { parentId?: string | null; body: RichTextDocument }) =>
			client.club.createSessionDiscussionMessage({
				slug,
				sessionId,
				parentId: input.parentId,
				body: input.body,
			}),
		onSuccess: (next) => {
			toast.success("Message posted");
			setDiscussionData(next);
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not post"),
	});

	const deleteMessage = useMutation({
		mutationFn: (messageId: string) =>
			client.club.deleteSessionDiscussionMessage({ slug, sessionId, messageId }),
		onSuccess: (next) => {
			toast.success("Message deleted");
			setDiscussionData(next);
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not delete"),
	});

	const toggleReaction = useMutation({
		mutationFn: (input: { messageId: string; emoji: string }) =>
			client.club.toggleSessionDiscussionReaction({
				slug,
				sessionId,
				messageId: input.messageId,
				emoji: input.emoji,
			}),
		onSuccess: (next) => setDiscussionData(next),
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not react"),
	});

	const busy = createMessage.isPending || deleteMessage.isPending || toggleReaction.isPending;
	const data = discussion.data;

	if (!enabled) return null;

	return (
		<section className="grid gap-3 rounded-lg border border-border p-4">
			<div>
				<h2 className="font-heading text-lg font-semibold tracking-tight">Discussion</h2>
				<p className="text-sm text-muted-foreground">
					{data?.readOnly
						? "This session is completed. Discussion is read-only."
						: "Club thread for this book — replies nest up to depth 5."}
				</p>
			</div>

			{discussion.isPending ? (
				<p className="text-sm text-muted-foreground">Loading discussion…</p>
			) : discussion.isError ? (
				<p className="text-sm text-muted-foreground">Could not load discussion.</p>
			) : data ? (
				<>
					{data.canPost ? (
						<Composer
							placeholder="Start the discussion…"
							submitLabel="Post"
							pending={createMessage.isPending}
							onSubmit={(body) => createMessage.mutate({ body })}
						/>
					) : null}

					{data.messageCount === 0 ? (
						<p className="text-sm text-muted-foreground">No messages yet.</p>
					) : (
						<ul className="grid gap-3">
							{data.messages.map((message) => (
								<MessageCard
									key={message.id}
									message={message}
									slug={slug}
									sessionId={sessionId}
									reactionEmojis={[...data.reactionEmojis]}
									canReact={data.canReact}
									busy={busy}
									onReply={(parentId, body) => createMessage.mutate({ parentId, body })}
									onReact={(messageId, emoji) => toggleReaction.mutate({ messageId, emoji })}
									onDelete={(messageId) => deleteMessage.mutate(messageId)}
								/>
							))}
						</ul>
					)}
				</>
			) : null}
		</section>
	);
}
