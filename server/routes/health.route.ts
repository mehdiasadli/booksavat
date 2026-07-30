import { publicProcedure } from "@/server/procedures";

export const ping = publicProcedure.health.ping.handler(() => ({
	status: "ok" as const,
	timestamp: new Date(),
}));

export const healthRouter = {
	ping,
};
