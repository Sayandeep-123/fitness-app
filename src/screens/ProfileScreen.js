import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getMe, updateProfile } from "../api/auth";
import { generatePlan } from "../api/plan";
import { useAuth } from "../context/AuthContext";
import ScreenGradient from "../components/ScreenGradient";

const PLAN_FIELDS = ["goal", "diet_type", "lifestyle_activity", "weight", "height", "age", "sex"];

const GOALS = [
  { label: "Lose Fat", value: "lose_fat" },
  { label: "Build Muscle", value: "build_muscle" },
  { label: "Body Recomposition", value: "body_recomposition" },
  { label: "Athletic Performance", value: "athletic_performance" },
  { label: "Improve Fitness", value: "improve_fitness" },
  { label: "Maintain Weight", value: "maintain_weight" },
  { label: "Stay Healthy", value: "stay_healthy" },
  { label: "Custom Goal", value: "custom" },
];

const DIET_TYPES = [
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Eggetarian", value: "eggetarian" },
  { label: "Non-Veg", value: "non_vegetarian" },
];

const LIFESTYLE_ACTIVITIES = [
  { label: "Sedentary", value: "sedentary" },
  { label: "Lightly Active", value: "lightly_active" },
  { label: "Moderately Active", value: "moderately_active" },
  { label: "Very Active", value: "very_active" },
];

const CUISINES = [
  { label: "Indian", value: "indian" },
  { label: "Mediterranean", value: "mediterranean" },
  { label: "Asian", value: "asian" },
  { label: "Western", value: "western" },
];

const BUDGETS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const COOKING_LEVELS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const SectionHeader = ({ title }) => (
  <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-6">
    {title}
  </Text>
);

const ReadOnlyField = ({ label, value }) => (
  <View className="bg-gray-100 border border-gray-100 rounded-2xl px-4 py-3 mb-3">
    <Text className="text-xs text-gray-400 mb-0.5">{label}</Text>
    <Text className="text-base text-gray-400">{value ?? "—"}</Text>
  </View>
);

const InputField = ({ label, value, onChange, placeholder, keyboardType = "default" }) => (
  <View className="bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3">
    <Text className="text-xs text-gray-400 mb-0.5">{label}</Text>
    <TextInput
      className="text-base text-gray-900"
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType={keyboardType}
    />
  </View>
);

