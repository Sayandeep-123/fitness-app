import { StyleSheet, Text, View } from "react-native";
import ExerciseCard from "./ExerciseCard";

// Intensity color tokens — using blue/indigo family for workouts
const INTENSITY_CONFIG = {
  low:      { bg: "#f0fdf4", text: "#16a34a", dot: "#22c55e" },
  moderate: { bg: "#fef9c3", text: "#ca8a04", dot: "#eab308" },
  high:     { bg: "#fee2e2", text: "#dc2626", dot: "#ef4444" },
};

export default function WorkoutCard({ workout, onExerciseDone, onExerciseSkipDone, onAskAlex }) {
  if (!workout) return null;

  const ic = INTENSITY_CONFIG[workout.intensity] ?? { bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af" };
  const exerciseCount = workout.exercises?.length ?? 0;

  return (
    <View style={workoutStyles.card}>
      {/* ── Card header ───────────────────────────────────── */}
      <View style={workoutStyles.headerRow}>
        {/* Left: icon badge + title */}
        <View style={workoutStyles.headerLeft}>
          <View style={workoutStyles.iconBadge}>
            <Text style={workoutStyles.iconBadgeText}>◈</Text>
          </View>
          <View>
            <Text style={workoutStyles.workoutTitle}>
              {workout.workout_type
                ? `${workout.workout_type.charAt(0).toUpperCase()}${workout.workout_type.slice(1)} Workout`
                : "Workout"}
            </Text>
            <Text style={workoutStyles.workoutMeta}>
              {exerciseCount} exercises · {workout.estimated_duration_minutes} min
            </Text>
          </View>
        </View>

        {/* Right: intensity chip */}
        <View style={[workoutStyles.intensityChip, { backgroundColor: ic.bg }]}>
          <View style={[workoutStyles.intensityDot, { backgroundColor: ic.dot }]} />
          <Text style={[workoutStyles.intensityText, { color: ic.text }]}>
            {workout.intensity}
          </Text>
        </View>
      </View>

      {/* ── Stats strip ────────────────────────────────────── */}
      <View style={workoutStyles.statsStrip}>
        <View style={workoutStyles.statCell}>
          <Text style={workoutStyles.statValue}>{workout.warm_up_minutes}m</Text>
          <Text style={workoutStyles.statLabel}>Warm-up</Text>
        </View>
        <View style={workoutStyles.statDivider} />
        <View style={workoutStyles.statCell}>
          <Text style={workoutStyles.statValue}>{exerciseCount}</Text>
          <Text style={workoutStyles.statLabel}>Exercises</Text>
        </View>
        <View style={workoutStyles.statDivider} />
        <View style={workoutStyles.statCell}>
          <Text style={workoutStyles.statValue}>{workout.cool_down_minutes}m</Text>
          <Text style={workoutStyles.statLabel}>Cool-down</Text>
        </View>
      </View>

      {/* ── Swipe hint ──────────────────────────────────────── */}
      {exerciseCount > 0 && (
        <Text style={workoutStyles.swipeHint}>
          Swipe right to mark done · swipe left to skip
        </Text>
      )}

      {/* ── Exercise cards ──────────────────────────────────── */}
      {workout.exercises?.map((ex, i) => (
        <ExerciseCard
          key={i}
          exercise={ex}
          isLast={i === exerciseCount - 1}
          onDone={onExerciseDone}
          onSkipDone={onExerciseSkipDone}
          onAskAlex={onAskAlex}
        />
      ))}

      {/* ── Workout notes ───────────────────────────────────── */}
      {workout.workout_notes && (
        <Text style={workoutStyles.workoutNotes}>{workout.workout_notes}</Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const workoutStyles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  // ── Header ──
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBadgeText: {
    fontSize: 18,
    color: "#16a34a",
  },
  workoutTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.1,
    marginBottom: 1,
  },
  workoutMeta: {
    fontSize: 12,
    color: "#6b7280",
  },

  // ── Intensity chip ──
  intensityChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    flexShrink: 0,
  },
  intensityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  intensityText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  // ── Stats strip ──
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 14,
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statCell: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "400",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#e5e7eb",
  },

  // ── Swipe hint ──
  swipeHint: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.1,
  },

  // ── Notes ──
  workoutNotes: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    lineHeight: 18,
  },
});
