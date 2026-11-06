import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, BookOpen, Heart } from "lucide-react";
import { DemoBadge } from "@/components/DemoBadge";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { useI18n } from "@/lib/i18n";
import { demoRecordsQuery } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Favoris — EXAMPRO" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const records = useQuery(
    demoRecordsQuery(me?.profile?.level_id, me?.profile?.track_id, "favorite"),
  );
  const favorites = useQuery({
    queryKey: ["course-favorites", me?.user.id],
    enabled: !!me?.user.id && !!me.isStudent,
    queryFn: async () => {
      if (!me?.user.id) return [];
      const { data: saved, error: savedError } = await supabase
        .from("course_favorites")
        .select("course_id,created_at")
        .eq("student_id", me.user.id)
        .order("created_at", { ascending: false });
      if (savedError) throw savedError;
      if (!saved.length) return [];
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id,title,summary")
        .in(
          "id",
          saved.map((favorite) => favorite.course_id),
        );
      if (coursesError) throw coursesError;
      return saved.flatMap((favorite) => {
        const course = courses.find((entry) => entry.id === favorite.course_id);
        return course ? [{ ...favorite, course }] : [];
      });
    },
  });
  if (records.isLoading || favorites.isLoading) return <Loading />;
  if (favorites.error)
    return <ErrorState error={favorites.error} onRetry={() => void favorites.refetch()} />;
  if (records.error)
    return <ErrorState error={records.error} onRetry={() => void records.refetch()} />;
  return (
    <div>
      <PageHeader title={t("dash.favorites")} subtitle={t("course.favoritesDescription")} />
      {favorites.data?.length ? (
        <section className="mb-8 space-y-3">
          <h2 className="text-lg font-semibold text-heading">{t("course.savedCourses")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.data.map(({ course, course_id }) => (
              <Link
                key={course_id}
                to="/courses/$courseId"
                params={{ courseId }}
                className="card-surface flex min-h-40 flex-col p-5 transition-shadow hover:shadow-brand"
              >
                <span className="flex items-center justify-between">
                  <Heart className="h-5 w-5 fill-current text-rose-500" />
                  <BookOpen className="h-4 w-4 text-deep" />
                </span>
                <span className="mt-5 font-semibold text-heading">{course.title}</span>
                <span className="mt-2 text-sm text-muted-foreground">
                  {course.summary || t("course.summaryFallback")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {!records.data?.length && !favorites.data?.length ? (
        <Empty>{t("demo.favoritesEmpty")}</Empty>
      ) : records.data?.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-heading">{t("demo.favoritesDescription")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {records.data.map((record) => (
              <Link
                key={record.id}
                to="/courses/$courseId"
                params={{ courseId: record.course_id! }}
                className="card-surface flex min-h-48 flex-col p-5 hover:shadow-brand"
              >
                <span className="flex items-center justify-between">
                  <Bookmark className="h-5 w-5 text-deep" />
                  <DemoBadge />
                </span>
                <span className="mt-5 flex items-center gap-2 font-semibold text-heading">
                  <BookOpen className="h-4 w-4" />
                  {record.title}
                </span>
                <span className="mt-2 text-sm text-muted-foreground">{record.description}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
