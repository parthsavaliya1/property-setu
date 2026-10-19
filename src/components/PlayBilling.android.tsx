import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { Alert, AppState, DeviceEventEmitter } from "react-native";
import { isRunningInExpoGo } from "expo";
import type { Purchase } from "expo-iap";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

type CreditResult = { balance: number; credited: number };
type Buy = (minimumCredits: number) => Promise<CreditResult>;
const Context = createContext<Buy>(async () => { throw new Error("Google Play Billing is still connecting. Please retry."); });
type Store = typeof import("expo-iap");

export function PlayBillingHost({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const store = useRef<Store | null>(null);
  const ready = useRef(false);
  const pending = useRef<{ sku: string; resolve: (value: CreditResult) => void; reject: (err: Error) => void } | null>(null);
  const recovering = useRef(new Set<string>());
  useEffect(() => {
    if (!token || isRunningInExpoGo()) return;
    const authToken = token;
    let active = true;
    let updates: { remove: () => void } | undefined;
    let errors: { remove: () => void } | undefined;
    let appState: { remove: () => void } | undefined;
    async function complete(purchase: Purchase) {
      if (!active || !purchase.purchaseToken || recovering.current.has(purchase.purchaseToken)) return;
      if (purchase.purchaseState !== "purchased") {
        if (pending.current?.sku === purchase.productId) {
          pending.current.reject(new Error("Payment is pending. Credits will be recovered when Google Play confirms payment. Reopen the app after it completes."));
          pending.current = null;
        }
        return;
      }
      recovering.current.add(purchase.purchaseToken);
      try {
        const result = await api.verifyPlayPurchase(purchase.productId, purchase.purchaseToken, authToken);
        if (active) DeviceEventEmitter.emit("propertysetu.wallet", { balance: result.balance });
        // The backend consumes only after durable, idempotent credit delivery.
        if (active && pending.current?.sku === purchase.productId) { pending.current.resolve(result); pending.current = null; }
      } catch (err) {
        if (active && pending.current?.sku === purchase.productId) {
          pending.current.reject(err instanceof Error ? err : new Error("Purchase recovery failed. Please retry.")); pending.current = null;
        }
      } finally { recovering.current.delete(purchase.purchaseToken); }
    }
    async function recover() {
      if (!store.current || !active) return;
      for (const purchase of await store.current.getAvailablePurchases()) await complete(purchase);
    }
    async function connect() {
      try {
        const iap = await import("expo-iap");
        if (!active) return;
        store.current = iap;
        updates = iap.purchaseUpdatedListener(purchase => { void complete(purchase); });
        errors = iap.purchaseErrorListener(error => {
          pending.current?.reject(new Error(error.message || "Google Play purchase was cancelled.")); pending.current = null;
        });
        ready.current = await iap.initConnection();
        await recover();
        if (active) appState = AppState.addEventListener("change", state => { if (state === "active") void recover().catch(() => undefined); });
      } catch { ready.current = false; }
    }
    void connect();
    return () => {
      active = false; ready.current = false;
      updates?.remove(); errors?.remove(); appState?.remove();
      pending.current?.reject(new Error("Your account changed. Reopen purchases after signing in.")); pending.current = null;
      store.current = null;
    };
  }, [token]);

  async function buy(minimumCredits: number): Promise<CreditResult> {
    if (!token) throw new Error("Sign in to purchase credits.");
    if (!Number.isFinite(minimumCredits) || minimumCredits <= 0) throw new Error("Choose a positive credit amount.");
    if (pending.current) throw new Error("Another Google Play purchase is already in progress.");
    if (!ready.current || !store.current) throw new Error("Install this build through Google Play to use purchases. Billing is unavailable in Expo Go.");
    const catalog = await api.playProducts(token);
    if (!catalog.configured) throw new Error("Purchases are not available yet. Please try again later.");
    const pack = catalog.products.filter(item => item.credits >= minimumCredits).sort((a, b) => a.credits - b.credits)[0];
    if (!pack) throw new Error("The largest pack is 500 credits. Add credits in separate purchases.");
    const products = await store.current.fetchProducts({ skus: [pack.product_id], type: "in-app" });
    const product = products?.find(item => item.id === pack.product_id);
    if (!product) throw new Error("This credit pack is not available in your Google Play region.");
    const confirmed = await new Promise<boolean>(resolve => Alert.alert("Buy listing credits", `${pack.credits} credits for ${product.displayPrice}. Credits are used for PropertySetu listing services and cannot be withdrawn as cash. Any unused credits stay in your account. This is a one-time purchase.`, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) }, { text: "Continue", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }));
    if (!confirmed) throw new Error("Purchase cancelled.");
    const iap = store.current;
    if (!iap) throw new Error("Billing disconnected. Please retry.");
    return new Promise<CreditResult>((resolve, reject) => {
      pending.current = { sku: pack.product_id, resolve, reject };
      void iap.requestPurchase({ type: "in-app", request: { google: { skus: [pack.product_id], obfuscatedAccountId: catalog.account_id } } }).catch(error => {
        pending.current = null; reject(error instanceof Error ? error : new Error("Could not start Google Play purchase."));
      });
    });
  }
  return <Context.Provider value={buy}>{children}</Context.Provider>;
}
export function usePlayCredits(): Buy { return useContext(Context); }
