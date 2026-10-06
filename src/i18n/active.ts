import { en, type Copy } from "./en";
import type { LanguageCode } from "./languages";

let copy: Copy = en;
let code: LanguageCode = "en";
let locale = "en-IN";

export function getCopy() {
  return copy;
}

export function getLanguageCode() {
  return code;
}

export function getLocale() {
  return locale;
}

export function setActive(nextCode: LanguageCode, nextCopy: Copy, nextLocale: string) {
  code = nextCode;
  copy = nextCopy;
  locale = nextLocale;
}
