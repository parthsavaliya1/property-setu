import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { Dimensions, FlatList, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { PropertyMap } from "../components/PropertyMap";
import { ListingLabel, LogoLoader, EmptyState, PageHeader, styles } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, cityName, inr, listingLabel, sortForDashboard, sortForSearch } from "../lib/api";
import { readCurrentPlace } from "../lib/location";
import { useRequireLogin } from "../context/LoginGate";
import { colors } from "../theme";
import { deviceType } from "../lib/supabase";
import type { PropertyCard, PropertyDetail } from "../types/database";

function listingBadge(item: PropertyCard) {
  if (item.listing_label === "Premium" || item.is_premium) return "Premium";
  return null;
}

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

export function HomeScreen({ onOpen, onSearch, onNotify, onProfile }: { onOpen: (id: string) => void; onSearch: (query: string) => void; onNotify?: () => void; onProfile?: () => void }) {
  const insets = useSafeAreaInsets();
  const { me, token } = useAuth();
  const requireLogin = useRequireLogin();
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const accent = "#8C5A3C";
  const cardWidth = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

  const profileCity = cityName(me?.profile?.city);
  const [guestCity, setGuestCity] = useState("");
  const city = profileCity || guestCity || "Rajkot";

  useEffect(() => {
    if (profileCity) return;
    let active = true;
    readCurrentPlace()
      .then((place) => {
        if (active && place.city) setGuestCity(cityName(place.city));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [profileCity]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ limit: "24", prefer_city: city });
    api.properties(`?${params}`).then((rows) => {
      if (active) setItems(sortForDashboard(rows, city));
    }).catch((err) => {
      if (active) setError(err.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [city]);

  async function toggleSaved(item: PropertyCard) {
    if (!token) {
      requireLogin("Sign in to save this property.");
      return;
    }
    const next = !saved[item.id];
    setSaved((current) => ({ ...current, [item.id]: next }));
    try {
      if (next) await api.favorite(item.id, token);
      else await api.unfavorite(item.id, token);
    } catch {
      setSaved((current) => ({ ...current, [item.id]: !next }));
    }
  }

  const premiumItems = items.filter((item) => item.is_premium || item.listing_label === "Premium");
  const simpleItems = items.filter((item) => !item.is_premium && item.listing_label !== "Premium");
  const page = colors.page;

  function propertyCard(item: PropertyCard, width: number) {
    const place = [item.locality, item.city].filter(Boolean).join(", ") || "Location not added";
    return (
      <Pressable key={item.id} onPress={() => onOpen(item.slug || item.id)} style={{ width, backgroundColor: "white", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#EFE8DE" }}>
        <View style={{ height: 120, width: "100%", backgroundColor: "#E7D9C8" }}>
          {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
          <ListingLabel label={listingBadge(item)} />
          <Pressable onPress={() => toggleSaved(item)} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "white", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={saved[item.id] ? "heart" : "heart-outline"} size={16} color={saved[item.id] ? "#e11d48" : "#9aa19c"} />
          </Pressable>
        </View>
        <View style={{ padding: 10 }}>
          <Text numberOfLines={1} style={{ fontWeight: "700", color: "#2C2825" }}>{item.title}</Text>
          <Text style={{ color: accent, fontWeight: "800", marginTop: 4 }}>{inr(item.price)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 }}>
            <Ionicons name="location-sharp" size={11} color="#A39B92" />
            <Text numberOfLines={1} style={{ flex: 1, color: "#8A8178", fontSize: 12 }}>{place}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: page }} contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: "#8A8178", fontSize: 12, fontWeight: "600" }}>Location</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Ionicons name="location-sharp" size={16} color={accent} />
              <Text style={{ color: "#2C2825", fontSize: 18, fontWeight: "800" }}>{city}</Text>
              <Ionicons name="chevron-down" size={16} color="#8A8178" />
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable onPress={onNotify} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "white", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E7E0D6" }}>
              <Ionicons name="notifications-outline" size={20} color="#2C2825" />
            </Pressable>
            <Pressable onPress={onProfile} style={{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", backgroundColor: "#E7D9C8", alignItems: "center", justifyContent: "center" }}>
              {me?.profile?.avatar_url ? <Image source={{ uri: me.profile.avatar_url }} style={{ width: 40, height: 40 }} /> : <Ionicons name="person" size={18} color={accent} />}
            </Pressable>
          </View>
        </View>
        <View style={{ marginTop: 14, backgroundColor: "white", borderRadius: 16, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "#E7E0D6" }}>
          <Ionicons name="search" size={18} color={accent} />
          <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => onSearch(query || "all")} placeholder="Search house, plot, land..." placeholderTextColor="#A39B92" style={{ flex: 1, marginLeft: 8, color: "#2C2825", fontSize: 14 }} />
          <Ionicons name="mic-outline" size={18} color="#A39B92" />
        </View>
      </View>
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
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginTop: 20, marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#2C2825" }}>Premium Properties</Text>
      </View>
      {loading ? <LogoLoader /> : premiumItems.length === 0 ? (
        <Text style={{ marginHorizontal: 16, color: "#8A8178" }}>No premium properties right now.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {premiumItems.map((item) => propertyCard(item, 220))}
        </ScrollView>
      )}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginTop: 20, marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#2C2825" }}>Simple Properties</Text>
        <Pressable onPress={() => onSearch("all")}><Text style={{ color: accent, fontWeight: "700" }}>See All</Text></Pressable>
      </View>
      {!loading && simpleItems.length === 0 && premiumItems.length === 0 ? <EmptyState kind="active" /> : null}
      {!loading && simpleItems.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12 }}>
          {simpleItems.map((item) => propertyCard(item, cardWidth))}
        </View>
      ) : null}
    </ScrollView>
  );
}

export function SearchScreen({ initialQuery, onOpen }: { initialQuery?: string; onOpen: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const { me, token } = useAuth();
  const requireLogin = useRequireLogin();
  const profileCity = cityName(me?.profile?.city);
  const [nearCity, setNearCity] = useState(profileCity);
  const [located, setLocated] = useState(Boolean(profileCity));
  const [q, setQ] = useState(profileCity);
  const [listing, setListing] = useState("sale");
  const [category, setCategory] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withPhotos, setWithPhotos] = useState(false);
  const [sort, setSort] = useState("newest");
  const [menu, setMenu] = useState<"type" | "price" | "beds" | "sort" | null>(null);
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const green = "#146c36";

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
    if (profileCity) {
      setNearCity(profileCity);
      setLocated(true);
      return;
    }
    let active = true;
    readCurrentPlace()
      .then((place) => {
        if (!active) return;
        const city = cityName(place.city) || "Rajkot";
        setNearCity(city);
        setQ((current) => current || city);
      })
      .catch(() => {
        if (!active) return;
        setNearCity("Rajkot");
        setQ((current) => current || "Rajkot");
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
    const next = !saved[item.id];
    setSaved((current) => ({ ...current, [item.id]: next }));
    try {
      if (next) await api.favorite(item.id, token);
      else await api.unfavorite(item.id, token);
    } catch {
      setSaved((current) => ({ ...current, [item.id]: !next }));
    }
  }

  function selectTab(query: string) {
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

  const tabActive = (query: string) => query === `listing_type=${listing}` || (query.startsWith("category=") && query.slice("category=".length) === category && !listing);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.page }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#171717" }}>Search</Text>
        <Text style={{ color: "#8a918c", marginTop: 2, marginBottom: 12 }}>Find a home by city, area, or type</Text>
        <View style={{ height: 50, borderRadius: 16, backgroundColor: "white", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: "#efeae3" }}>
          <Ionicons name="search" size={18} color="#146c36" />
          <TextInput value={q} onChangeText={setQ} placeholder="City, area, or property name" placeholderTextColor="#9aa19c" style={{ flex: 1, marginLeft: 8, color: "#1c1c1c", fontSize: 15 }} />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#b0b6b1" />
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", marginTop: 14, backgroundColor: "white", borderRadius: 14, padding: 4, borderWidth: 1, borderColor: "#efeae3" }}>
          {typeChips.map((chip) => {
            const active = tabActive(chip.query);
            return (
              <Pressable key={chip.label} onPress={() => selectTab(chip.query)} style={{ flex: 1, backgroundColor: active ? green : "transparent", borderRadius: 11, paddingVertical: 9, alignItems: "center" }}>
                <Text style={{ color: active ? "white" : "#6e766f", fontWeight: "700", fontSize: 13 }}>{chip.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: 46 }} contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center", gap: 8 }}>
        <FilterChip label={propertyType ? propertyTypes.find((item) => item.id === propertyType)?.label || "Type" : "Type"} open={menu === "type"} onPress={() => setMenu(menu === "type" ? null : "type")} />
        <FilterChip label={price ? priceRanges.find((item) => item.id === price)?.label || "Price" : "Price"} open={menu === "price"} onPress={() => setMenu(menu === "price" ? null : "price")} />
        <FilterChip label={bedrooms ? `${bedrooms === "4" ? "4+" : bedrooms} BHK` : "BHK"} open={menu === "beds"} onPress={() => setMenu(menu === "beds" ? null : "beds")} />
        <ToggleChip label="Verified" active={verifiedOnly} onPress={() => setVerifiedOnly((value) => !value)} />
        <ToggleChip label="Photos" active={withPhotos} onPress={() => setWithPhotos((value) => !value)} />
      </ScrollView>
      {menu === "type" ? <OptionPanel options={[{ id: "", label: "Any type" }, ...propertyTypes]} selected={propertyType} onSelect={(id) => { setPropertyType(id); setMenu(null); }} /> : null}
      {menu === "price" ? <OptionPanel options={[{ id: "", label: "Any price" }, ...priceRanges]} selected={price} onSelect={(id) => { setPrice(id); setMenu(null); }} /> : null}
      {menu === "beds" ? <OptionPanel options={[{ id: "", label: "Any" }, { id: "1", label: "1 BHK" }, { id: "2", label: "2 BHK" }, { id: "3", label: "3 BHK" }, { id: "4", label: "4+ BHK" }]} selected={bedrooms} onSelect={(id) => { setBedrooms(id); setMenu(null); }} /> : null}
      {menu === "sort" ? <OptionPanel options={[{ id: "newest", label: "Newest" }, { id: "low", label: "Price: Low to high" }, { id: "high", label: "Price: High to low" }]} selected={sort} onSelect={(id) => { setSort(id); setMenu(null); }} /> : null}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 14, marginBottom: 8 }}>
        <Text style={{ color: "#3d3d3d", fontWeight: "800" }}>{loading ? "" : `${shown.length} ${shown.length === 1 ? "property" : "properties"}`}</Text>
        <Pressable onPress={() => setMenu(menu === "sort" ? null : "sort")} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "white", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: "#efeae3" }}>
          <Ionicons name="swap-vertical" size={14} color={green} />
          <Text style={{ color: "#1c1c1c", fontWeight: "700", fontSize: 13 }}>{sort === "low" ? "Price ↑" : sort === "high" ? "Price ↓" : "Newest"}</Text>
        </Pressable>
      </View>
      <FlatList
        style={{ flex: 1 }}
        data={loading ? [] : shown}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <SearchRow item={item} saved={Boolean(saved[item.id] || item.is_favorite)} onPress={() => onOpen(item.slug || item.id)} onSave={() => toggleSaved(item)} />}
        ListEmptyComponent={loading ? <LogoLoader /> : <EmptyState kind="search" />}
      />
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

function FilterChip({ label, open, onPress }: { label: string; open: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "white", borderWidth: 1, borderColor: open ? "#146c36" : "#e6e8e4", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text style={{ color: "#3d3d3d", fontSize: 13 }}>{label}</Text>
      <Ionicons name="chevron-down" size={14} color="#6e766f" />
    </Pressable>
  );
}

function ToggleChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: active ? "#e7f4ec" : "white", borderWidth: 1, borderColor: active ? "#146c36" : "#e6e8e4", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text style={{ color: active ? "#146c36" : "#3d3d3d", fontSize: 13, fontWeight: active ? "700" : "400" }}>{label}</Text>
    </Pressable>
  );
}

