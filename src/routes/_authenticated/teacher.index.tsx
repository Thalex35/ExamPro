import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";
import { TeacherGate } from "@/components/TeacherGate";

export const Route = createFileRoute("/_authenticated/teacher/")({
  head: () => ({ meta: [{ title: "Espace enseignant — EXAMPRO" }] }),
  component: TeacherHome,
});

function TeacherHome() {
  const { t, lang, errMsg } = useI18n();
  const { data: me } = useMe();
  const [resubmitting, setResubmitting] = useState(false);
  const uid = me?.user.id;
  const courses = useQuery({
    queryKey: ["my-courses", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,status,updated_at,resource_type")
        .eq("author_id", uid!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const exams = useQuery({
    queryKey: ["my-exams", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("id,title,status,created_at,exam_year")
        .eq("author_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const verificationStatus = me?.profile?.teacher_verification_status;

  async function resubmitVerification() {
    if (resubmitting) return;
    setResubmitting(true);
    try {
      const { error } = await supabase.rpc("resubmit_teacher_verification");
      if (error) throw error;
      toast.success(t("common.saved"));
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setResubmitting(false);
    }
  }

  return (
    <TeacherGate>
      <PageHeader title={t("teacher.title")} />
      {verificationStatus === "pending" && (
        <p
          className="mb-6 rounded-lg border border-brand/30 bg-brand/5 p-4 text-sm text-muted-foreground"
          role="status"
        >
          {t("teacher.verificationPending")}
        </p>
      )}
      {verificationStatus === "rejected" && (
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
          role="status"
        >
          <span>{me?.profile?.teacher_verification_note || t("teacher.verificationRejected")}</span>
          <Button size="sm" disabled={resubmitting} onClick={() => void resubmitVerification()}>
            {t("teacher.resubmitVerification")}
          </Button>
        </div>
      )}
      <section className="card-surface mb-6 p-5">
        <h2 className="font-semibold text-heading">
          {me?.profile?.full_name || me?.user.email || t("teacher.title")}
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {me?.profile?.school && (
            <span>
              {t("admin.school")}: {me.profile.school}
            </span>
          )}
          {me?.profile?.geographical_department && (
            <span>
              {t("admin.department")}: {me.profile.geographical_department}
            </span>
          )}
        </div>
      </section>
      {courses.isLoading || exams.isLoading ? (
        <Loading />
      ) : courses.error ? (
        <ErrorState error={courses.error} onRetry={() => void courses.refetch()} />
      ) : exams.error ? (
        <ErrorState error={exams.error} onRetry={() => void exams.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              to="/teacher/exams"
              className="card-surface flex items-center gap-4 p-5 transition-shadow hover:shadow-brand"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-deep">
                <FileText className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm text-muted-foreground">{t("teacher.myExams")}</span>
                <strong className="text-2xl text-heading">{exams.data?.length ?? 0}</strong>
              </span>
            </Link>
            <Link
              to="/teacher/courses"
              className="card-surface flex items-center gap-4 p-5 transition-shadow hover:shadow-brand"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-deep">
                <BookOpen className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm text-muted-foreground">
                  {t("teacher.myCourses")}
                </span>
                <strong className="text-2xl text-heading">{courses.data?.length ?? 0}</strong>
              </span>
            </Link>
          </div>
          <section className="mt-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-heading">{t("admin.recentContent")}</h2>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/teacher/exams">{t("teacher.myExams")}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/teacher/courses">{t("teacher.myCourses")}</Link>
                </Button>
              </div>
            </div>
            {!(courses.data?.length || exams.data?.length) ? (
              <Empty>{t("teacher.empty")}</Empty>
            ) : (
              <ul className="card-surface divide-y">
                {[
                  ...(courses.data ?? []).map((item) => ({
                    id: `course-${item.id}`,
                    title: item.title,
                    status: item.status,
                    date: item.updated_at,
                    kind: "course" as const,
                  })),
                  ...(exams.data ?? []).map((item) => ({
                    id: `exam-${item.id}`,
                    title: item.title,
                    status: item.status,
                    date: item.created_at,
                    kind: "exam" as const,
                  })),
                ]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 6)
                  .map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                      {item.kind === "course" ? (
                        <BookOpen className="h-4 w-4 text-deep" />
                      ) : (
                        <FileText className="h-4 w-4 text-deep" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium text-heading">
                        {item.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.date).toLocaleDateString(lang === "ht" ? "fr-HT" : "fr-FR")}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                        {t(`status.${item.status}`)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </>
      )}
    </TeacherGate>
  );
}
