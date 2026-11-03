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
      {x.summary && <p className="mt-6 text-lg text-muted-foreground">{x.summary}</p>}
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
