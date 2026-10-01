import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { EmptyState, ListSkeleton, PageHeader, styles } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { colors } from "../theme";
import type { ChatMessage, ChatThread } from "../types/database";

export function ChatsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { token } = useAuth();
  const [items, setItems] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    api.chats(token).then((rows) => {
      if (active) setItems(rows);
    }).catch(() => {
      if (active) setItems([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <PageHeader title="Messages" />
      <ScrollView contentContainerStyle={styles.body}>
        {loading ? <ListSkeleton /> : items.map((item) => (
          <Pressable key={item.id} onPress={() => onOpen(item.id)} style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.title}>{item.other_name || "PropertySetu user"}</Text>
              <Text style={styles.meta}>{item.property_title}</Text>
              <Text numberOfLines={1} style={{ color: colors.ink, marginTop: 6 }}>{item.last_message || "No messages yet"}</Text>
            </View>
          </Pressable>
        ))}
        {!loading && items.length === 0 ? <EmptyState kind="search" /> : null}
      </ScrollView>
    </View>
  );
}

export function ChatScreen({ conversationId, propertyId, buyerId }: { conversationId?: string; propertyId?: string; buyerId?: string }) {
  const { token, session } = useAuth();
  const [threadId, setThreadId] = useState(conversationId);
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Sign in to chat.");
      return;
    }
    const sessionToken = token;
    let active = true;
    async function load() {
      try {
        const id = conversationId || (propertyId ? (await api.openChat(propertyId, sessionToken, buyerId)).id : "");
        if (!id) throw new Error("Chat not found");
        if (!active) return;
        setThreadId(id);
        setItems(await api.messages(id, sessionToken));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not open chat");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [conversationId, propertyId, buyerId, token]);

  async function send() {
    if (!token || !threadId || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    setError("");
    try {
      const message = await api.sendMessage(threadId, text, token);
      setItems((current) => [...current, { ...message, mine: true }]);
    } catch (err) {
      setDraft(text);
      setError(err instanceof Error ? err.message : "Could not send");
    }
  }

  const mineId = session?.user.id;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.page }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <PageHeader title="Chat" />
      {loading ? <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}><ListSkeleton /></View> : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }} keyboardShouldPersistTaps="handled">
          {items.map((item) => {
            const mine = item.mine ?? item.sender_id === mineId;
            return (
              <View key={item.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: mine ? colors.primary : colors.card, borderRadius: 16, borderWidth: mine ? 0 : 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: mine ? colors.white : colors.ink }}>{item.body}</Text>
              </View>
            );
          })}
          {!items.length && !error ? <Text style={styles.meta}>Say hello. The other person gets a notification.</Text> : null}
        </ScrollView>
      )}
      {error ? <Text style={[styles.error, { marginHorizontal: 16 }]}>{error}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8, padding: 16, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.lineSoft }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message"
          placeholderTextColor={colors.faint}
          style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, color: colors.ink }}
        />
        <Pressable onPress={send} style={({ pressed }) => ({ backgroundColor: pressed ? colors.primaryDark : colors.primary, borderRadius: 14, paddingHorizontal: 16, minHeight: 52, justifyContent: "center" })}>
          <Text style={{ color: colors.white, fontWeight: "700" }}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
