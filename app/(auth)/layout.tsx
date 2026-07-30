import { redirectIfAuthenticated } from "@/lib/auth-functions";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
	await redirectIfAuthenticated();

	return <div>{children}</div>;
}
