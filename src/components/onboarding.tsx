import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n";
import { colors } from "../theme";

const findHero = require("../../assets/onboarding-house.png");
const exploreHero = require("../../assets/splash-house.jpg");
const dealHero = require("../../assets/onboarding-viewing.jpg");
const villaPhoto = require("../../assets/hero-house.jpg");
const apartmentPhoto = require("../../assets/onboarding-house.png");

const palette = {
  green: colors.primary,
  greenPressed: colors.primaryDark,
  ink: "#101820",
  muted: "#667085",
  background: "#F8F5EE",
  white: "#FFFFFF",
  border: "#E5E1D8",
  dot: "#D5D0C6",
  heart: "#E23B4A",
  iconMuted: "#98A2B3",
  rent: "#B08958",
  sell: "#F07A1A",
  chipPressed: "#F3F0E8",
};

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type SlideKind = "search" | "discover" | "actions";

type Slide = {
  id: string;
  kind: SlideKind;
  titleLead: string;
  titleAccent: string;
  subtitle: string;
  subtitleLines: number;
  imageLabel: string;
};

const SLIDES: Slide[] = [
  {
    id: "find",
    kind: "search",
    titleLead: "Find Your",
    titleAccent: "Perfect Property",
    subtitle: "Discover verified homes, apartments,\nplots and commercial properties\naround you.",
    subtitleLines: 3,
    imageLabel: "Luxury modern home",
  },
  {
    id: "explore",
    kind: "discover",
    titleLead: "Explore &",
    titleAccent: "Compare Easily",
    subtitle: "Browse properties with smart filters,\nphotos, maps and detailed information.",
    subtitleLines: 2,
    imageLabel: "Modern homes in a residential neighborhood",
  },
  {
    id: "deal",
    kind: "actions",
    titleLead: "Buy, Rent or",
    titleAccent: "Sell with Ease",
    subtitle: "Connect directly with property owners\nand find the right deal.",
    subtitleLines: 2,
    imageLabel: "Couple viewing a luxury home with a property consultant",
  },
];

const CATEGORIES: { id: string; label: string; icon: IconName | null }[] = [
  { id: "all", label: "All", icon: null },
  { id: "house", label: "House", icon: "home-outline" },
  { id: "apartment", label: "Apartment", icon: "office-building-outline" },
  { id: "plot", label: "Plot", icon: "map-marker-outline" },
  { id: "villa", label: "Villa", icon: "home-city-outline" },
];

const FEATURES: { id: string; label: string; icon: IconName; color: string }[] = [
  { id: "buy", label: "Buy", icon: "home", color: palette.green },
  { id: "rent", label: "Rent", icon: "key-variant", color: palette.rent },
  { id: "sell", label: "Sell", icon: "tag", color: palette.sell },
];

const PREVIEWS: {
  id: string;
  image: ImageSourcePropType;
  title: string;
  price: string;
  location: string;
  beds: number;
  baths: number;
  area: string;
  favorite: boolean;
}[] = [
  {
    id: "villa",
    image: villaPhoto,
    title: "3 BHK Villa",
    price: "₹85,00,000",
    location: "Rajkot, Gujarat",
    beds: 3,
    baths: 3,
    area: "2,500 sq.ft.",
    favorite: true,
  },
  {
    id: "apartment",
    image: apartmentPhoto,
    title: "2 BHK Apartment",
    price: "₹45,00,000",
    location: "Kalawad Road, Rajkot",
    beds: 2,
    baths: 2,
    area: "1,200 sq.ft.",
    favorite: false,
  },
];

