export const SLUG_REGEX = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.trim()
			// Turkish/Azerbaijani specific replacements
			.replace(/ü/g, "u")
			.replace(/ö/g, "o")
			.replace(/ş/g, "sh")
			.replace(/ç/g, "ch")
			.replace(/ğ/g, "g")
			.replace(/ı/g, "i")
			.replace(/ə/g, "e")
			// Russian Cyrillic (common in Azerbaijan)
			.replace(/а/g, "a")
			.replace(/б/g, "b")
			.replace(/в/g, "v")
			.replace(/г/g, "g")
			.replace(/д/g, "d")
			.replace(/е/g, "e")
			.replace(/ё/g, "yo")
			.replace(/ж/g, "zh")
			.replace(/з/g, "z")
			.replace(/и/g, "i")
			.replace(/й/g, "y")
			.replace(/к/g, "k")
			.replace(/л/g, "l")
			.replace(/м/g, "m")
			.replace(/н/g, "n")
			.replace(/о/g, "o")
			.replace(/п/g, "p")
			.replace(/р/g, "r")
			.replace(/с/g, "s")
			.replace(/т/g, "t")
			.replace(/у/g, "u")
			.replace(/ф/g, "f")
			.replace(/х/g, "h")
			.replace(/ц/g, "ts")
			.replace(/ч/g, "ch")
			.replace(/ш/g, "sh")
			.replace(/щ/g, "shch")
			.replace(/ъ/g, "")
			.replace(/ы/g, "y")
			.replace(/ь/g, "")
			.replace(/э/g, "e")
			.replace(/ю/g, "yu")
			.replace(/я/g, "ya")
			// Remove any remaining non-alphanumeric (except spaces, underscores, and hyphens)
			.replace(/[^a-z0-9\s_-]/g, "")
			// Replace spaces and hyphens with underscores
			.replace(/[\s-]+/g, "_")
			// Collapse repeated underscores
			.replace(/_+/g, "_")
			// Remove leading/trailing underscores
			.replace(/^_+|_+$/g, "")
	);
}

interface GenerateUniqueSlugOptions {
	maxAttempts?: number;
	slugify?: boolean;
	suffixVariant?: "random" | "counter";
	suffixSeparator?: string;
	randomSuffixLength?: number;
	onMaxAttemptsExceeded?: ((text: string, maxAttempts: number) => Error) | Error;
}

function createRandomSuffix(length: number): string {
	const bytes = crypto.getRandomValues(new Uint8Array(length));

	return Array.from(bytes, (byte) => (byte % 36).toString(36)).join("");
}

export async function generateUniqueSlug(
	text: string,
	checkIfExists: (slug: string) => Promise<boolean | number>,
	options: GenerateUniqueSlugOptions = {},
): Promise<string> {
	const {
		maxAttempts = 10,
		slugify: shouldSlugify = true,
		suffixVariant = "counter",
		suffixSeparator = "_",
		onMaxAttemptsExceeded,
		randomSuffixLength = 4,
	} = options;

	const normalizedSuffixSeparator =
		suffixSeparator === "_" || suffixSeparator === "-" ? suffixSeparator : "_";
	const originalSlug = shouldSlugify ? slugify(text) : text;
	let result = originalSlug;
	let attempt = 1;

	while (attempt <= maxAttempts) {
		const exists = await checkIfExists(result);

		if (exists === false || exists === 0) {
			return result;
		}

		switch (suffixVariant) {
			case "random": {
				const randomSuffix = createRandomSuffix(Math.max(randomSuffixLength, 1));
				result = `${originalSlug}${normalizedSuffixSeparator}${randomSuffix}`;
				break;
			}
			case "counter":
				result = `${originalSlug}${normalizedSuffixSeparator}${attempt}`;
				break;
			default:
				throw new Error(`Invalid suffix variant: ${suffixVariant}`);
		}

		attempt++;
	}

	if (onMaxAttemptsExceeded) {
		throw typeof onMaxAttemptsExceeded === "function"
			? onMaxAttemptsExceeded(text, maxAttempts)
			: onMaxAttemptsExceeded;
	}

	throw new Error(`Failed to generate unique slug after ${maxAttempts} attempts for text: ${text}`);
}

export function isValidSlug(slug: string): boolean {
	return SLUG_REGEX.test(slug);
}
