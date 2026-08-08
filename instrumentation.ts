export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		await import("./instrumentation.node");
	}

	if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "development") {
		const { seedDevData } = await import("@/lib/dev/seed.server");
		// Fire-and-forget so boot isn't blocked on Open Library / DB latency.
		void seedDevData();
	}
}
