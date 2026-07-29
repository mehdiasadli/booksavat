import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	// Resolves the "@/*" aliases from tsconfig.json; Vite handles this natively,
	// so the vite-tsconfig-paths plugin the Next.js guide mentions is not needed.
	resolve: { tsconfigPaths: true },
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		include: ["**/*.{test,spec}.{ts,tsx}"],
		exclude: ["node_modules/**", ".next/**", "coverage/**"],
		restoreMocks: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			reportsDirectory: "./coverage",
			include: ["app/**", "components/**", "hooks/**", "lib/**"],
			exclude: ["**/*.{test,spec}.{ts,tsx}", "app/**/{layout,error,not-found}.tsx"],
		},
	},
});
