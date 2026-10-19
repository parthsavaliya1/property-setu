import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { api } from "../lib/api";
import { colors } from "../theme";

export function BlockedUsers({ token }: { token?: string | null }) {
  const [rows, setRows] = useState<{ blocked_id: string; full_name: string | null }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setRows([]);
    if (token) api.blocks(token).then(items => { if (active) setRows(items); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [token]);
  async function unblock(id: string) {
    if (!token || busy) return;
    setBusy(id); setError("");
    try { await api.unblockUser(id, token); setRows(current => current.filter(row => row.blocked_id !== id)); }
    catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(null); }
  }
  if (!token) return null;
  return <View style={{ padding: 18, marginTop: 14, backgroundColor: colors.card, borderRadius: 18, gap: 12 }}>
    <Text style={{ fontWeight: "800", fontSize: 18, color: colors.ink }}>Blocked users</Text>
    {!rows.length && !error ? <Text style={{ color: colors.muted }}>No blocked users.</Text> : null}
    {rows.map(row => <View key={row.blocked_id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text style={{ flex: 1, color: colors.ink }}>{row.full_name || "User"}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(busy), busy: busy === row.blocked_id }} disabled={Boolean(busy)} onPress={() => void unblock(row.blocked_id)} style={{ padding: 10, flexDirection: "row", alignItems: "center", gap: 8, opacity: busy ? 0.65 : 1 }}>
        {busy === row.blocked_id ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        <Text style={{ color: colors.primary }}>{busy === row.blocked_id ? "Unblocking…" : "Unblock"}</Text>
      </Pressable>
    </View>)}
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
  </View>;
}
