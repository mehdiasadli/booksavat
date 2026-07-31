const SPLIT_BY_UPPERCASE_REGEX = /(?=[A-Z])/;

export type Case =
	| "camel" // exampleText
	| "pascal" // ExampleText
	| "snake" // example_text
	| "kebab" // example-text
	| "title" // Example Text (first letters of each word are capitalized)
	| "capital" // Example text (only the first letter of the first word is capitalized)
	| "lower" // example text (like title, but all lowercase)
	| "upper" // EXAMPLE TEXT (like title, but all uppercase)
	| "constant"; // EXAMPLE_TEXT (like snake, but all uppercase)

/**
 * Split a string into words based on the source case format
 */
function parseWords(text: string, from: Case): string[] {
	switch (from) {
		case "camel":
		case "pascal":
			// Split on uppercase letters
			return text.split(SPLIT_BY_UPPERCASE_REGEX).filter(Boolean);
		case "snake":
		case "constant":
			// Split on underscores
			return text.split("_").filter(Boolean);
		case "kebab":
			// Split on hyphens
			return text.split("-").filter(Boolean);
		case "title":
		case "capital":
		case "lower":
		case "upper":
			// Split on spaces
			return text.split(" ").filter(Boolean);
		default:
			return [text];
	}
}

/**
 * Convert words array to the target case format
 */
function joinWords(words: string[], to: Case): string {
	// Normalize all words to lowercase first
	const normalized = words.map((w) => w.toLowerCase());

	switch (to) {
		case "camel":
			return normalized
				.map((word, i) => (i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
				.join("");
		case "pascal":
			return normalized.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
		case "snake":
			return normalized.join("_");
		case "kebab":
			return normalized.join("-");
		case "title":
			return normalized.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
		case "capital":
			return normalized
				.map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
				.join(" ");
		case "lower":
			return normalized.join(" ");
		case "upper":
			return normalized.map((word) => word.toUpperCase()).join(" ");
		case "constant":
			return normalized.map((word) => word.toUpperCase()).join("_");
		default:
			return normalized.join("");
	}
}

/**
 *
 * @param text - The string to convert
 * @param from - The case to convert from
 * @param to - The case to convert to
 * @returns The converted string
 */
export function formatCase(text: string, from: Case, to: Case): string {
	if (from === to) {
		return text;
	}

	const words = parseWords(text, from);
	return joinWords(words, to);
}

/**
 * Convert a string from one case to another.
 *
 * example:
 * ```ts
 * const fromPascalCase = fromCase("pascal");
 * const result = fromPascalCase("ExampleText", "camel"); // "exampleText"
 *
 * ```
 * @param from - The case to convert from
 * @returns A function that converts a string from one case to another
 */
export function fromCase(from: Case) {
	return (text: string, to: Case): string => {
		return formatCase(text, from, to);
	};
}

/**
 * Convert a string to another case.
 *
 * example:
 * ```ts
 * const toCamelCase = toCase("camel");
 * const result = toCamelCase("ExampleText", "pascal"); // "exampleText"
 *
 * ```
 * @param to - The case to convert to
 * @returns A function that converts a string to another case
 */
export function toCase(to: Case) {
	return (text: string, from: Case): string => {
		return formatCase(text, from, to);
	};
}

/**
 * In database enums are stored in snake_case.
 * So, there is a helper function to convert them to the correct case with default values.
 */
export function formatEnumValue(value: string, to: Case = "capital", from: Case = "snake") {
	return formatCase(value, from, to);
}

export function formattedEnum<T extends readonly string[]>(
	enumValues: T,
	to: Case = "title",
	from: Case = "snake",
) {
	return enumValues.map<{ value: T[number]; label: string }>((value) => ({
		value,
		label: formatEnumValue(value, to, from),
	}));
}
