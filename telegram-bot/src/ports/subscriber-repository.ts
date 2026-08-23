import type { BotLanguage, Subscriber, SubscriberState } from "@domain";

export interface SubscriberPatch {
  readonly username?: string | null;
  readonly language?: BotLanguage;
  readonly message?: string | null;
  readonly intervalMinutes?: number;
  readonly active?: boolean;
  readonly state?: SubscriberState;
  readonly nextRunAt?: Date | null;
  readonly lastRunAt?: Date | null;
}

export interface SubscriberRepository {
  find(userId: number): Promise<Subscriber | null>;
  /** Creates the subscriber with defaults if absent, then returns it. */
  ensure(
    userId: number,
    username: string | null,
    preferredLanguage: BotLanguage,
  ): Promise<Subscriber>;
  update(userId: number, patch: SubscriberPatch): Promise<Subscriber>;
  /** Active subscribers whose nextRunAt has passed. */
  findDue(now: Date): Promise<Subscriber[]>;
  countAll(): Promise<number>;
}
