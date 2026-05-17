import { apiRequest } from "./client";

const getUserDate = () => new Intl.DateTimeFormat("en-CA").format(new Date());

export const generatePlan = () =>
  apiRequest("/generate-plan", {
    method: "POST",
    headers: { "X-User-Date": getUserDate() },
  });

export const getPlanStatus = () => apiRequest("/generate-plan/status");

export const getCurrentPlan = () =>
  apiRequest("/current-plan", { headers: { "X-User-Date": getUserDate() } });

export const logEvent = (inputText, isFollowup = false, followupTarget = null) =>
  apiRequest("/log-event", {
    method: "POST",
    headers: { "X-User-Date": getUserDate() },
    body: JSON.stringify({
      inputText,
      is_followup: isFollowup,
      ...(followupTarget ? { followup_target: followupTarget } : {}),
    }),
  });

export const getChatHistory = () => apiRequest("/chat-history");

export const getWeeklyPlan = (weekNumber) =>
  apiRequest(weekNumber ? `/weekly-plan?weekNumber=${weekNumber}` : "/weekly-plan");

export const generateWeeklyPlan = () =>
  apiRequest("/generate-weekly-plan", { method: "POST" });

export const getWeeklyPlanStatus = () =>
  apiRequest("/generate-weekly-plan/status");

export const getDayPlan = (date) =>
  apiRequest("/current-plan", { headers: { "X-User-Date": date } });

export const logMealDone = (payload) =>
  apiRequest("/log-meal-done", {
    method: "POST",
    headers: { "X-User-Date": getUserDate() },
    body: JSON.stringify(payload),
  });

export const logExerciseDone = (payload) =>
  apiRequest("/log-exercise-done", {
    method: "POST",
    headers: { "X-User-Date": getUserDate() },
    body: JSON.stringify(payload),
  });

export const confirmPlanUpdate = (payload) =>
  apiRequest("/confirm-plan-update", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const rejectPlanUpdate = (payload) =>
  apiRequest("/reject-plan-update", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const submitEventFeedback = (payload) =>
  apiRequest("/feedback/event", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const submitWeeklyReflection = (payload) =>
  apiRequest("/feedback/weekly-reflection", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const checkPendingReflection = () =>
  apiRequest("/feedback/pending-reflection");
