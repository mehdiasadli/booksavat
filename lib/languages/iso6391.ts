/** ISO 639-1 codes offered when uploading club booklist PDFs. */
export const BOOK_PDF_LANGUAGE_CODES = [
	"af",
	"ar",
	"az",
	"bn",
	"bs",
	"ca",
	"cs",
	"cy",
	"da",
	"de",
	"el",
	"en",
	"es",
	"et",
	"eu",
	"fa",
	"fi",
	"fr",
	"ga",
	"gl",
	"he",
	"hi",
	"hr",
	"hu",
	"hy",
	"id",
	"is",
	"it",
	"ja",
	"ka",
	"ko",
	"lt",
	"lv",
	"mk",
	"ml",
	"mr",
	"ms",
	"nb",
	"nl",
	"nn",
	"no",
	"pa",
	"pl",
	"pt",
	"ro",
	"ru",
	"sk",
	"sl",
	"sq",
	"sr",
	"sv",
	"sw",
	"ta",
	"te",
	"th",
	"tr",
	"uk",
	"ur",
	"vi",
	"xh",
	"zh",
	"zu",
] as const;

export type BookPdfLanguageCode = (typeof BOOK_PDF_LANGUAGE_CODES)[number];

const displayNames = new Intl.DisplayNames(["en"], { type: "language" });

function languageLabel(code: string): string {
	const name = displayNames.of(code);
	if (!name || name === code) {
		return code.toUpperCase();
	}
	return name.charAt(0).toUpperCase() + name.slice(1);
}

export const BOOK_PDF_LANGUAGE_OPTIONS = BOOK_PDF_LANGUAGE_CODES.map((code) => ({
	code,
	label: languageLabel(code),
})).sort((a, b) => a.label.localeCompare(b.label));

export function bookPdfLanguageLabel(code: string): string {
	const match = BOOK_PDF_LANGUAGE_OPTIONS.find((option) => option.code === code);
	return match?.label ?? languageLabel(code);
}
