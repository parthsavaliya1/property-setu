import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name || "PropertySetu",
  slug: config.slug || "property-setu",
  extra: { ...config.extra, mapsConfigured: Boolean(process.env.GOOGLE_MAPS_ANDROID_API_KEY || config.android?.config?.googleMaps?.apiKey) },
  android: {
    ...config.android,
    ...(process.env.GOOGLE_MAPS_ANDROID_API_KEY ? {
      config: { ...config.android?.config, googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY } },
    } : {}),
    // EAS file environment variable: path to the actual Firebase Android config.
    ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
  },
});
