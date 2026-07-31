import { Geist, Geist_Mono, Noto_Serif, Playfair_Display } from "next/font/google";

import "./globals.css";
import "@/lib/orpc.server";

import type { Metadata, Viewport } from "next";

import { brandAssets } from "@/components/brand";
import { Providers } from "@/components/providers";
import { APP_NAME } from "@/lib/constants";
import {
	APP_DESCRIPTION,
	APP_KEYWORDS,
	APP_TAGLINE,
	absoluteUrl,
	BRAND_COLOR,
	buildWebsiteJsonLd,
	getSiteUrl,
} from "@/lib/seo";
import { cn } from "@/lib/utils";

const playfairDisplayHeading = Playfair_Display({
	subsets: ["latin"],
	variable: "--font-heading",
});

const notoSerif = Noto_Serif({ subsets: ["latin"], variable: "--font-serif" });

const fontSans = Geist({
	subsets: ["latin"],
	variable: "--font-sans",
});

const fontMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	metadataBase: new URL(getSiteUrl()),
	title: {
		default: `${APP_NAME} — ${APP_TAGLINE}`,
		template: `%s | ${APP_NAME}`,
	},
	description: APP_DESCRIPTION,
	applicationName: APP_NAME,
	authors: [{ name: APP_NAME, url: getSiteUrl() }],
	creator: APP_NAME,
	publisher: APP_NAME,
	keywords: [...APP_KEYWORDS],
	category: "books",
	referrer: "origin-when-cross-origin",
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	appleWebApp: {
		title: APP_NAME,
		capable: true,
		statusBarStyle: "default",
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		url: absoluteUrl("/"),
		siteName: APP_NAME,
		title: `${APP_NAME} — ${APP_TAGLINE}`,
		description: APP_DESCRIPTION,
		images: [
			{
				url: brandAssets.og,
				width: 1200,
				height: 630,
				alt: `${APP_NAME} — ${APP_TAGLINE}`,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: `${APP_NAME} — ${APP_TAGLINE}`,
		description: APP_DESCRIPTION,
		images: [brandAssets.og],
	},
	alternates: {
		canonical: absoluteUrl("/"),
	},
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "48x48" },
			{ url: "/icon0.svg", type: "image/svg+xml" },
			{ url: "/icon1.png", sizes: "96x96", type: "image/png" },
		],
		apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
		shortcut: ["/favicon.ico"],
	},
	robots: {
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

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: BRAND_COLOR },
		{ media: "(prefers-color-scheme: dark)", color: BRAND_COLOR },
	],
	colorScheme: "light dark",
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const websiteJsonLd = buildWebsiteJsonLd();

	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={cn(
				"antialiased",
				fontSans.variable,
				fontMono.variable,
				"font-serif",
				notoSerif.variable,
				playfairDisplayHeading.variable,
			)}
		>
			<body>
				<script
					type="application/ld+json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD from a trusted local builder
					dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
				/>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
