import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, FlatList, Image, KeyboardAvoidingView, Linking, Modal, PanResponder, Platform, Pressable, ScrollView, Share, Text, TextInput, useWindowDimensions, View } from "react-native";
import { PropertyGridCard, PropertyListCard, PropertyListSkeleton } from "../components/PropertyGridCard";
import { PropertyMap } from "../components/PropertyMap";
import { DetailSkeleton, EmptyState, PageHeader, PropertyGridSkeleton, SkeletonBlock, styles } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { api, cityName, inr, listingLabel, sortForDashboard, sortForSearch } from "../lib/api";
import { readCurrentPlace } from "../lib/location";
import { useRequireLogin } from "../context/LoginGate";
import { colors } from "../theme";
import { deviceType } from "../lib/supabase";
import type { PropertyCard, PropertyDetail } from "../types/database";

function Card({ item, onPress }: { item: PropertyCard; onPress: () => void }) {
  const place = [item.locality, item.city].filter(Boolean).join(", ") || "Location not added";
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: 140 }} resizeMode="cover" /> : <View style={{ height: 120, backgroundColor: "#d7e3db" }} />}
      <View style={styles.cardBody}>
        <Text style={styles.price}>{inr(item.price)}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{place}</Text>
        <Text style={styles.meta}>{item.bedrooms ?? "—"} bd · {item.bathrooms ?? "—"} ba · {item.area ? `${item.area} ${item.area_unit}` : listingLabel(item.listing_type)}</Text>
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

const categories = [
  { label: "Buy", query: "listing_type=sale", bg: "#fde8e6", color: "#e57373", icon: "home" as const },
  { label: "Rent", query: "listing_type=rent", bg: "#e8f1ff", color: "#5b8def", icon: "home-city" as const },
  { label: "Plot", query: "category=residential-plot", bg: "#e7f6ec", color: "#67b98b", icon: "checkbox-blank-outline" as const },
  { label: "Land", query: "category=agricultural-land", bg: "#fff0e6", color: "#e0914a", icon: "upload" as const },
  { label: "House", query: "category=house", bg: "#e8f1ff", color: "#3b82f6", icon: "home-outline" as const },
  { label: "Apartment", query: "category=apartment", bg: "#f3e8ff", color: "#8b6bb8", icon: "office-building" as const },
  { label: "Villa", query: "category=villa", bg: "#fff4e5", color: "#d4924a", icon: "home-variant" as const },
  { label: "Shop", query: "category=shop", bg: "#f3f4f6", color: "#8b9098", icon: "storefront-outline" as const },
];

