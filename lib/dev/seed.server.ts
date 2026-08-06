import { faker } from "@faker-js/faker";
import { and, eq, like } from "drizzle-orm";

import { db } from "@/db";
import {
	club,
	clubBooklistItem,
	clubMembership,
	clubPost,
	clubPostAttachment,
	clubPostComment,
	clubPostReaction,
	feedback,
	follow,
	readingLog,
	readingSession,
	sessionParticipant,
	sessionShortlistItem,
	sessionVoteAssignment,
	shelf,
	shelfItem,
	user,
} from "@/db/schema";
import type { ClubMemberRole, ClubMemberStatus, ClubVisibility } from "@/lib/clubs/constants";
import { SYSTEM_SHELF_DEFINITIONS, type SystemShelfKey } from "@/lib/shelves/constants";

const SEED_EMAIL_DOMAIN = "booksavat.test";
const FAKER_SEED = 20_260_805;

/** Stable Open Library work IDs so feed/shelf links resolve in dev. */
const SEED_WORKS = [
	"OL45804W", // Pride and Prejudice
	"OL27448W", // The Hobbit
	"OL82563W", // 1984
	"OL1168007W", // The Great Gatsby
	"OL151343W", // To Kill a Mockingbird
	"OL262281W", // Jane Eyre
	"OL362043W", // Frankenstein
] as const;

type SeedUserKey = "alice" | "bob" | "cara" | "dan" | "erin" | "frank" | "grace" | "mod";

type SeedUserSpec = {
	key: SeedUserKey;
	username: string;
	isPrivate: boolean;
	role: "user" | "moderator" | "admin";
	/** Short note logged at seed time. */
	label: string;
};

/**
 * Deterministic personas covering privacy + follow states for local testing.
 * Usernames stay stable across restarts so you can deep-link to them.
 */
const SEED_USER_SPECS: readonly SeedUserSpec[] = [
	{
		key: "alice",
		username: "alice_public",
		isPrivate: false,
		role: "user",
		label: "public reader with activity",
	},
	{
		key: "bob",
		username: "bob_private",
		isPrivate: true,
		role: "user",
		label: "private account (request to follow)",
	},
	{
		key: "cara",
		username: "cara_follows",
		isPrivate: false,
		role: "user",
		label: "follows alice (accepted)",
	},
	{
		key: "dan",
		username: "dan_pending",
		isPrivate: false,
		role: "user",
		label: "has outgoing request to bob",
	},
	{
		key: "erin",
		username: "erin_mutual",
		isPrivate: false,
		role: "user",
		label: "mutual follow with alice",
	},
	{
		key: "frank",
		username: "frank_quiet",
		isPrivate: true,
		role: "user",
		label: "private, no follows yet",
	},
	{
		key: "grace",
		username: "grace_reviews",
		isPrivate: false,
		role: "user",
		label: "public with ratings/reviews",
	},
	{
		key: "mod",
		username: "seed_mod",
		isPrivate: false,
		role: "moderator",
		label: "moderator role",
	},
] as const;

let seedPromise: Promise<void> | null = null;

async function alreadySeeded(): Promise<boolean> {
	const [row] = await db
		.select({ id: user.id })
		.from(user)
		.where(like(user.email, `%@${SEED_EMAIL_DOMAIN}`))
		.limit(1);

	return Boolean(row);
}

function seedInviteCode(tag: string): string {
	const bytes = crypto.getRandomValues(new Uint8Array(8));
	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
	return `seed${tag}${hex}`.slice(0, 32);
}

async function loadSeedUserIds(): Promise<Record<SeedUserKey, string> | null> {
	const rows = await db
		.select({ id: user.id, username: user.username })
		.from(user)
		.where(like(user.email, `%@${SEED_EMAIL_DOMAIN}`));

	const byUsername = new Map(rows.map((row) => [row.username, row.id]));
	const ids = {} as Record<SeedUserKey, string>;

	for (const spec of SEED_USER_SPECS) {
		const id = byUsername.get(spec.username);
		if (!id) return null;
		ids[spec.key] = id;
	}

	return ids;
}

