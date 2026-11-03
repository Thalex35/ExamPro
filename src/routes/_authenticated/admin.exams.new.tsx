import { createFileRoute } from "@tanstack/react-router";
import { ExamForm } from "@/components/ExamForm";
import { AdminGate } from "@/components/TeacherGate";
import { PageHeader } from "@/components/States";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/exams/new")({
  head: () => ({ meta: [{ title: "Ajouter un examen — EXAMPRO" }] }),
  component: NewAdminExam,
});

function NewAdminExam() {
  const { t } = useI18n();
  return (
    <AdminGate>
      <PageHeader title={t("admin.newExam")} />
      <ExamForm returnTo="/admin/exams" />
    </AdminGate>
  );
}
