import "./global.css";
import { useState, useEffect } from "react";
import { View, StatusBar, Platform, ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Onboarding } from "./components/memoir/Onboarding";
import { Dashboard } from "./components/memoir/Dashboard";
import { TodoList } from "./components/memoir/TodoList";
import { VoiceChat } from "./components/memoir/VoiceChat";
import { BottomNav } from "./components/memoir/BottomNav";
import { NotificationOverlay, NotificationDemo } from "./components/memoir/NotificationOverlay";
import { LoginScreen } from "./components/memoir/LoginScreen";
import { supabase } from "./lib/supabase";

export type Tab = "dashboard" | "todos" | "chat" | "notifications";

export interface UserProfile {
  name: string;
  reflectionTime: string;
  avatarUri: string | null;
}

const PROFILE_CACHE_KEY = "memoir_profile_v1";

function saveProfileCache(p: UserProfile) {
  if (Platform.OS === "web") {
    try {
      // base64 이미지는 너무 커서 URL만 저장
      const toSave = { ...p, avatarUri: p.avatarUri?.startsWith("data:") ? null : p.avatarUri };
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(toSave));
    } catch {}
  }
}

function loadProfileCache(): UserProfile | null {
  if (Platform.OS === "web") {
    try {
      const s = localStorage.getItem(PROFILE_CACHE_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }
  return null;
}

function clearProfileCache() {
  if (Platform.OS === "web") {
    try { localStorage.removeItem(PROFILE_CACHE_KEY); } catch {}
  }
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showNotification, setShowNotification] = useState(false);
  const [completedGoals, setCompletedGoals] = useState(0);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      const p: UserProfile = { name: data.name, avatarUri: data.avatar_url, reflectionTime: data.reflection_time };
      setProfile(p);
      saveProfileCache(p);
    } else if (error) {
      console.error("[App] loadProfile error:", error.message);
    }
  };

  useEffect(() => {
    const fallback = setTimeout(() => setAuthReady(true), 5000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(fallback);
      if (session?.user) {
        setLoggedIn(true);
        // 캐시에서 즉시 로드 → Supabase 쿼리 기다리는 동안 온보딩 안 보임
        const cached = loadProfileCache();
        if (cached) setProfile(cached);
        await loadProfile(session.user.id);
      }
      setAuthReady(true);
    }).catch(() => {
      clearTimeout(fallback);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setLoggedIn(true);
        if (event === "SIGNED_IN") {
          const cached = loadProfileCache();
          if (cached) setProfile(cached);
          await loadProfile(session.user.id);
        }
      } else {
        setLoggedIn(false);
        setProfile(null);
        clearProfileCache();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (profile) {
      const timer = setTimeout(() => setShowNotification(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  const handleOnboardingComplete = async (p: UserProfile) => {
    setProfile(p);
    saveProfileCache(p);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        name: p.name,
        // base64는 Supabase에 저장 안 함 (너무 큼) → URL만 저장
        avatar_url: p.avatarUri?.startsWith("data:") ? null : p.avatarUri,
        reflection_time: p.reflectionTime,
      });
      if (error) console.error("[App] profile upsert error:", error.message);
    }
  };

  const inner = (() => {
    if (!authReady) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF8F5", alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#4CAF85" />
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }

    if (!loggedIn) {
      return (
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
          <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF8F5" }}>
            <LoginScreen />
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }

    if (!profile) {
      return (
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
          <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF8F5" }}>
            <Onboarding onComplete={handleOnboardingComplete} />
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }

    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF8F5" }}>
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1, display: activeTab === "dashboard" ? "flex" : "none" }}>
              <Dashboard
                profile={profile}
                moodPercent={Math.min(completedGoals, 100)}
                onStartReflection={() => setActiveTab("chat")}
              />
            </View>
            <View style={{ flex: 1, display: activeTab === "todos" ? "flex" : "none" }}>
              <TodoList onCompletedCountChange={setCompletedGoals} />
            </View>
            <View style={{ flex: 1, display: activeTab === "chat" ? "flex" : "none" }}>
              <VoiceChat userName={profile.name} avatarUri={profile.avatarUri} />
            </View>
            <View style={{ flex: 1, display: activeTab === "notifications" ? "flex" : "none" }}>
              <NotificationDemo />
            </View>
          </View>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
          <NotificationOverlay
            isOpen={showNotification}
            userName={profile.name}
            onClose={() => setShowNotification(false)}
            onAction={() => { setShowNotification(false); setActiveTab("chat"); }}
            avatarUri={profile.avatarUri}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  })();

  if (Platform.OS !== "web") return inner;

  return (
    <View style={{ flex: 1, backgroundColor: "#1C1917", alignItems: "center", justifyContent: "center" }}>
      <View style={{
        width: 390, height: 844,
        overflow: "hidden", borderRadius: 44,
        backgroundColor: "#FAF8F5",
        ...(({ boxShadow: "0px 32px 80px rgba(0,0,0,0.5)" }) as any),
      }}>
        {inner}
      </View>
    </View>
  );
}
