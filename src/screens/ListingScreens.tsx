import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardFormScroll, KeyboardScreen, requestScrollFocusedInput, useKeyboardOverlap } from "../components/keyboard";
import { PageHeader, SkeletonBlock, styles } from "../components/ui";
import { useRazorpay } from "../components/RazorpayCheckout";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { getCopy, getLocale } from "../i18n/active";
import { fill } from "../i18n/format";
import { amenityName, featureName, furnishingName, kindName, possessionName } from "../i18n/labels";
import { api, inr, listingPrice, upgradeCharge, uploadMedia } from "../lib/api";
import { readCurrentPlace } from "../lib/location";
import { buttonShadow, colors } from "../theme";
import type { PropertyDetail } from "../types/database";

const kinds = [
  { slug: "house", label: "House", image: require("../../assets/splash-house.jpg") },
  { slug: "apartment", label: "Apartment", image: require("../../assets/hero-house.jpg") },
  { slug: "villa", label: "Villa", image: require("../../assets/splash-house.jpg") },
  { slug: "residential-plot", label: "Plot", image: require("../../assets/login-bg.jpg") },
  { slug: "agricultural-land", label: "Agricultural Land", image: require("../../assets/hero-house.jpg") },
  { slug: "shop", label: "Shop", image: require("../../assets/login-bg.jpg") },
  { slug: "office", label: "Office", image: require("../../assets/hero-house.jpg") },
  { slug: "warehouse", label: "Warehouse", image: require("../../assets/splash-house.jpg") },
  { slug: "other-property", label: "Other", image: require("../../assets/login-bg.jpg") },
];

const listings = [
  { id: "sale", title: "Sell", detail: "I want to sell this property", color: "#B56A45" },
  { id: "rent", title: "Rent", detail: "I want to rent this property", color: "#f97316" },
  { id: "lease", title: "Lease", detail: "I want to lease this property", color: "#f97316" },
  { id: "pg", title: "PG / Co-living", detail: "I want to rent as PG / Co-living", color: "#f97316" },
];

const amenityChoices = [
  { slug: "parking", label: "Parking" },
  { slug: "garden", label: "Garden" },
  { slug: "lift", label: "Lift" },
  { slug: "security", label: "Security" },
  { slug: "power-backup", label: "Power Backup" },
  { slug: "cctv", label: "CCTV" },
  { slug: "swimming-pool", label: "Swimming Pool" },
  { slug: "club-house", label: "Club House" },
  { slug: "gym", label: "Gym" },
  { slug: "childrens-play-area", label: "Children's Play Area" },
];

const featureChoices = ["Corner Plot", "Road Facing", "Main Road", "Gated Society"];

const documents = [
  { type: "sale_deed", label: "Sale Deed" },
  { type: "7_12", label: "7/12 Extract" },
  { type: "property_card", label: "Property Card" },
  { type: "tax_receipt", label: "Tax Receipt" },
  { type: "rera_certificate", label: "RERA Certificate" },
  { type: "other", label: "Other Document" },
] as const;

const listingPlans = [
  { id: "standard" as const, title: "Regular", tag: "" },
  { id: "premium" as const, title: "Premium", tag: "Premium" },
];

function planDetail(id: "standard" | "premium") {
  const text = getCopy().listing;
  const month = listingPrice(id, "month");
  const year = listingPrice(id, "year");
  const priceText = fill(text.planPrice, { month, year });
  return id === "premium" ? `${priceText}${text.premiumFirst}` : priceText;
}

function listingNeedsPayment(
  status: string,
  expiresAt: string | null,
  badge: "standard" | "premium",
  term: "month" | "year",
  savedBadge: "standard" | "premium",
  savedTerm: "month" | "year",
) {
  const live = status === "published" && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
  if (!live) return true;
  if (badge === "premium" && savedBadge !== "premium") return true;
  if (term === "year" && savedTerm !== "year") return true;
  return false;
}

function amountDue(
  status: string,
  expiresAt: string | null,
  badge: "standard" | "premium",
  term: "month" | "year",
  savedBadge: "standard" | "premium",
  savedTerm: "month" | "year",
) {
  const live = status === "published" && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
  return upgradeCharge(badge, term, live ? savedBadge : null, live ? savedTerm : null);
}

const green = colors.primary;
const page = colors.page;

