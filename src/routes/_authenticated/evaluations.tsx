import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { DemoBadge } from "@/components/DemoBadge";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { openExamFile } from "@/lib/files";
import { demoRecordsQuery } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/evaluations")({
  head: () => ({ meta: [{ title: "Évaluations — EXAMPRO" }] }),
  component: EvaluationsPage,
});

function EvaluationsPage() {
  const { t, errMsg } = useI18n();
  const { data: me } = useMe();
  const records = useQuery(
    demoRecordsQuery(me?.profile?.level_id, me?.profile?.track_id, "evaluation"),
  );
  const exams = useQuery({
    queryKey: ["evaluation-demo-exams", records.data?.map((record) => record.exam_id)],
    enabled: !!records.data?.length,
    queryFn: async () => {
      const examIds = records.data!.flatMap((record) => (record.exam_id ? [record.exam_id] : []));
      if (!examIds.length) return [];
      const { data, error } = await supabase
        .from("exams")
        .select("id,file_path,demo_content")
        .in("id", examIds);
      if (error) throw error;
      return data;
    },
  });
  if (records.isLoading) return <Loading />;
  if (records.error)
    return <ErrorState error={records.error} onRetry={() => void records.refetch()} />;
  if (exams.error) return <ErrorState error={exams.error} onRetry={() => void exams.refetch()} />;
  const examById = new Map((exams.data ?? []).map((exam) => [exam.id, exam]));
  return (
    <div>
      <PageHeader title={t("dash.evaluations")} subtitle={t("demo.evaluationsDescription")} />
      {!records.data?.length ? (
        <Empty>{t("demo.evaluationsEmpty")}</Empty>
      ) : (
        <div className="space-y-4">
          {records.data.map((record) => {
            const exam = record.exam_id ? examById.get(record.exam_id) : undefined;
            return (
              <article
                key={record.id}
                className="card-surface flex flex-wrap items-center gap-4 p-5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-deep">
                  <FileCheck2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-heading">{record.title}</h2>
                    <DemoBadge />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{record.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(record.occurred_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xl font-bold text-deep">{record.score}%</span>
                {exam && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void openExamFile(exam.file_path, exam.demo_content).catch((error) =>
                        toast.error(errMsg(error)),
                      )
                    }
                  >
                    {t("common.open")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
