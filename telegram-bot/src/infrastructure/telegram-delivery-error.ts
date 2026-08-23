import { GrammyError, HttpError } from "grammy";
import type { DeliveryErrorCode, DeliveryErrorExplanation } from "@domain";

interface DeliveryErrorRule extends DeliveryErrorExplanation {
  readonly patterns: readonly string[];
  readonly permanent: boolean;
}

export interface ClassifiedDeliveryError extends DeliveryErrorExplanation {
  readonly permanent: boolean;
}

const RULES = [
  {
    code: "send-rights-missing",
    patterns: ["not enough rights to send", "have no rights to send", "chat_write_forbidden", "not allowed to send text messages", "can't send messages to"],
    reason: "Bot bu chatda xabar yuborish huquqiga ega emas.",
    action: "Botga “Send messages” yoki kanalda “Post messages” huquqini bering, keyin botni qayta qo‘shing.",
    permanent: true,
  },
  {
    code: "bot-kicked",
    patterns: ["bot was kicked", "bot was removed"],
    reason: "Bot guruhdan chiqarib yuborilgan.",
    action: "Botni guruhga qayta qo‘shing va xabar yuborish huquqini bering.",
    permanent: true,
  },
  {
    code: "bot-not-member",
    patterns: ["bot is not a member", "bot is not part of the chat"],
    reason: "Bot hozir bu guruhning a’zosi emas.",
    action: "Botni guruhga qo‘shing; guruh avtomatik ravishda ro‘yxatga qaytadi.",
    permanent: true,
  },
  {
    code: "chat-not-found",
    patterns: ["chat not found"],
    reason: "Telegram chatni topa olmadi: chat o‘chirilgan yoki bot undan chiqarilgan bo‘lishi mumkin.",
    action: "Chat mavjudligini tekshiring va botni qayta qo‘shing.",
    permanent: true,
  },
  {
    code: "chat-migrated",
    patterns: ["group chat was upgraded", "migrate_to_chat_id", "migrated to a supergroup"],
    reason: "Guruh superguruhga aylantirilgan va eski manzil ishlamaydi.",
    action: "Botni yangi superguruhdan chiqarib, qayta qo‘shing.",
    permanent: true,
  },
  {
    code: "chat-deactivated",
    patterns: ["group is deactivated", "chat is deactivated"],
    reason: "Bu guruh Telegram tomonidan o‘chirilgan yoki faoliyati to‘xtatilgan.",
    action: "Boshqa faol guruhdan foydalaning.",
    permanent: true,
  },
  {
    code: "chat-restricted",
    patterns: ["chat_restricted", "chat is restricted"],
    reason: "Telegram bu chat faoliyatini cheklagan.",
    action: "Guruh egasi Telegram cheklovini hal qilishi yoki boshqa guruhdan foydalanishi kerak.",
    permanent: true,
  },
  {
    code: "bot-blocked",
    patterns: ["bot was blocked by the user", "bot blocked by user"],
    reason: "Foydalanuvchi botni bloklagan.",
    action: "Botni blokdan chiqaring va /start buyrug‘ini qayta yuboring.",
    permanent: true,
  },
  {
    code: "user-deactivated",
    patterns: ["user is deactivated", "input_user_deactivated"],
    reason: "Telegram akkaunti o‘chirilgan yoki faol emas.",
    action: "Faol Telegram akkauntidan foydalaning.",
    permanent: true,
  },
  {
    code: "user-not-found",
    patterns: ["user not found"],
    reason: "Telegram foydalanuvchini topa olmadi.",
    action: "Foydalanuvchi botga /start yuborganini va akkaunti faol ekanini tekshiring.",
    permanent: true,
  },
  {
    code: "peer-invalid",
    patterns: ["peer_id_invalid", "peer id invalid"],
    reason: "Chat identifikatori noto‘g‘ri yoki bot bu chatni hali ko‘rmagan.",
    action: "Botni chatga qayta qo‘shing va chat ichida unga ruxsat bering.",
    permanent: true,
  },
  {
    code: "admin-required",
    patterns: ["chat_admin_required", "not enough rights to manage"],
    reason: "Bu amal uchun bot administrator bo‘lishi kerak.",
    action: "Botni administrator qiling va kerakli huquqlarni yoqing.",
    permanent: true,
  },
  {
    code: "topic-closed",
    patterns: ["topic_closed", "topic is closed"],
    reason: "Xabar yuborilayotgan forum mavzusi yopilgan.",
    action: "Mavzuni qayta oching yoki boshqa ochiq mavzuni tanlang.",
    permanent: false,
  },
  {
    code: "topic-not-found",
    patterns: ["message thread not found", "topic not found"],
    reason: "Forum mavzusi topilmadi yoki o‘chirilgan.",
    action: "Botni guruhga qayta qo‘shing yoki mavjud mavzudan foydalaning.",
    permanent: false,
  },
  {
    code: "message-empty",
    patterns: ["message text is empty", "message must be non-empty"],
    reason: "Yuboriladigan xabar bo‘sh.",
    action: "📝 Xabar tugmasi orqali matn kiriting.",
    permanent: false,
  },
  {
    code: "message-too-long",
    patterns: ["message is too long", "text is too long"],
    reason: "Xabar Telegram ruxsat bergan uzunlikdan oshib ketgan.",
    action: "Xabarni qisqartiring; matn 4096 belgidan oshmasin.",
    permanent: false,
  },
  {
    code: "entity-parse",
    patterns: ["can't parse entities", "cant parse entities", "entity parsing"],
    reason: "Xabardagi formatlash belgilarini Telegram o‘qiy olmadi.",
    action: "Noto‘g‘ri HTML/Markdown belgilarini olib tashlab, oddiy matn yuboring.",
    permanent: false,
  },
  {
    code: "rate-limited",
    patterns: ["too many requests", "retry after", "flood control exceeded"],
    reason: "Telegram juda ko‘p so‘rov yuborilganini aniqladi.",
    action: "Biroz kuting yoki yuborish intervalini kattalashtiring; bot keyingi intervalda yana urinadi.",
    permanent: false,
  },
  {
    code: "request-timeout",
    patterns: ["request timeout", "timed out", "etimedout", "gateway timeout"],
    reason: "Telegram serveri vaqtida javob bermadi.",
    action: "Internetni tekshiring; bot keyingi intervalda avtomatik yana urinadi.",
    permanent: false,
  },
  {
    code: "network-unavailable",
    patterns: ["fetch failed", "network error", "enotfound", "eai_again", "internet connection"],
    reason: "Telegram serveriga internet orqali ulanib bo‘lmadi.",
    action: "Server internetini tekshiring; ulanish tiklangach bot yana urinadi.",
    permanent: false,
  },
  {
    code: "connection-reset",
    patterns: ["econnreset", "socket hang up", "connection reset", "broken pipe"],
    reason: "Telegram bilan ulanish yuborish vaqtida uzilib qoldi.",
    action: "Bu vaqtinchalik xato; bot keyingi intervalda yana urinadi.",
    permanent: false,
  },
] as const satisfies readonly DeliveryErrorRule[];

