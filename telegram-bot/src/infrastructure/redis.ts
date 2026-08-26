import { createClient } from "redis";
import type { Logger } from "@ports";

export const connectRedis = async (
  url: string,
  logger: Logger,
) => {
  const client = createClient({ url });
  client.on("error", (error) => logger.error("Redis xatosi", error));
  await client.connect();
  await client.ping();
  return client;
};

export type AppRedisClient = Awaited<ReturnType<typeof connectRedis>>;

export const disconnectRedis = async (client: AppRedisClient): Promise<void> => {
  if (client.isOpen) await client.quit();
};
