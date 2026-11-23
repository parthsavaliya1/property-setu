import type { ComponentProps, ComponentRef } from "react";
import { SafetyActions } from "../components/SafetyActions";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Animated, Dimensions, FlatList, Image, Linking, Modal, PanResponder, Platform, Pressable, RefreshControl, ScrollView, Share, Text, useWindowDimensions, View } from "react-native";
import { KeyboardScreen } from "../components/keyboard";
import { VoiceTextInput } from "../components/VoiceField";
import { PropertyGridCard, PropertyListCard, PropertyListSkeleton } from "../components/PropertyGridCard";
import { PropertyVideoCard } from "../components/PropertyVideoCard";
import { PropertyMap } from "../components/PropertyMap";
import { DetailSkeleton, EmptyState, PageHeader, PropertyGridSkeleton, SkeletonBlock, styles } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { getCopy } from "../i18n/active";
import { fill } from "../i18n/format";
import { amenityName } from "../i18n/labels";
import { useFavorites } from "../context/FavoritesContext";
import { api, cityName, inr, listingLabel, PROPERTY_PAGE_SIZE, sortForSearch, type SavedSearch } from "../lib/api";
import { placeSalePins } from "../lib/mapPins";
import { nearScrollEnd, usePagedProperties } from "../lib/paging";
import { useBrowseCity } from "../lib/location";
import { useRequireLogin } from "../context/LoginGate";
import { buttonShadow, cardShadow, colors } from "../theme";
import { deviceType } from "../lib/supabase";
import { homeCategorySlugs } from "../lib/propertyCategories";
import type { PropertyCard, PropertyDetail } from "../types/database";

const BANNER_HEIGHT = 142;
const fallbackBanner = require("../../assets/dream-home-banner.jpg");
type BannerSlide = { id: string; image_url?: string; local?: boolean };

function HomeBanner({ onPress }: { onPress: () => void }) {
  const { width } = useWindowDimensions();
  const { t } = useI18n();
  const frameWidth = Math.max(0, width - 40);
  const listRef = useRef<FlatList<BannerSlide>>(null);
  const indexRef = useRef(0);
  const [uploads, setUploads] = useState<BannerSlide[]>([]);
  const slides = useMemo(() => [{ id: "static", local: true } as BannerSlide, ...uploads], [uploads]);

  const load = useCallback(() => {
    let active = true;
    api.banners().then((rows) => {
      if (!active) return;
      setUploads(rows.filter((row) => row.image_url).map((row) => ({ id: row.id, image_url: row.image_url })));
    }).catch(() => {
      if (active) setUploads([]);
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(load);

  useEffect(() => {
    if (slides.length < 2 || frameWidth <= 0) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % slides.length;
      indexRef.current = next;
      listRef.current?.scrollToOffset({ offset: next * frameWidth, animated: true });
    }, 10000);
    return () => clearInterval(timer);
  }, [slides.length, frameWidth]);

  function showIndex(next: number) {
    const safe = Math.min(Math.max(next, 0), slides.length - 1);
    indexRef.current = safe;
  }

  return (
    <View style={{ marginHorizontal: 20, marginTop: 20, width: frameWidth, height: BANNER_HEIGHT, borderRadius: 20, overflow: "hidden", backgroundColor: colors.secondary }}>
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        bounces={false}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, itemIndex) => ({ length: frameWidth, offset: frameWidth * itemIndex, index: itemIndex })}
        onMomentumScrollEnd={(event) => showIndex(Math.round(event.nativeEvent.contentOffset.x / frameWidth))}
        renderItem={({ item }) => (
          <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t.home.dream} style={{ width: frameWidth, height: BANNER_HEIGHT }}>
            {item.local ? <>
              <Image source={fallbackBanner} style={{ width: frameWidth, height: BANNER_HEIGHT }} resizeMode="cover" />
              <LinearGradient pointerEvents="none" colors={[colors.primaryDark, `${colors.primaryDark}B3`, `${colors.primaryDark}00`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
              <View style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: "54%", justifyContent: "center" }}>
                <Text numberOfLines={3} style={{ color: colors.white, fontSize: 24, lineHeight: 26, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontWeight: "500" }}>{t.home.chapter}</Text>

                <View style={{ alignSelf: "flex-start", marginTop: 8, backgroundColor: colors.highlight, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 5 }}>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>{t.home.explore} →</Text>
                </View>
              </View>
            </> : <Image source={{ uri: item.image_url }} style={{ width: frameWidth, height: BANNER_HEIGHT }} resizeMode="cover" />}
          </Pressable>
        )}
      />
    </View>
  );
}

function chipText(query: string) {
  const text = getCopy();
  if (!query) return text.kinds.all;
  if (query === "listing_type=sale") return text.home.buy;
  if (query === "listing_type=rent") return text.home.rent;
  if (query === "category=residential-plot" || query === "category=commercial-plot") return text.kinds.plot;
  if (query === "category=commercial") return text.home.commercial;
  if (query === "category=office") return text.kinds.office;
  if (query === "category=warehouse") return text.kinds.warehouse;
  if (query === "category=agricultural-land") return text.kinds.land;
  if (query === "category=house") return text.kinds.house;
  if (query === "category=apartment") return text.kinds.apartment;
  if (query === "category=villa") return text.kinds.villa;
  if (query === "category=shop") return text.kinds.shop;
  return query;
}

function Card({ item, onPress }: { item: PropertyCard; onPress: () => void }) {
  const { t } = useI18n();
  const place = [item.locality, item.city].filter(Boolean).join(", ") || t.common.locationMissing;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: 140 }} resizeMode="cover" /> : <View style={{ height: 120, backgroundColor: colors.secondary }} />}
      <View style={styles.cardBody}>
        <Text style={styles.price}>{inr(item.price)}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{place}</Text>
        <Text style={styles.meta}>{item.bedrooms ?? "—"} {t.search.beds} · {item.bathrooms ?? "—"} {t.search.baths} · {item.area ? `${item.area} ${item.area_unit}` : listingLabel(item.listing_type)}</Text>
      </View>
    </Pressable>
  );
}

const typeChips = [
  { label: "All", query: "" },
  { label: "Buy", query: "listing_type=sale" },
  { label: "Rent", query: "listing_type=rent" },
  { label: "Plot", query: "category=residential-plot" },
  { label: "Land", query: "category=agricultural-land" },
];

const kindChips = [
  { label: "House", query: "category=house" },
  { label: "Apartment", query: "category=apartment" },
  { label: "Villa", query: "category=villa" },
  { label: "Shop", query: "category=shop" },
];

const homeCategoryIcons: Record<string, ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
  house: "home-outline", apartment: "office-building-outline", villa: "home-outline",
  "residential-plot": "map-marker-outline", "agricultural-land": "sprout-outline",
  shop: "storefront-outline", office: "office-building-outline", "commercial-plot": "map-marker-outline", warehouse: "warehouse",
};

function LocationPrompt({ denied, canAskAgain, onAllow }: { denied: boolean; canAskAgain: boolean; onAllow: () => void }) {
  const { t } = useI18n();
  if (!denied) return null;
  return (
    <Pressable onPress={onAllow} style={{ marginTop: 12, borderRadius: 14, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name="location-outline" size={20} color={colors.primaryDark} />
      <Text style={{ flex: 1, color: colors.ink, fontSize: 13, lineHeight: 18 }}>{t.home.locationAsk}</Text>
      <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>{canAskAgain ? t.common.allow : t.common.settings}</Text>
    </Pressable>
  );
}

function shuffleList<T>(list: T[]) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap] as T;
    copy[swap] = current as T;
  }
  return copy;
}

