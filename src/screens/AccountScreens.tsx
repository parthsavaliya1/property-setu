import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Image, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardFormScroll, KeyboardScreen, requestScrollFocusedInput } from "../components/keyboard";
import { PropertyGridCard, propertyGridCardWidth, PropertyListCard, PropertyListSkeleton } from "../components/PropertyGridCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, EmptyState, Field, ListSkeleton, PageHeader, PropertyGridSkeleton, styles } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { api, inr, listingPrice } from "../lib/api";
import { useRazorpay } from "../components/RazorpayCheckout";
import { buttonShadow, colors } from "../theme";
import type { Inquiry, NotificationItem, PropertyCard, Visit, WalletTransaction } from "../types/database";

export function MenuScreen({
  onClose,
  onProfile,
  onFavorites,
  onChats,
  onInquiries,
  onVisits,
  onNotifications,
  onAbout,
  onSignIn,
}: {
  onClose?: () => void;
  onProfile: () => void;
  onFavorites: () => void;
  onChats: () => void;
  onInquiries: () => void;
  onVisits: () => void;
  onNotifications: () => void;
  onAbout: () => void;
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
    { label: "About us", icon: "information-circle-outline", onPress: onAbout },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.page, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Image source={require("../../assets/splash.png")} style={{ width: 40, height: 40, borderRadius: 10 }} resizeMode="cover" />
        <Text style={{ flex: 1, marginLeft: 10, fontSize: 18, fontWeight: "800", color: colors.ink }}>PropertySetu</Text>
        <Pressable onPress={onClose} hitSlop={12} style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.page }}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 28 }}>
        <Pressable onPress={() => (session ? onProfile() : onSignIn())} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.line }}>
          <View style={{ width: 50, height: 50, borderRadius: 25, overflow: "hidden", backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
            {me?.profile?.avatar_url ? <Image source={{ uri: me.profile.avatar_url }} style={{ width: 50, height: 50 }} /> : <Ionicons name="person" size={26} color={colors.primary} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "800", color: colors.ink }}>{name}</Text>
            <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 13, color: colors.muted }}>{session ? place || "View profile" : "Sign in"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Pressable>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
          {rows.map((row, index) => (
            <Pressable key={row.label} onPress={row.onPress} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: index === rows.length - 1 ? 0 : 1, borderBottomColor: colors.lineSoft }}>
              <Ionicons name={row.icon} size={22} color={colors.primary} />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: colors.ink }}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => (session ? signOut() : onSignIn())} style={{ marginTop: 16, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16 }}>
          <Ionicons name={session ? "log-out-outline" : "log-in-outline"} size={22} color={session ? colors.danger : colors.primary} />
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: session ? colors.danger : colors.primary }}>{session ? "Logout" : "Sign in"}</Text>
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
    <KeyboardScreen style={{ backgroundColor: colors.page }}>
      <PageHeader title="Wallet" />
      <KeyboardFormScroll contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>Wallet balance</Text>
          <Text style={{ color: colors.ink, fontSize: 32, fontWeight: "800", marginTop: 6 }}>{inr(balance)}</Text>
          <Text style={{ color: colors.muted, marginTop: 8 }}>Listing fees are taken from this wallet.</Text>
        </View>
        <Text style={{ fontWeight: "800", color: colors.ink, marginTop: 24, marginBottom: 8 }}>Add money</Text>
        <TextInput value={amount} onChangeText={setAmount} onFocus={requestScrollFocusedInput} keyboardType="number-pad" placeholder="Amount in rupees" placeholderTextColor={colors.faint} style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, height: 52, color: colors.ink }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {walletAmounts.map((value) => {
            const selected = amount === String(value);
            return (
              <Pressable key={value} onPress={() => setAmount(String(value))} style={{ backgroundColor: selected ? colors.primary : colors.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: selected ? colors.primary : colors.line }}>
                <Text style={{ color: selected ? colors.white : colors.muted, fontWeight: "700" }}>{inr(value)}</Text>
              </Pressable>
            );
          })}
        </View>
        {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}
        {note ? <Text style={{ color: colors.success, fontWeight: "700", marginTop: 12 }}>{note}</Text> : null}
        <Pressable onPress={() => addMoney()} disabled={busy || !token} style={({ pressed }) => ({ marginTop: 24, backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", opacity: busy ? 0.6 : 1, ...buttonShadow })}>
          <Text style={{ color: colors.white, fontWeight: "700" }}>{busy ? "Please wait..." : "Add to wallet"}</Text>
        </Pressable>
        <Pressable onPress={onHistory} style={{ marginTop: 14, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: 16, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontWeight: "700", color: colors.primary }}>Payment history</Text>
            <Text style={{ color: colors.muted, marginTop: 2, fontSize: 13 }}>Top-ups and listing charges</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
        {!token ? <Text style={{ color: colors.muted, marginTop: 12 }}>Sign in to use your wallet.</Text> : null}
      </KeyboardFormScroll>
    </KeyboardScreen>
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
        {loading ? <ListSkeleton /> : null}
        {!loading && items.length === 0 ? <Text style={{ color: colors.muted }}>No payments yet. Money you add and listing fees you pay will show here.</Text> : null}
        {!loading ? items.map((item) => {
          const credit = item.direction === "credit";
          const when = new Date(item.created_at);
          const date = Number.isNaN(when.getTime()) ? "" : when.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
          return (
            <View key={item.id} style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Text style={{ flex: 1, fontWeight: "600", color: colors.ink }}>{paymentTitle(item)}</Text>
                <Text style={{ fontWeight: "800", color: credit ? colors.success : colors.primary }}>{credit ? "+" : "−"}{inr(item.amount)}</Text>
              </View>
              {item.property_title ? <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={1}>{item.property_title}</Text> : null}
              <Text style={{ color: colors.faint, marginTop: 4, fontSize: 12 }}>{date}</Text>
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

function ActiveMark() {
  return (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "white", alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
    </View>
  );
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

function DeletePropertyDialog({
  title,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  title: string;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable onPress={busy ? undefined : onCancel} style={{ flex: 1, backgroundColor: "rgba(28,28,28,0.45)", justifyContent: "center", paddingHorizontal: 28 }}>
        <Pressable onPress={() => undefined} style={{ backgroundColor: colors.card, borderRadius: 18, padding: 20 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#F8E8E6", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
            <Ionicons name="trash-outline" size={24} color={colors.danger} />
          </View>
          <Text style={{ marginTop: 14, fontSize: 18, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
            {error ? "Could not delete property" : "Delete property"}
          </Text>
          <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 20, textAlign: "center" }}>
            {error || `Delete “${title}”? This removes the listing for everyone. This cannot be undone.`}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <Pressable onPress={onCancel} disabled={busy} style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, opacity: busy ? 0.6 : 1 }}>
              <Text style={{ fontWeight: "700", color: colors.primary }}>{error ? "Close" : "Cancel"}</Text>
            </Pressable>
            {error ? null : (
              <Pressable
                onPress={onConfirm}
                disabled={busy}
                style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 14, backgroundColor: pressed ? "#9A2E24" : colors.danger, alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1 })}
              >
                <Text style={{ color: colors.white, fontWeight: "700" }}>{busy ? "Deleting..." : "Delete"}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function propertyActions(item: PropertyCard, onEdit: (id: string) => void, onDelete: (item: PropertyCard) => void) {
  return (
    <View style={{ marginTop: 8, flexDirection: "row", gap: 6 }}>
      <Pressable onPress={() => onEdit(item.id)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, paddingVertical: 6 }}>
        <Ionicons name="create-outline" size={14} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Edit</Text>
      </Pressable>
      <Pressable onPress={() => onDelete(item)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 14, borderWidth: 1.5, borderColor: colors.danger, paddingVertical: 6 }}>
        <Ionicons name="trash-outline" size={14} color={colors.danger} />
        <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 12 }}>Delete</Text>
      </Pressable>
    </View>
  );
}

export function MyPropertiesScreen({ onOpen, onEdit }: { onOpen: (id: string) => void; onEdit: (id: string) => void }) {
  const { token, session } = useAuth();
  const pay = useRazorpay();
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof listingTabs)[number]["id"]>("active");
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PropertyCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function load(quiet = false) {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (quiet) setRefreshing(true);
    else setLoading(true);
    api.properties("?mine=true&limit=50", token).then((rows) => {
      setItems(rows);
    }).catch((err) => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
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

  async function removeListing() {
    if (!token || !pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.deleteProperty(pendingDelete.id, token);
      setItems((current) => current.filter((row) => row.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setDeleting(false);
    }
  }

  const shown = items.filter((item) => matchesTab(item.status, tab));
  const cardWidth = propertyGridCardWidth();
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader title="My Properties" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} colors={[colors.primary]} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: 44, marginBottom: 16 }} contentContainerStyle={{ alignItems: "center" }}>
        {listingTabs.map((entry) => {
          const active = tab === entry.id;
          return (
            <Pressable key={entry.id} onPress={() => setTab(entry.id)} style={{ backgroundColor: active ? colors.primary : colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: active ? colors.primary : colors.line }}>
              <Text style={{ color: active ? colors.white : colors.muted, fontWeight: "700" }}>{entry.label}</Text>
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
            corner={active ? <ActiveMark /> : undefined}
            footer={
              <View style={{ marginTop: 8, gap: 6 }}>
                {propertyActions(item, onEdit, (row) => { setDeleteError(""); setPendingDelete(row); })}
                {needsPay ? (
                  <Pressable onPress={() => activate(item)} disabled={payingId === item.id} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 6, alignItems: "center" }}>
                    <Text style={{ color: colors.white, fontWeight: "700", fontSize: 12 }}>{payingId === item.id ? "Please wait..." : `Pay ₹${listingFee(item)}`}</Text>
                  </Pressable>
                ) : !active ? (
                  <View style={{ alignSelf: "flex-start", backgroundColor: "#F8EEDD", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: colors.warning, fontWeight: "700", fontSize: 12 }}>{statusLabel(item.status)}</Text>
                  </View>
                ) : null}
              </View>
            }
          />
        );
      })}
      </View>
      ) : null}
      </ScrollView>
      {pendingDelete ? (
        <DeletePropertyDialog
          title={pendingDelete.title}
          busy={deleting}
          error={deleteError}
          onCancel={() => { if (!deleting) { setPendingDelete(null); setDeleteError(""); } }}
          onConfirm={() => void removeListing()}
        />
      ) : null}
    </View>
  );
}

