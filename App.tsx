import { StatusBar } from "expo-status-bar";
import { Component, useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { LanguageProvider, useI18n } from "./src/i18n";
import { subscribeRemoteSettings } from "./src/lib/remoteConfig";
import { RootNavigation } from "./src/navigation";
import { colors } from "./src/theme";

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <CrashFallback onRetry={() => this.setState((state) => ({ failed: false, attempt: state.attempt + 1 }))} />;
    }
    return <View key={this.state.attempt} style={{ flex: 1 }}>{this.props.children}</View>;
  }
}

function CrashFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <View style={{ flex: 1, backgroundColor: colors.page, justifyContent: "center", paddingHorizontal: 28 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink }}>{t.common.somethingWrong}</Text>
      <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 20 }}>{t.common.screenProblem}</Text>
      <Pressable onPress={onRetry} style={{ marginTop: 18, height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.white, fontWeight: "700" }}>{t.common.tryAgain}</Text>
      </Pressable>
    </View>
  );
}

function RemoteSettingsBridge({ children }: { children: ReactNode }) {
  const [, setVersion] = useState(0);
  useEffect(() => subscribeRemoteSettings(() => setVersion((value) => value + 1)), []);
  return children;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
      <RemoteSettingsBridge>
      <AuthProvider>
        <FavoritesProvider>
          <StatusBar style="dark" />
          <AppErrorBoundary>
            <RootNavigation />
          </AppErrorBoundary>
        </FavoritesProvider>
      </AuthProvider>
      </RemoteSettingsBridge>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
