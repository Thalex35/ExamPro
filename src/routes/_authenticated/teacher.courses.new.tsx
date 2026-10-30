import { createFileRoute } from "@tanstack/react-router";
import { CourseForm } from "@/components/CourseForm";
import { PageHeader } from "@/components/States";
import { TeacherGate } from "@/components/TeacherGate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/teacher/courses/new")({
  head: () => ({ meta: [{ title: "Nouveau cours — EXAMPRO" }] }),
  component: NewCourse,
});

function NewCourse() {
  const { t } = useI18n();
  return (
    <TeacherGate>
      <PageHeader title={t("teacher.newCourse")} />
      <CourseForm />
    </TeacherGate>
  );
}
