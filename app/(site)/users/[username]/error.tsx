"use client";

import { useParams } from "next/navigation";

import ErrorBlock404 from "@/components/404-error-block";

export default function UserError() {
	const { username } = useParams();

	return (
		<div>
			<ErrorBlock404
				subtitle="The user you are looking for does not exist"
				description={`The user ${username} does not exist or has been moved. Check the URL, or head back to safety.`}
			/>
		</div>
	);
}
