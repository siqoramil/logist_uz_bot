import {
  MAX_BROADCAST_INTERVAL_MINUTES,
  MIN_BROADCAST_INTERVAL_MINUTES,
} from "@constants";
import type {
  BotLanguage,
  BroadcastResult,
  ManagedChat,
  Subscriber,
} from "@domain";
import { deliveryErrorText } from "./delivery-error-texts";

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const preview = (text: string, max = 120): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
};

export interface PaymentDetails {
  readonly monthlyPriceUzs: number;
  readonly adminContact: string;
}

export interface BotCommands {
  readonly start: string;
  readonly menu: string;
  readonly status: string;
  readonly help: string;
  readonly language: string;
}

export interface BotTexts {
  readonly locale: string;
  readonly buttons: {
    readonly message: string;
    readonly interval: string;
    readonly groups: string;
    readonly sendNow: string;
    readonly start: string;
    readonly stop: string;
    readonly refresh: string;
    readonly back: string;
    readonly language: string;
    readonly contact: string;
  };
  readonly commands: BotCommands;
  readonly welcome: string;
  readonly help: string;
  readonly languageTitle: string;
  readonly languageChanged: string;
  readonly contactNotYours: string;
  readonly accessDetailsMismatch: string;
  readonly accessGranted: string;
  readonly accessRevoked: string;
  readonly noGroups: string;
  readonly noMessage: string;
  readonly started: string;
  readonly stopped: string;
  readonly messageSaved: string;
  readonly invalidMessage: string;
  readonly invalidInterval: string;
  readonly sending: string;
  readonly serverError: string;
  readonly minuteShort: string;
  accessDenied(payment: PaymentDetails): string;
  statusCard(subscriber: Subscriber, chatCount: number): string;
  groupList(chats: readonly ManagedChat[]): string;
  askMessage(current: string | null): string;
  askInterval(current: number): string;
  intervalSaved(minutes: number): string;
  groupAdded(title: string): string;
  groupRemoved(title: string): string;
  broadcastReport(result: BroadcastResult): string;
}

const clock = (date: Date | null, locale: string): string =>
  date === null
    ? "—"
    : date.toLocaleString(locale, {
        hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit",
        timeZone: "Asia/Tashkent",
      });

const report = (
  language: BotLanguage,
  result: BroadcastResult,
  labels: {
    readonly title: string;
    readonly success: string;
    readonly failed: string;
    readonly failedGroups: string;
    readonly reason: string;
    readonly action: string;
    readonly more: (count: number) => string;
  },
): string => {
  const lines = [
    `<b>${labels.title}</b>`, "",
    `✅ ${labels.success}: <b>${result.sent}</b>`,
    `❌ ${labels.failed}: <b>${result.failed}</b>`,
  ];
  if (result.failures.length > 0) {
    lines.push("", `<b>⚠️ ${labels.failedGroups}:</b>`);
    for (const failure of result.failures.slice(0, 10)) {
      const explanation = deliveryErrorText(language, failure.code);
      lines.push(
        "", `• <b>${escapeHtml(failure.group)}</b>`,
        `  ${labels.reason}: ${escapeHtml(explanation.reason)}`,
        `  ${labels.action}: ${escapeHtml(explanation.action)}`,
      );
    }
    if (result.failures.length > 10) lines.push(`<i>${labels.more(result.failures.length - 10)}</i>`);
  }
  return lines.join("\n");
};

