import { useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { submitWeeklyReflection } from "../api/plan";

const SCORES = [
  { label: "Difficulty", key: "difficulty" },
  { label: "Meal variety", key: "variety" },
  { label: "Overall", key: "overall" },
];

export default function WeeklyReflectionModal({ visible, onClose }) {
  const [scores, setScores] = useState({ difficulty: 3, variety: 3, overall: 3 });
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitWeeklyReflection({
        difficultyScore: scores.difficulty,
        varietyScore: scores.variety,
        overallScore: scores.overall,
        freeText: freeText.trim() || null,
      });
    } catch {}
    setSubmitting(false);
    setFreeText("");
    setScores({ difficulty: 3, variety: 3, overall: 3 });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
          <Text className="text-lg font-bold text-gray-900 mb-1">How was this week?</Text>
          <Text className="text-sm text-gray-500 mb-5">Quick feedback helps Alex improve your next plan.</Text>

          {SCORES.map(({ label, key }) => (
            <View key={key} className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
              <View className="flex-row gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setScores((s) => ({ ...s, [key]: n }))}
                    className={`w-10 h-10 rounded-xl items-center justify-center border ${scores[key] === n ? "bg-emerald-600 border-emerald-600" : "border-gray-200"}`}
                  >
                    <Text className={`text-sm font-semibold ${scores[key] === n ? "text-white" : "text-gray-500"}`}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 mb-5"
            placeholder="Anything else to share? (optional)"
            placeholderTextColor="#9ca3af"
            value={freeText}
            onChangeText={setFreeText}
            multiline
            style={{ maxHeight: 80, textAlignVertical: "top" }}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className={`rounded-2xl py-3.5 items-center ${submitting ? "bg-gray-300" : "bg-emerald-600"}`}
          >
            <Text className="text-white font-semibold text-base">{submitting ? "Saving..." : "Submit"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
