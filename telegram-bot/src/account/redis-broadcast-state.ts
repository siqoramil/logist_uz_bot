import { randomUUID } from "node:crypto";
import type { AppRedisClient } from "@infrastructure";
import type { AccountBroadcastResult } from "./account-broadcaster";

export interface BroadcastLease {
  release(): Promise<void>;
}

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

const RENEW_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
return 0
`;

export class RedisBroadcastState {
  private readonly lockKey = "logistic-bot:broadcast:lock";
  private readonly resultKey = "logistic-bot:broadcast:last-result";

  constructor(
    private readonly redis: AppRedisClient,
    private readonly lockTtlMs: number,
  ) {}

  async acquire(): Promise<BroadcastLease | null> {
    const token = randomUUID();
    const acquired = await this.redis.set(this.lockKey, token, {
      NX: true,
      PX: this.lockTtlMs,
    });
    if (acquired !== "OK") return null;

    const renewal = setInterval(() => {
      void this.redis.eval(RENEW_SCRIPT, {
        keys: [this.lockKey],
        arguments: [token, String(this.lockTtlMs)],
      }).catch(() => undefined);
    }, Math.max(1_000, Math.floor(this.lockTtlMs / 3)));
    renewal.unref();

    return {
      release: async () => {
        clearInterval(renewal);
        await this.redis.eval(RELEASE_SCRIPT, {
          keys: [this.lockKey],
          arguments: [token],
        });
      },
    };
  }

  async saveLastResult(result: AccountBroadcastResult): Promise<void> {
    await this.redis.set(this.resultKey, JSON.stringify(result), { EX: 7 * 24 * 60 * 60 });
  }

  async getLastResult(): Promise<AccountBroadcastResult | null> {
    const value = await this.redis.get(this.resultKey);
    if (!value) return null;
    try {
      return JSON.parse(value) as AccountBroadcastResult;
    } catch {
      await this.redis.del(this.resultKey);
      return null;
    }
  }
}
