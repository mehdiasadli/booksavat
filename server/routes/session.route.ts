import { publicProcedure } from "@/server/procedures";
import { toPublicUser } from "@/server/routes/user.route";

export const current = publicProcedure.session.current.handler(({ context }) => {
	if (!context.session?.user) {
		return null;
	}

	return {
		user: toPublicUser(context.session.user),
		expiresAt: context.session.session.expiresAt,
	};
});

export const sessionRouter = {
	current,
};
