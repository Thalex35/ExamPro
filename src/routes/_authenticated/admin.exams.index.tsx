import { createFileRoute } from "@tanstack/react-router";
import { ContentManagementPage } from "@/components/ContentManagementPage";
import { AdminGate } from "@/components/TeacherGate";

export const Route = createFileRoute("/_authenticated/admin/exams/")({
  head: () => ({ meta: [{ title: "Gestion des examens — EXAMPRO" }] }),
  component: AdminExams,
});

function AdminExams() {
  return (
    <AdminGate>
      <ContentManagementPage role="admin" kind="exam" />
    </AdminGate>
  );
}
