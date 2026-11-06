import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CourseResourceReader } from "@/components/CourseResourceReader";
import { Empty, ErrorState, Loading } from "@/components/States";
import { supabase } from "@/integrations/supabase/client";
import { getVideoEmbedUrl } from "@/lib/course-resources";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/courses/resource/$courseId/$resourceId")({
  head: () => ({ meta: [{ title: "Ressource du cours — EXAMPRO" }] }),
  component: CourseResourcePage,
});

function CourseResourcePage() {
  const { courseId, resourceId } = Route.useParams();
  const { t, errMsg } = useI18n();
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const courseQuery = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const supplementalQuery = useQuery({
    queryKey: ["course-resource", courseId, resourceId],
    enabled: !!courseQuery.data && resourceId !== "primary",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_resources")
        .select("*")
        .eq("course_id", courseId)
        .eq("id", resourceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const progressQuery = useQuery({
    queryKey: ["course-progress", me?.user.id, courseId],
    enabled: !!me?.isStudent && !!me.user.id,
    queryFn: async () => {
      if (!me?.user.id) return null;
      const { data, error } = await supabase
        .from("course_progress")
        .select("progress_percent,completed_at")
        .eq("student_id", me.user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const course = courseQuery.data;
  const resource =
    resourceId === "primary" && course && course.resource_type !== "text"
      ? {
          id: "primary",
          title: course.file_name || course.title,
          resource_type: course.resource_type,
          file_path: course.file_path,
          external_url: course.external_url,
        }
      : supplementalQuery.data;
  const filePath = resource?.resource_type === "document" ? resource.file_path : null;
  const fileUrlQuery = useQuery({
    queryKey: ["course-resource-url", courseId, resourceId, filePath],
    enabled: !!filePath,
    queryFn: async () => {
      if (!filePath) return null;
      const { data, error } = await supabase.storage
        .from("course-files")
        .createSignedUrl(filePath, 300);
      if (error || !data) throw error ?? new Error("COURSE_RESOURCE_FILE_UNAVAILABLE");
      return data.signedUrl;
    },
  });

  if (courseQuery.isLoading || supplementalQuery.isLoading || progressQuery.isLoading)
    return <Loading />;
  if (courseQuery.error)
    return <ErrorState error={courseQuery.error} onRetry={() => void courseQuery.refetch()} />;
  if (supplementalQuery.error)
    return (
      <ErrorState
        error={supplementalQuery.error}
        onRetry={() => void supplementalQuery.refetch()}
      />
    );
  if (progressQuery.error)
    return <ErrorState error={progressQuery.error} onRetry={() => void progressQuery.refetch()} />;
  if (!course) return <Empty>{t("404.title")}</Empty>;

  const profile = me?.profile;
  const outOfScope =
    !!me?.isStudent &&
    (profile?.level_id !== course.level_id ||
      (!!profile?.track_id && !!course.track_id && profile.track_id !== course.track_id) ||
      (!!course.track_id && !profile?.track_id));
  if (outOfScope) return <Empty>{t("course.notAvailableForProfile")}</Empty>;
  if (!resource || !["document", "video", "external_link"].includes(resource.resource_type))
    return <Empty>{t("404.title")}</Empty>;
  if (resource.resource_type === "document" && !resource.file_path)
    return <Empty>{t("course.emptyContent")}</Empty>;
  if (resource.resource_type !== "document" && !resource.external_url)
    return <Empty>{t("course.emptyContent")}</Empty>;
  if (filePath && fileUrlQuery.isLoading) return <Loading />;
  if (fileUrlQuery.error)
    return <ErrorState error={fileUrlQuery.error} onRetry={() => void fileUrlQuery.refetch()} />;

  const currentProgress = progressQuery.data?.progress_percent ?? 0;
  const completed = currentProgress === 100;
  const videoEmbedUrl =
    resource.resource_type === "video" ? getVideoEmbedUrl(resource.external_url) : null;

  async function saveProgress(value: number, complete = false) {
    if (!me?.isStudent) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("course_progress").upsert(
      {
        student_id: me.user.id,
        course_id: course.id,
        progress_percent: complete ? 100 : Math.min(99, value),
        completed_at: complete ? now : null,
        updated_at: now,
      },
      { onConflict: "student_id,course_id" },
    );
    if (error) throw error;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["course-progress", me.user.id, course.id] }),
      queryClient.invalidateQueries({ queryKey: ["course-reading-history", me.user.id] }),
    ]);
  }

  async function downloadResource() {
    if (resource.resource_type !== "document" || !resource.file_path) {
      throw new Error("COURSE_RESOURCE_FILE_UNAVAILABLE");
    }
    const { data, error } = await supabase.storage
      .from("course-files")
      .createSignedUrl(resource.file_path, 300, { download: true });
    if (error || !data) throw error ?? new Error("COURSE_RESOURCE_FILE_UNAVAILABLE");
    window.location.assign(data.signedUrl);
  }

  return (
    <CourseResourceReader
      courseId={course.id}
      courseTitle={course.title}
      resourceTitle={resource.title}
      resourceType={resource.resource_type}
      resourceUrl={
        resource.resource_type === "document" ? (fileUrlQuery.data ?? null) : resource.external_url
      }
      download={downloadResource}
      durationMinutes={course.duration_minutes}
      progress={currentProgress}
      completed={completed}
      canTrackProgress={!!me?.isStudent}
      onSaveProgress={(value) => saveProgress(value)}
      onComplete={() => saveProgress(100, true)}
      onError={(error) => toast.error(errMsg(error))}
    />
  );
}
