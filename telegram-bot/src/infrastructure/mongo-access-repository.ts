import { Schema, Types, model } from "mongoose";
import {
  Guard,
  GuardError,
  normalizePhone,
  normalizeUsername,
  type AccessGrant,
} from "@domain";
import type { AccessRepository } from "@ports";

interface AccessGrantDoc {
  _id: Types.ObjectId;
  /** Kept for compatibility with the previous unique Mongo index. */
  type: string;
  value: string;
  username: string;
  phone: string;
  enabled: boolean;
  linkedUserId: number | null;
  linkedUsername: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const AccessGrantSchema = new Schema<AccessGrantDoc>(
  {
    type: { type: String, required: true },
    value: { type: String, required: true },
    username: { type: String, required: true },
    phone: { type: String, required: true },
    enabled: { type: Boolean, default: true, index: true },
    linkedUserId: { type: Number, default: null, index: true },
    linkedUsername: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

AccessGrantSchema.index({ type: 1, value: 1 }, { unique: true });
AccessGrantSchema.index({ username: 1 }, { unique: true, sparse: true });
AccessGrantSchema.index({ phone: 1 }, { unique: true, sparse: true });

const AccessGrantModel = model<AccessGrantDoc>("AccessGrant", AccessGrantSchema);

const toDomain = (doc: AccessGrantDoc): AccessGrant => ({
  id: doc._id.toString(),
  username: doc.username,
  phone: doc.phone,
  enabled: doc.enabled,
  linkedUserId: doc.linkedUserId ?? null,
  linkedUsername: doc.linkedUsername ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const validateUsername = (rawValue: string): string => {
  const value = normalizeUsername(rawValue);
  Guard.againstInvalidPattern(value, /^[a-z0-9_]{5,32}$/, "username");
  return value;
};

const validatePhone = (rawValue: string): string => {
  const value = normalizePhone(rawValue);
  Guard.againstInvalidPattern(value, /^\d{7,15}$/, "telefon raqami");
  return value;
};

const objectId = (id: string): Types.ObjectId | null =>
  Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;

export class MongoAccessRepository implements AccessRepository {
  async list(): Promise<AccessGrant[]> {
    const docs = await AccessGrantModel.find({ type: "pair" })
      .sort({ createdAt: -1 })
      .lean<AccessGrantDoc[]>()
      .exec();
    return docs.map(toDomain);
  }

  async add(rawUsername: string, rawPhone: string): Promise<AccessGrant> {
    const username = validateUsername(rawUsername);
    const phone = validatePhone(rawPhone);
    const existing = await AccessGrantModel.findOne({
      type: "pair",
      $or: [{ username }, { phone }],
    }).exec();

    if (existing) {
      if (existing.username !== username || existing.phone !== phone) {
        throw new GuardError(
          "Bu username yoki telefon boshqa foydalanuvchiga biriktirilgan",
        );
      }
      existing.enabled = true;
      await existing.save();
      return toDomain(existing.toObject());
    }

    const doc = await AccessGrantModel.create({
      type: "pair",
      value: `${username}:${phone}`,
      username,
      phone,
    });
    return toDomain(doc.toObject());
  }

  async setEnabled(id: string, enabled: boolean): Promise<AccessGrant | null> {
    const _id = objectId(id);
    if (!_id) return null;
    const doc = await AccessGrantModel.findByIdAndUpdate(
      _id,
      { $set: { enabled } },
      { returnDocument: "after" },
    )
      .lean<AccessGrantDoc>()
      .exec();
    return doc ? toDomain(doc) : null;
  }

  async remove(id: string): Promise<AccessGrant | null> {
    const _id = objectId(id);
    if (!_id) return null;
    const doc = await AccessGrantModel.findByIdAndDelete(_id)
      .lean<AccessGrantDoc>()
      .exec();
    return doc ? toDomain(doc) : null;
  }

  async isAuthorized(userId: number, username: string | null): Promise<boolean> {
    if (!username) return false;
    return (await AccessGrantModel.exists({
      type: "pair",
      enabled: true,
      linkedUserId: userId,
      username: normalizeUsername(username),
    })) !== null;
  }

  async authorizeByUsername(
    userId: number,
    username: string | null,
  ): Promise<boolean> {
    return this.isAuthorized(userId, username);
  }

  async authorizeByPhone(
    userId: number,
    username: string | null,
    rawPhone: string,
  ): Promise<boolean> {
    const phone = normalizePhone(rawPhone);
    if (!username || !/^\d{7,15}$/.test(phone)) return false;
    const linkedUsername = normalizeUsername(username);
    const doc = await AccessGrantModel.findOneAndUpdate(
      {
        type: "pair",
        enabled: true,
        username: linkedUsername,
        phone,
        $or: [{ linkedUserId: null }, { linkedUserId: userId }],
      },
      { $set: { linkedUserId: userId, linkedUsername } },
      { returnDocument: "after" },
    ).exec();
    return doc !== null;
  }
}
