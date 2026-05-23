import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

const DARK = "#0d1f13";
const GREEN = "#16a34a";

export default function SplashScreen({ onDone }) {
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const ring1Scale   = useRef(new Animated.Value(0.65)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale   = useRef(new Animated.Value(0.65)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale   = useRef(new Animated.Value(0.65)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  const iconScale   = useRef(new Animated.Value(0.4)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  const wordmarkY       = useRef(new Animated.Value(28)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity  = useRef(new Animated.Value(0)).current;

  const ring = (scale, opacity, delay) =>
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, friction: 7, tension: 55, delay, useNativeDriver: true }),
    ]);

  useEffect(() => {
    Animated.parallel([
      ring(ring1Scale, ring1Opacity, 60),
      ring(ring2Scale, ring2Opacity, 180),
      ring(ring3Scale, ring3Opacity, 300),

      Animated.sequence([
        Animated.delay(260),
        Animated.parallel([
          Animated.spring(iconScale,   { toValue: 1, friction: 6, tension: 85, useNativeDriver: true }),
          Animated.timing(iconOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        ]),
      ]),

      Animated.sequence([
        Animated.delay(680),
        Animated.parallel([
          Animated.spring(wordmarkY,       { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
          Animated.timing(wordmarkOpacity, { toValue: 1, duration: 340, useNativeDriver: true }),
        ]),
      ]),

      Animated.sequence([
        Animated.delay(980),
        Animated.timing(taglineOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();

    const fadeOut = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }).start(() => onDone?.());
    }, 2300);

    return () => clearTimeout(fadeOut);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Rings + icon cluster */}
      <View style={styles.cluster}>
        <Animated.View style={[styles.ring, styles.ring3, { opacity: ring3Opacity, transform: [{ scale: ring3Scale }] }]} />
        <Animated.View style={[styles.ring, styles.ring2, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
        <Animated.View style={[styles.ring, styles.ring1, { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />

        <Animated.View style={[styles.iconWrap, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}>
          <Image source={require("../../assets/icon.png")} style={styles.icon} resizeMode="cover" />
        </Animated.View>
      </View>

      {/* Wordmark */}
      <Animated.View style={[styles.textBlock, { opacity: wordmarkOpacity, transform: [{ translateY: wordmarkY }] }]}>
        <Text style={styles.wordmark}>SerenFit</Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Your adaptive fitness coach
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
  },

  cluster: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },

  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
  },
  ring1: {
    width: 134,
    height: 134,
    borderColor: "rgba(22,163,74,0.38)",
  },
  ring2: {
    width: 164,
    height: 164,
    borderColor: "rgba(22,163,74,0.20)",
  },
  ring3: {
    width: 196,
    height: 196,
    borderColor: "rgba(22,163,74,0.10)",
  },

  iconWrap: {
    width: 92,
    height: 92,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 14,
  },
  icon: {
    width: 92,
    height: 92,
  },

  textBlock: {
    alignItems: "center",
  },
  wordmark: {
    fontSize: 34,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#ffffff",
    letterSpacing: -0.6,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "rgba(255,255,255,0.42)",
    marginTop: 7,
    letterSpacing: 0.15,
  },
});
