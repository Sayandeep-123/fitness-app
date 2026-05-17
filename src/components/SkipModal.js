import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 1.5;

export default function SkipModal({ visible, title, onAskAlex, onSkip, onCancel }) {
  const insets = useSafeAreaInsets();
  const positionY = useRef(new Animated.Value(500)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  // Ref keeps panResponder callbacks current without stale closure
  const onCancelRef = useRef(onCancel);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);

  useEffect(() => {
    if (visible) {
      positionY.setValue(500);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(positionY, { toValue: 0, damping: 22, stiffness: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 180, useNativeDriver: true }),
        Animated.timing(positionY, { toValue: 500, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      // Claim blank-area touches (handle, title) — button children are deeper so they still win
      onStartShouldSetPanResponder: () => true,
      // Don't re-steal in bubble phase
      onMoveShouldSetPanResponder: () => false,
      // Capture phase — steal downward drag from button children (tap stays < 8px dy so buttons still fire)
      onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 8 && g.dy > Math.abs(g.dx),

      onPanResponderMove: (_, g) => {
        if (g.dy > 0) positionY.setValue(g.dy);
      },

      onPanResponderRelease: (_, g) => {
        const shouldDismiss = g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY;
        if (g.dy > 0 && shouldDismiss) {
          Animated.timing(positionY, { toValue: 500, duration: 200, useNativeDriver: true })
            .start(() => onCancelRef.current?.());
        } else {
          Animated.spring(positionY, { toValue: 0, damping: 20, stiffness: 300, useNativeDriver: true }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(positionY, { toValue: 0, damping: 20, stiffness: 300, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      {/*
        Flex column layout: backdrop fills space ABOVE the sheet.
        No absoluteFill overlap — sheet gets clean gesture ownership.
      */}
      <View style={styles.container}>
        {/* Backdrop — only covers area above sheet, tap to dismiss */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 24), transform: [{ translateY: positionY }] },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          <Text style={styles.title}>{title}</Text>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.primaryBtn} onPress={onAskAlex} activeOpacity={0.82}>
            <Text style={styles.primaryBtnLabel}>Ask Alex for an alternative</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onSkip} activeOpacity={0.82}>
            <Text style={styles.secondaryBtnLabel}>Skip anyway</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelBtnLabel}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 24,
  },

  handleArea: {
    alignItems: "center",
    paddingVertical: 10,
    marginHorizontal: -24,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    letterSpacing: -0.2,
    fontFamily: "PlusJakartaSans_700Bold",
  },

  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 14,
  },

  primaryBtn: {
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 8,
  },
  primaryBtnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#15803d",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },

  secondaryBtn: {
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 8,
  },
  secondaryBtnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },

  cancelBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelBtnLabel: {
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: "500",
    fontFamily: "PlusJakartaSans_500Medium",
  },
});
