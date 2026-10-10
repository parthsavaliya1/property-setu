import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { KeyboardFormScroll, KeyboardScreen, requestScrollFocusedInput } from "../components/keyboard";
import { VoiceTextInput } from "../components/VoiceField";
import { PropertyGridCard, propertyGridCardWidth, PropertyListCard, PropertyListSkeleton } from "../components/PropertyGridCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, EmptyState, Field, ListSkeleton, PageHeader, PropertyGridSkeleton, styles } from "../components/ui";
import { useLanguagePicker } from "../components/LanguagePicker";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useI18n } from "../i18n";
import { getCopy, getLocale } from "../i18n/active";
import { fill } from "../i18n/format";
import { api, inr, listingPrice, PROPERTY_PAGE_SIZE } from "../lib/api";
import { nearScrollEnd, usePagedProperties } from "../lib/paging";
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
  onPrivacy,
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
  onPrivacy: () => void;
  onSignIn: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const language = useLanguagePicker();
  const { session, me, signOut } = useAuth();
  const name = me?.profile?.full_name || t.common.guest;
  const place = [me?.profile?.city].filter(Boolean).join(", ");
  const rows: Array<{ label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; value?: string }> = [
    { label: t.menu.favorites, icon: "heart-outline", onPress: onFavorites },
    { label: t.menu.messages, icon: "chatbubbles-outline", onPress: onChats },
    { label: t.menu.inquiries, icon: "document-text-outline", onPress: onInquiries },
    { label: t.menu.visits, icon: "calendar-outline", onPress: onVisits },
    { label: t.menu.notifications, icon: "notifications-outline", onPress: onNotifications },
    { label: t.menu.about, icon: "information-circle-outline", onPress: onAbout },
    { label: t.menu.privacy, icon: "shield-checkmark-outline", onPress: onPrivacy },
    { label: t.menu.language, icon: "language-outline", onPress: language.openPicker, value: language.nativeName },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.page, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <Image source={require("../../assets/splash.png")} style={{ width: 32, height: 32 }} resizeMode="contain" />
        </View>
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
            <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 13, color: colors.muted }}>{session ? place || t.menu.viewProfile : t.common.signIn}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Pressable>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
          {rows.map((row, index) => (
            <Pressable key={row.label} onPress={row.onPress} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: index === rows.length - 1 ? 0 : 1, borderBottomColor: colors.lineSoft }}>
              <Ionicons name={row.icon} size={22} color={colors.primary} />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: colors.ink }}>{row.label}</Text>
              {row.value ? <Text style={{ color: colors.muted, fontWeight: "700" }}>{row.value}</Text> : null}
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => (session ? signOut() : onSignIn())} style={{ marginTop: 16, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16 }}>
          <Ionicons name={session ? "log-out-outline" : "log-in-outline"} size={22} color={session ? colors.danger : colors.primary} />
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: session ? colors.danger : colors.primary }}>{session ? t.common.logout : t.common.signIn}</Text>
        </Pressable>
      </ScrollView>
      {language.modal}
    </View>
  );
}

const walletAmounts = [20, 30, 100, 204, 306, 500];

export function WalletScreen({ onHistory }: { onHistory: () => void }) {
  const { token, session } = useAuth();
  const { t } = useI18n();
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
      setError(t.account.wholeAmount);
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
        email: session?.user.email || undefined,
      });
      const result = await api.walletVerify({
        razorpay_order_id: paid.razorpay_order_id,
        razorpay_payment_id: paid.razorpay_payment_id,
        razorpay_signature: paid.razorpay_signature,
      }, token);
      setBalance(result.balance);
      setNote(fill(t.account.added, { amount: inr(rupees) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.account.addFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardScreen style={{ backgroundColor: colors.page }}>
      <PageHeader title={t.account.wallet} />
      <KeyboardFormScroll contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>{t.account.balance}</Text>
          <Text style={{ color: colors.ink, fontSize: 32, fontWeight: "800", marginTop: 6 }}>{inr(balance)}</Text>
          <Text style={{ color: colors.muted, marginTop: 8 }}>{t.account.walletHint}</Text>
        </View>
        <Text style={{ fontWeight: "800", color: colors.ink, marginTop: 24, marginBottom: 8 }}>{t.account.addMoney}</Text>
        <VoiceTextInput value={amount} onChangeText={setAmount} onFocus={requestScrollFocusedInput} keyboardType="number-pad" spoken="amount" placeholder={t.account.amountPlaceholder} placeholderTextColor={colors.faint} style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, height: 52, color: colors.ink }} />
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
          <Text style={{ color: colors.white, fontWeight: "700" }}>{busy ? t.common.pleaseWait : t.account.addToWallet}</Text>
        </Pressable>
        <Pressable onPress={onHistory} style={{ marginTop: 14, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: 16, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontWeight: "700", color: colors.primary }}>{t.account.paymentHistory}</Text>
            <Text style={{ color: colors.muted, marginTop: 2, fontSize: 13 }}>{t.account.historyHint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
        {!token ? <Text style={{ color: colors.muted, marginTop: 12 }}>{t.account.signInWallet}</Text> : null}
      </KeyboardFormScroll>
    </KeyboardScreen>
  );
}

