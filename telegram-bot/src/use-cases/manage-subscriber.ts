import {
  MAX_BROADCAST_INTERVAL_MINUTES,
  MAX_MESSAGE_LENGTH,
  MIN_BROADCAST_INTERVAL_MINUTES,
  MS_PER_MINUTE,
} from "@constants";
import { Guard, type Subscriber, type SubscriberState } from "@domain";
import type { SubscriberRepository } from "@ports";

export class ManageSubscriberUseCase {
  constructor(private readonly subscribers: SubscriberRepository) {}

  register(userId: number, username: string | null): Promise<Subscriber> {
    return this.subscribers.ensure(userId, username);
  }

  setState(userId: number, state: SubscriberState): Promise<Subscriber> {
    return this.subscribers.update(userId, { state });
  }

  setMessage(userId: number, message: string): Promise<Subscriber> {
    const trimmed = message.trim();
    Guard.againstEmpty(trimmed, "xabar");
    Guard.againstTooLong(trimmed, MAX_MESSAGE_LENGTH, "xabar");
    return this.subscribers.update(userId, { message: trimmed, state: "idle" });
  }

  setInterval(userId: number, minutes: number): Promise<Subscriber> {
    Guard.againstOutOfRange(
      minutes,
      MIN_BROADCAST_INTERVAL_MINUTES,
      MAX_BROADCAST_INTERVAL_MINUTES,
      "interval",
    );
    return this.subscribers.update(userId, { intervalMinutes: minutes, state: "idle" });
  }

  /** Starting schedules the first run one full interval out, not immediately. */
  async start(subscriber: Subscriber): Promise<Subscriber> {
    const nextRunAt = new Date(
      Date.now() + subscriber.intervalMinutes * MS_PER_MINUTE,
    );
    return this.subscribers.update(subscriber.userId, {
      active: true,
      state: "idle",
      nextRunAt,
    });
  }

  stop(userId: number): Promise<Subscriber> {
    return this.subscribers.update(userId, {
      active: false,
      state: "idle",
      nextRunAt: null,
    });
  }
}
