import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { favoriteIdsQueryKey, useFavoriteIds, type FavoriteKind } from "@/lib/favorites";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  kind,
  resourceId,
  iconOnly = false,
  className,
}: {
  kind: FavoriteKind;
  resourceId: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const { t, errMsg } = useI18n();
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const userId = me?.isStudent ? me.user.id : undefined;
  const queryKey = favoriteIdsQueryKey(kind, userId ?? "");
  const favorites = useFavoriteIds(kind, userId, !!userId);
  const isFavorite = favorites.data?.includes(resourceId) ?? false;
  const addLabel = t(kind === "course" ? "favorite.addCourse" : "favorite.addExam");
  const removeLabel = t(kind === "course" ? "favorite.removeCourse" : "favorite.removeExam");
  const successMessage = t(
    isFavorite
      ? kind === "course"
        ? "course.favoriteRemoved"
        : "favorite.examRemoved"
      : kind === "course"
        ? "course.favoriteAdded"
        : "favorite.examAdded",
  );
  const toggle = useMutation({
    mutationFn: async (nextFavorite: boolean) => {
      if (!userId) throw new Error("FAVORITE_STUDENT_REQUIRED");
      if (kind === "course") {
        const result = nextFavorite
          ? await supabase
              .from("course_favorites")
              .insert({ student_id: userId, course_id: resourceId })
          : await supabase
              .from("course_favorites")
              .delete()
              .eq("student_id", userId)
              .eq("course_id", resourceId);
        if (result.error) throw result.error;
        return;
      }
      const result = nextFavorite
        ? await supabase.from("exam_favorites").insert({ student_id: userId, exam_id: resourceId })
        : await supabase
            .from("exam_favorites")
            .delete()
            .eq("student_id", userId)
            .eq("exam_id", resourceId);
      if (result.error) throw result.error;
    },
    onMutate: async (nextFavorite) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey);
      queryClient.setQueryData<string[]>(queryKey, (current = []) =>
        nextFavorite
          ? [...new Set([...current, resourceId])]
          : current.filter((id) => id !== resourceId),
      );
      return { previous };
    },
    onError: (error, _nextFavorite, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error(errMsg(error));
    },
    onSuccess: () => toast.success(successMessage),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        userId
          ? queryClient.invalidateQueries({ queryKey: ["favorite-library", userId] })
          : Promise.resolve(),
      ]);
    },
  });

  useEffect(() => {
    if (favorites.error) toast.error(errMsg(favorites.error));
  }, [favorites.error, errMsg]);

  if (!userId) return null;

  const label = isFavorite ? removeLabel : addLabel;
  const Icon = isFavorite ? Heart : iconOnly ? Heart : Bookmark;
  return (
    <Button
      type="button"
      variant={iconOnly ? "ghost" : "outline"}
      size={iconOnly ? "icon" : "sm"}
      aria-label={label}
      aria-pressed={isFavorite}
      title={label}
      disabled={favorites.isLoading || !!favorites.error || toggle.isPending}
      onClick={() => toggle.mutate(!isFavorite)}
      className={cn(
        "shrink-0",
        isFavorite && "text-rose-600 hover:text-rose-700 dark:text-rose-400",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4", isFavorite && "fill-current", !iconOnly && "mr-2")} />
      {!iconOnly && label}
    </Button>
  );
}
