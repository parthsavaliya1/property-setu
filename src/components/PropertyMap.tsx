import Constants from "expo-constants";
import { useEffect, useRef, useState } from "react";
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

function pinPrice(value: string | null) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "Ask";
  if (amount >= 10000000) {
    const crore = amount / 10000000;
    return `₹${crore >= 10 ? Math.round(crore) : crore.toFixed(1).replace(/\.0$/, "")}Cr`;
  }
  if (amount >= 100000) {
    const lakh = amount / 100000;
    return `₹${lakh >= 10 ? Math.round(lakh) : lakh.toFixed(1).replace(/\.0$/, "")}L`;
  }
  return inr(amount);
}

export function PropertyMap({ pins, onOpen }: { pins: PropertyCard[]; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const mapRef = useRef<MapView>(null);
  const [trackMarkers, setTrackMarkers] = useState(true);
  const mapped = pins.flatMap((item) => {
    const coordinate = coordinates(item);
    return coordinate ? [{ item, coordinate }] : [];
  });

  useEffect(() => {
    setTrackMarkers(true);
    const timer = setTimeout(() => setTrackMarkers(false), 800);
    return () => clearTimeout(timer);
  }, [mapped.length]);

  if (!androidMapsReady()) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, gap: 10 }}>
        {mapped.length === 0 ? <Text style={styles.meta}>{t.search.mapEmpty}</Text> : null}
        {mapped.map(({ item }) => (
          <Pressable key={item.id} onPress={() => onOpen(item.slug || item.id)} style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <Text style={{ color: colors.ink, fontWeight: "800" }} numberOfLines={1}>{item.title}</Text>
            <Text style={{ color: colors.primary, fontWeight: "800", marginTop: 4 }}>{pinPrice(item.price)}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={1}>{[item.locality, item.city].filter(Boolean).join(", ") || t.common.locationAdded}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  const region = regionFor(mapped.map(({ coordinate }) => coordinate));

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={region}
        onMapReady={() => {
          if (mapped.length < 2) return;
          mapRef.current?.fitToCoordinates(mapped.map(({ coordinate }) => coordinate), {
            edgePadding: { top: 90, right: 70, bottom: 90, left: 70 },
            animated: false,
          });
        }}
      >
        {mapped.map(({ item, coordinate }) => (
          <Marker
            key={item.id}
            coordinate={coordinate}
            title={item.title}
            description={inr(item.price)}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={trackMarkers}
            onPress={() => onOpen(item.slug || item.id)}
          >
            <View style={{ alignItems: "center" }}>
              <View style={{ backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 2, borderColor: colors.white }}>
                <Text style={{ color: colors.white, fontWeight: "800", fontSize: 12 }}>{pinPrice(item.price)}</Text>
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: colors.primary }} />
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

function regionFor(points: Array<{ latitude: number; longitude: number }>) {
  if (!points.length) return { latitude: 22.3039, longitude: 70.8022, latitudeDelta: 0.2, longitudeDelta: 0.2 };
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;
  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.08, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.08, (maxLng - minLng) * 1.6),
  };
}
