import { Bot, InlineKeyboard, Keyboard, type Context } from "grammy";
import { GuardError, type BotLanguage, type Subscriber } from "@domain";
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
import { detectLanguage, getTexts, type BotTexts, type PaymentDetails } from "./texts";

const INTERVAL_CHOICES = [15, 30, 60, 120, 240, 480] as const;
const HTML = { parse_mode: "HTML" } as const;

const mainMenu = (subscriber: Subscriber, t: BotTexts): InlineKeyboard =>
  new InlineKeyboard()
    .text(t.buttons.message, "set-message")
    .text(t.buttons.interval, "set-interval")
    .row()
    .text(t.buttons.groups, "groups")
    .text(t.buttons.sendNow, "send-now")
    .row()
    .text(
      subscriber.active ? t.buttons.stop : t.buttons.start,
      subscriber.active ? "stop" : "start",
    )
    .row()
    .text(t.buttons.language, "language")
    .text(t.buttons.refresh, "refresh");

const backMenu = (t: BotTexts): InlineKeyboard =>
  new InlineKeyboard().text(t.buttons.back, "refresh");

const intervalMenu = (t: BotTexts): InlineKeyboard => {
  const keyboard = new InlineKeyboard();
  INTERVAL_CHOICES.forEach((minutes, index) => {
    keyboard.text(`${minutes} ${t.minuteShort}`, `interval:${minutes}`);
    if (index % 3 === 2) keyboard.row();
  });
  return keyboard.row().text(t.buttons.back, "refresh");
};

const languageMenu = (): InlineKeyboard =>
  new InlineKeyboard()
    .text("🇺🇿 O‘zbekcha", "language:uz")
    .row()
    .text("🇷🇺 Русский", "language:ru")
    .row()
    .text("🇬🇧 English", "language:en");

const contactKeyboard = (t: BotTexts): Keyboard =>
  new Keyboard().requestContact(t.buttons.contact).resized().oneTime();

export interface BotDependencies {
  readonly access: AccessRepository;
  readonly subscribers: SubscriberRepository;
  readonly chats: ChatRepository;
  readonly manage: ManageSubscriberUseCase;
  readonly broadcast: BroadcastForSubscriberUseCase;
  readonly trackChat: TrackChatUseCase;
  readonly logger: Logger;
  readonly payment: PaymentDetails;
}

