import type { PropertyCard } from "../types/database";

type Place = PropertyCard & {
  address?: string | null;
  state?: string | null;
};

type Coordinate = { latitude: number; longitude: number };

const cityCenters: Record<string, Coordinate> = {
  rajkot: { latitude: 22.3039, longitude: 70.8022 },
  ahmedabad: { latitude: 23.0225, longitude: 72.5714 },
  surat: { latitude: 21.1702, longitude: 72.8311 },
  vadodara: { latitude: 22.3072, longitude: 73.1812 },
  gandhinagar: { latitude: 23.2156, longitude: 72.6369 },
  jamnagar: { latitude: 22.4707, longitude: 70.0577 },
  bhavnagar: { latitude: 21.7645, longitude: 72.1519 },
  junagadh: { latitude: 21.5222, longitude: 70.4579 },
  morbi: { latitude: 22.8119, longitude: 70.8236 },
  mumbai: { latitude: 19.076, longitude: 72.8777 },
  pune: { latitude: 18.5204, longitude: 73.8567 },
  delhi: { latitude: 28.6139, longitude: 77.209 },
  bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  bangalore: { latitude: 12.9716, longitude: 77.5946 },
  hyderabad: { latitude: 17.385, longitude: 78.4867 },
  chennai: { latitude: 13.0827, longitude: 80.2707 },
  kolkata: { latitude: 22.5726, longitude: 88.3639 },
  jaipur: { latitude: 26.9124, longitude: 75.7873 },
};

function savedCoordinate(item: Place): Coordinate | null {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

function near(a: Coordinate, b: Coordinate) {
  return Math.abs(a.latitude - b.latitude) < 0.45 && Math.abs(a.longitude - b.longitude) < 0.45;
}

function sameSpot(a: Coordinate, b: Coordinate) {
  return Math.abs(a.latitude - b.latitude) < 0.0015 && Math.abs(a.longitude - b.longitude) < 0.0015;
}

async function searchPlace(query: string, bias?: Coordinate): Promise<Coordinate | null> {
  const params = new URLSearchParams({ q: query, limit: "5", lang: "en" });
  if (bias) {
    params.set("lat", String(bias.latitude));
    params.set("lon", String(bias.longitude));
  }
  const response = await fetch(`https://photon.komoot.io/api/?${params}`);
  if (!response.ok) return null;
  const body = await response.json() as { features?: Array<{ properties?: { countrycode?: string }; geometry?: { coordinates?: number[] } }> };
  for (const feature of body.features || []) {
    if (feature.properties?.countrycode && feature.properties.countrycode !== "IN") continue;
    const [longitude, latitude] = feature.geometry?.coordinates || [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const point = { latitude, longitude };
    if (bias && !near(point, bias)) continue;
    return point;
  }
  return null;
}

async function cityBias(city: string, cache: Map<string, Coordinate>) {
  const key = city.trim().toLowerCase();
  if (!key) return cityCenters.rajkot;
  const known = cityCenters[key];
  if (known) return known;
  const cached = cache.get(key);
  if (cached) return cached;
  const found = await searchPlace(`${city}, India`) || cityCenters.rajkot;
  cache.set(key, found);
  return found;
}

function placeQuery(item: Place) {
  return [item.address, item.locality, item.city, item.state, "India"].filter((part) => part && part.trim()).join(", ");
}

function spread(points: Coordinate[]) {
  const used: Coordinate[] = [];
  return points.map((point) => {
    let next = point;
    let step = 0;
    while (used.some((item) => sameSpot(item, next)) && step < 16) {
      const angle = step * 2.399;
      const radius = 0.0022 * (1 + Math.floor(step / 8));
      next = {
        latitude: point.latitude + Math.sin(angle) * radius,
        longitude: point.longitude + (Math.cos(angle) * radius) / Math.cos((point.latitude * Math.PI) / 180),
      };
      step += 1;
    }
    used.push(next);
    return next;
  });
}

export async function placeSalePins(items: PropertyCard[]): Promise<PropertyCard[]> {
  const rows = items as Place[];
  const cache = new Map<string, Coordinate>();
  const resolved: Coordinate[] = [];

  for (const item of rows) {
    const city = (item.city || "").trim();
    const bias = await cityBias(city, cache);
    const saved = savedCoordinate(item);
    const crowded = saved ? resolved.some((point) => sameSpot(point, saved)) : false;
    let point = saved && !crowded ? saved : null;
    if (!point) {
      const query = placeQuery(item);
      if (query) point = await searchPlace(query, bias);
    }
    if (!point && item.locality && city) point = await searchPlace(`${item.locality}, ${city}, India`, bias);
    if (!point && city) point = await searchPlace(`${city}, India`, bias);
    resolved.push(point || saved || bias);
  }

  return rows.map((item, index) => {
    const point = spread(resolved)[index];
    return { ...item, latitude: String(point.latitude), longitude: String(point.longitude) };
  });
}
