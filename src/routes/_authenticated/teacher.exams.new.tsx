import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { validateExamFile } from "@/lib/files";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { ClassificationFields, type Classification } from "@/components/ClassificationFields";
import { ErrorState, Loading, PageHeader } from "@/components/States";
import { TeacherGate } from "@/components/TeacherGate";

export const Route = createFileRoute("/_authenticated/teacher/exams/new")({
  head: () => ({ meta: [{ title: "Téléverser un examen — EXAMPRO" }] }),
  component: NewExam,
});

function NewExam() {
  const { t, errMsg } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear() - 1));
  const [session, setSession] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [publish, setPublish] = useState(true);
  const [cls, setCls] = useState<Classification>({ level_id: "", track_id: "", subject_id: "", chapter_id: "", topic_id: "" });
  const [busy, setBusy] = useState(false);

  if (cat.isLoading) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!me) return;
    const fileErr = validateExamFile(file);
    if (fileErr) { toast.error(errMsg(fileErr)); return; }
    setBusy(true);
    const path = `${me.user.id}/${crypto.randomUUID()}.pdf`;
    const up = await supabase.storage.from("exams").upload(path, file!, { contentType: "application/pdf" });
    if (up.error) {
      setBusy(false);
      { toast.error(errMsg(up.error)); return; }
    }
    const { error } = await supabase.from("exams").insert({
      author_id: me.user.id,
      title: title.trim(),
      description: description.trim() || null,
      exam_year: Number(year),
      session: session.trim() || null,
      level_id: cls.level_id,
      track_id: cls.track_id || null,
      subject_id: cls.subject_id,
      file_path: path,
      file_name: file!.name,
      status: publish ? "published" : "draft",
    });
    if (error) {
      await supabase.storage.from("exams").remove([path]);
      setBusy(false);
      { toast.error(errMsg(error)); return; }
    }
    setBusy(false);
    toast.success(t("common.saved"));
    qc.invalidateQueries();
    navigate({ to: "/teacher" });
  }

  return (
    <TeacherGate>
      <PageHeader title={t("teacher.newExam")} />
      <form onSubmit={submit} className="card-surface flex flex-col gap-5 p-6">
        <Field label={t("form.title")} htmlFor="e-title">
          <Input id="e-title" required minLength={3} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <ClassificationFields c={cat.data} value={cls} onChange={setCls} withChapters={false} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("form.year")} htmlFor="e-year">
            <Input id="e-year" type="number" min={1950} max={2100} required value={year} onChange={(e) => setYear(e.target.value)} />
          </Field>
          <Field label={t("form.session")} htmlFor="e-session">
            <Input id="e-session" value={session} onChange={(e) => setSession(e.target.value)} />
          </Field>
        </div>
        <Field label={t("form.description")} htmlFor="e-desc">
          <Textarea id="e-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label={t("form.file")} htmlFor="e-file" hint={t("form.fileHint")}>
          <Input id="e-file" type="file" accept="application/pdf,.pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> {t("form.publishNow")}
        </label>
        <div className="flex justify-end">
          <Button type="submit" variant="hero" disabled={busy}>{t("common.save")}</Button>
        </div>
      </form>
    </TeacherGate>
  );
}
