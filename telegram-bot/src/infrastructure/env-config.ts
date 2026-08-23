import "dotenv/config";
import {
  DEFAULT_BROADCAST_INTERVAL_MINUTES,
  MAX_BROADCAST_INTERVAL_MINUTES,
  MIN_BROADCAST_INTERVAL_MINUTES,
} from "@constants";
import { ConfigurationError, isNonEmptyString } from "@domain";

export interface AppConfig {
  readonly botToken: string;
  readonly mongoUri: string;
  readonly defaultIntervalMinutes: number;
  readonly adminUsername: string;
  readonly adminPassword: string;
  readonly adminPort: number;
  readonly adminOrigin: string | null;
  readonly paymentCard: string;
  readonly paymentCardHolder: string | null;
  readonly adminContact: string;
}

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!isNonEmptyString(value)) {
    throw new ConfigurationError(`Missing env var: ${name}`);
  }
  return value;
};

const optionalEnv = (name: string): string | undefined => {
  const value = process.env[name];
  return isNonEmptyString(value) ? value : undefined;
};

const requireMinLengthEnv = (name: string, minLength: number): string => {
  const value = requireEnv(name);
  if (value.length < minLength) {
    throw new ConfigurationError(`Env var ${name} must be at least ${minLength} characters`);
  }
  return value;
};

const optionalIntEnv = (name: string, fallback: number, min: number, max: number): number => {
  const raw = optionalEnv(name);
  if (raw === undefined) return fallback;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ConfigurationError(`Env var ${name} must be between ${min} and ${max}`);
  }
  return value;
};

export const loadConfig = (): AppConfig => ({
  botToken: requireEnv("BOT_TOKEN"),
  mongoUri: requireEnv("MONGODB_URI"),
  defaultIntervalMinutes: optionalIntEnv(
    "BROADCAST_INTERVAL_MINUTES",
    DEFAULT_BROADCAST_INTERVAL_MINUTES,
    MIN_BROADCAST_INTERVAL_MINUTES,
    MAX_BROADCAST_INTERVAL_MINUTES,
  ),
  adminUsername: requireEnv("ADMIN_USERNAME"),
  adminPassword: requireMinLengthEnv("ADMIN_PASSWORD", 8),
  adminPort: optionalIntEnv("ADMIN_PORT", 3000, 1, 65_535),
  adminOrigin: optionalEnv("ADMIN_ORIGIN") ?? null,
  paymentCard: requireEnv("PAYMENT_CARD"),
  paymentCardHolder: optionalEnv("PAYMENT_CARD_HOLDER") ?? null,
  adminContact: requireEnv("ADMIN_CONTACT"),
});