function paymentTitle(item: WalletTransaction) {
  const text = getCopy().account;
  if (item.reason === "wallet_topup") return text.topup;
  if (item.reason === "listing_year") return text.yearFee;
  if (item.reason === "listing_month") return text.monthFee;
  return item.reason.replace(/_/g, " ");
}

export function PaymentHistoryScreen() {
  const { token } = useAuth();
  const { t } = useI18n();
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
      <PageHeader title={t.account.paymentHistory} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
        {loading ? <ListSkeleton /> : null}
        {!loading && items.length === 0 ? <Text style={{ color: colors.muted }}>{t.account.noPayments}</Text> : null}
        {!loading ? items.map((item) => {
          const credit = item.direction === "credit";
          const when = new Date(item.created_at);
          const date = Number.isNaN(when.getTime()) ? "" : when.toLocaleString(getLocale(), { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
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
  const text = getCopy().account;
  if (status === "published") return text.active;
  if (status === "pending_review" || status === "draft") return text.draft;
  if (status === "expired") return text.expired;
  if (status === "sold") return text.sold;
  if (status === "rented") return text.rented;
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function listingTabLabel(id: (typeof listingTabs)[number]["id"]) {
  const text = getCopy().account;
  if (id === "active") return text.active;
  if (id === "expired") return text.expired;
  if (id === "draft") return text.draft;
  if (id === "sold") return text.sold;
  return text.rented;
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
  const { t } = useI18n();
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable onPress={busy ? undefined : onCancel} style={{ flex: 1, backgroundColor: "rgba(28,28,28,0.45)", justifyContent: "center", paddingHorizontal: 28 }}>
        <Pressable onPress={() => undefined} style={{ backgroundColor: colors.card, borderRadius: 18, padding: 20 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#F8E8E6", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
            <Ionicons name="trash-outline" size={24} color={colors.danger} />
          </View>
          <Text style={{ marginTop: 14, fontSize: 18, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
            {error ? t.details.deleteFailed : t.details.deleteTitle}
          </Text>
          <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 20, textAlign: "center" }}>
            {error || fill(t.details.deleteBody, { title })}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <Pressable onPress={onCancel} disabled={busy} style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, opacity: busy ? 0.6 : 1 }}>
                <Text style={{ fontWeight: "700", color: colors.primary }}>{error ? t.common.close : t.common.cancel}</Text>
            </Pressable>
            {error ? null : (
              <Pressable
                onPress={onConfirm}
                disabled={busy}
                style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 14, backgroundColor: pressed ? "#9A2E24" : colors.danger, alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1 })}
              >
                <Text style={{ color: colors.white, fontWeight: "700" }}>{busy ? t.common.deleting : t.common.delete}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function closedStatus(item: PropertyCard) {
  return item.listing_type === "sale" ? "sold" : "rented";
}

function stillListed(item: PropertyCard) {
  if (!item.expires_at) return true;
  const expires = new Date(item.expires_at).getTime();
  return !Number.isNaN(expires) && expires > Date.now();
}

function MarkClosedDialog({
  item,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  item: PropertyCard;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const sold = item.listing_type === "sale";
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable onPress={busy ? undefined : onCancel} style={{ flex: 1, backgroundColor: "rgba(28,28,28,0.45)", justifyContent: "center", paddingHorizontal: 28 }}>
        <Pressable onPress={() => undefined} style={{ backgroundColor: colors.card, borderRadius: 18, padding: 20 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#F8EEDD", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
            <Ionicons name="pricetag-outline" size={24} color={colors.warning} />
          </View>
          <Text style={{ marginTop: 14, fontSize: 18, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
            {error ? t.account.markFailed : sold ? t.account.markSoldTitle : t.account.markRentedTitle}
          </Text>
          <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 20, textAlign: "center" }}>
            {error || fill(sold ? t.account.markSoldBody : t.account.markRentedBody, { title: item.title })}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <Pressable onPress={onCancel} disabled={busy} style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, opacity: busy ? 0.6 : 1 }}>
              <Text style={{ fontWeight: "700", color: colors.primary }}>{error ? t.common.close : t.common.cancel}</Text>
            </Pressable>
            {error ? null : (
              <Pressable
                onPress={onConfirm}
                disabled={busy}
                style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 14, backgroundColor: pressed ? colors.primaryDark : colors.primary, alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1 })}
              >
                <Text style={{ color: colors.white, fontWeight: "700" }}>{busy ? t.common.pleaseWait : sold ? t.account.markSold : t.account.markRented}</Text>
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
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>{getCopy().common.edit}</Text>
      </Pressable>
      <Pressable onPress={() => onDelete(item)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 14, borderWidth: 1.5, borderColor: colors.danger, paddingVertical: 6 }}>
        <Ionicons name="trash-outline" size={14} color={colors.danger} />
        <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 12 }}>{getCopy().common.delete}</Text>
      </Pressable>
    </View>
  );
}

export function MyPropertiesScreen({ onOpen, onEdit }: { onOpen: (id: string) => void; onEdit: (id: string) => void }) {
  const { token, session } = useAuth();
  const { t } = useI18n();
  const pay = useRazorpay();
  const [tab, setTab] = useState<(typeof listingTabs)[number]["id"]>("active");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PropertyCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [pendingClose, setPendingClose] = useState<PropertyCard | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const page = usePagedProperties(
    (offset) => api.properties(`?mine=true&limit=${PROPERTY_PAGE_SIZE}&offset=${offset}`, token || undefined),
    token || "",
    Boolean(token),
  );
  const { items, setItems, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore } = page;

  useEffect(() => {
    if (!token || loading || loadingMore || !hasMore || error) return;
    const visible = items.filter((item) => matchesTab(item.status, tab));
    if (visible.length < 8) loadMore();
  }, [error, hasMore, items, loadMore, loading, loadingMore, tab, token]);

  async function activate(item: PropertyCard) {
    if (!token) return;
    const badge = item.is_premium || item.listing_label === "Premium" ? "premium" : "standard";
    setPayError("");
    setPayingId(item.id);
    try {
      const fee = listingPrice(badge, "month");
      const wallet = await api.wallet(token);
      if (wallet.balance < fee) {
        const order = await api.walletOrder(Math.max(1, Math.ceil(fee - wallet.balance)), token);
        const paid = await pay({
          keyId: order.key_id,
          orderId: order.order_id,
          amount: order.amount,
          currency: order.currency,
          description: order.description,
          email: session?.user.email || undefined,
        });
        await api.walletVerify({
          razorpay_order_id: paid.razorpay_order_id,
          razorpay_payment_id: paid.razorpay_payment_id,
          razorpay_signature: paid.razorpay_signature,
        }, token);
      }
      await api.walletSpend(item.id, badge, "month", token);
      setTab("active");
      refresh();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : t.account.paymentFailed);
    } finally {
      setPayingId(null);
    }
  }

  async function markClosed() {
    if (!token || !pendingClose) return;
    const next = closedStatus(pendingClose);
    setClosing(true);
    setCloseError("");
    try {
      await api.updateProperty(pendingClose.id, { status: next }, token);
      setItems((current) => current.map((row) => row.id === pendingClose.id ? { ...row, status: next } : row));
      setPendingClose(null);
      setTab(next);
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : t.account.markFailed);
    } finally {
      setClosing(false);
    }
  }

  async function reopen(item: PropertyCard) {
    if (!token) return;
    setPayError("");
    setReopeningId(item.id);
    try {
      await api.updateProperty(item.id, { status: "published" }, token);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: "published" } : row));
      setTab("active");
    } catch (err) {
      setPayError(err instanceof Error ? err.message : t.account.markFailed);
    } finally {
      setReopeningId(null);
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
      <PageHeader title={t.account.myProperties} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={(event) => { if (nearScrollEnd(event)) loadMore(); }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh()} tintColor={colors.primary} colors={[colors.primary]} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: 44, marginBottom: 16 }} contentContainerStyle={{ alignItems: "center" }}>
        {listingTabs.map((entry) => {
          const active = tab === entry.id;
          return (
            <Pressable key={entry.id} onPress={() => setTab(entry.id)} style={{ backgroundColor: active ? colors.primary : colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: active ? colors.primary : colors.line }}>
              <Text style={{ color: active ? colors.white : colors.muted, fontWeight: "700" }}>{listingTabLabel(entry.id)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {error || payError ? <Text style={styles.error}>{payError || error}</Text> : null}
      {!token ? <Text style={styles.meta}>{t.account.signInListings}</Text> : null}
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
                {active ? (
                  <Pressable onPress={() => { setCloseError(""); setPendingClose(item); }} style={{ borderRadius: 14, borderWidth: 1.5, borderColor: colors.warning, paddingVertical: 6, alignItems: "center" }}>
                    <Text style={{ color: colors.warning, fontWeight: "700", fontSize: 12 }}>{item.listing_type === "sale" ? t.account.markSold : t.account.markRented}</Text>
                  </Pressable>
                ) : null}
                {(item.status === "sold" || item.status === "rented") && stillListed(item) ? (
                  <Pressable onPress={() => void reopen(item)} disabled={reopeningId === item.id} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 6, alignItems: "center", opacity: reopeningId === item.id ? 0.7 : 1 }}>
                    <Text style={{ color: colors.white, fontWeight: "700", fontSize: 12 }}>{reopeningId === item.id ? t.common.pleaseWait : t.account.listAgain}</Text>
                  </Pressable>
                ) : null}
                {needsPay ? (
                  <Pressable onPress={() => activate(item)} disabled={payingId === item.id} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 6, alignItems: "center" }}>
                    <Text style={{ color: colors.white, fontWeight: "700", fontSize: 12 }}>{payingId === item.id ? t.common.pleaseWait : fill(t.account.pay, { amount: listingFee(item) })}</Text>
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
      {loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} /> : null}
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
      {pendingClose ? (
        <MarkClosedDialog
          item={pendingClose}
          busy={closing}
          error={closeError}
          onCancel={() => { if (!closing) { setPendingClose(null); setCloseError(""); } }}
          onConfirm={() => void markClosed()}
        />
      ) : null}
    </View>
  );
}

