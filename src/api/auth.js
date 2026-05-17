import { apiRequest, saveToken } from "./client";

export const googleLogin = async (idToken) => {
  const data = await apiRequest("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
  if (data.token) {
    await saveToken(data.token);
  }
  return data;
};

export const getMe = () => apiRequest("/me");

export const completeOnboarding = (profile) =>
  apiRequest("/onboarding", {
    method: "POST",
    body: JSON.stringify(profile),
  });

export const updateProfile = (updates) =>
  apiRequest("/profile", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
