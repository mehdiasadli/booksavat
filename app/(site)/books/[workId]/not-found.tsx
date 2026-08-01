import Link from "next/link";

import ErrorBlock404 from "@/components/404-error-block";
import { Button } from "@/components/ui/button";

export default function WorkNotFound() {
	return (
		<ErrorBlock404
			className="min-h-[60vh]"
			subtitle="Book not found"
			description="This work doesn’t exist in Open Library, or the link may be wrong. Try searching for the title instead."
			buttons={{
				renderGoHome: (
					<Button nativeButton={false} render={<Link href="/books">Search books</Link>} />
				),
			}}
		/>
	);
}
