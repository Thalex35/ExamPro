import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { catalogForTeacher, catalogQuery, teacherContentPermissionsQuery } from "@/lib/catalog";
import { isSecureExternalUrl, validateCourseFile } from "@/lib/files";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./Field";
import { ClassificationFields, type Classification } from "./ClassificationFields";
import { ErrorState, Loading } from "./States";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type ResourceType = "text" | "external_link" | "document";

export function CourseForm({
  course,
  returnTo = "/teacher",
}: {
  course?: Course;
  returnTo?: "/teacher" | "/admin/courses";
}) {
  const { t, errMsg } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const permissions = useQuery({
    ...teacherContentPermissionsQuery(me?.user.id ?? ""),
    enabled: !!me?.user.id && !me.isAdmin,
  });
  const [title, setTitle] = useState(course?.title ?? "");
  const [summary, setSummary] = useState(course?.summary ?? "");
  const [body, setBody] = useState(course?.body ?? "");
  const [resourceType, setResourceType] = useState<ResourceType>(
    course?.resource_type === "external_link" || course?.resource_type === "document"
      ? course.resource_type
      : "text",
  );
  const [externalUrl, setExternalUrl] = useState(course?.external_url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [cls, setCls] = useState<Classification>({
    level_id: course?.level_id ?? "",
    track_id: course?.track_id ?? "",
    subject_id: course?.subject_id ?? "",
    chapter_id: course?.chapter_id ?? "",
    topic_id: course?.topic_id ?? "",
  });
  const [busy, setBusy] = useState(false);
  const isVerified = me?.profile?.teacher_verification_status === "approved" || me?.isAdmin;

  if (cat.isLoading || (!me?.isAdmin && (!me || permissions.isLoading))) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} />;
  if (!me?.isAdmin && permissions.error) return <ErrorState error={permissions.error} />;
  if (!me) return <Loading />;
  const formCatalog =
    me.isAdmin || !permissions.data ? cat.data : catalogForTeacher(cat.data, permissions.data);
  const canPublish = isVerified && (me.isAdmin || course?.review_status !== "rejected");

  async function save(status: "draft" | "published", e?: FormEvent) {
    e?.preventDefault();
    if (!me) return;
    if (course?.review_status === "rejected" && !me.isAdmin) status = "draft";
    if (resourceType === "external_link" && !isSecureExternalUrl(externalUrl.trim())) {
      toast.error(errMsg("URL_HTTPS_REQUIRED"));
      return;
    }
    if (resourceType === "document") {
      const fileError = file
        ? validateCourseFile(file)
        : course?.file_path
          ? null
          : "FILE_REQUIRED";
      if (fileError) {
        toast.error(errMsg(fileError));
        return;
      }
    }
    setBusy(true);
    const oldPath = course?.file_path ?? null;
    let filePath = resourceType === "document" ? oldPath : null;
    let fileName = resourceType === "document" ? (course?.file_name ?? null) : null;
    if (resourceType === "document" && file) {
      filePath = `${me.user.id}/courses/${crypto.randomUUID()}.pdf`;
      fileName = file.name;
      const upload = await supabase.storage
        .from("course-files")
        .upload(filePath, file, { contentType: "application/pdf" });
      if (upload.error) {
        setBusy(false);
        toast.error(errMsg(upload.error));
        return;
      }
    }
    const row = {
      title: title.trim(),
      summary: summary.trim() || null,
      body,
      level_id: cls.level_id,
      track_id: cls.track_id || null,
      subject_id: cls.subject_id,
      chapter_id: cls.chapter_id || null,
      topic_id: cls.topic_id || null,
      resource_type: resourceType,
      external_url: resourceType === "external_link" ? externalUrl.trim() : null,
      file_path: filePath,
      file_name: fileName,
      status,
      ...(me.isAdmin ? { review_status: "none" as const } : {}),
    };
    const res = course
      ? await supabase.from("courses").update(row).eq("id", course.id)
      : await supabase.from("courses").insert({ ...row, author_id: me.user.id });
    setBusy(false);
    if (res.error) {
      if (file && filePath) {
        const cleanup = await supabase.storage.from("course-files").remove([filePath]);
        if (cleanup.error) toast.error(errMsg(cleanup.error));
      }
      toast.error(errMsg(res.error));
      return;
    }
    if (oldPath && oldPath !== filePath) {
      const cleanup = await supabase.storage.from("course-files").remove([oldPath]);
      if (cleanup.error) toast.error(errMsg(cleanup.error));
    }
    toast.success(t("common.saved"));
    qc.invalidateQueries();
    navigate({ to: returnTo });
  }

  return (
    <form
      onSubmit={(e) => save(canPublish ? "published" : "draft", e)}
      className="card-surface flex flex-col gap-5 p-6"
    >
      {!isVerified && (
        <p className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm text-muted-foreground">
          {me?.profile?.teacher_verification_status === "rejected"
            ? t("teacher.verificationRejected")
            : t("teacher.verificationPending")}
        </p>
      )}
      {!me.isAdmin && course?.review_status === "rejected" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {t("content.rejectedReview")}
        </p>
      )}
      <Field label={t("form.title")} htmlFor="c-title">
        <Input
          id="c-title"
          required
          minLength={3}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <ClassificationFields c={formCatalog} value={cls} onChange={setCls} />
      <Field label={t("content.resourceType")} htmlFor="c-resource-type">
        <select
          id="c-resource-type"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={resourceType}
          onChange={(event) => setResourceType(event.target.value as ResourceType)}
        >
          <option value="text">{t("content.textLesson")}</option>
          <option value="external_link">{t("content.externalLink")}</option>
          <option value="document">{t("content.document")}</option>
        </select>
      </Field>
      <Field label={t("form.summary")} htmlFor="c-summary">
        <Textarea
          id="c-summary"
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </Field>
      {resourceType === "text" && (
        <Field label={t("form.body")} htmlFor="c-body">
          <Textarea
            id="c-body"
            rows={14}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
      )}
      {resourceType === "external_link" && (
        <Field label={t("content.externalUrl")} htmlFor="c-external-url">
          <Input
            id="c-external-url"
            type="url"
            required
            pattern="https://.*"
            placeholder="https://..."
            value={externalUrl}
            onChange={(event) => setExternalUrl(event.target.value)}
          />
        </Field>
      )}
      {resourceType === "document" && (
        <Field label={t("form.file")} htmlFor="c-file" hint={t("form.fileHint")}>
          <Input
            id="c-file"
            type="file"
            accept="application/pdf,.pdf"
            required={!course?.file_path}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {course?.file_name && (
            <p className="mt-1 text-xs text-muted-foreground">{course.file_name}</p>
          )}
        </Field>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy || !title || !cls.subject_id}
          onClick={() => save("draft")}
        >
          {course?.status === "published" ? t("form.unpublish") : t("form.saveDraft")}
        </Button>
        {canPublish && (
          <Button type="submit" variant="hero" disabled={busy}>
            {t("form.publish")}
          </Button>
        )}
      </div>
    </form>
  );
}
