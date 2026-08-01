import ErrorBlock404 from "@/components/404-error-block";

export default function EditionNotFound() {
	return (
		<ErrorBlock404
			className="min-h-[60vh]"
			subtitle="Edition not found"
			description="This edition doesn’t exist in Open Library, or the link may be wrong. Head back and try another edition."
		/>
	);
}