const uz: BotTexts = {
  locale: "uz-Latn-UZ",
  buttons: {
    message: "📝 Xabar", interval: "⏱ Interval", groups: "📋 Guruhlar",
    sendNow: "📤 Hozir yuborish", start: "▶️ Boshlash", stop: "⏹ To‘xtatish",
    refresh: "🔄 Yangilash", back: "⬅️ Orqaga", language: "🌐 Til",
    contact: "📱 Telefon raqamimni yuborish",
  },
  commands: {
    start: "Botni ishga tushirish", menu: "Bosh menyu", status: "Hozirgi holat",
    help: "Yordam", language: "Tilni tanlash",
  },
  welcome: [
    "👋 <b>Assalomu alaykum!</b>", "",
    "Bu bot tanlangan guruhlarga xabaringizni belgilangan intervalda avtomatik yuboradi.", "",
    "<b>Qanday ishlaydi:</b>",
    "1️⃣ Botni guruhga qo‘shing va xabar yuborish huquqini bering",
    "2️⃣ 📝 tugmasi orqali xabar yozing",
    "3️⃣ ▶️ <b>Boshlash</b> tugmasini bosing — bot har 60 daqiqada yuboradi",
  ].join("\n"),
  help: [
    "<b>Buyruqlar</b>", "", "/start — botni ishga tushirish", "/menu — bosh menyu",
    "/status — hozirgi sozlamalar", "/language — tilni tanlash", "/help — yordam", "",
    "Xabarlar har 60 daqiqada yuboriladi.",
  ].join("\n"),
  languageTitle: "🌐 <b>Tilni tanlang</b>",
  languageChanged: "✅ Til o‘zgartirildi.",
  contactNotYours: "⚠️ Faqat o‘zingizning Telegram kontaktingizni yuboring.",
  accessDetailsMismatch: "⛔️ Bu telefon raqamiga admin tomonidan ruxsat berilmagan.",
  accessGranted: "✅ Ruxsat tasdiqlandi. Botdan foydalanishingiz mumkin.",
  accessRevoked: "⛔️ Botdan foydalanish ruxsatingiz faol emas.",
  noGroups: "⚠️ Avval botni kamida bitta guruhga qo‘shing.",
  noMessage: "⚠️ Avval 📝 tugmasi orqali xabar matnini belgilang.",
  started: "▶️ Boshlandi. Belgilangan vaqtda yuboraman.",
  stopped: "⏹ To‘xtatildi.",
  messageSaved: "✅ Xabar saqlandi.",
  invalidMessage: "⚠️ Xabar bo‘sh bo‘lmasligi va ruxsat etilgan uzunlikdan oshmasligi kerak.",
  invalidInterval: `⚠️ ${MIN_BROADCAST_INTERVAL_MINUTES}–${MAX_BROADCAST_INTERVAL_MINUTES} oralig‘ida son yuboring.`,
  sending: "📤 Yuborilmoqda...",
  serverError: "⚠️ Serverda vaqtinchalik xato yuz berdi. Birozdan keyin qayta urinib ko‘ring.",
  minuteShort: "daq",
  accessDenied: (payment) => [
    "🔒 <b>Bu telefon raqamiga dostup berilmagan</b>", "",
    `Bir oylik dostup narxi: <b>${payment.monthlyPriceUzs.toLocaleString("uz-UZ")} so‘m</b>.`,
    `Dostup olish uchun ${escapeHtml(payment.adminContact)} bilan bog‘laning.`, "",
    "Admin telefon raqamingizga dostup bergach, pastdagi tugma orqali o‘z kontaktingizni yuboring.",
  ].join("\n"),
  statusCard: (subscriber, chatCount) => {
    const state = subscriber.active ? "🟢 Ishlayapti" : "⚪️ To‘xtatilgan";
    const message = subscriber.message === null ? "<i>hali belgilanmagan</i>" : escapeHtml(preview(subscriber.message));
    return [
      "<b>📊 Holat</b>", "", `Rejim: ${state}`, `Guruhlar: <b>${chatCount}</b> ta`,
      `Interval: har <b>${subscriber.intervalMinutes}</b> daqiqada`,
      `Keyingi: ${clock(subscriber.nextRunAt, "uz-Latn-UZ")}`,
      `Oxirgi: ${clock(subscriber.lastRunAt, "uz-Latn-UZ")}`, "", "<b>📝 Xabar:</b>", message,
    ].join("\n");
  },
  groupList: (chats) => chats.length === 0
    ? ["📋 <b>Guruhlar yo‘q</b>", "", "Botni guruhga qo‘shing — u avtomatik ro‘yxatga tushadi.", "Botga xabar yuborish huquqini bering."].join("\n")
    : [`📋 <b>${chats.length} ta guruh</b>`, "", ...chats.map((chat, i) => `${i + 1}. ${escapeHtml(chat.title)}`)].join("\n"),
  askMessage: (current) => [
    "📝 <b>Yuboriladigan xabarni yozing.</b>", "",
    current === null ? "<i>Hozircha xabar yo‘q.</i>" : `Hozirgi: <i>${escapeHtml(preview(current))}</i>`, "",
    "Keyingi xabaringiz matn sifatida qabul qilinadi.",
  ].join("\n"),
  askInterval: (current) => [
    "⏱ <b>Interval necha daqiqa bo‘lsin?</b>", "", `Hozirgi: <b>${current}</b> daqiqa`,
    `Ruxsat etilgan: ${MIN_BROADCAST_INTERVAL_MINUTES}–${MAX_BROADCAST_INTERVAL_MINUTES}`, "",
    "Tugmalardan tanlang yoki son yuboring.",
  ].join("\n"),
  intervalSaved: (minutes) => `✅ Interval ${minutes} daqiqaga o‘rnatildi.`,
  groupAdded: (title) => `✅ <b>${escapeHtml(title)}</b> guruhi qo‘shildi.`,
  groupRemoved: (title) => `➖ <b>${escapeHtml(title)}</b> guruhi ro‘yxatdan chiqarildi.`,
  broadcastReport: (result) => report("uz", result, {
    title: "📤 Yuborildi", success: "Muvaffaqiyatli", failed: "Xato",
    failedGroups: "Yuborilmagan guruhlar", reason: "Sabab", action: "Yechim",
    more: (count) => `…yana ${count} ta`,
  }),
};

