import { BROADCAST_THROTTLE_MS } from "../constants";
import {
  emptyBroadcastResult,
  withFailure,
  withSuccess,
  type BroadcastResult,
} from "../domain/broadcast-result";
import { NoMessageError } from "../domain/errors";
import type { Subscriber } from "../domain/subscriber";
import type { Broadcaster } from "../ports/broadcaster";
import type { ChatRepository } from "../ports/chat-repository";
import type { Logger } from "../ports/logger";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class BroadcastForSubscriberUseCase {
  constructor(
    private readonly chats: ChatRepository,
    private readonly broadcaster: Broadcaster,
    private readonly logger: Logger,
  ) {}

  async execute(subscriber: Subscriber): Promise<BroadcastResult> {
    const text = subscriber.message;
    if (text === null) throw new NoMessageError();

    const targets = await this.chats.listActiveByOwner(subscriber.userId);
    let result = emptyBroadcastResult();

    for (const [index, chat] of targets.entries()) {
      const outcome = await this.broadcaster.send(chat.chatId, text);

      if (outcome.ok) {
        result = withSuccess(result);
      } else {
        result = withFailure(result, {
          group: chat.title,
          reason: outcome.reason ?? "noma'lum xato",
        });
        if (outcome.permanentFailure) {
          await this.chats.deactivate(chat.chatId);
          this.logger.info(`Guruh o'chirildi (bot chiqarilgan): ${chat.title}`);
        }
      }

      const isLast = index === targets.length - 1;
      if (!isLast) await sleep(BROADCAST_THROTTLE_MS);
    }

    return result;
  }
}
