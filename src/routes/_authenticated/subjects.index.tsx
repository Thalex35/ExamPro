import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { catalogQuery, chaptersFor, subjectsFor } from "@/lib/catalog";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";

export const Route = createFileRoute("/_authenticated/subjects/")({
  head: () => ({ meta: [{ title: "Matières — EXAMPRO" }] }),
  component: Subjects,
});

function Subjects() {
  const { t, name } = useI18n();
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  if (cat.isLoading) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} onRetry={() => cat.refetch()} />;
  const c = cat.data;
  const levelId = me?.profile?.level_id;
  const subjects = subjectsFor(c, levelId, me?.profile?.track_id);
  const level = c.levels.find((l) => l.id === levelId);

  return (
    <div>
      <PageHeader title={t("subj.title")} subtitle={level ? `${t("subj.subtitle")} — ${name(level)}` : t("subj.subtitle")} />
      {subjects.length === 0 ? <Empty>{t("subj.empty")}</Empty> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => {
            const chapters = chaptersFor(c, s.id, levelId);
            return (
              <Link key={s.id} to="/subjects/$subjectId" params={{ subjectId: s.id }} className="card-surface group flex flex-col gap-3 p-5 transition-shadow hover:shadow-brand">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-brand"><BookOpen className="h-5 w-5" /></span>
                <span className="text-lg font-semibold text-heading">{name(s)}</span>
                <span className="text-sm text-muted-foreground">{chapters.length} {t("subj.chapters").toLowerCase()}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
