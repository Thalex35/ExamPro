import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { openCourseFile } from "@/lib/files";
import { useI18n } from "@/lib/i18n";
import { Empty, ErrorState, Loading } from "@/components/States";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/Field";
import { DemoBadge } from "@/components/DemoBadge";
import { useMe } from "@/lib/session";
import { ReportContentButton } from "@/components/ReportContentButton";
import type { TKey } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  head: () => ({ meta: [{ title: "Cours — EXAMPRO" }] }),
  component: CourseView,
});

function CourseView() {
  const { courseId } = Route.useParams();
  const { t, name, lang, errMsg } = useI18n();
  const { data: me } = useMe();
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
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
  if (q.isLoading || cat.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Empty>{t("404.title")}</Empty>;
  const x = q.data;
  const c = cat.data;
  const difficultyLabels: Record<string, TKey> = {
    beginner: "content.difficulty.beginner",
    intermediate: "content.difficulty.intermediate",
    advanced: "content.difficulty.advanced",
  };
  const filePath = x.file_path;
  const profile = me?.profile;
  const isOutOfScope =
    !!me?.isStudent &&
    (profile?.level_id !== x.level_id ||
      (!!profile?.track_id && !!x.track_id && profile.track_id !== x.track_id) ||
      (!!x.track_id && !profile?.track_id));
  if (isOutOfScope) return <Empty>{t("course.notAvailableForProfile")}</Empty>;
  const crumbs = c
    ? [
        c.subjects.find((s) => s.id === x.subject_id),
        c.chapters.find((s) => s.id === x.chapter_id),
        c.topics.find((s) => s.id === x.topic_id),
      ]
        .filter(Boolean)
        .map((o) => name(o!))
    : [];

  return (
    <article className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => router.history.back()} className="mb-4">
        ← {t("common.back")}
      </Button>
      <p className="text-sm font-medium text-deep">{crumbs.join(" · ")}</p>
      <h1 className="mt-2 text-3xl font-bold">{x.title}</h1>
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
      {x.status === "published" &&
        (me?.isStudent || me?.isTeacher) &&
        me.user.id !== x.author_id && (
          <div className="mt-3 flex flex-wrap gap-1">
            <ReportContentButton targetType="course" targetId={x.id} />
            <ReportContentButton targetType="user" targetId={x.author_id} />
          </div>
        )}
      {x.summary && <p className="mt-6 text-lg text-muted-foreground">{x.summary}</p>}
      {x.description && (
        <section className="mt-6 space-y-2">
          <h2 className="text-lg font-semibold text-heading">{t("content.longDescription")}</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {x.description}
          </p>
        </section>
      )}
      {x.preview && (
        <section className="mt-6 rounded-xl border border-border bg-muted/60 p-4">
          <h2 className="font-semibold text-heading">{t("content.preview")}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {x.preview}
          </p>
        </section>
      )}
      {(x.learning_objectives.length > 0 ||
        x.skills.length > 0 ||
        x.prerequisites.length > 0 ||
        x.duration_minutes ||
        x.difficulty) && (
        <section className="mt-6 space-y-5 rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold text-heading">{t("content.pedagogy")}</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {x.duration_minutes && (
              <span className="rounded-full bg-muted px-3 py-1">
                {x.duration_minutes} {t("content.minutes")}
              </span>
            )}
            {x.difficulty && (
              <span className="rounded-full bg-muted px-3 py-1">
                {t(difficultyLabels[x.difficulty] ?? "content.difficulty.beginner")}
              </span>
            )}
          </div>
          {x.learning_objectives.length > 0 && (
            <div>
              <h3 className="font-medium text-heading">{t("content.learningObjectives")}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {x.learning_objectives.map((objective, index) => (
                  <li key={`${index}-${objective}`}>{objective}</li>
                ))}
              </ul>
            </div>
          )}
          {x.skills.length > 0 && (
            <div>
              <h3 className="font-medium text-heading">{t("content.skills")}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {x.skills.map((skill, index) => (
                  <li key={`${index}-${skill}`}>{skill}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h3 className="font-medium text-heading">{t("content.prerequisites")}</h3>
            {x.prerequisites.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {x.prerequisites.map((prerequisite, index) => (
                  <li key={`${index}-${prerequisite}`}>{prerequisite}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{t("content.noPrerequisites")}</p>
            )}
          </div>
        </section>
      )}
      {x.is_demo && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          {t("demo.warning")}
        </p>
      )}
      {x.resource_type === "external_link" && x.external_url ? (
        <a
          href={x.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90"
        >
          <ExternalLink className="h-4 w-4" />
          {t("content.openLink")}
        </a>
      ) : x.resource_type === "document" && filePath ? (
        <Button
          className="mt-6"
          disabled={downloading}
          onClick={() => {
            setDownloading(true);
            void openCourseFile(filePath)
              .catch((error: unknown) => toast.error(errMsg(error)))
              .finally(() => setDownloading(false));
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          {downloading ? t("common.loading") : t("content.download")}
        </Button>
      ) : (
        <div className="card-surface mt-6 whitespace-pre-wrap p-6 leading-relaxed">{x.body}</div>
      )}
    </article>
  );
}
