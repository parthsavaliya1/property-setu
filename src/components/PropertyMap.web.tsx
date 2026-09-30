import { Pressable, Text, View } from "react-native";
import { ScreenTitle, styles } from "./ui";
import type { PropertyCard } from "../types/database";

export function PropertyMap({ pins, onOpen }: { pins: PropertyCard[]; onOpen: (id: string) => void }) {
  return (
    <View style={styles.screen}>
      <ScreenTitle title="Map" />
      <View style={styles.body}>
        <Text style={styles.meta}>The map opens on the phone app. Listings with a location are listed here.</Text>
        {pins.length === 0 ? <Text style={styles.meta}>No mapped properties yet.</Text> : pins.map((item) => (
          <Pressable key={item.id} onPress={() => onOpen(item.slug || item.id)}>
            <Text style={{ fontWeight: "700", marginTop: 12 }}>{item.title}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
