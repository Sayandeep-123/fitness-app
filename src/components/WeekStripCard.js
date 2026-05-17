import { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─── Design tokens ────────────────────────────────────────────────────────────

const COLORS = {
  primary:         "#16a34a",
  primaryGlow:     "#16a34a",
  white:           "#ffffff",
  circleDefault:   "rgba(0,0,0,0.055)",    // blends naturally on any pastel bg
  numberDefault:   "#374151",
  letterDefault:   "#9ca3af",
  letterActive:    "#16a34a",
  labelMuted:      "#a1a8b4",
  chevron:         "#b0b7c3",
  chevronDisabled: "#d1d5db",
  dotDefault:      "#16a34a",
  dotToday:        "rgba(255,255,255,0.85)",
  skeletonCell:    "rgba(0,0,0,0.055)",
};

const FONTS = {
  label:      "PlusJakartaSans_500Medium",
  letter:     "PlusJakartaSans_600SemiBold",
  number:     "PlusJakartaSans_700Bold",
  pastBadge:  "PlusJakartaSans_400Regular",
};

const CIRCLE_SIZE = 42;

// ─── Day-of-week letter map ───────────────────────────────────────────────────

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const isoWeekday = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00Z");
  return (d.getUTCDay() + 6) % 7;
};

// ─── Skeleton pulse strip ─────────────────────────────────────────────────────
// Boxless — cells float directly on the gradient background.

function SkeletonStrip() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3,  duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Animated.View key={i} style={[skeletonStyles.cell, { opacity }]} />
      ))}
    </ScrollView>
  );
}

const skeletonStyles = StyleSheet.create({
  cell: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE + 24,    // matches dayCellInner visual height (letter + circle + dot)
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: COLORS.skeletonCell,
  },
});

// ─── Single day cell ──────────────────────────────────────────────────────────

