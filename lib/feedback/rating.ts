export const FEEDBACK_RATING_MIN = 0;
export const FEEDBACK_RATING_MAX = 5;
export const FEEDBACK_RATING_STEP = 0.5;

export function isValidFeedbackRating(value: number): boolean {
	if (!Number.isFinite(value)) {
		return false;
	}
	if (value < FEEDBACK_RATING_MIN || value > FEEDBACK_RATING_MAX) {
		return false;
	}
	const steps = value / FEEDBACK_RATING_STEP;
	return Math.abs(steps - Math.round(steps)) < 1e-9;
}

export function parseFeedbackRating(value: string | number): number | null {
	const num = typeof value === "number" ? value : Number(value);
	if (!isValidFeedbackRating(num)) {
		return null;
	}
	return Number(num.toFixed(1));
}
