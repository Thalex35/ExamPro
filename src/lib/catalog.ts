import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Level = T["levels"]["Row"];
export type Track = T["tracks"]["Row"];
export type Subject = T["subjects"]["Row"];
export type Chapter = T["chapters"]["Row"];
export type Topic = T["topics"]["Row"];

/** Whole academic catalog. Small and read-only for non-admins, so fetched once. */
export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: async () => {
    const [levels, tracks, subjects, ls, ts, chapters, topics] = await Promise.all([
      supabase.from("levels").select("*").order("sort_order"),
      supabase.from("tracks").select("*").order("sort_order"),
      supabase.from("subjects").select("*").order("name_fr"),
      supabase.from("level_subjects").select("*"),
      supabase.from("track_subjects").select("*"),
      supabase.from("chapters").select("*").order("sort_order"),
      supabase.from("topics").select("*").order("sort_order"),
    ]);
    const err = [levels, tracks, subjects, ls, ts, chapters, topics].find((r) => r.error)?.error;
    if (err) throw err;
    return {
      levels: levels.data!,
      tracks: tracks.data!,
      subjects: subjects.data!,
      levelSubjects: ls.data!,
      trackSubjects: ts.data!,
      chapters: chapters.data!,
      topics: topics.data!,
    };
  },
  staleTime: 5 * 60_000,
});

export type Catalog = Awaited<ReturnType<NonNullable<typeof catalogQuery.queryFn>>>;

/** Subjects available for a level and (when the level requires one) a track. */
export function subjectsFor(c: Catalog, levelId: string | null | undefined, trackId?: string | null): Subject[] {
  if (!levelId) return [];
  const level = c.levels.find((l) => l.id === levelId);
  if (!level) return [];
  const inLevel = new Set(c.levelSubjects.filter((x) => x.level_id === levelId).map((x) => x.subject_id));
  let ids = inLevel;
  if (level.requires_track && trackId) {
    const inTrack = new Set(c.trackSubjects.filter((x) => x.track_id === trackId).map((x) => x.subject_id));
    ids = new Set([...inLevel].filter((id) => inTrack.has(id)));
  }
  return c.subjects.filter((s) => ids.has(s.id));
}

export function tracksFor(c: Catalog, levelId: string | null | undefined) {
  return c.tracks.filter((t) => t.level_id === levelId);
}

export function chaptersFor(c: Catalog, subjectId: string | null | undefined, levelId: string | null | undefined) {
  return c.chapters.filter((ch) => ch.subject_id === subjectId && ch.level_id === levelId);
}

export function topicsFor(c: Catalog, chapterId: string | null | undefined) {
  return c.topics.filter((t) => t.chapter_id === chapterId);
}

/** PostgREST filter: content for a level, either track-agnostic or matching the student's track. */
export function trackFilter(trackId: string | null | undefined) {
  return trackId ? `track_id.is.null,track_id.eq.${trackId}` : "track_id.is.null";
}