const ru: BotTexts = {
  locale: "ru-RU",
  buttons: {
    message: "📝 Сообщение", interval: "⏱ Интервал", groups: "📋 Группы",
    sendNow: "📤 Отправить сейчас", start: "▶️ Запустить", stop: "⏹ Остановить",
    refresh: "🔄 Обновить", back: "⬅️ Назад", language: "🌐 Язык",
    contact: "📱 Отправить мой номер",
  },
  commands: {
    start: "Запустить бота", menu: "Главное меню", status: "Текущий статус",
    help: "Помощь", language: "Выбрать язык",
  },
  welcome: [
    "👋 <b>Здравствуйте!</b>", "",
    "Бот автоматически отправляет ваше сообщение в выбранные группы с заданным интервалом.", "",
    "<b>Как это работает:</b>",
    "1️⃣ Добавьте бота в группу и разрешите отправку сообщений",
    "2️⃣ Введите сообщение через кнопку 📝",
    "3️⃣ Нажмите ▶️ <b>Запустить</b> — бот будет отправлять его каждые 60 минут",
  ].join("\n"),
  help: [
    "<b>Команды</b>", "", "/start — запустить бота", "/menu — главное меню",
    "/status — текущие настройки", "/language — выбрать язык", "/help — помощь", "",
    "Сообщения отправляются каждые 60 минут.",
  ].join("\n"),
  languageTitle: "🌐 <b>Выберите язык</b>",
  languageChanged: "✅ Язык изменён.",
  contactNotYours: "⚠️ Отправьте только свой контакт Telegram.",
  accessDetailsMismatch: "⛔️ Администратор не разрешил этот номер телефона.",
  accessGranted: "✅ Доступ подтверждён. Ботом можно пользоваться.",
  accessRevoked: "⛔️ Ваш доступ к боту неактивен.",
  noGroups: "⚠️ Сначала добавьте бота хотя бы в одну группу.",
  noMessage: "⚠️ Сначала задайте текст через кнопку 📝 Сообщение.",
  started: "▶️ Запущено. Сообщения будут отправляться по расписанию.",
  stopped: "⏹ Остановлено.",
  messageSaved: "✅ Сообщение сохранено.",
  invalidMessage: "⚠️ Сообщение не должно быть пустым или превышать допустимую длину.",
  invalidInterval: `⚠️ Отправьте число от ${MIN_BROADCAST_INTERVAL_MINUTES} до ${MAX_BROADCAST_INTERVAL_MINUTES}.`,
  sending: "📤 Отправка...",
  serverError: "⚠️ Временная ошибка сервера. Попробуйте ещё раз немного позже.",
  minuteShort: "мин",
  accessDenied: (payment) => [
    "🔒 <b>Для этого номера телефона доступ не выдан</b>", "",
    `Стоимость доступа на один месяц: <b>${payment.monthlyPriceUzs.toLocaleString("ru-RU")} сум</b>.`,
    `Чтобы получить доступ, свяжитесь с ${escapeHtml(payment.adminContact)}.`, "",
    "После выдачи доступа отправьте свой контакт кнопкой ниже.",
  ].join("\n"),
  statusCard: (subscriber, chatCount) => {
    const state = subscriber.active ? "🟢 Работает" : "⚪️ Остановлено";
    const message = subscriber.message === null ? "<i>ещё не задано</i>" : escapeHtml(preview(subscriber.message));
    return [
      "<b>📊 Статус</b>", "", `Режим: ${state}`, `Группы: <b>${chatCount}</b>`,
      `Интервал: каждые <b>${subscriber.intervalMinutes}</b> мин`,
      `Следующая: ${clock(subscriber.nextRunAt, "ru-RU")}`,
      `Последняя: ${clock(subscriber.lastRunAt, "ru-RU")}`, "", "<b>📝 Сообщение:</b>", message,
    ].join("\n");
  },
  groupList: (chats) => chats.length === 0
    ? ["📋 <b>Групп нет</b>", "", "Добавьте бота в группу — она появится здесь автоматически.", "Разрешите боту отправлять сообщения."].join("\n")
    : [`📋 <b>Групп: ${chats.length}</b>`, "", ...chats.map((chat, i) => `${i + 1}. ${escapeHtml(chat.title)}`)].join("\n"),
  askMessage: (current) => [
    "📝 <b>Введите сообщение для отправки.</b>", "",
    current === null ? "<i>Сообщение ещё не задано.</i>" : `Сейчас: <i>${escapeHtml(preview(current))}</i>`, "",
    "Следующее сообщение будет сохранено как текст рассылки.",
  ].join("\n"),
  askInterval: (current) => [
    "⏱ <b>Какой интервал установить?</b>", "", `Сейчас: <b>${current}</b> мин`,
    `Допустимо: ${MIN_BROADCAST_INTERVAL_MINUTES}–${MAX_BROADCAST_INTERVAL_MINUTES}`, "",
    "Выберите кнопку или отправьте число.",
  ].join("\n"),
  intervalSaved: (minutes) => `✅ Интервал установлен: ${minutes} мин.`,
  groupAdded: (title) => `✅ Группа <b>${escapeHtml(title)}</b> добавлена.`,
  groupRemoved: (title) => `➖ Группа <b>${escapeHtml(title)}</b> удалена из списка.`,
  broadcastReport: (result) => report("ru", result, {
    title: "📤 Отправлено", success: "Успешно", failed: "Ошибок",
    failedGroups: "Неотправленные группы", reason: "Причина", action: "Решение",
    more: (count) => `…ещё ${count}`,
  }),
};

