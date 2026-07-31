import type { MetadataRoute } from "next";

import { APP_NAME } from "@/lib/constants";
import { APP_DESCRIPTION, APP_TAGLINE, BRAND_COLOR } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
	return {
		id: "/",
		name: APP_NAME,
		short_name: APP_NAME,
		description: `${APP_DESCRIPTION} ${APP_TAGLINE}.`,
		lang: "en",
		dir: "ltr",
		start_url: "/",
		scope: "/",
		display: "standalone",
		display_override: ["standalone", "browser"],
		orientation: "any",
		theme_color: BRAND_COLOR,
		background_color: BRAND_COLOR,
		categories: ["books", "social", "entertainment", "lifestyle"],
		prefer_related_applications: false,
		icons: [
			{
				src: "/web-app-manifest-192x192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/web-app-manifest-512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/brand-icon.png",
				sizes: "1024x1024",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icon1.png",
				sizes: "96x96",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icon0.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "any",
			},
		],
		shortcuts: [
			{
				name: "Log in",
				short_name: "Login",
				description: `Sign in to your ${APP_NAME} account`,
				url: "/login",
				icons: [{ src: "/brand-icon.png", sizes: "1024x1024", type: "image/png" }],
			},
		],
	};
}
