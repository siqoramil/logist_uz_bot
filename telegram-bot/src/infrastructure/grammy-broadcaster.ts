import type { Bot } from "grammy";
import type { Broadcaster, SendOutcome } from "@ports";
import { explainDeliveryError } from "./telegram-delivery-error";

export class GrammyBroadcaster implements Broadcaster {
  constructor(private readonly bot: Bot) {}

  async send(chatId: number, text: string): Promise<SendOutcome> {
    try {
      await this.bot.api.sendMessage(chatId, text);
      return { ok: true, permanentFailure: false, failure: null };
    } catch (error) {
      const failure = explainDeliveryError(error);
      return {
        ok: false,
        permanentFailure: failure.permanent,
        failure,
      };
    }
  }
}
