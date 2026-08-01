import {
	addWorkToShelf,
	createCustomShelf,
	deleteShelf,
	getShelfByUsernameAndSlug,
	listShelvesByUsername,
	membershipForWork,
	removeWorkFromShelf,
	reorderShelfItems,
	reorderShelves,
	updateShelf,
} from "@/lib/shelves/service.server";
import { ensureSystemShelves } from "@/lib/shelves/system.server";
import { protectedProcedure, publicProcedure } from "@/server/procedures";

export const listByUsername = publicProcedure.shelf.listByUsername.handler(
	async ({ input, context, errors }) => {
		const result = await listShelvesByUsername(
			context.db,
			input.username,
			context.session?.user?.id,
		);

		if (!result) {
			throw errors.NOT_FOUND({ message: "User not found" });
		}

		return result;
	},
);

export const getByUsernameAndSlug = publicProcedure.shelf.getByUsernameAndSlug.handler(
	async ({ input, context, errors }) => {
		const result = await getShelfByUsernameAndSlug(
			context.db,
			input.username,
			input.slug,
			context.session?.user?.id,
			{ limit: input.limit, offset: input.offset },
		);

		if (!result) {
			throw errors.NOT_FOUND({ message: "Shelf not found" });
		}

		return result;
	},
);

export const create = protectedProcedure.shelf.create.handler(async ({ input, context }) => {
	await ensureSystemShelves(context.db, context.viewer.user.id);
	return createCustomShelf(context.db, context.viewer.user.id, input);
});

export const update = protectedProcedure.shelf.update.handler(
	async ({ input, context, errors }) => {
		const { shelfId, ...patch } = input;
		const updated = await updateShelf(context.db, context.viewer.user.id, shelfId, patch);

		if (!updated) {
			throw errors.NOT_FOUND({ message: "Shelf not found" });
		}

		return updated;
	},
);

export const deleteShelfRoute = protectedProcedure.shelf.delete.handler(
	async ({ input, context, errors }) => {
		const result = await deleteShelf(context.db, context.viewer.user.id, input.shelfId);

		if (result === "not_found") {
			throw errors.NOT_FOUND({ message: "Shelf not found" });
		}

		if (result === "system") {
			throw errors.FORBIDDEN({ message: "System shelves cannot be deleted" });
		}

		return { ok: true as const };
	},
);

export const addWork = protectedProcedure.shelf.addWork.handler(
	async ({ input, context, errors }) => {
		const item = await addWorkToShelf(
			context.db,
			context.viewer.user.id,
			input.shelfId,
			input.workId,
		);

		if (!item) {
			throw errors.NOT_FOUND({ message: "Shelf not found" });
		}

		return item;
	},
);

export const removeWork = protectedProcedure.shelf.removeWork.handler(
	async ({ input, context, errors }) => {
		const result = await removeWorkFromShelf(
			context.db,
			context.viewer.user.id,
			input.shelfId,
			input.workId,
		);

		if (result === "not_found") {
			throw errors.NOT_FOUND({ message: "Shelf item not found" });
		}

		return { ok: true as const };
	},
);

export const reorderItems = protectedProcedure.shelf.reorderItems.handler(
	async ({ input, context, errors }) => {
		const result = await reorderShelfItems(
			context.db,
			context.viewer.user.id,
			input.shelfId,
			input.workIds,
		);

		if (result === "not_found") {
			throw errors.NOT_FOUND({ message: "Shelf not found" });
		}

		if (result === "unordered") {
			throw errors.FORBIDDEN({ message: "This shelf is not ordered" });
		}

		if (result === "mismatch") {
			throw errors.CONFLICT({ message: "Item order does not match the shelf contents" });
		}

		return { ok: true as const };
	},
);

export const reorderShelvesRoute = protectedProcedure.shelf.reorderShelves.handler(
	async ({ input, context, errors }) => {
		const result = await reorderShelves(context.db, context.viewer.user.id, input.shelfIds);

		if (result === "mismatch") {
			throw errors.CONFLICT({ message: "Shelf order does not match your shelves" });
		}

		return { ok: true as const };
	},
);

export const membershipForWorkRoute = protectedProcedure.shelf.membershipForWork.handler(
	async ({ input, context }) => {
		const memberships = await membershipForWork(context.db, context.viewer.user.id, input.workId);

		return { memberships };
	},
);

export const shelfRouter = {
	listByUsername,
	getByUsernameAndSlug,
	create,
	update,
	delete: deleteShelfRoute,
	addWork,
	removeWork,
	reorderItems,
	reorderShelves: reorderShelvesRoute,
	membershipForWork: membershipForWorkRoute,
};
