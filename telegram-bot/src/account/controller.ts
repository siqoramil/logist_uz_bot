import { Bot, InlineKeyboard, Keyboard, type Context } from "grammy";
import type { BotLanguage, Subscriber } from "@domain";
import type { AccessRepository, Logger } from "@ports";
import type { ManageSubscriberUseCase } from "@use-cases";
import { broadcastReport, deliveryErrorText } from "@presentation";
import type { AccountBroadcastResult } from "./account-broadcaster";
import type { AccountBroadcasterRegistry } from "./account-broadcaster-registry";
import { AccountLanguageStore } from "./language-store";
import { getAccountTexts, type AccountControllerTexts } from "./texts";

const HTML = { parse_mode: "HTML" } as const;

export interface AccountControllerOptions {
  readonly controllerUserId: number | null;
  readonly access: AccessRepository;
  readonly broadcaster: AccountBroadcasterRegistry;
  readonly manage: ManageSubscriberUseCase;
  readonly broadcastIntervalMinutes: number;
  readonly languageStore: AccountLanguageStore;
  readonly logger: Logger;
}

const languageMenu = (): InlineKeyboard =>
  new InlineKeyboard()
    .text("🇺🇿 O‘zbekcha", "language:uz")
    .row()
    .text("🇷🇺 Русский", "language:ru")
    .row()
    .text("🇬🇧 English", "language:en");

const mainMenu = (t: AccountControllerTexts): InlineKeyboard =>
  new InlineKeyboard()
    .text(t.menuGroups, "menu:groups")
    .text(t.menuLanguage, "language")
    .row()
    .text(t.menuHelp, "menu:help")
    .text(t.menuCancel, "menu:cancel");

const contactKeyboard = (t: AccountControllerTexts): Keyboard =>
  new Keyboard().requestContact(t.contactButton).resized().oneTime();

const reportMenu = (
  t: AccountControllerTexts,
  result: AccountBroadcastResult,
): InlineKeyboard =>
  new InlineKeyboard()
    .text(t.sentReportButton(result.sent), "report:sent")
    .text(t.failedReportButton(result.failed), "report:failed")
    .row()
    .text(t.menuGroups, "menu:groups")
    .text(t.menuHelp, "menu:help");

const reportChunks = (title: string, entries: readonly string[]): readonly string[] => {
  if (entries.length === 0) return [title];
  const chunks: string[] = [];
  let current = title;
  for (const entry of entries) {
    const next = `${current}\n${entry}`;
    if (next.length > 3_800) {
      chunks.push(current);
      current = `${title}\n${entry}`;
    } else {
      current = next;
    }
  }
  chunks.push(current);
  return chunks;
};

