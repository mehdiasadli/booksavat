import type { NextConfig } from "next";

function r2PublicHostname(): string | null {
	const base = process.env.R2_PUBLIC_BASE_URL;
	if (!base) {
		return null;
	}

	try {
		return new URL(base).hostname;
	} catch {
		return null;
	}
}

const r2Hostname = r2PublicHostname();

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "covers.openlibrary.org",
			},
			// Faker person portraits used by the development seed.
			{
				protocol: "https",
				hostname: "cdn.jsdelivr.net",
			},
			...(r2Hostname
				? [
						{
							protocol: "https" as const,
							hostname: r2Hostname,
						},
					]
				: []),
		],
	},
};

export default nextConfig;
