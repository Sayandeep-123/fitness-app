import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function MacroRing({
  label,
  consumed,
  target,
  color,
  unit = "g",
  size = 82,
  stroke = 9,
  featured = false,
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const over = target > 0 && consumed > target;
  const ringColor = over ? "#ef4444" : color;
  const offset = useRef(new Animated.Value(circumference)).current;
  const cx = size / 2;

  useEffect(() => {
    Animated.timing(offset, {
      toValue: circumference * (1 - pct),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={styles.wrapper}>
      <View>
        <Svg width={size} height={size}>
          <Circle
            cx={cx} cy={cx} r={radius}
            stroke="#e5e7eb" strokeWidth={stroke}
            fill="none"
          />
          <AnimatedCircle
            cx={cx} cy={cx} r={radius}
            stroke={ringColor}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${cx}, ${cx}`}
          />
        </Svg>

        <View style={[StyleSheet.absoluteFill, styles.centerLabel]}>
          {featured ? (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: Math.round(size * 0.17), fontWeight: "700", color: ringColor }}>
                {consumed}
              </Text>
              <Text style={{ fontSize: Math.round(size * 0.105), color: "#9ca3af", marginTop: 1 }}>
                /{target}
              </Text>
              <Text style={{ fontSize: Math.round(size * 0.085), color: ringColor, opacity: 0.65, marginTop: 2 }}>
                {unit.trim()}
              </Text>
            </View>
          ) : (
            <Text style={[styles.pct, { color: ringColor, fontSize: size < 70 ? 11 : 13 }]}>
              {Math.round(pct * 100)}%
            </Text>
          )}
        </View>
      </View>

      {!featured && (
        <>
          <Text style={[styles.label, size < 70 && { fontSize: 10, marginTop: 4 }]}>{label}</Text>
          <Text style={[styles.value, size < 70 && { fontSize: 10 }]}>
            <Text style={{ color: ringColor, fontWeight: "600" }}>{consumed}</Text>
            <Text style={styles.max}>/{target}{unit}</Text>
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  centerLabel: {
    alignItems: "center",
    justifyContent: "center",
  },
  pct: {
    fontSize: 13,
    fontWeight: "700",
  },
  label: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 6,
  },
  value: {
    fontSize: 11,
    marginTop: 2,
  },
  max: {
    color: "#9ca3af",
  },
});
