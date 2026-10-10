import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardScreen, useKeyboardOverlap } from "../components/keyboard";
import { VoiceTextInput } from "../components/VoiceField";
import { io, type Socket } from "socket.io-client";
import { ListSkeleton } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { getCopy, getLocale } from "../i18n/active";
import { fill } from "../i18n/format";
import { api, apiBase, uploadMedia } from "../lib/api";
import { colors } from "../theme";
import type { ChatMessage, ChatThread } from "../types/database";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];
const MORE_REACTIONS = [
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "😂", "🤣", "😊", "😍", "🥰", "😘", "😭", "😢",
  "😮", "😡", "😤", "🙄", "😅", "🤔", "😎", "🥳",
  "👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "✌️",
  "🔥", "✨", "💯", "🎉", "👀", "💬", "📷",
];

type PendingFile = {
  uri: string;
  name: string;
  mime?: string | null;
  kind: "image" | "document";
};

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatStamp(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const month = date.toLocaleDateString(getLocale(), { month: "short" }).toUpperCase();
  const time = date.toLocaleTimeString(getLocale(), { hour: "numeric", minute: "2-digit" });
  return `${date.getDate()} ${month} AT ${time}`;
}

function clock(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString(getLocale(), { hour: "numeric", minute: "2-digit" });
}

function threadWhen(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  if (sameDay(date, now)) return clock(value);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return getCopy().common.yesterday;
  return date.toLocaleDateString(getLocale(), { day: "numeric", month: "short" });
}

function dayLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (sameDay(date, now)) return getCopy().common.today;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return getCopy().common.yesterday;
  return date.toLocaleDateString(getLocale(), { day: "numeric", month: "long" });
}

function initial(name?: string | null) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  return letter || "?";
}

function quoteText(item: Pick<ChatMessage, "deleted" | "body" | "attachment_kind" | "attachment_name" | "reply_deleted" | "reply_body" | "reply_kind" | "reply_name"> & { useReply?: boolean }) {
  if (item.useReply) {
    if (item.reply_deleted) return getCopy().chat.deleted;
    if (item.reply_body?.trim()) return item.reply_body.trim();
    if (item.reply_kind === "image") return getCopy().common.photo;
    if (item.reply_kind === "document") return item.reply_name || getCopy().common.document;
    return getCopy().common.message;
  }
  if (item.deleted) return getCopy().chat.deleted;
  if (item.body?.trim()) return item.body.trim();
  if (item.attachment_kind === "image") return getCopy().common.photo;
  if (item.attachment_kind === "document") return item.attachment_name || getCopy().common.document;
  return getCopy().common.message;
}

function addMessage(current: ChatMessage[], message: ChatMessage, mineId?: string) {
  const next = { ...message, mine: message.mine ?? message.sender_id === mineId };
  const index = current.findIndex((row) => row.id === next.id);
  if (index === -1) return [...current, next];
  const copy = current.slice();
  copy[index] = { ...copy[index], ...next, reactions: next.reactions ?? copy[index].reactions };
  return copy;
}

function markDeleted(current: ChatMessage[], messageId: string) {
  return current.map((row) => {
    if (row.id === messageId) {
      return { ...row, deleted: true, body: "", attachment_url: null, attachment_name: null, attachment_kind: null };
    }
    if (row.reply_to_id === messageId) {
      return { ...row, reply_deleted: true, reply_body: "", reply_kind: null, reply_name: null };
    }
    return row;
  });
}

