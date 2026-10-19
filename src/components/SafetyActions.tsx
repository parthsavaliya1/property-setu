import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { colors } from "../theme";

const reasons = [
  ["fraud", "Scam or fraud"], ["inappropriate", "Abusive or inappropriate content"],
  ["fake_property", "Fake listing"], ["wrong_price", "Incorrect price"],
  ["wrong_location", "Incorrect location"], ["duplicate", "Duplicate listing"],
  ["already_sold", "No longer available"], ["other", "Other concern"],
] as const;

export function SafetyActions({ userId, propertyId, conversationId, messageId, token, blocked = false, onChanged, onSignIn, onShare, onDelete, hideSafety = false, floating = false, directReport = false }: {
  userId: string; propertyId?: string; conversationId?: string; messageId?: string;
  token?: string | null; blocked?: boolean; onChanged?: () => void; onSignIn?: () => void;
  onShare?: () => void; onDelete?: () => void; hideSafety?: boolean; floating?: boolean;
  directReport?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"report" | "block">("report");
  const [reason, setReason] = useState("fraud");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState(false);
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState<true | null>(null);
  function showMenu() {
    setDone(false);
    setMenu(true);
  }
  function show(nextMode: "report" | "block") {
    setMenu(null);
    if (!token) { onSignIn?.(); return; }
    setMode(nextMode);
    setNotice(""); setDone(false); setOpen(true);
  }
  async function submit() {
    if (!token || busy) return;
    setBusy(true); setNotice("");
    try {
      if (mode === "block") {
        if (blocked) await api.unblockUser(userId, token);
        else await api.blockUser(userId, token);
        setNotice(blocked ? "User unblocked." : "User blocked. Messages and interactions between you are disabled.");
      } else {
        if (propertyId) await api.report(propertyId, { reason, description }, token);
        else await api.reportUser(userId, { reason, description, conversation_id: conversationId, message_id: messageId }, token);
        setNotice("Report submitted to the PropertySetu moderation team. Thank you.");
      }
      setDone(true);
    } catch (err) { setNotice(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  function close() { if (busy) return; setMenu(null); setOpen(false); if (done) onChanged?.(); }
  return <>
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel={directReport ? "Report listing" : "More options"} accessibilityState={{ expanded: directReport ? open : Boolean(menu) }} onPress={directReport ? () => show("report") : showMenu} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: floating ? "rgba(20,20,20,0.72)" : "transparent", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={directReport ? "flag-outline" : "ellipsis-vertical"} size={22} color={floating ? "white" : colors.ink} />
      </Pressable>
    </View>
    <Modal visible={Boolean(menu) || open} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      {menu ? <View style={{ flex: 1 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close options" onPress={() => setMenu(null)} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
        {menu ? <View accessibilityViewIsModal style={{ position: "absolute", top: insets.top + 64, right: Math.max(insets.right, 12), width: 208, paddingVertical: 6, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, elevation: 8, shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
          {onShare ? <>
            <Pressable accessibilityRole="button" onPress={() => { setMenu(null); onShare(); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 48 }}>
              <Ionicons name="share-social-outline" size={20} color={colors.ink} />
              <Text style={{ color: colors.ink, fontWeight: "600" }}>Share</Text>
            </Pressable>
            {!hideSafety ? <View style={{ height: 1, marginHorizontal: 12, backgroundColor: colors.line }} /> : null}
          </> : null}
          {onDelete ? <Pressable accessibilityRole="button" onPress={() => { setMenu(null); onDelete(); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 48 }}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={{ color: colors.danger, fontWeight: "600" }}>Delete listing</Text>
          </Pressable> : null}
          {!hideSafety ? <>
          <Pressable accessibilityRole="button" onPress={() => show("report")} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 48 }}>
            <Ionicons name="flag-outline" size={20} color={colors.ink} />
            <Text style={{ color: colors.ink, fontWeight: "600" }}>Report {propertyId ? "listing" : "user"}</Text>
          </Pressable>
          <View style={{ height: 1, marginHorizontal: 12, backgroundColor: colors.line }} />
          <Pressable accessibilityRole="button" onPress={() => show("block")} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 48 }}>
            <Ionicons name="ban-outline" size={20} color={colors.danger} />
            <Text style={{ color: colors.danger, fontWeight: "600" }}>{blocked ? "Unblock" : "Block"} user</Text>
          </Pressable>
          </> : null}
        </View> : null}
      </View> : <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <ScrollView style={{ flexGrow: 0, maxHeight: "85%", backgroundColor: colors.card, borderRadius: 18 }} contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "800", color: colors.ink }}>Safety options</Text>
          {!done && <>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable disabled={busy} onPress={() => setMode("report")}><Text style={{ color: mode === "report" ? colors.primary : colors.muted }}>Report {propertyId ? "listing" : "user"}</Text></Pressable>
              <Pressable disabled={busy} onPress={() => setMode("block")}><Text style={{ color: mode === "block" ? colors.primary : colors.muted }}>{blocked ? "Unblock" : "Block"} user</Text></Pressable>
            </View>
            {mode === "report" ? <>
              {(propertyId ? reasons : reasons.filter(([key]) => ["fraud", "inappropriate", "other"].includes(key))).map(([key, label]) =>
                <Pressable key={key} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: reason === key }} onPress={() => setReason(key)}><Text style={{ color: colors.ink }}>{reason === key ? "●" : "○"} {label}</Text></Pressable>)}
              <TextInput accessibilityLabel="Report details" placeholder="Tell us what happened (optional)" value={description} onChangeText={setDescription} maxLength={2000} multiline editable={!busy} style={{ borderWidth: 1, borderColor: colors.line, padding: 12, borderRadius: 10, minHeight: 80, color: colors.ink }} />
            </> : <Text style={{ color: colors.muted }}>{blocked ? "Allow messages and interactions with this user again?" : "Prevent messages and interactions with this user? You can unblock them later from About us."}</Text>}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => void submit()} style={{ backgroundColor: colors.primary, padding: 14, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.75 : 1 }}>
              {busy ? <ActivityIndicator size="small" color="white" /> : null}
              <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>{busy ? mode === "report" ? "Reporting…" : blocked ? "Unblocking…" : "Blocking…" : mode === "report" ? "Submit report" : blocked ? "Unblock user" : "Block user"}</Text>
            </Pressable>
          </>}
          {notice ? <Text accessibilityLiveRegion="polite" style={{ color: done ? colors.ink : colors.danger }}>{notice}</Text> : null}
          <Pressable disabled={busy} onPress={close} style={{ padding: 10 }}><Text style={{ color: colors.primary, textAlign: "center" }}>Close</Text></Pressable>
        </ScrollView>
      </View>}
    </Modal>
  </>;
}
