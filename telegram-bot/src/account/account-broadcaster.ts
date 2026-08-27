import { TelegramClient } from "teleproto";
import {
  ChannelPrivateError,
  ChatAdminRequiredError,
  ChatWriteForbiddenError,
  FloodWaitError,
  FrozenMethodInvalidError,
  PeerFloodError,
  SlowModeWaitError,
  UserBannedInChannelError,
} from "teleproto/errors";
import type {
  BroadcastFailure,
  BroadcastResult,
  DeliveryErrorCode,
} from "@domain";
import type { Logger } from "@ports";
import type { RedisBroadcastState } from "./redis-broadcast-state";

type SendEntity = Parameters<TelegramClient["sendMessage"]>[0];

interface GroupTarget {
  readonly title: string;
  readonly entity: SendEntity;
}

export interface AccountBroadcastProgress {
  readonly done: number;
  readonly total: number;
  readonly sent: number;
  readonly failed: number;
}

export interface AccountBroadcastResult extends BroadcastResult {
  readonly total: number;
  readonly skipped: number;
  readonly canceled: boolean;
  readonly durationSeconds: number;
  readonly deliveredGroups: readonly string[];
}

export interface AccountBroadcasterOptions {
  readonly sendConcurrency: number;
  readonly maxFloodWaitSeconds: number;
}

interface ClassifiedError {
  readonly code: DeliveryErrorCode;
  readonly stopsBroadcast: boolean;
  readonly floodWaitSeconds: number | null;
}

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });

const classify = (error: unknown): ClassifiedError => {
  if (
    error instanceof ChatWriteForbiddenError ||
    error instanceof UserBannedInChannelError ||
    error instanceof ChatAdminRequiredError
  ) {
    return { code: "account-write-forbidden", stopsBroadcast: false, floodWaitSeconds: null };
  }
  if (error instanceof ChannelPrivateError) {
    return { code: "account-not-member", stopsBroadcast: false, floodWaitSeconds: null };
  }
  if (error instanceof SlowModeWaitError) {
    return { code: "rate-limited", stopsBroadcast: false, floodWaitSeconds: null };
  }
  if (error instanceof FloodWaitError) {
    return { code: "rate-limited", stopsBroadcast: false, floodWaitSeconds: error.seconds };
  }
  if (error instanceof PeerFloodError || error instanceof FrozenMethodInvalidError) {
    return { code: "account-restricted", stopsBroadcast: true, floodWaitSeconds: null };
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("message too long")) {
    return { code: "message-too-long", stopsBroadcast: true, floodWaitSeconds: null };
  }
  if (message.includes("timeout") || message.includes("timed out")) {
    return { code: "request-timeout", stopsBroadcast: false, floodWaitSeconds: null };
  }
  if (message.includes("econnreset") || message.includes("connection reset")) {
    return { code: "connection-reset", stopsBroadcast: false, floodWaitSeconds: null };
  }
  if (message.includes("network") || message.includes("connect")) {
    return { code: "network-unavailable", stopsBroadcast: false, floodWaitSeconds: null };
  }
  return { code: "unknown", stopsBroadcast: false, floodWaitSeconds: null };
};

const failure = (group: string, code: DeliveryErrorCode): BroadcastFailure => ({
  group,
  code,
  reason: code,
  action: code,
});

export class TelegramAccountBroadcaster {
  private currentJob: AbortController | null = null;
  private reconnectPromise: Promise<void> | null = null;
  private connectionGeneration = 0;

  constructor(
    private readonly client: TelegramClient,
    private readonly options: AccountBroadcasterOptions,
    private readonly logger: Logger,
    private readonly state: RedisBroadcastState,
  ) {}

  get isRunning(): boolean {
    return this.currentJob !== null;
  }

  cancel(): boolean {
    if (!this.currentJob) return false;
    this.currentJob.abort();
    return true;
  }

  async countGroups(): Promise<number> {
    return (await this.loadGroups()).length;
  }

  getLastResult(): Promise<AccountBroadcastResult | null> {
    return this.state.getLastResult();
  }

