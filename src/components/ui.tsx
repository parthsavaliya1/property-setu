import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";

const brandLogo = require("../../assets/center-logo.png");

export function LogoLoader() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={{ flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center" }}>
      <Animated.Image source={brandLogo} style={{ width: 148, height: 78, opacity: pulse }} resizeMode="contain" />
    </View>
  );
}

export function EmptyState({ kind }: { kind: "active" | "search" }) {
  const search = kind === "search";
  return (
    <View style={{ flex: 1, minHeight: 280, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: search ? "#E7F4EC" : "#F6EFE6", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={search ? "search-outline" : "home-outline"} size={36} color={search ? "#146c36" : "#8C5A3C"} />
      </View>
      <Text style={{ marginTop: 16, fontSize: 18, fontWeight: "800", color: "#2C2825", textAlign: "center" }}>{search ? "No record found" : "No property active"}</Text>
      <Text style={{ marginTop: 6, color: "#8A8178", textAlign: "center", lineHeight: 20 }}>{search ? "Try another city, area, or filter." : "There are no live listings right now."}</Text>
    </View>
  );
}

export function Button({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={[styles.button, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: { label?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

export function PageHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.page }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={onBack ?? (() => navigation.goBack())}
          hitSlop={8}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "white", borderWidth: 1, borderColor: "#E7E0D6", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={22} color="#2C2825" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: "800", color: "#2C2825" }} numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );
}

export function ListingLabel({ label }: { label?: string | null }) {
  if (!label) return null;
  const premium = label === "Premium";
  return (
    <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: premium ? "#f8e7c0" : "#e7f4ec", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: premium ? "#8a5a12" : "#146c36", fontSize: 11, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.kicker}>Location</Text>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { backgroundColor: colors.forest, padding: 20, paddingTop: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  kicker: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  headerTitle: { color: "white", fontSize: 28, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.8)", marginTop: 4 },
  body: { padding: 16, gap: 12 },
  button: { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  field: { gap: 6 },
  label: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  input: { backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 12, color: colors.ink },
  card: { backgroundColor: "white", borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  cardBody: { padding: 12 },
  price: { color: colors.green, fontWeight: "800", fontSize: 16 },
  title: { color: colors.ink, fontWeight: "800", fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4 },
  error: { backgroundColor: "#fdecea", color: colors.danger, padding: 10, borderRadius: 12 },
  ok: { backgroundColor: colors.mint, color: colors.green, padding: 10, borderRadius: 12 },
  chipRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  chip: { backgroundColor: "rgba(255,255,255,0.14)", color: "white", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, overflow: "hidden", fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
});
