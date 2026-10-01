import Constants from "expo-constants";
import { File } from "expo-file-system";
import type { Category, ChatMessage, ChatThread, Inquiry, Me, NotificationItem, PropertyCard, PropertyDetail, Visit, WalletTransaction } from "../types/database";

function usableHost(value?: string | null) {
  const host = value?.split(":")[0];
  if (!host || host === "0.0.0.0" || host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

// Compiled-in API address, same idea as vadi-hisab BASE_URL in utils/api.ts.
// EXPO_PUBLIC_API_URL can still override this for a different machine.
const DEFAULT_API_URL = "http://192.168.1.10:4000";

export function apiBase() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured && !configured.includes("://0.0.0.0")) return configured;
  const host = usableHost(Constants.expoConfig?.hostUri) || usableHost(Constants.linkingUri);
  if (host) return `http://${host}:4000`;
  return DEFAULT_API_URL;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${apiBase()}/api${path}`, { ...options, headers });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Could not connect";
    throw new Error(`Could not connect to the server at ${apiBase()}. ${reason}`);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error || "Request failed");
  return body as T;
}

export function cityName(city?: string | null) {
  const value = (city || "").trim();
  const key = value.toLowerCase();
  if (key === "ahm" || key.startsWith("ahmed")) return "Ahmedabad";
  if (key === "rkt" || key.startsWith("raj")) return "Rajkot";
  return value;
}

function isPremium(item: PropertyCard) {
  return Boolean(item.is_premium || item.listing_label === "Premium");
}

function isFeatured(item: PropertyCard) {
  return Boolean(item.is_featured || item.listing_label === "Featured");
}

function inCity(item: PropertyCard, city?: string | null) {
  const wanted = cityName(city).toLowerCase();
  const actual = (item.city || "").trim().toLowerCase();
  if (!wanted || !actual) return false;
  return actual === wanted || actual.startsWith(wanted);
}

export function sortForDashboard(items: PropertyCard[], city?: string | null) {
  return [...items].sort((a, b) => {
    const premium = Number(isPremium(b)) - Number(isPremium(a));
    if (premium) return premium;
    const featured = Number(isFeatured(b)) - Number(isFeatured(a));
    if (featured) return featured;
    return Number(inCity(b, city)) - Number(inCity(a, city));
  });
}

export function sortForSearch(items: PropertyCard[], city: string | null | undefined, sort: string) {
  return [...items].sort((a, b) => {
    const local = Number(inCity(b, city)) - Number(inCity(a, city));
    if (local) return local;
    if (sort === "low" || sort === "high") {
      const left = Number(a.price) || 0;
      const right = Number(b.price) || 0;
      return sort === "low" ? left - right : right - left;
    }
    const premium = Number(isPremium(b)) - Number(isPremium(a));
    if (premium) return premium;
    return Number(isFeatured(b)) - Number(isFeatured(a));
  });
}

export async function uploadMedia(
  uri: string,
  token: string,
  kind: "image" | "video" | "document",
  name?: string | null,
  mime?: string | null
) {
  const filename = name || uri.split("/").pop()?.split("?")[0] || (kind === "video" ? "video.mp4" : kind === "document" ? "document.pdf" : "photo.jpg");
  const lower = filename.toLowerCase();
  const type = mime || (lower.endsWith(".pdf") ? "application/pdf" : lower.endsWith(".png") ? "image/png" : lower.endsWith(".webp") ? "image/webp" : lower.endsWith(".gif") ? "image/gif" : kind === "video" ? "video/mp4" : kind === "document" ? "application/pdf" : "image/jpeg");
  const source = new File(uri);
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", { name: filename, type, bytes: () => source.bytes() } as unknown as Blob);
  let response: Response;
  try {
    response = await fetch(`${apiBase()}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Could not connect";
    throw new Error(`Could not upload the file. ${reason}`);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error || "Upload failed");
  const url = (body as { file?: { url?: string } }).file?.url;
  if (!url) throw new Error("Upload did not return a file URL");
  return url;
}

export function listingPrice(badge: "standard" | "premium", term: "month" | "year") {
  const monthly = badge === "premium" ? 30 : 20;
  return term === "year" ? Math.round(monthly * 12 * 0.85) : monthly;
}

export type AuthUser = { id: string; email: string };

