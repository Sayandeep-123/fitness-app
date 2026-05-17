import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../constants/config";

const TOKEN_KEY = "jwt_token";

export const saveToken = (token) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

export const apiRequest = async (path, options = {}) => {
  const token = await getToken();

  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    "bypass-tunnel-reminder": "true",
    ...(token ? { Cookie: `token=${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, { ...options, headers });

  console.log(`[API] ${options.method ?? "GET"} ${url} → ${response.status}`);

  const isJson = response.headers.get("content-type")?.includes("application/json");

  if (!response.ok) {
    const message = isJson
      ? (await response.json()).error
      : null;
    const error = new Error(message || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return isJson ? response.json() : {};
};
