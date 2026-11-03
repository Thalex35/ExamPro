import { createFileRoute } from "@tanstack/react-router";
import { ExamForm } from "@/components/ExamForm";
import { PageHeader } from "@/components/States";
import { TeacherGate } from "@/components/TeacherGate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/teacher/exams/new")({
  head: () => ({ meta: [{ title: "Téléverser un examen — EXAMPRO" }] }),
  component: NewExam,
});

function NewExam() {
  const { t } = useI18n();
  return (
    <TeacherGate requireVerified>
      <PageHeader title={t("teacher.newExam")} />
      <ExamForm />
    </TeacherGate>
  );
}
