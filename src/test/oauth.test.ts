import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/oauth";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithOAuth: vi.fn() } },
}));

describe("Google OAuth", () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.signInWithOAuth).mockReset();
  });

  it("uses Supabase Google OAuth and returns to the current app origin", async () => {
    await signInWithGoogle("https://exampro-ht.vercel.app");

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://exampro-ht.vercel.app/auth" },
    });
  });
});