const en: BotTexts = {
  locale: "en-GB",
  buttons: {
    message: "📝 Message", interval: "⏱ Interval", groups: "📋 Groups",
    sendNow: "📤 Send now", start: "▶️ Start", stop: "⏹ Stop",
    refresh: "🔄 Refresh", back: "⬅️ Back", language: "🌐 Language",
    contact: "📱 Share my phone number",
  },
  commands: {
    start: "Start the bot", menu: "Main menu", status: "Current status",
    help: "Help", language: "Choose language",
  },
  welcome: [
    "👋 <b>Welcome!</b>", "",
    "This bot automatically sends your message to selected groups at a chosen interval.", "",
    "<b>How it works:</b>",
    "1️⃣ Add the bot to a group and allow it to send messages",
    "2️⃣ Enter your message with the 📝 button",
    "3️⃣ Press ▶️ <b>Start</b> — the bot will send it every 60 minutes",
  ].join("\n"),
  help: [
    "<b>Commands</b>", "", "/start — start the bot", "/menu — main menu",
    "/status — current settings", "/language — choose language", "/help — help", "",
    "Messages are sent every 60 minutes.",
  ].join("\n"),
  languageTitle: "🌐 <b>Choose a language</b>",
  languageChanged: "✅ Language changed.",
  contactNotYours: "⚠️ Please share only your own Telegram contact.",
  accessDetailsMismatch: "⛔️ The admin has not allowed this phone number.",
  accessGranted: "✅ Access confirmed. You can now use the bot.",
  accessRevoked: "⛔️ Your access to the bot is not active.",
  noGroups: "⚠️ First add the bot to at least one group.",
  noMessage: "⚠️ First set a message using the 📝 Message button.",
  started: "▶️ Started. Messages will be sent on schedule.",
  stopped: "⏹ Stopped.",
  messageSaved: "✅ Message saved.",
  invalidMessage: "⚠️ The message cannot be empty or exceed the allowed length.",
  invalidInterval: `⚠️ Send a number between ${MIN_BROADCAST_INTERVAL_MINUTES} and ${MAX_BROADCAST_INTERVAL_MINUTES}.`,
  sending: "📤 Sending...",
  serverError: "⚠️ A temporary server error occurred. Please try again a little later.",
  minuteShort: "min",
  accessDenied: (payment) => [
    "🔒 <b>Access has not been granted for this phone number</b>", "",
    `One month of access costs <b>${payment.monthlyPriceUzs.toLocaleString("en-US")} UZS</b>.`,
    `Contact ${escapeHtml(payment.adminContact)} to get access.`, "",
    "After the admin grants access, share your contact using the button below.",
  ].join("\n"),
  statusCard: (subscriber, chatCount) => {
    const state = subscriber.active ? "🟢 Running" : "⚪️ Stopped";
    const message = subscriber.message === null ? "<i>not set yet</i>" : escapeHtml(preview(subscriber.message));
    return [
      "<b>📊 Status</b>", "", `Mode: ${state}`, `Groups: <b>${chatCount}</b>`,
      `Interval: every <b>${subscriber.intervalMinutes}</b> min`,
      `Next: ${clock(subscriber.nextRunAt, "en-GB")}`,
      `Last: ${clock(subscriber.lastRunAt, "en-GB")}`, "", "<b>📝 Message:</b>", message,
    ].join("\n");
  },
  groupList: (chats) => chats.length === 0
    ? ["📋 <b>No groups</b>", "", "Add the bot to a group and it will appear here automatically.", "Allow the bot to send messages."].join("\n")
    : [`📋 <b>${chats.length} groups</b>`, "", ...chats.map((chat, i) => `${i + 1}. ${escapeHtml(chat.title)}`)].join("\n"),
  askMessage: (current) => [
    "📝 <b>Enter the message to send.</b>", "",
    current === null ? "<i>No message has been set.</i>" : `Current: <i>${escapeHtml(preview(current))}</i>`, "",
    "Your next message will be saved as the broadcast text.",
  ].join("\n"),
  askInterval: (current) => [
    "⏱ <b>What interval should be used?</b>", "", `Current: <b>${current}</b> min`,
    `Allowed: ${MIN_BROADCAST_INTERVAL_MINUTES}–${MAX_BROADCAST_INTERVAL_MINUTES}`, "",
    "Choose a button or send a number.",
  ].join("\n"),
  intervalSaved: (minutes) => `✅ Interval set to ${minutes} minutes.`,
  groupAdded: (title) => `✅ Group <b>${escapeHtml(title)}</b> added.`,
  groupRemoved: (title) => `➖ Group <b>${escapeHtml(title)}</b> removed from the list.`,
  broadcastReport: (result) => report("en", result, {
    title: "📤 Sent", success: "Successful", failed: "Failed",
    failedGroups: "Groups not reached", reason: "Reason", action: "Solution",
    more: (count) => `…${count} more`,
  }),
};

const catalogs = { uz, ru, en } as const satisfies Readonly<Record<BotLanguage, BotTexts>>;

export const getTexts = (language: BotLanguage): BotTexts => catalogs[language];

export const detectLanguage = (languageCode: string | undefined): BotLanguage => {
  const code = languageCode?.toLowerCase() ?? "";
  if (code.startsWith("ru")) return "ru";
  if (code.startsWith("en")) return "en";
  return "uz";
};

export const broadcastReport = (
  result: BroadcastResult,
  language: BotLanguage = "uz",
): string => getTexts(language).broadcastReport(result);
