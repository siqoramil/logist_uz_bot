import { MS_PER_MINUTE } from "@constants";
import { canBroadcast, type Subscriber } from "@domain";
import type { AccessRepository, Logger, SubscriberRepository } from "@ports";
import type { AccountBroadcastResult } from "./account-broadcaster";
import type { AccountBroadcasterRegistry } from "./account-broadcaster-registry";

export type AccountBroadcastReporter = (
  subscriber: Subscriber,
  result: AccountBroadcastResult,
) => Promise<void>;

export type AccountBroadcastErrorReporter = (
  subscriber: Subscriber,
  error: unknown,
) => Promise<void>;

export class RunDueAccountBroadcastsUseCase {
  constructor(
    private readonly subscribers: SubscriberRepository,
    private readonly access: AccessRepository,
    private readonly broadcasters: AccountBroadcasterRegistry,
    private readonly logger: Logger,
    private readonly report: AccountBroadcastReporter,
    private readonly reportError?: AccountBroadcastErrorReporter,
    private readonly alwaysAuthorizedUserId: number | null = null,
  ) {}

  async execute(now: Date = new Date()): Promise<void> {
    const due = await this.subscribers.findDue(now);
    await Promise.all(due.map((subscriber) => this.runSubscriber(subscriber, now)));
  }

  private async runSubscriber(subscriber: Subscriber, now: Date): Promise<void> {
    try {
      const authorized = subscriber.userId === this.alwaysAuthorizedUserId ||
        await this.access.isAuthorized(subscriber.userId, subscriber.username);
      if (!authorized || !this.broadcasters.hasAccount(subscriber.userId)) {
        await this.stop(subscriber.userId);
        return;
      }

      // Claim/reschedule before sending so the same due run is not replayed after a crash.
      await this.subscribers.update(subscriber.userId, {
        nextRunAt: new Date(now.getTime() + subscriber.intervalMinutes * MS_PER_MINUTE),
        lastRunAt: now,
      });

      if (!canBroadcast(subscriber)) return;
      const result = await this.broadcasters.execute(subscriber.userId, subscriber.message!);
      await this.report(subscriber, result);
    } catch (error) {
      this.logger.error(`Job account tarqatish xatosi (user ${subscriber.userId})`, error);
      await this.reportError?.(subscriber, error).catch((reportError) => {
        this.logger.error(
          `Job account xatosini yuborib bo'lmadi (user ${subscriber.userId})`,
          reportError,
        );
      });
    }
  }

  private async stop(userId: number): Promise<void> {
    await this.subscribers.update(userId, {
      active: false,
      state: "idle",
      nextRunAt: null,
    });
    await this.broadcasters.cancel(userId);
  }
}
