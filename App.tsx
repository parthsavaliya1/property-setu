import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { RootNavigation } from "./src/navigation";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FavoritesProvider>
          <StatusBar style="dark" />
          <RootNavigation />
        </FavoritesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
