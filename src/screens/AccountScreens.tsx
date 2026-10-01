import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { PropertyGridCard, propertyGridCardWidth, PropertyListCard, PropertyListSkeleton } from "../components/PropertyGridCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, EmptyState, Field, ListSkeleton, PageHeader, PropertyGridSkeleton, styles } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { api, inr, listingPrice } from "../lib/api";
import { useRazorpay } from "../components/RazorpayCheckout";
import { colors } from "../theme";
import type { Inquiry, NotificationItem, PropertyCard, Visit, WalletTransaction } from "../types/database";

export function MenuScreen({
  onClose,
  onProfile,
  onFavorites,
  onChats,
  onInquiries,
  onVisits,
  onNotifications,
  onSignIn,
}: {
  onClose?: () => void;
  onProfile: () => void;
  onFavorites: () => void;
  onChats: () => void;
  onInquiries: () => void;
  onVisits: () => void;
  onNotifications: () => void;
  onSignIn: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { session, me, signOut } = useAuth();
  const name = me?.profile?.full_name || "Guest";
  const place = [me?.profile?.city].filter(Boolean).join(", ");
  const rows: Array<{ label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }> = [
    { label: "Favorites", icon: "heart-outline", onPress: onFavorites },
    { label: "Messages", icon: "chatbubbles-outline", onPress: onChats },
    { label: "Inquiries", icon: "document-text-outline", onPress: onInquiries },
    { label: "Scheduled visits", icon: "calendar-outline", onPress: onVisits },
    { label: "Notifications", icon: "notifications-outline", onPress: onNotifications },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.page, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#E7E0D6" }}>
        <View style={{ width: 42 }} />
        <Image source={require("../../assets/splash.png")} style={{ width: 44, height: 44, borderRadius: 12 }} resizeMode="cover" />
        <Pressable onPress={onClose} hitSlop={12} style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.page }}>
          <Ionicons name="close" size={22} color="#1A1A1A" />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 28 }}>
        <Pressable onPress={() => (session ? onProfile() : onSignIn())} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#E7E0D6" }}>
          <View style={{ width: 50, height: 50, borderRadius: 25, overflow: "hidden", backgroundColor: "#E7D9C8", alignItems: "center", justifyContent: "center" }}>
            {me?.profile?.avatar_url ? <Image source={{ uri: me.profile.avatar_url }} style={{ width: 50, height: 50 }} /> : <Ionicons name="person" size={26} color="#8C5A3C" />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "800", color: "#1A1A1A" }}>{name}</Text>
            <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 13, fontWeight: "600", color: "#8A8178" }}>{session ? place || "View profile" : "Sign in"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8A8178" />
        </Pressable>
        <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#E7E0D6", overflow: "hidden" }}>
          {rows.map((row, index) => (
            <Pressable key={row.label} onPress={row.onPress} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: index === rows.length - 1 ? 0 : 1, borderBottomColor: "#E7E0D6" }}>
              <Ionicons name={row.icon} size={22} color="#2C2825" />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: "#1A1A1A" }}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#C4C4C4" />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => (session ? signOut() : onSignIn())} style={{ marginTop: 16, backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#E7E0D6", flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16 }}>
          <Ionicons name={session ? "log-out-outline" : "log-in-outline"} size={22} color="#B42318" />
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: "#B42318" }}>{session ? "Logout" : "Sign in"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const walletAmounts = [20, 30, 100, 204, 306, 500];

export function WalletScreen({ onHistory }: { onHistory: () => void }) {
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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "#EFE8DE" }}>
          <Text style={{ color: "#8A8178", fontWeight: "700" }}>Wallet balance</Text>
          <Text style={{ color: "#2C2825", fontSize: 32, fontWeight: "800", marginTop: 6 }}>{inr(balance)}</Text>
          <Text style={{ color: "#8A8178", marginTop: 8 }}>Listing fees are taken from this wallet.</Text>
        </View>
        <Text style={{ fontWeight: "800", color: "#2C2825", marginTop: 18, marginBottom: 8 }}>Add money</Text>
        <TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="Amount in rupees" placeholderTextColor="#A39B92" style={{ backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#E7E0D6", paddingHorizontal: 14, paddingVertical: 12, color: "#2C2825" }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {walletAmounts.map((value) => {
            const selected = amount === String(value);
            return (
              <Pressable key={value} onPress={() => setAmount(String(value))} style={{ backgroundColor: selected ? "#2C2825" : "white", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: selected ? "#2C2825" : "#E7E0D6" }}>
                <Text style={{ color: selected ? "white" : "#2C2825", fontWeight: "700" }}>{inr(value)}</Text>
              </Pressable>
            );
          })}
        </View>
        {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}
        {note ? <Text style={{ color: "#8C5A3C", fontWeight: "700", marginTop: 12 }}>{note}</Text> : null}
        <Pressable onPress={() => addMoney()} disabled={busy || !token} style={{ marginTop: 18, backgroundColor: "#2C2825", borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: busy ? 0.6 : 1 }}>
          <Text style={{ color: "white", fontWeight: "800" }}>{busy ? "Please wait..." : "Add to wallet"}</Text>
        </Pressable>
        <Pressable onPress={onHistory} style={{ marginTop: 14, backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#EFE8DE", paddingHorizontal: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontWeight: "800", color: "#2C2825" }}>Payment history</Text>
            <Text style={{ color: "#8A8178", marginTop: 2, fontSize: 13 }}>Top-ups and listing charges</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8A8178" />
        </Pressable>
        {!token ? <Text style={{ color: "#8A8178", marginTop: 12 }}>Sign in to use your wallet.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function paymentTitle(item: WalletTransaction) {
  if (item.reason === "wallet_topup") return "Added to wallet";
  if (item.reason === "listing_year") return "Listing for 1 year";
  if (item.reason === "listing_month") return "Listing for 1 month";
  return item.reason.replace(/_/g, " ");
}

export function PaymentHistoryScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api.walletHistory(token).then((rows) => {
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
      <PageHeader title="Payment history" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        {loading ? <ListSkeleton /> : null}
        {!loading && items.length === 0 ? <Text style={{ color: "#8A8178" }}>No payments yet. Money you add and listing fees you pay will show here.</Text> : null}
        {!loading ? items.map((item) => {
          const credit = item.direction === "credit";
          const when = new Date(item.created_at);
          const date = Number.isNaN(when.getTime()) ? "" : when.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
          return (
            <View key={item.id} style={{ backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#EFE8DE", padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Text style={{ flex: 1, fontWeight: "800", color: "#2C2825" }}>{paymentTitle(item)}</Text>
                <Text style={{ fontWeight: "800", color: credit ? "#2C2825" : "#8C5A3C" }}>{credit ? "+" : "−"}{inr(item.amount)}</Text>
              </View>
              {item.property_title ? <Text style={{ color: "#5c564e", marginTop: 4 }} numberOfLines={1}>{item.property_title}</Text> : null}
              <Text style={{ color: "#8A8178", marginTop: 4, fontSize: 12 }}>{date}</Text>
            </View>
          );
        }) : null}
      </ScrollView>
    </View>
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
  const cardWidth = propertyGridCardWidth();
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
      {token && loading ? <PropertyGridSkeleton width={cardWidth} /> : null}
      {token && !loading && shown.length === 0 ? <EmptyState kind={tab === "active" ? "active" : "search"} /> : null}
      {token && !loading ? (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {shown.map((item) => {
        const active = item.status === "published";
        const needsPay = item.status === "expired" || item.status === "draft" || item.status === "pending_review";
        return (
          <PropertyGridCard
            key={item.id}
            item={item}
            width={cardWidth}
            onPress={() => onOpen(item.slug || item.id)}
            footer={
              <View style={{ marginTop: 8, gap: 6 }}>
                <Pressable onPress={() => onEdit(item.id)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 10, borderWidth: 1, borderColor: "#E7E0D6", paddingVertical: 6 }}>
                  <Ionicons name="create-outline" size={14} color="#8C5A3C" />
                  <Text style={{ color: "#8C5A3C", fontWeight: "700", fontSize: 12 }}>Edit</Text>
                </Pressable>
                {needsPay ? (
                  <Pressable onPress={() => activate(item)} disabled={payingId === item.id} style={{ backgroundColor: "#146c36", borderRadius: 10, paddingVertical: 6, alignItems: "center" }}>
                    <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>{payingId === item.id ? "Please wait..." : `Pay ₹${listingFee(item)}`}</Text>
                  </Pressable>
                ) : (
                  <View style={{ backgroundColor: active ? "#e7f6ec" : "#fff1e6", borderRadius: 10, paddingVertical: 6, alignItems: "center" }}>
                    <Text style={{ color: active ? "#146c36" : "#e08a3c", fontWeight: "700", fontSize: 12 }}>{statusLabel(item.status)}</Text>
                  </View>
                )}
              </View>
            }
          />
        );
      })}
      </View>
      ) : null}
      </ScrollView>
    </View>
  );
}

export function FavoritesScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { items, ready, toggle } = useFavorites();
  const loading = Boolean(token) && !ready;
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 8 }}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: "#1c1c1c" }}>Favorites</Text>
      <Text style={{ color: "#8a918c", marginTop: 2 }}>
        {!token ? "Sign in to see saved properties." : loading ? "Loading your saved homes" : `${items.length} ${items.length === 1 ? "property" : "properties"} saved`}
      </Text>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      {loading ? <PropertyListSkeleton /> : null}
      {token && !loading && items.length === 0 ? <EmptyState kind="search" /> : null}
      {!loading ? items.map((item) => (
        <PropertyListCard
          key={item.id}
          item={item}
          saved
          onPress={() => onOpen(item.slug || item.id)}
          onSave={() => toggle(item)}
        />
      )) : null}
    </ScrollView>
    </View>
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

