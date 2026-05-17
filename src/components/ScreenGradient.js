import { LinearGradient } from "expo-linear-gradient";

// Default colors: green-tinted morning gradient
const DEFAULT_COLORS = ["#ecfdf5", "#f9fafb", "#ffffff"];

export default function ScreenGradient({ children, style, colors }) {
  return (
    <LinearGradient
      colors={colors ?? DEFAULT_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