export const registerHandlers = (bot: Bot, deps: BotDependencies): void => {
  const { access, subscribers, chats, manage, broadcast, trackChat, logger, payment } = deps;

  const contextLanguage = async (ctx: Context): Promise<BotLanguage> => {
    const from = ctx.from;
    if (!from) return "uz";
    try {
      const subscriber = await subscribers.find(from.id);
      return subscriber?.language ?? detectLanguage(from.language_code);
    } catch {
      return detectLanguage(from.language_code);
    }
  };

  const showAccessDenied = async (
    ctx: Context,
    language: BotLanguage,
  ): Promise<void> => {
    const t = getTexts(language);
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: t.accessRevoked, show_alert: true })
        .catch(() => undefined);
    }
    await ctx.reply(t.accessDenied(payment), {
      ...HTML,
      reply_markup: contactKeyboard(t),
    });
  };

  const requireSubscriber = async (ctx: Context): Promise<Subscriber | null> => {
    const from = ctx.from;
    if (!from) return null;
    const language = await contextLanguage(ctx);
    const authorized = await access.authorizeByUsername(from.id, from.username ?? null);
    if (!authorized) {
      await showAccessDenied(ctx, language);
      return null;
    }
    return manage.register(from.id, from.username ?? null, language);
  };

  const showMenu = async (ctx: Context, subscriber: Subscriber): Promise<void> => {
    const t = getTexts(subscriber.language);
    const chatCount = await chats.countActiveByOwner(subscriber.userId);
    const text = t.statusCard(subscriber, chatCount);
    const options = { ...HTML, reply_markup: mainMenu(subscriber, t) };
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, options).catch(() => ctx.reply(text, options));
      return;
    }
    await ctx.reply(text, options);
  };

  const showLanguageMenu = async (ctx: Context): Promise<void> => {
    const t = getTexts(await contextLanguage(ctx));
    const options = { ...HTML, reply_markup: languageMenu() };
    if (ctx.callbackQuery) {
      await ctx.editMessageText(t.languageTitle, options).catch(() => ctx.reply(t.languageTitle, options));
      return;
    }
    await ctx.reply(t.languageTitle, options);
  };

  bot.on("my_chat_member", async (ctx) => {
    const { chat, from, new_chat_member: member } = ctx.myChatMember;
    if (chat.type !== "group" && chat.type !== "supergroup") return;
    const isIn = member.status === "member" || member.status === "administrator";

    if (isIn) {
      const language = await contextLanguage(ctx);
      const authorized = await access.authorizeByUsername(from.id, from.username ?? null);
      if (!authorized) {
        await ctx.api.sendMessage(from.id, getTexts(language).accessDenied(payment), HTML).catch(() => undefined);
        await ctx.api.leaveChat(chat.id).catch(() => undefined);
        return;
      }
      const subscriber = await manage.register(from.id, from.username ?? null, language);
      await trackChat.added(chat.id, from.id, chat.title);
      await ctx.api.sendMessage(from.id, getTexts(subscriber.language).groupAdded(chat.title), HTML).catch(() => undefined);
      return;
    }

    await trackChat.removed(chat.id, chat.title);
    const language = await contextLanguage(ctx);
    await ctx.api.sendMessage(from.id, getTexts(language).groupRemoved(chat.title), HTML).catch(() => undefined);
  });

  bot.command("start", async (ctx) => {
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    await ctx.reply(getTexts(subscriber.language).welcome, HTML);
    await showMenu(ctx, subscriber);
  });

  bot.command(["menu", "status"], async (ctx) => {
    const subscriber = await requireSubscriber(ctx);
    if (subscriber) await showMenu(ctx, subscriber);
  });

  bot.command("help", async (ctx) => {
    const t = getTexts(await contextLanguage(ctx));
    await ctx.reply(t.help, HTML);
  });

  bot.command("language", showLanguageMenu);

  bot.on("message:contact", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    const from = ctx.from;
    const contact = ctx.message.contact;
    const language = await contextLanguage(ctx);
    const t = getTexts(language);
    if (contact.user_id !== from.id) {
      await ctx.reply(t.contactNotYours, { reply_markup: contactKeyboard(t) });
      return;
    }
    if (!from.username) {
      await ctx.reply(t.usernameRequired, { reply_markup: contactKeyboard(t) });
      return;
    }
    const authorized = await access.authorizeByPhone(from.id, from.username, contact.phone_number);
    if (!authorized) {
      await ctx.reply(t.accessDetailsMismatch, { reply_markup: contactKeyboard(t) });
      return;
    }
    const subscriber = await manage.register(from.id, from.username, language);
    await ctx.reply(getTexts(subscriber.language).accessGranted, { reply_markup: { remove_keyboard: true } });
    await showMenu(ctx, subscriber);
  });

  bot.callbackQuery("language", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showLanguageMenu(ctx);
  });

  bot.callbackQuery(/^language:(uz|ru|en)$/, async (ctx) => {
    const from = ctx.from;
    const language = ctx.match[1] as BotLanguage;
    const preferred = detectLanguage(from.language_code);
    const subscriber = await manage.register(from.id, from.username ?? null, preferred);
    const updated = await manage.setLanguage(subscriber.userId, language);
    const t = getTexts(language);
    await ctx.answerCallbackQuery(t.languageChanged);
    const authorized = await access.authorizeByUsername(from.id, from.username ?? null);
    if (authorized) {
      await showMenu(ctx, updated);
    } else {
      await ctx.editMessageText(t.languageChanged).catch(() => undefined);
      await showAccessDenied(ctx, language);
    }
  });

  bot.callbackQuery("refresh", async (ctx) => {
    await ctx.answerCallbackQuery();
    const subscriber = await requireSubscriber(ctx);
    if (subscriber) await showMenu(ctx, subscriber);
  });

  bot.callbackQuery("set-message", async (ctx) => {
    await ctx.answerCallbackQuery();
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    const updated = await manage.setState(subscriber.userId, "awaiting-message");
    const t = getTexts(updated.language);
    await ctx.editMessageText(t.askMessage(updated.message), { ...HTML, reply_markup: backMenu(t) });
  });

  bot.callbackQuery("set-interval", async (ctx) => {
    await ctx.answerCallbackQuery();
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    const updated = await manage.setState(subscriber.userId, "awaiting-interval");
    const t = getTexts(updated.language);
    await ctx.editMessageText(t.askInterval(updated.intervalMinutes), { ...HTML, reply_markup: intervalMenu(t) });
  });

  bot.callbackQuery(/^interval:(\d+)$/, async (ctx) => {
    const minutes = Number.parseInt(ctx.match[1] ?? "", 10);
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    const updated = await manage.setInterval(subscriber.userId, minutes);
    await ctx.answerCallbackQuery(getTexts(updated.language).intervalSaved(minutes));
    await showMenu(ctx, updated);
  });

  bot.callbackQuery("groups", async (ctx) => {
    await ctx.answerCallbackQuery();
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    const t = getTexts(subscriber.language);
    const owned = await chats.listActiveByOwner(subscriber.userId);
    await ctx.editMessageText(t.groupList(owned), { ...HTML, reply_markup: backMenu(t) });
  });

  bot.callbackQuery("start", async (ctx) => {
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    const t = getTexts(subscriber.language);
    if (subscriber.message === null) {
      await ctx.answerCallbackQuery({ text: t.noMessage, show_alert: true });
      return;
    }
    if ((await chats.countActiveByOwner(subscriber.userId)) === 0) {
      await ctx.answerCallbackQuery({ text: t.noGroups, show_alert: true });
      return;
    }
    const updated = await manage.start(subscriber);
    await ctx.answerCallbackQuery(t.sending);
    const result = await broadcast.execute(updated);
    await ctx.reply(t.broadcastReport(result), HTML);
    await showMenu(ctx, updated);
  });

  bot.callbackQuery("stop", async (ctx) => {
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    const updated = await manage.stop(subscriber.userId);
    await ctx.answerCallbackQuery(getTexts(updated.language).stopped);
    await showMenu(ctx, updated);
  });

  bot.callbackQuery("send-now", async (ctx) => {
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    const t = getTexts(subscriber.language);
    if (subscriber.message === null) {
      await ctx.answerCallbackQuery({ text: t.noMessage, show_alert: true });
      return;
    }
    if ((await chats.countActiveByOwner(subscriber.userId)) === 0) {
      await ctx.answerCallbackQuery({ text: t.noGroups, show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery(t.sending);
    const result = await broadcast.execute(subscriber);
    await ctx.reply(t.broadcastReport(result), HTML);
    const refreshed = await subscribers.find(subscriber.userId);
    if (refreshed) await showMenu(ctx, refreshed);
  });

  bot.on("message:text", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    const subscriber = await requireSubscriber(ctx);
    if (!subscriber) return;
    const t = getTexts(subscriber.language);
    const text = ctx.message.text;

    if (subscriber.state === "awaiting-message") {
      try {
        const updated = await manage.setMessage(subscriber.userId, text);
        await ctx.reply(t.messageSaved);
        await showMenu(ctx, updated);
      } catch (error) {
        if (!(error instanceof GuardError)) throw error;
        await ctx.reply(t.invalidMessage);
      }
      return;
    }
    if (subscriber.state === "awaiting-interval") {
      const minutes = Number.parseInt(text.trim(), 10);
      try {
        const updated = await manage.setInterval(subscriber.userId, minutes);
        await ctx.reply(t.intervalSaved(minutes));
        await showMenu(ctx, updated);
      } catch (error) {
        if (!(error instanceof GuardError)) throw error;
        await ctx.reply(t.invalidInterval);
      }
      return;
    }
    await showMenu(ctx, subscriber);
  });

  bot.catch(async (err) => {
    logger.error("Bot xatosi", err.error);
    const language = await contextLanguage(err.ctx);
    await err.ctx.reply(getTexts(language).serverError).catch(() => undefined);
  });
};