export function InquiriesScreen({ onChat }: { onChat: (propertyId: string, buyerId?: string | null) => void }) {
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
      {loading ? <ListSkeleton /> : shown.map((item) => (
          <Pressable key={item.id} onPress={() => onChat(item.property_id, item.buyer_id)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1eee8" }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#e7efe8", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="person" size={20} color="#146c36" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: "800", color: "#1c1c1c" }}>{item.name || "Buyer"}</Text>
              <Text style={{ color: "#6b7280", marginTop: 2 }} numberOfLines={1}>Interested in {item.property_title || "a property"}</Text>
              <Text style={{ color: "#9aa19c", fontSize: 12, marginTop: 2 }}>{timeAgo(item.created_at)}</Text>
            </View>
            <Text style={{ color: "#146c36", fontWeight: "800" }}>Chat</Text>
          </Pressable>
      ))}
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
      {loading ? <ListSkeleton /> : null}
      {!loading && items.length === 0 ? <EmptyState kind="search" /> : null}
      {!loading ? items.map((item) => (
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
      )) : null}
      </ScrollView>
    </View>
  );
}

export function ProfileScreen({
  showBack,
  onOpen,
  onEdit,
  onWallet,
  onHistory,
  onSignIn,
}: {
  showBack?: boolean;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onWallet: () => void;
  onHistory: () => void;
  onSignIn: () => void;
}) {
  const { me, token, session, refreshMe } = useAuth();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState(me?.profile?.full_name || "");
  const [phone, setPhone] = useState(me?.profile?.phone || "");
  const [city, setCity] = useState(me?.profile?.city || "");
  const [saved, setSaved] = useState("");
  const [balance, setBalance] = useState(0);
  const [properties, setProperties] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const cardWidth = propertyGridCardWidth();

  useEffect(() => {
    setFullName(me?.profile?.full_name || "");
    setPhone(me?.profile?.phone || "");
    setCity(me?.profile?.city || "");
  }, [me?.profile?.full_name, me?.profile?.phone, me?.profile?.city]);

  useEffect(() => {
    if (!token) {
      setBalance(0);
      setProperties([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([api.wallet(token), api.properties("?mine=true&limit=50", token)])
      .then(([wallet, rows]) => {
        if (!active) return;
        setBalance(wallet.balance);
        setProperties(rows);
      })
      .catch(() => {
        if (!active) return;
        setProperties([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function save() {
    if (!token) return;
    await api.updateMe({ full_name: fullName, phone, city }, token);
    await refreshMe();
    setSaved("Profile saved.");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.page }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {showBack ? <PageHeader title="Profile" /> : <View style={{ height: insets.top + 8 }} />}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#EFE8DE", padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, overflow: "hidden", backgroundColor: "#E7D9C8", alignItems: "center", justifyContent: "center" }}>
            {me?.profile?.avatar_url ? <Image source={{ uri: me.profile.avatar_url }} style={{ width: 64, height: 64 }} /> : <Ionicons name="person" size={28} color="#8C5A3C" />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: "800", color: "#1A1A1A" }}>{me?.profile?.full_name || "Guest"}</Text>
            <Text numberOfLines={1} style={{ marginTop: 4, color: "#8A8178", fontWeight: "600" }}>{session ? me?.profile?.city || session.user.email : "Sign in to see your account"}</Text>
          </View>
        </View>

        {!session ? (
          <Pressable onPress={onSignIn} style={{ marginTop: 16, backgroundColor: "#2C2825", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "800" }}>Sign in</Text>
          </Pressable>
        ) : (
          <>
            <View style={{ marginTop: 14, backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#EFE8DE", padding: 16 }}>
              <Text style={{ color: "#8A8178", fontWeight: "700" }}>Wallet balance</Text>
              <Text style={{ marginTop: 6, fontSize: 30, fontWeight: "800", color: "#2C2825" }}>{loading ? "..." : inr(balance)}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                <Pressable onPress={onWallet} style={{ flex: 1, backgroundColor: "#2C2825", borderRadius: 12, paddingVertical: 10, alignItems: "center" }}>
                  <Text style={{ color: "white", fontWeight: "800" }}>Add money</Text>
                </Pressable>
                <Pressable onPress={onHistory} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: "#E7E0D6", paddingVertical: 10, alignItems: "center" }}>
                  <Text style={{ color: "#2C2825", fontWeight: "800" }}>History</Text>
                </Pressable>
              </View>
            </View>

            <Text style={{ marginTop: 22, marginBottom: 12, fontSize: 18, fontWeight: "800", color: "#2C2825" }}>My properties</Text>
            {loading ? <PropertyGridSkeleton width={cardWidth} count={2} /> : null}
            {!loading && properties.length === 0 ? <Text style={{ color: "#8A8178" }}>You have not listed a property yet.</Text> : null}
            {!loading && properties.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {properties.map((item) => (
                  <PropertyGridCard
                    key={item.id}
                    item={item}
                    width={cardWidth}
                    onPress={() => onOpen(item.slug || item.id)}
                    footer={
                      <View style={{ marginTop: 8, gap: 6 }}>
                        <Pressable onPress={() => onEdit(item.id)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 10, borderWidth: 1, borderColor: "#E7E0D6", paddingVertical: 6 }}>
                          <Ionicons name="create-outline" size={14} color="#8C5A3C" />
                          <Text style={{ color: "#8C5A3C", fontWeight: "700", fontSize: 12 }}>Edit</Text>
                        </Pressable>
                        <View style={{ backgroundColor: item.status === "published" ? "#F4EFE8" : "#FFF4E8", borderRadius: 10, paddingVertical: 6, alignItems: "center" }}>
                          <Text style={{ color: "#2C2825", fontWeight: "700", fontSize: 12 }}>{statusLabel(item.status)}</Text>
                        </View>
                      </View>
                    }
                  />
                ))}
              </View>
            ) : null}

            <View style={{ marginTop: 22, backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#EFE8DE", padding: 16, gap: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#1A1A1A" }}>Your details</Text>
              {saved ? <Text style={styles.ok}>{saved}</Text> : null}
              <Field label="Name" value={fullName} onChangeText={setFullName} />
              <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Field label="City" value={city} onChangeText={setCity} />
              <Button title="Save" onPress={save} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function NotificationsScreen({ onOpen }: { onOpen: (item: NotificationItem) => void }) {
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
      <PageHeader title="Notifications" />
      <ScrollView contentContainerStyle={styles.body}>
      {loading ? <ListSkeleton /> : items.map((item) => (
        <Pressable key={item.id} style={[styles.card, { borderWidth: item.is_read ? 0 : 1, borderColor: "#146c36" }]} onPress={async () => {
          if (!token) return;
          await api.readNotification(item.id, token);
          setItems((current) => current.map((row) => row.id === item.id ? { ...row, is_read: true } : row));
          onOpen(item);
        }}>
          <View style={styles.cardBody}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.message}</Text>
          </View>
        </Pressable>
      ))}
      {!loading && items.length === 0 ? <Text style={styles.meta}>No notifications yet. Saves, enquiries, visits, and messages show up here.</Text> : null}
      </ScrollView>
    </View>
  );
}
