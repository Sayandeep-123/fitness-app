import { apiRequest } from "./client";

export const generatePlan = () =>
  apiRequest("/generate-plan", { method: "POST" });

export const getPlanStatus = () => apiRequest("/generate-plan/status");

export const getCurrentPlan = () => apiRequest("/current-plan");

export const logEvent = (input) =>
  apiRequest("/log-event", {
    method: "POST",
    body: JSON.stringify({ input }),
  });

export const getChatHistory = () => apiRequest("/chat-history");

export const getWeeklyPlan = () => apiRequest("/weekly-plan");
