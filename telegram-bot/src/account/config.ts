import "dotenv/config";
import { ConfigurationError, isNonEmptyString } from "@domain";

export interface AccountAppConfig {
  readonly botToken: string;
  readonly controllerUserId: number | null;
  readonly apiId: number;
  readonly apiHash: string;
  readonly sessions: ReadonlyMap<number, string>;
  readonly broadcastIntervalMinutes: number;
  readonly sendConcurrency: number;
  readonly maxFloodWaitSeconds: number;
  readonly adminUsername: string;
  readonly adminPassword: string;
  readonly adminPort: number;
  readonly adminOrigin: string | null;
  readonly mongoUri: string;
  readonly redisUrl: string;
  readonly redisBroadcastLockTtlMs: number;
}

const required = (name: string): string => {
  const value = process.env[name];
  if (!isNonEmptyString(value)) throw new ConfigurationError(`Missing env var: ${name}`);
  return value.trim();
};

const optional = (name: string): string | null => {
  const value = process.env[name]?.trim();
  return value ? value : null;
};

const integer = (
  name: string,
  fallback: number | null,
  min: number,
  max: number,
): number => {
  const configured = process.env[name]?.trim();
  if (!configured && fallback === null) {
    throw new ConfigurationError(`Missing env var: ${name}`);
  }
  const raw = configured || String(fallback);
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new ConfigurationError(`Env var ${name} must be between ${min} and ${max}`);
  }
  return value;
};

const accountSessions = (): ReadonlyMap<number, string> => {
  const configured = optional("TELEGRAM_ACCOUNT_SESSIONS");
  const sessions = new Map<number, string>();

  if (configured) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configured);
    } catch {
      throw new ConfigurationError("TELEGRAM_ACCOUNT_SESSIONS must be a JSON object");
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new ConfigurationError("TELEGRAM_ACCOUNT_SESSIONS must be a JSON object");
    }
    for (const [rawUserId, rawSession] of Object.entries(parsed)) {
      const userId = Number(rawUserId);
      if (!Number.isSafeInteger(userId) || userId <= 0 || !isNonEmptyString(rawSession)) {
        throw new ConfigurationError(
          "TELEGRAM_ACCOUNT_SESSIONS keys must be Telegram user IDs and values must be sessions",
        );
      }
      sessions.set(userId, rawSession.trim());
    }
  }

  const legacySession = optional("TELEGRAM_ACCOUNT_SESSION");
  const legacyController = optional("CONTROLLER_USER_ID");
  if (legacySession || legacyController) {
    if (!legacySession || !legacyController) {
      throw new ConfigurationError(
        "CONTROLLER_USER_ID and TELEGRAM_ACCOUNT_SESSION must be configured together",
      );
    }
    const userId = Number.parseInt(legacyController, 10);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new ConfigurationError("CONTROLLER_USER_ID must be a positive Telegram user ID");
    }
    sessions.set(userId, legacySession);
  }

  if (sessions.size === 0) {
    throw new ConfigurationError(
      "Configure TELEGRAM_ACCOUNT_SESSIONS or CONTROLLER_USER_ID with TELEGRAM_ACCOUNT_SESSION",
    );
  }
  return sessions;
};

export const loadAccountConfig = (): AccountAppConfig => ({
  botToken: required("BOT_TOKEN"),
  controllerUserId: optional("CONTROLLER_USER_ID") === null
    ? null
    : integer("CONTROLLER_USER_ID", null, 1, Number.MAX_SAFE_INTEGER),
  apiId: integer("TELEGRAM_API_ID", null, 1, 2_147_483_647),
  apiHash: required("TELEGRAM_API_HASH"),
  sessions: accountSessions(),
  broadcastIntervalMinutes: integer("BROADCAST_INTERVAL_MINUTES", 60, 5, 1_440),
  sendConcurrency: integer("ACCOUNT_SEND_CONCURRENCY", 10, 1, 50),
  maxFloodWaitSeconds: integer("ACCOUNT_MAX_FLOOD_WAIT_SECONDS", 300, 0, 3_600),
  adminUsername: required("ADMIN_USERNAME"),
  adminPassword: required("ADMIN_PASSWORD"),
  adminPort: integer("ADMIN_PORT", 3_000, 1, 65_535),
  adminOrigin: process.env.ADMIN_ORIGIN?.trim() || null,
  mongoUri: required("MONGODB_URI"),
  redisUrl: required("REDIS_URL"),
  redisBroadcastLockTtlMs: integer("REDIS_BROADCAST_LOCK_TTL_MS", 60_000, 10_000, 600_000),
});