export function HomeScreen({
  onOpen,
  onSearch,
  onNotify,
  onOpenMenu,
}: {
  onOpen: (id: string) => void;
  onSearch: (query: string) => void;
  onNotify?: () => void;
  onOpenMenu: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { me, token } = useAuth();
  const { isSaved, toggle } = useFavorites();
  const requireLogin = useRequireLogin();
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const accent = "#8C5A3C";
  const cardWidth = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

  const profileCity = cityName(me?.profile?.city);
  const [placeCity, setPlaceCity] = useState("");
  const [located, setLocated] = useState(false);
  const city = placeCity;

  useEffect(() => {
    let active = true;
    readCurrentPlace()
      .then((place) => {
        if (!active) return;
        setPlaceCity(cityName(place.city) || profileCity);
      })
      .catch(() => {
        if (active) setPlaceCity(profileCity);
      })
      .finally(() => {
        if (active) setLocated(true);
      });
    return () => {
      active = false;
    };
  }, [profileCity]);

  useEffect(() => {
    if (!located) return;
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ limit: "24" });
    if (city) params.set("prefer_city", city);
    api.properties(`?${params}`, token).then((rows) => {
      if (active) setItems(sortForDashboard(rows, city));
    }).catch((err) => {
      if (active) setError(err.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [city, token, located]);

  useFocusEffect(useCallback(() => {
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

  async function toggleSaved(item: PropertyCard) {
    if (!token) {
      requireLogin("Sign in to save this property.");
      return;
    }
    await toggle(item);
  }

  const premiumItems = items.filter((item) => item.is_premium || item.listing_label === "Premium");
  const simpleItems = items.filter((item) => !item.is_premium && item.listing_label !== "Premium");
  const page = colors.page;

  function propertyCard(item: PropertyCard, width: number) {
    return (
      <PropertyGridCard
        key={item.id}
        item={item}
        width={width}
        saved={isSaved(item.id, item.is_favorite)}
        onPress={() => onOpen(item.slug || item.id)}
        onSave={() => toggleSaved(item)}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: page }}>
    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 8, backgroundColor: page }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable onPress={onOpenMenu} hitSlop={8}>
          <Image source={require("../../assets/splash.png")} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "white", borderWidth: 1, borderColor: "#E7E0D6" }} resizeMode="cover" />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 22, fontWeight: "800", color: "#0A0E0B" }}>{city || "Finding city"}</Text>
          <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 13, fontWeight: "600", color: "#8A8178" }}>Find your property</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={openNotifications} hitSlop={8} style={{ padding: 4 }}>
            <Ionicons name="notifications-outline" size={26} color="#2C2825" />
            {unread > 0 ? (
              <View style={{ position: "absolute", top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#D32F2F", borderWidth: 1.5, borderColor: page, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                <Text style={{ color: "white", fontSize: 10, fontWeight: "900" }}>{unread > 99 ? "99+" : unread}</Text>
              </View>
            ) : null}
          </Pressable>
          <View style={{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", backgroundColor: "#E7D9C8", alignItems: "center", justifyContent: "center" }}>
            {me?.profile?.avatar_url ? <Image source={{ uri: me.profile.avatar_url }} style={{ width: 40, height: 40 }} /> : <Ionicons name="person" size={18} color="#8A8178" />}
          </View>
        </View>
      </View>
      <View style={{ marginTop: 14, backgroundColor: "white", borderRadius: 16, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "#E7E0D6" }}>
        <Ionicons name="search" size={18} color="#146c36" />
        <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => onSearch(query || "all")} placeholder="Search house, plot, land..." placeholderTextColor="#A39B92" style={{ flex: 1, marginLeft: 8, color: "#2C2825", fontSize: 14 }} />
      </View>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
      <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: "white", borderRadius: 20, paddingTop: 16, paddingBottom: 4, borderWidth: 1, borderColor: "#EFE8DE" }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {categories.map((item) => (
            <Pressable key={item.label} onPress={() => onSearch(item.query)} style={{ width: "25%", alignItems: "center", marginBottom: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: item.bg, alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name={item.icon} size={26} color={item.color} />
              </View>
              <Text style={{ marginTop: 6, fontSize: 12, color: "#3d3d3d", fontWeight: "600" }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable onPress={() => onSearch("all")} style={{ marginHorizontal: 16, marginTop: 14, height: 118, borderRadius: 16, overflow: "hidden" }}>
        <Image source={require("../../assets/home-banner.jpg")} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        <View style={{ position: "absolute", left: 14, top: 0, bottom: 0, width: "48%", justifyContent: "center" }}>
          <Text style={{ color: "white", fontSize: 16, lineHeight: 20, fontWeight: "800" }}>Find Your Dream Home</Text>
          <Text style={{ color: "rgba(255,255,255,0.9)", marginTop: 2, fontSize: 12 }}>Verified Properties</Text>
          <View style={{ alignSelf: "flex-start", marginTop: 8, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ color: "#146c36", fontWeight: "700", fontSize: 12 }}>Explore Now</Text>
          </View>
        </View>
      </Pressable>
      {error ? <Text style={[styles.error, { margin: 16 }]}>{error}</Text> : null}
      {loading ? <View style={{ paddingHorizontal: 16, marginTop: 20 }}><PropertyGridSkeleton width={cardWidth} /></View> : null}
      {!loading && premiumItems.length > 0 ? (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginTop: 20, marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#2C2825" }}>Premium Properties</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {premiumItems.map((item) => propertyCard(item, 220))}
          </ScrollView>
        </>
      ) : null}
      {!loading ? (
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginTop: 20, marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#2C2825" }}>Simple Properties</Text>
        <Pressable onPress={() => onSearch("all")}><Text style={{ color: accent, fontWeight: "700" }}>See All</Text></Pressable>
      </View>
      ) : null}
      {!loading && simpleItems.length === 0 && premiumItems.length === 0 ? <EmptyState kind="active" /> : null}
      {!loading && simpleItems.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12 }}>
          {simpleItems.map((item) => propertyCard(item, cardWidth))}
        </View>
      ) : null}
    </ScrollView>
    </View>
  );
}

export function SearchScreen({ initialQuery, onOpen }: { initialQuery?: string; onOpen: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const { me, token } = useAuth();
  const { isSaved, toggle } = useFavorites();
  const requireLogin = useRequireLogin();
  const profileCity = cityName(me?.profile?.city);
  const [nearCity, setNearCity] = useState("");
  const [located, setLocated] = useState(false);
  const [q, setQ] = useState("");
  const [listing, setListing] = useState("");
  const [category, setCategory] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withPhotos, setWithPhotos] = useState(false);
  const [sort, setSort] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(true);

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
    let active = true;
    readCurrentPlace()
      .then((place) => {
        if (!active) return;
        setNearCity(cityName(place.city) || profileCity);
      })
      .catch(() => {
        if (active) setNearCity(profileCity);
      })
      .finally(() => {
        if (active) setLocated(true);
      });
    return () => {
      active = false;
    };
  }, [profileCity]);

  useEffect(() => {
    if (!located) return;
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (q.trim()) params.set("q", q.trim());
    if (listing) params.set("listing_type", listing);
    const activeCategory = propertyType || category;
    if (activeCategory) params.set("category", activeCategory);
    const range = priceRanges.find((item) => item.id === price);
    if (range?.min != null) params.set("min_price", String(range.min));
    if (range?.max != null) params.set("max_price", String(range.max));
    if (bedrooms) params.set("bedrooms", bedrooms === "4" ? "4" : bedrooms);
    if (nearCity) {
      params.set("prefer_city", nearCity);
      params.set("city_first", "true");
    }
    api.properties(`?${params.toString()}`, token).then((rows) => {
      if (active) setItems(rows);
    }).catch(() => {
      if (active) setItems([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [q, listing, category, propertyType, price, bedrooms, token, nearCity, located]);

  const shown = sortForSearch(
    [...items]
      .filter((item) => !verifiedOnly || item.verification_status === "verified" || item.owner_verified)
      .filter((item) => !withPhotos || Boolean(item.cover_image)),
    nearCity || q,
    sort,
  );

  async function toggleSaved(item: PropertyCard) {
    if (!token) {
      requireLogin("Sign in to save this property.");
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
  const filterCount = [listing || category, propertyType, price, bedrooms, verifiedOnly, withPhotos, sort !== "newest"].filter(Boolean).length;

  function clearFilters() {
    setListing("");
    setCategory("");
    setPropertyType("");
    setPrice("");
    setBedrooms("");
    setVerifiedOnly(false);
    setWithPhotos(false);
    setSort("newest");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#F7F4EE" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: "#F7F4EE", borderBottomWidth: 1, borderBottomColor: "#E8E4DC" }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#0A0E0B" }}>Search</Text>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, borderRadius: 12, backgroundColor: "white", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, minHeight: 44, borderWidth: 1, borderColor: "#E8E4DC" }}>
            <Ionicons name="search" size={18} color="#8E8E8E" />
            <TextInput value={q} onChangeText={setQ} placeholder="City, area, or property name" placeholderTextColor="#8E8E8E" style={{ flex: 1, marginLeft: 8, color: "#262626", fontSize: 15, paddingVertical: 8 }} />
            {q ? (
              <Pressable onPress={() => setQ("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#8E8E8E" />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={() => setFiltersOpen(true)} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: filterCount ? "#2E7D32" : "#E8E4DC", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="options-outline" size={22} color={filterCount ? "#2E7D32" : "#262626"} />
            {filterCount ? <View style={{ position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#2E7D32", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}><Text style={{ color: "white", fontSize: 10, fontWeight: "800" }}>{filterCount}</Text></View> : null}
          </Pressable>
        </View>
      </View>
      {!loading ? <Text style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, color: "#8A8178", fontSize: 13, fontWeight: "600" }}>{shown.length} {shown.length === 1 ? "result" : "results"}{q.trim() ? ` • ${q.trim()}` : ""}</Text> : null}
      <FlatList
        style={{ flex: 1 }}
        data={loading ? [] : shown}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 28, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PropertyListCard
            item={item}
            saved={isSaved(item.id, item.is_favorite)}
            onPress={() => onOpen(item.slug || item.id)}
            onSave={() => toggleSaved(item)}
          />
        )}
        ListEmptyComponent={loading ? <PropertyListSkeleton /> : <EmptyState kind="search" />}
      />
      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setFiltersOpen(false)} />
          <View style={{ maxHeight: "82%", backgroundColor: "#F7F4EE", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#0A0E0B" }}>Filters</Text>
              <Pressable onPress={clearFilters} hitSlop={8}><Text style={{ color: "#2E7D32", fontWeight: "800" }}>Clear</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 14 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "800", color: "#374151" }}>Looking for</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {typeChips.map((chip) => (
                    <LeVechChip key={chip.label} label={chip.label} active={tabActive(chip.query)} onPress={() => selectTab(chip.query)} />
                  ))}
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "800", color: "#374151" }}>Type</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[{ id: "", label: "Any type" }, ...propertyTypes].map((option) => (
                    <LeVechChip key={option.id || "type"} label={option.label} active={propertyType === option.id} onPress={() => setPropertyType(option.id)} />
                  ))}
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "800", color: "#374151" }}>Price</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[{ id: "", label: "Any price" }, ...priceRanges].map((option) => (
                    <LeVechChip key={option.id || "price"} label={option.label} active={price === option.id} onPress={() => setPrice(option.id)} />
                  ))}
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "800", color: "#374151" }}>BHK</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[{ id: "", label: "Any" }, { id: "1", label: "1 BHK" }, { id: "2", label: "2 BHK" }, { id: "3", label: "3 BHK" }, { id: "4", label: "4+ BHK" }].map((option) => (
                    <LeVechChip key={option.id || "beds"} label={option.label} active={bedrooms === option.id} onPress={() => setBedrooms(option.id)} />
                  ))}
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "800", color: "#374151" }}>More</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <LeVechChip label="Verified" active={verifiedOnly} onPress={() => setVerifiedOnly((value) => !value)} />
                  <LeVechChip label="Photos" active={withPhotos} onPress={() => setWithPhotos((value) => !value)} />
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "800", color: "#374151" }}>Sort</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[{ id: "newest", label: "Newest" }, { id: "low", label: "Price: Low to high" }, { id: "high", label: "Price: High to low" }].map((option) => (
                    <LeVechChip key={option.id} label={option.label} active={sort === option.id} onPress={() => setSort(option.id)} />
                  ))}
                </View>
              </View>
            </ScrollView>
            <Pressable onPress={() => setFiltersOpen(false)} style={{ marginHorizontal: 16, marginTop: 4, backgroundColor: "#2E7D32", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: "white", fontWeight: "800" }}>Show properties</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const propertyTypes = [
  { id: "house", label: "House" },
  { id: "apartment", label: "Apartment" },
  { id: "villa", label: "Villa" },
  { id: "shop", label: "Shop" },
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
        backgroundColor: active ? "#E8F5E9" : "white",
        borderWidth: 1,
        borderColor: active ? "#2E7D32" : "#C8E6C9",
      }}
    >
      <Text style={{ color: active ? "#2E7D32" : "#374151", fontSize: 13, fontWeight: active ? "800" : "600" }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export function MapScreen({ onOpen, showBack }: { onOpen: (id: string) => void; showBack?: boolean }) {
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api.properties("?limit=50").then((rows) => {
      if (active) setItems(rows);
    }).catch(() => {
      if (active) setItems([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);
  const pins = items.filter((item) => item.latitude && item.longitude);
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      {showBack ? <PageHeader title="Map" /> : null}
      {loading ? <View style={{ flex: 1, margin: 16 }}><SkeletonBlock height={420} radius={16} /></View> : <PropertyMap pins={pins} onOpen={onOpen} />}
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
  const pager = useRef<ScrollView>(null);
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
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" }}>Pinch or double-tap to zoom</Text>
        </View>
      </View>
    </Modal>
  );
}

export function DetailsScreen({ id, onSchedule, onChat }: { id: string; onSchedule: (propertyId: string) => void; onChat: (propertyId: string) => void }) {
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
  const { width } = useWindowDimensions();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPhotoIndex(0);
    setZoomOpen(false);
    api.property(id, token).then((row) => {
      if (active) setItem(row);
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

  async function chat() {
    if (!token || !item) {
      requireLogin("Sign in to chat about this property.");
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
      requireLogin("Sign in to save this property.");
      return;
    }
    await toggle(item);
  }

  if (loading && !item) return <DetailSkeleton />;
  if (!item) return <View style={[styles.body, { backgroundColor: "white", flex: 1 }]}><Text>{note || "This property is not available."}</Text></View>;

  const liked = isSaved(item.id, item.is_favorite);
  const photos = (item.images?.length
    ? item.images.filter((image) => image.image_type !== "video").map((image) => image.image_url)
    : [item.cover_image]
  ).filter(Boolean) as string[];
  const place = [item.locality, item.city, item.state].filter(Boolean).join(", ") || "Location not added";
  const phone = (item.owner_phone || "").replace(/[^\d+]/g, "");
  const area = item.area ? Number(item.area).toLocaleString("en-IN") : "—";
  const description = item.description || "No description yet.";
  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "amenities" as const, label: "Amenities" },
    { id: "location" as const, label: "Location" },
    { id: "documents" as const, label: "Documents" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: "white" }} contentContainerStyle={{ paddingBottom: 168, flexGrow: 1, backgroundColor: "white" }}>
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
          <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <RoundIcon name="chevron-back" onPress={() => navigation.goBack()} />
            <RoundIcon name="share-social-outline" onPress={() => Share.share({ message: `${item.title}\n${place}\n${inr(item.price)}` })} />
          </View>
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
        <View style={{ backgroundColor: "white", paddingHorizontal: 16, paddingTop: 20, flexGrow: 1 }}>
          {item.listing_label === "Premium" || item.is_premium ? (
            <View style={{ alignSelf: "flex-start", backgroundColor: "#f8e7c0", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 }}>
              <Text style={{ color: "#8a5a12", fontSize: 11, fontWeight: "800" }}>Premium</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ flex: 1, fontSize: 22, lineHeight: 28, fontWeight: "800", color: "#171717" }}>{item.title}</Text>
            <Pressable onPress={save} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#ffe8ea", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color="#ef4444" />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
            <Ionicons name="location-sharp" size={15} color="#146c36" />
            <Text style={{ flex: 1, color: "#6b7280", fontSize: 14 }}>{place}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: "#171717" }}>{inr(item.price)}</Text>
            {item.is_price_negotiable ? <View style={{ backgroundColor: "#e7f6ec", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ color: "#146c36", fontWeight: "700", fontSize: 13 }}>Negotiable</Text></View> : null}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
            <Fact icon="bed-outline" value={String(item.bedrooms ?? "—")} label="Bedrooms" />
            <Fact icon="water-outline" value={String(item.bathrooms ?? "—")} label="Bathrooms" />
            <Fact icon="car-outline" value={item.parking_spaces != null ? String(item.parking_spaces) : "—"} label="Parking" />
            <Fact value={area} label="Sq.ft" />
          </View>
          <View style={{ flexDirection: "row", marginTop: 22, borderBottomWidth: 1, borderBottomColor: "#eeeae4" }}>
            {tabs.map((entry) => {
              const active = tab === entry.id;
              return (
                <Pressable key={entry.id} onPress={() => setTab(entry.id)} style={{ flex: 1, alignItems: "center" }}>
                  <View style={{ borderBottomWidth: 3, borderBottomColor: active ? "#146c36" : "transparent", paddingBottom: 10, marginBottom: -1 }}>
                    <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#146c36" : "#9aa19c" }}>{entry.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: 16, minHeight: 88 }}>
            {tab === "overview" ? (
              <View>
                <Text style={{ color: "#3f3f46", fontSize: 15, lineHeight: 23 }} numberOfLines={expanded ? undefined : 4}>{description}</Text>
                {description.length > 90 ? <Pressable onPress={() => setExpanded((value) => !value)}><Text style={{ color: "#146c36", fontWeight: "800", marginTop: 10 }}>{expanded ? "Show Less" : "Read More"}</Text></Pressable> : null}
              </View>
            ) : null}
            {tab === "amenities" ? (
              item.amenities?.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {item.amenities.map((amenity) => (
                    <View key={amenity.id} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f6f7f4", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color="#146c36" />
                      <Text style={{ color: "#1c1c1c", fontWeight: "600" }}>{amenity.name}</Text>
                    </View>
                  ))}
                </View>
              ) : <Text style={{ color: "#8a918c" }}>No amenities listed.</Text>
            ) : null}
            {tab === "location" ? (
              <View style={{ backgroundColor: "#f6f7f4", borderRadius: 16, padding: 14 }}>
                <Text style={{ color: "#1c1c1c", fontWeight: "700" }}>{place}</Text>
                {item.address ? <Text style={{ color: "#6b7280", marginTop: 6, lineHeight: 20 }}>{item.address}</Text> : null}
              </View>
            ) : null}
            {tab === "documents" ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: "#6b7280", lineHeight: 20 }}>Documents are shared after you enquire.</Text>
                <Pressable onPress={() => onSchedule(item.id)}><Text style={{ color: "#146c36", fontWeight: "800" }}>Schedule a visit</Text></Pressable>
              </View>
            ) : null}
          </View>
          {note ? <Text style={{ color: "#146c36", marginTop: 12 }}>{note}</Text> : null}
        </View>
      </ScrollView>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#f1eee8", gap: 8 }}>
        <Pressable onPress={() => { if (!token) { requireLogin("Sign in to schedule a visit."); return; } onSchedule(item.id); }} style={{ height: 46, borderWidth: 1, borderColor: "#146c36", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#146c36", fontWeight: "800" }}>Schedule a visit</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => phone ? Linking.openURL(`tel:${phone}`) : setNote("Phone number is not available.")} style={{ flex: 0.9, height: 48, borderWidth: 1, borderColor: "#e7e2d8", borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, backgroundColor: "white" }}>
          <Ionicons name="call-outline" size={16} color="#1c1c1c" />
          <Text style={{ fontWeight: "700", color: "#1c1c1c" }}>Call</Text>
        </Pressable>
        <Pressable onPress={() => phone ? Linking.openURL(`https://wa.me/${phone.replace(/^\+/, "")}`) : setNote("Phone number is not available.")} style={{ flex: 1.25, height: 48, backgroundColor: "#22c55e", borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
          <Ionicons name="logo-whatsapp" size={18} color="white" />
          <Text style={{ color: "white", fontWeight: "800" }}>WhatsApp</Text>
        </Pressable>
        <Pressable onPress={chat} style={{ flex: 1.15, height: 48, backgroundColor: "#146c36", borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
          <Ionicons name="chatbubble-ellipses" size={16} color="white" />
          <Text style={{ color: "white", fontWeight: "800" }}>Chat</Text>
        </Pressable>
        </View>
      </View>
      {zoomOpen && photos.length ? <PhotoZoom photos={photos} startIndex={photoIndex} onClose={() => setZoomOpen(false)} /> : null}
    </View>
  );
}

function RoundIcon({ name, onPress }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(20,20,20,0.72)", alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={name} size={20} color="white" />
    </Pressable>
  );
}

function Fact({ icon, value, label }: { icon?: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#efeae3", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 4 }}>
      {icon ? <Ionicons name={icon} size={18} color="#7b847e" /> : null}
      <Text numberOfLines={1} style={{ marginTop: icon ? 8 : 0, fontWeight: "800", color: "#171717", fontSize: 14 }}>{value}</Text>
      <Text numberOfLines={1} style={{ marginTop: 2, color: "#8d948e", fontSize: 11 }}>{label}</Text>
    </View>
  );
}
