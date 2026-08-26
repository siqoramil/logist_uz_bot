import { Bot, GrammyError } from "grammy";
import { resolve } from "node:path";
import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";
import { ConfigurationError, DomainError } from "@domain";
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
} from "@infrastructure";
import { TelegramAccountBroadcaster } from "./account/account-broadcaster";
import { loadAccountConfig } from "./account/config";
import { registerAccountController } from "./account/controller";
import { AccountLanguageStore } from "./account/language-store";
import { RedisBroadcastState } from "./account/redis-broadcast-state";

async function bootstrap(): Promise<void> {
  const config = loadAccountConfig();
  const logger = new ConsoleLogger();
  await connectMongo(config.mongoUri);
  logger.success("MongoDB ulandi");
  const redis = await connectRedis(config.redisUrl, logger);
  logger.success("Redis ulandi");

  const accountClient = new TelegramClient(
    new StringSession(config.session),
    config.apiId,
    config.apiHash,
    {
      connectionRetries: 5,
      floodSleepThreshold: config.maxFloodWaitSeconds,
    },
  );

  await accountClient.connect();
  if (!(await accountClient.checkAuthorization())) {
    await accountClient.disconnect();
    throw new ConfigurationError(
      "TELEGRAM_ACCOUNT_SESSION yaroqsiz. Avval yarn session buyrug'ini ishlating.",
    );
  }

  accountClient.setParseMode(undefined);
  const workAccount = await accountClient.getMe();
  logger.success(`Ishchi Telegram account ulandi: ${workAccount.id.toString()}`);

  const broadcastState = new RedisBroadcastState(redis, config.redisBroadcastLockTtlMs);
  const broadcaster = new TelegramAccountBroadcaster(accountClient, {
    sendConcurrency: config.sendConcurrency,
    maxFloodWaitSeconds: config.maxFloodWaitSeconds,
  }, logger, broadcastState);
  const languageStore = await AccountLanguageStore.load(
    resolve(process.cwd(), ".data/account-settings.json"),
  );
  const adminAccess = new MongoAccessRepository();
  const adminSubscribers = new MongoSubscriberRepository();
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
    languageStore,
    logger,
  });

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
    broadcaster.cancel();
    await bot.stop().catch(() => undefined);
    await stopAdminServer().catch(() => undefined);
    await accountClient.disconnect().catch(() => undefined);
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