async function clubsAlreadySeeded(): Promise<boolean> {
	const [row] = await db
		.select({ id: club.id })
		.from(club)
		.where(eq(club.slug, "friday_night_readers"))
		.limit(1);
	return Boolean(row);
}

async function seedClubs(ids: Record<SeedUserKey, string>, now: Date) {
	if (await clubsAlreadySeeded()) {
		console.info("[seed] clubs skipped — sample clubs already exist");
		return;
	}

	type MembershipSeed = {
		userId: string;
		role: ClubMemberRole;
		status: ClubMemberStatus;
	};

	const specs: Array<{
		name: string;
		slug: string;
		description: string;
		visibility: ClubVisibility;
		inviteTag: string;
		members: MembershipSeed[];
	}> = [
		{
			name: "Friday Night Readers",
			slug: "friday_night_readers",
			description: "Public club for weekend reads. Open join.",
			visibility: "public",
			inviteTag: "pub",
			members: [
				{ userId: ids.alice, role: "admin", status: "active" },
				{ userId: ids.cara, role: "moderator", status: "active" },
				{ userId: ids.erin, role: "member", status: "active" },
				{ userId: ids.grace, role: "member", status: "active" },
				{ userId: ids.dan, role: "member", status: "invited" },
			],
		},
		{
			name: "Hidden Book Circle",
			slug: "hidden_book_circle",
			description: "Invite-only — not listed in search or explore.",
			visibility: "invite_only",
			inviteTag: "inv",
			members: [
				{ userId: ids.bob, role: "admin", status: "active" },
				{ userId: ids.frank, role: "member", status: "active" },
				{ userId: ids.alice, role: "member", status: "invited" },
			],
		},
		{
			name: "Private Classics",
			slug: "private_classics",
			description: "Private club — searchable header; join by invite or request.",
			visibility: "private",
			inviteTag: "prv",
			members: [
				{ userId: ids.grace, role: "admin", status: "active" },
				{ userId: ids.mod, role: "moderator", status: "active" },
				{ userId: ids.cara, role: "member", status: "active" },
				{ userId: ids.erin, role: "member", status: "requested" },
			],
		},
	];

	for (const spec of specs) {
		const [created] = await db
			.insert(club)
			.values({
				name: spec.name,
				slug: spec.slug,
				description: spec.description,
				visibility: spec.visibility,
				inviteCode: seedInviteCode(spec.inviteTag),
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: club.id, slug: club.slug, inviteCode: club.inviteCode });

		await db.insert(clubMembership).values(
			spec.members.map((member) => ({
				clubId: created.id,
				userId: member.userId,
				role: member.role,
				status: member.status,
				createdAt: now,
				updatedAt: now,
			})),
		);

		console.info(
			`  /clubs/${created.slug}  (${spec.visibility})  invite: /join/${created.inviteCode}`,
		);
	}

	console.info("[seed] clubs ready");
}

async function booklistsAlreadySeeded(): Promise<boolean> {
	const [row] = await db
		.select({ id: clubBooklistItem.id })
		.from(clubBooklistItem)
		.innerJoin(club, eq(club.id, clubBooklistItem.clubId))
		.where(eq(club.slug, "friday_night_readers"))
		.limit(1);
	return Boolean(row);
}

