import { BrandIcon, type BrandIconProps } from "@/components/brand";

/** @deprecated Prefer `BrandIcon` / `BrandWordmark` / `BrandText` from `@/components/brand`. */
export function BookSavatLogo(props: BrandIconProps) {
	return <BrandIcon title="BookSavat" {...props} />;
}
