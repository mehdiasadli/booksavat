"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, MessageSquare, Pin } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ClubSubnav } from "@/components/clubs/club-subnav";
import { CommunityReactions } from "@/components/clubs/community-reactions";
import { RichTextEditor, RichTextViewer } from "@/components/rich-text/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
import { UserAvatar } from "@/components/users/user-avatar";
import { formatRelativeTime } from "@/lib/dates";
import { client, orpc } from "@/lib/orpc";
import {
	EMPTY_RICH_TEXT_DOCUMENT,
	isRichTextEmpty,
	type RichTextDocument,
} from "@/lib/rich-text/document";
import type { ClubDetail, CommunityPostSummary } from "@/server/contracts";

type Sort = "hot" | "top" | "new";
type TopRange = "today" | "week" | "month" | "year" | "all";

const SORT_ITEMS = [
	{ value: "hot", label: "Hot" },
	{ value: "top", label: "Top" },
	{ value: "new", label: "New" },
] as const;

const TOP_RANGE_ITEMS = [
	{ value: "today", label: "Today" },
	{ value: "week", label: "This week" },
	{ value: "month", label: "This month" },
	{ value: "year", label: "This year" },
	{ value: "all", label: "All time" },
] as const;

interface ClubFeedProps {
	initial: ClubDetail;
}

function FeedPostCard({
	clubSlug,
	post,
	onReact,
	onComment,
}: {
	clubSlug: string;
	post: CommunityPostSummary;
	onReact: (postSlug: string, emoji: string) => void;
	onComment: (postSlug: string, body: RichTextDocument) => Promise<void>;
}) {
	const [commentOpen, setCommentOpen] = useState(false);
	const [commentBody, setCommentBody] = useState<RichTextDocument>(EMPTY_RICH_TEXT_DOCUMENT);
	const [submitting, setSubmitting] = useState(false);
	const commentTotal = post.commentCount + post.replyCount;

	return (
		<Card size="sm">
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
					<Link
						href={`/clubs/${clubSlug}/posts/${post.slug}`}
						className="mt-1 block font-heading text-base font-semibold tracking-tight hover:underline"
					>
						{post.title}
					</Link>
				</div>
			</CardHeader>
			{post.body && !isRichTextEmpty(post.body) ? (
				<CardContent>
					<div className="line-clamp-6">
						<RichTextViewer value={post.body} />
					</div>
				</CardContent>
			) : null}
			<CardFooter className="flex flex-col items-stretch gap-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					{post.canReact || post.reactions.length > 0 ? (
						<CommunityReactions
							reactions={post.reactions}
							disabled={!post.canReact}
							onToggle={(emoji) => onReact(post.slug, emoji)}
						/>
					) : (
						<span />
					)}
					<button
						type="button"
						className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
						onClick={() => setCommentOpen((open) => !open)}
					>
						<MessageSquare className="size-3.5" aria-hidden />
						{commentTotal} {commentTotal === 1 ? "comment" : "comments"}
					</button>
				</div>

				{commentOpen ? (
					<div className="grid gap-2 border-t border-border pt-3">
						{post.canComment ? (
							<>
								<RichTextEditor
									value={commentBody}
									onChange={setCommentBody}
									placeholder="Write a comment…"
									editorClassName="min-h-20"
								/>
								<div className="flex justify-end gap-2">
									<Button
										size="sm"
										variant="ghost"
										onClick={() => {
											setCommentOpen(false);
											setCommentBody(EMPTY_RICH_TEXT_DOCUMENT);
										}}
									>
										Cancel
									</Button>
									<Button
										size="sm"
										disabled={submitting || isRichTextEmpty(commentBody)}
										onClick={async () => {
											if (isRichTextEmpty(commentBody)) return;
											setSubmitting(true);
											try {
												await onComment(post.slug, commentBody);
												setCommentBody(EMPTY_RICH_TEXT_DOCUMENT);
												setCommentOpen(false);
											} finally {
												setSubmitting(false);
											}
										}}
									>
										{submitting ? "Posting…" : "Comment"}
									</Button>
								</div>
							</>
						) : (
							<p className="text-xs text-muted-foreground">
								Comments are closed.{" "}
								<Link
									href={`/clubs/${clubSlug}/posts/${post.slug}`}
									className="underline underline-offset-2"
								>
									View post
								</Link>
							</p>
						)}
					</div>
				) : null}
			</CardFooter>
		</Card>
	);
}

