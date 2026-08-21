/**
 * End-to-end check of the persistence + scheduling logic against a real Mongo,
 * with Telegram replaced by a fake broadcaster. Run: npx tsx scripts/smoke.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import {
  ConsoleLogger,
  MongoAccessRepository,
  MongoChatRepository,
  MongoSubscriberRepository,
  connectMongo,
  disconnectMongo,
} from "@infrastructure";
import type { Broadcaster, SendOutcome } from "@ports";
import {
  BroadcastForSubscriberUseCase,
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
      return { ok: false, permanentFailure: true, reason: "bot was kicked" };
    }
    this.sent.push({ chatId, text });
    return { ok: true, permanentFailure: false, reason: null };
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
  const fresh = await manage.register(USER, "testuser");
  check("yangi foydalanuvchi yaratildi", fresh.userId === USER);
  check("standart interval 60", fresh.intervalMinutes === 60, `(${fresh.intervalMinutes})`);
  check("boshida to'xtatilgan", fresh.active === false);
  check("xabar bo'sh", fresh.message === null);

  console.log("\n2) Username + telefon orqali dostupni tasdiqlash");
  const accessGrant = await access.add("@testuser", "+998 90 000 00 01");
  check("username normallashtirildi", accessGrant.username === "testuser");
  check("telefon normallashtirildi", accessGrant.phone === "998900000001");
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
  const started = await manage.start((await subscribers.find(USER))!);
  check("active true", started.active === true);
  check("nextRunAt belgilandi", started.nextRunAt !== null);
  check("hozircha due emas", (await subscribers.findDue(new Date())).length === 0);

  const future = new Date(Date.now() + 31 * 60_000);
  check("31 daqiqadan keyin due", (await subscribers.findDue(future)).length === 1);

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
  const runDue = new RunDueBroadcastsUseCase(subscribers, broadcast, logger, async (s, r) => {
    reports.push(r.sent);
  });
  const before = (await subscribers.find(USER))!.nextRunAt!.getTime();
  await runDue.execute(future);
  const after = (await subscribers.find(USER))!;
  check("nextRunAt oldinga surildi", after.nextRunAt!.getTime() > before);
  check("lastRunAt yozildi", after.lastRunAt !== null);
  check("hisobot yuborildi", reports.length === 1 && reports[0] === 2, `(${reports})`);
  check("takroran due emas", (await subscribers.findDue(future)).length === 0);

  console.log("\n8) Stop");
  const stopped = await manage.stop(USER);
  check("active false", stopped.active === false);
  check("nextRunAt tozalandi", stopped.nextRunAt === null);
  check(
    "to'xtaganda due chiqmaydi",
    (await subscribers.findDue(new Date(Date.now() + 10 * 3_600_000))).length === 0,
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