export function HomeScreen({
  onOpen,
  onSearch,
  onNotify,
  onWallet,
  onOpenMenu,
  onApplyFilters,
}: {
  onOpen: (id: string) => void;
  onSearch: (query: string) => void;
  onNotify?: () => void;
  onWallet?: () => void;
  onOpenMenu: () => void;
  onOffers: () => void;
  onApplyFilters: (request: SearchFilterRequest) => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { me, token } = useAuth();
  const { isSaved, toggle } = useFavorites();
  const requireLogin = useRequireLogin();
  const [query, setQuery] = useState("");
  const [unread, setUnread] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - 20 * 2 - 12) / 2;
  const subcategoryTabWidth = (screenWidth - 40 - 12) / 3;
  const premiumCardWidth = screenWidth - 40;
  const [premiumIndex, setPremiumIndex] = useState(0);
  const [homeFiltersOpen, setHomeFiltersOpen] = useState(false);
  const [homeFilters, setHomeFilters] = useState<SearchFilters>({ ...emptySearchFilters });
  const [homeIntent, setHomeIntent] = useState("sale");
  const [homeCategory, setHomeCategory] = useState("");
  const premiumScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  function selectHomeIntent(intent: string) {
    setHomeIntent(intent);
    if (intent === "commercial" || homeIntent === "commercial") setHomeCategory("");
    setPremiumIndex(0);
    premiumScrollRef.current?.scrollTo({ x: 0, animated: false });
  }

  function selectHomeCategory(category: string) {
    setHomeCategory(category);
    setPremiumIndex(0);
    premiumScrollRef.current?.scrollTo({ x: 0, animated: false });
  }

  const profileCity = cityName(me?.profile?.city);
  const { city, ready, denied, canAskAgain, retry } = useBrowseCity(profileCity);

  const loadTier = useCallback((tier: "premium" | "standard", offset: number) => {
    const params = new URLSearchParams({
      limit: String(PROPERTY_PAGE_SIZE),
      offset: String(offset),
      listing_tier: tier,
    });
    if (city) params.set("prefer_city", city);
    if (homeIntent === "sale" || homeIntent === "rent") params.set("listing_type", homeIntent);
    const selectedCategory = homeCategory || (homeIntent === "commercial" ? "commercial" : "");
    if (selectedCategory) params.set("category", selectedCategory);
    return api.properties(`?${params}`, token);
  }, [city, token, homeIntent, homeCategory]);

  const premiumPage = usePagedProperties(
    (offset) => loadTier("premium", offset),
    `${city}|${token || ""}|${homeIntent}|${homeCategory}|premium`,
    true,
    (rows, mode) => (mode === "more" ? rows : shuffleList(rows)),
  );
  const simplePage = usePagedProperties(
    (offset) => loadTier("standard", offset),
    `${city}|${token || ""}|${homeIntent}|${homeCategory}|standard`,
    true,
    (rows, mode) => (mode === "more" ? rows : shuffleList(rows)),
  );
  const loading = (premiumPage.loading || simplePage.loading) && premiumPage.items.length === 0 && simplePage.items.length === 0;
  const refreshing = premiumPage.refreshing || simplePage.refreshing;
  const error = premiumPage.error || simplePage.error;

  useFocusEffect(useCallback(() => {
    setQuery("");
    if (!token) {
      setUnread(0);
      return;
    }
    let active = true;
    api.notifications(token).then((rows) => {
      if (active) setUnread(rows.filter((row) => !row.is_read).length);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [token]));

  function openNotifications() {
    if (!token) {
      requireLogin("Sign in to see notifications.");
      return;
    }
    onNotify?.();
  }

  function openWallet() {
    if (!token) {
      requireLogin("Sign in to open your wallet.");
      return;
    }
    onWallet?.();
  }

  async function toggleSaved(item: PropertyCard) {
    if (!token) {
      requireLogin(getCopy().gate.saveProperty);
      return;
    }
    await toggle(item);
  }

  const premiumItems = premiumPage.items;
  const simpleItems = simplePage.items;
  const page = colors.page;

  const activePremiumIndex = Math.min(premiumIndex, Math.max(0, premiumItems.length - 1));
  const premiumDotStart = Math.max(0, Math.min(activePremiumIndex - 2, premiumItems.length - 5));

  function propertyCard(item: PropertyCard, width: number, fullWidth = false) {
    return (
      <PropertyGridCard
        key={item.id}
        item={item}
        width={width}
        borderRadius={18}
        home
        fullWidth={fullWidth}
        photoOverlay={fullWidth && premiumItems.length > 1 ? (
          <View pointerEvents="none" accessibilityLabel={`${activePremiumIndex + 1} / ${premiumItems.length}`} style={{ position: "absolute", bottom: 6, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 5 }}>
            {premiumItems.slice(premiumDotStart, premiumDotStart + 5).map((property, index) => <View key={property.id} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, opacity: premiumDotStart + index === activePremiumIndex ? 1 : 0.5 }} />)}
          </View>
        ) : undefined}
        saved={isSaved(item.id, item.is_favorite)}
        onPress={() => onOpen(item.slug || item.id)}
        onSave={() => toggleSaved(item)}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: page }}>
    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: page }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Pressable onPress={onOpenMenu} accessibilityRole="button" accessibilityLabel="Property Setu menu" hitSlop={8} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Image source={require("../../assets/logo-mark.png")} resizeMode="contain" accessible={false} style={{ width: 38, height: 38 }} />
          <View style={{ height: 24, width: 1, backgroundColor: colors.primaryDark }} />
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, fontSize: 17, fontWeight: "800", color: colors.ink }}>Property Setu</Text>
        </Pressable>
        <View style={{ maxWidth: screenWidth < 380 ? 82 : 108, flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 20, backgroundColor: colors.secondary, paddingHorizontal: 8, paddingVertical: 7 }}>
          <Ionicons name="location" size={14} color={colors.primary} />
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 11, fontWeight: "700", color: colors.ink }}>{city || (ready ? t.home.allProperties : t.home.findingCity)}</Text>
        </View>
        <Pressable onPress={openNotifications} accessibilityRole="button" accessibilityLabel={t.menu.notifications} hitSlop={4} style={{ width: 36, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="notifications-outline" size={24} color={colors.ink} />
          {unread > 0 ? <View style={{ position: "absolute", top: 3, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}><Text style={{ color: colors.white, fontSize: 9, fontWeight: "800" }}>{unread > 99 ? "99+" : unread}</Text></View> : null}
        </Pressable>
        <Pressable onPress={openWallet} accessibilityRole="button" accessibilityLabel={t.account.wallet} hitSlop={4} style={{ width: 36, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="wallet-outline" size={24} color={colors.ink} />
        </Pressable>
      </View>
    </View>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(event) => { if (nearScrollEnd(event)) simplePage.loadMore(); }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { premiumPage.refresh(); simplePage.refresh(); }} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <View style={{ marginHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, minHeight: 52, borderWidth: 1, borderColor: colors.line }}>
          <Ionicons name="search-outline" size={22} color={colors.primaryDark} />
          <VoiceTextInput value={query} onChangeText={setQuery} onSubmitEditing={() => { const next = query; setQuery(""); onSearch(next || "all"); }} placeholder={t.home.localityPlaceholder} placeholderTextColor={colors.muted} style={{ flex: 1, marginLeft: 8, color: colors.ink, fontSize: 13, paddingVertical: 10 }} />
        </View>
        <Pressable onPress={() => {
          setHomeFilters((current) => ({ ...current, listing: homeIntent === "sale" || homeIntent === "rent" ? homeIntent : "", category: homeCategory || (homeIntent === "commercial" ? "commercial" : ""), propertyType: homeCategory }));
          setHomeFiltersOpen(true);
        }} accessibilityRole="button" accessibilityLabel={t.search.filters} accessibilityState={{ expanded: homeFiltersOpen }} style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.primaryDark, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="options-outline" size={26} color={colors.white} />
        </Pressable>
      </View>
      <View style={{ marginHorizontal: 20, flexDirection: "row", backgroundColor: colors.secondary, borderRadius: 13, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
        {[
          { label: t.home.buy, value: "sale" },
          { label: t.home.rent, value: "rent" },
          { label: t.home.commercial, value: "commercial" },
        ].map((item) => {
          const active = homeIntent === item.value;
          return (
            <Pressable key={item.value} onPress={() => selectHomeIntent(item.value)} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: active }} style={{ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", backgroundColor: active ? colors.primaryDark : undefined, borderRadius: 12, paddingHorizontal: 4 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 14, fontWeight: active ? "700" : "500", color: active ? colors.white : colors.ink }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ marginHorizontal: 20, marginTop: 10, paddingVertical: 6, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {[
          { label: t.kinds.all, value: "", icon: null },
          ...homeCategorySlugs(homeIntent === "commercial").map(value => ({ label: chipText(`category=${value}`), value, icon: homeCategoryIcons[value] })),
        ].map((item) => {
          const active = homeCategory === item.value;
          return (
            <Pressable key={item.value || "all"} onPress={() => selectHomeCategory(item.value)} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: active }} hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }} style={{ width: subcategoryTabWidth, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 32, borderRadius: 8, borderWidth: 1, borderColor: active ? colors.primaryDark : colors.line, backgroundColor: active ? colors.primaryDark : undefined, paddingHorizontal: 6 }}>
              {item.icon ? <MaterialCommunityIcons name={item.icon} size={16} color={active ? colors.white : colors.primaryDark} /> : null}
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flexShrink: 1, color: active ? colors.white : colors.ink, fontWeight: active ? "700" : "500", fontSize: 12 }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ marginHorizontal: 20 }}><LocationPrompt denied={denied} canAskAgain={canAskAgain} onAllow={retry} /></View>
      <HomeBanner onPress={() => onSearch("all")} />
      {error ? <Text style={[styles.error, { margin: 16 }]}>{error}</Text> : null}
      {loading ? <View style={{ width: "100%", paddingHorizontal: 20, marginTop: 24 }}><PropertyGridSkeleton width={cardWidth} borderRadius={18} /></View> : null}
      {!loading && premiumItems.length > 0 ? (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 20, marginTop: 28, marginBottom: 12 }}>
            <Text style={{ flex: 1, fontSize: screenWidth < 380 ? 19 : 21, fontWeight: "800", color: colors.ink }}>{t.home.premium}</Text>
            <Pressable onPress={() => onApplyFilters({
              q: "",
              filters: { ...emptySearchFilters, listing: homeIntent === "sale" || homeIntent === "rent" ? homeIntent : "", category: homeCategory || (homeIntent === "commercial" ? "commercial" : "") },
              tier: "premium",
            })} accessibilityRole="button" accessibilityLabel={t.home.premium} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 }}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>{t.home.seeAll}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            </Pressable>
          </View>
          <ScrollView ref={premiumScrollRef} horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} snapToInterval={premiumCardWidth + 12} snapToAlignment="start" decelerationRate="fast" style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} scrollEventThrottle={16} onScroll={(event) => { const index = Math.max(0, Math.round(event.nativeEvent.contentOffset.x / (premiumCardWidth + 12))); setPremiumIndex(index); if (nearScrollEnd(event, "x")) premiumPage.loadMore(); }}>
            {premiumItems.map((item) => propertyCard(item, premiumCardWidth, true))}
            {premiumPage.loadingMore ? <ActivityIndicator color={colors.primary} style={{ alignSelf: "center", width: 36 }} /> : null}
          </ScrollView>
        </>
      ) : null}
      {!loading ? (
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 20, marginTop: 28, marginBottom: 12 }}>
        <Text style={{ fontSize: 21, fontWeight: "800", color: colors.ink }}>{t.home.simple}</Text>
        <Pressable onPress={() => onSearch("all")}><Text style={{ color: colors.primary, fontWeight: "700" }}>{t.home.seeAll}</Text></Pressable>
      </View>
      ) : null}
      {!loading && !error && simpleItems.length === 0 && premiumItems.length === 0 ? <EmptyState kind="active" /> : null}
      {!loading && simpleItems.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 12 }}>
          {simpleItems.map((item) => propertyCard(item, cardWidth))}
        </View>
      ) : null}
      {simplePage.loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} /> : null}
    </ScrollView>
    <SearchFiltersSheet
      visible={homeFiltersOpen}
      value={homeFilters}
      onChange={setHomeFilters}
      onClose={() => setHomeFiltersOpen(false)}
      onApply={() => {
        setHomeFiltersOpen(false);
        onApplyFilters({ q: query.trim(), filters: { ...homeFilters } });
      }}
    />
    </View>
  );
}

