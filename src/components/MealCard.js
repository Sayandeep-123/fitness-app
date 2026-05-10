import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

const str = (v) => {
  if (v == null) return "";
  if (typeof v === "object") return v.label ?? v.name ?? String(v);
  return String(v);
};

const SWIPE_THRESHOLD = 80;

export default function MealCard({ meal, onLogDone, onSkipDone, onAskAlex }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(null); // null | 'logged' | 'skipped'
  const translateX = useRef(new Animated.Value(0)).current;
  const thresholdTriggered = useRef(false);

  const resetCard = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [translateX]);

  const onLogMeal = useCallback(() => {
    setStatus("logged");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onLogDone) onLogDone(meal);
  }, [meal, onLogDone]);

  const onSkipMeal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Skip ${str(meal.name)}?`,
      "Would you like Alex to suggest an alternative, or just skip it?",
      [
        {
          text: "Ask Alex for an alternative",
          onPress: () => {
            if (onAskAlex) {
              onAskAlex(
                `I want to skip my ${str(meal.slot ?? "meal")} (${str(meal.name)}), can you suggest something else?`
              );
            }
          },
        },
        {
          text: "Just skip it",
          style: "destructive",
          onPress: () => {
            setStatus("skipped");
            if (onSkipDone) onSkipDone(meal);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, [meal, onSkipDone, onAskAlex]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
        // Light haptic when crossing threshold for the first time
        if (!thresholdTriggered.current && Math.abs(g.dx) > SWIPE_THRESHOLD) {
          thresholdTriggered.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (thresholdTriggered.current && Math.abs(g.dx) <= SWIPE_THRESHOLD) {
          thresholdTriggered.current = false;
        }
      },
      onPanResponderRelease: (_, g) => {
        thresholdTriggered.current = false;
        if (g.dx > SWIPE_THRESHOLD) onLogMeal();
        else if (g.dx < -SWIPE_THRESHOLD) onSkipMeal();
        resetCard();
      },
      onPanResponderTerminate: () => {
        thresholdTriggered.current = false;
        resetCard();
      },
    })
  ).current;

  return (
    <View style={{ marginBottom: 12, borderRadius: 16, overflow: "hidden" }}>
      {/* Reveal backgrounds */}
      <View style={[StyleSheet.absoluteFill, { flexDirection: "row" }]}>
        <View style={styles.revealLeft}>
          <Text style={styles.revealText}>Logged</Text>
        </View>
        <View style={styles.revealRight}>
          <Text style={styles.revealText}>Skip</Text>
        </View>
      </View>

      {/* Animated card */}
      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateX }] },
          status === "skipped" ? { opacity: 0.65 } : undefined,
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.7}
          disabled={status !== null}
        >
          {/* Status badge */}
          {status && (
            <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: status === "logged" ? "#dcfce7" : "#f3f4f6" },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: status === "logged" ? "#16a34a" : "#6b7280" },
                  ]}
                >
                  {status === "logged" ? "Logged" : "Skipped"}
                </Text>
              </View>
            </View>
          )}

          {/* Header row */}
          <View className="flex-row justify-between items-start p-4">
            <View className="flex-1 mr-3">
              <Text className="font-semibold text-gray-900 text-base mb-0.5">{str(meal.name)}</Text>
              <Text className="text-sm text-gray-500">{str(meal.description)}</Text>
              {meal.notes && (
                <Text className="text-xs text-gray-400 italic mt-1">{str(meal.notes)}</Text>
              )}
            </View>
            <View className="items-end">
              <Text className="text-sm font-semibold text-primary">{str(meal.calories)} kcal</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{str(meal.protein_g)}g protein</Text>
            </View>
          </View>

          {/* Expand toggle */}
          {status === null && (
            <View className="flex-row items-center px-4 pb-3">
              <Text className="text-xs text-primary font-medium">
                {expanded ? "Hide ingredients" : "View ingredients"}
              </Text>
              <Text className="text-xs text-primary ml-1">{expanded ? "▲" : "▼"}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Expanded ingredients */}
        {expanded && status === null && (
          <View className="mx-4 mb-4 pt-3 border-t border-gray-100">
            {meal.ingredients?.map((ing, i) => (
              <View key={i} className="flex-row justify-between py-1.5">
                <Text className="text-sm text-gray-700 capitalize flex-1">{str(ing.name)}</Text>
                <Text className="text-sm text-gray-500 ml-4 text-right">{str(ing.household)}</Text>
              </View>
            ))}

            {(meal.serving_size || meal.prep_time_minutes != null) && (
              <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-100">
                {meal.serving_size && (
                  <Text className="text-xs text-gray-400">Serving: {str(meal.serving_size)}</Text>
                )}
                {meal.prep_time_minutes != null && (
                  <Text className="text-xs text-gray-400">Prep: {str(meal.prep_time_minutes)} min</Text>
                )}
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  revealLeft: {
    flex: 1,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 20,
  },
  revealRight: {
    flex: 1,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 20,
  },
  revealText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
