import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import { RequireLoginContext, useRequireLogin } from "./context/LoginGate";
import { RazorpayHost } from "./components/RazorpayCheckout";
import { buttonShadow, colors } from "./theme";
import { useAuth } from "./context/AuthContext";
import { EditProfileScreen, FavoritesScreen, InquiriesScreen, MenuScreen, MyPropertiesScreen, NotificationsScreen, PaymentHistoryScreen, ProfileScreen, VisitsScreen, WalletScreen } from "./screens/AccountScreens";
import { AboutScreen } from "./screens/AboutScreen";
import { ChatScreen, ChatsScreen } from "./screens/ChatScreens";
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
  EditProfile: undefined;
  Notifications: undefined;
  Chats: undefined;
  Chat: { conversationId?: string; propertyId?: string; buyerId?: string };
  Wallet: undefined;
  PaymentHistory: undefined;
  About: undefined;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const tabNav = useRef<{ navigate: (name: "Saved" | "Profile") => void } | null>(null);

  function openMenu() {
    setMenuOpen(true);
  }

  function closeMenu(after?: () => void) {
    setMenuOpen(false);
    after?.();
  }

  function profilePage(showBack: boolean) {
    return (
      <ProfileScreen
        showBack={showBack}
        onOpen={openDetails}
        onEdit={(id) => navigationRef.navigate("Add", { id })}
        onEditProfile={() => (session ? navigationRef.navigate("EditProfile") : navigationRef.navigate("Login"))}
        onWallet={() => (session ? navigationRef.navigate("Wallet") : navigationRef.navigate("Login"))}
        onHistory={() => (session ? navigationRef.navigate("PaymentHistory") : navigationRef.navigate("Login"))}
        onSignIn={() => navigationRef.navigate("Login")}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { height: 68, paddingTop: 6, paddingBottom: 8, borderTopColor: colors.line, backgroundColor: colors.page },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = { Home: "home", Search: "search", Saved: "heart-outline", Profile: "person-outline" };
          const name = icons[route.name];
          return name ? <Ionicons name={name} size={size} color={color} /> : null;
        },
      })}
    >
      <Tab.Screen name="Home">
        {({ navigation }) => {
          tabNav.current = navigation;
          return (
          <HomeScreen
            onOpen={openDetails}
            onSearch={(query) => {
              setSearchQuery(query);
              navigation.navigate("Search");
            }}
            onNotify={() => navigationRef.navigate("Notifications")}
            onOpenMenu={openMenu}
          />
          );
        }}
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
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: -22, ...buttonShadow }}>
                <Text style={{ color: colors.white, fontSize: 30, fontWeight: "500", marginTop: -2 }}>+</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700", marginTop: 2 }}>Sell</Text>
            </Pressable>
          ),
        }}
      >
        {() => <MapScreen onOpen={openDetails} />}
      </Tab.Screen>
      <Tab.Screen name="Saved">{() => <FavoritesScreen onOpen={openDetails} />}</Tab.Screen>
      <Tab.Screen name="Profile">
        {({ navigation }) => {
          tabNav.current = navigation;
          return profilePage(false);
        }}
      </Tab.Screen>
    </Tab.Navigator>
    <Modal visible={menuOpen} animationType="fade" onRequestClose={() => closeMenu()}>
      <MenuScreen
        onClose={() => closeMenu()}
        onProfile={() => closeMenu(() => tabNav.current?.navigate("Profile"))}
        onFavorites={() => closeMenu(() => tabNav.current?.navigate("Saved"))}
        onChats={() => closeMenu(() => {
          if (!session) {
            requireLogin("Sign in to see your messages.");
            return;
          }
          navigationRef.navigate("Chats");
        })}
        onInquiries={() => closeMenu(() => session ? navigationRef.navigate("Inquiries") : navigationRef.navigate("Login"))}
        onVisits={() => closeMenu(() => session ? navigationRef.navigate("Visits") : navigationRef.navigate("Login"))}
        onNotifications={() => closeMenu(() => session ? navigationRef.navigate("Notifications") : navigationRef.navigate("Login"))}
        onAbout={() => closeMenu(() => navigationRef.navigate("About"))}
        onSignIn={() => closeMenu(() => navigationRef.navigate("Login"))}
      />
    </Modal>
    </View>
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
          <Stack.Screen name="Details">{({ route }) => <DetailsScreen id={route.params.id} onSchedule={(id) => navigationRef.navigate("Schedule", { id })} onChat={(id) => navigationRef.navigate("Chat", { propertyId: id })} />}</Stack.Screen>
          <Stack.Screen name="Add">{({ route }) => session ? <AddScreen propertyId={route.params?.id} onDone={() => navigationRef.reset({ index: 0, routes: [{ name: "Main" }] })} /> : <LoginScreen onBrowse={() => navigationRef.navigate("Main")} />}</Stack.Screen>
          <Stack.Screen name="Schedule">{({ route }) => <ScheduleScreen id={route.params.id} onDone={() => navigationRef.navigate("Visits")} />}</Stack.Screen>
          <Stack.Screen name="MyProperties">{() => <MyPropertiesScreen onOpen={openDetails} onEdit={(id) => navigationRef.navigate("Add", { id })} />}</Stack.Screen>
          <Stack.Screen name="Inquiries">{() => <InquiriesScreen onChat={(propertyId, buyerId) => navigationRef.navigate("Chat", { propertyId, buyerId: buyerId || undefined })} />}</Stack.Screen>
          <Stack.Screen name="Visits">{() => <VisitsScreen onOpen={openDetails} />}</Stack.Screen>
          <Stack.Screen name="EditProfile">{() => session ? <EditProfileScreen /> : <LoginScreen onBrowse={() => navigationRef.navigate("Main")} />}</Stack.Screen>
          <Stack.Screen name="Profile">{() => (
            <ProfileScreen
              showBack
              onOpen={openDetails}
              onEdit={(id) => navigationRef.navigate("Add", { id })}
              onEditProfile={() => navigationRef.navigate("EditProfile")}
              onWallet={() => navigationRef.navigate("Wallet")}
              onHistory={() => navigationRef.navigate("PaymentHistory")}
              onSignIn={() => navigationRef.navigate("Login")}
            />
          )}</Stack.Screen>
          <Stack.Screen name="Notifications">
            {() => (
              <NotificationsScreen
                onOpen={(item) => {
                  const conversationId = item.data?.conversation_id;
                  if (item.type === "new_message" || item.type === "new_inquiry") {
                    if (conversationId) navigationRef.navigate("Chat", { conversationId });
                    else if (item.data?.property_id) navigationRef.navigate("Chat", { propertyId: item.data.property_id });
                    return;
                  }
                  if (item.type === "visit_request" || item.type === "visit_confirmed") {
                    if (item.data?.property_id) navigationRef.navigate("Details", { id: item.data.property_id });
                    else navigationRef.navigate("Visits");
                    return;
                  }
                  if (item.data?.property_id) navigationRef.navigate("Details", { id: item.data.property_id });
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Chats">{() => <ChatsScreen onOpen={(id) => navigationRef.navigate("Chat", { conversationId: id })} />}</Stack.Screen>
          <Stack.Screen name="Chat">{({ route }) => <ChatScreen conversationId={route.params?.conversationId} propertyId={route.params?.propertyId} buyerId={route.params?.buyerId} />}</Stack.Screen>
        <Stack.Screen name="Wallet">{() => <WalletScreen onHistory={() => navigationRef.navigate("PaymentHistory")} />}</Stack.Screen>
        <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
        <Stack.Screen name="About">{() => (
          <AboutScreen
            onSignIn={() => navigationRef.navigate("Login")}
            onDeleted={() => navigationRef.reset({ index: 0, routes: [{ name: "Main" }] })}
          />
        )}</Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
      <Modal visible={Boolean(loginMessage)} transparent animationType="fade" onRequestClose={() => setLoginMessage(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(28,28,28,0.45)", justifyContent: "center", paddingHorizontal: 28 }}>
          <View style={{ backgroundColor: "white", borderRadius: 18, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.ink }}>Login required</Text>
            <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 20 }}>{loginMessage}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable onPress={() => setLoginMessage(null)} style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: colors.card }}>
                <Text style={{ fontWeight: "700", color: colors.primary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setLoginMessage(null);
                  if (navigationRef.isReady()) navigationRef.navigate("Login");
                }}
                style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 14, backgroundColor: pressed ? colors.primaryDark : colors.primary, alignItems: "center", justifyContent: "center", ...buttonShadow })}
              >
                <Text style={{ color: colors.white, fontWeight: "700" }}>Login</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </RequireLoginContext.Provider>
    </RazorpayHost>
  );
}
