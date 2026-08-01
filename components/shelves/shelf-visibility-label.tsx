import type { ShelfVisibilityDto } from "@/server/contracts/shelf.contract";

const LABELS: Record<ShelfVisibilityDto, string> = {
	private: "Private",
	followers_only: "Followers only",
	public: "Public",
};

export function shelfVisibilityLabel(visibility: ShelfVisibilityDto): string {
	return LABELS[visibility];
}
