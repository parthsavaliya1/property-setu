import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import { RequireLoginContext, useRequireLogin } from "./context/LoginGate";
import { RazorpayHost } from "./components/RazorpayCheckout";
import { useAuth } from "./context/AuthContext";
import { FavoritesScreen, InquiriesScreen, MenuScreen, MyPropertiesScreen, NotificationsScreen, ProfileScreen, VisitsScreen, WalletScreen } from "./screens/AccountScreens";
import { LoginScreen, OnboardingScreen, SplashScreen } from "./screens/AuthScreens";
import { DetailsScreen, HomeScreen, MapScreen, SearchScreen } from "./screens/BrowseScreens";
import { AddScreen, ScheduleScreen } from "./screens/ListingScreens";

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Main: undefined;
  Map: undefined;
  Details: { id: string };
  Add: { id?: string } | undefined;
  Schedule: { id: string };
  MyProperties: undefined;
  Inquiries: undefined;
  Visits: undefined;
  Profile: undefined;
  Notifications: undefined;
  Wallet: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function openDetails(id: string) {
  if (navigationRef.isReady()) navigationRef.navigate("Details", { id });
}

function Tabs() {
  const { session } = useAuth();
  const requireLogin = useRequireLogin();
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#146c36",
        tabBarInactiveTintColor: "#8a918c",
        tabBarStyle: { height: 68, paddingTop: 6, paddingBottom: 8, borderTopColor: "#E7E0D6", backgroundColor: "#F4EFE8" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = { Home: "home", Search: "search", Saved: "heart-outline", Profile: "person-outline" };
          const name = icons[route.name];
          return name ? <Ionicons name={name} size={size} color={color} /> : null;
        },
      })}
    >
      <Tab.Screen name="Home">
        {({ navigation }) => (
          <HomeScreen
            onOpen={openDetails}
            onSearch={(query) => {
              setSearchQuery(query);
              navigation.navigate("Search");
            }}
            onNotify={() => navigationRef.navigate("Notifications")}
            onProfile={() => navigation.navigate("Profile")}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Search">{() => <SearchScreen initialQuery={searchQuery} onOpen={openDetails} />}</Tab.Screen>
      <Tab.Screen
        name="Map"
        options={{
          tabBarLabel: () => null,
          tabBarButton: () => (
            <Pressable
              onPress={() => {
                if (!session) {
                  requireLogin("Sign in to add a property.");
                  return;
                }
                navigationRef.navigate("Add");
              }}
              style={{ alignItems: "center", width: 72 }}
            >
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: "#146c36", alignItems: "center", justifyContent: "center", marginTop: -22 }}>
                <Text style={{ color: "white", fontSize: 30, fontWeight: "500", marginTop: -2 }}>+</Text>
              </View>
              <Text style={{ color: "#8a918c", fontSize: 11, fontWeight: "600", marginTop: 2 }}>Sell</Text>
            </Pressable>
          ),
        }}
      >
        {() => <MapScreen onOpen={openDetails} />}
      </Tab.Screen>
      <Tab.Screen name="Saved">{() => <FavoritesScreen onOpen={openDetails} />}</Tab.Screen>
      <Tab.Screen name="Profile">
        {({ navigation }) => (
          <MenuScreen
            onNavigate={(screen) => navigationRef.navigate(screen)}
            onFavorites={() => navigation.navigate("Saved")}
            onSignIn={() => navigationRef.navigate("Login")}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function RootNavigation() {
  const { session } = useAuth();
  const [start, setStart] = useState<keyof RootStackParamList | null>(null);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !navigationRef.isReady()) return;
    const current = navigationRef.getCurrentRoute()?.name;
    if (current === "Login" || current === "Onboarding") {
      navigationRef.reset({ index: 0, routes: [{ name: "Main" }] });
    }
  }, [session]);

  if (!start) {
    return (
      <SplashScreen
        onDone={(hasSession, seen) => {
          if (hasSession || seen) setStart("Main");
          else setStart("Onboarding");
        }}
      />
    );
  }

  return (
    <RazorpayHost>
    <RequireLoginContext.Provider value={setLoginMessage}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName={start}
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
          }}
        >
          <Stack.Screen name="Onboarding">{() => <OnboardingScreen onDone={() => navigationRef.reset({ index: 0, routes: [{ name: "Main" }] })} />}</Stack.Screen>
          <Stack.Screen name="Login">{() => <LoginScreen onBrowse={() => navigationRef.reset({ index: 0, routes: [{ name: "Main" }] })} />}</Stack.Screen>
          <Stack.Screen name="Main" component={Tabs} />
          <Stack.Screen name="Map">{() => <MapScreen onOpen={openDetails} showBack />}</Stack.Screen>
          <Stack.Screen name="Details">{({ route }) => <DetailsScreen id={route.params.id} onSchedule={(id) => navigationRef.navigate("Schedule", { id })} />}</Stack.Screen>
          <Stack.Screen name="Add">{({ route }) => session ? <AddScreen propertyId={route.params?.id} onDone={() => navigationRef.reset({ index: 0, routes: [{ name: "Main" }] })} /> : <LoginScreen onBrowse={() => navigationRef.navigate("Main")} />}</Stack.Screen>
          <Stack.Screen name="Schedule">{({ route }) => <ScheduleScreen id={route.params.id} onDone={() => navigationRef.navigate("Visits")} />}</Stack.Screen>
          <Stack.Screen name="MyProperties">{() => <MyPropertiesScreen onOpen={openDetails} onEdit={(id) => navigationRef.navigate("Add", { id })} />}</Stack.Screen>
          <Stack.Screen name="Inquiries" component={InquiriesScreen} />
          <Stack.Screen name="Visits" component={VisitsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <Modal visible={Boolean(loginMessage)} transparent animationType="fade" onRequestClose={() => setLoginMessage(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(28,28,28,0.45)", justifyContent: "center", paddingHorizontal: 28 }}>
          <View style={{ backgroundColor: "white", borderRadius: 18, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#1c1c1c" }}>Login required</Text>
            <Text style={{ marginTop: 8, color: "#5c564e", lineHeight: 20 }}>{loginMessage}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable onPress={() => setLoginMessage(null)} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: "#e6e1d8", paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setLoginMessage(null);
                  if (navigationRef.isReady()) navigationRef.navigate("Login");
                }}
                style={{ flex: 1, borderRadius: 12, backgroundColor: "#146c36", paddingVertical: 12, alignItems: "center" }}
              >
                <Text style={{ color: "white", fontWeight: "800" }}>Login</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </RequireLoginContext.Provider>
    </RazorpayHost>
  );
}
