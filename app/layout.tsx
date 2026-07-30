import { Geist, Geist_Mono, Noto_Serif, Playfair_Display } from "next/font/google";

import "./globals.css";
import "@/lib/orpc.server";

import { Providers } from "@/components/providers";
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