async function seedClubBooklists(ids: Record<SeedUserKey, string>, now: Date) {
	if (await booklistsAlreadySeeded()) {
		console.info("[seed] booklists skipped — sample items already exist");
		return;
	}

	const clubRows = await db.select({ id: club.id, slug: club.slug }).from(club);
	const bySlug = new Map(clubRows.map((row) => [row.slug, row.id]));
	const fridayId = bySlug.get("friday_night_readers");
	const privateId = bySlug.get("private_classics");
	const hiddenId = bySlug.get("hidden_book_circle");

	if (!fridayId) {
		console.warn("[seed] booklists skipped — clubs missing");
		return;
	}

	const rows: Array<{
		clubId: string;
		workId: string;
		addedByUserId: string;
		status: "active" | "proposed";
	}> = [
		{ clubId: fridayId, workId: SEED_WORKS[0], addedByUserId: ids.alice, status: "active" },
		{ clubId: fridayId, workId: SEED_WORKS[1], addedByUserId: ids.cara, status: "active" },
		{ clubId: fridayId, workId: SEED_WORKS[2], addedByUserId: ids.erin, status: "proposed" },
		{ clubId: fridayId, workId: SEED_WORKS[3], addedByUserId: ids.grace, status: "active" },
		{ clubId: fridayId, workId: SEED_WORKS[4], addedByUserId: ids.cara, status: "active" },
		{ clubId: fridayId, workId: SEED_WORKS[5], addedByUserId: ids.alice, status: "active" },
		{ clubId: fridayId, workId: SEED_WORKS[6], addedByUserId: ids.grace, status: "active" },
	];

	if (privateId) {
		rows.push(
			{ clubId: privateId, workId: SEED_WORKS[2], addedByUserId: ids.grace, status: "active" },
			{ clubId: privateId, workId: SEED_WORKS[4], addedByUserId: ids.cara, status: "proposed" },
		);
	}

	if (hiddenId) {
		rows.push({
			clubId: hiddenId,
			workId: SEED_WORKS[1],
			addedByUserId: ids.bob,
			status: "active",
		});
	}

	await db.insert(clubBooklistItem).values(
		rows.map((row) => ({
			...row,
			createdAt: now,
			updatedAt: now,
		})),
	);

	console.info(`[seed] booklists ready — ${rows.length} items across sample clubs`);
}

async function sessionsAlreadySeeded(): Promise<boolean> {
	const [row] = await db
		.select({ id: readingSession.id })
		.from(readingSession)
		.innerJoin(club, eq(club.id, readingSession.clubId))
		.where(eq(club.slug, "friday_night_readers"))
		.limit(1);
	return Boolean(row);
}

async function seedClubSessions(ids: Record<SeedUserKey, string>, now: Date) {
	if (await sessionsAlreadySeeded()) {
		console.info("[seed] sessions skipped — sample session already exists");
		return;
	}

	const [friday] = await db
		.select({ id: club.id })
		.from(club)
		.where(eq(club.slug, "friday_night_readers"))
		.limit(1);
	if (!friday) {
		console.warn("[seed] sessions skipped — friday club missing");
		return;
	}

	const joinDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	const readingDeadline = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
	const shortlistWorks = [SEED_WORKS[0], SEED_WORKS[1], SEED_WORKS[3], SEED_WORKS[5]] as const;

	const [session] = await db
		.insert(readingSession)
		.values({
			clubId: friday.id,
			createdByUserId: ids.alice,
			status: "voting",
			title: "April pick",
			joinDeadline,
			readingDeadline,
			selectedWorkId: null,
			voteChipsByRole: {
				admin: [1, 2, 3],
				moderator: [1, 2, 3],
				member: [1, 2, 3],
			},
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: readingSession.id });

	await db.insert(sessionShortlistItem).values(
		shortlistWorks.map((workId) => ({
			sessionId: session.id,
			workId,
			addedByUserId: ids.alice,
			createdAt: now,
			updatedAt: now,
		})),
	);

	const participants = [
		{ userId: ids.alice },
		{ userId: ids.cara },
		{ userId: ids.erin },
		{ userId: ids.grace },
	] as const;

	await db.insert(sessionParticipant).values(
		participants.map((participant) => ({
			sessionId: session.id,
			userId: participant.userId,
			joinedAt: now,
			voteBlocked: false,
			createdAt: now,
			updatedAt: now,
		})),
	);

	await db.insert(sessionVoteAssignment).values([
		{
			sessionId: session.id,
			userId: ids.alice,
			points: 3,
			workId: shortlistWorks[0],
			createdAt: now,
			updatedAt: now,
		},
		{
			sessionId: session.id,
			userId: ids.alice,
			points: 2,
			workId: shortlistWorks[1],
			createdAt: now,
			updatedAt: now,
		},
		{
			sessionId: session.id,
			userId: ids.alice,
			points: 1,
			workId: shortlistWorks[2],
			createdAt: now,
			updatedAt: now,
		},
		{
			sessionId: session.id,
			userId: ids.cara,
			points: 3,
			workId: shortlistWorks[1],
			createdAt: now,
			updatedAt: now,
		},
		{
			sessionId: session.id,
			userId: ids.cara,
			points: 2,
			workId: shortlistWorks[0],
			createdAt: now,
			updatedAt: now,
		},
		{
			sessionId: session.id,
			userId: ids.cara,
			points: 1,
			workId: shortlistWorks[3],
			createdAt: now,
			updatedAt: now,
		},
		{
			sessionId: session.id,
			userId: ids.erin,
			points: 3,
			workId: shortlistWorks[0],
			createdAt: now,
			updatedAt: now,
		},
		{
			sessionId: session.id,
			userId: ids.erin,
			points: 2,
			workId: shortlistWorks[3],
			createdAt: now,
			updatedAt: now,
		},
		{
			sessionId: session.id,
			userId: ids.erin,
			points: 1,
			workId: shortlistWorks[1],
			createdAt: now,
			updatedAt: now,
		},
	]);

	console.info(
		`[seed] sessions ready — voting “April pick” on /clubs/friday_night_readers/sessions/${session.id}`,
	);
}

