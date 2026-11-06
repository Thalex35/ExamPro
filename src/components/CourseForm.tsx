import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { catalogForTeacher, catalogQuery, teacherContentPermissionsQuery } from "@/lib/catalog";
import { isSecureExternalUrl, validateCourseFile } from "@/lib/files";
import { hasValidCourseDescriptionLength } from "@/lib/course-pedagogy";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./Field";
import { ClassificationFields, type Classification } from "./ClassificationFields";
import { ErrorState, Loading } from "./States";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type ResourceType = "text" | "external_link" | "document" | "video";
type SupplementType = "external_link" | "video" | "document";
type CourseResource = Database["public"]["Tables"]["course_resources"]["Row"];
type ResourceDraft = {
  author_id?: string;
  id?: string;
  title: string;
  resource_type: SupplementType;
  external_url: string;
  file_path: string | null;
  file_name: string | null;
  file: File | null;
};

function getSupplementType(value: string): SupplementType {
  if (value === "video" || value === "document") return value;
  return "external_link";
}

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
  const resourcesQuery = useQuery({
    queryKey: ["course-resources", course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      if (!course?.id) return [];
      const { data, error } = await supabase
        .from("course_resources")
        .select("*")
        .eq("course_id", course.id)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const permissions = useQuery({
    ...teacherContentPermissionsQuery(me?.user.id ?? ""),
    enabled: !!me?.user.id && !me.isAdmin,
  });
  const [title, setTitle] = useState(course?.title ?? "");
  const [summary, setSummary] = useState(course?.summary ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [objectives, setObjectives] = useState(course?.learning_objectives.join("\n") ?? "");
  const [skills, setSkills] = useState(course?.skills.join("\n") ?? "");
  const [prerequisites, setPrerequisites] = useState(course?.prerequisites.join("\n") ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    course?.duration_minutes?.toString() ?? "",
  );
  const [difficulty, setDifficulty] = useState(course?.difficulty ?? "");
  const [preview, setPreview] = useState(course?.preview ?? "");
  const [body, setBody] = useState(course?.body ?? "");
  const [resourceType, setResourceType] = useState<ResourceType>(
    course?.resource_type === "external_link" ||
      course?.resource_type === "document" ||
      course?.resource_type === "video"
      ? course.resource_type
      : "text",
  );
  const [externalUrl, setExternalUrl] = useState(course?.external_url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [resources, setResources] = useState<ResourceDraft[]>([]);
  const [cls, setCls] = useState<Classification>({
    level_id: course?.level_id ?? "",
    track_id: course?.track_id ?? "",
    subject_id: course?.subject_id ?? "",
    chapter_id: course?.chapter_id ?? "",
    topic_id: course?.topic_id ?? "",
  });
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (resourcesQuery.data) {
      setResources(
        resourcesQuery.data.map((resource: CourseResource) => ({
          author_id: resource.author_id,
          id: resource.id,
          title: resource.title,
          resource_type: getSupplementType(resource.resource_type),
          external_url: resource.external_url ?? "",
          file_path: resource.file_path,
          file_name: resource.file_name,
          file: null,
        })),
      );
    }
  }, [resourcesQuery.data]);
  const isVerified = me?.profile?.teacher_verification_status === "approved" || me?.isAdmin;

  if (cat.isLoading || resourcesQuery.isLoading || (!me?.isAdmin && (!me || permissions.isLoading)))
    return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} />;
  if (resourcesQuery.error) return <ErrorState error={resourcesQuery.error} />;
  if (!me?.isAdmin && permissions.error) return <ErrorState error={permissions.error} />;
  if (!me) return <Loading />;
  const formCatalog =
    me.isAdmin || !permissions.data ? cat.data : catalogForTeacher(cat.data, permissions.data);
  const canPublish = isVerified && (me.isAdmin || course?.review_status !== "rejected");

  async function save(status: "draft" | "published", e?: FormEvent) {
    e?.preventDefault();
    if (!me) return;
    if (course?.review_status === "rejected" && !me.isAdmin) status = "draft";
    const learningObjectives = objectives
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const learningSkills = skills
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const learningPrerequisites = prerequisites
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const duration = Number(durationMinutes);
    if (!hasValidCourseDescriptionLength(description)) {
      toast.error(t("content.descriptionWordCount"));
      return;
    }
    if (
      !learningObjectives.length ||
      !learningSkills.length ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 1440 ||
      !["beginner", "intermediate", "advanced"].includes(difficulty) ||
      !preview.trim()
    ) {
      toast.error(t("content.pedagogyRequired"));
      return;
    }
    if (resourceType === "external_link" && !isSecureExternalUrl(externalUrl.trim())) {
      toast.error(errMsg("URL_HTTPS_REQUIRED"));
      return;
    }
    if (resourceType === "video" && !isSecureExternalUrl(externalUrl.trim())) {
      toast.error(errMsg("URL_HTTPS_REQUIRED"));
      return;
    }
    if (resourceType === "text" && !body.trim()) {
      toast.error(t("content.bodyRequired"));
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
    for (const resource of resources) {
      if (!resource.title.trim() || resource.title.trim().length > 160) {
        toast.error(t("content.resourceTitleRequired"));
        return;
      }
      if (resource.resource_type === "external_link" || resource.resource_type === "video") {
        if (!isSecureExternalUrl(resource.external_url.trim())) {
          toast.error(errMsg("URL_HTTPS_REQUIRED"));
          return;
        }
      } else {
        const fileError = resource.file
          ? validateCourseFile(resource.file)
          : resource.file_path
            ? null
            : "FILE_REQUIRED";
        if (fileError) {
          toast.error(errMsg(fileError));
          return;
        }
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
      description: description.trim(),
      learning_objectives: learningObjectives,
      skills: learningSkills,
      prerequisites: learningPrerequisites,
      duration_minutes: duration,
      difficulty,
      preview: preview.trim(),
      body,
      level_id: cls.level_id,
      track_id: cls.track_id || null,
      subject_id: cls.subject_id,
      chapter_id: cls.chapter_id || null,
      topic_id: cls.topic_id || null,
      resource_type: resourceType,
      external_url:
        resourceType === "external_link" || resourceType === "video" ? externalUrl.trim() : null,
      file_path: filePath,
      file_name: fileName,
      status,
      ...(me.isAdmin ? { review_status: "none" as const } : {}),
    };
    let savedCourseId = course?.id;
    if (course) {
      const res = await supabase.from("courses").update(row).eq("id", course.id);
      if (res.error) {
        setBusy(false);
        if (file && filePath && filePath !== oldPath) {
          const cleanup = await supabase.storage.from("course-files").remove([filePath]);
          if (cleanup.error) toast.error(errMsg(cleanup.error));
        }
        toast.error(errMsg(res.error));
        return;
      }
    } else {
      const res = await supabase
        .from("courses")
        .insert({ ...row, author_id: me.user.id })
        .select("id")
        .single();
      if (res.error) {
        setBusy(false);
        if (file && filePath) {
          const cleanup = await supabase.storage.from("course-files").remove([filePath]);
          if (cleanup.error) toast.error(errMsg(cleanup.error));
        }
        toast.error(errMsg(res.error));
        return;
      }
      savedCourseId = res.data.id;
    }
    if (!savedCourseId) {
      setBusy(false);
      toast.error(t("common.error"));
      return;
    }

    const newResourcePaths: string[] = [];
    const resourceRows = [];
    for (const [index, resource] of resources.entries()) {
      let resourcePath = resource.file_path;
      let resourceFileName = resource.file_name;
      if (resource.resource_type === "document" && resource.file) {
        const resourceOwnerId = resource.author_id ?? course?.author_id ?? me.user.id;
        resourcePath = `${resourceOwnerId}/courses/${crypto.randomUUID()}.pdf`;
        resourceFileName = resource.file.name;
        const upload = await supabase.storage
          .from("course-files")
          .upload(resourcePath, resource.file, {
            contentType: "application/pdf",
          });
        if (upload.error) {
          const cleanup = newResourcePaths.length
            ? await supabase.storage.from("course-files").remove(newResourcePaths)
            : null;
          if (cleanup?.error) toast.error(errMsg(cleanup.error));
          setBusy(false);
          toast.error(errMsg(upload.error));
          return;
        }
        newResourcePaths.push(resourcePath);
      }
      resourceRows.push({
        ...(resource.id ? { id: resource.id } : {}),
        course_id: savedCourseId,
        author_id: resource.author_id ?? course?.author_id ?? me.user.id,
        title: resource.title.trim(),
        resource_type: resource.resource_type,
        external_url:
          resource.resource_type === "external_link" || resource.resource_type === "video"
            ? resource.external_url.trim()
            : null,
        file_path: resource.resource_type === "document" ? resourcePath : null,
        file_name: resource.resource_type === "document" ? resourceFileName : null,
        sort_order: index,
      });
    }
    const savedResources = resourceRows.length
      ? await supabase.from("course_resources").upsert(resourceRows, { onConflict: "id" })
      : { error: null };
    if (savedResources.error) {
      const cleanup = newResourcePaths.length
        ? await supabase.storage.from("course-files").remove(newResourcePaths)
        : null;
      if (cleanup?.error) toast.error(errMsg(cleanup.error));
      setBusy(false);
      toast.error(errMsg(savedResources.error));
      return;
    }
    const previousResources = resourcesQuery.data ?? [];
    for (const resource of previousResources) {
      const updated = resourceRows.find((entry) => entry.id === resource.id);
      if (resource.file_path && updated?.file_path !== resource.file_path) {
        const cleanup = await supabase.storage.from("course-files").remove([resource.file_path]);
        if (cleanup.error) toast.error(errMsg(cleanup.error));
      }
    }
    const retainedIds = new Set(
      resources.flatMap((resource) => (resource.id ? [resource.id] : [])),
    );
    const removedResources = previousResources.filter((resource) => !retainedIds.has(resource.id));
    for (const resource of removedResources) {
      const removed = await supabase.from("course_resources").delete().eq("id", resource.id);
      if (removed.error) {
        setBusy(false);
        toast.error(errMsg(removed.error));
        return;
      }
      if (resource.file_path) {
        const cleanup = await supabase.storage.from("course-files").remove([resource.file_path]);
        if (cleanup.error) toast.error(errMsg(cleanup.error));
      }
    }
    setBusy(false);
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
          <option value="video">{t("content.video")}</option>
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
      <Field
        label={t("content.longDescription")}
        htmlFor="c-description"
        hint={t("content.descriptionWordCount")}
      >
        <Textarea
          id="c-description"
          rows={5}
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field label={t("content.learningObjectives")} htmlFor="c-objectives">
        <Textarea
          id="c-objectives"
          rows={4}
          required
          value={objectives}
          onChange={(event) => setObjectives(event.target.value)}
          placeholder={t("content.listOnePerLine")}
        />
      </Field>
      <Field label={t("content.skills")} htmlFor="c-skills">
        <Textarea
          id="c-skills"
          rows={3}
          required
          value={skills}
          onChange={(event) => setSkills(event.target.value)}
          placeholder={t("content.listOnePerLine")}
        />
      </Field>
      <Field
        label={t("content.prerequisites")}
        htmlFor="c-prerequisites"
        hint={t("content.prerequisitesHint")}
      >
        <Textarea
          id="c-prerequisites"
          rows={3}
          value={prerequisites}
          onChange={(event) => setPrerequisites(event.target.value)}
          placeholder={t("content.listOnePerLine")}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("content.durationMinutes")} htmlFor="c-duration">
          <Input
            id="c-duration"
            type="number"
            required
            min={1}
            max={1440}
            step={1}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
          />
        </Field>
        <Field label={t("content.difficulty")} htmlFor="c-difficulty">
          <select
            id="c-difficulty"
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="">{t("common.select")}</option>
            <option value="beginner">{t("content.difficulty.beginner")}</option>
            <option value="intermediate">{t("content.difficulty.intermediate")}</option>
            <option value="advanced">{t("content.difficulty.advanced")}</option>
          </select>
        </Field>
      </div>
      <Field label={t("content.preview")} htmlFor="c-preview">
        <Textarea
          id="c-preview"
          rows={4}
          required
          maxLength={1000}
          value={preview}
          onChange={(event) => setPreview(event.target.value)}
        />
      </Field>
      {resourceType === "text" && (
        <Field label={t("form.body")} htmlFor="c-body">
          <div
            className="flex flex-wrap gap-2"
            role="toolbar"
            aria-label={t("content.editorTools")}
          >
            {[
              ["H2", "## ", ""],
              ["B", "**", "**"],
              ["I", "*", "*"],
              ["•", "- ", ""],
              ["1.", "1. ", ""],
              ["Lien", "[", "](https://)"],
              ["ƒx", "$$", "$$"],
            ].map(([label, before, after]) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                size="sm"
                aria-label={`${t("content.insert")} ${label}`}
                onClick={() => {
                  const input = bodyRef.current;
                  if (!input) return;
                  const start = input.selectionStart;
                  const end = input.selectionEnd;
                  const selected = body.slice(start, end);
                  const next = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
                  setBody(next);
                  requestAnimationFrame(() => {
                    input.focus();
                    const cursor = start + before.length + selected.length;
                    input.setSelectionRange(cursor, cursor);
                  });
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <Textarea
            id="c-body"
            ref={bodyRef}
            rows={14}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("content.markdownHint")}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("content.markdownHelp")}
          </p>
        </Field>
      )}
      {(resourceType === "external_link" || resourceType === "video") && (
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
      <section className="space-y-4 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-heading">{t("content.supplementaryResources")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("content.supplementaryResourcesHint")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setResources((current) => [
                ...current,
                {
                  title: "",
                  resource_type: "external_link",
                  external_url: "",
                  file_path: null,
                  file_name: null,
                  file: null,
                },
              ])
            }
          >
            {t("content.addResource")}
          </Button>
        </div>
        {resources.map((resource, index) => (
          <div
            key={resource.id ?? `new-${index}`}
            className="grid gap-4 rounded-lg bg-muted/40 p-4"
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
              <Field label={t("content.resourceTitle")} htmlFor={`c-resource-title-${index}`}>
                <Input
                  id={`c-resource-title-${index}`}
                  required
                  maxLength={160}
                  value={resource.title}
                  onChange={(event) =>
                    setResources((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, title: event.target.value } : entry,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={t("content.resourceType")} htmlFor={`c-resource-type-${index}`}>
                <select
                  id={`c-resource-type-${index}`}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={resource.resource_type}
                  onChange={(event) =>
                    setResources((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index
                          ? {
                              ...entry,
                              resource_type: getSupplementType(event.target.value),
                              file_path: null,
                              file_name: null,
                              file: null,
                              external_url: "",
                            }
                          : entry,
                      ),
                    )
                  }
                >
                  <option value="external_link">{t("content.externalLink")}</option>
                  <option value="video">{t("content.video")}</option>
                  <option value="document">{t("content.document")}</option>
                </select>
              </Field>
            </div>
            {resource.resource_type === "document" ? (
              <Field
                label={t("form.file")}
                htmlFor={`c-resource-file-${index}`}
                hint={t("form.fileHint")}
              >
                <Input
                  id={`c-resource-file-${index}`}
                  type="file"
                  accept="application/pdf,.pdf"
                  required={!resource.file_path}
                  onChange={(event) =>
                    setResources((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, file: event.target.files?.[0] ?? null }
                          : entry,
                      ),
                    )
                  }
                />
                {resource.file_name && (
                  <p className="mt-1 text-xs text-muted-foreground">{resource.file_name}</p>
                )}
              </Field>
            ) : (
              <Field label={t("content.externalUrl")} htmlFor={`c-resource-url-${index}`}>
                <Input
                  id={`c-resource-url-${index}`}
                  type="url"
                  required
                  pattern="https://.*"
                  placeholder="https://..."
                  value={resource.external_url}
                  onChange={(event) =>
                    setResources((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, external_url: event.target.value }
                          : entry,
                      ),
                    )
                  }
                />
              </Field>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  setResources((current) => current.filter((_, entryIndex) => entryIndex !== index))
                }
              >
                {t("content.removeResource")}
              </Button>
            </div>
          </div>
        ))}
      </section>
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
