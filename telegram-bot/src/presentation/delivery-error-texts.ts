import type { BotLanguage, DeliveryErrorCode } from "@domain";

export interface LocalizedDeliveryError {
  readonly reason: string;
  readonly action: string;
}

type DeliveryErrorCatalog = Readonly<
  Record<DeliveryErrorCode, LocalizedDeliveryError>
>;

const uz = {
  "account-write-forbidden": { reason: "Ishchi account bu guruhga xabar yoza olmaydi.", action: "Accountga yozish huquqini bering yoki guruh cheklovlarini tekshiring." },
  "account-not-member": { reason: "Ishchi account bu guruh a’zosi emas yoki guruh yopilgan.", action: "Accountni guruhga qayta qo‘shing." },
  "account-restricted": { reason: "Telegram ishchi accountning yuborishini vaqtincha chekladi.", action: "Tarqatishni to‘xtating, account cheklovini tekshiring va keyinroq davom eting." },
  "send-rights-missing": { reason: "Bot bu chatda xabar yuborish huquqiga ega emas.", action: "Botga xabar yuborish huquqini bering va uni qayta qo‘shing." },
  "bot-kicked": { reason: "Bot guruhdan chiqarib yuborilgan.", action: "Botni guruhga qayta qo‘shib, xabar yuborish huquqini bering." },
  "bot-not-member": { reason: "Bot hozir bu guruhning a’zosi emas.", action: "Botni guruhga qayta qo‘shing." },
  "chat-not-found": { reason: "Telegram chatni topa olmadi.", action: "Chat mavjudligini tekshiring va botni qayta qo‘shing." },
  "chat-migrated": { reason: "Guruh superguruhga aylantirilgan, eski manzil ishlamaydi.", action: "Botni yangi superguruhdan chiqarib, qayta qo‘shing." },
  "chat-deactivated": { reason: "Guruh o‘chirilgan yoki faoliyati to‘xtatilgan.", action: "Boshqa faol guruhdan foydalaning." },
  "chat-restricted": { reason: "Telegram bu chat faoliyatini cheklagan.", action: "Guruh egasi cheklovni hal qilishi yoki boshqa guruhdan foydalanishi kerak." },
  "bot-blocked": { reason: "Foydalanuvchi botni bloklagan.", action: "Botni blokdan chiqaring va /start buyrug‘ini yuboring." },
  "user-deactivated": { reason: "Telegram akkaunti o‘chirilgan yoki faol emas.", action: "Faol Telegram akkauntidan foydalaning." },
  "user-not-found": { reason: "Telegram foydalanuvchini topa olmadi.", action: "Foydalanuvchi botga /start yuborganini tekshiring." },
  "peer-invalid": { reason: "Chat identifikatori noto‘g‘ri yoki bot chatni hali ko‘rmagan.", action: "Botni chatga qayta qo‘shib, kerakli ruxsatlarni bering." },
  "admin-required": { reason: "Bu amal uchun bot administrator bo‘lishi kerak.", action: "Botni administrator qiling va kerakli huquqlarni yoqing." },
  "topic-closed": { reason: "Xabar yuboriladigan forum mavzusi yopilgan.", action: "Mavzuni oching yoki boshqa mavzuni tanlang." },
  "topic-not-found": { reason: "Forum mavzusi topilmadi yoki o‘chirilgan.", action: "Mavjud mavzudan foydalaning yoki botni qayta qo‘shing." },
  "message-empty": { reason: "Yuboriladigan xabar bo‘sh.", action: "📝 Xabar tugmasi orqali matn kiriting." },
  "message-too-long": { reason: "Xabar Telegram limitidan uzun.", action: "Xabarni 4096 belgidan qisqaroq qiling." },
  "entity-parse": { reason: "Telegram xabardagi formatlash belgilarini o‘qiy olmadi.", action: "Noto‘g‘ri HTML/Markdown belgilarini olib tashlang." },
  "rate-limited": { reason: "Telegram juda ko‘p so‘rov yuborilganini aniqladi.", action: "Biroz kuting yoki yuborish intervalini kattalashtiring." },
  "request-timeout": { reason: "Telegram serveri vaqtida javob bermadi.", action: "Internetni tekshiring; bot keyin yana urinadi." },
  "network-unavailable": { reason: "Telegram serveriga ulanib bo‘lmadi.", action: "Server internetini tekshiring; bot keyin yana urinadi." },
  "connection-reset": { reason: "Telegram bilan ulanish uzilib qoldi.", action: "Bu vaqtinchalik xato; bot keyin yana urinadi." },
  "telegram-server-error": { reason: "Telegram serverida vaqtinchalik nosozlik bor.", action: "Biroz kuting; bot keyin yana urinadi." },
  "bad-request": { reason: "Telegram yuborilgan so‘rovni qabul qilmadi.", action: "Xabar va guruh sozlamalarini tekshiring; muammo qolsa adminga yozing." },
  "forbidden": { reason: "Telegram botga bu chatda amal bajarishni taqiqladi.", action: "Botning chatdagi holati va ruxsatlarini tekshiring." },
  "unauthorized": { reason: "Bot Telegram serverida avtorizatsiyadan o‘tmadi.", action: "Admin bot sozlamalarini tekshirishi kerak." },
  "conflict": { reason: "Botning boshqa nusxasi ham ishlayapti.", action: "Admin ortiqcha bot jarayonini to‘xtatishi kerak." },
  "unknown": { reason: "Kutilmagan texnik xato yuz berdi.", action: "Keyinroq urinib ko‘ring; takrorlansa adminga xabar bering." },
} as const satisfies DeliveryErrorCatalog;

