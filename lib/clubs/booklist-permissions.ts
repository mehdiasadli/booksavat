import type { ClubBooklistSettings, ClubMemberRole } from "@/lib/clubs/constants";
import type { ViewerMembership } from "@/lib/clubs/visibility";

function isActive(membership: ViewerMembership): membership is NonNullable<ViewerMembership> {
	return membership?.status === "active";
}

/** Admin always can add; otherwise role toggles apply. */
export function canAddToBooklist(
	membership: ViewerMembership,
	settings: Pick<ClubBooklistSettings, "modsCanAdd" | "membersCanAdd">,
): boolean {
	if (!isActive(membership)) return false;
	if (membership.role === "admin") return true;
	if (membership.role === "moderator") return settings.modsCanAdd;
	return settings.membersCanAdd;
}

/**
 * Propose only when the role cannot free-add.
 * Admin never proposes (they always add).
 */
export function canProposeToBooklist(
	membership: ViewerMembership,
	settings: Pick<
		ClubBooklistSettings,
		"modsCanAdd" | "membersCanAdd" | "modsCanPropose" | "membersCanPropose"
	>,
): boolean {
	if (!isActive(membership)) return false;
	if (membership.role === "admin") return false;
	if (canAddToBooklist(membership, settings)) return false;
	if (membership.role === "moderator") return settings.modsCanPropose;
	return settings.membersCanPropose;
}

/** Admin always can remove (session locks applied separately). */
export function canRemoveFromBooklist(
	membership: ViewerMembership,
	settings: Pick<ClubBooklistSettings, "modsCanRemove" | "membersCanRemove">,
): boolean {
	if (!isActive(membership)) return false;
	if (membership.role === "admin") return true;
	if (membership.role === "moderator") return settings.modsCanRemove;
	return settings.membersCanRemove;
}

export function canModerateBooklistProposals(membership: ViewerMembership): boolean {
	return isActive(membership) && membership.role === "admin";
}

/** Admin always can upload PDFs; otherwise role toggles apply. */
export function canUploadBooklistPdf(
	membership: ViewerMembership,
	settings: Pick<ClubBooklistSettings, "modsCanUploadPdf" | "membersCanUploadPdf">,
): boolean {
	if (!isActive(membership)) return false;
	if (membership.role === "admin") return true;
	if (membership.role === "moderator") return settings.modsCanUploadPdf;
	return settings.membersCanUploadPdf;
}

export function booklistSettingsFromRoleFlags(
	role: ClubMemberRole,
	settings: ClubBooklistSettings,
): { canAdd: boolean; canPropose: boolean; canRemove: boolean; canUploadPdf: boolean } {
	const membership: ViewerMembership = { role, status: "active" };
	return {
		canAdd: canAddToBooklist(membership, settings),
		canPropose: canProposeToBooklist(membership, settings),
		canRemove: canRemoveFromBooklist(membership, settings),
		canUploadPdf: canUploadBooklistPdf(membership, settings),
	};
}
