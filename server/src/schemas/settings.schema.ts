import { z } from "zod";

export const CURRENCIES = ["DZD", "EUR", "USD", "GBP"] as const;

const validZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const settingsBody = z.object({
  currency: z.enum(CURRENCIES, { errorMap: () => ({ message: "Choose one of the supported currencies" }) }),
  timezone: z.string().refine(validZone, "That timezone isn't recognised"),
});
