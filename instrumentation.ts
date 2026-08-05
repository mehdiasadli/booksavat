export async function register() {
	await import("@/lib/orpc.server");

	if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "development") {
		const { seedDevData } = await import("@/lib/dev/seed.server");
		// Fire-and-forget so boot isn't blocked on Open Library / DB latency.
		void seedDevData();
	}
}
