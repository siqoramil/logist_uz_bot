import { Bot, GrammyError } from "grammy";
import { DomainError } from "@domain";
import {
  ConsoleLogger,
  GrammyBroadcaster,
  MongoChatRepository,
  MongoSubscriberRepository,
  connectMongo,
  disconnectMongo,
  loadConfig,
  startScheduler,
} from "@infrastructure";
import { broadcastReport, registerHandlers } from "@presentation";
import {
  BroadcastForSubscriberUseCase,
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
  const chats = new MongoChatRepository();
  const manage = new ManageSubscriberUseCase(subscribers);
  const trackChat = new TrackChatUseCase(chats, logger);

  const bot = new Bot(config.botToken);
  const broadcast = new BroadcastForSubscriberUseCase(
    chats,
    new GrammyBroadcaster(bot),
    logger,
  );

  registerHandlers(bot, { subscribers, chats, manage, broadcast, trackChat, logger });

  const runDue = new RunDueBroadcastsUseCase(
    subscribers,
    broadcast,
    logger,
    async (subscriber, result) => {
      await bot.api
        .sendMessage(subscriber.userId, broadcastReport(result), { parse_mode: "HTML" })
        .catch(() => undefined);
    },
  );

  startScheduler(() => runDue.execute(), logger, controller.signal);

  const shutdown = async (): Promise<void> => {
    controller.abort();
    await bot.stop();
    await disconnectMongo();
    logger.info("To'xtatildi");
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  await bot.api.setMyCommands([
    { command: "start", description: "Botni ishga tushirish" },
    { command: "menu", description: "Bosh menyu" },
    { command: "status", description: "Hozirgi holat" },
    { command: "help", description: "Yordam" },
  ]);

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