const fromCode = (
  code: DeliveryErrorCode,
  reason: string,
  action: string,
  permanent: boolean,
): ClassifiedDeliveryError => ({ code, reason, action, permanent });

const errorText = (error: unknown): string => {
  if (error instanceof HttpError) {
    const nested = error.error instanceof Error ? error.error.message : String(error.error);
    return `${error.message} ${nested}`;
  }
  return error instanceof Error ? error.message : String(error);
};

export const explainDeliveryError = (error: unknown): ClassifiedDeliveryError => {
  const technical = error instanceof GrammyError ? error.description : errorText(error);
  const normalized = technical.toLowerCase();
  const matched = RULES.find((rule) =>
    rule.patterns.some((pattern) => normalized.includes(pattern))
  );
  if (matched) {
    if (matched.code === "rate-limited" && error instanceof GrammyError) {
      const retryAfter = error.parameters.retry_after;
      if (typeof retryAfter === "number") {
        return {
          ...matched,
          action: `${retryAfter} soniya kuting yoki intervalni kattalashtiring; bot keyin yana urinadi.`,
        };
      }
    }
    return matched;
  }

  if (error instanceof GrammyError) {
    if (error.error_code === 429) {
      return fromCode("rate-limited", "Telegram so‘rovlar limitini vaqtincha chekladi.", "Biroz kuting yoki yuborish intervalini kattalashtiring.", false);
    }
    if (error.error_code === 401) {
      return fromCode("unauthorized", "Bot tokeni Telegram tomonidan qabul qilinmadi.", "Admin BOT_TOKEN qiymatini BotFather orqali yangilashi kerak.", false);
    }
    if (error.error_code === 409) {
      return fromCode("conflict", "Botning boshqa nusxasi ham bir vaqtda ishlayapti.", "Admin ortiqcha bot processini to‘xtatishi kerak.", false);
    }
    if (error.error_code >= 500) {
      return fromCode("telegram-server-error", "Telegram serverida vaqtinchalik nosozlik yuz berdi.", "Biroz kuting; bot keyingi intervalda yana urinadi.", false);
    }
    if (error.error_code === 403) {
      return fromCode("forbidden", "Telegram botga bu chatda amal bajarishni taqiqladi.", "Botning chatdagi holati va ruxsatlarini tekshirib, uni qayta qo‘shing.", true);
    }
    if (error.error_code === 400) {
      return fromCode("bad-request", "Telegram yuborilgan so‘rovni noto‘g‘ri deb topdi.", "Xabar matni va guruh sozlamalarini tekshiring; muammo qolsa adminga murojaat qiling.", false);
    }
  }

  if (error instanceof HttpError) {
    return fromCode("network-unavailable", "Telegram serveriga ulanishda tarmoq xatosi yuz berdi.", "Internet va server ulanishini tekshiring; bot keyin yana urinadi.", false);
  }

  return fromCode("unknown", "Kutilmagan texnik xato yuz berdi.", "Birozdan keyin qayta urinib ko‘ring; takrorlansa adminga xabar bering.", false);
};
