"use client";

import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBlock404Props {
	title?: string;
	subtitle?: string;
	description?: string;

	className?: string;
	titleClassName?: string;
	contentClassName?: string;
	subtitleClassName?: string;
	descriptionClassName?: string;

	buttons?: {
		className?: string;
		renderGoHome?: boolean | React.ReactNode;
		renderGoBack?: boolean | React.ReactNode;

		goHomeIcon?: React.ReactNode;
		goBackIcon?: React.ReactNode;

		goHomeLabel?: string;
		goBackLabel?: string;
	};
}

export default function ErrorBlock404({
	title = "404",
	subtitle = "Page not found",
	description = "The page you are looking for does not exist or has been moved. Check the URL, or head back to safety.",
	className,
	titleClassName,
	contentClassName,
	subtitleClassName,
	descriptionClassName,
	buttons,
}: ErrorBlock404Props) {
	const router = useRouter();

	const handleGoBack = () => {
		router.back();
	};

	const defaultGoHomeButton = (
		<Button render={<Link href="/" />} nativeButton={false} className="w-full sm:w-auto">
			{buttons?.goHomeIcon ?? <Compass className="mr-2 h-4 w-4" />}
			{buttons?.goHomeLabel ?? "Go Home"}
		</Button>
	);

	const defaultGoBackButton = (
		<Button variant="outline" onClick={handleGoBack} className="w-full sm:w-auto">
			{buttons?.goBackIcon ?? <ArrowLeft className="mr-2 h-4 w-4" />}
			{buttons?.goBackLabel ?? "Go Back"}
		</Button>
	);

	return (
		<section
			className={cn(
				"flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-background px-6 py-12 text-center text-foreground",
				className,
			)}
		>
			<p
				className={cn("font-mono text-7xl font-bold tracking-tighter sm:text-8xl", titleClassName)}
			>
				{title}
			</p>

			<div className={cn("flex flex-col items-center gap-2", contentClassName)}>
				<h1 className={cn("text-2xl font-bold tracking-tight sm:text-3xl", subtitleClassName)}>
					{subtitle}
				</h1>
				<p className={cn("max-w-md text-sm text-muted-foreground", descriptionClassName)}>
					{description}
				</p>
			</div>

			<div className={cn("flex flex-col items-center gap-2 sm:flex-row", buttons?.className)}>
				{buttons?.renderGoHome !== false ? defaultGoHomeButton : buttons?.renderGoHome}
				{buttons?.renderGoBack !== false ? defaultGoBackButton : buttons?.renderGoBack}
			</div>
		</section>
	);
}
