import { Schema, Types, model } from "mongoose";
import { ACCESS_MONTH_PRICE_UZS } from "@constants";
import {
  addAccessMonth,
  AccessInputError,
  normalizePhone,
  normalizeUsername,
  type AccessAnalytics,
  type AccessGrant,
} from "@domain";
import type { AccessRepository } from "@ports";

interface AccessGrantDoc {
  _id: Types.ObjectId;
  /** Kept for compatibility with the previous unique Mongo index. */
  type: string;
  value: string;
  fullName?: string;
  username?: string;
  phone: string;
  enabled: boolean;
  linkedUserId: number | null;
  linkedUsername: string | null;
  expiresAt?: Date;
  billingHistory?: Array<{ paidAt: Date; amount: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const BillingEventSchema = new Schema(
  {
    paidAt: { type: Date, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const AccessGrantSchema = new Schema<AccessGrantDoc>(
  {
    type: { type: String, required: true },
    value: { type: String, required: true },
    fullName: { type: String, required: false },
    username: { type: String, required: false },
    phone: { type: String, required: true },
    enabled: { type: Boolean, default: true, index: true },
    linkedUserId: { type: Number, default: null, index: true },
    linkedUsername: { type: String, default: null },
    expiresAt: { type: Date, index: true },
    billingHistory: { type: [BillingEventSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

AccessGrantSchema.index({ type: 1, value: 1 }, { unique: true });
AccessGrantSchema.index({ username: 1 }, { unique: true, sparse: true });
AccessGrantSchema.index({ phone: 1 }, { unique: true, sparse: true });

const AccessGrantModel = model<AccessGrantDoc>("AccessGrant", AccessGrantSchema);

interface DataMigrationDoc {
  readonly key: string;
  readonly completedAt: Date;
}

const DataMigrationModel = model<DataMigrationDoc>("DataMigration", new Schema({
  key: { type: String, required: true, unique: true },
  completedAt: { type: Date, required: true },
}, { versionKey: false }));

const toDomain = (doc: AccessGrantDoc): AccessGrant => ({
  id: doc._id.toString(),
  fullName: doc.fullName ?? null,
  username: doc.username ?? null,
  phone: doc.phone,
  enabled: doc.enabled,
  linkedUserId: doc.linkedUserId ?? null,
  linkedUsername: doc.linkedUsername ?? null,
  expiresAt: doc.expiresAt ?? addAccessMonth(doc.createdAt),
  billingHistory: (doc.billingHistory ?? []).map((payment) => ({
    paidAt: payment.paidAt,
    amount: payment.amount,
  })),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const validateUsername = (rawValue: string): string => {
  const value = normalizeUsername(rawValue);
  if (!/^[a-z0-9_]{5,32}$/.test(value)) {
    throw new AccessInputError(
      "invalid-username",
      "Telegram username 5–32 ta lotin harfi, raqam yoki pastki chiziqdan iborat bo'lishi kerak",
    );
  }
  return value;
};

const validatePhone = (rawValue: string): string => {
  const value = normalizePhone(rawValue);
  if (!/^998\d{9}$/.test(value)) {
    throw new AccessInputError(
      "invalid-phone",
      "Telefon raqami O'zbekiston formatida bo'lishi kerak: +998 99 123 11 22",
    );
  }
  return value;
};

const validateFullName = (rawValue: string): string => {
  const value = rawValue.trim().replace(/\s+/g, " ");
  if (value.length < 2 || value.length > 100) {
    throw new AccessInputError(
      "invalid-full-name",
      "Ism-familiya 2–100 ta belgidan iborat bo'lishi kerak",
    );
  }
  return value;
};

const objectId = (id: string): Types.ObjectId | null =>
  Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;

export class MongoAccessRepository implements AccessRepository {
  private migration: Promise<void> | null = null;

  private ensureLegacyFields(): Promise<void> {
    this.migration ??= (async () => {
      const legacyDocs = await AccessGrantModel.find({
        type: "pair",
        $or: [
          { expiresAt: { $exists: false } },
          { billingHistory: { $exists: false } },
          { billingHistory: { $size: 0 } },
        ],
      }).exec();

      for (const doc of legacyDocs) {
        const startedAt = doc.createdAt ?? new Date();
        if (!doc.expiresAt) doc.expiresAt = addAccessMonth(startedAt);
        if (!doc.billingHistory?.length) {
          doc.billingHistory = [{ paidAt: startedAt, amount: ACCESS_MONTH_PRICE_UZS }];
        }
        await doc.save();
      }
    })();
    return this.migration;
  }

  async importLegacy(grants: readonly AccessGrant[]): Promise<number> {
    const migrationKey = "file-access-to-mongo-v1";
    if (await DataMigrationModel.exists({ key: migrationKey })) return 0;
    let imported = 0;
    for (const grant of grants) {
      const existing = await AccessGrantModel.exists({
        type: "pair",
        $or: [{ username: grant.username }, { phone: grant.phone }],
      });
      if (existing) continue;
      try {
        await AccessGrantModel.create({
          ...(Types.ObjectId.isValid(grant.id) ? { _id: new Types.ObjectId(grant.id) } : {}),
          type: "pair",
          value: grant.username === null ? `phone:${grant.phone}` : `${grant.username}:${grant.phone}`,
          ...(grant.fullName === null ? {} : { fullName: grant.fullName }),
          ...(grant.username === null ? {} : { username: grant.username }),
          phone: grant.phone,
          enabled: grant.enabled,
          linkedUserId: grant.linkedUserId,
          linkedUsername: grant.linkedUsername,
          expiresAt: grant.expiresAt,
          billingHistory: grant.billingHistory.map((payment) => ({ ...payment })),
          createdAt: grant.createdAt,
          updatedAt: grant.updatedAt,
        });
        imported += 1;
      } catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: unknown }).code
          : undefined;
        if (code !== 11000) throw error;
      }
    }
    await DataMigrationModel.updateOne(
      { key: migrationKey },
      { $setOnInsert: { key: migrationKey, completedAt: new Date() } },
      { upsert: true },
    ).exec();
    return imported;
  }

  async list(): Promise<AccessGrant[]> {
    await this.ensureLegacyFields();
    await this.expireDue(new Date());
    const docs = await AccessGrantModel.find({ type: "pair" })
      .sort({ createdAt: -1 })
      .lean<AccessGrantDoc[]>()
      .exec();
    return docs.map(toDomain);
  }

  async add(rawUsername: string | null, rawPhone: string, rawFullName: string): Promise<AccessGrant> {
    await this.ensureLegacyFields();
    const fullName = validateFullName(rawFullName);
    const username = rawUsername === null || rawUsername.trim() === ""
      ? null
      : validateUsername(rawUsername);
    const phone = validatePhone(rawPhone);
    const now = new Date();
    const existing = await AccessGrantModel.findOne({
      type: "pair",
      $or: [
        { phone },
        ...(username === null ? [] : [{ username }]),
      ],
    }).exec();

    if (existing) {
      const existingUsername = existing.username ?? null;
      if (existingUsername !== username || existing.phone !== phone) {
        if (username !== null && existingUsername === username) {
          throw new AccessInputError(
            "username-in-use",
            "Bu username boshqa telefon raqamiga biriktirilgan",
          );
        }
        throw new AccessInputError(
          "phone-in-use",
          "Bu telefon raqami boshqa username'ga biriktirilgan",
        );
      }
      existing.enabled = true;
      existing.fullName = fullName;
      const periodStart = existing.expiresAt && existing.expiresAt > now
        ? existing.expiresAt
        : now;
      existing.expiresAt = addAccessMonth(periodStart);
      existing.billingHistory = [
        ...(existing.billingHistory ?? []),
        { paidAt: now, amount: ACCESS_MONTH_PRICE_UZS },
      ];
      await existing.save();
      return toDomain(existing.toObject());
    }

    const doc = await AccessGrantModel.create({
      type: "pair",
      value: username === null ? `phone:${phone}` : `${username}:${phone}`,
      fullName,
      ...(username === null ? {} : { username }),
      phone,
      enabled: true,
      expiresAt: addAccessMonth(now),
      billingHistory: [{ paidAt: now, amount: ACCESS_MONTH_PRICE_UZS }],
    });
    return toDomain(doc.toObject());
  }

  async setEnabled(id: string, enabled: boolean): Promise<AccessGrant | null> {
    await this.ensureLegacyFields();
    const _id = objectId(id);
    if (!_id) return null;
    const doc = await AccessGrantModel.findById(_id).exec();
    if (!doc) return null;
    doc.enabled = enabled;
    if (enabled && (!doc.expiresAt || doc.expiresAt <= new Date())) {
      const now = new Date();
      doc.expiresAt = addAccessMonth(now);
      doc.billingHistory = [
        ...(doc.billingHistory ?? []),
        { paidAt: now, amount: ACCESS_MONTH_PRICE_UZS },
      ];
    }
    await doc.save();
    return toDomain(doc.toObject());
  }

  async updateFullName(id: string, rawFullName: string): Promise<AccessGrant | null> {
    await this.ensureLegacyFields();
    const _id = objectId(id);
    if (!_id) return null;
    const doc = await AccessGrantModel.findByIdAndUpdate(
      _id,
      { $set: { fullName: validateFullName(rawFullName) } },
      { returnDocument: "after" },
    ).lean<AccessGrantDoc>().exec();
    return doc ? toDomain(doc) : null;
  }

  async expireDue(now: Date): Promise<AccessGrant[]> {
    await this.ensureLegacyFields();
    const docs = await AccessGrantModel.find({
      type: "pair",
      enabled: true,
      expiresAt: { $lte: now },
    })
      .lean<AccessGrantDoc[]>()
      .exec();
    if (docs.length === 0) return [];

    await AccessGrantModel.updateMany(
      { _id: { $in: docs.map((doc) => doc._id) }, enabled: true },
      { $set: { enabled: false } },
    ).exec();
    return docs.map((doc) => toDomain({ ...doc, enabled: false, updatedAt: now }));
  }

  async analytics(now: Date = new Date()): Promise<AccessAnalytics> {
    await this.ensureLegacyFields();
    const docs = await AccessGrantModel.find({ type: "pair" })
      .select({ enabled: 1, expiresAt: 1, billingHistory: 1, createdAt: 1 })
      .lean<AccessGrantDoc[]>()
      .exec();
    const payments = docs.flatMap((doc) => doc.billingHistory ?? []);
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
    const activeSubscriptions = docs.filter(
      (doc) => doc.enabled && (doc.expiresAt?.getTime() ?? 0) > now.getTime(),
    ).length;
    const soon = now.getTime() + 7 * 24 * 60 * 60 * 1_000;

    return {
      pricePerMonth: ACCESS_MONTH_PRICE_UZS,
      activeSubscriptions,
      expiringSoon: docs.filter((doc) => {
        const expires = doc.expiresAt?.getTime() ?? 0;
        return doc.enabled && expires > now.getTime() && expires <= soon;
      }).length,
      currentMonthRevenue: months.at(-1)?.revenue ?? 0,
      monthlyRecurringRevenue: activeSubscriptions * ACCESS_MONTH_PRICE_UZS,
      totalRevenue: payments.reduce((sum, payment) => sum + payment.amount, 0),
      totalPayments: payments.length,
      months,
    };
  }

  async remove(id: string): Promise<AccessGrant | null> {
    await this.ensureLegacyFields();
    const _id = objectId(id);
    if (!_id) return null;
    const doc = await AccessGrantModel.findByIdAndDelete(_id)
      .lean<AccessGrantDoc>()
      .exec();
    return doc ? toDomain(doc) : null;
  }

  async isAuthorized(userId: number, username: string | null): Promise<boolean> {
    await this.ensureLegacyFields();
    return (await AccessGrantModel.exists({
      type: "pair",
      enabled: true,
      expiresAt: { $gt: new Date() },
      linkedUserId: userId,
    })) !== null;
  }

  async authorizeByPhone(
    userId: number,
    username: string | null,
    rawPhone: string,
  ): Promise<boolean> {
    await this.ensureLegacyFields();
    const phone = normalizePhone(rawPhone);
    if (!/^\d{7,15}$/.test(phone)) return false;
    const linkedUsername = username ? normalizeUsername(username) : null;
    const doc = await AccessGrantModel.findOneAndUpdate(
      {
        type: "pair",
        enabled: true,
        expiresAt: { $gt: new Date() },
        phone,
        $or: [{ linkedUserId: null }, { linkedUserId: userId }],
      },
      { $set: { linkedUserId: userId, linkedUsername } },
      { returnDocument: "after" },
    ).exec();
    return doc !== null;
  }
}