export function ChatsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink }}>{t.chat.title}</Text>
          <Text style={{ marginTop: 1, color: colors.muted, fontSize: 13 }}>{items.length ? fill(items.length === 1 ? t.chat.one : t.chat.many, { count: items.length }) : t.chat.yours}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {loading ? <View style={{ padding: 16 }}><ListSkeleton /></View> : null}
        {!loading && items.length === 0 ? (
          <View style={{ alignItems: "center", padding: 40 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="chatbubbles-outline" size={36} color={colors.primary} />
            </View>
            <Text style={{ marginTop: 14, fontSize: 18, fontWeight: "800", color: colors.ink }}>{t.chat.empty}</Text>
            <Text style={{ marginTop: 6, color: colors.muted, textAlign: "center" }}>{t.chat.emptyHint}</Text>
          </View>
        ) : null}
        {!loading ? items.map((item) => (
          <Pressable key={item.id} onPress={() => onOpen(item.id)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed ? colors.page : colors.card, borderBottomWidth: 1, borderBottomColor: colors.lineSoft })}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {item.other_avatar ? <Image source={{ uri: item.other_avatar }} style={{ width: 52, height: 52 }} /> : <Text style={{ color: colors.primaryDark, fontWeight: "800", fontSize: 20 }}>{initial(item.other_name)}</Text>}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: "800", color: colors.ink }}>{item.other_name || t.chat.user}</Text>
                <Text style={{ color: colors.faint, fontSize: 12, fontWeight: "600" }}>{threadWhen(item.last_at || item.created_at)}</Text>
              </View>
              <Text numberOfLines={1} style={{ marginTop: 2, color: colors.muted, fontSize: 13 }}>{item.property_title || t.common.property}</Text>
              <Text numberOfLines={1} style={{ marginTop: 3, color: item.last_message === "This message was deleted" ? colors.faint : colors.ink, fontSize: 14, fontStyle: item.last_message === "This message was deleted" ? "italic" : "normal" }}>
                {item.last_message === "This message was deleted" ? t.chat.deleted : item.last_message || t.chat.none}
              </Text>
            </View>
          </Pressable>
        )) : null}
      </ScrollView>
    </View>
  );
}