export const registerAccountController = (
  bot: Bot,
  options: AccountControllerOptions,
): void => {
  const {
    controllerUserId,
    access,
    broadcaster,
    manage,
    broadcastIntervalMinutes,
    languageStore,
    logger,
  } = options;
  const languageOf = (ctx: Context): BotLanguage =>
    languageStore.get(ctx.from?.id, "ru");

  const isAuthorized = async (ctx: Context): Promise<boolean> => {
    const from = ctx.from;
    if (!from) return false;
    if (controllerUserId !== null && from.id === controllerUserId) return true;
    return access.isAuthorized(from.id, from.username ?? null);
  };

  const showDenied = async (ctx: Context, answerCallback = true): Promise<void> => {
    const t = getAccountTexts(languageOf(ctx));
    if (ctx.callbackQuery && answerCallback) {
      await ctx.answerCallbackQuery({ text: t.denied, show_alert: true }).catch(() => undefined);
    }
    await ctx.reply(`${t.denied}\n\n${t.accessPrompt}`, {
      reply_markup: contactKeyboard(t),
    }).catch(() => undefined);
  };

  const allowed = async (ctx: Context): Promise<Subscriber | null> => {
    const from = ctx.from;
    if (!from || !(await isAuthorized(ctx))) {
      await showDenied(ctx);
      return null;
    }
    if (!broadcaster.hasAccount(from.id)) {
      await ctx.reply(getAccountTexts(languageOf(ctx)).accountNotConfigured);
      return null;
    }
    let subscriber = await manage.register(
      from.id,
      from.username ?? null,
      languageOf(ctx),
    );
    if (subscriber.intervalMinutes !== broadcastIntervalMinutes) {
      subscriber = await manage.setInterval(subscriber.userId, broadcastIntervalMinutes);
    }
    return subscriber;
  };

  bot.command("start", async (ctx) => {
    if (!(await allowed(ctx))) return;
    const t = getAccountTexts(languageOf(ctx));
    await ctx.reply(t.ready, { reply_markup: mainMenu(t) });
  });

  bot.on("message:contact", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    const from = ctx.from;
    const t = getAccountTexts(languageOf(ctx));
    const contact = ctx.message.contact;
    if (contact.user_id !== from.id) {
      await ctx.reply(t.contactNotYours, { reply_markup: contactKeyboard(t) });
      return;
    }
    const authorized = await access.authorizeByPhone(
      from.id,
      from.username ?? null,
      contact.phone_number,
    );
    if (!authorized) {
      await ctx.reply(t.accessDetailsMismatch, { reply_markup: contactKeyboard(t) });
      return;
    }
    if (!broadcaster.hasAccount(from.id)) {
      await ctx.reply(t.accountNotConfigured);
      return;
    }
    await manage.register(from.id, from.username ?? null, languageOf(ctx));
    await ctx.reply(t.accessGranted, { reply_markup: { remove_keyboard: true } });
    await ctx.reply(t.ready, { reply_markup: mainMenu(t) });
  });

  bot.command("help", async (ctx) => {
    if (!(await allowed(ctx))) return;
    const t = getAccountTexts(languageOf(ctx));
    await ctx.reply(t.help, { reply_markup: mainMenu(t) });
  });

  bot.command("language", async (ctx) => {
    const t = getAccountTexts(languageOf(ctx));
    await ctx.reply(t.languageTitle, { reply_markup: languageMenu() });
  });

  bot.callbackQuery("language", async (ctx) => {
    const t = getAccountTexts(languageOf(ctx));
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(t.languageTitle, { reply_markup: languageMenu() });
  });

  bot.callbackQuery(/^language:(uz|ru|en)$/, async (ctx) => {
    const language = ctx.match[1] as BotLanguage;
    await languageStore.set(ctx.from.id, language);
    const t = getAccountTexts(language);
    await ctx.answerCallbackQuery(t.languageChanged);
    if (await isAuthorized(ctx) && broadcaster.hasAccount(ctx.from.id)) {
      await manage.register(ctx.from.id, ctx.from.username ?? null, language);
      await manage.setLanguage(ctx.from.id, language);
      await ctx.editMessageText(t.languageChanged, { reply_markup: mainMenu(t) });
    } else {
      await ctx.editMessageText(t.languageChanged);
      await showDenied(ctx, false);
    }
  });

  bot.callbackQuery("menu:help", async (ctx) => {
    if (!(await allowed(ctx))) return;
    const t = getAccountTexts(languageOf(ctx));
    await ctx.answerCallbackQuery();
    await ctx.reply(t.help, { reply_markup: mainMenu(t) });
  });

  bot.callbackQuery("menu:cancel", async (ctx) => {
    const subscriber = await allowed(ctx);
    if (!subscriber) return;
    const t = getAccountTexts(languageOf(ctx));
    await ctx.answerCallbackQuery();
    const canceled = await broadcaster.cancel(subscriber.userId);
    await manage.stop(subscriber.userId);
    await ctx.reply(canceled ? t.cancelRequested : t.canceled, {
      reply_markup: mainMenu(t),
    });
  });

  bot.callbackQuery("menu:groups", async (ctx) => {
    const subscriber = await allowed(ctx);
    if (!subscriber) return;
    const t = getAccountTexts(languageOf(ctx));
    await ctx.answerCallbackQuery();
    const status = await ctx.reply(t.loadingGroups);
    const count = await broadcaster.countGroups(subscriber.userId);
    await ctx.api.editMessageText(status.chat.id, status.message_id, t.groups(count), {
      reply_markup: mainMenu(t),
    });
  });

  bot.callbackQuery("report:sent", async (ctx) => {
    const subscriber = await allowed(ctx);
    if (!subscriber) return;
    const t = getAccountTexts(languageOf(ctx));
    await ctx.answerCallbackQuery();
    const lastResult = await broadcaster.getLastResult(subscriber.userId);
    if (!lastResult) {
      await ctx.reply(t.noLastReport);
      return;
    }
    const entries = lastResult.deliveredGroups.map((group) => `✅ ${group}`);
    for (const chunk of reportChunks(t.sentGroupsTitle(entries.length), entries)) {
      await ctx.reply(chunk);
    }
  });

  bot.callbackQuery("report:failed", async (ctx) => {
    const subscriber = await allowed(ctx);
    if (!subscriber) return;
    const language = languageOf(ctx);
    const t = getAccountTexts(language);
    await ctx.answerCallbackQuery();
    const lastResult = await broadcaster.getLastResult(subscriber.userId);
    if (!lastResult) {
      await ctx.reply(t.noLastReport);
      return;
    }
    const entries = lastResult.failures.map((item) => {
      const error = deliveryErrorText(language, item.code);
      return `❌ ${item.group}\n↳ ${error.reason}`;
    });
    for (const chunk of reportChunks(t.failedGroupsTitle(entries.length), entries)) {
      await ctx.reply(chunk);
    }
  });

  bot.command("groups", async (ctx) => {
    const subscriber = await allowed(ctx);
    if (!subscriber) return;
    const t = getAccountTexts(languageOf(ctx));
    const status = await ctx.reply(t.loadingGroups);
    const count = await broadcaster.countGroups(subscriber.userId);
    await ctx.api.editMessageText(ctx.chat.id, status.message_id, t.groups(count), {
      reply_markup: mainMenu(t),
    });
  });

  bot.command("cancel", async (ctx) => {
    const subscriber = await allowed(ctx);
    if (!subscriber) return;
    const t = getAccountTexts(languageOf(ctx));
    const canceled = await broadcaster.cancel(subscriber.userId);
    await manage.stop(subscriber.userId);
    await ctx.reply(canceled ? t.cancelRequested : t.canceled);
  });

  bot.on("message:text", async (ctx) => {
    const subscriber = await allowed(ctx);
    if (!subscriber) return;
    const language = languageOf(ctx);
    const t = getAccountTexts(language);
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) {
      await ctx.reply(t.help);
      return;
    }
    if (text.length === 0) {
      await ctx.reply(t.onlyText);
      return;
    }
    if (await broadcaster.isRunning(subscriber.userId)) {
      await ctx.reply(t.alreadyRunning);
      return;
    }

    const status = await ctx.reply(t.loadingGroups);
    const groupCount = await broadcaster.countGroups(subscriber.userId);
    if (groupCount === 0) {
      await manage.stop(subscriber.userId);
      await ctx.api.editMessageText(ctx.chat.id, status.message_id, t.noGroups);
      return;
    }
    const withMessage = await manage.setMessage(subscriber.userId, text);
    await manage.start(withMessage);
    let lastProgressAt = 0;
    const result = await broadcaster.execute(subscriber.userId, text, async (progress) => {
      const now = Date.now();
      const shouldUpdate = progress.done === progress.total ||
        (progress.done % 10 === 0 && now - lastProgressAt >= 3_000);
      if (!shouldUpdate) return;
      lastProgressAt = now;
      await ctx.api.editMessageText(
        ctx.chat.id,
        status.message_id,
        t.progress(progress.done, progress.total, progress.sent, progress.failed),
      ).catch(() => undefined);
    });
    if (result.total === 0) {
      await manage.stop(subscriber.userId);
      await ctx.api.editMessageText(ctx.chat.id, status.message_id, t.noGroups);
      return;
    }
    if (result.canceled) {
      await manage.stop(subscriber.userId);
      await ctx.api.editMessageText(ctx.chat.id, status.message_id, t.canceled).catch(() => undefined);
    }
    const details = [
      broadcastReport(result, language),
      "",
      t.summary(result.total, result.skipped, result.durationSeconds),
      ...(result.canceled ? [] : ["", t.scheduled(broadcastIntervalMinutes)]),
    ].join("\n");
    await ctx.reply(details, { ...HTML, reply_markup: reportMenu(t, result) });
  });

  bot.on("message", async (ctx) => {
    if (!(await allowed(ctx))) return;
    await ctx.reply(getAccountTexts(languageOf(ctx)).onlyText);
  });

  bot.catch(async (error) => {
    logger.error("Controller bot xatosi", error.error);
    const t = getAccountTexts(languageOf(error.ctx));
    await error.ctx.reply(t.accountUnavailable).catch(() => undefined);
  });
};
