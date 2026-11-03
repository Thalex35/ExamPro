import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  FlaskConical,
  Lightbulb,
  Play,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Empty, ErrorState, Loading } from "@/components/States";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, subjectsForLevel, trackFilter } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";
import { openExamFile } from "@/lib/files";
import { formatExamYear } from "@/lib/exam-years";
import { demoRecordsQuery } from "@/lib/demo-data";
import { DemoBadge } from "@/components/DemoBadge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — EXAMPRO" }] }),
  component: Dashboard,
});

type QuickActionProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  to?: "/subjects" | "/exams" | "/courses" | "/evaluations";
  unavailable?: boolean;
};

function QuickAction({ icon: Icon, title, description, to, unavailable }: QuickActionProps) {
  const { t } = useI18n();
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-heading">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      {unavailable ? (
        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
          {t("dash.comingSoon")}
        </span>
      ) : (
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/60"
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      aria-disabled="true"
      className="flex cursor-not-allowed items-center gap-3 rounded-xl p-3 opacity-70"
    >
      {content}
    </div>
  );
}

function Dashboard() {
  const { t, name, lang, errMsg } = useI18n();
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const levelId = me?.profile?.level_id;
  const trackId = me?.profile?.track_id;
  const recentActivity = useQuery(demoRecordsQuery(levelId, trackId, "progress"));
  const demoEvaluations = useQuery(demoRecordsQuery(levelId, trackId, "evaluation"));

  const recommendations = useQuery({
    queryKey: ["dashboard-recommendations", levelId, trackId],
    enabled: !!levelId,
    queryFn: async () => {
      const [coursesResult, examsResult] = await Promise.all([
        supabase
          .from("courses")
          .select("id,title,summary,subject_id,track_id,published_at,is_demo")
          .eq("status", "published")
          .eq("level_id", levelId!)
          .or(trackFilter(trackId))
          .order("published_at", { ascending: false })
          .limit(6),
        supabase
          .from("exams")
          .select("id,title,exam_year,subject_id,track_id,file_path,demo_content,is_demo")
          .eq("status", "published")
          .eq("level_id", levelId!)
          .or(trackFilter(trackId))
          .order("exam_year", { ascending: false })
          .limit(6),
      ]);
      if (coursesResult.error) throw coursesResult.error;
      if (examsResult.error) throw examsResult.error;
      return {
        courses: coursesResult.data,
        exams: examsResult.data,
      };
    },
  });

  if (cat.isLoading) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} onRetry={() => cat.refetch()} />;

  const catalog = cat.data;
  const level = catalog.levels.find((item) => item.id === levelId);
  const track = catalog.tracks.find((item) => item.id === trackId);
  const studentName =
    me?.profile?.first_name?.trim() || me?.profile?.full_name?.trim() || me?.user.email || "";
  const date = new Intl.DateTimeFormat(lang === "ht" ? "fr-HT" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const subjectName = (subjectId: string) => {
    const subject = catalog.subjects.find((item) => item.id === subjectId);
    return subject ? name(subject) : "";
  };
  const recommendedCourses = [...(recommendations.data?.courses ?? [])].sort(
    (a, b) =>
      Number(b.track_id === trackId) - Number(a.track_id === trackId) ||
      (b.published_at ?? "").localeCompare(a.published_at ?? ""),
  );
  const recommendedExams = [...(recommendations.data?.exams ?? [])].sort(
    (a, b) =>
      Number(b.track_id === trackId) - Number(a.track_id === trackId) || b.exam_year - a.exam_year,
  );

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-deep">
            <CalendarDays className="h-4 w-4" />
            {date}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-heading sm:text-4xl">
            {t("dash.welcomePrefix")} {studentName}, {t("dash.welcomeSuffix")}
          </h1>
          {level ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {name(level)}
              {track ? ` · ${track.code}` : ""}
              {me?.profile?.geographical_department
                ? ` · ${me.profile.geographical_department}`
                : ""}
            </p>
          ) : (
            <Button asChild variant="hero" size="sm" className="mt-4">
              <Link to="/onboarding">{t("onb.title")}</Link>
            </Button>
          )}
        </div>
      </section>

      <nav
        aria-label={t("dash.learningSections")}
        className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2"
      >
        <Link
          to="/subjects"
          className="inline-flex whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          {t("nav.subjects")}
        </Link>
        <Link
          to="/exams"
          className="inline-flex whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <FileText className="mr-2 h-4 w-4" />
          {t("nav.exams")}
        </Link>
        <span
          aria-disabled="true"
          title={t("dash.featureUnavailable")}
          className="flex cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground/60"
        >
          <Play className="h-4 w-4" />
          {t("dash.quiz")} <span className="text-[10px]">{t("dash.comingSoon")}</span>
        </span>
        <span
          aria-disabled="true"
          title={t("dash.featureUnavailable")}
          className="flex cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground/60"
        >
          <FlaskConical className="h-4 w-4" />
          {t("dash.simulations")} <span className="text-[10px]">{t("dash.comingSoon")}</span>
        </span>
      </nav>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(290px,0.9fr)]">
        <div className="space-y-8">
          <section aria-labelledby="continue-learning-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="continue-learning-title" className="text-xl font-semibold text-heading">
                  {t("dash.continueLearning")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("dash.continueLearningHint")}
                </p>
              </div>
              <Link
                to="/subjects"
                className="inline-flex items-center gap-1 text-sm font-semibold text-deep hover:underline"
              >
                {t("dash.browseSubjects")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {recentActivity.isLoading ? (
              <Loading />
            ) : recentActivity.error ? (
              <ErrorState
                error={recentActivity.error}
                onRetry={() => void recentActivity.refetch()}
              />
            ) : recentActivity.data?.length ? (
              <div className="card-surface divide-y">
                {recentActivity.data.slice(0, 3).map((activity) => (
                  <Link
                    key={activity.id}
                    to="/courses/$courseId"
                    params={{ courseId: activity.course_id! }}
                    className="flex flex-wrap items-center gap-3 p-4 hover:bg-muted/40"
                  >
                    <Clock3 className="h-4 w-4 text-deep" />
                    <span className="min-w-0 flex-1 font-medium text-heading">
                      {activity.title}
                    </span>
                    <DemoBadge />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card-surface flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <Clock3 className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-heading">{t("dash.noRecentLearning")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("dash.noRecentLearningHint")}
                  </p>
                </div>
                <Button asChild variant="hero">
                  <Link to="/subjects">
                    {t("dash.startLearning")} <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}
          </section>

          <section aria-labelledby="recommendations-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="recommendations-title" className="text-xl font-semibold text-heading">
                  {t("dash.recommended")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {track
                    ? `${t("dash.recommendedForTrack")} ${track.code}`
                    : t("dash.recommendedForLevel")}
                </p>
              </div>
              <Link
                to="/exams"
                className="inline-flex items-center gap-1 text-sm font-semibold text-deep hover:underline"
              >
                {t("dash.viewExams")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {recommendations.isLoading ? (
              <Loading />
            ) : recommendations.error ? (
              <ErrorState
                error={recommendations.error}
                onRetry={() => void recommendations.refetch()}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recommendedCourses.slice(0, 2).map((course) => (
                  <Link
                    key={`course-${course.id}`}
                    to="/courses/$courseId"
                    params={{ courseId: course.id }}
                    className="card-surface group flex min-h-40 flex-col justify-between p-5 transition-shadow hover:shadow-brand"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    {course.is_demo && <DemoBadge />}
                    <span className="mt-4 block">
                      <span className="block font-semibold text-heading group-hover:text-deep">
                        {course.title}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {subjectName(course.subject_id)}
                        {course.track_id === trackId && track
                          ? ` · ${t("dash.priorityForTrack")} ${track.code}`
                          : ""}
                      </span>
                    </span>
                  </Link>
                ))}
                {recommendedExams
                  .slice(0, Math.max(0, 4 - recommendedCourses.slice(0, 2).length))
                  .map((exam) => (
                    <article
                      key={`exam-${exam.id}`}
                      className="card-surface flex min-h-40 flex-col justify-between p-5"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-deep">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-heading">{exam.title}</h3>
                            {exam.is_demo && <DemoBadge />}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {subjectName(exam.subject_id)} · {formatExamYear(exam.exam_year)}
                            {exam.track_id === trackId && track
                              ? ` · ${t("dash.priorityForTrack")} ${track.code}`
                              : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void openExamFile(exam.file_path, exam.demo_content).catch((error) =>
                              toast.error(errMsg(error)),
                            )
                          }
                        >
                          {t("common.open")}
                        </Button>
                      </div>
                    </article>
                  ))}
                {!recommendedCourses.length && !recommendedExams.length && (
                  <div className="card-surface p-5 sm:col-span-2">
                    <Empty>{t("dash.noRecommendations")}</Empty>
                  </div>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby="performance-title">
            <div className="mb-4">
              <h2 id="performance-title" className="text-xl font-semibold text-heading">
                {t("dash.performance")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("demo.evaluationsDescription")}
              </p>
            </div>
            {demoEvaluations.isLoading ? (
              <Loading />
            ) : demoEvaluations.error ? (
              <ErrorState
                error={demoEvaluations.error}
                onRetry={() => void demoEvaluations.refetch()}
              />
            ) : demoEvaluations.data?.length ? (
              <Link
                to="/evaluations"
                className="card-surface flex items-center gap-4 p-5 transition-shadow hover:shadow-brand sm:p-6"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-deep">
                  <Trophy className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-heading">
                    {demoEvaluations.data.length} {t("dash.evaluations")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("demo.notRealPerformance")}
                  </p>
                </div>
                <DemoBadge />
              </Link>
            ) : (
              <div className="card-surface flex items-start gap-4 p-5 sm:p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-deep">
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-heading">{t("dash.noPerformanceData")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("dash.noPerformanceDataHint")}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="quick-actions-title" className="card-surface p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2 px-2">
              <Sparkles className="h-4 w-4 text-deep" />
              <h2 id="quick-actions-title" className="text-lg font-semibold text-heading">
                {t("dash.quickActions")}
              </h2>
            </div>
            <div className="divide-y">
              <QuickAction
                icon={BookOpen}
                title={t("course.all")}
                description={t("course.allDescription")}
                to="/courses"
              />
              <QuickAction
                icon={FileText}
                title={t("dash.findExam")}
                description={t("dash.findExamHint")}
                to="/exams"
              />
              <QuickAction
                icon={Play}
                title={t("dash.takeQuiz")}
                description={t("dash.quizUnavailable")}
                unavailable
              />
              <QuickAction
                icon={FlaskConical}
                title={t("dash.startSimulation")}
                description={t("dash.simulationUnavailable")}
                unavailable
              />
              <QuickAction
                icon={BookOpen}
                title={t("dash.continueLearning")}
                description={t("dash.browseSubjects")}
                to="/subjects"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/10 via-card to-card p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
              <Lightbulb className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-heading">{t("dash.studyTipTitle")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t("dash.studyTip")}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-deep">
              <CheckCircle2 className="h-4 w-4" />
              {t("dash.studyTipSource")}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
