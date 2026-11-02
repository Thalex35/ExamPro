import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CalendarDays, ChartNoAxesColumn, Clock3 } from "lucide-react";
import { DemoBadge } from "@/components/DemoBadge";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { demoRecordsQuery } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Ma progression — EXAMPRO" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const records = useQuery(
    demoRecordsQuery(me?.profile?.level_id, me?.profile?.track_id, "progress"),
  );
  if (records.isLoading) return <Loading />;
  if (records.error)
    return <ErrorState error={records.error} onRetry={() => void records.refetch()} />;
  const items = records.data ?? [];
  return (
    <div>
      <PageHeader title={t("dash.performance")} subtitle={t("demo.progressDescription")} />
      {!items.length ? (
        <Empty>{t("demo.progressEmpty")}</Empty>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="card-surface p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-deep">
                <BookOpen className="h-5 w-5" />
              </span>
              <p className="mt-4 text-3xl font-bold text-heading">{items.length}</p>
              <p className="text-sm text-muted-foreground">{t("demo.itemsViewed")}</p>
            </section>
            <section className="card-surface p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-deep">
                <ChartNoAxesColumn className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-semibold text-heading">{t("demo.mockMetrics")}</p>
              <p className="text-sm text-muted-foreground">{t("demo.notRealPerformance")}</p>
            </section>
          </div>
          <section>
            <h2 className="mb-3 text-lg font-semibold text-heading">{t("demo.recentActivity")}</h2>
            <div className="card-surface divide-y">
              {items.map((item) => (
                <Link
                  key={item.id}
                  to="/courses/$courseId"
                  params={{ courseId: item.course_id! }}
                  className="flex flex-wrap items-center gap-3 p-4 hover:bg-muted/40"
                >
                  <Clock3 className="h-4 w-4 text-deep" />
                  <span className="min-w-0 flex-1 font-medium text-heading">{item.title}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(item.occurred_at).toLocaleDateString()}
                  </span>
                  <DemoBadge />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
