import { createFileRoute } from "@tanstack/react-router";
import { ContentManagementPage } from "@/components/ContentManagementPage";
import { AdminGate } from "@/components/TeacherGate";

export const Route = createFileRoute("/_authenticated/admin/courses/")({
  head: () => ({ meta: [{ title: "Gestion des cours — EXAMPRO" }] }),
  component: AdminCourses,
});

function AdminCourses() {
  return (
    <AdminGate>
      <ContentManagementPage role="admin" kind="course" />
    </AdminGate>
  );
}
