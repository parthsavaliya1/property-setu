import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { PageHeader } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { buttonShadow, colors } from "../theme";

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "home-outline", text: "Browse homes — sale, rent, lease, and PG listings" },
  { icon: "search-outline", text: "Search — filter by city, area, price, and property type" },
  { icon: "map-outline", text: "Map — see listings around you" },
  { icon: "heart-outline", text: "Favorites — save homes to look at later" },
  { icon: "add-circle-outline", text: "List a property — photos, video, price, and location" },
  { icon: "pricetags-outline", text: "Listing plans — monthly or yearly, standard or premium" },
  { icon: "wallet-outline", text: "Wallet — add money and pay listing fees" },
  { icon: "receipt-outline", text: "Payment history — top-ups and listing charges" },
  { icon: "document-text-outline", text: "Inquiries — send and manage property enquiries" },
  { icon: "calendar-outline", text: "Visits — request and confirm property visits" },
  { icon: "chatbubbles-outline", text: "Messages — chat with buyers and owners, including photos and files" },
  { icon: "notifications-outline", text: "Notifications — enquiries, visits, and new messages" },
  { icon: "person-outline", text: "Profile — your name, phone, city, and your listings" },
  { icon: "flag-outline", text: "Report a listing — flag a property that looks wrong" },
];

export function AboutScreen({ onDeleted, onSignIn }: { onDeleted: () => void; onSignIn: () => void }) {
  const { session, deleteAccount } = useAuth();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const version = Constants.expoConfig?.version || "1.0.0";

  function confirmDelete() {
    if (!session) {
      onSignIn();
      return;
    }
    setError("");
    setAsk(true);
  }

  function closeAsk() {
    if (busy) return;
    setAsk(false);
    setError("");
  }

  async function removeAccount() {
    setBusy(true);
    setError("");
    try {
      await deleteAccount();
      setAsk(false);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader title="About us" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={card}>
          <Text style={sectionTitle}>About us</Text>
          <Text style={bodyText}>
            PropertySetu is a home marketplace where you can find, explore, buy, and rent property. Search listings, save favorites, schedule visits, chat with owners, and list your own property from one place.
          </Text>
        </View>

        <View style={card}>
          <Text style={sectionTitle}>App features</Text>
          {FEATURES.map((feature, index) => (
            <View key={feature.text} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: index === FEATURES.length - 1 ? 0 : 1, borderBottomColor: colors.lineSoft }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={feature.icon} size={18} color={colors.primaryDark} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 21, color: colors.ink, fontWeight: "600" }}>{feature.text}</Text>
            </View>
          ))}
        </View>

        <Text style={{ textAlign: "center", fontSize: 14, color: colors.faint, marginTop: 8 }}>Version {version}</Text>

        <View style={{ marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#E5E7EB", alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", marginBottom: 10, lineHeight: 19, paddingHorizontal: 12 }}>
            To permanently remove your account, use the link below.
          </Text>
          <Pressable
            disabled={busy}
            onPress={confirmDelete}
            style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 8, opacity: busy || pressed ? 0.65 : 1 })}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#9CA3AF", textDecorationLine: "underline" }}>
              {busy ? "Deleting..." : "Delete account"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <Modal visible={ask} transparent animationType="fade" statusBarTranslucent onRequestClose={closeAsk}>
        <Pressable onPress={closeAsk} style={{ flex: 1, backgroundColor: "rgba(28,28,28,0.45)", justifyContent: "center", paddingHorizontal: 28 }}>
          <Pressable onPress={() => undefined} style={{ backgroundColor: colors.card, borderRadius: 18, padding: 20 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#F8E8E6", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
              <Ionicons name="trash-outline" size={24} color={colors.danger} />
            </View>
            <Text style={{ marginTop: 14, fontSize: 18, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
              {error ? "Could not delete account" : "Delete account"}
            </Text>
            <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 20, textAlign: "center" }}>
              {error || "This permanently removes your account and every property you listed. This cannot be undone."}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable onPress={closeAsk} disabled={busy} style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, opacity: busy ? 0.6 : 1 }}>
                <Text style={{ fontWeight: "700", color: colors.primary }}>{error ? "Close" : "Cancel"}</Text>
              </Pressable>
              {error ? null : (
                <Pressable
                  onPress={() => void removeAccount()}
                  disabled={busy}
                  style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 14, backgroundColor: pressed ? "#9A2E24" : colors.danger, alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1, ...buttonShadow })}
                >
                  <Text style={{ color: colors.white, fontWeight: "700" }}>{busy ? "Deleting..." : "Delete"}</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const card = {
  backgroundColor: colors.card,
  borderRadius: 18,
  padding: 18,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: colors.line,
} as const;

const sectionTitle = {
  fontSize: 19,
  fontWeight: "800" as const,
  color: colors.ink,
  marginBottom: 10,
};

const bodyText = {
  fontSize: 15,
  lineHeight: 23,
  color: colors.muted,
  fontWeight: "500" as const,
};
