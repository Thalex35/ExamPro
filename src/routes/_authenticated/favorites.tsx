import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, BookOpen } from "lucide-react";
import { DemoBadge } from "@/components/DemoBadge";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { useI18n } from "@/lib/i18n";
import { demoRecordsQuery } from "@/lib/demo-data";
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
  if (records.isLoading) return <Loading />;
  if (records.error)
    return <ErrorState error={records.error} onRetry={() => void records.refetch()} />;
  return (
    <div>
      <PageHeader title={t("dash.favorites")} subtitle={t("demo.favoritesDescription")} />
      {!records.data?.length ? (
        <Empty>{t("demo.favoritesEmpty")}</Empty>
      ) : (
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
      )}
    </div>
  );
}
