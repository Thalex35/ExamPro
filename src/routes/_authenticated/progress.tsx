import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  ClipboardCheck,
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
    <div className="relative isolate space-y-4 overflow-hidden sm:space-y-5">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full border-[2.5rem] border-sky-100/60 dark:border-sky-900/20"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -left-28 -z-10 h-72 w-72 rounded-full border-[2rem] border-blue-100/50 dark:border-blue-900/20"
      />
      <header className="relative z-10 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300">
          <ChartNoAxesColumnIncreasing className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-[1.35rem] font-extrabold leading-tight tracking-tight text-heading sm:text-2xl">
            {t("dash.performance")}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {t("progress.subtitle")}
          </p>
        </div>
      </header>

      <section
        aria-label={t("progress.statistics")}
        className="relative z-10 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4"
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

      <section
        className="card-surface relative z-10 overflow-hidden"
        aria-labelledby="subject-performance-heading"
      >
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <ChartNoAxesColumnIncreasing
              className="h-5 w-5 shrink-0 text-brand"
              aria-hidden="true"
            />
            <h2
              id="subject-performance-heading"
              className="truncate text-base font-bold text-heading sm:text-lg"
            >
              {t("progress.bySubject")}
            </h2>
          </div>
          <Link
            to="/subjects"
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/50 dark:text-sky-300 dark:hover:bg-blue-950"
          >
            {t("progress.viewSubjectDetails")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        {subjectStats.length === 0 ? (
          <div className="p-4">
            <Empty>{t("progress.noSubjects")}</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-blue-50 dark:divide-slate-800">
            {subjectStats.map(({ subject, average, count }) => {
              const SubjectIcon = subjectIcons[subject.icon ?? ""] ?? BookOpen;
              return (
                <li key={subject.id} className="px-4 sm:px-5">
                  <a
                    href={average === null ? undefined : `#subject-results-${subject.id}`}
                    aria-disabled={average === null || undefined}
                    className="group grid min-h-[1.875rem] grid-cols-[2rem_minmax(0,1fr)_2.5rem_3.5rem] items-center gap-2 sm:grid-cols-[2rem_minmax(0,1fr)_2.75rem_5.7rem] sm:gap-3"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-blue-600 dark:bg-sky-400/10 dark:text-sky-300">
                      <SubjectIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="truncate text-[13px] font-medium text-heading">
                      {name(subject)}
                    </span>
                    <span className="w-10 text-right text-xs font-semibold text-heading sm:w-12 sm:text-sm">
                      {average === null ? t("progress.noScoreYet") : `${average}%`}
                    </span>
                    <span
                      role="progressbar"
                      aria-label={name(subject)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={average ?? 0}
                      className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700"
                    >
                      <span
                        className="block h-full rounded-full bg-heading transition-[width]"
                        style={{ width: `${average ?? 0}%` }}
                      />
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

      <div className="relative z-10 grid gap-4 md:grid-cols-2">
        <section className="card-surface relative isolate grid min-h-[8.5rem] grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)] items-center overflow-hidden border-blue-100 bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-50 p-3 dark:border-sky-900 dark:from-sky-950/70 dark:via-blue-950/55 dark:to-indigo-950/70 sm:px-4">
          <span
            aria-hidden="true"
            className="absolute -bottom-14 -right-12 -z-10 h-36 w-36 rounded-full border-[1.2rem] border-sky-200/40 dark:border-sky-700/20"
          />
          <EncouragementIllustration />
          <div className="min-w-0 py-1">
            <h2 className="text-base font-extrabold text-heading sm:text-lg">
              {t("progress.encouragementTitle")}
            </h2>
            <p className="mt-1 text-xs leading-[1.45] text-foreground sm:text-[13px]">
              {t("progress.encouragementBody")}
            </p>
            <Button
              asChild
              className="mt-2 h-8 rounded-full bg-slate-950 px-4 text-xs text-white hover:bg-slate-800 dark:bg-sky-100 dark:text-slate-950 dark:hover:bg-white"
            >
              <Link to="/evaluations">
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" aria-hidden="true" />
                {t("progress.viewQuizzes")}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="card-surface relative isolate min-h-[8.5rem] overflow-hidden border-blue-100 bg-gradient-to-br from-sky-50 via-blue-50 to-blue-100 p-3 dark:border-sky-900 dark:from-sky-950/50 dark:via-blue-950/40 dark:to-blue-950/50 sm:px-4">
          <div className="relative z-10 flex items-center gap-2">
            <Lightbulb className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
            <h2 className="text-base font-extrabold text-heading sm:text-lg">
              {t("progress.personalizedAdvice")}
            </h2>
          </div>
          <div className="relative z-10 mt-1.5 flex max-w-[82%] items-start gap-2">
            <Target
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-sky-300"
              aria-hidden="true"
            />
            <p className="text-xs leading-[1.45] text-foreground sm:text-[13px]">
              {!quizAttempts.length
                ? t("progress.adviceNoAttempts")
                : weakestSubject && weakestSubject.average < PASSING_SCORE
                  ? t("progress.adviceLowScore").replace("{subject}", name(weakestSubject.subject))
                  : t("progress.adviceKeepGoing")}
            </p>
          </div>
          <Link
            to="/evaluations"
            className="relative z-10 mt-2 inline-flex h-8 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-sky-100 dark:text-slate-950 dark:hover:bg-white"
          >
            {t("progress.viewQuizzes")} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <BookIllustration />
        </section>
      </div>

      <section
        className="card-surface relative z-10 overflow-hidden"
        aria-labelledby="recent-results-heading"
      >
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-blue-100 px-4 sm:px-5 dark:border-slate-800">
          <h2
            id="recent-results-heading"
            className="flex items-center gap-2 text-base font-bold text-heading sm:text-lg"
          >
            <ClipboardCheck className="h-5 w-5 text-brand" aria-hidden="true" />
            {t("progress.recentResults")}
          </h2>
          {quizAttempts.length > 3 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-sky-300"
              onClick={() => setShowAllResults((value) => !value)}
            >
              {t(showAllResults ? "progress.showRecent" : "progress.viewAll")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        {quizAttempts.length === 0 ? (
          <div className="p-4">
            <Empty>{t("quiz.noAttempts")}</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-blue-50 dark:divide-slate-800">
            {resultsToShow.map((attempt) => {
              const subject = catalog.data.subjects.find((item) => item.id === attempt.subject_id);
              const chapter = catalog.data.chapters.find((item) => item.id === attempt.chapter_id);
              const passed = attempt.score >= PASSING_SCORE;
              return (
                <li
                  key={attempt.id}
                  className="grid gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(12rem,1fr)_auto_auto_auto_minmax(10rem,1.4fr)] sm:items-center sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-400/10 dark:text-sky-300">
                      <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-heading sm:text-sm">
                        {t("progress.quizType")}
                        {subject ? ` - ${name(subject)}` : ""}
                        {chapter ? ` · ${name(chapter)}` : ""}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarDays className="h-3 w-3" aria-hidden="true" />
                        {formatDate(attempt.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="pl-12 text-sm font-bold text-heading sm:pl-0">
                    {attempt.correct_count}/{attempt.total_questions}
                  </span>
                  <span className="pl-12 text-sm font-bold text-blue-700 dark:text-sky-300 sm:pl-0">
                    {attempt.score}%
                  </span>
                  <span
                    className={`ml-12 w-fit rounded-full px-3 py-1 text-[11px] font-semibold sm:ml-0 ${
                      passed
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                    }`}
                  >
                    {t(passed ? "progress.passed" : "progress.needsReview")}
                  </span>
                  <QuizAttemptReview attemptId={attempt.id} lang={lang} t={t} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
  const toneStyles = {
    blue: {
      icon: "bg-blue-100 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300",
      shape: "border-blue-200/70 bg-blue-200/35 dark:border-blue-800/50 dark:bg-blue-900/20",
    },
    green: {
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
      shape:
        "border-emerald-200/70 bg-emerald-200/35 dark:border-emerald-800/50 dark:bg-emerald-900/20",
    },
    sky: {
      icon: "bg-sky-100 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300",
      shape: "border-sky-200/70 bg-sky-200/35 dark:border-sky-800/50 dark:bg-sky-900/20",
    },
    amber: {
      icon: "bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300",
      shape: "border-amber-200/70 bg-amber-200/35 dark:border-amber-800/50 dark:bg-amber-900/20",
    },
  }[tone];
  return (
    <section className="card-surface relative isolate flex min-h-[4.1rem] items-center gap-3 overflow-hidden p-2.5 sm:px-3">
      <span
        aria-hidden="true"
        className={`absolute -bottom-8 -right-4 -z-10 h-16 w-16 rounded-full border-[0.7rem] ${toneStyles.shape}`}
      />
      <span
        aria-hidden="true"
        className={`absolute -bottom-7 right-2 -z-10 h-11 w-11 rounded-full ${toneStyles.shape} opacity-60`}
      />
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneStyles.icon}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="relative min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-extrabold leading-none text-heading">{value}</p>
      </div>
    </section>
  );
}

function BookIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 140 86"
      className="pointer-events-none absolute -bottom-2 -right-1 h-[4.8rem] w-[7.8rem] text-blue-300/70 dark:text-sky-300/25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M70 20C54 10 34 12 14 21L23 73C41 65 56 65 70 76V20Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M70 20C86 10 106 12 126 21L117 73C99 65 84 65 70 76V20Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M70 20V76M30 29C41 25 51 25 60 30M32 40C42 37 51 38 60 42M34 51C43 48 52 49 61 54M110 29C99 25 89 25 80 30M108 40C98 37 89 38 80 42M106 51C97 48 88 49 79 54"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M17 25L26 76M123 25L114 76"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        opacity=".55"
      />
    </svg>
  );
}

function EncouragementIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 150"
      className="h-28 w-full max-w-[19rem] shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="trophy-gold"
          x1="120"
          y1="25"
          x2="202"
          y2="104"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFE65A" />
          <stop offset=".48" stopColor="#FFB900" />
          <stop offset="1" stopColor="#F28C00" />
        </linearGradient>
        <linearGradient
          id="leaf-green"
          x1="88"
          y1="70"
          x2="232"
          y2="126"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A6D92B" />
          <stop offset="1" stopColor="#22A65A" />
        </linearGradient>
      </defs>
      <path
        d="M66 110C80 102 95 92 103 77M254 110C240 102 225 92 217 77"
        stroke="url(#leaf-green)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M79 105C68 98 62 90 59 82M91 96C80 89 76 81 75 73M102 85C94 77 92 69 93 62M241 105C252 98 258 90 261 82M229 96C240 89 244 81 245 73M218 85C226 77 228 69 227 62"
        stroke="url(#leaf-green)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="67" cy="94" rx="5" ry="12" transform="rotate(-43 67 94)" fill="#8CCB28" />
      <ellipse cx="80" cy="84" rx="5" ry="12" transform="rotate(-35 80 84)" fill="#56BB45" />
      <ellipse cx="96" cy="73" rx="5" ry="12" transform="rotate(-25 96 73)" fill="#9BD22B" />
      <ellipse cx="78" cy="103" rx="5" ry="12" transform="rotate(-62 78 103)" fill="#24A85B" />
      <ellipse cx="91" cy="94" rx="5" ry="12" transform="rotate(-52 91 94)" fill="#70C442" />
      <ellipse cx="107" cy="82" rx="5" ry="12" transform="rotate(-42 107 82)" fill="#55B958" />
      <ellipse cx="253" cy="94" rx="5" ry="12" transform="rotate(43 253 94)" fill="#8CCB28" />
      <ellipse cx="240" cy="84" rx="5" ry="12" transform="rotate(35 240 84)" fill="#56BB45" />
      <ellipse cx="224" cy="73" rx="5" ry="12" transform="rotate(25 224 73)" fill="#9BD22B" />
      <ellipse cx="242" cy="103" rx="5" ry="12" transform="rotate(62 242 103)" fill="#24A85B" />
      <ellipse cx="229" cy="94" rx="5" ry="12" transform="rotate(52 229 94)" fill="#70C442" />
      <ellipse cx="213" cy="82" rx="5" ry="12" transform="rotate(42 213 82)" fill="#55B958" />
      <path
        d="M127 33H193V59C193 80 179 97 160 102C141 97 127 80 127 59V33Z"
        fill="url(#trophy-gold)"
        stroke="#F59E0B"
        strokeWidth="3"
      />
      <path
        d="M127 43H113C104 43 101 52 106 60C110 67 119 70 131 70M193 43H207C216 43 219 52 214 60C210 67 201 70 189 70"
        stroke="#F5A000"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M127 43H115C110 43 109 49 112 54C115 59 121 62 130 63M193 43H205C210 43 211 49 208 54C205 59 199 62 190 63"
        stroke="#FFD43B"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M160 46L164 55L174 56L167 63L169 73L160 68L151 73L153 63L146 56L156 55L160 46Z"
        fill="#FFF2A6"
      />
      <path d="M151 99V111M169 99V111" stroke="#E89100" strokeWidth="8" strokeLinecap="round" />
      <path d="M144 112H176" stroke="#E89100" strokeWidth="8" strokeLinecap="round" />
      <path d="M136 121H184L190 130H130L136 121Z" fill="#14233D" />
      <path d="M132 131H188" stroke="#F5A000" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M98 31L100 37L106 39L100 41L98 47L96 41L90 39L96 37L98 31ZM222 31L224 37L230 39L224 41L222 47L220 41L214 39L220 37L222 31ZM113 53L115 57L119 59L115 61L113 65L111 61L107 59L111 57L113 53ZM207 53L209 57L213 59L209 61L207 65L205 61L201 59L205 57L207 53Z"
        fill="#16B8E8"
      />
      <path
        d="M84 55L86 61L92 63L86 65L84 71L82 65L76 63L82 61L84 55ZM236 55L238 61L244 63L238 65L236 71L234 65L228 63L234 61L236 55Z"
        fill="#F9C400"
      />
    </svg>
  );
}

function QuizAttemptReview({
  attemptId,
  lang,
  t,
}: {
  attemptId: string;
  lang: "fr" | "ht";
  t: ReturnType<typeof useI18n>["t"];
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
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className="inline-flex items-center gap-1 border-l border-blue-100 pl-4 text-left text-[11px] font-medium text-blue-700 hover:underline dark:border-slate-700 dark:text-sky-300 sm:ml-2"
      >
        {t(open ? "progress.hideAnswers" : "progress.viewAllAnswers")}
        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <div className="col-span-full space-y-3 border-t border-border pt-3">
          {isLoading ? (
            <Loading />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : !result ? (
            <p className="text-sm text-destructive">{t("quiz.historyUnavailable")}</p>
          ) : (
            <ol className="space-y-3 pt-1">
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
          )}
        </div>
      )}
    </>
  );
}