async function ensureSeedShelves(userId: string, now: Date) {
	const existing = await db
		.select({ systemKey: shelf.systemKey })
		.from(shelf)
		.where(eq(shelf.userId, userId));

	const have = new Set(existing.map((row) => row.systemKey).filter(Boolean));
	const missing = SYSTEM_SHELF_DEFINITIONS.filter((definition) => !have.has(definition.systemKey));

	if (missing.length === 0) {
		return;
	}

	await db.insert(shelf).values(
		missing.map((definition) => ({
			userId,
			name: definition.name,
			slug: definition.slug,
			visibility: "private" as const,
			isSystem: true,
			systemKey: definition.systemKey,
			isOrdered: false,
			position: definition.position,
			createdAt: now,
			updatedAt: now,
		})),
	);
}

async function createSeedUser(spec: SeedUserSpec, now: Date) {
	const firstName = faker.person.firstName();
	const lastName = faker.person.lastName();
	const name = `${firstName} ${lastName}`;
	const id = crypto.randomUUID();

	await db.insert(user).values({
		id,
		name,
		email: `${spec.username}@${SEED_EMAIL_DOMAIN}`,
		emailVerified: true,
		image: faker.image.personPortrait({ size: 128 }),
		username: spec.username,
		isPrivate: spec.isPrivate,
		role: spec.role,
		createdAt: now,
		updatedAt: now,
	});

	await ensureSeedShelves(id, now);

	return { ...spec, id, name };
}

async function seedFollows(ids: Record<SeedUserKey, string>, now: Date) {
	const edges: Array<{
		followerId: string;
		followingId: string;
		status: "pending" | "accepted";
	}> = [
		{ followerId: ids.cara, followingId: ids.alice, status: "accepted" },
		{ followerId: ids.alice, followingId: ids.erin, status: "accepted" },
		{ followerId: ids.erin, followingId: ids.alice, status: "accepted" },
		{ followerId: ids.dan, followingId: ids.bob, status: "pending" },
		{ followerId: ids.grace, followingId: ids.alice, status: "accepted" },
		{ followerId: ids.grace, followingId: ids.cara, status: "accepted" },
		{ followerId: ids.alice, followingId: ids.bob, status: "pending" },
		{ followerId: ids.cara, followingId: ids.grace, status: "accepted" },
	];

	await db.insert(follow).values(
		edges.map((edge) => ({
			...edge,
			createdAt: now,
			updatedAt: now,
		})),
	);
}

async function shelfIdFor(userId: string, systemKey: SystemShelfKey): Promise<string | null> {
	const [row] = await db
		.select({ id: shelf.id })
		.from(shelf)
		.where(and(eq(shelf.userId, userId), eq(shelf.systemKey, systemKey)))
		.limit(1);

	return row?.id ?? null;
}

async function putOnShelf(shelfId: string, workId: string, position: number, now: Date) {
	await db.insert(shelfItem).values({
		shelfId,
		workId,
		position,
		createdAt: now,
		updatedAt: now,
	});
}

