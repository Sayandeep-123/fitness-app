import { Text, View } from "react-native";
import ExerciseCard from "./ExerciseCard";

const INTENSITY_COLORS = {
  low: { bg: "bg-green-100", text: "text-green-700" },
  moderate: { bg: "bg-amber-100", text: "text-amber-700" },
  high: { bg: "bg-red-100", text: "text-red-700" },
};

export default function WorkoutCard({ workout, onExerciseDone, onExerciseSkipDone, onAskAlex }) {
  if (!workout) return null;

  const ic = INTENSITY_COLORS[workout.intensity] ?? { bg: "bg-gray-100", text: "text-gray-600" };
  const exerciseCount = workout.exercises?.length ?? 0;

  return (
    <View className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="font-semibold text-gray-900 capitalize">
          {workout.workout_type} Workout
        </Text>
        <View className="flex-row items-center gap-2">
          <View className={`rounded-full px-2.5 py-0.5 ${ic.bg}`}>
            <Text className={`text-xs font-medium capitalize ${ic.text}`}>
              {workout.intensity}
            </Text>
          </View>
          <Text className="text-sm text-gray-400">{workout.estimated_duration_minutes} min</Text>
        </View>
      </View>

      {/* Stats strip */}
      <View className="flex-row bg-gray-50 rounded-xl p-3 mb-4 justify-around">
        <View className="items-center">
          <Text className="text-sm font-semibold text-gray-900">{workout.warm_up_minutes}m</Text>
          <Text className="text-xs text-gray-400 mt-0.5">Warm-up</Text>
        </View>
        <View className="w-px bg-gray-200" />
        <View className="items-center">
          <Text className="text-sm font-semibold text-gray-900">{exerciseCount}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">Exercises</Text>
        </View>
        <View className="w-px bg-gray-200" />
        <View className="items-center">
          <Text className="text-sm font-semibold text-gray-900">{workout.cool_down_minutes}m</Text>
          <Text className="text-xs text-gray-400 mt-0.5">Cool-down</Text>
        </View>
      </View>

      {/* Swipe hint — only shown when exercises exist and none have been actioned */}
      {exerciseCount > 0 && (
        <Text style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8, textAlign: "center" }}>
          Swipe right to mark done · swipe left to skip
        </Text>
      )}

      {/* Per-exercise swipable cards */}
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

      {/* Notes */}
      {workout.workout_notes && (
        <Text className="text-xs text-gray-400 italic mt-3 pt-3 border-t border-gray-100 leading-5">
          {workout.workout_notes}
        </Text>
      )}
    </View>
  );
}
