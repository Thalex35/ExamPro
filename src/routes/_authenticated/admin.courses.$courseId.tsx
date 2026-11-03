import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CourseForm } from "@/components/CourseForm";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { AdminGate } from "@/components/TeacherGate";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/courses/$courseId")({
  head: () => ({ meta: [{ title: "Modifier le cours — EXAMPRO" }] }),
  component: EditAdminCourse,
});

function EditAdminCourse() {
  const { courseId } = Route.useParams();
  const { t } = useI18n();
  const query = useQuery({
    queryKey: ["admin-course-edit", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return (
    <AdminGate>
      <PageHeader title={t("common.edit")} />
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : !query.data ? (
        <Empty>{t("404.title")}</Empty>
      ) : (
        <CourseForm course={query.data} returnTo="/admin/courses" />
      )}
    </AdminGate>
  );
}
