"use client";

import { useState } from "react";
import { toast } from "sonner";

import { BrandIcon } from "@/components/brand";
import { GoogleLogo } from "@/components/logos/google";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export default function LoginBlock() {
	const [isLoading, setIsLoading] = useState(false);

	const handleLogin = async () => {
		setIsLoading(true);

		try {
			const { error } = await authClient.signIn.social({
				provider: "google",
			});

			if (error) {
				throw error;
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to login. Please try again later.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<section className="flex w-full items-center justify-center bg-background px-6 py-12 text-foreground">
			<Card className="w-full max-w-sm">
				<CardHeader className="justify-items-center text-center">
					<BrandIcon title="BookSavat" className="size-10" />
					<CardTitle className="mt-4 text-xl font-bold tracking-tight">
						Sign In To BookSavat
					</CardTitle>
					<CardDescription className="text-sm">
						Welcome back. Enter your details to continue.
					</CardDescription>
				</CardHeader>

				<CardContent className="flex flex-col gap-6">
					<FieldGroup>
						<Button
							className="w-full"
							loading={isLoading}
							loadingText="Redirecting..."
							onClick={handleLogin}
						>
							<GoogleLogo />
							Continue with Google
						</Button>
					</FieldGroup>
				</CardContent>
			</Card>
		</section>
	);
}
