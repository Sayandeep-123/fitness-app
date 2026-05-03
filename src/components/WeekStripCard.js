import { ScrollView, Text, View } from "react-native";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Returns 0=Mon … 6=Sun (ISO weekday)
const isoWeekday = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00Z");
  return (d.getUTCDay() + 6) % 7;
};

export default function WeekStripCard({ days }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <View className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
      <Text className="font-semibold text-gray-900 mb-3">This week</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {days.map((day) => {
          const isToday = day.date === todayStr;
          const isWorkout = day.dayType === "workout";
          return (
            <View
              key={day.date}
              className={`items-center rounded-xl py-2.5 ${isToday ? "bg-primary" : "bg-gray-50"}`}
              style={{ width: 52 }}
            >
              <Text
                className={`text-xs font-medium mb-1 ${isToday ? "text-white" : "text-gray-500"}`}
              >
                {DAY_LABELS[isoWeekday(day.date)]}
              </Text>
              <Text className="text-base mb-1">{isWorkout ? "💪" : "😴"}</Text>
              <Text className={`text-xs ${isToday ? "text-green-100" : "text-gray-400"}`}>
                {day.targetCalories}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
