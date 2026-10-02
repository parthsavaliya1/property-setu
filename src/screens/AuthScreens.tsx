import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated, Dimensions, Image, Pressable, StatusBar, Text, TextInput, View, type TextInputProps } from "react-native";
import { KeyboardFormScroll, KeyboardScreen, requestScrollFocusedInput } from "../components/keyboard";
import { styles } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { buttonShadow, colors } from "../theme";

const splashLogo = require("../../assets/center-logo.png");
const onboardingLogo = require("../../assets/onboarding-logo.png");
const splashHouse = require("../../assets/splash-house.jpg");
const loginBg = require("../../assets/login-bg.jpg");

export function SplashScreen({ onDone }: { onDone: (hasSession: boolean, seen: boolean) => void }) {
  const { ready, session } = useAuth();
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(async () => {
      const seen = (await AsyncStorage.getItem("propertyhub.onboarded")) === "1";
      onDone(Boolean(session), seen);
    }, 2200);
    return () => clearTimeout(timer);
  }, [ready, session, onDone]);

  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const logoWidth = Math.min(width * 0.42, 180);
  return (
    <View style={{ width, height, backgroundColor: colors.primaryDark }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Image source={splashHouse} style={{ position: "absolute", top: 0, left: 0, width, height }} resizeMode="cover" />
      <Image source={splashLogo} style={{ width: logoWidth, height: logoWidth * (1024 / 1536), alignSelf: "center", marginTop: insets.top + 24 }} resizeMode="contain" />
    </View>
  );
}

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  async function finish() {
    await AsyncStorage.setItem("propertyhub.onboarded", "1");
    onDone();
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.page, paddingHorizontal: 24, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 20) }}>
      <StatusBar barStyle="dark-content" />
      <Image source={onboardingLogo} style={{ width: 88, height: 46, alignSelf: "flex-start" }} resizeMode="contain" />
      <Text style={{ marginTop: 18, fontSize: 40, lineHeight: 46, fontWeight: "800", color: colors.ink }}>{"Find. Explore.\nBuy. Rent."}</Text>
      <Text style={{ marginTop: 14, fontSize: 16, lineHeight: 22, color: colors.muted }}>Your next home is just a search away.</Text>
      <Image source={splashHouse} style={{ flex: 1, width: "100%", marginVertical: 12 }} resizeMode="contain" />
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <View style={{ width: 22, height: 8, borderRadius: 8, backgroundColor: colors.primary }} />
        <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: colors.line }} />
        <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: colors.line }} />
      </View>
      <Pressable onPress={finish} style={({ pressed }) => ({ backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", ...buttonShadow })}>
        <Text style={{ color: colors.white, textAlign: "center", fontWeight: "700", fontSize: 16 }}>Next</Text>
      </Pressable>
      <Pressable onPress={finish} style={{ marginTop: 18 }}>
        <Text style={{ color: colors.primary, textAlign: "center", fontWeight: "700", fontSize: 16 }}>Skip</Text>
      </Pressable>
    </View>
  );
}

export function LoginScreen({ onBrowse }: { onBrowse: () => void }) {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const green = colors.primary;
  const slide = useState(() => new Animated.Value(520))[0];
  useEffect(() => {
    Animated.timing(slide, { toValue: 0, duration: 420, useNativeDriver: true }).start();
  }, [slide]);

  async function submit() {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (mode === "login") await auth.signInEmail(email.trim(), password);
      else {
        const message = await auth.signUpEmail(name.trim(), email.trim(), password);
        if (message) setInfo(message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await auth.signInGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }
  async function forgot() {
    setError("");
    setInfo("Use the password you saved when you created the account.");
  }

  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const sheetWidth = Math.min(width, 430);
  return (
    <KeyboardScreen style={{ backgroundColor: "#c4b29a" }}>
      <StatusBar barStyle="light-content" />
      <Image source={loginBg} style={{ position: "absolute", top: 0, left: 0, width, height }} resizeMode="cover" />
      <Pressable
        onPress={onBrowse}
        hitSlop={8}
        style={{ position: "absolute", top: insets.top + 10, right: 16, zIndex: 2, backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}
      >
        <Text style={{ color: green, fontWeight: "700", fontSize: 15 }}>Skip</Text>
      </Pressable>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Animated.View style={{ alignSelf: "center", width: sheetWidth, maxHeight: height - 72, flexShrink: 1, backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", transform: [{ translateY: slide }] }}>
        <KeyboardFormScroll bounces={false} style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ alignSelf: "center", width: 44, height: 5, borderRadius: 5, backgroundColor: "#e4dfd6", marginTop: 10 }} />
        <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: colors.ink }}>{mode === "login" ? "Welcome Back" : "Create Account"}</Text>
          <Text style={{ color: colors.muted, marginTop: 4, fontSize: 14 }}>{mode === "login" ? "Login to continue your property journey" : "Sign up to start your property journey"}</Text>
          <View style={{ flexDirection: "row", marginTop: 16, borderBottomWidth: 1, borderBottomColor: "#ece7df" }}>
            {(["login", "signup"] as const).map((item) => {
              const active = mode === item;
              return (
                <Pressable key={item} onPress={() => setMode(item)} style={{ flex: 1, alignItems: "center", paddingTop: 4, paddingBottom: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: active ? "700" : "500", color: active ? colors.ink : colors.faint }}>{item === "login" ? "Login" : "Sign Up"}</Text>
                  <View style={{ position: "absolute", left: "28%", right: "28%", bottom: -1, height: 3, borderRadius: 2, backgroundColor: active ? green : "transparent" }} />
                </Pressable>
              );
            })}
          </View>
          {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}
          {info ? <Text style={[styles.ok, { marginTop: 12 }]}>{info}</Text> : null}
          {mode === "signup" ? <AuthField label="Full name" value={name} onChangeText={setName} placeholder="Enter your name" /> : null}
          <AuthField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Enter email" />
          <AuthField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholder="Enter password" />
          {mode === "login" && (
            <Pressable onPress={forgot} style={{ alignSelf: "flex-end", marginTop: 10 }}>
              <Text style={{ color: green, fontWeight: "700", fontSize: 13 }}>Forgot Password?</Text>
            </Pressable>
          )}
          <Pressable onPress={submit} disabled={busy} style={({ pressed }) => ({ backgroundColor: pressed ? colors.primaryDark : green, borderRadius: 14, height: 52, marginTop: 16, alignItems: "center", justifyContent: "center", opacity: busy ? 0.55 : 1, ...buttonShadow })}>
            <Text style={{ color: colors.white, textAlign: "center", fontWeight: "700", fontSize: 16 }}>{mode === "login" ? "Login" : "Sign Up"}</Text>
          </Pressable>
          <Text style={{ textAlign: "center", color: colors.faint, marginTop: 16, marginBottom: 12, fontSize: 13 }}>or continue with</Text>
          <Pressable onPress={google} disabled={busy} style={{ borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, height: 52, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, backgroundColor: colors.card, opacity: busy ? 0.55 : 1 }}>
            <Ionicons name="logo-google" size={18} color={colors.ink} />
            <Text style={{ fontWeight: "600", color: colors.ink, fontSize: 15 }}>{mode === "login" ? "Continue with Google" : "Sign up with Google"}</Text>
          </Pressable>
          <Text style={{ textAlign: "center", color: colors.muted, marginTop: 16, fontSize: 14 }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <Text onPress={() => setMode(mode === "login" ? "signup" : "login")} style={{ color: green, fontWeight: "800" }}>{mode === "login" ? "Sign Up" : "Login"}</Text>
          </Text>
        </View>
        </KeyboardFormScroll>
      </Animated.View>
      </View>
    </KeyboardScreen>
  );
}

function AuthField({ label, ...props }: { label: string } & TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: focused ? colors.primary : colors.ink, fontWeight: "600", marginBottom: 8, fontSize: 14 }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.faint}
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
          requestScrollFocusedInput();
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={{ borderWidth: 1, borderColor: focused ? colors.primary : colors.line, borderRadius: 14, paddingHorizontal: 14, height: 52, color: colors.ink, backgroundColor: colors.card, fontSize: 15 }}
      />
    </View>
  );
}
