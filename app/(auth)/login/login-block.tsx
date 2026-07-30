"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export default function LoginBlock() {
	const handleLogin = async () => {
		const { error } = await authClient.signIn.social({
			provider: "google",
		});

		if (error) {
			toast.error(error.message || "Failed to login. Please try again later.");
			return;
		}
	};

	return (
		<section className="flex w-full items-center justify-center bg-background px-6 py-12 text-foreground">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<svg
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-hidden="true"
						className="mx-auto size-7 shrink-0 text-primary"
					>
						<rect x="3" y="3" width="8" height="8" transform="rotate(-6 7 7)" />
						<rect x="3" y="13" width="8" height="8" transform="rotate(5 7 17)" />
						<rect x="13" y="13" width="8" height="8" transform="rotate(-4 17 17)" />
						<rect x="13" y="3" width="8" height="8" transform="rotate(15 17 7)" />
					</svg>
					<CardTitle className="mt-4 text-xl font-bold tracking-tight">Sign In To Acme</CardTitle>
					<CardDescription className="text-sm">
						Welcome back. Enter your details to continue.
					</CardDescription>
				</CardHeader>

				<CardContent className="flex flex-col gap-6">
					<FieldGroup>
						<Button className="w-full" onClick={handleLogin}>
							Continue with Google
						</Button>
					</FieldGroup>
				</CardContent>
			</Card>
		</section>
	);
}
