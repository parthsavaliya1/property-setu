import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Dimensions, Image, Pressable, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { kindName } from "../i18n/labels";
import { inr } from "../lib/api";
import { cardShadow, colors } from "../theme";
import type { PropertyCard } from "../types/database";
import { ListingLabel } from "./ui";

function closedLabel(status: string, sold: string, rented: string) {
  if (status === "sold") return sold;
  if (status === "rented") return rented;
  return "";
}

function ClosedStamp({ label }: { label: string }) {
  if (!label) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(28,28,28,0.42)", alignItems: "center", justifyContent: "center" }}>
      <View style={{ borderWidth: 2, borderColor: "white", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, transform: [{ rotate: "-12deg" }] }}>
        <Text style={{ color: "white", fontWeight: "800", fontSize: 12, letterSpacing: 0.6 }}>{label}</Text>
      </View>
    </View>
  );
}

function photoTag(item: PropertyCard, premium: string, fresh: string) {
  if (item.listing_label === "Premium" || item.is_premium) return { label: premium, bg: "#FFF6DE", color: "#8A5A12" };
  const posted = new Date(item.published_at || item.created_at).getTime();
  if (!Number.isNaN(posted) && Date.now() - posted < 7 * 24 * 60 * 60 * 1000) return { label: fresh, bg: colors.primarySoft, color: colors.warning };
  return null;
}

function kindLabel(item: PropertyCard) {
  const slug = (item.category_slug || item.property_type || "").toLowerCase();
  return kindName(slug) || item.category_name || "";
}

function listHeadline(item: PropertyCard) {
  const kind = kindLabel(item);
  if (item.bedrooms != null && item.bedrooms > 0) {
    return kind ? `${item.bedrooms} BHK ${kind}` : `${item.bedrooms} BHK`;
  }
  return kind || item.title;
}

export function PropertyListCard({
  item,
  saved,
  onPress,
  onSave,
}: {
  item: PropertyCard;
  saved?: boolean;
  onPress: () => void;
  onSave?: () => void;
}) {
  const { t } = useI18n();
  const place = [item.locality, item.city].filter(Boolean).join(", ") || t.common.locationMissing;
  const tag = photoTag(item, t.common.premium, t.common.new);
  const closed = closedLabel(item.status, t.account.sold, t.account.rented);
  return (
    <Pressable onPress={onPress} style={{ width: "100%", alignSelf: "stretch", flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line, ...cardShadow }}>
      <View style={{ width: 96, height: 96, borderRadius: 14, overflow: "hidden", backgroundColor: colors.secondary }}>
        {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
        <ClosedStamp label={closed} />
      </View>
      <View style={{ flex: 1, minWidth: 0, marginLeft: 12, paddingTop: 2 }}>
        <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "600", color: colors.ink }}>{listHeadline(item)}</Text>
        <Text numberOfLines={1} style={{ marginTop: 2, color: colors.primary, fontWeight: "800", fontSize: 15 }}>{inr(item.price)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          <Ionicons name="location-sharp" size={13} color={colors.muted} />
          <Text numberOfLines={1} style={{ flex: 1, marginLeft: 3, color: colors.muted, fontSize: 12 }}>{place}</Text>
        </View>
        {tag ? (
          <View style={{ alignSelf: "flex-start", marginTop: 8, backgroundColor: tag.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: tag.color, fontSize: 11, fontWeight: "700" }}>{tag.label}</Text>
          </View>
        ) : null}
      </View>
      {onSave ? (
        <Pressable onPress={onSave} hitSlop={8} style={{ marginLeft: 6, marginTop: 2, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={saved ? "heart" : "heart-outline"} size={20} color={saved ? colors.heart : colors.faint} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function PropertyListSkeleton() {
  const rows = Math.max(6, Math.ceil(Dimensions.get("window").height / 128));
  return (
    <View style={{ width: "100%", alignSelf: "stretch" }}>
      {Array.from({ length: rows }, (_, key) => (
        <View key={key} style={{ width: "100%", alignSelf: "stretch", flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line }}>
          <View style={{ width: 96, height: 96, borderRadius: 14, backgroundColor: "#E4DDD2" }} />
          <View style={{ flex: 1, marginLeft: 12, paddingTop: 2 }}>
            <View style={{ height: 16, width: "58%", borderRadius: 8, backgroundColor: "#E4DDD2" }} />
            <View style={{ height: 15, width: "42%", borderRadius: 8, backgroundColor: "#E4DDD2", marginTop: 8 }} />
            <View style={{ height: 12, width: "70%", borderRadius: 6, backgroundColor: "#E4DDD2", marginTop: 8 }} />
            <View style={{ height: 18, width: 72, borderRadius: 8, backgroundColor: "#E4DDD2", marginTop: 10 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function propertyGridCardWidth(screenWidth = Dimensions.get("window").width) {
  return (screenWidth - 20 * 2 - 12) / 2;
}

function listingBadge(item: PropertyCard, premium: string) {
  if (item.listing_label === "Premium" || item.is_premium) return premium;
  return null;
}

export function PropertyGridCard({
  item,
  width,
  saved,
  onPress,
  onSave,
  footer,
  corner,
}: {
  item: PropertyCard;
  width: number;
  saved?: boolean;
  onPress: () => void;
  onSave?: () => void;
  footer?: ReactNode;
  corner?: ReactNode;
}) {
  const { t } = useI18n();
  const place = [item.locality, item.city].filter(Boolean).join(", ") || t.common.locationMissing;
  const closed = closedLabel(item.status, t.account.sold, t.account.rented);
  return (
    <Pressable onPress={onPress} style={{ width, backgroundColor: colors.card, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: colors.line, ...cardShadow }}>
      <View style={{ height: 120, width: "100%", backgroundColor: "#E7D9C8" }}>
        {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
        <ClosedStamp label={closed} />
        <ListingLabel label={listingBadge(item, "Premium")} />
        {corner ? (
          <View style={{ position: "absolute", top: 8, right: 8 }}>{corner}</View>
        ) : onSave ? (
          <Pressable onPress={onSave} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "white", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={saved ? "heart" : "heart-outline"} size={16} color={saved ? colors.heart : colors.faint} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ padding: 10 }}>
        <Text numberOfLines={1} style={{ fontWeight: "600", color: colors.ink }}>{item.title}</Text>
        <Text style={{ color: colors.primary, fontWeight: "800", marginTop: 4 }}>{inr(item.price)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 }}>
          <Ionicons name="location-sharp" size={11} color={colors.muted} />
          <Text numberOfLines={1} style={{ flex: 1, color: colors.muted, fontSize: 12 }}>{place}</Text>
        </View>
        {footer}
      </View>
    </Pressable>
  );
}
