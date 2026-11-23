import { Ionicons } from "@expo/vector-icons";
import { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { fill } from "../i18n/format";
import { getRemoteSettings, subscribeRemoteSettings } from "../lib/remoteConfig";
import { colors } from "../theme";

/** Presents existing listing discounts; all plan selection stays in the Sell flow. */
export function HomeOffers({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  const fees = useSyncExternalStore(subscribeRemoteSettings, getRemoteSettings, getRemoteSettings);
  const premiumOffer = fees.premiumOfferPercent > 0;
  const yearlyOffer = fees.yearlyDiscountPercent > 0;
  const title = premiumOffer
    ? fill(t.home.premiumOffer, { percent: fees.premiumOfferPercent })
    : yearlyOffer
      ? fill(t.home.yearlyOffer, { percent: fees.yearlyDiscountPercent })
      : t.home.listingPlans;
  const detail = premiumOffer ? t.home.premiumOfferHint : yearlyOffer ? t.home.yearlyOfferHint : t.home.listingPlansHint;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t.home.offers}. ${title}. ${detail}. ${t.home.viewPlans}`}
      style={({ pressed }) => ({ marginHorizontal: 20, marginTop: 18, borderRadius: 20, padding: 18, backgroundColor: colors.primaryDark, opacity: pressed ? 0.9 : 1, overflow: "hidden" })}
    >
      <View pointerEvents="none" style={{ position: "absolute", width: 140, height: 140, borderRadius: 70, borderWidth: 22, borderColor: "rgba(255,255,255,0.06)", right: -45, top: -48 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="gift-outline" size={16} color={colors.white} />
        <Text style={{ color: colors.white, fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>{t.home.offers}</Text>
      </View>
      <Text style={{ marginTop: 10, color: colors.white, fontSize: 21, lineHeight: 27, fontWeight: "800" }}>{title}</Text>
      <Text style={{ marginTop: 5, color: colors.white, opacity: 0.85, fontSize: 12, lineHeight: 18 }}>{detail}</Text>
      <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.white }}>
        <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "800" }}>{t.home.viewPlans}</Text>
        <Ionicons name="arrow-forward" size={15} color={colors.primaryDark} />
      </View>
    </Pressable>
  );
}
