import { describe, expect, it } from "vitest";

import {
	buildClubAvatarKey,
	buildClubCoverKey,
	buildDevUploadKey,
	buildPrivateKey,
	buildPublicKey,
	buildUserAvatarKey,
	isClubAvatarKeyForClub,
	isClubCoverKeyForClub,
	isDevUploadKeyForUser,
	isUserAvatarKeyForUser,
} from "@/lib/storage/keys";

describe("storage keys", () => {
	it("builds public and private keys with sanitized segments", () => {
		expect(buildPublicKey(["avatars", "user id"], "PNG")).toBe("public/avatars/user-id.png");
		expect(buildPrivateKey(["clubs", "my club", "doc"], "pdf")).toBe(
			"private/clubs/my-club/doc.pdf",
		);
	});

	it("scopes dev upload keys per user", () => {
		const key = buildDevUploadKey("user_1", "image/png", "abc-123");
		expect(key).toBe("public/dev/user_1/abc-123.png");
		expect(isDevUploadKeyForUser(key, "user_1")).toBe(true);
		expect(isDevUploadKeyForUser(key, "user_2")).toBe(false);
	});

	it("scopes avatar and club image keys", () => {
		const userAvatar = buildUserAvatarKey("user-1", "image/webp", "img-1");
		expect(userAvatar).toBe("public/avatars/users/user-1/img-1.webp");
		expect(isUserAvatarKeyForUser(userAvatar, "user-1")).toBe(true);
		expect(isUserAvatarKeyForUser(userAvatar, "user-2")).toBe(false);

		const clubAvatar = buildClubAvatarKey("club-1", "image/jpeg", "img-2");
		expect(clubAvatar).toBe("public/clubs/club-1/avatar/img-2.jpg");
		expect(isClubAvatarKeyForClub(clubAvatar, "club-1")).toBe(true);

		const clubCover = buildClubCoverKey("club-1", "image/png", "img-3");
		expect(clubCover).toBe("public/clubs/club-1/cover/img-3.png");
		expect(isClubCoverKeyForClub(clubCover, "club-1")).toBe(true);
	});
});
