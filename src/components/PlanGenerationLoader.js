import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

export default function PlanGenerationLoader({ message, progress }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const msgOpacity = useRef(new Animated.Value(1)).current;
  const msgY = useRef(new Animated.Value(0)).current;
  const prevMsg = useRef(message);

  // Staggered ripple rings + icon pulse (loop forever)
  useEffect(() => {
    const makeRipple = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    const r1 = makeRipple(ring1, 0);
    const r2 = makeRipple(ring2, 600);
    const r3 = makeRipple(ring3, 1200);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: 1.15,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    r1.start(); r2.start(); r3.start(); pulse.start();
    return () => { r1.stop(); r2.stop(); r3.stop(); pulse.stop(); };
  }, []);

  // Smooth progress bar width — layout prop, can't use native driver
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Fade-in + slide-up whenever message changes
  useEffect(() => {
    if (message !== prevMsg.current) {
      prevMsg.current = message;
      msgOpacity.setValue(0);
      msgY.setValue(14);
      Animated.parallel([
        Animated.timing(msgOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(msgY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [message]);

  const ringStyle = (anim) => ({
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "#16a34a",
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.3] }) }],
  });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#030712",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
    >
      {/* Ripple orb */}
      <View style={{ width: 140, height: 140, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={ringStyle(ring1)} />
        <Animated.View style={ringStyle(ring2)} />
        <Animated.View style={ringStyle(ring3)} />
        <Animated.View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#16a34a",
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: iconScale }],
            shadowColor: "#16a34a",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 20,
            elevation: 20,
          }}
        >
          <Text style={{ fontSize: 36 }}>💪</Text>
        </Animated.View>
      </View>

      {/* Live message with fade-in/slide-up */}
      <Animated.Text
        style={{
          color: "#f9fafb",
          fontSize: 18,
          fontWeight: "600",
          textAlign: "center",
          marginTop: 40,
          lineHeight: 26,
          opacity: msgOpacity,
          transform: [{ translateY: msgY }],
        }}
      >
        {message}
      </Animated.Text>
      <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 8, textAlign: "center" }}>
        Hang tight, this takes ~20 seconds
      </Text>

      {/* Animated progress bar */}
      <View style={{ width: "100%", marginTop: 40 }}>
        <View
          style={{ backgroundColor: "#1f2937", borderRadius: 8, height: 6, overflow: "hidden" }}
        >
          <Animated.View
            style={{
              height: "100%",
              borderRadius: 8,
              backgroundColor: "#16a34a",
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            }}
          />
        </View>
        <Text style={{ color: "#4b5563", fontSize: 12, textAlign: "right", marginTop: 6 }}>
          {Math.round(progress)}%
        </Text>
      </View>
    </View>
  );
}