export function AddScreen({ propertyId, onDone }: { propertyId?: string; onDone: () => void }) {
  const { t } = useI18n();
  const auth = useAuth();
  const pay = useRazorpay();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const keyboardOverlap = useKeyboardOverlap();
  const [step, setStep] = useState(0);
  const [categorySlug, setCategorySlug] = useState("house");
  const [listingType, setListingType] = useState("sale");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Rajkot");
  const [locality, setLocality] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bedrooms, setBedrooms] = useState("3");
  const [bathrooms, setBathrooms] = useState("3");
  const [balconies, setBalconies] = useState("1");
  const [area, setArea] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [year, setYear] = useState("");
  const [possession, setPossession] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState<"total" | "per_sqft">("total");
  const [negotiable, setNegotiable] = useState(true);
  const [listingBadge, setListingBadge] = useState<"standard" | "premium">("standard");
  const [listingTerm, setListingTerm] = useState<"month" | "year">("month");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [savedId, setSavedId] = useState(propertyId);
  const [listingStatus, setListingStatus] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [savedBadge, setSavedBadge] = useState<"standard" | "premium">("standard");
  const [savedTerm, setSavedTerm] = useState<"month" | "year">("month");
  const [maintenance, setMaintenance] = useState("");
  const [deposit, setDeposit] = useState("");
  const [amenities, setAmenities] = useState<Array<{ id: string; slug?: string; name: string }>>([]);
  const [pickedAmenitySlugs, setPickedAmenitySlugs] = useState<string[]>([]);
  const [pickedFeatures, setPickedFeatures] = useState<string[]>([]);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [video, setVideo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(Boolean(propertyId));
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    api.amenities().then((rows) => setAmenities(rows as Array<{ id: string; slug?: string; name: string }>)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!auth.token) return;
    api.wallet(auth.token).then((wallet) => setWalletBalance(wallet.balance)).catch(() => undefined);
  }, [auth.token]);

  useEffect(() => {
    if (!propertyId) return;
    api.property(propertyId, auth.token).then((item) => {
      setCategorySlug(item.category_slug || "house");
      setListingType(item.listing_type || "sale");
      setAddress(item.address || "");
      setCity(item.city || "");
      setLocality(item.locality || "");
      setPincode(item.pincode || "");
      if (item.latitude != null && item.latitude !== "") setLatitude(Number(item.latitude));
      if (item.longitude != null && item.longitude !== "") setLongitude(Number(item.longitude));
      setTitle(item.title || "");
      setDescription(item.description || "");
      setBedrooms(item.bedrooms != null ? String(item.bedrooms) : "");
      setBathrooms(item.bathrooms != null ? String(item.bathrooms) : "");
      setBalconies(item.balconies != null ? String(item.balconies) : "");
      setArea(item.area ? String(Number(item.area)) : "");
      setFurnishing(item.furnishing_status || "");
      setYear(item.construction_year ? String(item.construction_year) : "");
      setPossession(item.possession_status || "");
      setPrice(item.price ? String(Number(item.price)) : "");
      setNegotiable(Boolean(item.is_price_negotiable));
      const all = item.images || [];
      const clip = all.find((image) => image.image_type === "video");
      const photos = all.filter((image) => image.image_type !== "video").map((image) => image.image_url).filter(Boolean);
      setImages(photos.length ? photos : item.cover_image && item.cover_image !== clip?.image_url ? [item.cover_image] : []);
      setVideo(clip?.image_url || "");
      setPickedAmenitySlugs((item.amenities || []).map((amenity) => amenity.slug).filter((slug) => amenityChoices.some((choice) => choice.slug === slug)));
      setPickedFeatures((item.features || []).map((feature) => feature.feature_key).filter((key) => featureChoices.includes(key)));
      const badge = item.listing_label === "Premium" || item.is_premium ? "premium" : "standard";
      const term = item.listing_term === "year" ? "year" : "month";
      setListingBadge(badge);
      setSavedBadge(badge);
      setListingTerm(term);
      setSavedTerm(term);
      setListingStatus(item.status || "");
      setExpiresAt(item.expires_at ?? null);
    }).catch((err) => setError(err instanceof Error ? err.message : t.listing.openFailed)).finally(() => setOpening(false));
  }, [propertyId, auth.token]);

  async function pickPhoto() {
    if (!auth.token) {
      setError(t.listing.signInPhotos);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t.listing.photoPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsMultipleSelection: true });
    if (result.canceled) return;
    setBusy(true);
    try {
      const urls = await Promise.all(result.assets.map((asset) => uploadMedia(asset.uri, auth.token!, "image", asset.fileName, asset.mimeType)));
      setImages((current) => [...current, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.listing.uploadFailed);
    } finally {
      setBusy(false);
    }
  }

  async function pickVideo() {
    if (!auth.token) {
      setError(t.listing.signInVideo);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t.listing.photoPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], videoMaxDuration: 60 });
    if (result.canceled) return;
    setBusy(true);
    try {
      const asset = result.assets[0];
      const url = await uploadMedia(asset.uri, auth.token, "video", asset.fileName, asset.mimeType);
      setVideo(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.listing.uploadFailed);
    } finally {
      setBusy(false);
    }
  }

  async function pickDocument(type: string) {
    if (!auth.token) {
      setError(t.listing.signInDocs);
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const url = await uploadMedia(asset.uri, auth.token, "document", asset.name, asset.mimeType);
      setDocs((current) => ({ ...current, [type]: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.listing.uploadFailed);
    } finally {
      setBusy(false);
    }
  }

  function amenityId(slug: string, list = amenities) {
    return list.find((item) => item.slug === slug || item.name.toLowerCase().replace(/'/g, "") === slug.replace(/-/g, " "))?.id;
  }

  function toggleAmenity(slug: string) {
    setError("");
    setPickedAmenitySlugs((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  }

  async function useCurrentLocation() {
    setError("");
    setLocating(true);
    try {
      const place = await readCurrentPlace();
      if (place.address) setAddress(place.address);
      if (place.city) setCity(place.city);
      if (place.locality) setLocality(place.locality);
      if (place.pincode) setPincode(place.pincode);
      setLatitude(place.latitude);
      setLongitude(place.longitude);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.listing.locationFailed);
    } finally {
      setLocating(false);
    }
  }

  async function publish() {
    if (!auth.token) {
      setError(t.listing.signInPublish);
      return;
    }
    if (title.trim().length < 3) {
      setError(t.listing.titleShort);
      setStep(3);
      return;
    }
    if (images.length < 2) {
      setError(t.listing.needPhotos);
      setStep(4);
      return;
    }
    if (year && (Number(year) < 1800 || Number(year) > 2200)) {
      setError(t.listing.yearInvalid);
      setStep(3);
      return;
    }
    setBusy(true);
    setError("");
    try {
      let catalog = amenities;
      if (pickedAmenitySlugs.length && catalog.length === 0) {
        catalog = await api.amenities() as typeof amenities;
        setAmenities(catalog);
      }
      const amenityIds = pickedAmenitySlugs.map((slug) => amenityId(slug, catalog)).filter((id): id is string => Boolean(id));
      const badge = propertyId ? savedBadge : listingBadge;
      const term = propertyId ? savedTerm : listingTerm;
      const mustPay = listingNeedsPayment(listingStatus, expiresAt, badge, term, savedBadge, savedTerm);
      const live = listingStatus === "published" && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
      const payload = {
        category_slug: categorySlug,
        title: title.trim(),
        description,
        listing_type: listingType,
        price: price ? Number(price) : undefined,
        price_unit: priceUnit === "per_sqft" ? "per_sqft" : "total",
        is_price_negotiable: negotiable,
        area: area ? Number(area) : undefined,
        area_unit: "sq_ft",
        built_up_area: area ? Number(area) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        balconies: balconies ? Number(balconies) : undefined,
        furnishing_status: furnishing || undefined,
        construction_year: year ? Number(year) : undefined,
        possession_status: possession || undefined,
        status: live ? "published" : "draft",
        location: {
          address,
          city,
          locality,
          pincode,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
        },
        images: (images.length || video) ? [
          ...images.map((image_url, index) => ({ image_url, image_type: "gallery", is_cover: index === 0 })),
          ...(video ? [{ image_url: video, image_type: "video", is_cover: false }] : []),
        ] : undefined,
        amenity_ids: amenityIds,
        features: pickedFeatures.map((feature_key) => ({ feature_key })),
        pricing: price ? {
          price: Number(price),
          price_type: priceUnit === "per_sqft" ? "per_sqft" : listingType === "rent" ? "monthly_rent" : "sale",
          maintenance_charge: maintenance ? Number(maintenance) : undefined,
          security_deposit: deposit ? Number(deposit) : undefined,
          negotiable,
        } : undefined,
        documents: Object.keys(docs).length ? Object.entries(docs).map(([document_type, document_url]) => ({ document_type, document_url })) : undefined,
      };
      let id = savedId;
      if (id) await api.updateProperty(id, payload, auth.token);
      else {
        const created = await api.createProperty(payload, auth.token);
        id = created.id;
        setSavedId(created.id);
        setListingStatus("draft");
      }
      if (mustPay) {
        const fee = amountDue(listingStatus, expiresAt, badge, term, savedBadge, savedTerm);
        let balance = walletBalance ?? 0;
        if (balance < fee) {
          const order = await api.walletOrder(Math.max(1, Math.ceil(fee - balance)), auth.token);
          const paid = await pay({
            keyId: order.key_id,
            orderId: order.order_id,
            amount: order.amount,
            currency: order.currency,
            description: order.description,
            email: auth.session?.user.email || undefined,
          });
          const credited = await api.walletVerify({
            razorpay_order_id: paid.razorpay_order_id,
            razorpay_payment_id: paid.razorpay_payment_id,
            razorpay_signature: paid.razorpay_signature,
          }, auth.token);
          balance = credited.balance;
          setWalletBalance(balance);
        }
        const spent = await api.walletSpend(id, badge, term, auth.token);
        setWalletBalance(spent.balance);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.listing.publishFailed);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (step === 3 && title.trim().length < 3) {
      setError(t.listing.titleShort);
      return;
    }
    if (step === 4 && images.length < 2) {
      setError(t.listing.needPhotosNext);
      return;
    }
    setError("");
    if (step === 7) publish();
    else setStep(step + 1);
  }

  function leave() {
    if (step === 0) navigation.goBack();
    else setStep(step - 1);
  }

  function closeListing() {
    navigation.goBack();
  }

  function publishButtonLabel() {
    const badge = propertyId ? savedBadge : listingBadge;
    const term = propertyId ? savedTerm : listingTerm;
    const due = amountDue(listingStatus, expiresAt, badge, term, savedBadge, savedTerm);
    const needsPay = listingNeedsPayment(listingStatus, expiresAt, badge, term, savedBadge, savedTerm) && due > 0;
    if (!needsPay) return t.common.save;
    if ((walletBalance ?? 0) < due) return fill(t.listing.payNow, { amount: due });
    return fill(t.listing.useWallet, { amount: due });
  }

  const closeButton = (
    <Pressable onPress={closeListing} hitSlop={8} style={{ width: 46, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="close" size={24} color={colors.ink} />
    </Pressable>
  );

  if (opening) {
    return (
      <View style={{ flex: 1, backgroundColor: page }}>
        <PageHeader title={propertyId ? t.listing.edit : t.listing.create} onBack={leave} right={closeButton} />
        <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 16, gap: 12 }}>
          <SkeletonBlock height={8} radius={4} />
          <SkeletonBlock height={28} width="46%" radius={8} />
          <SkeletonBlock height={52} radius={14} />
          <SkeletonBlock height={52} radius={14} />
          <SkeletonBlock height={90} radius={14} />
          <SkeletonBlock height={52} radius={14} />
          <SkeletonBlock height={52} radius={14} />
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: "row", gap: 10, paddingBottom: 16 }}>
            <View style={{ flex: 1 }}><SkeletonBlock height={52} radius={14} /></View>
            <View style={{ flex: 1 }}><SkeletonBlock height={52} radius={14} /></View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardScreen style={{ backgroundColor: page }}>
      <PageHeader title={propertyId ? t.listing.edit : t.listing.create} onBack={leave} right={closeButton} />
      <KeyboardFormScroll style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: green, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>{step + 1}/8</Text>
          </View>
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e6e4de", overflow: "hidden" }}>
            <View style={{ width: `${((step + 1) / 8) * 100}%`, height: 4, backgroundColor: green }} />
          </View>
        </View>
        {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}
        {step === 0 && (
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", textAlign: "center", marginVertical: 18, color: colors.ink }}>{t.listing.what}</Text>
            <View style={{ gap: 12 }}>
              {[0, 1, 2].map((row) => (
                <View key={row} style={{ flexDirection: "row", gap: 10 }}>
                  {kinds.slice(row * 3, row * 3 + 3).map((item) => {
                    const selected = categorySlug === item.slug;
                    return (
                      <Pressable key={item.slug} onPress={() => setCategorySlug(item.slug)} style={{ flex: 1, alignItems: "center" }}>
                        <View style={{ width: "100%", aspectRatio: 1.15, borderRadius: 14, overflow: "hidden", borderWidth: selected ? 2 : 0, borderColor: green }}>
                          <Image source={item.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        </View>
                        <Text numberOfLines={2} style={{ textAlign: "center", marginTop: 6, minHeight: 36, fontWeight: "600", color: colors.ink, fontSize: 13 }}>{kindName(item.slug)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}
        {step === 1 && (
          <View>
            <Text style={heading}>{t.listing.type}</Text>
            {listings.map((item) => {
              const selected = listingType === item.id;
              return (
                <Pressable key={item.id} onPress={() => setListingType(item.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: selected ? colors.primarySoft : colors.card, borderRadius: 14, borderWidth: 1, borderColor: selected ? green : colors.line, padding: 14, marginBottom: 10 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? green : item.color, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: selected ? green : item.color }} />
                  </View>
                  <View>
                    <Text style={{ fontWeight: "800", color: colors.ink }}>{item.id === "sale" ? t.listing.sell : item.id === "rent" ? t.listing.rent : item.id === "lease" ? t.listing.lease : t.listing.pg}</Text>
                    <Text style={{ color: "#8a918c", marginTop: 2 }}>{item.id === "sale" ? t.listing.sellDetail : item.id === "rent" ? t.listing.rentDetail : item.id === "lease" ? t.listing.leaseDetail : t.listing.pgDetail}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {step === 2 && (
          <View>
            <Text style={heading}>{t.listing.location}</Text>
            <Pressable onPress={useCurrentLocation} disabled={locating} style={{ backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginBottom: 16, opacity: locating ? 0.6 : 1 }}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>{locating ? t.listing.finding : t.listing.useLocation}</Text>
            </Pressable>
            <Label text={t.listing.address} />
            <Input value={address} onChangeText={setAddress} placeholder={t.listing.addressPlaceholder} />
            <Label text={t.listing.city} />
            <Input value={city} onChangeText={setCity} placeholder="Rajkot" />
            <Label text={t.listing.area} />
            <Input value={locality} onChangeText={setLocality} placeholder={t.listing.areaPlaceholder} />
            <Label text={t.listing.pincode} />
            <Input value={pincode} onChangeText={setPincode} placeholder={t.listing.pincodePlaceholder} keyboardType="number-pad" />
            <View style={{ height: 110, borderRadius: 14, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
              <Ionicons name="location" size={28} color={colors.heart} />
            </View>
          </View>
        )}
        {step === 3 && (
          <View>
            <Text style={heading}>{t.listing.details}</Text>
            <Label text={t.listing.title} />
            <Input value={title} onChangeText={setTitle} placeholder={t.listing.titlePlaceholder} />
            <Label text={t.listing.description} />
            <TextInput value={description} onChangeText={setDescription} onFocus={requestScrollFocusedInput} placeholder={t.listing.descriptionPlaceholder} placeholderTextColor="#b0b6b1" multiline style={[box, { minHeight: 90, textAlignVertical: "top" }]} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Label text={t.listing.bedrooms} />
                <Input value={bedrooms} onChangeText={(value) => setBedrooms(value.replace(/\D/g, "").slice(0, 2))} placeholder="3" keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Label text={t.listing.bathrooms} />
                <Input value={bathrooms} onChangeText={(value) => setBathrooms(value.replace(/\D/g, "").slice(0, 2))} placeholder="2" keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Label text={t.listing.balconies} />
                <Input value={balconies} onChangeText={(value) => setBalconies(value.replace(/\D/g, "").slice(0, 2))} placeholder="1" keyboardType="number-pad" />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Label text={t.listing.builtUp} />
                <Input value={area} onChangeText={setArea} placeholder={t.listing.areaValuePlaceholder} keyboardType="number-pad" />
              </View>
              <Choice label={t.listing.furnishing} value={furnishing} placeholder={t.listing.select} options={["furnished", "semi_furnished", "unfurnished"]} format={furnishingName} onChange={setFurnishing} />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Label text={t.listing.year} />
                <Input value={year} onChangeText={(value) => setYear(value.replace(/\D/g, "").slice(0, 4))} placeholder="2024" keyboardType="number-pad" />
              </View>
              <Choice label={t.listing.possession} value={possession} placeholder={t.listing.select} options={["Ready to move", "Under construction"]} format={possessionName} onChange={setPossession} />
            </View>
          </View>
        )}
        {step === 4 && (
          <View>
            <Text style={heading}>{t.listing.media}</Text>
            <Pressable onPress={pickPhoto} style={{ borderWidth: 1, borderStyle: "dashed", borderColor: "#d9d4ca", borderRadius: 14, paddingVertical: 22, alignItems: "center", backgroundColor: "white" }}>
              <Ionicons name="cloud-upload-outline" size={22} color="#6e766f" />
              <Text style={{ fontWeight: "800", marginTop: 6 }}>{t.listing.uploadPhotos}</Text>
              <Text style={{ color: "#8a918c", marginTop: 2 }}>{t.listing.photosRequired}</Text>
            </Pressable>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {images.map((uri) => <Image key={uri} source={{ uri }} style={{ width: 96, height: 78, borderRadius: 12 }} />)}
              <Pressable onPress={pickPhoto} style={{ width: 96, height: 78, borderRadius: 12, backgroundColor: "white", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#eeeae2" }}>
                <Text style={{ fontSize: 28, color: "#9aa19c" }}>+</Text>
              </Pressable>
            </View>
            <Text style={{ fontWeight: "800", marginTop: 18, marginBottom: 8 }}>{t.listing.uploadVideo}</Text>
            <Pressable onPress={pickVideo} style={{ borderWidth: 1, borderStyle: "dashed", borderColor: "#d9d4ca", borderRadius: 14, height: 90, alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
              <Ionicons name="play-circle-outline" size={26} color={video ? green : "#b0b6b1"} />
              <Text style={{ color: video ? green : "#8a918c", marginTop: 4, fontWeight: "700" }}>{video ? t.listing.videoAdded : t.listing.addVideo}</Text>
            </Pressable>
          </View>
        )}
        {step === 5 && (
          <View>
            <Text style={heading}>{t.listing.pricing}</Text>
            <Label text={t.listing.price} />
            <Input value={price} onChangeText={setPrice} placeholder={t.listing.pricePlaceholder} keyboardType="number-pad" />
            <Label text={t.listing.priceUnit} />
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <Pressable onPress={() => setPriceUnit("total")} style={{ flex: 1, backgroundColor: priceUnit === "total" ? green : colors.card, borderRadius: 14, borderWidth: 1, borderColor: priceUnit === "total" ? green : colors.line, height: 52, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: priceUnit === "total" ? colors.white : colors.muted, fontWeight: "700" }}>{t.listing.total}</Text>
              </Pressable>
              <Pressable onPress={() => setPriceUnit("per_sqft")} style={{ flex: 1, backgroundColor: priceUnit === "per_sqft" ? green : colors.card, borderRadius: 14, borderWidth: 1, borderColor: priceUnit === "per_sqft" ? green : colors.line, height: 52, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: priceUnit === "per_sqft" ? colors.white : colors.muted, fontWeight: "700" }}>{t.listing.perSqft}</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setNegotiable((value) => !value)} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ionicons name={negotiable ? "checkbox" : "square-outline"} size={22} color={negotiable ? colors.primary : colors.faint} />
              <Text style={{ fontWeight: "700" }}>{t.listing.negotiable}</Text>
            </Pressable>
            <Label text={t.listing.maintenance} />
            <Input value={maintenance} onChangeText={setMaintenance} placeholder={t.listing.amountPlaceholder} keyboardType="number-pad" />
            <Label text={t.listing.deposit} />
            <Input value={deposit} onChangeText={setDeposit} placeholder={t.listing.amountPlaceholder} keyboardType="number-pad" />
            <Label text={t.listing.plan} />
            <Text style={{ color: "#8a918c", marginBottom: 10 }}>{propertyId ? t.listing.planLocked : fill(t.listing.planHint, { balance: walletBalance == null ? "..." : inr(walletBalance) })}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, opacity: propertyId ? 0.55 : 1 }} pointerEvents={propertyId ? "none" : "auto"}>
              {(["month", "year"] as const).map((option) => (
                <Pressable key={option} disabled={Boolean(propertyId)} onPress={() => setListingTerm(option)} style={{ flex: 1, backgroundColor: listingTerm === option ? green : colors.card, borderRadius: 14, borderWidth: 1, borderColor: listingTerm === option ? green : colors.line, minHeight: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }}>
                  <Text style={{ color: listingTerm === option ? colors.white : colors.muted, fontWeight: "700", textAlign: "center" }}>{option === "month" ? t.listing.oneMonth : t.listing.oneYear}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ opacity: propertyId ? 0.55 : 1 }} pointerEvents={propertyId ? "none" : "auto"}>
            {listingPlans.map((plan) => {
              const selected = listingBadge === plan.id;
              const full = listingPrice(plan.id, listingTerm);
              const priceNow = amountDue(listingStatus, expiresAt, plan.id, listingTerm, savedBadge, savedTerm);
              const credited = !propertyId && priceNow > 0 && priceNow < full;
              return (
                <Pressable key={plan.id} disabled={Boolean(propertyId)} onPress={() => setListingBadge(plan.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: selected ? colors.primarySoft : colors.card, borderRadius: 14, borderWidth: 1, borderColor: selected ? green : colors.line, padding: 14, marginBottom: 10 }}>
                  <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={selected ? green : "#c5c5c5"} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: colors.ink }}>{plan.id === "premium" ? t.common.premium : t.listing.regular}</Text>
                    <Text style={{ color: "#8a918c", marginTop: 2 }}>{planDetail(plan.id)}</Text>
                  </View>
                  {credited ? <Text style={{ color: "#8a918c", fontWeight: "700" }}>{fill(t.listing.priceNow, { amount: inr(priceNow) })}</Text> : plan.tag ? <View style={{ backgroundColor: "#f8e7c0", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}><Text style={{ color: "#8a5a12", fontWeight: "800", fontSize: 12 }}>{t.common.premium}</Text></View> : <Text style={{ color: "#8a918c", fontWeight: "700" }}>{inr(full)}</Text>}
                </Pressable>
              );
            })}
            </View>
          </View>
        )}
        {step === 6 && (
          <View>
            <Text style={heading}>{t.listing.amenities}</Text>
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 14 }}>
              <Text style={{ fontWeight: "800", marginBottom: 10 }}>{t.listing.amenitiesTitle}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {amenityChoices.map((item) => {
                  const checked = pickedAmenitySlugs.includes(item.slug);
                  return (
                    <Pressable key={item.slug} onPress={() => toggleAmenity(item.slug)} style={{ width: "50%", flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Ionicons name={checked ? "checkbox" : "square-outline"} size={20} color={checked ? green : "#c5c5c5"} />
                      <Text>{amenityName(item.slug, item.label)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ fontWeight: "800", marginBottom: 10 }}>{t.listing.features}</Text>
              {featureChoices.map((label) => {
                const checked = pickedFeatures.includes(label);
                return (
                  <Pressable key={label} onPress={() => setPickedFeatures((current) => checked ? current.filter((item) => item !== label) : [...current, label])} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Ionicons name={checked ? "checkbox" : "square-outline"} size={20} color={checked ? green : "#c5c5c5"} />
                    <Text>{featureName(label)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        {step === 7 && (
          <View>
            <Text style={heading}>{t.listing.documents}</Text>
            {documents.map((item) => (
              <View key={item.type} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                </View>
                <Text style={{ flex: 1, marginLeft: 10, fontWeight: "600", color: colors.ink }}>{docs[item.type] ? fill(t.listing.docAdded, { name: item.type === "sale_deed" ? t.listing.saleDeed : item.type === "7_12" ? t.listing.extract : item.type === "property_card" ? t.listing.propertyCard : item.type === "tax_receipt" ? t.listing.taxReceipt : item.type === "rera_certificate" ? t.listing.rera : t.listing.otherDoc }) : item.type === "sale_deed" ? t.listing.saleDeed : item.type === "7_12" ? t.listing.extract : item.type === "property_card" ? t.listing.propertyCard : item.type === "tax_receipt" ? t.listing.taxReceipt : item.type === "rera_certificate" ? t.listing.rera : t.listing.otherDoc}</Text>
                <Pressable onPress={() => pickDocument(item.type)}>
                  <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </KeyboardFormScroll>
      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 10, paddingBottom: keyboardOverlap > 0 ? 10 : Math.max(insets.bottom, 12), backgroundColor: page }}>
        <Pressable onPress={leave} style={{ flex: 1, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", backgroundColor: colors.card }}>
          <Text style={{ fontWeight: "700", color: colors.primary }}>{step === 0 ? t.common.cancel : t.common.back}</Text>
        </Pressable>
        <Pressable onPress={next} disabled={busy} style={({ pressed }) => ({ flex: 1, backgroundColor: pressed ? colors.primaryDark : green, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", opacity: busy ? 0.6 : 1, ...buttonShadow })}>
          <Text style={{ color: colors.white, fontWeight: "700" }}>{busy ? t.common.pleaseWait : step === 7 ? publishButtonLabel() : t.common.next}</Text>
        </Pressable>
      </View>
    </KeyboardScreen>
  );
}

const heading = { fontSize: 22, fontWeight: "800" as const, color: colors.ink, marginTop: 18, marginBottom: 14 };
const box = { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 14, minHeight: 52, color: colors.ink, marginBottom: 12 };

function Label({ text, focused }: { text: string; focused?: boolean }) {
  return <Text style={{ color: focused ? colors.primary : colors.ink, fontWeight: "600", marginBottom: 6 }}>{text}</Text>;
}

function Input({ value, onChangeText, placeholder, keyboardType }: { value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "number-pad" }) {
  const [focused, setFocused] = useState(false);
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.faint} keyboardType={keyboardType} onFocus={() => { setFocused(true); requestScrollFocusedInput(); }} onBlur={() => setFocused(false)} style={[box, focused && { borderColor: colors.primary }]} />;
}

function Choice({ label, value, placeholder, options, format, onChange }: { label: string; value: string; placeholder?: string; options: string[]; format?: (value: string) => string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Label text={label} />
      <Pressable onPress={() => setOpen((current) => !current)} style={[box, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: open ? 4 : 12 }]}>
        <Text style={{ color: value ? colors.ink : colors.faint }}>{value ? (format ? format(value) : value.replaceAll("_", " ")) : placeholder || getCopy().listing.select}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.faint} />
      </Pressable>
      {open ? options.map((option) => (
        <Pressable key={option} onPress={() => { onChange(option); setOpen(false); }} style={{ paddingVertical: 8, paddingHorizontal: 8 }}>
          <Text>{format ? format(option) : option.replaceAll("_", " ")}</Text>
        </Pressable>
      )) : null}
    </View>
  );
}

const visitTimes = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM"];

function upcomingDates() {
  return Array.from({ length: 14 }, (_, index) => {
    const value = new Date();
    value.setDate(value.getDate() + index + 1);
    value.setHours(0, 0, 0, 0);
    return value;
  });
}

export function ScheduleScreen({ id, onDone }: { id: string; onDone: () => void }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const dates = upcomingDates();
  const [item, setItem] = useState<PropertyDetail | null>(null);
  const [date, setDate] = useState(dates[0]);
  const [time, setTime] = useState("11:00 AM");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.property(id, token).then(setItem).catch(() => setItem(null));
  }, [id, token]);

  function selectedDate() {
    const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (match[3].toUpperCase() === "PM" && hours < 12) hours += 12;
    if (match[3].toUpperCase() === "AM" && hours === 12) hours = 0;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
  }

  async function submit() {
    if (!token) {
      setError(t.listing.signInVisit);
      return;
    }
    const parsed = selectedDate();
    if (!parsed || Number.isNaN(parsed.getTime())) {
      setError(t.listing.badDate);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.visit(id, { scheduled_at: parsed.toISOString(), notes }, token);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.listing.scheduleFailed);
    } finally {
      setBusy(false);
    }
  }

  const place = [item?.locality, item?.city].filter(Boolean).join(", ");
  return (
    <KeyboardScreen style={{ backgroundColor: colors.page }}>
      <PageHeader title={t.listing.scheduleTitle} subtitle={t.listing.scheduleSubtitle} />
      <KeyboardFormScroll style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 12, flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ width: 88, height: 88, borderRadius: 16, overflow: "hidden", backgroundColor: colors.secondary }}>
            {item?.cover_image ? <Image source={{ uri: item.cover_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="home-outline" size={26} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontWeight: "800", fontSize: 16, color: colors.ink }} numberOfLines={2}>{item?.title || t.common.property}</Text>
            {place ? <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={1}>{place}</Text> : null}
            <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 16, marginTop: 6 }}>{inr(item?.price)}</Text>
          </View>
        </View>

        <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16, marginTop: 22, marginBottom: 10 }}>Preferred date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {dates.map((option) => {
            const active = option.getTime() === date.getTime();
            return (
              <Pressable key={option.toISOString()} onPress={() => setDate(option)} style={{ width: 68, borderRadius: 16, paddingVertical: 12, alignItems: "center", backgroundColor: active ? colors.primary : colors.card, borderWidth: 1, borderColor: active ? colors.primary : colors.line }}>
                <Text style={{ color: active ? "rgba(255,255,255,0.8)" : colors.muted, fontSize: 12, fontWeight: "700" }}>{option.toLocaleDateString(getLocale(), { weekday: "short" })}</Text>
                <Text style={{ color: active ? colors.white : colors.ink, fontSize: 18, fontWeight: "800", marginTop: 2 }}>{option.getDate()}</Text>
                <Text style={{ color: active ? "rgba(255,255,255,0.8)" : colors.muted, fontSize: 12, fontWeight: "600" }}>{option.toLocaleDateString(getLocale(), { month: "short" })}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16, marginTop: 22, marginBottom: 10 }}>Preferred time</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {visitTimes.map((option) => {
            const active = option === time;
            return (
              <Pressable key={option} onPress={() => setTime(option)} style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: active ? colors.primary : colors.card, borderWidth: 1, borderColor: active ? colors.primary : colors.line }}>
                <Text style={{ color: active ? colors.white : colors.ink, fontWeight: "700" }}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16, marginTop: 22, marginBottom: 10 }}>Message</Text>
        <TextInput value={notes} onChangeText={setNotes} onFocus={requestScrollFocusedInput} placeholder={t.listing.notesPlaceholder} placeholderTextColor={colors.faint} multiline style={{ minHeight: 110, textAlignVertical: "top", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: colors.ink, fontSize: 15 }} />
        {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}
        <Pressable onPress={submit} disabled={busy} style={({ pressed }) => ({ marginTop: 22, backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", opacity: busy ? 0.6 : 1, ...buttonShadow })}>
          <Text style={{ color: colors.white, fontWeight: "700", fontSize: 16 }}>{busy ? t.common.requesting : t.listing.requestVisit}</Text>
        </Pressable>
      </KeyboardFormScroll>
    </KeyboardScreen>
  );
}
