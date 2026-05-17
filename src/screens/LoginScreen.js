import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { getMe } from "../api/auth";
import { saveToken } from "../api/client";
import { API_BASE_URL } from "../constants/config";
import { useAuth } from "../context/AuthContext";
import ScreenGradient from "../components/ScreenGradient";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const returnUrl = Linking.createURL("auth-callback");
      const authUrl = `${API_BASE_URL}/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);

      if (result.type !== "success") {
        setLoading(false);
        return;
      }

      const parsed = Linking.parse(result.url);
      const token = parsed.queryParams?.token;

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
    <ScreenGradient>
    <View className="flex-1 items-center justify-center px-8">
      <View className="items-center mb-16">
        <Text className="text-6xl mb-4">🏋️</Text>
        <Text className="text-4xl font-bold text-gray-900">SerenFit</Text>
        <Text className="text-base text-gray-500 mt-2 text-center">
          Your adaptive fitness coach, powered by AI
        </Text>
      </View>

      {error && (
        <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 w-full">
          <Text className="text-red-600 text-sm text-center">{error}</Text>
        </View>
      )}

      <TouchableOpacity
        className="bg-white border border-gray-200 rounded-2xl px-6 py-4 flex-row items-center w-full shadow-sm"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#16a34a" className="mx-auto" />
        ) : (
          <>
            <Text className="text-2xl mr-3">G</Text>
            <Text className="text-gray-800 font-semibold text-base flex-1 text-center">
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text className="text-xs text-gray-400 mt-8 text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
    </ScreenGradient>
  );
}
