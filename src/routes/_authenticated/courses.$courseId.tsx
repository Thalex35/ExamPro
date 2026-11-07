import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bookmark,
  BookOpenText,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Info,
  ListChecks,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { CourseReader } from "@/components/CourseReader";
import { Empty, ErrorState, Loading } from "@/components/States";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/Field";
import { DemoBadge } from "@/components/DemoBadge";
import { ReportContentButton } from "@/components/ReportContentButton";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { useI18n, type TKey } from "@/lib/i18n";
import { useMe } from "@/lib/session";
import { subjectIcons } from "@/lib/subject-icons";
import { FavoriteButton } from "@/components/FavoriteButton";

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  head: () => ({ meta: [{ title: "Cours — EXAMPRO" }] }),
  component: CourseView,
});

function CourseView() {
  const { courseId } = Route.useParams();
  const { t, name, lang, errMsg } = useI18n();
  const { data: me } = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reading, setReading] = useState(false);
  const cat = useQuery(catalogQuery);
  const q = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const resources = useQuery({
    queryKey: ["course-resources", courseId],
    enabled: !!q.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_resources")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const progress = useQuery({
    queryKey: ["course-progress", me?.user.id, courseId],
    enabled: !!me?.isStudent && !!me.user.id,
    queryFn: async () => {
      if (!me?.user.id) return null;
      const { data, error } = await supabase
        .from("course_progress")
        .select("progress_percent,completed_at")
        .eq("student_id", me.user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (
    q.isLoading ||
    cat.isLoading ||
    (!!q.data && resources.isLoading) ||
    (me?.isStudent && progress.isLoading)
  )
    return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (resources.error)
    return <ErrorState error={resources.error} onRetry={() => void resources.refetch()} />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} onRetry={() => cat.refetch()} />;
  if (progress.error)
    return <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />;
  if (!q.data) return <Empty>{t("404.title")}</Empty>;

  const x = q.data;
  const c = cat.data;
  const difficultyLabels: Record<string, TKey> = {
    beginner: "content.difficulty.beginner",
    intermediate: "content.difficulty.intermediate",
    advanced: "content.difficulty.advanced",
  };
  const profile = me?.profile;
  const isOutOfScope =
    !!me?.isStudent &&
    (profile?.level_id !== x.level_id ||
      (!!profile?.track_id && !!x.track_id && profile.track_id !== x.track_id) ||
      (!!x.track_id && !profile?.track_id));
  if (isOutOfScope) return <Empty>{t("course.notAvailableForProfile")}</Empty>;
  const subject = c.subjects.find((entry) => entry.id === x.subject_id);
  const chapter = c.chapters.find((entry) => entry.id === x.chapter_id);
  const topic = c.topics.find((entry) => entry.id === x.topic_id);
  const SubjectIcon = subjectIcons[subject?.icon ?? ""] ?? GraduationCap;
  const crumbs = [subject, chapter, topic].filter(Boolean).map((entry) => name(entry!));
  const currentProgress = progress.data?.progress_percent ?? 0;
  const isComplete = currentProgress === 100;
  const resourceTypeLabel =
    x.resource_type === "document"
      ? t("content.document")
      : x.resource_type === "video"
        ? t("content.video")
        : x.resource_type === "external_link"
          ? t("content.externalLink")
          : t("content.textLesson");
  const courseResources = [
    ...(x.resource_type !== "text"
      ? [
          {
            id: "primary",
            title: x.file_name || x.title,
            resource_type: x.resource_type,
            file_path: x.file_path,
            external_url: x.external_url,
          },
        ]
      : []),
    ...(resources.data ?? []),
  ].filter(
    (resource) =>
      (resource.resource_type === "document" && !!resource.file_path) ||
      ((resource.resource_type === "video" || resource.resource_type === "external_link") &&
        !!resource.external_url),
  );

  async function saveProgress(value: number, complete = false) {
    if (!me?.isStudent) return;
    const { error } = await supabase.from("course_progress").upsert(
      {
        student_id: me.user.id,
        course_id: x.id,
        progress_percent: complete ? 100 : Math.min(99, value),
        completed_at: complete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,course_id" },
    );
    if (error) {
      throw error;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["course-progress", me.user.id, x.id] }),
      queryClient.invalidateQueries({ queryKey: ["course-reading-history", me.user.id] }),
    ]);
  }

  if (reading && x.resource_type === "text") {
    return (
      <CourseReader
        title={x.title}
        body={x.body}
        durationMinutes={x.duration_minutes}
        progress={currentProgress}
        onClose={() => setReading(false)}
        onSaveProgress={(value) => saveProgress(value)}
        onComplete={() => saveProgress(100, true)}
        onError={(error) => toast.error(errMsg(error))}
      />
    );
  }

  return (
    <article className="mx-auto max-w-7xl">
      <Button variant="ghost" size="sm" onClick={() => router.history.back()} className="mb-4">
        ← {t("common.back")}
      </Button>
      <header className="card-surface overflow-hidden p-3 sm:p-4">
        <div className="grid gap-5 md:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.6fr)] md:gap-7">
          <div
            role="img"
            aria-label={subject ? name(subject) : t("content.pedagogy")}
            className="relative flex min-h-52 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-950 via-sky-800 to-cyan-700 p-6 text-white sm:min-h-64 md:min-h-full"
          >
            <div
              aria-hidden="true"
              className="absolute -right-14 -top-16 h-52 w-52 rounded-full border border-white/15 bg-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full border border-white/15 bg-white/10"
            />
            <div className="relative flex h-36 w-36 items-center justify-center rounded-[2rem] border border-white/30 bg-white/10 shadow-2xl backdrop-blur-sm sm:h-44 sm:w-44">
              <SubjectIcon className="h-20 w-20 text-white sm:h-24 sm:w-24" strokeWidth={1.4} />
            </div>
            {subject && (
              <span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-sky-950/70 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                {name(subject)}
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-center p-3 sm:p-5 md:py-6 md:pr-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <nav
                aria-label={t("course.breadcrumb")}
                className="min-w-0 text-sm text-muted-foreground"
              >
                {crumbs.join(" · ")}
              </nav>
              {me?.isStudent && (
                <FavoriteButton
                  kind="course"
                  resourceId={x.id}
                  className="rounded-full border-brand/30 bg-background px-4"
                />
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-deep">
                <BookOpenText className="h-3.5 w-3.5" />
                {resourceTypeLabel}
              </span>
              {subject && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-background px-3 py-1.5 text-xs font-semibold text-primary">
                  <SubjectIcon className="h-3.5 w-3.5" />
                  {name(subject)}
                </span>
              )}
              {chapter && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-background px-3 py-1.5 text-xs font-semibold text-primary">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {name(chapter)}
                </span>
              )}
              {x.difficulty && (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  {t(difficultyLabels[x.difficulty] ?? "content.difficulty.beginner")}
                </span>
              )}
              {x.duration_minutes && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-medium">
                  <Clock3 className="h-3.5 w-3.5" />
                  {x.duration_minutes} {t("content.minutes")}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-bold leading-tight text-heading sm:text-4xl">
              {x.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {x.status !== "published" && (
                <StatusBadge status={x.status} label={t(`status.${x.status}`)} />
              )}
              {x.is_demo && <DemoBadge />}
              {x.published_at && (
                <span>
                  {t("course.by")}{" "}
                  {new Date(x.published_at).toLocaleDateString(lang === "ht" ? "fr-HT" : "fr-FR")}
                </span>
              )}
            </div>
            {x.summary && (
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {x.summary}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-primary">
              {x.learning_objectives.length > 0 && (
                <span className="inline-flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  {t("content.learningObjectives")} : {x.learning_objectives.length}
                </span>
              )}
              {x.skills.length > 0 && (
                <span className="inline-flex items-center gap-2 border-l border-border pl-4">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("content.skills")} : {x.skills.length}
                </span>
              )}
              {x.prerequisites.length > 0 && (
                <span className="inline-flex items-center gap-2 border-l border-border pl-4">
                  <Bookmark className="h-4 w-4" />
                  {t("content.prerequisites")} : {x.prerequisites[0]}
                </span>
              )}
            </div>
            {me?.isStudent && currentProgress > 0 && x.resource_type === "text" && (
              <div className="mt-5 max-w-lg">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>{isComplete ? t("course.completed") : t("course.readingProgress")}</span>
                  <span>{currentProgress}%</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={currentProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t("course.readingProgress")}
                >
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {x.status === "published" &&
        (me?.isStudent || me?.isTeacher) &&
        me.user.id !== x.author_id && (
          <div className="mt-3 flex flex-wrap gap-1">
            <ReportContentButton targetType="course" targetId={x.id} />
            <ReportContentButton targetType="user" targetId={x.author_id} />
          </div>
        )}
      {x.is_demo && (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-medium text-amber-900 dark:text-amber-200">
          {t("demo.warning")}
        </p>
      )}

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]">
        <div className="space-y-5">
          {x.learning_objectives.length > 0 && (
            <section className="card-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-3 text-xl font-bold text-heading">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-deep">
                  <ListChecks className="h-5 w-5" />
                </span>
                {t("content.learningObjectives")}
              </h2>
              <PedagogyList values={x.learning_objectives} />
            </section>
          )}
          {x.skills.length > 0 && (
            <section className="card-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-3 text-xl font-bold text-heading">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-deep">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                {t("content.skills")}
              </h2>
              <PedagogyList values={x.skills} />
            </section>
          )}
          <section className="card-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-3 text-xl font-bold text-heading">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-deep">
                <Bookmark className="h-5 w-5" />
              </span>
              {t("content.prerequisites")}
            </h2>
            <PedagogyList values={x.prerequisites} fallback={t("content.noPrerequisites")} />
          </section>
          <section className="card-surface p-5 sm:p-6">
            <h2 className="text-xl font-bold text-heading">{t("content.longDescription")}</h2>
            <p className="mt-3 whitespace-pre-wrap leading-8 text-muted-foreground">
              {x.description || x.summary || t("course.descriptionFallback")}
            </p>
          </section>
          {x.preview && (
            <section className="card-surface p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-heading">{t("content.preview")}</h2>
              <p className="mt-2 whitespace-pre-wrap leading-7 text-muted-foreground">
                {x.preview}
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          {(courseResources.length > 0 || x.resource_type === "text") && (
            <section className="card-surface p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-heading">
                <FileText className="h-5 w-5 text-deep" />
                {t("course.resourcesTitle")}
              </h2>
              {!courseResources.length && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("content.optionalResourceHint")}
                </p>
              )}
              <div className="mt-4 space-y-3">
                {courseResources.map((resource, index) => {
                  const isDocument = resource.resource_type === "document";
                  const isVideo = resource.resource_type === "video";
                  const resourceType = isDocument
                    ? t("content.document")
                    : isVideo
                      ? t("content.video")
                      : t("content.externalLink");
                  return (
                    <div key={resource.id} className="space-y-3">
                      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-accent/45 p-3 sm:p-4">
                        {isVideo ? (
                          <span className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-sky-950 via-sky-800 to-cyan-700 text-white">
                            <span className="absolute inset-0 bg-white/10" />
                            <Video className="relative h-6 w-6" />
                          </span>
                        ) : (
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-background text-deep shadow-sm">
                            {isDocument ? (
                              <FileText className="h-6 w-6" />
                            ) : (
                              <ExternalLink className="h-5 w-5" />
                            )}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-heading">
                            {resource.title}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">{resourceType}</p>
                        </div>
                        <Link
                          to="/courses/resource/$courseId/$resourceId"
                          params={{ courseId: x.id, resourceId: resource.id }}
                          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-brand/35 bg-background px-3 text-sm font-semibold text-primary transition-colors hover:bg-accent sm:px-4"
                        >
                          {isDocument ? (
                            <Download className="h-4 w-4" />
                          ) : isVideo ? (
                            <Video className="h-4 w-4" />
                          ) : (
                            <ExternalLink className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">
                            {isDocument
                              ? t("content.download")
                              : isVideo
                                ? t("content.watchVideo")
                                : t("content.openLink")}
                          </span>
                          <span className="sr-only sm:hidden">
                            {isDocument
                              ? t("content.download")
                              : isVideo
                                ? t("content.watchVideo")
                                : t("content.openLink")}
                          </span>
                        </Link>
                      </div>
                      {index < courseResources.length - 1 && (
                        <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                          <span className="h-px flex-1 bg-border" />
                          <span>{t("course.resourceSeparator")}</span>
                          <span className="h-px flex-1 bg-border" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {x.resource_type === "text" && (
                <Button
                  variant="default"
                  className="mt-4 h-12 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                  onClick={() => setReading(true)}
                >
                  <BookOpenText className="mr-2 h-5 w-5" />
                  {isComplete
                    ? t("course.reviewCourse")
                    : currentProgress > 0
                      ? t("course.continue")
                      : t("course.start")}
                </Button>
              )}
            </section>
          )}
        </aside>
      </div>
      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-3 text-sm font-medium">
          <Info className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-300" />
          {t("course.studyTip")}
        </p>
        {x.duration_minutes && (
          <p className="flex shrink-0 items-center gap-2 text-sm font-semibold">
            <Clock3 className="h-4 w-4" />
            {t("quiz.estimatedDuration")} : {x.duration_minutes} {t("content.minutes")}
          </p>
        )}
      </div>
    </article>
  );
}

function PedagogyList({ values, fallback }: { values: string[]; fallback?: string }) {
  if (!values.length) {
    return fallback ? <p className="mt-3 text-sm text-muted-foreground">{fallback}</p> : null;
  }
  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground sm:text-base">
      {values.map((value, index) => (
        <li key={`${index}-${value}`} className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-deep" aria-hidden="true" />
          <span>{value}</span>
        </li>
      ))}
    </ul>
  );
}
