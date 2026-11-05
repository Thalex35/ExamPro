import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorState, Loading } from "@/components/States";
import { supabase } from "@/integrations/supabase/client";
import {
  parseDemoQuizQuestions,
  parseDemoQuizResult,
  type DemoQuestion,
  type DemoResult,
} from "@/lib/demo-quiz";
import { useI18n } from "@/lib/i18n";

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
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<DemoResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
      setResult(parseDemoQuizResult(data));
      await queryClient.invalidateQueries({ queryKey: ["quiz-attempts"] });
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (quiz.isLoading) return <Loading />;
  if (quiz.error || !quiz.data)
    return <ErrorState error={quiz.error} onRetry={() => void quiz.refetch()} />;

  const getText = (fr: string, ht: string) => (lang === "ht" ? ht : fr);
  const options = (question: DemoQuestion) =>
    lang === "ht" ? question.options_ht : question.options_fr;
  const answeredCount = quiz.data.filter((question) =>
    Number.isInteger(answers[question.id]),
  ).length;
  const allAnswered = answeredCount === quiz.data.length;

  return (
    <section className="space-y-5" aria-labelledby="demo-quiz-title">
      <header className="card-surface space-y-2 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-deep">
          {t("quiz.demoLabel")}
        </p>
        <h2 id="demo-quiz-title" className="text-xl font-bold text-heading sm:text-2xl">
          {t("quiz.title")} · {title}
        </h2>
        <p className="text-sm text-muted-foreground">{t("quiz.description")}</p>
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
              <span className="rounded-full bg-primary px-4 py-2 text-lg font-bold text-brand">
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
              setResult(null);
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("quiz.tryAgain")}
          </Button>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <ol className="space-y-4">
            {quiz.data.map((question, index) => (
              <li key={question.id}>
                <fieldset className="card-surface space-y-3 p-4 sm:p-5">
                  <legend className="w-full font-semibold leading-relaxed text-heading">
                    <span className="mr-2 text-deep">{index + 1}.</span>
                    {getText(question.question_fr, question.question_ht)}
                  </legend>
                  <div className="space-y-2 pt-2">
                    {options(question).map((option, optionIndex) => (
                      <label
                        key={`${question.id}-${optionIndex}`}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:border-brand/50 has-[:checked]:border-brand has-[:checked]:bg-primary/40"
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={optionIndex}
                          checked={answers[question.id] === optionIndex}
                          onChange={() =>
                            setAnswers((previous) => ({
                              ...previous,
                              [question.id]: optionIndex,
                            }))
                          }
                          className="mt-0.5 accent-primary"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {answeredCount} / {quiz.data.length} {t("quiz.questionsAnswered")}
            </p>
            <Button type="submit" disabled={submitting || !allAnswered}>
              {submitting ? t("common.loading") : t("quiz.submit")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
