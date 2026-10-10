import Constants from "expo-constants";
import { File } from "expo-file-system";
import type { Category, ChatMessage, ChatThread, Inquiry, Me, NotificationItem, PropertyCard, PropertyDetail, Visit, WalletTransaction } from "../types/database";
import { getCopy } from "../i18n/active";
import { getRemoteSettings } from "./remoteConfig";

export const PROPERTY_PAGE_SIZE = 20;

export function appendProperties(current: PropertyCard[], next: PropertyCard[]) {
  if (!next.length) return current;
  const seen = new Set(current.map((item) => item.id));
  const extra = next.filter((item) => !seen.has(item.id));
  return extra.length ? [...current, ...extra] : current;
}

function usableHost(value?: string | null) {
  if (!value) return null;
  const withoutProtocol = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const host = withoutProtocol.split("/")[0]?.split(":")[0];
  if (!host || host === "0.0.0.0" || host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

// Compiled-in API address, same idea as vadi-hisab BASE_URL in utils/api.ts.
// EXPO_PUBLIC_API_URL can still override this for a different machine.
const DEFAULT_API_URL = "http://192.168.1.10:4000";

export function apiBase() {
  const remote = getRemoteSettings().apiUrl;
  if (remote) return remote;
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
  if (!response.ok) {
    const payload = body as { error?: string; code?: string };
    throw new ApiError(payload.error || "Request failed", response.status, payload.code);
  }
  return body as T;
}

async function requestList<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T[]> {
  const body = await request<unknown>(path, options, token);
  return Array.isArray(body) ? body as T[] : [];
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

export type ListingDraft = {
  category_slug: string | null;
  listing_type: "sale" | "rent" | "lease" | "pg" | null;
  title: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  locality: string | null;
  pincode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  balconies: number | null;
  area: number | null;
  furnishing_status: "unfurnished" | "semi_furnished" | "furnished" | null;
  construction_year: number | null;
  possession_status: "Ready to move" | "Under construction" | null;
  price: number | null;
  price_unit: "total" | "per_sqft" | null;
  is_price_negotiable: boolean | null;
  amenity_slugs: string[];
  features: string[];
};

export async function extractListingPhoto(uri: string, token: string, name?: string | null, mime?: string | null) {
  const filename = name || uri.split("/").pop()?.split("?")[0] || "poster.jpg";
  const lower = filename.toLowerCase();
  const type = mime || (lower.endsWith(".png") ? "image/png" : lower.endsWith(".webp") ? "image/webp" : "image/jpeg");
  const source = new File(uri);
  const form = new FormData();
  form.append("file", { name: filename, type, bytes: () => source.bytes() } as unknown as Blob);
  let response: Response;
  try {
    response = await fetch(`${apiBase()}/api/properties/extract-from-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Could not connect";
    throw new Error(`Could not read the photo. ${reason}`);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error || "Could not read the photo.");
  const draft = (body as { draft?: ListingDraft }).draft;
  if (!draft) throw new Error("Could not read the photo.");
  return draft;
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
  const fees = getRemoteSettings();
  const monthly = badge === "premium" ? fees.premiumPrice : fees.standardPrice;
  return term === "year" ? Math.round(monthly * 12 * 0.85) : monthly;
}

/** Extra to collect when a live listing moves to a higher plan. The current fee is already paid. */
export function upgradeCharge(
  nextBadge: "standard" | "premium",
  nextTerm: "month" | "year",
  currentBadge: "standard" | "premium" | null,
  currentTerm: "month" | "year" | null,
) {
  const nextFee = listingPrice(nextBadge, nextTerm);
  if (!currentBadge || !currentTerm) return nextFee;
  return Math.max(0, nextFee - listingPrice(currentBadge, currentTerm));
}

export type AuthUser = { id: string; email?: string | null; phone?: string | null };

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const api = {
  sendOtp: (phone: string, create: boolean) =>
    request<{ message: string; sessionId: string }>("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone, create }) }),
  verifyOtp: (phone: string, otp: string, sessionId: string, create: boolean, fullName?: string) =>
    request<{ token: string; user: AuthUser; isNewUser: boolean }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp, sessionId, create, full_name: fullName || undefined }),
    }),
  signup: (email: string, password: string, fullName: string) =>
    request<{ verification_required: boolean; message: string }>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, full_name: fullName }) }),
  resendVerification: (email: string) =>
    request<{ message: string }>("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }),
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  google: (proof: { code: string; code_verifier: string; redirect_uri: string; client_id: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/google", { method: "POST", body: JSON.stringify(proof) }),
  categories: () => requestList<Category>("/categories"),
  amenities: () => requestList<{ id: string; name: string }>("/amenities"),
  properties: (query = "", token?: string | null) => requestList<PropertyCard>(`/properties${query}`, {}, token),
  property: (id: string, token?: string | null) => request<PropertyDetail>(`/properties/${id}`, {}, token),
  createProperty: (payload: unknown, token: string) =>
    request<PropertyDetail>("/properties", { method: "POST", body: JSON.stringify(payload) }, token),
  updateProperty: (id: string, payload: unknown, token: string) =>
    request<PropertyDetail>(`/properties/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  archiveProperty: (id: string, token: string) => request(`/properties/${id}`, { method: "DELETE" }, token),
  deleteProperty: (id: string, token: string) =>
    request<{ id: string; archived: boolean }>(`/properties/${id}?hard=true`, { method: "DELETE" }, token),
  view: (id: string, deviceType: string, token?: string | null) =>
    request(`/properties/${id}/view`, { method: "POST", body: JSON.stringify({ device_type: deviceType }) }, token),
  favorite: (id: string, token: string) => request(`/properties/${id}/favorite`, { method: "POST" }, token),
  unfavorite: (id: string, token: string) => request(`/properties/${id}/favorite`, { method: "DELETE" }, token),
  favorites: (token: string, query = "") => requestList<PropertyCard>(`/favorites${query}`, {}, token),
  inquire: (id: string, payload: unknown, token: string) =>
    request(`/properties/${id}/inquiries`, { method: "POST", body: JSON.stringify(payload) }, token),
  inquiries: (token: string) => requestList<Inquiry>("/inquiries", {}, token),
  updateInquiry: (id: string, status: string, token: string) =>
    request(`/inquiries/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token),
  visit: (id: string, payload: unknown, token: string) =>
    request(`/properties/${id}/visits`, { method: "POST", body: JSON.stringify(payload) }, token),
  visits: (token: string) => requestList<Visit>("/visits", {}, token),
  updateVisit: (id: string, payload: unknown, token: string) =>
    request(`/visits/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  report: (id: string, payload: unknown, token: string) =>
    request(`/properties/${id}/reports`, { method: "POST", body: JSON.stringify(payload) }, token),
  me: (token: string) => request<Me>("/me", {}, token),
  updateMe: (payload: unknown, token: string) => request("/me", { method: "PATCH", body: JSON.stringify(payload) }, token),
  deleteMe: (token: string) => request<void>("/me", { method: "DELETE" }, token),
  notifications: (token: string) => requestList<NotificationItem>("/notifications", {}, token),
  readNotification: (id: string, token: string) => request(`/notifications/${id}/read`, { method: "PATCH" }, token),
  readNotifications: (token: string) => request<void>("/notifications/read", { method: "PATCH" }, token),
  chats: (token: string) => requestList<ChatThread>("/chats", {}, token),
  chat: (id: string, token: string) => request<ChatThread>(`/chats/${id}`, {}, token),
  openChat: (propertyId: string, token: string, buyerId?: string) =>
    request<ChatThread>(`/properties/${propertyId}/chat`, { method: "POST", body: JSON.stringify(buyerId ? { buyer_id: buyerId } : {}) }, token),
  messages: (id: string, token: string) => requestList<ChatMessage>(`/chats/${id}/messages`, {}, token),
  sendMessage: (
    id: string,
    payload: { body?: string; attachment_url?: string; attachment_name?: string; attachment_kind?: "image" | "document"; reply_to_id?: string },
    token: string
  ) => request<ChatMessage>(`/chats/${id}/messages`, { method: "POST", body: JSON.stringify(payload) }, token),
  deleteMessage: (id: string, messageId: string, token: string) =>
    request<ChatMessage>(`/chats/${id}/messages/${messageId}`, { method: "DELETE" }, token),
  reactMessage: (id: string, messageId: string, emoji: string, token: string) =>
    request<{ messageId: string; myEmoji: string | null; reactions: Array<{ emoji: string; count: number; mine?: boolean }> }>(
      `/chats/${id}/messages/${messageId}/reactions`,
      { method: "POST", body: JSON.stringify({ emoji }) },
      token
    ),
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
  walletHistory: (token: string) => requestList<WalletTransaction>("/wallet/transactions", {}, token),
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
  if (value == null || value === "") return getCopy().common.priceOnRequest;
  const amount = Number(value);
  if (Number.isNaN(amount)) return getCopy().common.priceOnRequest;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function listingLabel(type: string) {
  const text = getCopy().listingTypes;
  if (type === "rent") return text.forRent;
  if (type === "lease") return text.forLease;
  if (type === "pg") return text.pg;
  return text.forSale;
}
