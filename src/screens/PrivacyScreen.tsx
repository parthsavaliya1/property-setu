import { ScrollView, Text, View } from "react-native";
import { PageHeader } from "../components/ui";
import { useI18n } from "../i18n";
import { colors } from "../theme";

export function PrivacyScreen() {
  const { t } = useI18n();
  const sections = [
    [t.privacy.whoTitle, t.privacy.whoBody],
    [t.privacy.collectTitle, t.privacy.collectBody],
    [t.privacy.useTitle, t.privacy.useBody],
    [t.privacy.shareTitle, t.privacy.shareBody],
    [t.privacy.keepTitle, t.privacy.keepBody],
    [t.privacy.choicesTitle, t.privacy.choicesBody],
    [t.privacy.childrenTitle, t.privacy.childrenBody],
    [t.privacy.changesTitle, t.privacy.changesBody],
    [t.privacy.contactTitle, t.privacy.contactBody],
  ] as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader title={t.privacy.title} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13, color: colors.faint, fontWeight: "600" }}>{t.privacy.updated}</Text>
        <Text style={[bodyText, { marginTop: 10 }]}>{t.privacy.intro}</Text>
        {sections.map(([title, body]) => (
          <View key={title} style={card}>
            <Text style={sectionTitle}>{title}</Text>
            {body.split("\n\n").map((paragraph) => (
              <Text key={paragraph} style={bodyText}>{paragraph}</Text>
            ))}
          </View>
        ))}
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
