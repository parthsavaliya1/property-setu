import { Alert, Platform } from "react-native";

export function confirmDataUse(title: string, message: string, accept = "Continue") {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise<boolean>(resolve => Alert.alert(title, message, [
    { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
    { text: accept, onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
