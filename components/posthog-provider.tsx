"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import { initPostHog, isPostHogEnabled, posthog } from "@/lib/posthog";

function PostHogIdentify() {
	const { data: session, isPending } = authClient.useSession();
	const lastDistinctId = useRef<string | null>(null);

	useEffect(() => {
		if (!isPostHogEnabled() || isPending) {
			return;
		}

		const user = session?.user;

		if (user?.id) {
			if (lastDistinctId.current === user.id) {
				return;
			}

			posthog.identify(user.id, {
				username: user.username,
				email: user.email,
				name: user.name,
			});
			lastDistinctId.current = user.id;
			return;
		}

		if (lastDistinctId.current !== null) {
			posthog.reset();
			lastDistinctId.current = null;
		}
	}, [session, isPending]);

	return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		initPostHog();
	}, []);

	if (!isPostHogEnabled()) {
		return children;
	}

	return (
		<PHProvider client={posthog}>
			<PostHogIdentify />
			{children}
		</PHProvider>
	);
}
