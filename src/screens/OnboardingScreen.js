import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { completeOnboarding } from "../api/auth";
import { generateWeeklyPlan } from "../api/plan";
import { useAuth } from "../context/AuthContext";
import ScreenGradient from "../components/ScreenGradient";

const GOALS = [
  { emoji: "🔥", label: "Lose fat", description: "Reduce body fat while preserving muscle", value: "lose_fat" },
  { emoji: "💪", label: "Build muscle", description: "Increase strength and muscle size", value: "build_muscle" },
  { emoji: "⚡", label: "Body recomposition", description: "Lose fat and build muscle simultaneously", value: "body_recomposition" },
  { emoji: "🏆", label: "Athletic performance", description: "Boost power, speed and endurance for sport", value: "athletic_performance" },
  { emoji: "🏃", label: "Improve fitness", description: "Better stamina, energy and endurance", value: "improve_fitness" },
  { emoji: "⚖️", label: "Maintain weight", description: "Keep current weight with a balanced routine", value: "maintain_weight" },
  { emoji: "🌿", label: "Stay healthy", description: "Balanced routine, feel good overall", value: "stay_healthy" },
  { emoji: "✨", label: "Custom goal", description: "Describe your own target in the notes below", value: "custom" },
];

const FITNESS_LEVELS = [
  {
    emoji: "🌱",
    label: "Beginner",
    description: "Little or no exercise experience. Workouts will focus on form and building habits.",
    value: "beginner",
  },
  {
    emoji: "📈",
    label: "Intermediate",
    description: "Exercise regularly (3–4x/week for 6+ months). Ready for structured progressive training.",
    value: "intermediate",
  },
  {
    emoji: "🔝",
    label: "Advanced",
    description: "Train consistently with a structured program. Looking to optimize and push further.",
    value: "advanced",
  },
];

const EQUIPMENT_OPTIONS = [
  { emoji: "🏠", label: "No equipment", description: "Bodyweight exercises only, anywhere.", value: "none" },
  { emoji: "🏋️", label: "Home basics", description: "Dumbbells, resistance bands, maybe a bench.", value: "home_basics" },
  { emoji: "💪", label: "Full gym", description: "Machines, barbells, cables — the works.", value: "full_gym" },
];

