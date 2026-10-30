import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { catalogQuery } from "@/lib/catalog";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./Field";
import { ClassificationFields, type Classification } from "./ClassificationFields";
import { ErrorState, Loading } from "./States";

type Course = Database["public"]["Tables"]["courses"]["Row"];

export function CourseForm({ course }: { course?: Course }) {
  const { t, errMsg } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const [title, setTitle] = useState(course?.title ?? "");
  const [summary, setSummary] = useState(course?.summary ?? "");
  const [body, setBody] = useState(course?.body ?? "");
  const [cls, setCls] = useState<Classification>({
    level_id: course?.level_id ?? "",
    track_id: course?.track_id ?? "",
    subject_id: course?.subject_id ?? "",
    chapter_id: course?.chapter_id ?? "",
    topic_id: course?.topic_id ?? "",
  });
  const [busy, setBusy] = useState(false);

  if (cat.isLoading) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} />;

  async function save(status: "draft" | "published", e?: FormEvent) {
    e?.preventDefault();
    if (!me) return;
    setBusy(true);
    const row = {
      title: title.trim(),
      summary: summary.trim() || null,
      body,
      level_id: cls.level_id,
      track_id: cls.track_id || null,
      subject_id: cls.subject_id,
      chapter_id: cls.chapter_id || null,
      topic_id: cls.topic_id || null,
      status,
    };
    const res = course
      ? await supabase.from("courses").update(row).eq("id", course.id)
      : await supabase.from("courses").insert({ ...row, author_id: me.user.id });
    setBusy(false);
    if (res.error) { toast.error(errMsg(res.error)); return; }
    toast.success(t("common.saved"));
    qc.invalidateQueries();
    navigate({ to: "/teacher" });
  }

  return (
    <form onSubmit={(e) => save("published", e)} className="card-surface flex flex-col gap-5 p-6">
      <Field label={t("form.title")} htmlFor="c-title">
        <Input id="c-title" required minLength={3} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <ClassificationFields c={cat.data} value={cls} onChange={setCls} />
      <Field label={t("form.summary")} htmlFor="c-summary">
        <Textarea id="c-summary" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <Field label={t("form.body")} htmlFor="c-body">
        <Textarea id="c-body" rows={14} required value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" disabled={busy || !title || !cls.subject_id} onClick={() => save("draft")}>{course?.status === "published" ? t("form.unpublish") : t("form.saveDraft")}</Button>
        <Button type="submit" variant="hero" disabled={busy}>{t("form.publish")}</Button>
      </div>
    </form>
  );
}
