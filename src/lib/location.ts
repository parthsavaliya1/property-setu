import * as Location from "expo-location";

export type CurrentPlace = {
  address: string;
  city: string;
  locality: string;
  pincode: string;
  latitude: number;
  longitude: number;
};

export async function readCurrentPlace(): Promise<CurrentPlace> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error("Location permission is required.");
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const places = await Location.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
  const place = places[0];
  const street = [place?.name, place?.street].filter(Boolean).join(", ");
  return {
    address: street || place?.formattedAddress || place?.street || "",
    city: place?.city || place?.subregion || place?.district || "",
    locality: place?.district || place?.subregion || place?.name || "",
    pincode: place?.postalCode || "",
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}