export function FavoritesScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { items, ready, toggle, reload, loadMore, loadingMore } = useFavorites();
  const loading = Boolean(token) && !ready;
  const [refreshing, setRefreshing] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 8 }}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: colors.ink }}>{t.account.favorites}</Text>
      <Text style={{ color: colors.muted, marginTop: 2 }}>
        {!token ? t.account.signInSaved : loading ? t.account.loadingSaved : fill(items.length === 1 ? t.account.savedOne : t.account.savedMany, { count: items.length })}
      </Text>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={(event) => { if (nearScrollEnd(event)) loadMore(); }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await reload(); } finally { setRefreshing(false); } }} tintColor={colors.primary} colors={[colors.primary]} />}>
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
      {loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} /> : null}
    </ScrollView>
    </View>
  );
}

function timeAgo(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const text = getCopy().account;
  const minutes = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return fill(minutes === 1 ? text.minuteAgo : text.minutesAgo, { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return fill(hours === 1 ? text.hourAgo : text.hoursAgo, { count: hours });
  const days = Math.round(hours / 24);
  return fill(days === 1 ? text.dayAgo : text.daysAgo, { count: days });
}

export function InquiriesScreen({ onChat }: { onChat: (propertyId: string, buyerId?: string | null) => void }) {
  const { token } = useAuth();
  const { t } = useI18n();
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
      <PageHeader title={t.account.inquiries} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        {(["new", "contacted", "closed"] as const).map((entry) => {
          const active = tab === entry;
          const label = entry === "new" ? t.account.inquiryNew : entry === "contacted" ? t.account.contacted : t.account.closed;
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
              <Text style={{ fontWeight: "600", color: colors.ink }}>{item.name || t.common.buyer}</Text>
              <Text style={{ color: colors.muted, marginTop: 2 }} numberOfLines={1}>{fill(t.account.interested, { title: item.property_title || t.common.property })}</Text>
              <Text style={{ color: colors.faint, fontSize: 12, marginTop: 2 }}>{timeAgo(item.created_at)}</Text>
            </View>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>{t.common.chat}</Text>
          </Pressable>
      ))}
      {!loading && shown.length === 0 ? <EmptyState kind="search" /> : null}
      </ScrollView>
    </View>
  );
}

function visitStatusStyle(status: string) {
  const text = getCopy().account;
  if (status === "confirmed") return { bg: "#E7F0EA", color: colors.success, label: text.confirmed };
  if (status === "completed") return { bg: colors.primarySoft, color: colors.primaryDark, label: text.completed };
  if (status === "cancelled") return { bg: "#F8E6E3", color: colors.danger, label: text.cancelled };
  if (status === "rescheduled") return { bg: "#F8EEDD", color: colors.warning, label: text.rescheduled };
  return { bg: "#F8EEDD", color: colors.warning, label: text.requested };
}

function visitWhen(value?: string | null) {
  if (!value) return getCopy().account.timeNotSet;
  return new Date(value).toLocaleString(getLocale(), { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function VisitsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { token, me } = useAuth();
  const { t } = useI18n();
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
      <PageHeader title={t.account.visits} subtitle={items.length ? fill(items.length === 1 ? t.account.visitOne : t.account.visitMany, { count: items.length }) : t.account.visitHint} />
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
                  <Text style={{ flex: 1, fontWeight: "800", fontSize: 16, color: colors.ink }} numberOfLines={2}>{item.property_title || t.common.property}</Text>
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
                <Button title={t.account.confirmVisit} onPress={() => {
                  if (!token) return;
                  api.updateVisit(item.id, { status: "confirmed" }, token).then(() => {
                    setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: "confirmed" } : row));
                  }).catch(() => undefined);
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
  const { t } = useI18n();
  const language = useLanguagePicker();
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(Boolean(token));
  const [walletRefreshing, setWalletRefreshing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PropertyCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [pendingClose, setPendingClose] = useState<PropertyCard | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [listingError, setListingError] = useState("");
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const cardWidth = propertyGridCardWidth();
  const propertiesPage = usePagedProperties(
    (offset) => api.properties(`?mine=true&limit=${PROPERTY_PAGE_SIZE}&offset=${offset}`, token || undefined),
    token || "",
    Boolean(token),
  );
  const properties = propertiesPage.items;
  const loading = propertiesPage.loading || walletLoading;

  const loadWallet = useCallback(async (quiet = false) => {
    if (!token) {
      setBalance(0);
      setWalletLoading(false);
      setWalletRefreshing(false);
      return;
    }
    if (quiet) setWalletRefreshing(true);
    else setWalletLoading(true);
    try {
      setBalance((await api.wallet(token)).balance);
    } catch {
      if (!quiet) setBalance(0);
    } finally {
      setWalletLoading(false);
      setWalletRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadWallet(false);
  }, [loadWallet]);

  async function markClosed() {
    if (!token || !pendingClose) return;
    const next = closedStatus(pendingClose);
    setClosing(true);
    setCloseError("");
    try {
      await api.updateProperty(pendingClose.id, { status: next }, token);
      propertiesPage.setItems((current) => current.map((row) => row.id === pendingClose.id ? { ...row, status: next } : row));
      setPendingClose(null);
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : t.account.markFailed);
    } finally {
      setClosing(false);
    }
  }

  async function reopen(item: PropertyCard) {
    if (!token) return;
    setListingError("");
    setReopeningId(item.id);
    try {
      await api.updateProperty(item.id, { status: "published" }, token);
      propertiesPage.setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: "published" } : row));
    } catch (err) {
      setListingError(err instanceof Error ? err.message : t.account.markFailed);
    } finally {
      setReopeningId(null);
    }
  }

  async function removeListing() {
    if (!token || !pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.deleteProperty(pendingDelete.id, token);
      propertiesPage.setItems((current) => current.filter((row) => row.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.page }}>
        {showBack ? <PageHeader title={t.tabs.profile} /> : <View style={{ height: insets.top + 8 }} />}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 48 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="person-outline" size={40} color={colors.primary} />
          </View>
          <Text style={{ marginTop: 16, fontSize: 24, fontWeight: "800", color: colors.ink }}>{t.common.guest}</Text>
          <Text style={{ marginTop: 8, color: colors.muted, textAlign: "center", lineHeight: 22 }}>{t.account.guestHint}</Text>
          <Pressable onPress={onSignIn} style={({ pressed }) => ({ marginTop: 24, alignSelf: "stretch", backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", ...buttonShadow })}>
            <Text style={{ color: colors.white, fontWeight: "700", fontSize: 16 }}>{t.common.signIn}</Text>
          </Pressable>
          <Pressable onPress={language.openPicker} style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="language-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "700" }}>{t.common.language}: {language.nativeName}</Text>
          </Pressable>
          {language.modal}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      {showBack ? <PageHeader title={t.tabs.profile} /> : <View style={{ height: insets.top + 8 }} />}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={(event) => { if (nearScrollEnd(event)) propertiesPage.loadMore(); }} refreshControl={<RefreshControl refreshing={walletRefreshing || propertiesPage.refreshing} onRefresh={() => { loadWallet(true); propertiesPage.refresh(); }} tintColor={colors.primary} colors={[colors.primary]} />}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, overflow: "hidden", backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
            {me?.profile?.avatar_url ? <Image source={{ uri: me.profile.avatar_url }} style={{ width: 64, height: 64 }} /> : <Ionicons name="person" size={28} color={colors.primary} />}
          </View>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 28 }}>
            <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: "800", color: colors.ink }}>{me?.profile?.full_name || t.common.guest}</Text>
            <Text numberOfLines={1} style={{ marginTop: 4, color: colors.muted }}>{me?.profile?.city || (me?.profile?.phone ? `+91 ${me.profile.phone}` : t.account.yourAccount)}</Text>
          </View>
          <Pressable onPress={onEditProfile} hitSlop={8} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>

            <View style={{ marginTop: 16, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
              <Text style={{ color: colors.muted, fontWeight: "600" }}>{t.account.balance}</Text>
              <Text style={{ marginTop: 6, fontSize: 30, fontWeight: "800", color: colors.ink }}>{loading ? "..." : inr(balance)}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                <Pressable onPress={onWallet} style={({ pressed }) => ({ flex: 1, backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" })}>
                  <Text style={{ color: colors.white, fontWeight: "700" }}>{t.account.addMoney}</Text>
                </Pressable>
                <Pressable onPress={onHistory} style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, height: 52, alignItems: "center", justifyContent: "center", backgroundColor: colors.card }}>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>{t.account.history}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable onPress={language.openPicker} style={{ marginTop: 16, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons name="language-outline" size={22} color={colors.primary} />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: colors.ink }}>{t.common.language}</Text>
              <Text style={{ color: colors.muted, fontWeight: "700" }}>{language.nativeName}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </Pressable>
            {language.modal}
            <Text style={{ marginTop: 28, marginBottom: 12, fontSize: 18, fontWeight: "800", color: colors.ink }}>{t.account.myProperties}</Text>
            {listingError ? <Text style={[styles.error, { marginBottom: 12 }]}>{listingError}</Text> : null}
            {loading ? <PropertyGridSkeleton width={cardWidth} /> : null}
            {!loading && properties.length === 0 ? <Text style={{ color: colors.muted }}>{t.account.noneListed}</Text> : null}
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
                        {item.status === "published" ? (
                          <Pressable onPress={() => { setCloseError(""); setPendingClose(item); }} style={{ borderRadius: 14, borderWidth: 1.5, borderColor: colors.warning, paddingVertical: 6, alignItems: "center" }}>
                            <Text style={{ color: colors.warning, fontWeight: "700", fontSize: 12 }}>{item.listing_type === "sale" ? t.account.markSold : t.account.markRented}</Text>
                          </Pressable>
                        ) : null}
                        {(item.status === "sold" || item.status === "rented") && stillListed(item) ? (
                          <Pressable onPress={() => void reopen(item)} disabled={reopeningId === item.id} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 6, alignItems: "center", opacity: reopeningId === item.id ? 0.7 : 1 }}>
                            <Text style={{ color: colors.white, fontWeight: "700", fontSize: 12 }}>{reopeningId === item.id ? t.common.pleaseWait : t.account.listAgain}</Text>
                          </Pressable>
                        ) : null}
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
            {propertiesPage.loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} /> : null}

        {pendingDelete ? (
          <DeletePropertyDialog
            title={pendingDelete.title}
            busy={deleting}
            error={deleteError}
            onCancel={() => { if (!deleting) { setPendingDelete(null); setDeleteError(""); } }}
            onConfirm={() => void removeListing()}
          />
        ) : null}
        {pendingClose ? (
          <MarkClosedDialog
            item={pendingClose}
            busy={closing}
            error={closeError}
            onCancel={() => { if (!closing) { setPendingClose(null); setCloseError(""); } }}
            onConfirm={() => void markClosed()}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

export function EditProfileScreen() {
  const { me, token, refreshMe } = useAuth();
  const { t } = useI18n();
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
    setSaved(t.account.profileSaved);
  }

  return (
    <KeyboardScreen style={{ backgroundColor: colors.page }}>
      <PageHeader title={t.account.editProfile} />
      <KeyboardFormScroll contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 }}>
          {saved ? <Text style={styles.ok}>{saved}</Text> : null}
          <Field label={t.account.name} value={fullName} onChangeText={setFullName} />
          <Field label={t.account.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" spoken="digits" />
          <Field label={t.listing.city} value={city} onChangeText={setCity} />
          <Button title={t.common.save} onPress={save} />
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
  const text = getCopy().common;
  if (sameDay(date, now)) return text.today;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return text.yesterday;
  return date.toLocaleDateString(getLocale(), { day: "numeric", month: "long", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function noticeVisual(type: string) {
  const text = getCopy().account;
  if (type === "new_inquiry") return { icon: "chatbubble-ellipses-outline" as const, bg: colors.primarySoft, color: colors.primaryDark, chip: text.enquiryChip };
  if (type === "visit_confirmed") return { icon: "checkmark-circle-outline" as const, bg: "#E7F0EA", color: colors.success, chip: text.visitChip };
  return { icon: "calendar-outline" as const, bg: "#F8EEDD", color: colors.warning, chip: text.visitChip };
}

export function NotificationsScreen({ onOpen }: { onOpen: (item: NotificationItem) => void }) {
  const { token } = useAuth();
  const { t } = useI18n();
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
    try {
      await api.readNotifications(token);
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch {
      /* the list stays as it is if the server cannot be reached */
    }
  }

  const tabs = [
    { id: "all" as const, label: t.account.all },
    { id: "enquiry" as const, label: t.account.enquiries },
    { id: "visit" as const, label: t.account.visitChip },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader
        title={t.account.notifications}
        subtitle={unread ? fill(unread === 1 ? t.account.unreadOne : t.account.unreadMany, { count: unread }) : t.account.caughtUp}
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
            <Pressable onPress={() => {
              if (!token) return;
              const open = () => onOpen(item);
              if (item.is_read) {
                open();
                return;
              }
              api.readNotification(item.id, token).then(() => {
                setItems((current) => current.map((row) => row.id === item.id ? { ...row, is_read: true } : row));
              }).catch(() => undefined).finally(open);
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
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.faint }}>{new Date(item.created_at).toLocaleTimeString(getLocale(), { hour: "numeric", minute: "2-digit" })}</Text>
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
          <Text style={{ marginTop: 10, fontSize: 18, fontWeight: "800", color: colors.ink }}>{t.account.noNotifications}</Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: colors.muted, textAlign: "center" }}>{t.account.noNotificationsHint}</Text>
        </View>
      ) : null}
      </ScrollView>
    </View>
  );
}
