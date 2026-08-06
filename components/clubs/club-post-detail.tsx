"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal, Pin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { BookCover } from "@/components/books/book-cover";
import { ClubSubnav } from "@/components/clubs/club-subnav";
import { CommunityReactions } from "@/components/clubs/community-reactions";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/users/user-avatar";
import { formatRelativeTime } from "@/lib/dates";
import { client, orpc } from "@/lib/orpc";
import {
	EMPTY_RICH_TEXT_DOCUMENT,
	isRichTextEmpty,
	type RichTextDocument,
} from "@/lib/rich-text/document";
import type { ClubDetail, CommunityPostDetail } from "@/server/contracts";

type CommentNode = CommunityPostDetail["comments"][number];

interface ClubPostDetailProps {
	club: ClubDetail;
	postSlug: string;
}

function CommentCard({
	comment,
	depth,
	onReply,
	onDelete,
	onReact,
}: {
	comment: CommentNode;
	depth: number;
	onReply: (parentId: string) => void;
	onDelete: (id: string) => void;
	onReact: (commentId: string, emoji: string) => void;
}) {
	return (
		<div className={depth > 0 ? "ml-3 border-l border-border pl-3" : undefined}>
			<div className="flex gap-2 py-2">
				{comment.deletedAt ? (
					<div className="size-7 shrink-0 rounded-full bg-muted" />
				) : (
					<Link href={`/users/${comment.author.username}`} className="shrink-0">
						<UserAvatar name={comment.author.name} image={comment.author.image} size="sm" />
					</Link>
				)}
				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-2">
						<p className="text-xs text-muted-foreground">
							{comment.deletedAt ? (
								"[deleted]"
							) : (
								<>
									<Link
										href={`/users/${comment.author.username}`}
										className="font-medium text-foreground hover:underline"
									>
										{comment.author.name}
									</Link>{" "}
									· {formatRelativeTime(comment.createdAt)}
								</>
							)}
						</p>
						{!comment.deletedAt && comment.canDelete ? (
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											size="icon-sm"
											variant="ghost"
											aria-label="Comment actions"
											className="shrink-0"
										>
											<MoreHorizontal className="size-4" />
										</Button>
									}
								/>
								<DropdownMenuContent align="end">
									<DropdownMenuItem variant="destructive" onClick={() => onDelete(comment.id)}>
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : null}
					</div>
					{comment.deletedAt ? (
						<p className="mt-0.5 text-sm text-muted-foreground">[deleted]</p>
					) : comment.body ? (
						<div className="mt-0.5">
							<RichTextViewer value={comment.body} />
						</div>
					) : null}
					{!comment.deletedAt ? (
						<div className="mt-1.5 flex flex-wrap items-center gap-2">
							{comment.canReact ? (
								<CommunityReactions
									reactions={comment.reactions}
									onToggle={(emoji) => onReact(comment.id, emoji)}
								/>
							) : null}
							{comment.canReply ? (
								<Button size="sm" variant="ghost" onClick={() => onReply(comment.id)}>
									Reply
								</Button>
							) : null}
						</div>
					) : null}
				</div>
			</div>
			{comment.replies.map((reply) => (
				<CommentCard
					key={reply.id}
					comment={reply}
					depth={depth + 1}
					onReply={onReply}
					onDelete={onDelete}
					onReact={onReact}
				/>
			))}
		</div>
	);
}

