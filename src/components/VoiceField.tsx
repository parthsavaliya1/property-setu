import { Ionicons } from "@expo/vector-icons";
import { requireOptionalNativeModule } from "expo";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { useI18n } from "../i18n";
import { shapeSpoken, spokenKindForKeyboard, type SpokenKind } from "../lib/numbers";
import { colors } from "../theme";

type SpeechModule = {
  abort: () => void;
  stop: () => void;
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: { lang: string; interimResults?: boolean; continuous?: boolean }) => void;
  addListener: (eventName: "result" | "end" | "error", listener: (event: { results?: { transcript?: string }[]; error?: string }) => void) => { remove: () => void };
};

// Expo Go does not ship this native module. A null module keeps the app running; voice works in a development build.
const speech = requireOptionalNativeModule<SpeechModule>("ExpoSpeechRecognition");

function useSpeechEvent(eventName: "result" | "end" | "error", listener: (event: { results?: { transcript?: string }[]; error?: string }) => void) {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  useEffect(() => {
    if (!speech) return;
    const subscription = speech.addListener(eventName, (event) => listenerRef.current(event));
    return () => subscription.remove();
  }, [eventName]);
}

let activeMic: symbol | null = null;

type VoiceProps = {
  spoken?: SpokenKind;
  onValue: (value: string) => void;
};

function useMic({ spoken = "text", onValue, value = "" }: VoiceProps & { value?: string }) {
  const { locale, t } = useI18n();
  const token = useRef(Symbol("mic")).current;
  const onValueRef = useRef(onValue);
  const valueRef = useRef(value);
  const baseRef = useRef("");
  const [listening, setListening] = useState(false);
  onValueRef.current = onValue;
  valueRef.current = value;

  function apply(transcript: string) {
    const spokenText = shapeSpoken(transcript, spoken);
    if (!spokenText.trim()) return;
    if (spoken !== "text") {
      onValueRef.current(spokenText);
      return;
    }
    const prefix = baseRef.current.trim();
    onValueRef.current(prefix ? `${prefix} ${spokenText.trim()}` : spokenText);
  }

  function finish() {
    if (activeMic !== token) return;
    activeMic = null;
    setListening(false);
  }

  useSpeechEvent("result", (event) => {
    if (activeMic !== token) return;
    apply(event.results?.[0]?.transcript ?? "");
  });
  useSpeechEvent("end", finish);
  useSpeechEvent("error", (event) => {
    if (activeMic !== token) return;
    finish();
    if (event.error === "aborted" || event.error === "no-speech") return;
    Alert.alert(t.common.micUnavailable);
  });

  useEffect(() => () => {
    if (activeMic !== token) return;
    activeMic = null;
    speech?.abort();
  }, [token]);

  async function toggle() {
    if (!speech) {
      Alert.alert(t.common.micUnavailable);
      return;
    }
    if (listening) {
      speech.stop();
      return;
    }
    if (!speech.isRecognitionAvailable()) {
      Alert.alert(t.common.micUnavailable);
      return;
    }
    const permission = await speech.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.common.micDenied);
      return;
    }
    baseRef.current = valueRef.current;
    activeMic = token;
    setListening(true);
    try {
      speech.start({
        lang: locale,
        interimResults: true,
        continuous: false,
      });
    } catch {
      finish();
      Alert.alert(t.common.micUnavailable);
    }
  }

  return { listening, toggle, label: listening ? t.common.listening : t.common.speak };
}

export function VoiceButton({ spoken, onValue, value, style }: VoiceProps & { value?: string; style?: StyleProp<ViewStyle> }) {
  const { listening, toggle, label } = useMic({ spoken, onValue, value });
  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }, style]}
    >
      <Ionicons name={listening ? "mic" : "mic-outline"} size={20} color={listening ? colors.danger : colors.primary} />
    </Pressable>
  );
}

export function VoiceTextInput({ spoken, style, onChangeText, keyboardType, multiline, ...props }: TextInputProps & { spoken?: SpokenKind }) {
  const kind = spokenKindForKeyboard(keyboardType, spoken);
  const flat = StyleSheet.flatten(style) || {};
  const paddingLeft = flat.paddingLeft ?? flat.paddingHorizontal ?? 0;
  const { paddingRight: _paddingRight, paddingHorizontal: _paddingHorizontal, ...box } = flat;
  return (
    <View style={[box, { paddingLeft, paddingRight: 4, flexDirection: "row", alignItems: multiline ? "flex-start" : "center" }]}>
      <TextInput
        {...props}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor={props.placeholderTextColor}
        onChangeText={(next) => onChangeText?.(shapeSpoken(next, kind))}
        style={{
          flex: 1,
          minWidth: 0,
          color: flat.color,
          fontSize: flat.fontSize,
          paddingVertical: multiline ? 0 : flat.paddingVertical,
          minHeight: multiline && typeof flat.minHeight === "number" ? flat.minHeight - 16 : undefined,
          textAlignVertical: multiline ? "top" : "center",
          maxHeight: flat.maxHeight,
        }}
      />
      <VoiceButton spoken={kind} value={typeof props.value === "string" ? props.value : ""} onValue={(next) => onChangeText?.(next)} style={{ marginTop: multiline ? 4 : 0 }} />
    </View>
  );
}
