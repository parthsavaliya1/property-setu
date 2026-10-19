import { ScrollView, Text, View } from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation";
import { PageHeader } from "../components/ui";
import { termsSections } from "../lib/termsContent";
import { colors } from "../theme";

export function TermsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader title="Terms and community rules" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <Text style={{ color: colors.faint, fontSize: 13 }}>Updated 19 October 2026</Text>
        {termsSections.map(([title, body]) => (
          <View key={title} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 18, marginTop: 14 }}>
            <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "800", color: colors.ink, marginBottom: 8 }}>{title}</Text>
            <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23 }}>{body}</Text>
          </View>
        ))}
        <Text accessibilityRole="link" onPress={() => navigation.navigate("Privacy")} style={{ paddingVertical: 20, color: colors.primary, fontWeight: "700", textDecorationLine: "underline" }}>Privacy policy and contact information</Text>
      </ScrollView>
    </View>
  );
}