function useOnboardingFrame() {
  const { width, height } = useWindowDimensions();
  const short = height < 640;
  const tight = height < 720;
  return {
    width,
    height,
    short,
    tight,
    padH: width < 360 ? 16 : 22,
    titleSize: short ? 26 : tight ? 30 : 36,
    titleLine: short ? 31 : tight ? 36 : 42,
    subtitleSize: short ? 13 : tight ? 14 : 15.5,
    subtitleLine: short ? 18 : tight ? 20 : 22,
    topGap: short ? 6 : tight ? 8 : 14,
    blockGap: short ? 8 : tight ? 10 : 14,
    control: tight ? 46 : 52,
    button: tight ? 48 : 54,
    photoW: short ? 68 : tight ? 78 : 96,
    photoH: short ? 52 : tight ? 60 : 74,
    cardPad: tight ? 8 : 10,
    cardTitle: short ? 13 : 15,
    featureMin: short ? 78 : tight ? 92 : 108,
    featureIcon: short ? 24 : 28,
  };
}

function EdgeFeather({ width, height }: { width: number; height: number }) {
  const side = Math.round(Math.max(56, width * 0.18));
  const top = Math.round(Math.max(64, height * 0.22));
  const bottom = Math.round(Math.max(120, height * 0.38));
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={["#F8F5EE", "rgba(248,245,238,0.92)", "rgba(248,245,238,0.45)", "rgba(248,245,238,0)"]}
        locations={[0, 0.28, 0.62, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.fade, { left: 0, top: 0, bottom: 0, width: side }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(248,245,238,0)", "rgba(248,245,238,0.45)", "rgba(248,245,238,0.92)", "#F8F5EE"]}
        locations={[0, 0.38, 0.72, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.fade, { right: 0, top: 0, bottom: 0, width: side }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["#F8F5EE", "rgba(248,245,238,0.78)", "rgba(248,245,238,0.2)", "rgba(248,245,238,0)"]}
        locations={[0, 0.34, 0.68, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.fade, { top: 0, left: 0, right: 0, height: top }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(248,245,238,0)", "rgba(248,245,238,0.18)", "rgba(248,245,238,0.72)", "#F8F5EE"]}
        locations={[0, 0.32, 0.68, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.fade, { bottom: 0, left: 0, right: 0, height: bottom }]}
      />
    </>
  );
}

export function OnboardingPagination({
  count,
  index,
  onSelect,
}: {
  count: number;
  index: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <View style={styles.dots} accessibilityRole="tablist">
      {Array.from({ length: count }, (_, dot) => {
        const active = dot === index;
        return (
          <Pressable
            key={dot}
            accessibilityRole="tab"
            accessibilityLabel={`Onboarding screen ${dot + 1} of ${count}`}
            accessibilityState={{ selected: active }}
            hitSlop={{ left: 6, right: 6 }}
            onPress={() => onSelect?.(dot)}
            style={[styles.dotHit, active ? styles.dotHitActive : null]}
          >
            <View style={[styles.dot, active ? styles.dotActive : styles.dotIdle]} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function OnboardingButton({
  label,
  onPress,
  variant,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary";
  accessibilityLabel: string;
}) {
  const frame = useOnboardingFrame();
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { height: frame.button, borderRadius: 16 },
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && (primary ? styles.buttonPrimaryPressed : styles.buttonSecondaryPressed),
      ]}
    >
      <Text style={[styles.buttonText, { fontSize: frame.short ? 15 : 16 }, primary ? styles.buttonTextPrimary : styles.buttonTextSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CategoryChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconName | null;
  active: boolean;
  onPress: () => void;
}) {
  const color = active ? palette.white : palette.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipIdle,
        pressed && !active ? styles.chipPressed : null,
      ]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={16} color={color} /> : null}
      <Text style={[styles.chipText, { color }, icon ? styles.chipTextIcon : null]}>{label}</Text>
    </Pressable>
  );
}

export function FeatureOptionCard({
  label,
  icon,
  color,
}: {
  label: string;
  icon: IconName;
  color: string;
}) {
  const frame = useOnboardingFrame();
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.feature, { minHeight: frame.featureMin, borderRadius: 18 }]}
    >
      <MaterialCommunityIcons name={icon} size={frame.featureIcon} color={color} />
      <Text style={[styles.featureLabel, frame.short ? styles.featureLabelShort : null]}>{label}</Text>
    </View>
  );
}

function MetaStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.meta}>
      <MaterialCommunityIcons name={icon} size={14} color={palette.iconMuted} />
      <Text numberOfLines={1} style={styles.metaText}>{value}</Text>
    </View>
  );
}

