import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MealCard from "../components/MealCard";
import WorkoutCard from "../components/WorkoutCard";
import PlanGenerationLoader from "../components/PlanGenerationLoader";
import WeekStripCard from "../components/WeekStripCard";
import MacroRing from "../components/MacroRing";
import ScreenGradient from "../components/ScreenGradient";
import {
  generatePlan,
  getPlanStatus,
  getCurrentPlan,
  getWeeklyPlan,
  generateWeeklyPlan,
  getWeeklyPlanStatus,
  getDayPlan,
  logMealDone,
  logExerciseDone,
} from "../api/plan";
import { useAuth } from "../context/AuthContext";

// ─── Macro summary card ───────────────────────────────────────────────────────


function MacroSummaryCard({ dailyState, currentPlan, selectedDate }) {
  const [activeMacro, setActiveMacro] = useState("Calories");
  const ringAnim = useRef(new Animated.Value(1)).current;

  const calTarget  = currentPlan.daily_calories ?? 0;
  const protTarget = currentPlan.daily_protein_g ?? 0;
  const fatTarget  = currentPlan.daily_fat_g ??
    (calTarget > 0 ? Math.max(0, Math.round(calTarget * 0.25 / 9)) : 0);
  const carbsTarget = currentPlan.daily_carbs_g ??
    (calTarget > 0 ? Math.max(0, Math.round((calTarget - protTarget * 4 - fatTarget * 9) / 4)) : 0);

  const macros = [
    { label: "Calories", consumed: dailyState.calories_consumed ?? 0, target: calTarget,   color: "#22c55e", unit: " kcal" },
    { label: "Protein",  consumed: dailyState.protein_consumed ?? 0,  target: protTarget,  color: "#3b82f6", unit: "g" },
    { label: "Carbs",    consumed: dailyState.carbs_consumed ?? 0,    target: carbsTarget, color: "#f97316", unit: "g" },
    { label: "Fat",      consumed: dailyState.fat_consumed ?? 0,      target: fatTarget,   color: "#a855f7", unit: "g" },
  ];

  const activeMacroData = macros.find((m) => m.label === activeMacro);
  const sideMacros = macros.filter((m) => m.label !== activeMacro);

  const handleSwitch = useCallback((label) => {
    Animated.timing(ringAnim, { toValue: 0.2, duration: 100, useNativeDriver: true }).start(() => {
      setActiveMacro(label);
      Animated.timing(ringAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [ringAnim]);

  return (
    <View style={macroStyles.card}>
      <Text style={macroStyles.heading}>
        {selectedDate ? "Day's targets" : "Today's targets"}
      </Text>

      <View style={macroStyles.row}>
        {/* Featured ring */}
        <Animated.View style={[macroStyles.ringContainer, { opacity: ringAnim }]}>
          <MacroRing key={activeMacro} {...activeMacroData} size={135} stroke={11} featured />
        </Animated.View>

        {/* Side list */}
        <View style={macroStyles.sideList}>
          {sideMacros.map((m) => (
            <TouchableOpacity
              key={m.label}
              onPress={() => handleSwitch(m.label)}
              activeOpacity={0.65}
              style={macroStyles.sideRow}
            >
              <View style={[macroStyles.dot, { backgroundColor: m.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={macroStyles.sideLabel}>{m.label}</Text>
                <Text style={macroStyles.sideValue}>
                  <Text style={{ color: m.color, fontWeight: "600" }}>{m.consumed}</Text>
                  <Text style={macroStyles.sideMax}>/{m.target}{m.unit}</Text>
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderColor: "#f3f4f6",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  heading: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  sideList: {
    flex: 1,
    borderRadius: 14,
    padding: 5,
  },
  sideRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 9,
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    marginBottom: 5,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 1, height: 1 },
    elevation: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 1,
  },
  sideLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  sideValue: {
    fontSize: 13,
    marginTop: 2,
  },
  sideMax: {
    color: "#9ca3af",
  },
});

// ─── Week strip skeleton ───────────────────────────────────────────────────────

function WeekStripSkeleton() {
  return (
    <View className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
      <View className="flex-row items-center mb-2">
        <ActivityIndicator size="small" color="#16a34a" />
        <Text className="text-sm text-gray-400 ml-2">Building your week plan…</Text>
      </View>
      <View className="flex-row gap-2">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} className="flex-1 h-16 bg-gray-100 rounded-xl" />
        ))}
      </View>
    </View>
  );
}

// ─── Week navigator ───────────────────────────────────────────────────────────

function WeekNavigator({ weeklyMeta, viewingWeekNumber, viewingPlan, onPrev, onNext, navLoading, onDayPress, selectedDate }) {
  const displayPlan = viewingWeekNumber !== null ? viewingPlan : weeklyMeta?.plan;
  const isPastWeek = viewingWeekNumber !== null;
  const showPrev = !!weeklyMeta?.hasPreviousPlans && !navLoading;
  const showNext = isPastWeek && !navLoading;
  const weekLabel = isPastWeek ? `Week ${viewingWeekNumber}` : "This week";

  if (!displayPlan?.days?.length && !navLoading) return null;

  return (
    <WeekStripCard
      days={displayPlan?.days ?? []}
      isPastWeek={isPastWeek}
      weekLabel={weekLabel}
      showPrev={showPrev}
      showNext={showNext}
      onPrev={onPrev}
      onNext={onNext}
      navLoading={navLoading}
      onDayPress={onDayPress}
      selectedDate={selectedDate}
    />
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

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  // weeklyMeta: { plan, currentWeekNumber, hasPreviousPlans, previousWeekNumber }
  const [weeklyMeta, setWeeklyMeta] = useState(null);
  const [weeklyGenActive, setWeeklyGenActive] = useState(false);
  const [viewingWeekNumber, setViewingWeekNumber] = useState(null); // null = current week
  const [viewingPlan, setViewingPlan] = useState(null);             // plan shown in strip when browsing past
  const [navLoading, setNavLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [genState, setGenState] = useState({ active: false, message: "", progress: 0 });
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("meals");
  const [selectedDate, setSelectedDate] = useState(null);   // null = today
  const [selectedDayPlan, setSelectedDayPlan] = useState(null);
  const [selectedDayLoading, setSelectedDayLoading] = useState(false);
  const pollRef = useRef(null);
  const weeklyPollRef = useRef(null);

  const handleMealLogDone = useCallback(async (meal) => {
    try {
      const result = await logMealDone({
        mealName: meal.name,
        slot: meal.slot,
        calories: meal.calories ?? 0,
        proteinG: meal.protein_g ?? 0,
      });
      if (result?.daily_state) {
        setPlan((prev) =>
          prev ? { ...prev, daily_state: { ...prev.daily_state, ...result.daily_state } } : prev
        );
      }
    } catch {
      // Silently ignore — card is already showing "Logged" badge
    }
  }, []);

  const handleMealSkipDone = useCallback(async (meal) => {
    try {
      await logMealDone({ mealName: meal.name, slot: meal.slot, calories: 0, proteinG: 0 });
    } catch {
      // Silently ignore
    }
  }, []);

  const handleAskAlex = useCallback((prefilledMessage) => {
    navigation.navigate("Log", { prefilledMessage });
  }, [navigation]);

  const handleExerciseDone = useCallback(async (exercise) => {
    try {
      await logExerciseDone({ exerciseName: exercise.name, status: "done" });
    } catch {
      // Silently ignore — card already shows "Done" badge
    }
  }, []);

  const handleExerciseSkipDone = useCallback(async (exercise) => {
    try {
      const result = await logExerciseDone({ exerciseName: exercise.name, status: "skipped" });
      if (result?.daily_state) {
        setPlan((prev) =>
          prev ? { ...prev, daily_state: { ...prev.daily_state, ...result.daily_state } } : prev
        );
      }
    } catch {
      // Silently ignore
    }
  }, []);

  const startWeeklyPlanPolling = useCallback(() => {
    if (weeklyPollRef.current) return;
    setWeeklyGenActive(true);
    weeklyPollRef.current = setInterval(async () => {
      try {
        const job = await getWeeklyPlanStatus();
        if (job.status === "complete") {
          clearInterval(weeklyPollRef.current);
          weeklyPollRef.current = null;
          setWeeklyGenActive(false);
          const envelope = await getWeeklyPlan();
          setWeeklyMeta(envelope);
          setViewingWeekNumber(null);
          setViewingPlan(null);
        } else if (job.status === "error") {
          clearInterval(weeklyPollRef.current);
          weeklyPollRef.current = null;
          setWeeklyGenActive(false);
        }
      } catch {
        clearInterval(weeklyPollRef.current);
        weeklyPollRef.current = null;
        setWeeklyGenActive(false);
      }
    }, 3000);
  }, []);

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
        setWeeklyMeta(weeklyResult.value);
        setViewingWeekNumber(null);
        setViewingPlan(null);
        setWeeklyGenActive(false);
        if (weeklyPollRef.current) {
          clearInterval(weeklyPollRef.current);
          weeklyPollRef.current = null;
        }
        // Check if a generation job is in flight
        if (!weeklyResult.value.plan && !weeklyPollRef.current) {
          try {
            const job = await getWeeklyPlanStatus();
            if (job.status === "processing") startWeeklyPlanPolling();
          } catch {
            // No job — don't auto-generate; show CTA instead
          }
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load plan.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startWeeklyPlanPolling]);

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

  const handleGenerateWeeklyPlan = async () => {
    try {
      await generateWeeklyPlan();
      startWeeklyPlanPolling();
    } catch (err) {
      setError(err.message || "Failed to start weekly plan generation.");
    }
  };

  const handleDayPress = useCallback(async (date) => {
    const today = new Intl.DateTimeFormat("en-CA").format(new Date());
    if (date === today) {
      setSelectedDate(null);
      setSelectedDayPlan(null);
      return;
    }
    setSelectedDate(date);
    setSelectedDayPlan(null);
    setSelectedDayLoading(true);
    try {
      const data = await getDayPlan(date);
      setSelectedDayPlan(data);
    } catch {
      // No plan for this date — selectedDayPlan stays null
    } finally {
      setSelectedDayLoading(false);
    }
  }, []);

  const handlePrevWeek = async () => {
    const current = viewingWeekNumber ?? weeklyMeta?.currentWeekNumber;
    if (!current) return;
    const target = current - 1;
    setNavLoading(true);
    try {
      const data = await getWeeklyPlan(target);
      if (data.plan) {
        setViewingWeekNumber(target);
        setViewingPlan(data.plan);
      }
      // if no plan for that week, stay where we are (arrow will remain but pressing does nothing)
    } catch {
      // silently ignore
    } finally {
      setNavLoading(false);
    }
  };

  const handleNextWeek = async () => {
    if (viewingWeekNumber === null) return;
    const target = viewingWeekNumber + 1;
    if (target >= (weeklyMeta?.currentWeekNumber ?? Infinity)) {
      // back to current week
      setViewingWeekNumber(null);
      setViewingPlan(null);
    } else {
      setNavLoading(true);
      try {
        const data = await getWeeklyPlan(target);
        setViewingWeekNumber(target);
        setViewingPlan(data.plan);
      } catch {
        // silently ignore
      } finally {
        setNavLoading(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (weeklyPollRef.current) clearInterval(weeklyPollRef.current);
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
  const hasDailyPlan = (currentPlan.meals?.length ?? 0) > 0;
  const hasCurrentWeekPlan = weeklyMeta?.plan != null;

  // When a past/future day is selected, use that day's plan data for content
  const viewingState = selectedDate ? (selectedDayPlan?.daily_state ?? {}) : dailyState;
  const viewingDayPlan = selectedDate ? (selectedDayPlan?.current_plan ?? {}) : currentPlan;

  // Weekly strip section — what to render
  const weeklySection = (() => {
    if (!weeklyMeta) return null;
    if (weeklyGenActive) return <WeekStripSkeleton />;
    if (hasCurrentWeekPlan || viewingWeekNumber !== null) {
      return (
        <WeekNavigator
          weeklyMeta={weeklyMeta}
          viewingWeekNumber={viewingWeekNumber}
          viewingPlan={viewingPlan}
          onPrev={handlePrevWeek}
          onNext={handleNextWeek}
          navLoading={navLoading}
          onDayPress={handleDayPress}
          selectedDate={selectedDate}
        />
      );
    }
    // No plan for current week — show CTA
    if (weeklyMeta.hasPreviousPlans) {
      return (
        <View className="bg-white border border-gray-100 rounded-2xl p-5 mb-4 shadow-sm items-center">
          <Text className="text-base font-semibold text-gray-900 mb-1">Last week has ended 💪</Text>
          <Text className="text-sm text-gray-500 text-center mb-4">
            Ready to set up your new week?
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-xl px-6 py-3"
            onPress={handleGenerateWeeklyPlan}
          >
            <Text className="text-white font-semibold text-sm">Generate This Week's Plan</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null; // brand-new user: no weekly CTA here, handled in daily plan section
  })();

  return (
    <ScreenGradient>
    <ScrollView
      style={{ backgroundColor: "transparent" }}
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

      {!loading && weeklySection}

      {loading ? (
        <View className="items-center justify-center py-20">
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : !hasDailyPlan ? (
        <View className="items-center py-20">
          <Text className="text-5xl mb-4">🏋️</Text>
          <Text className="text-xl font-bold text-gray-900 mb-2">No plan yet</Text>
          <Text className="text-sm text-gray-500 text-center mb-8">
            Generate your personalized daily fitness and meal plan to get started.
          </Text>
          {!weeklyGenActive && (
            <TouchableOpacity
              className="bg-primary rounded-2xl px-8 py-4"
              onPress={handleGenerate}
            >
              <Text className="text-white font-semibold text-base">Generate My Plan</Text>
            </TouchableOpacity>
          )}
          {weeklyGenActive && (
            <Text className="text-sm text-gray-400 text-center">
              Your weekly plan is being built. Tap "Generate My Plan" when ready.
            </Text>
          )}
        </View>
      ) : (
        <>
          {/* Selected day banner */}
          {selectedDate && (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: "#6b7280" }}>Viewing </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                })}
              </Text>
              <TouchableOpacity
                onPress={() => { setSelectedDate(null); setSelectedDayPlan(null); }}
                style={{ marginLeft: 8 }}
              >
                <Text style={{ fontSize: 13, color: "#16a34a", fontWeight: "500" }}>← Today</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedDayLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <ActivityIndicator color="#16a34a" />
            </View>
          ) : selectedDate && !selectedDayPlan ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📅</Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 4 }}>
                No plan for this day
              </Text>
              <Text style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                Only days with a generated plan can be viewed.
              </Text>
            </View>
          ) : (
            <>
              <MacroSummaryCard
                dailyState={viewingState}
                currentPlan={viewingDayPlan}
                selectedDate={selectedDate}
              />

              <TabBar active={activeTab} onChange={setActiveTab} />

              {activeTab === "meals" && (
                <>
                  {viewingDayPlan.meals?.length > 0 ? (
                    viewingDayPlan.meals.map((meal, i) => (
                      <MealCard
                        key={i}
                        meal={meal}
                        onLogDone={handleMealLogDone}
                        onSkipDone={handleMealSkipDone}
                        onAskAlex={handleAskAlex}
                      />
                    ))
                  ) : (
                    <Text className="text-sm text-gray-400 text-center py-8">No meals in this plan.</Text>
                  )}
                </>
              )}

              {activeTab === "workout" && (
                viewingDayPlan.workout ? (
                  <WorkoutCard
                    workout={viewingDayPlan.workout}
                    onExerciseDone={handleExerciseDone}
                    onExerciseSkipDone={handleExerciseSkipDone}
                    onAskAlex={handleAskAlex}
                  />
                ) : (
                  <Text className="text-sm text-gray-400 text-center py-8">No workout in this plan.</Text>
                )
              )}

              {activeTab === "grocery" && (
                <GroceryList items={viewingDayPlan.grocery_list} />
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
    </ScreenGradient>
  );
}
