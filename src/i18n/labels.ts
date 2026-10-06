import { getCopy } from "./active";

const kindKeys: Record<string, keyof ReturnType<typeof getCopy>["kinds"]> = {
  house: "house",
  apartment: "apartment",
  villa: "villa",
  shop: "shop",
  plot: "plot",
  land: "land",
  "residential-plot": "plot",
  "agricultural-land": "land",
  office: "office",
  warehouse: "warehouse",
  "other-property": "other",
  other: "other",
};

export function kindName(slug?: string | null) {
  const key = kindKeys[(slug || "").toLowerCase()];
  return key ? getCopy().kinds[key] : "";
}

const amenityKeys: Record<string, keyof ReturnType<typeof getCopy>["amenities"]> = {
  parking: "parking",
  garden: "garden",
  lift: "lift",
  security: "security",
  "power-backup": "powerBackup",
  cctv: "cctv",
  "swimming-pool": "swimmingPool",
  "club-house": "clubHouse",
  gym: "gym",
  "childrens-play-area": "playArea",
};

export function amenityName(slug: string, fallback: string) {
  const key = amenityKeys[slug];
  return key ? getCopy().amenities[key] : fallback;
}

const featureKeys: Record<string, keyof ReturnType<typeof getCopy>["listing"]> = {
  "Corner Plot": "cornerPlot",
  "Road Facing": "roadFacing",
  "Main Road": "mainRoad",
  "Gated Society": "gatedSociety",
};

export function featureName(key: string) {
  const field = featureKeys[key];
  return field ? String(getCopy().listing[field]) : key;
}

export function furnishingName(value: string) {
  const text = getCopy().listing;
  if (value === "furnished") return text.furnished;
  if (value === "semi_furnished") return text.semiFurnished;
  if (value === "unfurnished") return text.unfurnished;
  return value.replaceAll("_", " ");
}

export function possessionName(value: string) {
  const text = getCopy().listing;
  if (value === "Ready to move") return text.ready;
  if (value === "Under construction") return text.underConstruction;
  return value;
}

export function listingTypeName(type: string) {
  const text = getCopy().listingTypes;
  if (type === "rent") return text.forRent;
  if (type === "lease") return text.forLease;
  if (type === "pg") return text.pg;
  return text.forSale;
}
