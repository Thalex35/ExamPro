import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { Empty, ErrorState, Loading } from "@/components/States";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/Field";

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  head: () => ({ meta: [{ title: "Cours — EXAMPRO" }] }),
  component: CourseView,
});

function CourseView() {
  const { courseId } = Route.useParams();
  const { t, name, lang } = useI18n();
  const router = useRouter();
  const cat = useQuery(catalogQuery);
  const q = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading || cat.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Empty>{t("404.title")}</Empty>;
  const x = q.data;
  const c = cat.data;
  const crumbs = c ? [c.subjects.find((s) => s.id === x.subject_id), c.chapters.find((s) => s.id === x.chapter_id), c.topics.find((s) => s.id === x.topic_id)].filter(Boolean).map((o) => name(o!)) : [];

  return (
    <article className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => router.history.back()} className="mb-4">← {t("common.back")}</Button>
      <p className="text-sm font-medium text-deep">{crumbs.join(" · ")}</p>
      <h1 className="mt-2 text-3xl font-bold">{x.title}</h1>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {x.status !== "published" && <StatusBadge status={x.status} label={t(`status.${x.status}`)} />}
        {x.published_at && <span>{t("course.by")} {new Date(x.published_at).toLocaleDateString(lang === "ht" ? "fr-HT" : "fr-FR")}</span>}
      </div>
      {x.summary && <p className="mt-6 text-lg text-muted-foreground">{x.summary}</p>}
      <div className="card-surface mt-6 whitespace-pre-wrap p-6 leading-relaxed">{x.body}</div>
    </article>
  );
}
