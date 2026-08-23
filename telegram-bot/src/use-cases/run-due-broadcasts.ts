import { MS_PER_MINUTE } from "@constants";
import {
  canBroadcast,
  type BroadcastResult,
  type Subscriber,
} from "@domain";
import type { AccessRepository, Logger, SubscriberRepository } from "@ports";
import type { BroadcastForSubscriberUseCase } from "./broadcast-for-subscriber";

/** Called after each subscriber's run so the bot can report back in Telegram. */
export type BroadcastReporter = (
  subscriber: Subscriber,
  result: BroadcastResult,
) => Promise<void>;

export type BroadcastErrorReporter = (
  subscriber: Subscriber,
  error: unknown,
) => Promise<void>;

export class RunDueBroadcastsUseCase {
  constructor(
    private readonly subscribers: SubscriberRepository,
    private readonly broadcast: BroadcastForSubscriberUseCase,
    private readonly logger: Logger,
    private readonly report: BroadcastReporter,
    private readonly access?: AccessRepository,
    private readonly reportError?: BroadcastErrorReporter,
  ) {}

  async execute(now: Date = new Date()): Promise<void> {
    const due = await this.subscribers.findDue(now);

    for (const subscriber of due) {
      try {
        if (
          this.access &&
          !(await this.access.isAuthorized(subscriber.userId, subscriber.username))
        ) {
          await this.subscribers.update(subscriber.userId, {
            active: false,
            state: "idle",
            nextRunAt: null,
          });
          continue;
        }

        // Reschedule first: a crash mid-send must not replay the same run forever.
        await this.subscribers.update(subscriber.userId, {
          nextRunAt: new Date(now.getTime() + subscriber.intervalMinutes * MS_PER_MINUTE),
          lastRunAt: now,
        });

        if (!canBroadcast(subscriber)) continue;
        const result = await this.broadcast.execute(subscriber);
        await this.report(subscriber, result);
      } catch (error) {
        this.logger.error(`Tarqatish xatosi (user ${subscriber.userId})`, error);
        await this.reportError?.(subscriber, error).catch((reportError) => {
          this.logger.error(`Xato xabarini yuborib bo'lmadi (user ${subscriber.userId})`, reportError);
        });
      }
    }
  }
}
