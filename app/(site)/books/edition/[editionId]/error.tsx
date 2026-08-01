"use client";

import ErrorBlock404 from "@/components/404-error-block";
import { Button } from "@/components/ui/button";

export default function EditionError({
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
				subtitle="Couldn’t load this edition"
				description={error.message || "Something went wrong while loading this edition."}
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
