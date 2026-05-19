import { View, Text, TouchableOpacity } from "react-native";
import { Home, CheckSquare, MessageCircle, Bell } from "lucide-react-native";
import type { Tab } from "../../App";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: "dashboard",     label: "Home",    Icon: Home },
  { id: "todos",         label: "Goals",   Icon: CheckSquare },
  { id: "chat",          label: "Reflect", Icon: MessageCircle },
  { id: "notifications", label: "Alerts",  Icon: Bell },
];

const C = {
  primary: "#4CAF85",
  muted: "#7A7068",
  border: "#E8E3DC",
  card: "#FFFFFF",
  secondary: "#F4F1EC",
};

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 8 }}>
      {tabs.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        return (
          <TouchableOpacity
            key={id}
            onPress={() => onTabChange(id)}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 6 }}
          >
            <View style={{ width: 48, height: 32, borderRadius: 12, backgroundColor: active ? C.secondary : "transparent", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <Icon size={20} color={active ? C.primary : C.muted} strokeWidth={active ? 2.5 : 1.8} />
              {active && (
                <View style={{ position: "absolute", bottom: 0, left: "50%", marginLeft: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary }} />
              )}
            </View>
            <Text style={{ fontSize: 10, fontWeight: active ? "700" : "500", color: active ? C.primary : C.muted }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
