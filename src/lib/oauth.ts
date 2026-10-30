import { supabase } from "@/integrations/supabase/client";

export function signInWithGoogle(origin: string) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL("/auth", origin).toString() },
  });
}
