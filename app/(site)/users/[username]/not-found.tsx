import ErrorBlock404 from "@/components/404-error-block";

export default function UserNotFound() {
	return (
		<ErrorBlock404
			subtitle="User not found"
			description="This profile does not exist, or the username may have changed. Check the URL, or head back home."
		/>
	);
}
