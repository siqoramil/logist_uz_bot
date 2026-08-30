import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ACCESS_MONTH_PRICE_UZS } from "@constants";
import { FileAccessRepository } from "@infrastructure";
import { getTexts } from "@presentation";

const file = join(tmpdir(), `logistic-bot-phone-access-${process.pid}.json`);

const check = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
};

const main = async (): Promise<void> => {
  const access = new FileAccessRepository(file);
  try {
    await access.add("@admin_username", "+998 99 341 64 70", "Test User");

    check(
      !(await access.isAuthorized(1001, "admin_username")),
      "Username kontaktsiz dostup bermasligi kerak",
    );
    check(
      !(await access.authorizeByPhone(1001, "admin_username", "+998 90 000 00 00")),
      "Noto'g'ri telefon rad etilishi kerak",
    );
    check(
      await access.authorizeByPhone(1001, "changed_username", "+998 99 341 64 70"),
      "Telefon username'dan mustaqil tasdiqlanishi kerak",
    );
    check(
      await access.isAuthorized(1001, null),
      "Bog'langan Telegram ID username'siz ham dostup olishi kerak",
    );
    check(
      !(await access.authorizeByPhone(1002, null, "+998 99 341 64 70")),
      "Bog'langan telefonni boshqa Telegram ID egallamasligi kerak",
    );

    const denied = getTexts("uz").accessDenied({
      monthlyPriceUzs: ACCESS_MONTH_PRICE_UZS,
      adminContact: "@siqoramil",
    });
    check(denied.includes("100") && denied.includes("000"), "Oylik narx ko'rsatilishi kerak");
    check(denied.includes("@siqoramil"), "Admin username ko'rsatilishi kerak");

    console.log("PHONE ACCESS SMOKE O'TDI ✅");
  } finally {
    await rm(file, { force: true });
  }
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