export function FavoritesScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { items, ready, toggle, reload } = useFavorites();
  const loading = Boolean(token) && !ready;
  const [refreshing, setRefreshing] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 8 }}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: colors.ink }}>Favorites</Text>
      <Text style={{ color: colors.muted, marginTop: 2 }}>
        {!token ? "Sign in to see saved properties." : loading ? "Loading your saved homes" : `${items.length} ${items.length === 1 ? "property" : "properties"} saved`}
      </Text>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await reload(); } finally { setRefreshing(false); } }} tintColor={colors.primary} colors={[colors.primary]} />}>
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        {(["new", "contacted", "closed"] as const).map((entry) => {
          const active = tab === entry;
          const label = entry === "new" ? "New" : entry === "contacted" ? "Contacted" : "Closed";
          return (
            <Pressable key={entry} onPress={() => setTab(entry)} style={{ backgroundColor: active ? colors.primary : colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: active ? colors.primary : colors.line }}>
              <Text style={{ fontWeight: "700", color: active ? colors.white : colors.muted }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {loading ? <ListSkeleton /> : shown.map((item) => (
          <Pressable key={item.id} onPress={() => onChat(item.property_id, item.buyer_id)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.lineSoft }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: "600", color: colors.ink }}>{item.name || "Buyer"}</Text>
              <Text style={{ color: colors.muted, marginTop: 2 }} numberOfLines={1}>Interested in {item.property_title || "a property"}</Text>
              <Text style={{ color: colors.faint, fontSize: 12, marginTop: 2 }}>{timeAgo(item.created_at)}</Text>
            </View>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Chat</Text>
          </Pressable>
      ))}
      {!loading && shown.length === 0 ? <EmptyState kind="search" /> : null}
      </ScrollView>
    </View>
  );
}

function visitStatusStyle(status: string) {
  if (status === "confirmed") return { bg: "#E7F0EA", color: colors.success, label: "Confirmed" };
  if (status === "completed") return { bg: colors.primarySoft, color: colors.primaryDark, label: "Completed" };
  if (status === "cancelled") return { bg: "#F8E6E3", color: colors.danger, label: "Cancelled" };
  if (status === "rescheduled") return { bg: "#F8EEDD", color: colors.warning, label: "Rescheduled" };
  return { bg: "#F8EEDD", color: colors.warning, label: "Requested" };
}

function visitWhen(value?: string | null) {
  if (!value) return "Time not set";
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function VisitsScreen({ onOpen }: { onOpen: (id: string) => void }) {
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
      <PageHeader title="Scheduled Visits" subtitle={items.length ? `${items.length} visit${items.length === 1 ? "" : "s"}` : "Tap a visit to open the property"} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 }}>
      {loading ? <ListSkeleton /> : null}
      {!loading && items.length === 0 ? <EmptyState kind="search" /> : null}
      {!loading ? items.map((item) => {
        const tone = visitStatusStyle(item.status);
        const place = [item.locality, item.city].filter(Boolean).join(", ");
        const canConfirm = item.buyer_id !== me?.profile?.id && item.status === "requested" && Boolean(token);
        return (
          <View key={item.id} style={[styles.card, { marginBottom: 12 }]}>
            <Pressable onPress={() => onOpen(item.property_slug || item.property_id)} style={{ flexDirection: "row", padding: 12, gap: 12 }}>
              <View style={{ width: 84, height: 84, borderRadius: 16, overflow: "hidden", backgroundColor: colors.secondary }}>
                {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: "100%" }} /> : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="home-outline" size={26} color={colors.primary} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <Text style={{ flex: 1, fontWeight: "800", fontSize: 16, color: colors.ink }} numberOfLines={2}>{item.property_title || "Property"}</Text>
                  <View style={{ backgroundColor: tone.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: tone.color, fontSize: 11, fontWeight: "800" }}>{tone.label}</Text>
                  </View>
                </View>
                {place ? <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={1}>{place}</Text> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                  <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                  <Text style={{ color: colors.ink, fontWeight: "600", fontSize: 13 }}>{visitWhen(item.scheduled_at)}</Text>
                </View>
              </View>
            </Pressable>
            {canConfirm ? (
              <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                <Button title="Confirm visit" onPress={async () => {
                  if (!token) return;
                  await api.updateVisit(item.id, { status: "confirmed" }, token);
                  setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: "confirmed" } : row));
                }} />
              </View>
            ) : null}
          </View>
        );
      }) : null}
      </ScrollView>
    </View>
  );
}

