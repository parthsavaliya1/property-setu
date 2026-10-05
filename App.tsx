import { StatusBar } from "expo-status-bar";
import { Component, useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
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
      return (
        <View style={{ flex: 1, backgroundColor: colors.page, justifyContent: "center", paddingHorizontal: 28 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink }}>Something went wrong</Text>
          <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 20 }}>This screen hit a problem. You can open the app again from the start.</Text>
          <Pressable onPress={() => this.setState((state) => ({ failed: false, attempt: state.attempt + 1 }))} style={{ marginTop: 18, height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.white, fontWeight: "700" }}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return <View key={this.state.attempt} style={{ flex: 1 }}>{this.props.children}</View>;
  }
}

function RemoteSettingsBridge({ children }: { children: ReactNode }) {
  const [, setVersion] = useState(0);
  useEffect(() => subscribeRemoteSettings(() => setVersion((value) => value + 1)), []);
  return children;
}

export default function App() {
  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
