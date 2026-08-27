/**
 * End-to-end check of the persistence + scheduling logic against a real Mongo,
 * with Telegram replaced by a fake broadcaster. Run: npx tsx scripts/smoke.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { ACCESS_MONTH_PRICE_UZS } from "@constants";
import { AccessInputError, addAccessMonth } from "@domain";
import {
  ConsoleLogger,
  MongoAccessRepository,
  MongoChatRepository,
  MongoSubscriberRepository,
  connectMongo,
  disconnectMongo,
  explainDeliveryError,
} from "@infrastructure";
import { broadcastReport, getTexts } from "@presentation";
import type { Broadcaster, SendOutcome, SubscriberRepository } from "@ports";
import {
  BroadcastForSubscriberUseCase,
  ExpireAccessGrantsUseCase,
  ManageSubscriberUseCase,
  RunDueBroadcastsUseCase,
  TrackChatUseCase,
} from "@use-cases";

const USER = 999_000_001;
const KICKED_CHAT = -100_900_000_003;

class FakeBroadcaster implements Broadcaster {
  readonly sent: Array<{ chatId: number; text: string }> = [];

  async send(chatId: number, text: string): Promise<SendOutcome> {
    if (chatId === KICKED_CHAT) {
      return {
        ok: false,
        permanentFailure: true,
        failure: {
          code: "bot-kicked",
          reason: "Bot guruhdan chiqarib yuborilgan.",
          action: "Botni guruhga qayta qo'shing.",
        },
      };
    }
    this.sent.push({ chatId, text });
    return { ok: true, permanentFailure: false, failure: null };
  }
}

let failures = 0;
const check = (label: string, condition: boolean, detail = ""): void => {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label} ${detail}`);
  }
};

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI yo'q");
  await connectMongo(uri);

  const logger = new ConsoleLogger();
  const subscribers = new MongoSubscriberRepository();
  const access = new MongoAccessRepository();
  const chats = new MongoChatRepository();
  const manage = new ManageSubscriberUseCase(subscribers);
  const scopedSubscribers: SubscriberRepository = {
    find: (userId) => subscribers.find(userId),
    ensure: (userId, username, language) => subscribers.ensure(userId, username, language),
    update: (userId, patch) => subscribers.update(userId, patch),
    findDue: async (now) => (await subscribers.findDue(now)).filter(({ userId }) => userId === USER),
    countAll: () => subscribers.countAll(),
  };
  const trackChat = new TrackChatUseCase(chats, logger);
  const fake = new FakeBroadcaster();
  const broadcast = new BroadcastForSubscriberUseCase(chats, fake, logger);

  // clean slate
  await mongoose.connection.collection("subscribers").deleteMany({ userId: USER });
  await mongoose.connection.collection("managedchats").deleteMany({ ownerId: USER });
  await mongoose.connection.collection("accessgrants").deleteMany({
    $or: [{ username: "testuser" }, { phone: "998900000001" }],
  });

  console.log("\n1) Ro'yxatdan o'tish va standart qiymatlar");
  const fresh = await manage.register(USER, "testuser", "en");
  check("yangi foydalanuvchi yaratildi", fresh.userId === USER);
  check("standart interval 60", fresh.intervalMinutes === 60, `(${fresh.intervalMinutes})`);
  check("boshida to'xtatilgan", fresh.active === false);
  check("xabar bo'sh", fresh.message === null);
  check("Telegram tili birinchi kirishda saqlandi", fresh.language === "en");
  await manage.setLanguage(USER, "ru");
  await manage.register(USER, "testuser", "uz");
  check("tanlangan til qayta kirishda saqlanadi", (await subscribers.find(USER))?.language === "ru");

  console.log("\n2) Username + telefon orqali dostupni tasdiqlash");
  const accessGrant = await access.add("@testuser", "+998 90 000 00 01", "Test User");
  check("username normallashtirildi", accessGrant.username === "testuser");
  check("telefon normallashtirildi", accessGrant.phone === "998900000001");
  check("oylik tugash vaqti yozildi", accessGrant.expiresAt.getTime() > Date.now());
  check("100 000 so'mlik to'lov yozildi", accessGrant.billingHistory[0]?.amount === ACCESS_MONTH_PRICE_UZS);
  let usernameConflict = false;
  try {
    await access.add("@testuser", "+998 90 000 00 02", "Test User");
  } catch (error) {
    usernameConflict = error instanceof AccessInputError && error.code === "username-in-use";
  }
  check("username boshqa telefon bilan aniq xato qaytaradi", usernameConflict);
  let phoneConflict = false;
  try {
    await access.add("@other_user", "+998 90 000 00 01", "Other User");
  } catch (error) {
    phoneConflict = error instanceof AccessInputError && error.code === "phone-in-use";
  }
  check("telefon boshqa username bilan aniq xato qaytaradi", phoneConflict);
  check(
    "oy oxiri to'g'ri hisoblanadi",
    addAccessMonth(new Date("2027-01-31T10:30:00.000Z")).toISOString() === "2027-02-28T10:30:00.000Z",
  );
  check("kontakt yuborilmasdan dostup yo'q", !(await access.authorizeByUsername(USER, "testuser")));
  check(
    "noto'g'ri telefon rad etildi",
    !(await access.authorizeByPhone(USER, "testuser", "+998 90 000 00 02")),
  );
  check(
    "noto'g'ri username rad etildi",
    !(await access.authorizeByPhone(USER, "other_user", "+998 90 000 00 01")),
  );
  check(
    "to'liq mos juftlik tasdiqlandi",
    await access.authorizeByPhone(USER, "testuser", "+998 90 000 00 01"),
  );
  check("tasdiqdan keyin dostup bor", await access.isAuthorized(USER, "testuser"));
  check("username o'zgarsa dostup yo'q", !(await access.isAuthorized(USER, "changed_user")));

  console.log("\n3) Guruh qo'shish / chiqarish");
  await trackChat.added(-100_900_000_001, USER, "Yuk Toshkent");
  await trackChat.added(-100_900_000_002, USER, "Logistika UZ");
  await trackChat.added(KICKED_CHAT, USER, "Eski guruh");
  check("3 ta faol guruh", (await chats.countActiveByOwner(USER)) === 3);

  await trackChat.removed(-100_900_000_002, "Logistika UZ");
  check("chiqarilgandan keyin 2 ta", (await chats.countActiveByOwner(USER)) === 2);

  await trackChat.added(-100_900_000_002, USER, "Logistika UZ");
  check("qayta qo'shilsa tiklanadi", (await chats.countActiveByOwner(USER)) === 3);

  console.log("\n4) Sozlamalar validatsiyasi");
  await manage.setMessage(USER, "  Yuk bor: Toshkent - Samarqand  ");
  const withMessage = await subscribers.find(USER);
  check("xabar trim bilan saqlandi", withMessage?.message === "Yuk bor: Toshkent - Samarqand");
  check("holat idle ga qaytdi", withMessage?.state === "idle");

  await manage.setInterval(USER, 30);
  check("interval 30 bo'ldi", (await subscribers.find(USER))?.intervalMinutes === 30);

  for (const bad of [0, 3, 5000, Number.NaN]) {
    let threw = false;
    try {
      await manage.setInterval(USER, bad);
    } catch {
      threw = true;
    }
    check(`noto'g'ri interval rad etildi: ${bad}`, threw);
  }
  let emptyThrew = false;
  try {
    await manage.setMessage(USER, "   ");
  } catch {
    emptyThrew = true;
  }
  check("bo'sh xabar rad etildi", emptyThrew);

  console.log("\n5) Start / due tanlash");
  const startedAt = new Date();
  const started = await manage.start((await subscribers.find(USER))!, startedAt);
  check("active true", started.active === true);
  check("nextRunAt belgilandi", started.nextRunAt !== null);
  check("birinchi yuborish vaqti yozildi", started.lastRunAt !== null);
  check("hozircha due emas", (await scopedSubscribers.findDue(new Date())).length === 0);

  const future = new Date(startedAt.getTime() + 31 * 60_000);
  check("31 daqiqadan keyin due", (await scopedSubscribers.findDue(future)).length === 1);

  console.log("\n6) Tarqatish va o'lik guruhni tozalash");
  const result = await broadcast.execute((await subscribers.find(USER))!);
  check("2 taga yuborildi", result.sent === 2, `(${result.sent})`);
  check("1 tasi xato", result.failed === 1, `(${result.failed})`);
  check("kicked guruh o'chirildi", (await chats.countActiveByOwner(USER)) === 2);
  check(
    "matn to'g'ri ketdi",
    fake.sent.every((s) => s.text === "Yuk bor: Toshkent - Samarqand"),
  );

  console.log("\n7) Scheduler tick qayta rejalashtiradi");
  const reports: number[] = [];
  const runDue = new RunDueBroadcastsUseCase(scopedSubscribers, broadcast, logger, async (s, r) => {
    reports.push(r.sent);
  });
  const before = (await subscribers.find(USER))!.nextRunAt!.getTime();
  await runDue.execute(future);
  const after = (await subscribers.find(USER))!;
  check("nextRunAt oldinga surildi", after.nextRunAt!.getTime() > before);
  check("lastRunAt yozildi", after.lastRunAt !== null);
  check("hisobot yuborildi", reports.length === 1 && reports[0] === 2, `(${reports})`);
  check("takroran due emas", (await scopedSubscribers.findDue(future)).length === 0);

  console.log("\n8) Stop");
  const stopped = await manage.stop(USER);
  check("active false", stopped.active === false);
  check("nextRunAt tozalandi", stopped.nextRunAt === null);
  check(
    "to'xtaganda due chiqmaydi",
    (await scopedSubscribers.findDue(new Date(Date.now() + 10 * 3_600_000))).length === 0,
  );

  console.log("\n9) Oylik muddat va analytics");
  await manage.start((await subscribers.find(USER))!);
  await mongoose.connection.collection("accessgrants").updateOne(
    { _id: new mongoose.Types.ObjectId(accessGrant.id) },
    { $set: { expiresAt: new Date(Date.now() - 1) } },
  );
  const expireAccess = new ExpireAccessGrantsUseCase(access, subscribers, logger);
  const expiredCount = await expireAccess.execute();
  check("muddatida access pause bo'ldi", expiredCount === 1);
  check("subscriber ham to'xtadi", (await subscribers.find(USER))?.active === false);
  check("muddati tugagach dostup yo'q", !(await access.isAuthorized(USER, "testuser")));
  const analytics = await access.analytics();
  check("oylik narx 100 000 so'm", analytics.pricePerMonth === ACCESS_MONTH_PRICE_UZS);
  check("billing analyticsga kirdi", analytics.totalPayments >= 1);

  console.log("\n10) Telegram xatolarini tushuntirish");
  const errorCases = [
    ["not enough rights to send text messages", "send-rights-missing"],
    ["bot was kicked from the supergroup", "bot-kicked"],
    ["bot is not a member of the channel chat", "bot-not-member"],
    ["Bad Request: chat not found", "chat-not-found"],
    ["group chat was upgraded to a supergroup chat", "chat-migrated"],
    ["Bad Request: group is deactivated", "chat-deactivated"],
    ["Bad Request: CHAT_RESTRICTED", "chat-restricted"],
    ["Forbidden: bot was blocked by the user", "bot-blocked"],
    ["Forbidden: user is deactivated", "user-deactivated"],
    ["Bad Request: user not found", "user-not-found"],
    ["Bad Request: PEER_ID_INVALID", "peer-invalid"],
    ["Bad Request: CHAT_ADMIN_REQUIRED", "admin-required"],
    ["Bad Request: TOPIC_CLOSED", "topic-closed"],
    ["Bad Request: message thread not found", "topic-not-found"],
    ["Bad Request: message text is empty", "message-empty"],
    ["Bad Request: message is too long", "message-too-long"],
    ["Bad Request: can't parse entities", "entity-parse"],
    ["Too Many Requests: retry after 20", "rate-limited"],
    ["Request timed out", "request-timeout"],
    ["TypeError: fetch failed", "network-unavailable"],
    ["read ECONNRESET", "connection-reset"],
  ] as const;
  for (const [technical, expected] of errorCases) {
    const explained = explainDeliveryError(new Error(technical));
    check(`${expected} tushuntirildi`, explained.code === expected);
  }
  const uzReport = broadcastReport(result, "uz");
  const ruReport = broadcastReport(result, "ru");
  const enReport = broadcastReport(result, "en");
  check("UZ report sababni ko'rsatadi", uzReport.includes("Sabab:"));
  check("UZ report yechimni ko'rsatadi", uzReport.includes("Yechim:"));
  check("RU report xatoni tarjima qiladi", ruReport.includes("Причина:") && ruReport.includes("Решение:"));
  check("EN report xatoni tarjima qiladi", enReport.includes("Reason:") && enReport.includes("Solution:"));
  check(
    "server xatosi uch tilda farq qiladi",
    new Set([getTexts("uz").serverError, getTexts("ru").serverError, getTexts("en").serverError]).size === 3,
  );

  await mongoose.connection.collection("subscribers").deleteMany({ userId: USER });
  await mongoose.connection.collection("managedchats").deleteMany({ ownerId: USER });
  await mongoose.connection.collection("accessgrants").deleteMany({
    $or: [{ username: "testuser" }, { phone: "998900000001" }],
  });
  await disconnectMongo();

  console.log(failures === 0 ? "\nHAMMASI O'TDI ✅\n" : `\n${failures} TA XATO ❌\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke xatosi:", err);
  process.exit(1);
});
