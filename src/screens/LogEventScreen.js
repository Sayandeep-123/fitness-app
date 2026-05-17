import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MessageBubble from "../components/MessageBubble";
import ProposalCard from "../components/ProposalCard";
import WeeklyReflectionModal from "../components/WeeklyReflectionModal";
import { logEvent, getChatHistory, checkPendingReflection } from "../api/plan";
import ScreenGradient from "../components/ScreenGradient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stripEmoji = (str) =>
  str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, "").trim();

// ─── Time-aware quick chips ───────────────────────────────────────────────────

const getQuickChips = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return ["Completed workout 💪", "Skipped today", "Healthy breakfast 🥗", "Rest day 😴", "Feeling sick 🤒"];
  }
  if (hour >= 11 && hour < 15) {
    return ["Good lunch ✅", "Ate a bit much", "Skipped workout", "Stressed today", "Traveling ✈️"];
  }
  if (hour >= 15 && hour < 19) {
    return ["Afternoon workout done 💪", "Social event tonight 🎉", "Feeling tired", "Indulged a little", "Rest day"];
  }
  return ["Great day overall 🌟", "Big dinner tonight", "Social event 🎉", "Skipped workout", "Indulged tonight"];
};

// ─── Alex avatar ──────────────────────────────────────────────────────────────

function AlexAvatar({ size = 40 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.38 }]}>A</Text>
    </View>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();

    bounce(dot1, 0);
    bounce(dot2, 140);
    bounce(dot3, 280);
  }, []);

  return (
    <View style={styles.typingRow}>
      <AlexAvatar size={32} />
      <View style={styles.typingBubble}>
        <View style={styles.dotsRow}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: dot }] }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

let msgIdCounter = 0;
const newId = () => `msg-${++msgIdCounter}`;

const WELCOME_MSG = {
  id: "welcome",
  role: "coach",
  text: "Hey! 👋 I'm Alex, your AI fitness coach. Tell me how your day is going — workouts, meals, energy levels, anything. I'll keep your plan on track.",
  timestamp: new Date().toISOString(),
};

