import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated, Dimensions, Image, Pressable, StatusBar, Text, TextInput, View, type TextInputProps } from "react-native";
import { KeyboardScreen } from "../components/keyboard";
import { styles } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { buttonShadow, colors } from "../theme";

const splashLogo = require("../../assets/center-logo.png");
const splashHouse = require("../../assets/splash-house.jpg");
const loginBg = require("../../assets/login-bg.jpg");

export { OnboardingScreen } from "../components/onboarding";

export function SplashScreen({ onDone }: { onDone: (hasSession: boolean, seen: boolean) => void }) {
  const { ready, session } = useAuth();
  useEffect(() => {
    if (!ready) return;
    let cancel = false;
    const seenPromise = AsyncStorage.getItem("propertyhub.onboarded").catch(() => null);
    const timer = setTimeout(() => {
      seenPromise.then((value) => {
        if (!cancel) onDone(Boolean(session), value === "1");
      });
    }, 2200);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [ready, onDone, session]);

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

const OTP_LENGTH = 6;

export function LoginScreen({ onBrowse }: { onBrowse: () => void }) {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const green = colors.primary;
  const slide = useState(() => new Animated.Value(520))[0];
  useEffect(() => {
    Animated.timing(slide, { toValue: 0, duration: 420, useNativeDriver: true }).start();
  }, [slide]);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function digits(value: string, max: number) {
    return value.replace(/\D/g, "").slice(0, max);
  }

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setStep("form");
    setOtp("");
    setSessionId("");
    setError("");
  }

  async function sendCode() {
    const mobile = digits(phone, 10);
    if (mobile.length !== 10) {
      setError("Enter a 10-digit mobile number.");
      return;
    }
    if (mode === "signup" && name.trim().length < 2) {
      setError("Enter your name to create the account.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const nextSession = await auth.sendOtp(mobile, mode === "signup");
      setPhone(mobile);
      setSessionId(nextSession);
      setOtp("");
      setStep("otp");
      setSecondsLeft(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the OTP");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const code = digits(otp, OTP_LENGTH);
    if (code.length !== OTP_LENGTH) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await auth.verifyOtp(phone, code, sessionId, mode === "signup", mode === "signup" ? name.trim() : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired OTP");
    } finally {
      setBusy(false);
    }
  }

  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const sheetWidth = Math.min(width, 430);
  const title = step === "otp" ? "Enter OTP" : mode === "login" ? "Welcome Back" : "Create Account";
  const subtitle = step === "otp"
    ? `We sent a 6-digit code to +91 ${phone}`
    : mode === "login"
      ? "Login with the OTP sent to your mobile"
      : "Add your name, then verify your mobile";
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
      <Animated.View style={{ alignSelf: "center", width: sheetWidth, backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", transform: [{ translateY: slide }] }}>
        <View style={{ alignSelf: "center", width: 44, height: 5, borderRadius: 5, backgroundColor: "#e4dfd6", marginTop: 10 }} />
        <View style={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 24 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: colors.ink }}>{title}</Text>
          <Text style={{ color: colors.muted, marginTop: 4, fontSize: 14 }}>{subtitle}</Text>
          {step === "form" ? (
            <View style={{ flexDirection: "row", marginTop: 16, borderBottomWidth: 1, borderBottomColor: "#ece7df" }}>
              {(["login", "signup"] as const).map((item) => {
                const active = mode === item;
                return (
                  <Pressable key={item} onPress={() => switchMode(item)} style={{ flex: 1, alignItems: "center", paddingTop: 4, paddingBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: active ? "700" : "500", color: active ? colors.ink : colors.faint }}>{item === "login" ? "Login" : "Sign Up"}</Text>
                    <View style={{ position: "absolute", left: "28%", right: "28%", bottom: -1, height: 3, borderRadius: 2, backgroundColor: active ? green : "transparent" }} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}
          {step === "form" ? (
            <>
              {mode === "signup" ? <AuthField label="Full name" value={name} onChangeText={setName} placeholder="Enter your name" autoCapitalize="words" /> : null}
              <AuthField label="Mobile number" value={phone} onChangeText={(value) => setPhone(digits(value, 10))} keyboardType="number-pad" placeholder="10-digit mobile number" maxLength={10} />
              <Pressable onPress={sendCode} disabled={busy} style={({ pressed }) => ({ backgroundColor: pressed ? colors.primaryDark : green, borderRadius: 14, height: 52, marginTop: 16, alignItems: "center", justifyContent: "center", opacity: busy ? 0.55 : 1, ...buttonShadow })}>
                <Text style={{ color: colors.white, textAlign: "center", fontWeight: "700", fontSize: 16 }}>{busy ? "Sending..." : "Send OTP"}</Text>
              </Pressable>
              <Text style={{ textAlign: "center", color: colors.muted, marginTop: 16, fontSize: 14 }}>
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <Text onPress={() => switchMode(mode === "login" ? "signup" : "login")} style={{ color: green, fontWeight: "800" }}>{mode === "login" ? "Sign Up" : "Login"}</Text>
              </Text>
            </>
          ) : (
            <>
              <OtpCode value={otp} onChange={(value) => setOtp(digits(value, OTP_LENGTH))} />
              <Pressable onPress={verify} disabled={busy} style={({ pressed }) => ({ backgroundColor: pressed ? colors.primaryDark : green, borderRadius: 14, height: 52, marginTop: 16, alignItems: "center", justifyContent: "center", opacity: busy ? 0.55 : 1, ...buttonShadow })}>
                <Text style={{ color: colors.white, textAlign: "center", fontWeight: "700", fontSize: 16 }}>{busy ? "Checking..." : mode === "signup" ? "Create account" : "Verify and login"}</Text>
              </Pressable>
              <Pressable onPress={secondsLeft > 0 ? undefined : sendCode} disabled={busy || secondsLeft > 0} style={{ marginTop: 16, alignItems: "center" }}>
                <Text style={{ color: secondsLeft > 0 ? colors.faint : green, fontWeight: "700", fontSize: 14 }}>
                  {secondsLeft > 0 ? `Resend OTP in ${secondsLeft}s` : "Resend OTP"}
                </Text>
              </Pressable>
              <Pressable onPress={() => { setStep("form"); setOtp(""); setError(""); }} style={{ marginTop: 12, alignItems: "center" }}>
                <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 14 }}>Change number</Text>
              </Pressable>
            </>
          )}
        </View>
      </Animated.View>
      </View>
    </KeyboardScreen>
  );
}

function OtpCode({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: colors.ink, fontWeight: "600", marginBottom: 8, fontSize: 14 }}>OTP</Text>
      <View style={{ height: 52 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {Array.from({ length: OTP_LENGTH }, (_, index) => {
            const active = value.length === index || (value.length === OTP_LENGTH && index === OTP_LENGTH - 1);
            return (
              <View key={index} style={{ flex: 1, height: 52, borderWidth: 1.5, borderColor: active ? colors.primary : colors.line, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.card }}>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink }}>{value[index] || ""}</Text>
              </View>
            );
          })}
        </View>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: "transparent" }}
        />
      </View>
    </View>
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
