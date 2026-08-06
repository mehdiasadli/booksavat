export const CLUB_VISIBILITIES = ["public", "invite_only", "private"] as const;
export type ClubVisibility = (typeof CLUB_VISIBILITIES)[number];

export const CLUB_MEMBER_ROLES = ["admin", "moderator", "member"] as const;
export type ClubMemberRole = (typeof CLUB_MEMBER_ROLES)[number];

export const CLUB_MEMBER_STATUSES = ["active", "invited", "requested"] as const;
export type ClubMemberStatus = (typeof CLUB_MEMBER_STATUSES)[number];

export const CLUB_BOOKLIST_ITEM_STATUSES = ["active", "proposed"] as const;
export type ClubBooklistItemStatus = (typeof CLUB_BOOKLIST_ITEM_STATUSES)[number];

export const CLUB_SHORTLIST_MODES = ["manual", "random"] as const;
export type ClubShortlistMode = (typeof CLUB_SHORTLIST_MODES)[number];

export const CLUB_NAME_MAX = 80;
export const CLUB_DESCRIPTION_MAX = 2000;
export const CLUB_SLUG_MAX = 48;
export const CLUB_DEFAULT_SHORTLIST_SIZE = 10;
export const CLUB_SHORTLIST_SIZE_MIN = 2;
export const CLUB_SHORTLIST_SIZE_MAX = 30;

export type ClubBooklistSettings = {
	modsCanAdd: boolean;
	membersCanAdd: boolean;
	modsCanRemove: boolean;
	membersCanRemove: boolean;
	modsCanPropose: boolean;
	membersCanPropose: boolean;
	shortlistMode: ClubShortlistMode;
	defaultShortlistSize: number;
};

export const DEFAULT_CLUB_BOOKLIST_SETTINGS: ClubBooklistSettings = {
	modsCanAdd: true,
	membersCanAdd: false,
	modsCanRemove: false,
	membersCanRemove: false,
	modsCanPropose: true,
	membersCanPropose: true,
	shortlistMode: "manual",
	defaultShortlistSize: CLUB_DEFAULT_SHORTLIST_SIZE,
};