async function seedActivity(ids: Record<SeedUserKey, string>, now: Date) {
	const aliceCompleted = await shelfIdFor(ids.alice, "completed");
	const aliceReading = await shelfIdFor(ids.alice, "reading");
	const graceCompleted = await shelfIdFor(ids.grace, "completed");

	if (aliceCompleted) await putOnShelf(aliceCompleted, SEED_WORKS[0], 0, now);
	if (aliceReading) await putOnShelf(aliceReading, SEED_WORKS[1], 0, now);
	if (graceCompleted) {
		await putOnShelf(graceCompleted, SEED_WORKS[2], 0, now);
		await putOnShelf(graceCompleted, SEED_WORKS[3], 1, now);
	}

	await db.insert(readingLog).values([
		{
			userId: ids.alice,
			workId: SEED_WORKS[0],
			status: "completed",
			startedAt: faker.date.past({ years: 1 }),
			finishedAt: faker.date.recent({ days: 40 }),
			isReread: false,
			createdAt: now,
			updatedAt: now,
		},
		{
			userId: ids.alice,
			workId: SEED_WORKS[1],
			status: "reading",
			startedAt: faker.date.recent({ days: 10 }),
			finishedAt: null,
			isReread: false,
			createdAt: now,
			updatedAt: now,
		},
		{
			userId: ids.grace,
			workId: SEED_WORKS[2],
			status: "completed",
			startedAt: faker.date.past({ years: 1 }),
			finishedAt: faker.date.recent({ days: 20 }),
			isReread: false,
			createdAt: now,
			updatedAt: now,
		},
		{
			userId: ids.grace,
			workId: SEED_WORKS[3],
			status: "completed",
			startedAt: faker.date.past({ years: 1 }),
			finishedAt: faker.date.recent({ days: 12 }),
			isReread: false,
			createdAt: now,
			updatedAt: now,
		},
		{
			userId: ids.cara,
			workId: SEED_WORKS[4],
			status: "reading",
			startedAt: faker.date.recent({ days: 14 }),
			finishedAt: null,
			isReread: false,
			createdAt: now,
			updatedAt: now,
		},
		{
			userId: ids.erin,
			workId: SEED_WORKS[1],
			status: "completed",
			startedAt: faker.date.past({ years: 1 }),
			finishedAt: faker.date.recent({ days: 30 }),
			isReread: false,
			createdAt: now,
			updatedAt: now,
		},
	]);

	await db.insert(feedback).values([
		{
			userId: ids.grace,
			workId: SEED_WORKS[2],
			rating: "4.5",
			review: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: faker.lorem.sentences(2) }],
					},
				],
			},
			createdAt: now,
			updatedAt: now,
		},
		{
			userId: ids.grace,
			workId: SEED_WORKS[3],
			rating: "3.5",
			review: null,
			createdAt: now,
			updatedAt: now,
		},
		{
			userId: ids.alice,
			workId: SEED_WORKS[0],
			rating: "5.0",
			review: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "A perennial favorite." }],
					},
				],
			},
			createdAt: now,
			updatedAt: now,
		},
	]);
}

async function runSeed(): Promise<void> {
	if (process.env.NODE_ENV !== "development") {
		return;
	}

	const now = new Date();
	let ids = await loadSeedUserIds();

	if (!ids) {
		if (await alreadySeeded()) {
			console.warn("[seed] partial seed users found; skipping user create. Fix DB or re-seed.");
			return;
		}

		faker.seed(FAKER_SEED);
		console.info("[seed] creating development users…");

		const created: Array<Awaited<ReturnType<typeof createSeedUser>>> = [];
		for (const spec of SEED_USER_SPECS) {
			created.push(await createSeedUser(spec, now));
		}

		ids = Object.fromEntries(created.map((u) => [u.key, u.id])) as Record<SeedUserKey, string>;

		await seedFollows(ids, now);
		await seedActivity(ids, now);

		console.info("[seed] users ready — sign in with Google as yourself, then visit:");
		for (const u of created) {
			console.info(
				`  /users/${u.username}  (${u.label}${u.isPrivate ? ", private" : ""}${u.role !== "user" ? `, ${u.role}` : ""})`,
			);
		}
		console.info(
			`  emails: <username>@${SEED_EMAIL_DOMAIN}  |  follow graph: cara→alice, alice↔erin, dan→bob(pending), alice→bob(pending)`,
		);
	} else {
		console.info(`[seed] users present — @${SEED_EMAIL_DOMAIN}`);
	}

	console.info("[seed] ensuring sample clubs…");
	await seedClubs(ids, now);
	console.info("[seed] ensuring sample booklists…");
	await seedClubBooklists(ids, now);
	console.info("[seed] ensuring sample reading sessions…");
	await seedClubSessions(ids, now);
	console.info("[seed] ensuring sample community posts…");
	await seedClubCommunity(ids, now);
}