const ru = {
  "account-write-forbidden": { reason: "Рабочий аккаунт не может отправлять сообщения в эту группу.", action: "Разрешите аккаунту писать или проверьте ограничения группы." },
  "account-not-member": { reason: "Рабочий аккаунт не состоит в группе или группа закрыта.", action: "Добавьте аккаунт в группу заново." },
  "account-restricted": { reason: "Telegram временно ограничил отправку с рабочего аккаунта.", action: "Остановите рассылку, проверьте ограничения аккаунта и продолжите позже." },
  "send-rights-missing": { reason: "У бота нет права отправлять сообщения в этот чат.", action: "Разрешите боту отправлять сообщения и добавьте его заново." },
  "bot-kicked": { reason: "Бота удалили из группы.", action: "Добавьте бота снова и разрешите отправку сообщений." },
  "bot-not-member": { reason: "Бот больше не состоит в этой группе.", action: "Добавьте бота в группу заново." },
  "chat-not-found": { reason: "Telegram не смог найти чат.", action: "Проверьте чат и добавьте бота заново." },
  "chat-migrated": { reason: "Группа стала супергруппой, старый адрес не работает.", action: "Удалите бота из новой супергруппы и добавьте снова." },
  "chat-deactivated": { reason: "Группа удалена или деактивирована.", action: "Используйте другую активную группу." },
  "chat-restricted": { reason: "Telegram ограничил работу этого чата.", action: "Владелец группы должен снять ограничение или выбрать другую группу." },
  "bot-blocked": { reason: "Пользователь заблокировал бота.", action: "Разблокируйте бота и отправьте /start." },
  "user-deactivated": { reason: "Аккаунт Telegram удалён или неактивен.", action: "Используйте активный аккаунт Telegram." },
  "user-not-found": { reason: "Telegram не смог найти пользователя.", action: "Проверьте, что пользователь отправил боту /start." },
  "peer-invalid": { reason: "Неверный идентификатор чата или бот ещё не видел этот чат.", action: "Добавьте бота заново и выдайте необходимые права." },
  "admin-required": { reason: "Для этого действия бот должен быть администратором.", action: "Назначьте бота администратором и включите нужные права." },
  "topic-closed": { reason: "Тема форума, куда отправляется сообщение, закрыта.", action: "Откройте тему или выберите другую." },
  "topic-not-found": { reason: "Тема форума не найдена или удалена.", action: "Выберите существующую тему или добавьте бота заново." },
  "message-empty": { reason: "Сообщение для отправки пустое.", action: "Введите текст через кнопку 📝 Сообщение." },
  "message-too-long": { reason: "Сообщение длиннее лимита Telegram.", action: "Сократите сообщение до 4096 символов." },
  "entity-parse": { reason: "Telegram не смог обработать форматирование сообщения.", action: "Удалите некорректную HTML/Markdown-разметку." },
  "rate-limited": { reason: "Telegram получил слишком много запросов.", action: "Немного подождите или увеличьте интервал отправки." },
  "request-timeout": { reason: "Telegram не ответил вовремя.", action: "Проверьте интернет; бот повторит попытку позже." },
  "network-unavailable": { reason: "Не удалось подключиться к Telegram.", action: "Проверьте интернет на сервере; бот повторит попытку позже." },
  "connection-reset": { reason: "Соединение с Telegram было прервано.", action: "Это временная ошибка; бот повторит попытку позже." },
  "telegram-server-error": { reason: "На сервере Telegram временная ошибка.", action: "Подождите; бот повторит попытку позже." },
  "bad-request": { reason: "Telegram отклонил отправленный запрос.", action: "Проверьте сообщение и настройки группы; если ошибка повторится, напишите администратору." },
  "forbidden": { reason: "Telegram запретил боту это действие в чате.", action: "Проверьте статус и права бота в чате." },
  "unauthorized": { reason: "Бот не прошёл авторизацию в Telegram.", action: "Администратор должен проверить настройки бота." },
  "conflict": { reason: "Одновременно работает другая копия бота.", action: "Администратор должен остановить лишний процесс бота." },
  "unknown": { reason: "Произошла непредвиденная техническая ошибка.", action: "Попробуйте позже; если ошибка повторится, сообщите администратору." },
} as const satisfies DeliveryErrorCatalog;

