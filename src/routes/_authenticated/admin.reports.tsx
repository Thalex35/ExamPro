import { createFileRoute } from "@tanstack/react-router";
import { ContentReportsAdmin } from "@/components/ContentReportsAdmin";
import { PageHeader } from "@/components/States";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Signalements — EXAMPRO" }] }),
  component: AdminReports,
});

function AdminReports() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.reports")} subtitle={t("admin.reportsDescription")} />
      <ContentReportsAdmin />
    </div>
  );
}
