import { initPostHog } from "@/lib/posthog";

// Early client bootstrap so autocapture / session replay start before React hydrates.
initPostHog();
