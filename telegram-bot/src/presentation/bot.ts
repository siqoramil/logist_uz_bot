import { Bot, InlineKeyboard, Keyboard, type Context } from "grammy";
import { GuardError, type Subscriber } from "@domain";
import type {
  AccessRepository,
  ChatRepository,
  Logger,
  SubscriberRepository,
} from "@ports";
import type {
  BroadcastForSubscriberUseCase,
  ManageSubscriberUseCase,
  TrackChatUseCase,
} from "@use-cases";
import * as texts from "./texts";

const INTERVAL_CHOICES = [15, 30, 60, 120, 240, 480] as const;

const HTML = { parse_mode: "HTML" } as const;

const mainMenu = (subscriber: Subscriber): InlineKeyboard =>
  new InlineKeyboard()
    .text("📝 Xabar", "set-message")
    .text("⏱ Interval", "set-interval")
    .row()
    .text("📋 Guruhlar", "groups")
    .text("📤 Hozir yuborish", "send-now")
    .row()
    .text(
      subscriber.active ? "⏹ To'xtatish" : "▶️ Boshlash",
      subscriber.active ? "stop" : "start",
    )
    .row()
    .text("🔄 Yangilash", "refresh");

const backMenu = new InlineKeyboard().text("⬅️ Orqaga", "refresh");

const intervalMenu = (): InlineKeyboard => {
  const keyboard = new InlineKeyboard();
  INTERVAL_CHOICES.forEach((minutes, index) => {
    keyboard.text(`${minutes} daq`, `interval:${minutes}`);
    if (index % 3 === 2) keyboard.row();
  });
  return keyboard.row().text("⬅️ Orqaga", "refresh");
};

export interface BotDependencies {
  readonly access: AccessRepository;
  readonly subscribers: SubscriberRepository;
  readonly chats: ChatRepository;
  readonly manage: ManageSubscriberUseCase;
  readonly broadcast: BroadcastForSubscriberUseCase;
  readonly trackChat: TrackChatUseCase;
  readonly logger: Logger;
  readonly payment: texts.PaymentDetails;
}

/**
 * Wires all handlers onto an existing bot. The bot is created by the caller so
 * that the broadcaster can be built from the same API client without a cycle.
 */
