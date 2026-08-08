import { describe, expect, it } from "vitest";

import {
	buildDevUploadKey,
	buildPrivateKey,
	buildPublicKey,
	isDevUploadKeyForUser,
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
});
