import { useNavigation, type NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation";
import { useEffect, useState } from "react";
import { Linking, Pressable } from "react-native";
import { apiBase } from "../lib/api";
import { privacySections } from "../lib/privacyContent";
import { DELETE_ACCOUNT_URL, PRIVACY_URL, SUPPORT_EMAIL } from "../lib/publicLinks";
import { ScrollView, Text, View } from "react-native";
import { PageHeader } from "../components/ui";
import { useI18n } from "../i18n";
import { colors } from "../theme";

export function PrivacyScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const sections = privacySections;
  const [email, setEmail] = useState(SUPPORT_EMAIL);
  useEffect(() => {
    let active = true;
    fetch(apiBase() + '/api/legal').then(res => { if (!res.ok) throw new Error('Unavailable'); return res.json(); }).then(data => { if (active && typeof data.support_email === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.support_email)) setEmail(data.support_email); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader title={t.privacy.title} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13, color: colors.faint, fontWeight: "600" }}>Updated 19 October 2026</Text>
        <Text style={[bodyText, { marginTop: 10 }]}>{t.privacy.intro}</Text>
        {sections.map(([title, body]) => (
          <View key={title} style={card}>
            <Text style={sectionTitle}>{title}</Text>
            {body.split("\n\n").map((paragraph) => (
              <Text key={paragraph} style={bodyText}>{paragraph}</Text>
            ))}
          </View>
        ))}
        <View style={card}><Text style={sectionTitle}>Contact and account deletion</Text>
          {email ? <Text onPress={() => Linking.openURL('mailto:' + email)} style={bodyText}>{email}</Text> : <Text style={bodyText}>Open the public policy for current support contact details.</Text>}
          <Pressable onPress={() => Linking.openURL(DELETE_ACCOUNT_URL)}><Text style={bodyText}>Delete account in a browser</Text></Pressable>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}><Text style={bodyText}>Public privacy policy</Text></Pressable>
          <Pressable onPress={() => navigation.navigate("Terms")}><Text style={bodyText}>Terms and community rules</Text></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const card = {
  backgroundColor: colors.card,
  borderRadius: 18,
  padding: 18,
  marginTop: 14,
  borderWidth: 1,
  borderColor: colors.line,
} as const;

const sectionTitle = {
  fontSize: 18,
  fontWeight: "800" as const,
  color: colors.ink,
  marginBottom: 8,
};

const bodyText = {
  fontSize: 15,
  lineHeight: 23,
  color: colors.muted,
  fontWeight: "500" as const,
  marginBottom: 8,
};
