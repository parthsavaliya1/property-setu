import type { Copy } from "./en";
import { en } from "./en";

/**
 * Add a language:
 * 1. Copy en.ts to a new file, for example mr.ts, and translate every value.
 *    Keep the same keys. TypeScript will show an error if a line is missing.
 * 2. Add one row to languageOptions and one loader below.
 *    The app loads only the language the user picked, so extra languages
 *    do not slow the first open.
 */
export const languageOptions = [
  { code: "en", native: "English", english: "English", locale: "en-IN" },
  { code: "hi", native: "हिन्दी", english: "Hindi", locale: "hi-IN" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", locale: "gu-IN" },
] as const;

export type LanguageCode = (typeof languageOptions)[number]["code"];

const loaders: Record<LanguageCode, () => Promise<Copy>> = {
  en: () => Promise.resolve(en),
  hi: () => import("./hi").then((file) => file.hi),
  gu: () => import("./gu").then((file) => file.gu),
};

const cache = new Map<LanguageCode, Copy>([["en", en]]);

export function isLanguage(value: string | null | undefined): value is LanguageCode {
  return languageOptions.some((item) => item.code === value);
}

export function languageLocale(code: LanguageCode) {
  return languageOptions.find((item) => item.code === code)?.locale ?? "en-IN";
}

export function loadCopy(code: LanguageCode) {
  const saved = cache.get(code);
  if (saved) return Promise.resolve(saved);
  return loaders[code]().then((next) => {
    cache.set(code, next);
    return next;
  });
}
