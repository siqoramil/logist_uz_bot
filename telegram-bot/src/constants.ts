/** Pause between two sends inside one broadcast, so Telegram does not rate-limit us. */
export const BROADCAST_THROTTLE_MS = 1_000;

export const DEFAULT_BROADCAST_INTERVAL_MINUTES = 60;
export const MIN_BROADCAST_INTERVAL_MINUTES = 5;
export const MAX_BROADCAST_INTERVAL_MINUTES = 24 * 60;

export const MAX_MESSAGE_LENGTH = 4096;

/** How often the scheduler looks for subscribers whose next run is due. */
export const SCHEDULER_TICK_MS = 15_000;

export const MS_PER_MINUTE = 60_000;

/** Monthly access price used by CRM billing analytics. */
export const ACCESS_MONTH_PRICE_UZS = 100_000;
