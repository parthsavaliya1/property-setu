import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
  type ScrollViewProps,
} from "react-native";

type Measurable = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};

let sharedOverlap = 0;
const overlapListeners = new Set<(value: number) => void>();
const scrollListeners = new Set<() => void>();
const screenMeasurers = new Set<(event: { endCoordinates?: { screenY?: number; height?: number } }) => void>();
let keyboardWatchStarted = false;

function ensureKeyboardWatch() {
  if (keyboardWatchStarted || Platform.OS !== "android") return;
  keyboardWatchStarted = true;
  Keyboard.addListener("keyboardDidShow", (event) => {
    [...screenMeasurers].at(-1)?.(event);
  });
  Keyboard.addListener("keyboardDidHide", () => publishOverlap(0));
}

function publishOverlap(value: number) {
  const next = Math.max(0, Math.round(value));
  if (next === sharedOverlap) return;
  sharedOverlap = next;
  overlapListeners.forEach((listener) => listener(next));
}

function focusedInput() {
  const state = TextInput.State as { currentlyFocusedInput?: () => Measurable | null };
  const input = state.currentlyFocusedInput?.() ?? null;
  if (!input || typeof input.measureInWindow !== "function") return null;
  return input;
}

export function useKeyboardOverlap() {
  const [overlap, setOverlap] = useState(sharedOverlap);
  useEffect(() => {
    const listener = (value: number) => setOverlap(value);
    overlapListeners.add(listener);
    setOverlap(sharedOverlap);
    return () => {
      overlapListeners.delete(listener);
    };
  }, []);
  return Platform.OS === "android" ? overlap : 0;
}

export function requestScrollFocusedInput() {
  if (Platform.OS !== "android") return;
  setTimeout(() => {
    const listener = [...scrollListeners].at(-1);
    listener?.();
  }, 60);
}

export function KeyboardScreen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const viewRef = useRef<View>(null);
  const overlap = useKeyboardOverlap();

  useEffect(() => {
    if (Platform.OS !== "android") return;
    ensureKeyboardWatch();
    const measure = (event: { endCoordinates?: { screenY?: number; height?: number } }) => {
      viewRef.current?.measureInWindow((_x, y, _width, height) => {
        if (height < 40) return;
        const windowHeight = Dimensions.get("window").height;
        if (y > windowHeight * 0.25) return;
        const screenY = event.endCoordinates?.screenY ?? 0;
        const keyboardHeight = event.endCoordinates?.height ?? 0;
        const next = screenY > 0 ? y + height - screenY : keyboardHeight;
        publishOverlap(next);
      });
    };
    screenMeasurers.add(measure);
    return () => {
      screenMeasurers.delete(measure);
    };
  }, []);

  return (
    <KeyboardAvoidingView style={[{ flex: 1 }, style]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View ref={viewRef} collapsable={false} style={{ flex: 1, paddingBottom: overlap }}>
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

export function KeyboardFormScroll({ contentContainerStyle, onScroll, onLayout, ...rest }: ScrollViewProps) {
  const ref = useRef<ScrollView>(null);
  const scrollY = useRef(0);

  const alignFocused = useCallback(() => {
    if (Platform.OS !== "android") return;
    const input = focusedInput();
    const scroller = ref.current;
    if (!input || !scroller) return;
    (scroller as unknown as Measurable).measureInWindow((sx, sy, sw, sh) => {
      if (sh < 40) return;
      input.measureInWindow((ix, iy, iw, ih) => {
        const inside = ix + iw > sx + 4 && ix < sx + sw - 4;
        if (!inside) return;
        const hidden = iy + ih - (sy + sh - 16);
        if (hidden > 8) scroller.scrollTo({ y: scrollY.current + hidden, animated: true });
      });
    });
  }, []);

  useEffect(() => {
    scrollListeners.add(alignFocused);
    return () => {
      scrollListeners.delete(alignFocused);
    };
  }, [alignFocused]);

  const overlap = useKeyboardOverlap();
  useEffect(() => {
    if (overlap <= 0 || [...scrollListeners].at(-1) !== alignFocused) return;
    const timer = setTimeout(alignFocused, 80);
    return () => clearTimeout(timer);
  }, [overlap, alignFocused]);

  return (
    <ScrollView
      ref={ref}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={contentContainerStyle}
      onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      }}
      scrollEventThrottle={16}
      onLayout={(event: LayoutChangeEvent) => {
        onLayout?.(event);
        if (sharedOverlap > 0 && [...scrollListeners].at(-1) === alignFocused) setTimeout(alignFocused, 40);
      }}
      {...rest}
    />
  );
}
