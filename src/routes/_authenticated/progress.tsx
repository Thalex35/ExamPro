import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, ChartNoAxesColumn, Clock3 } from "lucide-react";
import { DemoBadge } from "@/components/DemoBadge";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { Button } from "@/components/ui/button";
import { demoRecordsQuery } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { parseDemoQuizResult } from "@/lib/demo-quiz";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Ma progression — EXAMPRO" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const { t, lang, name } = useI18n();
  const { data: me } = useMe();
  const records = useQuery(
    demoRecordsQuery(me?.profile?.level_id, me?.profile?.track_id, "progress"),
  );
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
  if (records.isLoading || catalog.isLoading || attempts.isLoading) return <Loading />;
  if (catalog.error || !catalog.data)
    return <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />;
  if (attempts.error)
    return <ErrorState error={attempts.error} onRetry={() => void attempts.refetch()} />;
  const items = records.data ?? [];
  const quizAttempts = attempts.data ?? [];
  const groupedAttempts = new Map<string, typeof quizAttempts>();
  for (const attempt of quizAttempts) {
    const key = `${attempt.subject_id}:${attempt.chapter_id ?? ""}`;
    groupedAttempts.set(key, [...(groupedAttempts.get(key) ?? []), attempt]);
  }
  const averageScore = quizAttempts.length
    ? Math.round(
        quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / quizAttempts.length,
      )
    : 0;
  const bestScore = quizAttempts.length
    ? Math.max(...quizAttempts.map((attempt) => attempt.score))
    : 0;
  return (
    <div>
      <PageHeader title={t("dash.performance")} subtitle={t("demo.progressDescription")} />
      <div className="space-y-8">
        {me?.isStudent && (
          <section aria-labelledby="quiz-performance-title" className="space-y-4">
            <div>
              <h2 id="quiz-performance-title" className="text-xl font-bold text-heading">
                {t("quiz.performanceTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("quiz.performanceDescription")}
              </p>
            </div>
            {quizAttempts.length === 0 ? (
              <Empty>{t("quiz.noAttempts")}</Empty>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label={t("quiz.attemptCount")} value={quizAttempts.length} />
                  <Metric label={t("quiz.averageScore")} value={`${averageScore}%`} />
                  <Metric label={t("quiz.bestScore")} value={`${bestScore}%`} />
                </div>
                <div className="space-y-4">
                  {[...groupedAttempts.entries()].map(([key, group]) => {
                    const latest = group[0]!;
                    const subject = catalog.data.subjects.find(
                      (item) => item.id === latest.subject_id,
                    );
                    const chapter = latest.chapter_id
                      ? catalog.data.chapters.find((item) => item.id === latest.chapter_id)
                      : undefined;
                    const groupAverage = Math.round(
                      group.reduce((sum, attempt) => sum + attempt.score, 0) / group.length,
                    );
                    return (
                      <section key={key} className="card-surface overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                          <div>
                            <h3 className="font-semibold text-heading">
                              {[
                                subject ? name(subject) : t("quiz.unknownSubject"),
                                chapter && name(chapter),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {group.length} · {t("quiz.averageScore")} {groupAverage}%
                            </p>
                          </div>
                          {subject && (
                            <Link
                              to="/subjects/$subjectId"
                              params={{ subjectId: subject.id }}
                              search={{
                                resource: "quiz",
                                chapter: chapter?.id,
                              }}
                              className="text-sm font-semibold text-deep hover:underline"
                            >
                              {t("quiz.retake")}
                            </Link>
                          )}
                        </div>
                        <ul className="divide-y">
                          {group.map((attempt) => (
                            <li key={attempt.id} className="p-4">
                              <QuizAttemptReview
                                attemptId={attempt.id}
                                createdAt={attempt.created_at}
                                score={attempt.score}
                                correctCount={attempt.correct_count}
                                totalQuestions={attempt.total_questions}
                                lang={lang}
                                t={t}
                              />
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold text-heading">{t("demo.recentActivity")}</h2>
          {records.error ? (
            <ErrorState error={records.error} onRetry={() => void records.refetch()} />
          ) : !items.length ? (
            <Empty>{t("demo.progressEmpty")}</Empty>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="card-surface p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-deep">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-3xl font-bold text-heading">{items.length}</p>
                  <p className="text-sm text-muted-foreground">{t("demo.itemsViewed")}</p>
                </section>
                <section className="card-surface p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-deep">
                    <ChartNoAxesColumn className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-heading">{t("demo.mockMetrics")}</p>
                  <p className="text-sm text-muted-foreground">{t("demo.notRealPerformance")}</p>
                </section>
              </div>
              <div className="card-surface divide-y">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    to="/courses/$courseId"
                    params={{ courseId: item.course_id! }}
                    className="flex flex-wrap items-center gap-3 p-4 hover:bg-muted/40"
                  >
                    <Clock3 className="h-4 w-4 text-deep" />
                    <span className="min-w-0 flex-1 font-medium text-heading">{item.title}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(item.occurred_at).toLocaleDateString()}
                    </span>
                    <DemoBadge />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-heading">{value}</p>
    </div>
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
}: {
  attemptId: string;
  createdAt: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 text-sm font-medium text-heading">
          {new Date(createdAt).toLocaleString(lang === "ht" ? "fr-HT" : "fr-FR")}
        </span>
        <span className="rounded-full bg-brand px-3 py-1 text-sm font-bold text-brand-foreground">
          {score}%
        </span>
        <span className="text-xs text-muted-foreground">
          {correctCount}/{totalQuestions}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          {t("quiz.reviewAnswers")}
        </Button>
      </div>
      {open &&
        (isLoading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !result ? (
          <p className="mt-3 text-sm text-destructive">{t("quiz.historyUnavailable")}</p>
        ) : (
          <ol className="mt-4 space-y-3 border-t pt-4">
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
