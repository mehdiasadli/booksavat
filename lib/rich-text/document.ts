import type { JSONContent } from "@tiptap/react";

/** Node / mark types we persist and render. Anything else is rejected server-side. */
export const RICH_TEXT_ALLOWED_NODES = [
	"doc",
	"paragraph",
	"text",
	"hardBreak",
	"blockquote",
	"heading",
	"bulletList",
	"orderedList",
	"listItem",
] as const;

export const RICH_TEXT_ALLOWED_MARKS = ["bold", "italic", "underline", "link", "strike"] as const;

export type RichTextDocument = JSONContent;

export const EMPTY_RICH_TEXT_DOCUMENT: RichTextDocument = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedHref(href: unknown): href is string {
	if (typeof href !== "string") {
		return false;
	}
	const trimmed = href.trim();
	if (!trimmed || trimmed.length > 2000) {
		return false;
	}
	// Block javascript:/data:/vbscript: and protocol-relative tricks.
	if (/^(javascript|data|vbscript):/i.test(trimmed)) {
		return false;
	}
	return /^(https?:\/\/|mailto:|\/|#)/i.test(trimmed);
}

function sanitizeMarks(
	marks: unknown,
): { ok: true; marks?: JSONContent["marks"] } | { ok: false; error: string } {
	if (marks == null) {
		return { ok: true };
	}
	if (!Array.isArray(marks)) {
		return { ok: false, error: "Invalid marks." };
	}

	const next: NonNullable<JSONContent["marks"]> = [];
	for (const mark of marks) {
		if (!isPlainObject(mark) || typeof mark.type !== "string") {
			return { ok: false, error: "Invalid mark." };
		}
		if (!(RICH_TEXT_ALLOWED_MARKS as readonly string[]).includes(mark.type)) {
			return { ok: false, error: `Unsupported mark: ${mark.type}` };
		}
		if (mark.type === "link") {
			const attrs = isPlainObject(mark.attrs) ? mark.attrs : null;
			if (!attrs || !isAllowedHref(attrs.href)) {
				return { ok: false, error: "Invalid link URL." };
			}
			next.push({
				type: "link",
				attrs: {
					href: String(attrs.href).trim(),
					target: "_blank",
					rel: "noopener noreferrer nofollow",
				},
			});
			continue;
		}
		next.push({ type: mark.type });
	}

	return { ok: true, marks: next.length > 0 ? next : undefined };
}

function sanitizeNode(
	node: unknown,
	depth: number,
): { ok: true; node: JSONContent } | { ok: false; error: string } {
	if (depth > 32) {
		return { ok: false, error: "Document is too deeply nested." };
	}
	if (!isPlainObject(node) || typeof node.type !== "string") {
		return { ok: false, error: "Invalid document node." };
	}
	if (!(RICH_TEXT_ALLOWED_NODES as readonly string[]).includes(node.type)) {
		return { ok: false, error: `Unsupported node: ${node.type}` };
	}

	if (node.type === "text") {
		if (typeof node.text !== "string") {
			return { ok: false, error: "Invalid text node." };
		}
		if (node.text.length > 20_000) {
			return { ok: false, error: "Text is too long." };
		}
		const marks = sanitizeMarks(node.marks);
		if (!marks.ok) {
			return marks;
		}
		return {
			ok: true,
			node: {
				type: "text",
				text: node.text,
				...(marks.marks ? { marks: marks.marks } : {}),
			},
		};
	}

	if (node.type === "hardBreak") {
		return { ok: true, node: { type: "hardBreak" } };
	}

	let headingAttrs: { level: number } | undefined;
	if (node.type === "heading") {
		const attrs = isPlainObject(node.attrs) ? node.attrs : null;
		const level = attrs && typeof attrs.level === "number" ? attrs.level : null;
		if (level !== 2 && level !== 3) {
			return { ok: false, error: "Heading level must be 2 or 3." };
		}
		headingAttrs = { level };
	}

	const content: JSONContent[] = [];
	if (node.content != null) {
		if (!Array.isArray(node.content)) {
			return { ok: false, error: "Invalid node content." };
		}
		if (node.content.length > 500) {
			return { ok: false, error: "Document has too many blocks." };
		}
		for (const child of node.content) {
			const sanitized = sanitizeNode(child, depth + 1);
			if (!sanitized.ok) {
				return sanitized;
			}
			content.push(sanitized.node);
		}
	}

	return {
		ok: true,
		node: {
			type: node.type,
			...(headingAttrs ? { attrs: headingAttrs } : {}),
			...(content.length > 0 ? { content } : {}),
		},
	};
}

/** Validate + sanitize TipTap JSON. Rejects unknown nodes/marks and unsafe URLs. */
export function sanitizeRichTextDocument(
	value: unknown,
): { ok: true; document: RichTextDocument } | { ok: false; error: string } {
	if (value == null) {
		return { ok: true, document: EMPTY_RICH_TEXT_DOCUMENT };
	}

	const root = sanitizeNode(value, 0);
	if (!root.ok) {
		return root;
	}
	if (root.node.type !== "doc") {
		return { ok: false, error: "Document root must be a doc." };
	}

	return { ok: true, document: root.node };
}

export function isRichTextEmpty(document: RichTextDocument | null | undefined): boolean {
	if (!document?.content?.length) {
		return true;
	}

	const walk = (nodes: JSONContent[]): boolean => {
		for (const node of nodes) {
			if (node.type === "text" && node.text?.trim()) {
				return false;
			}
			if (node.content?.length && !walk(node.content)) {
				return false;
			}
		}
		return true;
	};

	return walk(document.content);
}

export function richTextPlainText(document: RichTextDocument | null | undefined): string {
	if (!document?.content) {
		return "";
	}

	const parts: string[] = [];
	const walk = (nodes: JSONContent[]) => {
		for (const node of nodes) {
			if (node.type === "text" && node.text) {
				parts.push(node.text);
			}
			if (node.content) {
				walk(node.content);
			}
			if (
				node.type === "paragraph" ||
				node.type === "blockquote" ||
				node.type === "heading" ||
				node.type === "listItem"
			) {
				parts.push("\n");
			}
		}
	};
	walk(document.content);
	return parts.join("").trim();
}