const Chip = ({ label, selected, onPress }) => (
  <TouchableOpacity
    className={`border rounded-xl px-3 py-1.5 mr-2 mb-2 ${
      selected ? "bg-primary border-primary" : "bg-white border-gray-200"
    }`}
    onPress={onPress}
  >
    <Text className={`text-sm font-medium ${selected ? "text-white" : "text-gray-700"}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

const ChipGroup = ({ options, value, onChange }) => (
  <View className="flex-row flex-wrap mb-1">
    {options.map((opt) => (
      <Chip
        key={opt.value}
        label={opt.label}
        selected={value === opt.value}
        onPress={() => onChange(opt.value)}
      />
    ))}
  </View>
);

const buildForm = (u) => ({
  phone: u?.phone ?? "",
  weight: u?.weight ? String(u.weight) : "",
  height: u?.height ? String(u.height) : "",
  age: u?.age ? String(u.age) : "",
  sex: u?.sex ?? "",
  goal: u?.goal ?? "",
  diet_type: u?.diet_type ?? "",
  lifestyle_activity: u?.lifestyle_activity ?? "",
  cuisine_preference: u?.cuisine_preference ?? "indian",
  budget: u?.budget ?? "medium",
  cooking_level: u?.cooking_level ?? "beginner",
});

export default function ProfileScreen() {
  const { user, updateUser, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(() => buildForm(user));

  useEffect(() => {
    getMe().then(({ user: fresh }) => {
      updateUser(fresh);
      setForm(buildForm(fresh));
    }).catch(() => {});
  }, []);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const numericFields = ["weight", "height", "age"];
    const changed = Object.keys(form).filter((f) => {
      const userVal = numericFields.includes(f) ? String(user?.[f] ?? "") : (user?.[f] ?? "");
      return form[f] !== userVal;
    });

    if (changed.length === 0) return;

    const shouldRegenerate = changed.some((f) => PLAN_FIELDS.includes(f));

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = Object.fromEntries(
        changed.map((f) => {
          if (f === "weight" || f === "height") return [f, parseFloat(form[f])];
          if (f === "age") return [f, parseInt(form[f], 10)];
          return [f, form[f]];
        })
      );
      const { user: updated } = await updateProfile(payload);
      updateUser(updated);
      setSaved(true);

      if (shouldRegenerate) {
        Alert.alert(
          "Recalculate Plan?",
          "Your fitness details changed. Regenerate your plan with the updated info?",
          [
            { text: "Not now", style: "cancel" },
            { text: "Regenerate", onPress: () => generatePlan() },
          ]
        );
      }
    } catch (err) {
      setError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
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
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-white">
              {(user?.name ?? "U")[0].toUpperCase()}
            </Text>
          </View>
          <Text className="text-xl font-bold text-gray-900">{user?.name}</Text>
          <Text className="text-sm text-gray-400 mt-0.5">{user?.email}</Text>
        </View>

        {/* Account — read-only */}
        <SectionHeader title="Account" />
        <ReadOnlyField label="Name" value={user?.name} />
        <ReadOnlyField label="Email" value={user?.email} />

        {/* Personal — editable */}
        <SectionHeader title="Personal" />
        <InputField
          label="Phone (optional)"
          value={form.phone}
          onChange={(v) => set("phone", v)}
          placeholder="+91 XXXXX XXXXX"
          keyboardType="phone-pad"
        />
        <InputField
          label="Weight (kg)"
          value={form.weight}
          onChange={(v) => set("weight", v)}
          placeholder="e.g. 75"
          keyboardType="numeric"
        />
        <InputField
          label="Height (cm)"
          value={form.height}
          onChange={(v) => set("height", v)}
          placeholder="e.g. 175"
          keyboardType="numeric"
        />
        <InputField
          label="Age"
          value={form.age}
          onChange={(v) => set("age", v)}
          placeholder="e.g. 26"
          keyboardType="numeric"
        />

        <View className="mb-3">
          <Text className="text-xs text-gray-400 mb-2">Biological Sex</Text>
          <View className="flex-row gap-2">
            {[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
              { label: "Prefer not to say", value: "prefer_not_to_say" },
            ].map((s) => (
              <TouchableOpacity
                key={s.value}
                className={`flex-1 border rounded-2xl py-2.5 items-center ${
                  form.sex === s.value ? "bg-primary border-primary" : "bg-white border-gray-200"
                }`}
                onPress={() => set("sex", s.value)}
              >
                <Text
                  className={`font-medium text-sm ${
                    form.sex === s.value ? "text-white" : "text-gray-700"
                  }`}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Goal */}
        <SectionHeader title="Goal" />
        <ChipGroup options={GOALS} value={form.goal} onChange={(v) => set("goal", v)} />

        {/* Diet */}
        <SectionHeader title="Diet Type" />
        <ChipGroup options={DIET_TYPES} value={form.diet_type} onChange={(v) => set("diet_type", v)} />

        {/* Activity */}
        <SectionHeader title="Activity Outside the Gym" />
        <ChipGroup
          options={LIFESTYLE_ACTIVITIES}
          value={form.lifestyle_activity}
          onChange={(v) => set("lifestyle_activity", v)}
        />

        {/* Preferences */}
        <SectionHeader title="Preferences" />
        <Text className="text-xs text-gray-500 mb-2">Cuisine</Text>
        <ChipGroup
          options={CUISINES}
          value={form.cuisine_preference}
          onChange={(v) => set("cuisine_preference", v)}
        />
        <Text className="text-xs text-gray-500 mb-2">Budget</Text>
        <ChipGroup options={BUDGETS} value={form.budget} onChange={(v) => set("budget", v)} />
        <Text className="text-xs text-gray-500 mb-2">Cooking Level</Text>
        <ChipGroup
          options={COOKING_LEVELS}
          value={form.cooking_level}
          onChange={(v) => set("cooking_level", v)}
        />

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-4">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        )}

        {saved && !error && (
          <View className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mt-4">
            <Text className="text-green-700 text-sm">Profile saved successfully.</Text>
          </View>
        )}

        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 items-center mt-6"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="border border-gray-200 rounded-2xl py-4 items-center mt-3"
          onPress={logout}
        >
          <Text className="text-gray-500 font-medium text-base">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenGradient>
  );
}
