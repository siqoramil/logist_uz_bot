export interface BroadcastFailure {
  readonly group: string;
  readonly reason: string;
}

export interface BroadcastResult {
  readonly sent: number;
  readonly failed: number;
  readonly failures: readonly BroadcastFailure[];
}

export const emptyBroadcastResult = (): BroadcastResult => ({
  sent: 0,
  failed: 0,
  failures: [],
});

export const withSuccess = (result: BroadcastResult): BroadcastResult => ({
  ...result,
  sent: result.sent + 1,
});

export const withFailure = (
  result: BroadcastResult,
  failure: BroadcastFailure,
): BroadcastResult => ({
  ...result,
  failed: result.failed + 1,
  failures: [...result.failures, failure],
});
