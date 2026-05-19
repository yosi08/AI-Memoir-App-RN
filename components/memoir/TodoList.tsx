import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Check, Plus, Sparkles, Trash2 } from "lucide-react-native";
import { supabase } from "../../lib/supabase";

interface Todo { id: number; text: string; completed: boolean }

interface TodoListProps {
  onCompletedCountChange: (count: number) => void;
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

export function TodoList({ onCompletedCountChange }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(true);

  const done = todos.filter((t) => t.completed).length;
  const pct = todos.length ? (done / todos.length) * 100 : 0;

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 6000);
    supabase
      .from("todos")
      .select("*")
      .order("created_at")
      .then(({ data, error }) => {
        clearTimeout(timeout);
        if (error) console.error("[TodoList] fetch error:", error.message);
        if (data) setTodos(data);
        setLoading(false);
      })
      .catch((e) => {
        clearTimeout(timeout);
        console.error("[TodoList] unexpected error:", e);
        setLoading(false);
      });
  }, []);

  useEffect(() => { onCompletedCountChange(done); }, [done]);

  const add = async () => {
    if (!newText.trim()) return;
    const text = newText.trim();
    setNewText("");
    const { data } = await supabase
      .from("todos")
      .insert({ text, completed: false })
      .select()
      .single();
    if (data) setTodos((p) => [...p, data]);
  };

  const toggle = async (id: number) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    await supabase.from("todos").update({ completed: !todo.completed }).eq("id", id);
  };

  const remove = async (id: number) => {
    setTodos((p) => p.filter((t) => t.id !== id));
    await supabase.from("todos").delete().eq("id", id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: C.foreground, marginBottom: 4 }}>Today's Intentions</Text>
        <Text style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Set and track your daily mindfulness goals</Text>

        {/* 진행 카드 */}
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 18, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Sparkles size={18} color={C.primary} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: C.foreground }}>Daily Progress</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.primary }}>{done}/{todos.length}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: C.secondary, borderRadius: 4, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${pct}%`, backgroundColor: C.primary, borderRadius: 4 }} />
          </View>
          {todos.length > 0 && done === todos.length && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
              <Sparkles size={14} color={C.accent} />
              <Text style={{ fontSize: 13, color: C.accent, fontWeight: "500" }}>All intentions complete! Great job!</Text>
            </View>
          )}
        </View>

        {/* 입력 */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <TextInput
            value={newText}
            onChangeText={setNewText}
            onSubmitEditing={add}
            returnKeyType="done"
            placeholder="Add a new intention..."
            placeholderTextColor={C.muted + "88"}
            style={{ flex: 1, height: 48, backgroundColor: C.secondary, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, fontSize: 14, color: C.foreground }}
          />
          <TouchableOpacity
            onPress={add}
            disabled={!newText.trim()}
            style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: newText.trim() ? C.primary : C.border, alignItems: "center", justifyContent: "center" }}
          >
            <Plus size={20} color={C.primaryFg} />
          </TouchableOpacity>
        </View>

        {/* 로딩 */}
        {loading && (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        )}

        {/* 빈 상태 */}
        {!loading && todos.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.secondary, alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={28} color={C.muted} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: C.muted }}>No intentions yet</Text>
            <Text style={{ fontSize: 13, color: C.muted + "99", textAlign: "center" }}>Add your first intention above{"\n"}to start tracking your day</Text>
          </View>
        )}

        {/* 목록 */}
        <View style={{ gap: 10 }}>
          {todos.map((todo) => (
            <View
              key={todo.id}
              style={{
                backgroundColor: todo.completed ? C.primary + "08" : C.card,
                borderRadius: 16, padding: 16,
                flexDirection: "row", alignItems: "center", gap: 12,
                borderWidth: 1, borderColor: todo.completed ? C.primary + "30" : C.border,
              }}
            >
              <TouchableOpacity
                onPress={() => toggle(todo.id)}
                style={{
                  width: 24, height: 24, borderRadius: 8,
                  backgroundColor: todo.completed ? C.primary : "transparent",
                  borderWidth: 2, borderColor: todo.completed ? C.primary : C.muted + "55",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {todo.completed && <Check size={13} color={C.primaryFg} />}
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: todo.completed ? C.muted : C.foreground, textDecorationLine: todo.completed ? "line-through" : "none" }}>
                {todo.text}
              </Text>
              <TouchableOpacity onPress={() => remove(todo.id)} style={{ padding: 4 }}>
                <Trash2 size={15} color={C.muted + "88"} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
