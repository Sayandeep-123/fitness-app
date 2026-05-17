import { useCallback, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import SkipModal from "./SkipModal";

const str = (v) => {
  if (v == null) return "";
  if (typeof v === "object") return v.label ?? v.name ?? String(v);
  return String(v);
};

const SWIPE_THRESHOLD = 80;

// ─── Slot icon badge ──────────────────────────────────────────────────────────

const SLOT_ICONS = {
  breakfast: "☀",
  lunch:     "◑",
  dinner:    "◗",
  snack:     "◌",
};

function SlotIcon({ slot }) {
  const icon = SLOT_ICONS[str(slot).toLowerCase()] ?? "◌";
  return (
    <View style={cardStyles.iconBadge}>
      <Text style={cardStyles.iconBadgeText}>{icon}</Text>
    </View>
  );
}

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }) {
  if (!status) return null;
  const isLogged = status === "logged";
  return (
    <View style={[cardStyles.statusChip, isLogged ? cardStyles.chipLogged : cardStyles.chipSkipped]}>
      <Text style={[cardStyles.chipText, isLogged ? cardStyles.chipTextLogged : cardStyles.chipTextSkipped]}>
        {isLogged ? "✓ Logged" : "Skipped"}
      </Text>
    </View>
  );
}

// ─── Expand chevron ───────────────────────────────────────────────────────────

function ExpandChevron({ expanded }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const prevExpanded = useRef(expanded);

  if (prevExpanded.current !== expanded) {
    prevExpanded.current = expanded;
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.Text style={[cardStyles.chevron, { transform: [{ rotate }] }]}>
      ›
    </Animated.Text>
  );
}

// ─── Reveal layer ─────────────────────────────────────────────────────────────

