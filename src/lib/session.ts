import { useQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Role = Database["public"]["Enums"]["app_role"];

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const user = u.user;
    if (!user) return null;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    const r = (roles ?? []).map((x) => x.role as Role);
    return {
      user,
      profile: profile as Profile | null,
      roles: r,
      isAdmin: r.includes("admin"),
      isTeacher: r.includes("teacher"),
      isStudent: r.includes("student"),
    };
  },
  staleTime: 30_000,
});

export function useMe() {
  return useQuery(meQuery);
}
