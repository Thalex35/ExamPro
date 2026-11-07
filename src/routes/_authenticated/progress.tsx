import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  CircleCheck,
  Lightbulb,
  Play,
  Star,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, ErrorState, Loading } from "@/components/States";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, subjectsFor } from "@/lib/catalog";
import { parseDemoQuizResult } from "@/lib/demo-quiz";
import { subjectIcons } from "@/lib/subject-icons";
import { useI18n } from "@/lib/i18n";
import { useFavoriteIds } from "@/lib/favorites";
import { useMe } from "@/lib/session";

const PASSING_SCORE = 70;

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Ma progression — EXAMPRO" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const { t, lang, name } = useI18n();
  const { data: me } = useMe();
  const [showAllResults, setShowAllResults] = useState(false);
  const catalog = useQuery(catalogQuery);
  const attempts = useQuery({
    queryKey: ["quiz-attempts", me?.user.id],
    enabled: !!me?.user.id && !!me.isStudent,
    queryFn: async () => {
      if (!me?.user.id) return [];
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id,subject_id,chapter_id,score,correct_count,total_questions,created_at")
        .eq("student_id", me.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const completedCourses = useQuery({
    queryKey: ["completed-courses-count", me?.user.id],
    enabled: !!me?.user.id && !!me.isStudent,
    queryFn: async () => {
      if (!me?.user.id) return [];
      const { data, error } = await supabase
        .from("course_progress")
        .select("course_id")
        .eq("student_id", me.user.id)
        .not("completed_at", "is", null);
      if (error) throw error;
      return data;
    },
  });
  const courseFavorites = useFavoriteIds("course", me?.isStudent ? me.user.id : undefined);
  const examFavorites = useFavoriteIds("exam", me?.isStudent ? me.user.id : undefined);

  if (
    catalog.isLoading ||
    attempts.isLoading ||
    completedCourses.isLoading ||
    courseFavorites.isLoading ||
    examFavorites.isLoading
  )
    return <Loading />;
  if (catalog.error || !catalog.data)
    return <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />;
  if (attempts.error)
    return <ErrorState error={attempts.error} onRetry={() => void attempts.refetch()} />;
  if (completedCourses.error)
    return (
      <ErrorState error={completedCourses.error} onRetry={() => void completedCourses.refetch()} />
    );
  if (courseFavorites.error)
    return (
      <ErrorState error={courseFavorites.error} onRetry={() => void courseFavorites.refetch()} />
    );
  if (examFavorites.error)
    return <ErrorState error={examFavorites.error} onRetry={() => void examFavorites.refetch()} />;

  const allowedSubjects = subjectsFor(catalog.data, me?.profile?.level_id, me?.profile?.track_id);
  const allowedSubjectIds = new Set(allowedSubjects.map((subject) => subject.id));
  const quizAttempts = (attempts.data ?? []).filter((attempt) =>
    allowedSubjectIds.has(attempt.subject_id),
  );
  const averageScore = quizAttempts.length
    ? Math.round(
        quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / quizAttempts.length,
      )
    : null;
  const subjectStats = allowedSubjects.map((subject) => {
    const subjectAttempts = quizAttempts.filter((attempt) => attempt.subject_id === subject.id);
    return {
      subject,
      count: subjectAttempts.length,
      average: subjectAttempts.length
        ? Math.round(
            subjectAttempts.reduce((sum, attempt) => sum + attempt.score, 0) /
              subjectAttempts.length,
          )
        : null,
    };
  });
  const scoredSubjects = subjectStats.filter(
    (item): item is typeof item & { average: number } => item.average !== null,
  );
  const weakestSubject = scoredSubjects.reduce<(typeof scoredSubjects)[number] | null>(
    (lowest, current) => (!lowest || current.average < lowest.average ? current : lowest),
    null,
  );
  const favoriteCount = (courseFavorites.data?.length ?? 0) + (examFavorites.data?.length ?? 0);
  const resultsToShow = showAllResults ? quizAttempts : quizAttempts.slice(0, 3);
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(lang === "ht" ? "fr-HT" : "fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <ChartNoAxesColumnIncreasing className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-heading sm:text-3xl">
            {t("dash.performance")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {t("progress.subtitle")}
          </p>
        </div>
      </header>

      <section
        aria-label={t("progress.statistics")}
        className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4"
      >
        <StatCard
          icon={Trophy}
          label={t("progress.averageScore")}
          value={averageScore === null ? "—" : `${averageScore}%`}
          tone="blue"
        />
        <StatCard
          icon={CircleCheck}
          label={t("progress.completedQuizzes")}
          value={quizAttempts.length}
          tone="green"
        />
        <StatCard
          icon={Play}
          label={t("progress.completedCourses")}
          value={completedCourses.data?.length ?? 0}
          tone="sky"
        />
        <StatCard icon={Star} label={t("progress.favorites")} value={favoriteCount} tone="amber" />
      </section>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.95fr)]">
        <section className="card-surface p-5 sm:p-6" aria-labelledby="subject-performance-heading">
          <div className="mb-5 flex items-center gap-3">
            <ChartNoAxesColumnIncreasing className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 id="subject-performance-heading" className="text-lg font-bold text-heading">
              {t("progress.bySubject")}
            </h2>
          </div>
          {subjectStats.length === 0 ? (
            <Empty>{t("progress.noSubjects")}</Empty>
          ) : (
            <ul className="space-y-4">
              {subjectStats.map(({ subject, average, count }) => {
                const SubjectIcon = subjectIcons[subject.icon ?? ""] ?? BookOpen;
                return (
                  <li key={subject.id}>
                    <a
                      href={average === null ? undefined : `#subject-results-${subject.id}`}
                      aria-disabled={average === null || undefined}
                      className="group grid grid-cols-[2.5rem_minmax(0,1fr)_3.25rem] items-center gap-3 rounded-xl p-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[2.5rem_minmax(8rem,0.8fr)_minmax(4rem,1.6fr)_3.25rem]"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        <SubjectIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="truncate text-sm font-medium text-heading">
                        {name(subject)}
                      </span>
                      <span className="col-start-2 h-2 overflow-hidden rounded-full bg-muted sm:col-start-auto">
                        <span
                          className="block h-full rounded-full bg-primary transition-[width]"
                          style={{ width: `${average ?? 0}%` }}
                        />
                      </span>
                      <span className="col-start-3 row-start-1 text-right text-sm font-bold text-heading">
                        {average === null ? t("progress.noScoreYet") : `${average}%`}
                      </span>
                      {count > 0 && (
                        <span className="sr-only">
                          {count} {t("progress.completedQuizzes")}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card-surface flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 p-6 text-center dark:from-sky-950/50 dark:via-blue-950/40 dark:to-indigo-950/50 sm:p-8">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-500 shadow-sm dark:bg-amber-400/10 dark:text-amber-300">
            <Trophy className="h-11 w-11" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-heading">
            {t("progress.encouragementTitle")}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {t("progress.encouragementBody")}
          </p>
          <Button asChild className="mt-5 rounded-full px-5">
            <Link to="/evaluations">
              <Play className="mr-2 h-4 w-4 fill-current" aria-hidden="true" />
              {t("progress.viewQuizzes")}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,1fr)]">
        <section className="card-surface overflow-hidden" aria-labelledby="recent-results-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-5">
            <h2
              id="recent-results-heading"
              className="flex items-center gap-2 text-lg font-bold text-heading"
            >
              <Trophy className="h-5 w-5 text-brand" aria-hidden="true" />
              {t("progress.recentResults")}
            </h2>
            {quizAttempts.length > 3 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                onClick={() => setShowAllResults((value) => !value)}
              >
                {t(showAllResults ? "progress.showRecent" : "progress.viewAll")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {quizAttempts.length === 0 ? (
            <div className="p-5">
              <Empty>{t("quiz.noAttempts")}</Empty>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {resultsToShow.map((attempt) => {
                const subject = catalog.data.subjects.find(
                  (item) => item.id === attempt.subject_id,
                );
                const chapter = catalog.data.chapters.find(
                  (item) => item.id === attempt.chapter_id,
                );
                const passed = attempt.score >= PASSING_SCORE;
                return (
                  <li key={attempt.id} className="p-4 sm:px-5">
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="min-w-0 flex-1 text-sm font-semibold text-heading">
                        {t("progress.quizType")}
                        {subject ? ` · ${name(subject)}` : ""}
                        {chapter ? ` · ${name(chapter)}` : ""}
                      </span>
                      <span className="font-bold text-heading">
                        {attempt.correct_count}/{attempt.total_questions}
                      </span>
                      <span className="font-bold text-primary">{attempt.score}%</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          passed
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                        }`}
                      >
                        {t(passed ? "progress.passed" : "progress.needsReview")}
                      </span>
                    </div>
                    <QuizAttemptReview
                      attemptId={attempt.id}
                      createdAt={attempt.created_at}
                      score={attempt.score}
                      correctCount={attempt.correct_count}
                      totalQuestions={attempt.total_questions}
                      lang={lang}
                      t={t}
                      formatDate={formatDate}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card-surface relative isolate overflow-hidden bg-gradient-to-br from-sky-50 to-blue-100 p-5 dark:from-sky-950/50 dark:to-blue-950/40 sm:p-6">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 className="text-lg font-bold text-heading">{t("progress.personalizedAdvice")}</h2>
          </div>
          <div className="relative z-10 mt-5 flex items-start gap-3">
            <Target className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-foreground">
              {!quizAttempts.length
                ? t("progress.adviceNoAttempts")
                : weakestSubject && weakestSubject.average < PASSING_SCORE
                  ? t("progress.adviceLowScore").replace("{subject}", name(weakestSubject.subject))
                  : t("progress.adviceKeepGoing")}
            </p>
          </div>
          <Link
            to="/evaluations"
            className="relative z-10 mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("progress.viewQuizzes")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <BookOpen
            className="absolute -bottom-3 -right-2 -z-10 h-24 w-24 rotate-[-12deg] text-primary/10"
            aria-hidden="true"
          />
        </section>
      </div>

      {quizAttempts.length > 0 && (
        <section className="space-y-4" aria-label={t("progress.detailedHistory")}>
          <div>
            <h2 className="text-xl font-bold text-heading">{t("progress.detailedHistory")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("progress.detailedHistoryHint")}
            </p>
          </div>
          {subjectStats
            .filter(({ count }) => count > 0)
            .map(({ subject, count, average }) => {
              const SubjectIcon = subjectIcons[subject.icon ?? ""] ?? BookOpen;
              const subjectAttempts = quizAttempts.filter(
                (attempt) => attempt.subject_id === subject.id,
              );
              return (
                <section
                  key={subject.id}
                  id={`subject-results-${subject.id}`}
                  className="card-surface scroll-mt-24 overflow-hidden"
                >
                  <div className="flex items-center gap-3 border-b border-border p-4">
                    <SubjectIcon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="flex-1 font-semibold text-heading">{name(subject)}</h3>
                    <span className="text-sm text-muted-foreground">
                      {count} · {average}%
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {subjectAttempts.map((attempt) => (
                      <li key={attempt.id} className="flex flex-wrap items-center gap-2 p-4">
                        <span className="min-w-0 flex-1 text-sm text-heading">
                          {formatDate(attempt.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                          {attempt.correct_count}/{attempt.total_questions}
                        </span>
                        <span className="font-bold text-primary">{attempt.score}%</span>
                        {attempt.score >= PASSING_SCORE ? (
                          <CheckCircle2
                            className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                            aria-label={t("progress.passed")}
                          />
                        ) : (
                          <Lightbulb
                            className="h-4 w-4 text-amber-600 dark:text-amber-400"
                            aria-label={t("progress.needsReview")}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone: "blue" | "green" | "sky" | "amber";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300",
    green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
    sky: "bg-sky-100 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300",
  }[tone];
  return (
    <section className="card-surface flex min-h-24 items-center gap-3 p-4 sm:gap-4 sm:p-5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-extrabold leading-none text-heading">{value}</p>
      </div>
    </section>
  );
}

function QuizAttemptReview({
  attemptId,
  createdAt,
  score,
  correctCount,
  totalQuestions,
  lang,
  t,
  formatDate,
}: {
  attemptId: string;
  createdAt: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  lang: "fr" | "ht";
  t: ReturnType<typeof useI18n>["t"];
  formatDate: (date: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["quiz-attempt-review", attemptId],
    enabled: open,
    queryFn: async () => {
      const { data: attempt, error: queryError } = await supabase
        .from("quiz_attempts")
        .select("results")
        .eq("id", attemptId)
        .maybeSingle();
      if (queryError) throw queryError;
      if (!attempt) throw new Error("QUIZ_HISTORY_NOT_FOUND");
      return attempt.results;
    },
  });
  let result: ReturnType<typeof parseDemoQuizResult> | null = null;
  if (data) {
    try {
      result = parseDemoQuizResult(data);
    } catch {
      result = null;
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex flex-1 items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDate(createdAt)}
        </span>
        <span className="text-xs text-muted-foreground">
          {correctCount}/{totalQuestions}
        </span>
        <span className="text-xs font-semibold text-heading">{score}%</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          {t(open ? "progress.hideAnswers" : "progress.viewAnswers")}
        </Button>
      </div>
      {open &&
        (isLoading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !result ? (
          <p className="text-sm text-destructive">{t("quiz.historyUnavailable")}</p>
        ) : (
          <ol className="space-y-3 border-t border-border pt-4">
            {result.results.map((item, index) => {
              const options = lang === "ht" ? item.options_ht : item.options_fr;
              return (
                <li key={`${item.id}-${index}`} className="rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="font-medium text-heading">
                    {index + 1}. {lang === "ht" ? item.question_ht : item.question_fr}
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    {t("quiz.yourAnswer")}: {options[item.selected_index]}
                  </p>
                  <p className="text-muted-foreground">
                    {t("quiz.correctAnswer")}: {options[item.correct_index]}
                  </p>
                  <p className="mt-2 leading-relaxed">
                    {lang === "ht" ? item.explanation_ht : item.explanation_fr}
                  </p>
                </li>
              );
            })}
          </ol>
        ))}
    </div>
  );
}
