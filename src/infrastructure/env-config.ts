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
});
