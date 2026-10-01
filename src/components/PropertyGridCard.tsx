import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Dimensions, Image, Pressable, Text, View } from "react-native";
import { inr } from "../lib/api";
import type { PropertyCard } from "../types/database";
import { ListingLabel } from "./ui";

function photoTag(item: PropertyCard) {
  if (item.listing_label === "Premium" || item.is_premium) return { label: "Premium", bg: "#FFF6DE", color: "#8A5A12" };
  const posted = new Date(item.published_at || item.created_at).getTime();
  if (!Number.isNaN(posted) && Date.now() - posted < 7 * 24 * 60 * 60 * 1000) return { label: "New", bg: "#FFF1E6", color: "#E08A3C" };
  return null;
}

const kindLabels: Record<string, string> = {
  house: "House",
  apartment: "Apartment",
  villa: "Villa",
  shop: "Shop",
  plot: "Plot",
  land: "Land",
  "residential-plot": "Plot",
  "agricultural-land": "Land",
};

function kindLabel(item: PropertyCard) {
  if (item.category_name) return item.category_name;
  const slug = (item.category_slug || item.property_type || "").toLowerCase();
  return kindLabels[slug] || "";
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
  const place = [item.locality, item.city].filter(Boolean).join(", ") || "Location not added";
  const tag = photoTag(item);
  return (
    <Pressable onPress={onPress} style={{ width: "100%", alignSelf: "stretch", flexDirection: "row", alignItems: "flex-start", backgroundColor: "white", borderRadius: 16, padding: 10, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
      <View style={{ width: 96, height: 96, borderRadius: 12, overflow: "hidden", backgroundColor: "#E7D9C8" }}>
        {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, marginLeft: 12, paddingTop: 2 }}>
        <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "800", color: "#1A1A1A" }}>{listHeadline(item)}</Text>
        <Text numberOfLines={1} style={{ marginTop: 2, color: "#1F8A4C", fontWeight: "800", fontSize: 15 }}>{inr(item.price)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          <Ionicons name="location-sharp" size={13} color="#9CA3AF" />
          <Text numberOfLines={1} style={{ flex: 1, marginLeft: 3, color: "#9CA3AF", fontSize: 12 }}>{place}</Text>
        </View>
        {tag ? (
          <View style={{ alignSelf: "flex-start", marginTop: 8, backgroundColor: tag.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: tag.color, fontSize: 11, fontWeight: "700" }}>{tag.label}</Text>
          </View>
        ) : null}
      </View>
      {onSave ? (
        <Pressable onPress={onSave} hitSlop={8} style={{ marginLeft: 6, marginTop: 2, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={saved ? "heart" : "heart-outline"} size={20} color={saved ? "#E11D48" : "#C4C4C4"} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function PropertyListSkeleton() {
  return (
    <View>
      {[0, 1, 2].map((key) => (
        <View key={key} style={{ flexDirection: "row", backgroundColor: "white", borderRadius: 16, padding: 10, marginBottom: 12 }}>
          <View style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: "#E4DDD2" }} />
          <View style={{ flex: 1, marginLeft: 12, paddingTop: 4 }}>
            <View style={{ height: 14, width: "58%", borderRadius: 7, backgroundColor: "#E4DDD2" }} />
            <View style={{ height: 13, width: "42%", borderRadius: 7, backgroundColor: "#E4DDD2", marginTop: 8 }} />
            <View style={{ height: 11, width: "70%", borderRadius: 6, backgroundColor: "#E4DDD2", marginTop: 8 }} />
            <View style={{ height: 18, width: 72, borderRadius: 8, backgroundColor: "#E4DDD2", marginTop: 10 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function propertyGridCardWidth(screenWidth = Dimensions.get("window").width) {
  return (screenWidth - 16 * 2 - 12) / 2;
}

function listingBadge(item: PropertyCard) {
  if (item.listing_label === "Premium" || item.is_premium) return "Premium";
  return null;
}

export function PropertyGridCard({
  item,
  width,
  saved,
  onPress,
  onSave,
  footer,
}: {
  item: PropertyCard;
  width: number;
  saved?: boolean;
  onPress: () => void;
  onSave?: () => void;
  footer?: ReactNode;
}) {
  const place = [item.locality, item.city].filter(Boolean).join(", ") || "Location not added";
  return (
    <Pressable onPress={onPress} style={{ width, backgroundColor: "white", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#EFE8DE" }}>
      <View style={{ height: 120, width: "100%", backgroundColor: "#E7D9C8" }}>
        {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
        <ListingLabel label={listingBadge(item)} />
        {onSave ? (
          <Pressable onPress={onSave} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "white", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={saved ? "heart" : "heart-outline"} size={16} color={saved ? "#e11d48" : "#9aa19c"} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ padding: 10 }}>
        <Text numberOfLines={1} style={{ fontWeight: "700", color: "#2C2825" }}>{item.title}</Text>
        <Text style={{ color: "#8C5A3C", fontWeight: "800", marginTop: 4 }}>{inr(item.price)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 }}>
          <Ionicons name="location-sharp" size={11} color="#A39B92" />
          <Text numberOfLines={1} style={{ flex: 1, color: "#8A8178", fontSize: 12 }}>{place}</Text>
        </View>
        {footer}
      </View>
    </Pressable>
  );
}
