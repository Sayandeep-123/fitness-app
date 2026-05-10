import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MessageBubble from "../components/MessageBubble";
import ProposalCard from "../components/ProposalCard";
import WeeklyReflectionModal from "../components/WeeklyReflectionModal";
import { logEvent, getChatHistory, confirmPlanUpdate, rejectPlanUpdate, checkPendingReflection } from "../api/plan";
import ScreenGradient from "../components/ScreenGradient";

// ─── Time-aware quick chips ───────────────────────────────────────────────────

const getQuickChips = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return [
      "Completed workout 💪",
      "Skipped today",
      "Healthy breakfast 🥗",
      "Rest day 😴",
      "Feeling sick 🤒",
    ];
  }
  if (hour >= 11 && hour < 15) {
    return [
      "Good lunch ✅",
      "Ate a bit much",
      "Skipped workout",
      "Stressed today",
      "Traveling ✈️",
    ];
  }
  if (hour >= 15 && hour < 19) {
    return [
      "Afternoon workout done 💪",
      "Social event tonight 🎉",
      "Feeling tired",
      "Indulged a little",
      "Rest day",
    ];
  }
  return [
    "Great day overall 🌟",
    "Big dinner tonight",
    "Social event 🎉",
    "Skipped workout",
    "Indulged tonight",
  ];
};

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View className="flex-row items-end mb-3">
      <View className="w-8 h-8 rounded-full bg-emerald-600 items-center justify-center mr-2">
        <Text className="text-white font-bold text-sm">A</Text>
      </View>
      <Animated.View style={{ opacity }}>
        <View className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <Text className="text-gray-400 text-sm italic">Alex is typing...</Text>
        </View>
      </Animated.View>
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

export default function LogEventScreen({ route }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [pendingProposal, setPendingProposal] = useState(null);
  const [showReflection, setShowReflection] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const chips = useRef(getQuickChips()).current;

  useEffect(() => {
    getChatHistory()
      .then((history) => {
        const loaded = (history ?? []).map((m) => ({ ...m, id: newId() }));
        setMessages(loaded.length > 0 ? loaded : [WELCOME_MSG]);
      })
      .catch(() => {
        setMessages([WELCOME_MSG]);
      })
      .finally(() => setHistoryLoading(false));

    checkPendingReflection()
      .then((data) => { if (data?.pending) setShowReflection(true); })
      .catch(() => {});
  }, []);

  // Pre-fill input when navigated from "Ask Alex" action on meal/exercise cards
  useEffect(() => {
    const prefilled = route?.params?.prefilledMessage;
    if (prefilled && typeof prefilled === "string") {
      setInputText(prefilled);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [route?.params?.prefilledMessage]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = useCallback(async (text) => {
    const value = (text ?? inputText).trim();
    if (!value || isTyping) return;

    const userMsg = {
      id: newId(),
      role: "user",
      text: value,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);
    scrollToEnd();

    try {
      const data = await logEvent(value);
      const reply = data?.coach_reply ?? data?.explanation ?? "Got it!";
      const coachMsg = {
        id: newId(),
        role: "coach",
        text: reply,
        timestamp: new Date().toISOString(),
        eventId: typeof data?.event_id === "number" ? data.event_id : null,
      };
      setMessages((prev) => [...prev, coachMsg]);
      if (data?.requires_confirmation && data?.proposed_changes) {
        setPendingProposal(data.proposed_changes);
      }
    } catch {
      const errorMsg = {
        id: newId(),
        role: "coach",
        text: "Sorry, I ran into a problem. Try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      scrollToEnd();
    }
  }, [inputText, isTyping, scrollToEnd]);

  const handleAccept = useCallback(async () => {
    if (!pendingProposal) return;
    const proposal = pendingProposal;
    setPendingProposal(null);
    try {
      await confirmPlanUpdate({ proposed_changes: proposal });
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "coach", text: "Done — your plan has been updated.", timestamp: new Date().toISOString() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "coach", text: "Couldn't apply the change. Try again in a moment.", timestamp: new Date().toISOString() },
      ]);
    }
    scrollToEnd();
  }, [pendingProposal, scrollToEnd]);

  const handleReject = useCallback(async () => {
    if (!pendingProposal) return;
    const type = pendingProposal.type;
    setPendingProposal(null);
    try {
      await rejectPlanUpdate({ proposed_changes_type: type });
    } catch {}
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "coach", text: "No worries, keeping your original plan.", timestamp: new Date().toISOString() },
    ]);
    scrollToEnd();
  }, [pendingProposal, scrollToEnd]);

  const renderItem = useCallback(({ item, index }) => {
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showAvatar = item.role === "coach" && prevMsg?.role !== "coach";
    return <MessageBubble role={item.role} text={item.text} timestamp={item.timestamp} showAvatar={showAvatar} eventId={item.eventId ?? null} />;
  }, [messages]);

  const listFooter = isTyping ? <TypingIndicator /> : null;

  return (
    <ScreenGradient>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-3">
        <Text className="text-xl font-bold text-gray-900">Hey, I'm Alex 👋</Text>
        <Text className="text-sm text-gray-500 mt-0.5">Tell me how your day's going</Text>
      </View>

      {/* Message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}
        ListFooterComponent={listFooter}
        onContentSizeChange={scrollToEnd}
        showsVerticalScrollIndicator={false}
      />

      {/* Proposal card */}
      <ProposalCard proposal={pendingProposal} onAccept={handleAccept} onReject={handleReject} />

      {/* Quick chips */}
      <View style={{ height: 52 }} className="border-t border-gray-100 bg-gray-50">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center", gap: 8, height: 52 }}
          keyboardShouldPersistTaps="handled"
        >
          {chips.map((chip) => (
            <TouchableOpacity
              key={chip}
              onPress={() => handleSend(chip)}
              disabled={isTyping}
              className="bg-white border border-gray-200 rounded-full shadow-sm"
              style={{ paddingHorizontal: 14, paddingVertical: 7 }}
            >
              <Text className="text-gray-700 text-sm">{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input row */}
      <View className="flex-row items-end px-4 pb-6 pt-3 bg-gray-50 border-t border-gray-100">
        <View className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 mr-3">
          <TextInput
            ref={inputRef}
            className="text-gray-900 text-sm"
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            multiline
            value={inputText}
            onChangeText={setInputText}
            style={{ maxHeight: 96, textAlignVertical: "top" }}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => handleSend()}
          />
        </View>
        <TouchableOpacity
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isTyping}
          className={`w-11 h-11 rounded-full items-center justify-center ${
            inputText.trim() && !isTyping ? "bg-primary" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-base font-bold ${
              inputText.trim() && !isTyping ? "text-white" : "text-gray-400"
            }`}
          >
            ↑
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    <WeeklyReflectionModal visible={showReflection} onClose={() => setShowReflection(false)} />
    </ScreenGradient>
  );
}
