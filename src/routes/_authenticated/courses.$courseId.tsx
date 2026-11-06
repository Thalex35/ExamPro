import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  BookOpenText,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  GraduationCap,
  Heart,
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
import { openCourseFile } from "@/lib/files";
import { useI18n, type TKey } from "@/lib/i18n";
import { useMe } from "@/lib/session";
import { subjectIcons } from "@/lib/subject-icons";

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  head: () => ({ meta: [{ title: "Cours — EXAMPRO" }] }),
  component: CourseView,
});

function getVideoEmbedUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (parsed.hostname === "www.youtube.com" || parsed.hostname === "youtube.com") {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (parsed.hostname === "vimeo.com" || parsed.hostname === "www.vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function CourseView() {
  const { courseId } = Route.useParams();
  const { t, name, lang, errMsg } = useI18n();
  const { data: me } = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);
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
  const favorite = useQuery({
    queryKey: ["course-favorite", me?.user.id, courseId],
    enabled: !!me?.isStudent && !!me.user.id,
    queryFn: async () => {
      if (!me?.user.id) return null;
      const { data, error } = await supabase
        .from("course_favorites")
        .select("course_id")
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
    (me?.isStudent && (progress.isLoading || favorite.isLoading))
  )
    return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (resources.error)
    return <ErrorState error={resources.error} onRetry={() => void resources.refetch()} />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} onRetry={() => cat.refetch()} />;
  if (progress.error)
    return <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />;
  if (favorite.error)
    return <ErrorState error={favorite.error} onRetry={() => void favorite.refetch()} />;
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
  const videoEmbedUrl = x.resource_type === "video" ? getVideoEmbedUrl(x.external_url) : null;
  const resourceTypeLabel =
    x.resource_type === "document"
      ? t("content.document")
      : x.resource_type === "video"
        ? t("content.video")
        : x.resource_type === "external_link"
          ? t("content.externalLink")
          : t("content.textLesson");

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

  async function toggleFavorite() {
    if (!me?.isStudent) return;
    const result = favorite.data
      ? await supabase
          .from("course_favorites")
          .delete()
          .eq("student_id", me.user.id)
          .eq("course_id", x.id)
      : await supabase.from("course_favorites").insert({ student_id: me.user.id, course_id: x.id });
    if (result.error) {
      toast.error(errMsg(result.error));
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["course-favorite", me.user.id, x.id] }),
      queryClient.invalidateQueries({ queryKey: ["course-favorites", me.user.id] }),
    ]);
    toast.success(favorite.data ? t("course.favoriteRemoved") : t("course.favoriteAdded"));
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
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-full border-brand/30 bg-background px-4"
                  onClick={() => void toggleFavorite()}
                  disabled={favorite.isFetching}
                >
                  {favorite.data ? (
                    <Heart className="mr-2 h-4 w-4 fill-current text-rose-500" />
                  ) : (
                    <Bookmark className="mr-2 h-4 w-4" />
                  )}
                  {favorite.data ? t("course.removeFavorite") : t("course.addFavorite")}
                </Button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-deep">
                <BookOpenText className="h-3.5 w-3.5" />
                {resourceTypeLabel}
              </span>
              {x.difficulty && (
                <span className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-medium">
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
              {chapter && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/70 px-3 py-1.5 font-medium text-accent-foreground">
                  <GraduationCap className="h-4 w-4" />
                  {name(chapter)}
                </span>
              )}
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
            <div className="mt-6 flex flex-wrap gap-3">
              {x.resource_type === "text" ? (
                <Button variant="hero" onClick={() => setReading(true)}>
                  <BookOpenText className="mr-2 h-4 w-4" />
                  {isComplete
                    ? t("course.reviewCourse")
                    : currentProgress > 0
                      ? t("course.continue")
                      : t("course.start")}
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              ) : x.resource_type === "document" && x.file_path ? (
                <Button
                  variant="hero"
                  disabled={downloading}
                  onClick={() => {
                    setDownloading(true);
                    void openCourseFile(x.file_path!)
                      .catch((error: unknown) => toast.error(errMsg(error)))
                      .finally(() => setDownloading(false));
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloading ? t("common.loading") : t("content.download")}
                </Button>
              ) : x.external_url ? (
                <a
                  href={x.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90"
                >
                  {x.resource_type === "video" ? (
                    <Video className="mr-2 h-4 w-4" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  {x.resource_type === "video" ? t("content.watchVideo") : t("content.openLink")}
                </a>
              ) : null}
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
          {x.resource_type === "video" && videoEmbedUrl && (
            <section className="card-surface overflow-hidden p-2 sm:p-3">
              <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                <iframe
                  src={videoEmbedUrl}
                  title={x.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-heading">
              <BookOpenText className="h-5 w-5 text-deep" />
              {t("content.courseResource")}
            </h2>
            <div className="mt-4 rounded-xl bg-accent/70 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-deep shadow-sm">
                  {x.resource_type === "document" ? (
                    <Download className="h-5 w-5" />
                  ) : x.resource_type === "video" ? (
                    <Video className="h-5 w-5" />
                  ) : x.resource_type === "external_link" ? (
                    <ExternalLink className="h-5 w-5" />
                  ) : (
                    <BookOpenText className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-heading">{x.file_name || x.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{resourceTypeLabel}</p>
                </div>
              </div>
              {x.resource_type !== "text" && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("content.optionalResourceHint")}
                </p>
              )}
            </div>
            {x.duration_minutes && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-deep">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-heading">{t("quiz.estimatedDuration")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {x.duration_minutes} {t("content.minutes")}
                  </p>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
      {!!resources.data?.length && (
        <section className="mt-6 space-y-4" aria-labelledby="course-supplementary-resources">
          <div>
            <h2 id="course-supplementary-resources" className="text-xl font-bold text-heading">
              {t("content.supplementaryResources")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("content.supplementaryResourcesHint")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {resources.data.map((resource) => {
              const embedUrl =
                resource.resource_type === "video" ? getVideoEmbedUrl(resource.external_url) : null;
              return (
                <article key={resource.id} className="card-surface flex min-w-0 flex-col p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-deep">
                      {resource.resource_type === "document" ? (
                        <Download className="h-5 w-5" />
                      ) : resource.resource_type === "video" ? (
                        <Video className="h-5 w-5" />
                      ) : (
                        <ExternalLink className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-heading">{resource.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {resource.resource_type === "document"
                          ? t("content.document")
                          : resource.resource_type === "video"
                            ? t("content.video")
                            : t("content.externalLink")}
                      </p>
                    </div>
                  </div>
                  {embedUrl && (
                    <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-muted">
                      <iframe
                        src={embedUrl}
                        title={resource.title}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  )}
                  {resource.resource_type === "document" && resource.file_path ? (
                    <Button
                      variant="outline"
                      className="mt-4 self-start"
                      onClick={() =>
                        void openCourseFile(resource.file_path!).catch((error: unknown) =>
                          toast.error(errMsg(error)),
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t("content.download")}
                    </Button>
                  ) : resource.external_url ? (
                    <a
                      href={resource.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex min-h-10 items-center self-start rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      {resource.resource_type === "video"
                        ? t("content.watchVideo")
                        : t("content.openLink")}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      )}
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
