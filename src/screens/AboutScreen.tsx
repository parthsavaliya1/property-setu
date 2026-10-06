import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { PageHeader } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { fill } from "../i18n/format";
import { buttonShadow, colors } from "../theme";

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; key: "browse" | "search" | "map" | "favorites" | "list" | "plans" | "wallet" | "history" | "inquiries" | "visits" | "messages" | "notifications" | "profile" | "report" }[] = [
  { icon: "home-outline", key: "browse" },
  { icon: "search-outline", key: "search" },
  { icon: "map-outline", key: "map" },
  { icon: "heart-outline", key: "favorites" },
  { icon: "add-circle-outline", key: "list" },
  { icon: "pricetags-outline", key: "plans" },
  { icon: "wallet-outline", key: "wallet" },
  { icon: "receipt-outline", key: "history" },
  { icon: "document-text-outline", key: "inquiries" },
  { icon: "calendar-outline", key: "visits" },
  { icon: "chatbubbles-outline", key: "messages" },
  { icon: "notifications-outline", key: "notifications" },
  { icon: "person-outline", key: "profile" },
  { icon: "flag-outline", key: "report" },
];

export function AboutScreen({ onDeleted, onSignIn, onPrivacy }: { onDeleted: () => void; onSignIn: () => void; onPrivacy: () => void }) {
  const { session, deleteAccount } = useAuth();
  const { t } = useI18n();
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
      setError(err instanceof Error ? err.message : t.common.tryAgain);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader title={t.about.title} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={card}>
          <Text style={sectionTitle}>{t.about.title}</Text>
          <Text style={bodyText}>
            {t.about.intro}
          </Text>
        </View>

        <View style={card}>
          <Text style={sectionTitle}>{t.about.features}</Text>
          {FEATURES.map((feature, index) => (
            <View key={feature.key} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: index === FEATURES.length - 1 ? 0 : 1, borderBottomColor: colors.lineSoft }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={feature.icon} size={18} color={colors.primaryDark} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 21, color: colors.ink, fontWeight: "600" }}>{t.about[feature.key]}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={onPrivacy} style={({ pressed }) => ({ ...card, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.75 : 1 })}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.ink }}>{t.about.privacy}</Text>
            <Text style={{ marginTop: 2, fontSize: 13, lineHeight: 18, color: colors.muted }}>{t.about.privacyHint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Pressable>

        <Text style={{ textAlign: "center", fontSize: 14, color: colors.faint, marginTop: 8 }}>{fill(t.about.version, { version })}</Text>

        <View style={{ marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#E5E7EB", alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", marginBottom: 10, lineHeight: 19, paddingHorizontal: 12 }}>
            {t.about.removeHint}
          </Text>
          <Pressable
            disabled={busy}
            onPress={confirmDelete}
            style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 8, opacity: busy || pressed ? 0.65 : 1 })}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#9CA3AF", textDecorationLine: "underline" }}>
              {busy ? t.common.deleting : t.about.deleteAccount}
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
              {error ? t.about.deleteFailed : t.about.deleteAccount}
            </Text>
            <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 20, textAlign: "center" }}>
              {error || t.about.deleteBody}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable onPress={closeAsk} disabled={busy} style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, opacity: busy ? 0.6 : 1 }}>
                <Text style={{ fontWeight: "700", color: colors.primary }}>{error ? t.common.close : t.common.cancel}</Text>
              </Pressable>
              {error ? null : (
                <Pressable
                  onPress={() => void removeAccount()}
                  disabled={busy}
                  style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 14, backgroundColor: pressed ? "#9A2E24" : colors.danger, alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1, ...buttonShadow })}
                >
                  <Text style={{ color: colors.white, fontWeight: "700" }}>{busy ? t.common.deleting : t.common.delete}</Text>
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
