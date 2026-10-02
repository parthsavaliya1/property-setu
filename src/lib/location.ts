import { useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";
import * as Location from "expo-location";
import { cityName } from "./api";

export type CurrentPlace = {
  address: string;
  city: string;
  locality: string;
  pincode: string;
  latitude: number;
  longitude: number;
};

type LocationFailure = Error & { denied?: boolean; canAskAgain?: boolean };

const LOCATION_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), LOCATION_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function readCurrentPlace(): Promise<CurrentPlace> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    const error = new Error("Location permission is required.") as LocationFailure;
    error.denied = true;
    error.canAskAgain = permission.canAskAgain !== false;
    throw error;
  }
  const position = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    "Could not read your location.",
  );
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

export function useBrowseCity(fallbackCity: string) {
  const [city, setCity] = useState(fallbackCity);
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const waitingForSettings = useRef(false);

  useEffect(() => {
    let active = true;
    readCurrentPlace()
      .then((place) => {
        if (!active) return;
        setCity(cityName(place.city) || fallbackCity);
        setDenied(false);
      })
      .catch((err: LocationFailure) => {
        if (!active) return;
        setCity(fallbackCity);
        const permissionDenied = Boolean(err?.denied) || (err instanceof Error && err.message.toLowerCase().includes("permission"));
        setDenied(permissionDenied);
        setCanAskAgain(err?.canAskAgain !== false);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [attempt, fallbackCity]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !waitingForSettings.current) return;
      waitingForSettings.current = false;
      setAttempt((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);

  return {
    city,
    ready,
    denied,
    canAskAgain,
    retry: () => {
      if (!canAskAgain) {
        waitingForSettings.current = true;
        void Linking.openSettings();
        return;
      }
      setAttempt((value) => value + 1);
    },
  };
}
