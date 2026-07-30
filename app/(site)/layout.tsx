import { redirectIfNotAuthenticated } from "@/lib/auth-functions";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
	await redirectIfNotAuthenticated();

	return <div>{children}</div>;
}