export const registerHandlers = (bot: Bot, deps: BotDependencies): void => {
  const { access, subscribers, chats, manage, broadcast, trackChat, logger, payment } = deps;

  const contactKeyboard = new Keyboard()
    .requestContact("📱 Telefon raqamimni yuborish")
    .resized()
    .oneTime();

  const showAccessDenied = async (ctx: Context): Promise<void> => {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: texts.ACCESS_REVOKED, show_alert: true })
        .catch(() => undefined);
    }
    await ctx.reply(texts.accessDenied(payment), {
      ...HTML,
      reply_markup: contactKeyboard,
    });
  };

  const requireSubscriber = async (ctx: Context): Promise<Subscriber | null> => {
    const from = ctx.from;
    if (!from) return null;
    const authorized = await access.authorizeByUsername(from.id, from.username ?? null);
    if (!authorized) {
      await showAccessDenied(ctx);
      return null;
    }
    return manage.register(from.id, from.username ?? null);
  };

  const showMenu = async (ctx: Context, subscriber: Subscriber): Promise<void> => {
    const chatCount = await chats.countActiveByOwner(subscriber.userId);
    const text = texts.statusCard(subscriber, chatCount);
    const options = { ...HTML, reply_markup: mainMenu(subscriber) };

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, options).catch(() => ctx.reply(text, options));
      return;
    }
    await ctx.reply(text, options);
  };

  // ---- Guruhga qo'shilish / chiqarilish ----
  bot.on("my_chat_member", async (ctx) => {
    const { chat, from, new_chat_member: member } = ctx.myChatMember;
    if (chat.type !== "group" && chat.type !== "supergroup") return;

    const title = chat.title;
    const isIn = member.status === "member" || member.status === "administrator";

    if (isIn) {
      const authorized = await access.authorizeByUsername(from.id, from.username ?? null);
      if (!authorized) {
        await ctx.api
          .sendMessage(from.id, texts.accessDenied(payment), HTML)
          .catch(() => undefined);
        await ctx.api.leaveChat(chat.id).catch(() => undefined);
        return;
      }
      await manage.register(from.id, from.username ?? null);
      await trackChat.added(chat.id, from.id, title);
      await ctx.api
        .sendMessage(from.id, texts.GROUP_ADDED(title), HTML)
        .catch(() => undefined);
      return;
    }

    await trackChat.removed(chat.id, title);
    await ctx.api
      .sendMessage(from.id, texts.GROUP_REMOVED(title), HTML)
      .catch(() => undefined);
  });

  // ---- Buyruqlar ----
  bot.command("start", async (ctx) => {
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    await ctx.reply(texts.WELCOME, HTML);
    await showMenu(ctx, subscriber);
  });

  bot.command(["menu", "status"], async (ctx) => {
    const subscriber = await requireSubscriber(ctx);
    if (subscriber) await showMenu(ctx, subscriber);
  });

  bot.command("help", (ctx) => ctx.reply(texts.HELP, HTML));

  bot.on("message:contact", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    const from = ctx.from;
    const contact = ctx.message.contact;
    if (contact.user_id !== from.id) {
      await ctx.reply(texts.CONTACT_NOT_YOURS, { reply_markup: contactKeyboard });
      return;
    }

    if (!from.username) {
      await ctx.reply(texts.USERNAME_REQUIRED, { reply_markup: contactKeyboard });
      return;
    }

    const authorized = await access.authorizeByPhone(
      from.id,
      from.username ?? null,
      contact.phone_number,
    );
    if (!authorized) {
      await ctx.reply(texts.ACCESS_DETAILS_MISMATCH, {
        reply_markup: contactKeyboard,
      });
      return;
    }

    const subscriber = await manage.register(from.id, from.username ?? null);
    await ctx.reply(texts.ACCESS_GRANTED, { reply_markup: { remove_keyboard: true } });
    await showMenu(ctx, subscriber);
  });

  // ---- Tugmalar ----
  bot.callbackQuery("refresh", async (ctx) => {
    await ctx.answerCallbackQuery();
    const subscriber = await requireSubscriber(ctx);
    if (subscriber) await showMenu(ctx, subscriber);
  });

  bot.callbackQuery("set-message", async (ctx) => {
    await ctx.answerCallbackQuery();
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    await manage.setState(subscriber.userId, "awaiting-message");
    await ctx.editMessageText(texts.askMessage(subscriber.message), {
      ...HTML,
      reply_markup: backMenu,
    });
  });

  bot.callbackQuery("set-interval", async (ctx) => {
    await ctx.answerCallbackQuery();
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    await manage.setState(subscriber.userId, "awaiting-interval");
    await ctx.editMessageText(texts.askInterval(subscriber.intervalMinutes), {
      ...HTML,
      reply_markup: intervalMenu(),
    });
  });

  bot.callbackQuery(/^interval:(\d+)$/, async (ctx) => {
    const minutes = Number.parseInt(ctx.match[1] ?? "", 10);
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;

    const updated = await manage.setInterval(subscriber.userId, minutes);
    await ctx.answerCallbackQuery(texts.INTERVAL_SAVED(minutes));
    await showMenu(ctx, updated);
  });

  bot.callbackQuery("groups", async (ctx) => {
    await ctx.answerCallbackQuery();
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    const owned = await chats.listActiveByOwner(subscriber.userId);
    await ctx.editMessageText(texts.groupList(owned), {
      ...HTML,
      reply_markup: backMenu,
    });
  });

  bot.callbackQuery("start", async (ctx) => {
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;

    if (subscriber.message === null) {
      await ctx.answerCallbackQuery({ text: texts.NO_MESSAGE, show_alert: true });
      return;
    }
    if ((await chats.countActiveByOwner(subscriber.userId)) === 0) {
      await ctx.answerCallbackQuery({ text: texts.NO_GROUPS, show_alert: true });
      return;
    }

    const updated = await manage.start(subscriber);
    await ctx.answerCallbackQuery(texts.STARTED);
    await showMenu(ctx, updated);
  });

  bot.callbackQuery("stop", async (ctx) => {
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    const updated = await manage.stop(subscriber.userId);
    await ctx.answerCallbackQuery(texts.STOPPED);
    await showMenu(ctx, updated);
  });

  bot.callbackQuery("send-now", async (ctx) => {
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;

    if (subscriber.message === null) {
      await ctx.answerCallbackQuery({ text: texts.NO_MESSAGE, show_alert: true });
      return;
    }
    if ((await chats.countActiveByOwner(subscriber.userId)) === 0) {
      await ctx.answerCallbackQuery({ text: texts.NO_GROUPS, show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery("📤 Yuborilmoqda...");
    const result = await broadcast.execute(subscriber);
    await ctx.reply(texts.broadcastReport(result), HTML);

    const refreshed = await subscribers.find(subscriber.userId);
    if (refreshed) await showMenu(ctx, refreshed);
  });

  // ---- Matnli javoblar (xabar / interval kutilayotgan holat) ----
  bot.on("message:text", async (ctx) => {
    if (ctx.chat.type !== "private") return;

    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    const text = ctx.message.text;

    if (subscriber.state === "awaiting-message") {
      try {
        const updated = await manage.setMessage(subscriber.userId, text);
        await ctx.reply(texts.MESSAGE_SAVED);
        await showMenu(ctx, updated);
      } catch (error) {
        if (!(error instanceof GuardError)) throw error;
        await ctx.reply(`⚠️ ${error.message}`);
      }
      return;
    }

    if (subscriber.state === "awaiting-interval") {
      const minutes = Number.parseInt(text.trim(), 10);
      try {
        const updated = await manage.setInterval(subscriber.userId, minutes);
        await ctx.reply(texts.INTERVAL_SAVED(minutes));
        await showMenu(ctx, updated);
      } catch (error) {
        if (!(error instanceof GuardError)) throw error;
        await ctx.reply(texts.INVALID_INTERVAL);
      }
      return;
    }

    await showMenu(ctx, subscriber);
  });

  bot.catch((err) => logger.error("Bot xatosi", err.error));
};
