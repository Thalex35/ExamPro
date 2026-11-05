import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/Field";
import { Empty, ErrorState, Loading } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";

type ReportStatus = "pending" | "resolved" | "dismissed";
const targetTypeLabels: Record<string, TKey> = {
  course: "report.target.course",
  exam: "report.target.exam",
  user: "report.target.user",
};
const reportStatusLabels: Record<string, TKey> = {
  pending: "report.status.pending",
  resolved: "report.status.resolved",
  dismissed: "report.status.dismissed",
};

export function ContentReportsAdmin() {
  const { t, lang, errMsg } = useI18n();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { status: ReportStatus; note: string }>>({});
  const q = useQuery({
    queryKey: ["admin-content-reports"],
    queryFn: async () => {
      const { data: reports, error } = await supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const courseIds = reports
        .filter((report) => report.target_type === "course")
        .map((r) => r.target_id);
      const examIds = reports
        .filter((report) => report.target_type === "exam")
        .map((r) => r.target_id);
      const profileIds = reports.flatMap((report) => [
        report.reporter_id,
        ...(report.target_type === "user" ? [report.target_id] : []),
      ]);
      const names = new Map<string, string>();

      if (courseIds.length) {
        const { data, error: courseError } = await supabase
          .from("courses")
          .select("id,title")
          .in("id", courseIds);
        if (courseError) throw courseError;
        for (const course of data) names.set(course.id, course.title);
      }
      if (examIds.length) {
        const { data, error: examError } = await supabase
          .from("exams")
          .select("id,title")
          .in("id", examIds);
        if (examError) throw examError;
        for (const exam of data) names.set(exam.id, exam.title);
      }
      if (profileIds.length) {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", [...new Set(profileIds)]);
        if (profileError) throw profileError;
        for (const profile of data) {
          names.set(profile.id, profile.full_name || t("report.unnamedUser"));
        }
      }

      return { reports, names };
    },
  });

  async function save(reportId: string) {
    const report = q.data?.reports.find((item) => item.id === reportId);
    if (!report) return;
    const draft = drafts[reportId] ?? {
      status: report.status as ReportStatus,
      note: report.admin_note ?? "",
    };
    try {
      const { error } = await supabase
        .from("content_reports")
        .update({
          status: draft.status,
          admin_note: draft.note.trim() || null,
          resolved_at: draft.status === "pending" ? null : new Date().toISOString(),
        })
        .eq("id", reportId);
      if (error) throw error;
      toast.success(t("report.saved"));
      await queryClient.invalidateQueries({ queryKey: ["admin-content-reports"] });
    } catch (error) {
      toast.error(errMsg(error));
    }
  }

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data.reports.length) return <Empty>{t("report.noReports")}</Empty>;

  return (
    <div className="space-y-4">
      {q.data.reports.map((report) => {
        const draft = drafts[report.id] ?? {
          status: report.status as ReportStatus,
          note: report.admin_note ?? "",
        };
        const targetName = q.data.names.get(report.target_id) ?? t("report.unavailable");
        const reporterName = q.data.names.get(report.reporter_id) ?? t("report.unnamedUser");
        return (
          <article key={report.id} className="card-surface space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(targetTypeLabels[report.target_type] ?? "report.target.course")}
                </p>
                <h3 className="mt-1 break-words font-semibold text-heading">{targetName}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("report.reportedBy")} {reporterName} ·{" "}
                  {new Date(report.created_at).toLocaleString(lang === "ht" ? "fr-HT" : "fr-FR")}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                {t(reportStatusLabels[report.status] ?? "report.status.pending")}
              </span>
            </div>
            <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
              {report.reason}
            </p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end">
              <label className="space-y-1 text-sm font-medium">
                {t("report.statusLabel")}
                <NativeSelect
                  className="h-10 w-full"
                  value={draft.status}
                  onChange={(event) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [report.id]: { ...draft, status: event.target.value as ReportStatus },
                    }))
                  }
                >
                  <option value="pending">{t("report.status.pending")}</option>
                  <option value="resolved">{t("report.status.resolved")}</option>
                  <option value="dismissed">{t("report.status.dismissed")}</option>
                </NativeSelect>
              </label>
              <label className="space-y-1 text-sm font-medium">
                {t("report.adminNote")}
                <Textarea
                  rows={2}
                  maxLength={500}
                  value={draft.note}
                  onChange={(event) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [report.id]: { ...draft, note: event.target.value },
                    }))
                  }
                />
              </label>
              <Button type="button" onClick={() => void save(report.id)}>
                {t("common.save")}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
