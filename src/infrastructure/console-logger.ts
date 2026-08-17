import type { Logger } from "../ports/logger";

export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(message);
  }

  success(message: string): void {
    console.log(`  ✅ ${message}`);
  }

  error(message: string, error?: unknown): void {
    const detail = error instanceof Error ? error.message : error ? String(error) : null;
    const suffix = detail ? ` — ${detail}` : "";
    console.error(`  ❌ ${message}${suffix}`);
  }
}
