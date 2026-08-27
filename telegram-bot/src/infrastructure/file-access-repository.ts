import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { ACCESS_MONTH_PRICE_UZS } from "@constants";
import {
  AccessInputError,
  addAccessMonth,
  normalizePhone,
  normalizeUsername,
  type AccessAnalytics,
  type AccessGrant,
} from "@domain";
import type { AccessRepository } from "@ports";

interface StoredAccessGrant {
  readonly id: string;
  readonly fullName?: string | null;
  readonly username: string | null;
  readonly phone: string;
  readonly enabled: boolean;
  readonly linkedUserId: number | null;
  readonly linkedUsername: string | null;
  readonly expiresAt: string;
  readonly billingHistory: readonly { readonly paidAt: string; readonly amount: number }[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

const validateUsername = (raw: string): string => {
  const username = normalizeUsername(raw);
  if (!/^[a-z0-9_]{5,32}$/.test(username)) {
    throw new AccessInputError(
      "invalid-username",
      "Telegram username 5–32 ta lotin harfi, raqam yoki pastki chiziqdan iborat bo'lishi kerak",
    );
  }
  return username;
};

const validatePhone = (raw: string): string => {
  const phone = normalizePhone(raw);
  if (!/^998\d{9}$/.test(phone)) {
    throw new AccessInputError(
      "invalid-phone",
      "Telefon raqami O'zbekiston formatida bo'lishi kerak: +998 99 123 11 22",
    );
  }
  return phone;
};

const validateFullName = (raw: string): string => {
  const fullName = raw.trim().replace(/\s+/g, " ");
  if (fullName.length < 2 || fullName.length > 100) {
    throw new AccessInputError(
      "invalid-full-name",
      "Ism-familiya 2–100 ta belgidan iborat bo'lishi kerak",
    );
  }
  return fullName;
};

const toDomain = (grant: StoredAccessGrant): AccessGrant => ({
  ...grant,
  fullName: grant.fullName ?? null,
  expiresAt: new Date(grant.expiresAt),
  billingHistory: grant.billingHistory.map((payment) => ({
    ...payment,
    paidAt: new Date(payment.paidAt),
  })),
  createdAt: new Date(grant.createdAt),
  updatedAt: new Date(grant.updatedAt),
});

const toStored = (grant: AccessGrant): StoredAccessGrant => ({
  ...grant,
  expiresAt: grant.expiresAt.toISOString(),
  billingHistory: grant.billingHistory.map((payment) => ({
    ...payment,
    paidAt: payment.paidAt.toISOString(),
  })),
  createdAt: grant.createdAt.toISOString(),
  updatedAt: grant.updatedAt.toISOString(),
});

export class FileAccessRepository implements AccessRepository {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private async synchronized<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async read(): Promise<AccessGrant[]> {
    try {
      const value = JSON.parse(await readFile(this.filePath, "utf8")) as unknown;
      if (!Array.isArray(value)) return [];
      return value.map((item) => toDomain(item as StoredAccessGrant));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async write(grants: readonly AccessGrant[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    await writeFile(temporary, JSON.stringify(grants.map(toStored), null, 2), { mode: 0o600 });
    await rename(temporary, this.filePath);
  }

  async list(): Promise<AccessGrant[]> {
    await this.expireDue(new Date());
    const grants = await this.read();
    return grants.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async add(rawUsername: string | null, rawPhone: string, rawFullName: string): Promise<AccessGrant> {
    return this.synchronized(async () => {
      const fullName = validateFullName(rawFullName);
      const username = rawUsername === null || rawUsername.trim() === ""
        ? null
        : validateUsername(rawUsername);
      const phone = validatePhone(rawPhone);
      const grants = await this.read();
      const existingIndex = grants.findIndex(
        (grant) => grant.phone === phone || (username !== null && grant.username === username),
      );
      const now = new Date();

      if (existingIndex >= 0) {
        const existing = grants[existingIndex]!;
        if (existing.username !== username) {
          throw new AccessInputError("phone-in-use", "Bu telefon boshqa username'ga biriktirilgan");
        }
        if (username !== null && existing.phone !== phone) {
          throw new AccessInputError("username-in-use", "Bu username boshqa telefonga biriktirilgan");
        }
        const renewed: AccessGrant = {
          ...existing,
          fullName,
          enabled: true,
          expiresAt: addAccessMonth(existing.expiresAt > now ? existing.expiresAt : now),
          billingHistory: [
            ...existing.billingHistory,
            { paidAt: now, amount: ACCESS_MONTH_PRICE_UZS },
          ],
          updatedAt: now,
        };
        grants[existingIndex] = renewed;
        await this.write(grants);
        return renewed;
      }

      const grant: AccessGrant = {
        id: randomBytes(12).toString("hex"),
        fullName,
        username,
        phone,
        enabled: true,
        linkedUserId: null,
        linkedUsername: null,
        expiresAt: addAccessMonth(now),
        billingHistory: [{ paidAt: now, amount: ACCESS_MONTH_PRICE_UZS }],
        createdAt: now,
        updatedAt: now,
      };
      grants.push(grant);
      await this.write(grants);
      return grant;
    });
  }

  async setEnabled(id: string, enabled: boolean): Promise<AccessGrant | null> {
    return this.synchronized(async () => {
      const grants = await this.read();
      const index = grants.findIndex((grant) => grant.id === id);
      if (index < 0) return null;
      const now = new Date();
      const current = grants[index]!;
      const renewed = enabled && current.expiresAt <= now;
      const grant: AccessGrant = {
        ...current,
        enabled,
        expiresAt: renewed ? addAccessMonth(now) : current.expiresAt,
        billingHistory: renewed
          ? [...current.billingHistory, { paidAt: now, amount: ACCESS_MONTH_PRICE_UZS }]
          : current.billingHistory,
        updatedAt: now,
      };
      grants[index] = grant;
      await this.write(grants);
      return grant;
    });
  }

  async updateFullName(id: string, rawFullName: string): Promise<AccessGrant | null> {
    return this.synchronized(async () => {
      const grants = await this.read();
      const index = grants.findIndex((grant) => grant.id === id);
      if (index < 0) return null;
      const updated: AccessGrant = {
        ...grants[index]!,
        fullName: validateFullName(rawFullName),
        updatedAt: new Date(),
      };
      grants[index] = updated;
      await this.write(grants);
      return updated;
    });
  }

  async expireDue(now: Date): Promise<AccessGrant[]> {
    return this.synchronized(async () => {
      const grants = await this.read();
      const expired: AccessGrant[] = [];
      const updated = grants.map((grant) => {
        if (!grant.enabled || grant.expiresAt > now) return grant;
        const paused = { ...grant, enabled: false, updatedAt: now };
        expired.push(paused);
        return paused;
      });
      if (expired.length > 0) await this.write(updated);
      return expired;
    });
  }

  async analytics(now: Date = new Date()): Promise<AccessAnalytics> {
    const grants = await this.list();
    const payments = grants.flatMap((grant) => grant.billingHistory);
    const monthKey = (date: Date): string =>
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
      const month = monthKey(date);
      const monthPayments = payments.filter((payment) => monthKey(payment.paidAt) === month);
      return {
        month,
        revenue: monthPayments.reduce((sum, payment) => sum + payment.amount, 0),
        payments: monthPayments.length,
      };
    });
    const activeSubscriptions = grants.filter(
      (grant) => grant.enabled && grant.expiresAt > now,
    ).length;
    const soon = now.getTime() + 7 * 24 * 60 * 60 * 1_000;
    return {
      pricePerMonth: ACCESS_MONTH_PRICE_UZS,
      activeSubscriptions,
      expiringSoon: grants.filter(
        (grant) => grant.enabled && grant.expiresAt > now && grant.expiresAt.getTime() <= soon,
      ).length,
      currentMonthRevenue: months.at(-1)?.revenue ?? 0,
      monthlyRecurringRevenue: activeSubscriptions * ACCESS_MONTH_PRICE_UZS,
      totalRevenue: payments.reduce((sum, payment) => sum + payment.amount, 0),
      totalPayments: payments.length,
      months,
    };
  }

  async remove(id: string): Promise<AccessGrant | null> {
    return this.synchronized(async () => {
      const grants = await this.read();
      const index = grants.findIndex((grant) => grant.id === id);
      if (index < 0) return null;
      const [removed] = grants.splice(index, 1);
      await this.write(grants);
      return removed ?? null;
    });
  }

  async isAuthorized(userId: number, username: string | null): Promise<boolean> {
    return (await this.list()).some(
      (grant) => grant.enabled && grant.expiresAt > new Date() &&
        grant.linkedUserId === userId,
    );
  }

  async authorizeByUsername(userId: number, username: string | null): Promise<boolean> {
    return this.synchronized(async () => {
      if (!username) return false;
      const grants = await this.read();
      const normalized = normalizeUsername(username);
      const now = new Date();
      const index = grants.findIndex((grant) =>
        grant.enabled && grant.expiresAt > now && grant.username === normalized &&
        (grant.linkedUserId === null || grant.linkedUserId === userId));
      if (index < 0) return false;
      const grant = grants[index]!;
      if (grant.linkedUserId === null) {
        grants[index] = {
          ...grant,
          linkedUserId: userId,
          linkedUsername: normalized,
          updatedAt: now,
        };
        await this.write(grants);
      }
      return true;
    });
  }

  async authorizeByPhone(
    userId: number,
    username: string | null,
    rawPhone: string,
  ): Promise<boolean> {
    return this.synchronized(async () => {
      const grants = await this.read();
      const normalized = username ? normalizeUsername(username) : null;
      const phone = normalizePhone(rawPhone);
      const index = grants.findIndex((grant) =>
        grant.enabled && grant.expiresAt > new Date() &&
        grant.phone === phone &&
        (normalized === null || grant.username === null || grant.username === normalized) &&
        (grant.linkedUserId === null || grant.linkedUserId === userId));
      if (index < 0) return false;
      const grant = grants[index]!;
      grants[index] = {
        ...grant,
        linkedUserId: userId,
        linkedUsername: normalized,
        updatedAt: new Date(),
      };
      await this.write(grants);
      return true;
    });
  }
}
