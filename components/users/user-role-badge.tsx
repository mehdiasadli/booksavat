import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/contracts";

const roleLabels: Record<UserRole, string> = {
	user: "Reader",
	moderator: "Moderator",
	admin: "Admin",
};

const roleVariants: Record<UserRole, "secondary" | "default" | "outline"> = {
	user: "secondary",
	moderator: "outline",
	admin: "default",
};

interface UserRoleBadgeProps {
	role: UserRole;
	className?: string;
}

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
	return (
		<Badge variant={roleVariants[role]} className={cn("tracking-wide uppercase", className)}>
			{roleLabels[role]}
		</Badge>
	);
}