function OptionPanel({ options, selected, onSelect }: { options: Array<{ id: string; label: string }>; selected: string; onSelect: (id: string) => void }) {
  return (
    <View style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: "white", borderRadius: 16, padding: 12, flexDirection: "row", flexWrap: "wrap", gap: 8, borderWidth: 1, borderColor: "#efeae3" }}>
      {options.map((option) => {
        const active = selected === option.id;
        return (
          <Pressable key={option.id || "any"} onPress={() => onSelect(option.id)} style={{ backgroundColor: active ? "#146c36" : "#f6f4ef", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: active ? "white" : "#3d3d3d", fontSize: 13, fontWeight: "700" }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SearchRow({ item, saved, onPress, onSave }: { item: PropertyCard; saved: boolean; onPress: () => void; onSave: () => void }) {
  const place = [item.locality, item.city].filter(Boolean).join(", ") || "Location not added";
  const area = item.area ? `${Number(item.area).toLocaleString("en-IN")} ${item.area_unit === "sq_ft" ? "sq.ft" : item.area_unit}` : "";
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", backgroundColor: "white", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#efeae3" }}>
      <View style={{ width: 118, alignSelf: "stretch", minHeight: 108, backgroundColor: "#d7e3db" }}>
        {item.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: "100%", minHeight: 108 }} resizeMode="cover" /> : null}
        <ListingLabel label={listingBadge(item)} />
      </View>
      <View style={{ flex: 1, paddingVertical: 10, paddingLeft: 12, paddingRight: 8 }}>
        <Text numberOfLines={1} style={{ fontWeight: "800", color: "#1c1c1c", fontSize: 15 }}>{item.title}</Text>
        <Text style={{ color: "#146c36", fontWeight: "800", marginTop: 3, fontSize: 15 }}>{inr(item.price)}</Text>
        <Text numberOfLines={1} style={{ color: "#8a918c", fontSize: 12, marginTop: 3 }}>{place}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
          <MetaIcon name="bed-outline" value={item.bedrooms ?? "—"} />
          <MetaIcon name="water-outline" value={item.bathrooms ?? "—"} />
          {area ? <MetaIcon name="square-outline" value={area} /> : null}
        </View>
      </View>
      <Pressable onPress={onSave} hitSlop={8} style={{ justifyContent: "center", paddingRight: 12 }}>
        <Ionicons name={saved ? "heart" : "heart-outline"} size={20} color={saved ? "#e11d48" : "#9aa19c"} />
      </Pressable>
    </Pressable>
  );
}

