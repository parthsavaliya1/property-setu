import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated, Dimensions, Image, Pressable, StatusBar, Text, TextInput, View, type TextInputProps } from "react-native";
import { KeyboardScreen } from "../components/keyboard";
import { styles } from "../components/ui";
import { LanguageButton, useLanguagePicker } from "../components/LanguagePicker";
import { useAuth } from "../context/AuthContext";
import { fill } from "../i18n/format";
import { useI18n } from "../i18n";
import { buttonShadow, colors } from "../theme";

const splashHouse = require("../../assets/splash-house.jpg");
const loginBg = require("../../assets/login-bg.jpg");

export { OnboardingScreen } from "../components/onboarding";

export function SplashScreen({ onDone }: { onDone: (hasSession: boolean, seen: boolean) => void }) {
  const { ready, session } = useAuth();
  const { ready: languageReady } = useI18n();
  useEffect(() => {
    if (!ready || !languageReady) return;
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
  }, [ready, languageReady, onDone, session]);

  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ GreatVibes: require("../../assets/fonts/GreatVibes-Regular.ttf") });
  const { width, height } = Dimensions.get("screen");
  const scriptSize = Math.max(26, Math.min(30, width * 0.072));
  const scriptStyle = {
    color: "#FFFFFF",
    fontSize: scriptSize,
    lineHeight: scriptSize * 1.35,
    fontFamily: fontsLoaded ? "GreatVibes" : undefined,
    paddingVertical: 2,
    includeFontPadding: false,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  };
  return (
    <View style={{ flex: 1, backgroundColor: "#1B2436" }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Image source={splashHouse} style={{ position: "absolute", top: 0, left: 0, width, height }} resizeMode="cover" />
      <View style={{ flex: 1, alignItems: "center", paddingTop: insets.top + 36, paddingHorizontal: 20 }}>
        <Ionicons name="home-outline" size={58} color="#FFFFFF" />
        <Text style={{ marginTop: 16, color: "#FFFFFF", fontSize: 34, fontWeight: "700", letterSpacing: 0.2 }}>PropertyHub</Text>
        <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.92)", fontSize: 16, fontWeight: "400" }}>Find Your Perfect Place</Text>
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: insets.bottom + 64,
          transform: [{ rotate: "-16deg" }],
        }}
      >
        <Text style={scriptStyle}>More Than Property</Text>
        <Text style={{ ...scriptStyle, marginTop: -6, marginLeft: 22 }}>A Better Tomorrow</Text>
      </View>
    </View>
  );
}

const OTP_LENGTH = 6;

