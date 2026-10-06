import { Pressable, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { ScreenTitle, styles } from "./ui";
import type { PropertyCard } from "../types/database";

export function PropertyMap({ pins, onOpen }: { pins: PropertyCard[]; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.screen}>
      <ScreenTitle title={t.search.map} />
      <View style={styles.body}>
        <Text style={styles.meta}>{t.search.mapWeb}</Text>
        {pins.length === 0 ? <Text style={styles.meta}>{t.search.mapEmpty}</Text> : pins.map((item) => (
          <Pressable key={item.id} onPress={() => onOpen(item.slug || item.id)}>
            <Text style={{ fontWeight: "700", marginTop: 12 }}>{item.title}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
