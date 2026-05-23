import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { completeOnboarding } from "../api/auth";
import { generateWeeklyPlan } from "../api/plan";
import { useAuth } from "../context/AuthContext";
import ScreenGradient from "../components/ScreenGradient";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  green: "#16a34a",
  greenDark: "#15803d",
  greenMid: "#22c55e",
  greenTint: "#f0fdf4",
  greenBorder: "rgba(22,163,74,0.2)",
  white: "#ffffff",
  bg: "#f9fafb",
  surface: "#ffffff",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  heading: "#111827",
  body: "#374151",
  muted: "#6b7280",
  faint: "#9ca3af",
  inactive: "#f3f4f6",
  inactiveBorder: "#e5e7eb",
  inactiveText: "#6b7280",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
  errorText: "#dc2626",
};

const F = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const GOALS = [
  { glyph: "◎", label: "Lose fat", value: "lose_fat" },
  { glyph: "◈", label: "Build muscle", value: "build_muscle" },
  { glyph: "⊕", label: "Body recomp", value: "body_recomposition" },
  { glyph: "◉", label: "Performance", value: "athletic_performance" },
  { glyph: "◌", label: "Improve fitness", value: "improve_fitness" },
  { glyph: "≡", label: "Maintain weight", value: "maintain_weight" },
  { glyph: "○", label: "Stay healthy", value: "stay_healthy" },
  { glyph: "◫", label: "Custom goal", value: "custom" },
];

const FITNESS_LEVELS = [
  {
    dots: "● ○ ○",
    label: "Beginner",
    sub: "Building foundations — form, habits, consistency",
    value: "beginner",
  },
  {
    dots: "● ● ○",
    label: "Intermediate",
    sub: "Training regularly for 6+ months, ready to progress",
    value: "intermediate",
  },
  {
    dots: "● ● ●",
    label: "Advanced",
    sub: "Structured program, optimising performance",
    value: "advanced",
  },
];

const EQUIPMENT_OPTIONS = [
  { glyph: "◌", label: "No equipment", sub: "Bodyweight only", value: "none" },
  { glyph: "◈", label: "Home basics", sub: "Dumbbells, bands", value: "home_basics" },
  { glyph: "◉", label: "Full gym", sub: "Barbells, machines", value: "full_gym" },
];

const DIET_OPTIONS = [
  { label: "Everything", value: "non_vegetarian" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Other", value: "other" },
];

const LIFESTYLE_OPTIONS = [
  { label: "Sedentary", sub: "Mostly sitting", value: "sedentary" },
  { label: "Lightly active", sub: "Some walking", value: "lightly_active" },
  { label: "Moderately active", sub: "On your feet", value: "moderately_active" },
  { label: "Very active", sub: "Physical work", value: "very_active" },
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

const SESSION_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
];

const SEX_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
];

const TOTAL_STEPS = 5;
const { width: SCREEN_W } = Dimensions.get("window");

// ─── Sub-components ───────────────────────────────────────────────────────────

// Two-column goal tile grid
const GoalGrid = ({ selected, onSelect }) => (
  <View style={styles.goalGrid}>
    {GOALS.map((g) => {
      const active = selected === g.value;
      return (
        <TouchableOpacity
          key={g.value}
          style={[styles.goalTile, active && styles.goalTileActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(g.value);
          }}
          activeOpacity={0.75}
        >
          <Text style={[styles.goalGlyph, active && styles.goalGlyphActive]}>{g.glyph}</Text>
          <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>{g.label}</Text>
          {active && <View style={styles.goalDot} />}
        </TouchableOpacity>
      );
    })}
  </View>
);

// Large horizontal fitness level card
const FitnessCard = ({ item, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.fitnessCard, selected && styles.fitnessCardActive]}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(item.value);
    }}
    activeOpacity={0.75}
  >
    <View style={styles.fitnessLeft}>
      <Text style={[styles.fitnessDots, selected && styles.fitnessDotsActive]}>{item.dots}</Text>
      <Text style={[styles.fitnessLabel, selected && styles.fitnessLabelActive]}>{item.label}</Text>
      <Text style={[styles.fitnessSub, selected && styles.fitnessSubActive]}>{item.sub}</Text>
    </View>
    <View style={[styles.fitnessCheck, selected && styles.fitnessCheckActive]}>
      {selected && <Text style={styles.fitnessCheckMark}>✓</Text>}
    </View>
  </TouchableOpacity>
);

