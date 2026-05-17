import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useRef } from "react";
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import LogEventScreen from "../screens/LogEventScreen";
import ProfileScreen from "../screens/ProfileScreen";

// ─── Design tokens ────────────────────────────────────────────────────────────

const COLORS = {
  primary: "#16a34a",
  primaryMid: "#15803d",
  pillBg: "#16a34a",
  pillLabel: "#ffffff",
  inactiveIcon: "#9ca3af",
  inactiveLabel: "#9ca3af",
  barBg: "#ffffff",
  barBorder: "rgba(0,0,0,0.06)",
  shadow: "#000000",
};

const TYPOGRAPHY = {
  // Replace with PlusJakartaSans_600SemiBold once font is loaded
  labelFontFamily: Platform.select({ ios: "System", android: "sans-serif-medium" }),
  labelSize: 11,
  labelWeight: "600",
  labelTracking: 0.3,
};

const SPACING = {
  barHeight: 76,
  barPaddingH: 12,
  barMarginH: 16,
  barMarginBottom: 8,
  barRadius: 28,
  pillPaddingH: 18,
  pillPaddingV: 7,
  pillRadius: 50,
  iconSize: 22,
  iconSizeFocused: 21,
};

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
  {
    name: "Home",
    label: "Today",
    iconFocused: "today",
    iconBlur: "today-outline",
  },
  {
    name: "LogEvent",
    label: "Coach",
    iconFocused: "chatbubble-ellipses",
    iconBlur: "chatbubble-ellipses-outline",
  },
  {
    name: "Profile",
    label: "Profile",
    iconFocused: "person-circle",
    iconBlur: "person-circle-outline",
  },
];

// ─── Custom tab bar ───────────────────────────────────────────────────────────

function SerenFitTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const scaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;

  const handlePress = (route, index, isFocused) => {
    // Micro-bounce on the pressed item
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const handleLongPress = (route) => {
    navigation.emit({ type: "tabLongPress", target: route.key });
  };

  // Coach screen is a focused session — hide the tab bar there
  if (state.routes[state.index].name === "LogEvent") return null;

  return (
    <View
      style={[
        styles.barWrapper,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const tab = TABS[index];
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? tab.label;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? `${label} tab`}
              onPress={() => handlePress(route, index, isFocused)}
              onLongPress={() => handleLongPress(route)}
              activeOpacity={1}
              style={styles.tabTouchable}
            >
              <Animated.View
                style={[
                  styles.tabInner,
                  isFocused && styles.tabInnerFocused,
                  { transform: [{ scale: scaleAnims[index] }] },
                ]}
              >
                {/* Icon */}
                <Ionicons
                  name={isFocused ? tab.iconFocused : tab.iconBlur}
                  size={isFocused ? SPACING.iconSizeFocused : SPACING.iconSize}
                  color={isFocused ? COLORS.pillLabel : COLORS.inactiveIcon}
                />

                {/* Label — visible only when focused for a cleaner look */}
                {isFocused && (
                  <Text style={styles.tabLabel} numberOfLines={1}>
                    {label}
                  </Text>
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <SerenFitTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Today" }}
      />
      <Tab.Screen
        name="LogEvent"
        component={LogEventScreen}
        options={{ tabBarLabel: "Coach" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  barWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingHorizontal: SPACING.barMarginH,
  },

  // The pill-shaped floating card
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: COLORS.barBg,
    borderRadius: SPACING.barRadius,
    marginBottom: SPACING.barMarginBottom,
    paddingHorizontal: SPACING.barPaddingH,
    paddingVertical: 10,
    width: "100%",

    // Crisp, layered shadow — iOS
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,

    // Android elevation
    elevation: 16,

    // Subtle border to read clearly against the gradient background
    borderWidth: 1,
    borderColor: COLORS.barBorder,
  },

  // Each tab's tappable area — full flex so touch targets are generous
  tabTouchable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48, // WCAG touch target minimum
  },

  // Inner container — this is what gets the pill background
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SPACING.pillRadius,
    paddingHorizontal: 14,
    paddingVertical: SPACING.pillPaddingV,
    gap: 6,
  },

  // Pill highlight applied only when focused
  tabInnerFocused: {
    backgroundColor: COLORS.pillBg,
    // Subtle inner glow — works on iOS
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },

  tabLabel: {
    fontSize: TYPOGRAPHY.labelSize,
    fontWeight: TYPOGRAPHY.labelWeight,
    color: COLORS.pillLabel,
    letterSpacing: TYPOGRAPHY.labelTracking,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});