export function ProfileScreen({
  showBack,
  onOpen,
  onEdit,
  onEditProfile,
  onWallet,
  onHistory,
  onSignIn,
}: {
  showBack?: boolean;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onEditProfile: () => void;
  onWallet: () => void;
  onHistory: () => void;
  onSignIn: () => void;
}) {
  const { me, token, session } = useAuth();
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState(0);
  const [properties, setProperties] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PropertyCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const cardWidth = propertyGridCardWidth();

  const loadProfile = useCallback(async (quiet = false) => {
    if (!token) {
      setBalance(0);
      setProperties([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const [wallet, rows] = await Promise.all([api.wallet(token), api.properties("?mine=true&limit=50", token)]);
      setBalance(wallet.balance);
      setProperties(rows);
    } catch {
      if (!quiet) setProperties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfile(false);
  }, [loadProfile]);

  async function removeListing() {
    if (!token || !pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.deleteProperty(pendingDelete.id, token);
      setProperties((current) => current.filter((row) => row.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      {showBack ? <PageHeader title="Profile" /> : <View style={{ height: insets.top + 8 }} />}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} tintColor={colors.primary} colors={[colors.primary]} />}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, overflow: "hidden", backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
            {me?.profile?.avatar_url ? <Image source={{ uri: me.profile.avatar_url }} style={{ width: 64, height: 64 }} /> : <Ionicons name="person" size={28} color={colors.primary} />}
          </View>
          <View style={{ flex: 1, minWidth: 0, paddingRight: session ? 28 : 0 }}>
            <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: "800", color: colors.ink }}>{me?.profile?.full_name || "Guest"}</Text>
            <Text numberOfLines={1} style={{ marginTop: 4, color: colors.muted }}>{session ? me?.profile?.city || session.user.email : "Sign in to see your account"}</Text>
          </View>
          {session ? (
            <Pressable onPress={onEditProfile} hitSlop={8} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>

        {!session ? (
          <Pressable onPress={onSignIn} style={({ pressed }) => ({ marginTop: 16, backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", ...buttonShadow })}>
            <Text style={{ color: colors.white, fontWeight: "700" }}>Sign in</Text>
          </Pressable>
        ) : (
          <>
            <View style={{ marginTop: 16, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
              <Text style={{ color: colors.muted, fontWeight: "600" }}>Wallet balance</Text>
              <Text style={{ marginTop: 6, fontSize: 30, fontWeight: "800", color: colors.ink }}>{loading ? "..." : inr(balance)}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                <Pressable onPress={onWallet} style={({ pressed }) => ({ flex: 1, backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" })}>
                  <Text style={{ color: colors.white, fontWeight: "700" }}>Add money</Text>
                </Pressable>
                <Pressable onPress={onHistory} style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, height: 52, alignItems: "center", justifyContent: "center", backgroundColor: colors.card }}>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>History</Text>
                </Pressable>
              </View>
            </View>

            <Text style={{ marginTop: 28, marginBottom: 12, fontSize: 18, fontWeight: "800", color: colors.ink }}>My properties</Text>
            {loading ? <PropertyGridSkeleton width={cardWidth} /> : null}
            {!loading && properties.length === 0 ? <Text style={{ color: colors.muted }}>You have not listed a property yet.</Text> : null}
            {!loading && properties.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {properties.map((item) => (
                  <PropertyGridCard
                    key={item.id}
                    item={item}
                    width={cardWidth}
                    onPress={() => onOpen(item.slug || item.id)}
                    corner={item.status === "published" ? <ActiveMark /> : undefined}
                    footer={
                      <View style={{ marginTop: 8, gap: 6 }}>
                        {propertyActions(item, onEdit, (row) => { setDeleteError(""); setPendingDelete(row); })}
                        {item.status !== "published" ? (
                          <View style={{ alignSelf: "flex-start", backgroundColor: "#F8EEDD", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ color: colors.warning, fontWeight: "700", fontSize: 12 }}>{statusLabel(item.status)}</Text>
                          </View>
                        ) : null}
                      </View>
                    }
                  />
                ))}
              </View>
            ) : null}
          </>
        )}

        {pendingDelete ? (
          <DeletePropertyDialog
            title={pendingDelete.title}
            busy={deleting}
            error={deleteError}
            onCancel={() => { if (!deleting) { setPendingDelete(null); setDeleteError(""); } }}
            onConfirm={() => void removeListing()}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

export function EditProfileScreen() {
  const { me, token, refreshMe } = useAuth();
  const [fullName, setFullName] = useState(me?.profile?.full_name || "");
  const [phone, setPhone] = useState(me?.profile?.phone || "");
  const [city, setCity] = useState(me?.profile?.city || "");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setFullName(me?.profile?.full_name || "");
    setPhone(me?.profile?.phone || "");
    setCity(me?.profile?.city || "");
  }, [me?.profile?.full_name, me?.profile?.phone, me?.profile?.city]);

  async function save() {
    if (!token) return;
    await api.updateMe({ full_name: fullName, phone, city }, token);
    await refreshMe();
    setSaved("Profile saved.");
  }

  return (
    <KeyboardScreen style={{ backgroundColor: colors.page }}>
      <PageHeader title="Edit profile" />
      <KeyboardFormScroll contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 }}>
          {saved ? <Text style={styles.ok}>{saved}</Text> : null}
          <Field label="Name" value={fullName} onChangeText={setFullName} />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="City" value={city} onChangeText={setCity} />
          <Button title="Save" onPress={save} />
        </View>
      </KeyboardFormScroll>
    </KeyboardScreen>
  );
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (sameDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function noticeVisual(type: string) {
  if (type === "new_inquiry") return { icon: "chatbubble-ellipses-outline" as const, bg: colors.primarySoft, color: colors.primaryDark, chip: "Enquiry" };
  if (type === "visit_confirmed") return { icon: "checkmark-circle-outline" as const, bg: "#E7F0EA", color: colors.success, chip: "Visit" };
  return { icon: "calendar-outline" as const, bg: "#F8EEDD", color: colors.warning, chip: "Visit" };
}

export function NotificationsScreen({ onOpen }: { onOpen: (item: NotificationItem) => void }) {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "enquiry" | "visit">("all");

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

  const unread = items.filter((item) => !item.is_read).length;
  const shown = items.filter((item) => {
    if (filter === "enquiry") return item.type === "new_inquiry";
    if (filter === "visit") return item.type === "visit_request" || item.type === "visit_confirmed";
    return true;
  });

  async function refresh() {
    if (!token) return;
    setRefreshing(true);
    try {
      setItems(await api.notifications(token));
    } catch {
      setItems([]);
    } finally {
      setRefreshing(false);
    }
  }

  async function markAll() {
    if (!token || !unread) return;
    await api.readNotifications(token);
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  const tabs = [
    { id: "all" as const, label: "All" },
    { id: "enquiry" as const, label: "Enquiries" },
    { id: "visit" as const, label: "Visits" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "You're all caught up"}
        right={(
          <Pressable
            onPress={markAll}
            disabled={!unread}
            hitSlop={8}
            style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: unread ? 1 : 0.4 }}
          >
            <Ionicons name="checkmark-done-outline" size={20} color={colors.primaryDark} />
          </Pressable>
        )}
      />
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        {tabs.map((tab) => {
          const active = filter === tab.id;
          return (
            <Pressable key={tab.id} onPress={() => setFilter(tab.id)} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: active ? colors.primary : colors.primarySoft, borderWidth: 1, borderColor: active ? colors.primary : colors.line }}>
              <Text style={{ fontWeight: "700", fontSize: 13, color: active ? colors.white : colors.muted }}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
      {loading ? <View style={{ paddingHorizontal: 16 }}><ListSkeleton /></View> : shown.map((item, index) => {
        const visual = noticeVisual(item.type);
        const label = dayLabel(item.created_at);
        const previous = index > 0 ? dayLabel(shown[index - 1].created_at) : null;
        return (
          <View key={item.id}>
            {label !== previous ? <Text style={{ marginTop: 8, marginBottom: 6, marginHorizontal: 20, fontSize: 13, fontWeight: "800", color: colors.muted }}>{label}</Text> : null}
            <Pressable onPress={async () => {
              if (!token) return;
              if (!item.is_read) {
                await api.readNotification(item.id, token);
                setItems((current) => current.map((row) => row.id === item.id ? { ...row, is_read: true } : row));
              }
              onOpen(item);
            }} style={{ marginHorizontal: 16, marginBottom: 8, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
              {!item.is_read ? <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.primary }} /> : null}
              <View style={{ flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: visual.bg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={visual.icon} size={20} color={visual.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: item.is_read ? "700" : "800", color: colors.ink, lineHeight: 21 }}>{item.title}</Text>
                    {!item.is_read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.warning, marginTop: 6 }} /> : null}
                  </View>
                  {item.message ? <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: colors.muted }}>{item.message}</Text> : null}
                  <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="time-outline" size={13} color={colors.faint} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.faint }}>{new Date(item.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</Text>
                    <View style={{ marginLeft: "auto", backgroundColor: visual.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: visual.color }}>{visual.chip}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        );
      })}
      {!loading && shown.length === 0 ? (
        <View style={{ alignItems: "center", marginHorizontal: 16, marginTop: 24, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
          <Ionicons name="notifications-off-outline" size={34} color={colors.faint} />
          <Text style={{ marginTop: 10, fontSize: 18, fontWeight: "800", color: colors.ink }}>No notifications</Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: colors.muted, textAlign: "center" }}>Enquiries and visit requests from other people show up here.</Text>
        </View>
      ) : null}
      </ScrollView>
    </View>
  );
}