  async execute(
    text: string,
    onProgress?: (progress: AccountBroadcastProgress) => Promise<void>,
  ): Promise<AccountBroadcastResult> {
    if (this.currentJob) throw new Error("broadcast-already-running");
    const lease = await this.state.acquire();
    if (!lease) throw new Error("broadcast-already-running");
    const job = new AbortController();
    this.currentJob = job;
    const startedAt = Date.now();

    try {
      const groups = await this.loadGroups();
      const failures: BroadcastFailure[] = [];
      const deliveredGroups: string[] = [];
      let sent = 0;
      let done = 0;
      let stopped = false;
      let nextGroupIndex = 0;

      const sendNext = async (): Promise<void> => {
        while (!job.signal.aborted && !stopped) {
          const group = groups[nextGroupIndex];
          nextGroupIndex += 1;
          if (!group) return;
          let classification: ClassifiedError | null = null;

          try {
            await this.sendMessage(group, text);
            sent += 1;
            deliveredGroups.push(group.title);
          } catch (error) {
            classification = classify(error);
            const waitSeconds = classification.floodWaitSeconds;
            if (waitSeconds !== null && waitSeconds <= this.options.maxFloodWaitSeconds) {
              this.logger.info(`Telegram ${waitSeconds} soniya kutishni so'radi`);
              await sleep((waitSeconds + 1) * 1_000, job.signal);
              if (!job.signal.aborted) {
                try {
                  await this.sendMessage(group, text);
                  sent += 1;
                  deliveredGroups.push(group.title);
                  classification = null;
                } catch (retryError) {
                  classification = classify(retryError);
                }
              }
            }
            if (classification) {
              failures.push(failure(group.title, classification.code));
              stopped = classification.stopsBroadcast ||
                (classification.floodWaitSeconds ?? 0) > this.options.maxFloodWaitSeconds;
              this.logger.error(`Guruhga yuborilmadi: ${group.title}`, error);
            }
          }

          done += 1;
          await onProgress?.({ done, total: groups.length, sent, failed: failures.length });
        }
      };

      const workerCount = Math.min(this.options.sendConcurrency, groups.length);
      await Promise.all(Array.from({ length: workerCount }, () => sendNext()));

      const result: AccountBroadcastResult = {
        sent,
        failed: failures.length,
        failures,
        total: groups.length,
        skipped: Math.max(0, groups.length - done),
        canceled: job.signal.aborted,
        durationSeconds: Math.round((Date.now() - startedAt) / 1_000),
        deliveredGroups,
      };
      await this.state.saveLastResult(result);
      return result;
    } finally {
      this.currentJob = null;
      await lease.release().catch((error) => this.logger.error("Redis lock bo'shatilmadi", error));
    }
  }

  private async loadGroups(): Promise<GroupTarget[]> {
    const groups: GroupTarget[] = [];
    await this.ensureConnected();
    const generation = this.connectionGeneration;
    const getDialogs = () => this.client.getDialogs({
      limit: undefined,
      // teleproto 1.228.5 has an inverted ignoreMigrated filter; filter below.
      ignoreMigrated: false,
    });

    let dialogs;
    try {
      dialogs = await getDialogs();
    } catch (error) {
      if (!this.isConnectionFailure(error)) throw error;
      await this.reconnect(generation);
      dialogs = await getDialogs();
    }

    for (const dialog of dialogs) {
      const entity = dialog.entity;
      if (entity && "migratedTo" in entity && entity.migratedTo) continue;
      if (!dialog.isGroup) continue;
      groups.push({
        title: dialog.title ?? dialog.name ?? dialog.id?.toString() ?? "Telegram group",
        entity: dialog.inputEntity,
      });
    }
    return groups;
  }

  private async sendMessage(group: GroupTarget, text: string): Promise<void> {
    await this.ensureConnected();
    await this.client.sendMessage(group.entity, {
      message: text,
      parseMode: undefined,
    });
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.connected) return;
    await this.reconnect(this.connectionGeneration, false);
  }

  private async reconnect(observedGeneration: number, force = true): Promise<void> {
    if (this.connectionGeneration > observedGeneration && this.client.connected) return;
    if (this.reconnectPromise) {
      await this.reconnectPromise;
      return;
    }

    const reconnectPromise = (async () => {
      this.logger.info("Ishchi Telegram account qayta ulanmoqda...");
      if (force && this.client.connected) {
        await this.client.disconnect().catch(() => undefined);
      }
      if (!this.client.connected) {
        await this.client.connect();
      }
      if (!this.client.connected || !(await this.client.checkAuthorization())) {
        throw new Error("telegram-account-not-authorized");
      }
      this.connectionGeneration += 1;
      this.logger.success("Ishchi Telegram account qayta ulandi");
    })();

    this.reconnectPromise = reconnectPromise;
    try {
      await reconnectPromise;
    } finally {
      if (this.reconnectPromise === reconnectPromise) this.reconnectPromise = null;
    }
  }

  private isConnectionFailure(error: unknown): boolean {
    if (!this.client.connected) return true;
    const code = classify(error).code;
    return code === "network-unavailable" ||
      code === "request-timeout" ||
      code === "connection-reset";
  }
}
