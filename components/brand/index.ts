export { BrandIcon, type BrandIconProps } from "./icon";
export { BrandText, type BrandTextProps } from "./text";
export { BrandWordmark, type BrandWordmarkProps } from "./wordmark";

/** Raster / public URLs for places that need `<img>` or OG-style assets. */
export const brandAssets = {
	icon: "/brand-icon.png",
	text: "/brand-text.png",
	wordmark: "/brand-wordmark.png",
	og: "/og.png",
} as const;
