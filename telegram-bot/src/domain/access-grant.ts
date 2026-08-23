export interface AccessPayment {
  readonly paidAt: Date;
  readonly amount: number;
}

export interface AccessGrant {
  readonly id: string;
  /** Lowercase Telegram username without @. */
  readonly username: string;
  /** Phone containing digits only. */
  readonly phone: string;
  readonly enabled: boolean;
  readonly linkedUserId: number | null;
  readonly linkedUsername: string | null;
  /** Exact moment when the paid access period ends. */
  readonly expiresAt: Date;
  readonly billingHistory: readonly AccessPayment[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AnalyticsMonth {
  readonly month: string;
  readonly revenue: number;
  readonly payments: number;
}

export interface AccessAnalytics {
  readonly pricePerMonth: number;
  readonly activeSubscriptions: number;
  readonly expiringSoon: number;
  readonly currentMonthRevenue: number;
  readonly monthlyRecurringRevenue: number;
  readonly totalRevenue: number;
  readonly totalPayments: number;
  readonly months: readonly AnalyticsMonth[];
}

/** Adds one calendar month and clamps dates such as 31 January to month-end. */
export const addAccessMonth = (from: Date): Date => {
  const result = new Date(from);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
};

export const normalizeUsername = (value: string): string =>
  value.trim().replace(/^@+/, "").toLowerCase();

export const normalizePhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
};
