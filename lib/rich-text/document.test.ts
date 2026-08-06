import { describe, expect, it } from "vitest";

import { isRichTextEmpty, sanitizeRichTextDocument } from "@/lib/rich-text/document";

describe("sanitizeRichTextDocument", () => {
	it("accepts a simple paragraph with bold text", () => {
		const result = sanitizeRichTextDocument({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [{ type: "text", text: "Hello", marks: [{ type: "bold" }] }],
				},
			],
		});
		expect(result.ok).toBe(true);
	});

	it("rejects javascript links", () => {
		const result = sanitizeRichTextDocument({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "bad",
							marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
						},
					],
				},
			],
		});
		expect(result.ok).toBe(false);
	});

	it("rejects unknown nodes", () => {
		const result = sanitizeRichTextDocument({
			type: "doc",
			content: [{ type: "script", content: [] }],
		});
		expect(result.ok).toBe(false);
	});

	it("allows https links", () => {
		const result = sanitizeRichTextDocument({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "site",
							marks: [{ type: "link", attrs: { href: "https://example.com" } }],
						},
					],
				},
			],
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			const mark = result.document.content?.[0]?.content?.[0]?.marks?.[0];
			expect(mark?.attrs?.rel).toContain("noopener");
		}
	});

	it("accepts heading level 2 and lists", () => {
		const result = sanitizeRichTextDocument({
			type: "doc",
			content: [
				{
					type: "heading",
					attrs: { level: 2 },
					content: [{ type: "text", text: "Section" }],
				},
				{
					type: "bulletList",
					content: [
						{
							type: "listItem",
							content: [
								{
									type: "paragraph",
									content: [{ type: "text", text: "Item", marks: [{ type: "strike" }] }],
								},
							],
						},
					],
				},
			],
		});
		expect(result.ok).toBe(true);
	});

	it("rejects heading level 1", () => {
		const result = sanitizeRichTextDocument({
			type: "doc",
			content: [
				{
					type: "heading",
					attrs: { level: 1 },
					content: [{ type: "text", text: "Nope" }],
				},
			],
		});
		expect(result.ok).toBe(false);
	});
});

describe("isRichTextEmpty", () => {
	it("treats empty paragraphs as empty", () => {
		expect(
			isRichTextEmpty({
				type: "doc",
				content: [{ type: "paragraph" }],
			}),
		).toBe(true);
	});

	it("detects text content", () => {
		expect(
			isRichTextEmpty({
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "hi" }],
					},
				],
			}),
		).toBe(false);
	});
});
