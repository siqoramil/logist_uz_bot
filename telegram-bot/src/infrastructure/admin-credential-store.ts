import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Schema, model } from "mongoose";

interface AdminCredentialDoc {
  readonly key: "primary";
  username: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminCredentialModel = model<AdminCredentialDoc>("AdminCredential", new Schema({
  key: { type: String, required: true, unique: true, immutable: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
}, { timestamps: true, versionKey: false }));

const hashPassword = (password: string, salt: string): string =>
  scryptSync(password, salt, 64).toString("hex");

const passwordFields = (password: string): Pick<AdminCredentialDoc, "passwordHash" | "passwordSalt"> => {
  const passwordSalt = randomBytes(16).toString("hex");
  return { passwordSalt, passwordHash: hashPassword(password, passwordSalt) };
};

const sameHash = (leftHex: string, rightHex: string): boolean => {
  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
};

export interface AdminSession {
  readonly username: string;
}

export class AdminCredentialStore {
  static async initialize(username: string, password: string): Promise<AdminCredentialStore> {
    await AdminCredentialModel.updateOne(
      { key: "primary" },
      {
        $setOnInsert: {
          key: "primary",
          username,
          ...passwordFields(password),
        },
      },
      { upsert: true },
    ).exec();
    return new AdminCredentialStore();
  }

  async authenticate(username: string, password: string): Promise<AdminSession | null> {
    const credential = await AdminCredentialModel.findOne({ key: "primary", username }).lean().exec();
    if (!credential) return null;
    const candidate = hashPassword(password, credential.passwordSalt);
    return sameHash(candidate, credential.passwordHash) ? { username: credential.username } : null;
  }

  async update(username: string, password: string): Promise<AdminSession> {
    const credential = await AdminCredentialModel.findOneAndUpdate(
      { key: "primary" },
      { $set: { username, ...passwordFields(password) } },
      { returnDocument: "after" },
    ).lean().exec();
    if (!credential) throw new Error("Admin credential topilmadi");
    return { username: credential.username };
  }
}
