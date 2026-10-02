// Same Firebase Remote Config project and fetch as vadi-hisab/firebase.ts.
// Console keys:
//   property_api_base_url   — API host, without /api (e.g. https://api.example.com)
//   custom_property_price   — regular listing fee for 1 month, in rupees
//   premium_property_price  — premium listing fee for 1 month, in rupees

const PROJECT_ID = "vadi-hisab";
const APP_ID = "1:40446481049:web:2e346187ffa466328dde08";
const API_KEY = "AIzaSyAEqo0dC0fO2cMHyxeI3NOZdGsc4wEsZLE";

export type RemoteSettings = {
  apiUrl: string | null;
  standardPrice: number;
  premiumPrice: number;
};

const fallbackPrices = { standardPrice: 20, premiumPrice: 30 };

let current: RemoteSettings = { apiUrl: null, ...fallbackPrices };
const rcEntries: Record<string, string> = {};
const listeners = new Set<() => void>();

export function getRemoteSettings() {
  return current;
}

export function getRemoteConfigString(key: string): string | null {
  return rcEntries[key] ?? null;
}

export function subscribeRemoteSettings(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function parseRcEntryValue(entry: unknown): string | null {
  if (entry == null) return null;
  if (typeof entry === "string") return entry;
  if (typeof entry === "object" && "value" in entry) {
    const value = (entry as { value?: unknown }).value;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function priceOf(value: string | null | undefined, fallbackPrice: number) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) return fallbackPrice;
  return Math.round(amount);
}

function cleanUrl(value: string | null | undefined) {
  if (!value) return null;
  let trimmed = value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (trimmed.includes("://0.0.0.0")) return null;
  if (trimmed.endsWith("/api")) trimmed = trimmed.slice(0, -4);
  return trimmed || null;
}

function publishFromEntries() {
  current = {
    apiUrl: cleanUrl(rcEntries.property_api_base_url),
    standardPrice: priceOf(rcEntries.custom_property_price, fallbackPrices.standardPrice),
    premiumPrice: priceOf(rcEntries.premium_property_price, fallbackPrices.premiumPrice),
  };
  listeners.forEach((listener) => listener());
}

export async function loadRemoteConfig() {
  try {
    const url = `https://firebaseremoteconfig.googleapis.com/v1/projects/${PROJECT_ID}/namespaces/firebase:fetch?key=${API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: APP_ID,
        app_instance_id: "property-fallback-instance",
        sdk_version: "9.0.0",
      }),
    });
    if (!response.ok) return;
    const json = await response.json();
    const entries = (json?.entries ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(entries)) {
      const parsed = parseRcEntryValue(value);
      if (parsed != null) rcEntries[key] = parsed;
    }
    publishFromEntries();
  } catch {
    /* keep the compiled API address and the default fees */
  }
}
