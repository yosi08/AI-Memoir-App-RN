import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, Animated, Pressable, ScrollView, Image, Platform } from "react-native";
import { X, Bell, Sparkles } from "lucide-react-native";

const ND = Platform.OS !== "web";

const C = {
  bg: "#FAF8F5",
  primary: "#4CAF85",
  primaryFg: "#FFFFFF",
  accent: "#E8A96B",
  secondary: "#F4F1EC",
  foreground: "#3D3028",
  muted: "#7A7068",
  border: "#E8E3DC",
  card: "#FFFFFF",
};

interface NotificationOverlayProps {
  isOpen: boolean;
  userName: string;
  onClose: () => void;
  onAction: () => void;
  avatarUri?: string | null;
}

export function NotificationOverlay({ isOpen, userName, onClose, onAction, avatarUri }: NotificationOverlayProps) {
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: ND }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: ND }),
      ]).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.2, duration: 800, useNativeDriver: ND }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: ND }),
        ])
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.94, duration: 180, useNativeDriver: ND }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: ND }),
      ]).start();
    }
  }, [isOpen]);

  const card = (
    <Animated.View style={{
      width: "100%", backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
      borderRadius: 28, padding: 28, transform: [{ scale }],
      ...(Platform.OS === "web" ? { boxShadow: "0px 8px 24px rgba(0,0,0,0.12)" } : { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } }),
    }}>
      <TouchableOpacity onPress={onClose} style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: 10, backgroundColor: C.secondary, alignItems: "center", justifyContent: "center" }}>
        <X size={15} color={C.muted} />
      </TouchableOpacity>

      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <View style={{ position: "relative" }}>
          <Animated.View style={{ position: "absolute", top: -6, left: -6, right: -6, bottom: -6, borderRadius: 50, backgroundColor: C.primary + "22", transform: [{ scale: pulse }] }} />
          <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: C.primary, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 80, height: 80 }} resizeMode="cover" />
            ) : (
              <Sparkles size={36} color={C.primaryFg} />
            )}
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 20, fontWeight: "700", color: C.foreground, textAlign: "center", marginBottom: 10 }}>
        Hey {userName}, time to reflect!
      </Text>
      <Text style={{ fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22, marginBottom: 28 }}>
        Your AI self noticed you haven't checked in today. Take a moment to capture your thoughts.
      </Text>

      <View style={{ gap: 10 }}>
        <TouchableOpacity onPress={onAction} activeOpacity={0.85} style={{ height: 50, borderRadius: 16, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(76,175,133,0.25)" } : { shadowColor: C.primary, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }) }}>
          <Text style={{ color: C.primaryFg, fontSize: 16, fontWeight: "700" }}>Start Reflection</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.muted, fontSize: 14 }}>Remind me later</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // 웹: Modal이 phone frame 밖으로 벗어나므로 absolute View 사용
  if (Platform.OS === "web") {
    if (!isOpen) return null;
    return (
      <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#00000055", alignItems: "center", justifyContent: "center", padding: 24, opacity, zIndex: 50 }}>
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
        {card}
      </Animated.View>
    );
  }

  return (
    <Modal transparent visible={isOpen} animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: "#00000055", alignItems: "center", justifyContent: "center", padding: 28, opacity }}>
        <Pressable style={{ position: "absolute", inset: 0 }} onPress={onClose} />
        {card}
      </Animated.View>
    </Modal>
  );
}

// 알림 탭
interface NotifItem { id: string; title: string; message: string; time: string; read: boolean }

const SAMPLE: NotifItem[] = [
  { id: "1", title: "Daily Reflection Reminder", message: "Your AI self is waiting to hear about your day.", time: "2 min ago", read: false },
  { id: "2", title: "Weekly Summary Ready", message: "Your emotional journey this week has been captured.", time: "1 hour ago", read: false },
  { id: "3", title: "Goal Milestone!", message: "You've completed 5 reflections this week. Keep it up!", time: "Yesterday", read: true },
  { id: "4", title: "New Insight Available", message: "Based on your recent reflections, we've noticed a positive pattern.", time: "2 days ago", read: true },
];

export function NotificationDemo() {
  const [items, setItems] = useState(SAMPLE);
  const unread = items.filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: C.foreground }}>Notifications</Text>
          <Text style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
            {unread > 0 ? `${unread} unread` : "All caught up!"}
          </Text>
        </View>
        <View style={{ position: "relative" }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" }}>
            <Bell size={20} color={C.muted} />
          </View>
          {unread > 0 && (
            <View style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg }}>
              <Text style={{ color: C.primaryFg, fontSize: 10, fontWeight: "800" }}>{unread}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {items.map((n) => (
          <TouchableOpacity
            key={n.id}
            onPress={() => setItems((p) => p.map((x) => x.id === n.id ? { ...x, read: true } : x))}
            activeOpacity={0.8}
            style={{ backgroundColor: n.read ? C.secondary + "66" : C.card, borderRadius: 18, padding: 16, flexDirection: "row", gap: 14, borderWidth: 1, borderColor: n.read ? C.border : C.primary + "40" }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: n.read ? C.secondary : C.primary, alignItems: "center", justifyContent: "center", padding: n.read ? 0 : 2 }}>
              {!n.read ? (
                <View style={{ flex: 1, borderRadius: 12, backgroundColor: C.card, alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                  <Sparkles size={16} color={C.primary} />
                </View>
              ) : (
                <Sparkles size={16} color={C.muted} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "600", color: n.read ? C.muted : C.foreground }}>{n.title}</Text>
                {!n.read && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary, marginLeft: 8 }} />}
              </View>
              <Text numberOfLines={2} style={{ fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 4 }}>{n.message}</Text>
              <Text style={{ fontSize: 11, color: C.muted + "88" }}>{n.time}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
