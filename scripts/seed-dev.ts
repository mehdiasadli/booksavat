/**
 * Manual entrypoint: `bun run db:seed`
 * The same seed also runs automatically from `instrumentation.ts` in development.
 */
import { seedDevData } from "../lib/dev/seed.server";

await seedDevData();