const DIET_OPTIONS = [
  { label: "Everything", value: "non_vegetarian" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Other", value: "other" },
];

const LIFESTYLE_OPTIONS = [
  { emoji: "💻", label: "Sedentary", description: "Desk job or mostly sitting — minimal movement outside workouts", value: "sedentary" },
  { emoji: "🚶", label: "Lightly active", description: "Some walking or light daily movement (errands, casual strolls)", value: "lightly_active" },
  { emoji: "🏃", label: "Moderately active", description: "On your feet most of the day — retail, teaching, casual sport", value: "moderately_active" },
  { emoji: "⚒️", label: "Very active", description: "Physical job or intense daily movement — construction, manual labour", value: "very_active" },
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

const SESSION_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
];

const OptionCard = ({ emoji, label, description, selected, onPress }) => (
  <TouchableOpacity
    className={`border rounded-2xl px-4 py-4 mb-3 flex-row items-start ${
      selected ? "bg-primary border-primary" : "bg-white border-gray-200"
    }`}
    onPress={onPress}
  >
    <Text className="text-2xl mr-3 mt-0.5">{emoji}</Text>
    <View className="flex-1">
      <Text className={`font-semibold text-base ${selected ? "text-white" : "text-gray-900"}`}>
        {label}
      </Text>
      <Text className={`text-sm mt-0.5 leading-5 ${selected ? "text-green-100" : "text-gray-500"}`}>
        {description}
      </Text>
    </View>
    {selected && <Text className="text-white ml-2 mt-0.5">✓</Text>}
  </TouchableOpacity>
);

const InfoHint = ({ text }) => (
  <View className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 flex-row items-start">
    <Text className="text-sm mr-2">ℹ️</Text>
    <Text className="text-blue-700 text-sm flex-1 leading-5">{text}</Text>
  </View>
);

const PillButton = ({ label, selected, onPress }) => (
  <TouchableOpacity
    className={`border rounded-xl px-4 py-2.5 mr-2 mb-2 ${
      selected ? "bg-primary border-primary" : "bg-white border-gray-200"
    }`}
    onPress={onPress}
  >
    <Text className={`font-medium text-sm ${selected ? "text-white" : "text-gray-700"}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

const NumberInput = ({ label, value, onChange, placeholder, unit }) => (
  <View className="flex-1 mx-1">
    <Text className="text-xs text-gray-400 mb-1.5 font-medium">{label}</Text>
    <View className="bg-white border border-gray-200 rounded-2xl px-3 py-3 flex-row items-center">
      <TextInput
        className="text-gray-900 text-base flex-1"
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
      />
      {unit && <Text className="text-gray-400 text-sm ml-1">{unit}</Text>}
    </View>
  </View>
);

const CommentBox = ({ placeholder, value, onChange }) => (
  <View className="mt-5 border-t border-gray-100 pt-5">
    <Text className="text-sm font-medium text-gray-500 mb-2">💬 Anything to add? <Text className="text-gray-400 font-normal">(optional)</Text></Text>
    <TextInput
      className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 text-sm"
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      value={value}
      onChangeText={onChange}
      multiline
      style={{ minHeight: 64, textAlignVertical: "top" }}
    />
  </View>
);

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const { updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    goal: "",
    age: "",
    weight: "",
    height: "",
    sex: "",
    fitness_level: "",
    workout_days_per_week: null,
    session_length_minutes: null,
    lifestyle_activity: "",
    equipment: "",
    diet_type: "",
  });

  const [comments, setComments] = useState({
    goal: "",
    about: "",
    fitness: "",
    schedule: "",
    diet: "",
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setComment = (key, value) => setComments((prev) => ({ ...prev, [key]: value }));

  const canProceed = () => {
    switch (step) {
      case 0: return !!form.goal;
      case 1: return !!(form.age && form.weight && form.height && form.sex);
      case 2: return !!form.fitness_level;
      case 3: return !!(form.workout_days_per_week && form.session_length_minutes && form.lifestyle_activity);
      case 4: return !!(form.equipment && form.diet_type);
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const personalizationContext = [
        comments.goal,
        comments.about,
        comments.fitness,
        comments.schedule,
        comments.diet,
      ].filter(Boolean).join(". ");

      const payload = {
        goal: form.goal,
        age: parseInt(form.age, 10),
        weight: parseFloat(form.weight),
        height: parseFloat(form.height),
        sex: form.sex,
        fitness_level: form.fitness_level,
        workout_days_per_week: form.workout_days_per_week,
        session_length_minutes: form.session_length_minutes,
        lifestyle_activity: form.lifestyle_activity,
        equipment: form.equipment,
        diet_type: form.diet_type,
        ...(personalizationContext ? { personalization_context: personalizationContext } : {}),
      };

      const { user } = await completeOnboarding(payload);
      generateWeeklyPlan().catch(() => {});
      updateUser(user);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text className="text-2xl font-bold text-gray-900 mb-1">What do you want to achieve?</Text>
            <Text className="text-sm text-gray-500 mb-6">We'll build your entire plan around this</Text>
            {GOALS.map((opt) => (
              <OptionCard
                key={opt.value}
                {...opt}
                selected={form.goal === opt.value}
                onPress={() => set("goal", opt.value)}
              />
            ))}
            <CommentBox
              placeholder='e.g. "I want to lose 5kg before my wedding in 3 months"'
              value={comments.goal}
              onChange={(v) => setComment("goal", v)}
            />
          </>
        );

      case 1:
        return (
          <>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Help us calculate your needs</Text>
            <Text className="text-sm text-gray-500 mb-4">Your stats make your meal plan realistic, not generic</Text>
            <InfoHint text="We use age, weight and height to estimate how many calories your body burns at rest." />
            <View className="flex-row mb-4">
              <NumberInput
                label="Age"
                value={form.age}
                onChange={(v) => set("age", v)}
                placeholder="28"
              />
              <NumberInput
                label="Weight"
                value={form.weight}
                onChange={(v) => set("weight", v)}
                placeholder="72"
                unit="kg"
              />
              <NumberInput
                label="Height"
                value={form.height}
                onChange={(v) => set("height", v)}
                placeholder="175"
                unit="cm"
              />
            </View>
            <Text className="text-xs text-gray-400 font-medium mb-2">Gender</Text>
            <View className="flex-row gap-2 mb-2">
              {[
                { label: "M", value: "male" },
                { label: "F", value: "female" },
                { label: "Prefer not to say", value: "prefer_not_to_say" },
              ].map((s) => (
                <TouchableOpacity
                  key={s.value}
                  className={`border rounded-2xl px-4 py-2.5 items-center ${
                    s.value === "prefer_not_to_say" ? "flex-1" : ""
                  } ${form.sex === s.value ? "bg-primary border-primary" : "bg-white border-gray-200"}`}
                  onPress={() => set("sex", s.value)}
                >
                  <Text
                    className={`font-medium text-sm ${form.sex === s.value ? "text-white" : "text-gray-700"}`}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <CommentBox
              placeholder='e.g. "I have a slow metabolism, diets never seem to work for me"'
              value={comments.about}
              onChange={(v) => setComment("about", v)}
            />
          </>
        );

      case 2:
        return (
          <>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Your current fitness level?</Text>
            <Text className="text-sm text-gray-500 mb-6">We'll match the intensity and structure to where you are</Text>
            {FITNESS_LEVELS.map((opt) => (
              <OptionCard
                key={opt.value}
                {...opt}
                selected={form.fitness_level === opt.value}
                onPress={() => set("fitness_level", opt.value)}
              />
            ))}
            <CommentBox
              placeholder='e.g. "I used to lift 2 years ago but stopped, getting back now"'
              value={comments.fitness}
              onChange={(v) => setComment("fitness", v)}
            />
          </>
        );

      case 3:
        return (
          <>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Let's fit the plan into your life</Text>
            <Text className="text-sm text-gray-500 mb-4">Be realistic — consistency beats perfection</Text>
            <InfoHint text="A 3-day plan you stick to beats a 6-day plan you don't. Pick what's genuinely sustainable." />
            <Text className="text-sm font-medium text-gray-700 mb-3">Days per week</Text>
            <View className="flex-row flex-wrap mb-5">
              {DAYS_OPTIONS.map((d) => (
                <PillButton
                  key={d}
                  label={String(d)}
                  selected={form.workout_days_per_week === d}
                  onPress={() => set("workout_days_per_week", d)}
                />
              ))}
            </View>
            <View className="flex-row items-center mb-3">
              <Text className="text-sm font-medium text-gray-700 mr-2">Session length</Text>
              <Text className="text-xs text-gray-400">includes warmup & cooldown</Text>
            </View>
            <View className="flex-row flex-wrap">
              {SESSION_OPTIONS.map((s) => (
                <PillButton
                  key={s.value}
                  label={s.label}
                  selected={form.session_length_minutes === s.value}
                  onPress={() => set("session_length_minutes", s.value)}
                />
              ))}
            </View>
            <View className="border-t border-gray-100 mt-2 pt-5">
              <Text className="text-sm font-medium text-gray-700 mb-2">Activity outside the gym</Text>
              <InfoHint text="How active are you during the day beyond workouts? This adjusts your calorie target to match your real energy needs." />
              {LIFESTYLE_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  {...opt}
                  selected={form.lifestyle_activity === opt.value}
                  onPress={() => set("lifestyle_activity", opt.value)}
                />
              ))}
            </View>
            <CommentBox
              placeholder='e.g. "I can only work out in the mornings before 8am"'
              value={comments.schedule}
              onChange={(v) => setComment("schedule", v)}
            />
          </>
        );

      case 4:
        return (
          <>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Almost there!</Text>
            <Text className="text-sm text-gray-500 mb-6">Equipment and diet — then your plan is ready</Text>
            <Text className="text-sm font-semibold text-gray-700 mb-3">What do you have access to?</Text>
            {EQUIPMENT_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                {...opt}
                selected={form.equipment === opt.value}
                onPress={() => set("equipment", opt.value)}
              />
            ))}
            <View className="border-t border-gray-100 mt-2 pt-5">
              <Text className="text-sm font-semibold text-gray-700 mb-3">Any dietary needs?</Text>
              <View className="flex-row flex-wrap">
                {DIET_OPTIONS.map((opt) => (
                  <PillButton
                    key={opt.value}
                    label={opt.label}
                    selected={form.diet_type === opt.value}
                    onPress={() => set("diet_type", opt.value)}
                  />
                ))}
              </View>
            </View>
            <CommentBox
              placeholder={"e.g. \"I hate fish, and I'm lactose intolerant\""}
              value={comments.diet}
              onChange={(v) => setComment("diet", v)}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <ScreenGradient>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 56 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress */}
        <View className="flex-row items-center mb-8">
          {step > 0 && (
            <TouchableOpacity onPress={() => setStep((s) => s - 1)} className="mr-3 p-1">
              <Text className="text-gray-400 text-lg">←</Text>
            </TouchableOpacity>
          )}
          <View className="flex-1 h-1.5 bg-gray-200 rounded-full">
            <View
              className="h-1.5 bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
          <Text className="text-xs text-gray-400 ml-3">{step + 1}/{TOTAL_STEPS}</Text>
        </View>

        {renderStep()}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-4 mb-2">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          className={`rounded-2xl py-4 items-center mt-6 mb-10 ${
            canProceed() ? "bg-primary" : "bg-gray-200"
          }`}
          onPress={handleNext}
          disabled={!canProceed() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className={`font-semibold text-base ${canProceed() ? "text-white" : "text-gray-400"}`}
            >
              {step < TOTAL_STEPS - 1 ? "Continue" : "Build My Plan"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenGradient>
  );
}
