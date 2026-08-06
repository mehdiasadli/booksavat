import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

export function createRichTextExtensions(options: { placeholder?: string; editable: boolean }) {
	return [
		StarterKit.configure({
			heading: { levels: [2, 3] },
			bulletList: {},
			orderedList: {},
			listItem: {},
			code: false,
			codeBlock: false,
			horizontalRule: false,
			strike: {},
			underline: {},
			link: {
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
			},
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
