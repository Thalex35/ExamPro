import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { NativeSelect } from "@/components/Field";
import { CourseListSection, ResourceNavigation } from "@/components/CourseList";
import { Empty, ErrorState, Loading } from "@/components/States";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, subjectsForLevel, trackFilter } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/courses/")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { subject?: string | undefined; chapter?: string | undefined } => ({
    subject: typeof s["subject"] === "string" ? s["subject"] : undefined,
    chapter: typeof s["chapter"] === "string" ? s["chapter"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Cours — EXAMPRO" }] }),
  component: CoursesPage,
});

function CoursesPage() {
  const { t, name } = useI18n();
  const { data: me } = useMe();
  const catalog = useQuery(catalogQuery);
  const { subject: subjectId, chapter: chapterId } = Route.useSearch();
  const navigate = useNavigate({ from: "/courses/" });
  const levelId = me?.profile?.level_id;
  const trackId = me?.profile?.track_id;
  const [search, setSearch] = useState("");

  const courses = useQuery({
    queryKey: ["all-student-courses", levelId, trackId],
    enabled: !!levelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id,title,summary,subject_id,chapter_id,topic_id,published_at,is_demo,resource_type,resource_formats",
        )
        .eq("status", "published")
        .eq("level_id", levelId!)
        .or(trackFilter(trackId))
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (catalog.isLoading) return <Loading />;
  if (catalog.error || !catalog.data) return <ErrorState error={catalog.error} />;
  const subjects = subjectsForLevel(catalog.data, levelId, trackId);
  const selectedSubject = catalog.data.subjects.find((subject) => subject.id === subjectId);
  const selectedChapter = catalog.data.chapters.find((chapter) => chapter.id === chapterId);
  const term = search.trim().toLocaleLowerCase();
  const results = (courses.data ?? []).filter((course) => {
    const subject = catalog.data!.subjects.find((entry) => entry.id === course.subject_id);
    const chapter = catalog.data!.chapters.find((entry) => entry.id === course.chapter_id);
    return (
      (!subjectId || course.subject_id === subjectId) &&
      (!chapterId || course.chapter_id === chapterId) &&
      [
        course.title,
        course.summary ?? "",
        subject ? name(subject) : "",
        chapter ? name(chapter) : "",
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(term)
    );
  });

  return (
    <div>
      {subjectId && (
        <nav
          className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          aria-label="breadcrumb"
        >
          <Link to="/subjects" className="hover:text-foreground">
            {t("subj.title")}
          </Link>
          <span aria-hidden="true">›</span>
          {selectedSubject && (
            <>
              <Link
                to="/subjects/$subjectId"
                params={{ subjectId: selectedSubject.id }}
                search={{}}
                className="hover:text-foreground"
              >
                {name(selectedSubject)}
              </Link>
              <span aria-hidden="true">›</span>
              {selectedChapter && chapterId && (
                <Link
                  to="/subjects/$subjectId"
                  params={{ subjectId: selectedSubject.id }}
                  search={{ chapter: chapterId }}
                  className="hover:text-foreground"
                >
                  {name(selectedChapter)}
                </Link>
              )}
              {selectedChapter && chapterId && <span aria-hidden="true">›</span>}
            </>
          )}
          <span className="font-medium text-foreground">{t("subj.courses")}</span>
        </nav>
      )}
      {selectedSubject && (
        <ResourceNavigation
          subjectId={selectedSubject.id}
          chapterId={selectedChapter?.id}
          active="courses"
        />
      )}
      <div className="card-surface mb-6 grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(200px,280px)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("course.search")}
            placeholder={t("course.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 pl-10"
          />
        </div>
        <NativeSelect
          aria-label={t("exams.subject")}
          className="h-11"
          value={subjectId}
          onChange={(event) =>
            navigate({
              search: (previous) => ({
                ...previous,
                subject: event.target.value || undefined,
                chapter: undefined,
              }),
            })
          }
        >
          <option value="">{t("course.allSubjects")}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {name(subject)}
            </option>
          ))}
        </NativeSelect>
      </div>
      {courses.isLoading ? (
        <Loading />
      ) : courses.error ? (
        <ErrorState error={courses.error} onRetry={() => void courses.refetch()} />
      ) : results.length === 0 ? (
        <Empty>{t("course.noResults")}</Empty>
      ) : (
        <CourseListSection
          courses={results}
          title={t("course.all")}
          subjectName={
            selectedChapter
              ? name(selectedChapter)
              : selectedSubject
                ? name(selectedSubject)
                : undefined
          }
          description={t("course.allDescription")}
          emptyMessage={t("course.noResults")}
        />
      )}
    </div>
  );
}
