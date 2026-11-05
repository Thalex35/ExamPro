import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, FileDown, FilePlus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DemoBadge } from "@/components/DemoBadge";
import { NativeSelect, StatusBadge } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { catalogQuery } from "@/lib/catalog";
import { formatExamYear } from "@/lib/exam-years";
import { openCourseFile, openExamFile } from "@/lib/files";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

type RoleArea = "admin" | "teacher";
type Kind = "course" | "exam";
type Course = Database["public"]["Tables"]["courses"]["Row"];
type Exam = Database["public"]["Tables"]["exams"]["Row"];
type ManagedRow =
  | (Course & { kind: "course"; author_name: string | null })
  | (Exam & { kind: "exam"; author_name: string | null });

export function ContentManagementPage({ role, kind }: { role: RoleArea; kind: Kind }) {
  const { t, name, errMsg } = useI18n();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const catalog = useQuery(catalogQuery);
  const [search, setSearch] = useState("");
  const [levelId, setLevelId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [year, setYear] = useState("");
  const [rejecting, setRejecting] = useState<ManagedRow | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const isAdmin = role === "admin";
  const content = useQuery({
    queryKey: ["content-management", role, kind, me?.user.id],
    enabled: !!me,
    queryFn: async (): Promise<ManagedRow[]> => {
      if (!me) throw new Error("AUTH_REQUIRED");
      if (kind === "course") {
        const request = supabase.from("courses").select("*");
        const filteredRequest = isAdmin ? request : request.eq("author_id", me.user.id);
        const { data, error } = await filteredRequest.order("updated_at", { ascending: false });
        if (error) throw error;
        const authors = await getAuthorNames(data.map((row) => row.author_id));
        return data.map((row) => ({
          ...row,
          kind: "course" as const,
          author_name: authors.get(row.author_id) ?? null,
        }));
      }
      const request = supabase.from("exams").select("*");
      const filteredRequest = isAdmin ? request : request.eq("author_id", me.user.id);
      const { data, error } = await filteredRequest.order("created_at", { ascending: false });
      if (error) throw error;
      const authors = await getAuthorNames(data.map((row) => row.author_id));
      return data.map((row) => ({
        ...row,
        kind: "exam" as const,
        author_name: authors.get(row.author_id) ?? null,
      }));
    },
  });

  async function getAuthorNames(authorIds: string[]) {
    if (!isAdmin || authorIds.length === 0) return new Map<string, string>();
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) throw error;
    return new Map(
      data
        .filter((user) => authorIds.includes(user.user_id))
        .map((user) => [user.user_id, user.full_name ?? user.user_id]),
    );
  }

  if (catalog.isLoading || content.isLoading) return <Loading />;
  if (catalog.error || !catalog.data) return <ErrorState error={catalog.error} />;
  if (content.error || !content.data) {
    return <ErrorState error={content.error} onRetry={() => void content.refetch()} />;
  }

  const c = catalog.data;
  const tracks = c.tracks.filter((track) => !levelId || track.level_id === levelId);
  const term = search.trim().toLocaleLowerCase();
  const rows = content.data.filter((row) => {
    const subject = c.subjects.find((entry) => entry.id === row.subject_id);
    const level = c.levels.find((entry) => entry.id === row.level_id);
    const track = c.tracks.find((entry) => entry.id === row.track_id);
    const matchesText = [
      row.title,
      row.kind === "exam" ? (row.description ?? "") : (row.summary ?? ""),
      row.kind === "exam" ? formatExamYear(row.exam_year) : "",
      subject ? name(subject) : "",
      level ? name(level) : "",
      track?.code ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(term);
    return (
      matchesText &&
      (!levelId || row.level_id === levelId) &&
      (!trackId || row.track_id === trackId) &&
      (!subjectId || row.subject_id === subjectId) &&
      (row.kind !== "exam" || !year || String(row.exam_year) === year)
    );
  });

  function goToNew() {
    if (kind === "course") {
      if (isAdmin) void navigate({ to: "/admin/courses/new" });
      else void navigate({ to: "/teacher/courses/new" });
    } else if (isAdmin) {
      void navigate({ to: "/admin/exams/new" });
    } else {
      void navigate({ to: "/teacher/exams/new" });
    }
  }

  function goToEdit(row: ManagedRow) {
    if (row.kind === "course") {
      if (isAdmin) void navigate({ to: "/admin/courses/$courseId", params: { courseId: row.id } });
      else void navigate({ to: "/teacher/courses/$courseId", params: { courseId: row.id } });
    } else if (isAdmin) {
      void navigate({ to: "/admin/exams/$examId", params: { examId: row.id } });
    } else {
      void navigate({ to: "/teacher/exams/$examId", params: { examId: row.id } });
    }
  }

  async function setStatus(row: ManagedRow, status: "draft" | "published") {
    const values = isAdmin ? { status, review_status: "none", review_note: null } : { status };
    const result =
      row.kind === "course"
        ? await supabase.from("courses").update(values).eq("id", row.id)
        : await supabase.from("exams").update(values).eq("id", row.id);
    const { error } = result;
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    await qc.invalidateQueries();
  }

  async function rejectRow(row: ManagedRow, note: string) {
    const result =
      row.kind === "course"
        ? await supabase
            .from("courses")
            .update({ status: "draft", review_status: "rejected", review_note: note })
            .eq("id", row.id)
        : await supabase
            .from("exams")
            .update({ status: "draft", review_status: "rejected", review_note: note })
            .eq("id", row.id);
    if (result.error) {
      toast.error(errMsg(result.error));
      return;
    }
    setRejecting(null);
    setReviewNote("");
    await qc.invalidateQueries();
  }

  async function deleteRow(row: ManagedRow) {
    if (!confirm(t("admin.confirmDeleteContent"))) return;
    const result =
      row.kind === "course"
        ? await supabase.from("courses").delete().eq("id", row.id)
        : await supabase.from("exams").delete().eq("id", row.id);
    const { error } = result;
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    const bucket = row.kind === "course" ? "course-files" : "exams";
    if (row.file_path) {
      const { error: fileError } = await supabase.storage.from(bucket).remove([row.file_path]);
      if (fileError) toast.error(errMsg(fileError));
    }
    await qc.invalidateQueries();
  }

  async function openFile(row: ManagedRow) {
    try {
      if (row.kind === "course" && row.resource_type === "document" && row.file_path) {
        await openCourseFile(row.file_path);
      } else if (row.kind === "exam") {
        await openExamFile(row.file_path, row.demo_content);
      }
    } catch (error) {
      toast.error(errMsg(error));
    }
  }

  const subjects = c.subjects.filter(
    (subject) =>
      c.levelSubjects.some(
        (link) => link.subject_id === subject.id && (!levelId || link.level_id === levelId),
      ) &&
      (!trackId ||
        c.trackSubjects.some(
          (link) => link.track_id === trackId && link.subject_id === subject.id,
        )),
  );
  const years = [
    ...new Set(content.data.flatMap((row) => (row.kind === "exam" ? [row.exam_year] : []))),
  ].sort((a, b) => b - a);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t(
          isAdmin
            ? kind === "exam"
              ? "admin.examManagement"
              : "admin.courseManagement"
            : kind === "exam"
              ? "nav.teacherExams"
              : "nav.teacherCourses",
        )}
        action={
          <Button variant="hero" onClick={goToNew}>
            <FilePlus className="mr-2 h-4 w-4" />
            {t(
              isAdmin
                ? kind === "exam"
                  ? "admin.newExam"
                  : "admin.newCourse"
                : kind === "exam"
                  ? "teacher.newExam"
                  : "teacher.newCourse",
            )}
          </Button>
        }
      />
      {!isAdmin && (
        <p className="text-sm text-muted-foreground">{t("content.availableResources")}</p>
      )}
      <section className="card-surface grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">{t("admin.searchContent")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("admin.searchContent")}
            className="pl-10"
          />
        </label>
        <NativeSelect
          aria-label={t("form.level")}
          value={levelId}
          onChange={(event) => {
            setLevelId(event.target.value);
            setTrackId("");
            setSubjectId("");
          }}
        >
          <option value="">{t("admin.filterLevel")}</option>
          {c.levels.map((level) => (
            <option key={level.id} value={level.id}>
              {name(level)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t("form.track")}
          value={trackId}
          onChange={(event) => setTrackId(event.target.value)}
        >
          <option value="">{t("admin.filterTrack")}</option>
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.code}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t("form.subject")}
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
        >
          <option value="">{t("admin.filterSubject")}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {name(subject)}
            </option>
          ))}
        </NativeSelect>
        {kind === "exam" && (
          <NativeSelect
            aria-label={t("form.year")}
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            <option value="">{t("admin.filterYear")}</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {formatExamYear(item)}
              </option>
            ))}
          </NativeSelect>
        )}
      </section>
      {!rows.length ? (
        <Empty>{t("content.noContent")}</Empty>
      ) : (
        <ul className="card-surface divide-y">
          {rows.map((row) => {
            const subject = c.subjects.find((entry) => entry.id === row.subject_id);
            const level = c.levels.find((entry) => entry.id === row.level_id);
            const track = c.tracks.find((entry) => entry.id === row.track_id);
            const mine = row.author_id === me?.user.id;
            const canManage = isAdmin || mine;
            const canDelete = isAdmin || (mine && row.status !== "published");
            return (
              <li key={`${row.kind}-${row.id}`} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-heading">{row.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      subject && name(subject),
                      level && name(level),
                      track?.code,
                      row.kind === "exam" ? formatExamYear(row.exam_year) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {row.kind === "course" && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                    {t(
                      row.resource_type === "external_link"
                        ? "content.externalLink"
                        : row.resource_type === "document"
                          ? "content.document"
                          : "content.textLesson",
                    )}
                  </span>
                )}
                {row.is_demo && <DemoBadge />}
                {row.review_status === "rejected" && (
                  <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                    {t("content.rejectedReview")}
                  </span>
                )}
                {row.kind === "exam" && (
                  <Button size="sm" variant="outline" onClick={() => void openFile(row)}>
                    <FileDown className="mr-1 h-4 w-4" />
                    {t("common.open")}
                  </Button>
                )}
                {row.kind === "course" &&
                  row.resource_type === "external_link" &&
                  row.external_url && (
                    <a
                      href={row.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
                    >
                      <ExternalLink className="mr-1 h-4 w-4" />
                      {t("content.openLink")}
                    </a>
                  )}
                {row.kind === "course" && row.resource_type === "document" && row.file_path && (
                  <Button size="sm" variant="outline" onClick={() => void openFile(row)}>
                    <FileDown className="mr-1 h-4 w-4" />
                    {t("content.download")}
                  </Button>
                )}
                {row.kind === "course" && row.resource_type === "text" && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/courses/$courseId" params={{ courseId: row.id }}>
                      {t("common.open")}
                    </Link>
                  </Button>
                )}
                {isAdmin && (
                  <span className="text-xs text-muted-foreground">
                    {t("content.owner")}: {row.author_name ?? "—"}
                  </span>
                )}
                <StatusBadge status={row.status} label={t(`status.${row.status}`)} />
                {canManage && (
                  <Button size="sm" variant="outline" onClick={() => goToEdit(row)}>
                    {t("common.edit")}
                  </Button>
                )}
                {canManage && row.status === "published" && (
                  <Button size="sm" variant="outline" onClick={() => void setStatus(row, "draft")}>
                    {t("form.unpublish")}
                  </Button>
                )}
                {canManage &&
                  row.status !== "published" &&
                  (isAdmin || row.review_status !== "rejected") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void setStatus(row, "published")}
                    >
                      {t("form.publish")}
                    </Button>
                  )}
                {isAdmin && row.review_status !== "rejected" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRejecting(row);
                      setReviewNote("");
                    }}
                  >
                    {t("admin.reject")}
                  </Button>
                )}
                {canDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    aria-label={`${t("common.delete")} ${row.title}`}
                    onClick={() => void deleteRow(row)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {!canDelete && mine && row.status === "published" && (
                  <span className="max-w-40 text-right text-xs text-muted-foreground">
                    {t("content.deletePublishedHint")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Dialog
        open={!!rejecting}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setRejecting(null);
            setReviewNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("content.rejectionReason")}</DialogTitle>
            <DialogDescription>{t("content.rejectionHelp")}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!rejecting || reviewNote.trim().length < 3) {
                toast.error(t("content.rejectionReasonRequired"));
                return;
              }
              void rejectRow(rejecting, reviewNote.trim());
            }}
            className="space-y-4"
          >
            <Textarea
              autoFocus
              required
              minLength={3}
              maxLength={500}
              rows={4}
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              aria-label={t("content.rejectionReason")}
            />
            <DialogFooter>
              <Button type="submit">{t("content.submitRejection")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
