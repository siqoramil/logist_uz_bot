import {
  MAX_BROADCAST_INTERVAL_MINUTES,
  MIN_BROADCAST_INTERVAL_MINUTES,
} from "@constants";
import type { BroadcastResult, ManagedChat, Subscriber } from "@domain";

export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const preview = (text: string, max = 120): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
};

const clock = (date: Date | null): string =>
  date === null
    ? "—"
    : date.toLocaleString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        timeZone: "Asia/Tashkent",
      });

export const WELCOME = [
  "👋 <b>Assalomu alaykum!</b>",
  "",
  "Bu bot siz tanlagan guruhlarga xabaringizni belgilangan vaqt oralig'ida avtomatik yuborib turadi.",
  "",
  "<b>Qanday ishlaydi:</b>",
  "1️⃣ Botni kerakli guruhga qo'shing va <b>xabar yuborish</b> huquqini bering",
  "2️⃣ 📝 tugmasi orqali xabar matnini yozing",
  "3️⃣ ⏱ orqali necha daqiqada bir yuborilishini tanlang",
  "4️⃣ ▶️ <b>Boshlash</b> tugmasini bosing",
  "",
  "⚠️ Bot faqat <b>o'zi qo'shilgan</b> guruhlarga yoza oladi.",
].join("\n");

export interface PaymentDetails {
  readonly card: string;
  readonly cardHolder: string | null;
  readonly adminContact: string;
}

export const accessDenied = (payment: PaymentDetails): string => {
  const holder = payment.cardHolder
    ? `\nKarta egasi: <b>${escapeHtml(payment.cardHolder)}</b>`
    : "";
  return [
    "🔒 <b>Botdan foydalanish uchun ruxsat kerak</b>",
    "",
    "To'lovni quyidagi kartaga yuboring:",
    `<code>${escapeHtml(payment.card)}</code>${holder}`,
    "",
    `To'lovdan keyin chekni ${escapeHtml(payment.adminContact)} ga yuboring. Admin telefon raqamingiz va Telegram username'ingizni birga tizimga qo'shadi.`,
    "",
    "Agar admin telefon raqamingizni qo'shgan bo'lsa, pastdagi tugma orqali o'z kontaktingizni yuboring.",
  ].join("\n");
};

export const CONTACT_NOT_YOURS =
  "⚠️ Faqat o'zingizning Telegram kontaktingizni yuboring.";
export const USERNAME_REQUIRED =
  "⚠️ Telegram akkauntingizga username o'rnating va /start ni qayta bosing.";
export const ACCESS_DETAILS_MISMATCH =
  "⛔️ Kontakt telefon raqami va Telegram username admin kiritgan ma'lumotlarga birga mos kelmadi. Admin bilan bog'laning.";
export const ACCESS_GRANTED = "✅ Ruxsat tasdiqlandi. Botdan foydalanishingiz mumkin.";
export const ACCESS_REVOKED = "⛔️ Sizning botdan foydalanish ruxsatingiz faol emas.";

export const HELP = [
  "<b>Buyruqlar</b>",
  "",
  "/start — bosh menyu",
  "/menu — bosh menyu",
  "/status — hozirgi sozlamalar",
  "/help — shu yordam",
  "",
  `Interval ${MIN_BROADCAST_INTERVAL_MINUTES}–${MAX_BROADCAST_INTERVAL_MINUTES} daqiqa oralig'ida bo'lishi kerak.`,
].join("\n");

export const statusCard = (subscriber: Subscriber, chatCount: number): string => {
  const state = subscriber.active ? "🟢 Ishlayapti" : "⚪️ To'xtatilgan";
  const message =
    subscriber.message === null
      ? "<i>hali belgilanmagan</i>"
      : escapeHtml(preview(subscriber.message));

  return [
    "<b>📊 Holat</b>",
    "",
    `Rejim:    ${state}`,
    `Guruhlar: <b>${chatCount}</b> ta`,
    `Interval: har <b>${subscriber.intervalMinutes}</b> daqiqada`,
    `Keyingi:  ${clock(subscriber.nextRunAt)}`,
    `Oxirgi:   ${clock(subscriber.lastRunAt)}`,
    "",
    "<b>📝 Xabar:</b>",
    message,
  ].join("\n");
};

export const groupList = (chats: readonly ManagedChat[]): string => {
  if (chats.length === 0) {
    return [
      "📋 <b>Guruhlar yo'q</b>",
      "",
      "Botni guruhga qo'shing — u avtomatik shu ro'yxatga tushadi.",
      "Bot guruhda xabar yubora olishi uchun unga ruxsat berilgan bo'lishi kerak.",
    ].join("\n");
  }

  const lines = chats.map(
    (chat, index) => `${index + 1}. ${escapeHtml(chat.title)}`,
  );
  return [`📋 <b>${chats.length} ta guruh</b>`, "", ...lines].join("\n");
};

export const askMessage = (current: string | null): string =>
  [
    "📝 <b>Yuboriladigan xabarni yozing.</b>",
    "",
    current === null
      ? "<i>Hozircha xabar yo'q.</i>"
      : `Hozirgi: <i>${escapeHtml(preview(current))}</i>`,
    "",
    "Keyingi xabaringiz matn sifatida qabul qilinadi.",
  ].join("\n");

export const askInterval = (current: number): string =>
  [
    "⏱ <b>Interval necha daqiqa bo'lsin?</b>",
    "",
    `Hozirgi: <b>${current}</b> daqiqa`,
    `Ruxsat etilgan: ${MIN_BROADCAST_INTERVAL_MINUTES}–${MAX_BROADCAST_INTERVAL_MINUTES}`,
    "",
    "Pastdagi tugmalardan tanlang yoki sonni yozib yuboring.",
  ].join("\n");

export const broadcastReport = (result: BroadcastResult): string => {
  const lines = [
    "<b>📤 Yuborildi</b>",
    "",
    `✅ Muvaffaqiyatli: <b>${result.sent}</b>`,
    `❌ Xato: <b>${result.failed}</b>`,
  ];

  if (result.failures.length > 0) {
    lines.push("", "<b>Xatolar:</b>");
    for (const failure of result.failures.slice(0, 10)) {
      lines.push(`• ${escapeHtml(failure.group)} — ${escapeHtml(failure.reason)}`);
    }
    if (result.failures.length > 10) {
      lines.push(`<i>…yana ${result.failures.length - 10} ta</i>`);
    }
  }

  return lines.join("\n");
};

export const NO_GROUPS =
  "⚠️ Avval botni kamida bitta guruhga qo'shing.";
export const NO_MESSAGE =
  "⚠️ Avval 📝 tugmasi orqali xabar matnini belgilang.";
export const STARTED = "▶️ Boshlandi. Belgilangan vaqtda yuborib turaman.";
export const STOPPED = "⏹ To'xtatildi.";
export const MESSAGE_SAVED = "✅ Xabar saqlandi.";
export const INTERVAL_SAVED = (minutes: number): string =>
  `✅ Interval ${minutes} daqiqaga o'rnatildi.`;
export const INVALID_INTERVAL = `⚠️ ${MIN_BROADCAST_INTERVAL_MINUTES}–${MAX_BROADCAST_INTERVAL_MINUTES} oralig'ida son yuboring.`;
export const GROUP_ADDED = (title: string): string =>
  `✅ <b>${escapeHtml(title)}</b> guruhi qo'shildi.`;
export const GROUP_REMOVED = (title: string): string =>
  `➖ <b>${escapeHtml(title)}</b> guruhi ro'yxatdan chiqarildi.`;
