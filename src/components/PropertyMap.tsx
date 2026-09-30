import MapView, { Marker } from "react-native-maps";
import { View } from "react-native";
import { inr } from "../lib/api";
import { styles } from "./ui";
import type { PropertyCard } from "../types/database";

export function PropertyMap({ pins, onOpen }: { pins: PropertyCard[]; onOpen: (id: string) => void }) {
  return (
    <View style={styles.screen}>
      <MapView style={{ flex: 1 }} initialRegion={{ latitude: 22.3039, longitude: 70.8022, latitudeDelta: 0.2, longitudeDelta: 0.2 }}>
        {pins.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: Number(item.latitude), longitude: Number(item.longitude) }}
            title={item.title}
            description={inr(item.price)}
            onCalloutPress={() => onOpen(item.slug || item.id)}
          />
        ))}
      </MapView>
    </View>
  );
}
