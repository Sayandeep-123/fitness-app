import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { submitEventFeedback } from "../api/plan";

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function ThumbUp({ filled }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill={filled ? "#059669" : "none"} stroke={filled ? "#059669" : "#9ca3af"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 22V11L13 2l1 1-1 7h6a2 2 0 012 2v1l-3 8H7zM7 11H4a1 1 0 00-1 1v9a1 1 0 001 1h3" />
    </Svg>
  );
}

function ThumbDown({ filled }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill={filled ? "#dc2626" : "none"} stroke={filled ? "#dc2626" : "#9ca3af"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 2v11L11 22l-1-1 1-7H5a2 2 0 01-2-2v-1l3-8h11zM17 13h3a1 1 0 001-1V3a1 1 0 00-1-1h-3" />
    </Svg>
  );
}

function FeedbackRow({ eventId }) {
  const [rated, setRated] = useState(null); // +1 | -1 | null

  const handleRate = async (rating) => {
    if (rated !== null) return;
    setRated(rating);
    try {
      await submitEventFeedback({ eventId, rating });
    } catch {}
  };

  if (rated !== null) {
    return <Text className="text-gray-400 text-xs mt-1.5">Thanks</Text>;
  }

  return (
    <View className="flex-row gap-3 mt-1.5">
      <TouchableOpacity onPress={() => handleRate(1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
        <ThumbUp filled={false} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleRate(-1)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
        <ThumbDown filled={false} />
      </TouchableOpacity>
    </View>
  );
}

export default function MessageBubble({ role, text, timestamp, showAvatar, eventId }) {
  const isCoach = role === "coach";

  if (isCoach) {
    return (
      <View className="flex-row items-end mb-3">
        {showAvatar ? (
          <View className="w-8 h-8 rounded-full bg-emerald-600 items-center justify-center mr-2">
            <Text className="text-white font-bold text-sm">A</Text>
          </View>
        ) : (
          <View className="w-8 mr-2" />
        )}
        <View className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm" style={{ maxWidth: "75%" }}>
          <Text className="text-gray-900 text-sm leading-5">{text}</Text>
          <Text className="text-gray-400 text-xs mt-1">{formatTime(timestamp)}</Text>
          {typeof eventId === "number" && <FeedbackRow eventId={eventId} />}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row justify-end mb-3">
      <View className="bg-primary rounded-2xl rounded-tr-sm px-4 py-2.5" style={{ maxWidth: "75%" }}>
        <Text className="text-white text-sm leading-5">{text}</Text>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 4, textAlign: "right" }}>{formatTime(timestamp)}</Text>
      </View>
    </View>
  );
}
