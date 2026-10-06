import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setActive } from "./active";
import { en, type Copy } from "./en";
import { isLanguage, languageLocale, languageOptions, loadCopy, type LanguageCode } from "./languages";

const LANGUAGE_KEY = "propertyhub.language";

type I18nValue = {
  ready: boolean;
  language: LanguageCode;
  locale: string;
  t: Copy;
  setLanguage: (code: LanguageCode) => Promise<void>;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const [copy, setCopy] = useState<Copy>(en);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then(async (saved) => {
        const code = isLanguage(saved) ? saved : "en";
        const next = await loadCopy(code);
        return { code, next };
      })
      .then((loaded) => {
        if (!alive) return;
        setActive(loaded.code, loaded.next, languageLocale(loaded.code));
        setLanguageState(loaded.code);
        setCopy(loaded.next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setLanguage = useCallback(async (code: LanguageCode) => {
    if (code === language) return;
    const next = await loadCopy(code);
    setActive(code, next, languageLocale(code));
    setLanguageState(code);
    setCopy(next);
    await AsyncStorage.setItem(LANGUAGE_KEY, code);
  }, [language]);

  const value = useMemo<I18nValue>(() => ({
    ready,
    language,
    locale: languageLocale(language),
    t: copy,
    setLanguage,
  }), [ready, language, copy, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("LanguageProvider is missing");
  return value;
}

export { languageOptions };
export type { LanguageCode };
