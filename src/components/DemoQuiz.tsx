import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Circle,
  CloudCheck,
  Flag,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState, Loading } from "@/components/States";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  parseDemoQuizQuestions,
  parseDemoQuizResult,
  type DemoQuestion,
  type DemoResult,
} from "@/lib/demo-quiz";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

type QuizDraft = {
  answers: Record<string, number>;
  currentQuestion: number;
};

const draftPrefix = "exampro.quiz-draft.v1";

function readDraft(key: string, questions: DemoQuestion[]): QuizDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const draft: unknown = JSON.parse(raw);
    if (typeof draft !== "object" || draft === null) return null;
    const value = draft as Partial<QuizDraft>;
    const validIds = new Set(questions.map((question) => question.id));
    const answers: Record<string, number> = {};
    for (const [questionId, optionIndex] of Object.entries(value.answers ?? {})) {
      if (
        validIds.has(questionId) &&
        Number.isInteger(optionIndex) &&
        optionIndex >= 0 &&
        optionIndex < 4
      ) {
        answers[questionId] = optionIndex;
      }
    }
    return {
      answers,
      currentQuestion:
        Number.isInteger(value.currentQuestion) &&
        value.currentQuestion! >= 0 &&
        value.currentQuestion! < questions.length
          ? value.currentQuestion!
          : 0,
    };
  } catch {
    return null;
  }
}

