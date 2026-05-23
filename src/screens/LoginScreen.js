import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMe } from "../api/auth";
import { saveToken } from "../api/client";
import { API_BASE_URL } from "../constants/config";
import { useAuth } from "../context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

const DARK  = "#0d1f13";
const GREEN = "#16a34a";

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // ── Entrance animations ──
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const arc1Scale   = useRef(new Animated.Value(0.78)).current;
  const arc2Scale   = useRef(new Animated.Value(0.78)).current;
  const arc3Scale   = useRef(new Animated.Value(0.78)).current;
  const iconScale   = useRef(new Animated.Value(0.82)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const textY       = useRef(new Animated.Value(16)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const sheetY      = useRef(new Animated.Value(110)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 460, useNativeDriver: true }),

      Animated.sequence([
        Animated.delay(80),
        Animated.spring(arc1Scale, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(160),
        Animated.spring(arc2Scale, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(240),
        Animated.spring(arc3Scale, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
      ]),

      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.spring(iconScale,   { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
          Animated.timing(iconOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ]),

      Animated.sequence([
        Animated.delay(380),
        Animated.parallel([
          Animated.spring(textY,       { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
          Animated.timing(textOpacity, { toValue: 1, duration: 340, useNativeDriver: true }),
        ]),
      ]),

      Animated.sequence([
        Animated.delay(320),
        Animated.parallel([
          Animated.spring(sheetY,      { toValue: 0, friction: 11, tension: 72, useNativeDriver: true }),
          Animated.timing(sheetOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const returnUrl = Linking.createURL("auth-callback");
      const authUrl   = `${API_BASE_URL}/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`;
      const result    = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);

      if (result.type !== "success") { setLoading(false); return; }

      const parsed = Linking.parse(result.url);
      const token  = parsed.queryParams?.token;

      if (!token) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      await saveToken(token);
      const data = await getMe();
      login(data.user);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* ── Hero zone ── */}
      <Animated.View style={[styles.hero, { opacity: heroOpacity, paddingTop: insets.top + 20 }]}>

        {/* Decorative arcs — top-right corner, oversized rings cropped by overflow */}
        <Animated.View style={[styles.arc, styles.arc1, { transform: [{ scale: arc1Scale }] }]} />
        <Animated.View style={[styles.arc, styles.arc2, { transform: [{ scale: arc2Scale }] }]} />
        <Animated.View style={[styles.arc, styles.arc3, { transform: [{ scale: arc3Scale }] }]} />

        {/* Bottom-left: icon + wordmark */}
        <View style={styles.heroContent}>
          <Animated.View style={[styles.heroIconWrap, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.heroIcon}
              resizeMode="cover"
            />
          </Animated.View>

          <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }] }}>
            <Text style={styles.heroWordmark}>SerenFit</Text>
            <Text style={styles.heroTagline}>Your adaptive fitness coach</Text>
          </Animated.View>
        </View>
      </Animated.View>

      {/* ── Bottom sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          { opacity: sheetOpacity, transform: [{ translateY: sheetY }], paddingBottom: Math.max(insets.bottom, 28) },
        ]}
      >
        <View style={styles.sheetHandle} />

        <Text style={styles.sheetHeading}>Welcome</Text>
        <Text style={styles.sheetSub}>Sign in to build your personalised plan</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Google */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.82}
        >
          {loading ? (
            <ActivityIndicator color={GREEN} style={{ marginRight: 12 }} />
          ) : (
            <View style={styles.googleBadge}>
              <Text style={styles.googleBadgeText}>G</Text>
            </View>
          )}
          <Text style={styles.googleLabel}>
            {loading ? "Signing in…" : "Continue with Google"}
          </Text>
          <View style={{ width: 36 }} />
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Phone — placeholder for OTP flow */}
        <TouchableOpacity style={styles.phoneBtn} disabled activeOpacity={1}>
          <Text style={styles.phoneLabel}>Continue with Phone</Text>
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>Coming soon</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing you agree to our{" "}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {" "}and{" "}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DARK,
  },

  // ── Hero ──
  hero: {
    flex: 1,
    backgroundColor: DARK,
    overflow: "hidden",
    justifyContent: "flex-end",
    paddingHorizontal: 28,
    paddingBottom: 36,
  },

  // Decorative oversized rings, top-right, partially clipped
  arc: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
  },
  arc1: {
    width: 260,
    height: 260,
    borderColor: "rgba(22,163,74,0.22)",
    top: -80,
    right: -80,
  },
  arc2: {
    width: 190,
    height: 190,
    borderColor: "rgba(22,163,74,0.14)",
    top: -20,
    right: -20,
  },
  arc3: {
    width: 120,
    height: 120,
    borderColor: "rgba(22,163,74,0.30)",
    backgroundColor: "rgba(22,163,74,0.06)",
    top: 20,
    right: 20,
  },

  heroContent: {
    gap: 20,
  },
  heroIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  heroIcon: {
    width: 78,
    height: 78,
  },
  heroWordmark: {
    fontSize: 36,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#ffffff",
    letterSpacing: -0.8,
  },
  heroTagline: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "rgba(255,255,255,0.42)",
    marginTop: 4,
    letterSpacing: 0.1,
  },

  // ── Sheet ──
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 26,
    paddingTop: 14,
  },

  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    alignSelf: "center",
    marginBottom: 24,
  },

  sheetHeading: {
    fontSize: 22,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#111827",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  sheetSub: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#6b7280",
    marginBottom: 24,
    lineHeight: 18,
  },

  // Error
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#dc2626",
    textAlign: "center",
  },

  // Google button
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  googleBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  googleBadgeText: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#374151",
  },
  googleLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#111827",
    textAlign: "center",
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#f3f4f6",
  },
  dividerText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#d1d5db",
  },

  // Phone button
  phoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#f3f4f6",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 10,
  },
  phoneLabel: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#d1d5db",
  },
  soonBadge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  soonText: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#9ca3af",
    letterSpacing: 0.2,
  },

  // Terms
  terms: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 16,
  },
  termsLink: {
    color: GREEN,
    fontFamily: "PlusJakartaSans_500Medium",
  },
});
