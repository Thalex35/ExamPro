import { createFileRoute } from "@tanstack/react-router";
import { ContentManagementPage } from "@/components/ContentManagementPage";
import { TeacherGate } from "@/components/TeacherGate";

export const Route = createFileRoute("/_authenticated/teacher/courses/")({
  head: () => ({ meta: [{ title: "Cours — EXAMPRO" }] }),
  component: TeacherCourses,
});

function TeacherCourses() {
  return (
    <TeacherGate>
      <ContentManagementPage role="teacher" kind="course" />
    </TeacherGate>
  );
}
