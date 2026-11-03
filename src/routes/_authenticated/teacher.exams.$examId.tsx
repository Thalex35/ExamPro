import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExamForm } from "@/components/ExamForm";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { TeacherGate } from "@/components/TeacherGate";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/teacher/exams/$examId")({
  head: () => ({ meta: [{ title: "Modifier l’examen — EXAMPRO" }] }),
  component: EditTeacherExam,
});

function EditTeacherExam() {
  const { examId } = Route.useParams();
  const { t } = useI18n();
  const query = useQuery({
    queryKey: ["exam-edit", examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return (
    <TeacherGate requireVerified>
      <PageHeader title={t("common.edit")} />
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : !query.data ? (
        <Empty>{t("404.title")}</Empty>
      ) : (
        <ExamForm exam={query.data} />
      )}
    </TeacherGate>
  );
}