export default function LogEventScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [proposedOptions, setProposedOptions] = useState(null);
  const [loadingOptionId, setLoadingOptionId] = useState(null);
  const [showReflection, setShowReflection] = useState(false);
  const [awaitingClarification, setAwaitingClarification] = useState(false);
  const [clarifyOptions, setClarifyOptions] = useState([]);
  const [followupTarget, setFollowupTarget] = useState(null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const chips = useRef(getQuickChips()).current;

  useEffect(() => {
    getChatHistory()
      .then((history) => {
        const loaded = (history ?? []).map((m) => ({ ...m, id: newId() }));
        setMessages(loaded.length > 0 ? loaded : [WELCOME_MSG]);
      })
      .catch(() => setMessages([WELCOME_MSG]))
      .finally(() => setHistoryLoading(false));

    checkPendingReflection()
      .then((data) => { if (data?.pending) setShowReflection(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const prefilled = route?.params?.prefilledMessage;
    if (prefilled && typeof prefilled === "string") {
      setInputText(prefilled);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [route?.params?.prefilledMessage]);


  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = useCallback(async (text) => {
    const value = (text ?? inputText).trim();
    if (!value || isTyping) return;

    const isClarifyFollowup = awaitingClarification;
    const currentFollowupTarget = followupTarget;

    setAwaitingClarification(false);
    setClarifyOptions([]);
    setFollowupTarget(null);

    const userMsg = { id: newId(), role: "user", text: value, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);
    scrollToEnd();

    try {
      const data = await logEvent(value, isClarifyFollowup, currentFollowupTarget);
      const routing = data?.routing ?? "ROUTE_TO_PLANNER";
      const reply = data?.coach_reply ?? data?.explanation ?? "Got it!";

      const coachMsg = {
        id: newId(),
        role: "coach",
        text: reply,
        timestamp: new Date().toISOString(),
        eventId: typeof data?.event_id === "number" ? data.event_id : null,
      };
      setMessages((prev) => [...prev, coachMsg]);

      if (routing === "CLARIFY") {
        setAwaitingClarification(true);
        setClarifyOptions(data.clarify_options ?? []);
        setFollowupTarget("intent");
        setProposedOptions(null);
      } else if (routing === "PLANNER_CLARIFY") {
        setAwaitingClarification(true);
        setClarifyOptions(data.clarify_options ?? []);
        setFollowupTarget("planner");
        setProposedOptions(null);
      } else if (data?.requires_confirmation && data?.proposed_options?.length > 0) {
        setProposedOptions(data.proposed_options);
        setAwaitingClarification(false);
        setClarifyOptions([]);
        setFollowupTarget(null);
      } else {
        setProposedOptions(null);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "coach", text: "Sorry, I ran into a problem. Try again in a moment.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsTyping(false);
      scrollToEnd();
    }
  }, [inputText, isTyping, scrollToEnd, awaitingClarification, followupTarget]);

  const handleOptionSelect = useCallback(async (option) => {
    if (loadingOptionId) return;

    if (option.type === "just_log") {
      setProposedOptions(null);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "coach", text: "Got it — keeping your original plan. Move forward!", timestamp: new Date().toISOString() },
      ]);
      scrollToEnd();
      return;
    }

    setLoadingOptionId(option.id);
    const followupText = `I'll go with: ${option.label}`;
    setMessages((prev) => [...prev, { id: newId(), role: "user", text: followupText, timestamp: new Date().toISOString() }]);
    setProposedOptions(null);
    scrollToEnd();

    try {
      const data = await logEvent(followupText, true, "planner");
      const reply = data?.coach_reply ?? data?.explanation ?? "Done — plan updated!";
      setMessages((prev) => [...prev, { id: newId(), role: "coach", text: reply, timestamp: new Date().toISOString() }]);
    } catch {
      setMessages((prev) => [...prev, { id: newId(), role: "coach", text: "Update saved. Let's keep moving!", timestamp: new Date().toISOString() }]);
    } finally {
      setLoadingOptionId(null);
      scrollToEnd();
    }
  }, [loadingOptionId, scrollToEnd]);

  const renderItem = useCallback(({ item, index }) => {
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showAvatar = item.role === "coach" && prevMsg?.role !== "coach";
    return (
      <MessageBubble
        role={item.role}
        text={item.text}
        timestamp={item.timestamp}
        showAvatar={showAvatar}
        eventId={item.eventId ?? null}
      />
    );
  }, [messages]);

  const canSend = inputText.trim().length > 0 && !isTyping;
  const activeChips = awaitingClarification && clarifyOptions.length > 0 ? clarifyOptions : chips;

  return (
    <ScreenGradient>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled={Platform.OS === "ios"}
        keyboardVerticalOffset={90}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerInner}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>
            <View style={{ marginLeft: 12 }}>
              <AlexAvatar size={40} />
              <View style={styles.onlineDot} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.headerName}>Alex</Text>
              <Text style={styles.headerSub}>Your AI fitness coach</Text>
            </View>
          </View>
        </View>

        {/* ── Messages ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
        />

        {/* ── Proposal card ── */}
        <ProposalCard
          proposedOptions={proposedOptions}
          onSelectOption={handleOptionSelect}
          loadingOptionId={loadingOptionId}
        />

        {/* ── Bottom bar ── */}
        <View style={[styles.bottomBar, { paddingBottom: keyboardVisible ? bottomPad + 10 : bottomPad }]}>
          {/* Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
            keyboardShouldPersistTaps="handled"
          >
            {activeChips.map((item) => {
              const isClarify = awaitingClarification && clarifyOptions.length > 0;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => handleSend(item)}
                  disabled={isTyping}
                  style={[styles.chip, isClarify && styles.chipClarify]}
                >
                  <Text style={[styles.chipText, isClarify && styles.chipClarifyText]}>
                    {stripEmoji(item)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.divider} />

          {/* Input row */}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Message Alex..."
              placeholderTextColor="#9ca3af"
              multiline
              value={inputText}
              onChangeText={setInputText}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={!canSend}
              style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnInactive]}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={20} color={canSend ? "#ffffff" : "#9ca3af"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <WeeklyReflectionModal visible={showReflection} onClose={() => setShowReflection(false)} />
    </ScreenGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingHorizontal: 20,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#ffffff",
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  headerName: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#6b7280",
    marginTop: 1,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  typingBubble: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#16a34a",
  },
  bottomBar: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  chipsScroll: {
    height: 52,
  },
  chipsContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    height: 52,
  },
  chip: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#6b7280",
  },
  chipClarify: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  chipClarifyText: {
    color: "#ffffff",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#111827",
    maxHeight: 96,
    textAlignVertical: "top",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: "#16a34a",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnInactive: {
    backgroundColor: "#f3f4f6",
  },
});
