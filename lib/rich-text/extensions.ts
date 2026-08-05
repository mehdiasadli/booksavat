import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

export function createRichTextExtensions(options: { placeholder?: string; editable: boolean }) {
	return [
		StarterKit.configure({
			heading: false,
			bulletList: false,
			orderedList: false,
			listItem: false,
			code: false,
			codeBlock: false,
			horizontalRule: false,
			strike: false,
		}),
		Underline,
		Link.configure({
			openOnClick: !options.editable,
			autolink: true,
			linkOnPaste: true,
			HTMLAttributes: {
				rel: "noopener noreferrer nofollow",
				target: "_blank",
				class: "text-primary underline underline-offset-2",
			},
			protocols: ["http", "https", "mailto"],
			validate: (href) => /^(https?:\/\/|mailto:|\/|#)/i.test(href),
		}),
		...(options.editable
			? [
					Placeholder.configure({
						placeholder: options.placeholder ?? "Write something…",
					}),
				]
			: []),
	];
}
