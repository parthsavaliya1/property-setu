import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  borderRadius = 20,
  saved,
  onPress,
  onSave,
  footer,
  corner,
  home = false,
  fullWidth = false,
  photoOverlay,
}: {
  item: PropertyCard;
  width: number;
  borderRadius?: number;
  saved?: boolean;
  onPress: () => void;
  onSave?: () => void;
  footer?: ReactNode;
  corner?: ReactNode;
  home?: boolean;
  fullWidth?: boolean;
  photoOverlay?: ReactNode;
}) {
  const { t } = useI18n();
  const place = [item.locality, item.city].filter(Boolean).join(", ") || t.common.locationMissing;
  const closed = closedLabel(item.status, t.account.sold, t.account.rented);
  const saveButton = onSave ? (
    <Pressable onPress={onSave} accessibilityRole={home ? "button" : undefined} accessibilityLabel={home ? `${saved ? t.tabs.saved : t.common.save}: ${item.title}` : undefined} accessibilityState={home ? { selected: !!saved } : undefined} style={{ position: "absolute", top: home ? 4 : 8, right: home ? 4 : 8, width: home ? 44 : 28, height: home ? 44 : 28, borderRadius: home ? 22 : 14, alignItems: "center", justifyContent: "center", backgroundColor: home ? undefined : "white" }}>
      {home ? <View style={{ position: "absolute", width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card }} /> : null}
      <Ionicons name={saved ? "heart" : "heart-outline"} size={home ? 22 : 16} color={saved ? colors.heart : home ? colors.ink : colors.faint} />
    </Pressable>
  ) : null;
  // Home has its own presentation; shared search/account cards keep their layout.
  if (home) {
    const premium = item.listing_label === "Premium" || item.is_premium;
    return (
      <Pressable onPress={onPress} style={{ width, backgroundColor: colors.card, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.line }}>
        <View style={{ height: Math.round(width * (fullWidth ? 0.385 : 0.48)), backgroundColor: colors.secondary }}>
          {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
          <ClosedStamp label={closed} />
          {photoOverlay}
          {premium ? <View style={{ position: "absolute", top: 8, left: 9, backgroundColor: colors.highlight, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 }}><Text style={{ color: colors.ink, fontWeight: "700", fontSize: 11 }}>{t.common.premium}</Text></View> : null}
          {corner ? <View style={{ position: "absolute", top: 8, right: 8 }}>{corner}</View> : saveButton}
        </View>
        <View style={{ paddingHorizontal: fullWidth ? 13 : 10, paddingTop: 8, paddingBottom: 8 }}>
          <View style={{ flexDirection: fullWidth ? "row" : "column", alignItems: fullWidth ? "flex-start" : undefined, gap: fullWidth ? 8 : 1 }}>
            <Text numberOfLines={2} style={{ flex: fullWidth ? 1 : undefined, color: colors.ink, fontWeight: "800", fontSize: fullWidth ? 18 : 13, lineHeight: fullWidth ? 23 : 17 }}>{item.title}</Text>
            <Text style={{ color: colors.primary, fontWeight: "800", fontSize: fullWidth ? 20 : 16, lineHeight: fullWidth ? 25 : 21 }}>{inr(item.price)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }}>
            <Ionicons name="location-sharp" size={12} color={colors.muted} />
            <Text numberOfLines={1} style={{ flex: 1, color: colors.muted, fontSize: fullWidth ? 12 : 10 }}>{place}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: fullWidth ? 10 : 7, borderTopWidth: 1, borderTopColor: colors.lineSoft, marginTop: 6, paddingTop: 6 }}>
            {item.bedrooms != null && item.bedrooms > 0 ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="bed-outline" size={fullWidth ? 16 : 13} color={colors.ink} /><Text style={{ color: colors.ink, fontSize: fullWidth ? 12 : 10 }}>{item.bedrooms} {t.search.beds}</Text></View> : <Text style={{ color: colors.ink, fontSize: 10 }}>{kindLabel(item)}</Text>}
            {fullWidth && item.bathrooms != null ? <><Text style={{ color: colors.muted, fontSize: 12 }}>•</Text><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><MaterialCommunityIcons name="bathtub-outline" size={17} color={colors.ink} /><Text style={{ color: colors.ink, fontSize: 12 }}>{item.bathrooms} {t.search.baths}</Text></View></> : null}
            {item.area ? <>{fullWidth ? <Text style={{ color: colors.muted, fontSize: 12 }}>•</Text> : null}<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="scan-outline" size={fullWidth ? 16 : 13} color={colors.ink} /><Text style={{ color: colors.ink, fontSize: fullWidth ? 12 : 10 }}>{item.area} {item.area_unit}</Text></View></> : null}
          </View>
          {footer}
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} style={{ width, flexDirection: fullWidth ? "row" : "column", backgroundColor: colors.card, borderRadius, overflow: "hidden", borderWidth: 1, borderColor: colors.line, ...cardShadow }}>
      <View style={{ height: fullWidth ? undefined : home ? Math.round(width * 0.78) : 120, minHeight: fullWidth ? 158 : undefined, width: fullWidth ? "37%" : "100%", backgroundColor: home ? colors.secondary : "#E7D9C8" }}>
        {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
        <ClosedStamp label={closed} />
        <ListingLabel label={listingBadge(item, "Premium")} />
        {corner ? (
          <View style={{ position: "absolute", top: 8, right: 8 }}>{corner}</View>
        ) : !fullWidth ? saveButton : null}
      </View>
      <View style={{ flex: fullWidth ? 1 : undefined, minWidth: 0, padding: fullWidth ? 14 : home ? 12 : 10, justifyContent: fullWidth ? "center" : undefined }}>
        <Text numberOfLines={home ? 2 : 1} style={{ fontWeight: "600", color: colors.ink, paddingRight: fullWidth && onSave && !corner ? 26 : undefined, ...(home ? { fontSize: fullWidth ? 15 : 13, lineHeight: fullWidth ? 21 : 18, minHeight: fullWidth ? 42 : 36 } : {}) }}>{item.title}</Text>
        <Text style={{ color: colors.primary, fontWeight: "800", marginTop: home ? 7 : 4, ...(home ? { fontSize: fullWidth ? 18 : 16, lineHeight: fullWidth ? 25 : 22 } : {}) }}>{inr(item.price)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: home ? 4 : 3, marginTop: home ? 7 : 4 }}>
          <Ionicons name="location-sharp" size={11} color={colors.muted} />
          <Text numberOfLines={fullWidth ? 2 : 1} style={{ flex: 1, color: colors.muted, fontSize: 12 }}>{place}</Text>
        </View>
        {footer}
      </View>
      {fullWidth && !corner ? saveButton : null}
    </Pressable>
  );
}
