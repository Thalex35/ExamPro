import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FilePlus, PenSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { openExamFile } from "@/lib/files";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/Field";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { TeacherGate } from "@/components/TeacherGate";

export const Route = createFileRoute("/_authenticated/teacher/")({
  head: () => ({ meta: [{ title: "Espace enseignant — EXAMPRO" }] }),
  component: TeacherHome,
});

function TeacherHome() {
  const { t, name, errMsg } = useI18n();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [resubmitting, setResubmitting] = useState(false);
  const isVerified = me?.profile?.teacher_verification_status === "approved";
  const verificationStatus = me?.profile?.teacher_verification_status;
  const cat = useQuery(catalogQuery);
  const uid = me?.user.id;
  const courses = useQuery({
    queryKey: ["my-courses", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id,title,status,subject_id,level_id,updated_at").eq("author_id", uid!).order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const exams = useQuery({
    queryKey: ["my-exams", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("id,title,status,subject_id,level_id,exam_year,file_path").eq("author_id", uid!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function setExamStatus(id: string, status: "draft" | "published") {
    const { error } = await supabase.from("exams").update({ status }).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    qc.invalidateQueries();
  }
  async function deleteExam(id: string, path: string) {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    await supabase.storage.from("exams").remove([path]);
    qc.invalidateQueries();
  }
  async function deleteCourse(id: string) {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    qc.invalidateQueries();
  }
  async function resubmitVerification() {
    if (resubmitting) return;
    setResubmitting(true);
    try {
      const { error } = await supabase.rpc("resubmit_teacher_verification");
      if (error) throw error;
      toast.success(t("common.saved"));
      await qc.invalidateQueries({ queryKey: ["me"] });
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setResubmitting(false);
    }
  }

  const c = cat.data;
  const label = (subjectId: string, levelId: string) => {
    if (!c) return "";
    const s = c.subjects.find((x) => x.id === subjectId);
    const l = c.levels.find((x) => x.id === levelId);
    return [s && name(s), l && name(l)].filter(Boolean).join(" · ");
  };

  return (
    <TeacherGate>
      <PageHeader
        title={t("teacher.title")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="hero"><Link to="/teacher/courses/new"><PenSquare /> {t("teacher.newCourse")}</Link></Button>
            {isVerified && (
              <Button asChild variant="outline"><Link to="/teacher/exams/new"><FilePlus /> {t("teacher.newExam")}</Link></Button>
            )}
          </div>
        }
      />
      {!isVerified && verificationStatus !== "rejected" && (
        <p className="mb-6 rounded-lg border border-brand/30 bg-brand/5 p-4 text-sm text-muted-foreground" role="status">
          {t("teacher.verificationPending")}
        </p>
      )}
      {verificationStatus === "rejected" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm" role="status">
          <span>{me?.profile?.teacher_verification_note || t("teacher.verificationRejected")}</span>
          <Button size="sm" disabled={resubmitting} onClick={() => void resubmitVerification()}>
            {t("teacher.resubmitVerification")}
          </Button>
        </div>
      )}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold">{t("teacher.myCourses")}</h2>
          {courses.isLoading ? <Loading /> : courses.error ? <ErrorState error={courses.error} /> : !courses.data?.length ? <Empty>{t("teacher.empty")}</Empty> : (
            <ul className="card-surface divide-y">
              {courses.data.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-heading">{x.title}</p>
                    <p className="text-xs text-muted-foreground">{label(x.subject_id, x.level_id)}</p>
                  </div>
                  <StatusBadge status={x.status} label={t(`status.${x.status}`)} />
                  <Button asChild size="sm" variant="ghost"><Link to="/teacher/courses/$courseId" params={{ courseId: x.id }}>{t("common.edit")}</Link></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(t("common.delete") + " ?") && deleteCourse(x.id)}>{t("common.delete")}</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold">{t("teacher.myExams")}</h2>
          {exams.isLoading ? <Loading /> : exams.error ? <ErrorState error={exams.error} /> : !exams.data?.length ? <Empty>{t("teacher.empty")}</Empty> : (
            <ul className="card-surface divide-y">
              {exams.data.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-heading">{x.title}</p>
                    <p className="text-xs text-muted-foreground">{label(x.subject_id, x.level_id)} · {x.exam_year}</p>
                  </div>
                  <StatusBadge status={x.status} label={t(`status.${x.status}`)} />
                  <Button size="sm" variant="ghost" onClick={() => openExamFile(x.file_path).catch((e) => toast.error(errMsg(e)))}>{t("common.open")}</Button>
                  {isVerified && (
                    <Button size="sm" variant="ghost" onClick={() => setExamStatus(x.id, x.status === "published" ? "draft" : "published")}>
                      {x.status === "published" ? t("form.unpublish") : t("form.publish")}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(t("common.delete") + " ?") && deleteExam(x.id, x.file_path)}>{t("common.delete")}</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </TeacherGate>
  );
}