export function PropertyPreviewCard({
  image,
  title,
  price,
  location,
  beds,
  baths,
  area,
  favorite = false,
}: {
  image: ImageSourcePropType;
  title: string;
  price: string;
  location: string;
  beds: number;
  baths: number;
  area: string;
  favorite?: boolean;
}) {
  const frame = useOnboardingFrame();
  const [saved, setSaved] = useState(favorite);
  return (
    <View style={[styles.preview, { padding: frame.cardPad, borderRadius: 18 }]}>
      <Image
        source={image}
        resizeMode="cover"
        fadeDuration={0}
        accessibilityIgnoresInvertColors
        accessibilityLabel={`${title} photo`}
        style={{ width: frame.photoW, height: frame.photoH, borderRadius: 12, backgroundColor: palette.border }}
      />
      <View style={styles.previewBody}>
        <View style={styles.previewTitleRow}>
          <Text numberOfLines={1} style={[styles.previewTitle, { fontSize: frame.cardTitle }]}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${title} from saved properties` : `Save ${title}`}
            accessibilityState={{ selected: saved }}
            hitSlop={10}
            onPress={() => setSaved((value) => !value)}
            style={styles.heart}
          >
            <MaterialCommunityIcons name={saved ? "heart" : "heart-outline"} size={20} color={saved ? palette.heart : palette.iconMuted} />
          </Pressable>
        </View>
        <Text numberOfLines={1} style={[styles.price, frame.short ? styles.priceShort : null]}>{price}</Text>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={13} color={palette.muted} />
          <Text numberOfLines={1} style={styles.location}>{location}</Text>
        </View>
        <View style={styles.metaRow}>
          <MetaStat icon="bed-outline" value={String(beds)} label={`${beds} bedrooms`} />
          <MetaStat icon="bathtub" value={String(baths)} label={`${baths} bathrooms`} />
          <MetaStat icon="floor-plan" value={area} label={`Area ${area}`} />
        </View>
      </View>
    </View>
  );
}

function SearchField({ variant }: { variant: "place" | "filter" }) {
  const { t } = useI18n();
  const frame = useOnboardingFrame();
  const circle = frame.control - (variant === "place" ? 8 : 0);
  const field = (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={t.onboarding.searchPlaceholder}
      style={[
        styles.search,
        {
          height: frame.control,
          borderRadius: 24,
          paddingLeft: 14,
          paddingRight: variant === "place" ? 5 : 14,
          flex: variant === "filter" ? 1 : undefined,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={variant === "place" ? "map-marker" : "magnify"}
        size={22}
        color={variant === "place" ? palette.green : palette.iconMuted}
      />
      <Text numberOfLines={1} style={[styles.placeholder, frame.short ? styles.placeholderShort : null]}>
        {t.onboarding.searchPlaceholder}
      </Text>
      {variant === "place" ? (
        <View style={[styles.circle, { width: circle, height: circle, borderRadius: circle / 2 }]}>
          <MaterialCommunityIcons name="magnify" size={22} color={palette.white} />
        </View>
      ) : null}
    </View>
  );

  if (variant === "place") return field;

  return (
    <View style={styles.filterRow}>
      {field}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="Filters"
        style={[styles.circle, { width: frame.control, height: frame.control, borderRadius: frame.control / 2 }]}
      >
        <MaterialCommunityIcons name="tune-variant" size={20} color={palette.white} />
      </View>
    </View>
  );
}

function CategoryRow() {
  const { t } = useI18n();
  const [selected, setSelected] = useState("all");
  const labels: Record<string, string> = {
    all: t.kinds.all,
    house: t.kinds.house,
    apartment: t.kinds.apartment,
    plot: t.kinds.plot,
    villa: t.kinds.villa,
  };
  const [rowWidth, setRowWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const overflow = contentWidth > rowWidth + 1;
  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      scrollEnabled={overflow}
      bounces={overflow}
      onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      onContentSizeChange={(width) => setContentWidth(width)}
      contentContainerStyle={styles.chipRow}
    >
      {CATEGORIES.map((item) => (
        <CategoryChip
          key={item.id}
          label={labels[item.id] || item.label}
          icon={item.icon}
          active={selected === item.id}
          onPress={() => setSelected(item.id)}
        />
      ))}
    </ScrollView>
  );
}

function HeroImage({
  source,
  label,
  pixelWidth,
  pixelHeight,
  focus,
  align = 0.5,
}: {
  source: ImageSourcePropType;
  label: string;
  pixelWidth: number;
  pixelHeight: number;
  focus: number;
  align?: number;
}) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const drawnHeight = box.width * (pixelHeight / pixelWidth);
  const height = Math.max(drawnHeight, box.height);
  const minTop = box.height - height;
  const preferredTop = box.height * align - height * focus;
  const top = Math.min(0, Math.max(minTop, preferredTop));
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.heroClip]}
      onLayout={(event) => {
        const { width, height: nextHeight } = event.nativeEvent.layout;
        setBox((current) => (
          Math.abs(current.width - width) < 1 && Math.abs(current.height - nextHeight) < 1
            ? current
            : { width, height: nextHeight }
        ));
      }}
    >
      {box.width > 0 ? (
        <Image
          source={source}
          resizeMode="cover"
          fadeDuration={0}
          accessibilityIgnoresInvertColors
          accessibilityLabel={label}
          style={{ position: "absolute", left: 0, width: box.width, height, top }}
        />
      ) : null}
      {box.width > 0 ? <EdgeFeather width={box.width} height={box.height} /> : null}
    </View>
  );
}

function FindVisual({ label }: { label: string }) {
  const frame = useOnboardingFrame();
  return (
    <View style={styles.visual}>
      <HeroImage source={findHero} label={label} pixelWidth={817} pixelHeight={1926} focus={0.7} />
      <View pointerEvents="box-none" style={[styles.visualOverlay, { paddingHorizontal: frame.padH, paddingBottom: frame.tight ? 12 : 16 }]}>
        <SearchField variant="place" />
      </View>
    </View>
  );
}

function DiscoverVisual({ label }: { label: string }) {
  const { t } = useI18n();
  const frame = useOnboardingFrame();
  const previews = PREVIEWS.map((item) => item.id === "villa"
    ? { ...item, title: t.onboarding.villaTitle, area: t.onboarding.villaArea }
    : { ...item, title: t.onboarding.apartmentTitle, area: t.onboarding.apartmentArea });
  return (
    <View style={styles.visual}>
      <HeroImage source={exploreHero} label={label} pixelWidth={472} pixelHeight={1024} focus={0.58} align={0.32} />
      <View
        pointerEvents="box-none"
        style={[styles.visualOverlay, { paddingHorizontal: frame.padH, paddingBottom: frame.tight ? 8 : 12, gap: frame.tight ? 8 : 10 }]}
      >
        {previews.map((item) => (
          <PropertyPreviewCard key={item.id} {...item} />
        ))}
      </View>
    </View>
  );
}

function DealVisual({ label }: { label: string }) {
  return (
    <View style={styles.visual}>
      <HeroImage source={dealHero} label={label} pixelWidth={682} pixelHeight={1024} focus={0.56} align={0.46} />
    </View>
  );
}

function OnboardingPage({ slide, width, height }: { slide: Slide; width: number; height: number }) {
  const { t } = useI18n();
  const frame = useOnboardingFrame();
  const featureLabels: Record<string, string> = { buy: t.home.buy, rent: t.home.rent, sell: t.tabs.sell };
  const insets = useSafeAreaInsets();
  return (
    <View style={{ width, height, paddingTop: insets.top + frame.topGap, backgroundColor: palette.background }}>
      <View style={{ paddingHorizontal: frame.padH }}>
        <Text
          accessibilityRole="header"
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={2}
          style={{
            fontSize: frame.titleSize,
            lineHeight: frame.titleLine,
            fontWeight: "800",
            color: palette.ink,
            letterSpacing: -0.4,
          }}
        >
          {slide.titleLead}
          {"\n"}
          <Text style={{ color: palette.green }}>{slide.titleAccent}</Text>
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          numberOfLines={slide.subtitleLines}
          style={{
            marginTop: frame.tight ? 6 : 8,
            color: palette.muted,
            fontSize: frame.subtitleSize,
            lineHeight: frame.subtitleLine,
            fontWeight: "400",
          }}
        >
          {slide.subtitle}
        </Text>
      </View>

      {slide.kind === "discover" ? (
        <View style={{ paddingHorizontal: frame.padH, marginTop: frame.blockGap }}>
          <CategoryRow />
          <View style={{ height: frame.tight ? 8 : 12 }} />
          <SearchField variant="filter" />
        </View>
      ) : null}

      {slide.kind === "actions" ? (
        <View style={{ paddingHorizontal: frame.padH, marginTop: frame.blockGap, flexDirection: "row", gap: frame.tight ? 8 : 12 }}>
          {FEATURES.map((item) => (
            <FeatureOptionCard key={item.id} label={featureLabels[item.id] || item.label} icon={item.icon} color={item.color} />
          ))}
        </View>
      ) : null}

      <View style={{ flex: 1, marginTop: frame.blockGap, minHeight: frame.short ? 120 : 160 }}>
        {slide.kind === "search" ? <FindVisual label={slide.imageLabel} /> : null}
        {slide.kind === "discover" ? <DiscoverVisual label={slide.imageLabel} /> : null}
        {slide.kind === "actions" ? <DealVisual label={slide.imageLabel} /> : null}
      </View>
    </View>
  );
}

export function OnboardingScreen({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { t } = useI18n();
  const slides = useMemo(() => SLIDES.map((slide) => {
    if (slide.id === "find") return { ...slide, titleLead: t.onboarding.findLead, titleAccent: t.onboarding.findAccent, subtitle: t.onboarding.findSubtitle, imageLabel: t.onboarding.findImage };
    if (slide.id === "explore") return { ...slide, titleLead: t.onboarding.exploreLead, titleAccent: t.onboarding.exploreAccent, subtitle: t.onboarding.exploreSubtitle, imageLabel: t.onboarding.exploreImage };
    return { ...slide, titleLead: t.onboarding.dealLead, titleAccent: t.onboarding.dealAccent, subtitle: t.onboarding.dealSubtitle, imageLabel: t.onboarding.dealImage };
  }), [t]);
  const insets = useSafeAreaInsets();
  const frame = useOnboardingFrame();
  const listRef = useRef<FlatList<Slide>>(null);
  const leaving = useRef(false);
  const [index, setIndex] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const last = index === SLIDES.length - 1;

  function onBodyLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setViewport((current) => (
      Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1 ? current : { width, height }
    ));
  }

  function sync(offsetX: number) {
    if (viewport.width <= 0) return;
    const next = Math.max(0, Math.min(slides.length - 1, Math.round(offsetX / viewport.width)));
    setIndex((current) => (current === next ? current : next));
  }

  function goTo(next: number) {
    if (viewport.width <= 0) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    setIndex(clamped);
    listRef.current?.scrollToOffset({ offset: clamped * viewport.width, animated: true });
  }

  function finish(then: () => void) {
    if (leaving.current) return;
    leaving.current = true;
    AsyncStorage.setItem("propertyhub.onboarded", "1").catch(() => undefined).finally(then);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    sync(event.nativeEvent.contentOffset.x);
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <View style={styles.pager} collapsable={false} onLayout={onBodyLayout}>
        {viewport.width > 0 && viewport.height > 0 ? (
          <FlatList
            ref={listRef}
            data={slides}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            bounces={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            scrollEventThrottle={16}
            initialNumToRender={slides.length}
            windowSize={3}
            getItemLayout={(_, itemIndex) => ({
              length: viewport.width,
              offset: viewport.width * itemIndex,
              index: itemIndex,
            })}
            onScroll={onScroll}
            renderItem={({ item }) => <OnboardingPage slide={item} width={viewport.width} height={viewport.height} />}
            style={{ width: viewport.width, height: viewport.height }}
          />
        ) : null}
      </View>
      <View style={[styles.footer, { paddingHorizontal: frame.padH, paddingBottom: Math.max(insets.bottom + 8, 14) }]}>
        <OnboardingPagination count={slides.length} index={index} onSelect={goTo} />
        <View style={{ height: frame.tight ? 10 : 14 }} />
        <OnboardingButton
          label={last ? t.onboarding.getStarted : t.onboarding.next}
          variant="primary"
          accessibilityLabel={last ? t.onboarding.getStarted : t.onboarding.next}
          onPress={() => {
            if (last) {
              finish(onNext);
              return;
            }
            goTo(index + 1);
          }}
        />
        <View style={{ height: frame.tight ? 8 : 10 }} />
        <OnboardingButton
          label={t.common.skip}
          variant="secondary"
          accessibilityLabel={t.common.skip}
          onPress={() => finish(onSkip)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  pager: {
    flex: 1,
    overflow: "hidden",
  },
  footer: {
    flexShrink: 0,
    paddingTop: 8,
    backgroundColor: palette.background,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dotHit: {
    width: 28,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dotHitActive: {
    width: 40,
  },
  dot: {
    height: 8,
    borderRadius: 8,
  },
  dotActive: {
    width: 22,
    backgroundColor: palette.green,
  },
  dotIdle: {
    width: 8,
    backgroundColor: palette.dot,
  },
  button: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonPrimary: {
    backgroundColor: palette.green,
    shadowColor: palette.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  buttonPrimaryPressed: {
    backgroundColor: palette.greenPressed,
  },
  buttonSecondary: {
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  buttonSecondaryPressed: {
    backgroundColor: palette.chipPressed,
  },
  buttonText: {
    fontWeight: "700",
  },
  buttonTextPrimary: {
    color: palette.white,
  },
  buttonTextSecondary: {
    color: palette.green,
  },
  chip: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: palette.green,
    borderColor: palette.green,
  },
  chipIdle: {
    backgroundColor: palette.white,
    borderColor: palette.border,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  chipPressed: {
    backgroundColor: palette.chipPressed,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  chipTextIcon: {
    marginLeft: 6,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feature: {
    flex: 1,
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  featureLabel: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: palette.ink,
  },
  featureLabelShort: {
    marginTop: 6,
    fontSize: 14,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 5,
  },
  previewBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  previewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewTitle: {
    flex: 1,
    fontWeight: "700",
    color: palette.ink,
  },
  heart: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  price: {
    marginTop: 1,
    color: palette.green,
    fontWeight: "800",
    fontSize: 15,
  },
  priceShort: {
    fontSize: 13,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 2,
  },
  location: {
    flex: 1,
    color: palette.muted,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 10,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 1,
  },
  metaText: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "500",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  placeholder: {
    flex: 1,
    marginLeft: 8,
    color: palette.muted,
    fontSize: 14,
  },
  placeholderShort: {
    fontSize: 13,
  },
  circle: {
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  visual: {
    flex: 1,
  },
  visualOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  heroClip: {
    overflow: "hidden",
  },
  fade: {
    position: "absolute",
  },
});