async function communityAlreadySeeded(): Promise<boolean> {
	const [row] = await db
		.select({ id: clubPost.id })
		.from(clubPost)
		.innerJoin(club, eq(club.id, clubPost.clubId))
		.where(eq(club.slug, "friday_night_readers"))
		.limit(1);
	return Boolean(row);
}

async function seedClubCommunity(ids: Record<SeedUserKey, string>, now: Date) {
	if (await communityAlreadySeeded()) {
		console.info("[seed] community skipped — sample posts already exist");
		return;
	}

	const [friday] = await db
		.select({ id: club.id })
		.from(club)
		.where(eq(club.slug, "friday_night_readers"))
		.limit(1);
	if (!friday) {
		console.warn("[seed] community skipped — friday club missing");
		return;
	}

	const [discussion] = await db
		.insert(clubPost)
		.values({
			clubId: friday.id,
			authorUserId: ids.alice,
			type: "discussion",
			title: "What are we bringing snacks-wise this Friday?",
			slug: "what_are_we_bringing_snacks_wise_this_friday",
			body: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "I’ll bring sparkling water. Drop your plans below.",
							},
						],
					},
				],
			},
			canPeopleComment: true,
			canPeopleReact: true,
			reactionCount: 1,
			commentCount: 1,
			replyCount: 1,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	const [announcement] = await db
		.insert(clubPost)
		.values({
			clubId: friday.id,
			authorUserId: ids.alice,
			type: "announcement",
			title: "House rules for discussion nights",
			slug: "house_rules_for_discussion_nights",
			body: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "Spoilers stay behind a clear heading. Be kind." }],
					},
				],
			},
			canPeopleComment: true,
			canPeopleReact: true,
			pinnedAt: now,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	await db.insert(clubPostAttachment).values({
		postId: discussion.id,
		kind: "work",
		workId: SEED_WORKS[0],
		editionId: null,
		createdAt: now,
		updatedAt: now,
	});

	await db.insert(clubPostReaction).values({
		postId: discussion.id,
		userId: ids.cara,
		emoji: "🔥",
		createdAt: now,
		updatedAt: now,
	});

	const [topComment] = await db
		.insert(clubPostComment)
		.values({
			postId: discussion.id,
			authorUserId: ids.cara,
			parentId: null,
			depth: 0,
			body: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "I can do hummus and crackers." }],
					},
				],
			},
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	await db.insert(clubPostComment).values({
		postId: discussion.id,
		authorUserId: ids.erin,
		parentId: topComment.id,
		depth: 1,
		body: {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [{ type: "text", text: "Perfect — I’ll bring fruit." }],
				},
			],
		},
		createdAt: now,
		updatedAt: now,
	});

	console.info(
		`[seed] community ready — discussion + pinned announcement on /clubs/friday_night_readers (post ${announcement.slug})`,
	);
}

/**
 * Idempotent dev seed. Safe to call on every server boot; no-ops outside development
 * and when seed users already exist.
 */
export function seedDevData(): Promise<void> {
	if (process.env.NODE_ENV !== "development") {
		return Promise.resolve();
	}

	if (!seedPromise) {
		seedPromise = runSeed().catch((error) => {
			seedPromise = null;
			console.error("[seed] failed", error);
			throw error;
		});
	}

	return seedPromise;
}
