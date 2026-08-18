import { SCHEDULER_TICK_MS } from "@constants";
import type { Logger } from "@ports";

/**
 * Polls for due broadcasts on a fixed tick. Ticks never overlap: a slow run
 * simply delays the next check rather than stacking concurrent broadcasts.
 */
export const startScheduler = (
  tick: () => Promise<void>,
  logger: Logger,
  signal: AbortSignal,
): void => {
  let running = false;

  const run = async (): Promise<void> => {
    if (running || signal.aborted) return;
    running = true;
    try {
      await tick();
    } catch (error) {
      logger.error("Scheduler xatosi", error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void run(), SCHEDULER_TICK_MS);
  signal.addEventListener("abort", () => clearInterval(timer), { once: true });
  void run();
};