// Segmented-style number row
const SegmentRow = ({ options, selected, onSelect, renderLabel }) => (
  <View style={styles.segmentRow}>
    {options.map((opt) => {
      const val = typeof opt === "object" ? opt.value : opt;
      const lbl = renderLabel ? renderLabel(opt) : String(opt);
      const active = selected === val;
      return (
        <TouchableOpacity
          key={val}
          style={[styles.segmentCell, active && styles.segmentCellActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(val);
          }}
          activeOpacity={0.75}
        >
          <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{lbl}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// Large single stat input
const StatInput = ({ label, value, onChange, placeholder, unit, keyboardType }) => (
  <View style={styles.statWrap}>
    <Text style={styles.statLabel}>{label}</Text>
    <View style={styles.statInputRow}>
      <TextInput
        style={styles.statInput}
        keyboardType={keyboardType || "numeric"}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
      />
      {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
    </View>
  </View>
);

// Sex chips — three in a row
const SexChips = ({ selected, onSelect }) => (
  <View style={styles.sexRow}>
    {SEX_OPTIONS.map((s) => {
      const active = selected === s.value;
      return (
        <TouchableOpacity
          key={s.value}
          style={[styles.sexChip, s.value === "prefer_not_to_say" && styles.sexChipWide, active && styles.sexChipActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(s.value);
          }}
          activeOpacity={0.75}
        >
          <Text style={[styles.sexChipLabel, active && styles.sexChipLabelActive]}>{s.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// Horizontal card row (equipment / lifestyle)
const HorizontalCards = ({ options, selected, onSelect }) => (
  <View style={styles.hCardRow}>
    {options.map((opt) => {
      const active = selected === opt.value;
      return (
        <TouchableOpacity
          key={opt.value}
          style={[styles.hCard, active && styles.hCardActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(opt.value);
          }}
          activeOpacity={0.75}
        >
          {opt.glyph ? (
            <Text style={[styles.hCardGlyph, active && styles.hCardGlyphActive]}>{opt.glyph}</Text>
          ) : null}
          <Text style={[styles.hCardLabel, active && styles.hCardLabelActive]}>{opt.label}</Text>
          {opt.sub ? (
            <Text style={[styles.hCardSub, active && styles.hCardSubActive]}>{opt.sub}</Text>
          ) : null}
        </TouchableOpacity>
      );
    })}
  </View>
);

// Collapsible "+ Add note" comment box
const CollapsibleNote = ({ placeholder, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    if (!open) {
      setOpen(true);
      Animated.parallel([
        Animated.spring(heightAnim, {
          toValue: 100,
          useNativeDriver: false,
          friction: 8,
          tension: 60,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(heightAnim, {
          toValue: 0,
          useNativeDriver: false,
          friction: 8,
          tension: 60,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start(() => setOpen(false));
    }
  };

  return (
    <View style={styles.noteWrap}>
      <TouchableOpacity style={styles.noteToggle} onPress={toggle} activeOpacity={0.7}>
        <Text style={styles.noteToggleIcon}>{open ? "−" : "+"}</Text>
        <Text style={styles.noteToggleLabel}>{open ? "Hide note" : "Add a note"}</Text>
      </TouchableOpacity>
      <Animated.View style={{ height: heightAnim, opacity: opacityAnim, overflow: "hidden" }}>
        <TextInput
          style={styles.noteInput}
          placeholder={placeholder}
          placeholderTextColor={C.faint}
          value={value}
          onChangeText={onChange}
          multiline
          textAlignVertical="top"
        />
      </Animated.View>
    </View>
  );
};

// ─── Step label map ───────────────────────────────────────────────────────────
const STEP_META = [
  { heading: "What's your goal?", sub: "We'll build your entire plan around this" },
  { heading: "Your body stats", sub: "Used to personalise your calorie and macro targets" },
  { heading: "Fitness level", sub: "We'll match intensity and structure to where you are" },
  { heading: "Fit it into your life", sub: "Be realistic — consistency beats perfection" },
  { heading: "Almost done", sub: "Equipment and diet, then your plan is ready" },
];

// ─── Main screen ──────────────────────────────────────────────────────────────
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

  // ── Animation refs ──
  const slideAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value((1 / TOTAL_STEPS) * 100)).current;
  const backOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

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

  // Slide new step in from right, old step out to left
  const animateToStep = (nextStep, direction) => {
    const outX = direction === "forward" ? -SCREEN_W * 0.18 : SCREEN_W * 0.18;
    const inX = direction === "forward" ? SCREEN_W * 0.18 : -SCREEN_W * 0.18;

    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: outX, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(inX);
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 70 }),
      ]).start();
    });

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: ((nextStep + 1) / TOTAL_STEPS) * 100,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Back arrow visibility
    Animated.timing(backOpacity, {
      toValue: nextStep > 0 ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      animateToStep(step + 1, "forward");
      return;
    }
    // Button press spring on final step
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, friction: 5 }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();

    setLoading(true);
    setError(null);
    try {
      const personalizationContext = [
        comments.goal,
        comments.about,
        comments.fitness,
        comments.schedule,
        comments.diet,
      ]
        .filter(Boolean)
        .join(". ");

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

  const handleBack = () => {
    if (step === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateToStep(step - 1, "back");
  };

  // ── Step renderers ──
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <GoalGrid selected={form.goal} onSelect={(v) => set("goal", v)} />
            <CollapsibleNote
              placeholder='e.g. "I want to lose 5 kg before my wedding in 3 months"'
              value={comments.goal}
              onChange={(v) => setComment("goal", v)}
            />
          </>
        );

      case 1:
        return (
          <>
            <View style={styles.statsRow}>
              <StatInput
                label="Age"
                value={form.age}
                onChange={(v) => set("age", v)}
                placeholder="28"
              />
              <StatInput
                label="Weight"
                value={form.weight}
                onChange={(v) => set("weight", v)}
                placeholder="72"
                unit="kg"
              />
              <StatInput
                label="Height"
                value={form.height}
                onChange={(v) => set("height", v)}
                placeholder="175"
                unit="cm"
              />
            </View>
            <Text style={styles.sectionLabel}>Biological sex</Text>
            <SexChips selected={form.sex} onSelect={(v) => set("sex", v)} />
            <CollapsibleNote
              placeholder='e.g. "I have a slow metabolism, diets never seem to work for me"'
              value={comments.about}
              onChange={(v) => setComment("about", v)}
            />
          </>
        );

      case 2:
        return (
          <>
            {FITNESS_LEVELS.map((item) => (
              <FitnessCard
                key={item.value}
                item={item}
                selected={form.fitness_level === item.value}
                onPress={(v) => set("fitness_level", v)}
              />
            ))}
            <CollapsibleNote
              placeholder='e.g. "I used to lift 2 years ago but stopped, getting back now"'
              value={comments.fitness}
              onChange={(v) => setComment("fitness", v)}
            />
          </>
        );

      case 3:
        return (
          <>
            <Text style={styles.sectionLabel}>Days per week</Text>
            <SegmentRow
              options={DAYS_OPTIONS}
              selected={form.workout_days_per_week}
              onSelect={(v) => set("workout_days_per_week", v)}
            />
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Session length</Text>
            <Text style={styles.sectionHint}>includes warm-up and cool-down</Text>
            <SegmentRow
              options={SESSION_OPTIONS}
              selected={form.session_length_minutes}
              onSelect={(v) => set("session_length_minutes", v)}
              renderLabel={(opt) => opt.label}
            />
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Activity outside workouts</Text>
            <Text style={styles.sectionHint}>Adjusts your daily calorie target</Text>
            <HorizontalCards
              options={LIFESTYLE_OPTIONS}
              selected={form.lifestyle_activity}
              onSelect={(v) => set("lifestyle_activity", v)}
            />
            <CollapsibleNote
              placeholder='e.g. "I can only work out before 8 am"'
              value={comments.schedule}
              onChange={(v) => setComment("schedule", v)}
            />
          </>
        );

      case 4:
        return (
          <>
            <Text style={styles.sectionLabel}>Equipment access</Text>
            <HorizontalCards
              options={EQUIPMENT_OPTIONS}
              selected={form.equipment}
              onSelect={(v) => set("equipment", v)}
            />
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Dietary preference</Text>
            <SegmentRow
              options={DIET_OPTIONS}
              selected={form.diet_type}
              onSelect={(v) => set("diet_type", v)}
              renderLabel={(opt) => opt.label}
            />
            <CollapsibleNote
              placeholder={"e.g. \"I hate fish and I'm lactose intolerant\""}
              value={comments.diet}
              onChange={(v) => setComment("diet", v)}
            />
          </>
        );

      default:
        return null;
    }
  };

  const ready = canProceed();
  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <ScreenGradient>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── Top bar: back + progress ── */}
        <View style={styles.topBar}>
          <Animated.View style={{ opacity: backOpacity }}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          <Text style={styles.stepCounter}>{step + 1}/{TOTAL_STEPS}</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Animated step content ── */}
          <Animated.View
            style={{
              transform: [{ translateX: slideAnim }],
              opacity: contentOpacity,
            }}
          >
            {/* Heading */}
            <View style={styles.headingWrap}>
              <Text style={styles.heading}>{STEP_META[step].heading}</Text>
              <Text style={styles.subheading}>{STEP_META[step].sub}</Text>
            </View>

            {/* Step content */}
            {renderStep()}
          </Animated.View>

          {/* ── Error ── */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── CTA button ── */}
          <Animated.View style={[styles.ctaWrap, { transform: [{ scale: btnScale }] }]}>
            <TouchableOpacity
              style={[styles.ctaBtn, ready ? styles.ctaBtnReady : styles.ctaBtnWaiting]}
              onPress={handleNext}
              disabled={!ready || loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={[styles.ctaLabel, ready ? styles.ctaLabelReady : styles.ctaLabelWaiting]}>
                  {isLastStep ? "Build My Plan" : "Continue"}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 28,
    alignItems: "center",
  },
  backArrow: {
    fontSize: 20,
    color: C.muted,
    fontFamily: F.regular,
    lineHeight: 24,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    backgroundColor: C.borderLight,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 2,
    backgroundColor: C.green,
    borderRadius: 2,
  },
  stepCounter: {
    fontSize: 11,
    color: C.faint,
    fontFamily: F.medium,
    minWidth: 28,
    textAlign: "right",
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Heading
  headingWrap: {
    marginBottom: 28,
  },
  heading: {
    fontSize: 22,
    fontFamily: F.bold,
    color: C.heading,
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 5,
  },
  subheading: {
    fontSize: 13,
    fontFamily: F.regular,
    color: C.muted,
    lineHeight: 18,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontFamily: F.semibold,
    color: C.faint,
    marginBottom: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionHint: {
    fontSize: 11,
    fontFamily: F.regular,
    color: C.faint,
    marginTop: -6,
    marginBottom: 12,
  },

  // Goal grid
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  goalTile: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.inactiveBorder,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "flex-start",
    width: "47.5%",
    minHeight: 88,
    position: "relative",
  },
  goalTileActive: {
    backgroundColor: C.greenTint,
    borderColor: C.green,
  },
  goalGlyph: {
    fontSize: 18,
    color: C.faint,
    fontFamily: F.regular,
    marginBottom: 7,
  },
  goalGlyphActive: {
    color: C.green,
  },
  goalLabel: {
    fontSize: 13,
    fontFamily: F.semibold,
    color: C.body,
    lineHeight: 17,
  },
  goalLabelActive: {
    color: C.greenDark,
  },
  goalDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
  },

  // Fitness level cards
  fitnessCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.inactiveBorder,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    justifyContent: "space-between",
  },
  fitnessCardActive: {
    backgroundColor: C.greenTint,
    borderColor: C.green,
  },
  fitnessLeft: {
    flex: 1,
  },
  fitnessDots: {
    fontSize: 11,
    fontFamily: F.medium,
    color: C.faint,
    letterSpacing: 3,
    marginBottom: 6,
  },
  fitnessDotsActive: {
    color: C.greenMid,
  },
  fitnessLabel: {
    fontSize: 15,
    fontFamily: F.bold,
    color: C.heading,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  fitnessLabelActive: {
    color: C.greenDark,
  },
  fitnessSub: {
    fontSize: 12,
    fontFamily: F.regular,
    color: C.muted,
    lineHeight: 17,
  },
  fitnessSubActive: {
    color: C.green,
  },
  fitnessCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.inactiveBorder,
    backgroundColor: C.inactive,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
  },
  fitnessCheckActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  fitnessCheckMark: {
    color: C.white,
    fontSize: 11,
    fontFamily: F.bold,
    lineHeight: 13,
  },

  // Segmented row
  segmentRow: {
    flexDirection: "row",
    backgroundColor: C.inactive,
    borderRadius: 14,
    padding: 3,
    marginBottom: 4,
  },
  segmentCell: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 11,
  },
  segmentCellActive: {
    backgroundColor: C.green,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentLabel: {
    fontSize: 13,
    fontFamily: F.semibold,
    color: C.muted,
  },
  segmentLabelActive: {
    color: C.white,
  },

  // Stats row (age / weight / height)
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statWrap: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: F.semibold,
    color: C.faint,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 7,
  },
  statInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statInput: {
    flex: 1,
    fontSize: 17,
    fontFamily: F.bold,
    color: C.heading,
    padding: 0,
    letterSpacing: -0.2,
  },
  statUnit: {
    fontSize: 12,
    fontFamily: F.medium,
    color: C.faint,
    marginLeft: 4,
  },

  // Sex chips
  sexRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  sexChip: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.inactiveBorder,
  },
  sexChipWide: {
    flex: 2,
  },
  sexChipActive: {
    backgroundColor: C.greenTint,
    borderColor: C.green,
  },
  sexChipLabel: {
    fontSize: 13,
    fontFamily: F.semibold,
    color: C.inactiveText,
  },
  sexChipLabelActive: {
    color: C.greenDark,
  },

  // Horizontal cards (equipment / lifestyle)
  hCardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  hCard: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.inactiveBorder,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  hCardActive: {
    backgroundColor: C.greenTint,
    borderColor: C.green,
  },
  hCardGlyph: {
    fontSize: 16,
    color: C.faint,
    marginBottom: 5,
  },
  hCardGlyphActive: {
    color: C.green,
  },
  hCardLabel: {
    fontSize: 12,
    fontFamily: F.semibold,
    color: C.body,
    textAlign: "center",
    marginBottom: 2,
  },
  hCardLabelActive: {
    color: C.greenDark,
  },
  hCardSub: {
    fontSize: 10,
    fontFamily: F.regular,
    color: C.faint,
    textAlign: "center",
    lineHeight: 14,
  },
  hCardSubActive: {
    color: C.green,
  },

  // Collapsible note
  noteWrap: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    paddingTop: 16,
  },
  noteToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteToggleIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.inactive,
    textAlign: "center",
    lineHeight: 18,
    fontSize: 13,
    color: C.muted,
    fontFamily: F.bold,
    overflow: "hidden",
  },
  noteToggleLabel: {
    fontSize: 12,
    fontFamily: F.medium,
    color: C.muted,
  },
  noteInput: {
    marginTop: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    fontFamily: F.regular,
    color: C.body,
    minHeight: 72,
    textAlignVertical: "top",
  },

  // Error
  errorBox: {
    backgroundColor: C.errorBg,
    borderWidth: 1,
    borderColor: C.errorBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 12,
    fontFamily: F.regular,
    color: C.errorText,
    lineHeight: 17,
  },

  // CTA
  ctaWrap: {
    marginTop: 32,
  },
  ctaBtn: {
    borderRadius: 26,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnReady: {
    backgroundColor: C.green,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaBtnWaiting: {
    backgroundColor: C.inactive,
  },
  ctaLabel: {
    fontSize: 15,
    fontFamily: F.bold,
    letterSpacing: 0.2,
  },
  ctaLabelReady: {
    color: C.white,
  },
  ctaLabelWaiting: {
    color: C.faint,
  },
});
