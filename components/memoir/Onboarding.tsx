import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Platform,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import {
  Heart,
  Check,
  ChevronRight,
  Camera,
  Sparkles,
  Clock,
  RefreshCw,
} from "lucide-react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { generateCaricature } from "../../lib/gemini";
import { UserProfile } from "../../App";

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

type Step = "welcome" | "name" | "camera" | "generating" | "preview" | "time" | "ready";

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
  destructive: "#D44C3C",
};

const FEATURES = [
  { icon: Heart,    title: "Daily Reflection",  desc: "Capture your thoughts and emotions" },
  { icon: Sparkles, title: "AI Companion",       desc: "Chat with your mirrored self" },
  { icon: Check,    title: "Track Progress",     desc: "See your growth over time" },
];

const REFLECTION_TIMES = [
  { label: "Morning",   time: "08:00", desc: "Start the day with clarity" },
  { label: "Afternoon", time: "13:00", desc: "Midday check-in" },
  { label: "Evening",   time: "20:00", desc: "Wind down and reflect" },
  { label: "Night",     time: "22:30", desc: "Before you sleep" },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [selectedTime, setSelectedTime] = useState(2);

  // 카메라 / 이미지
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // 애니메이션
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ND = Platform.OS !== "web"; // useNativeDriver: web에서는 false

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: ND }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
    ]).start();
  }, [step]);

  // 웰컴 아이콘 펄스
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.07, duration: 1200, useNativeDriver: ND }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, useNativeDriver: ND }),
      ])
    ).start();
  }, []);

  // 생성 중 스피너 + 진행률
  useEffect(() => {
    if (step !== "generating") return;
    setGenProgress(0);
    const spin = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: ND })
    );
    spin.start();
    const interval = setInterval(() => {
      setGenProgress((p) => (p >= 90 ? p : p + 2));
    }, 100);
    return () => { spin.stop(); clearInterval(interval); };
  }, [step]);

  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  // ── 카메라 열기
  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setStep("camera");
  };

  // ── 사진 촬영 → Gemini 호출
  const handleCapture = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.75 });
      const base64 = photo?.base64 ?? null;
      if (!base64) return;
      const fallback = photo?.uri ?? `data:image/jpeg;base64,${base64}`;
      setAvatarUri(fallback);
      setStep("generating");
      callGemini(base64, fallback);
    } catch {
      Alert.alert("오류", "사진 촬영에 실패했습니다.");
    }
  };

  // ── 캐리커처 생성 (Pollinations URL 반환 후 이미지 preload)
  const callGemini = async (base64: string, fallback: string) => {
    setGenError(null);
    try {
      const result = await generateCaricature(base64);
      if (!result) throw new Error("URL 생성 실패");

      setAvatarUri(result);

      // Pollinations는 이미지 생성에 시간이 걸림 → 진행률 바 계속 올리다가 preview로 이동
      await new Promise<void>((resolve) => {
        const tick = setInterval(() => {
          setGenProgress((p) => {
            if (p >= 99) { clearInterval(tick); resolve(); return 100; }
            return p + 1;
          });
        }, 150);
      });

      setStep("preview");
    } catch (e: any) {
      setGenError(e?.message ?? "알 수 없는 오류");
    }
  };

  // ── 스킵
  const handleSkip = () => {
    setAvatarUri(null);
    setStep("time");
  };

  // ── 재촬영
  const retake = () => {
    setAvatarUri(null);
    setStep("camera");
  };

  const handleDone = () => {
    onComplete({
      name: name.trim() || "Friend",
      reflectionTime: REFLECTION_TIMES[selectedTime].time,
      avatarUri,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: C.bg }}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ── WELCOME ── */}
        {step === "welcome" && (
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingVertical: 48 }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: "center", marginBottom: 44 }}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 28 }}>
                <View style={{ width: 108, height: 108, borderRadius: 54, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", ...(Platform.OS === "web" ? { boxShadow: "0px 6px 14px rgba(76,175,133,0.25)" } : { shadowColor: C.primary, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }) }}>
                  <Heart size={46} color={C.primaryFg} />
                </View>
              </Animated.View>
              <Text style={{ fontSize: 28, fontWeight: "700", color: C.foreground, textAlign: "center", marginBottom: 12 }}>Welcome to Memoir</Text>
              <Text style={{ fontSize: 15, color: C.muted, textAlign: "center", lineHeight: 24 }}>
                Your personal space for self-reflection{"\n"}and growth.
              </Text>
            </View>

            <View style={{ gap: 12, marginBottom: 40 }}>
              {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: C.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.secondary, alignItems: "center", justifyContent: "center" }}>
                    <Icon size={22} color={C.primary} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: C.foreground, marginBottom: 2 }}>{title}</Text>
                    <Text style={{ fontSize: 13, color: C.muted }}>{desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={() => setStep("name")} activeOpacity={0.85} style={{ height: 56, borderRadius: 18, backgroundColor: C.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, ...(Platform.OS === "web" ? { boxShadow: "0px 5px 12px rgba(76,175,133,0.22)" } : { shadowColor: C.primary, shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }) }}>
              <Text style={{ color: C.primaryFg, fontSize: 16, fontWeight: "700" }}>Get Started</Text>
              <ChevronRight size={20} color={C.primaryFg} />
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ── NAME ── */}
        {step === "name" && (
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 56 }}>
            <StepIndicator current={0} total={3} />
            <Text style={{ fontSize: 26, fontWeight: "700", color: C.foreground, marginTop: 28, marginBottom: 8 }}>What's your name?</Text>
            <Text style={{ fontSize: 14, color: C.muted, marginBottom: 36 }}>Memoir will use this to personalize your experience.</Text>

            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: name.trim() ? C.primary : C.border, paddingHorizontal: 18, height: 56 }}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name or nickname"
                placeholderTextColor={C.muted + "88"}
                style={{ flex: 1, fontSize: 17, color: C.foreground, fontWeight: "500" }}
                autoFocus
                returnKeyType="next"
                maxLength={20}
                onSubmitEditing={() => name.trim() && openCamera()}
              />
            </View>
            <Text style={{ fontSize: 12, color: C.muted, marginTop: 10, marginLeft: 2 }}>You can change this anytime.</Text>

            <View style={{ position: "absolute", bottom: 40, left: 28, right: 28 }}>
              <TouchableOpacity onPress={openCamera} disabled={!name.trim()} activeOpacity={0.85} style={{ height: 56, borderRadius: 18, backgroundColor: name.trim() ? C.primary : C.border, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.primaryFg, fontSize: 16, fontWeight: "700" }}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── CAMERA ── */}
        {step === "camera" && (
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: "#1a1a1a", position: "relative" }}>
              {permission?.granted ? (
                <CameraView ref={cameraRef} facing="front" style={{ flex: 1 }} />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.secondary, gap: 16 }}>
                  <Camera size={64} color={C.muted} />
                  <Text style={{ color: C.muted, fontSize: 15, textAlign: "center" }}>카메라 권한이 필요합니다</Text>
                  <TouchableOpacity onPress={requestPermission} activeOpacity={0.85} style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.primary, borderRadius: 14 }}>
                    <Text style={{ color: C.primaryFg, fontWeight: "600" }}>권한 허용</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 가이드 브래킷 */}
              <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
                <View style={{ width: 220, height: 220, position: "relative" }}>
                  {[
                    { top: 0, left: 0,  borderTopWidth: 3, borderLeftWidth: 3,  borderTopLeftRadius: 20 },
                    { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 20 },
                    { bottom: 0, left: 0,  borderBottomWidth: 3, borderLeftWidth: 3,  borderBottomLeftRadius: 20 },
                    { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 20 },
                  ].map((s, i) => (
                    <View key={i} style={{ position: "absolute", width: 44, height: 44, borderColor: C.primary, ...s }} />
                  ))}
                </View>
              </View>

              <View style={{ position: "absolute", top: 20, left: 0, right: 0, alignItems: "center" }}>
                <View style={{ backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 }}>
                  <Text style={{ fontSize: 13, color: "#FFFFFF" }}>얼굴을 프레임 안에 맞춰 주세요</Text>
                </View>
              </View>
            </View>

            <View style={{ backgroundColor: C.bg, paddingVertical: 28, paddingHorizontal: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <TouchableOpacity onPress={handleSkip}>
                <Text style={{ fontSize: 15, color: C.muted }}>Skip</Text>
              </TouchableOpacity>
              {/* 셔터 버튼 */}
              <TouchableOpacity onPress={handleCapture} activeOpacity={0.85} style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(76,175,133,0.28)" } : { shadowColor: C.primary, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }) }}>
                <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: C.primaryFg }} />
              </TouchableOpacity>
              <View style={{ width: 48 }} />
            </View>
          </View>
        )}

        {/* ── GENERATING ── */}
        {step === "generating" && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            {genError ? (
              <View style={{ alignItems: "center", gap: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: C.foreground, textAlign: "center" }}>오류 발생</Text>
                <Text style={{ fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 18, fontFamily: "monospace" }}>{genError}</Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <TouchableOpacity onPress={retake} style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: C.foreground, fontWeight: "600" }}>재촬영</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setAvatarUri(avatarUri); setStep("preview"); }} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: C.primaryFg, fontWeight: "700" }}>원본 사진 사용</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 160, height: 160, alignItems: "center", justifyContent: "center", marginBottom: 36 }}>
                  <Animated.View style={{ position: "absolute", width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: C.primary + "33", transform: [{ rotate: spinDeg }] }} />
                  <Animated.View style={{ position: "absolute", width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: C.primary + "66", transform: [{ rotate: spinDeg }] }} />
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.secondary, alignItems: "center", justifyContent: "center" }}>
                    <Sparkles size={30} color={C.primary} />
                  </View>
                </View>
                <View style={{ width: "100%", maxWidth: 280, marginBottom: 20 }}>
                  <View style={{ height: 6, backgroundColor: C.secondary, borderRadius: 3, overflow: "hidden" }}>
                    <View style={{ height: "100%", width: `${genProgress}%`, backgroundColor: C.primary, borderRadius: 3 }} />
                  </View>
                  <Text style={{ textAlign: "center", fontSize: 13, color: C.muted, marginTop: 10 }}>{Math.floor(genProgress)}%</Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: "700", color: C.foreground, marginBottom: 8 }}>AI 캐리커처 생성 중</Text>
                <Text style={{ fontSize: 14, color: C.muted, textAlign: "center" }}>
                  {genProgress < 50 ? "얼굴 특징 분석 중..." : "거의 완료됐어요..."}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── PREVIEW ── */}
        {step === "preview" && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
            <Text style={{ fontSize: 26, fontWeight: "700", color: C.foreground, textAlign: "center", marginBottom: 8 }}>
              Your Profile Photo
            </Text>
            <Text style={{ fontSize: 14, color: C.muted, textAlign: "center", marginBottom: 36 }}>
              This will be displayed throughout the app
            </Text>

            <View style={{
              width: 200, height: 200, borderRadius: 100,
              overflow: "hidden", borderWidth: 4, borderColor: C.primary,
              marginBottom: 36,
              ...(Platform.OS === "web" ? { boxShadow: "0px 6px 16px rgba(76,175,133,0.22)" } : { shadowColor: C.primary, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }),
              backgroundColor: C.secondary, alignItems: "center", justifyContent: "center",
            }}>
              {avatarUri ? (
                <ImageWithLoader uri={avatarUri} size={200} primaryColor={C.primary} />
              ) : (
                <Sparkles size={60} color={C.primary} />
              )}
            </View>

            <View style={{ width: "100%", gap: 12 }}>
              <TouchableOpacity onPress={() => setStep("time")} activeOpacity={0.85} style={{ height: 56, borderRadius: 18, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, ...(Platform.OS === "web" ? { boxShadow: "0px 5px 12px rgba(76,175,133,0.22)" } : { shadowColor: C.primary, shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }) }}>
                <Text style={{ color: C.primaryFg, fontSize: 16, fontWeight: "700" }}>This looks great!</Text>
                <Check size={20} color={C.primaryFg} />
              </TouchableOpacity>
              <TouchableOpacity onPress={retake} activeOpacity={0.8} style={{ height: 48, borderRadius: 18, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
                <RefreshCw size={16} color={C.muted} />
                <Text style={{ color: C.muted, fontSize: 15, fontWeight: "500" }}>Retake photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── TIME ── */}
        {step === "time" && (
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 56 }}>
            <StepIndicator current={1} total={3} />
            <Text style={{ fontSize: 26, fontWeight: "700", color: C.foreground, marginTop: 28, marginBottom: 8 }}>When do you reflect?</Text>
            <Text style={{ fontSize: 14, color: C.muted, marginBottom: 32 }}>We'll send you a gentle reminder at this time.</Text>

            <View style={{ gap: 12 }}>
              {REFLECTION_TIMES.map((t, i) => (
                <TouchableOpacity key={i} onPress={() => setSelectedTime(i)} activeOpacity={0.8} style={{ flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: selectedTime === i ? C.primary + "12" : C.card, borderRadius: 18, padding: 18, borderWidth: 2, borderColor: selectedTime === i ? C.primary : C.border }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: selectedTime === i ? C.primary : C.secondary, alignItems: "center", justifyContent: "center" }}>
                    <Clock size={20} color={selectedTime === i ? C.primaryFg : C.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: selectedTime === i ? C.primary : C.foreground }}>{t.label}</Text>
                    <Text style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{t.desc}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: selectedTime === i ? C.primary : C.muted }}>{t.time}</Text>
                  {selectedTime === i && (
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}>
                      <Check size={14} color={C.primaryFg} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ position: "absolute", bottom: 40, left: 28, right: 28 }}>
              <TouchableOpacity onPress={() => setStep("ready")} activeOpacity={0.85} style={{ height: 56, borderRadius: 18, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(76,175,133,0.2)" } : { shadowColor: C.primary, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }) }}>
                <Text style={{ color: C.primaryFg, fontSize: 16, fontWeight: "700" }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── READY ── */}
        {step === "ready" && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
            <StepIndicator current={2} total={3} />

            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", marginTop: 32, marginBottom: 28, overflow: "hidden", ...(Platform.OS === "web" ? { boxShadow: "0px 6px 16px rgba(76,175,133,0.25)" } : { shadowColor: C.primary, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }) }}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 120, height: 120 }} resizeMode="cover" />
              ) : (
                <Sparkles size={48} color={C.primaryFg} />
              )}
            </View>

            <Text style={{ fontSize: 26, fontWeight: "700", color: C.foreground, textAlign: "center", marginBottom: 12 }}>
              Ready, {name || "friend"}!
            </Text>
            <Text style={{ fontSize: 15, color: C.muted, textAlign: "center", lineHeight: 24, marginBottom: 14 }}>
              Your reflection companion is ready.{"\n"}Daily reminder at {REFLECTION_TIMES[selectedTime].time}.
            </Text>

            <View style={{ backgroundColor: C.secondary, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 44 }}>
              <Text style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>
                {REFLECTION_TIMES[selectedTime].label} · {REFLECTION_TIMES[selectedTime].time}
              </Text>
            </View>

            <TouchableOpacity onPress={handleDone} activeOpacity={0.85} style={{ width: "100%", height: 56, borderRadius: 18, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, ...(Platform.OS === "web" ? { boxShadow: "0px 5px 12px rgba(76,175,133,0.25)" } : { shadowColor: C.primary, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }) }}>
              <Text style={{ color: C.primaryFg, fontSize: 16, fontWeight: "700" }}>Start Memoir</Text>
              <Check size={20} color={C.primaryFg} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}


function ImageWithLoader({ uri, size, primaryColor }: { uri: string; size: number; primaryColor: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {loading && <ActivityIndicator size="large" color={primaryColor} style={{ position: "absolute" }} />}
      {!error && (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, opacity: loading ? 0 : 1 }}
          resizeMode="cover"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      )}
      {error && <Sparkles size={60} color={primaryColor} />}
    </View>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ height: 5, borderRadius: 3, backgroundColor: i <= current ? C.primary : C.border, width: i === current ? 28 : 8 }} />
      ))}
    </View>
  );
}
