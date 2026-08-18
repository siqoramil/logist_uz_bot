import { GrammyError, type Bot } from "grammy";
import type { Broadcaster, SendOutcome } from "@ports";

/** Telegram error codes that mean "never retry this chat". */
const PERMANENT_DESCRIPTIONS = [
  "bot was kicked",
  "bot is not a member",
  "chat not found",
  "group chat was upgraded",
  "have no rights to send",
  "not enough rights",
  "chat_write_forbidden",
];

const isPermanent = (error: GrammyError): boolean => {
  if (error.error_code === 403) return true;
  const description = error.description.toLowerCase();
  return PERMANENT_DESCRIPTIONS.some((needle) => description.includes(needle));
};

export class GrammyBroadcaster implements Broadcaster {
  constructor(private readonly bot: Bot) {}

  async send(chatId: number, text: string): Promise<SendOutcome> {
    try {
      await this.bot.api.sendMessage(chatId, text);
      return { ok: true, permanentFailure: false, reason: null };
    } catch (error) {
      if (error instanceof GrammyError) {
        return {
          ok: false,
          permanentFailure: isPermanent(error),
          reason: error.description,
        };
      }
      return {
        ok: false,
        permanentFailure: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
