import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { languageOptions, useI18n, type LanguageCode } from "../i18n";
import { colors } from "../theme";

export function LanguageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { language, setLanguage, t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(28,28,28,0.45)", justifyContent: "flex-end" }}>
        <Pressable onPress={() => undefined} style={{ backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.ink }}>{t.common.language}</Text>
          <Text style={{ marginTop: 4, marginBottom: 8, color: colors.muted, lineHeight: 20 }}>{t.language.hint}</Text>
          {languageOptions.map((item) => {
            const selected = item.code === language;
            return (
              <Pressable
                key={item.code}
                onPress={() => {
                  if (item.code !== language) void setLanguage(item.code);
                  onClose();
                }}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.lineSoft }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: colors.ink }}>{item.native}</Text>
                  <Text style={{ marginTop: 2, color: colors.muted }}>{item.english}</Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function useLanguagePicker() {
  const { language } = useI18n();
  const [open, setOpen] = useState(false);
  const current = languageOptions.find((item) => item.code === language);
  return {
    openPicker: () => setOpen(true),
    nativeName: current?.native ?? "English",
    code: language,
    modal: <LanguageModal visible={open} onClose={() => setOpen(false)} />,
  };
}

export function LanguageButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}>
      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export type { LanguageCode };