export function ClubFeed({ initial }: ClubFeedProps) {
	const queryClient = useQueryClient();
	const { data: club = initial } = useQuery({
		...orpc.club.getBySlug.queryOptions({ input: { slug: initial.slug } }),
		initialData: initial,
	});

	const [sort, setSort] = useState<Sort>("hot");
	const [topRange, setTopRange] = useState<TopRange>("all");
	const [composerOpen, setComposerOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [body, setBody] = useState<RichTextDocument>(EMPTY_RICH_TEXT_DOCUMENT);
	const [canPeopleComment, setCanPeopleComment] = useState(true);
	const [canPeopleReact, setCanPeopleReact] = useState(true);

	const feedQuery = useInfiniteQuery({
		queryKey: ["club-feed", club.slug, sort, topRange],
		queryFn: async ({ pageParam }) => {
			return client.club.listCommunityFeed({
				slug: club.slug,
				sort,
				topRange: sort === "top" ? topRange : "all",
				cursor: pageParam ?? undefined,
				limit: 20,
			});
		},
		initialPageParam: null as string | null,
		getNextPageParam: (last) => last.nextCursor,
		enabled: club.canViewContent,
	});

	const sentinelRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		const node = sentinelRef.current;
		if (!node) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
					void feedQuery.fetchNextPage();
				}
			},
			{ rootMargin: "200px" },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [feedQuery]);

	function invalidateFeed() {
		void queryClient.invalidateQueries({ queryKey: ["club-feed", club.slug] });
	}

	const createPost = useMutation({
		mutationFn: async () => {
			return client.club.createCommunityPost({
				slug: club.slug,
				title,
				body: isRichTextEmpty(body) ? null : body,
				canPeopleComment,
				canPeopleReact,
			});
		},
		onSuccess: async () => {
			toast.success("Post created");
			setTitle("");
			setBody(EMPTY_RICH_TEXT_DOCUMENT);
			setComposerOpen(false);
			invalidateFeed();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not create post");
		},
	});

	const reactPost = useMutation({
		mutationFn: async ({ postSlug, emoji }: { postSlug: string; emoji: string }) =>
			client.club.toggleCommunityPostReaction({ slug: club.slug, postSlug, emoji }),
		onSuccess: () => invalidateFeed(),
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not react");
		},
	});

	const items = feedQuery.data?.pages.flatMap((page) => page.items) ?? [];
	const pageMeta = feedQuery.data?.pages[0];

	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
			<ClubSubnav club={club} />

			<header className="grid gap-1">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					{club.name}
				</p>
				<h1 className="font-heading text-2xl font-semibold tracking-tight">Feed</h1>
			</header>

			{!club.canViewContent ? (
				<div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-5 py-10">
					<Lock className="size-5 text-muted-foreground" aria-hidden />
					<p className="text-sm text-muted-foreground text-pretty">
						This club’s feed is only visible to members. Join or request access from the About tab.
					</p>
					<Button
						size="sm"
						variant="outline"
						nativeButton={false}
						render={<Link href={`/clubs/${club.slug}/about`}>About this club</Link>}
					/>
				</div>
			) : !pageMeta?.communityEnabled && !feedQuery.isPending ? (
				<p className="text-sm text-muted-foreground">
					Community is turned off for this club. Existing posts may still open by link.
				</p>
			) : (
				<>
					<div className="flex flex-wrap items-center gap-2">
						<Select
							items={SORT_ITEMS.map((item) => ({ value: item.value, label: item.label }))}
							value={sort}
							onValueChange={(value) => {
								if (value === "hot" || value === "top" || value === "new") setSort(value);
							}}
						>
							<SelectTrigger size="sm" className="w-30" aria-label="Sort feed">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SORT_ITEMS.map((item) => (
									<SelectItem key={item.value} value={item.value}>
										{item.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{sort === "top" ? (
							<Select
								items={TOP_RANGE_ITEMS.map((item) => ({
									value: item.value,
									label: item.label,
								}))}
								value={topRange}
								onValueChange={(value) => {
									if (
										value === "today" ||
										value === "week" ||
										value === "month" ||
										value === "year" ||
										value === "all"
									) {
										setTopRange(value);
									}
								}}
							>
								<SelectTrigger size="sm" className="w-34" aria-label="Top range">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TOP_RANGE_ITEMS.map((item) => (
										<SelectItem key={item.value} value={item.value}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : null}

						{club.canCreateCommunityPost && pageMeta?.communityEnabled ? (
							<Button size="sm" className="ml-auto" onClick={() => setComposerOpen(true)}>
								New post
							</Button>
						) : null}
					</div>

					<Dialog open={composerOpen} onOpenChange={setComposerOpen}>
						<DialogContent className="sm:max-w-lg">
							<DialogHeader>
								<DialogTitle>New post</DialogTitle>
								<DialogDescription>
									Share something with {club.name}. Title is required; body is optional.
								</DialogDescription>
							</DialogHeader>
							<form
								className="grid gap-3"
								onSubmit={(event) => {
									event.preventDefault();
									createPost.mutate();
								}}
							>
								<div className="grid gap-2">
									<Label htmlFor="feed-post-title">Title</Label>
									<Input
										id="feed-post-title"
										value={title}
										onChange={(event) => setTitle(event.target.value)}
										maxLength={200}
										required
										placeholder="What’s on your mind?"
									/>
								</div>
								<div className="grid gap-2">
									<Label>Body (optional)</Label>
									<RichTextEditor value={body} onChange={setBody} placeholder="Add details…" />
								</div>
								<div className="flex flex-wrap gap-4">
									<label className="flex items-center gap-2 text-sm">
										<Checkbox
											checked={canPeopleComment}
											onCheckedChange={(checked) => setCanPeopleComment(checked === true)}
										/>
										Allow comments
									</label>
									<label className="flex items-center gap-2 text-sm">
										<Checkbox
											checked={canPeopleReact}
											onCheckedChange={(checked) => setCanPeopleReact(checked === true)}
										/>
										Allow reactions
									</label>
								</div>
								<DialogFooter>
									<Button type="button" variant="outline" onClick={() => setComposerOpen(false)}>
										Cancel
									</Button>
									<Button type="submit" disabled={createPost.isPending || !title.trim()}>
										{createPost.isPending ? "Posting…" : "Post"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>

					{feedQuery.isPending ? (
						<div className="flex justify-center py-12">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						</div>
					) : feedQuery.isError ? (
						<p className="text-sm text-destructive">Could not load feed.</p>
					) : items.length === 0 ? (
						<p className="text-sm text-muted-foreground">No posts yet. Start the conversation.</p>
					) : (
						<ul className="flex flex-col gap-4">
							{items.map((post) => (
								<li key={post.id}>
									<FeedPostCard
										clubSlug={club.slug}
										post={post}
										onReact={(postSlug, emoji) => reactPost.mutate({ postSlug, emoji })}
										onComment={async (postSlug, commentBody) => {
											try {
												await client.club.createCommunityComment({
													slug: club.slug,
													postSlug,
													body: commentBody,
												});
												toast.success("Comment posted");
												invalidateFeed();
											} catch (error) {
												toast.error(error instanceof Error ? error.message : "Could not comment");
												throw error;
											}
										}}
									/>
								</li>
							))}
						</ul>
					)}

					<div ref={sentinelRef} className="h-8" />
					{feedQuery.isFetchingNextPage ? (
						<div className="flex justify-center py-4">
							<Loader2 className="size-4 animate-spin text-muted-foreground" />
						</div>
					) : null}
				</>
			)}
		</section>
	);
}
