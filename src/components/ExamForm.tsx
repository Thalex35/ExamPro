import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { catalogForTeacher, catalogQuery, teacherContentPermissionsQuery } from "@/lib/catalog";
import { EXAM_YEAR_ENDS, formatExamYear } from "@/lib/exam-years";
import { validateExamFile } from "@/lib/files";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/Field";
import { ClassificationFields, type Classification } from "@/components/ClassificationFields";
import { ErrorState, Loading } from "@/components/States";

type Exam = Database["public"]["Tables"]["exams"]["Row"];
type ReturnPath = "/teacher" | "/admin/exams";

export function ExamForm({ exam, returnTo = "/teacher" }: { exam?: Exam; returnTo?: ReturnPath }) {
  const { t, errMsg } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const permissions = useQuery({
    ...teacherContentPermissionsQuery(me?.user.id ?? ""),
    enabled: !!me?.user.id && !me.isAdmin,
  });
  const [title, setTitle] = useState(exam?.title ?? "");
  const [description, setDescription] = useState(exam?.description ?? "");
  const [year, setYear] = useState(() => {
    const defaultYear = Math.min(Math.max(new Date().getFullYear() - 1, 1991), 2025);
    return String(exam?.exam_year ?? defaultYear);
  });
  const [session, setSession] = useState(exam?.session ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [publish, setPublish] = useState(
    exam?.review_status !== "rejected" && (exam?.status === "published" || !exam),
  );
  const [cls, setCls] = useState<Classification>({
    level_id: exam?.level_id ?? "",
    track_id: exam?.track_id ?? "",
    subject_id: exam?.subject_id ?? "",
    chapter_id: "",
    topic_id: "",
  });
  const [busy, setBusy] = useState(false);

  if (cat.isLoading || (!me?.isAdmin && (!me || permissions.isLoading))) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} />;
  if (!me?.isAdmin && permissions.error) return <ErrorState error={permissions.error} />;
  if (!me) return <Loading />;
  const formCatalog =
    me.isAdmin || !permissions.data ? cat.data : catalogForTeacher(cat.data, permissions.data);
  const yearOptions =
    exam && !EXAM_YEAR_ENDS.includes(exam.exam_year)
      ? [...EXAM_YEAR_ENDS, exam.exam_year].sort((a, b) => a - b)
      : EXAM_YEAR_ENDS;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!me) return;
    const fileErr = file ? validateExamFile(file) : exam ? null : "FILE_REQUIRED";
    if (fileErr) {
      toast.error(errMsg(fileErr));
      return;
    }

    setBusy(true);
    const oldPath = exam?.file_path;
    let path = oldPath;
    if (file) {
      path = `${me.user.id}/${crypto.randomUUID()}.pdf`;
      const upload = await supabase.storage
        .from("exams")
        .upload(path, file, { contentType: "application/pdf" });
      if (upload.error) {
        setBusy(false);
        toast.error(errMsg(upload.error));
        return;
      }
    }

    const values = {
      title: title.trim(),
      description: description.trim() || null,
      exam_year: Number(year),
      session: session.trim() || null,
      level_id: cls.level_id,
      track_id: cls.track_id || null,
      subject_id: cls.subject_id,
      file_path: path!,
      file_name: file?.name ?? exam?.file_name ?? null,
      status:
        publish && (me.isAdmin || exam?.review_status !== "rejected")
          ? ("published" as const)
          : ("draft" as const),
      ...(me.isAdmin ? { review_status: "none" as const } : {}),
    };
    const result = exam
      ? await supabase.from("exams").update(values).eq("id", exam.id)
      : await supabase.from("exams").insert({ ...values, author_id: me.user.id });
    if (result.error) {
      if (file && path) {
        const cleanup = await supabase.storage.from("exams").remove([path]);
        if (cleanup.error) toast.error(errMsg(cleanup.error));
      }
      setBusy(false);
      toast.error(errMsg(result.error));
      return;
    }

    if (file && oldPath) {
      const cleanup = await supabase.storage.from("exams").remove([oldPath]);
      if (cleanup.error) toast.error(errMsg(cleanup.error));
    }
    setBusy(false);
    toast.success(t("common.saved"));
    await qc.invalidateQueries();
    navigate({ to: returnTo });
  }

  return (
    <form onSubmit={submit} className="card-surface flex flex-col gap-5 p-6">
      <Field label={t("form.title")} htmlFor="e-title">
        <Input
          id="e-title"
          required
          minLength={3}
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <ClassificationFields c={formCatalog} value={cls} onChange={setCls} withChapters={false} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("form.year")} htmlFor="e-year">
          <NativeSelect
            id="e-year"
            className="h-10"
            required
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            {yearOptions.map((examYear) => (
              <option key={examYear} value={examYear}>
                {formatExamYear(examYear)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("form.session")} htmlFor="e-session">
          <Input
            id="e-session"
            value={session}
            onChange={(event) => setSession(event.target.value)}
          />
        </Field>
      </div>
      <Field label={t("form.description")} htmlFor="e-desc">
        <Textarea
          id="e-desc"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field label={t("form.file")} htmlFor="e-file" hint={t("form.fileHint")}>
        <Input
          id="e-file"
          type="file"
          accept="application/pdf,.pdf"
          required={!exam}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </Field>
      {exam && <p className="text-sm text-muted-foreground">{exam.file_name ?? t("form.file")}</p>}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={publish}
          onChange={(event) => setPublish(event.target.checked)}
        />{" "}
        {t("form.publishNow")}
      </label>
      <div className="flex justify-end">
        <Button type="submit" variant="hero" disabled={busy}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
