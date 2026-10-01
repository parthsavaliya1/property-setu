import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buttonShadow, cardShadow, colors } from "../theme";

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

function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse;
}

export function SkeletonBlock({ width = "100%", height = 16, radius = 10, fill = false }: { width?: number | `${number}%`; height?: number; radius?: number; fill?: boolean }) {
  const opacity = useSkeletonPulse();
  return <Animated.View style={{ width, alignSelf: "stretch", borderRadius: radius, backgroundColor: "#E4DDD2", opacity, ...(fill ? { flex: 1 } : { height }) }} />;
}

function slotsForScreen(itemHeight: number, columns: number) {
  const rows = Math.max(3, Math.ceil(Dimensions.get("window").height / itemHeight));
  return rows * columns;
}

export function PropertyGridSkeleton({ width, count }: { width: number; count?: number }) {
  const opacity = useSkeletonPulse();
  const total = count ?? slotsForScreen(200, 2);
  return (
    <View style={{ width: "100%", alignSelf: "stretch", flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={{ width, flexGrow: 1, flexShrink: 1, flexBasis: width, maxWidth: "100%", backgroundColor: colors.card, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: colors.line }}>
          <Animated.View style={{ height: 120, backgroundColor: "#E4DDD2", opacity }} />
          <View style={{ padding: 10, gap: 8 }}>
            <Animated.View style={{ height: 12, width: "78%", borderRadius: 6, backgroundColor: "#E4DDD2", opacity }} />
            <Animated.View style={{ height: 12, width: "46%", borderRadius: 6, backgroundColor: "#E4DDD2", opacity }} />
            <Animated.View style={{ height: 10, width: "64%", borderRadius: 6, backgroundColor: "#E4DDD2", opacity }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ListSkeleton({ rows }: { rows?: number }) {
  const opacity = useSkeletonPulse();
  const total = rows ?? slotsForScreen(76, 1);
  return (
    <View style={{ width: "100%", alignSelf: "stretch", gap: 12 }}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={{ width: "100%", alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.line }}>
          <Animated.View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#E4DDD2", opacity }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Animated.View style={{ height: 12, width: "62%", borderRadius: 6, backgroundColor: "#E4DDD2", opacity }} />
            <Animated.View style={{ height: 10, width: "40%", borderRadius: 6, backgroundColor: "#E4DDD2", opacity }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function DetailSkeleton() {
  const opacity = useSkeletonPulse();
  const insets = useSafeAreaInsets();
  const line = (width: number | `${number}%`, height = 12) => (
    <Animated.View style={{ width, height, borderRadius: height / 2, backgroundColor: "#E4DDD2", opacity }} />
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <View style={{ height: 340, backgroundColor: "#E7E0D6" }}>
        <Animated.View style={{ flex: 1, backgroundColor: "#E4DDD2", opacity }} />
        <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(20,20,20,0.28)" }} />
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(20,20,20,0.28)" }} />
        </View>
        <View style={{ position: "absolute", bottom: 14, left: 0, right: 0, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.28)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6 }}>
            {[18, 7, 7].map((dot, index) => <View key={index} style={{ width: dot, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.85)" }} />)}
          </View>
        </View>
      </View>
      <View style={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 180 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            {line("86%", 22)}
            {line("52%", 22)}
          </View>
          <Animated.View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#ffe8ea", opacity }} />
        </View>
        <View style={{ marginTop: 14 }}>{line("46%", 14)}</View>
        <View style={{ marginTop: 16 }}>{line("38%", 28)}</View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
          {[0, 1, 2, 3].map((key) => (
            <View key={key} style={{ flex: 1, height: 78, borderRadius: 16, borderWidth: 1, borderColor: "#efeae3", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Animated.View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#E4DDD2", opacity }} />
              {line("60%", 10)}
              {line("72%", 8)}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", marginTop: 22, borderBottomWidth: 1, borderBottomColor: "#eeeae4" }}>
          {["Overview", "Amenities", "Location", "Documents"].map((label, index) => (
            <View key={label} style={{ flex: 1, alignItems: "center", borderBottomWidth: 3, borderBottomColor: index === 0 ? colors.primaryLight : "transparent", paddingBottom: 10 }}>
              {line(index === 0 ? "70%" : "62%", 12)}
            </View>
          ))}
        </View>
        <View style={{ marginTop: 16, gap: 8 }}>
          {line("100%")}
          {line("100%")}
          {line("92%")}
          {line("64%")}
        </View>
      </View>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#f1eee8", gap: 8 }}>
        <Animated.View style={{ height: 46, borderRadius: 12, backgroundColor: "#E4DDD2", opacity }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Animated.View style={{ flex: 0.9, height: 48, borderRadius: 12, backgroundColor: "#E4DDD2", opacity }} />
          <Animated.View style={{ flex: 1.25, height: 48, borderRadius: 12, backgroundColor: "#E4DDD2", opacity }} />
          <Animated.View style={{ flex: 1.15, height: 48, borderRadius: 12, backgroundColor: "#E4DDD2", opacity }} />
        </View>
      </View>
    </View>
  );
}

export function EmptyState({ kind }: { kind: "active" | "search" }) {
  const search = kind === "search";
  return (
    <View style={{ flex: 1, minHeight: 280, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={search ? "search-outline" : "home-outline"} size={36} color={colors.primary} />
      </View>
      <Text style={{ marginTop: 16, fontSize: 18, fontWeight: "800", color: colors.ink, textAlign: "center" }}>{search ? "No record found" : "No property active"}</Text>
      <Text style={{ marginTop: 6, color: colors.muted, textAlign: "center", lineHeight: 20 }}>{search ? "Try another city, area, or filter." : "There are no live listings right now."}</Text>
    </View>
  );
}

export function Button({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && !disabled && styles.buttonPressed, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: { label?: string } & TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, focused && { color: colors.primary }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.faint}
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[styles.input, focused && { borderColor: colors.primary }, props.style]}
      />
    </View>
  );
}

export function PageHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: colors.page, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center" }}>
      <Pressable
        onPress={onBack ?? (() => navigation.goBack())}
        hitSlop={8}
        style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.page, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.ink} />
      </Pressable>
      <Text style={{ flex: 1, marginLeft: 12, fontSize: 20, fontWeight: "800", color: colors.ink }} numberOfLines={1}>{title}</Text>
      <View style={{ width: 46 }} />
    </View>
  );
}

export function ListingLabel({ label }: { label?: string | null }) {
  if (!label) return null;
  const premium = label === "Premium";
  return (
    <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: premium ? "#f8e7c0" : colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: premium ? "#8a5a12" : colors.primary, fontSize: 11, fontWeight: "800" }}>{label}</Text>
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
  body: { padding: 20, gap: 12 },
  button: { backgroundColor: colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", ...buttonShadow },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.5 },
  field: { gap: 6 },
  label: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  input: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, height: 52, color: colors.ink, fontSize: 15 },
  card: { backgroundColor: colors.card, borderRadius: 20, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: colors.line, ...cardShadow },
  cardBody: { padding: 16 },
  price: { color: colors.primary, fontWeight: "800", fontSize: 16 },
  title: { color: colors.ink, fontWeight: "600", fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4 },
  error: { backgroundColor: "#F8E6E3", color: colors.danger, padding: 10, borderRadius: 12 },
  ok: { backgroundColor: "#E7F0EA", color: colors.success, padding: 10, borderRadius: 12 },
  chipRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  chip: { backgroundColor: "rgba(255,255,255,0.14)", color: "white", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, overflow: "hidden", fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
});
