import Constants from "expo-constants";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import { api } from "./api";

type PushData = Record<string, string>;

function readData(value: object | null | undefined): PushData {
  const next: PushData = {};
  if (!value) return next;
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") next[key] = item;
  }
  return next;
}

function projectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

function runningInExpoGo() {
  const ownership = Constants.appOwnership;
  const environment = Constants.executionEnvironment;
  return isRunningInExpoGo() || ownership === "expo" || environment === "storeClient";
}

export async function registerPushToken(authToken: string) {
  if (Platform.OS === "web" || runningInExpoGo()) return;
  const id = projectId();
  if (!id) return;
  try {
    const Device = await import("expo-device");
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "PropertySetu",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
        showBadge: true,
      });
    }
    if (!Device.isDevice) return;
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return;
    const push = await Notifications.getExpoPushTokenAsync({ projectId: id });
    if (!push.data) return;
    await api.savePushToken(push.data, Platform.OS === "ios" ? "ios" : "android", authToken);
  } catch {
    /* a failed token registration leaves in-app notifications working */
  }
}

export function subscribePushOpens(onOpen: (data: PushData) => void) {
  if (Platform.OS === "web" || runningInExpoGo()) return () => undefined;
  let remove: () => void = () => undefined;
  let active = true;
  import("expo-notifications").then((Notifications) => {
    if (!active) return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      onOpen(readData(response.notification.request.content.data));
    });
    remove = () => {
      subscription.remove();
    };
  }).catch(() => undefined);
  return () => {
    active = false;
    remove();
  };
}