export function DemoQuiz({
  subjectId,
  chapterId,
  title,
}: {
  subjectId: string;
  chapterId?: string;
  title: string;
}) {
  const { t, lang, errMsg } = useI18n();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftUnavailable, setDraftUnavailable] = useState(false);
  const storageKey = me?.user.id
    ? `${draftPrefix}:${me.user.id}:${subjectId}:${chapterId ?? "subject"}`
    : null;
  const quiz = useQuery({
    queryKey: ["demo-quiz", subjectId, chapterId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_demo_quiz", {
        _subject_id: subjectId,
        _chapter_id: chapterId ?? null,
      });
      if (error) throw error;
      return parseDemoQuizQuestions(data);
    },
  });

  useEffect(() => {
    setAnswers({});
    setCurrentIndex(0);
    setReviewing(false);
    setResult(null);
    setDraftSaved(false);
    setDraftUnavailable(false);
    if (!storageKey || !quiz.data) {
      setDraftReady(true);
      return;
    }
    setDraftReady(false);
    const draft = readDraft(storageKey, quiz.data);
    if (draft) {
      setAnswers(draft.answers);
      setCurrentIndex(draft.currentQuestion);
    }
    setDraftReady(true);
  }, [storageKey, quiz.data]);

  const answeredCount =
    quiz.data?.filter((question) => Number.isInteger(answers[question.id])).length ?? 0;
  const allAnswered = !!quiz.data && answeredCount === quiz.data.length;

  useEffect(() => {
    if (!storageKey || !quiz.data || !draftReady || result) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ answers, currentQuestion: currentIndex } satisfies QuizDraft),
      );
      setDraftSaved(true);
      setDraftUnavailable(false);
    } catch {
      setDraftSaved(false);
      setDraftUnavailable(true);
    }
  }, [answers, currentIndex, draftReady, quiz.data, result, storageKey]);

  const hasUnsavedAnswers = answeredCount > 0 && !result;
  useBlocker({
    shouldBlockFn: () => hasUnsavedAnswers && !window.confirm(t("quiz.exitConfirm")),
    enableBeforeUnload: () => hasUnsavedAnswers,
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const questions = quiz.data ?? [];
    if (questions.length !== 10 || !allAnswered) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("submit_demo_quiz", {
        _subject_id: subjectId,
        _chapter_id: chapterId ?? null,
        _answers: questions.map((question) => ({
          question_id: question.id,
          selected_index: answers[question.id],
        })),
      });
      if (error) throw error;
      const scoredResult = parseDemoQuizResult(data);
      if (storageKey) {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // A stale local draft is safer to retain than to fail a scored attempt.
        }
      }
      setResult(scoredResult);
      await queryClient.invalidateQueries({ queryKey: ["quiz-attempts"] });
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function reportQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = quiz.data?.[currentIndex];
    if (!question || !me?.user.email || reporting) return;

    setReporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("contact", {
        body: {
          name:
            [me.profile?.first_name, me.profile?.last_name].filter(Boolean).join(" ") ||
            me.profile?.full_name ||
            me.user.email,
          email: me.user.email,
          message: [
            `Quiz issue report: ${title}`,
            `Subject ID: ${subjectId}`,
            `Chapter ID: ${chapterId ?? "none"}`,
            `Question ${currentIndex + 1}: ${getText(question.question_fr, question.question_ht)}`,
            `Issue: ${t("quiz.reportCategory")}`,
            `Details: ${reportDetails.trim()}`,
          ].join("\n"),
        },
      });
      if (error) throw error;
      if (!data || data.success !== true) throw new Error("Report submission was not confirmed.");
      toast.success(t("quiz.reportSent"));
      setReportDetails("");
      setReportOpen(false);
    } catch {
      toast.error(t("quiz.reportError"));
    } finally {
      setReporting(false);
    }
  }

  if (quiz.isLoading) return <Loading />;
  if (quiz.error || !quiz.data)
    return <ErrorState error={quiz.error} onRetry={() => void quiz.refetch()} />;

  const getText = (fr: string, ht: string) => (lang === "ht" ? ht : fr);
  const options = (question: DemoQuestion) =>
    lang === "ht" ? question.options_ht : question.options_fr;
  const question = quiz.data[currentIndex]!;
  const progress = ((currentIndex + 1) / quiz.data.length) * 100;

  return (
    <section className="space-y-5" aria-labelledby="demo-quiz-title">
      <header className="card-surface space-y-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground sm:flex">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-deep">
                {t("quiz.demoLabel")} · {title}
              </p>
              <h2 id="demo-quiz-title" className="text-xl font-bold text-heading sm:text-2xl">
                {t("quiz.title")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("quiz.description")}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {quiz.data.length} {t("quiz.questions")}
              </span>
            </div>
          </div>
          <Button asChild type="button" variant="outline" size="sm">
            <Link
              to="/subjects/$subjectId"
              params={{ subjectId }}
              search={chapterId ? { chapter: chapterId } : {}}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("quiz.exit")}
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-heading">
                {t("quiz.question")} {currentIndex + 1} {t("quiz.of")} {quiz.data.length}
              </span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={t("quiz.progress")}
              aria-valuemin={0}
              aria-valuemax={quiz.data.length}
              aria-valuenow={currentIndex + 1}
              className="h-2.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-brand transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {answeredCount} / {quiz.data.length} {t("quiz.questionsAnswered")}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 ${
                  !storageKey || draftUnavailable ? "text-warning" : "text-success"
                }`}
                role="status"
              >
                {draftSaved && !draftUnavailable && (
                  <CloudCheck className="h-4 w-4" aria-hidden="true" />
                )}
                {t(
                  !storageKey || draftUnavailable
                    ? "quiz.autoSaveUnavailable"
                    : draftSaved
                      ? "quiz.autoSaved"
                      : "quiz.autoSaving",
                )}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-64">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
              <Clock3 className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-heading">10 {t("quiz.minutes")}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {t("quiz.estimatedDuration")}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
              <Trophy className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-heading">
                  {quiz.data.length} {t("quiz.points")}
                </span>
                <span className="block text-[11px] text-muted-foreground">{t("quiz.total")}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {result ? (
        <div className="space-y-5">
          <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <h3 className="text-lg font-bold text-heading">{t("quiz.resultTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.correct_count} / {result.total} {t("quiz.correctAnswers")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-primary px-4 py-2 text-lg font-bold text-primary-foreground">
                {result.score}%
              </span>
              <Button asChild type="button" variant="outline">
                <Link to="/progress">{t("quiz.viewProgress")}</Link>
              </Button>
            </div>
          </div>
          <ol className="space-y-4">
            {result.results.map((item, index) => (
              <li key={item.id} className="card-surface space-y-3 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  {item.is_correct ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-heading">
                      {index + 1}. {getText(item.question_fr, item.question_ht)}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("quiz.yourAnswer")}: {options(item)[item.selected_index]}
                    </p>
                    {!item.is_correct && (
                      <p className="mt-1 text-sm font-medium text-heading">
                        {t("quiz.correctAnswer")}: {options(item)[item.correct_index]}
                      </p>
                    )}
                    <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm leading-relaxed">
                      {getText(item.explanation_fr, item.explanation_ht)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAnswers({});
              setCurrentIndex(0);
              setReviewing(false);
              setResult(null);
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("quiz.tryAgain")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="card-surface h-fit space-y-3 p-4">
            <div>
              <h3 className="font-bold text-heading">{t("quiz.questionNavigation")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {answeredCount} / 10 {t("quiz.questionsAnswered")}
              </p>
            </div>
            <nav
              aria-label={t("quiz.questionNavigation")}
              className="grid grid-cols-5 gap-2 lg:grid-cols-2"
            >
              {quiz.data.map((item, index) => {
                const isAnswered = Number.isInteger(answers[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`${t("quiz.question")} ${index + 1}${isAnswered ? `, ${t("quiz.answered")}` : `, ${t("quiz.unanswered")}`}`}
                    aria-current={index === currentIndex ? "step" : undefined}
                    aria-pressed={index === currentIndex}
                    onClick={() => {
                      setReviewing(false);
                      setCurrentIndex(index);
                    }}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      index === currentIndex
                        ? "border-primary bg-primary text-primary-foreground ring-1 ring-primary"
                        : isAnswered
                          ? "border-success/50 bg-success/10 text-heading hover:bg-success/15"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {isAnswered ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {index + 1}
                  </button>
                );
              })}
            </nav>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setReviewing(true)}
            >
              {t("quiz.reviewBeforeSubmit")}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </aside>

          <main className="min-w-0">
            {reviewing ? (
              <form
                onSubmit={(event) => void submit(event)}
                className="card-surface space-y-5 p-5 sm:p-7"
              >
                <div>
                  <h3 className="text-xl font-bold text-heading">{t("quiz.summaryTitle")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("quiz.summaryDescription")}
                  </p>
                </div>
                <p
                  className={`rounded-xl p-3 text-sm ${allAnswered ? "bg-success/10 text-success" : "bg-warning/10 text-heading"}`}
                  role="status"
                >
                  {allAnswered
                    ? t("quiz.allAnswered")
                    : `${quiz.data.length - answeredCount} ${t("quiz.unansweredRemaining")}`}
                </p>
                <ol className="divide-y divide-border">
                  {quiz.data.map((item, index) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="flex min-w-0 gap-3">
                        <span className="font-bold text-deep">{index + 1}.</span>
                        <div className="min-w-0">
                          <p className="font-medium text-heading">
                            {getText(item.question_fr, item.question_ht)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {Number.isInteger(answers[item.id])
                              ? options(item)[answers[item.id]!]
                              : t("quiz.notAnswered")}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReviewing(false);
                          setCurrentIndex(index);
                        }}
                      >
                        {t("quiz.editAnswer")}
                      </Button>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
                  <Button type="button" variant="outline" onClick={() => setReviewing(false)}>
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t("quiz.backToQuestions")}
                  </Button>
                  <Button type="submit" disabled={submitting || !allAnswered}>
                    {submitting ? t("common.loading") : t("quiz.submit")}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="card-surface space-y-6 p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-deep">
                      {t("quiz.singleChoice")} · 1 {t("quiz.points")}
                    </p>
                    <h3 className="mt-3 text-lg font-bold leading-relaxed text-heading sm:text-xl">
                      {getText(question.question_fr, question.question_ht)}
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReportOpen(true)}
                  >
                    <Flag className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t("quiz.reportProblem")}
                  </Button>
                </div>
                <p className="-mt-3 text-sm text-muted-foreground">{t("quiz.selectOne")}</p>
                <fieldset className="space-y-3">
                  <legend className="sr-only">
                    {getText(question.question_fr, question.question_ht)}
                  </legend>
                  {options(question).map((option, optionIndex) => {
                    const selected = answers[question.id] === optionIndex;
                    return (
                      <label
                        key={`${question.id}-${optionIndex}`}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring ${
                          selected
                            ? "border-brand bg-primary/10 text-heading ring-1 ring-brand"
                            : "border-border bg-card text-foreground hover:border-brand/60 hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={optionIndex}
                          checked={selected}
                          onChange={() =>
                            setAnswers((previous) => ({
                              ...previous,
                              [question.id]: optionIndex,
                            }))
                          }
                          className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                        />
                        <span className="leading-relaxed">{option}</span>
                        {selected && (
                          <CheckCircle2
                            className="ml-auto h-4 w-4 shrink-0 text-deep"
                            aria-hidden="true"
                          />
                        )}
                      </label>
                    );
                  })}
                </fieldset>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t("quiz.previous")}
                  </Button>
                  {currentIndex < quiz.data.length - 1 ? (
                    <Button
                      type="button"
                      onClick={() =>
                        setCurrentIndex((index) => Math.min(index + 1, quiz.data!.length - 1))
                      }
                    >
                      {t("quiz.next")}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => setReviewing(true)}>
                      {t("quiz.reviewBeforeSubmit")}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("quiz.reportTitle")}</DialogTitle>
            <DialogDescription>
              {t("quiz.reportDescription")} · {t("quiz.question")} {currentIndex + 1}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void reportQuestion(event)} className="space-y-4">
            <label htmlFor="quiz-report-details" className="text-sm font-medium text-heading">
              {t("quiz.reportDetails")}
            </label>
            <Textarea
              id="quiz-report-details"
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
              maxLength={1000}
              minLength={10}
              required
              placeholder={t("quiz.reportPlaceholder")}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReportOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={reporting || reportDetails.trim().length < 10}>
                {reporting ? t("common.loading") : t("quiz.sendReport")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
