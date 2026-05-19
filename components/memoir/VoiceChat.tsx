import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, Animated, Platform, Alert, Image } from "react-native";

const ND = Platform.OS !== "web";
import { Mic, MicOff, Send, Sparkles } from "lucide-react-native";

interface VoiceChatProps { userName: string; avatarUri?: string | null }
interface Message { id: number; text: string; sender: "ai" | "user"; timestamp: Date }

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

async function callGemini(userName: string, messages: Message[]): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_KEY;
  if (!apiKey) {
    console.warn("[VoiceChat] EXPO_PUBLIC_GEMINI_KEY not set — using offline mode");
    return "I'm currently offline. Please check the API key configuration.";
  }

  // 전체 대화 기록을 user/model 번갈아가며 전달
  // Gemini는 반드시 user 턴으로 시작해야 함
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const m of messages) {
    const role = m.sender === "user" ? "user" : "model";
    // 연속된 같은 role 합치기 (Gemini 제약)
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += "\n" + m.text;
    } else {
      contents.push({ role, parts: [{ text: m.text }] });
    }
  }
  // Gemini는 user 턴으로 시작해야 함
  if (contents[0]?.role === "model") contents.shift();
  // 마지막이 user 턴이어야 함
  if (contents[contents.length - 1]?.role !== "user") {
    return "Hmm, let me think about that.";
  }

  const systemPrompt = `You are "AI Me", ${userName}'s personal AI companion. You are having a natural, warm conversation — not an interview.

Rules:
- Respond naturally to what they just said. Acknowledge it, react to it, relate to it.
- Don't always end with a question. Sometimes just respond warmly and let the conversation breathe.
- When you do ask a question, make it feel natural — like a friend asking, not a therapist prompting.
- Keep responses to 2–3 sentences max.
- Speak in a conversational, genuine tone. Avoid generic therapy phrases.
- Remember everything said in the conversation.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 200, temperature: 0.9 },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      console.warn("[VoiceChat] Gemini returned empty:", JSON.stringify(data));
      return "I hear you. Tell me more.";
    }
    return text;
  } catch (e) {
    console.error("[VoiceChat] Gemini error:", e);
    return "Sorry, I had trouble connecting. Try again?";
  }
}

export function VoiceChat({ userName, avatarUri }: VoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 1,
    text: `Hey ${userName}, I'm here. How are you feeling today?`,
    sender: "ai",
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const waveAnims = useRef(Array.from({ length: 5 }, () => new Animated.Value(6))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  // AI 아바타 펄스
  useEffect(() => {
    if (isTyping) {
      const a = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: ND }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: ND }),
      ]));
      const d = Animated.loop(Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 400, useNativeDriver: ND }),
        Animated.timing(dotAnim, { toValue: 0, duration: 400, useNativeDriver: ND }),
      ]));
      a.start(); d.start();
      return () => { a.stop(); d.stop(); };
    }
    pulseAnim.setValue(1);
  }, [isTyping]);

  // 녹음 파형
  useEffect(() => {
    let anims: Animated.CompositeAnimation[] = [];
    if (isRecording) {
      anims = waveAnims.map((a, i) =>
        Animated.loop(Animated.sequence([
          Animated.timing(a, { toValue: 6 + Math.random() * 26, duration: 180 + i * 40, useNativeDriver: false }),
          Animated.timing(a, { toValue: 6, duration: 180 + i * 40, useNativeDriver: false }),
        ]))
      );
      anims.forEach((a) => a.start());
    } else {
      waveAnims.forEach((a) => Animated.timing(a, { toValue: 6, duration: 150, useNativeDriver: false }).start());
    }
    return () => anims.forEach((a) => a.stop());
  }, [isRecording]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isTyping) return;

    const userMsg: Message = { id: Date.now(), text: msg, sender: "user", timestamp: new Date() };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    setInput("");
    setIsTyping(true);

    const aiText = await callGemini(userName, updated);
    setIsTyping(false);
    setMessages((p) => [...p, { id: Date.now() + 1, text: aiText, sender: "ai", timestamp: new Date() }]);
  };

  const toggleRecord = () => {
    if (!isRecording) {
      if (Platform.OS === "web") {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { Alert.alert("Not supported", "Try Chrome or Safari."); return; }
        const r = new SR();
        r.lang = navigator.language || "ko-KR";
        r.continuous = false;
        r.interimResults = false;
        r.onresult = (e: any) => { setIsRecording(false); send(e.results[0][0].transcript); };
        r.onerror = (e: any) => { setIsRecording(false); if (e.error !== "aborted" && e.error !== "no-speech") Alert.alert("Mic error", e.error); };
        r.onend = () => setIsRecording(false);
        recognitionRef.current = r;
        r.start();
        setIsRecording(true);
      } else {
        setIsRecording(true);
        setTimeout(() => { setIsRecording(false); send("I had a really productive day today."); }, 3000);
      }
    } else {
      if (Platform.OS === "web" && recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const lastAI = [...messages].reverse().find((m) => m.sender === "ai");
  const lastUser = [...messages].reverse().find((m) => m.sender === "user");

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ── AI 섹션 (상단) ── */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 12 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 22,
            backgroundColor: C.secondary,
            borderWidth: 2, borderColor: C.primary + "55",
            alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={32} color={C.primary} />
          </View>
        </Animated.View>

        <Text style={{ fontSize: 11, fontWeight: "700", color: C.primary, letterSpacing: 0.8, marginBottom: 10 }}>
          AI ME  {isTyping ? "· responding..." : "· listening"}
        </Text>

        {/* AI 말풍선 */}
        <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, width: "100%", minHeight: 56, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 15, color: C.foreground, lineHeight: 23, textAlign: "center" }}>
            {isTyping ? "· · ·" : (lastAI?.text ?? "")}
          </Text>
        </View>
      </View>

      {/* ── 유저 섹션 (하단) ── */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingBottom: 12 }}>
        {/* 유저 사진 */}
        <View style={{
          width: 96, height: 96, borderRadius: 28,
          overflow: "hidden",
          borderWidth: 3, borderColor: C.accent + "66",
          marginBottom: 14,
          backgroundColor: C.secondary,
          alignItems: "center", justifyContent: "center",
        }}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 96, height: 96 }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 36, fontWeight: "700", color: C.muted }}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        <Text style={{ fontSize: 11, fontWeight: "700", color: C.accent, letterSpacing: 0.8, marginBottom: 10 }}>
          YOU
        </Text>

        {/* 유저 마지막 발화 */}
        {lastUser ? (
          <View style={{ backgroundColor: C.secondary, borderRadius: 18, borderWidth: 1, borderColor: C.accent + "33", padding: 14, width: "100%", minHeight: 48, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 14, color: C.foreground, lineHeight: 21, textAlign: "center" }}>{lastUser.text}</Text>
          </View>
        ) : (
          <View style={{ height: 48, width: "100%", borderRadius: 18, borderWidth: 1, borderColor: C.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 13, color: C.muted + "88" }}>Tap the mic or type to begin</Text>
          </View>
        )}
      </View>

      {/* ── 녹음 파형 ── */}
      {isRecording && (
        <View style={{ backgroundColor: C.primary + "12", paddingHorizontal: 20, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 28 }}>
            {waveAnims.map((a, i) => (
              <Animated.View key={i} style={{ width: 4, height: a, backgroundColor: C.primary, borderRadius: 2 }} />
            ))}
          </View>
          <Text style={{ fontSize: 13, color: C.primary, fontWeight: "600" }}>
            {Platform.OS === "web" ? "Listening..." : "Recording..."}
          </Text>
        </View>
      )}

      {/* ── 입력 영역 ── */}
      <View style={{ backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity
          onPress={toggleRecord}
          activeOpacity={0.8}
          style={{ width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: isRecording ? C.destructive : C.border, backgroundColor: isRecording ? C.destructive : C.card, alignItems: "center", justifyContent: "center" }}
        >
          {isRecording ? <MicOff size={20} color={C.primaryFg} /> : <Mic size={20} color={C.muted} />}
        </TouchableOpacity>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          returnKeyType="send"
          placeholder="Say something..."
          placeholderTextColor={C.muted + "88"}
          style={{ flex: 1, height: 46, backgroundColor: C.secondary, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, fontSize: 14, color: C.foreground }}
        />
        <TouchableOpacity
          onPress={() => send()}
          disabled={!input.trim() || isTyping}
          activeOpacity={0.85}
          style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: input.trim() && !isTyping ? C.primary : C.border, alignItems: "center", justifyContent: "center" }}
        >
          <Send size={20} color={C.primaryFg} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
