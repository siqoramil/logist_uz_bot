import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";
import type { AppRedisClient } from "@infrastructure";
import type { Logger } from "@ports";
import {
  TelegramAccountBroadcaster,
  type AccountBroadcastProgress,
  type AccountBroadcastResult,
  type AccountBroadcasterOptions,
} from "./account-broadcaster";
import { RedisBroadcastState } from "./redis-broadcast-state";

interface AccountBroadcasterEntry {
  readonly client: TelegramClient;
  readonly broadcaster: TelegramAccountBroadcaster;
}

export interface AccountBroadcasterRegistryOptions extends AccountBroadcasterOptions {
  readonly apiId: number;
  readonly apiHash: string;
  readonly lockTtlMs: number;
  readonly sessions: ReadonlyMap<number, string>;
}

/**
 * Owns one Telegram client and one isolated broadcast state per job account.
 * The Bot API sender (`ctx.from.id`) must match the Telegram account inside
 * that account's StringSession before the client can be used.
 */
export class AccountBroadcasterRegistry {
  private readonly entries = new Map<number, Promise<AccountBroadcasterEntry>>();

  constructor(
    private readonly options: AccountBroadcasterRegistryOptions,
    private readonly redis: AppRedisClient,
    private readonly logger: Logger,
  ) {}

  hasAccount(userId: number): boolean {
    return this.options.sessions.has(userId);
  }

  async isRunning(userId: number): Promise<boolean> {
    const entry = this.entries.get(userId);
    return entry ? (await entry).broadcaster.isRunning : false;
  }

  async cancel(userId: number): Promise<boolean> {
    const entry = this.entries.get(userId);
    return entry ? (await entry).broadcaster.cancel() : false;
  }

  async countGroups(userId: number): Promise<number> {
    return (await this.get(userId)).broadcaster.countGroups();
  }

  async getLastResult(userId: number): Promise<AccountBroadcastResult | null> {
    return (await this.get(userId)).broadcaster.getLastResult();
  }

  async execute(
    userId: number,
    text: string,
    onProgress?: (progress: AccountBroadcastProgress) => Promise<void>,
  ): Promise<AccountBroadcastResult> {
    return (await this.get(userId)).broadcaster.execute(text, onProgress);
  }

  async close(): Promise<void> {
    const entries = await Promise.allSettled(this.entries.values());
    await Promise.all(entries.flatMap((entry) =>
      entry.status === "fulfilled"
        ? [entry.value.client.disconnect().catch(() => undefined)]
        : []));
    this.entries.clear();
  }

  private get(userId: number): Promise<AccountBroadcasterEntry> {
    const session = this.options.sessions.get(userId);
    if (!session) return Promise.reject(new Error("job-account-not-configured"));

    const existing = this.entries.get(userId);
    if (existing) return existing;

    const created = this.create(userId, session).catch((error) => {
      this.entries.delete(userId);
      throw error;
    });
    this.entries.set(userId, created);
    return created;
  }

  private async create(userId: number, session: string): Promise<AccountBroadcasterEntry> {
    const client = new TelegramClient(
      new StringSession(session),
      this.options.apiId,
      this.options.apiHash,
      {
        connectionRetries: 5,
        floodSleepThreshold: this.options.maxFloodWaitSeconds,
      },
    );

    try {
      await client.connect();
      if (!(await client.checkAuthorization())) throw new Error("job-account-session-invalid");
      const account = await client.getMe();
      const accountId = Number(account.id.toString());
      if (accountId !== userId) {
        throw new Error(`job-account-session-mismatch:${userId}:${accountId}`);
      }
      client.setParseMode(undefined);
      this.logger.success(`Job account ulandi: ${userId}`);

      return {
        client,
        broadcaster: new TelegramAccountBroadcaster(client, {
          sendConcurrency: this.options.sendConcurrency,
          maxFloodWaitSeconds: this.options.maxFloodWaitSeconds,
        }, this.logger, new RedisBroadcastState(this.redis, this.options.lockTtlMs, userId)),
      };
    } catch (error) {
      await client.disconnect().catch(() => undefined);
      throw error;
    }
  }
}
