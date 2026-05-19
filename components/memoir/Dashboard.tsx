import { ScrollView, View, Text, TouchableOpacity, Image, Platform } from "react-native";
import { Sparkles, TrendingUp, Calendar, ChevronRight, Check } from "lucide-react-native";
import { UserProfile } from "../../App";

interface DashboardProps {
  profile: UserProfile;
  moodPercent: number;
  onStartReflection: () => void;
}

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

function getWeekDays() {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));

  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isPast = d < today && d.toDateString() !== today.toDateString();
    const isToday = d.toDateString() === today.toDateString();
    return { label: labels[i], date: d.getDate(), isToday, isPast };
  });
}

export function Dashboard({ profile, moodPercent, onStartReflection }: DashboardProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const week = getWeekDays();
  const reflectedDays = week.filter((d) => d.isPast || d.isToday).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 헤더 */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <View>
          <Text style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>{greeting}</Text>
          <Text style={{ fontSize: 24, fontWeight: "700", color: C.foreground }}>
            Welcome back,{" "}
            <Text style={{ color: C.primary }}>{profile.name}</Text>
          </Text>
        </View>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 2, borderColor: C.border }}>
          {profile.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={{ width: 48, height: 48 }} resizeMode="cover" />
          ) : (
            <Text style={{ color: C.primaryFg, fontSize: 20, fontWeight: "700" }}>
              {profile.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
      </View>

      {/* 기분 카드 */}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.secondary, alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={20} color={C.accent} />
          </View>
          <View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: C.foreground }}>Today's Mood</Text>
            <Text style={{ fontSize: 13, color: C.muted }}>Based on completed goals</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontSize: 13, color: C.muted }}>
            {moodPercent === 0 ? "Not started" : moodPercent < 40 ? "Getting there" : moodPercent < 70 ? "Doing well" : "Excellent"}
          </Text>
          <Text style={{ fontSize: 13, color: C.primary, fontWeight: "600" }}>{moodPercent}%</Text>
        </View>
        <View style={{ height: 8, backgroundColor: C.secondary, borderRadius: 4, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${moodPercent}%`, backgroundColor: C.primary, borderRadius: 4 }} />
        </View>
      </View>

      {/* 주간 진행 */}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.secondary, alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={20} color={C.primary} />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: C.foreground }}>Weekly Progress</Text>
              <Text style={{ fontSize: 13, color: C.muted }}>{reflectedDays} of 7 days</Text>
            </View>
          </View>
          <ChevronRight size={18} color={C.muted} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {week.map((d, i) => (
            <View key={i} style={{ alignItems: "center", gap: 6 }}>
              <View style={{
                width: 34, height: 34, borderRadius: 11,
                backgroundColor: d.isPast ? C.primary : d.isToday ? C.primary + "22" : C.secondary,
                alignItems: "center", justifyContent: "center",
                borderWidth: d.isToday ? 2 : 0,
                borderColor: C.primary,
              }}>
                {d.isPast ? (
                  <Check size={14} color={C.primaryFg} />
                ) : (
                  <Text style={{ fontSize: 11, fontWeight: "600", color: d.isToday ? C.primary : C.muted }}>
                    {d.date}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 11, color: d.isToday ? C.primary : C.muted, fontWeight: d.isToday ? "700" : "400" }}>
                {d.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 리마인더 */}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.secondary, alignItems: "center", justifyContent: "center" }}>
            <Calendar size={20} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: C.foreground }}>Daily Reflection</Text>
            <Text style={{ fontSize: 13, color: C.muted }}>Scheduled for {profile.reflectionTime}</Text>
          </View>
          <View style={{ backgroundColor: C.secondary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, color: C.muted, fontWeight: "500" }}>Today</Text>
          </View>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={onStartReflection}
        activeOpacity={0.85}
        style={{
          height: 58, borderRadius: 18, backgroundColor: C.primary,
          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
          ...(Platform.OS === "web" ? { boxShadow: "0px 5px 12px rgba(76,175,133,0.25)" } : { shadowColor: C.primary, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }),
        }}
      >
        <Sparkles size={20} color={C.primaryFg} />
        <Text style={{ color: C.primaryFg, fontSize: 16, fontWeight: "700" }}>
          Start Today's Reflection
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
