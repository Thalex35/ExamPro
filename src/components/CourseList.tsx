import { useState } from "react";
import { ArrowRight, BookOpen, Brain, FileText } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { NativeSelect } from "@/components/Field";
import { DemoBadge } from "@/components/DemoBadge";
import { useI18n, type Lang } from "@/lib/i18n";

type CourseResourceType = "text" | "document" | "external_link";

export type CourseListEntry = {
  id: string;
  title: string;
  summary: string | null;
  resource_type: string;
  is_demo: boolean;
};

const resourceTypes: CourseResourceType[] = ["text", "document", "external_link"];

function isCourseResourceType(value: string): value is CourseResourceType {
  return resourceTypes.some((type) => type === value);
}

function courseListTitle(subjectName: string, lang: Lang) {
  const label = subjectName.trim();
  if (lang === "ht") return `Kou: ${label}`;
  const lowerLabel = label.toLocaleLowerCase();
  return `Nos cours ${/^[aeiouyàâäéèêëîïôöùûü]/i.test(lowerLabel) ? "d'" : "de "}${lowerLabel}`;
}

export function CourseListSection({
  courses,
  title,
  subjectName,
  description,
  emptyMessage,
}: {
  courses: CourseListEntry[];
  title: string;
  subjectName?: string | undefined;
  description: string;
  emptyMessage: string;
}) {
  const { t, lang } = useI18n();
  const [resourceType, setResourceType] = useState<CourseResourceType | "all">("all");
  const availableTypes = resourceTypes.filter((type) =>
    courses.some((course) => course.resource_type === type),
  );
  const filteredCourses =
    resourceType === "all"
      ? courses
      : courses.filter((course) => course.resource_type === resourceType);

  return (
    <section aria-labelledby="course-list-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="course-list-heading" className="text-xl font-bold text-heading sm:text-2xl">
              {subjectName ? courseListTitle(subjectName, lang) : title}
            </h2>
            <span className="text-sm text-muted-foreground">
              {courses.length} {t("course.count")}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <NativeSelect
          aria-label={t("course.filter")}
          className="h-10 w-full sm:max-w-52"
          value={resourceType}
          onChange={(event) => {
            const value = event.target.value;
            setResourceType(value === "all" || isCourseResourceType(value) ? value : "all");
          }}
        >
          <option value="all">{t("course.filterAll")}</option>
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {t(
                type === "text"
                  ? "content.textLesson"
                  : type === "document"
                    ? "content.document"
                    : "content.externalLink",
              )}
            </option>
          ))}
        </NativeSelect>
      </div>
      {filteredCourses.length === 0 ? (
        <p className="rounded-2xl border border-sky-100 bg-card p-5 text-sm text-muted-foreground shadow-card">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-2">
          {filteredCourses.map((course) => (
            <li key={course.id}>
              <CourseListItem course={course} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CourseListItem({ course }: { course: CourseListEntry }) {
  const { t } = useI18n();

  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: course.id }}
      className="group grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-2xl border border-sky-100 bg-card p-4 shadow-card transition-colors duration-200 hover:border-sky-300 hover:bg-sky-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:p-5"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-deep sm:h-12 sm:w-12">
        <FileText className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-base font-semibold text-heading">
          <span className="break-words">{course.title}</span>
          {course.is_demo && <DemoBadge />}
        </span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          {course.summary?.trim() || t("course.summaryFallback")}
        </span>
      </span>
      <span className="col-start-2 inline-flex min-h-9 items-center justify-center gap-2 justify-self-start rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-deep sm:col-start-auto sm:justify-self-auto">
        {t("course.view")}
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

export function ResourceNavigation({
  subjectId,
  chapterId,
  active,
}: {
  subjectId: string;
  chapterId?: string | undefined;
  active: "courses" | "quiz" | "exams";
}) {
  const { t } = useI18n();

  return (
    <nav
      aria-label={t("subj.resourceNavigation")}
      className="flex gap-2 overflow-x-auto border-b border-sky-100 pb-2"
    >
      <Link
        to="/subjects/$subjectId"
        params={{ subjectId }}
        search={{ chapter: chapterId, resource: "courses" }}
        aria-current={active === "courses" ? "page" : undefined}
        className={resourceTabClass(active === "courses")}
      >
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        {t("subj.courses")}
      </Link>
      <Link
        to="/subjects/$subjectId"
        params={{ subjectId }}
        search={{ chapter: chapterId, resource: "quiz" }}
        aria-current={active === "quiz" ? "page" : undefined}
        className={resourceTabClass(active === "quiz")}
      >
        <Brain className="h-4 w-4" aria-hidden="true" />
        {t("subj.quiz")}
      </Link>
      <Link
        to="/exams"
        search={{ subject: subjectId, chapter: chapterId }}
        aria-current={active === "exams" ? "page" : undefined}
        className={resourceTabClass(active === "exams")}
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        {t("subj.examsCategory")}
      </Link>
    </nav>
  );
}

function resourceTabClass(active: boolean) {
  return `inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    active
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-sky-100 bg-card text-muted-foreground hover:border-sky-300 hover:text-heading"
  }`;
}
