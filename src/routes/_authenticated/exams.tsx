import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, CalendarDays, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, subjectsForLevel, trackFilter } from "@/lib/catalog";
import { openExamFile } from "@/lib/files";
import { formatExamYear } from "@/lib/exam-years";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Empty, ErrorState, Loading } from "@/components/States";
import { NativeSelect } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DemoBadge } from "@/components/DemoBadge";
import { ResourceNavigation } from "@/components/CourseList";
import { ReportContentButton } from "@/components/ReportContentButton";

export const Route = createFileRoute("/_authenticated/exams")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    subject?: string | undefined;
    chapter?: string | undefined;
    year?: number | undefined;
    session?: string | undefined;
  } => ({
    subject: typeof s["subject"] === "string" ? s["subject"] : undefined,
    chapter: typeof s["chapter"] === "string" ? s["chapter"] : undefined,
    year: typeof s["year"] === "number" ? s["year"] : undefined,
    session: typeof s["session"] === "string" ? s["session"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Archive des examens — EXAMPRO" }] }),
  component: Exams,
});

function Exams() {
  const { t, name, errMsg } = useI18n();
  const { subject, chapter, year, session } = Route.useSearch();
  const navigate = useNavigate({ from: "/exams" });
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const levelId = me?.profile?.level_id;
  const trackId = me?.profile?.track_id;

  const q = useQuery({
    queryKey: ["exams", levelId, trackId],
    enabled: !!levelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select(
          "id,title,description,exam_year,session,subject_id,chapter_id,file_path,is_demo,demo_content,author_id",
        )
        .eq("status", "published")
        .eq("level_id", levelId!)
        .or(trackFilter(trackId))
        .order("exam_year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (cat.isLoading) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} />;
  const c = cat.data;
  const subjects = subjectsForLevel(c, levelId, trackId);
  const years = [...new Set(q.data?.map((exam) => exam.exam_year) ?? [])].sort((a, b) => b - a);
  const sessions = [
    ...new Set(q.data?.flatMap((exam) => (exam.session ? [exam.session] : [])) ?? []),
  ].sort((a, b) => a.localeCompare(b));
  const level = c.levels.find((candidate) => candidate.id === levelId);
  const track = c.tracks.find((candidate) => candidate.id === trackId);
  const term = search.trim().toLocaleLowerCase();
  const filteredExams = (q.data ?? []).filter((exam) => {
    const examSubject = c.subjects.find((candidate) => candidate.id === exam.subject_id);
    const examChapter = c.chapters.find((candidate) => candidate.id === exam.chapter_id);
    const searchableText = [
      exam.title,
      examSubject ? name(examSubject) : "",
      examChapter ? name(examChapter) : "",
      exam.description ?? "",
      formatExamYear(exam.exam_year),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      (!subject || exam.subject_id === subject) &&
      (!chapter || exam.chapter_id === chapter) &&
      (!year || exam.exam_year === year) &&
      (!session || exam.session === session) &&
      (!term || searchableText.includes(term))
    );
  });
  const hasActiveFilters = !!search || !!subject || !!chapter || !!year || !!session;
  const accentTones = [
    "from-sky-50 to-blue-50 text-sky-700",
    "from-violet-50 to-purple-50 text-violet-700",
    "from-emerald-50 to-teal-50 text-emerald-700",
  ];

  return (
    <div className="space-y-6">
      {chapter && (
        <nav
          className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          aria-label="breadcrumb"
        >
          <Link to="/subjects" className="hover:text-foreground">
            {t("subj.title")}
          </Link>
          <span aria-hidden="true">›</span>
          {c.subjects.find((item) => item.id === subject) && subject && (
            <Link
              to="/subjects/$subjectId"
              params={{ subjectId: subject }}
              search={{}}
              className="hover:text-foreground"
            >
              {name(c.subjects.find((item) => item.id === subject)!)}
            </Link>
          )}
          <span aria-hidden="true">›</span>
          {c.chapters.find((item) => item.id === chapter) && subject && (
            <Link
              to="/subjects/$subjectId"
              params={{ subjectId: subject }}
              search={{ chapter }}
              className="hover:text-foreground"
            >
              {name(c.chapters.find((item) => item.id === chapter)!)}
            </Link>
          )}
          <span aria-hidden="true">›</span>
          <span className="font-medium text-foreground">{t("subj.exams")}</span>
        </nav>
      )}
      <div className="mb-8">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-deep">
          {t("exams.eyebrow")}
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">{t("exams.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("exams.subtitle")}</p>
      </div>

      {subject && c.subjects.some((item) => item.id === subject) && (
        <ResourceNavigation subjectId={subject} chapterId={chapter} active="exams" />
      )}

      <section
        aria-label={t("exams.filters")}
        className={cn(
          "card-surface grid gap-2 p-3 sm:grid-cols-2 lg:items-center",
          hasActiveFilters
            ? "lg:grid-cols-[minmax(220px,1.7fr)_repeat(3,minmax(140px,1fr))_auto]"
            : "lg:grid-cols-[minmax(220px,1.7fr)_repeat(3,minmax(140px,1fr))]",
        )}
      >
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("exams.search")}
            placeholder={t("exams.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 pl-10"
          />
        </div>
        <NativeSelect
          aria-label={t("exams.subject")}
          className="h-11"
          value={subject ?? ""}
          onChange={(event) =>
            navigate({
              search: (previous) => ({ ...previous, subject: event.target.value || undefined }),
            })
          }
        >
          <option value="">{t("exams.allSubjects")}</option>
          {subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {name(item)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t("exams.year")}
          className="h-11"
          value={year ?? ""}
          onChange={(event) =>
            navigate({
              search: (previous) => ({
                ...previous,
                year: event.target.value ? Number(event.target.value) : undefined,
              }),
            })
          }
        >
          <option value="">{t("exams.allYears")}</option>
          {years.map((item) => (
            <option key={item} value={item}>
              {formatExamYear(item)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t("exams.session")}
          className="h-11"
          value={session ?? ""}
          onChange={(event) =>
            navigate({
              search: (previous) => ({ ...previous, session: event.target.value || undefined }),
            })
          }
        >
          <option value="">{t("exams.allSessions")}</option>
          {sessions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </NativeSelect>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 px-3"
            onClick={() => {
              setSearch("");
              navigate({
                search: (previous) => ({
                  ...previous,
                  subject: undefined,
                  chapter: undefined,
                  year: undefined,
                  session: undefined,
                }),
              });
            }}
          >
            {t("exams.clearFilters")}
          </Button>
        )}
      </section>

      {!levelId ? (
        <Empty>{t("subj.empty")}</Empty>
      ) : q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-heading">
                {filteredExams.length} {t("exams.results")}
              </span>
              {level && (
                <>
                  {" "}
                  {t("exams.forLevel")} {name(level)}
                  {track ? ` · ${track.code}` : ""}
                </>
              )}
            </p>
            <div
              className="inline-flex rounded-lg border bg-card p-1"
              role="group"
              aria-label={t("exams.viewMode")}
            >
              {(["grid", "list"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  onClick={() => setView(mode)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    view === mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t(mode === "grid" ? "exams.grid" : "exams.list")}
                </button>
              ))}
            </div>
          </div>
          {filteredExams.length === 0 ? (
            <Empty>{q.data?.length ? t("exams.noMatch") : t("exams.empty")}</Empty>
          ) : (
            <div
              className={cn(
                "grid gap-4",
                view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
              )}
            >
              {filteredExams.map((exam, index) => {
                const examSubject = c.subjects.find((item) => item.id === exam.subject_id);
                const examChapter = c.chapters.find((item) => item.id === exam.chapter_id);
                return (
                  <article
                    key={exam.id}
                    className={cn("card-surface overflow-hidden", view === "list" && "sm:flex")}
                  >
                    <div
                      className={cn(
                        "relative flex h-36 flex-col items-start justify-between bg-gradient-to-br p-4",
                        accentTones[index % accentTones.length],
                        view === "list" && "sm:h-auto sm:w-48 sm:shrink-0",
                      )}
                    >
                      <span className="flex items-center gap-2 rounded-md bg-card px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-deep">
                        PDF {exam.is_demo && <DemoBadge />}
                      </span>
                      <FileText className="h-10 w-10 self-center" strokeWidth={1.8} />
                      <span className="self-center text-[10px] font-medium">
                        {t("exams.pdfAvailable")}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      {examSubject && (
                        <span className="mb-2 w-fit rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-deep">
                          {[name(examSubject), examChapter && name(examChapter)]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                      <h2 className="line-clamp-2 text-sm font-semibold text-heading">
                        {exam.title}
                      </h2>
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        {formatExamYear(exam.exam_year)}
                        {level && <> · {name(level)}</>}
                        {track && <> · {track.code}</>}
                        {exam.session && <> · {exam.session}</>}
                      </p>
                      {exam.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {exam.description}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="mt-4 w-full justify-center gap-2"
                        onClick={() =>
                          openExamFile(exam.file_path, exam.demo_content).catch((error) =>
                            toast.error(errMsg(error)),
                          )
                        }
                      >
                        {t("exams.view")}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      {(me?.isStudent || me?.isTeacher) && me.user.id !== exam.author_id && (
                        <div className="mt-2 flex flex-wrap justify-center gap-1">
                          <ReportContentButton targetType="exam" targetId={exam.id} />
                          <ReportContentButton targetType="user" targetId={exam.author_id} />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
