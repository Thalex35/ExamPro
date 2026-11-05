import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Brain,
  ChevronRight,
  FileText,
  GraduationCap,
  Layers3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CourseListSection, ResourceNavigation } from "@/components/CourseList";
import { Empty, ErrorState, Loading } from "@/components/States";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, chaptersFor, subjectsForLevel, trackFilter } from "@/lib/catalog";
import { subjectIcons } from "@/lib/subject-icons";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

type ResourceKind = "courses" | "quiz" | "exams";

export const Route = createFileRoute("/_authenticated/subjects/$subjectId")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { chapter?: string | undefined; resource?: ResourceKind | undefined } => ({
    chapter: typeof s["chapter"] === "string" ? s["chapter"] : undefined,
    resource:
      s["resource"] === "courses" || s["resource"] === "quiz" || s["resource"] === "exams"
        ? s["resource"]
        : undefined,
  }),
  head: () => ({ meta: [{ title: "Matière — EXAMPRO" }] }),
  component: SubjectDetail,
});

function SubjectDetail() {
  const { subjectId } = Route.useParams();
  const { chapter: chapterId, resource } = Route.useSearch();
  const { t, name } = useI18n();
  const { data: me } = useMe();
  const catalogQueryResult = useQuery(catalogQuery);
  const levelId = me?.profile?.level_id;
  const trackId = me?.profile?.track_id;

  const resources = useQuery({
    queryKey: ["subject-resources", subjectId, levelId, trackId],
    enabled: !!levelId,
    queryFn: async () => {
      const filter = trackFilter(trackId);
      const [courses, exams] = await Promise.all([
        supabase
          .from("courses")
          .select("id,title,summary,resource_type,is_demo,chapter_id")
          .eq("status", "published")
          .eq("subject_id", subjectId)
          .eq("level_id", levelId!)
          .or(filter),
        supabase
          .from("exams")
          .select("id,chapter_id")
          .eq("status", "published")
          .eq("subject_id", subjectId)
          .eq("level_id", levelId!)
          .or(filter),
      ]);
      if (courses.error) throw courses.error;
      if (exams.error) throw exams.error;
      return { courses: courses.data, exams: exams.data };
    },
  });

  if (catalogQueryResult.isLoading) return <Loading />;
  if (catalogQueryResult.error || !catalogQueryResult.data)
    return (
      <ErrorState error={catalogQueryResult.error} onRetry={() => catalogQueryResult.refetch()} />
    );
  const catalog = catalogQueryResult.data;
  const subject = catalog.subjects.find((entry) => entry.id === subjectId);
  const allowed = subjectsForLevel(catalog, levelId, trackId).some(
    (entry) => entry.id === subjectId,
  );
  if (!subject || !allowed) return <Empty>{t("subj.empty")}</Empty>;

  const SubjectIcon = subjectIcons[subject.icon ?? ""] ?? GraduationCap;
  const chapters = chaptersFor(catalog, subjectId, levelId);
  const chapter = chapters.find((entry) => entry.id === chapterId);
  const isSimpleSubject = chapters.length === 0;
  const allCourses = resources.data?.courses ?? [];
  const allExams = resources.data?.exams ?? [];
  const selectedCourses = isSimpleSubject
    ? allCourses.filter((course) => !course.chapter_id)
    : allCourses.filter((course) => course.chapter_id === chapter?.id);
  const selectedExams = isSimpleSubject
    ? allExams.filter((exam) => !exam.chapter_id)
    : allExams.filter((exam) => exam.chapter_id === chapter?.id);

  const currentResource = resource ?? "courses";
  const hasResourcePage = isSimpleSubject || !!chapter;
  const activeResource = hasResourcePage
    ? {
        courses: t("subj.courses"),
        quiz: t("subj.quiz"),
        exams: t("subj.examsShort"),
      }[currentResource]
    : undefined;

  return (
    <div className="space-y-6">
      <nav
        className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
        aria-label="breadcrumb"
      >
        <Link to="/subjects" className="transition-colors hover:text-foreground">
          {t("subj.title")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <Link
          to="/subjects/$subjectId"
          params={{ subjectId }}
          search={{}}
          className="transition-colors hover:text-foreground"
        >
          {name(subject)}
        </Link>
        {chapter && (
          <>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link
              to="/subjects/$subjectId"
              params={{ subjectId }}
              search={{ chapter: chapter.id }}
              className="transition-colors hover:text-foreground"
            >
              {name(chapter)}
            </Link>
          </>
        )}
        {activeResource && (
          <>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium text-foreground">{activeResource}</span>
          </>
        )}
      </nav>

      <header className="relative isolate overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-blue-100 p-5 shadow-sm sm:p-8">
        <div className="relative z-10 flex items-center justify-between gap-5">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-deep">
              {chapter ? t("subj.chapters") : t("subj.title")}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-heading sm:text-3xl">
              {chapter ? name(chapter) : name(subject)}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {chapter
                ? t("subj.chapterDescription")
                : isSimpleSubject
                  ? t("subj.simpleDescription")
                  : t("subj.chapterDescription")}
            </p>
          </div>
          <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-brand shadow-md sm:flex">
            {chapter ? (
              <BookOpen className="h-8 w-8" aria-hidden="true" />
            ) : (
              <SubjectIcon className="h-8 w-8" aria-hidden="true" />
            )}
          </span>
        </div>
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -right-10 -z-10 h-56 w-56 rounded-full bg-sky-200/50 blur-3xl"
        />
      </header>

      {resources.isLoading ? (
        <Loading />
      ) : resources.error ? (
        <ErrorState error={resources.error} onRetry={() => void resources.refetch()} />
      ) : chapters.length > 0 && !chapter ? (
        <section aria-labelledby="chapters-heading" className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 id="chapters-heading" className="text-xl font-bold text-heading">
              {t("subj.chapters")}
            </h2>
            <span className="ml-auto rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-deep">
              {chapters.length} {t("subj.chapters").toLowerCase()}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {chapters.map((item, index) => {
              const courseCount = allCourses.filter(
                (course) => course.chapter_id === item.id,
              ).length;
              const examCount = allExams.filter((exam) => exam.chapter_id === item.id).length;
              return (
                <Link
                  key={item.id}
                  to="/subjects/$subjectId"
                  params={{ subjectId }}
                  search={{ chapter: item.id }}
                  className="group flex min-h-56 flex-col rounded-2xl border border-sky-100 bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-brand">
                      <BookOpen className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-deep">
                      {t("subj.chapterNumber")} {index + 1}
                    </span>
                  </div>
                  <span className="mt-4 text-lg font-bold text-heading group-hover:text-deep">
                    {name(item)}
                  </span>
                  <span className="mt-auto flex flex-wrap gap-2 pt-4 text-xs font-semibold text-deep">
                    <ResourceCount icon={BookOpen} count={courseCount} label={t("subj.courses")} />
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1.5">
                      <Brain className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("subj.comingSoon")}
                    </span>
                    <ResourceCount icon={FileText} count={examCount} label={t("subj.examsShort")} />
                  </span>
                  <span className="mt-4 flex items-center gap-1 text-sm font-bold text-deep">
                    {t("subj.openChapter")}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="space-y-5">
          <ResourceNavigation
            subjectId={subjectId}
            chapterId={chapter?.id}
            active={currentResource}
          />
          {currentResource === "quiz" ? (
            <UnavailableQuiz />
          ) : (
            <CourseListSection
              courses={selectedCourses}
              title={t("course.all")}
              subjectName={chapter ? name(chapter) : name(subject)}
              description={t("subj.coursesDescription")}
              emptyMessage={t("subj.noCoursesHere")}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ResourceCount({
  icon: Icon,
  count,
  label,
}: {
  icon: LucideIcon;
  count: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {count} {label}
    </span>
  );
}

function UnavailableQuiz() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-sky-100 bg-card p-8 text-center shadow-card">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-brand">
        <Brain className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-heading">{t("subj.quiz")}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        {t("subj.quizUnavailable")}
      </p>
    </div>
  );
}
