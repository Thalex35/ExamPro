import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FavoriteKind = "course" | "exam";

export function favoriteIdsQueryKey(kind: FavoriteKind, userId: string) {
  return ["favorites", kind, userId] as const;
}

export function useFavoriteIds(kind: FavoriteKind, userId?: string, enabled = true) {
  return useQuery({
    queryKey: ["favorites", kind, userId],
    enabled: !!userId && enabled,
    queryFn: async () => {
      if (!userId) return [];
      if (kind === "course") {
        const { data, error } = await supabase
          .from("course_favorites")
          .select("course_id")
          .eq("student_id", userId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data.map(({ course_id }) => course_id);
      }
      const { data, error } = await supabase
        .from("exam_favorites")
        .select("exam_id")
        .eq("student_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(({ exam_id }) => exam_id);
    },
  });
}