function MetaIcon({ name, value }: { name: keyof typeof Ionicons.glyphMap; value: string | number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <Ionicons name={name} size={13} color="#8a918c" />
      <Text style={{ color: "#8a918c", fontSize: 11 }}>{value}</Text>
    </View>
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
      {loading ? <LogoLoader /> : <PropertyMap pins={pins} onOpen={onOpen} />}
    </View>
  );
}

export function DetailsScreen({ id, onSchedule }: { id: string; onSchedule: (propertyId: string) => void }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token, session } = useAuth();
  const requireLogin = useRequireLogin();
  const [item, setItem] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState(0);
  const [tab, setTab] = useState<"overview" | "amenities" | "location" | "documents">("overview");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
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

  async function send() {
    if (!token || !item) {
      setNote("Sign in to enquire.");
      return;
    }
    await api.inquire(item.id, { message: "I am interested in this property.", inquiry_type: "message", email: session?.user.email }, token);
    setNote("Inquiry sent to the owner.");
  }

  async function save() {
    if (!token || !item) {
      requireLogin("Sign in to save this property.");
      return;
    }
    if (item.is_favorite) await api.unfavorite(item.id, token);
    else await api.favorite(item.id, token);
    setItem(await api.property(item.id, token));
  }

  if (loading && !item) return <View style={{ flex: 1, backgroundColor: colors.page }}><LogoLoader /></View>;
  if (!item) return <View style={[styles.body, { backgroundColor: colors.page, flex: 1 }]}><Text>{note || "This property is not available."}</Text></View>;

  const photos = (item.images?.length ? item.images.map((image) => image.image_url) : [item.cover_image]).filter(Boolean) as string[];
  const video = item.images?.find((image) => image.image_type === "video");
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
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 108 }}>
        <View style={{ width: Dimensions.get("window").width, height: 340, backgroundColor: "#d7e3db" }}>
          {photos[photo] ? <Image source={{ uri: photos[photo] }} style={{ width: Dimensions.get("window").width, height: 340 }} resizeMode="cover" /> : null}
          <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <RoundIcon name="chevron-back" onPress={() => navigation.goBack()} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <RoundIcon name="share-social-outline" onPress={() => Share.share({ message: `${item.title}\n${place}\n${inr(item.price)}` })} />
              <Pressable onPress={save} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.is_favorite ? "#f97316" : "rgba(20,20,20,0.72)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="heart" size={20} color="white" />
              </Pressable>
            </View>
          </View>
          <View style={{ position: "absolute", left: 16, right: 16, bottom: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ backgroundColor: "rgba(20,20,20,0.72)", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>{photos.length ? `${photo + 1}/${photos.length}` : "0/0"}</Text>
            </View>
            <Pressable onPress={() => setPhoto(0)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "white", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Ionicons name="images-outline" size={15} color="#1c1c1c" />
              <Text style={{ fontWeight: "700", fontSize: 13 }}>Photos</Text>
            </Pressable>
            <Pressable onPress={() => { if (video) setNote(video.image_url); else setNote("No video for this property."); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(20,20,20,0.72)", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Ionicons name="videocam" size={15} color="white" />
              <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>Video</Text>
            </Pressable>
          </View>
          {photos.length > 1 ? (
            <View style={{ position: "absolute", top: insets.top + 56, bottom: 84, left: 0, right: 0, flexDirection: "row" }}>
              <Pressable style={{ flex: 1 }} onPress={() => setPhoto((index) => (index - 1 + photos.length) % photos.length)} />
              <Pressable style={{ flex: 1 }} onPress={() => setPhoto((index) => (index + 1) % photos.length)} />
            </View>
          ) : null}
        </View>
        <View style={{ marginTop: -22, backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ flex: 1, fontSize: 22, lineHeight: 28, fontWeight: "800", color: "#171717" }}>{item.title}</Text>
            <Pressable onPress={save} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#ffe8ea", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={item.is_favorite ? "heart" : "heart-outline"} size={20} color="#ef4444" />
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
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#f1eee8" }}>
        <Pressable onPress={() => phone ? Linking.openURL(`tel:${phone}`) : setNote("Phone number is not available.")} style={{ flex: 0.9, height: 48, borderWidth: 1, borderColor: "#e7e2d8", borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, backgroundColor: "white" }}>
          <Ionicons name="call-outline" size={16} color="#1c1c1c" />
          <Text style={{ fontWeight: "700", color: "#1c1c1c" }}>Call</Text>
        </Pressable>
        <Pressable onPress={() => phone ? Linking.openURL(`https://wa.me/${phone.replace(/^\+/, "")}`) : setNote("Phone number is not available.")} style={{ flex: 1.25, height: 48, backgroundColor: "#22c55e", borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
          <Ionicons name="logo-whatsapp" size={18} color="white" />
          <Text style={{ color: "white", fontWeight: "800" }}>WhatsApp</Text>
        </Pressable>
        <Pressable onPress={send} style={{ flex: 1.15, height: 48, backgroundColor: "#146c36", borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
          <Ionicons name="chatbubble-ellipses" size={16} color="white" />
          <Text style={{ color: "white", fontWeight: "800" }}>Enquire</Text>
        </Pressable>
      </View>
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
