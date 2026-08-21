export interface AccessGrant {
  readonly id: string;
  /** Lowercase Telegram username without @. */
  readonly username: string;
  /** Phone containing digits only. */
  readonly phone: string;
  readonly enabled: boolean;
  readonly linkedUserId: number | null;
  readonly linkedUsername: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const normalizeUsername = (value: string): string =>
  value.trim().replace(/^@+/, "").toLowerCase();

export const normalizePhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
};
