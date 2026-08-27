import type { AccountBroadcasterRegistry } from "../src/account/account-broadcaster-registry";
import type { AccountBroadcastResult } from "../src/account/account-broadcaster";
import { RedisBroadcastState } from "../src/account/redis-broadcast-state";
import { RunDueAccountBroadcastsUseCase } from "../src/account/run-due-account-broadcasts";
import type { Subscriber } from "@domain";
import type { AppRedisClient } from "@infrastructure";
import type { AccessRepository, Logger, SubscriberRepository } from "@ports";

const result: AccountBroadcastResult = {
  sent: 1,
  failed: 0,
  failures: [],
  total: 1,
  skipped: 0,
  canceled: false,
  durationSeconds: 1,
  deliveredGroups: [],
};

const main = async (): Promise<void> => {
  const redisValues = new Map<string, string>();
  const fakeRedis = {
    set: async (key: string, value: string, options?: { NX?: boolean }) => {
      if (options?.NX && redisValues.has(key)) return null;
      redisValues.set(key, value);
      return "OK";
    },
    get: async (key: string) => redisValues.get(key) ?? null,
    del: async (key: string) => redisValues.delete(key) ? 1 : 0,
    eval: async (script: string, options: { keys: string[]; arguments: string[] }) => {
      const key = options.keys[0]!;
      if (redisValues.get(key) !== options.arguments[0]) return 0;
      if (script.includes("DEL")) return redisValues.delete(key) ? 1 : 0;
      return 1;
    },
  } as unknown as AppRedisClient;
  const stateA = new RedisBroadcastState(fakeRedis, 60_000, 101);
  const stateB = new RedisBroadcastState(fakeRedis, 60_000, 202);
  await stateA.saveLastResult({ ...result, deliveredGroups: ["A group"] });
  await stateB.saveLastResult({ ...result, deliveredGroups: ["B group"] });
  if ((await stateA.getLastResult())?.deliveredGroups[0] !== "A group") {
    throw new Error("User A report was mixed with another account");
  }
  if ((await stateB.getLastResult())?.deliveredGroups[0] !== "B group") {
    throw new Error("User B report was mixed with another account");
  }
  const leaseA = await stateA.acquire();
  const leaseB = await stateB.acquire();
  if (!leaseA || !leaseB) throw new Error("Different job accounts must have independent locks");
  if (await stateA.acquire()) throw new Error("One job account must not acquire its lock twice");
  await leaseA.release();
  await leaseB.release();

  const now = new Date("2026-01-01T00:00:00.000Z");
  const scheduled = new Map<number, Subscriber>([101, 202].map((userId) => [userId, {
    userId,
    username: `job_${userId}`,
    language: "uz",
    message: `message-${userId}`,
    intervalMinutes: 60,
    active: true,
    state: "idle",
    nextRunAt: now,
    lastRunAt: null,
  }]));
  const subscriberRepository = {
    find: async (userId: number) => scheduled.get(userId) ?? null,
    ensure: async () => { throw new Error("not-used"); },
    update: async (userId: number, patch: Partial<Subscriber>) => {
      const updated = { ...scheduled.get(userId)!, ...patch };
      scheduled.set(userId, updated);
      return updated;
    },
    findDue: async () => [...scheduled.values()],
    countAll: async () => scheduled.size,
  } as unknown as SubscriberRepository;
  const access = { isAuthorized: async () => true } as unknown as AccessRepository;
  const logger: Logger = {
    info: () => undefined,
    success: () => undefined,
    error: () => undefined,
  };
  const scheduledCalls: string[] = [];
  const registry = {
    hasAccount: () => true,
    execute: async (userId: number, message: string) => {
      scheduledCalls.push(`${userId}:${message}`);
      return { ...result, deliveredGroups: [`group-${userId}`] };
    },
    cancel: async () => false,
  } as unknown as AccountBroadcasterRegistry;
  const scheduler = new RunDueAccountBroadcastsUseCase(
    subscriberRepository,
    access,
    registry,
    logger,
    async () => undefined,
  );
  await scheduler.execute(now);
  if (scheduledCalls.sort().join(",") !== "101:message-101,202:message-202") {
    throw new Error(`Scheduled messages crossed accounts: ${scheduledCalls.join(",")}`);
  }
  const expectedNextRun = now.getTime() + 60 * 60_000;
  if ([...scheduled.values()].some((item) => item.nextRunAt?.getTime() !== expectedNextRun)) {
    throw new Error("Each job account must be rescheduled by its own 60-minute interval");
  }
  console.log("MULTI-ACCOUNT SMOKE O'TDI ✅");
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
