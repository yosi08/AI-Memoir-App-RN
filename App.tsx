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

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showNotification, setShowNotification] = useState(false);
  const [completedGoals, setCompletedGoals] = useState(0);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile({ name: data.name, avatarUri: data.avatar_url, reflectionTime: data.reflection_time });
    }
  };

  useEffect(() => {
    const fallback = setTimeout(() => setAuthReady(true), 5000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(fallback);
      if (session?.user) {
        setLoggedIn(true);
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
        if (event === "SIGNED_IN") await loadProfile(session.user.id);
      } else {
        setLoggedIn(false);
        setProfile(null);
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
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("profiles").upsert({
        id: session.user.id,
        name: p.name,
        avatar_url: p.avatarUri,
        reflection_time: p.reflectionTime,
      });
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
            {activeTab === "dashboard" && (
              <Dashboard
                profile={profile}
                moodPercent={Math.min(completedGoals, 100)}
                onStartReflection={() => setActiveTab("chat")}
              />
            )}
            {activeTab === "todos" && (
              <TodoList onCompletedCountChange={setCompletedGoals} />
            )}
            {activeTab === "chat" && <VoiceChat userName={profile.name} avatarUri={profile.avatarUri} />}
            {activeTab === "notifications" && <NotificationDemo />}
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
