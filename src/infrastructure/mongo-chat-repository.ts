import { Schema, model } from "mongoose";
import type { ManagedChat } from "../domain/managed-chat";
import type { ChatRepository } from "../ports/chat-repository";

const ChatSchema = new Schema<ManagedChat>(
  {
    chatId: { type: Number, required: true, unique: true, index: true },
    ownerId: { type: Number, required: true, index: true },
    title: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

const ChatModel = model<ManagedChat>("ManagedChat", ChatSchema);

export class MongoChatRepository implements ChatRepository {
  async upsert(chat: ManagedChat): Promise<void> {
    await ChatModel.findOneAndUpdate({ chatId: chat.chatId }, { $set: chat }, {
      upsert: true,
    }).exec();
  }

  async deactivate(chatId: number): Promise<void> {
    await ChatModel.updateOne({ chatId }, { $set: { active: false } }).exec();
  }

  async listActiveByOwner(ownerId: number): Promise<ManagedChat[]> {
    return ChatModel.find({ ownerId, active: true }).lean<ManagedChat[]>().exec();
  }

  countActiveByOwner(ownerId: number): Promise<number> {
    return ChatModel.countDocuments({ ownerId, active: true }).exec();
  }
}
