import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const KEY = "propertyhub.anonKey";

// Public client values, same idea as vadi-hisab compiling its API address into the app.
// The anon key is safe in the app. Row security on the database is what protects data.
const SUPABASE_URL = "https://zjjjifzkwdlmhwmupmhj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqamppZnprd2RsbWh3bXVwbWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NTg3MTQsImV4cCI6MjEwNjIzNDcxNH0.OKp6GukRvQXPJmR8K3vjhQ_OnQ67VU5YAZncOkWGCPc";

export function supabaseUrl() {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || SUPABASE_URL;
}

export async function readAnonKey() {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY || (await AsyncStorage.getItem(KEY)) || "";
}

let client: SupabaseClient | null = null;
let clientKey = "";

export async function getSupabase() {
  const key = await readAnonKey();
  if (!key) return null;
  if (!client || clientKey !== key) {
    clientKey = key;
    client = createClient(supabaseUrl(), key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
  }
  return client;
}

export async function saveAnonKey(key: string) {
  await AsyncStorage.setItem(KEY, key.trim());
  client = null;
  clientKey = "";
}

export async function uploadPropertyImage(uri: string, userId: string) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Add the Supabase anon key before uploading photos.");
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("property-images").upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;
}

export function deviceType() {
  if (Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web") return Platform.OS;
  return "other";
}
