import type { Metadata } from "next";

import { brandAssets } from "@/components/brand";
import { APP_NAME, CURRENT_URL, DEVELOPMENT_URL, PRODUCTION_URL } from "@/lib/constants";

export const BRAND_COLOR = "#F0B100";

export const APP_TAGLINE = "Read together with friends";

export const APP_DESCRIPTION =
	"BookSavat is a Letterboxd-for-books: track shelves and ratings, write reviews, and join reading clubs with friends for shared sessions.";

export const APP_KEYWORDS = [
	"BookSavat",
	"books",
	"reading",
	"reading clubs",
	"book club",
	"reading sessions",
	"book reviews",
	"shelves",
	"Letterboxd for books",
	"Goodreads alternative",
] as const;

/** Canonical absolute site origin for the current deploy. */
export function getSiteUrl(): string {
	if (process.env.VERCEL_ENV === "production") {
		return PRODUCTION_URL;
	}

	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}

	return CURRENT_URL || DEVELOPMENT_URL;
}

export function absoluteUrl(path = "/"): string {
	const base = getSiteUrl().replace(/\/$/, "");
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${base}${normalized === "/" ? "" : normalized}` || base;
}

type BuildMetadataInput = {
	title?: string;
	description?: string;
	path?: string;
	image?: string;
	noIndex?: boolean;
	ogType?: "website" | "profile" | "article";
};

export function buildMetadata({
	title,
	description = APP_DESCRIPTION,
	path = "/",
	image = brandAssets.og,
	noIndex = false,
	ogType = "website",
}: BuildMetadataInput = {}): Metadata {
	const url = absoluteUrl(path);
	const ogTitle = title ? `${title} | ${APP_NAME}` : `${APP_NAME} — ${APP_TAGLINE}`;

	return {
		...(title ? { title } : {}),
		description,
		alternates: {
			canonical: url,
		},
		openGraph: {
			type: ogType,
			url,
			siteName: APP_NAME,
			title: ogTitle,
			description,
			locale: "en_US",
			images: [
				{
					url: image,
					width: 1200,
					height: 630,
					alt: APP_NAME,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: ogTitle,
			description,
			images: [image],
		},
		robots: noIndex
			? {
					index: false,
					follow: false,
					googleBot: {
						index: false,
						follow: false,
					},
				}
			: {
					index: true,
					follow: true,
					googleBot: {
						index: true,
						follow: true,
						"max-image-preview": "large",
						"max-snippet": -1,
						"max-video-preview": -1,
					},
				},
	};
}

export function buildWebsiteJsonLd() {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: APP_NAME,
		alternateName: APP_TAGLINE,
		url: getSiteUrl(),
		description: APP_DESCRIPTION,
		inLanguage: "en",
	};
}
