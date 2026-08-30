import { Bot, GrammyError } from "grammy";
import { ACCESS_MONTH_PRICE_UZS } from "@constants";
import { DomainError } from "@domain";
import {
  ConsoleLogger,
  AdminCredentialStore,
  GrammyBroadcaster,
  MongoAccessRepository,
  MongoChatRepository,
  MongoSubscriberRepository,
  connectMongo,
  disconnectMongo,
  loadConfig,
  startAdminServer,
  startScheduler,
} from "@infrastructure";
import { broadcastReport, getTexts, registerHandlers } from "@presentation";
import {
  BroadcastForSubscriberUseCase,
  ExpireAccessGrantsUseCase,
  ManageSubscriberUseCase,
  RunDueBroadcastsUseCase,
  TrackChatUseCase,
} from "@use-cases";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const logger = new ConsoleLogger();
  const controller = new AbortController();

  await connectMongo(config.mongoUri);
  logger.info("MongoDB ulandi");

  const subscribers = new MongoSubscriberRepository();
  const access = new MongoAccessRepository();
  const chats = new MongoChatRepository();
  const manage = new ManageSubscriberUseCase(subscribers);
  const trackChat = new TrackChatUseCase(chats, logger);
  const adminCredentials = await AdminCredentialStore.initialize(
    config.adminUsername,
    config.adminPassword,
  );

  const bot = new Bot(config.botToken);
  const broadcast = new BroadcastForSubscriberUseCase(
    chats,
    new GrammyBroadcaster(bot),
    logger,
  );

  registerHandlers(bot, {
    access,
    subscribers,
    chats,
    manage,
    broadcast,
    trackChat,
    logger,
    payment: {
      monthlyPriceUzs: ACCESS_MONTH_PRICE_UZS,
      adminContact: config.adminContact,
    },
  });

  const stopAdminServer = startAdminServer({
    port: config.adminPort,
    credentials: adminCredentials,
    allowedOrigin: config.adminOrigin,
    access,
    subscribers,
    logger,
  });

  const runDue = new RunDueBroadcastsUseCase(
    subscribers,
    broadcast,
    logger,
    async (subscriber, result) => {
      await bot.api
        .sendMessage(subscriber.userId, broadcastReport(result, subscriber.language), { parse_mode: "HTML" })
        .catch(() => undefined);
    },
    access,
    async (subscriber) => {
      await bot.api
        .sendMessage(subscriber.userId, getTexts(subscriber.language).serverError)
        .catch(() => undefined);
    },
  );
  const expireAccess = new ExpireAccessGrantsUseCase(access, subscribers, logger);

  startScheduler(async () => {
    await expireAccess.execute();
    await runDue.execute();
  }, logger, controller.signal);

  const shutdown = async (): Promise<void> => {
    controller.abort();
    await bot.stop();
    await stopAdminServer();
    await disconnectMongo();
    logger.info("To'xtatildi");
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  const commands = (language: "uz" | "ru" | "en") => {
    const descriptions = getTexts(language).commands;
    return [
      { command: "start", description: descriptions.start },
      { command: "menu", description: descriptions.menu },
      { command: "status", description: descriptions.status },
      { command: "language", description: descriptions.language },
      { command: "help", description: descriptions.help },
    ];
  };
  await bot.api.setMyCommands(commands("uz"));
  await bot.api.setMyCommands(commands("uz"), { language_code: "uz" });
  await bot.api.setMyCommands(commands("ru"), { language_code: "ru" });
  await bot.api.setMyCommands(commands("en"), { language_code: "en" });

  const me = await bot.api.getMe();
  logger.success(`Bot ishga tushdi: @${me.username}`);

  await bot.start({
    allowed_updates: ["message", "callback_query", "my_chat_member"],
    onStart: () => logger.info("Update'lar qabul qilinmoqda..."),
  });
}

bootstrap().catch((err) => {
  if (err instanceof DomainError) {
    console.error(`\n${err.message}`);
  } else if (err instanceof GrammyError && err.error_code === 401) {
    console.error("\nBOT_TOKEN noto'g'ri. @BotFather dan olingan tokenni .env ga qo'ying.");
  } else {
    console.error("Fatal:", err);
  }
  process.exit(1);
});
