import type { ManagedChat } from "@domain";

export interface ChatRepository {
  /** Records the group, or reactivates it if the bot was re-added. */
  upsert(chat: ManagedChat): Promise<void>;
  deactivate(chatId: number): Promise<void>;
  listActiveByOwner(ownerId: number): Promise<ManagedChat[]>;
  countActiveByOwner(ownerId: number): Promise<number>;
}
