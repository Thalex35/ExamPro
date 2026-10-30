import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, subjectsFor, trackFilter } from "@/lib/catalog";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Empty, ErrorState, Loading } from "@/components/States";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — EXAMPRO" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t, name } = useI18n();
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const levelId = me?.profile?.level_id;
  const trackId = me?.profile?.track_id;

  const courses = useQuery({
    queryKey: ["dash-courses", levelId, trackId],
    enabled: !!levelId,
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id,title,summary,subject_id,published_at").eq("status", "published").eq("level_id", levelId!).or(trackFilter(trackId)).order("published_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });
  const exams = useQuery({
    queryKey: ["dash-exams", levelId, trackId],
    enabled: !!levelId,
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("id,title,exam_year,subject_id").eq("status", "published").eq("level_id", levelId!).or(trackFilter(trackId)).order("exam_year", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  if (cat.isLoading) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} onRetry={() => cat.refetch()} />;
  const c = cat.data;
  const level = c.levels.find((l) => l.id === levelId);
  const track = c.tracks.find((x) => x.id === trackId);
  const subjects = subjectsFor(c, levelId, trackId);
  const subjName = (id: string) => { const s = c.subjects.find((x) => x.id === id); return s ? name(s) : ""; };

  return (
    <div className="flex flex-col gap-8">
      <section className="hero-surface rounded-2xl p-6 sm:p-8">
        <p className="text-sm text-primary-foreground/70">{t("dash.hello")},</p>
        <h1 className="text-2xl font-bold text-primary-foreground sm:text-3xl">{me?.profile?.full_name ?? me?.user.email}</h1>
        {level ? (
          <p className="mt-3 inline-flex rounded-full bg-primary-foreground/10 px-3 py-1 text-sm text-primary-foreground">
            {t("dash.yourLevel")} : {name(level)}{track ? ` · ${track.code}` : ""}
          </p>
        ) : (
          <Button asChild variant="hero" size="sm" className="mt-4"><Link to="/onboarding">{t("onb.title")}</Link></Button>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("dash.mySubjects")}</h2>
          <Link to="/subjects" className="text-sm font-semibold text-deep hover:underline">{t("nav.subjects")} →</Link>
        </div>
        {subjects.length === 0 ? <Empty>{t("subj.empty")}</Empty> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {subjects.map((s) => (
              <Link key={s.id} to="/subjects/$subjectId" params={{ subjectId: s.id }} className="card-surface flex items-center gap-3 p-4 transition-shadow hover:shadow-brand">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><BookOpen className="h-4 w-4" /></span>
                <span className="font-semibold text-heading">{name(s)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xl font-bold">{t("dash.latestCourses")}</h2>
          {courses.isLoading ? <Loading /> : courses.error ? <ErrorState error={courses.error} /> : !courses.data?.length ? <Empty>{t("dash.noCourses")}</Empty> : (
            <ul className="card-surface divide-y">
              {courses.data.map((x) => (
                <li key={x.id}>
                  <Link to="/courses/$courseId" params={{ courseId: x.id }} className="block p-4 hover:bg-muted">
                    <p className="font-semibold text-heading">{x.title}</p>
                    <p className="text-xs text-muted-foreground">{subjName(x.subject_id)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-4 text-xl font-bold">{t("dash.latestExams")}</h2>
          {exams.isLoading ? <Loading /> : exams.error ? <ErrorState error={exams.error} /> : !exams.data?.length ? <Empty>{t("dash.noExams")}</Empty> : (
            <ul className="card-surface divide-y">
              {exams.data.map((x) => (
                <li key={x.id} className="flex items-center gap-3 p-4">
                  <FileText className="h-4 w-4 text-deep" />
                  <div className="flex-1">
                    <p className="font-semibold text-heading">{x.title}</p>
                    <p className="text-xs text-muted-foreground">{subjName(x.subject_id)} · {x.exam_year}</p>
                  </div>
                  <Link to="/exams" className="text-sm font-semibold text-deep hover:underline">{t("common.open")}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