export type SearchFilters = {
  listing: string;
  category: string;
  propertyType: string;
  price: string;
  bedrooms: string;
  withPhotos: boolean;
  withParking: boolean;
  sort: string;
};

export type SearchFilterRequest = { q: string; filters: SearchFilters; tier?: "premium" | "standard" };

const emptySearchFilters: SearchFilters = {
  listing: "", category: "", propertyType: "", price: "", bedrooms: "", withPhotos: false, withParking: false, sort: "newest",
};

function SearchFiltersSheet({ visible, value, onChange, onClose, onApply, onClear }: {
  visible: boolean;
  value: SearchFilters;
  onChange: (value: SearchFilters) => void;
  onClose: () => void;
  onApply: () => void;
  onClear?: () => void;
}) {
  const { t } = useI18n();
  const { listing, category, propertyType, price, bedrooms, withPhotos, withParking, sort } = value;
  const setPropertyType = (next: string) => onChange({ ...value, propertyType: next });
  const setPrice = (next: string) => onChange({ ...value, price: next });
  const setBedrooms = (next: string) => onChange({ ...value, bedrooms: next });
  const setWithPhotos = (next: boolean | ((current: boolean) => boolean)) => onChange({ ...value, withPhotos: typeof next === "function" ? next(withPhotos) : next });
  const setWithParking = (next: boolean) => onChange({ ...value, withParking: next });
  const setSort = (next: string) => onChange({ ...value, sort: next });
  const clearFilters = () => { onChange({ ...emptySearchFilters }); onClear?.(); };
  function selectTab(query: string) {
    const next = { ...value, listing: "", category: "", propertyType: "" };
    if (query.startsWith("listing_type=")) next.listing = query.slice("listing_type=".length);
    else if (query.startsWith("category=")) next.category = query.slice("category=".length);
    onChange(next);
  }
  const tabActive = (query: string) => !query ? !listing && !category : query === `listing_type=${listing}` || (query.startsWith("category=") && query.slice("category=".length) === category && !listing);
  return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <View style={{ maxHeight: "82%", backgroundColor: colors.page, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.ink }}>{t.search.filters}</Text>
              <Pressable onPress={clearFilters} hitSlop={8}><Text style={{ color: colors.primary, fontWeight: "700" }}>{t.common.clear}</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 24 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{t.search.lookingFor}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {typeChips.map((chip) => (
                    <LeVechChip key={chip.query || "all"} label={chipText(chip.query)} active={tabActive(chip.query)} onPress={() => selectTab(chip.query)} />
                  ))}
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{t.search.type}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[{ id: "", label: t.search.anyType }, ...propertyTypes.map((option) => ({ ...option, label: chipText(`category=${option.id}`) }))].map((option) => (
                    <LeVechChip key={option.id || "type"} label={option.label} active={propertyType === option.id} onPress={() => setPropertyType(option.id)} />
                  ))}
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{t.search.price}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[{ id: "", label: t.search.anyPrice }, ...priceRanges.map((option) => ({ ...option, label: option.id === "under25" ? t.search.under25 : option.id === "25to50" ? t.search.range25 : option.id === "50to1cr" ? t.search.range50 : t.search.above1 }))].map((option) => (
                    <LeVechChip key={option.id || "price"} label={option.label} active={price === option.id} onPress={() => setPrice(option.id)} />
                  ))}
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{t.search.bhk}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[{ id: "", label: t.search.any }, { id: "1", label: t.search.bhk1 }, { id: "2", label: t.search.bhk2 }, { id: "3", label: t.search.bhk3 }, { id: "4", label: t.search.bhk4 }].map((option) => (
                    <LeVechChip key={option.id || "beds"} label={option.label} active={bedrooms === option.id} onPress={() => setBedrooms(option.id)} />
                  ))}
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{t.search.more}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <LeVechChip label={t.search.photos} active={withPhotos} onPress={() => setWithPhotos((value) => !value)} />
                  <LeVechChip label={t.details.parking} active={withParking} onPress={() => setWithParking(!withParking)} />
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{t.search.sort}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[{ id: "newest", label: t.search.newest }, { id: "low", label: t.search.priceLow }, { id: "high", label: t.search.priceHigh }].map((option) => (
                    <LeVechChip key={option.id} label={option.label} active={sort === option.id} onPress={() => setSort(option.id)} />
                  ))}
                </View>
              </View>
            </ScrollView>
            <Pressable onPress={onApply} style={({ pressed }) => ({ marginHorizontal: 20, marginTop: 4, backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", ...buttonShadow })}>
              <Text style={{ color: colors.white, fontWeight: "700" }}>{t.search.show}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
  );
}

const RECENT_SEARCH_KEY = "propertyhub.recentSearches";

function searchSignature(item: Pick<SavedSearch, "q" | "city" | "listing_type" | "category_slug" | "min_price" | "max_price" | "bedrooms">) {
  return [
    item.q || "",
    item.city || "",
    item.listing_type || "",
    item.category_slug || "",
    item.min_price ?? "",
    item.max_price ?? "",
    item.bedrooms ?? "",
  ].join("|").toLowerCase();
}

async function readLocalSearches() {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCH_KEY);
    const parsed = raw ? JSON.parse(raw) as SavedSearch[] : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalSearches(items: SavedSearch[]) {
  await AsyncStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(items.slice(0, 8)));
}

