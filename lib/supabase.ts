import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder";

export const supabase = createClient(url, key, {
  auth: {
    storage: Platform.OS === "web" ? localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