export const api = {
  signup: (email: string, password: string, fullName: string) =>
    request<{ token: string; user: AuthUser }>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, full_name: fullName }) }),
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  google: (accessToken: string) =>
    request<{ token: string; user: AuthUser }>("/auth/google", { method: "POST", body: JSON.stringify({ access_token: accessToken }) }),
  categories: () => request<Category[]>("/categories"),
  amenities: () => request<Array<{ id: string; name: string }>>("/amenities"),
  properties: (query = "", token?: string | null) => request<PropertyCard[]>(`/properties${query}`, {}, token),
  property: (id: string, token?: string | null) => request<PropertyDetail>(`/properties/${id}`, {}, token),
  createProperty: (payload: unknown, token: string) =>
    request<PropertyDetail>("/properties", { method: "POST", body: JSON.stringify(payload) }, token),
  updateProperty: (id: string, payload: unknown, token: string) =>
    request<PropertyDetail>(`/properties/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  archiveProperty: (id: string, token: string) => request(`/properties/${id}`, { method: "DELETE" }, token),
  view: (id: string, deviceType: string, token?: string | null) =>
    request(`/properties/${id}/view`, { method: "POST", body: JSON.stringify({ device_type: deviceType }) }, token),
  favorite: (id: string, token: string) => request(`/properties/${id}/favorite`, { method: "POST" }, token),
  unfavorite: (id: string, token: string) => request(`/properties/${id}/favorite`, { method: "DELETE" }, token),
  favorites: (token: string) => request<PropertyCard[]>("/favorites", {}, token),
  inquire: (id: string, payload: unknown, token: string) =>
    request(`/properties/${id}/inquiries`, { method: "POST", body: JSON.stringify(payload) }, token),
  inquiries: (token: string) => request<Inquiry[]>("/inquiries", {}, token),
  updateInquiry: (id: string, status: string, token: string) =>
    request(`/inquiries/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token),
  visit: (id: string, payload: unknown, token: string) =>
    request(`/properties/${id}/visits`, { method: "POST", body: JSON.stringify(payload) }, token),
  visits: (token: string) => request<Visit[]>("/visits", {}, token),
  updateVisit: (id: string, payload: unknown, token: string) =>
    request(`/visits/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  report: (id: string, payload: unknown, token: string) =>
    request(`/properties/${id}/reports`, { method: "POST", body: JSON.stringify(payload) }, token),
  me: (token: string) => request<Me>("/me", {}, token),
  updateMe: (payload: unknown, token: string) => request("/me", { method: "PATCH", body: JSON.stringify(payload) }, token),
  notifications: (token: string) => request<NotificationItem[]>("/notifications", {}, token),
  readNotification: (id: string, token: string) => request(`/notifications/${id}/read`, { method: "PATCH" }, token),
  chats: (token: string) => request<ChatThread[]>("/chats", {}, token),
  openChat: (propertyId: string, token: string, buyerId?: string) =>
    request<ChatThread>(`/properties/${propertyId}/chat`, { method: "POST", body: JSON.stringify(buyerId ? { buyer_id: buyerId } : {}) }, token),
  messages: (id: string, token: string) => request<ChatMessage[]>(`/chats/${id}/messages`, {}, token),
  sendMessage: (id: string, body: string, token: string) =>
    request<ChatMessage>(`/chats/${id}/messages`, { method: "POST", body: JSON.stringify({ body }) }, token),
  paymentOrder: (propertyId: string, listingBadge: "standard" | "premium", token: string) =>
    request<{ key_id: string; order_id: string; amount: number; currency: string; description: string }>(
      "/payments/order",
      { method: "POST", body: JSON.stringify({ property_id: propertyId, listing_badge: listingBadge }) },
      token
    ),
  verifyPayment: (
    payload: { property_id: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
    token: string
  ) => request<{ ok: boolean; expires_at?: string }>("/payments/verify", { method: "POST", body: JSON.stringify(payload) }, token),
  wallet: (token: string) => request<{ balance: number }>("/wallet", {}, token),
  walletHistory: (token: string) => request<WalletTransaction[]>("/wallet/transactions", {}, token),
  walletOrder: (amount: number, token: string) =>
    request<{ key_id: string; order_id: string; amount: number; currency: string; description: string }>(
      "/wallet/order",
      { method: "POST", body: JSON.stringify({ amount }) },
      token
    ),
  walletVerify: (
    payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
    token: string
  ) => request<{ ok: boolean; balance: number }>("/wallet/verify", { method: "POST", body: JSON.stringify(payload) }, token),
  walletSpend: (propertyId: string, listingBadge: "standard" | "premium", term: "month" | "year", token: string) =>
    request<{ ok: boolean; balance: number; charged: number }>("/wallet/spend", {
      method: "POST",
      body: JSON.stringify({ property_id: propertyId, listing_badge: listingBadge, term }),
    }, token),
};

export function inr(value: string | number | null | undefined) {
  if (value == null || value === "") return "Price on request";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "Price on request";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function listingLabel(type: string) {
  if (type === "rent") return "For Rent";
  if (type === "lease") return "For Lease";
  if (type === "pg") return "PG";
  return "For Sale";
}
