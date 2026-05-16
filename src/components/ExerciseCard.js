import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

const SWIPE_THRESHOLD = 80;

export default function ExerciseCard({ exercise, isLast, onDone, onSkipDone, onAskAlex }) {
  // Restore status from server (exercise.status: "done" | "skipped" | null)
  const [status, setStatus] = useState(exercise.status ?? null);
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

  const handleDone = useCallback(() => {
    setStatus("done");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onDone) onDone(exercise);
  }, [exercise, onDone]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Skip ${exercise.name}?`,
      "Would you like Alex to find an alternative, or just skip this exercise?",
      [
        {
          text: "Ask Alex for an alternative",
          onPress: () => {
            if (onAskAlex) {
              onAskAlex(
                `I can't do ${exercise.name} today, can you suggest an alternative exercise?`
              );
            }
          },
        },
        {
          text: "Just skip it",
          style: "destructive",
          onPress: () => {
            setStatus("skipped");
            if (onSkipDone) onSkipDone(exercise);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, [exercise, onSkipDone, onAskAlex]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => {
        if (status !== null) return;
        translateX.setValue(g.dx);
        if (!thresholdTriggered.current && Math.abs(g.dx) > SWIPE_THRESHOLD) {
          thresholdTriggered.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (thresholdTriggered.current && Math.abs(g.dx) <= SWIPE_THRESHOLD) {
          thresholdTriggered.current = false;
        }
      },
      onPanResponderRelease: (_, g) => {
        thresholdTriggered.current = false;
        if (status !== null) return;
        if (g.dx > SWIPE_THRESHOLD) handleDone();
        else if (g.dx < -SWIPE_THRESHOLD) handleSkip();
        resetCard();
      },
      onPanResponderTerminate: () => {
        thresholdTriggered.current = false;
        resetCard();
      },
    })
  ).current;

  return (
    <View style={{ marginBottom: 8, borderRadius: 12, overflow: "hidden" }}>
      {/* Reveal backgrounds */}
      <View style={[StyleSheet.absoluteFill, { flexDirection: "row" }]}>
        <View style={styles.revealLeft}>
          <Text style={styles.revealText}>Done</Text>
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
          status === "skipped" && { opacity: 0.55 },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.row}>
          {/* Status indicator dot */}
          <View
            style={[
              styles.dot,
              status === "done" && { backgroundColor: "#16a34a" },
              status === "skipped" && { backgroundColor: "#9ca3af" },
              status === null && { backgroundColor: "#e5e7eb" },
            ]}
          />

          <View style={styles.content}>
            <View style={styles.topRow}>
              <Text
                style={[
                  styles.name,
                  status === "done" && { textDecorationLine: "line-through", color: "#6b7280" },
                ]}
                numberOfLines={1}
              >
                {exercise.name}
              </Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{exercise.category}</Text>
              </View>
            </View>

            <Text style={styles.detail}>
              {exercise.sets} sets × {exercise.reps} reps · {exercise.rest_seconds}s rest
            </Text>

            {exercise.notes && (
              <Text style={styles.notes} numberOfLines={2}>{exercise.notes}</Text>
            )}

            {/* Status label */}
            {status && (
              <View style={[styles.statusBadge, status === "done" ? styles.doneBadge : styles.skippedBadge]}>
                <Text style={[styles.statusText, status === "done" ? styles.doneText : styles.skippedText]}>
                  {status === "done" ? "Done" : "Skipped"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  revealLeft: {
    position: "absolute",
    top: 0, bottom: 0, left: 0,
    width: "50%",
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 16,
  },
  revealRight: {
    position: "absolute",
    top: 0, bottom: 0, right: 0,
    width: "50%",
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 16,
  },
  revealText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: 11,
    color: "#6b7280",
    textTransform: "capitalize",
  },
  detail: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  notes: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  doneBadge: { backgroundColor: "#dcfce7" },
  skippedBadge: { backgroundColor: "#f3f4f6" },
  statusText: { fontSize: 11, fontWeight: "600" },
  doneText: { color: "#16a34a" },
  skippedText: { color: "#6b7280" },
});
