import { createFileRoute } from "@tanstack/react-router";
import { CourseForm } from "@/components/CourseForm";
import { AdminGate } from "@/components/TeacherGate";
import { PageHeader } from "@/components/States";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/courses/new")({
  head: () => ({ meta: [{ title: "Ajouter un cours — EXAMPRO" }] }),
  component: NewAdminCourse,
});

function NewAdminCourse() {
  const { t } = useI18n();
  return (
    <AdminGate>
      <PageHeader title={t("admin.newCourse")} />
      <CourseForm returnTo="/admin/courses" />
    </AdminGate>
  );
}