export function LoginScreen({ onBrowse, onPrivacy }: { onBrowse: () => void; onPrivacy: () => void }) {
  const auth = useAuth();
  const { t } = useI18n();
  const language = useLanguagePicker();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
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
      setError(t.auth.phoneInvalid);
      return;
    }
    if (mode === "signup" && name.trim().length < 2) {
      setError(t.auth.nameInvalid);
      return;
    }
    if (!accepted) {
      setError(t.auth.privacyRequired);
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
      setError(err instanceof Error ? err.message : t.auth.otpSendFailed);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const code = digits(otp, OTP_LENGTH);
    if (code.length !== OTP_LENGTH) {
      setError(t.auth.otpInvalid);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await auth.verifyOtp(phone, code, sessionId, mode === "signup", mode === "signup" ? name.trim() : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.otpCheckFailed);
    } finally {
      setBusy(false);
    }
  }

  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const sheetWidth = Math.min(width, 430);
  const title = step === "otp" ? t.auth.enterOtp : mode === "login" ? t.auth.welcome : t.auth.createAccount;
  const subtitle = step === "otp"
    ? fill(t.auth.otpSent, { phone })
    : mode === "login"
      ? t.auth.loginHint
      : t.auth.signupHint;
  return (
    <KeyboardScreen style={{ backgroundColor: "#c4b29a" }}>
      <StatusBar barStyle="light-content" />
      <Image source={loginBg} style={{ position: "absolute", top: 0, left: 0, width, height }} resizeMode="cover" />
      <View style={{ position: "absolute", top: insets.top + 10, left: 16, right: 16, zIndex: 2, flexDirection: "row", justifyContent: "space-between" }}>
        <LanguageButton onPress={language.openPicker} label={language.nativeName} />
        <Pressable
          onPress={onBrowse}
          hitSlop={8}
          style={{ backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}
        >
          <Text style={{ color: green, fontWeight: "700", fontSize: 15 }}>{t.common.skip}</Text>
        </Pressable>
      </View>
      {language.modal}
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
                    <Text style={{ fontSize: 15, fontWeight: active ? "700" : "500", color: active ? colors.ink : colors.faint }}>{item === "login" ? t.auth.loginTab : t.auth.signupTab}</Text>
                    <View style={{ position: "absolute", left: "28%", right: "28%", bottom: -1, height: 3, borderRadius: 2, backgroundColor: active ? green : "transparent" }} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}
          {step === "form" ? (
            <>
              {mode === "signup" ? <AuthField label={t.auth.fullName} value={name} onChangeText={setName} placeholder={t.auth.namePlaceholder} autoCapitalize="words" /> : null}
              <AuthField label={t.auth.mobile} value={phone} onChangeText={(value) => setPhone(digits(value, 10))} keyboardType="number-pad" placeholder={t.auth.mobilePlaceholder} maxLength={10} />
              <PrivacyConsent accepted={accepted} onToggle={() => { setAccepted((value) => !value); setError(""); }} onPrivacy={onPrivacy} />
              <Pressable onPress={sendCode} disabled={!accepted || busy} style={({ pressed }) => ({ backgroundColor: pressed && accepted ? colors.primaryDark : green, borderRadius: 14, height: 52, marginTop: 16, alignItems: "center", justifyContent: "center", opacity: !accepted || busy ? 0.4 : 1, ...(accepted ? buttonShadow : null) })}>
                <Text style={{ color: colors.white, textAlign: "center", fontWeight: "700", fontSize: 16 }}>{busy ? t.common.sending : t.auth.sendOtp}</Text>
              </Pressable>
              <Text style={{ textAlign: "center", color: colors.muted, marginTop: 16, fontSize: 14 }}>
                {mode === "login" ? t.auth.noAccount : t.auth.hasAccount}
                <Text onPress={() => switchMode(mode === "login" ? "signup" : "login")} style={{ color: green, fontWeight: "800" }}>{mode === "login" ? t.auth.signupTab : t.auth.loginTab}</Text>
              </Text>
            </>
          ) : (
            <>
              <OtpCode value={otp} onChange={(value) => setOtp(digits(value, OTP_LENGTH))} />
              <Pressable onPress={verify} disabled={busy} style={({ pressed }) => ({ backgroundColor: pressed ? colors.primaryDark : green, borderRadius: 14, height: 52, marginTop: 16, alignItems: "center", justifyContent: "center", opacity: busy ? 0.55 : 1, ...buttonShadow })}>
                <Text style={{ color: colors.white, textAlign: "center", fontWeight: "700", fontSize: 16 }}>{busy ? t.common.checking : mode === "signup" ? t.auth.create : t.auth.verify}</Text>
              </Pressable>
              <Pressable onPress={secondsLeft > 0 ? undefined : sendCode} disabled={busy || secondsLeft > 0} style={{ marginTop: 16, alignItems: "center" }}>
                <Text style={{ color: secondsLeft > 0 ? colors.faint : green, fontWeight: "700", fontSize: 14 }}>
                  {secondsLeft > 0 ? fill(t.auth.resendIn, { seconds: secondsLeft }) : t.auth.resend}
                </Text>
              </Pressable>
              <Pressable onPress={() => { setStep("form"); setOtp(""); setError(""); }} style={{ marginTop: 12, alignItems: "center" }}>
                <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 14 }}>{t.auth.changeNumber}</Text>
              </Pressable>
            </>
          )}
        </View>
      </Animated.View>
      </View>
    </KeyboardScreen>
  );
}

function PrivacyConsent({ accepted, onToggle, onPrivacy }: { accepted: boolean; onToggle: () => void; onPrivacy: () => void }) {
  const { t } = useI18n();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 16 }}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: accepted ? colors.primary : "#C9BFB6",
          backgroundColor: accepted ? colors.primary : colors.card,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {accepted ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}
      </Pressable>
      <Text style={{ flex: 1, marginLeft: 10, color: colors.muted, fontSize: 14, lineHeight: 22, includeFontPadding: false }}>
        <Text onPress={onToggle}>{t.auth.agreeBefore}</Text>
        <Text onPress={onPrivacy} style={{ color: colors.primary, fontWeight: "800", textDecorationLine: "underline" }}>{t.auth.privacyPolicy}</Text>
        <Text onPress={onToggle}>{t.auth.agreeAfter}</Text>
      </Text>
    </View>
  );
}

function OtpCode({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: colors.ink, fontWeight: "600", marginBottom: 8, fontSize: 14 }}>{t.auth.otp}</Text>
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
