import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  Platform,
  Alert,
} from "react-native";
import { Camera, Sparkles, RefreshCw, Check, AlertCircle } from "lucide-react-native";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import { API_BASE_URL } from "../../constants/api";

interface FaceScanProps {
  onComplete: () => void;
}

const COLORS = {
  primary: "#4CAF85",
  accent: "#E8A96B",
  destructive: "#D44C3C",
  mutedFg: "#7A7068",
  white: "#FFFFFF",
  border: "#E8E3DC",
  secondary: "#F4F1EC",
};

type Step = "capture" | "processing" | "result" | "error";

export function FaceScan({ onComplete }: FaceScanProps) {
  const [step, setStep] = useState<Step>("capture");
  const [caricatureUri, setCaricatureUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(0);

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const spinValue = useRef(new Animated.Value(0)).current;
  const pingValue = useRef(new Animated.Value(1)).current;
  const pingOpacity = useRef(new Animated.Value(1)).current;

  // 촬영 대기 애니메이션
  useEffect(() => {
    if (step === "capture") {
      const anim = Animated.loop(
        Animated.parallel([
          Animated.timing(pingValue, { toValue: 1.4, duration: 2000, useNativeDriver: true }),
          Animated.timing(pingOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => {
        anim.stop();
        pingValue.setValue(1);
        pingOpacity.setValue(1);
      };
    }
  }, [step]);

  // 처리 중 스피너 애니메이션
  useEffect(() => {
    if (step === "processing") {
      const anim = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
      return () => anim.stop();
    }
  }, [step]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleCapture = async () => {
    // 웹 환경: 파일 선택으로 대체
    if (Platform.OS === "web") {
      _webFileUpload();
      return;
    }

    if (!permission?.granted) {
      await requestPermission();
      return;
    }

    if (!cameraRef.current) return;

    try {
      setStep("processing");
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (photo?.uri) {
        await _uploadToServer(photo.uri);
      }
    } catch (e) {
      _showError("사진 촬영에 실패했습니다.");
    }
  };

  // 웹: input[type=file]로 이미지 업로드
  const _webFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "user";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setStep("processing");
      await _uploadFileToServer(file);
    };
    input.click();
  };

  // 네이티브: URI → FormData 업로드
  const _uploadToServer = async (uri: string) => {
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() ?? "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      // React Native FormData accepts { uri, name, type }
      formData.append("file", { uri, name: filename, type } as any);

      const response = await fetch(`${API_BASE_URL}/caricature`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail ?? `서버 오류 (${response.status})`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setCaricatureUri(objectUrl);
      setStep("result");
    } catch (e: any) {
      _showError(e.message ?? "서버 연결 실패. 서버가 실행 중인지 확인하세요.");
    }
  };

  // 웹: File 객체 직접 업로드
  const _uploadFileToServer = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/caricature`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail ?? `서버 오류 (${response.status})`);
      }

      const blob = await response.blob();
      setCaricatureUri(URL.createObjectURL(blob));
      setStep("result");
    } catch (e: any) {
      _showError(e.message ?? "서버 연결 실패. 서버가 실행 중인지 확인하세요.");
    }
  };

  const _showError = (msg: string) => {
    setErrorMsg(msg);
    setStep("error");
  };

  const reset = () => {
    setStep("capture");
    setCaricatureUri(null);
    setErrorMsg("");
    spinValue.setValue(0);
  };

  return (
    <View className="flex-1 bg-background px-5 py-4">
      {/* 헤더 */}
      <View className="items-center mb-6">
        <Text className="text-xl font-semibold text-foreground mb-1">
          AI Caricature
        </Text>
        <Text className="text-sm text-muted-foreground">
          Create your AI persona for reflections
        </Text>
      </View>

      {/* 뷰파인더 영역 */}
      <View className="flex-1 items-center justify-center">

        {/* ── 촬영 대기 ── */}
        {step === "capture" && (
          <View className="items-center justify-center">
            {Platform.OS !== "web" && permission?.granted ? (
              <View style={{ width: 256, height: 256, borderRadius: 128, overflow: "hidden" }}>
                <CameraView
                  ref={cameraRef}
                  facing="front"
                  style={{ width: 256, height: 256 }}
                />
              </View>
            ) : (
              <View
                style={{
                  width: 256, height: 256, borderRadius: 128,
                  backgroundColor: COLORS.secondary,
                  borderWidth: 4, borderStyle: "dashed",
                  borderColor: COLORS.primary + "4D",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Camera size={48} color={COLORS.mutedFg} />
                <Text className="text-sm text-muted-foreground mt-2">
                  {Platform.OS === "web" ? "사진을 선택하세요" : "권한 필요"}
                </Text>
              </View>
            )}
            <Animated.View
              style={{
                position: "absolute", width: 264, height: 264, borderRadius: 132,
                borderWidth: 2, borderColor: COLORS.primary + "44",
                transform: [{ scale: pingValue }], opacity: pingOpacity,
              }}
            />
          </View>
        )}

        {/* ── AI 처리 중 ── */}
        {step === "processing" && (
          <View className="items-center">
            <View style={{ width: 256, height: 256, borderRadius: 128, backgroundColor: COLORS.secondary, borderWidth: 4, borderColor: COLORS.primary, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.primary + "1A" }} />
              <Animated.View style={{ position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 4, borderColor: "transparent", borderTopColor: COLORS.primary, transform: [{ rotate: spin }] }} />
              <Sparkles size={48} color={COLORS.primary} />
            </View>
            <Text className="mt-6 text-foreground font-medium">
              AI 캐리커처 생성 중...
            </Text>
            <Text className="text-sm text-muted-foreground mt-1">
              서버에서 변환하고 있습니다
            </Text>
          </View>
        )}

        {/* ── 결과 ── */}
        {step === "result" && caricatureUri && (
          <View className="items-center w-full">
            <View className="flex-row mb-6" style={{ gap: 16 }}>
              {/* 원본 아이콘 */}
              <View className="items-center">
                <View style={{ width: 128, height: 128, borderRadius: 16, backgroundColor: COLORS.secondary, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" }}>
                  <Camera size={40} color={COLORS.mutedFg} />
                </View>
                <Text className="text-sm text-muted-foreground mt-2">Original</Text>
              </View>
              {/* 캐리커처 결과 */}
              <View className="items-center">
                <View style={{ width: 128, height: 128, borderRadius: 16, overflow: "hidden", borderWidth: 2, borderColor: COLORS.primary }}>
                  <Image source={{ uri: caricatureUri }} style={{ width: 128, height: 128 }} resizeMode="cover" />
                </View>
                <Text className="text-sm text-primary font-medium mt-2">AI Caricature</Text>
              </View>
            </View>

            {/* 스타일 선택 */}
            <View className="w-full mb-6">
              <Text className="text-sm text-muted-foreground mb-3 text-center">Choose a style</Text>
              <View className="flex-row justify-center" style={{ gap: 12 }}>
                {["Minimal", "Artistic", "Classic"].map((style, i) => (
                  <TouchableOpacity
                    key={style}
                    onPress={() => setSelectedStyle(i)}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: selectedStyle === i ? COLORS.primary : COLORS.secondary }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "500", color: selectedStyle === i ? COLORS.white : COLORS.mutedFg }}>
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Check size={20} color={COLORS.primary} />
              <Text className="text-primary font-medium">Caricature Ready</Text>
            </View>
          </View>
        )}

        {/* ── 에러 ── */}
        {step === "error" && (
          <View className="items-center px-4">
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.destructive + "1A", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <AlertCircle size={40} color={COLORS.destructive} />
            </View>
            <Text className="text-foreground font-semibold text-center mb-2">
              변환 실패
            </Text>
            <Text className="text-sm text-muted-foreground text-center mb-4">
              {errorMsg}
            </Text>
            <Text className="text-xs text-muted-foreground text-center">
              💡 터미널에서 서버를 먼저 실행하세요:{"\n"}
              <Text className="font-medium">cd ai_server && python server.py</Text>
            </Text>
          </View>
        )}
      </View>

      {/* 액션 버튼 */}
      <View style={{ gap: 12, marginTop: "auto" }}>
        {step === "capture" && (
          <TouchableOpacity
            onPress={handleCapture}
            activeOpacity={0.85}
            className="bg-primary rounded-2xl h-14 flex-row items-center justify-center"
            style={{ gap: 8 }}
          >
            <Camera size={20} color={COLORS.white} />
            <Text className="text-white font-medium text-base">
              {Platform.OS === "web" ? "사진 선택하기" : "사진 촬영"}
            </Text>
          </TouchableOpacity>
        )}
        {step === "result" && (
          <>
            <TouchableOpacity
              onPress={onComplete}
              activeOpacity={0.85}
              className="bg-primary rounded-2xl h-14 items-center justify-center"
            >
              <Text className="text-white font-medium text-base">Use This Caricature</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={reset}
              activeOpacity={0.85}
              className="bg-card border border-border rounded-2xl h-12 flex-row items-center justify-center"
              style={{ gap: 8 }}
            >
              <RefreshCw size={16} color={COLORS.mutedFg} />
              <Text className="text-foreground text-base">Retake Photo</Text>
            </TouchableOpacity>
          </>
        )}
        {step === "error" && (
          <TouchableOpacity
            onPress={reset}
            activeOpacity={0.85}
            className="bg-primary rounded-2xl h-14 items-center justify-center"
          >
            <Text className="text-white font-medium text-base">다시 시도</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
