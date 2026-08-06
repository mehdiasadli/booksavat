"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import {
	Bold,
	Heading2,
	Heading3,
	Italic,
	Link2,
	List,
	ListOrdered,
	Quote,
	Strikethrough,
	Underline as UnderlineIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { Toggle } from "@/components/ui/toggle";
import { EMPTY_RICH_TEXT_DOCUMENT, type RichTextDocument } from "@/lib/rich-text/document";
import { createRichTextExtensions } from "@/lib/rich-text/extensions";
import { cn } from "@/lib/utils";

export type RichTextEditorProps = {
	value?: RichTextDocument | null;
	onChange?: (value: RichTextDocument) => void;
	readOnly?: boolean;
	placeholder?: string;
	className?: string;
	editorClassName?: string;
	disabled?: boolean;
	/** Accessible label for the editor region. */
	"aria-label"?: string;
};

function ToolbarButton({
	pressed,
	onPressedChange,
	label,
	children,
	disabled,
}: {
	pressed: boolean;
	onPressedChange: () => void;
	label: string;
	children: React.ReactNode;
	disabled?: boolean;
}) {
	return (
		<Toggle
			size="sm"
			pressed={pressed}
			onPressedChange={() => onPressedChange()}
			aria-label={label}
			disabled={disabled}
		>
			{children}
		</Toggle>
	);
}

