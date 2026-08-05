import type { NextConfig } from "next";

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
		],
	},
};

export default nextConfig;
