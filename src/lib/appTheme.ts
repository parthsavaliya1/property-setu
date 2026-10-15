import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiBase } from "./api";
import { getThemeKey, isThemeKey, setTheme } from "../theme";

const STORAGE_KEY = "propertysetu-theme";

/** Applies the colour theme chosen in Admin → Settings. Cached theme first, then the API. */
export async function loadAppTheme(): Promise<boolean> {
  let changed = false;
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (isThemeKey(cached) && cached !== getThemeKey()) {
      setTheme(cached);
      changed = true;
    }
  } catch {
    // ignore storage errors
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${apiBase()}/api/app-theme`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return changed;
    const data = (await response.json()) as { theme?: unknown };
    if (isThemeKey(data.theme)) {
      if (data.theme !== getThemeKey()) {
        setTheme(data.theme);
        changed = true;
      }
      await AsyncStorage.setItem(STORAGE_KEY, data.theme);
    }
  } catch {
    // Keep the theme already applied.
  }
  return changed;
}