export function SearchScreen({ initialQuery, filterRequest, onOpen }: { initialQuery?: string; filterRequest?: SearchFilterRequest; onOpen: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { me, token } = useAuth();
  const { isSaved, toggle } = useFavorites();
  const requireLogin = useRequireLogin();
  const profileCity = cityName(me?.profile?.city);
  const { city: nearCity, denied, canAskAgain, retry } = useBrowseCity(profileCity);
  const [listingTier, setListingTier] = useState<"" | "premium" | "standard">(filterRequest?.tier || "");
  const [q, setQ] = useState("");
  const [listing, setListing] = useState("");
  const [category, setCategory] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [withPhotos, setWithPhotos] = useState(false);
  const [withParking, setWithParking] = useState(false);
  const [sort, setSort] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedCity, setSavedCity] = useState("");
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef(savedSearches);
  savedRef.current = savedSearches;
  const loadSearchPage = useCallback((offset: number) => {
    const params = new URLSearchParams({
      limit: String(PROPERTY_PAGE_SIZE),
      offset: String(offset),
    });
    if (q.trim()) params.set("q", q.trim());
    if (listingTier) params.set("listing_tier", listingTier);
    if (listing) params.set("listing_type", listing);
    if (withParking) params.set("parking", "true");
    const activeCategory = propertyType || category;
    if (activeCategory) params.set("category", activeCategory);
    const range = priceRanges.find((item) => item.id === price);
    if (range?.min != null) params.set("min_price", String(range.min));
    if (range?.max != null) params.set("max_price", String(range.max));
    if (bedrooms) params.set("bedrooms", bedrooms === "4" ? "4" : bedrooms);
    const city = savedCity || nearCity;
    if (city) {
      params.set("prefer_city", city);
      params.set("city_first", "true");
    }
    return api.properties(`?${params.toString()}`, token);
  }, [bedrooms, category, listing, nearCity, price, propertyType, q, savedCity, token, withParking, listingTier]);

  const searchPage = usePagedProperties(
    loadSearchPage,
    `${listingTier}|${q}|${listing}|${category}|${propertyType}|${price}|${bedrooms}|${withParking}|${savedCity || nearCity}|${token || ""}`,
  );
  const { items, loading, refreshing, error } = searchPage;

  useEffect(() => {
    let active = true;
    if (!token) {
      readLocalSearches().then((rows) => {
        if (active) setSavedSearches(rows);
      });
      return () => {
        active = false;
      };
    }
    readLocalSearches().then(async (local) => {
      for (const item of local) {
        const listingType = item.listing_type === "sale" || item.listing_type === "rent" || item.listing_type === "lease" || item.listing_type === "pg" ? item.listing_type : undefined;
        try {
          await api.createSavedSearch({
            name: item.name,
            q: item.q || undefined,
            city: item.city || undefined,
            listing_type: listingType,
            category_slug: item.category_slug || undefined,
            min_price: item.min_price == null || item.min_price === "" ? undefined : Number(item.min_price),
            max_price: item.max_price == null || item.max_price === "" ? undefined : Number(item.max_price),
            bedrooms: item.bedrooms == null || item.bedrooms === "" ? undefined : Number(item.bedrooms),
          }, token);
        } catch {
          /* keep going with the searches already on the account */
        }
      }
      if (local.length) await writeLocalSearches([]).catch(() => undefined);
      return api.savedSearches(token);
    }).then((rows) => {
      if (active) setSavedSearches(rows);
    }).catch(() => {
      if (active) setSavedSearches([]);
    });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!initialQuery || initialQuery === "all") return;
    if (initialQuery.startsWith("listing_type=")) {
      setListing(initialQuery.slice("listing_type=".length));
      setCategory("");
      setPropertyType("");
    } else if (initialQuery.startsWith("category=")) {
      const value = initialQuery.slice("category=".length);
      setCategory(value);
      setListing("");
      setPropertyType(value);
    } else {
      setQ(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    setListingTier(filterRequest?.tier || "");
    if (!filterRequest) return;
    setQ(filterRequest.q);
    setSavedCity("");
    setListing(filterRequest.filters.listing);
    setCategory(filterRequest.filters.category);
    setPropertyType(filterRequest.filters.propertyType);
    setPrice(filterRequest.filters.price);
    setBedrooms(filterRequest.filters.bedrooms);
    setWithPhotos(filterRequest.filters.withPhotos);
    setWithParking(filterRequest.filters.withParking);
    setSort(filterRequest.filters.sort);
    setFiltersOpen(false);
    setSearchOpen(false);
  }, [filterRequest]);

  const shown = sortForSearch(
    [...items]
      .filter((item) => !withPhotos || Boolean(item.cover_image)),
    savedCity || nearCity || q,
    sort,
  );

  async function toggleSaved(item: PropertyCard) {
    if (!token) {
      requireLogin(getCopy().gate.saveProperty);
      return;
    }
    await toggle(item);
  }

  function selectTab(query: string) {
    if (!query) {
      setListing("");
      setCategory("");
      setPropertyType("");
      return;
    }
    if (query.startsWith("listing_type=")) {
      setListing(query.slice("listing_type=".length));
      setCategory("");
      setPropertyType("");
    } else if (query.startsWith("category=")) {
      const value = query.slice("category=".length);
      setCategory(value);
      setListing("");
      setPropertyType("");
    }
  }

  const tabActive = (query: string) => {
    if (!query) return !listing && !category;
    return query === `listing_type=${listing}` || (query.startsWith("category=") && query.slice("category=".length) === category && !listing);
  };
  const filterCount = [listing || category, propertyType, price, bedrooms, withPhotos, withParking, listingTier, sort !== "newest"].filter(Boolean).length;

  function priceChoice(min?: number | string | null, max?: number | string | null) {
    const low = min == null || min === "" ? null : Number(min);
    const high = max == null || max === "" ? null : Number(max);
    return priceRanges.find((item) => (item.min ?? null) === low && (item.max ?? null) === high)?.id ?? "";
  }

  function applySaved(item: SavedSearch) {
    setListingTier("");
    setQ(item.q || "");
    setListing(item.listing_type || "");
    setCategory(item.category_slug || "");
    setPropertyType(item.category_slug || "");
    setPrice(priceChoice(item.min_price, item.max_price));
    setBedrooms(item.bedrooms != null && String(item.bedrooms) !== "" ? String(item.bedrooms) : "");
    setSavedCity(item.city || "");
  }

  useEffect(() => {
    const text = q.trim();
    const hasFilter = Boolean(listing || propertyType || category || price || bedrooms);
    if (text.length < 2 && !hasFilter) return;
    const timer = setTimeout(() => {
      void rememberSearch();
    }, 700);
    return () => clearTimeout(timer);
  }, [q, listing, category, propertyType, price, bedrooms, savedCity, token]);

  async function rememberSearch() {
    const text = q.trim();
    const hasFilter = Boolean(listing || propertyType || category || price || bedrooms);
    if (text.length < 2 && !hasFilter) return;
    const range = priceRanges.find((item) => item.id === price);
    const listingType = listing === "sale" || listing === "rent" || listing === "lease" || listing === "pg" ? listing : undefined;
    const name = [text, listingType, propertyType || category, bedrooms ? `${bedrooms} BHK` : ""].filter(Boolean).join(" · ") || t.search.recent;
    const next: SavedSearch = {
      id: `local-${Date.now()}`,
      name: name.slice(0, 80),
      q: text || null,
      city: savedCity || null,
      listing_type: listingType || null,
      category_slug: (propertyType || category) || null,
      min_price: range?.min ?? null,
      max_price: range?.max ?? null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
    };
    const signature = searchSignature(next);
    const withoutMatch = savedRef.current.filter((item) => searchSignature(item) !== signature);
    if (token) {
      try {
        const created = await api.createSavedSearch({
          name: next.name,
          q: text || undefined,
          city: savedCity || undefined,
          listing_type: listingType,
          category_slug: next.category_slug || undefined,
          min_price: range?.min,
          max_price: range?.max,
          bedrooms: bedrooms ? Number(bedrooms) : undefined,
        }, token);
        setSavedSearches([created, ...withoutMatch.filter((item) => item.id !== created.id)].slice(0, 8));
        return;
      } catch {
        /* keep a copy on this phone if the account save does not go through */
      }
    }
    const stored = [next, ...withoutMatch].slice(0, 8);
    setSavedSearches(stored);
    await writeLocalSearches(stored).catch(() => undefined);
  }

  async function removeSaved(id: string) {
    const next = savedRef.current.filter((item) => item.id !== id);
    setSavedSearches(next);
    if (!token || id.startsWith("local-")) {
      await writeLocalSearches(next).catch(() => undefined);
      return;
    }
    try {
      await api.deleteSavedSearch(id, token);
    } catch {
      api.savedSearches(token).then(setSavedSearches).catch(() => undefined);
    }
  }

  function openSearchList() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setSearchOpen(true);
  }

  function closeSearchList() {
    blurTimer.current = setTimeout(() => setSearchOpen(false), 220);
  }


  return (
    <KeyboardScreen style={{ backgroundColor: colors.page }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: colors.page, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink }}>{t.search.title}</Text>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, minHeight: 52, borderWidth: 1, borderColor: colors.line }}>
            <Ionicons name="search" size={18} color={colors.faint} />
            <VoiceTextInput value={q} onChangeText={setQ} onFocus={openSearchList} onBlur={closeSearchList} onSubmitEditing={() => setSearchOpen(false)} placeholder={t.search.placeholder} placeholderTextColor={colors.faint} style={{ flex: 1, marginLeft: 8, color: colors.ink, fontSize: 15, paddingVertical: 8 }} />
            {q ? (
              <Pressable onPress={() => setQ("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.faint} />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={() => setFiltersOpen(true)} style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: filterCount ? colors.primary : colors.line, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="options-outline" size={22} color={filterCount ? colors.primary : colors.ink} />
            {filterCount ? <View style={{ position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}><Text style={{ color: colors.white, fontSize: 10, fontWeight: "800" }}>{filterCount}</Text></View> : null}
          </Pressable>
        </View>
        {searchOpen && savedSearches.length ? (
          <View style={{ marginTop: 8, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, overflow: "hidden", ...cardShadow }}>
            <Text style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, color: colors.muted, fontSize: 12, fontWeight: "700" }}>{t.search.recent}</Text>
            {savedSearches.map((item) => (
              <View key={item.id} style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.lineSoft }}>
                <Pressable onPress={() => { applySaved(item); setSearchOpen(false); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 }}>
                  <Ionicons name="time-outline" size={18} color={colors.faint} />
                  <Text numberOfLines={1} style={{ flex: 1, color: colors.ink, fontWeight: "600" }}>{item.name}</Text>
                </Pressable>
                <Pressable onPress={() => void removeSaved(item.id)} hitSlop={8} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="close" size={18} color={colors.faint} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        {listingTier ? <Pressable onPress={() => setListingTier("")} accessibilityRole="button" accessibilityLabel={`${t.common.clear}: ${listingTier === "premium" ? t.home.premium : t.home.simple}`} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.primarySoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10 }}>
          <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "700" }}>{listingTier === "premium" ? t.home.premium : t.home.simple}</Text>
          <Ionicons name="close" size={16} color={colors.primaryDark} />
        </Pressable> : null}
        <LocationPrompt denied={denied} canAskAgain={canAskAgain} onAllow={retry} />
      </View>
      {error ? <Text style={[styles.error, { marginHorizontal: 20, marginTop: 12 }]}>{error}</Text> : null}
      {!loading && !error ? <Text style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, color: colors.muted, fontSize: 13 }}>{fill(shown.length === 1 ? t.search.oneResult : t.search.manyResults, { count: shown.length })}{q.trim() ? ` • ${q.trim()}` : ""}</Text> : null}
      <FlatList
        style={{ flex: 1 }}
        data={loading ? [] : shown}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        onEndReached={() => searchPage.loadMore()}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => searchPage.refresh()} tintColor={colors.primary} colors={[colors.primary]} />}
        ListFooterComponent={searchPage.loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : undefined}
        renderItem={({ item }) => (
          <PropertyListCard
            item={item}
            saved={isSaved(item.id, item.is_favorite)}
            onPress={() => onOpen(item.slug || item.id)}
            onSave={() => toggleSaved(item)}
          />
        )}
        ListEmptyComponent={loading ? <PropertyListSkeleton /> : error ? undefined : <EmptyState kind="search" />}
      />
      <SearchFiltersSheet
        visible={filtersOpen}
        value={{ listing, category, propertyType, price, bedrooms, withPhotos, withParking, sort }}
        onChange={(next) => {
          setListing(next.listing);
          setCategory(next.category);
          setPropertyType(next.propertyType);
          setPrice(next.price);
          setBedrooms(next.bedrooms);
          setWithPhotos(next.withPhotos);
          setWithParking(next.withParking);
          setSort(next.sort);
        }}
        onClear={() => setListingTier("")}
        onClose={() => setFiltersOpen(false)}
        onApply={() => setFiltersOpen(false)}
      />
    </KeyboardScreen>
  );
}