function RevealLayer() {
  return (
    <View style={[StyleSheet.absoluteFill, cardStyles.revealContainer]}>
      {/* Log side (left) */}
      <View style={cardStyles.revealLeft}>
        <View style={cardStyles.revealPill}>
          <Text style={cardStyles.revealIcon}>✓</Text>
          <Text style={cardStyles.revealLabel}>Log</Text>
        </View>
      </View>
      {/* Skip side (right) */}
      <View style={cardStyles.revealRight}>
        <View style={cardStyles.revealPillSkip}>
          <Text style={cardStyles.revealIcon}>✕</Text>
          <Text style={cardStyles.revealLabel}>Skip</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MealCard({ meal, onLogDone, onSkipDone, onAskAlex }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(
    meal.status === "done" ? "logged" : meal.status === "skipped" ? "skipped" : null
  );
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

  const onLogMeal = useCallback(() => {
    setStatus("logged");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onLogDone) onLogDone(meal);
  }, [meal, onLogDone]);

  const onSkipMeal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSkipModalVisible(true);
  }, []);

  const handleSkipConfirm = useCallback(() => {
    setSkipModalVisible(false);
    setStatus("skipped");
    if (onSkipDone) onSkipDone(meal);
  }, [meal, onSkipDone]);

  const handleSkipAskAlex = useCallback(() => {
    setSkipModalVisible(false);
    if (onAskAlex) {
      onAskAlex(
        `I want to skip my ${str(meal.slot ?? "meal")} (${str(meal.name)}), can you suggest something else?`
      );
    }
  }, [meal, onAskAlex]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => {
        const dx = g.dx;
        const absDx = Math.abs(dx);
        // Past the threshold, apply rubber-band resistance (0.25 factor)
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

  // Determine card surface style based on status
  const cardSurface = (() => {
    if (status === "logged")  return cardStyles.surfaceLogged;
    if (status === "skipped") return cardStyles.surfaceSkipped;
    return cardStyles.surfaceDefault;
  })();

  return (
    <View style={cardStyles.wrapper}>
      <RevealLayer />

      <Animated.View
        style={[cardStyles.card, cardSurface, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={() => status === null && setExpanded((e) => !e)}
          activeOpacity={0.75}
          disabled={status !== null}
        >
          {/* Header row */}
          <View style={cardStyles.headerRow}>
            {/* Left: icon badge + text */}
            <View style={cardStyles.headerLeft}>
              <SlotIcon slot={meal.slot} />
              <View style={cardStyles.headerText}>
                <Text
                  style={[
                    cardStyles.mealName,
                    status === "skipped" && cardStyles.mealNameSkipped,
                  ]}
                  numberOfLines={1}
                >
                  {str(meal.name)}
                </Text>
                <Text
                  style={[
                    cardStyles.mealMeta,
                    status === "skipped" && cardStyles.mutedText,
                  ]}
                  numberOfLines={1}
                >
                  {str(meal.calories)} kcal · {str(meal.protein_g)}g protein
                </Text>
              </View>
            </View>

            {/* Right: status chip or chevron */}
            <View style={cardStyles.headerRight}>
              {status ? (
                <StatusChip status={status} />
              ) : (
                <ExpandChevron expanded={expanded} />
              )}
            </View>
          </View>

          {/* Description */}
          {!!str(meal.description) && status !== "skipped" && (
            <Text style={cardStyles.description} numberOfLines={expanded ? undefined : 2}>
              {str(meal.description)}
            </Text>
          )}

          {/* Notes */}
          {meal.notes && status !== "skipped" && (
            <Text style={cardStyles.notes}>{str(meal.notes)}</Text>
          )}

          {/* Expand hint — only when not actioned */}
          {status === null && (
            <View style={cardStyles.expandHintRow}>
              <Text style={cardStyles.expandHint}>
                {expanded ? "Hide ingredients" : "View ingredients"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Expanded ingredients panel */}
        {expanded && status === null && (
          <View style={cardStyles.ingredientsPanel}>
            {meal.ingredients?.map((ing, i) => (
              <View key={i} style={cardStyles.ingredientRow}>
                <Text style={cardStyles.ingredientName}>{str(ing.name)}</Text>
                <Text style={cardStyles.ingredientAmount}>{str(ing.household)}</Text>
              </View>
            ))}
            {(meal.serving_size || meal.prep_time_minutes != null) && (
              <View style={cardStyles.footerMeta}>
                {meal.serving_size && (
                  <Text style={cardStyles.footerMetaText}>Serving: {str(meal.serving_size)}</Text>
                )}
                {meal.prep_time_minutes != null && (
                  <Text style={cardStyles.footerMetaText}>Prep: {str(meal.prep_time_minutes)} min</Text>
                )}
              </View>
            )}
          </View>
        )}
      </Animated.View>

      <SkipModal
        visible={skipModalVisible}
        title={`Skip ${str(meal.name)}?`}
        onAskAlex={handleSkipAskAlex}
        onSkip={handleSkipConfirm}
        onCancel={() => setSkipModalVisible(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    borderRadius: 18,
    overflow: "hidden",
  },

  // ── Reveal layer ──
  revealContainer: {
    flexDirection: "row",
    borderRadius: 18,
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
  revealPill: {
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
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  surfaceDefault: {
    backgroundColor: "#ffffff",
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  surfaceLogged: {
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
    marginBottom: 6,
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
    alignItems: "center",
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
  },

  // ── Text ──
  mealName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  mealNameSkipped: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },
  mealMeta: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "400",
  },
  mutedText: {
    color: "#d1d5db",
  },
  description: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    marginBottom: 4,
  },
  notes: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
    marginBottom: 4,
  },

  // ── Chevron ──
  chevron: {
    fontSize: 22,
    color: "#d1d5db",
    transform: [{ rotate: "90deg" }],
    lineHeight: 26,
  },

  // ── Expand hint ──
  expandHintRow: {
    marginTop: 4,
  },
  expandHint: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "500",
  },

  // ── Status chip ──
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipLogged: {
    backgroundColor: "#dcfce7",
  },
  chipSkipped: {
    backgroundColor: "#f3f4f6",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextLogged: {
    color: "#16a34a",
  },
  chipTextSkipped: {
    color: "#9ca3af",
  },

  // ── Ingredients panel ──
  ingredientsPanel: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  ingredientName: {
    fontSize: 13,
    color: "#374151",
    textTransform: "capitalize",
    flex: 1,
  },
  ingredientAmount: {
    fontSize: 13,
    color: "#6b7280",
    marginLeft: 16,
    textAlign: "right",
  },
  footerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  footerMetaText: {
    fontSize: 11,
    color: "#9ca3af",
  },
});
