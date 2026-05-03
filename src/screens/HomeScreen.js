import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MealCard from "../components/MealCard";
import WorkoutCard from "../components/WorkoutCard";
import PlanGenerationLoader from "../components/PlanGenerationLoader";
import WeekStripCard from "../components/WeekStripCard";
import { generatePlan, getPlanStatus, getCurrentPlan, getWeeklyPlan } from "../api/plan";
import { useAuth } from "../context/AuthContext";

// ─── Summary card ─────────────────────────────────────────────────────────────

function ProgressRow({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = value > max && max > 0;
  return (
    <View>
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-sm text-gray-500">{label}</Text>
        <Text className={`text-sm font-medium ${over ? "text-red-500" : "text-gray-700"}`}>
          {value} / {max}{label === "Calories" ? " kcal" : "g"}
          {over ? "  · Over target" : ""}
        </Text>
      </View>
      <View className="h-2 bg-gray-100 rounded-full">
        <View
          className={`h-2 rounded-full ${over ? "bg-red-400" : color}`}
          style={{ width: `${pct}%` }}
        />
      </View>
    </View>
  );
}

function SummaryCard({ caloriesConsumed, caloriesTarget, proteinConsumed, proteinTarget }) {
  return (
    <View className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
      <Text className="font-semibold text-gray-900 mb-4">Today's targets</Text>
      <ProgressRow
        label="Calories"
        value={caloriesConsumed}
        max={caloriesTarget}
        color="bg-primary"
      />
      <View className="mt-3">
        <ProgressRow
          label="Protein"
          value={proteinConsumed}
          max={proteinTarget}
          color="bg-blue-400"
        />
      </View>
    </View>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: "meals", label: "🍽  Meals" },
  { key: "workout", label: "💪 Workout" },
  { key: "grocery", label: "🛒 Grocery" },
];

function TabBar({ active, onChange }) {
  return (
    <View className="flex-row gap-2 mb-5">
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onChange(tab.key)}
          className={`flex-1 rounded-xl py-2.5 items-center ${
            active === tab.key ? "bg-primary" : "bg-gray-100"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              active === tab.key ? "text-white" : "text-gray-500"
            }`}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Grocery tab ──────────────────────────────────────────────────────────────

const GROCERY_PREVIEW = 6;

function GroceryList({ items }) {
  const [expanded, setExpanded] = useState(false);
  if (!items?.length) return (
    <Text className="text-sm text-gray-400 text-center py-8">No grocery list yet.</Text>
  );
  const visible = expanded ? items : items.slice(0, GROCERY_PREVIEW);
  const hidden = items.length - GROCERY_PREVIEW;

  return (
    <View className="flex-row flex-wrap gap-2">
      {visible.map((item, i) => (
        <View key={i} className="bg-white border border-gray-100 rounded-full px-3 py-1.5 shadow-sm">
          <Text className="text-sm text-gray-700 capitalize">{item}</Text>
        </View>
      ))}
      {!expanded && hidden > 0 && (
        <TouchableOpacity
          className="bg-green-50 border border-green-100 rounded-full px-3 py-1.5"
          onPress={() => setExpanded(true)}
        >
          <Text className="text-sm text-primary font-medium">+{hidden} more</Text>
        </TouchableOpacity>
      )}
      {expanded && hidden > 0 && (
        <TouchableOpacity
          className="bg-gray-100 rounded-full px-3 py-1.5"
          onPress={() => setExpanded(false)}
        >
          <Text className="text-sm text-gray-500 font-medium">Show less</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genState, setGenState] = useState({ active: false, message: "", progress: 0 });
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("meals");
  const pollRef = useRef(null);

  const fetchPlan = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [dailyResult, weeklyResult] = await Promise.allSettled([
        getCurrentPlan(),
        getWeeklyPlan(),
      ]);

      if (dailyResult.status === "fulfilled") {
        setPlan(dailyResult.value);
      } else if (
        dailyResult.reason?.message?.includes("404") ||
        dailyResult.reason?.message?.includes("No plan")
      ) {
        setPlan(null);
      } else {
        throw dailyResult.reason;
      }

      if (weeklyResult.status === "fulfilled") {
        setWeeklyPlan(weeklyResult.value);
      }
      // weekly 404 = no plan generated yet — silently stay null
    } catch (err) {
      setError(err.message || "Failed to load plan.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleGenerate = async () => {
    setError(null);
    setGenState({ active: true, message: "Analyzing your profile...", progress: 5 });

    try {
      await generatePlan();
    } catch (err) {
      setGenState({ active: false, message: "", progress: 0 });
      setError(err.message || "Failed to start plan generation.");
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const job = await getPlanStatus();
        setGenState({ active: true, message: job.message, progress: job.progress });

        if (job.status === "complete") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setActiveTab("meals");
          setGenState({ active: false, message: "", progress: 0 });
          fetchPlan();
        } else if (job.status === "error") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setError(job.message || "Something went wrong. Please try again.");
          setGenState({ active: false, message: "", progress: 0 });
        }
      } catch (err) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setError("Lost connection while generating plan. Please try again.");
        setGenState({ active: false, message: "", progress: 0 });
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPlan();
    }, [fetchPlan])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlan(true);
  }, [fetchPlan]);

  if (genState.active) {
    return <PlanGenerationLoader message={genState.message} progress={genState.progress} />;
  }

  const dailyState = plan?.daily_state ?? {};
  const currentPlan = plan?.current_plan ?? {};

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-900">
          Hey, {user?.name?.split(" ")[0] ?? "there"} 👋
        </Text>
        <Text className="text-sm text-gray-500 mt-0.5">Here's your plan for today</Text>
      </View>

      {error && (
        <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <Text className="text-red-600 text-sm">{error}</Text>
        </View>
      )}

      {!loading && weeklyPlan?.days?.length > 0 && (
        <WeekStripCard days={weeklyPlan.days} />
      )}

      {loading ? (
        <View className="items-center justify-center py-20">
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : !plan ? (
        <View className="items-center py-20">
          <Text className="text-5xl mb-4">🏋️</Text>
          <Text className="text-xl font-bold text-gray-900 mb-2">No plan yet</Text>
          <Text className="text-sm text-gray-500 text-center mb-8">
            Generate your personalized daily fitness and meal plan to get started.
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-2xl px-8 py-4"
            onPress={handleGenerate}
          >
            <Text className="text-white font-semibold text-base">Generate My Plan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <SummaryCard
            caloriesConsumed={dailyState.calories_consumed ?? 0}
            caloriesTarget={currentPlan.daily_calories ?? 0}
            proteinConsumed={dailyState.protein_consumed ?? 0}
            proteinTarget={currentPlan.daily_protein_g ?? 0}
          />

          <TabBar active={activeTab} onChange={setActiveTab} />

          {activeTab === "meals" && (
            <>
              {currentPlan.meals?.length > 0 ? (
                currentPlan.meals.map((meal, i) => <MealCard key={i} meal={meal} />)
              ) : (
                <Text className="text-sm text-gray-400 text-center py-8">No meals in this plan.</Text>
              )}
            </>
          )}

          {activeTab === "workout" && (
            currentPlan.workout ? (
              <WorkoutCard workout={currentPlan.workout} />
            ) : (
              <Text className="text-sm text-gray-400 text-center py-8">No workout in this plan.</Text>
            )
          )}

          {activeTab === "grocery" && (
            <GroceryList items={currentPlan.grocery_list} />
          )}

          <TouchableOpacity
            className="border border-gray-200 rounded-2xl py-3 items-center mt-6"
            onPress={handleGenerate}
          >
            <Text className="text-gray-500 font-medium text-sm">Regenerate Plan</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
