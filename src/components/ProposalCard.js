import { Text, TouchableOpacity, View } from "react-native";

export default function ProposalCard({ proposal, onAccept, onReject }) {
  if (!proposal) return null;

  return (
    <View className="mx-4 mb-2 bg-white border border-emerald-200 rounded-2xl px-4 py-3 shadow-sm">
      <Text className="text-xs font-semibold text-emerald-700 mb-1 uppercase tracking-wide">Proposed change</Text>
      <Text className="text-sm text-gray-800 mb-3">{proposal.description ?? "Alex has a suggestion for your plan."}</Text>
      <View className="flex-row gap-2">
        <TouchableOpacity onPress={onAccept} className="flex-1 bg-emerald-600 rounded-xl py-2 items-center">
          <Text className="text-white text-sm font-semibold">Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onReject} className="flex-1 border border-gray-300 rounded-xl py-2 items-center">
          <Text className="text-gray-700 text-sm font-semibold">Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
