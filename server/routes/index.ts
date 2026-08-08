import { implementer } from "@/server/procedures";
import { authorRouter } from "@/server/routes/author.route";
import { bookRouter } from "@/server/routes/book.route";
import { clubRouter } from "@/server/routes/club.route";
import { feedbackRouter } from "@/server/routes/feedback.route";
import { followRouter } from "@/server/routes/follow.route";
import { healthRouter } from "@/server/routes/health.route";
import { readingLogRouter } from "@/server/routes/reading-log.route";
import { sessionRouter } from "@/server/routes/session.route";
import { shelfRouter } from "@/server/routes/shelf.route";
import { storageRouter } from "@/server/routes/storage.route";
import { userRouter } from "@/server/routes/user.route";

/**
 * Built through the implementer so the contract is enforced for the whole tree,
 * not just per procedure. Middleware lives on the procedure bases instead of here
 * to keep each pipeline explicit at its definition site.
 */
export const router = implementer.router({
	health: healthRouter,
	session: sessionRouter,
	user: userRouter,
	book: bookRouter,
	author: authorRouter,
	shelf: shelfRouter,
	readingLog: readingLogRouter,
	feedback: feedbackRouter,
	follow: followRouter,
	club: clubRouter,
	storage: storageRouter,
});
