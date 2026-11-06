import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  Brain,
  Clock3,
  FileCheck2,
  FileQuestion,
  GraduationCap,
  LockKeyhole,
  Sparkles,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, ErrorState, Loading } from "@/components/States";
import { catalogQuery, chaptersFor, subjectsFor } from "@/lib/catalog";
import { subjectIcons } from "@/lib/subject-icons";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

type EvaluationCategory = "quiz" | "simulations" | "teacher";

export const Route = createFileRoute("/_authenticated/evaluations")({
  head: () => ({ meta: [{ title: "Évaluations — EXAMPRO" }] }),
  component: EvaluationsPage,
});

function EvaluationsPage() {
  const { t, name } = useI18n();
  const { data: me } = useMe();
  const [category, setCategory] = useState<EvaluationCategory>("quiz");
  const catalog = useQuery(catalogQuery);

  if (catalog.isLoading) return <Loading />;
  if (catalog.error || !catalog.data)
    return <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />;

  const levelId = me?.profile?.level_id;
  const trackId = me?.profile?.track_id;
  const level = catalog.data.levels.find((item) => item.id === levelId);
  const track =
    level?.requires_track && trackId
      ? catalog.data.tracks.find((item) => item.id === trackId && item.level_id === level.id)
      : undefined;
  const subjects = subjectsFor(catalog.data, levelId, track?.id);
  const recommendedSubjectIds = new Set(
    level?.requires_track && track
      ? catalog.data.trackSubjects
          .filter((association) => association.track_id === track.id)
          .map((association) => association.subject_id)
      : [],
  );
  const tabs: { id: EvaluationCategory; label: string; icon: LucideIcon }[] = [
    { id: "quiz", label: t("eval.quizCategory"), icon: Brain },
    { id: "simulations", label: t("eval.simulationCategory"), icon: FileCheck2 },
    { id: "teacher", label: t("eval.teacherCategory"), icon: GraduationCap },
  ];

  return (
    <div className="space-y-6">
      <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)] xl:items-center">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <FileCheck2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{t("dash.evaluations")}</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {t("eval.subtitle")}
            </p>
          </div>
        </div>
        <aside className="card-surface relative isolate flex min-h-24 items-center justify-between gap-4 overflow-hidden bg-gradient-to-r from-accent to-card px-5 py-4">
          <div className="relative z-10">
            <p className="font-bold text-heading">{t("eval.bannerTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("eval.bannerDescription")}</p>
          </div>
          <Trophy
            className="relative z-10 h-12 w-12 shrink-0 text-brand sm:h-14 sm:w-14"
            aria-hidden="true"
          />
          <Sparkles
            className="absolute right-16 top-2 h-5 w-5 text-brand/40"
            aria-hidden="true"
          />
        </aside>
      </header>

      <div
        role="tablist"
        aria-label={t("eval.categories")}
        className="flex gap-2 overflow-x-auto border-b border-border pb-2"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`evaluation-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={category === id}
            aria-controls={`evaluation-panel-${id}`}
            onClick={() => setCategory(id)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              category === id
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-brand/60 hover:text-heading"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <section
        id={`evaluation-panel-${category}`}
        role="tabpanel"
        aria-labelledby={`evaluation-tab-${category}`}
        className="min-w-0"
      >
        {category === "quiz" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Zap className="mt-1 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-bold text-heading">{t("eval.quizHeading")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("eval.quizDescription")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("eval.quizDemoNotice")}</p>
              </div>
            </div>
            {subjects.length === 0 ? (
              <Empty>{t("eval.noQuizzes")}</Empty>
            ) : (
              <ul className="space-y-2">
                {subjects.flatMap((subject) => {
                  const chapters = chaptersFor(catalog.data, subject.id, levelId);
                  const quizScopes = chapters.length
                    ? chapters.map((chapter) => ({ chapterId: chapter.id, title: name(chapter) }))
                    : [{ chapterId: undefined, title: name(subject) }];
                  const SubjectIcon = subjectIcons[subject.icon ?? ""] ?? Brain;
                  const recommended = recommendedSubjectIds.has(subject.id);

                  return quizScopes.map((scope) => (
                    <li key={`${subject.id}-${scope.chapterId ?? "subject"}`}>
                      <article className="card-surface grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 p-4 transition-colors hover:border-brand/50 hover:bg-muted/30 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto] sm:gap-4 sm:p-5">
                        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                          <SubjectIcon className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold text-deep">{name(subject)}</p>
                            <h3 className="text-base font-bold text-heading">
                              {t("eval.quizTitle")} · {scope.title}
                            </h3>
                            {recommended && (
                              <span className="rounded-full bg-brand/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-deep">
                                {t("eval.recommended")}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t("eval.quizCardDescription")}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <FileQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                              10 {t("quiz.questions")}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                              15 {t("eval.estimatedMinutes")}
                            </span>
                            {track && (
                              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                                {track.code}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          asChild
                          className="col-start-2 justify-self-start sm:col-start-auto sm:justify-self-end"
                        >
                          <Link
                            to="/subjects/$subjectId"
                            params={{ subjectId: subject.id }}
                            search={{ chapter: scope.chapterId, resource: "quiz" }}
                          >
                            {t("eval.startQuiz")}
                            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      </article>
                    </li>
                  ));
                })}
              </ul>
            )}
          </div>
        ) : category === "simulations" ? (
          <ComingSoonCard
            icon={FileCheck2}
            title={t("eval.simulationTitle")}
            description={t("eval.simulationDescription")}
            status={t("eval.comingSoon")}
            hint={t("eval.premiumNote")}
            disabledLabel={t("eval.comingSoon")}
          />
        ) : (
          <ComingSoonCard
            icon={GraduationCap}
            title={t("eval.teacherTitle")}
            description={t("eval.teacherDescription")}
            status={t("eval.preparing")}
            hint={t("eval.teacherHint")}
            disabledLabel={t("eval.unavailable")}
            blurred
          />
        )}
      </section>
    </div>
  );
}

function ComingSoonCard({
  icon: Icon,
  title,
  description,
  status,
  hint,
  disabledLabel,
  blurred = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  status: string;
  hint: string;
  disabledLabel: string;
  blurred?: boolean;
}) {
  const mutedLayer = blurred ? "pointer-events-none select-none blur-[1.5px]" : "";

  return (
    <article
      aria-disabled="true"
      className={`card-surface relative isolate overflow-hidden p-5 sm:p-7 ${
        blurred ? "bg-muted/30" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className={`flex min-w-0 items-start gap-4 ${mutedLayer}`}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-heading">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className="rounded-full bg-warning/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-warning">
          {status}
        </span>
      </div>
      <div
        className={`mt-6 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between ${mutedLayer}`}
      >
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-deep" aria-hidden="true" />
          <p>{hint}</p>
        </div>
        <Button type="button" disabled className="shrink-0">
          {disabledLabel}
        </Button>
      </div>
    </article>
  );
}
