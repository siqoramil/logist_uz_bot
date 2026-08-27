import { Bot, GrammyError } from "grammy";
import { resolve } from "node:path";
import { DomainError } from "@domain";
import {
  ConsoleLogger,
  AdminCredentialStore,
  FileAccessRepository,
  MongoAccessRepository,
  MongoSubscriberRepository,
  connectMongo,
  connectRedis,
  disconnectMongo,
  disconnectRedis,
  startAdminServer,
  startScheduler,
} from "@infrastructure";
import { ExpireAccessGrantsUseCase, ManageSubscriberUseCase } from "@use-cases";
import { AccountBroadcasterRegistry } from "./account/account-broadcaster-registry";
import { loadAccountConfig } from "./account/config";
import { registerAccountController } from "./account/controller";
import { AccountLanguageStore } from "./account/language-store";
import { RunDueAccountBroadcastsUseCase } from "./account/run-due-account-broadcasts";
import { broadcastReport, getTexts } from "@presentation";

async function bootstrap(): Promise<void> {
  const config = loadAccountConfig();
  const logger = new ConsoleLogger();
  await connectMongo(config.mongoUri);
  logger.success("MongoDB ulandi");
  const redis = await connectRedis(config.redisUrl, logger);
  logger.success("Redis ulandi");

  const broadcaster = new AccountBroadcasterRegistry({
    apiId: config.apiId,
    apiHash: config.apiHash,
    sessions: config.sessions,
    sendConcurrency: config.sendConcurrency,
    maxFloodWaitSeconds: config.maxFloodWaitSeconds,
    lockTtlMs: config.redisBroadcastLockTtlMs,
  }, redis, logger);
  logger.success(`${config.sessions.size} ta job account sessioni sozlangan`);
  const languageStore = await AccountLanguageStore.load(
    resolve(process.cwd(), ".data/account-settings.json"),
  );
  const adminAccess = new MongoAccessRepository();
  const adminSubscribers = new MongoSubscriberRepository();
  const manage = new ManageSubscriberUseCase(adminSubscribers);
  const adminCredentials = await AdminCredentialStore.initialize(
    config.adminUsername,
    config.adminPassword,
  );
  const legacyAccess = new FileAccessRepository(resolve(process.cwd(), ".data/admin-access.json"));
  const imported = await adminAccess.importLegacy(await legacyAccess.list());
  if (imported > 0) logger.success(`MongoDB'ga ${imported} ta lokal access ko'chirildi`);
  const stopAdminServer = startAdminServer({
    port: config.adminPort,
    credentials: adminCredentials,
    allowedOrigin: config.adminOrigin,
    access: adminAccess,
    subscribers: adminSubscribers,
    logger,
  });

  const bot = new Bot(config.botToken);
  registerAccountController(bot, {
    controllerUserId: config.controllerUserId,
    access: adminAccess,
    broadcaster,
    manage,
    broadcastIntervalMinutes: config.broadcastIntervalMinutes,
    languageStore,
    logger,
  });

  const expireAccess = new ExpireAccessGrantsUseCase(
    adminAccess,
    adminSubscribers,
    logger,
  );
  const runDue = new RunDueAccountBroadcastsUseCase(
    adminSubscribers,
    adminAccess,
    broadcaster,
    logger,
    async (subscriber, result) => {
      await bot.api.sendMessage(
        subscriber.userId,
        broadcastReport(result, subscriber.language),
        { parse_mode: "HTML" },
      ).catch(() => undefined);
    },
    async (subscriber) => {
      await bot.api.sendMessage(
        subscriber.userId,
        getTexts(subscriber.language).serverError,
      ).catch(() => undefined);
    },
    config.controllerUserId,
  );
  const schedulerController = new AbortController();
  startScheduler(async () => {
    await expireAccess.execute();
    await runDue.execute();
  }, logger, schedulerController.signal);

  const commandDescriptions = {
    uz: ["Boshqaruvni boshlash", "Guruhlar soni", "Tarqatishni to‘xtatish", "Tilni tanlash", "Yordam"],
    ru: ["Начать управление", "Количество групп", "Остановить рассылку", "Выбрать язык", "Помощь"],
    en: ["Start control", "Group count", "Stop broadcast", "Choose language", "Help"],
  } as const;
  const commands = (language: keyof typeof commandDescriptions) => {
    const [start, groups, cancel, languageDescription, help] = commandDescriptions[language];
    return [
      { command: "start", description: start },
      { command: "groups", description: groups },
      { command: "cancel", description: cancel },
      { command: "language", description: languageDescription },
      { command: "help", description: help },
    ];
  };
  await bot.api.setMyCommands(commands("ru"));
  await bot.api.setMyCommands(commands("uz"), { language_code: "uz" });
  await bot.api.setMyCommands(commands("ru"), { language_code: "ru" });
  await bot.api.setMyCommands(commands("en"), { language_code: "en" });

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    schedulerController.abort();
    await bot.stop().catch(() => undefined);
    await stopAdminServer().catch(() => undefined);
    await broadcaster.close().catch(() => undefined);
    await disconnectRedis(redis).catch(() => undefined);
    await disconnectMongo().catch(() => undefined);
    logger.info("To'xtatildi");
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  const me = await bot.api.getMe();
  logger.success(`Controller bot ishga tushdi: @${me.username}`);
  await bot.start({
    allowed_updates: ["message", "callback_query"],
    onStart: () => logger.info("Admin xabarlari qabul qilinmoqda..."),
  });
}

bootstrap().catch((error) => {
  if (error instanceof DomainError) {
    console.error(`\n${error.message}`);
  } else if (error instanceof GrammyError && error.error_code === 401) {
    console.error("\nBOT_TOKEN noto'g'ri.");
  } else {
    console.error("Fatal:", error);
  }
  process.exit(1);
});
