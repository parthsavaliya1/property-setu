import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Dimensions, Image, Pressable, Text, View } from "react-native";
import { inr } from "../lib/api";
import type { PropertyCard } from "../types/database";
import { ListingLabel } from "./ui";

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
