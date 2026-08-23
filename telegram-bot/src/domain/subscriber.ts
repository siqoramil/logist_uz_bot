/** What the bot expects next from this user's plain-text reply. */
export type SubscriberState = "idle" | "awaiting-message" | "awaiting-interval";

/** Languages available in the Telegram bot UI. */
export type BotLanguage = "uz" | "ru" | "en";

export interface Subscriber {
  readonly userId: number;
  readonly username: string | null;
  readonly language: BotLanguage;
  readonly message: string | null;
  readonly intervalMinutes: number;
  readonly active: boolean;
  readonly state: SubscriberState;
  /** When the next broadcast is due. Null while the subscriber is stopped. */
  readonly nextRunAt: Date | null;
  readonly lastRunAt: Date | null;
}

export const canBroadcast = (subscriber: Subscriber): boolean =>
  subscriber.active && subscriber.message !== null;
