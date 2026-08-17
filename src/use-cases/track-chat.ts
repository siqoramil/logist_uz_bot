import type { ChatRepository } from "../ports/chat-repository";
import type { Logger } from "../ports/logger";

export class TrackChatUseCase {
  constructor(
    private readonly chats: ChatRepository,
    private readonly logger: Logger,
  ) {}

  async added(chatId: number, ownerId: number, title: string): Promise<void> {
    await this.chats.upsert({ chatId, ownerId, title, active: true });
    this.logger.info(`Guruh qo'shildi: ${title} (owner ${ownerId})`);
  }

  async removed(chatId: number, title: string): Promise<void> {
    await this.chats.deactivate(chatId);
    this.logger.info(`Guruh olib tashlandi: ${title}`);
  }
}
