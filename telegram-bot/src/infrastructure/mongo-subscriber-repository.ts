import { Schema, model } from "mongoose";
import { DEFAULT_BROADCAST_INTERVAL_MINUTES } from "@constants";
import {
  SubscriberNotFoundError,
  type BotLanguage,
  type Subscriber,
} from "@domain";
import type { SubscriberPatch, SubscriberRepository } from "@ports";

interface SubscriberDoc {
  userId: number;
  username: string | null;
  language: BotLanguage;
  message: string | null;
  intervalMinutes: number;
  active: boolean;
  state: Subscriber["state"];
  nextRunAt: Date | null;
  lastRunAt: Date | null;
}

const SubscriberSchema = new Schema<SubscriberDoc>(
  {
    userId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, default: null },
    language: { type: String, enum: ["uz", "ru", "en"], default: "uz" },
    message: { type: String, default: null },
    intervalMinutes: { type: Number, default: DEFAULT_BROADCAST_INTERVAL_MINUTES },
    active: { type: Boolean, default: false },
    state: { type: String, default: "idle" },
    nextRunAt: { type: Date, default: null, index: true },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

const SubscriberModel = model<SubscriberDoc>("Subscriber", SubscriberSchema);

const toDomain = (doc: SubscriberDoc): Subscriber => ({
  userId: doc.userId,
  username: doc.username ?? null,
  language: doc.language ?? "uz",
  message: doc.message ?? null,
  intervalMinutes: doc.intervalMinutes,
  active: doc.active,
  state: doc.state,
  nextRunAt: doc.nextRunAt ?? null,
  lastRunAt: doc.lastRunAt ?? null,
});

export class MongoSubscriberRepository implements SubscriberRepository {
  async find(userId: number): Promise<Subscriber | null> {
    const doc = await SubscriberModel.findOne({ userId }).lean<SubscriberDoc>().exec();
    return doc ? toDomain(doc) : null;
  }

  async ensure(
    userId: number,
    username: string | null,
    preferredLanguage: BotLanguage,
  ): Promise<Subscriber> {
    const doc = await SubscriberModel.findOneAndUpdate(
      { userId },
      {
        $set: { username, intervalMinutes: DEFAULT_BROADCAST_INTERVAL_MINUTES },
        $setOnInsert: { userId, language: preferredLanguage },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    )
      .lean<SubscriberDoc>()
      .exec();
    return toDomain(doc);
  }

  async update(userId: number, patch: SubscriberPatch): Promise<Subscriber> {
    const doc = await SubscriberModel.findOneAndUpdate(
      { userId },
      { $set: patch },
      { returnDocument: "after" },
    )
      .lean<SubscriberDoc>()
      .exec();
    if (!doc) throw new SubscriberNotFoundError(userId);
    return toDomain(doc);
  }

  async findDue(now: Date): Promise<Subscriber[]> {
    const docs = await SubscriberModel.find({
      active: true,
      nextRunAt: { $ne: null, $lte: now },
    })
      .lean<SubscriberDoc[]>()
      .exec();
    return docs.map(toDomain);
  }

  countAll(): Promise<number> {
    return SubscriberModel.countDocuments().exec();
  }
}
