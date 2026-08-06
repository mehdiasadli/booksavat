import type { ClubMemberRole, ClubMemberStatus, ClubVisibility } from "@/lib/clubs/constants";

export type ViewerMembership = {
	role: ClubMemberRole;
	status: ClubMemberStatus;
} | null;

/** Active members always see full content; invite_only is hidden from everyone else. */
export function canViewClubContent(options: {
	visibility: ClubVisibility;
	membership: ViewerMembership;
}): boolean {
	const { visibility, membership } = options;
	if (membership?.status === "active") {
		return true;
	}
	return visibility === "public";
}

/** Whether a stranger may see the club header in search / explore. */
export function canDiscoverClub(options: {
	visibility: ClubVisibility;
	membership: ViewerMembership;
}): boolean {
	const { visibility, membership } = options;
	if (membership?.status === "active" || membership?.status === "invited") {
		return true;
	}
	return visibility === "public" || visibility === "private";
}

export function canManageSettings(membership: ViewerMembership): boolean {
	return membership?.status === "active" && membership.role === "admin";
}

export function canInvite(membership: ViewerMembership): boolean {
	return (
		membership?.status === "active" &&
		(membership.role === "admin" || membership.role === "moderator")
	);
}

export function canModerateRequests(membership: ViewerMembership): boolean {
	return canInvite(membership);
}

export function canSetRoles(membership: ViewerMembership): boolean {
	return canManageSettings(membership);
}

export function canRemoveMember(
	actor: ViewerMembership,
	target: { role: ClubMemberRole; status: ClubMemberStatus },
): boolean {
	if (!actor || actor.status !== "active") {
		return false;
	}
	if (target.status !== "active" && target.status !== "invited" && target.status !== "requested") {
		return false;
	}
	if (actor.role === "admin") {
		return target.role !== "admin";
	}
	if (actor.role === "moderator") {
		return target.role === "member" && target.status === "active";
	}
	return false;
}
