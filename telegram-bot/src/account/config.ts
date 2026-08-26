import "dotenv/config";
import { ConfigurationError, isNonEmptyString } from "@domain";

export interface AccountAppConfig {
  readonly botToken: string;
  readonly controllerUserId: number;
  readonly apiId: number;
  readonly apiHash: string;
  readonly session: string;
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

export const loadAccountConfig = (): AccountAppConfig => ({
  botToken: required("BOT_TOKEN"),
  controllerUserId: integer("CONTROLLER_USER_ID", null, 1, Number.MAX_SAFE_INTEGER),
  apiId: integer("TELEGRAM_API_ID", null, 1, 2_147_483_647),
  apiHash: required("TELEGRAM_API_HASH"),
  session: required("TELEGRAM_ACCOUNT_SESSION"),
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
