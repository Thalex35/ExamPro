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

        <section className="card-surface flex min-h-60 flex-col items-center justify-center rounded-2xl border-sky-100 bg-gradient-to-br from-sky-100 via-blue-50 to-blue-100 p-4 text-center dark:border-sky-900 dark:from-sky-950/70 dark:via-blue-950/55 dark:to-indigo-950/70 sm:p-5">
          <EncouragementIllustration />
          <h2 className="mt-1 text-lg font-extrabold text-heading">
            {t("progress.encouragementTitle")}
          </h2>
          <p className="mt-1 max-w-xs text-sm leading-5 text-muted-foreground">
            {t("progress.encouragementBody")}
          </p>
          <Button
            asChild
            className="mt-3 h-9 rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-sky-100 dark:text-slate-950 dark:hover:bg-white"
          >
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
