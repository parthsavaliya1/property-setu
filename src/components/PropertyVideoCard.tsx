import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useI18n } from "../i18n";
import { colors } from "../theme";

export function PropertyVideoCard({ poster, index, onPress, onRemove, disabled = false }: {
  poster?: string | null;
  index: number;
  onPress: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  return <View style={{ width: Math.min(176, (width - 52) / 2), borderRadius: 10, overflow: "hidden", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${t.listing.watchVideo} ${index + 1}`} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <View style={{ height: 92, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
        {poster ? <Image source={{ uri: poster }} resizeMode="cover" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, opacity: 0.8 }} /> : <Ionicons name="film-outline" size={40} color={colors.primaryLight} />}
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}><Ionicons name="play" size={20} color={colors.primary} style={{ marginLeft: 2 }} /></View>
      </View>
      <View style={{ paddingHorizontal: 10, paddingVertical: 9, gap: 3 }}>
        <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: "700", fontSize: 12 }}>{t.listing.propertyVideo}</Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>{t.listing.tapToWatch}</Text>
      </View>
    </Pressable>
    {onRemove ? <Pressable disabled={disabled} onPress={onRemove} accessibilityRole="button" accessibilityLabel={`${t.common.delete}: ${t.listing.propertyVideo} ${index + 1}`} style={{ position: "absolute", top: 2, right: 2, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={16} color={colors.ink} /></View>
    </Pressable> : null}
  </View>;
}
