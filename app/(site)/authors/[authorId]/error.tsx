"use client";

import ErrorBlock404 from "@/components/404-error-block";
import { Button } from "@/components/ui/button";

export default function AuthorError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="space-y-4">
			<ErrorBlock404
				className="min-h-[50vh]"
				title="Error"
				subtitle="Couldn’t load this author"
				description={error.message || "Something went wrong while loading this author."}
				buttons={{
					renderGoBack: (
						<Button variant="outline" onClick={reset}>
							Try again
						</Button>
					),
				}}
			/>
		</div>
	);
}