export function ClubPostDetailView({ club: initialClub, postSlug }: ClubPostDetailProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: club = initialClub } = useQuery({
		...orpc.club.getBySlug.queryOptions({ input: { slug: initialClub.slug } }),
		initialData: initialClub,
	});

	const postQuery = useQuery({
		...orpc.club.getCommunityPost.queryOptions({
			input: { slug: club.slug, postSlug },
		}),
	});

	const [commentBody, setCommentBody] = useState<RichTextDocument>(EMPTY_RICH_TEXT_DOCUMENT);
	const [replyParentId, setReplyParentId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<"post" | string | null>(null);

	function invalidate() {
		void queryClient.invalidateQueries({
			queryKey: orpc.club.getCommunityPost.key({ input: { slug: club.slug, postSlug } }),
		});
		void queryClient.invalidateQueries({ queryKey: ["club-feed", club.slug] });
	}

	const createComment = useMutation({
		mutationFn: async () => {
			return client.club.createCommunityComment({
				slug: club.slug,
				postSlug,
				parentId: replyParentId,
				body: commentBody,
			});
		},
		onSuccess: () => {
			setCommentBody(EMPTY_RICH_TEXT_DOCUMENT);
			setReplyParentId(null);
			invalidate();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not comment");
		},
	});

	const deletePost = useMutation({
		mutationFn: async () => client.club.deleteCommunityPost({ slug: club.slug, postSlug }),
		onSuccess: () => {
			toast.success("Post deleted");
			router.push(`/clubs/${club.slug}`);
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not delete");
		},
	});

	const deleteComment = useMutation({
		mutationFn: async (commentId: string) =>
			client.club.deleteCommunityComment({ slug: club.slug, postSlug, commentId }),
		onSuccess: () => {
			setDeleteTarget(null);
			invalidate();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not delete");
		},
	});

	const pinPost = useMutation({
		mutationFn: async (pinned: boolean) =>
			client.club.pinCommunityPost({ slug: club.slug, postSlug, pinned }),
		onSuccess: () => invalidate(),
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not update pin");
		},
	});

	const reactPost = useMutation({
		mutationFn: async (emoji: string) =>
			client.club.toggleCommunityPostReaction({ slug: club.slug, postSlug, emoji }),
		onSuccess: () => invalidate(),
	});

	const reactComment = useMutation({
		mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) =>
			client.club.toggleCommunityCommentReaction({
				slug: club.slug,
				postSlug,
				commentId,
				emoji,
			}),
		onSuccess: () => invalidate(),
	});

	const post = postQuery.data;
	const commentTotal = post ? post.commentCount + post.replyCount : 0;

	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
			<ClubSubnav club={club} />

			{postQuery.isPending ? (
				<div className="flex justify-center py-16">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
				</div>
			) : postQuery.isError || !post ? (
				<p className="text-sm text-muted-foreground">Post not found.</p>
			) : (
				<>
					<Card>
						<CardHeader className="flex flex-row items-start gap-3 space-y-0">
							{post.author ? (
								<Link href={`/users/${post.author.username}`} className="shrink-0">
									<UserAvatar name={post.author.name} image={post.author.image} size="md" />
								</Link>
							) : (
								<div className="size-9 shrink-0 rounded-full bg-muted" />
							)}
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
									{post.pinnedAt ? (
										<span className="inline-flex items-center gap-1 font-medium text-foreground">
											<Pin className="size-3" aria-hidden />
											Pinned
										</span>
									) : null}
									{post.author ? (
										<Link
											href={`/users/${post.author.username}`}
											className="font-medium text-foreground hover:underline"
										>
											{post.author.name}
										</Link>
									) : (
										<span className="font-medium text-foreground">System</span>
									)}
									<span>·</span>
									<span>{formatRelativeTime(post.createdAt)}</span>
								</div>
								<h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-pretty">
									{post.title}
								</h1>
							</div>
							{post.canPin || post.canDelete ? (
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button size="icon-sm" variant="ghost" aria-label="Post actions">
												<MoreHorizontal className="size-4" />
											</Button>
										}
									/>
									<DropdownMenuContent align="end">
										{post.canPin ? (
											<DropdownMenuItem onClick={() => pinPost.mutate(!post.pinnedAt)}>
												{post.pinnedAt ? "Unpin" : "Pin"}
											</DropdownMenuItem>
										) : null}
										{post.canDelete ? (
											<DropdownMenuItem
												variant="destructive"
												onClick={() => setDeleteTarget("post")}
											>
												Delete
											</DropdownMenuItem>
										) : null}
									</DropdownMenuContent>
								</DropdownMenu>
							) : null}
						</CardHeader>
						{(post.body && !isRichTextEmpty(post.body)) || post.attachments.length > 0 ? (
							<CardContent className="grid gap-4">
								{post.body && !isRichTextEmpty(post.body) ? (
									<RichTextViewer value={post.body} />
								) : null}
								{post.attachments.length > 0 ? (
									<ul className="flex flex-wrap gap-3">
										{post.attachments.map((attachment) => (
											<li key={attachment.id} className="flex items-center gap-2 text-sm">
												<BookCover src={attachment.coverUrl} alt={attachment.title} size="sm" />
												{attachment.workId ? (
													<Link href={`/books/${attachment.workId}`} className="hover:underline">
														{attachment.title}
													</Link>
												) : (
													<span>{attachment.title}</span>
												)}
											</li>
										))}
									</ul>
								) : null}
							</CardContent>
						) : null}
						<CardFooter className="flex flex-wrap items-center gap-3">
							{post.canReact || post.reactions.length > 0 ? (
								<CommunityReactions
									reactions={post.reactions}
									disabled={!post.canReact}
									onToggle={(emoji) => reactPost.mutate(emoji)}
								/>
							) : null}
							{post.relatedSessionId ? (
								<Button
									size="sm"
									variant="outline"
									className="ml-auto"
									nativeButton={false}
									render={
										<Link href={`/clubs/${club.slug}/sessions/${post.relatedSessionId}`}>
											Open session
										</Link>
									}
								/>
							) : null}
						</CardFooter>
					</Card>

					<section className="grid gap-3">
						<h2 className="font-heading text-lg font-semibold tracking-tight">
							Comments ({commentTotal})
						</h2>
						{post.canComment ? (
							<form
								className="grid gap-3"
								onSubmit={(event) => {
									event.preventDefault();
									if (isRichTextEmpty(commentBody)) {
										toast.error("Comment cannot be empty");
										return;
									}
									createComment.mutate();
								}}
							>
								{replyParentId ? (
									<p className="text-xs text-muted-foreground">
										Replying…{" "}
										<button
											type="button"
											className="underline"
											onClick={() => setReplyParentId(null)}
										>
											Cancel reply
										</button>
									</p>
								) : null}
								<RichTextEditor
									value={commentBody}
									onChange={setCommentBody}
									placeholder="Write a comment…"
									editorClassName="min-h-20"
								/>
								<div className="flex justify-end">
									<Button type="submit" size="sm" disabled={createComment.isPending}>
										{createComment.isPending ? "Posting…" : "Comment"}
									</Button>
								</div>
							</form>
						) : (
							<p className="text-sm text-muted-foreground">
								Comments are closed or you need to be a member to reply.
							</p>
						)}
						<div className="divide-y divide-border">
							{post.comments.map((comment) => (
								<CommentCard
									key={comment.id}
									comment={comment}
									depth={0}
									onReply={setReplyParentId}
									onDelete={(id) => setDeleteTarget(id)}
									onReact={(commentId, emoji) => reactComment.mutate({ commentId, emoji })}
								/>
							))}
						</div>
					</section>
				</>
			)}

			<AlertDialog
				open={deleteTarget != null}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{deleteTarget === "post" ? "Delete this post?" : "Delete this comment?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							If there are replies, a tombstone stays so the thread remains readable.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (deleteTarget === "post") deletePost.mutate();
								else if (deleteTarget) deleteComment.mutate(deleteTarget);
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
