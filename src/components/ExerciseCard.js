import { useCallback, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import SkipModal from "./SkipModal";

const SWIPE_THRESHOLD = 80;

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }) {
  if (!status) return null;
  const isDone = status === "done";
  return (
    <View style={[exStyles.statusChip, isDone ? exStyles.chipDone : exStyles.chipSkipped]}>
      <Text style={[exStyles.chipText, isDone ? exStyles.chipTextDone : exStyles.chipTextSkipped]}>
        {isDone ? "✓ Done" : "Skipped"}
      </Text>
    </View>
  );
}

// ─── Reveal layer ─────────────────────────────────────────────────────────────

function RevealLayer() {
  return (
    <View style={[StyleSheet.absoluteFill, exStyles.revealContainer]}>
      {/* Done side (left) — blue/indigo accent for workouts */}
      <View style={exStyles.revealLeft}>
        <View style={exStyles.revealPillDone}>
          <Text style={exStyles.revealIcon}>✓</Text>
          <Text style={exStyles.revealLabel}>Done</Text>
        </View>
      </View>
      {/* Skip side (right) */}
      <View style={exStyles.revealRight}>
        <View style={exStyles.revealPillSkip}>
          <Text style={exStyles.revealIcon}>✕</Text>
          <Text style={exStyles.revealLabel}>Skip</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Exercise icon badge ──────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  strength:    "◈",
  cardio:      "◎",
  flexibility: "◌",
  core:        "◉",
  balance:     "⊕",
};

function ExerciseIconBadge({ category }) {
  const icon = CATEGORY_ICONS[String(category).toLowerCase()] ?? "◈";
  return (
    <View style={exStyles.iconBadge}>
      <Text style={exStyles.iconBadgeText}>{icon}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExerciseCard({ exercise, isLast, onDone, onSkipDone, onAskAlex }) {
  const [status, setStatus] = useState(exercise.status ?? null);
  const [skipModalVisible, setSkipModalVisible] = useState(false);
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
    setSkipModalVisible(true);
  }, []);

  const handleSkipConfirm = useCallback(() => {
    setSkipModalVisible(false);
    setStatus("skipped");
    if (onSkipDone) onSkipDone(exercise);
  }, [exercise, onSkipDone]);

  const handleSkipAskAlex = useCallback(() => {
    setSkipModalVisible(false);
    if (onAskAlex) {
      onAskAlex(
        `I can't do ${exercise.name} today, can you suggest an alternative exercise?`
      );
    }
  }, [exercise, onAskAlex]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => {
        if (status !== null) return;
        const dx = g.dx;
        const absDx = Math.abs(dx);
        const clamped = absDx <= SWIPE_THRESHOLD
          ? absDx
          : SWIPE_THRESHOLD + (absDx - SWIPE_THRESHOLD) * 0.25;
        translateX.setValue(dx < 0 ? -clamped : clamped);

        if (!thresholdTriggered.current && absDx > SWIPE_THRESHOLD) {
          thresholdTriggered.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (thresholdTriggered.current && absDx <= SWIPE_THRESHOLD) {
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

  // Surface state — same pattern as MealCard, blue accent for workouts
  const cardSurface = (() => {
    if (status === "done")    return exStyles.surfaceDone;
    if (status === "skipped") return exStyles.surfaceSkipped;
    return exStyles.surfaceDefault;
  })();

  return (
    <View style={[exStyles.wrapper, !isLast && { marginBottom: 10 }]}>
      <RevealLayer />

      <Animated.View
        style={[exStyles.card, cardSurface, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {/* Header row */}
        <View style={exStyles.headerRow}>
          {/* Left: icon badge + text */}
          <View style={exStyles.headerLeft}>
            <ExerciseIconBadge category={exercise.category} />
            <View style={exStyles.headerText}>
              <Text
                style={[
                  exStyles.exerciseName,
                  status === "done" && exStyles.exerciseNameDone,
                  status === "skipped" && exStyles.exerciseNameSkipped,
                ]}
                numberOfLines={1}
              >
                {exercise.name}
              </Text>
              <Text
                style={[
                  exStyles.exerciseMeta,
                  status === "skipped" && exStyles.mutedText,
                ]}
                numberOfLines={1}
              >
                {exercise.sets} sets × {exercise.reps} reps · {exercise.rest_seconds}s rest
              </Text>
            </View>
          </View>

          {/* Right: status chip or category badge */}
          <View style={exStyles.headerRight}>
            {status ? (
              <StatusChip status={status} />
            ) : (
              <View style={exStyles.categoryBadge}>
                <Text style={exStyles.categoryText}>{exercise.category}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {exercise.notes && status !== "skipped" && (
          <Text style={exStyles.notes} numberOfLines={2}>{exercise.notes}</Text>
        )}
      </Animated.View>

      <SkipModal
        visible={skipModalVisible}
        title={`Skip ${exercise.name}?`}
        onAskAlex={handleSkipAskAlex}
        onSkip={handleSkipConfirm}
        onCancel={() => setSkipModalVisible(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const exStyles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: "hidden",
  },

  // ── Reveal layer ──
  revealContainer: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
  },
  revealLeft: {
    flex: 1,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 20,
  },
  revealRight: {
    flex: 1,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 20,
  },
  revealPillDone: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  revealPillSkip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  revealIcon: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  revealLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Card surface states ──
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  surfaceDefault: {
    backgroundColor: "#ffffff",
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  surfaceDone: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  surfaceSkipped: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },

  // ── Header ──
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    flexShrink: 0,
  },

  // ── Icon badge ──
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBadgeText: {
    fontSize: 16,
    color: "#16a34a",
  },

  // ── Text ──
  exerciseName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  exerciseNameDone: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },
  exerciseNameSkipped: {
    color: "#d1d5db",
  },
  exerciseMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
  mutedText: {
    color: "#d1d5db",
  },
  notes: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 6,
  },

  // ── Category badge ──
  categoryBadge: {
    backgroundColor: "#f0fdf4",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "500",
    textTransform: "capitalize",
  },

  // ── Status chip ──
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipDone: {
    backgroundColor: "#dcfce7",
  },
  chipSkipped: {
    backgroundColor: "#f3f4f6",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextDone: {
    color: "#16a34a",
  },
  chipTextSkipped: {
    color: "#9ca3af",
  },
});
