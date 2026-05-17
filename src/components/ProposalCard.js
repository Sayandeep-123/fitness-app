import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export default function ProposalCard({ proposedOptions, onSelectOption, loadingOptionId }) {
  if (proposedOptions && proposedOptions.length > 0) {
    return (
      <View className="mx-4 mb-2 bg-white border border-emerald-200 rounded-2xl px-4 py-3 shadow-sm">
        <Text className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">Alex's suggestions</Text>
        {proposedOptions.map((option, index) => {
          const isJustLog = option.type === "just_log";
          const isLoading = loadingOptionId === option.id;
          const isPrimary = index === 0 && !isJustLog;

          if (isJustLog) {
            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => onSelectOption?.(option)}
                disabled={!!loadingOptionId}
                className="mt-1 py-2 items-center"
              >
                <Text className="text-gray-400 text-sm">{option.label} →</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => onSelectOption?.(option)}
              disabled={!!loadingOptionId}
              className={`mb-2 rounded-xl py-3 px-4 ${
                isPrimary ? "bg-emerald-600" : "border border-emerald-300 bg-white"
              }`}
            >
              <View className="flex-row items-center justify-between">
                <Text className={`text-sm font-semibold ${isPrimary ? "text-white" : "text-emerald-700"}`}>
                  {option.label}
                </Text>
                {isLoading && <ActivityIndicator size="small" color={isPrimary ? "#fff" : "#059669"} />}
              </View>
              {option.description ? (
                <Text className={`text-xs mt-0.5 ${isPrimary ? "text-emerald-100" : "text-gray-500"}`}>
                  {option.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return null;
}
