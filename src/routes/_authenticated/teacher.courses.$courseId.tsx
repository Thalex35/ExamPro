import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CourseForm } from "@/components/CourseForm";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { TeacherGate } from "@/components/TeacherGate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/teacher/courses/$courseId")({
  head: () => ({ meta: [{ title: "Modifier le cours — EXAMPRO" }] }),
  component: EditCourse,
});

function EditCourse() {
  const { courseId } = Route.useParams();
  const { t } = useI18n();
  const q = useQuery({
    queryKey: ["course-edit", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return (
    <TeacherGate>
      <PageHeader title={t("common.edit")} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} /> : !q.data ? <Empty>{t("404.title")}</Empty> : <CourseForm course={q.data} />}
    </TeacherGate>
  );
}
