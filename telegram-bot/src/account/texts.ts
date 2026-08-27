import type { BotLanguage } from "@domain";

export interface AccountControllerTexts {
  readonly ready: string;
  readonly languageTitle: string;
  readonly languageChanged: string;
  readonly denied: string;
  readonly accessPrompt: string;
  readonly contactButton: string;
  readonly contactNotYours: string;
  readonly accessDetailsMismatch: string;
  readonly accessGranted: string;
  readonly help: string;
  readonly loadingGroups: string;
  readonly noGroups: string;
  readonly alreadyRunning: string;
  readonly canceled: string;
  readonly cancelRequested: string;
  readonly onlyText: string;
  readonly accountUnavailable: string;
  readonly accountNotConfigured: string;
  readonly menuGroups: string;
  readonly menuLanguage: string;
  readonly menuHelp: string;
  readonly menuCancel: string;
  readonly noLastReport: string;
  groups(count: number): string;
  progress(done: number, total: number, sent: number, failed: number): string;
  summary(total: number, skipped: number, seconds: number): string;
  scheduled(minutes: number): string;
  sentReportButton(count: number): string;
  failedReportButton(count: number): string;
  sentGroupsTitle(count: number): string;
  failedGroupsTitle(count: number): string;
}

const catalogs = {
  uz: {
    ready: "✅ Job accountingiz ulandi. Xabar yuboring — hozir tarqataman va keyin belgilangan intervalda takrorlayman.",
    languageTitle: "🌐 Tilni tanlang:",
    languageChanged: "✅ Til o‘zbekchaga o‘zgartirildi.",
    denied: "⛔️ Sizga botdan foydalanish ruxsati berilmagan.",
    accessPrompt: "Admin panelda username yoki telefon raqamingizga ruxsat berilgach, kontaktingizni yuboring.",
    contactButton: "📱 Telefon raqamimni yuborish",
    contactNotYours: "⚠️ Faqat o‘zingizning Telegram kontaktingizni yuboring.",
    accessDetailsMismatch: "⛔️ Bu telefon raqamiga admin tomonidan ruxsat berilmagan yoki ma’lumotlar mos kelmadi.",
    accessGranted: "✅ Ruxsat tasdiqlandi. Endi botdan foydalanishingiz mumkin.",
    help: "Xabar matnini yuboring — job accountingiz uni o‘zi a’zo bo‘lgan barcha guruhlarga yuboradi va avtomatik takrorlaydi.\n\n/groups — guruhlar soni\n/cancel — joriy va rejalashtirilgan tarqatishni to‘xtatish\n/language — tilni tanlash",
    loadingGroups: "🔎 Guruhlar olinmoqda...",
    noGroups: "⚠️ Ishchi accountda yuborish uchun guruh topilmadi.",
    alreadyRunning: "⚠️ Job accountingizda tarqatish ishlayapti. Tugashini kuting yoki /cancel bosing.",
    canceled: "⏹ Tarqatish to‘xtatildi.",
    cancelRequested: "⏹ To‘xtatish so‘rovi qabul qilindi.",
    onlyText: "⚠️ Hozircha faqat matnli xabar yuborish mumkin.",
    accountUnavailable: "⚠️ Ishchi Telegram account bilan ulanishda xato yuz berdi.",
    accountNotConfigured: "⚠️ Bu job account uchun Telegram session sozlanmagan. Adminga murojaat qiling.",
    menuGroups: "👥 Guruhlar",
    menuLanguage: "🌐 Til",
    menuHelp: "ℹ️ Yordam",
    menuCancel: "⛔ To‘xtatish",
    noLastReport: "📭 Hali tarqatish hisoboti yo‘q.",
    groups: (count) => `👥 Ishchi accountdagi guruhlar: ${count}`,
    progress: (done, total, sent, failed) => `📤 Tarqatilmoqda: ${done}/${total}\n✅ ${sent}   ❌ ${failed}`,
    summary: (total, skipped, seconds) => `📋 Jami: ${total}\n⏭ Qolgan: ${skipped}\n⏱ Vaqt: ${seconds} soniya`,
    scheduled: (minutes) => `🔁 Keyingi yuborish ${minutes} daqiqadan keyin.`,
    sentReportButton: (count) => `✅ Yuborildi: ${count}`,
    failedReportButton: (count) => `❌ Yuborilmadi: ${count}`,
    sentGroupsTitle: (count) => `✅ Yuborilgan guruhlar (${count})`,
    failedGroupsTitle: (count) => `❌ Yuborilmagan guruhlar (${count})`,
  },
  ru: {
    ready: "✅ Рабочий аккаунт подключён. Отправьте сообщение — оно уйдёт сейчас и будет повторяться по расписанию.",
    languageTitle: "🌐 Выберите язык:",
    languageChanged: "✅ Язык изменён на русский.",
    denied: "⛔️ У вас нет доступа к этому боту.",
    accessPrompt: "После разрешения username или номера телефона в админ-панели отправьте свой контакт.",
    contactButton: "📱 Отправить мой номер",
    contactNotYours: "⚠️ Отправьте только свой контакт Telegram.",
    accessDetailsMismatch: "⛔️ Администратор не разрешил этот номер или данные не совпадают.",
    accessGranted: "✅ Доступ подтверждён. Теперь можно пользоваться ботом.",
    help: "Отправьте текст — рабочий аккаунт разошлёт его во все свои группы и будет повторять автоматически.\n\n/groups — количество групп\n/cancel — остановить текущую и запланированную рассылку\n/language — выбрать язык",
    loadingGroups: "🔎 Получаю список групп...",
    noGroups: "⚠️ У рабочего аккаунта нет групп для отправки.",
    alreadyRunning: "⚠️ На вашем рабочем аккаунте уже выполняется рассылка. Дождитесь её окончания или нажмите /cancel.",
    canceled: "⏹ Рассылка остановлена.",
    cancelRequested: "⏹ Запрос на остановку принят.",
    onlyText: "⚠️ Пока поддерживаются только текстовые сообщения.",
    accountUnavailable: "⚠️ Ошибка подключения к рабочему Telegram-аккаунту.",
    accountNotConfigured: "⚠️ Для этого рабочего аккаунта не настроена Telegram-сессия. Обратитесь к администратору.",
    menuGroups: "👥 Группы",
    menuLanguage: "🌐 Язык",
    menuHelp: "ℹ️ Помощь",
    menuCancel: "⛔ Остановить",
    noLastReport: "📭 Отчёта о рассылке пока нет.",
    groups: (count) => `👥 Групп у рабочего аккаунта: ${count}`,
    progress: (done, total, sent, failed) => `📤 Рассылка: ${done}/${total}\n✅ ${sent}   ❌ ${failed}`,
    summary: (total, skipped, seconds) => `📋 Всего: ${total}\n⏭ Осталось: ${skipped}\n⏱ Время: ${seconds} сек.`,
    scheduled: (minutes) => `🔁 Следующая отправка через ${minutes} мин.`,
    sentReportButton: (count) => `✅ Отправлено: ${count}`,
    failedReportButton: (count) => `❌ Не отправлено: ${count}`,
    sentGroupsTitle: (count) => `✅ Отправлено в группы (${count})`,
    failedGroupsTitle: (count) => `❌ Не отправлено в группы (${count})`,
  },
  en: {
    ready: "✅ Work account connected. Send a message now and it will repeat on schedule.",
    languageTitle: "🌐 Choose a language:",
    languageChanged: "✅ Language changed to English.",
    denied: "⛔️ You do not have access to this bot.",
    accessPrompt: "After the admin allows your username or phone number, share your Telegram contact.",
    contactButton: "📱 Share my phone number",
    contactNotYours: "⚠️ Please share only your own Telegram contact.",
    accessDetailsMismatch: "⛔️ The admin has not allowed this phone number, or the details do not match.",
    accessGranted: "✅ Access confirmed. You can now use the bot.",
    help: "Send text and the work account will distribute it to all of its groups and repeat automatically.\n\n/groups — group count\n/cancel — stop the current and scheduled broadcast\n/language — choose a language",
    loadingGroups: "🔎 Loading groups...",
    noGroups: "⚠️ No groups were found on the work account.",
    alreadyRunning: "⚠️ A broadcast is already running on your work account. Wait for it or press /cancel.",
    canceled: "⏹ Broadcast stopped.",
    cancelRequested: "⏹ Stop request accepted.",
    onlyText: "⚠️ Only text messages are supported for now.",
    accountUnavailable: "⚠️ Could not connect to the work Telegram account.",
    accountNotConfigured: "⚠️ No Telegram session is configured for this work account. Contact the administrator.",
    menuGroups: "👥 Groups",
    menuLanguage: "🌐 Language",
    menuHelp: "ℹ️ Help",
    menuCancel: "⛔ Stop",
    noLastReport: "📭 There is no broadcast report yet.",
    groups: (count) => `👥 Groups on the work account: ${count}`,
    progress: (done, total, sent, failed) => `📤 Broadcasting: ${done}/${total}\n✅ ${sent}   ❌ ${failed}`,
    summary: (total, skipped, seconds) => `📋 Total: ${total}\n⏭ Remaining: ${skipped}\n⏱ Time: ${seconds} sec.`,
    scheduled: (minutes) => `🔁 Next send in ${minutes} minutes.`,
    sentReportButton: (count) => `✅ Sent: ${count}`,
    failedReportButton: (count) => `❌ Failed: ${count}`,
    sentGroupsTitle: (count) => `✅ Groups reached (${count})`,
    failedGroupsTitle: (count) => `❌ Groups not reached (${count})`,
  },
} as const satisfies Readonly<Record<BotLanguage, AccountControllerTexts>>;

export const getAccountTexts = (language: BotLanguage): AccountControllerTexts =>
  catalogs[language];
