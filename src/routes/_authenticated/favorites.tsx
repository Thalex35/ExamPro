import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, FileText } from "lucide-react";
import { toast } from "sonner";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { formatExamYear } from "@/lib/exam-years";
import { useFavoriteIds } from "@/lib/favorites";
import { openExamFile } from "@/lib/files";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Favoris — EXAMPRO" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { t, name, errMsg } = useI18n();
  const { data: me } = useMe();
  const [category, setCategory] = useState<"courses" | "exams">("courses");
  const userId = me?.isStudent ? me.user.id : undefined;
  const courseFavorites = useFavoriteIds("course", userId, !!userId);
  const examFavorites = useFavoriteIds("exam", userId, !!userId);
  const catalog = useQuery(catalogQuery);
  const courseIds = courseFavorites.data ?? [];
  const examIds = examFavorites.data ?? [];
  const library = useQuery({
    queryKey: ["favorite-library", userId, courseIds, examIds],
    enabled: !!userId && !courseFavorites.isLoading && !examFavorites.isLoading,
    queryFn: async () => {
      const [courseResult, examResult] = await Promise.all([
        courseIds.length
          ? supabase
              .from("courses")
              .select("id,title,subject_id,chapter_id,resource_type,resource_formats")
              .in("id", courseIds)
          : Promise.resolve({ data: [], error: null }),
        examIds.length
          ? supabase
              .from("exams")
              .select(
                "id,title,subject_id,chapter_id,exam_year,level_id,track_id,file_path,demo_content,session",
              )
              .in("id", examIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (courseResult.error) throw courseResult.error;
      if (examResult.error) throw examResult.error;
      return { courses: courseResult.data, exams: examResult.data };
    },
    placeholderData: (previous) => previous,
  });

  if (
    courseFavorites.isLoading ||
    examFavorites.isLoading ||
    catalog.isLoading ||
    library.isLoading
  )
    return <Loading />;
  if (courseFavorites.error)
    return (
      <ErrorState error={courseFavorites.error} onRetry={() => void courseFavorites.refetch()} />
    );
  if (examFavorites.error)
    return <ErrorState error={examFavorites.error} onRetry={() => void examFavorites.refetch()} />;
  if (catalog.error || !catalog.data)
    return <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />;
  if (library.error)
    return <ErrorState error={library.error} onRetry={() => void library.refetch()} />;

  const courses = (library.data?.courses ?? []).filter((course) => courseIds.includes(course.id));
  const exams = (library.data?.exams ?? []).filter((exam) => examIds.includes(exam.id));
  const displayedCount = courseIds.length + examIds.length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("dash.favorites")} subtitle={t("favorite.description")} />
      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-heading">{displayedCount}</strong> {t("favorite.savedCount")}
        </p>
        <div
          className="inline-flex rounded-lg border border-border bg-background p-1"
          role="tablist"
        >
          {(["courses", "exams"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={category === id}
              onClick={() => setCategory(id)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                category === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t(id === "courses" ? "favorite.myCourses" : "favorite.myExams")}
              <span className="ml-2 text-xs opacity-75">
                ({id === "courses" ? courseIds.length : examIds.length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {category === "courses" ? (
        courses.length ? (
          <ul className="space-y-3">
            {courses.map((course) => {
              const subject = catalog.data.subjects.find((item) => item.id === course.subject_id);
              const chapter = catalog.data.chapters.find((item) => item.id === course.chapter_id);
              const formatLabels: Record<string, string> = {
                text: t("content.textLesson"),
                document: t("content.document"),
                video: t("content.video"),
                external_link: t("content.externalLink"),
              };
              const formats = course.resource_formats?.length
                ? course.resource_formats
                : [course.resource_type];
              return (
                <li
                  key={course.id}
                  className="card-surface flex flex-wrap items-center gap-3 p-4 sm:p-5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Link
                    to="/courses/$courseId"
                    params={{ courseId: course.id }}
                    className="min-w-0 flex-1"
                  >
                    <span className="block font-semibold text-heading">{course.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {[
                        subject && name(subject),
                        chapter && name(chapter),
                        ...formats.map((format) => formatLabels[format] ?? format),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                  <FavoriteButton
                    kind="course"
                    resourceId={course.id}
                    iconOnly
                    className="text-rose-600 dark:text-rose-400"
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>{t("favorite.empty")}</Empty>
        )
      ) : exams.length ? (
        <ul className="space-y-3">
          {exams.map((exam) => {
            const subject = catalog.data.subjects.find((item) => item.id === exam.subject_id);
            const chapter = catalog.data.chapters.find((item) => item.id === exam.chapter_id);
            const level = catalog.data.levels.find((item) => item.id === exam.level_id);
            const track = catalog.data.tracks.find((item) => item.id === exam.track_id);
            return (
              <li
                key={exam.id}
                className="card-surface flex flex-wrap items-center gap-3 p-4 sm:p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-heading">{exam.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[
                      subject && name(subject),
                      chapter && name(chapter),
                      formatExamYear(exam.exam_year),
                      level && name(level),
                      track?.code,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openExamFile(exam.file_path, exam.demo_content).catch((error) =>
                      toast.error(errMsg(error)),
                    )
                  }
                >
                  {t("favorite.viewExam")}
                </Button>
                <FavoriteButton kind="exam" resourceId={exam.id} iconOnly />
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>{t("favorite.empty")}</Empty>
      )}
    </div>
  );
}
