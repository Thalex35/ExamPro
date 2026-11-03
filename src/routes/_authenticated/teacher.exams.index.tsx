import { createFileRoute } from "@tanstack/react-router";
import { ContentManagementPage } from "@/components/ContentManagementPage";
import { TeacherGate } from "@/components/TeacherGate";

export const Route = createFileRoute("/_authenticated/teacher/exams/")({
  head: () => ({ meta: [{ title: "Examens — EXAMPRO" }] }),
  component: TeacherExams,
});

function TeacherExams() {
  return (
    <TeacherGate>
      <ContentManagementPage role="teacher" kind="exam" />
    </TeacherGate>
  );
}
