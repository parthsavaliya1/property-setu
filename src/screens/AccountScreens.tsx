import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, EmptyState, Field, LogoLoader, PageHeader, styles } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, inr, listingPrice } from "../lib/api";
import { useRazorpay } from "../components/RazorpayCheckout";
import { colors } from "../theme";
import type { Inquiry, NotificationItem, PropertyCard, Visit } from "../types/database";

export function MenuScreen({
  onNavigate,
  onFavorites,
  onSignIn,
}: {
  onNavigate: (screen: "MyProperties" | "Inquiries" | "Visits" | "Profile" | "Notifications" | "Wallet") => void;
  onFavorites: () => void;
  onSignIn: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { session, me, signOut } = useAuth();
  const name = me?.profile?.full_name || "Guest";
  const rows: Array<{ label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }> = [
    { label: "Wallet", icon: "wallet-outline", onPress: () => (session ? onNavigate("Wallet") : onSignIn()) },
    { label: "My Properties", icon: "home-outline", onPress: () => onNavigate("MyProperties") },
    { label: "Favorites", icon: "heart-outline", onPress: onFavorites },
    { label: "Inquiries", icon: "document-text-outline", onPress: () => onNavigate("Inquiries") },
    { label: "Messages", icon: "chatbubble-ellipses-outline", onPress: () => onNavigate("Notifications") },
    { label: "Scheduled Visits", icon: "calendar-outline", onPress: () => onNavigate("Visits") },
    { label: "My Documents", icon: "folder-outline", onPress: () => onNavigate("Profile") },
    { label: "Settings", icon: "settings-outline", onPress: () => onNavigate("Profile") },
    { label: "Help & Support", icon: "help-circle-outline", onPress: () => onNavigate("Notifications") },
  ];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.page }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 18, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => (session ? onNavigate("Profile") : onSignIn())} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: 18 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, overflow: "hidden", backgroundColor: "#e7efe8", alignItems: "center", justifyContent: "center" }}>
          {me?.profile?.avatar_url ? <Image source={{ uri: me.profile.avatar_url }} style={{ width: 64, height: 64 }} /> : <Ionicons name="person" size={30} color="#146c36" />}
        </View>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#1c1c1c" }}>{name}</Text>
          <Text style={{ color: "#8a918c", marginTop: 2 }}>{session ? "View & Edit Profile" : "Sign in"}</Text>
        </View>
      </Pressable>
      <View style={{ height: 1, backgroundColor: "#eeeae4", marginBottom: 8 }} />
      {rows.map((row) => (
        <Pressable key={row.label} onPress={row.onPress} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}>
          <Ionicons name={row.icon} size={22} color="#146c36" />
          <Text style={{ flex: 1, marginLeft: 14, fontSize: 16, color: "#1c1c1c", fontWeight: "600" }}>{row.label}</Text>
          <Ionicons name="chevron-forward" size={18} color="#c5c9c4" />
        </Pressable>
      ))}
      <Pressable onPress={() => (session ? signOut() : onSignIn())} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}>
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={{ marginLeft: 14, fontSize: 16, color: "#ef4444", fontWeight: "700" }}>{session ? "Logout" : "Sign in"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const walletAmounts = [20, 30, 100, 204, 306, 500];

export function WalletScreen() {
  const { token, session } = useAuth();
  const pay = useRazorpay();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!token) return;
    api.wallet(token).then((wallet) => setBalance(wallet.balance)).catch((err) => setError(err.message));
  }, [token]);

  async function addMoney(value?: number) {
    if (!token) return;
    const rupees = value ?? Number(amount);
    if (!Number.isInteger(rupees) || rupees < 1) {
      setError("Enter a whole amount in rupees.");
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    try {
      const order = await api.walletOrder(rupees, token);
      const paid = await pay({
        keyId: order.key_id,
        orderId: order.order_id,
        amount: order.amount,
        currency: order.currency,
        description: order.description,
        email: session?.user.email,
      });
      const result = await api.walletVerify({
        razorpay_order_id: paid.razorpay_order_id,
        razorpay_payment_id: paid.razorpay_payment_id,
        razorpay_signature: paid.razorpay_signature,
      }, token);
      setBalance(result.balance);
      setNote(`${inr(rupees)} added to your wallet.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add money");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.page }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <PageHeader title="Wallet" />
      <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={{ backgroundColor: "#146c36", borderRadius: 18, padding: 18 }}>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>Wallet balance</Text>
          <Text style={{ color: "white", fontSize: 32, fontWeight: "800", marginTop: 6 }}>{inr(balance)}</Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 8 }}>Listing fees are taken from this wallet.</Text>
        </View>
        <Text style={{ fontWeight: "800", marginTop: 18, marginBottom: 8 }}>Add money</Text>
        <TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="Amount in rupees" placeholderTextColor="#9aa19c" style={{ backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#E7E0D6", paddingHorizontal: 14, paddingVertical: 12, color: "#1c1c1c" }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {walletAmounts.map((value) => (
            <Pressable key={value} onPress={() => setAmount(String(value))} style={{ backgroundColor: amount === String(value) ? "#146c36" : "white", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#E7E0D6" }}>
              <Text style={{ color: amount === String(value) ? "white" : "#1c1c1c", fontWeight: "700" }}>{inr(value)}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}
        {note ? <Text style={{ color: "#146c36", fontWeight: "700", marginTop: 12 }}>{note}</Text> : null}
        <Pressable onPress={() => addMoney()} disabled={busy || !token} style={{ marginTop: 18, backgroundColor: "#146c36", borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: busy ? 0.6 : 1 }}>
          <Text style={{ color: "white", fontWeight: "800" }}>{busy ? "Please wait..." : "Add to wallet"}</Text>
        </Pressable>
        {!token ? <Text style={{ color: "#8a918c", marginTop: 12 }}>Sign in to use your wallet.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const listingTabs = [
  { id: "active", label: "Active" },
  { id: "expired", label: "Expired" },
  { id: "draft", label: "Draft" },
  { id: "sold", label: "Sold" },
  { id: "rented", label: "Rented" },
] as const;

function matchesTab(status: string, tab: (typeof listingTabs)[number]["id"]) {
  if (tab === "active") return status === "published";
  if (tab === "expired") return status === "expired";
  if (tab === "draft") return status === "draft" || status === "pending_review";
  if (tab === "sold") return status === "sold";
  return status === "rented";
}

function statusLabel(status: string) {
  if (status === "published") return "Active";
  if (status === "pending_review") return "Draft";
  if (status === "expired") return "Expired";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function listingFee(item: PropertyCard) {
  return listingPrice(item.is_premium || item.listing_label === "Premium" ? "premium" : "standard", "month");
}

export function MyPropertiesScreen({ onOpen, onEdit }: { onOpen: (id: string) => void; onEdit: (id: string) => void }) {
  const { token, session } = useAuth();
  const pay = useRazorpay();
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof listingTabs)[number]["id"]>("active");
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);

  function load() {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.properties("?mine=true&limit=50", token).then((rows) => {
      setItems(rows);
    }).catch((err) => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [token]);

  async function activate(item: PropertyCard) {
    if (!token) return;
    const badge = item.is_premium || item.listing_label === "Premium" ? "premium" : "standard";
    setError("");
    setPayingId(item.id);
    try {
      const fee = listingPrice(badge, "month");
      const wallet = await api.wallet(token);
      if (wallet.balance < fee) {
        const order = await api.walletOrder(fee - wallet.balance, token);
        const paid = await pay({
          keyId: order.key_id,
          orderId: order.order_id,
          amount: order.amount,
          currency: order.currency,
          description: order.description,
          email: session?.user.email,
        });
        await api.walletVerify({
          razorpay_order_id: paid.razorpay_order_id,
          razorpay_payment_id: paid.razorpay_payment_id,
          razorpay_signature: paid.razorpay_signature,
        }, token);
      }
      await api.walletSpend(item.id, badge, "month", token);
      setTab("active");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPayingId(null);
    }
  }

  const shown = items.filter((item) => matchesTab(item.status, tab));
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader title="My Properties" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: 44, marginBottom: 16 }} contentContainerStyle={{ alignItems: "center" }}>
        {listingTabs.map((entry) => {
          const active = tab === entry.id;
          return (
            <Pressable key={entry.id} onPress={() => setTab(entry.id)} style={{ backgroundColor: active ? "#146c36" : "#f3f1ea", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}>
              <Text style={{ color: active ? "white" : "#6e766f", fontWeight: "700" }}>{entry.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!token ? <Text style={styles.meta}>Sign in to see your listings.</Text> : null}
      {token && loading ? <LogoLoader /> : null}
      {token && !loading && shown.length === 0 ? <EmptyState kind={tab === "active" ? "active" : "search"} /> : null}
      {shown.map((item) => {
        const place = [item.locality, item.city].filter(Boolean).join(", ") || "Location not added";
        const active = item.status === "published";
        return (
          <Pressable key={item.id} onPress={() => onOpen(item.slug || item.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
            {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: 84, height: 72, borderRadius: 12 }} resizeMode="cover" /> : <View style={{ width: 84, height: 72, borderRadius: 12, backgroundColor: "#d7e3db" }} />}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontWeight: "700", color: "#1c1c1c" }}>{item.title}</Text>
              <Text style={{ color: "#146c36", fontWeight: "800", marginTop: 2 }}>{inr(item.price)}</Text>
              <Text numberOfLines={1} style={{ color: "#8a918c", fontSize: 12, marginTop: 2 }}>{place}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 8 }}>
              <Pressable onPress={() => onEdit(item.id)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#E7E0D6", paddingHorizontal: 8, paddingVertical: 4 }}>
                <Ionicons name="create-outline" size={14} color="#8C5A3C" />
                <Text style={{ color: "#8C5A3C", fontWeight: "700", fontSize: 12 }}>Edit</Text>
              </Pressable>
              {item.status === "expired" || item.status === "draft" || item.status === "pending_review" ? (
                <Pressable onPress={() => activate(item)} disabled={payingId === item.id} style={{ backgroundColor: "#146c36", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>{payingId === item.id ? "Please wait..." : `Pay ₹${listingFee(item)}`}</Text>
                </Pressable>
              ) : (
                <View style={{ backgroundColor: active ? "#e7f6ec" : "#fff1e6", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: active ? "#146c36" : "#e08a3c", fontWeight: "700", fontSize: 12 }}>{statusLabel(item.status)}</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
      </ScrollView>
    </View>
  );
}

export function FavoritesScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    api.favorites(token).then((rows) => {
      if (active) setItems(rows);
    }).catch(() => {
      if (active) setItems([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [token]);

  async function remove(item: PropertyCard) {
    if (!token) return;
    setItems((current) => current.filter((row) => row.id !== item.id));
    try {
      await api.unfavorite(item.id, token);
    } catch {
      setItems((current) => [...current, item]);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.page }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#1c1c1c" }}>My Favorites</Text>
        <Ionicons name="ellipsis-horizontal" size={20} color="#9aa19c" />
      </View>
      {!token ? <Text style={styles.meta}>Sign in to see saved properties.</Text> : null}
      {token && loading ? <LogoLoader /> : null}
      {token && !loading && items.length === 0 ? <EmptyState kind="search" /> : null}
      {items.map((item) => {
        const place = [item.locality, item.city].filter(Boolean).join(", ") || "Location not added";
        return (
          <Pressable key={item.id} onPress={() => onOpen(item.slug || item.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
            {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: 84, height: 72, borderRadius: 12 }} resizeMode="cover" /> : <View style={{ width: 84, height: 72, borderRadius: 12, backgroundColor: "#d7e3db" }} />}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontWeight: "700", color: "#1c1c1c" }}>{item.title}</Text>
              <Text style={{ color: "#146c36", fontWeight: "800", marginTop: 2 }}>{inr(item.price)}</Text>
              <Text numberOfLines={1} style={{ color: "#8a918c", fontSize: 12, marginTop: 2 }}>{place}</Text>
            </View>
            <Pressable onPress={() => remove(item)} hitSlop={8}>
              <Ionicons name="heart" size={22} color="#ef4444" />
            </Pressable>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function timeAgo(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function InquiriesScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"new" | "contacted" | "closed">("new");
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    api.inquiries(token).then((rows) => {
      if (active) setItems(rows);
    }).catch(() => {
      if (active) setItems([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [token]);
  const shown = items.filter((item) => {
    if (tab === "new") return item.status === "new" || item.status === "interested";
    if (tab === "contacted") return item.status === "contacted";
    return item.status === "closed" || item.status === "spam";
  });
  const badge = (status: Inquiry["status"]) => {
    if (status === "contacted") return { label: "Contacted", bg: "#e0f2fe", color: "#0284c7" };
    if (status === "closed" || status === "spam") return { label: "Closed", bg: "#f3f4f6", color: "#6b7280" };
    return { label: "New", bg: "#ffe4e6", color: "#e11d48" };
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader title="Inquiries" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        {(["new", "contacted", "closed"] as const).map((entry) => {
          const active = tab === entry;
          const label = entry === "new" ? "New" : entry === "contacted" ? "Contacted" : "Closed";
          return (
            <Pressable key={entry} onPress={() => setTab(entry)} style={{ backgroundColor: active ? "white" : "#f3f1ea", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, borderWidth: active ? 1 : 0, borderColor: "#eeeae4" }}>
              <Text style={{ fontWeight: "700", color: active ? "#1c1c1c" : "#8a918c" }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {shown.map((item) => {
        const mark = badge(item.status);
        return (
          <View key={item.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1eee8" }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#e7efe8", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="person" size={20} color="#146c36" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: "800", color: "#1c1c1c" }}>{item.name || "Buyer"}</Text>
              <Text style={{ color: "#6b7280", marginTop: 2 }} numberOfLines={1}>Interested in {item.property_title || "a property"}</Text>
              <Text style={{ color: "#9aa19c", fontSize: 12, marginTop: 2 }}>{timeAgo(item.created_at)}</Text>
            </View>
            <View style={{ backgroundColor: mark.bg, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: mark.color, fontWeight: "700", fontSize: 12 }}>{mark.label}</Text>
            </View>
          </View>
        );
      })}
      {loading ? <LogoLoader /> : null}
      {!loading && shown.length === 0 ? <EmptyState kind="search" /> : null}
      </ScrollView>
    </View>
  );
}

export function VisitsScreen() {
  const { token, me } = useAuth();
  const [items, setItems] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    api.visits(token).then((rows) => {
      if (active) setItems(rows);
    }).catch(() => {
      if (active) setItems([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [token]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader title="Scheduled Visits" />
      <ScrollView contentContainerStyle={styles.body}>
      {loading ? <LogoLoader /> : null}
      {!loading && items.length === 0 ? <EmptyState kind="search" /> : null}
      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.title}>{item.property_title}</Text>
            <Text style={styles.meta}>{item.status} · {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : ""}</Text>
            {item.buyer_id !== me?.profile?.id && item.status === "requested" && token ? (
              <Button title="Confirm" onPress={async () => {
                await api.updateVisit(item.id, { status: "confirmed" }, token);
                setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: "confirmed" } : row));
              }} />
            ) : null}
          </View>
        </View>
      ))}
      </ScrollView>
    </View>
  );
}

export function ProfileScreen() {
  const { me, token, refreshMe } = useAuth();
  const [fullName, setFullName] = useState(me?.profile?.full_name || "");
  const [phone, setPhone] = useState(me?.profile?.phone || "");
  const [city, setCity] = useState(me?.profile?.city || "");
  const [saved, setSaved] = useState("");
  async function save() {
    if (!token) return;
    await api.updateMe({ full_name: fullName, phone, city }, token);
    await refreshMe();
    setSaved("Profile saved.");
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.page }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <PageHeader title="Profile" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      {saved ? <Text style={styles.ok}>{saved}</Text> : null}
      <Field label="Name" value={fullName} onChangeText={setFullName} />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="City" value={city} onChangeText={setCity} />
      <Button title="Save" onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function NotificationsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    api.notifications(token).then((rows) => {
      if (active) setItems(rows);
    }).catch(() => {
      if (active) setItems([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [token]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader title="Messages" />
      <ScrollView contentContainerStyle={styles.body}>
      {items.map((item) => (
        <Pressable key={item.id} style={styles.card} onPress={async () => {
          if (!token) return;
          await api.readNotification(item.id, token);
          setItems((current) => current.map((row) => row.id === item.id ? { ...row, is_read: true } : row));
        }}>
          <View style={styles.cardBody}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.message}</Text>
          </View>
        </Pressable>
      ))}
      {loading ? <LogoLoader /> : null}
      {!loading && items.length === 0 ? <EmptyState kind="search" /> : null}
      </ScrollView>
    </View>
  );
}
