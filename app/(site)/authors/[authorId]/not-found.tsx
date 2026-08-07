import Link from "next/link";

import ErrorBlock404 from "@/components/404-error-block";
import { Button } from "@/components/ui/button";

export default function AuthorNotFound() {
	return (
		<ErrorBlock404
			className="min-h-[60vh]"
			subtitle="Author not found"
			description="This author doesn’t exist in Open Library, or the link may be wrong. Try searching for their name instead."
			buttons={{
				renderGoHome: (
					<Button nativeButton={false} render={<Link href="/books">Search books</Link>} />
				),
			}}
		/>
	);
}