export function RichTextEditor({
	value,
	onChange,
	readOnly = false,
	placeholder,
	className,
	editorClassName,
	disabled = false,
	"aria-label": ariaLabel = "Rich text editor",
}: RichTextEditorProps) {
	const editable = !readOnly && !disabled;
	const [linkOpen, setLinkOpen] = useState(false);
	const [linkHref, setLinkHref] = useState("");
	const [linkLabel, setLinkLabel] = useState("");

	const editor = useEditor({
		immediatelyRender: false,
		editable,
		extensions: createRichTextExtensions({ placeholder, editable }),
		content: value ?? EMPTY_RICH_TEXT_DOCUMENT,
		editorProps: {
			attributes: {
				"aria-label": ariaLabel,
				class: cn(
					"rich-text-editor max-w-none px-3 py-2 text-sm leading-relaxed focus:outline-none",
					editable ? "min-h-28" : "min-h-0 px-0 py-0",
					"[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
					"[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
					"[&_p]:my-1",
					"[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold",
					"[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold",
					"[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
					"[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
					"[&_s]:line-through",
					editorClassName,
				),
			},
		},
		onUpdate: ({ editor: next }) => {
			onChange?.(next.getJSON());
		},
	});

	useEffect(() => {
		if (!editor) {
			return;
		}
		editor.setEditable(editable);
	}, [editor, editable]);

	useEffect(() => {
		if (!editor || !value) {
			return;
		}
		const current = JSON.stringify(editor.getJSON());
		const next = JSON.stringify(value);
		if (current !== next) {
			editor.commands.setContent(value, { emitUpdate: false });
		}
	}, [editor, value]);

	if (!editor) {
		return (
			<div
				className={cn(
					"rounded-lg border bg-transparent",
					readOnly ? "min-h-0 border-transparent px-0" : "min-h-36",
					className,
				)}
			/>
		);
	}

	function openLinkDialog() {
		if (!editor) {
			return;
		}
		const previous = editor.getAttributes("link").href as string | undefined;
		const selected = editor.state.doc.textBetween(
			editor.state.selection.from,
			editor.state.selection.to,
			" ",
		);
		setLinkHref(previous ?? "https://");
		setLinkLabel(selected);
		setLinkOpen(true);
	}

	function applyLink() {
		if (!editor) {
			return;
		}
		const href = linkHref.trim();
		if (!href) {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			setLinkOpen(false);
			return;
		}

		const { from, to, empty } = editor.state.selection;
		const chain = editor.chain().focus();
		if (empty && linkLabel.trim()) {
			chain
				.insertContent({
					type: "text",
					text: linkLabel.trim(),
					marks: [
						{
							type: "link",
							attrs: { href, target: "_blank", rel: "noopener noreferrer nofollow" },
						},
					],
				})
				.run();
		} else if (
			!empty &&
			linkLabel.trim() &&
			linkLabel.trim() !== editor.state.doc.textBetween(from, to)
		) {
			chain
				.deleteSelection()
				.insertContent({
					type: "text",
					text: linkLabel.trim(),
					marks: [
						{
							type: "link",
							attrs: { href, target: "_blank", rel: "noopener noreferrer nofollow" },
						},
					],
				})
				.run();
		} else {
			chain.extendMarkRange("link").setLink({ href }).run();
		}
		setLinkOpen(false);
	}

	return (
		<div
			className={cn(
				"overflow-hidden rounded-lg border bg-transparent",
				readOnly && "border-transparent",
				disabled && "opacity-60",
				className,
			)}
		>
			{editable ? (
				<div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
					<ToolbarButton
						pressed={editor.isActive("bold")}
						onPressedChange={() => editor.chain().focus().toggleBold().run()}
						label="Bold"
					>
						<Bold className="size-3.5" />
					</ToolbarButton>
					<ToolbarButton
						pressed={editor.isActive("italic")}
						onPressedChange={() => editor.chain().focus().toggleItalic().run()}
						label="Italic"
					>
						<Italic className="size-3.5" />
					</ToolbarButton>
					<ToolbarButton
						pressed={editor.isActive("underline")}
						onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
						label="Underline"
					>
						<UnderlineIcon className="size-3.5" />
					</ToolbarButton>
					<ToolbarButton
						pressed={editor.isActive("strike")}
						onPressedChange={() => editor.chain().focus().toggleStrike().run()}
						label="Strikethrough"
					>
						<Strikethrough className="size-3.5" />
					</ToolbarButton>
					<ToolbarButton
						pressed={editor.isActive("heading", { level: 2 })}
						onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
						label="Heading 2"
					>
						<Heading2 className="size-3.5" />
					</ToolbarButton>
					<ToolbarButton
						pressed={editor.isActive("heading", { level: 3 })}
						onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
						label="Heading 3"
					>
						<Heading3 className="size-3.5" />
					</ToolbarButton>
					<ToolbarButton
						pressed={editor.isActive("bulletList")}
						onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
						label="Bullet list"
					>
						<List className="size-3.5" />
					</ToolbarButton>
					<ToolbarButton
						pressed={editor.isActive("orderedList")}
						onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
						label="Ordered list"
					>
						<ListOrdered className="size-3.5" />
					</ToolbarButton>
					<ToolbarButton
						pressed={editor.isActive("blockquote")}
						onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
						label="Quote"
					>
						<Quote className="size-3.5" />
					</ToolbarButton>
					<ToolbarButton
						pressed={editor.isActive("link")}
						onPressedChange={openLinkDialog}
						label="Link"
					>
						<Link2 className="size-3.5" />
					</ToolbarButton>
				</div>
			) : null}

			<EditorContent editor={editor} />

			<Dialog open={linkOpen} onOpenChange={setLinkOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add link</DialogTitle>
						<DialogDescription>
							Use https://, mailto:, or a site-relative path. Label is optional when text is already
							selected.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3">
						<div className="grid gap-2">
							<Label htmlFor="rte-link-href">URL</Label>
							<Input
								id="rte-link-href"
								value={linkHref}
								onChange={(event) => setLinkHref(event.target.value)}
								placeholder="https://example.com"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="rte-link-label">Label</Label>
							<Input
								id="rte-link-label"
								value={linkLabel}
								onChange={(event) => setLinkLabel(event.target.value)}
								placeholder="Optional display text"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								editor.chain().focus().extendMarkRange("link").unsetLink().run();
								setLinkOpen(false);
							}}
						>
							Remove
						</Button>
						<Button onClick={applyLink}>Apply</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

/** Read-only rendering of a TipTap document (safe DOM via ProseMirror, not raw HTML). */
export function RichTextViewer({
	value,
	className,
	editorClassName,
}: {
	value?: RichTextDocument | null;
	className?: string;
	editorClassName?: string;
}) {
	return (
		<RichTextEditor
			value={value}
			readOnly
			className={className}
			editorClassName={editorClassName}
			aria-label="Review"
		/>
	);
}
