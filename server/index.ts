import type { InferRouterInputs, InferRouterOutputs, RouterClient } from "@orpc/server";

import { router } from "@/server/routes";

export { contract } from "@/server/contracts";

export { router };

export type AppRouter = typeof router;
export type AppRouterClient = RouterClient<AppRouter>;
export type RouterInputs = InferRouterInputs<AppRouter>;
export type RouterOutputs = InferRouterOutputs<AppRouter>;
