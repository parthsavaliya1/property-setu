import Constants from "expo-constants";
import MapView, { Marker } from "react-native-maps";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { inr } from "../lib/api";
import { colors } from "../theme";
import { styles } from "./ui";
import type { PropertyCard } from "../types/database";

function coordinates(item: PropertyCard) {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function androidMapsReady() {
  if (Platform.OS !== "android") return true;
  return Boolean(Constants.expoConfig?.android?.config?.googleMaps?.apiKey);
}

export function PropertyMap({ pins, onOpen }: { pins: PropertyCard[]; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const mapped = pins.flatMap((item) => {
    const coordinate = coordinates(item);
    return coordinate ? [{ item, coordinate }] : [];
  });

  if (!androidMapsReady()) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, gap: 10 }}>
        {mapped.length === 0 ? <Text style={styles.meta}>{t.search.mapEmpty}</Text> : null}
        {mapped.map(({ item }) => (
          <Pressable key={item.id} onPress={() => onOpen(item.slug || item.id)} style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <Text style={{ color: colors.ink, fontWeight: "800" }} numberOfLines={1}>{item.title}</Text>
            <Text style={{ color: colors.primary, fontWeight: "800", marginTop: 4 }}>{inr(item.price)}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={1}>{[item.locality, item.city].filter(Boolean).join(", ") || t.common.locationAdded}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <MapView style={{ flex: 1 }} initialRegion={{ latitude: 22.3039, longitude: 70.8022, latitudeDelta: 0.2, longitudeDelta: 0.2 }}>
        {mapped.map(({ item, coordinate }) => (
          <Marker
            key={item.id}
            coordinate={coordinate}
            title={item.title}
            description={inr(item.price)}
            onCalloutPress={() => onOpen(item.slug || item.id)}
          />
        ))}
      </MapView>
    </View>
  );
}