function DayCell({ day, isToday, isSelected, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };

  const hasActivity = day.hasActivity ?? false;
  const dayIndex = isoWeekday(day.date);
  const letter = DAY_LETTERS[dayIndex];
  const dateNum = parseInt(day.date.split("-")[2], 10);

  // Circle fill + ring logic
  // Today    : solid green fill, green ambient glow
  // Selected : transparent fill, green ring border, green text
  // Default  : subtle dark-tinted fill, gray text
  let circleBg, circleStyle, numberColor, letterColor;

  if (isToday) {
    circleBg    = COLORS.primary;
    circleStyle = styles.circleToday;
    numberColor = COLORS.white;
    letterColor = COLORS.primary;
  } else if (isSelected) {
    circleBg    = COLORS.white;
    circleStyle = styles.circleSelected;
    numberColor = COLORS.primary;
    letterColor = COLORS.letterActive;
  } else {
    circleBg    = COLORS.circleDefault;
    circleStyle = styles.circleDefault;
    numberColor = COLORS.numberDefault;
    letterColor = COLORS.letterDefault;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.dayCellOuter}
    >
      <Animated.View style={[styles.dayCellInner, { transform: [{ scale: scaleAnim }] }]}>
        {/* Day letter — floats above the circle */}
        <Text style={[styles.dayLetter, { color: letterColor }]}>{letter}</Text>

        {/* Circle with date number */}
        <View style={[styles.circle, circleStyle, { backgroundColor: circleBg }]}>
          <Text style={[styles.dateNumber, { color: numberColor }]}>{dateNum}</Text>
        </View>

        {/* Activity dot — anchored below the circle */}
        <View style={styles.dotRow}>
          {hasActivity ? (
            <View
              style={[
                styles.activityDot,
                isToday ? styles.activityDotToday : styles.activityDotDefault,
              ]}
            />
          ) : (
            <View style={styles.activityDotPlaceholder} />
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Nav chevron button ───────────────────────────────────────────────────────
// No pill, no border — just the bare Ionicon. Hidden via opacity+pointerEvents
// so layout never shifts (no placeholder views needed).

function NavArrow({ direction, visible, disabled, onPress }) {
  const iconName = direction === "prev" ? "chevron-back" : "chevron-forward";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !visible}
      activeOpacity={0.5}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      style={[
        styles.chevronBtn,
        !visible   && styles.chevronHidden,
        disabled   && styles.chevronDisabled,
      ]}
    >
      <Ionicons
        name={iconName}
        size={18}
        color={disabled ? COLORS.chevronDisabled : COLORS.chevron}
      />
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WeekStripCard({
  days,
  isPastWeek = false,
  weekLabel = "This week",
  showPrev = false,
  showNext = false,
  onPrev,
  onNext,
  navLoading = false,
  onDayPress,
  selectedDate,
}) {
  const localToday = new Intl.DateTimeFormat("en-CA").format(new Date());

  return (
    <View style={[styles.container, isPastWeek && styles.containerPastWeek]}>
      {/* ── Header row: label + optional past tag ── */}
      <View style={styles.labelRow}>
        <Text style={styles.weekLabel}>{weekLabel.toUpperCase()}</Text>
        {isPastWeek && (
          <Text style={styles.pastLabel}> · PAST</Text>
        )}
      </View>

      {/* ── Strip row: prev chevron · day cells · next chevron ── */}
      <View style={styles.stripRow}>
        <NavArrow
          direction="prev"
          visible={showPrev}
          disabled={!showPrev || navLoading}
          onPress={onPrev}
        />

        {navLoading ? (
          <SkeletonStrip />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
          >
            {days.map((day) => {
              const isToday    = !isPastWeek && day.date === localToday;
              const isSelected = selectedDate === day.date || (!selectedDate && isToday);

              return (
                <DayCell
                  key={day.date}
                  day={day}
                  isToday={isToday}
                  isSelected={isSelected}
                  onPress={() => onDayPress?.(day.date)}
                />
              );
            })}
          </ScrollView>
        )}

        <NavArrow
          direction="next"
          visible={showNext}
          disabled={!showNext || navLoading}
          onPress={onNext}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Outer wrapper — zero card chrome ──
  container: {
    // No backgroundColor, no border, no shadow — floats on screen gradient
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 2,
    marginBottom: 8,
  },
  containerPastWeek: {
    opacity: 0.65,
  },

  // ── Header row ──
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  weekLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    letterSpacing: 1.1,
    color: COLORS.labelMuted,
  },
  pastLabel: {
    fontFamily: FONTS.pastBadge,
    fontSize: 11,
    letterSpacing: 1.1,
    color: COLORS.labelMuted,
  },

  // ── Strip row ──
  stripRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // ── Scroll content ──
  scrollContent: {
    gap: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "space-between",
  },

  // ── Day cell ──
  dayCellOuter: {
    alignItems: "center",
  },
  dayCellInner: {
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  dayLetter: {
    fontFamily: FONTS.letter,
    fontSize: 10.5,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  circleToday: {
    // Green fill with ambient glow — the primary focal point
    shadowColor: COLORS.primaryGlow,
    shadowOpacity: 0.38,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  circleSelected: {
    // White fill + crisp green ring — clearly selected, not today
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  circleDefault: {
    // Subtle tint — visible enough to be a tap target, quiet enough to recede
  },
  dateNumber: {
    fontFamily: FONTS.number,
    fontSize: 14,
    letterSpacing: -0.3,
  },

  // ── Activity dot ──
  dotRow: {
    marginTop: 6,
    height: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  activityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  activityDotToday: {
    backgroundColor: COLORS.dotToday,
  },
  activityDotDefault: {
    backgroundColor: COLORS.dotDefault,
  },
  activityDotPlaceholder: {
    width: 4,
    height: 4,
  },

  // ── Nav chevrons ──
  chevronBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    // No background, no border — just the icon
  },
  chevronHidden: {
    opacity: 0,
    pointerEvents: "none",
  },
  chevronDisabled: {
    opacity: 0.3,
  },
});
