import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";

const main = async (): Promise<void> => {
  const apiId = Number.parseInt(process.env.TELEGRAM_API_ID ?? "", 10);
  const apiHash = process.env.TELEGRAM_API_HASH?.trim() ?? "";
  if (!Number.isSafeInteger(apiId) || apiId <= 0 || !apiHash) {
    throw new Error("Avval .env ichiga TELEGRAM_API_ID va TELEGRAM_API_HASH yozing");
  }

  const prompt = createInterface({ input, output });
  const session = new StringSession("");
  const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
  try {
    await client.start({
      phoneNumber: () => prompt.question("Telefon (+998...): "),
      phoneCode: () => prompt.question("Telegram kodi: "),
      password: () => prompt.question("2FA parol (bo'lmasa Enter): "),
      onError: (error) => console.error("Login xatosi:", error.message),
    });
    console.log("\nTELEGRAM_ACCOUNT_SESSION qiymati (maxfiy saqlang):");
    console.log(client.session.save());
  } finally {
    prompt.close();
    await client.disconnect().catch(() => undefined);
  }
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