const en = {
  "account-write-forbidden": { reason: "The work account cannot send messages to this group.", action: "Allow the account to post or check the group restrictions." },
  "account-not-member": { reason: "The work account is not a member or the group is private.", action: "Add the account to the group again." },
  "account-restricted": { reason: "Telegram temporarily restricted sending from the work account.", action: "Stop the broadcast, check the account restriction, and continue later." },
  "send-rights-missing": { reason: "The bot cannot send messages in this chat.", action: "Grant permission to send messages, then add the bot again." },
  "bot-kicked": { reason: "The bot was removed from the group.", action: "Add the bot again and allow it to send messages." },
  "bot-not-member": { reason: "The bot is no longer a member of this group.", action: "Add the bot to the group again." },
  "chat-not-found": { reason: "Telegram could not find the chat.", action: "Check the chat and add the bot again." },
  "chat-migrated": { reason: "The group became a supergroup and its old address no longer works.", action: "Remove the bot from the new supergroup and add it again." },
  "chat-deactivated": { reason: "The group was deleted or deactivated.", action: "Use another active group." },
  "chat-restricted": { reason: "Telegram restricted this chat.", action: "The group owner must resolve the restriction or use another group." },
  "bot-blocked": { reason: "The user blocked the bot.", action: "Unblock the bot and send /start." },
  "user-deactivated": { reason: "The Telegram account was deleted or is inactive.", action: "Use an active Telegram account." },
  "user-not-found": { reason: "Telegram could not find the user.", action: "Make sure the user has sent /start to the bot." },
  "peer-invalid": { reason: "The chat ID is invalid or the bot has not seen this chat.", action: "Add the bot again and grant the required permissions." },
  "admin-required": { reason: "The bot must be an administrator for this action.", action: "Make the bot an administrator and enable the required rights." },
  "topic-closed": { reason: "The forum topic receiving the message is closed.", action: "Reopen the topic or choose another one." },
  "topic-not-found": { reason: "The forum topic was not found or was deleted.", action: "Use an existing topic or add the bot again." },
  "message-empty": { reason: "The message to send is empty.", action: "Enter text using the 📝 Message button." },
  "message-too-long": { reason: "The message exceeds Telegram’s limit.", action: "Shorten the message to no more than 4096 characters." },
  "entity-parse": { reason: "Telegram could not parse the message formatting.", action: "Remove invalid HTML or Markdown formatting." },
  "rate-limited": { reason: "Telegram received too many requests.", action: "Wait a little or increase the sending interval." },
  "request-timeout": { reason: "Telegram did not respond in time.", action: "Check the internet connection; the bot will retry later." },
  "network-unavailable": { reason: "The server could not connect to Telegram.", action: "Check the server internet connection; the bot will retry later." },
  "connection-reset": { reason: "The connection to Telegram was interrupted.", action: "This is temporary; the bot will retry later." },
  "telegram-server-error": { reason: "Telegram is experiencing a temporary server error.", action: "Please wait; the bot will retry later." },
  "bad-request": { reason: "Telegram rejected the request.", action: "Check the message and group settings; contact the admin if it continues." },
  "forbidden": { reason: "Telegram forbids the bot from performing this action in the chat.", action: "Check the bot’s status and permissions in the chat." },
  "unauthorized": { reason: "The bot could not authenticate with Telegram.", action: "The administrator must check the bot configuration." },
  "conflict": { reason: "Another copy of the bot is running at the same time.", action: "The administrator must stop the extra bot process." },
  "unknown": { reason: "An unexpected technical error occurred.", action: "Try again later; contact the administrator if it continues." },
} as const satisfies DeliveryErrorCatalog;

const catalogs = { uz, ru, en } as const satisfies Readonly<
  Record<BotLanguage, DeliveryErrorCatalog>
>;

export const deliveryErrorText = (
  language: BotLanguage,
  code: DeliveryErrorCode,
): LocalizedDeliveryError => catalogs[language][code];
