import { readFile } from "node:fs/promises";
import { Schema, model } from "mongoose";
import type { BotLanguage } from "@domain";

interface AccountLanguageDoc {
  readonly userId: number;
  readonly language: BotLanguage;
}

const AccountLanguageSchema = new Schema<AccountLanguageDoc>({
  userId: { type: Number, required: true, unique: true, index: true },
  language: { type: String, enum: ["uz", "ru", "en"], required: true },
}, { timestamps: true, versionKey: false });

const AccountLanguageModel = model<AccountLanguageDoc>(
  "AccountLanguage",
  AccountLanguageSchema,
);

const isBotLanguage = (value: unknown): value is BotLanguage =>
  value === "uz" || value === "ru" || value === "en";

export class AccountLanguageStore {
  private constructor(private readonly languages: Map<number, BotLanguage>) {}

  static async load(legacyFile?: string): Promise<AccountLanguageStore> {
    if (legacyFile) {
      try {
        const parsed = JSON.parse(await readFile(legacyFile, "utf8")) as {
          languages?: Record<string, unknown>;
        };
        for (const [rawUserId, language] of Object.entries(parsed.languages ?? {})) {
          const userId = Number(rawUserId);
          if (Number.isSafeInteger(userId) && isBotLanguage(language)) {
            await AccountLanguageModel.updateOne(
              { userId },
              { $setOnInsert: { userId, language } },
              { upsert: true },
            ).exec();
          }
        }
      } catch {
        // Legacy file is optional; MongoDB remains the source of truth.
      }
    }

    const documents = await AccountLanguageModel.find().lean<AccountLanguageDoc[]>().exec();
    return new AccountLanguageStore(new Map(
      documents.map((document) => [document.userId, document.language]),
    ));
  }

  get(userId: number | undefined, fallback: BotLanguage): BotLanguage {
    return (userId === undefined ? undefined : this.languages.get(userId)) ?? fallback;
  }

  async set(userId: number, language: BotLanguage): Promise<void> {
    await AccountLanguageModel.updateOne(
      { userId },
      { $set: { language }, $setOnInsert: { userId } },
      { upsert: true },
    ).exec();
    this.languages.set(userId, language);
  }
}