export function ChatScreen({ conversationId, propertyId, buyerId }: { conversationId?: string; propertyId?: string; buyerId?: string }) {
  const { t } = useI18n();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const keyboardOverlap = useKeyboardOverlap();
  const { token, session } = useAuth();
  const [threadId, setThreadId] = useState(conversationId);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const mineId = session?.user.id;

  useEffect(() => {
    if (keyboardOverlap <= 0) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [keyboardOverlap]);
  const canSend = Boolean(draft.trim() || pending) && !sending;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError(t.chat.signIn);
      return;
    }
    const sessionToken = token;
    let active = true;
    async function load() {
      try {
        const id = conversationId || (propertyId ? (await api.openChat(propertyId, sessionToken, buyerId)).id : "");
        if (!id) throw new Error(t.chat.notFound);
        if (!active) return;
        setThreadId(id);
        const [rows, meta] = await Promise.all([
          api.messages(id, sessionToken),
          api.chat(id, sessionToken).catch(() => null),
        ]);
        if (!active) return;
        setItems(rows);
        if (meta) setThread(meta);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : t.chat.openFailed);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [conversationId, propertyId, buyerId, token]);

  useEffect(() => {
    if (!token || !threadId) return;
    const socket: Socket = io(apiBase(), { path: "/api/socket.io", auth: { token }, transports: ["websocket", "polling"] });
    const join = () => socket.emit("join", threadId);
    socket.on("connect", join);
    socket.on("message", (message: ChatMessage) => {
      if (message.conversation_id !== threadId) return;
      setItems((current) => addMessage(current, message, mineId));
    });
    socket.on("deleted", (payload: { id?: string; conversation_id?: string }) => {
      if (!payload.id || payload.conversation_id !== threadId) return;
      setItems((current) => markDeleted(current, payload.id!));
    });
    socket.on("reaction", (payload: { messageId?: string; reactions?: Array<{ emoji: string; count: number }>; actorId?: string; emoji?: string | null }) => {
      if (!payload.messageId) return;
      setItems((current) => current.map((row) => {
        if (row.id !== payload.messageId) return row;
        const mineIsActor = payload.actorId === mineId;
        const reactions = (payload.reactions ?? []).map((reaction) => ({
          ...reaction,
          mine: mineIsActor ? reaction.emoji === payload.emoji : Boolean(row.reactions?.find((item) => item.emoji === reaction.emoji)?.mine),
        }));
        return { ...row, reactions };
      }));
    });
    return () => {
      socket.disconnect();
    };
  }, [token, threadId, mineId]);

  useEffect(() => {
    if (!loading) scrollRef.current?.scrollToEnd({ animated: true });
  }, [items.length, loading]);

  async function send() {
    if (!token || !threadId || sending) return;
    const text = draft.trim();
    const file = pending;
    if (!text && !file) return;
    setSending(true);
    setError("");
    try {
      let attachment: { attachment_url: string; attachment_name: string; attachment_kind: "image" | "document" } | undefined;
      if (file) {
        const url = await uploadMedia(file.uri, token, file.kind, file.name, file.mime);
        attachment = { attachment_url: url, attachment_name: file.name, attachment_kind: file.kind };
      }
      const message = await api.sendMessage(threadId, {
        body: text || undefined,
        reply_to_id: reply?.id,
        ...attachment,
      }, token);
      setItems((current) => addMessage(current, { ...message, mine: true }, mineId));
      setDraft("");
      setPending(null);
      setReply(null);
      setAttachOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.chat.sendFailed);
    } finally {
      setSending(false);
    }
  }

  async function pickImage() {
    if (sending) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t.listing.photoPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPending({ uri: asset.uri, name: asset.fileName || "photo.jpg", mime: asset.mimeType, kind: "image" });
    setAttachOpen(false);
    setError("");
  }

  async function pickDocument() {
    if (sending) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPending({ uri: asset.uri, name: asset.name || "document", mime: asset.mimeType, kind: "document" });
    setAttachOpen(false);
    setError("");
  }

  function replyTarget(item: ChatMessage) {
    if (!item.reply_to_id) return item;
    return items.find((row) => row.id === item.reply_to_id) || item;
  }

  async function react(item: ChatMessage, emoji: string) {
    if (!token || !threadId || item.deleted) return;
    setMenu(null);
    setEmojiOpen(false);
    try {
      const result = await api.reactMessage(threadId, item.id, emoji, token);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, reactions: result.reactions } : row));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.chat.reactFailed);
    }
  }

  function removeMessage(item: ChatMessage) {
    if (!token || !threadId) return;
    Alert.alert(t.chat.deleteTitle, t.chat.deleteBody, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteMessage(threadId, item.id, token);
            setItems((current) => markDeleted(current, item.id));
            if (reply?.id === item.id) setReply(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : t.chat.deleteFailed);
          }
        },
      },
    ]);
  }

  const name = thread?.other_name || t.chat.fallback;
  return (
    <KeyboardScreen style={{ backgroundColor: "#EFE6DA" }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 8, paddingBottom: 10, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {thread?.other_avatar ? <Image source={{ uri: thread.other_avatar }} style={{ width: 40, height: 40 }} /> : <Text style={{ color: colors.primaryDark, fontWeight: "800" }}>{initial(thread?.other_name)}</Text>}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "800", color: colors.ink }}>{name}</Text>
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{thread?.property_title || t.chat.propertyChat}</Text>
        </View>
      </View>

      {loading ? <View style={{ flex: 1, padding: 16 }}><ListSkeleton /></View> : (
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12 }} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {items.map((item, index) => {
            const mine = item.mine ?? item.sender_id === mineId;
            const label = dayLabel(item.created_at);
            const previous = index > 0 ? dayLabel(items[index - 1].created_at) : null;
            return (
              <View key={item.id}>
                {label !== previous ? (
                  <View style={{ alignSelf: "center", backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginVertical: 8 }}>
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>{label}</Text>
                  </View>
                ) : null}
                <Pressable
                  onLongPress={() => { if (!item.deleted) { setEmojiOpen(false); setMenu(item); } }}
                  delayLongPress={280}
                  style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", marginVertical: 2 }}
                >
                  <View style={{ backgroundColor: mine ? "#C98564" : colors.white, borderRadius: 18, borderBottomRightRadius: mine ? 6 : 18, borderBottomLeftRadius: mine ? 18 : 6, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 }}>
                    {item.reply_to_id ? (
                      <View style={{ borderLeftWidth: 2, borderLeftColor: mine ? "rgba(255,255,255,0.75)" : "#8E8E8E", paddingLeft: 8, marginBottom: 6 }}>
                        <Text numberOfLines={2} style={{ color: mine ? "rgba(255,255,255,0.92)" : "#555", fontSize: 13, lineHeight: 18 }}>{quoteText({ ...item, useReply: true })}</Text>
                      </View>
                    ) : null}
                    {item.deleted ? (
                      <Text style={{ color: mine ? "rgba(255,255,255,0.85)" : colors.muted, fontStyle: "italic", paddingHorizontal: 4 }}>{t.chat.deleted}</Text>
                    ) : (
                      <>
                        {item.attachment_kind === "image" && item.attachment_url ? (
                          <Image source={{ uri: item.attachment_url }} style={{ width: 220, height: 168, borderRadius: 12 }} resizeMode="cover" />
                        ) : null}
                        {item.attachment_kind === "document" && item.attachment_url ? (
                          <Pressable onPress={() => Linking.openURL(item.attachment_url!)} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: mine ? "rgba(255,255,255,0.16)" : colors.page, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minWidth: 180 }}>
                            <Ionicons name="document-text" size={22} color={mine ? colors.white : colors.primaryDark} />
                            <Text style={{ flex: 1, color: mine ? colors.white : colors.ink, fontWeight: "700" }} numberOfLines={2}>{item.attachment_name || t.common.document}</Text>
                          </Pressable>
                        ) : null}
                        {item.body ? <Text style={{ color: mine ? colors.white : colors.ink, fontSize: 15, lineHeight: 20, paddingHorizontal: 4 }}>{item.body}</Text> : null}
                      </>
                    )}
                    <Text style={{ alignSelf: "flex-end", color: mine ? "rgba(255,255,255,0.75)" : colors.faint, fontSize: 11 }}>{clock(item.created_at)}</Text>
                  </View>
                  {!item.deleted && item.reactions?.length ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4, justifyContent: mine ? "flex-end" : "flex-start" }}>
                      {item.reactions.map((reaction) => (
                        <Pressable key={reaction.emoji} onPress={() => react(item, reaction.emoji)} style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: reaction.mine ? colors.primarySoft : colors.white, borderWidth: 1, borderColor: reaction.mine ? colors.primaryLight : "#EFEFEF" }}>
                          <Text style={{ fontSize: 13 }}>{reaction.emoji}</Text>
                          {reaction.count > 1 ? <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>{reaction.count}</Text> : null}
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
          {!items.length && !error ? (
            <View style={{ alignSelf: "center", marginTop: 24, backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ color: colors.muted }}>{t.chat.hello}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {error ? <Text style={{ marginHorizontal: 16, marginBottom: 6, backgroundColor: "#F8E6E3", color: colors.danger, padding: 8, borderRadius: 10 }}>{error}</Text> : null}

      {reply ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginBottom: 8, padding: 10, borderRadius: 12, backgroundColor: "#FAFAFA", borderWidth: 1, borderColor: "#EFEFEF" }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>{t.chat.replying}</Text>
            <Text numberOfLines={1} style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{quoteText(reply)}</Text>
          </View>
          <Pressable onPress={() => setReply(null)} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}

      {pending ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 10, marginBottom: 6, backgroundColor: colors.card, borderRadius: 14, padding: 8 }}>
          {pending.kind === "image" ? (
            <Image source={{ uri: pending.uri }} style={{ width: 56, height: 56, borderRadius: 10 }} />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="document-text" size={26} color={colors.primaryDark} />
            </View>
          )}
          <Text numberOfLines={2} style={{ flex: 1, color: colors.ink, fontWeight: "700" }}>{pending.name}</Text>
          <Pressable onPress={() => setPending(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}

      {attachOpen ? (
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 8 }}>
          <Pressable onPress={pickImage} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 4 }}>
            <Ionicons name="image" size={22} color={colors.primary} />
            <Text style={{ fontWeight: "700", color: colors.ink }}>{t.common.photo}</Text>
          </Pressable>
          <Pressable onPress={pickDocument} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 4 }}>
            <Ionicons name="document-text" size={22} color={colors.primary} />
            <Text style={{ fontWeight: "700", color: colors.ink }}>{t.common.document}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 8, paddingTop: 6, paddingBottom: keyboardOverlap > 0 ? 8 : Math.max(insets.bottom, 8), backgroundColor: "#EFE6DA" }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", backgroundColor: colors.white, borderRadius: 24, paddingLeft: 6, paddingRight: 12, minHeight: 48 }}>
          <Pressable onPress={() => setAttachOpen((open) => !open)} disabled={sending} hitSlop={6} style={{ width: 40, height: 48, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={attachOpen ? "close" : "attach"} size={24} color={colors.muted} />
          </Pressable>
          <VoiceTextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={sending ? t.chat.sending : t.chat.message}
            placeholderTextColor={colors.faint}
            multiline
            style={{ flex: 1, maxHeight: 120, paddingVertical: 12, color: colors.ink, fontSize: 16 }}
          />
        </View>
        <Pressable onPress={send} disabled={!canSend} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: canSend ? colors.primary : "#C9B8A8", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="send" size={20} color={colors.white} style={{ marginLeft: 2 }} />
        </Pressable>
      </View>

      <Modal visible={Boolean(menu)} transparent animationType="fade" onRequestClose={() => { setMenu(null); setEmojiOpen(false); }}>
        <Pressable onPress={() => { setMenu(null); setEmojiOpen(false); }} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.88)", justifyContent: "center", paddingHorizontal: 24 }}>
          {menu ? (
            <Pressable onPress={() => undefined} style={{ alignSelf: menu.mine ? "flex-end" : "flex-start", width: 300 }}>
              {emojiOpen ? (
                <View style={{ backgroundColor: colors.white, borderRadius: 18, paddingTop: 10, paddingBottom: 8, marginBottom: 10, maxHeight: 230, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 14, elevation: 8 }}>
                  <Pressable onPress={() => setEmojiOpen(false)} hitSlop={8} style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingBottom: 4 }}>
                    <Ionicons name="chevron-back" size={22} color={colors.ink} />
                  </Pressable>
                  <Text style={{ textAlign: "center", color: colors.faint, fontSize: 12, fontWeight: "600", marginBottom: 6 }}>{t.chat.pickReaction}</Text>
                  <ScrollView contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 6 }}>
                    {MORE_REACTIONS.map((emoji) => (
                      <Pressable key={emoji} onPress={() => react(menu, emoji)} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", alignSelf: menu.mine ? "flex-end" : "flex-start", backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 6, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 14, elevation: 8 }}>
                  {QUICK_REACTIONS.map((emoji) => (
                    <Pressable key={emoji} onPress={() => react(menu, emoji)} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 26 }}>{emoji}</Text>
                    </Pressable>
                  ))}
                  <View style={{ width: 1, height: 28, backgroundColor: "#EFEFEF", marginHorizontal: 2 }} />
                  <Pressable onPress={() => setEmojiOpen(true)} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="add" size={24} color={colors.ink} />
                  </Pressable>
                </View>
              )}
              <View style={{ alignSelf: menu.mine ? "flex-end" : "flex-start", maxWidth: 260, backgroundColor: menu.mine ? "#C98564" : "#EFEFEF", borderRadius: 22, borderBottomRightRadius: menu.mine ? 6 : 22, borderBottomLeftRadius: menu.mine ? 22 : 6, paddingHorizontal: 14, paddingVertical: 11 }}>
                <Text numberOfLines={4} style={{ color: menu.mine ? colors.white : colors.ink, fontSize: 16, lineHeight: 22 }}>{quoteText(menu)}</Text>
              </View>
              <View style={{ marginTop: 10, backgroundColor: colors.white, borderRadius: 22, paddingBottom: 8, shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 20, elevation: 12 }}>
                <Text style={{ textAlign: "center", fontSize: 11, fontWeight: "600", color: "#8E8E8E", letterSpacing: 0.6, paddingTop: 16, paddingBottom: 12 }}>{formatStamp(menu.created_at)}</Text>
                <Pressable onPress={() => { const target = replyTarget(menu); setReply(target); setMenu(null); setEmojiOpen(false); }} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20 }}>
                  <Ionicons name="arrow-undo-outline" size={24} color={colors.ink} />
                  <Text style={{ marginLeft: 14, fontSize: 16, color: colors.ink }}>{t.chat.reply}</Text>
                </Pressable>
                {menu.mine && !menu.deleted ? (
                  <Pressable onPress={() => { const chosen = menu; setMenu(null); setEmojiOpen(false); removeMessage(chosen); }} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20 }}>
                    <Ionicons name="trash-outline" size={24} color="#ED4956" />
                    <Text style={{ marginLeft: 14, fontSize: 16, color: "#ED4956" }}>{t.common.delete}</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </KeyboardScreen>
  );
}
