export const CLUB_VISIBILITIES = ["public", "invite_only", "private"] as const;
export type ClubVisibility = (typeof CLUB_VISIBILITIES)[number];

export const CLUB_MEMBER_ROLES = ["admin", "moderator", "member"] as const;
export type ClubMemberRole = (typeof CLUB_MEMBER_ROLES)[number];

export const CLUB_MEMBER_STATUSES = ["active", "invited", "requested"] as const;
export type ClubMemberStatus = (typeof CLUB_MEMBER_STATUSES)[number];

export const CLUB_NAME_MAX = 80;
export const CLUB_DESCRIPTION_MAX = 2000;
export const CLUB_SLUG_MAX = 48;