const propertyTypes = [
  { id: "house", label: "House" },
  { id: "apartment", label: "Apartment" },
  { id: "villa", label: "Villa" },
  { id: "shop", label: "Shop" },
  { id: "office", label: "Office" },
  { id: "warehouse", label: "Warehouse" },
  { id: "commercial-plot", label: "Commercial Plot" },
];

const priceRanges = [
  { id: "under25", label: "Under ₹25L", min: undefined as number | undefined, max: 2500000 },
  { id: "25to50", label: "₹25L – ₹50L", min: 2500000, max: 5000000 },
  { id: "50to1cr", label: "₹50L – ₹1Cr", min: 5000000, max: 10000000 },
  { id: "above1cr", label: "Above ₹1Cr", min: 10000000, max: undefined as number | undefined },
];

function LeVechChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: active ? colors.primary : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.line,
      }}
    >
      <Text style={{ color: active ? colors.white : colors.muted, fontSize: 13, fontWeight: active ? "700" : "600" }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export function MapScreen({ onOpen, showBack }: { onOpen: (id: string) => void; showBack?: boolean }) {
  const { t } = useI18n();
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      const all: PropertyCard[] = [];
      const limit = 50;
      try {
        for (let offset = 0; offset < 500; offset += limit) {
          const rows = await api.properties(`?listing_type=sale&status=published&limit=${limit}&offset=${offset}`);
          all.push(...rows);
          if (rows.length < limit) break;
        }
        const placed = await placeSalePins(all.filter((item) => item.listing_type === "sale"));
        if (active) setItems(placed);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const pins = items.filter((item) => item.listing_type === "sale");
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      {showBack ? <PageHeader title={t.menu.saleMap} /> : null}
      {loading ? <View style={{ flex: 1, margin: 16 }}><SkeletonBlock fill radius={16} /></View> : <PropertyMap pins={pins} onOpen={onOpen} />}
    </View>
  );
}

function touchDistance(touches: ReadonlyArray<{ pageX: number; pageY: number }>) {
  const [a, b] = touches;
  if (!a || !b) return 0;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

function ZoomablePhoto({ uri, width, height, active, onZoomed }: { uri: string; width: number; height: number; active: boolean; onZoomed: (zoomed: boolean) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(1);
  const tx = useRef(0);
  const ty = useRef(0);
  const lastTap = useRef(0);
  const last = useRef({ scale: 1, x: 0, y: 0, distance: 0, pinching: false });

  function applyScale(next: number) {
    const value = Math.min(4, Math.max(1, next));
    scaleValue.current = value;
    scale.setValue(value);
    if (value === 1) {
      tx.current = 0;
      ty.current = 0;
      translateX.setValue(0);
      translateY.setValue(0);
    }
    onZoomed(value > 1.05);
  }

  useEffect(() => {
    if (active) return;
    applyScale(1);
  }, [active]);

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (event) => event.nativeEvent.touches.length >= 2 || scaleValue.current > 1.05,
      onPanResponderTerminationRequest: () => scaleValue.current <= 1.05,
      onPanResponderGrant: (event) => {
        const touches = event.nativeEvent.touches;
        last.current.scale = scaleValue.current;
        last.current.x = tx.current;
        last.current.y = ty.current;
        last.current.pinching = touches.length >= 2;
        last.current.distance = touchDistance(touches);
      },
      onPanResponderMove: (event, gesture) => {
        const touches = event.nativeEvent.touches;
        if (touches.length >= 2) {
          const nextDistance = touchDistance(touches);
          if (!last.current.pinching || !last.current.distance) {
            last.current.pinching = true;
            last.current.distance = nextDistance;
            last.current.scale = scaleValue.current;
            return;
          }
          applyScale(last.current.scale * (nextDistance / last.current.distance));
          return;
        }
        last.current.pinching = false;
        if (scaleValue.current <= 1.05) return;
        tx.current = last.current.x + gesture.dx;
        ty.current = last.current.y + gesture.dy;
        translateX.setValue(tx.current);
        translateY.setValue(ty.current);
      },
      onPanResponderRelease: () => {
        last.current.pinching = false;
        if (scaleValue.current <= 1.05) applyScale(1);
      },
    })
  ).current;

  function onDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      applyScale(scaleValue.current > 1.05 ? 1 : 2.5);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
  }

  return (
    <View style={{ width, height, justifyContent: "center" }} {...responder.panHandlers}>
      <Pressable onPress={onDoubleTap}>
        <Animated.Image
          source={{ uri }}
          resizeMode="contain"
          style={{ width, height: height * 0.72, transform: [{ translateX }, { translateY }, { scale }] }}
        />
      </Pressable>
    </View>
  );
}

