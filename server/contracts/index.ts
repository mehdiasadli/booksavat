import type { InferContractRouterInputs, InferContractRouterOutputs } from "@orpc/contract";

import { bookContract } from "@/server/contracts/book.contract";
import { clubContract } from "@/server/contracts/club.contract";
import { feedbackContract } from "@/server/contracts/feedback.contract";
import { followContract } from "@/server/contracts/follow.contract";
import { healthContract } from "@/server/contracts/health.contract";
import { readingLogContract } from "@/server/contracts/reading-log.contract";
import { sessionContract } from "@/server/contracts/session.contract";
import { shelfContract } from "@/server/contracts/shelf.contract";
import { userContract } from "@/server/contracts/user.contract";

/**
 * The single source of truth for the API surface. Safe to import from client code:
 * it holds schemas and route metadata only, never handlers or database access.
 */
export const contract = {
	health: healthContract,
	session: sessionContract,
	user: userContract,
	book: bookContract,
	shelf: shelfContract,
	readingLog: readingLogContract,
	feedback: feedbackContract,
	follow: followContract,
	club: clubContract,
};

export type AppContract = typeof contract;
export type Inputs = InferContractRouterInputs<AppContract>;
export type Outputs = InferContractRouterOutputs<AppContract>;

export * from "@/server/contracts/base.contract";
export * from "@/server/contracts/book.contract";
export * from "@/server/contracts/club.contract";
export * from "@/server/contracts/errors";
export * from "@/server/contracts/feedback.contract";
export * from "@/server/contracts/follow.contract";
export * from "@/server/contracts/health.contract";
export * from "@/server/contracts/reading-log.contract";
export * from "@/server/contracts/session.contract";
export * from "@/server/contracts/shelf.contract";
export * from "@/server/contracts/user.contract";
