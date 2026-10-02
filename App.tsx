import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { subscribeRemoteSettings } from "./src/lib/remoteConfig";
import { RootNavigation } from "./src/navigation";

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
          <RootNavigation />
        </FavoritesProvider>
      </AuthProvider>
      </RemoteSettingsBridge>
    </SafeAreaProvider>
  );
}