function PhotoZoom({ photos, startIndex, onClose }: { photos: string[]; startIndex: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => pager.current?.scrollTo({ x: startIndex * width, animated: false }), 0);
    return () => clearTimeout(timer);
  }, [startIndex, width]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        >
          {photos.map((uri, photo) => (
            <ZoomablePhoto key={`${uri}-${photo}`} uri={uri} width={width} height={height} active={photo === index} onZoomed={setZoomed} />
          ))}
        </ScrollView>
        <Pressable onPress={onClose} hitSlop={8} style={{ position: "absolute", top: insets.top + 10, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="close" size={22} color="white" />
        </Pressable>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: Math.max(insets.bottom, 16), alignItems: "center", gap: 10 }}>
          {photos.length > 1 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {photos.map((_, photo) => <View key={photo} style={{ width: photo === index ? 16 : 7, height: 7, borderRadius: 4, backgroundColor: photo === index ? "white" : "rgba(255,255,255,0.45)" }} />)}
            </View>
          ) : null}
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" }}>{getCopy().search.zoomHint}</Text>
        </View>
      </View>
    </Modal>
  );
}

export function DetailsScreen({ id, onSchedule, onChat, onEdit, onInquiries, onMessages }: { id: string; onSchedule: (propertyId: string) => void; onChat: (propertyId: string) => void; onEdit: (propertyId: string) => void; onInquiries: () => void; onMessages: () => void }) {
  const { t } = useI18n();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token, session } = useAuth();
  const { isSaved, toggle } = useFavorites();
  const requireLogin = useRequireLogin();
  const [item, setItem] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"overview" | "amenities" | "location" | "documents">("overview");
  const [expanded, setExpanded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (!id) {
      setItem(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setPhotoIndex(0);
    setZoomOpen(false);
    api.property(id, token).then((row) => {
      if (active) setItem(row && typeof row === "object" && !Array.isArray(row) ? row : null);
    }).catch((err) => {
      if (active) setNote(err.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    api.view(id, deviceType(), token).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id, token]);

  function contactOwner(kind: "call" | "whatsapp") {
    if (!phone) {
      setNote(t.details.noPhone);
      return;
    }
    if (token && item && item.owner_id !== session?.user.id && item.status !== "sold" && item.status !== "rented") {
      api.inquire(item.id, {
        inquiry_type: kind,
        message: kind === "call" ? "Called about this property" : "Sent a WhatsApp message about this property",
      }, token).catch(() => undefined);
    }
    const target = kind === "call" ? `tel:${phone}` : `https://wa.me/${phone.replace(/^\+/, "")}`;
    Linking.openURL(target).catch(() => undefined);
  }

  async function chat() {
    if (!token || !item) {
      requireLogin("Sign in to chat about this property.");
      return;
    }
    if (item.status === "sold" || item.status === "rented") {
      setNote(t.details.unavailable);
      return;
    }
    if (item.owner_id === session?.user.id) {
      setNote("This is your listing. Open Profile, then Messages, to reply.");
      return;
    }
    onChat(item.id);
  }

  async function save() {
    if (!token || !item) {
      requireLogin(getCopy().gate.saveProperty);
      return;
    }
    await toggle(item);
  }

  async function removeListing() {
    if (!token || !item) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.deleteProperty(item.id, token);
      setAskDelete(false);
      navigation.goBack();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading && !item) return <DetailSkeleton />;
  if (!item) return <View style={[styles.body, { backgroundColor: "white", flex: 1 }]}><Text>{note || t.search.unavailable}</Text></View>;

  const liked = isSaved(item.id, item.is_favorite);
  const mine = item.owner_id === session?.user.id;
  const closed = item.status === "sold" || item.status === "rented";
  const closedText = item.status === "sold" ? t.details.soldBanner : t.details.rentedBanner;
  const photos = (item.images?.length
    ? item.images.filter((image) => image.image_type !== "video").map((image) => image.image_url)
    : [item.cover_image]
  ).filter(Boolean) as string[];
  const place = [item.locality, item.city, item.state].filter(Boolean).join(", ") || t.common.locationMissing;
  const phone = (item.owner_phone || "").replace(/[^\d+]/g, "");
  const area = item.area ? Number(item.area).toLocaleString("en-IN") : "—";
  const description = item.description || t.details.noDescription;
  const tabs = [
    { id: "overview" as const, label: t.details.overview },
    { id: "amenities" as const, label: t.details.amenities },
    { id: "location" as const, label: t.details.location },
    { id: "documents" as const, label: t.details.documents },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader compact title={item.title} right={
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Share property" onPress={() => { Share.share({ message: `${item.title}\n${place}\n${inr(item.price)}` }).catch(() => setNote("Could not share this property. Please try again.")); }} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="share-social-outline" size={22} color={colors.ink} />
          </Pressable>
          {mine ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Delete listing" onPress={() => { setDeleteError(""); setAskDelete(true); }} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          ) : <SafetyActions
            userId={item.owner_id} propertyId={item.id} token={token} directReport
            onSignIn={() => requireLogin("Sign in to report or block a user.")}
            onChanged={() => navigation.goBack()}
          />}
        </View>
      } />
      <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.page }} contentContainerStyle={{ paddingBottom: 168, flexGrow: 1, backgroundColor: colors.page }}>
        <View style={{ width, height: 340, backgroundColor: "#E7E0D6" }}>
          {photos.length ? (
            <ScrollView
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
                setPhotoIndex((current) => (current === next ? current : next));
              }}
              scrollEventThrottle={16}
            >
              {photos.map((uri, index) => (
                <Pressable key={`${uri}-${index}`} onPress={() => { setPhotoIndex(index); setZoomOpen(true); }}>
                  <Image source={{ uri }} style={{ width, height: 340 }} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          {closed ? (
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(28,28,28,0.42)", alignItems: "center", justifyContent: "center" }}>
              <View style={{ borderWidth: 3, borderColor: "white", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, transform: [{ rotate: "-12deg" }] }}>
                <Text style={{ color: "white", fontWeight: "800", fontSize: 22, letterSpacing: 1 }}>{closedText}</Text>
              </View>
            </View>
          ) : null}
          {photos.length > 1 ? (
            <View pointerEvents="none" style={{ position: "absolute", bottom: 14, left: 0, right: 0, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6 }}>
                {photos.map((_, index) => <View key={index} style={{ width: index === photoIndex ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: index === photoIndex ? "white" : "rgba(255,255,255,0.55)" }} />)}
              </View>
            </View>
          ) : null}
          {photos.length ? (
            <Pressable onPress={() => setZoomOpen(true)} hitSlop={8} style={{ position: "absolute", right: 16, bottom: photos.length > 1 ? 44 : 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(20,20,20,0.72)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="expand-outline" size={18} color="white" />
            </Pressable>
          ) : null}
        </View>
        <View style={{ backgroundColor: colors.page, paddingHorizontal: 20, paddingTop: 20, flexGrow: 1 }}>
          {item.images?.some(image => image.image_type === "video") ? <View style={{ marginBottom: 18 }}>
            <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "700", marginBottom: 10 }}>{t.listing.propertyVideos}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {item.images.filter(image => image.image_type === "video").map((video, index) => <PropertyVideoCard key={video.id || `${video.image_url}-${index}`} index={index} poster={video.thumbnail_url || photos[0]}
                onPress={() => { Linking.openURL(video.image_url).catch(() => setNote(t.search.unavailable)); }}
              />)}
            </View>
          </View> : null}
          {item.listing_label === "Premium" || item.is_premium ? (
            <View style={{ alignSelf: "flex-start", backgroundColor: "#f8e7c0", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 }}>
              <Text style={{ color: "#8a5a12", fontSize: 11, fontWeight: "800" }}>{t.common.premium}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ flex: 1, fontSize: 22, lineHeight: 28, fontWeight: "600", color: colors.ink }}>{item.title}</Text>
            {mine ? null : (
            <Pressable onPress={save} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: liked ? colors.primarySoft : colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? colors.heart : colors.faint} />
            </Pressable>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
            <Ionicons name="location-sharp" size={15} color={colors.muted} />
            <Text style={{ flex: 1, color: colors.muted, fontSize: 14 }}>{place}</Text>
          </View>
          {closed ? (
            <View style={{ alignSelf: "flex-start", marginTop: 12, backgroundColor: "#F8EEDD", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: colors.warning, fontWeight: "800" }}>{closedText}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: colors.primary }}>{inr(item.price)}</Text>
            {item.is_price_negotiable ? <View style={{ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ color: colors.white, fontWeight: "700", fontSize: 13 }}>{t.details.negotiable}</Text></View> : null}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
            <Fact icon="bed-outline" value={String(item.bedrooms ?? "—")} label={t.details.bedrooms} />
            <Fact icon="water-outline" value={String(item.bathrooms ?? "—")} label={t.details.bathrooms} />
            <Fact icon="car-outline" value={item.parking_spaces != null ? String(item.parking_spaces) : "—"} label={t.details.parking} />
            <Fact value={area} label={t.details.sqft} />
          </View>
          <View style={{ flexDirection: "row", marginTop: 22, borderBottomWidth: 1, borderBottomColor: colors.lineSoft }}>
            {tabs.map((entry) => {
              const active = tab === entry.id;
              return (
                <Pressable key={entry.id} onPress={() => setTab(entry.id)} style={{ flex: 1, alignItems: "center" }}>
                  <View style={{ borderBottomWidth: 3, borderBottomColor: active ? colors.primary : "transparent", paddingBottom: 10, marginBottom: -1 }}>
                    <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? colors.primary : colors.faint }}>{entry.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: 16, minHeight: 88 }}>
            {tab === "overview" ? (
              <View>
                <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23 }} numberOfLines={expanded ? undefined : 4}>{description}</Text>
                {description.length > 90 ? <Pressable onPress={() => setExpanded((value) => !value)}><Text style={{ color: colors.primary, fontWeight: "700", marginTop: 10 }}>{expanded ? t.details.showLess : t.details.readMore}</Text></Pressable> : null}

              </View>
            ) : null}
            {tab === "amenities" ? (
              item.amenities?.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {item.amenities.map((amenity) => (
                    <View key={amenity.id} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      <Text style={{ color: colors.ink, fontWeight: "600" }}>{amenityName(amenity.slug, amenity.name)}</Text>
                    </View>
                  ))}
                </View>
              ) : <Text style={{ color: colors.muted }}>{t.details.noAmenities}</Text>
            ) : null}
            {tab === "location" ? (
              <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
                <Text style={{ color: colors.ink, fontWeight: "700" }}>{place}</Text>
                {item.address ? <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{item.address}</Text> : null}
              </View>
            ) : null}
            {tab === "documents" ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.muted, lineHeight: 20 }}>{t.details.docsHint}</Text>
                {mine ? null : closed ? <Text style={{ color: colors.warning, fontWeight: "700" }}>{t.details.unavailable}</Text> : <Pressable onPress={() => onSchedule(item.id)}><Text style={{ color: colors.primary, fontWeight: "700" }}>{t.details.schedule}</Text></Pressable>}
              </View>
            ) : null}
          </View>
          {note ? <Text style={{ color: colors.muted, marginTop: 12 }}>{note}</Text> : null}
        </View>
      </ScrollView>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.lineSoft, gap: 8 }}>
        {mine ? (
        <>
        <Pressable onPress={() => onEdit(item.id)} style={({ pressed }) => ({ height: 52, backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", ...buttonShadow })}>
          <Text style={{ color: colors.white, fontWeight: "700" }}>{t.listing.edit}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onInquiries} style={{ flex: 1, height: 52, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, backgroundColor: colors.card }}>
          <Ionicons name="mail-outline" size={16} color={colors.primary} />
          <Text style={{ fontWeight: "700", color: colors.primary }}>{t.menu.inquiries}</Text>
        </Pressable>
        <Pressable onPress={onMessages} style={({ pressed }) => ({ flex: 1, height: 52, backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 })}>
          <Ionicons name="chatbubble-ellipses" size={16} color="white" />
          <Text style={{ color: "white", fontWeight: "700" }}>{t.menu.messages}</Text>
        </Pressable>
        </View>
        </>
        ) : closed ? (
          <View style={{ height: 52, borderRadius: 14, backgroundColor: "#F8EEDD", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.warning, fontWeight: "800" }}>{t.details.unavailable}</Text>
          </View>
        ) : (
        <>
        <Pressable onPress={() => { if (!token) { requireLogin(t.gate.scheduleVisit); return; } onSchedule(item.id); }} style={({ pressed }) => ({ height: 52, backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", ...buttonShadow })}>
          <Text style={{ color: colors.white, fontWeight: "700" }}>{t.details.schedule}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => contactOwner("call")} style={{ flex: 0.9, height: 52, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, backgroundColor: colors.card }}>
          <Ionicons name="call-outline" size={16} color={colors.primary} />
          <Text style={{ fontWeight: "700", color: colors.primary }}>{t.common.call}</Text>
        </Pressable>
        <Pressable onPress={() => contactOwner("whatsapp")} style={{ flex: 1.25, height: 52, backgroundColor: "#128C7E", borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
          <Ionicons name="logo-whatsapp" size={18} color="white" />
          <Text style={{ color: "white", fontWeight: "700" }}>{t.common.whatsapp}</Text>
        </Pressable>
        <Pressable onPress={chat} style={({ pressed }) => ({ flex: 1.15, height: 52, backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 })}>
          <Ionicons name="chatbubble-ellipses" size={16} color="white" />
          <Text style={{ color: "white", fontWeight: "700" }}>{t.common.chat}</Text>
        </Pressable>
        </View>
        </>
        )}
      </View>
      {zoomOpen && photos.length ? <PhotoZoom photos={photos} startIndex={photoIndex} onClose={() => setZoomOpen(false)} /> : null}
      {askDelete ? (
        <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!deleting) setAskDelete(false); }}>
          <Pressable onPress={deleting ? undefined : () => setAskDelete(false)} style={{ flex: 1, backgroundColor: "rgba(28,28,28,0.45)", justifyContent: "center", paddingHorizontal: 28 }}>
            <Pressable onPress={() => undefined} style={{ backgroundColor: colors.card, borderRadius: 18, padding: 20 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#F8E8E6", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
                <Ionicons name="trash-outline" size={24} color={colors.danger} />
              </View>
              <Text style={{ marginTop: 14, fontSize: 18, fontWeight: "800", color: colors.ink, textAlign: "center" }}>{deleteError ? t.details.deleteFailed : t.details.deleteTitle}</Text>
              <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 20, textAlign: "center" }}>{deleteError || fill(t.details.deleteBody, { title: item.title })}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
                <Pressable onPress={() => { setAskDelete(false); setDeleteError(""); }} disabled={deleting} style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: "center", justifyContent: "center", opacity: deleting ? 0.6 : 1 }}>
                  <Text style={{ fontWeight: "700", color: colors.primary }}>{deleteError ? t.common.close : t.common.cancel}</Text>
                </Pressable>
                {deleteError ? null : (
                  <Pressable onPress={() => void removeListing()} disabled={deleting} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 14, backgroundColor: pressed ? "#9A2E24" : colors.danger, alignItems: "center", justifyContent: "center", opacity: deleting ? 0.7 : 1 })}>
                    <Text style={{ color: colors.white, fontWeight: "700" }}>{deleting ? t.common.deleting : t.common.delete}</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

function Fact({ icon, value, label }: { icon?: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 4 }}>
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} /> : null}
      <Text numberOfLines={1} style={{ marginTop: icon ? 8 : 0, fontWeight: "700", color: colors.ink, fontSize: 14 }}>{value}</Text>
      <Text numberOfLines={1} style={{ marginTop: 2, color: colors.faint, fontSize: 11 }}>{label}</Text>
    </View>
  );
}
