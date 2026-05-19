import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { Sparkles } from "lucide-react-native";
import { supabase } from "../../lib/supabase";

const C = {
  bg: "#FAF8F5",
  primary: "#4CAF85",
  primaryFg: "#FFFFFF",
  foreground: "#3D3028",
  muted: "#7A7068",
  border: "#E8E3DC",
  card: "#FFFFFF",
  secondary: "#F4F1EC",
};

export function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: Platform.OS === "web" ? window.location.origin : undefined,
      },
    });
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
      {/* 로고 */}
      <View style={{ alignItems: "center", marginBottom: 56 }}>
        <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <Sparkles size={40} color={C.primaryFg} />
        </View>
        <Text style={{ fontSize: 30, fontWeight: "700", color: C.foreground, marginBottom: 8 }}>Memoir</Text>
        <Text style={{ fontSize: 15, color: C.muted, textAlign: "center", lineHeight: 22 }}>
          Your personal AI reflection companion
        </Text>
      </View>

      {/* 구글 로그인 버튼 */}
      <TouchableOpacity
        onPress={signInWithGoogle}
        disabled={loading}
        activeOpacity={0.85}
        style={{
          width: "100%",
          height: 54,
          borderRadius: 16,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={C.primary} />
        ) : (
          <>
            <Text style={{ fontSize: 22 }}>G</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: C.foreground }}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 24, lineHeight: 18 }}>
        By continuing, your data is saved{"\n"}securely to your account.
      </Text>
    </View>
  );
}
