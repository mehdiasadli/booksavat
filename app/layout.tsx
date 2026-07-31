import { Geist, Geist_Mono, Noto_Serif, Playfair_Display } from "next/font/google";

import "./globals.css";
import "@/lib/orpc.server";

import type { Metadata, Viewport } from "next";

import { brandAssets } from "@/components/brand";
import { Providers } from "@/components/providers";
import { APP_NAME, CURRENT_URL, PRODUCTION_URL } from "@/lib/constants";
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

const APP_DESCRIPTION = "BookSavat is a platform for reading books together with your friends.";

export const metadata: Metadata = {
	metadataBase: new URL(process.env.VERCEL_ENV === "production" ? PRODUCTION_URL : CURRENT_URL),
	title: {
		default: APP_NAME,
		template: `%s | ${APP_NAME}`,
	},
	description: APP_DESCRIPTION,
	applicationName: APP_NAME,
	appleWebApp: {
		title: APP_NAME,
		capable: true,
	},
	openGraph: {
		type: "website",
		siteName: APP_NAME,
		title: APP_NAME,
		description: APP_DESCRIPTION,
		images: [
			{
				url: brandAssets.og,
				width: 1200,
				height: 630,
				alt: APP_NAME,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: APP_NAME,
		description: APP_DESCRIPTION,
		images: [brandAssets.og],
	},
	// File conventions also provide favicon.ico, icon0.svg, icon1.png, apple-icon.png.
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "48x48" },
			{ url: "/icon0.svg", type: "image/svg+xml" },
			{ url: "/icon1.png", sizes: "96x96", type: "image/png" },
		],
		apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
	},
	manifest: "/manifest.json",
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#F0B100" },
		{ media: "(prefers-color-scheme: dark)", color: "#F0B100" },
	],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
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
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
